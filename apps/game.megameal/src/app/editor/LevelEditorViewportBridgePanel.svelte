<script lang="ts">
import { viewportPickProjectedObjectFromNormalizedPoint } from "./levelEditorViewportBridgeModel.js";
import type {
	LevelEditorViewportBridgeModel,
	LevelEditorViewportBridgeViewMode,
	LevelEditorViewportCameraMode,
	LevelEditorViewportGizmoMode,
	LevelEditorViewportInteractionTool,
	LevelEditorViewportInteractionToolModel,
	LevelEditorViewportNormalizedPoint,
	LevelEditorViewportOverlayId,
	LevelEditorViewportTransformControlField,
	LevelEditorViewportTransformGizmoHandle,
} from "./levelEditorViewportBridgeModel.js";

type Props = {
	readonly model: LevelEditorViewportBridgeModel;
	readonly onViewModeChange?: (mode: LevelEditorViewportBridgeViewMode) => void;
	readonly onCameraModeChange?: (mode: LevelEditorViewportCameraMode) => void;
	readonly onCameraZoomPercentChange?: (zoomPercent: number) => void;
	readonly onInteractionToolChange?: (
		tool: LevelEditorViewportInteractionTool,
	) => void;
	readonly onOverlayToggle?: (id: LevelEditorViewportOverlayId) => void;
	readonly onSelectObject?: (stableId: string) => void;
	readonly onTransformNudge?: (path: string, delta: number) => void;
	readonly onTransformProjectedDrag?: (
		point: LevelEditorViewportNormalizedPoint,
	) => void;
	readonly onRotationYawNudge?: (deltaDegrees: number) => void;
	readonly onTransformModeChange?: (mode: LevelEditorViewportGizmoMode) => void;
	readonly onTransformSnapStepChange?: (
		mode: LevelEditorViewportGizmoMode,
		step: number,
	) => void;
	readonly placementTarget?: {
		readonly entryId: string;
		readonly label: string;
		readonly status: string;
		readonly targetLabel: string;
		readonly canStage: boolean;
		readonly writesFiles: boolean;
		readonly reason: string;
	} | null;
	readonly onStagePlacementAtTarget?: () => void;
	readonly onDropPlacementEntry?: (
		entryId: string,
		point: LevelEditorViewportNormalizedPoint,
		source?: "viewport-click" | "viewport-drop",
	) => void;
};

const {
	model,
	onViewModeChange,
	onCameraModeChange,
	onCameraZoomPercentChange,
	onInteractionToolChange,
	onOverlayToggle,
	onSelectObject,
	onTransformNudge,
	onTransformProjectedDrag,
	onRotationYawNudge,
	onTransformModeChange,
	onTransformSnapStepChange,
	placementTarget = null,
	onStagePlacementAtTarget,
	onDropPlacementEntry,
}: Props = $props();
const objectLibraryPlacementDragMimeType =
	"application/x-megameal-object-library-entry";
let placementDropActive = $state(false);
let placementHoverPoint: LevelEditorViewportNormalizedPoint | null =
	$state(null);
let transformDragActive = $state(false);
const selectedObject = $derived(model.selectedObject);
const projectedObjects = $derived(
	model.projection.objects.filter((object) => object.hasTransformPosition),
);
const placementProjectionTarget = $derived(
	placementTarget
		? projectedObjects.find((object) => object.selected) ?? null
		: null,
);
const placementGhostPoint = $derived(
	placementHoverPoint ??
		(placementProjectionTarget
			? {
					xPercent: placementProjectionTarget.xPercent,
					zPercent: placementProjectionTarget.zPercent,
				}
			: null),
);
const selectedComponents = $derived(
	selectedObject?.componentNames.length
		? selectedObject.componentNames.join(", ")
		: "none",
);
const activeOverlaySummary = $derived(
	model.view.activeOverlayIds.length
		? model.view.activeOverlayIds.join(", ")
		: "none",
);
const activeTransformFields = $derived(
	model.transformControls.fields.filter(
		(field) => field.mode === model.transformControls.activeMode,
	),
);
const selectedProjection = $derived(
	projectedObjects.find((object) => object.selected) ?? null,
);
const selectToolActive = $derived(model.interaction.activeTool === "select");
const placeToolActive = $derived(model.interaction.activeTool === "place");
const transformToolActive = $derived(
	model.interaction.activeTool === "transform",
);
const projectedTransformDragReady = $derived(
	model.transformControls.activeMode === "translate" &&
		model.transformControls.activeHandles.some(
			(handle) => handle.path === "Transform.position.x" && handle.canStage,
		) &&
		model.transformControls.activeHandles.some(
			(handle) => handle.path === "Transform.position.z" && handle.canStage,
		),
);
const viewModeLabels: Record<LevelEditorViewportBridgeViewMode, string> = {
	"live-game": "Live Game",
	lit: "Lit",
	unlit: "Unlit",
	collision: "Collision",
	wireframe: "Wireframe",
};
const cameraModeLabels: Record<LevelEditorViewportCameraMode, string> = {
	orbit: "Orbit",
	top: "Top",
	front: "Front",
	side: "Side",
	iso: "Iso",
};
const transformModeLabels: Record<LevelEditorViewportGizmoMode, string> = {
	translate: "Translate",
	rotate: "Rotate",
	scale: "Scale",
};

function overlayInputId(id: LevelEditorViewportOverlayId): string {
	return `viewport-bridge-overlay-${id}`;
}

function selectViewMode(event: Event): void {
	const select = event.currentTarget as HTMLSelectElement;
	onViewModeChange?.(select.value as LevelEditorViewportBridgeViewMode);
}

function selectCameraMode(event: Event): void {
	const select = event.currentTarget as HTMLSelectElement;
	onCameraModeChange?.(select.value as LevelEditorViewportCameraMode);
}

function selectCameraZoomPercent(event: Event): void {
	const input = event.currentTarget as HTMLInputElement;
	const zoomPercent = Number(input.value);

	if (!Number.isFinite(zoomPercent)) {
		return;
	}

	onCameraZoomPercentChange?.(zoomPercent);
}

function selectInteractionTool(tool: LevelEditorViewportInteractionTool): void {
	if (tool === "place" && !placementTarget?.canStage) {
		return;
	}

	onInteractionToolChange?.(tool);
}

function toggleOverlay(id: LevelEditorViewportOverlayId): void {
	onOverlayToggle?.(id);
}

function selectProjectedObject(stableId: string): void {
	onSelectObject?.(stableId);
}

function interactionToolEnabled(
	tool: LevelEditorViewportInteractionToolModel,
): boolean {
	return (
		tool.enabled &&
		(tool.id !== "place" || (placementTarget?.canStage ?? false))
	);
}

function interactionToolReason(
	tool: LevelEditorViewportInteractionToolModel,
): string {
	if (tool.id === "place" && !placementTarget?.canStage) {
		return (
			placementTarget?.reason ??
			"Select a draft-ready object-library entry before using Place."
		);
	}

	return tool.reason;
}

function handleViewportClick(event: MouseEvent): void {
	if (viewportEventHitInteractiveElement(event)) {
		return;
	}

	const point = viewportNormalizedPointFromPointerEvent(event);

	if (point === null) {
		return;
	}

	if (placeToolActive && placementTarget?.canStage && onDropPlacementEntry) {
		onDropPlacementEntry(placementTarget.entryId, point, "viewport-click");
		return;
	}

	if (!selectToolActive || !onSelectObject) {
		return;
	}

	const pick = viewportPickProjectedObjectFromNormalizedPoint({
		projection: model.projection,
		point,
		radiusPercent: model.interaction.projectedPickRadiusPercent,
	});

	if (pick) {
		onSelectObject(pick.stableId);
	}
}

function viewportEventHitInteractiveElement(event: Event): boolean {
	const target = event.target as HTMLElement | null;

	return Boolean(
		target?.closest(
			"button, input, select, textarea, a, [data-ignore-viewport-pick]",
		),
	);
}

function nudgeTransform(
	field: LevelEditorViewportTransformControlField,
	direction: -1 | 1,
): void {
	onTransformNudge?.(field.path, field.step * direction);
}

function nudgeTransformHandle(
	handle: LevelEditorViewportTransformGizmoHandle,
	direction: -1 | 1,
): void {
	onTransformNudge?.(handle.path, handle.step * direction);
}

function beginProjectedTransformDrag(event: PointerEvent): void {
	if (
		!transformToolActive ||
		!projectedTransformDragReady ||
		!onTransformProjectedDrag
	) {
		return;
	}

	event.preventDefault();
	event.stopPropagation();
	transformDragActive = true;
	const frame = (event.currentTarget as HTMLElement | null)?.closest(
		".editor-viewport-frame",
	) as HTMLElement | null;
	frame?.setPointerCapture(event.pointerId);
}

function stageProjectedTransformDrag(event: PointerEvent): void {
	if (!transformDragActive || !onTransformProjectedDrag) {
		return;
	}

	const point = viewportNormalizedPointFromPointerEvent(event);

	if (point === null) {
		return;
	}

	onTransformProjectedDrag(point);
}

function endProjectedTransformDrag(event: PointerEvent): void {
	if (!transformDragActive) {
		return;
	}

	transformDragActive = false;
	const frame = event.currentTarget as HTMLElement | null;

	if (frame?.hasPointerCapture(event.pointerId)) {
		frame.releasePointerCapture(event.pointerId);
	}
}

function nudgeRotationYaw(direction: -1 | 1): void {
	const control = model.transformControls.rotationYawControl;

	if (!control) {
		return;
	}

	onRotationYawNudge?.(control.stepDegrees * direction);
}

function selectTransformMode(mode: LevelEditorViewportGizmoMode): void {
	onTransformModeChange?.(mode);
}

function selectTransformSnapStep(event: Event): void {
	const select = event.currentTarget as HTMLSelectElement;
	const step = Number(select.value);

	if (!Number.isFinite(step)) {
		return;
	}

	onTransformSnapStepChange?.(model.transformControls.activeMode, step);
}

function stagePlacementFromGhost(): void {
	if (!placeToolActive || !placementTarget?.canStage) {
		return;
	}

	if (placementHoverPoint && onDropPlacementEntry) {
		onDropPlacementEntry(
			placementTarget.entryId,
			placementHoverPoint,
			"viewport-click",
		);
		return;
	}

	onStagePlacementAtTarget?.();
}

function handleViewportPointerMove(event: PointerEvent): void {
	stageProjectedTransformDrag(event);

	if (transformDragActive) {
		placementHoverPoint = null;
		return;
	}

	if (!placeToolActive || !placementTarget?.canStage) {
		placementHoverPoint = null;
		return;
	}

	placementHoverPoint = viewportNormalizedPointFromPointerEvent(event);
}

function handleViewportPointerLeave(): void {
	placementHoverPoint = null;
	transformDragActive = false;
}

function dragHasObjectLibraryPlacement(event: DragEvent): boolean {
	return (
		event.dataTransfer?.types.includes(objectLibraryPlacementDragMimeType) ??
		false
	);
}

function handlePlacementDragOver(event: DragEvent): void {
	if (!placeToolActive || !placementTarget?.canStage || !onDropPlacementEntry) {
		return;
	}

	if (!dragHasObjectLibraryPlacement(event)) {
		return;
	}

	event.preventDefault();
	placementDropActive = true;
	if (event.dataTransfer) {
		event.dataTransfer.dropEffect = "copy";
	}
}

function handlePlacementDragLeave(event: DragEvent): void {
	if (event.currentTarget === event.target) {
		placementDropActive = false;
	}
}

function handlePlacementDrop(event: DragEvent): void {
	if (!placeToolActive || !placementTarget?.canStage || !onDropPlacementEntry) {
		placementDropActive = false;
		return;
	}

	const entryId =
		event.dataTransfer?.getData(objectLibraryPlacementDragMimeType) ?? "";

	if (!entryId) {
		placementDropActive = false;
		return;
	}

	const point = viewportNormalizedPointFromDragEvent(event);

	if (point === null) {
		placementDropActive = false;
		return;
	}

	event.preventDefault();
	placementDropActive = false;
	placementHoverPoint = null;
	onDropPlacementEntry(entryId, point, "viewport-drop");
}

function viewportNormalizedPointFromDragEvent(
	event: DragEvent,
): LevelEditorViewportNormalizedPoint | null {
	return viewportNormalizedPointFromPointerEvent(event);
}

function viewportNormalizedPointFromPointerEvent(
	event: DragEvent | MouseEvent,
): LevelEditorViewportNormalizedPoint | null {
	const frame = event.currentTarget as HTMLElement | null;
	const rect = frame?.getBoundingClientRect();

	if (!rect || rect.width <= 0 || rect.height <= 0) {
		return null;
	}

	return {
		xPercent: ((event.clientX - rect.left) / rect.width) * 100,
		zPercent: ((event.clientY - rect.top) / rect.height) * 100,
	};
}
</script>

<section class="editor-panel editor-viewport-bridge" aria-label="Viewport bridge">
	<header class="editor-panel-header">
		<div>
			<h2>Viewport Bridge</h2>
			<p>{model.runtimeSceneId}</p>
		</div>
		<span>{model.bridge.connectionStatus}</span>
	</header>

	<div
		class="editor-viewport-frame"
		class:editor-viewport-placement-drop-active={placementDropActive}
	data-viewport-mode={model.view.mode}
	data-viewport-interaction-tool={model.interaction.activeTool}
	data-gizmo-status={model.gizmo.status}
	data-transform-drag-active={transformDragActive}
	data-placement-drop-ready={placeToolActive && (placementTarget?.canStage ?? false)}
	onclick={handleViewportClick}
	onpointermove={handleViewportPointerMove}
	onpointerup={endProjectedTransformDrag}
	onpointercancel={endProjectedTransformDrag}
	onmouseleave={handleViewportPointerLeave}
	ondragover={handlePlacementDragOver}
		ondragleave={handlePlacementDragLeave}
		ondrop={handlePlacementDrop}
	>
		<div class="editor-viewport-crosshair" aria-hidden="true"></div>
		<div class="editor-viewport-pins" aria-label="Projected workspace objects">
			{#each projectedObjects as object}
				<button
					type="button"
					class="editor-viewport-pin"
					class:selected-viewport-object={object.selected}
					style={`--viewport-object-x: ${object.xPercent}%; --viewport-object-z: ${object.zPercent}%`}
					aria-pressed={object.selected}
					title={`${object.label} / ${object.category}`}
					disabled={!selectToolActive || !onSelectObject}
					onclick={() => selectProjectedObject(object.stableId)}
				>
					<span>{object.label.slice(0, 1)}</span>
				</button>
			{/each}
		</div>
		{#if placementTarget && placementGhostPoint}
			<button
				type="button"
				class="editor-viewport-placement-ghost"
				data-placement-ready={placeToolActive && placementTarget.canStage}
				data-placement-preview-source={placementHoverPoint ? "hover" : "selected-object"}
				style={`--viewport-placement-x: ${placementGhostPoint.xPercent}%; --viewport-placement-z: ${placementGhostPoint.zPercent}%`}
				title={`${placementTarget.label} at ${placementTarget.targetLabel}`}
				disabled={!placeToolActive || !placementTarget.canStage || !onStagePlacementAtTarget}
				onclick={stagePlacementFromGhost}
			>
				<span>+</span>
				<small>{placementTarget.label}</small>
			</button>
		{/if}
		{#if selectedProjection && model.transformControls.activeHandles.length > 0}
			<div
				class="editor-viewport-transform-gizmo"
				style={`--viewport-gizmo-x: ${selectedProjection.xPercent}%; --viewport-gizmo-z: ${selectedProjection.zPercent}%`}
				data-gizmo-mode={model.transformControls.activeMode}
				aria-label="Selected object transform handles"
			>
				{#if model.transformControls.activeMode === "translate"}
					<button
						type="button"
						class="editor-viewport-transform-drag-handle"
						disabled={!transformToolActive || !projectedTransformDragReady || !onTransformProjectedDrag}
						title="Drag selected object on the projected X/Z placement surface"
						onpointerdown={beginProjectedTransformDrag}
					>
						XZ
					</button>
				{/if}
				{#each model.transformControls.activeHandles as handle}
					<div
						class="editor-viewport-transform-handle"
						data-transform-mode={handle.mode}
						data-transform-axis={handle.axis}
					>
						<button
							type="button"
							aria-label={`Decrease ${handle.label}`}
							disabled={!transformToolActive || !handle.canStage || !onTransformNudge}
							title={handle.reason}
							onclick={() => nudgeTransformHandle(handle, -1)}
						>
							-
						</button>
						<span>{handle.axis.toUpperCase()}</span>
						<button
							type="button"
							aria-label={`Increase ${handle.label}`}
							disabled={!transformToolActive || !handle.canStage || !onTransformNudge}
							title={handle.reason}
							onclick={() => nudgeTransformHandle(handle, 1)}
						>
							+
						</button>
					</div>
				{/each}
			</div>
		{/if}
		<div class="editor-viewport-overlay">
			{#if selectedObject}
				<div>
					<strong>{selectedObject.label}</strong>
					<span>{selectedObject.category}</span>
				</div>
				<div class="editor-workflow-badges" aria-label="Viewport overlay state">
					{#each model.view.activeOverlayIds as overlayId}
						<span>{overlayId}</span>
					{/each}
				</div>
				<dl class="editor-facts editor-facts-compact">
					<div>
						<dt>Owner</dt>
						<dd>{selectedObject.sourceOwner}</dd>
					</div>
					<div>
						<dt>Gizmo</dt>
						<dd>{model.gizmo.status}</dd>
					</div>
				</dl>
			{:else}
				<div>
					<strong>No selection</strong>
					<span>Select from the outliner, map, or object summary.</span>
				</div>
			{/if}
		</div>
	</div>

	<div class="editor-inspector-fields">
		<div class="editor-transform-mode-switcher" aria-label="Viewport interaction tool">
			{#each model.interaction.tools as tool}
				<button
					type="button"
					class:active-transform-mode={tool.id === model.interaction.activeTool}
					aria-pressed={tool.id === model.interaction.activeTool}
					disabled={!interactionToolEnabled(tool) || !onInteractionToolChange}
					title={interactionToolReason(tool)}
					onclick={() => selectInteractionTool(tool.id)}
				>
					{tool.label}
				</button>
			{/each}
		</div>
		<label class="editor-field">
			<span>Mode</span>
			<select
				value={model.view.mode}
				disabled={!onViewModeChange}
				onchange={selectViewMode}
			>
				{#each model.view.availableModes as mode}
					<option value={mode}>{viewModeLabels[mode]}</option>
				{/each}
			</select>
		</label>
		<label class="editor-field">
			<span>Live Scene</span>
			<input value={model.bridge.liveRuntimeSceneId ?? "not connected"} readonly />
		</label>
		<label class="editor-field">
			<span>Camera</span>
			<select
				value={model.camera.activeMode}
				disabled={!onCameraModeChange}
				onchange={selectCameraMode}
			>
				{#each model.camera.availableModes as mode}
					<option value={mode}>{cameraModeLabels[mode]}</option>
				{/each}
			</select>
		</label>
		<label class="editor-field">
			<span>Zoom</span>
			<input
				type="range"
				min="25"
				max="400"
				step="25"
				value={String(model.camera.zoomPercent)}
				disabled={!onCameraZoomPercentChange}
				oninput={selectCameraZoomPercent}
			/>
		</label>
		<label class="editor-field">
			<span>Selection</span>
			<input value={selectedObject?.stableId ?? "none"} readonly />
		</label>
		<label class="editor-field">
			<span>Gizmo</span>
			<input value={model.gizmo.status} readonly />
		</label>
	</div>

	<dl class="editor-facts editor-facts-compact">
		<div>
			<dt>Target</dt>
			<dd>{model.bridge.targetRoute}</dd>
		</div>
		<div>
			<dt>Transport</dt>
			<dd>{model.bridge.transport}</dd>
		</div>
		<div>
			<dt>Scene Match</dt>
			<dd>{String(model.bridge.runtimeSceneMatches)}</dd>
		</div>
		<div>
			<dt>Writes Runtime</dt>
			<dd>{String(model.bridge.writesRuntimeData)}</dd>
		</div>
		<div>
			<dt>Pick Runtime</dt>
			<dd>{String(model.interaction.renderedScenePickingEnabled)}</dd>
		</div>
		<div>
			<dt>Tool</dt>
			<dd>{model.interaction.activeTool}</dd>
		</div>
		<div>
			<dt>Camera Writes</dt>
			<dd>{String(model.camera.writesRuntimeData)}</dd>
		</div>
		<div>
			<dt>Framing</dt>
			<dd>{model.camera.framingTarget}</dd>
		</div>
	</dl>

	<dl class="editor-facts editor-facts-compact">
		<div>
			<dt>Object</dt>
			<dd>{selectedObject?.label ?? "none"}</dd>
		</div>
		<div>
			<dt>Category</dt>
			<dd>{selectedObject?.category ?? "none"}</dd>
		</div>
		<div>
			<dt>Components</dt>
			<dd>{selectedComponents}</dd>
		</div>
		<div>
			<dt>Preview</dt>
			<dd>{selectedObject?.previewTargetKind ?? "none"}</dd>
		</div>
	</dl>

	<div class="editor-inspector-fields" role="group" aria-label="Viewport overlays">
		{#each model.view.overlays as overlay}
			<label class="editor-field" for={overlayInputId(overlay.id)}>
				<span>{overlay.label}</span>
				<input
					id={overlayInputId(overlay.id)}
					type="checkbox"
					checked={overlay.enabled}
					disabled={!overlay.available || !onOverlayToggle}
					onchange={() => toggleOverlay(overlay.id)}
				/>
			</label>
		{/each}
	</div>

	<section
		class="editor-viewport-transform-controls"
		aria-label="Viewport transform controls"
	>
		<header>
			<div>
				<h3>Transform</h3>
				<span>{model.transformControls.status}</span>
			</div>
			<small>
				{model.transformControls.stagesAuthoringEdits
					? "Stages authoring edits"
					: "Read-only"}
				/ writes runtime {String(model.transformControls.writesRuntimeData)}
			</small>
		</header>
		{#if model.transformControls.fields.length > 0 || model.transformControls.rotationYawControl}
			<div class="editor-transform-toolbar">
				<div class="editor-transform-mode-switcher" aria-label="Transform mode">
					{#each model.transformControls.availableModes as mode}
						<button
							type="button"
							class:active-transform-mode={mode === model.transformControls.activeMode}
							aria-pressed={mode === model.transformControls.activeMode}
							disabled={!onTransformModeChange}
							onclick={() => selectTransformMode(mode)}
						>
							{transformModeLabels[mode]}
						</button>
					{/each}
				</div>
				<label class="editor-transform-snap-control">
					<span>Snap</span>
					<select
						value={String(model.transformControls.activeSnapStep)}
						disabled={!onTransformSnapStepChange}
						onchange={selectTransformSnapStep}
					>
						{#each model.transformControls.snapOptions[model.transformControls.activeMode] as step}
							<option value={String(step)}>{step}</option>
						{/each}
					</select>
				</label>
			</div>
			<div class="editor-transform-nudge-grid">
				{#if model.transformControls.activeMode === "rotate" && model.transformControls.rotationYawControl}
					{@const yawControl = model.transformControls.rotationYawControl}
					<div
						class="editor-transform-nudge"
						data-transform-mode="rotate"
						data-transform-axis="y"
					>
						<span>{yawControl.label}</span>
						<button
							type="button"
							aria-label={`Decrease ${yawControl.label}`}
							disabled={!transformToolActive || !yawControl.canStage || !onRotationYawNudge}
							title={yawControl.reason}
							onclick={() => nudgeRotationYaw(-1)}
						>
							-
						</button>
						<output>{yawControl.valueDegrees.toFixed(1)} deg</output>
						<button
							type="button"
							aria-label={`Increase ${yawControl.label}`}
							disabled={!transformToolActive || !yawControl.canStage || !onRotationYawNudge}
							title={yawControl.reason}
							onclick={() => nudgeRotationYaw(1)}
						>
							+
						</button>
					</div>
				{/if}
				{#each activeTransformFields as field}
					<div
						class="editor-transform-nudge"
						data-transform-mode={field.mode}
						data-transform-axis={field.axis}
					>
						<span>{field.label}</span>
						<button
							type="button"
							aria-label={`Decrease ${field.label}`}
							disabled={!transformToolActive || !field.canStage || !onTransformNudge}
							onclick={() => nudgeTransform(field, -1)}
						>
							-
						</button>
						<output>{field.value.toFixed(2)}</output>
						<button
							type="button"
							aria-label={`Increase ${field.label}`}
							disabled={!transformToolActive || !field.canStage || !onTransformNudge}
							onclick={() => nudgeTransform(field, 1)}
						>
							+
						</button>
					</div>
				{/each}
			</div>
		{:else}
			<p>{model.transformControls.blockedReasons.join("; ")}</p>
		{/if}
	</section>

	<section
		class="editor-viewport-placement-target"
		aria-label="Viewport placement target"
	>
		<header>
			<div>
				<h3>Placement Target</h3>
				<span>{placementTarget?.status ?? "no-placement-draft"}</span>
			</div>
			<small>
				{placementTarget?.writesFiles ? "Writes files" : "Draft-only"}
			</small>
		</header>
		{#if placementTarget}
			<dl class="editor-facts editor-facts-compact">
				<div>
					<dt>Library</dt>
					<dd>{placementTarget.label}</dd>
				</div>
				<div>
					<dt>Target</dt>
					<dd>{placementTarget.targetLabel}</dd>
				</div>
				<div>
					<dt>Snap</dt>
					<dd>
						{model.projection.placementSurface.snapStep}
					</dd>
				</div>
			</dl>
			<p>{placementTarget.reason}</p>
			<button
				type="button"
				disabled={!placeToolActive || !placementTarget.canStage || !onStagePlacementAtTarget}
				onclick={onStagePlacementAtTarget}
			>
				Stage Placement At Target
			</button>
		{:else}
			<p>Select a draft-ready prefab from the object library.</p>
		{/if}
	</section>

	<dl class="editor-facts editor-facts-compact">
		<div>
			<dt>Active</dt>
			<dd>{activeOverlaySummary}</dd>
		</div>
		<div>
			<dt>Modes</dt>
			<dd>{model.gizmo.supportedModes.join(", ") || "none"}</dd>
		</div>
		<div>
			<dt>Projected</dt>
			<dd>{model.projection.selectableCount}</dd>
		</div>
		<div>
			<dt>Drop Surface</dt>
			<dd>{model.projection.placementSurface.status}</dd>
		</div>
		<div>
			<dt>Drop Snap</dt>
			<dd>{model.projection.placementSurface.snapStep}</dd>
		</div>
		<div>
			<dt>Transform Edits</dt>
			<dd>{model.transformControls.status}</dd>
		</div>
		<div>
			<dt>Handles</dt>
			<dd>{model.transformControls.activeHandles.length}</dd>
		</div>
		<div>
			<dt>Direct Manipulation</dt>
			<dd>{String(model.gizmo.directManipulationEnabled)}</dd>
		</div>
		<div>
			<dt>Blocked</dt>
			<dd>{model.gizmo.blockedReasons.join("; ") || "none"}</dd>
		</div>
	</dl>
</section>
