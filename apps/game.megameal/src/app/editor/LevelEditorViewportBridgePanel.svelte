<script lang="ts">
import type {
	LevelEditorViewportBridgeModel,
	LevelEditorViewportBridgeViewMode,
	LevelEditorViewportGizmoMode,
	LevelEditorViewportNormalizedPoint,
	LevelEditorViewportOverlayId,
	LevelEditorViewportTransformControlField,
	LevelEditorViewportTransformGizmoHandle,
} from "./levelEditorViewportBridgeModel.js";

type Props = {
	readonly model: LevelEditorViewportBridgeModel;
	readonly onViewModeChange?: (mode: LevelEditorViewportBridgeViewMode) => void;
	readonly onOverlayToggle?: (id: LevelEditorViewportOverlayId) => void;
	readonly onSelectObject?: (stableId: string) => void;
	readonly onTransformNudge?: (path: string, delta: number) => void;
	readonly onTransformModeChange?: (mode: LevelEditorViewportGizmoMode) => void;
	readonly onTransformSnapStepChange?: (
		mode: LevelEditorViewportGizmoMode,
		step: number,
	) => void;
	readonly placementTarget?: {
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
	) => void;
};

const {
	model,
	onViewModeChange,
	onOverlayToggle,
	onSelectObject,
	onTransformNudge,
	onTransformModeChange,
	onTransformSnapStepChange,
	placementTarget = null,
	onStagePlacementAtTarget,
	onDropPlacementEntry,
}: Props = $props();
const objectLibraryPlacementDragMimeType =
	"application/x-megameal-object-library-entry";
let placementDropActive = $state(false);
const selectedObject = $derived(model.selectedObject);
const projectedObjects = $derived(
	model.projection.objects.filter((object) => object.hasTransformPosition),
);
const placementProjectionTarget = $derived(
	placementTarget
		? projectedObjects.find((object) => object.selected) ?? null
		: null,
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
const viewModeLabels: Record<LevelEditorViewportBridgeViewMode, string> = {
	"live-game": "Live Game",
	lit: "Lit",
	unlit: "Unlit",
	collision: "Collision",
	wireframe: "Wireframe",
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

function toggleOverlay(id: LevelEditorViewportOverlayId): void {
	onOverlayToggle?.(id);
}

function selectProjectedObject(stableId: string): void {
	onSelectObject?.(stableId);
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
	if (!placementTarget?.canStage) {
		return;
	}

	onStagePlacementAtTarget?.();
}

function dragHasObjectLibraryPlacement(event: DragEvent): boolean {
	return (
		event.dataTransfer?.types.includes(objectLibraryPlacementDragMimeType) ??
		false
	);
}

function handlePlacementDragOver(event: DragEvent): void {
	if (!placementTarget?.canStage || !onDropPlacementEntry) {
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
	if (!placementTarget?.canStage || !onDropPlacementEntry) {
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
	onDropPlacementEntry(entryId, point);
}

function viewportNormalizedPointFromDragEvent(
	event: DragEvent,
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
		data-gizmo-status={model.gizmo.status}
		data-placement-drop-ready={placementTarget?.canStage ?? false}
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
					disabled={!onSelectObject}
					onclick={() => selectProjectedObject(object.stableId)}
				>
					<span>{object.label.slice(0, 1)}</span>
				</button>
			{/each}
		</div>
		{#if placementTarget && placementProjectionTarget}
			<button
				type="button"
				class="editor-viewport-placement-ghost"
				data-placement-ready={placementTarget.canStage}
				style={`--viewport-placement-x: ${placementProjectionTarget.xPercent}%; --viewport-placement-z: ${placementProjectionTarget.zPercent}%`}
				title={`${placementTarget.label} at ${placementTarget.targetLabel}`}
				disabled={!placementTarget.canStage || !onStagePlacementAtTarget}
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
				{#each model.transformControls.activeHandles as handle}
					<div
						class="editor-viewport-transform-handle"
						data-transform-mode={handle.mode}
						data-transform-axis={handle.axis}
					>
						<button
							type="button"
							aria-label={`Decrease ${handle.label}`}
							disabled={!handle.canStage || !onTransformNudge}
							title={handle.reason}
							onclick={() => nudgeTransformHandle(handle, -1)}
						>
							-
						</button>
						<span>{handle.axis.toUpperCase()}</span>
						<button
							type="button"
							aria-label={`Increase ${handle.label}`}
							disabled={!handle.canStage || !onTransformNudge}
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
		{#if model.transformControls.fields.length > 0}
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
							disabled={!field.canStage || !onTransformNudge}
							onclick={() => nudgeTransform(field, -1)}
						>
							-
						</button>
						<output>{field.value.toFixed(2)}</output>
						<button
							type="button"
							aria-label={`Increase ${field.label}`}
							disabled={!field.canStage || !onTransformNudge}
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
			</dl>
			<p>{placementTarget.reason}</p>
			<button
				type="button"
				disabled={!placementTarget.canStage || !onStagePlacementAtTarget}
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
