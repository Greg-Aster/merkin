import type { System } from "../../engine/core/index.js";
import {
	ACTIVE_INTERACTION_TARGET_RESOURCE,
	ACTIVE_PORTAL_RESOURCE,
	ACTIVE_STORY_NOTE_RESOURCE,
	type ActiveInteractionTargetState,
	type ActivePortalState,
	type ActiveStoryNoteState,
} from "./components.js";

export function createInteractionTargetSelectionSystem<
	TContext extends InteractionTargetSelectionContext,
>(): System<TContext> {
	return {
		id: "interaction-target-selection",
		reads: [ACTIVE_PORTAL_RESOURCE, ACTIVE_STORY_NOTE_RESOURCE],
		writes: [ACTIVE_INTERACTION_TARGET_RESOURCE],
		update(context) {
			const activePortal = context.world.getResource<ActivePortalState>(
				ACTIVE_PORTAL_RESOURCE,
			);
			const activeStoryNote = context.world.getResource<ActiveStoryNoteState>(
				ACTIVE_STORY_NOTE_RESOURCE,
			);
			const selected = selectActiveInteractionTarget(
				activePortal,
				activeStoryNote,
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
): ActiveInteractionTargetState | undefined {
	if (!activePortal && !activeStoryNote) {
		return undefined;
	}

	if (activePortal && activeStoryNote) {
		if (activePortal.distanceSquared <= activeStoryNote.distanceSquared) {
			return {
				kind: "portal",
				...activePortal,
			};
		}

		return {
			kind: "story-note",
			...activeStoryNote,
		};
	}

	if (activePortal) {
		return {
			kind: "portal",
			...activePortal,
		};
	}

	if (activeStoryNote) {
		return {
			kind: "story-note",
			...activeStoryNote,
		};
	}

	return undefined;
}
