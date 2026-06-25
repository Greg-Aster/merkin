import type { LevelEditorWorkspaceObject } from "./levelEditorWorkspaceModel.js";

export type LevelEditorViewportCameraMode =
	| "orbit"
	| "top"
	| "front"
	| "side"
	| "iso";

export type LevelEditorViewportNormalizedPoint = {
	readonly xPercent: number;
	readonly zPercent: number;
};

export type LevelEditorViewportCameraFramingTarget =
	| "selected-object"
	| "selected-set"
	| "scene-bounds";

export type LevelEditorViewportCameraFrameCommandId =
	| "frame-selected"
	| "frame-selection"
	| "frame-all";

export type LevelEditorViewportCameraFrameCommand = {
	readonly id: LevelEditorViewportCameraFrameCommandId;
	readonly label: string;
	readonly enabled: boolean;
	readonly cameraMode: LevelEditorViewportCameraMode;
	readonly zoomPercent: number;
	readonly target: LevelEditorViewportCameraFramingTarget;
	readonly targetStableIds: readonly string[];
	readonly focusPoint: LevelEditorViewportNormalizedPoint;
	readonly stagesAuthoringEdits: false;
	readonly writesRuntimeData: false;
	readonly source: "editor-viewport-navigation";
	readonly reason: string;
};

export type LevelEditorViewportCameraControls = {
	readonly activeMode: LevelEditorViewportCameraMode;
	readonly availableModes: readonly LevelEditorViewportCameraMode[];
	readonly zoomPercent: number;
	readonly framingTarget: LevelEditorViewportCameraFramingTarget;
	readonly targetStableId: string | null;
	readonly framedStableIds: readonly string[];
	readonly focusPoint: LevelEditorViewportNormalizedPoint;
	readonly framingCommands: readonly LevelEditorViewportCameraFrameCommand[];
	readonly stagesAuthoringEdits: false;
	readonly writesRuntimeData: false;
	readonly source: "editor-viewport-navigation";
	readonly reason: string;
};

export type LevelEditorViewportCameraProjectionObject = {
	readonly stableId: string;
	readonly selected: boolean;
	readonly primarySelected: boolean;
	readonly visible: boolean;
	readonly hasTransformPosition: boolean;
	readonly xPercent: number;
	readonly zPercent: number;
};

export function buildLevelEditorViewportCameraControls(options: {
	readonly selectedObject: Pick<LevelEditorWorkspaceObject, "stableId"> | null;
	readonly projectedObjects: readonly LevelEditorViewportCameraProjectionObject[];
	readonly requestedMode: LevelEditorViewportCameraMode;
	readonly zoomPercent: number;
}): LevelEditorViewportCameraControls {
	const activeMode = viewportCameraModes.includes(options.requestedMode)
		? options.requestedMode
		: "orbit";
	const zoomPercent = Math.max(25, Math.min(400, options.zoomPercent));
	const targetStableId = options.selectedObject?.stableId ?? null;
	const projectedObjects = options.projectedObjects.filter(
		(object) => object.hasTransformPosition && object.visible,
	);
	const selectedProjectedObjects = projectedObjects.filter(
		(object) => object.selected,
	);
	const selectedFocusObject =
		selectedProjectedObjects.find((object) => object.primarySelected) ??
		selectedProjectedObjects[0] ??
		null;
	const selectionBounds = projectedBounds(selectedProjectedObjects);
	const sceneBounds = projectedBounds(projectedObjects);
	const framingTarget =
		selectedProjectedObjects.length > 1
			? "selected-set"
			: selectedFocusObject
				? "selected-object"
				: "scene-bounds";
	const focusPoint =
		framingTarget === "selected-set" && selectionBounds
			? projectedBoundsCenter(selectionBounds)
			: selectedFocusObject
				? {
						xPercent: selectedFocusObject.xPercent,
						zPercent: selectedFocusObject.zPercent,
					}
				: sceneBounds
					? projectedBoundsCenter(sceneBounds)
					: { xPercent: 50, zPercent: 50 };
	const framedStableIds =
		framingTarget === "selected-set"
			? selectedProjectedObjects.map((object) => object.stableId)
			: selectedFocusObject
				? [selectedFocusObject.stableId]
				: projectedObjects.map((object) => object.stableId);
	const framingCommands = buildViewportCameraFrameCommands({
		activeMode,
		selectedFocusObject,
		selectedProjectedObjects,
		projectedObjects,
		selectionBounds,
		sceneBounds,
	});

	return {
		activeMode,
		availableModes: viewportCameraModes,
		zoomPercent,
		framingTarget,
		targetStableId,
		framedStableIds,
		focusPoint,
		framingCommands,
		stagesAuthoringEdits: false,
		writesRuntimeData: false,
		source: "editor-viewport-navigation",
		reason:
			framingTarget === "scene-bounds"
				? "Editor viewport navigation frames manifest-derived scene bounds without mutating runtime camera data."
				: framingTarget === "selected-set"
					? "Editor viewport navigation frames the selected stable-ID set without mutating runtime camera data."
					: "Editor viewport navigation frames the selected stable-ID object without mutating runtime camera data.",
	};
}

const viewportCameraModes = [
	"orbit",
	"top",
	"front",
	"side",
	"iso",
] as const satisfies readonly LevelEditorViewportCameraMode[];

function buildViewportCameraFrameCommands(options: {
	readonly activeMode: LevelEditorViewportCameraMode;
	readonly selectedFocusObject: LevelEditorViewportCameraProjectionObject | null;
	readonly selectedProjectedObjects: readonly LevelEditorViewportCameraProjectionObject[];
	readonly projectedObjects: readonly LevelEditorViewportCameraProjectionObject[];
	readonly selectionBounds: ProjectedBounds | null;
	readonly sceneBounds: ProjectedBounds | null;
}): readonly LevelEditorViewportCameraFrameCommand[] {
	const selectionTargetStableIds = options.selectedProjectedObjects.map(
		(object) => object.stableId,
	);
	const projectedTargetStableIds = options.projectedObjects.map(
		(object) => object.stableId,
	);

	return [
		{
			id: "frame-selected",
			label: "Frame Selected",
			enabled: options.selectedFocusObject !== null,
			cameraMode: options.activeMode,
			zoomPercent: 225,
			target: "selected-object",
			targetStableIds: options.selectedFocusObject
				? [options.selectedFocusObject.stableId]
				: [],
			focusPoint: options.selectedFocusObject
				? {
						xPercent: options.selectedFocusObject.xPercent,
						zPercent: options.selectedFocusObject.zPercent,
					}
				: { xPercent: 50, zPercent: 50 },
			stagesAuthoringEdits: false,
			writesRuntimeData: false,
			source: "editor-viewport-navigation",
			reason: options.selectedFocusObject
				? "Frames the primary selected stable-ID object in editor viewport navigation only."
				: "Select a transform-positioned object before framing selected.",
		},
		{
			id: "frame-selection",
			label: "Frame Selection",
			enabled:
				options.selectedProjectedObjects.length > 1 &&
				options.selectionBounds !== null,
			cameraMode: options.activeMode,
			zoomPercent: projectedBoundsZoomPercent(options.selectionBounds, 190),
			target: "selected-set",
			targetStableIds: selectionTargetStableIds,
			focusPoint: options.selectionBounds
				? projectedBoundsCenter(options.selectionBounds)
				: { xPercent: 50, zPercent: 50 },
			stagesAuthoringEdits: false,
			writesRuntimeData: false,
			source: "editor-viewport-navigation",
			reason:
				options.selectedProjectedObjects.length > 1
					? "Frames the current multi-selection from projected stable-ID positions in editor viewport navigation only."
					: "Select multiple transform-positioned objects before framing a selection set.",
		},
		{
			id: "frame-all",
			label: "Frame All",
			enabled:
				options.projectedObjects.length > 0 && options.sceneBounds !== null,
			cameraMode: options.activeMode,
			zoomPercent: projectedBoundsZoomPercent(options.sceneBounds, 125),
			target: "scene-bounds",
			targetStableIds: projectedTargetStableIds,
			focusPoint: options.sceneBounds
				? projectedBoundsCenter(options.sceneBounds)
				: { xPercent: 50, zPercent: 50 },
			stagesAuthoringEdits: false,
			writesRuntimeData: false,
			source: "editor-viewport-navigation",
			reason:
				options.projectedObjects.length > 0
					? "Frames all visible transform-positioned objects from editor viewport projection bounds without writing runtime camera data."
					: "No transform-positioned objects are visible for frame all.",
		},
	];
}

type ProjectedBounds = {
	readonly minX: number;
	readonly maxX: number;
	readonly minZ: number;
	readonly maxZ: number;
};

function projectedBounds(
	objects: readonly LevelEditorViewportCameraProjectionObject[],
): ProjectedBounds | null {
	const positionedObjects = objects.filter(
		(object) => object.hasTransformPosition,
	);

	if (positionedObjects.length === 0) {
		return null;
	}

	return {
		minX: Math.min(...positionedObjects.map((object) => object.xPercent)),
		maxX: Math.max(...positionedObjects.map((object) => object.xPercent)),
		minZ: Math.min(...positionedObjects.map((object) => object.zPercent)),
		maxZ: Math.max(...positionedObjects.map((object) => object.zPercent)),
	};
}

function projectedBoundsCenter(
	bounds: ProjectedBounds,
): LevelEditorViewportNormalizedPoint {
	return {
		xPercent: roundViewportPercent((bounds.minX + bounds.maxX) / 2),
		zPercent: roundViewportPercent((bounds.minZ + bounds.maxZ) / 2),
	};
}

function projectedBoundsZoomPercent(
	bounds: ProjectedBounds | null,
	fallback: number,
): number {
	if (!bounds) {
		return fallback;
	}

	const largestSpan = Math.max(
		bounds.maxX - bounds.minX,
		bounds.maxZ - bounds.minZ,
	);

	if (largestSpan <= 0) {
		return 250;
	}

	return Math.max(75, Math.min(300, Math.round(2400 / (largestSpan + 8))));
}

function roundViewportPercent(value: number): number {
	return Number(value.toFixed(4));
}
