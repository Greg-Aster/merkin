import type { Entity, System } from "../../engine/core/index.js";
import { lengthSquaredVec3, subtractVec3 } from "../../engine/math/index.js";
import {
	type RenderTransform,
	TRANSFORM_COMPONENT,
} from "../../engine/modules/rendering/index.js";
import {
	ACTIVE_INTERACTION_TARGET_RESOURCE,
	ACTIVE_STORY_NOTE_RESOURCE,
	type ActiveInteractionTargetState,
	type ActiveStoryNoteState,
	OPEN_STORY_NOTE_RESOURCE,
	PLAYER_ENTITY_RESOURCE,
	STORY_NOTE_COMPONENT,
	type StoryNoteComponent,
} from "./components.js";

const DEFAULT_STORY_NOTE_ACTIVATION_RADIUS = 2.35;

export function createStoryNoteProximitySystem<
	TContext extends StoryNoteProximityContext,
>(): System<TContext> {
	return {
		id: "story-note-proximity",
		reads: [TRANSFORM_COMPONENT, STORY_NOTE_COMPONENT],
		writes: [ACTIVE_STORY_NOTE_RESOURCE],
		update(context) {
			const player = context.world.getResource<Entity>(PLAYER_ENTITY_RESOURCE);

			if (player === undefined || !context.world.isAlive(player)) {
				context.world.removeResource(ACTIVE_STORY_NOTE_RESOURCE);
				return;
			}

			const playerTransform = context.world.getComponent<RenderTransform>(
				player,
				TRANSFORM_COMPONENT,
			);

			if (!playerTransform) {
				context.world.removeResource(ACTIVE_STORY_NOTE_RESOURCE);
				return;
			}

			let activeStoryNote: ActiveStoryNoteState | undefined;
			let activeDistanceSquared = Number.POSITIVE_INFINITY;

			for (const entity of context.world.query([
				TRANSFORM_COMPONENT,
				STORY_NOTE_COMPONENT,
			])) {
				const note = normalizeStoryNote(
					context.world.getComponent(entity, STORY_NOTE_COMPONENT),
				);
				const transform = context.world.getComponent<RenderTransform>(
					entity,
					TRANSFORM_COMPONENT,
				);

				if (!note || !transform) {
					continue;
				}

				const radius =
					note.activationRadius ?? DEFAULT_STORY_NOTE_ACTIVATION_RADIUS;
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
				activeStoryNote = {
					entity,
					id: note.id,
					title: note.title,
					author: note.author,
					location: note.location,
					excerpt: note.excerpt,
					body: note.body,
					prompt: `Read ${note.title}`,
					distanceSquared,
				};
			}

			if (activeStoryNote) {
				context.world.setResource(ACTIVE_STORY_NOTE_RESOURCE, activeStoryNote);
			} else {
				context.world.removeResource(ACTIVE_STORY_NOTE_RESOURCE);
			}
		},
	};
}

export function createStoryNoteActivationSystem<
	TContext extends StoryNoteActivationContext,
>(): System<TContext> {
	return {
		id: "story-note-activation",
		reads: [ACTIVE_INTERACTION_TARGET_RESOURCE, ACTIVE_STORY_NOTE_RESOURCE],
		writes: [OPEN_STORY_NOTE_RESOURCE],
		update(context) {
			if (hasStoryNoteCloseRequest(context.events.peek())) {
				context.world.removeResource(OPEN_STORY_NOTE_RESOURCE);
				return;
			}

			if (!hasStoryNoteInteractionRequest(context.events.peek())) {
				return;
			}

			const activeTarget =
				context.world.getResource<ActiveInteractionTargetState>(
					ACTIVE_INTERACTION_TARGET_RESOURCE,
				);

			if (activeTarget?.kind !== "story-note") {
				return;
			}

			const activeStoryNote = context.world.getResource<ActiveStoryNoteState>(
				ACTIVE_STORY_NOTE_RESOURCE,
			);

			if (!activeStoryNote || activeStoryNote.entity !== activeTarget.entity) {
				return;
			}

			context.world.setResource(OPEN_STORY_NOTE_RESOURCE, activeStoryNote);
			context.events.emit({
				type: "StoryNoteOpened",
				entity: activeStoryNote.entity,
				storyNoteId: activeStoryNote.id,
			});
		},
	};
}

type StoryNoteProximityContext = {
	readonly world: StoryNoteWorld;
};

type StoryNoteActivationContext = {
	readonly world: StoryNoteWorld;
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

type StoryNoteWorld = {
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

function hasStoryNoteInteractionRequest(
	events: readonly { readonly type: string; readonly [key: string]: unknown }[],
): boolean {
	return events.some(
		(event) =>
			event.type === "ScreenPointInteractionRequested" ||
			event.type === "ActiveInteractionRequested",
	);
}

function hasStoryNoteCloseRequest(
	events: readonly { readonly type: string; readonly [key: string]: unknown }[],
): boolean {
	return events.some((event) => event.type === "StoryNoteCloseRequested");
}

function normalizeStoryNote(value: unknown): StoryNoteComponent | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	if (
		typeof value.id !== "string" ||
		typeof value.title !== "string" ||
		typeof value.author !== "string" ||
		typeof value.location !== "string" ||
		typeof value.excerpt !== "string" ||
		typeof value.body !== "string"
	) {
		return undefined;
	}

	return {
		id: value.id,
		title: value.title,
		author: value.author,
		location: value.location,
		excerpt: value.excerpt,
		body: value.body,
		...(typeof value.markerColor === "string"
			? { markerColor: value.markerColor }
			: {}),
		...(typeof value.markerSize === "number" &&
		Number.isFinite(value.markerSize) &&
		value.markerSize > 0
			? { markerSize: value.markerSize }
			: {}),
		...(typeof value.activationRadius === "number" &&
		Number.isFinite(value.activationRadius) &&
		value.activationRadius > 0
			? { activationRadius: value.activationRadius }
			: {}),
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
