import type {
	CollisionCookPreviewPatch,
	CollisionCookPreviewPatchEntry,
} from "../../engine/data/index.js";
import type { LevelEditorAuthoringOperationData } from "../../game/editor/authoring/saveTransaction.js";
import type { LevelEditorQueuedAuthoringOperation } from "./levelEditorAuthoringStore.js";

export type StageCollisionAuthoringOperationsCallback = (
	entry: LevelEditorQueuedAuthoringOperation,
) => void;

export function buildCollisionPreviewGeneratedSaveQueueEntry(
	previewPatch: CollisionCookPreviewPatch,
): LevelEditorQueuedAuthoringOperation | null {
	const saveOperations = previewPatch.entries.map((entry) =>
		saveOperationForCollisionPreviewEntry(previewPatch, entry),
	);

	if (saveOperations.length === 0) {
		return null;
	}

	return {
		id: `collision-preview:${previewPatch.runtimeSceneId}:${previewPatch.draftId}`,
		label: "Collision preview authoring",
		saveOperations,
	};
}

function saveOperationForCollisionPreviewEntry(
	previewPatch: CollisionCookPreviewPatch,
	entry: CollisionCookPreviewPatchEntry,
): LevelEditorAuthoringOperationData {
	const owner = ownerForColliderTarget(
		previewPatch.runtimeSceneId,
		entry.colliderTarget,
	);

	return {
		kind:
			owner.ownerKind === "prefab"
				? "replace-prefab"
				: "replace-level-instance",
		ownerKind: owner.ownerKind,
		ownerTargetId: owner.ownerTargetId,
		subjectId:
			entry.colliderTarget === "prefab" ? entry.prefabId : entry.stableId,
		payload: {
			operation: "stage-collision-preview-entry",
			draftId: previewPatch.draftId,
			levelId: previewPatch.levelId,
			sourcePlanHash: previewPatch.sourcePlanHash,
			entry: cloneJson(entry),
		},
	} satisfies LevelEditorAuthoringOperationData;
}

function ownerForColliderTarget(
	runtimeSceneId: string,
	colliderTarget: CollisionCookPreviewPatchEntry["colliderTarget"],
): Pick<LevelEditorAuthoringOperationData, "ownerKind" | "ownerTargetId"> {
	if (colliderTarget === "prefab") {
		return {
			ownerKind: "prefab",
			ownerTargetId: `${runtimeSceneId}:prefabs`,
		};
	}

	return {
		ownerKind: "level",
		ownerTargetId: `${runtimeSceneId}:level`,
	};
}

function cloneJson<TValue>(value: TValue): TValue {
	return JSON.parse(JSON.stringify(value)) as TValue;
}
