import type { LightAuthoringDraftData } from "../../../engine/data/index.js";
import { mirandaLightAuthoringDraft } from "./mirandaLightDraft.js";

export const registeredLightAuthoringDrafts = [
	mirandaLightAuthoringDraft,
] as const satisfies readonly LightAuthoringDraftData[];

const lightAuthoringDraftsByRuntimeSceneId = buildLightAuthoringDraftRegistry(
	registeredLightAuthoringDrafts,
);

export function getLightAuthoringDraftForRuntimeScene(
	runtimeSceneId: string,
): LightAuthoringDraftData | undefined {
	return lightAuthoringDraftsByRuntimeSceneId.get(runtimeSceneId);
}

function buildLightAuthoringDraftRegistry(
	drafts: readonly LightAuthoringDraftData[],
): ReadonlyMap<string, LightAuthoringDraftData> {
	const draftsByRuntimeSceneId = new Map<string, LightAuthoringDraftData>();

	for (const draft of drafts) {
		const existing = draftsByRuntimeSceneId.get(draft.runtimeSceneId);

		if (existing) {
			throw new Error(
				`Light authoring drafts "${existing.id}" and "${draft.id}" both target runtime scene "${draft.runtimeSceneId}".`,
			);
		}

		draftsByRuntimeSceneId.set(draft.runtimeSceneId, draft);
	}

	return draftsByRuntimeSceneId;
}
