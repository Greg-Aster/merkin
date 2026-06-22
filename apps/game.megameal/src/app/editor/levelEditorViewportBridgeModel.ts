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

export type LevelEditorViewportProjectedObject = {
	readonly stableId: string;
	readonly label: string;
	readonly category: LevelEditorWorkspaceObject["category"];
	readonly selected: boolean;
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
	readonly blockedReasons: readonly string[];
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
	readonly transformControls: LevelEditorViewportTransformControls;
	readonly gizmo: LevelEditorViewportGizmoReadiness;
};

export function buildLevelEditorViewportBridgeModel(options: {
	readonly workspace: LevelEditorWorkspaceModel;
	readonly selectedStableId?: string | null;
	readonly viewMode?: LevelEditorViewportBridgeViewMode;
	readonly enabledOverlayIds?: readonly LevelEditorViewportOverlayId[];
	readonly connectionStatus?: LevelEditorViewportBridgeConnectionStatus;
	readonly liveRuntimeSceneId?: string | null;
	readonly fieldValueOverrides?: readonly LevelEditorViewportFieldValueOverride[];
	readonly transformMode?: LevelEditorViewportGizmoMode;
	readonly transformSnapSteps?: Partial<LevelEditorViewportTransformSnapSteps>;
}): LevelEditorViewportBridgeModel {
	const selectedStableId =
		options.selectedStableId === undefined
			? options.workspace.selectedStableId
			: options.selectedStableId;
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

	return {
		schemaVersion: 1,
		contract: LEVEL_EDITOR_VIEWPORT_BRIDGE_CONTRACT,
		runtimeSceneId: options.workspace.selectedRuntimeSceneId,
		selectedStableId: bridgeSelectedObject?.stableId ?? null,
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
		projection: buildViewportProjection({
			objects: options.workspace.objects,
			selectedStableId: bridgeSelectedObject?.stableId ?? null,
			fieldValueOverrides: options.fieldValueOverrides ?? [],
		}),
		transformControls: buildTransformControls({
			selectedObject,
			fieldValueOverrides: options.fieldValueOverrides ?? [],
			requestedMode: options.transformMode ?? "translate",
			snapSteps: normalizeTransformSnapSteps(options.transformSnapSteps),
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
	readonly selectedStableId: string | null;
	readonly fieldValueOverrides: readonly LevelEditorViewportFieldValueOverride[];
}): LevelEditorViewportBridgeModel["projection"] {
	const positionedObjects = options.objects
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
	const objects = options.objects.map((object) =>
		projectViewportObject({
			object,
			selectedStableId: options.selectedStableId,
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
		selectableCount: objects.filter((object) => object.hasTransformPosition)
			.length,
		selectedObjectCount: objects.filter((object) => object.selected).length,
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
			blockedReasons: ["Select a manifest-owned object first."],
		};
	}

	const fields = transformControlFieldsForObject({
		object: options.selectedObject,
		fieldValueOverrides: options.fieldValueOverrides,
		snapSteps: options.snapSteps,
	});
	const availableModes = transformModesWithFields(fields);
	const activeMode = availableModes.includes(options.requestedMode)
		? options.requestedMode
		: availableModes[0] ?? options.requestedMode;
	const blockedReasons =
		fields.length === 0
			? ["Selected object does not expose numeric Transform fields."]
			: [
					...new Set(
						fields
							.filter((field) => !field.canStage)
							.map((field) => field.reason),
					),
				];

	return {
		status:
			fields.length === 0
				? "blocked"
				: fields.some((field) => field.canStage)
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
		blockedReasons,
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
): readonly LevelEditorViewportGizmoMode[] {
	return (["translate", "rotate", "scale"] as const).filter((mode) =>
		fields.some((field) => field.mode === mode),
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
	readonly selectedStableId: string | null;
	readonly bounds: LevelEditorViewportPlacementSurface["worldBounds"];
	readonly fieldValueOverrides: readonly LevelEditorViewportFieldValueOverride[];
}): LevelEditorViewportProjectedObject {
	const position = objectTransformPosition(
		options.object,
		options.fieldValueOverrides,
	);
	const selected = options.object.stableId === options.selectedStableId;

	if (position === null) {
		return {
			stableId: options.object.stableId,
			label: options.object.label,
			category: options.object.category,
			selected,
			hasTransformPosition: false,
			xPercent: 50,
			zPercent: 50,
			source: "workspace-transform",
			reason: "Object does not expose Transform.position.x/z fields.",
		};
	}

	return {
		stableId: options.object.stableId,
		label: options.object.label,
		category: options.object.category,
		selected,
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
		reason: "Projected from manifest-owned Transform.position.x/z fields.",
	};
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

	return [roundPlacementCoordinate(x), options.y, roundPlacementCoordinate(z)];
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
