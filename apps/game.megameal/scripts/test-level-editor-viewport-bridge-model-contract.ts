import {
	buildLevelEditorViewportBridgeModel,
	viewportPlacementPositionFromNormalizedPoint,
} from "../src/app/editor/levelEditorViewportBridgeModel.js";
import type {
	LevelEditorWorkspaceModel,
	LevelEditorWorkspaceObject,
} from "../src/app/editor/levelEditorWorkspaceModel.js";

const playerObject = workspaceObject({
	id: "player-instance",
	stableId: "player",
	prefabId: "player_prefab",
	label: "Player Spawn",
	category: "spawn",
	componentNames: ["Transform", "SpawnPoint"],
	previewTargetKind: "spawn",
	position: { x: -10, y: 0, z: 0 },
});
const portalObject = workspaceObject({
	id: "observatory-portal-instance",
	stableId: "portal-arena:portal:observatory",
	prefabId: "portal_gate",
	label: "Observatory Portal",
	category: "portals",
	componentNames: ["Transform", "Portal", "Collider"],
	previewTargetKind: "portal",
	position: { x: 10, y: 0, z: 20 },
});
const workspace = {
	schemaVersion: 1,
	selectedRuntimeSceneId: "portal_arena_runtime",
	selectedLevelId: "portal_arena",
	selectedStableId: playerObject.stableId,
	selection: {
		selectedStableId: playerObject.stableId,
		selectedObjectId: playerObject.id,
		selectedLabel: playerObject.label,
		selectedCategory: playerObject.category,
		state: "selected-object",
		labels: ["editable", "previewable"],
		inspectorTitle: playerObject.label,
		inspectorSubtitle: playerObject.stableId,
	},
	levelBrowser: [],
	sceneTree: [
		{ category: "spawn", label: "Spawn", objects: [playerObject] },
		{ category: "portals", label: "Portals", objects: [portalObject] },
	],
	objects: [playerObject, portalObject],
	objectLibrary: [],
	graph: { nodes: [], edges: [] },
	validation: { errors: [], warnings: [] },
	validationReport: {
		schemaVersion: 1,
		runtimeSceneId: "portal_arena_runtime",
		generatedFrom: [],
		items: [],
		errorCount: 0,
		warningCount: 0,
		blocksPublish: false,
	},
	routes: {
		editor: "/editor/",
		liveGame: "/",
	},
	commands: [],
	authoring: {
		status: "ready",
		documentContentHash: "fixture-authoring-hash",
		sourceManifestContentHash: "fixture-manifest-hash",
		recordCount: 2,
		ownerTargetCount: 1,
		writableTargetCount: 1,
		saveTarget: null,
		errors: [],
	},
	commandPlans: {
		build: emptyCommandPlan("build", "Build"),
		publish: emptyCommandPlan("publish-local", "Publish"),
	},
	outputLog: [],
	persistence: {
		mode: "explicit-authoring-save",
		writesFiles: false,
		saveOwner: "generated-authoring-transaction",
		bakeOwner: "contract-cli",
	},
} satisfies LevelEditorWorkspaceModel;
const bridge = buildLevelEditorViewportBridgeModel({ workspace });

assertEqual(
	bridge.schemaVersion,
	1,
	"Expected viewport bridge model schema version to be explicit.",
);
assertEqual(
	bridge.contract,
	"LevelEditorViewportBridgeContract",
	"Expected viewport bridge model to declare its editor-only contract.",
);
assertEqual(
	bridge.runtimeSceneId,
	workspace.selectedRuntimeSceneId,
	"Expected viewport bridge to target the selected workspace runtime scene.",
);
assertEqual(
	bridge.bridge.targetRoute,
	workspace.routes.liveGame,
	"Expected viewport bridge to point at the live game route.",
);
assertEqual(
	bridge.bridge.transport,
	"dev-preview-broadcast-channel",
	"Expected viewport bridge to describe the existing dev-preview transport.",
);
assertEqual(
	bridge.bridge.writesRuntimeData,
	false,
	"Expected viewport bridge state to stay preview-only.",
);
assertEqual(
	bridge.view.mode,
	"live-game",
	"Expected viewport bridge to default to live-game view mode.",
);
assertIncludes(
	bridge.view.availableModes,
	"collision",
	"Expected viewport bridge view modes to reserve collision overlay viewing.",
);
assertIncludes(
	bridge.view.availableModes,
	"wireframe",
	"Expected viewport bridge view modes to reserve wireframe viewing.",
);
assertIncludes(
	bridge.view.activeOverlayIds,
	"selection-outline",
	"Expected selected viewport bridge objects to enable selection outline.",
);
assertIncludes(
	bridge.view.activeOverlayIds,
	"transform-origin",
	"Expected selected viewport bridge objects to expose future transform origin overlay readiness.",
);
assertEqual(
	bridge.selectedStableId,
	workspace.selectedStableId,
	"Expected viewport bridge selection to mirror the workspace selected stable ID.",
);

if (bridge.selectedObject === null) {
	throw new Error(
		"Expected default viewport bridge to expose a selected object.",
	);
}

assertEqual(
	bridge.selectedObject.stableId,
	workspace.selectedStableId,
	"Expected selected bridge object to use stable workspace identity.",
);
assertEqual(
	bridge.selectedObject.previewable,
	true,
	"Expected default selected object to remain previewable.",
);
assertEqual(
	bridge.selectedObject.transformEditable,
	true,
	"Expected default selected object to expose editable transform data.",
);
assertEqual(
	bridge.gizmo.status,
	"model-ready",
	"Expected selected editable object to be future-gizmo model-ready.",
);
assertEqual(
	bridge.gizmo.directManipulationEnabled,
	false,
	"Expected viewport bridge seam not to enable direct manipulation yet.",
);
assertIncludes(
	bridge.gizmo.supportedModes,
	"translate",
	"Expected future gizmo readiness to reserve translate mode.",
);
assertIncludes(
	bridge.gizmo.futureCapabilities,
	"viewport picking",
	"Expected future gizmo readiness to name viewport picking as future work.",
);
assertEqual(
	bridge.projection.coordinateSpace,
	"normalized-transform-xz",
	"Expected viewport bridge projection to declare its transform coordinate space.",
);
assertEqual(
	bridge.projection.placementSurface.status,
	"ready",
	"Expected transform-positioned objects to create a ready viewport placement surface.",
);
assertEqual(
	bridge.projection.placementSurface.stagesAuthoringEdits,
	true,
	"Expected viewport placement surface to stage authoring edits.",
);
assertEqual(
	bridge.projection.placementSurface.writesRuntimeData,
	false,
	"Expected viewport placement surface not to write runtime data directly.",
);
assertEqual(
	bridge.projection.placementSurface.worldBounds.minX,
	-10,
	"Expected viewport placement bounds to derive from manifest Transform.position.x values.",
);
assertEqual(
	bridge.projection.placementSurface.worldBounds.maxZ,
	20,
	"Expected viewport placement bounds to derive from manifest Transform.position.z values.",
);
assertEqual(
	bridge.projection.selectableCount,
	2,
	"Expected viewport bridge projection to expose transform-positioned objects as selectable pins.",
);
assertIncludes(
	bridge.projection.objects.map((object) => object.stableId),
	portalObject.stableId,
	"Expected viewport bridge projection to include portal objects generically.",
);

const selectedProjection = bridge.projection.objects.find(
	(object) => object.stableId === playerObject.stableId,
);

if (!selectedProjection) {
	throw new Error("Expected selected object to have a viewport projection.");
}

assertEqual(
	selectedProjection.selected,
	true,
	"Expected viewport projection to mark the selected object.",
);
assertEqual(
	selectedProjection.hasTransformPosition,
	true,
	"Expected selected viewport projection to come from transform fields.",
);
assertAtLeast(
	selectedProjection.xPercent,
	8,
	"Expected viewport projection x percent to stay inside the viewport frame.",
);
assertAtLeast(
	selectedProjection.zPercent,
	8,
	"Expected viewport projection z percent to stay inside the viewport frame.",
);

const droppedPlacementPosition = viewportPlacementPositionFromNormalizedPoint({
	surface: bridge.projection.placementSurface,
	point: { xPercent: 88, zPercent: 88 },
	y: 0,
});

if (droppedPlacementPosition === null) {
	throw new Error(
		"Expected viewport drop point to map into a placement position.",
	);
}

assertEqual(
	droppedPlacementPosition.join(","),
	"10,0,20",
	"Expected viewport drop placement to map normalized viewport coordinates into authored X/Z bounds.",
);
assertEqual(
	bridge.transformControls.status,
	"ready",
	"Expected editable transform object to expose viewport transform controls.",
);
assertEqual(
	bridge.transformControls.activeMode,
	"translate",
	"Expected viewport transform controls to default to translate mode.",
);
assertIncludes(
	bridge.transformControls.availableModes,
	"translate",
	"Expected viewport transform controls to expose translate when position fields exist.",
);
assertIncludes(
	bridge.transformControls.availableModes,
	"scale",
	"Expected viewport transform controls to expose scale when scale fields exist.",
);
assertEqual(
	bridge.transformControls.activeSnapStep,
	0.1,
	"Expected viewport transform controls to default to translate snap.",
);
assertEqual(
	bridge.transformControls.stagesAuthoringEdits,
	true,
	"Expected viewport transform controls to stage authoring edits.",
);
assertEqual(
	bridge.transformControls.writesRuntimeData,
	false,
	"Expected viewport transform controls not to mutate runtime state directly.",
);
assertIncludes(
	bridge.transformControls.fields.map((field) => field.path),
	"Transform.position.x",
	"Expected viewport transform controls to expose position X nudge editing.",
);
assertEqual(
	bridge.transformControls.activeHandles.length,
	3,
	"Expected translate mode to expose screen-space transform handles for each position axis.",
);
assertIncludes(
	bridge.transformControls.activeHandles.map((handle) => handle.path),
	"Transform.position.x",
	"Expected transform handles to use the same authored position X field as nudge controls.",
);
assertEqual(
	bridge.transformControls.activeHandles[0]?.stagesAuthoringEdits,
	true,
	"Expected transform handles to stage authoring edits.",
);
assertEqual(
	bridge.transformControls.activeHandles[0]?.writesRuntimeData,
	false,
	"Expected transform handles not to mutate runtime data directly.",
);
assertEqual(
	bridge.transformControls.activeHandles[0]?.source,
	"workspace-transform-field",
	"Expected transform handles to derive from workspace transform fields.",
);

const scaledBridge = buildLevelEditorViewportBridgeModel({
	workspace,
	transformMode: "scale",
	transformSnapSteps: {
		translate: 0.5,
		scale: 0.025,
	},
});
const scaleXField = scaledBridge.transformControls.fields.find(
	(field) => field.path === "Transform.scale.x",
);

if (!scaleXField) {
	throw new Error("Expected scale X transform control.");
}

assertEqual(
	scaledBridge.transformControls.activeMode,
	"scale",
	"Expected viewport transform controls to accept explicit scale mode.",
);
assertEqual(
	scaledBridge.transformControls.activeSnapStep,
	0.025,
	"Expected viewport transform controls to expose the active scale snap step.",
);
assertEqual(
	scaleXField.step,
	0.025,
	"Expected scale nudge controls to use the configured scale snap step.",
);
assertIncludes(
	scaledBridge.transformControls.activeHandles.map((handle) => handle.path),
	"Transform.scale.x",
	"Expected scale mode to expose scale transform handles.",
);
assertEqual(
	scaledBridge.transformControls.activeHandles[0]?.step,
	0.025,
	"Expected scale transform handles to use the active scale snap step.",
);

const stagedBridge = buildLevelEditorViewportBridgeModel({
	workspace,
	fieldValueOverrides: [
		{
			stableId: playerObject.stableId,
			path: "Transform.position.x",
			after: -9.5,
		},
	],
});
const stagedPositionX = stagedBridge.transformControls.fields.find(
	(field) => field.path === "Transform.position.x",
);

if (!stagedPositionX) {
	throw new Error("Expected staged position X transform control.");
}

assertEqual(
	stagedPositionX.value,
	-9.5,
	"Expected viewport transform controls to reflect staged field edits.",
);
assertEqual(
	stagedBridge.transformControls.activeHandles.find(
		(handle) => handle.path === "Transform.position.x",
	)?.value,
	-9.5,
	"Expected viewport transform handles to reflect staged field edits.",
);

const stagedProjectionBridge = buildLevelEditorViewportBridgeModel({
	workspace,
	fieldValueOverrides: [
		{
			stableId: playerObject.stableId,
			path: "Transform.position.x",
			after: 15,
		},
	],
});
const stagedPlayerProjection = stagedProjectionBridge.projection.objects.find(
	(object) => object.stableId === playerObject.stableId,
);
const stagedPortalProjection = stagedProjectionBridge.projection.objects.find(
	(object) => object.stableId === portalObject.stableId,
);

if (!stagedPlayerProjection || !stagedPortalProjection) {
	throw new Error(
		"Expected staged viewport projections for player and portal.",
	);
}

assertGreaterThan(
	stagedPlayerProjection.xPercent,
	stagedPortalProjection.xPercent,
	"Expected staged position edits to move viewport projection pins.",
);

const portalBridge = buildLevelEditorViewportBridgeModel({
	workspace,
	selectedStableId: portalObject.stableId,
	viewMode: "collision",
	enabledOverlayIds: ["selection-outline", "portal-links", "collision-bounds"],
	connectionStatus: "live",
	liveRuntimeSceneId: workspace.selectedRuntimeSceneId,
});

assertEqual(
	portalBridge.selectedObject?.stableId,
	portalObject.stableId,
	"Expected viewport bridge to accept explicit stable-ID selection.",
);
assertEqual(
	portalBridge.view.mode,
	"collision",
	"Expected viewport bridge to accept an explicit view mode.",
);
assertEqual(
	portalBridge.bridge.connectionStatus,
	"live",
	"Expected matching live runtime scene to keep live status.",
);
assertIncludes(
	portalBridge.view.activeOverlayIds,
	"portal-links",
	"Expected portal objects to expose portal link overlay readiness.",
);

const mismatchedBridge = buildLevelEditorViewportBridgeModel({
	workspace,
	connectionStatus: "live",
	liveRuntimeSceneId: "different_runtime",
});

assertEqual(
	mismatchedBridge.bridge.connectionStatus,
	"scene-mismatch",
	"Expected live bridge status to report scene mismatch when the game route is on a different runtime scene.",
);
assertEqual(
	mismatchedBridge.bridge.runtimeSceneMatches,
	false,
	"Expected viewport bridge to record mismatched live runtime scene.",
);

const emptySelectionBridge = buildLevelEditorViewportBridgeModel({
	workspace,
	selectedStableId: null,
});

assertEqual(
	emptySelectionBridge.selectedObject,
	null,
	"Expected viewport bridge to support an empty selected object state.",
);
assertEqual(
	emptySelectionBridge.gizmo.status,
	"no-selection",
	"Expected empty selection to block future gizmo readiness.",
);
assertNotIncludes(
	emptySelectionBridge.view.activeOverlayIds,
	"selection-outline",
	"Expected empty selection not to enable selection overlay.",
);

console.log("Level editor viewport bridge model contract passed.");

function workspaceObject(options: {
	readonly id: string;
	readonly stableId: string;
	readonly prefabId: string;
	readonly label: string;
	readonly category: LevelEditorWorkspaceObject["category"];
	readonly componentNames: readonly string[];
	readonly position: {
		readonly x: number;
		readonly y: number;
		readonly z: number;
	};
	readonly previewTargetKind: NonNullable<
		LevelEditorWorkspaceObject["previewTargetKind"]
	>;
}): LevelEditorWorkspaceObject {
	return {
		id: options.id,
		stableId: options.stableId,
		prefabId: options.prefabId,
		label: options.label,
		category: options.category,
		sourceOwner: `level:fixture prefab:${options.prefabId}`,
		assetIds: [],
		componentNames: options.componentNames,
		capabilities: ["previewable", "editable"],
		capabilityReason:
			"fixture object is editable for viewport bridge contract coverage.",
		workflow: {
			selectionState: "available",
			editability: "editable",
			preview: "temporary-preview",
			storage: "runtime-owner-publish",
			publishability: "publishable",
			labels: ["Editable", "Temporary preview", "Publishable"],
			reason:
				"fixture object is editable for viewport bridge contract coverage.",
			featureFamilyIds: ["level-instance-transform"],
		},
		fields: [
			...transformNumberFields(
				"Transform.position",
				"Position",
				options.position,
				"0.1",
			),
			...transformNumberFields(
				"Transform.scale",
				"Scale",
				{ x: 1, y: 1, z: 1 },
				"0.05",
			),
		],
		preview: {
			title: options.label,
			subtitle: options.stableId,
			sourceOwner: `level:fixture prefab:${options.prefabId}`,
			componentNames: options.componentNames,
			assetIds: [],
			primaryAsset: null,
		},
		previewTargetKind: options.previewTargetKind,
		previewSeed: {},
	};
}

function transformNumberFields(
	prefix: "Transform.position" | "Transform.scale",
	labelPrefix: "Position" | "Scale",
	values: { readonly x: number; readonly y: number; readonly z: number },
	step: string,
): LevelEditorWorkspaceObject["fields"] {
	return (["x", "y", "z"] as const).map((axis) => ({
		path: `${prefix}.${axis}`,
		label: `${labelPrefix} ${axis.toUpperCase()}`,
		value: values[axis],
		input: "number",
		step,
		readOnly: false,
		workflow: {
			editability: "editable",
			preview: "temporary-preview",
			storage: "runtime-owner-publish",
			publishability: "publishable",
			labels: ["Editable", "Temporary preview", "Publishable"],
			reason:
				"fixture field is editable for viewport bridge contract coverage.",
			featureFamilyIds: ["level-instance-transform"],
		},
	}));
}

function emptyCommandPlan(
	mode: LevelEditorWorkspaceModel["commandPlans"]["build"]["mode"],
	label: string,
): LevelEditorWorkspaceModel["commandPlans"]["build"] {
	return {
		mode,
		label,
		localOnly: true,
		productionBuildHasHiddenCook: false,
		stepCount: 0,
		steps: [],
		errors: [],
	};
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
	if (actual !== expected) {
		throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
	}
}

function assertIncludes<T>(
	values: readonly T[],
	expected: T,
	message: string,
): void {
	if (!values.includes(expected)) {
		throw new Error(`${message}\nMissing: ${String(expected)}`);
	}
}

function assertNotIncludes<T>(
	values: readonly T[],
	expected: T,
	message: string,
): void {
	if (values.includes(expected)) {
		throw new Error(`${message}\nUnexpected: ${String(expected)}`);
	}
}

function assertAtLeast(
	actual: number,
	expected: number,
	message: string,
): void {
	if (actual < expected) {
		throw new Error(
			`${message}\nExpected at least: ${expected}\nActual: ${actual}`,
		);
	}
}

function assertGreaterThan(
	actual: number,
	expected: number,
	message: string,
): void {
	if (actual <= expected) {
		throw new Error(
			`${message}\nExpected greater than: ${expected}\nActual: ${actual}`,
		);
	}
}
