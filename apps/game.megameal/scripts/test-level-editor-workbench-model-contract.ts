import { buildLevelEditorWorkbenchModel } from "../src/app/editor/levelEditorWorkbenchModel.js";
import { buildLevelEditorWorkspaceModel } from "../src/app/editor/levelEditorWorkspaceModel.js";
import { portalArenaRuntimeSceneManifest } from "../src/game/levels/index.js";
import {
	assertDeepEqual,
	assertDefined,
	assertEqual,
} from "./contractTestHelpers.js";

const workspace = buildLevelEditorWorkspaceModel();
const workbench = buildLevelEditorWorkbenchModel({ workspace });
const portalArenaWorkspace = buildLevelEditorWorkspaceModel({
	selectedRuntimeSceneId: portalArenaRuntimeSceneManifest.id,
});
const portalArenaWorkbench = buildLevelEditorWorkbenchModel({
	workspace: portalArenaWorkspace,
});

assertEqual(
	workbench.schemaVersion,
	1,
	"Expected workbench model schema version to be explicit.",
);
assertEqual(
	workbench.contractId,
	"LevelEditorWorkbenchContract",
	"Expected workbench model to name the owning contract.",
);
assertDeepEqual(
	workbench.generatedFrom,
	["levelEditorWorkspaceModel", "LevelEditorWorkbenchContract"],
	"Expected workbench model to be a projection over the existing workspace model.",
);
assertDeepEqual(
	workbench.regionOrder,
	["top-toolbar", "hierarchy", "viewport", "inspector", "bottom-dock"],
	"Expected workbench region order to match the contract shell.",
);
assertEqual(
	workbench.runtimeOwnership.canonicalRuntimeSource,
	"RuntimeSceneManifest",
	"Expected runtime scene manifests to remain the canonical runtime source.",
);
assertEqual(
	workbench.runtimeOwnership.editorOwnsRuntimeState,
	false,
	"Expected workbench model not to own runtime state.",
);
assertEqual(
	workbench.runtimeOwnership.devPreviewWritesPermanentRuntimeData,
	false,
	"Expected dev preview to stay separate from permanent runtime data.",
);
assertEqual(
	workbench.runtimeOwnership.runtimeDependsOnWorkbenchModel,
	false,
	"Expected runtime to remain independent of the workbench model.",
);

const topToolbar = workbench.regions.topToolbar;
assertEqual(
	topToolbar.ownsRuntimeState,
	false,
	"Expected toolbar commands to avoid runtime ownership.",
);
assertEqual(
	topToolbar.selectedRuntimeSceneId,
	workspace.selectedRuntimeSceneId,
	"Expected toolbar selected scene to mirror the workspace model.",
);
assertEqual(
	topToolbar.validationSummary.blocksPublish,
	workspace.validationReport.blocksPublish,
	"Expected toolbar validation summary to mirror publish blocking state.",
);
for (const commandId of ["save", "save-level", "build", "publish"] as const) {
	assertIncludes(
		topToolbar.commands.map((command) => command.id),
		commandId,
		`Expected toolbar commands to include ${commandId}.`,
	);
}

const hierarchy = workbench.regions.hierarchy;
assertEqual(
	hierarchy.source,
	"workspace.sceneTree",
	"Expected hierarchy to derive from the workspace scene tree.",
);
assertEqual(
	hierarchy.groups.length,
	workspace.sceneTree.length,
	"Expected hierarchy groups to preserve workspace grouping.",
);
const selectedHierarchyGroup = assertDefined(
	hierarchy.groups.find(
		(group) => group.selectedObjectStableId === workspace.selectedStableId,
	),
	"Expected selected workspace object to be present in the hierarchy.",
);
const selectedStableId = assertDefined(
	workspace.selectedStableId,
	"Expected workspace to expose a selected stable ID.",
);
assertIncludes(
	selectedHierarchyGroup.stableIdPaths.map((path) => path.stableId),
	selectedStableId,
	"Expected hierarchy selected group to retain stable-ID object paths.",
);
const selectedHierarchyPath = assertDefined(
	selectedHierarchyGroup.stableIdPaths.find(
		(path) => path.stableId === selectedStableId,
	),
	"Expected selected hierarchy path metadata to exist.",
);
assertIncludes(
	selectedHierarchyPath.objectPath,
	workspace.selectedRuntimeSceneId,
	"Expected hierarchy path metadata to include the runtime scene ID.",
);
assertIncludes(
	selectedHierarchyPath.objectPath,
	selectedStableId,
	"Expected hierarchy path metadata to include the stable ID.",
);
assertEqual(
	selectedHierarchyPath.visibility.state,
	"visible",
	"Expected hierarchy to expose visibility affordance metadata.",
);
assertIncludes(
	["editable", "cook-guarded", "read-only"],
	selectedHierarchyPath.lock.state,
	"Expected hierarchy to expose lock affordance metadata.",
);
assertIncludes(
	["projected-pickable", "outliner-only"],
	selectedHierarchyPath.pickability.state,
	"Expected hierarchy to expose pickability affordance metadata.",
);

const viewport = workbench.regions.viewport;
assertEqual(
	viewport.surface,
	"live-game-viewport-bridge",
	"Expected viewport region to describe the live-game bridge surface.",
);
assertEqual(
	viewport.route,
	workspace.routes.liveGame,
	"Expected viewport bridge to point at the live game route.",
);
assertEqual(
	viewport.selectionSource,
	"workspace.selectedStableId",
	"Expected viewport selection to share the workspace selected stable ID.",
);
assertEqual(
	viewport.previewOnly,
	true,
	"Expected viewport bridge to be preview-only.",
);
assertEqual(
	viewport.directManipulation,
	false,
	"Expected workbench shell not to overclaim implemented transform gizmos.",
);
assertIncludes(
	viewport.supportedPreviewTargetKinds,
	"spawn",
	"Expected default viewport preview target kinds to include spawn.",
);
assertIncludes(
	portalArenaWorkbench.regions.viewport.supportedPreviewTargetKinds,
	"portal",
	"Expected Portal Arena viewport preview target kinds to include portal.",
);

const selectedObject = assertDefined(
	workspace.objects.find((object) => object.stableId === selectedStableId),
	"Expected workspace selected object to exist.",
);
const inspector = workbench.regions.inspector;
assertEqual(
	inspector.source,
	"workspace.objects",
	"Expected inspector to derive selected-object data from workspace objects.",
);
assertEqual(
	inspector.selectedObject?.stableId,
	selectedObject.stableId,
	"Expected inspector selection to mirror the workspace selected object.",
);
assertEqual(
	inspector.selectedObject?.sourceOwner,
	selectedObject.sourceOwner,
	"Expected inspector to preserve selected-object source ownership.",
);
assertEqual(
	inspector.selectedObject?.fieldCount,
	selectedObject.fields.length,
	"Expected inspector field summary to mirror workspace fields.",
);

const bottomDock = workbench.regions.bottomDock;
assertDeepEqual(
	bottomDock.tabs.map((tab) => tab.id),
	[
		"content-browser",
		"staged-operations",
		"output-log",
		"validation-report",
		"command-plan",
		"publish-gates",
	],
	"Expected bottom dock to expose content/staged/output/validation/command/publish tabs.",
);
const stagedOperationsTab = assertDefined(
	bottomDock.tabs.find((tab) => tab.id === "staged-operations"),
	"Expected bottom dock to include a staged operations tab.",
);
assertEqual(
	stagedOperationsTab.label,
	"Staged Operations",
	"Expected staged operations tab to use editor-facing language.",
);
assertEqual(
	stagedOperationsTab.itemCount,
	workspace.authoring.recordCount,
	"Expected staged operations tab to reflect authoring record count.",
);
assertEqual(
	bottomDock.contentBrowser.groupCount,
	workspace.objectLibrary.length,
	"Expected bottom dock content browser to mirror workspace library groups.",
);
assertEqual(
	bottomDock.outputLog.entryCount,
	workspace.outputLog.length,
	"Expected bottom dock output log to mirror workspace output entries.",
);
assertEqual(
	bottomDock.validationReport.itemCount,
	workspace.validationReport.items.length,
	"Expected bottom dock validation report to mirror workspace validation items.",
);
assertEqual(
	bottomDock.commandPlan.buildStepCount,
	workspace.commandPlans.build.stepCount,
	"Expected bottom dock command plan to expose build steps.",
);
assertEqual(
	bottomDock.commandPlan.productionBuildHasHiddenCook,
	false,
	"Expected workbench command plan to keep hidden production cooks disabled.",
);
const publishCommand = assertDefined(
	workspace.commands.find((command) => command.id === "publish"),
	"Expected workspace to expose a publish command.",
);
assertEqual(
	bottomDock.publishGates.commandEnabled,
	publishCommand.enabled,
	"Expected bottom dock publish gate to mirror publish command availability.",
);

console.log(
	`Level editor workbench model contract passed for ${workbench.regionOrder.length} workbench regions over ${workspace.objects.length} workspace objects.`,
);

function assertIncludes<TValue>(
	items: readonly TValue[],
	expected: TValue,
	message: string,
): void {
	if (!items.includes(expected)) {
		throw new Error(`${message} Missing ${String(expected)}.`);
	}
}
