import { buildAuthoringSaveTransaction } from "../src/app/editor/levelEditorAuthoringClient.js";
import {
	type LevelEditorQueuedAuthoringOperation,
	createLevelEditorAuthoringQueue,
	queuedLevelEditorAuthoringSaveOperations,
	stageLevelEditorAuthoringOperations,
} from "../src/app/editor/levelEditorAuthoringStore.js";
import { getDefaultLevelEditorSessionSummary } from "../src/app/editor/levelEditorSession.js";
import { buildLevelEditorWorkspaceModel } from "../src/app/editor/levelEditorWorkspaceModel.js";
import {
	type LevelEditorStagedFieldEdit,
	buildWorkspaceAuthoringTransaction,
	previewTargetsForStagedEdits,
} from "../src/app/editor/levelEditorWorkspaceUi.js";
import {
	type LevelEditorAuthoringOperationData,
	buildLevelEditorAuthoringSaveWritePlan,
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
	registeredDraftWorkspace.sceneTree.map((group) => group.category),
	"collision",
	"Expected explicitly selected registered-draft workspace to expose collision objects.",
);
assertAtLeast(
	defaultCategories.size,
	3,
	"Expected workspace outliner to be broader than terrain diagnostics.",
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

const commandById = new Map(
	workspace.commands.map((command) => [command.id, command] as const),
);
const saveCommand = requiredMapValue(commandById, "save");
const discardCommand = requiredMapValue(commandById, "discard");
const buildCommand = requiredMapValue(commandById, "build");
const publishCommand = requiredMapValue(commandById, "publish");

assertEqual(saveCommand.enabled, true, "Expected Save to be commandable.");
assertEqual(
	saveCommand.requiresDirty,
	true,
	"Expected Save to require staged edits.",
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
	true,
	"Expected Publish to be blocked by unsaved staged edits.",
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

const terrainObjects = registeredDraftWorkspace.objects.filter(
	(object) => object.category === "terrain",
);

for (const terrainObject of terrainObjects) {
	assertIncludes(
		terrainObject.capabilities,
		"bake-only",
		"Expected terrain objects to remain bake-only in the workspace model.",
	);
}

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
