import type {
	CollisionCookBakeFileData,
	CollisionCookPlan,
	CollisionCookPreviewPatch,
} from "./types.js";
import { cloneValue, hashStableValue, sortedUnique } from "./utils.js";
import { parseCollisionCookDraft } from "./validators.js";
import { buildCollisionCookWritePlan } from "./writePlan.js";

export function buildCollisionCookPlan(draftInput: unknown): CollisionCookPlan {
	const draft = parseCollisionCookDraft(draftInput);
	const requiredEntries = draft.entries.filter(
		(entry) => entry.readiness.requiredCollision,
	);

	return {
		draftId: draft.id,
		runtimeSceneId: draft.runtimeSceneId,
		levelId: draft.levelId,
		targetFiles: draft.targetFiles,
		entries: draft.entries.map((entry) => ({
			...cloneValue(entry),
			colliderComponent: cloneValue(entry.collider),
		})),
		requiredCollisionPrefabIds: sortedUnique(
			requiredEntries.map((entry) => entry.prefabId),
		),
		requiredCollisionStableIds: sortedUnique(
			requiredEntries.map((entry) => entry.stableId),
		),
		requiredWalkableStableIds: sortedUnique(
			draft.entries
				.filter((entry) => entry.readiness.requiredWalkable === true)
				.map((entry) => entry.stableId),
		),
	};
}

export function buildCollisionCookPreviewPatch(
	planInput: CollisionCookPlan,
): CollisionCookPreviewPatch {
	const plan = cloneValue(planInput);

	return {
		schemaVersion: 1,
		channel: "level-editor-collision-preview",
		mode: "temporary-preview",
		draftId: plan.draftId,
		runtimeSceneId: plan.runtimeSceneId,
		levelId: plan.levelId,
		sourcePlanHash: hashStableValue(plan),
		entries: plan.entries.map((entry) => ({
			id: entry.id,
			stableId: entry.stableId,
			prefabId: entry.prefabId,
			colliderTarget: entry.colliderTarget,
			...(entry.transform === undefined
				? {}
				: { transform: cloneValue(entry.transform) }),
			colliderComponent: cloneValue(entry.colliderComponent),
			readiness: cloneValue(entry.readiness),
		})),
		requiredCollisionStableIds: plan.requiredCollisionStableIds,
		requiredWalkableStableIds: plan.requiredWalkableStableIds,
	};
}

export function buildCollisionCookBakeFile(
	planInput: CollisionCookPlan,
): CollisionCookBakeFileData {
	const plan = cloneValue(planInput);
	const writePlan = buildCollisionCookWritePlan(plan);
	const previewPatch = buildCollisionCookPreviewPatch(plan);
	const bakeFile = {
		schemaVersion: 1,
		generator: "collisionCook.bake.v1",
		contract: "LevelEditorCollisionCookContract",
		writesRuntimeData: false,
		draftId: plan.draftId,
		runtimeSceneId: plan.runtimeSceneId,
		levelId: plan.levelId,
		writePlan,
		previewPatch,
	} satisfies Omit<CollisionCookBakeFileData, "contentHash">;

	return {
		...bakeFile,
		contentHash: hashStableValue(bakeFile),
	};
}
