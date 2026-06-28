import type { System } from "../../engine/core/index.js";
import {
	ACTIVE_INTERACTION_TARGET_RESOURCE,
	ACTIVE_NPC_RESOURCE,
	ACTIVE_PORTAL_RESOURCE,
	ACTIVE_STORY_NOTE_RESOURCE,
	type ActiveInteractionTargetState,
	type ActiveNpcState,
	type ActivePortalState,
	type ActiveStoryNoteState,
} from "./components.js";

export function createInteractionTargetSelectionSystem<
	TContext extends InteractionTargetSelectionContext,
>(): System<TContext> {
	return {
		id: "interaction-target-selection",
		reads: [
			ACTIVE_PORTAL_RESOURCE,
			ACTIVE_STORY_NOTE_RESOURCE,
			ACTIVE_NPC_RESOURCE,
		],
		writes: [ACTIVE_INTERACTION_TARGET_RESOURCE],
		update(context) {
			const activePortal = context.world.getResource<ActivePortalState>(
				ACTIVE_PORTAL_RESOURCE,
			);
			const activeStoryNote = context.world.getResource<ActiveStoryNoteState>(
				ACTIVE_STORY_NOTE_RESOURCE,
			);
			const activeNpc =
				context.world.getResource<ActiveNpcState>(ACTIVE_NPC_RESOURCE);
			const selected = selectActiveInteractionTarget(
				activePortal,
				activeStoryNote,
				activeNpc,
			);

			if (selected) {
				context.world.setResource(ACTIVE_INTERACTION_TARGET_RESOURCE, selected);
			} else {
				context.world.removeResource(ACTIVE_INTERACTION_TARGET_RESOURCE);
			}
		},
	};
}

type InteractionTargetSelectionContext = {
	readonly world: {
		getResource<TResource>(resourceName: string): TResource | undefined;
		setResource<TResource>(
			resourceName: string,
			resource: TResource,
		): TResource;
		removeResource<TResource = unknown>(
			resourceName: string,
		): TResource | undefined;
	};
};

function selectActiveInteractionTarget(
	activePortal: ActivePortalState | undefined,
	activeStoryNote: ActiveStoryNoteState | undefined,
	activeNpc: ActiveNpcState | undefined,
): ActiveInteractionTargetState | undefined {
	if (!activePortal && !activeStoryNote && !activeNpc) {
		return undefined;
	}

	return [
		activePortal ? { kind: "portal" as const, ...activePortal } : undefined,
		activeStoryNote
			? { kind: "story-note" as const, ...activeStoryNote }
			: undefined,
		activeNpc ? { kind: "npc" as const, ...activeNpc } : undefined,
	]
		.filter(
			(target): target is ActiveInteractionTargetState => target !== undefined,
		)
		.sort(
			(left, right) =>
				left.distanceSquared - right.distanceSquared ||
				left.kind.localeCompare(right.kind),
		)[0];
}
