import {
	EDITOR_AI_ASSET_CONTRACT_VERSION,
	type EditorAiApplyOperationKind,
	type EditorAiApplyToSelectionPlan,
	type EditorAiApplyToSelectionRequest,
	type EditorAiFitReport,
	type EditorAiGeneratedAssetLibraryRecord,
	type EditorAiLevelEditOperation,
} from "./contracts.js";

export function buildEditorAiApplyToSelectionPlan(
	record: EditorAiGeneratedAssetLibraryRecord,
	request: EditorAiApplyToSelectionRequest,
): EditorAiApplyToSelectionPlan {
	if (record.id !== request.generatedAssetId) {
		throw new Error(
			`Generated asset request references "${request.generatedAssetId}", but the library record is "${record.id}".`,
		);
	}

	if (record.runtimeSceneId !== request.runtimeSceneId) {
		throw new Error(
			`Generated asset "${record.id}" belongs to runtime scene "${record.runtimeSceneId}", not "${request.runtimeSceneId}".`,
		);
	}

	const selectedStableIds = [...new Set(request.selectedStableIds)];
	const operation = request.operation;
	const editOperations = buildLevelEditOperations(record, {
		operation,
		runtimeSceneId: request.runtimeSceneId,
		selectedStableIds,
		preserveStableIds: request.preserveStableIds ?? true,
	});

	return {
		schemaVersion: EDITOR_AI_ASSET_CONTRACT_VERSION,
		runtimeSceneId: request.runtimeSceneId,
		generatedAssetId: request.generatedAssetId,
		operation,
		previewOnly: false,
		mutatesRuntimeDirectly: false,
		ownerManifestStatus: "requires-generated-manifest-record",
		editOperations,
		fitReport: fitReportForApplyRequest(record, request, selectedStableIds),
	};
}

export function parseEditorAiApplyToSelectionRequest(
	input: unknown,
): EditorAiApplyToSelectionRequest {
	const record = asRecord(input, "AI apply-to-selection request");
	const operation = stringField(record, "operation");

	if (!isEditorAiApplyOperationKind(operation)) {
		throw new Error(`Unsupported AI apply operation "${operation}".`);
	}

	const selectedStableIds = arrayOfStrings(record.selectedStableIds);

	return {
		runtimeSceneId: stringField(record, "runtimeSceneId"),
		generatedAssetId: stringField(record, "generatedAssetId"),
		selectedStableIds,
		operation,
		...(typeof record.preserveStableIds === "boolean"
			? { preserveStableIds: record.preserveStableIds }
			: {}),
		...(typeof record.fitToSelection === "boolean"
			? { fitToSelection: record.fitToSelection }
			: {}),
	};
}

function buildLevelEditOperations(
	record: EditorAiGeneratedAssetLibraryRecord,
	options: {
		readonly operation: EditorAiApplyOperationKind;
		readonly runtimeSceneId: string;
		readonly selectedStableIds: readonly string[];
		readonly preserveStableIds: boolean;
	},
): readonly EditorAiLevelEditOperation[] {
	switch (options.operation) {
		case "insert-generated-asset":
			return [
				{
					type: "insert-level-instance",
					runtimeSceneId: options.runtimeSceneId,
					targetStableId: null,
					generatedAssetId: record.id,
					preserveStableId: false,
					componentPatch: renderablePatchForRecord(record),
					ownerWritePlanStatus: "requires-save",
				},
			];
		case "replace-selection-renderable":
			requireSelection(options.selectedStableIds, options.operation);
			return options.selectedStableIds.map((stableId) => ({
				type: "patch-level-instance-renderable",
				runtimeSceneId: options.runtimeSceneId,
				targetStableId: stableId,
				generatedAssetId: record.id,
				preserveStableId: options.preserveStableIds,
				componentPatch: renderablePatchForRecord(record),
				ownerWritePlanStatus: "requires-save",
			}));
		case "assign-generated-material":
			requireSelection(options.selectedStableIds, options.operation);
			if (record.kind !== "material" && record.kind !== "texture") {
				throw new Error(
					`Generated asset "${record.id}" is a ${record.kind}; material assignment requires material or texture output.`,
				);
			}
			return options.selectedStableIds.map((stableId) => ({
				type: "patch-level-instance-material",
				runtimeSceneId: options.runtimeSceneId,
				targetStableId: stableId,
				generatedAssetId: record.id,
				preserveStableId: true,
				componentPatch: {
					Renderable: {
						materialAssetId: record.assetId,
					},
				},
				ownerWritePlanStatus: "requires-save",
			}));
	}
}

function fitReportForApplyRequest(
	record: EditorAiGeneratedAssetLibraryRecord,
	request: EditorAiApplyToSelectionRequest,
	selectedStableIds: readonly string[],
): EditorAiFitReport {
	return {
		status: request.fitToSelection ? "fit-to-selection" : "not-requested",
		sourceStableId: record.metadata.sourceStableId,
		targetStableIds: selectedStableIds,
		transformPolicy: request.fitToSelection
			? "fit-to-source-bounds"
			: "preserve-selection",
	};
}

function renderablePatchForRecord(
	record: EditorAiGeneratedAssetLibraryRecord,
): EditorAiLevelEditOperation["componentPatch"] {
	if (record.kind === "mesh") {
		return {
			Renderable: {
				meshAssetId: record.assetId,
			},
		};
	}

	return {
		Renderable: {
			materialAssetId: record.assetId,
		},
	};
}

function requireSelection(
	stableIds: readonly string[],
	operation: EditorAiApplyOperationKind,
): void {
	if (stableIds.length === 0) {
		throw new Error(`${operation} requires at least one selected stable ID.`);
	}
}

function isEditorAiApplyOperationKind(
	value: string,
): value is EditorAiApplyOperationKind {
	return (
		value === "insert-generated-asset" ||
		value === "replace-selection-renderable" ||
		value === "assign-generated-material"
	);
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`${label} must be a JSON object.`);
	}

	return value as Record<string, unknown>;
}

function stringField(record: Record<string, unknown>, field: string): string {
	const value = record[field];

	if (typeof value !== "string") {
		throw new Error(`${field} must be a string.`);
	}

	return value;
}

function arrayOfStrings(value: unknown): readonly string[] {
	if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
		throw new Error("selectedStableIds must be an array of strings.");
	}

	return value;
}
