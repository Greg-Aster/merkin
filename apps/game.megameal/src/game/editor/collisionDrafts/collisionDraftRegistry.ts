import type { CollisionCookDraftData } from "../../../engine/data/index.js";
import { mirandaCollisionCookDraft } from "./mirandaCollisionDraft.js";
import { observatoryCollisionCookDraft } from "./observatoryCollisionDraft.js";

export const registeredCollisionCookDrafts = [
	mirandaCollisionCookDraft,
	observatoryCollisionCookDraft,
] as const satisfies readonly CollisionCookDraftData[];

const collisionCookDraftsByRuntimeSceneId = buildCollisionCookDraftRegistry(
	registeredCollisionCookDrafts,
);

export function getCollisionCookDraftForRuntimeScene(
	runtimeSceneId: string,
): CollisionCookDraftData | undefined {
	return collisionCookDraftsByRuntimeSceneId.get(runtimeSceneId);
}

export function listCollisionCookDraftRuntimeSceneIds(): readonly string[] {
	return [...collisionCookDraftsByRuntimeSceneId.keys()].sort();
}

function buildCollisionCookDraftRegistry(
	drafts: readonly CollisionCookDraftData[],
): ReadonlyMap<string, CollisionCookDraftData> {
	const draftsByRuntimeSceneId = new Map<string, CollisionCookDraftData>();

	for (const draft of drafts) {
		const existing = draftsByRuntimeSceneId.get(draft.runtimeSceneId);

		if (existing) {
			throw new Error(
				`Collision cook drafts "${existing.id}" and "${draft.id}" both target runtime scene "${draft.runtimeSceneId}".`,
			);
		}

		draftsByRuntimeSceneId.set(draft.runtimeSceneId, draft);
	}

	return draftsByRuntimeSceneId;
}
