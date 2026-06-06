import type { Entity, System } from "../../engine/core/index.js";
import { lengthSquaredVec3, subtractVec3 } from "../../engine/math/index.js";
import {
	type RenderTransform,
	TRANSFORM_COMPONENT,
} from "../../engine/modules/rendering/index.js";
import {
	ACTIVE_INTERACTION_TARGET_RESOURCE,
	ACTIVE_PORTAL_RESOURCE,
	type ActiveInteractionTargetState,
	type ActivePortalState,
	PLAYER_ENTITY_RESOURCE,
	PORTAL_COMPONENT,
	type PortalComponent,
	RUNTIME_SCENE_TRANSITION_RESOURCE,
	type RuntimeSceneTransitionPort,
} from "./components.js";

const DEFAULT_PORTAL_ACTIVATION_RADIUS = 2.25;

export function createPortalProximitySystem<
	TContext extends PortalProximityContext,
>(): System<TContext> {
	return {
		id: "portal-proximity",
		reads: [TRANSFORM_COMPONENT, PORTAL_COMPONENT],
		writes: [ACTIVE_PORTAL_RESOURCE],
		update(context) {
			const player = context.world.getResource<Entity>(PLAYER_ENTITY_RESOURCE);

			if (player === undefined || !context.world.isAlive(player)) {
				context.world.removeResource(ACTIVE_PORTAL_RESOURCE);
				return;
			}

			const playerTransform = context.world.getComponent<RenderTransform>(
				player,
				TRANSFORM_COMPONENT,
			);

			if (!playerTransform) {
				context.world.removeResource(ACTIVE_PORTAL_RESOURCE);
				return;
			}

			let activePortal: ActivePortalState | undefined;
			let activeDistanceSquared = Number.POSITIVE_INFINITY;

			for (const entity of context.world.query([
				TRANSFORM_COMPONENT,
				PORTAL_COMPONENT,
			])) {
				const portal = normalizePortal(
					context.world.getComponent(entity, PORTAL_COMPONENT),
				);
				const transform = context.world.getComponent<RenderTransform>(
					entity,
					TRANSFORM_COMPONENT,
				);

				if (!portal || !transform) {
					continue;
				}

				const radius =
					portal.activationRadius ?? DEFAULT_PORTAL_ACTIVATION_RADIUS;
				const distanceSquared = lengthSquaredVec3(
					subtractVec3(transform.position, playerTransform.position),
				);

				if (
					distanceSquared > radius * radius ||
					distanceSquared >= activeDistanceSquared
				) {
					continue;
				}

				activeDistanceSquared = distanceSquared;
				activePortal = {
					entity,
					id: portal.id,
					label: portal.label,
					prompt: portalPrompt(portal),
					...(portal.targetRuntimeSceneId
						? { targetRuntimeSceneId: portal.targetRuntimeSceneId }
						: {}),
					canTravel: typeof portal.targetRuntimeSceneId === "string",
					distanceSquared,
				};
			}

			if (activePortal) {
				context.world.setResource(ACTIVE_PORTAL_RESOURCE, activePortal);
			} else {
				context.world.removeResource(ACTIVE_PORTAL_RESOURCE);
			}
		},
	};
}

export function createPortalActivationSystem<
	TContext extends PortalActivationContext,
>(): System<TContext> {
	return {
		id: "portal-activation",
		reads: [ACTIVE_INTERACTION_TARGET_RESOURCE, ACTIVE_PORTAL_RESOURCE],
		update(context) {
			const activeTarget =
				context.world.getResource<ActiveInteractionTargetState>(
					ACTIVE_INTERACTION_TARGET_RESOURCE,
				);

			if (activeTarget?.kind !== "portal") {
				return;
			}

			const activePortal = context.world.getResource<ActivePortalState>(
				ACTIVE_PORTAL_RESOURCE,
			);

			if (
				!activePortal ||
				activePortal.entity !== activeTarget.entity ||
				!activePortal.targetRuntimeSceneId
			) {
				return;
			}

			const player = context.world.getResource<Entity>(PLAYER_ENTITY_RESOURCE);

			if (player === undefined || !context.world.isAlive(player)) {
				return;
			}

			if (!hasPortalInteractionRequest(context.events.peek())) {
				return;
			}

			const transition = context.world.getResource<RuntimeSceneTransitionPort>(
				RUNTIME_SCENE_TRANSITION_RESOURCE,
			);

			if (
				!transition ||
				!transition.canLoadRuntimeScene(activePortal.targetRuntimeSceneId)
			) {
				context.events.emit({
					type: "PortalUnavailable",
					entity: activePortal.entity,
					portalId: activePortal.id,
					targetRuntimeSceneId: activePortal.targetRuntimeSceneId,
				});
				return;
			}

			context.events.emit({
				type: "PortalActivated",
				entity: activePortal.entity,
				portalId: activePortal.id,
				targetRuntimeSceneId: activePortal.targetRuntimeSceneId,
			});
			transition.requestRuntimeScene(activePortal.targetRuntimeSceneId);
		},
	};
}

type PortalProximityContext = {
	readonly world: PortalWorld;
};

type PortalActivationContext = {
	readonly world: PortalWorld;
	readonly events: {
		emit(event: {
			readonly type: string;
			readonly [key: string]: unknown;
		}): void;
		peek(): readonly {
			readonly type: string;
			readonly [key: string]: unknown;
		}[];
	};
};

type PortalWorld = {
	getResource<TResource>(resourceName: string): TResource | undefined;
	setResource<TResource>(resourceName: string, resource: TResource): TResource;
	removeResource<TResource = unknown>(
		resourceName: string,
	): TResource | undefined;
	isAlive(entity: Entity): boolean;
	query(componentNames: readonly string[]): Entity[];
	getComponent<TComponent = unknown>(
		entity: Entity,
		componentName: string,
	): TComponent | undefined;
};

function normalizePortal(value: unknown): PortalComponent | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	if (typeof value.id !== "string" || typeof value.label !== "string") {
		return undefined;
	}

	return {
		id: value.id,
		label: value.label,
		...(typeof value.prompt === "string" ? { prompt: value.prompt } : {}),
		...(typeof value.targetRuntimeSceneId === "string"
			? { targetRuntimeSceneId: value.targetRuntimeSceneId }
			: {}),
		...(typeof value.activationRadius === "number" &&
		Number.isFinite(value.activationRadius) &&
		value.activationRadius > 0
			? { activationRadius: value.activationRadius }
			: {}),
	};
}

function portalPrompt(portal: PortalComponent): string {
	if (portal.prompt) {
		return portal.prompt;
	}

	if (portal.targetRuntimeSceneId) {
		return `Click to enter ${portal.label}`;
	}

	return `${portal.label} is not connected yet`;
}

function hasPortalInteractionRequest(
	events: readonly { readonly type: string; readonly [key: string]: unknown }[],
): boolean {
	return events.some(
		(event) =>
			event.type === "ScreenPointInteractionRequested" ||
			event.type === "ActiveInteractionRequested",
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
