import type {
	LevelEditorWorkspaceModel,
	LevelEditorWorkspaceObject,
	LevelEditorWorkspacePreviewTargetKind,
} from "./levelEditorWorkspaceModel.js";

export const LEVEL_EDITOR_VIEWPORT_BRIDGE_CONTRACT =
	"LevelEditorViewportBridgeContract" as const;

export type LevelEditorViewportBridgeConnectionStatus =
	| "inactive"
	| "ready"
	| "live"
	| "scene-mismatch"
	| "unavailable";

export type LevelEditorViewportBridgeViewMode =
	| "live-game"
	| "lit"
	| "unlit"
	| "collision"
	| "wireframe";

export type LevelEditorViewportOverlayId =
	| "selection-outline"
	| "object-labels"
	| "transform-origin"
	| "collision-bounds"
	| "light-influence"
	| "portal-links"
	| "audio-emitters"
	| "terrain-cells";

export type LevelEditorViewportGizmoMode = "translate" | "rotate" | "scale";

export type LevelEditorViewportInteractionTool =
	| "select"
	| "place"
	| "transform";

export type LevelEditorViewportCameraMode =
	| "orbit"
	| "top"
	| "front"
	| "side"
	| "iso";

export type LevelEditorViewportProjectedObject = {
	readonly stableId: string;
	readonly label: string;
	readonly category: LevelEditorWorkspaceObject["category"];
	readonly selected: boolean;
	readonly primarySelected: boolean;
	readonly visible: boolean;
	readonly locked: boolean;
	readonly pickable: boolean;
	readonly hasTransformPosition: boolean;
	readonly xPercent: number;
	readonly zPercent: number;
	readonly source: "workspace-transform";
	readonly reason: string;
};

export type LevelEditorViewportPlacementSurface = {
	readonly status: "ready" | "empty";
	readonly coordinateSpace: "normalized-transform-xz";
	readonly source: "workspace-transform-bounds";
	readonly snapSource: "translate-snap-step";
	readonly snapStep: number;
	readonly worldBounds: {
		readonly minX: number;
		readonly maxX: number;
		readonly minZ: number;
		readonly maxZ: number;
	};
	readonly marginPercent: number;
	readonly stagesAuthoringEdits: true;
	readonly writesRuntimeData: false;
	readonly reason: string;
};

export type LevelEditorViewportNormalizedPoint = {
	readonly xPercent: number;
	readonly zPercent: number;
};

export type LevelEditorViewportProjectedPickResult = {
	readonly stableId: string;
	readonly label: string;
	readonly distancePercent: number;
	readonly source: "projected-transform-pins";
	readonly renderedScenePicking: false;
	readonly reason: string;
};

export type LevelEditorViewportProjectedMarqueeSelectionResult = {
	readonly selectedStableIds: readonly string[];
	readonly source: "projected-transform-marquee";
	readonly renderedScenePicking: false;
	readonly reason: string;
};

export type LevelEditorViewportFieldValueOverride = {
	readonly stableId: string;
	readonly path: string;
	readonly after: string | number | boolean;
};

export type LevelEditorViewportTransformControlField = {
	readonly path: string;
	readonly label: string;
	readonly mode: LevelEditorViewportGizmoMode;
	readonly axis: "x" | "y" | "z";
	readonly value: number;
	readonly step: number;
	readonly canStage: boolean;
	readonly reason: string;
};

export type LevelEditorViewportTransformGizmoHandle = {
	readonly id: string;
	readonly path: string;
	readonly label: string;
	readonly mode: LevelEditorViewportGizmoMode;
	readonly axis: "x" | "y" | "z";
	readonly value: number;
	readonly step: number;
	readonly canStage: boolean;
	readonly stagesAuthoringEdits: true;
	readonly writesRuntimeData: false;
	readonly source: "workspace-transform-field";
	readonly reason: string;
};

export type LevelEditorViewportRotationYawControl = {
	readonly label: "Yaw";
	readonly valueDegrees: number;
	readonly stepDegrees: number;
	readonly canStage: boolean;
	readonly fieldPaths: readonly [
		"Transform.rotation.x",
		"Transform.rotation.y",
		"Transform.rotation.z",
		"Transform.rotation.w",
	];
	readonly stagesAuthoringEdits: true;
	readonly writesRuntimeData: false;
	readonly source: "workspace-transform-field";
	readonly reason: string;
};

export type LevelEditorViewportTransformSnapSteps = Readonly<
	Record<LevelEditorViewportGizmoMode, number>
>;

export type LevelEditorViewportTransformSnapOptions = Readonly<
	Record<LevelEditorViewportGizmoMode, readonly number[]>
>;

export type LevelEditorViewportTransformControls = {
	readonly status: "no-selection" | "ready" | "blocked";
	readonly activeMode: LevelEditorViewportGizmoMode;
	readonly availableModes: readonly LevelEditorViewportGizmoMode[];
	readonly activeSnapStep: number;
	readonly snapSteps: LevelEditorViewportTransformSnapSteps;
	readonly snapOptions: LevelEditorViewportTransformSnapOptions;
	readonly coordinateSource: "workspace-transform-fields";
	readonly stagesAuthoringEdits: true;
	readonly writesRuntimeData: false;
	readonly fields: readonly LevelEditorViewportTransformControlField[];
	readonly activeHandles: readonly LevelEditorViewportTransformGizmoHandle[];
	readonly rotationYawControl: LevelEditorViewportRotationYawControl | null;
	readonly blockedReasons: readonly string[];
};

export type LevelEditorViewportCameraControls = {
	readonly activeMode: LevelEditorViewportCameraMode;
	readonly availableModes: readonly LevelEditorViewportCameraMode[];
	readonly zoomPercent: number;
	readonly framingTarget: "selected-object" | "scene-bounds";
	readonly targetStableId: string | null;
	readonly stagesAuthoringEdits: false;
	readonly writesRuntimeData: false;
	readonly source: "editor-viewport-navigation";
	readonly reason: string;
};

export type LevelEditorViewportInteractionToolModel = {
	readonly id: LevelEditorViewportInteractionTool;
	readonly label: string;
	readonly enabled: boolean;
	readonly source:
		| "projected-transform-pins"
		| "normalized-placement-surface"
		| "workspace-transform-fields";
	readonly reason: string;
};

export type LevelEditorViewportProjectedTransformDragAffordance = {
	readonly status: "ready" | "blocked";
	readonly requiresActiveTool: "transform";
	readonly requiredMode: "translate";
	readonly requiredFieldPaths: readonly [
		"Transform.position.x",
		"Transform.position.z",
	];
	readonly coordinateSpace: "normalized-transform-xz";
	readonly surfaceSource: "normalized-transform-xz-surface";
	readonly transformSource: "workspace-transform-fields";
	readonly preservesAxis: "y";
	readonly renderedSceneHitTesting: false;
	readonly renderedSceneGizmo: false;
	readonly stagesAuthoringEdits: true;
	readonly writesRuntimeData: false;
	readonly reason: string;
};

export type LevelEditorViewportRenderedHitTestRequestReadiness =
	| "unavailable"
	| "available";

export type LevelEditorViewportRenderedHitTestReadiness = {
	readonly requestReadiness: LevelEditorViewportRenderedHitTestRequestReadiness;
	readonly requestAvailable: boolean;
	readonly requestSource: "runtime-rendered-scene-hit-test";
	readonly resultIdentity: "stable-id";
	readonly selectionBehavior:
		| "rendered-hit-test-result-selection"
		| "unchanged-projected-selection";
	readonly usesBrowserApis: false;
	readonly usesThreeApis: false;
	readonly changesSelection: boolean;
	readonly writesRuntimeData: false;
	readonly unavailableReasons: readonly string[];
	readonly reason: string;
};

export type LevelEditorViewportInteractionModel = {
	readonly activeTool: LevelEditorViewportInteractionTool;
	readonly tools: readonly LevelEditorViewportInteractionToolModel[];
	readonly renderedScenePickingEnabled: boolean;
	readonly renderedHitTest: LevelEditorViewportRenderedHitTestReadiness;
	readonly selectableSource:
		| "runtime-rendered-scene-hit-test"
		| "projected-transform-pins";
	readonly projectedPickRadiusPercent: number;
	readonly placementSource: "normalized-transform-xz-surface";
	readonly transformSource: "workspace-transform-fields";
	readonly projectedTransformDrag: LevelEditorViewportProjectedTransformDragAffordance;
	readonly writesRuntimeData: false;
	readonly blockedReasons: readonly string[];
	readonly reason: string;
};

export type LevelEditorViewportBridgeSelectedObject = {
	readonly stableId: string;
	readonly label: string;
	readonly category: LevelEditorWorkspaceObject["category"];
	readonly sourceOwner: string;
	readonly componentNames: readonly string[];
	readonly previewTargetKind: LevelEditorWorkspacePreviewTargetKind | null;
	readonly transformEditable: boolean;
	readonly previewable: boolean;
};

export type LevelEditorViewportOverlayModel = {
	readonly id: LevelEditorViewportOverlayId;
	readonly label: string;
	readonly enabled: boolean;
	readonly available: boolean;
	readonly source:
		| "workspace-selection"
		| "runtime-preview"
		| "authoring-data"
		| "future-gizmo";
	readonly reason: string;
};

export type LevelEditorViewportGizmoReadiness = {
	readonly status: "no-selection" | "model-ready" | "blocked";
	readonly directManipulationEnabled: false;
	readonly defaultMode: LevelEditorViewportGizmoMode;
	readonly supportedModes: readonly LevelEditorViewportGizmoMode[];
	readonly blockedReasons: readonly string[];
	readonly futureCapabilities: readonly string[];
};

export type LevelEditorViewportBridgeModel = {
	readonly schemaVersion: 1;
	readonly contract: typeof LEVEL_EDITOR_VIEWPORT_BRIDGE_CONTRACT;
	readonly runtimeSceneId: string;
	readonly selectedStableId: string | null;
	readonly selectedStableIds: readonly string[];
	readonly selectedObject: LevelEditorViewportBridgeSelectedObject | null;
	readonly bridge: {
		readonly targetRoute: "/";
		readonly transport: "dev-preview-broadcast-channel";
		readonly connectionStatus: LevelEditorViewportBridgeConnectionStatus;
		readonly liveRuntimeSceneId: string | null;
		readonly runtimeSceneMatches: boolean;
		readonly writesRuntimeData: false;
	};
	readonly view: {
		readonly mode: LevelEditorViewportBridgeViewMode;
		readonly availableModes: readonly LevelEditorViewportBridgeViewMode[];
		readonly overlays: readonly LevelEditorViewportOverlayModel[];
		readonly activeOverlayIds: readonly LevelEditorViewportOverlayId[];
	};
	readonly projection: {
		readonly coordinateSpace: "normalized-transform-xz";
		readonly placementSurface: LevelEditorViewportPlacementSurface;
		readonly objects: readonly LevelEditorViewportProjectedObject[];
		readonly selectableCount: number;
		readonly selectedObjectCount: number;
	};
	readonly interaction: LevelEditorViewportInteractionModel;
	readonly transformControls: LevelEditorViewportTransformControls;
	readonly camera: LevelEditorViewportCameraControls;
	readonly gizmo: LevelEditorViewportGizmoReadiness;
};

export type LevelEditorViewportObjectViewStateProjection = {
	readonly visibleStableIds?: readonly string[];
	readonly pickableStableIds?: readonly string[];
	readonly lockedStableIds?: readonly string[];
};

export function buildLevelEditorViewportBridgeModel(options: {
	readonly workspace: LevelEditorWorkspaceModel;
	readonly selectedStableId?: string | null;
	readonly selectedStableIds?: readonly string[];
	readonly objectViewState?: LevelEditorViewportObjectViewStateProjection;
	readonly viewMode?: LevelEditorViewportBridgeViewMode;
	readonly enabledOverlayIds?: readonly LevelEditorViewportOverlayId[];
	readonly connectionStatus?: LevelEditorViewportBridgeConnectionStatus;
	readonly liveRuntimeSceneId?: string | null;
	readonly fieldValueOverrides?: readonly LevelEditorViewportFieldValueOverride[];
	readonly transformMode?: LevelEditorViewportGizmoMode;
	readonly transformSnapSteps?: Partial<LevelEditorViewportTransformSnapSteps>;
	readonly cameraMode?: LevelEditorViewportCameraMode;
	readonly cameraZoomPercent?: number;
	readonly interactionTool?: LevelEditorViewportInteractionTool;
	readonly renderedHitTestRequestReadiness?: LevelEditorViewportRenderedHitTestRequestReadiness;
}): LevelEditorViewportBridgeModel {
	const requestedPrimaryStableId =
		options.selectedStableId === undefined
			? options.workspace.selectedStableId
			: options.selectedStableId;
	const selectedStableIds = normalizeViewportSelectedStableIds({
		objects: options.workspace.objects,
		selectedStableIds:
			options.selectedStableIds ??
			(requestedPrimaryStableId === null ? [] : [requestedPrimaryStableId]),
	});
	const selectedStableId =
		requestedPrimaryStableId === null
			? null
			: selectedStableIds.includes(requestedPrimaryStableId)
				? requestedPrimaryStableId
				: selectedStableIds[0] ?? null;
	const selectedObject =
		selectedStableId === null
			? null
			: options.workspace.objects.find(
					(object) => object.stableId === selectedStableId,
				) ?? null;
	const bridgeSelectedObject =
		selectedObject === null ? null : projectSelectedObject(selectedObject);
	const liveRuntimeSceneId = options.liveRuntimeSceneId ?? null;
	const runtimeSceneMatches =
		liveRuntimeSceneId === null ||
		liveRuntimeSceneId === options.workspace.selectedRuntimeSceneId;
	const requestedConnectionStatus = options.connectionStatus ?? "ready";
	const connectionStatus =
		requestedConnectionStatus === "live" && !runtimeSceneMatches
			? "scene-mismatch"
			: requestedConnectionStatus;
	const overlays = buildViewportOverlays({
		selectedObject,
		enabledOverlayIds: options.enabledOverlayIds ?? defaultOverlayIds,
	});
	const transformSnapSteps = normalizeTransformSnapSteps(
		options.transformSnapSteps,
	);
	const projection = buildViewportProjection({
		objects: options.workspace.objects,
		selectedStableIds,
		primarySelectedStableId: bridgeSelectedObject?.stableId ?? null,
		objectViewState: options.objectViewState,
		fieldValueOverrides: options.fieldValueOverrides ?? [],
		placementSnapStep: transformSnapSteps.translate,
	});
	const transformControls = buildTransformControls({
		selectedObject,
		fieldValueOverrides: options.fieldValueOverrides ?? [],
		requestedMode: options.transformMode ?? "translate",
		snapSteps: transformSnapSteps,
	});

	return {
		schemaVersion: 1,
		contract: LEVEL_EDITOR_VIEWPORT_BRIDGE_CONTRACT,
		runtimeSceneId: options.workspace.selectedRuntimeSceneId,
		selectedStableId: bridgeSelectedObject?.stableId ?? null,
		selectedStableIds,
		selectedObject: bridgeSelectedObject,
		bridge: {
			targetRoute: options.workspace.routes.liveGame,
			transport: "dev-preview-broadcast-channel",
			connectionStatus,
			liveRuntimeSceneId,
			runtimeSceneMatches,
			writesRuntimeData: false,
		},
		view: {
			mode: options.viewMode ?? "live-game",
			availableModes: viewportBridgeViewModes,
			overlays,
			activeOverlayIds: overlays
				.filter((overlay) => overlay.enabled)
				.map((overlay) => overlay.id),
		},
		projection,
		interaction: buildViewportInteractionModel({
			requestedTool: options.interactionTool ?? "select",
			projection,
			transformControls,
			renderedHitTestRequestReadiness:
				options.renderedHitTestRequestReadiness ?? "unavailable",
		}),
		transformControls,
		camera: buildViewportCameraControls({
			selectedObject,
			requestedMode: options.cameraMode ?? "orbit",
			zoomPercent: options.cameraZoomPercent ?? 100,
		}),
		gizmo: buildGizmoReadiness(selectedObject),
	};
}

const viewportBridgeViewModes = [
	"live-game",
	"lit",
	"unlit",
	"collision",
	"wireframe",
] as const satisfies readonly LevelEditorViewportBridgeViewMode[];

const viewportCameraModes = [
	"orbit",
	"top",
	"front",
	"side",
	"iso",
] as const satisfies readonly LevelEditorViewportCameraMode[];

const viewportInteractionTools = [
	"select",
	"place",
	"transform",
] as const satisfies readonly LevelEditorViewportInteractionTool[];

const viewportInteractionToolLabels = {
	select: "Select",
	place: "Place",
	transform: "Transform",
} as const satisfies Record<LevelEditorViewportInteractionTool, string>;

const defaultOverlayIds = [
	"selection-outline",
	"object-labels",
	"transform-origin",
] as const satisfies readonly LevelEditorViewportOverlayId[];

const overlayLabels = {
	"selection-outline": "Selection Outline",
	"object-labels": "Object Labels",
	"transform-origin": "Transform Origin",
	"collision-bounds": "Collision Bounds",
	"light-influence": "Light Influence",
	"portal-links": "Portal Links",
	"audio-emitters": "Audio Emitters",
	"terrain-cells": "Terrain Cells",
} as const satisfies Record<LevelEditorViewportOverlayId, string>;

function projectSelectedObject(
	object: LevelEditorWorkspaceObject,
): LevelEditorViewportBridgeSelectedObject {
	return {
		stableId: object.stableId,
		label: object.label,
		category: object.category,
		sourceOwner: object.sourceOwner,
		componentNames: object.componentNames,
		previewTargetKind: object.previewTargetKind ?? null,
		transformEditable: objectHasEditableTransform(object),
		previewable: object.capabilities.includes("previewable"),
	};
}

function buildViewportOverlays(options: {
	readonly selectedObject: LevelEditorWorkspaceObject | null;
	readonly enabledOverlayIds: readonly LevelEditorViewportOverlayId[];
}): readonly LevelEditorViewportOverlayModel[] {
	const enabledOverlayIds = new Set(options.enabledOverlayIds);

	return (Object.keys(overlayLabels) as LevelEditorViewportOverlayId[]).map(
		(id) => {
			const available = overlayAvailable(id, options.selectedObject);

			return {
				id,
				label: overlayLabels[id],
				available,
				enabled: available && enabledOverlayIds.has(id),
				source: overlaySource(id),
				reason: overlayReason(id, available, options.selectedObject),
			};
		},
	);
}

function buildViewportProjection(options: {
	readonly objects: readonly LevelEditorWorkspaceObject[];
	readonly selectedStableIds: readonly string[];
	readonly primarySelectedStableId: string | null;
	readonly objectViewState:
		| LevelEditorViewportObjectViewStateProjection
		| undefined;
	readonly fieldValueOverrides: readonly LevelEditorViewportFieldValueOverride[];
	readonly placementSnapStep: number;
}): LevelEditorViewportBridgeModel["projection"] {
	const viewState = normalizeViewportObjectViewState({
		objects: options.objects,
		objectViewState: options.objectViewState,
	});
	const positionedObjects = options.objects
		.filter((object) => viewState.visibleStableIds.has(object.stableId))
		.map((object) => ({
			object,
			position: objectTransformPosition(object, options.fieldValueOverrides),
		}))
		.filter(
			(
				entry,
			): entry is {
				readonly object: LevelEditorWorkspaceObject;
				readonly position: { readonly x: number; readonly z: number };
			} => entry.position !== null,
		);
	const bounds = placementBoundsForPositions(
		positionedObjects.map((entry) => entry.position),
	);
	const objects = options.objects
		.filter((object) => viewState.visibleStableIds.has(object.stableId))
		.map((object) =>
			projectViewportObject({
				object,
				selectedStableIds: options.selectedStableIds,
				primarySelectedStableId: options.primarySelectedStableId,
				visible: viewState.visibleStableIds.has(object.stableId),
				locked: viewState.lockedStableIds.has(object.stableId),
				pickable: viewState.pickableStableIds.has(object.stableId),
				bounds,
				fieldValueOverrides: options.fieldValueOverrides,
			}),
		);

	return {
		coordinateSpace: "normalized-transform-xz",
		placementSurface: {
			status: positionedObjects.length === 0 ? "empty" : "ready",
			coordinateSpace: "normalized-transform-xz",
			source: "workspace-transform-bounds",
			snapSource: "translate-snap-step",
			snapStep: options.placementSnapStep,
			worldBounds: bounds,
			marginPercent: viewportProjectionMarginPercent,
			stagesAuthoringEdits: true,
			writesRuntimeData: false,
			reason:
				positionedObjects.length === 0
					? "No transform-positioned objects are available for viewport placement bounds."
					: "Drops are mapped into manifest-owned Transform.position X/Z bounds and staged as authoring edits.",
		},
		objects,
		selectableCount: objects.filter(
			(object) => object.hasTransformPosition && object.pickable,
		).length,
		selectedObjectCount: objects.filter((object) => object.selected).length,
	};
}

function normalizeViewportObjectViewState(options: {
	readonly objects: readonly LevelEditorWorkspaceObject[];
	readonly objectViewState:
		| LevelEditorViewportObjectViewStateProjection
		| undefined;
}): {
	readonly visibleStableIds: ReadonlySet<string>;
	readonly pickableStableIds: ReadonlySet<string>;
	readonly lockedStableIds: ReadonlySet<string>;
} {
	const allStableIds = options.objects.map((object) => object.stableId);
	const visibleStableIds = new Set(
		options.objectViewState?.visibleStableIds ?? allStableIds,
	);
	const lockedStableIds = new Set(
		options.objectViewState?.lockedStableIds ?? [],
	);
	const pickableStableIds = new Set(
		options.objectViewState?.pickableStableIds ??
			options.objects
				.filter(
					(object) =>
						object.outliner.pickability.state === "projected-pickable" &&
						!lockedStableIds.has(object.stableId) &&
						visibleStableIds.has(object.stableId),
				)
				.map((object) => object.stableId),
	);

	return {
		visibleStableIds,
		pickableStableIds,
		lockedStableIds,
	};
}

function buildTransformControls(options: {
	readonly selectedObject: LevelEditorWorkspaceObject | null;
	readonly fieldValueOverrides: readonly LevelEditorViewportFieldValueOverride[];
	readonly requestedMode: LevelEditorViewportGizmoMode;
	readonly snapSteps: LevelEditorViewportTransformSnapSteps;
}): LevelEditorViewportTransformControls {
	if (options.selectedObject === null) {
		return {
			status: "no-selection",
			activeMode: options.requestedMode,
			availableModes: [],
			activeSnapStep: options.snapSteps[options.requestedMode],
			snapSteps: options.snapSteps,
			snapOptions: transformSnapOptions,
			coordinateSource: "workspace-transform-fields",
			stagesAuthoringEdits: true,
			writesRuntimeData: false,
			fields: [],
			activeHandles: [],
			rotationYawControl: null,
			blockedReasons: ["Select a manifest-owned object first."],
		};
	}

	const fields = transformControlFieldsForObject({
		object: options.selectedObject,
		fieldValueOverrides: options.fieldValueOverrides,
		snapSteps: options.snapSteps,
	});
	const rotationYawControl = rotationYawControlForObject({
		object: options.selectedObject,
		fieldValueOverrides: options.fieldValueOverrides,
		stepDegrees: options.snapSteps.rotate,
	});
	const availableModes = transformModesWithFields(fields, rotationYawControl);
	const activeMode = availableModes.includes(options.requestedMode)
		? options.requestedMode
		: availableModes[0] ?? options.requestedMode;
	const blockedReasons =
		fields.length === 0 && rotationYawControl === null
			? ["Selected object does not expose numeric Transform fields."]
			: [
					...new Set([
						...fields
							.filter((field) => !field.canStage)
							.map((field) => field.reason),
						...(rotationYawControl && !rotationYawControl.canStage
							? [rotationYawControl.reason]
							: []),
					]),
				];

	return {
		status:
			fields.length === 0 && rotationYawControl === null
				? "blocked"
				: fields.some((field) => field.canStage) || rotationYawControl?.canStage
					? "ready"
					: "blocked",
		activeMode,
		availableModes,
		activeSnapStep: options.snapSteps[activeMode],
		snapSteps: options.snapSteps,
		snapOptions: transformSnapOptions,
		coordinateSource: "workspace-transform-fields",
		stagesAuthoringEdits: true,
		writesRuntimeData: false,
		fields,
		activeHandles: transformGizmoHandlesForFields(fields, activeMode),
		rotationYawControl,
		blockedReasons,
	};
}

function buildViewportInteractionModel(options: {
	readonly requestedTool: LevelEditorViewportInteractionTool;
	readonly projection: LevelEditorViewportBridgeModel["projection"];
	readonly transformControls: LevelEditorViewportTransformControls;
	readonly renderedHitTestRequestReadiness: LevelEditorViewportRenderedHitTestRequestReadiness;
}): LevelEditorViewportInteractionModel {
	const tools = viewportInteractionTools.map((tool) =>
		buildViewportInteractionToolModel({
			tool,
			projection: options.projection,
			transformControls: options.transformControls,
		}),
	);
	const activeTool = tools.some(
		(tool) => tool.id === options.requestedTool && tool.enabled,
	)
		? options.requestedTool
		: tools.find((tool) => tool.enabled)?.id ?? "select";
	const blockedReasons = tools
		.filter((tool) => !tool.enabled)
		.map((tool) => tool.reason);
	const renderedHitTest = buildRenderedHitTestReadiness(
		options.renderedHitTestRequestReadiness,
	);

	return {
		activeTool,
		tools,
		renderedScenePickingEnabled: renderedHitTest.requestAvailable,
		renderedHitTest,
		selectableSource: renderedHitTest.requestAvailable
			? "runtime-rendered-scene-hit-test"
			: "projected-transform-pins",
		projectedPickRadiusPercent: defaultProjectedPickRadiusPercent,
		placementSource: "normalized-transform-xz-surface",
		transformSource: "workspace-transform-fields",
		projectedTransformDrag: buildProjectedTransformDragAffordance({
			projection: options.projection,
			transformControls: options.transformControls,
		}),
		writesRuntimeData: false,
		blockedReasons,
		reason: renderedHitTest.requestAvailable
			? "Viewport selection can request runtime-rendered hit-test results by stable ID while keeping projected pins as editor fallback."
			: "Viewport selection uses editor projections until a runtime-rendered hit-test requester is available.",
	};
}

function buildRenderedHitTestReadiness(
	requestReadiness: LevelEditorViewportRenderedHitTestRequestReadiness,
): LevelEditorViewportRenderedHitTestReadiness {
	const requestAvailable = requestReadiness === "available";

	return {
		requestReadiness,
		requestAvailable,
		requestSource: "runtime-rendered-scene-hit-test",
		resultIdentity: "stable-id",
		selectionBehavior: requestAvailable
			? "rendered-hit-test-result-selection"
			: "unchanged-projected-selection",
		usesBrowserApis: false,
		usesThreeApis: false,
		changesSelection: requestAvailable,
		writesRuntimeData: false,
		unavailableReasons: requestAvailable
			? []
			: [
					"No rendered-scene hit-test requester has been attached to the viewport bridge model.",
				],
		reason: requestAvailable
			? "Rendered hit-test requests can be issued by a caller-owned adapter and consumed as stable-ID editor selection results without writing runtime data."
			: "Rendered hit-test requests are unavailable in the pure viewport bridge model; projected-pin selection remains the active editor selection behavior.",
	};
}

function buildViewportInteractionToolModel(options: {
	readonly tool: LevelEditorViewportInteractionTool;
	readonly projection: LevelEditorViewportBridgeModel["projection"];
	readonly transformControls: LevelEditorViewportTransformControls;
}): LevelEditorViewportInteractionToolModel {
	switch (options.tool) {
		case "select":
			return {
				id: "select",
				label: viewportInteractionToolLabels.select,
				enabled: options.projection.selectableCount > 0,
				source: "projected-transform-pins",
				reason:
					options.projection.selectableCount > 0
						? "Selects stable-ID objects through projected transform pins."
						: "No transform-positioned objects are available for projected selection.",
			};
		case "place":
			return {
				id: "place",
				label: viewportInteractionToolLabels.place,
				enabled: options.projection.placementSurface.status === "ready",
				source: "normalized-placement-surface",
				reason:
					options.projection.placementSurface.status === "ready"
						? "Stages object-library placements on the normalized placement surface."
						: options.projection.placementSurface.reason,
			};
		case "transform":
			return {
				id: "transform",
				label: viewportInteractionToolLabels.transform,
				enabled: options.transformControls.status === "ready",
				source: "workspace-transform-fields",
				reason:
					options.transformControls.status === "ready"
						? "Stages transform edits through workspace transform fields."
						: options.transformControls.blockedReasons.join("; "),
			};
	}
}

function buildProjectedTransformDragAffordance(options: {
	readonly projection: LevelEditorViewportBridgeModel["projection"];
	readonly transformControls: LevelEditorViewportTransformControls;
}): LevelEditorViewportProjectedTransformDragAffordance {
	const activeTranslateHandles = options.transformControls.activeHandles.filter(
		(handle) => handle.mode === "translate" && handle.canStage,
	);
	const hasPositionX = activeTranslateHandles.some(
		(handle) => handle.path === "Transform.position.x",
	);
	const hasPositionZ = activeTranslateHandles.some(
		(handle) => handle.path === "Transform.position.z",
	);
	const ready =
		options.projection.placementSurface.status === "ready" &&
		options.transformControls.status === "ready" &&
		options.transformControls.activeMode === "translate" &&
		hasPositionX &&
		hasPositionZ;

	return {
		status: ready ? "ready" : "blocked",
		requiresActiveTool: "transform",
		requiredMode: "translate",
		requiredFieldPaths: ["Transform.position.x", "Transform.position.z"],
		coordinateSpace: "normalized-transform-xz",
		surfaceSource: "normalized-transform-xz-surface",
		transformSource: "workspace-transform-fields",
		preservesAxis: "y",
		renderedSceneHitTesting: false,
		renderedSceneGizmo: false,
		stagesAuthoringEdits: true,
		writesRuntimeData: false,
		reason: ready
			? "Projected X/Z transform dragging is available through editable Transform.position.x/z fields and the normalized placement surface."
			: "Projected X/Z transform dragging requires translate mode, editable Transform.position.x/z fields, and a ready normalized placement surface.",
	};
}

function buildViewportCameraControls(options: {
	readonly selectedObject: LevelEditorWorkspaceObject | null;
	readonly requestedMode: LevelEditorViewportCameraMode;
	readonly zoomPercent: number;
}): LevelEditorViewportCameraControls {
	const activeMode = viewportCameraModes.includes(options.requestedMode)
		? options.requestedMode
		: "orbit";
	const zoomPercent = Math.max(25, Math.min(400, options.zoomPercent));
	const targetStableId = options.selectedObject?.stableId ?? null;

	return {
		activeMode,
		availableModes: viewportCameraModes,
		zoomPercent,
		framingTarget: targetStableId === null ? "scene-bounds" : "selected-object",
		targetStableId,
		stagesAuthoringEdits: false,
		writesRuntimeData: false,
		source: "editor-viewport-navigation",
		reason:
			targetStableId === null
				? "Editor viewport navigation frames manifest-derived scene bounds without mutating runtime camera data."
				: "Editor viewport navigation frames the selected stable-ID object without mutating runtime camera data.",
	};
}

function transformControlFieldsForObject(options: {
	readonly object: LevelEditorWorkspaceObject;
	readonly fieldValueOverrides: readonly LevelEditorViewportFieldValueOverride[];
	readonly snapSteps: LevelEditorViewportTransformSnapSteps;
}): readonly LevelEditorViewportTransformControlField[] {
	const candidates = [
		...transformFieldCandidates("Transform.position", "translate"),
		...transformFieldCandidates("Transform.scale", "scale"),
	];

	return candidates
		.map((candidate) => {
			const field = options.object.fields.find(
				(item) => item.path === candidate.path,
			);

			if (!field || field.input !== "number") {
				return null;
			}

			const override = options.fieldValueOverrides.find(
				(item) =>
					item.stableId === options.object.stableId &&
					item.path === candidate.path,
			);
			const value = numberFromValue(override?.after ?? field.value) ?? 0;
			const canStage =
				!field.readOnly && field.workflow.editability === "editable";

			return {
				path: field.path,
				label: field.label,
				mode: candidate.mode,
				axis: candidate.axis,
				value,
				step: options.snapSteps[candidate.mode],
				canStage,
				reason: canStage
					? "Stages the same authoring field edit used by the inspector."
					: field.workflow.reason,
			};
		})
		.filter(
			(field): field is LevelEditorViewportTransformControlField =>
				field !== null,
		);
}

function rotationYawControlForObject(options: {
	readonly object: LevelEditorWorkspaceObject;
	readonly fieldValueOverrides: readonly LevelEditorViewportFieldValueOverride[];
	readonly stepDegrees: number;
}): LevelEditorViewportRotationYawControl | null {
	const fieldPaths = [
		"Transform.rotation.x",
		"Transform.rotation.y",
		"Transform.rotation.z",
		"Transform.rotation.w",
	] as const;
	const fields = fieldPaths.map((path) =>
		options.object.fields.find((field) => field.path === path),
	);

	if (fields.some((field) => field === undefined || field.input !== "number")) {
		return null;
	}

	const resolvedFields = fields.filter(
		(field): field is LevelEditorWorkspaceObject["fields"][number] =>
			field !== undefined && field.input === "number",
	);
	const values = fieldPaths.map((path, index) => {
		const field = resolvedFields[index];
		const override = options.fieldValueOverrides.find(
			(item) => item.stableId === options.object.stableId && item.path === path,
		);

		return (
			numberFromValue(override?.after ?? field?.value) ??
			(path.endsWith(".w") ? 1 : 0)
		);
	}) as [number, number, number, number];
	const canStage = resolvedFields.every(
		(field) => !field.readOnly && field.workflow.editability === "editable",
	);

	return {
		label: "Yaw",
		valueDegrees: roundPlacementCoordinate(yawDegreesFromQuaternion(values)),
		stepDegrees: options.stepDegrees,
		canStage,
		fieldPaths,
		stagesAuthoringEdits: true,
		writesRuntimeData: false,
		source: "workspace-transform-field",
		reason: canStage
			? "Stages quaternion rotation fields from a yaw-degree viewport control."
			: "Selected object rotation fields are not all editable.",
	};
}

function yawDegreesFromQuaternion(
	rotation: readonly [number, number, number, number],
): number {
	const [x, y, z, w] = rotation;
	const yawRadians = Math.atan2(2 * (w * y + x * z), 1 - 2 * (y * y + z * z));

	return (yawRadians * 180) / Math.PI;
}

function transformFieldCandidates(
	prefix: "Transform.position" | "Transform.scale",
	mode: LevelEditorViewportGizmoMode,
): readonly {
	readonly path: string;
	readonly axis: "x" | "y" | "z";
	readonly mode: LevelEditorViewportGizmoMode;
}[] {
	return (["x", "y", "z"] as const).map((axis) => ({
		path: `${prefix}.${axis}`,
		axis,
		mode,
	}));
}

function transformModesWithFields(
	fields: readonly LevelEditorViewportTransformControlField[],
	rotationYawControl: LevelEditorViewportRotationYawControl | null,
): readonly LevelEditorViewportGizmoMode[] {
	return (["translate", "rotate", "scale"] as const).filter((mode) =>
		mode === "rotate"
			? rotationYawControl !== null
			: fields.some((field) => field.mode === mode),
	);
}

function transformGizmoHandlesForFields(
	fields: readonly LevelEditorViewportTransformControlField[],
	activeMode: LevelEditorViewportGizmoMode,
): readonly LevelEditorViewportTransformGizmoHandle[] {
	return fields
		.filter((field) => field.mode === activeMode)
		.map((field) => ({
			id: `${field.mode}:${field.axis}:${field.path}`,
			path: field.path,
			label: `${field.mode} ${field.axis.toUpperCase()}`,
			mode: field.mode,
			axis: field.axis,
			value: field.value,
			step: field.step,
			canStage: field.canStage,
			stagesAuthoringEdits: true,
			writesRuntimeData: false,
			source: "workspace-transform-field",
			reason: field.reason,
		}));
}

function normalizeTransformSnapSteps(
	overrides?: Partial<LevelEditorViewportTransformSnapSteps>,
): LevelEditorViewportTransformSnapSteps {
	return {
		translate: positiveNumberOrDefault(
			overrides?.translate,
			defaultTransformSnapSteps.translate,
		),
		rotate: positiveNumberOrDefault(
			overrides?.rotate,
			defaultTransformSnapSteps.rotate,
		),
		scale: positiveNumberOrDefault(
			overrides?.scale,
			defaultTransformSnapSteps.scale,
		),
	};
}

function positiveNumberOrDefault(value: unknown, fallback: number): number {
	const numericValue = numberFromValue(value);

	return numericValue !== null && numericValue > 0 ? numericValue : fallback;
}

const defaultTransformSnapSteps = {
	translate: 0.1,
	rotate: 15,
	scale: 0.05,
} as const satisfies LevelEditorViewportTransformSnapSteps;

const transformSnapOptions = {
	translate: [0.01, 0.05, 0.1, 0.25, 0.5, 1],
	rotate: [1, 5, 15, 30, 45, 90],
	scale: [0.01, 0.025, 0.05, 0.1, 0.25],
} as const satisfies LevelEditorViewportTransformSnapOptions;

function projectViewportObject(options: {
	readonly object: LevelEditorWorkspaceObject;
	readonly selectedStableIds: readonly string[];
	readonly primarySelectedStableId: string | null;
	readonly visible: boolean;
	readonly locked: boolean;
	readonly pickable: boolean;
	readonly bounds: LevelEditorViewportPlacementSurface["worldBounds"];
	readonly fieldValueOverrides: readonly LevelEditorViewportFieldValueOverride[];
}): LevelEditorViewportProjectedObject {
	const position = objectTransformPosition(
		options.object,
		options.fieldValueOverrides,
	);
	const selected = options.selectedStableIds.includes(options.object.stableId);
	const primarySelected =
		options.object.stableId === options.primarySelectedStableId;

	if (position === null) {
		return {
			stableId: options.object.stableId,
			label: options.object.label,
			category: options.object.category,
			selected,
			primarySelected,
			visible: options.visible,
			locked: options.locked,
			pickable: options.pickable,
			hasTransformPosition: false,
			xPercent: 50,
			zPercent: 50,
			source: "workspace-transform",
			reason: viewportProjectionReason({
				baseReason: "Object does not expose Transform.position.x/z fields.",
				visible: options.visible,
				locked: options.locked,
				pickable: options.pickable,
			}),
		};
	}

	return {
		stableId: options.object.stableId,
		label: options.object.label,
		category: options.object.category,
		selected,
		primarySelected,
		visible: options.visible,
		locked: options.locked,
		pickable: options.pickable,
		hasTransformPosition: true,
		xPercent: normalizeViewportAxis(
			position.x,
			options.bounds.minX,
			options.bounds.maxX,
		),
		zPercent: normalizeViewportAxis(
			position.z,
			options.bounds.minZ,
			options.bounds.maxZ,
		),
		source: "workspace-transform",
		reason: viewportProjectionReason({
			baseReason:
				"Projected from manifest-owned Transform.position.x/z fields.",
			visible: options.visible,
			locked: options.locked,
			pickable: options.pickable,
		}),
	};
}

function viewportProjectionReason(options: {
	readonly baseReason: string;
	readonly visible: boolean;
	readonly locked: boolean;
	readonly pickable: boolean;
}): string {
	if (!options.visible) {
		return `${options.baseReason} Hidden by editor-only object view state.`;
	}

	if (options.locked) {
		return `${options.baseReason} Locked by editor-only object view state; viewport picking is disabled.`;
	}

	if (!options.pickable) {
		return `${options.baseReason} Current editor projection is visible but not pickable.`;
	}

	return options.baseReason;
}

function normalizeViewportSelectedStableIds(options: {
	readonly objects: readonly LevelEditorWorkspaceObject[];
	readonly selectedStableIds: readonly string[];
}): readonly string[] {
	const stableIds = new Set(options.objects.map((object) => object.stableId));

	return [...new Set(options.selectedStableIds)].filter((stableId) =>
		stableIds.has(stableId),
	);
}

export function viewportPlacementPositionFromNormalizedPoint(options: {
	readonly surface: LevelEditorViewportPlacementSurface;
	readonly point: LevelEditorViewportNormalizedPoint;
	readonly y: number;
}): readonly [number, number, number] | null {
	if (options.surface.status !== "ready") {
		return null;
	}

	const x = denormalizeViewportAxis(
		options.point.xPercent,
		options.surface.worldBounds.minX,
		options.surface.worldBounds.maxX,
		options.surface.marginPercent,
	);
	const z = denormalizeViewportAxis(
		options.point.zPercent,
		options.surface.worldBounds.minZ,
		options.surface.worldBounds.maxZ,
		options.surface.marginPercent,
	);
	const snappedX = snapPlacementCoordinate(
		x,
		options.surface.snapStep,
		options.surface.worldBounds.minX,
		options.surface.worldBounds.maxX,
	);
	const snappedZ = snapPlacementCoordinate(
		z,
		options.surface.snapStep,
		options.surface.worldBounds.minZ,
		options.surface.worldBounds.maxZ,
	);

	return [snappedX, options.y, snappedZ];
}

export function viewportProjectedTransformPositionFromNormalizedPoint(options: {
	readonly surface: LevelEditorViewportPlacementSurface;
	readonly point: LevelEditorViewportNormalizedPoint;
	readonly currentY: number;
}): readonly [number, number, number] | null {
	return viewportPlacementPositionFromNormalizedPoint({
		surface: options.surface,
		point: options.point,
		y: options.currentY,
	});
}

export function viewportPickProjectedObjectFromNormalizedPoint(options: {
	readonly projection: LevelEditorViewportBridgeModel["projection"];
	readonly point: LevelEditorViewportNormalizedPoint;
	readonly radiusPercent?: number;
}): LevelEditorViewportProjectedPickResult | null {
	const radiusPercent = positiveNumberOrDefault(
		options.radiusPercent,
		defaultProjectedPickRadiusPercent,
	);
	const candidates = options.projection.objects
		.filter((object) => object.hasTransformPosition && object.pickable)
		.map((object) => ({
			object,
			distancePercent: viewportPointDistancePercent(options.point, {
				xPercent: object.xPercent,
				zPercent: object.zPercent,
			}),
		}))
		.filter((candidate) => candidate.distancePercent <= radiusPercent)
		.sort((left, right) => left.distancePercent - right.distancePercent);
	const nearest = candidates[0];

	if (!nearest) {
		return null;
	}

	return {
		stableId: nearest.object.stableId,
		label: nearest.object.label,
		distancePercent: roundPlacementCoordinate(nearest.distancePercent),
		source: "projected-transform-pins",
		renderedScenePicking: false,
		reason:
			"Selected the nearest projected stable-ID transform pin; rendered-scene raycast picking is not enabled.",
	};
}

export function viewportSelectProjectedObjectsInRect(options: {
	readonly projection: LevelEditorViewportBridgeModel["projection"];
	readonly start: LevelEditorViewportNormalizedPoint;
	readonly end: LevelEditorViewportNormalizedPoint;
}): LevelEditorViewportProjectedMarqueeSelectionResult {
	const minX = Math.min(options.start.xPercent, options.end.xPercent);
	const maxX = Math.max(options.start.xPercent, options.end.xPercent);
	const minZ = Math.min(options.start.zPercent, options.end.zPercent);
	const maxZ = Math.max(options.start.zPercent, options.end.zPercent);
	const selectedStableIds = options.projection.objects
		.filter(
			(object) =>
				object.hasTransformPosition &&
				object.pickable &&
				object.xPercent >= minX &&
				object.xPercent <= maxX &&
				object.zPercent >= minZ &&
				object.zPercent <= maxZ,
		)
		.map((object) => object.stableId);

	return {
		selectedStableIds,
		source: "projected-transform-marquee",
		renderedScenePicking: false,
		reason:
			"Selected stable-ID transform pins inside the projected marquee rectangle; rendered-scene selection is not enabled.",
	};
}

function viewportPointDistancePercent(
	left: LevelEditorViewportNormalizedPoint,
	right: LevelEditorViewportNormalizedPoint,
): number {
	return Math.hypot(
		left.xPercent - right.xPercent,
		left.zPercent - right.zPercent,
	);
}

function placementBoundsForPositions(
	positions: readonly { readonly x: number; readonly z: number }[],
): LevelEditorViewportPlacementSurface["worldBounds"] {
	if (positions.length === 0) {
		return {
			minX: -5,
			maxX: 5,
			minZ: -5,
			maxZ: 5,
		};
	}

	const xs = positions.map((position) => position.x);
	const zs = positions.map((position) => position.z);
	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minZ = Math.min(...zs);
	const maxZ = Math.max(...zs);
	const xBounds = expandFlatBounds(minX, maxX);
	const zBounds = expandFlatBounds(minZ, maxZ);

	return {
		minX: xBounds.min,
		maxX: xBounds.max,
		minZ: zBounds.min,
		maxZ: zBounds.max,
	};
}

function expandFlatBounds(
	min: number,
	max: number,
): {
	readonly min: number;
	readonly max: number;
} {
	const nextMin = min === max ? min - 5 : min;
	const nextMax = min === max ? max + 5 : max;

	return {
		min: nextMin,
		max: nextMax,
	};
}

function objectTransformPosition(
	object: LevelEditorWorkspaceObject,
	fieldValueOverrides: readonly LevelEditorViewportFieldValueOverride[] = [],
): { readonly x: number; readonly z: number } | null {
	const x = numberFieldValue(
		object,
		"Transform.position.x",
		fieldValueOverrides,
	);
	const z = numberFieldValue(
		object,
		"Transform.position.z",
		fieldValueOverrides,
	);

	if (x === null || z === null) {
		return null;
	}

	return { x, z };
}

function numberFieldValue(
	object: LevelEditorWorkspaceObject,
	path: string,
	fieldValueOverrides: readonly LevelEditorViewportFieldValueOverride[] = [],
): number | null {
	const value =
		fieldValueOverrides.find(
			(item) => item.stableId === object.stableId && item.path === path,
		)?.after ?? object.fields.find((field) => field.path === path)?.value;

	return numberFromValue(value);
}

function numberFromValue(value: unknown): number | null {
	const numericValue = typeof value === "number" ? value : Number(value);

	return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeViewportAxis(
	value: number,
	min: number,
	max: number,
): number {
	if (min === max) {
		return 50;
	}

	const normalized =
		((value - min) / (max - min)) *
			(100 - viewportProjectionMarginPercent * 2) +
		viewportProjectionMarginPercent;

	return Math.max(8, Math.min(92, normalized));
}

const viewportProjectionMarginPercent = 12;
const defaultProjectedPickRadiusPercent = 6;

function denormalizeViewportAxis(
	percent: number,
	min: number,
	max: number,
	marginPercent: number,
): number {
	const clampedPercent = Math.max(
		marginPercent,
		Math.min(100 - marginPercent, percent),
	);
	const t = (clampedPercent - marginPercent) / (100 - marginPercent * 2);

	return min + (max - min) * t;
}

function roundPlacementCoordinate(value: number): number {
	return Number(value.toFixed(4));
}

function snapPlacementCoordinate(
	value: number,
	step: number,
	min: number,
	max: number,
): number {
	const snapStep = positiveNumberOrDefault(
		step,
		defaultTransformSnapSteps.translate,
	);
	const snapped = Math.round(value / snapStep) * snapStep;
	const clamped = Math.max(min, Math.min(max, snapped));

	return roundPlacementCoordinate(clamped);
}

function buildGizmoReadiness(
	selectedObject: LevelEditorWorkspaceObject | null,
): LevelEditorViewportGizmoReadiness {
	if (selectedObject === null) {
		return {
			status: "no-selection",
			directManipulationEnabled: false,
			defaultMode: "translate",
			supportedModes: [],
			blockedReasons: ["Select a manifest-owned object first."],
			futureCapabilities: futureGizmoCapabilities,
		};
	}

	const blockedReasons = [
		...(objectHasEditableTransform(selectedObject)
			? []
			: ["Selected object does not expose editable transform fields."]),
		...(selectedObject.capabilities.includes("previewable")
			? []
			: [
					"Selected object is not previewable through the dev-preview contract.",
				]),
	];

	return {
		status: blockedReasons.length === 0 ? "model-ready" : "blocked",
		directManipulationEnabled: false,
		defaultMode: "translate",
		supportedModes:
			blockedReasons.length === 0 ? ["translate", "rotate", "scale"] : [],
		blockedReasons,
		futureCapabilities: futureGizmoCapabilities,
	};
}

const futureGizmoCapabilities = [
	"viewport picking",
	"selection highlight sync",
	"translate/rotate/scale handles",
	"local/world transform space",
	"pivot controls",
] as const;

function objectHasEditableTransform(
	object: LevelEditorWorkspaceObject,
): boolean {
	return (
		object.capabilities.includes("editable") &&
		object.fields.some((field) => field.path.startsWith("Transform."))
	);
}

function overlayAvailable(
	id: LevelEditorViewportOverlayId,
	selectedObject: LevelEditorWorkspaceObject | null,
): boolean {
	if (id === "selection-outline" || id === "transform-origin") {
		return selectedObject !== null;
	}

	if (id === "collision-bounds") {
		return selectedObject?.componentNames.includes("Collider") ?? false;
	}

	if (id === "light-influence") {
		return selectedObject?.componentNames.includes("Light") ?? false;
	}

	if (id === "portal-links") {
		return selectedObject?.componentNames.includes("Portal") ?? false;
	}

	if (id === "audio-emitters") {
		return selectedObject?.componentNames.includes("SoundEmitter") ?? false;
	}

	if (id === "terrain-cells") {
		return selectedObject?.category === "terrain";
	}

	return true;
}

function overlaySource(
	id: LevelEditorViewportOverlayId,
): LevelEditorViewportOverlayModel["source"] {
	if (id === "transform-origin") {
		return "future-gizmo";
	}

	if (id === "selection-outline" || id === "object-labels") {
		return "workspace-selection";
	}

	if (id === "collision-bounds" || id === "terrain-cells") {
		return "authoring-data";
	}

	return "runtime-preview";
}

function overlayReason(
	id: LevelEditorViewportOverlayId,
	available: boolean,
	selectedObject: LevelEditorWorkspaceObject | null,
): string {
	if (available) {
		return `${overlayLabels[id]} can be projected from the workspace model.`;
	}

	if (selectedObject === null) {
		return "No selected workspace object.";
	}

	return `${selectedObject.label} does not expose the component data required for ${overlayLabels[id]}.`;
}
