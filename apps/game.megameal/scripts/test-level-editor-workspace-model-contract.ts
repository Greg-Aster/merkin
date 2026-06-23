import { buildAuthoringSaveTransaction } from "../src/app/editor/levelEditorAuthoringClient.js";
import {
	type LevelEditorQueuedAuthoringOperation,
	createLevelEditorAuthoringQueue,
	queuedLevelEditorAuthoringSaveOperations,
	stageLevelEditorAuthoringOperations,
} from "../src/app/editor/levelEditorAuthoringStore.js";
import { getDefaultLevelEditorSessionSummary } from "../src/app/editor/levelEditorSession.js";
import {
	type LevelEditorWorkspaceAuthoringState,
	buildLevelEditorValidationReport,
	buildLevelEditorWorkspaceModel,
} from "../src/app/editor/levelEditorWorkspaceModel.js";
import {
	type LevelEditorStagedFieldEdit,
	buildStagedPublishReadiness,
	buildWorkspaceAuthoringTransaction,
	previewTargetsForStagedEdits,
} from "../src/app/editor/levelEditorWorkspaceUi.js";
import type { RuntimeSceneManifestData } from "../src/engine/data/index.js";
import {
	type LevelEditorAuthoringOperationData,
	buildLevelEditorAuthoringSaveWritePlan,
	buildLevelEditorFeatureCoverageRegistry,
	validateLevelEditorFeatureCoverageRegistry,
} from "../src/game/editor/authoring/index.js";
import { defaultRuntimeSceneManifest } from "../src/game/levels/index.js";

const session = getDefaultLevelEditorSessionSummary();
const workspace = session.workspace;

assertEqual(
	workspace.schemaVersion,
	1,
	"Expected workspace model schema version to be explicit.",
);
assertEqual(
	workspace.selectedRuntimeSceneId,
	session.selectedRuntimeSceneId,
	"Expected editor session and workspace to select the same runtime scene.",
);
assertEqual(
	workspace.selectedRuntimeSceneId,
	defaultRuntimeSceneManifest.id,
	"Expected the generic editor workspace to open on the runtime scene catalog default.",
);
assertEqual(
	session.collisionDraft.status,
	"missing",
	"Expected the catalog-default editor session not to fall back to a level-specific collision draft.",
);
const registeredCollisionDraftRuntimeSceneId =
	session.collisionDraft.registeredRuntimeSceneIds[0];

if (!registeredCollisionDraftRuntimeSceneId) {
	throw new Error("Expected at least one registered content collision draft.");
}
assertEqual(
	workspace.persistence.mode,
	"explicit-authoring-save",
	"Expected level editor persistence to use explicit dev authoring saves.",
);
assertEqual(
	workspace.persistence.writesFiles,
	false,
	"Expected browser editor workspace not to write files directly.",
);
assertEqual(
	workspace.persistence.saveOwner,
	"generated-authoring-transaction",
	"Expected browser editor saves to produce generated authoring transactions.",
);
assertEqual(
	workspace.authoring.status,
	"ready",
	"Expected workspace authoring document state to be ready.",
);
assertEqual(
	workspace.validationReport.schemaVersion,
	1,
	"Expected workspace validation report schema version to be explicit.",
);
assertEqual(
	workspace.validationReport.runtimeSceneId,
	workspace.selectedRuntimeSceneId,
	"Expected validation report to target the selected runtime scene.",
);
assertIncludes(
	workspace.validationReport.generatedFrom,
	"validateRuntimeSceneContentGraph",
	"Expected workspace validation report to use the same content graph validator as contract tests.",
);
assertEqual(
	workspace.validationReport.errorCount,
	workspace.validation.errors.length,
	"Expected legacy validation errors to mirror report errors.",
);
assertEqual(
	workspace.validationReport.warningCount,
	workspace.validation.warnings.length,
	"Expected legacy validation warnings to mirror report warnings.",
);
assertEqual(
	workspace.validationReport.blocksPublish,
	false,
	"Expected valid catalog workspace report not to block publish.",
);
assertEqual(
	workspace.selection.state,
	"selected-object",
	"Expected workspace selection summary to resolve the selected stable ID.",
);
assertEqual(
	workspace.selection.selectedStableId,
	workspace.selectedStableId,
	"Expected selection summary to mirror the workspace selected stable ID.",
);
assertIncludes(
	workspace.selection.labels,
	"Selected",
	"Expected selection summary labels to expose selected state.",
);
if (workspace.authoring.saveTarget === null) {
	throw new Error(
		"Expected workspace to expose a generated authoring-save target.",
	);
}
assertIncludes(
	[workspace.authoring.saveTarget.id],
	`${workspace.selectedRuntimeSceneId}:generated:authoring-save`,
	"Expected save target to be scoped to the selected runtime scene.",
);
if (
	!workspace.authoring.saveTarget.targetFile.includes(
		"src/game/editor/authoring/generated/",
	)
) {
	throw new Error("Expected save target to be a generated authoring module.");
}

assertAtLeast(
	workspace.levelBrowser.length,
	5,
	"Expected level browser to expose the runtime scene catalog.",
);
assertIncludes(
	workspace.levelBrowser.map((level) => level.runtimeSceneId),
	registeredCollisionDraftRuntimeSceneId,
	"Expected registered collision-draft scenes to be loadable from the editor level browser.",
);

const registeredDraftSession = getDefaultLevelEditorSessionSummary({
	selectedRuntimeSceneId: registeredCollisionDraftRuntimeSceneId,
});
const registeredDraftWorkspace = registeredDraftSession.workspace;

assertEqual(
	registeredDraftSession.collisionDraft.status,
	"registered",
	"Expected collision draft data to load when a registered draft scene is selected from the catalog.",
);
if (registeredDraftSession.collisionDraftId === null) {
	throw new Error(
		"Expected the selected registered scene to expose its collision draft.",
	);
}

const defaultCategories = new Set(
	workspace.sceneTree.map((group) => group.category),
);
assertIncludes(
	[...defaultCategories],
	"spawn",
	"Expected selected workspace to expose the player spawn category.",
);
assertIncludes(
	[...defaultCategories],
	"portals",
	"Expected selected workspace to expose portal objects as an outliner category.",
);
assertIncludes(
	registeredDraftWorkspace.sceneTree.map((group) => group.category),
	"collision",
	"Expected explicitly selected registered-draft workspace to expose collision objects.",
);
assertAtLeast(
	defaultCategories.size,
	3,
	"Expected workspace outliner to be broader than terrain diagnostics.",
);

const portalGroup = workspace.sceneTree.find(
	(group) => group.category === "portals",
);

if (!portalGroup) {
	throw new Error("Expected default workspace to include a Portals group.");
}

assertAtLeast(
	portalGroup.objects.length,
	1,
	"Expected default workspace portal group to contain selectable objects.",
);

const firstPortalObject = portalGroup.objects[0];

if (!firstPortalObject) {
	throw new Error("Expected a first portal object in the default workspace.");
}

assertIncludes(
	firstPortalObject.componentNames,
	"Portal",
	"Expected portal category objects to carry the Portal component.",
);
assertIncludes(
	firstPortalObject.fields.map((field) => field.path),
	"Portal.targetRuntimeSceneId",
	"Expected portal inspector fields to expose the target runtime scene.",
);
assertIncludes(
	firstPortalObject.capabilities,
	"editable",
	"Expected portal category objects to remain editable through the object workflow.",
);
assertEqual(
	firstPortalObject.workflow.publishability,
	"publishable",
	"Expected portal objects to expose publishability for transform and level-instance component fields.",
);
assertIncludes(
	firstPortalObject.outliner.objectPath,
	workspace.selectedRuntimeSceneId,
	"Expected portal outliner path to include the runtime scene ID.",
);
assertIncludes(
	firstPortalObject.outliner.objectPath,
	firstPortalObject.stableId,
	"Expected portal outliner path to include the selected stable ID.",
);
assertEqual(
	firstPortalObject.outliner.visibility.state,
	"visible",
	"Expected portal outliner visibility metadata to be explicit.",
);
assertEqual(
	firstPortalObject.outliner.lock.state,
	"editable",
	"Expected portal outliner lock metadata to describe editable objects.",
);
assertEqual(
	firstPortalObject.outliner.pickability.state,
	"projected-pickable",
	"Expected portal outliner pickability metadata to reflect projected transform selection aids.",
);
assertIncludes(
	firstPortalObject.workflow.labels,
	"Publishable",
	"Expected portal workflow labels to expose publishable transform fields.",
);
assertIncludes(
	firstPortalObject.workflow.labels,
	"Publishable",
	"Expected portal workflow labels to expose bounded owner-write publishability.",
);

const firstPortalTransformField = firstPortalObject.fields.find(
	(field) => field.path === "Transform.position.x",
);
const firstPortalTargetField = firstPortalObject.fields.find(
	(field) => field.path === "Portal.targetRuntimeSceneId",
);
const firstPortalTransformGroup = firstPortalObject.fieldGroups.find(
	(group) => group.componentName === "Transform",
);
const firstPortalComponentGroup = firstPortalObject.fieldGroups.find(
	(group) => group.componentName === "Portal",
);

if (!firstPortalTransformField || !firstPortalTargetField) {
	throw new Error("Expected portal workflow test fields to be present.");
}
if (!firstPortalTransformGroup || !firstPortalComponentGroup) {
	throw new Error(
		"Expected portal inspector fields to be grouped by component.",
	);
}

assertEqual(
	firstPortalTransformField.workflow.publishability,
	"publishable",
	"Expected portal transform fields to be publishable through bounded owner writes.",
);
assertEqual(
	firstPortalTargetField.workflow.publishability,
	"publishable",
	"Expected portal target fields to be publishable through bounded level-instance component overrides.",
);
assertIncludes(
	firstPortalTransformGroup.fields.map((field) => field.path),
	"Transform.position.x",
	"Expected inspector Transform group to retain transform fields.",
);
assertIncludes(
	firstPortalComponentGroup.fields.map((field) => field.path),
	"Portal.targetRuntimeSceneId",
	"Expected inspector Portal group to retain component fields.",
);
assertEqual(
	firstPortalTransformGroup.workflow.publishability,
	"publishable",
	"Expected inspector Transform group to summarize bounded owner-write publishability.",
);
assertEqual(
	firstPortalComponentGroup.workflow.publishability,
	"publishable",
	"Expected inspector Portal group to summarize component edit publishability.",
);
assertAtLeast(
	firstPortalTransformGroup.editableFieldCount,
	1,
	"Expected inspector Transform group to expose editable fields.",
);

const allPreviewTargets = new Set(
	workspace.levelBrowser
		.flatMap(
			(level) =>
				buildLevelEditorWorkspaceModel({
					selectedRuntimeSceneId: level.runtimeSceneId,
				}).objects,
		)
		.map((object) => object.previewTargetKind)
		.filter((kind): kind is NonNullable<typeof kind> => kind !== undefined),
);

for (const targetKind of [
	"spawn",
	"portal",
	"audio-emitter",
	"light",
] as const) {
	assertIncludes(
		[...allPreviewTargets],
		targetKind,
		`Expected ${targetKind} objects to be previewable across loaded levels.`,
	);
}

const playerObject = workspace.objects.find(
	(object) => object.stableId === workspace.selectedStableId,
);

if (!playerObject) {
	throw new Error("Expected selected workspace object to be present.");
}

assertIncludes(
	playerObject.capabilities,
	"previewable",
	"Expected selected player spawn object to be previewable.",
);
assertIncludes(
	playerObject.fields.map((field) => field.path),
	"Transform.position.x",
	"Expected inspector fields to expose transform position editing.",
);
assertEqual(
	playerObject.workflow.selectionState,
	"selected",
	"Expected selected object workflow to expose selected state.",
);
assertEqual(
	playerObject.workflow.publishability,
	"publishable",
	"Expected selected player transform workflow to be publishable.",
);
assertIncludes(
	playerObject.workflow.labels,
	"Temporary preview",
	"Expected selected player workflow to expose temporary preview state.",
);

const playerPositionWorkflow = playerObject.fields.find(
	(field) => field.path === "Transform.position.x",
)?.workflow;

if (!playerPositionWorkflow) {
	throw new Error("Expected player position workflow metadata.");
}

assertIncludes(
	playerPositionWorkflow.labels,
	"Publishable",
	"Expected player position field labels to expose publishability.",
);

const commandById = new Map(
	workspace.commands.map((command) => [command.id, command] as const),
);
const saveCommand = requiredMapValue(commandById, "save");
const saveLevelCommand = requiredMapValue(commandById, "save-level");
const discardCommand = requiredMapValue(commandById, "discard");
const buildCommand = requiredMapValue(commandById, "build");
const publishCommand = requiredMapValue(commandById, "publish");

assertEqual(
	saveCommand.enabled,
	true,
	"Expected Save Draft to be commandable.",
);
assertEqual(
	saveCommand.label,
	"Save Draft",
	"Expected generated authoring transaction persistence to be labeled Save Draft.",
);
assertEqual(
	saveCommand.operation,
	"authoring-transaction",
	"Expected Save Draft to write only the authoring transaction path.",
);
assertEqual(
	saveCommand.requiresDirty,
	true,
	"Expected Save Draft to require staged edits.",
);
assertContains(
	saveCommand.reason,
	"staged edits remain dirty until a bounded level owner write succeeds",
	"Expected Save Draft command copy to avoid implying runtime permanence.",
);
assertEqual(
	saveLevelCommand.enabled,
	true,
	"Expected Save Level to be commandable when authoring is ready.",
);
assertEqual(
	saveLevelCommand.operation,
	"owner-write",
	"Expected Save Level to target the bounded owner-write command path.",
);
assertEqual(
	saveLevelCommand.requiresDirty,
	true,
	"Expected Save Level to require staged edits before writing owner data.",
);
assertEqual(
	saveLevelCommand.blocksDirty,
	false,
	"Expected Save Level to accept dirty staged edits because it is the durable write path.",
);
assertContains(
	saveLevelCommand.reason,
	"bounded runtime owner data path",
	"Expected Save Level command copy to describe bounded runtime owner writes.",
);
assertEqual(
	discardCommand.operation,
	"clear-staged-preview",
	"Expected Discard to clear staged previews.",
);
assertEqual(
	buildCommand.blocksDirty,
	true,
	"Expected Build to be blocked by unsaved staged edits.",
);
assertEqual(
	publishCommand.blocksDirty,
	false,
	"Expected Publish Level to accept dirty staged edits because it is the durable publish path.",
);
assertEqual(
	publishCommand.label,
	"Publish Level",
	"Expected Publish to be labeled as the durable level publish path.",
);
assertEqual(
	publishCommand.operation,
	"publish-owner-write",
	"Expected Publish to target the owner-write publish command path.",
);
assertEqual(
	publishCommand.requiresDirty,
	true,
	"Expected Publish Level to require staged edits before writing owner data.",
);
assertEqual(
	publishCommand.enabled,
	!workspace.validationReport.blocksPublish,
	"Expected Publish command availability to follow validation report errors.",
);
assertContains(
	publishCommand.reason,
	"local validation/build gates",
	"Expected Publish copy to describe validation/build gating.",
);
assertNotContains(
	publishCommand.reason,
	"component",
	"Expected Publish copy not to overclaim broad component owner-write support.",
);
assertNotContains(
	publishCommand.reason,
	"prefab",
	"Expected Publish copy not to overclaim prefab owner-write support.",
);
assertNotContains(
	publishCommand.reason,
	"asset",
	"Expected Publish copy not to overclaim asset owner-write support.",
);
assertEqual(
	workspace.commandPlans.build.errors.length,
	0,
	"Expected build command plan to validate.",
);
assertEqual(
	workspace.commandPlans.publish.errors.length,
	0,
	"Expected publish command plan to validate.",
);
assertAnyContains(
	workspace.outputLog.map((entry) => entry.message),
	"hidden production cook disabled",
	"Expected initial output log to describe explicit build/publish command gates.",
);

const buildScripts = workspace.commandPlans.build.steps
	.map((step) => step.scriptName)
	.filter((scriptName): scriptName is string => scriptName !== undefined);
for (const scriptName of [
	"test:level-editor-feature-catalog-contract",
	"cook:terrain",
	"ci:terrain-drift",
	"type-check",
	"build",
]) {
	assertIncludes(
		buildScripts,
		scriptName,
		`Expected build plan script ${scriptName}.`,
	);
}

const positionXField = playerObject.fields.find(
	(field) => field.path === "Transform.position.x",
);

if (!positionXField || typeof positionXField.value !== "number") {
	throw new Error("Expected selected player position X field to be numeric.");
}

const stagedEdit = {
	stableId: playerObject.stableId,
	path: positionXField.path,
	label: positionXField.label,
	before: positionXField.value,
	after: positionXField.value + 1,
} satisfies LevelEditorStagedFieldEdit;
const transaction = buildWorkspaceAuthoringTransaction({
	workspace,
	edits: [stagedEdit],
	transactionId: "workspace-contract-transaction",
	createdAt: "2026-06-11T00:00:00.000Z",
});

assertEqual(
	transaction.runtimeSceneId,
	workspace.selectedRuntimeSceneId,
	"Expected generated transaction to target the selected runtime scene.",
);
assertEqual(
	transaction.baseDocumentHash,
	workspace.authoring.documentContentHash,
	"Expected generated transaction to carry the authoring document hash.",
);
assertEqual(
	transaction.operations[0]?.kind,
	"set-transform",
	"Expected staged transform edits to produce a set-transform operation.",
);

const portalObject = workspace.objects.find(
	(object) => object.stableId === "portal-arena:portal:observatory",
);

if (!portalObject) {
	throw new Error(
		"Expected portal arena workspace to expose the Observatory portal.",
	);
}

const portalPositionXField = portalObject.fields.find(
	(field) => field.path === "Transform.position.x",
);

if (!portalPositionXField || typeof portalPositionXField.value !== "number") {
	throw new Error("Expected non-player portal position X field to be numeric.");
}

const stagedPortalEdit = {
	stableId: portalObject.stableId,
	path: portalPositionXField.path,
	label: portalPositionXField.label,
	before: portalPositionXField.value,
	after: portalPositionXField.value + 0.5,
} satisfies LevelEditorStagedFieldEdit;
const portalTransaction = buildWorkspaceAuthoringTransaction({
	workspace,
	edits: [stagedPortalEdit],
	transactionId: "workspace-contract-non-player-transaction",
	createdAt: "2026-06-17T00:00:00.000Z",
});
const portalOperation = portalTransaction.operations[0];

assertEqual(
	portalOperation?.kind,
	"set-transform",
	"Expected non-player staged transform edits to produce a set-transform operation.",
);
if (portalOperation?.kind !== "set-transform") {
	throw new Error("Expected non-player operation to be set-transform.");
}
assertEqual(
	portalOperation.stableId,
	portalObject.stableId,
	"Expected non-player staged transform edits to preserve the selected stable ID.",
);
const portalSaveTransaction = buildAuthoringSaveTransaction({
	workspace,
	edits: [stagedPortalEdit],
	baseHash: "missing",
});

assertEqual(
	portalSaveTransaction.targets[0]?.operations[0]?.subjectId,
	portalObject.stableId,
	"Expected non-player staged transform edits to reach the save transaction subject ID.",
);

const panelQueuedGeneratedSaveOperation = {
	kind: "replace-level-instance",
	ownerKind: "level",
	ownerTargetId: `${workspace.selectedRuntimeSceneId}:level`,
	subjectId: playerObject.stableId,
	payload: {
		source: "panel-queued-generated-save-contract",
		stableId: playerObject.stableId,
		fieldEdits: [
			{
				path: stagedEdit.path,
				before: stagedEdit.before,
				after: stagedEdit.after,
			},
		],
	},
} satisfies LevelEditorAuthoringOperationData;
const panelQueueEntry = {
	id: "panel-queued-generated-save",
	label: "Panel queued generated save",
	saveOperations: [panelQueuedGeneratedSaveOperation],
} satisfies LevelEditorQueuedAuthoringOperation;
const authoringQueue = stageLevelEditorAuthoringOperations(
	createLevelEditorAuthoringQueue(),
	panelQueueEntry,
);

assertEqual(
	authoringQueue.dirtyCount,
	1,
	"Expected panel queued generated-save entry to mark the authoring queue dirty.",
);
assertEqual(
	authoringQueue.operationCount,
	1,
	"Expected panel queued generated-save entry to contribute one save operation.",
);

const queuedSaveOperations =
	queuedLevelEditorAuthoringSaveOperations(authoringQueue);

assertEqual(
	queuedSaveOperations[0]?.subjectId,
	playerObject.stableId,
	"Expected queued generated-save operations to preserve panel subject IDs.",
);

const queuedGeneratedSaveTransaction = buildAuthoringSaveTransaction({
	workspace,
	edits: [],
	queuedOperations: authoringQueue.queuedOperations,
	baseHash: "missing",
});

assertEqual(
	queuedGeneratedSaveTransaction.targets[0]?.targetId,
	`${workspace.selectedRuntimeSceneId}:generated:authoring-save`,
	"Expected panel queued generated-save operations to target the generated save module.",
);
assertEqual(
	queuedGeneratedSaveTransaction.targets[0]?.operations[0]?.subjectId,
	playerObject.stableId,
	"Expected panel queued generated-save operations to be included in the save transaction.",
);

const queuedGeneratedSaveWritePlan = buildLevelEditorAuthoringSaveWritePlan({
	transaction: queuedGeneratedSaveTransaction,
});

assertEqual(
	queuedGeneratedSaveWritePlan.artifacts[0]?.payload.writesRuntimeData,
	false,
	"Expected accepted panel queued generated-save operations to preserve runtime/editor separation.",
);
assertEqual(
	queuedGeneratedSaveWritePlan.artifacts[0]?.payload.operations[0]?.subjectId,
	playerObject.stableId,
	"Expected generated-save write plan to accept panel queued save operations.",
);

const cleanPublishReadiness = buildStagedPublishReadiness({
	stagedFieldEdits: [],
	queuedOperations: [],
});

assertEqual(
	cleanPublishReadiness.status,
	"clean",
	"Expected empty staged work to classify as clean for Save Level/Publish.",
);
assertEqual(
	cleanPublishReadiness.canRunOwnerWrite,
	false,
	"Expected clean staged work not to run owner-write commands.",
);

const fieldPublishReadiness = buildStagedPublishReadiness({
	stagedFieldEdits: [stagedEdit],
	queuedOperations: [],
});

assertEqual(
	fieldPublishReadiness.status,
	"publish-ready",
	"Expected staged transform fields to classify as publish-ready owner writes.",
);
assertEqual(
	fieldPublishReadiness.canRunOwnerWrite,
	true,
	"Expected staged transform fields to enable owner-write commands.",
);

const publishableGeneratedSaveOperation = {
	kind: "replace-level-instance",
	ownerKind: "level",
	ownerTargetId: `${workspace.selectedRuntimeSceneId}:level`,
	subjectId: playerObject.stableId,
	payload: {
		operation: {
			kind: "set-transform",
			stableId: playerObject.stableId,
			transform: {
				position: {
					x: positionXField.value + 1,
				},
			},
		},
	},
} satisfies LevelEditorAuthoringOperationData;
const publishableQueueReadiness = buildStagedPublishReadiness({
	stagedFieldEdits: [],
	queuedOperations: [
		{
			id: "publishable-generated-transform",
			label: "Publishable generated transform",
			saveOperations: [publishableGeneratedSaveOperation],
		},
	],
});

assertEqual(
	publishableQueueReadiness.status,
	"publish-ready",
	"Expected generated level transform save operations to classify as publish-ready.",
);

const draftOnlySaveOperation = {
	kind: "replace-asset",
	ownerKind: "asset",
	ownerTargetId: `${workspace.selectedRuntimeSceneId}:assets`,
	subjectId: "draft-only-asset",
	payload: {
		operation: {
			kind: "replace-asset",
		},
	},
} satisfies LevelEditorAuthoringOperationData;
const draftOnlyReadiness = buildStagedPublishReadiness({
	stagedFieldEdits: [],
	queuedOperations: [
		{
			id: "draft-only-asset-operation",
			label: "Draft-only asset operation",
			saveOperations: [draftOnlySaveOperation],
		},
	],
});

assertEqual(
	draftOnlyReadiness.status,
	"draft-only",
	"Expected unsupported owner save operations to remain draft-only.",
);
assertEqual(
	draftOnlyReadiness.canRunOwnerWrite,
	false,
	"Expected draft-only staged work to block Save Level/Publish owner writes.",
);
assertAnyContains(
	draftOnlyReadiness.reasons,
	"replace-asset",
	"Expected draft-only publish readiness to name the unsupported operation.",
);

const mixedPublishReadiness = buildStagedPublishReadiness({
	stagedFieldEdits: [stagedEdit],
	queuedOperations: [
		{
			id: "mixed-draft-only-asset-operation",
			label: "Mixed draft-only asset operation",
			saveOperations: [draftOnlySaveOperation],
		},
	],
});

assertEqual(
	mixedPublishReadiness.status,
	"mixed",
	"Expected supported plus unsupported staged work to classify as mixed.",
);
assertEqual(
	mixedPublishReadiness.supportedOperationCount,
	1,
	"Expected mixed publish readiness to count supported staged owner writes.",
);
assertEqual(
	mixedPublishReadiness.unsupportedOperationCount,
	1,
	"Expected mixed publish readiness to count unsupported staged owner writes.",
);

const previewTargets = previewTargetsForStagedEdits({
	workspace,
	edits: [stagedEdit],
});
assertIncludes(
	previewTargets.stableIds,
	playerObject.stableId,
	"Expected staged player edits to produce a preview cleanup target.",
);
assertIncludes(
	previewTargets.targetKinds,
	"spawn",
	"Expected staged player edits to clear spawn previews.",
);

const graphNodeIds = workspace.graph.nodes.map((node) => node.id);
for (const nodeId of [
	"authored-level",
	"content-graph",
	"runtime-manifest",
	"readiness",
	"live-runtime",
	"preview-channel",
]) {
	assertIncludes(
		graphNodeIds,
		nodeId,
		`Expected engine graph to include ${nodeId}.`,
	);
}

const featureCoverage = buildLevelEditorFeatureCoverageRegistry();
const featureCoverageErrors =
	validateLevelEditorFeatureCoverageRegistry(featureCoverage);

assertEqual(
	featureCoverageErrors.length,
	0,
	"Expected level editor feature-family publish coverage to validate.",
);

const boundedOwnerWriteFamilies = featureCoverage.families.filter(
	(family) => family.publishStatus === "bounded-owner-write",
);

assertEqual(
	boundedOwnerWriteFamilies.length,
	6,
	"Expected transform overrides, level-instance duplication/removal/prefab replacement, component edits, and object-library placements to be publishable.",
);
assertIncludes(
	boundedOwnerWriteFamilies.map((family) => family.id),
	"level-instance-transform",
	"Expected level-instance transforms to remain a bounded owner-write family.",
);
assertIncludes(
	boundedOwnerWriteFamilies.find(
		(family) => family.id === "level-instance-transform",
	)?.operationKinds ?? [],
	"set-transform",
	"Expected the transform family to support set-transform owner writes.",
);
assertIncludes(
	boundedOwnerWriteFamilies.map((family) => family.id),
	"level-instance-removal",
	"Expected level-instance removals to be a bounded owner-write family.",
);
assertIncludes(
	boundedOwnerWriteFamilies.find(
		(family) => family.id === "level-instance-removal",
	)?.operationKinds ?? [],
	"remove-instance",
	"Expected the level-instance removal family to support remove-instance owner writes.",
);
assertIncludes(
	boundedOwnerWriteFamilies.find(
		(family) => family.id === "level-instance-removal",
	)?.operationKinds ?? [],
	"remove-level-instance",
	"Expected the level-instance removal family to support persisted remove-level-instance owner writes.",
);
assertIncludes(
	boundedOwnerWriteFamilies.find(
		(family) => family.id === "level-instance-removal",
	)?.optionalGeneratedOwnerKinds ?? [],
	"published-transforms",
	"Expected level-instance removal publish support to route through the generated level-instance owner.",
);
assertIncludes(
	boundedOwnerWriteFamilies.find(
		(family) => family.id === "level-instance-removal",
	)?.ownerTargetIds ?? [],
	`${workspace.selectedRuntimeSceneId}:level`,
	"Expected level-instance removal publish support to be backed by the selected level owner target.",
);
assertIncludes(
	boundedOwnerWriteFamilies.map((family) => family.id),
	"level-instance-duplication",
	"Expected level-instance duplication to be a bounded owner-write family.",
);
assertIncludes(
	boundedOwnerWriteFamilies.find(
		(family) => family.id === "level-instance-duplication",
	)?.operationKinds ?? [],
	"insert-instance",
	"Expected the level-instance duplication family to support insert-instance owner writes.",
);
assertIncludes(
	boundedOwnerWriteFamilies.find(
		(family) => family.id === "level-instance-duplication",
	)?.operationKinds ?? [],
	"insert-level-instance",
	"Expected the level-instance duplication family to support persisted insert-level-instance owner writes.",
);
assertIncludes(
	boundedOwnerWriteFamilies.find(
		(family) => family.id === "level-instance-duplication",
	)?.optionalGeneratedOwnerKinds ?? [],
	"published-transforms",
	"Expected duplication publish support to route through the generated level-instance owner.",
);
assertIncludes(
	boundedOwnerWriteFamilies.find(
		(family) => family.id === "level-instance-duplication",
	)?.ownerTargetIds ?? [],
	`${workspace.selectedRuntimeSceneId}:level`,
	"Expected duplication publish support to be backed by the selected level owner target.",
);
assertIncludes(
	boundedOwnerWriteFamilies.map((family) => family.id),
	"level-instance-prefab-replacement",
	"Expected level-instance prefab replacement to be a bounded owner-write family.",
);
assertIncludes(
	boundedOwnerWriteFamilies.find(
		(family) => family.id === "level-instance-prefab-replacement",
	)?.operationKinds ?? [],
	"replace-prefab",
	"Expected the level-instance prefab replacement family to support replace-prefab owner writes.",
);
assertIncludes(
	boundedOwnerWriteFamilies.find(
		(family) => family.id === "level-instance-prefab-replacement",
	)?.operationKinds ?? [],
	"replace-level-instance",
	"Expected the level-instance prefab replacement family to support persisted replace-level-instance owner writes.",
);
assertIncludes(
	boundedOwnerWriteFamilies.find(
		(family) => family.id === "level-instance-prefab-replacement",
	)?.optionalGeneratedOwnerKinds ?? [],
	"published-transforms",
	"Expected prefab replacement publish support to route through the generated level-instance owner.",
);
assertIncludes(
	boundedOwnerWriteFamilies.find(
		(family) => family.id === "level-instance-prefab-replacement",
	)?.ownerTargetIds ?? [],
	`${workspace.selectedRuntimeSceneId}:level`,
	"Expected prefab replacement publish support to be backed by the selected level owner target.",
);
assertIncludes(
	boundedOwnerWriteFamilies.map((family) => family.id),
	"component-editing",
	"Expected component editing to be a bounded owner-write family.",
);
assertIncludes(
	boundedOwnerWriteFamilies.find((family) => family.id === "component-editing")
		?.operationKinds ?? [],
	"set-component",
	"Expected the component-editing family to support set-component owner writes.",
);
assertIncludes(
	boundedOwnerWriteFamilies.find((family) => family.id === "component-editing")
		?.operationKinds ?? [],
	"remove-component",
	"Expected the component-editing family to support remove-component owner writes.",
);
assertIncludes(
	boundedOwnerWriteFamilies.find((family) => family.id === "component-editing")
		?.optionalGeneratedOwnerKinds ?? [],
	"published-transforms",
	"Expected component publish support to route through the generated level-instance owner.",
);
assertIncludes(
	boundedOwnerWriteFamilies.find((family) => family.id === "component-editing")
		?.ownerTargetIds ?? [],
	`${workspace.selectedRuntimeSceneId}:level`,
	"Expected component publish support to be backed by the selected level owner target.",
);
assertIncludes(
	boundedOwnerWriteFamilies.map((family) => family.id),
	"object-library-placement",
	"Expected object-library placement to be a bounded owner-write family.",
);
assertIncludes(
	boundedOwnerWriteFamilies.find(
		(family) => family.id === "object-library-placement",
	)?.operationKinds ?? [],
	"insert-level-instance",
	"Expected the placement family to support insert-level-instance owner writes.",
);
assertIncludes(
	boundedOwnerWriteFamilies[0]?.optionalGeneratedOwnerKinds ?? [],
	"published-transforms",
	"Expected transform publish support to route through the published transform owner.",
);
assertIncludes(
	boundedOwnerWriteFamilies.find(
		(family) => family.id === "level-instance-transform",
	)?.ownerTargetIds ?? [],
	`${workspace.selectedRuntimeSceneId}:level`,
	"Expected transform publish support to be backed by the selected level owner target.",
);

for (const familyId of [
	"object-library-replacement",
	"portal-interaction-targets",
	"environment-render-profile",
	"authored-lighting",
	"audio-authoring",
	"npc-firefly-authoring",
	"ai-generated-assets",
] as const) {
	const family = featureCoverage.families.find((item) => item.id === familyId);

	if (!family) {
		throw new Error(`Expected feature-family coverage for ${familyId}.`);
	}
	assertEqual(
		family.publishStatus,
		"registered-owner-draft-only",
		`Expected ${familyId} to remain draft-only until a runtime owner writer exists.`,
	);
	assertEqual(
		family.storagePolicy,
		"save-draft-only-non-runtime",
		`Expected ${familyId} not to persist editor-only data as runtime support.`,
	);
	assertAtLeast(
		family.ownerTargetIds.length,
		1,
		`Expected ${familyId} to name future owner targets without claiming publish support.`,
	);
}

for (const familyId of ["terrain-packages", "collision-authoring"] as const) {
	const family = featureCoverage.families.find((item) => item.id === familyId);

	if (!family) {
		throw new Error(`Expected feature-family coverage for ${familyId}.`);
	}
	assertEqual(
		family.publishStatus,
		"cook-contract",
		`Expected ${familyId} to remain behind cook-contract publish semantics.`,
	);
	assertEqual(
		family.storagePolicy,
		"cook-generated-owner",
		`Expected ${familyId} to publish through generated cook owners, not generic Publish Level.`,
	);
}

const terrainObjects = registeredDraftWorkspace.objects.filter(
	(object) => object.category === "terrain",
);

for (const terrainObject of terrainObjects) {
	assertIncludes(
		terrainObject.capabilities,
		"bake-only",
		"Expected terrain objects to remain bake-only in the workspace model.",
	);
	assertEqual(
		terrainObject.workflow.publishability,
		"cook-contract",
		"Expected terrain workflow to expose cook/bake publishability.",
	);
	assertIncludes(
		terrainObject.workflow.labels,
		"Cook/bake publish",
		"Expected terrain workflow labels to expose cook/bake publish.",
	);
}

const missingSelectionWorkspace = buildLevelEditorWorkspaceModel({
	selectedStableId: "workspace-contract:missing-selection",
});

assertEqual(
	missingSelectionWorkspace.selection.state,
	"missing-selection",
	"Expected missing selected stable IDs to be explicit in the workspace model.",
);
assertIncludes(
	missingSelectionWorkspace.selection.labels,
	"Missing selection",
	"Expected missing selection labels to be user-facing.",
);
assertEqual(
	missingSelectionWorkspace.objects.some(
		(object) => object.workflow.selectionState === "selected",
	),
	false,
	"Expected missing selection state not to mark an unrelated object selected.",
);

assertIncludes(
	workspace.validationReport.items
		.filter((item) => item.severity === "warning")
		.map((item) => item.category),
	"terrain",
	"Expected validation report to surface bake-only terrain as a warning category.",
);

const duplicateStableIdInstance =
	defaultRuntimeSceneManifest.level.instances[0];
if (duplicateStableIdInstance === undefined) {
	throw new Error("Expected default runtime scene to include level instances.");
}

const duplicateStableIdReport = buildLevelEditorValidationReport({
	manifest: {
		...defaultRuntimeSceneManifest,
		level: {
			...defaultRuntimeSceneManifest.level,
			instances: [
				...defaultRuntimeSceneManifest.level.instances,
				{
					...duplicateStableIdInstance,
					id: "workspace-contract-duplicate-stable-id",
				},
			],
		},
	} satisfies RuntimeSceneManifestData,
});

assertEqual(
	duplicateStableIdReport.blocksPublish,
	true,
	"Expected validation report errors to block publish.",
);
assertIncludes(
	duplicateStableIdReport.items.map((item) => item.category),
	"stable-id",
	"Expected duplicate stable IDs to use a stable-id report category.",
);
assertAtLeast(
	duplicateStableIdReport.items.filter(
		(item) => item.id.includes("stable-id") && item.blocksPublish,
	).length,
	1,
	"Expected blocking validation report items to have stable IDs.",
);

const missingAssetReport = buildLevelEditorValidationReport({
	manifest: {
		...defaultRuntimeSceneManifest,
		assets: {
			...defaultRuntimeSceneManifest.assets,
			assets: defaultRuntimeSceneManifest.assets.assets.filter(
				(asset) => asset.id !== "mesh_player",
			),
		},
	} satisfies RuntimeSceneManifestData,
});

assertIncludes(
	missingAssetReport.items.map((item) => item.category),
	"reference-integrity",
	"Expected unresolved asset references to use the reference-integrity report category.",
);
assertAnyContains(
	missingAssetReport.items.map((item) => item.id),
	"reference-integrity",
	"Expected unresolved asset report IDs to include their category.",
);

const missingOwnerProvenanceReport = buildLevelEditorValidationReport({
	manifest: defaultRuntimeSceneManifest,
	authoring: {
		...workspace.authoring,
		status: "blocked",
		errors: ["records.0.owner must declare owner provenance."],
	} satisfies LevelEditorWorkspaceAuthoringState,
});

assertIncludes(
	missingOwnerProvenanceReport.items.map((item) => item.category),
	"owner-provenance",
	"Expected missing owner provenance to use an owner-provenance report category.",
);

console.log(
	`Level editor workspace model contract passed for ${workspace.levelBrowser.length} loadable levels and ${workspace.objects.length} selected-scene objects.`,
);

function assertEqual<T>(actual: T, expected: T, message: string): void {
	if (actual !== expected) {
		throw new Error(`${message} Expected ${expected}, received ${actual}.`);
	}
}

function assertIncludes<T>(
	items: readonly T[],
	item: T,
	message: string,
): void {
	if (!items.includes(item)) {
		throw new Error(`${message} Missing ${String(item)}.`);
	}
}

function assertContains(
	actual: string,
	expected: string,
	message: string,
): void {
	if (!actual.includes(expected)) {
		throw new Error(`${message} Missing ${expected}.`);
	}
}

function assertNotContains(
	actual: string,
	forbidden: string,
	message: string,
): void {
	if (actual.toLowerCase().includes(forbidden.toLowerCase())) {
		throw new Error(`${message} Forbidden ${forbidden}.`);
	}
}

function assertAnyContains(
	items: readonly string[],
	expected: string,
	message: string,
): void {
	if (!items.some((item) => item.includes(expected))) {
		throw new Error(`${message} Missing ${expected}.`);
	}
}

function assertAtLeast(actual: number, minimum: number, message: string): void {
	if (actual < minimum) {
		throw new Error(
			`${message} Expected at least ${minimum}, received ${actual}.`,
		);
	}
}

function requiredMapValue<TKey, TValue>(
	map: ReadonlyMap<TKey, TValue>,
	key: TKey,
): TValue {
	const value = map.get(key);

	if (value === undefined) {
		throw new Error(`Expected map value for ${String(key)}.`);
	}

	return value;
}
