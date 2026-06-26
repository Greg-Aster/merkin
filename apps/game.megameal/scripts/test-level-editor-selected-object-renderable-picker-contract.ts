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
import { buildStagedPublishReadiness } from "../src/app/editor/levelEditorWorkspaceUi.js";
import {
	portalArenaRuntimeSceneManifest,
	starterRuntimeSceneManifest,
} from "../src/game/levels/index.js";
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
	"Expected scene-scoped mesh display candidate from the portal arena manifest.",
);
const materialCandidate = assertDefined(
	initialPickerModel.materialCandidates.find(
		(candidate) => candidate.assetId === "material_player",
	),
	"Expected scene-scoped material display candidate from the portal arena manifest.",
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
	"Expected prefab definition renderable replacement scope to remain future-disabled even when candidates expose display-only type labels.",
);
assertEqual(
	pickerModel.scopeOptions.find((option) => option.id === "asset-manifest")
		?.disabled,
	true,
	"Expected asset manifest renderable replacement scope to remain future-disabled even when candidates expose display-only preview affordance text.",
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
	meshCandidate.replacementKind,
	"replace-renderable-mesh",
	"Expected mesh candidate metadata to preserve the mesh replacement kind.",
);
assertEqual(
	materialCandidate.replacementKind,
	"replace-renderable-material",
	"Expected material candidate metadata to preserve the material replacement kind.",
);
assertEqual(
	meshCandidate.assetKind,
	"mesh",
	"Expected mesh candidate metadata to expose browser-facing asset kind.",
);
assertEqual(
	materialCandidate.assetKind,
	"material",
	"Expected material candidate metadata to expose browser-facing asset kind.",
);
assertEqual(
	meshCandidate.sourceOwner,
	"runtime-scene-manifest-catalog:assets:mesh_portal_gate",
	"Expected mesh candidate metadata to preserve manifest source ownership.",
);
assertEqual(
	meshCandidate.preview.mode,
	"model",
	"Expected mesh candidate preview to remain a model preview placeholder.",
);
assertEqual(
	meshCandidate.previewContract,
	"model-preview-placeholder",
	"Expected mesh candidate metadata to label placeholder model previews honestly.",
);
assertEqual(
	materialCandidate.preview.mode,
	"material",
	"Expected material candidate preview to expose material swatch mode.",
);
assertEqual(
	materialCandidate.previewContract,
	"asset-preview",
	"Expected material candidate metadata to preserve asset preview contract text.",
);
assertEqual(
	meshCandidate.runtimeSceneIds.includes(portalArenaRuntimeSceneManifest.id),
	true,
	"Expected mesh candidate metadata to remain scoped to the active runtime scene.",
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
assertEqual(
	pickerModel.canStageSelectedMesh,
	true,
	"Expected dirty mesh candidate to be stageable from the picker model.",
);
assertEqual(
	pickerModel.canStageSelectedMaterial,
	false,
	"Expected current material candidate to be non-stageable from the picker model.",
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
	stagedPickerModel.canStageSelectedMesh,
	false,
	"Expected already staged mesh candidate to be non-stageable from the picker model.",
);
assertEqual(
	stagedPickerModel.materialSelectionState.state,
	"current",
	"Expected unchanged material replacement state to remain current after mesh staging.",
);

const starterWorkspaceModel = buildLevelEditorWorkspaceModel({
	selectedRuntimeSceneId: starterRuntimeSceneManifest.id,
});
const starterSelectedObject = assertDefined(
	starterWorkspaceModel.objects.find((object) => object.stableId === "player"),
	"Expected starter player object to exist for combined renderable staging coverage.",
);
const starterSelectedSubject = objectLibrarySubjectFromSelection({
	stableId: starterSelectedObject.stableId,
	label: starterSelectedObject.label,
	prefabId: starterSelectedObject.prefabId,
	sourceOwner: starterSelectedObject.sourceOwner,
	componentNames: starterSelectedObject.componentNames,
	assetIds: starterSelectedObject.assetIds,
	...objectLibraryComponentSnapshots(starterSelectedObject),
});
const starterObjectLibraryModel = buildLevelEditorObjectLibraryPanelModel({
	runtimeSceneId: starterRuntimeSceneManifest.id,
	levelId: starterRuntimeSceneManifest.level.id,
	selectedObject: starterSelectedSubject,
	sceneObjects: starterWorkspaceModel.objects,
});
const starterInitialPickerModel = buildLevelEditorRenderableAssetPickerModel({
	objectLibraryModel: starterObjectLibraryModel,
});
const starterMeshCandidate = assertDefined(
	starterInitialPickerModel.meshCandidates.find(
		(candidate) => candidate.assetId === "mesh_arena_floor",
	),
	"Expected starter scene to expose a non-current mesh candidate.",
);
const starterMaterialCandidate = assertDefined(
	starterInitialPickerModel.materialCandidates.find(
		(candidate) => candidate.assetId === "material_arena_floor",
	),
	"Expected starter scene to expose a non-current material candidate.",
);
const starterMeshPickerModel = buildLevelEditorRenderableAssetPickerModel({
	objectLibraryModel: starterObjectLibraryModel,
	selectedMeshEntryId: starterMeshCandidate.id,
});
const starterMeshDraft = assertDefined(
	starterMeshPickerModel.selectedMeshCandidate?.draft,
	"Expected starter mesh candidate to expose a draft.",
);
const starterMeshQueueEntry = assertDefined(
	createRenderableAssetPickerQueueEntry({
		runtimeSceneId: starterRuntimeSceneManifest.id,
		draft: starterMeshDraft,
	}),
	"Expected starter mesh draft to create a queue entry.",
);
const starterMeshQueue = stageLevelEditorAuthoringOperations(
	createLevelEditorAuthoringQueue(),
	starterMeshQueueEntry,
);
const starterMaterialPickerModel = buildLevelEditorRenderableAssetPickerModel({
	objectLibraryModel: starterObjectLibraryModel,
	selectedMeshEntryId: starterMeshCandidate.id,
	selectedMaterialEntryId: starterMaterialCandidate.id,
	queuedOperations: starterMeshQueue.queuedOperations,
});

assertEqual(
	starterMaterialPickerModel.meshSelectionState.state,
	"staged",
	"Expected staged mesh candidate to remain staged while selecting a material.",
);
assertEqual(
	starterMaterialPickerModel.materialSelectionState.state,
	"dirty",
	"Expected non-current material candidate to remain dirty before staging.",
);
assertEqual(
	starterMaterialPickerModel.canStageSelectedMaterial,
	true,
	"Expected dirty material candidate to be stageable after a mesh draft is already queued.",
);

const starterMaterialDraft = assertDefined(
	starterMaterialPickerModel.selectedMaterialCandidate?.draft,
	"Expected starter material candidate to expose a draft.",
);
const mergedMaterialPatch = renderablePatchForDraft(starterMaterialDraft);

assertEqual(
	mergedMaterialPatch.meshId,
	"mesh_arena_floor",
	"Expected material draft to preserve the already staged mesh reference.",
);
assertEqual(
	mergedMaterialPatch.materialId,
	"material_arena_floor",
	"Expected material draft to patch the selected material reference.",
);

const starterMaterialQueueEntry = assertDefined(
	createRenderableAssetPickerQueueEntry({
		runtimeSceneId: starterRuntimeSceneManifest.id,
		draft: starterMaterialDraft,
	}),
	"Expected starter material draft to create a queue entry.",
);

assertEqual(
	starterMaterialQueueEntry.id,
	starterMeshQueueEntry.id,
	"Expected renderable picker to use one queue entry per selected object so later mesh/material drafts compose.",
);

const starterCombinedQueue = stageLevelEditorAuthoringOperations(
	starterMeshQueue,
	starterMaterialQueueEntry,
);

assertEqual(
	starterCombinedQueue.queuedOperationEntryCount,
	1,
	"Expected combined renderable staging to replace the prior renderable queue entry instead of adding a conflicting full-component draft.",
);

const starterCombinedPublishReadiness = buildStagedPublishReadiness({
	stagedFieldEdits: [],
	queuedOperations: starterCombinedQueue.queuedOperations,
});

assertEqual(
	starterCombinedPublishReadiness.status,
	"publish-ready",
	"Expected combined renderable staging to be Save Level/Publish ready through the level-instance set-component owner path.",
);
assertEqual(
	starterCombinedPublishReadiness.canRunOwnerWrite,
	true,
	"Expected combined renderable staging to enable bounded owner-write commands.",
);

const combinedPreviewTransaction =
	buildLevelEditorAuthoringTransactionFromQueue({
		workspace: starterWorkspaceModel,
		queue: starterCombinedQueue,
		transactionId: "selected-object-renderable-picker-combined-contract",
		createdAt: "2026-06-24T00:00:00.000Z",
	});
const combinedPreviewOperation = assertDefined(
	combinedPreviewTransaction.operations[0],
	"Expected combined renderable queue to produce a preview authoring operation.",
);

if (combinedPreviewOperation.kind !== "set-component") {
	throw new Error(
		"Expected combined renderable preview operation to set a component.",
	);
}

const combinedPreviewRenderable = assertRecord(
	combinedPreviewOperation.value,
	"combined preview renderable value",
);

assertEqual(
	combinedPreviewRenderable.meshId,
	"mesh_arena_floor",
	"Expected combined preview operation to keep the staged mesh reference.",
);
assertEqual(
	combinedPreviewRenderable.materialId,
	"material_arena_floor",
	"Expected combined preview operation to keep the staged material reference.",
);

const combinedSaveTransaction = buildAuthoringSaveTransaction({
	workspace: starterWorkspaceModel,
	edits: [],
	queuedOperations: starterCombinedQueue.queuedOperations,
});
const combinedSavePayload = assertRecord(
	assertDefined(
		combinedSaveTransaction.targets[0]?.operations[0],
		"Expected combined renderable save operation.",
	).payload,
	"combined renderable save payload",
);
const combinedSaveOperationPayload = assertRecord(
	combinedSavePayload.operation,
	"combined renderable save payload operation",
);
const combinedSavePatch = assertRecord(
	combinedSaveOperationPayload.value,
	"combined renderable save operation value",
);

assertEqual(
	combinedSaveOperationPayload.kind,
	"set-component",
	"Expected combined renderable save payload to preserve the level-instance component operation.",
);
assertEqual(
	combinedSaveOperationPayload.target,
	"level-instance",
	"Expected combined renderable save payload to target the selected level instance.",
);
assertEqual(
	combinedSaveOperationPayload.componentName,
	"Renderable",
	"Expected combined renderable save payload to write a Renderable override.",
);

assertEqual(
	combinedSavePatch.meshId,
	"mesh_arena_floor",
	"Expected combined save operation to keep the staged mesh reference.",
);
assertEqual(
	combinedSavePatch.materialId,
	"material_arena_floor",
	"Expected combined save operation to keep the staged material reference.",
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
	"Expected picker save operation to be level-owned, not asset-owned; candidate metadata must stay display-only.",
);
assertEqual(
	saveOperation.subjectId,
	selectedObject.stableId,
	"Expected picker save operation to preserve selected stable ID.",
);
assertEqual(
	assertRecord(savePayload.operation, "save operation payload operation").kind,
	"set-component",
	"Expected picker save payload to preserve the level-instance component operation for Save Level/Publish.",
);
assertEqual(
	assertRecord(savePayload.operation, "save operation payload operation")
		.target,
	"level-instance",
	"Expected picker save payload to target the selected level instance.",
);
assertEqual(
	assertRecord(savePayload.operation, "save operation payload operation")
		.componentName,
	"Renderable",
	"Expected picker save payload to write a Renderable override.",
);

console.log(
	"Level editor selected-object renderable picker contract passed: selected renderable snapshots feed manifest-backed mesh/material picker drafts, allow display-only candidate metadata, preserve stable IDs and renderable state, and stage through the existing authoring queue/save transaction and bounded Save Level/Publish set-component path.",
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
