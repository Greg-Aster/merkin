import type { Entity, World } from "../../engine/core/index.js";
import type { InputSnapshot } from "../../engine/modules/input/index.js";
import {
	type RenderTransform,
	TRANSFORM_COMPONENT,
} from "../../engine/modules/rendering/index.js";
import {
	ACTIVE_INTERACTION_TARGET_RESOURCE,
	ACTIVE_PORTAL_RESOURCE,
	ACTIVE_STORY_NOTE_RESOURCE,
	type ActiveInteractionTargetState,
	type ActivePortalState,
	type ActiveStoryNoteState,
	CHARGED_ACTION_COMPONENT,
	COLLECTED_COUNT_RESOURCE,
	COLLECTIBLE_COMPONENT,
	type ChargedActionComponent,
	type GameHudState,
	HEALTH_COMPONENT,
	type HealthComponent,
	INPUT_SNAPSHOT_RESOURCE,
	MOVEMENT_INTENT_COMPONENT,
	OPEN_STORY_NOTE_RESOURCE,
	type OpenStoryNoteState,
	PLAYER_ENTITY_RESOURCE,
} from "./components.js";

export function selectGameHudState(world: World): GameHudState {
	const player = world.getResource<Entity>(PLAYER_ENTITY_RESOURCE);
	const transform =
		player === undefined
			? undefined
			: world.getComponent<RenderTransform>(player, TRANSFORM_COMPONENT);
	const health =
		player === undefined
			? undefined
			: world.getComponent<HealthComponent>(player, HEALTH_COMPONENT);
	const input = world.getResource<InputSnapshot>(INPUT_SNAPSHOT_RESOURCE);
	const activePortal = world.getResource<ActivePortalState>(
		ACTIVE_PORTAL_RESOURCE,
	);
	const activeStoryNote = world.getResource<ActiveStoryNoteState>(
		ACTIVE_STORY_NOTE_RESOURCE,
	);
	const activeInteractionTarget =
		world.getResource<ActiveInteractionTargetState>(
			ACTIVE_INTERACTION_TARGET_RESOURCE,
		);
	const openStoryNote = world.getResource<OpenStoryNoteState>(
		OPEN_STORY_NOTE_RESOURCE,
	);
	const chargedAction =
		player === undefined
			? undefined
			: world.getComponent<ChargedActionComponent>(
					player,
					CHARGED_ACTION_COMPONENT,
				);

	return {
		playerAlive: player !== undefined && world.isAlive(player),
		playerPosition: transform
			? [transform.position.x, transform.position.y, transform.position.z]
			: [0, 0, 0],
		health: health ? [health.current, health.max] : [0, 0],
		remainingCollectibles: world.query([COLLECTIBLE_COMPONENT]).length,
		collectedCount: world.getResource<number>(COLLECTED_COUNT_RESOURCE) ?? 0,
		moving:
			player !== undefined &&
			world.hasComponent(player, MOVEMENT_INTENT_COMPONENT),
		pointerLocked: input?.focus.pointerLocked ?? false,
		lookActive: input?.pointer.lookActive ?? false,
		inputEnabled: input?.focus.gameplayInputEnabled ?? false,
		charging: chargedAction?.active ?? false,
		chargeAmount: chargedAction?.normalizedCharge ?? 0,
		...(activeInteractionTarget?.kind === "portal" && activePortal
			? {
					activePortal: {
						label: activePortal.label,
						prompt: activePortal.prompt,
						canTravel: activePortal.canTravel,
					},
				}
			: {}),
		...(activeInteractionTarget?.kind === "story-note" && activeStoryNote
			? {
					activeStoryNote: {
						title: activeStoryNote.title,
						author: activeStoryNote.author,
						location: activeStoryNote.location,
						excerpt: activeStoryNote.excerpt,
						prompt: activeStoryNote.prompt,
					},
				}
			: {}),
		...(openStoryNote
			? {
					openStoryNote: {
						title: openStoryNote.title,
						author: openStoryNote.author,
						location: openStoryNote.location,
						excerpt: openStoryNote.excerpt,
						body: openStoryNote.body,
					},
				}
			: {}),
	};
}
