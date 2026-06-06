import type { Entity, System, World } from "../../engine/core/index.js";
import type { PlayerInputComponent } from "../../engine/modules/input/index.js";
import {
	LIGHT_COMPONENT,
	type LightComponent,
} from "../../engine/modules/rendering/index.js";
import {
	CHARGED_ACTION_COMPONENT,
	type ChargedActionComponent,
	PLAYER_ENTITY_RESOURCE,
	PLAYER_INPUT_COMPONENT,
	PLAYER_LIGHT_FEEDBACK_COMPONENT,
	type PlayerLightFeedbackComponent,
} from "./components.js";

const LIGHT_CHARGE_ACTION = "charge.light";
const LIGHT_CHARGE_MAX_SECONDS = 1.6;
const LIGHT_BURST_THRESHOLD = 0.62;
const PLAYER_CHARGE_LIGHT_INTENSITY_BOOST = 5.5;
const PLAYER_CHARGE_LIGHT_DISTANCE_BOOST = 6;

export function createChargedActionSystem<
	TContext extends ChargedActionContext,
>(): System<TContext> {
	return {
		id: "charged-actions",
		reads: [PLAYER_INPUT_COMPONENT],
		writes: [CHARGED_ACTION_COMPONENT],
		update(context) {
			const player = context.world.getResource<Entity>(PLAYER_ENTITY_RESOURCE);

			if (player === undefined || !context.world.isAlive(player)) {
				return;
			}

			const input = context.world.getComponent<PlayerInputComponent>(
				player,
				PLAYER_INPUT_COMPONENT,
			);
			const previous = context.world.getComponent<ChargedActionComponent>(
				player,
				CHARGED_ACTION_COMPONENT,
			);
			const state = input?.actions.get(LIGHT_CHARGE_ACTION);
			const actionActive = (state?.value ?? 0) > 0;

			if (actionActive) {
				const chargeSeconds = Math.min(
					LIGHT_CHARGE_MAX_SECONDS,
					(previous?.active ? previous.chargeSeconds : 0) +
						context.deltaSeconds,
				);
				const normalizedCharge = chargeSeconds / LIGHT_CHARGE_MAX_SECONDS;

				context.world.addComponent<ChargedActionComponent>(
					player,
					CHARGED_ACTION_COMPONENT,
					{
						actionId: LIGHT_CHARGE_ACTION,
						active: true,
						chargeSeconds,
						normalizedCharge,
					},
				);

				if (!previous?.active) {
					context.events.emit({
						type: "ChargeActionStarted",
						entity: player,
						actionId: LIGHT_CHARGE_ACTION,
					});
				}

				context.events.emit({
					type: "ChargeActionHeld",
					entity: player,
					actionId: LIGHT_CHARGE_ACTION,
					chargeSeconds,
					normalizedCharge,
				});
				return;
			}

			if (!previous?.active) {
				return;
			}

			context.world.addComponent<ChargedActionComponent>(
				player,
				CHARGED_ACTION_COMPONENT,
				{
					actionId: LIGHT_CHARGE_ACTION,
					active: false,
					chargeSeconds: 0,
					normalizedCharge: 0,
				},
			);

			if (state?.phase === "released") {
				context.events.emit({
					type: "ChargeActionReleased",
					entity: player,
					actionId: LIGHT_CHARGE_ACTION,
					chargeSeconds: previous.chargeSeconds,
					normalizedCharge: previous.normalizedCharge,
				});

				if (previous.normalizedCharge >= LIGHT_BURST_THRESHOLD) {
					context.events.emit({
						type: "PlayerLightBurstRequested",
						entity: player,
						actionId: LIGHT_CHARGE_ACTION,
						normalizedCharge: previous.normalizedCharge,
					});
				}
				return;
			}

			context.events.emit({
				type: "ChargeActionCanceled",
				entity: player,
				actionId: LIGHT_CHARGE_ACTION,
				chargeSeconds: previous.chargeSeconds,
				normalizedCharge: previous.normalizedCharge,
			});
		},
	};
}

export function createPlayerChargeLightFeedbackSystem<
	TContext extends PlayerChargeLightFeedbackContext,
>(): System<TContext> {
	return {
		id: "player-charge-light-feedback",
		reads: [CHARGED_ACTION_COMPONENT, LIGHT_COMPONENT],
		writes: [LIGHT_COMPONENT, PLAYER_LIGHT_FEEDBACK_COMPONENT],
		update(context) {
			const player = context.world.getResource<Entity>(PLAYER_ENTITY_RESOURCE);

			if (player === undefined || !context.world.isAlive(player)) {
				return;
			}

			const light = context.world.getComponent<LightComponent>(
				player,
				LIGHT_COMPONENT,
			);

			if (!light || light.kind !== "point") {
				context.world.removeComponent(player, PLAYER_LIGHT_FEEDBACK_COMPONENT);
				return;
			}

			const feedback =
				context.world.getComponent<PlayerLightFeedbackComponent>(
					player,
					PLAYER_LIGHT_FEEDBACK_COMPONENT,
				) ??
				context.world.addComponent<PlayerLightFeedbackComponent>(
					player,
					PLAYER_LIGHT_FEEDBACK_COMPONENT,
					{
						baseIntensity: light.intensity,
						baseDistance: light.distance,
					},
				);
			const chargedAction = context.world.getComponent<ChargedActionComponent>(
				player,
				CHARGED_ACTION_COMPONENT,
			);
			const normalizedCharge =
				chargedAction?.active === true
					? clampUnit(chargedAction.normalizedCharge)
					: 0;
			const intensity =
				feedback.baseIntensity +
				normalizedCharge * PLAYER_CHARGE_LIGHT_INTENSITY_BOOST;
			const distance =
				feedback.baseDistance +
				normalizedCharge * PLAYER_CHARGE_LIGHT_DISTANCE_BOOST;

			if (light.intensity === intensity && light.distance === distance) {
				return;
			}

			context.world.addComponent<LightComponent>(player, LIGHT_COMPONENT, {
				...light,
				intensity,
				distance,
			});
		},
	};
}

type ChargedActionContext = {
	readonly deltaSeconds: number;
	readonly world: World;
	readonly events: {
		emit(event: {
			readonly type: string;
			readonly [key: string]: unknown;
		}): void;
	};
};

type PlayerChargeLightFeedbackContext = {
	readonly world: World;
};

function clampUnit(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}

	return Math.max(0, Math.min(1, value));
}
