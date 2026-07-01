import type { Entity, System } from "../../engine/core/index.js";
import {
	lengthSquaredVec3,
	subtractVec3,
	vec3,
} from "../../engine/math/index.js";
import {
	LIGHT_COMPONENT,
	type LightComponent,
	type RenderTransform,
	TRANSFORM_COMPONENT,
} from "../../engine/modules/rendering/index.js";
import { STABLE_ID_COMPONENT } from "../prefabs/index.js";
import {
	ACTIVE_INTERACTION_TARGET_RESOURCE,
	ACTIVE_NPC_RESOURCE,
	type ActiveInteractionTargetState,
	type ActiveNpcState,
	type ConversationComponent,
	FOLLOW_TARGET_COMPONENT,
	type FollowTargetComponent,
	INTERACTION_TARGET_COMPONENT,
	type InteractionTargetComponent,
	LIGHT_MODULATION_COMPONENT,
	type LightModulationComponent,
	MOVEMENT_BEHAVIOR_COMPONENT,
	type MovementBehaviorComponent,
	NPC_COMPONENT,
	type NpcComponent,
	OPEN_NPC_DIALOG_RESOURCE,
	PLAYER_ENTITY_RESOURCE,
} from "./components.js";

const DEFAULT_NPC_ACTIVATION_RADIUS = 2.4;

export function createMovementBehaviorSystem<
	TContext extends MovementBehaviorContext,
>(): System<TContext> {
	return {
		id: "movement-behavior",
		reads: [TRANSFORM_COMPONENT, MOVEMENT_BEHAVIOR_COMPONENT],
		writes: [TRANSFORM_COMPONENT],
		update(context) {
			for (const entity of context.world.query([
				TRANSFORM_COMPONENT,
				MOVEMENT_BEHAVIOR_COMPONENT,
			])) {
				const behavior = normalizeMovementBehavior(
					context.world.getComponent(entity, MOVEMENT_BEHAVIOR_COMPONENT),
				);
				const transform = context.world.getComponent<RenderTransform>(
					entity,
					TRANSFORM_COMPONENT,
				);

				if (!behavior || !transform || behavior.kind === "static") {
					continue;
				}

				const phase =
					behavior.phase ?? stableUnit(entity, "movement-phase") * 10;
				const time = context.tick * context.deltaSeconds;
				const x =
					behavior.basePosition[0] +
					Math.sin(time * behavior.speed + phase) * behavior.radius;
				const z =
					behavior.basePosition[2] +
					Math.cos(time * behavior.speed + phase) * behavior.radius;
				const y =
					behavior.basePosition[1] +
					behavior.hoverHeight +
					Math.sin(time * behavior.bobSpeed + phase * 0.5) *
						behavior.bobAmplitude;

				context.world.addComponent<RenderTransform>(
					entity,
					TRANSFORM_COMPONENT,
					{
						...transform,
						position: vec3(x, y, z),
					},
				);
			}
		},
	};
}

export function createFollowTargetSystem<
	TContext extends FollowTargetContext,
>(): System<TContext> {
	return {
		id: "follow-target",
		reads: [FOLLOW_TARGET_COMPONENT, STABLE_ID_COMPONENT, TRANSFORM_COMPONENT],
		writes: [TRANSFORM_COMPONENT],
		update(context) {
			const transformsByStableId = new Map<string, RenderTransform>();

			for (const entity of context.world.query([
				STABLE_ID_COMPONENT,
				TRANSFORM_COMPONENT,
			])) {
				const stableId = normalizeStableId(
					context.world.getComponent(entity, STABLE_ID_COMPONENT),
				);
				const transform = context.world.getComponent<RenderTransform>(
					entity,
					TRANSFORM_COMPONENT,
				);

				if (stableId && transform) {
					transformsByStableId.set(stableId, transform);
				}
			}

			for (const entity of context.world.query([
				FOLLOW_TARGET_COMPONENT,
				TRANSFORM_COMPONENT,
			])) {
				const followTarget = normalizeFollowTarget(
					context.world.getComponent(entity, FOLLOW_TARGET_COMPONENT),
				);
				const transform = context.world.getComponent<RenderTransform>(
					entity,
					TRANSFORM_COMPONENT,
				);

				if (!followTarget || !transform) {
					continue;
				}

				const target = transformsByStableId.get(followTarget.targetStableId);

				if (!target) {
					continue;
				}

				const offset = followTarget.offset ?? [0, 0, 0];
				const scale = followTarget.scale ?? [1, 1, 1];

				context.world.addComponent<RenderTransform>(
					entity,
					TRANSFORM_COMPONENT,
					{
						...transform,
						position: vec3(
							target.position.x + offset[0] * target.scale.x,
							target.position.y + offset[1] * target.scale.y,
							target.position.z + offset[2] * target.scale.z,
						),
						rotation: followTarget.inheritRotation
							? target.rotation
							: transform.rotation,
						scale: vec3(
							target.scale.x * scale[0],
							target.scale.y * scale[1],
							target.scale.z * scale[2],
						),
					},
				);
			}
		},
	};
}

export function createLightModulationSystem<
	TContext extends LightModulationContext,
>(): System<TContext> {
	return {
		id: "light-modulation",
		reads: [LIGHT_COMPONENT, LIGHT_MODULATION_COMPONENT],
		writes: [LIGHT_COMPONENT],
		update(context) {
			for (const entity of context.world.query([
				LIGHT_COMPONENT,
				LIGHT_MODULATION_COMPONENT,
			])) {
				const modulation = normalizeLightModulation(
					context.world.getComponent(entity, LIGHT_MODULATION_COMPONENT),
				);
				const light = context.world.getComponent<LightComponent>(
					entity,
					LIGHT_COMPONENT,
				);

				if (!modulation || !light || light.kind !== "point") {
					continue;
				}

				const phase = modulation.phase ?? stableUnit(entity, "light-phase");
				const time = context.tick * context.deltaSeconds;
				const blinkScale = getBlinkScale(modulation, time, phase);
				const pulse = getPulse(modulation, time, phase);
				const minimumScale = clamp01(modulation.minimumIntensityScale);
				const intensityScale =
					blinkScale * (minimumScale + (1 - minimumScale) * pulse);

				context.world.addComponent<LightComponent>(entity, LIGHT_COMPONENT, {
					...light,
					intensity: Math.max(0, modulation.baseIntensity * intensityScale),
					distance: Math.max(0, modulation.baseDistance * (0.7 + pulse * 0.3)),
					visible: blinkScale > 0.001,
				});
			}
		},
	};
}

export function createNpcProximitySystem<
	TContext extends NpcProximityContext,
>(): System<TContext> {
	return {
		id: "npc-proximity",
		reads: [
			TRANSFORM_COMPONENT,
			NPC_COMPONENT,
			INTERACTION_TARGET_COMPONENT,
			"Conversation",
		],
		writes: [ACTIVE_NPC_RESOURCE],
		update(context) {
			const player = context.world.getResource<Entity>(PLAYER_ENTITY_RESOURCE);

			if (player === undefined || !context.world.isAlive(player)) {
				context.world.removeResource(ACTIVE_NPC_RESOURCE);
				return;
			}

			const playerTransform = context.world.getComponent<RenderTransform>(
				player,
				TRANSFORM_COMPONENT,
			);

			if (!playerTransform) {
				context.world.removeResource(ACTIVE_NPC_RESOURCE);
				return;
			}

			let activeNpc: ActiveNpcState | undefined;
			let activeDistanceSquared = Number.POSITIVE_INFINITY;

			for (const entity of context.world.query([
				TRANSFORM_COMPONENT,
				NPC_COMPONENT,
				INTERACTION_TARGET_COMPONENT,
				"Conversation",
			])) {
				const npc = normalizeNpc(
					context.world.getComponent(entity, NPC_COMPONENT),
				);
				const interaction = normalizeInteractionTarget(
					context.world.getComponent(entity, INTERACTION_TARGET_COMPONENT),
				);
				const conversation = normalizeConversation(
					context.world.getComponent(entity, "Conversation"),
				);
				const transform = context.world.getComponent<RenderTransform>(
					entity,
					TRANSFORM_COMPONENT,
				);

				if (!npc || !interaction || !conversation || !transform) {
					continue;
				}

				const radius =
					interaction.activationRadius ?? DEFAULT_NPC_ACTIVATION_RADIUS;
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
				activeNpc = {
					entity,
					id: npc.id,
					archetype: npc.archetype,
					displayName: npc.displayName,
					prompt: interaction.prompt,
					conversation,
					distanceSquared,
				};
			}

			if (activeNpc) {
				context.world.setResource(ACTIVE_NPC_RESOURCE, activeNpc);
			} else {
				context.world.removeResource(ACTIVE_NPC_RESOURCE);
			}
		},
	};
}

export function createNpcDialogSystem<
	TContext extends NpcDialogContext,
>(): System<TContext> {
	return {
		id: "npc-dialog",
		reads: [ACTIVE_INTERACTION_TARGET_RESOURCE, ACTIVE_NPC_RESOURCE],
		writes: [OPEN_NPC_DIALOG_RESOURCE],
		update(context) {
			if (hasCloseRequest(context.events.peek())) {
				context.world.removeResource(OPEN_NPC_DIALOG_RESOURCE);
				return;
			}

			if (!hasInteractionRequest(context.events.peek())) {
				return;
			}

			const activeTarget =
				context.world.getResource<ActiveInteractionTargetState>(
					ACTIVE_INTERACTION_TARGET_RESOURCE,
				);

			if (activeTarget?.kind !== "npc") {
				return;
			}

			const activeNpc =
				context.world.getResource<ActiveNpcState>(ACTIVE_NPC_RESOURCE);

			if (!activeNpc || activeNpc.entity !== activeTarget.entity) {
				return;
			}

			context.world.setResource(OPEN_NPC_DIALOG_RESOURCE, activeNpc);
			context.events.emit({
				type: "NpcDialogOpened",
				entity: activeNpc.entity,
				npcId: activeNpc.id,
			});
		},
	};
}

type MovementBehaviorContext = {
	readonly tick: number;
	readonly deltaSeconds: number;
	readonly world: NpcWorld;
};

type FollowTargetContext = {
	readonly world: NpcWorld;
};

type LightModulationContext = MovementBehaviorContext;

type NpcProximityContext = {
	readonly world: NpcWorld;
};

type NpcDialogContext = {
	readonly world: NpcWorld;
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

type NpcWorld = {
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
	addComponent<TComponent>(
		entity: Entity,
		componentName: string,
		component: TComponent,
	): TComponent;
};

function getPulse(
	modulation: LightModulationComponent,
	time: number,
	phase: number,
): number {
	const wave =
		(Math.sin(time * modulation.pulseSpeed + phase * Math.PI * 2) + 1) / 2;
	const softness = clamp(modulation.pulseSoftness, 0.01, 1);
	return wave * softness + (1 - softness);
}

function getBlinkScale(
	modulation: LightModulationComponent,
	time: number,
	phase: number,
): number {
	const activeLightPercent = clamp01(modulation.activeLightPercent);

	if (activeLightPercent <= 0) {
		return 0;
	}

	if (activeLightPercent >= 1) {
		return 1;
	}

	const minPeriod = Math.max(0.25, modulation.blinkPeriodSeconds[0]);
	const maxPeriod = Math.max(minPeriod, modulation.blinkPeriodSeconds[1]);
	const period =
		minPeriod + stableUnit(phase, "blink-period") * (maxPeriod - minPeriod);
	const activeSeconds = period * activeLightPercent;
	const cycle = (time + phase * period) % period;

	if (cycle >= activeSeconds) {
		return 0;
	}

	const fadeSeconds = Math.min(
		Math.max(0, modulation.blinkFadeSeconds),
		activeSeconds * 0.5,
	);

	if (fadeSeconds <= 0) {
		return 1;
	}

	return Math.min(
		smoothStep(cycle / fadeSeconds),
		smoothStep((activeSeconds - cycle) / fadeSeconds),
	);
}

function smoothStep(value: number): number {
	const resolved = clamp01(value);
	return resolved * resolved * (3 - 2 * resolved);
}

function stableUnit(value: string | number, salt: string): number {
	const text = `${value}:${salt}`;
	let hash = 2166136261;

	for (let index = 0; index < text.length; index += 1) {
		hash ^= text.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	return (hash >>> 0) / 4294967295;
}

function normalizeNpc(value: unknown): NpcComponent | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	if (
		typeof value.id !== "string" ||
		typeof value.archetype !== "string" ||
		typeof value.displayName !== "string"
	) {
		return undefined;
	}

	return {
		id: value.id,
		archetype: value.archetype,
		displayName: value.displayName,
	};
}

function normalizeInteractionTarget(
	value: unknown,
): InteractionTargetComponent | undefined {
	if (!isRecord(value) || value.kind !== "npc") {
		return undefined;
	}

	if (typeof value.prompt !== "string") {
		return undefined;
	}

	return {
		kind: "npc",
		prompt: value.prompt,
		activationRadius:
			typeof value.activationRadius === "number" &&
			Number.isFinite(value.activationRadius) &&
			value.activationRadius > 0
				? value.activationRadius
				: DEFAULT_NPC_ACTIVATION_RADIUS,
	};
}

function normalizeConversation(
	value: unknown,
): ConversationComponent | undefined {
	if (!isRecord(value) || value.mode !== "read-only") {
		return undefined;
	}

	if (
		typeof value.title !== "string" ||
		typeof value.excerpt !== "string" ||
		typeof value.body !== "string"
	) {
		return undefined;
	}

	return {
		mode: "read-only",
		title: value.title,
		excerpt: value.excerpt,
		body: value.body,
		...(typeof value.durationMs === "number" &&
		Number.isFinite(value.durationMs) &&
		value.durationMs > 0
			? { durationMs: value.durationMs }
			: {}),
	};
}

function normalizeFollowTarget(
	value: unknown,
): FollowTargetComponent | undefined {
	if (!isRecord(value) || typeof value.targetStableId !== "string") {
		return undefined;
	}

	return {
		targetStableId: value.targetStableId,
		...(isVec3Tuple(value.offset) ? { offset: value.offset } : {}),
		...(isVec3Tuple(value.scale) ? { scale: value.scale } : {}),
		...(typeof value.inheritRotation === "boolean"
			? { inheritRotation: value.inheritRotation }
			: {}),
	};
}

function normalizeMovementBehavior(
	value: unknown,
): MovementBehaviorComponent | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	if (value.kind === "static") {
		return { kind: "static" };
	}

	if (value.kind !== "hover-wander" || !isVec3Tuple(value.basePosition)) {
		return undefined;
	}

	return {
		kind: "hover-wander",
		basePosition: value.basePosition,
		radius: positiveFinite(value.radius, 0),
		speed: positiveFinite(value.speed, 0),
		hoverHeight: finite(value.hoverHeight, 0),
		bobAmplitude: positiveFinite(value.bobAmplitude, 0),
		bobSpeed: positiveFinite(value.bobSpeed, 0),
		...(typeof value.phase === "number" && Number.isFinite(value.phase)
			? { phase: value.phase }
			: {}),
	};
}

function normalizeLightModulation(
	value: unknown,
): LightModulationComponent | undefined {
	if (!isRecord(value) || !isNumberPair(value.blinkPeriodSeconds)) {
		return undefined;
	}

	return {
		baseIntensity: positiveFinite(value.baseIntensity, 0),
		baseDistance: positiveFinite(value.baseDistance, 0),
		minimumIntensityScale: clamp01(finite(value.minimumIntensityScale, 0)),
		pulseSpeed: positiveFinite(value.pulseSpeed, 0),
		pulseSoftness: clamp(finite(value.pulseSoftness, 1), 0.01, 1),
		activeLightPercent: clamp01(finite(value.activeLightPercent, 1)),
		blinkPeriodSeconds: value.blinkPeriodSeconds,
		blinkFadeSeconds: positiveFinite(value.blinkFadeSeconds, 0),
		...(typeof value.phase === "number" && Number.isFinite(value.phase)
			? { phase: value.phase }
			: {}),
	};
}

function normalizeStableId(value: unknown): string | undefined {
	return isRecord(value) && typeof value.id === "string" ? value.id : undefined;
}

function hasInteractionRequest(
	events: readonly { readonly type: string; readonly [key: string]: unknown }[],
): boolean {
	return events.some(
		(event) =>
			event.type === "ScreenPointInteractionRequested" ||
			event.type === "ActiveInteractionRequested",
	);
}

function hasCloseRequest(
	events: readonly { readonly type: string; readonly [key: string]: unknown }[],
): boolean {
	return events.some((event) => event.type === "StoryNoteCloseRequested");
}

function finite(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function positiveFinite(value: unknown, fallback: number): number {
	return Math.max(0, finite(value, fallback));
}

function clamp01(value: number): number {
	return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

function isVec3Tuple(
	value: unknown,
): value is readonly [number, number, number] {
	return (
		Array.isArray(value) &&
		value.length === 3 &&
		value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
	);
}

function isNumberPair(value: unknown): value is readonly [number, number] {
	return (
		Array.isArray(value) &&
		value.length === 2 &&
		value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
