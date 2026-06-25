import { buildAuthoringSaveTransaction } from "../src/app/editor/levelEditorAuthoringClient.js";
import {
	buildLevelEditorAuthoringTransactionFromQueue,
	createLevelEditorAuthoringQueue,
	stageLevelEditorAuthoringOperations,
} from "../src/app/editor/levelEditorAuthoringStore.js";
import { objectLibraryComponentSnapshots } from "../src/app/editor/levelEditorCoreObjectPreviewPatch.js";
import {
	buildLevelEditorObjectLibraryPanelModel,
	objectLibrarySubjectFromSelection,
} from "../src/app/editor/levelEditorObjectLibrary.js";
import {
	buildLevelEditorRenderableAssetPickerModel,
	createRenderableAssetPickerQueueEntry,
} from "../src/app/editor/levelEditorRenderableAssetPickerModel.js";
import { buildLevelEditorWorkspaceModel } from "../src/app/editor/levelEditorWorkspaceModel.js";
import { portalArenaRuntimeSceneManifest } from "../src/game/levels/index.js";
import {
	assertDefined,
	assertEqual,
	assertRecord,
} from "./contractTestHelpers.js";

const workspaceModel = buildLevelEditorWorkspaceModel({
	selectedRuntimeSceneId: portalArenaRuntimeSceneManifest.id,
});
const selectedObject = assertDefined(
	workspaceModel.objects.find((object) => object.stableId === "player"),
	"Expected portal arena player object to exist for renderable picker coverage.",
);
const renderableSnapshot = assertRecord(
	selectedObject.previewSeed?.renderable,
	"selected object renderable preview seed",
);

assertEqual(
	renderableSnapshot.meshId,
	"mesh_player",
	"Expected selected object preview seed to expose current Renderable.meshId.",
);
assertEqual(
	renderableSnapshot.materialId,
	"material_player",
	"Expected selected object preview seed to expose current Renderable.materialId.",
);

const selectedSubject = objectLibrarySubjectFromSelection({
	stableId: selectedObject.stableId,
	label: selectedObject.label,
	prefabId: selectedObject.prefabId,
	sourceOwner: selectedObject.sourceOwner,
	componentNames: selectedObject.componentNames,
	assetIds: selectedObject.assetIds,
	...objectLibraryComponentSnapshots(selectedObject),
});
const currentRenderable = assertDefined(
	selectedSubject.currentRenderable,
	"Expected selected object subject to carry current renderable data.",
);

assertEqual(
	currentRenderable.meshId,
	"mesh_player",
	"Expected object-library selected subject to preserve Renderable.meshId.",
);
assertEqual(
	currentRenderable.materialId,
	"material_player",
	"Expected object-library selected subject to preserve Renderable.materialId.",
);

const objectLibraryModel = buildLevelEditorObjectLibraryPanelModel({
	runtimeSceneId: portalArenaRuntimeSceneManifest.id,
	levelId: portalArenaRuntimeSceneManifest.level.id,
	selectedObject: selectedSubject,
	sceneObjects: workspaceModel.objects,
});
const initialPickerModel = buildLevelEditorRenderableAssetPickerModel({
	objectLibraryModel,
});
const meshCandidate = assertDefined(
	initialPickerModel.meshCandidates.find(
		(candidate) => candidate.assetId === "mesh_portal_gate",
	),
	"Expected scene-scoped mesh candidate from the portal arena manifest.",
);
const materialCandidate = assertDefined(
	initialPickerModel.materialCandidates.find(
		(candidate) => candidate.assetId === "material_player",
	),
	"Expected scene-scoped material candidate from the portal arena manifest.",
);
const pickerModel = buildLevelEditorRenderableAssetPickerModel({
	objectLibraryModel,
	selectedMeshEntryId: meshCandidate.id,
	selectedMaterialEntryId: materialCandidate.id,
});

assertEqual(
	pickerModel.status,
	"ready",
	"Expected selected-object renderable picker to be ready for manifest-backed assets.",
);
assertEqual(
	pickerModel.selectedScopeId,
	"level-instance",
	"Expected renderable picker to make level-instance scope the active supported scope.",
);
assertEqual(
	pickerModel.scopeOptions.find((option) => option.id === "level-instance")
		?.disabled,
	false,
	"Expected level-instance renderable replacement scope to be selectable.",
);
assertEqual(
	pickerModel.scopeOptions.find((option) => option.id === "prefab-definition")
		?.disabled,
	true,
	"Expected prefab definition renderable replacement scope to remain future-disabled.",
);
assertEqual(
	pickerModel.scopeOptions.find((option) => option.id === "asset-manifest")
		?.disabled,
	true,
	"Expected asset manifest renderable replacement scope to remain future-disabled.",
);
assertEqual(
	pickerModel.selectedMeshCandidate?.assetId,
	"mesh_portal_gate",
	"Expected picker to select the requested mesh candidate.",
);
assertEqual(
	pickerModel.selectedMaterialCandidate?.assetId,
	"material_player",
	"Expected picker to select the requested material candidate.",
);
assertEqual(
	pickerModel.meshSelectionState.state,
	"dirty",
	"Expected non-current mesh candidate to be marked dirty before it is staged.",
);
assertEqual(
	pickerModel.materialSelectionState.state,
	"current",
	"Expected current material candidate to be marked current before it is staged.",
);

const meshDraft = assertDefined(pickerModel.selectedMeshCandidate?.draft);
const materialDraft = assertDefined(
	pickerModel.selectedMaterialCandidate?.draft,
);

assertReplacementDraftContract(meshDraft, "replace-renderable-mesh");
assertReplacementDraftContract(materialDraft, "replace-renderable-material");

const meshPatch = renderablePatchForDraft(meshDraft);
assertEqual(
	meshPatch.meshId,
	"mesh_portal_gate",
	"Expected mesh replacement to patch Renderable.meshId.",
);
assertEqual(
	meshPatch.materialId,
	"material_player",
	"Expected mesh replacement to preserve the current Renderable.materialId.",
);

const materialPatch = renderablePatchForDraft(materialDraft);
assertEqual(
	materialPatch.meshId,
	"mesh_player",
	"Expected material replacement to preserve the current Renderable.meshId.",
);
assertEqual(
	materialPatch.materialId,
	"material_player",
	"Expected material replacement to patch Renderable.materialId.",
);

const meshQueueEntry = assertDefined(
	createRenderableAssetPickerQueueEntry({
		runtimeSceneId: portalArenaRuntimeSceneManifest.id,
		draft: meshDraft,
	}),
	"Expected renderable picker to create a queue entry for mesh replacement.",
);
const queue = stageLevelEditorAuthoringOperations(
	createLevelEditorAuthoringQueue(),
	meshQueueEntry,
);
const stagedPickerModel = buildLevelEditorRenderableAssetPickerModel({
	objectLibraryModel,
	selectedMeshEntryId: meshCandidate.id,
	selectedMaterialEntryId: materialCandidate.id,
	queuedOperations: queue.queuedOperations,
});

assertEqual(
	stagedPickerModel.meshSelectionState.state,
	"staged",
	"Expected queued mesh replacement to be marked staged in the picker model.",
);
assertEqual(
	stagedPickerModel.materialSelectionState.state,
	"current",
	"Expected unchanged material replacement state to remain current after mesh staging.",
);

const authoringTransaction = buildLevelEditorAuthoringTransactionFromQueue({
	workspace: workspaceModel,
	queue,
	transactionId: "selected-object-renderable-picker-contract",
	createdAt: "2026-06-24T00:00:00.000Z",
});
const authoringOperation = assertDefined(authoringTransaction.operations[0]);

assertEqual(
	queue.queuedOperationEntryCount,
	1,
	"Expected renderable picker queue entry to stage through the authoring queue.",
);
assertEqual(
	authoringOperation.kind,
	"set-component",
	"Expected staged picker preview operation to use the level-instance component edit path.",
);

if (authoringOperation.kind !== "set-component") {
	throw new Error(
		"Expected renderable picker authoring operation to set a component.",
	);
}

assertEqual(
	authoringOperation.stableId,
	selectedObject.stableId,
	"Expected staged picker operation to preserve the selected stable ID.",
);

const saveTransaction = buildAuthoringSaveTransaction({
	workspace: workspaceModel,
	edits: [],
	queuedOperations: queue.queuedOperations,
});
const saveTarget = assertDefined(saveTransaction.targets[0]);
const saveOperation = assertDefined(saveTarget.operations[0]);
const savePayload = assertRecord(
	saveOperation.payload,
	"save operation payload",
);

assertEqual(
	saveTarget.targetId,
	`${portalArenaRuntimeSceneManifest.id}:generated:authoring-save`,
	"Expected picker save transaction to target generated authoring-save data.",
);
assertEqual(
	saveOperation.kind,
	"replace-level-instance",
	"Expected picker save operation to stay on the level-instance authoring path.",
);
assertEqual(
	saveOperation.ownerKind,
	"level",
	"Expected picker save operation to be level-owned, not asset-owned.",
);
assertEqual(
	saveOperation.subjectId,
	selectedObject.stableId,
	"Expected picker save operation to preserve selected stable ID.",
);
assertEqual(
	savePayload.replacementKind,
	"replace-renderable-mesh",
	"Expected picker save payload to retain the renderable replacement kind.",
);
assertEqual(
	savePayload.sourceOperationKind,
	"replace-component-asset-reference",
	"Expected picker save payload to retain the preview-only source operation kind.",
);

console.log(
	"Level editor selected-object renderable picker contract passed: selected renderable snapshots feed manifest-backed mesh/material picker drafts, preserve stable IDs and renderable state, and stage through the existing authoring queue/save transaction path.",
);

function assertReplacementDraftContract(
	draft: typeof meshDraft,
	replacementKind: typeof meshDraft.replacementKind,
): void {
	assertEqual(
		draft.replacementKind,
		replacementKind,
		`Expected replacement draft kind ${replacementKind}.`,
	);
	assertEqual(
		draft.preserveStableId,
		true,
		"Expected renderable replacement draft to preserve the selected stable ID.",
	);
	assertEqual(
		draft.writesFiles,
		false,
		"Expected renderable replacement draft not to write files directly.",
	);
	assertEqual(
		draft.mutatesRuntimeDirectly,
		false,
		"Expected renderable replacement draft not to mutate runtime directly.",
	);
	assertEqual(
		draft.previewPatch.entries[0]?.stableId,
		selectedObject.stableId,
		"Expected renderable replacement preview patch to target selected stable ID.",
	);
}

function renderablePatchForDraft(
	draft: typeof meshDraft,
): Record<string, unknown> {
	const entry = assertDefined(draft.previewPatch.entries[0]);

	if (entry.operation !== "component-patch") {
		throw new Error(
			"Expected renderable picker preview entry to patch a component.",
		);
	}

	const components = assertRecord(entry.components, "preview patch components");

	return assertRecord(components.Renderable, "preview patch Renderable");
}
