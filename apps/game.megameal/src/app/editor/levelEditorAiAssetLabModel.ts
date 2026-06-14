import type { LevelEditorAuthoringEditOperation } from "../../engine/data/levelAuthoring/index.js";
import type {
	EditorAiApplyToSelectionPlan,
	EditorAiAssetJob,
	EditorAiBackendId,
	EditorAiGeneratedAssetLibraryRecord,
	EditorAiLevelEditOperation,
	EditorAiServiceStatusReport,
} from "../../game/editor/ai/index.js";
import {
	EDITOR_AI_ASSET_CONTRACT_VERSION,
	defaultEditorAiServiceDefinitions,
} from "../../game/editor/ai/index.js";
import type { LevelEditorAuthoringOperationData } from "../../game/editor/authoring/saveTransaction.js";
import type { LevelEditorQueuedAuthoringOperation } from "./levelEditorAuthoringStore.js";

export type LevelEditorAiAssetLabEndpointMap = {
	readonly status: "/api/editor/ai/status.json";
	readonly jobs: "/api/editor/ai/jobs.json";
	readonly cancel: "/api/editor/ai/cancel.json";
	readonly library: "/api/editor/ai/library.json";
	readonly applySelection: "/api/editor/ai/apply-selection.json";
};

export type LevelEditorAiAssetLabModel = {
	readonly schemaVersion: 1;
	readonly endpoints: LevelEditorAiAssetLabEndpointMap;
	readonly selectedBackend: EditorAiBackendId;
	readonly serviceStatus: EditorAiServiceStatusReport | null;
	readonly jobs: readonly EditorAiAssetJob[];
	readonly generatedAssets: readonly EditorAiGeneratedAssetLibraryRecord[];
};

export const levelEditorAiAssetLabEndpoints: LevelEditorAiAssetLabEndpointMap =
	{
		status: "/api/editor/ai/status.json",
		jobs: "/api/editor/ai/jobs.json",
		cancel: "/api/editor/ai/cancel.json",
		library: "/api/editor/ai/library.json",
		applySelection: "/api/editor/ai/apply-selection.json",
	};

export function buildLevelEditorAiAssetLabModel(
	options: {
		readonly serviceStatus?: EditorAiServiceStatusReport;
		readonly jobs?: readonly EditorAiAssetJob[];
		readonly generatedAssets?: readonly EditorAiGeneratedAssetLibraryRecord[];
		readonly selectedBackend?: EditorAiBackendId;
	} = {},
): LevelEditorAiAssetLabModel {
	return {
		schemaVersion: 1,
		endpoints: levelEditorAiAssetLabEndpoints,
		selectedBackend: options.selectedBackend ?? "hunyuan3d",
		serviceStatus: options.serviceStatus ?? null,
		jobs: options.jobs ?? [],
		generatedAssets: options.generatedAssets ?? [],
	};
}

export function buildLevelEditorAiApplyPlanQueueEntry(
	plan: EditorAiApplyToSelectionPlan,
	generatedAsset?: EditorAiGeneratedAssetLibraryRecord,
): LevelEditorQueuedAuthoringOperation {
	const operations = plan.editOperations.flatMap((operation) => {
		const authoringOperation = authoringOperationForAiEditOperation(operation);

		return authoringOperation === null ? [] : [authoringOperation];
	});
	const saveOperations = [
		saveOperationForAiGeneratedAsset(plan, generatedAsset),
		...plan.editOperations.map((operation) =>
			saveOperationForAiEditOperation(plan, operation),
		),
	];

	return {
		id: `ai-asset-lab:${plan.runtimeSceneId}:${plan.generatedAssetId}:${plan.operation}`,
		label: "AI Asset Lab generated asset",
		...(operations.length === 0 ? {} : { operations }),
		saveOperations,
	};
}

export function buildLevelEditorAiAssetLabOfflineStatus(
	reason: string,
	checkedAt = new Date().toISOString(),
): EditorAiServiceStatusReport {
	return {
		schemaVersion: EDITOR_AI_ASSET_CONTRACT_VERSION,
		mode: "api-unreachable",
		checkedAt,
		services: defaultEditorAiServiceDefinitions.map((definition) => ({
			...definition,
			checkedAt,
			status: "unavailable",
			responseMs: null,
			reason,
		})),
		availableBackends: [],
		unavailableBackends: defaultEditorAiServiceDefinitions.map(
			(definition) => definition.backend,
		),
	};
}

function authoringOperationForAiEditOperation(
	operation: EditorAiLevelEditOperation,
): LevelEditorAuthoringEditOperation | null {
	const renderablePatch = operation.componentPatch.Renderable;

	if (operation.targetStableId === null || renderablePatch === undefined) {
		return null;
	}

	return {
		id: `ai-asset-lab:${operation.generatedAssetId}:${operation.type}:${operation.targetStableId}`,
		kind: "set-component",
		persistence: "saved",
		stableId: operation.targetStableId,
		target: "level-instance",
		componentName: "Renderable",
		value: { ...renderablePatch },
		note: "AI Asset Lab apply plan staged from a generated asset.",
	} satisfies LevelEditorAuthoringEditOperation;
}

function saveOperationForAiGeneratedAsset(
	plan: EditorAiApplyToSelectionPlan,
	generatedAsset: EditorAiGeneratedAssetLibraryRecord | undefined,
): LevelEditorAuthoringOperationData {
	return {
		kind: "replace-asset",
		ownerKind: "asset",
		ownerTargetId: `${plan.runtimeSceneId}:assets`,
		subjectId: generatedAsset?.assetId ?? plan.generatedAssetId,
		payload: {
			source: "editor-ai-generated-asset-manifest",
			generatedAssetId: plan.generatedAssetId,
			ownerManifestStatus: plan.ownerManifestStatus,
			...(generatedAsset === undefined ? {} : { generatedAsset }),
		},
	} satisfies LevelEditorAuthoringOperationData;
}

function saveOperationForAiEditOperation(
	plan: EditorAiApplyToSelectionPlan,
	operation: EditorAiLevelEditOperation,
): LevelEditorAuthoringOperationData {
	return {
		kind:
			operation.type === "insert-level-instance"
				? "insert-level-instance"
				: "replace-level-instance",
		ownerKind: "level",
		ownerTargetId: `${operation.runtimeSceneId}:level`,
		subjectId:
			operation.targetStableId ?? `generated:${operation.generatedAssetId}`,
		payload: {
			source: "editor-ai-apply-selection",
			applyOperation: plan.operation,
			generatedAssetId: plan.generatedAssetId,
			ownerManifestStatus: plan.ownerManifestStatus,
			fitReport: plan.fitReport,
			editOperation: operation,
		},
	} satisfies LevelEditorAuthoringOperationData;
}
