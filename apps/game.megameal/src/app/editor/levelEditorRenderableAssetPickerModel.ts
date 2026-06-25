import type {
	EditorObjectLibraryReplacementDraft,
	EditorObjectLibraryReplacementSubject,
} from "../../game/editor/objectLibrary/index.js";
import type { LevelEditorQueuedAuthoringOperation } from "./levelEditorAuthoringStore.js";
import {
	type LevelEditorObjectLibraryPanelEntry,
	type LevelEditorObjectLibraryPanelModel,
	type LevelEditorObjectLibraryPreviewModel,
	createObjectLibraryReplacementQueueEntry,
} from "./levelEditorObjectLibrary.js";

type RenderableReplacementKind =
	| "replace-renderable-mesh"
	| "replace-renderable-material";

export type LevelEditorRenderableAssetPickerScopeId =
	| "level-instance"
	| "prefab-definition"
	| "asset-manifest";

export type LevelEditorRenderableAssetPickerScopeOption = {
	readonly id: LevelEditorRenderableAssetPickerScopeId;
	readonly label: string;
	readonly selected: boolean;
	readonly disabled: boolean;
	readonly status: "active" | "future";
	readonly description: string;
};

export type LevelEditorRenderableAssetPickerSelectionState = {
	readonly state: "current" | "dirty" | "staged" | "unavailable";
	readonly label: string;
	readonly reason: string;
};

export type LevelEditorRenderableAssetPickerCandidate = {
	readonly id: string;
	readonly label: string;
	readonly assetId: string;
	readonly sourceOwner: string;
	readonly preview: LevelEditorObjectLibraryPreviewModel;
	readonly replacementKind: RenderableReplacementKind;
	readonly draft: EditorObjectLibraryReplacementDraft;
	readonly isCurrent: boolean;
};

export type LevelEditorRenderableAssetPickerModel = {
	readonly runtimeSceneId: string;
	readonly selectedObject: EditorObjectLibraryReplacementSubject | null;
	readonly currentMeshId: string | null;
	readonly currentMaterialId: string | null;
	readonly meshCandidates: readonly LevelEditorRenderableAssetPickerCandidate[];
	readonly materialCandidates: readonly LevelEditorRenderableAssetPickerCandidate[];
	readonly selectedMeshCandidate: LevelEditorRenderableAssetPickerCandidate | null;
	readonly selectedMaterialCandidate: LevelEditorRenderableAssetPickerCandidate | null;
	readonly selectedScopeId: LevelEditorRenderableAssetPickerScopeId;
	readonly scopeOptions: readonly LevelEditorRenderableAssetPickerScopeOption[];
	readonly meshSelectionState: LevelEditorRenderableAssetPickerSelectionState;
	readonly materialSelectionState: LevelEditorRenderableAssetPickerSelectionState;
	readonly status:
		| "ready"
		| "no-selection"
		| "missing-renderable"
		| "no-renderable-candidates";
	readonly statusLabel: string;
};

export function buildLevelEditorRenderableAssetPickerModel(options: {
	readonly objectLibraryModel: LevelEditorObjectLibraryPanelModel;
	readonly selectedMeshEntryId?: string | null;
	readonly selectedMaterialEntryId?: string | null;
	readonly queuedOperations?: readonly LevelEditorQueuedAuthoringOperation[];
}): LevelEditorRenderableAssetPickerModel {
	const selectedObject = options.objectLibraryModel.selectedObject;
	const currentRenderable = selectedObject?.currentRenderable ?? null;
	const currentMeshId = currentRenderable?.meshId ?? null;
	const currentMaterialId = currentRenderable?.materialId ?? null;
	const entries = options.objectLibraryModel.groups.flatMap(
		(group) => group.entries,
	);
	const meshCandidates = renderableCandidates({
		entries,
		replacementKind: "replace-renderable-mesh",
		currentAssetId: currentMeshId,
	});
	const materialCandidates = renderableCandidates({
		entries,
		replacementKind: "replace-renderable-material",
		currentAssetId: currentMaterialId,
	});
	const selectedMeshCandidate = selectedCandidate({
		candidates: meshCandidates,
		selectedEntryId: options.selectedMeshEntryId ?? null,
		currentAssetId: currentMeshId,
	});
	const selectedMaterialCandidate = selectedCandidate({
		candidates: materialCandidates,
		selectedEntryId: options.selectedMaterialEntryId ?? null,
		currentAssetId: currentMaterialId,
	});
	const status = pickerStatus({
		selectedObject,
		currentRenderable,
		meshCandidates,
		materialCandidates,
	});

	return {
		runtimeSceneId: options.objectLibraryModel.runtimeSceneId,
		selectedObject,
		currentMeshId,
		currentMaterialId,
		meshCandidates,
		materialCandidates,
		selectedMeshCandidate,
		selectedMaterialCandidate,
		selectedScopeId: "level-instance",
		scopeOptions: renderablePickerScopeOptions(),
		meshSelectionState: selectionState({
			candidate: selectedMeshCandidate,
			currentAssetId: currentMeshId,
			queuedOperations: options.queuedOperations ?? [],
		}),
		materialSelectionState: selectionState({
			candidate: selectedMaterialCandidate,
			currentAssetId: currentMaterialId,
			queuedOperations: options.queuedOperations ?? [],
		}),
		status,
		statusLabel: pickerStatusLabel(status),
	};
}

export function createRenderableAssetPickerQueueEntry(options: {
	readonly runtimeSceneId: string;
	readonly draft: EditorObjectLibraryReplacementDraft;
}): LevelEditorQueuedAuthoringOperation | null {
	if (!isRenderableReplacementKind(options.draft.replacementKind)) {
		return null;
	}

	return createObjectLibraryReplacementQueueEntry({
		runtimeSceneId: options.runtimeSceneId,
		drafts: [options.draft],
		id: renderableAssetPickerQueueEntryId({
			runtimeSceneId: options.runtimeSceneId,
			draft: options.draft,
		}),
		label: "Inspector renderable replacement",
	});
}

export function renderableAssetPickerQueueEntryId(options: {
	readonly runtimeSceneId: string;
	readonly draft: EditorObjectLibraryReplacementDraft;
}): string {
	return `inspector-renderable-replacement:${options.runtimeSceneId}:${options.draft.selectedObject.stableId}:${options.draft.replacementKind}`;
}

function renderableCandidates(options: {
	readonly entries: readonly LevelEditorObjectLibraryPanelEntry[];
	readonly replacementKind: RenderableReplacementKind;
	readonly currentAssetId: string | null;
}): readonly LevelEditorRenderableAssetPickerCandidate[] {
	return options.entries
		.map((entry) =>
			renderableCandidateForEntry({
				entry,
				replacementKind: options.replacementKind,
				currentAssetId: options.currentAssetId,
			}),
		)
		.filter(
			(candidate): candidate is LevelEditorRenderableAssetPickerCandidate =>
				candidate !== null,
		)
		.sort((left, right) => {
			if (left.isCurrent !== right.isCurrent) {
				return left.isCurrent ? -1 : 1;
			}

			return left.label.localeCompare(right.label);
		});
}

function renderableCandidateForEntry(options: {
	readonly entry: LevelEditorObjectLibraryPanelEntry;
	readonly replacementKind: RenderableReplacementKind;
	readonly currentAssetId: string | null;
}): LevelEditorRenderableAssetPickerCandidate | null {
	const draft = options.entry.replacementDraft;
	const assetId = draft?.replacement.assetId;

	if (
		!draft ||
		draft.replacementKind !== options.replacementKind ||
		assetId === undefined
	) {
		return null;
	}

	return {
		id: options.entry.id,
		label: options.entry.label,
		assetId,
		sourceOwner: options.entry.sourceOwner,
		preview: options.entry.preview,
		replacementKind: draft.replacementKind,
		draft,
		isCurrent: assetId === options.currentAssetId,
	};
}

function selectedCandidate(options: {
	readonly candidates: readonly LevelEditorRenderableAssetPickerCandidate[];
	readonly selectedEntryId?: string | null;
	readonly currentAssetId: string | null;
}): LevelEditorRenderableAssetPickerCandidate | null {
	return (
		options.candidates.find(
			(candidate) => candidate.id === options.selectedEntryId,
		) ??
		options.candidates.find(
			(candidate) => candidate.assetId === options.currentAssetId,
		) ??
		options.candidates[0] ??
		null
	);
}

function renderablePickerScopeOptions(): readonly LevelEditorRenderableAssetPickerScopeOption[] {
	return [
		{
			id: "level-instance",
			label: "Instance",
			selected: true,
			disabled: false,
			status: "active",
			description:
				"Stages a Renderable component patch for this selected stable-ID level instance.",
		},
		{
			id: "prefab-definition",
			label: "Prefab",
			selected: false,
			disabled: true,
			status: "future",
			description:
				"Prefab-definition visual replacement needs a separate prefab-owner write contract.",
		},
		{
			id: "asset-manifest",
			label: "Asset",
			selected: false,
			disabled: true,
			status: "future",
			description:
				"Generated or imported asset records need manifest/provenance writers before this scope can be enabled.",
		},
	];
}

function selectionState(options: {
	readonly candidate: LevelEditorRenderableAssetPickerCandidate | null;
	readonly currentAssetId: string | null;
	readonly queuedOperations: readonly LevelEditorQueuedAuthoringOperation[];
}): LevelEditorRenderableAssetPickerSelectionState {
	if (!options.candidate) {
		return {
			state: "unavailable",
			label: "Unavailable",
			reason: "No scene-scoped replacement candidate is selected.",
		};
	}

	const candidate = options.candidate;
	const queued = options.queuedOperations.some(
		(entry) =>
			entry.id ===
			renderableAssetPickerQueueEntryId({
				runtimeSceneId: candidate.draft.runtimeSceneId,
				draft: candidate.draft,
			}),
	);

	if (queued) {
		return {
			state: "staged",
			label: "Staged",
			reason:
				"This replacement is already in the editor authoring queue for this selected level instance.",
		};
	}

	if (options.candidate.assetId === options.currentAssetId) {
		return {
			state: "current",
			label: "Current",
			reason:
				"The selected candidate matches the current renderable asset reference.",
		};
	}

	return {
		state: "dirty",
		label: "Dirty Preview",
		reason:
			"The selected candidate differs from the current renderable asset reference and is not staged yet.",
	};
}

function pickerStatus(options: {
	readonly selectedObject: EditorObjectLibraryReplacementSubject | null;
	readonly currentRenderable:
		| EditorObjectLibraryReplacementSubject["currentRenderable"]
		| null;
	readonly meshCandidates: readonly LevelEditorRenderableAssetPickerCandidate[];
	readonly materialCandidates: readonly LevelEditorRenderableAssetPickerCandidate[];
}): LevelEditorRenderableAssetPickerModel["status"] {
	if (!options.selectedObject) {
		return "no-selection";
	}

	if (!options.currentRenderable) {
		return "missing-renderable";
	}

	if (
		options.meshCandidates.length === 0 &&
		options.materialCandidates.length === 0
	) {
		return "no-renderable-candidates";
	}

	return "ready";
}

function pickerStatusLabel(
	status: LevelEditorRenderableAssetPickerModel["status"],
): string {
	switch (status) {
		case "ready":
			return "Manifest-backed mesh and material replacements can be previewed for this level instance.";
		case "no-selection":
			return "Select a level instance to inspect renderable asset references.";
		case "missing-renderable":
			return "The selected level instance does not expose a Renderable component snapshot.";
		case "no-renderable-candidates":
			return "No scene-scoped mesh or material replacement candidates are available.";
	}
}

function isRenderableReplacementKind(
	kind: EditorObjectLibraryReplacementDraft["replacementKind"],
): kind is RenderableReplacementKind {
	return (
		kind === "replace-renderable-mesh" || kind === "replace-renderable-material"
	);
}
