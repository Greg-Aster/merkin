<script lang="ts">
import type {
	EditorObjectLibraryPlacementDraft,
	EditorObjectLibraryReplacementDraft,
} from "../../game/editor/objectLibrary/index.js";
import LevelEditorObjectPreviewPanel from "./LevelEditorObjectPreviewPanel.svelte";
import type { LevelEditorQueuedAuthoringOperation } from "./levelEditorAuthoringStore.js";
import type {
	LevelEditorObjectLibraryPanelEntry,
	LevelEditorObjectLibraryPanelModel,
	LevelEditorObjectLibraryStagedPlacement,
} from "./levelEditorObjectLibrary.js";
import { createObjectLibraryStagedPlacement } from "./levelEditorObjectLibrary.js";

type StageAuthoringOperationsCallback = (
	entry: LevelEditorQueuedAuthoringOperation,
) => void;

type ObjectLibraryKindFilter =
	| "all"
	| LevelEditorObjectLibraryPanelEntry["kind"];
type ObjectLibraryPlacementFilter =
	| "all"
	| "draft-ready"
	| "publish-ready"
	| "replacement-ready"
	| "blocked";

type PlacementTransformEditorState = {
	entryId: string;
	positionX: number;
	positionY: number;
	positionZ: number;
	yawDegrees: number;
	scaleX: number;
	scaleY: number;
	scaleZ: number;
};

const objectLibraryPlacementDragMimeType =
	"application/x-megameal-object-library-entry";

type Props = {
	readonly model: LevelEditorObjectLibraryPanelModel;
	readonly selectedEntryId?: string | null;
	readonly onSelectEntry?: (entryId: string) => void;
	readonly onStageReplacement?: (
		draft: EditorObjectLibraryReplacementDraft,
	) => void;
	readonly onStageAuthoringOperations?: StageAuthoringOperationsCallback;
	readonly onRemoveAuthoringOperations?: (entryId: string) => void;
};

const {
	model,
	selectedEntryId = null,
	onSelectEntry,
	onStageReplacement,
	onStageAuthoringOperations,
	onRemoveAuthoringOperations,
}: Props = $props();
let activeEntryId: string = $state(
	selectedEntryId ?? model.selectedEntryId ?? "",
);
let stagedReplacementDrafts: readonly EditorObjectLibraryReplacementDraft[] =
	$state([]);
let stagedPlacements: readonly LevelEditorObjectLibraryStagedPlacement[] =
	$state([]);
const objectLibrarySearchQuery = $state("");
const objectLibraryKindFilter: ObjectLibraryKindFilter = $state("all");
const objectLibraryPlacementFilter: ObjectLibraryPlacementFilter =
	$state("all");
const placementTransformEditor: PlacementTransformEditorState = $state({
	entryId: "",
	positionX: 0,
	positionY: 0,
	positionZ: 0,
	yawDegrees: 0,
	scaleX: 1,
	scaleY: 1,
	scaleZ: 1,
});
const entries = $derived(model.groups.flatMap((group) => group.entries));
const filteredObjectLibraryGroups = $derived(
	model.groups
		.map((group) => ({
			...group,
			entries: group.entries.filter((entry) =>
				matchesObjectLibraryFilters(entry),
			),
		}))
		.filter((group) => group.entries.length > 0),
);
const filteredObjectLibraryEntries = $derived(
	filteredObjectLibraryGroups.flatMap((group) => group.entries),
);
const activeEntry: LevelEditorObjectLibraryPanelEntry | null = $derived(
	entries.find((entry) => entry.id === activeEntryId) ??
		model.selectedEntry ??
		entries[0] ??
		null,
);
const activeDraft = $derived(activeEntry?.replacementDraft ?? null);
const activePlacementDraft = $derived(
	activeEntry?.placementReadiness.placementDraft ?? null,
);

$effect(() => {
	const entryId = activeEntry?.id ?? "";

	if (!activePlacementDraft || placementTransformEditor.entryId === entryId) {
		return;
	}

	loadPlacementTransformEditor(entryId, activePlacementDraft.transform);
});

function selectEntry(entry: LevelEditorObjectLibraryPanelEntry): void {
	activeEntryId = entry.id;
	onSelectEntry?.(entry.id);
}

function startPlacementDrag(
	event: DragEvent,
	entry: LevelEditorObjectLibraryPanelEntry,
): void {
	if (!entry.placementReadiness.canStagePlacementDraft) {
		event.preventDefault();
		return;
	}

	selectEntry(entry);
	event.dataTransfer?.setData(objectLibraryPlacementDragMimeType, entry.id);
	event.dataTransfer?.setData("text/plain", entry.id);
	if (event.dataTransfer) {
		event.dataTransfer.effectAllowed = "copy";
	}
}

function stageReplacement(): void {
	if (!activeDraft) {
		return;
	}

	const nextDrafts = [
		activeDraft,
		...stagedReplacementDrafts.filter(
			(draft) => draft.sourcePlanHash !== activeDraft.sourcePlanHash,
		),
	].slice(0, 8);

	stagedReplacementDrafts = nextDrafts;
	onStageReplacement?.(activeDraft);
	emitStagedReplacementOperations(nextDrafts);
}

function emitStagedReplacementOperations(
	drafts: readonly EditorObjectLibraryReplacementDraft[],
): void {
	const operations = drafts.flatMap((draft) => {
		const operation = editOperationForReplacementDraft(draft);
		return operation === null ? [] : [operation];
	});
	const saveOperations = drafts.map(saveOperationForReplacementDraft);

	onStageAuthoringOperations?.({
		id: `object-library-replacements:${model.runtimeSceneId}`,
		label: "Object library replacements",
		...(operations.length === 0 ? {} : { operations }),
		saveOperations,
	});
}

function stagePlacement(): void {
	if (!activeEntry || !activePlacementDraft) {
		return;
	}

	const stagedPlacement = createObjectLibraryStagedPlacement({
		runtimeSceneId: model.runtimeSceneId,
		entry: activeEntry,
		draft: activePlacementDraft,
		index: stagedPlacements.length + 1,
		source: "object-library-panel",
		transform: authoredPlacementTransform(),
	});
	const nextPlacements = [
		stagedPlacement,
		...stagedPlacements.filter(
			(placement) => placement.id !== stagedPlacement.id,
		),
	].slice(0, 8);

	stagedPlacements = nextPlacements;
	emitStagedPlacementOperations(nextPlacements);
}

function emitStagedPlacementOperations(
	placements: readonly LevelEditorObjectLibraryStagedPlacement[],
): void {
	onStageAuthoringOperations?.({
		id: objectLibraryPlacementQueueEntryId(),
		label: "Object library placements",
		operations: placements.map((placement) => placement.operation),
		saveOperations: placements.map((placement) => placement.saveOperation),
	});
}

function removeStagedPlacement(placementId: string): void {
	const nextPlacements = stagedPlacements.filter(
		(placement) => placement.id !== placementId,
	);

	if (nextPlacements.length === stagedPlacements.length) {
		return;
	}

	stagedPlacements = nextPlacements;

	if (nextPlacements.length > 0) {
		emitStagedPlacementOperations(nextPlacements);
		return;
	}

	onRemoveAuthoringOperations?.(objectLibraryPlacementQueueEntryId());
}

function objectLibraryPlacementQueueEntryId(): string {
	return `object-library-placements:${model.runtimeSceneId}`;
}

function resetPlacementTransformEditor(): void {
	if (!activeEntry || !activePlacementDraft) {
		return;
	}

	loadPlacementTransformEditor(activeEntry.id, activePlacementDraft.transform);
}

function loadPlacementTransformEditor(
	entryId: string,
	transform: EditorObjectLibraryPlacementDraft["transform"],
): void {
	placementTransformEditor.entryId = entryId;
	placementTransformEditor.positionX = transform.position[0];
	placementTransformEditor.positionY = transform.position[1];
	placementTransformEditor.positionZ = transform.position[2];
	placementTransformEditor.yawDegrees = yawDegreesFromQuaternion(
		transform.rotation,
	);
	placementTransformEditor.scaleX = transform.scale[0];
	placementTransformEditor.scaleY = transform.scale[1];
	placementTransformEditor.scaleZ = transform.scale[2];
}

function authoredPlacementTransform(): EditorObjectLibraryPlacementDraft["transform"] {
	const fallback = activePlacementDraft?.transform ?? {
		position: [0, 0, 0],
		rotation: [0, 0, 0, 1],
		scale: [1, 1, 1],
	};

	return {
		position: [
			finiteNumber(placementTransformEditor.positionX, fallback.position[0]),
			finiteNumber(placementTransformEditor.positionY, fallback.position[1]),
			finiteNumber(placementTransformEditor.positionZ, fallback.position[2]),
		],
		rotation: quaternionFromYawDegrees(
			finiteNumber(placementTransformEditor.yawDegrees, 0),
		),
		scale: [
			finiteNumber(placementTransformEditor.scaleX, fallback.scale[0]),
			finiteNumber(placementTransformEditor.scaleY, fallback.scale[1]),
			finiteNumber(placementTransformEditor.scaleZ, fallback.scale[2]),
		],
	};
}

function finiteNumber(value: number, fallback: number): number {
	return Number.isFinite(value) ? value : fallback;
}

function yawDegreesFromQuaternion(
	rotation: readonly [number, number, number, number],
): number {
	const [x, y, z, w] = rotation;
	const sinY = 2 * (w * y + x * z);
	const cosY = 1 - 2 * (y * y + z * z);

	return roundForEditor((Math.atan2(sinY, cosY) * 180) / Math.PI);
}

function quaternionFromYawDegrees(
	degrees: number,
): readonly [number, number, number, number] {
	const radians = (degrees * Math.PI) / 180;
	const halfRadians = radians / 2;

	return [0, Math.sin(halfRadians), 0, Math.cos(halfRadians)];
}

function roundForEditor(value: number): number {
	return Math.round(value * 1000) / 1000;
}

function formatPlacementTransform(
	placement: LevelEditorObjectLibraryStagedPlacement,
): string {
	const { position, scale } = placement.operation.instance.transform;
	const yaw = yawDegreesFromQuaternion(
		placement.operation.instance.transform.rotation,
	);

	return `pos ${formatVector(position)} / yaw ${yaw} / scale ${formatVector(scale)}`;
}

function formatVector(values: readonly [number, number, number]): string {
	return values.map((value) => roundForEditor(value).toString()).join(", ");
}

function matchesObjectLibraryFilters(
	entry: LevelEditorObjectLibraryPanelEntry,
): boolean {
	if (
		objectLibraryKindFilter !== "all" &&
		entry.kind !== objectLibraryKindFilter
	) {
		return false;
	}

	if (
		objectLibraryPlacementFilter !== "all" &&
		!matchesObjectLibraryPlacementFilter(entry)
	) {
		return false;
	}

	const query = objectLibrarySearchQuery.trim().toLowerCase();

	if (query.length === 0) {
		return true;
	}

	return [
		entry.id,
		entry.label,
		entry.kind,
		entry.sourceOwner,
		entry.preview.label,
		entry.preview.assetId,
		entry.placementReadiness.status,
		...entry.tags,
		...entry.runtimeSceneIds,
	]
		.filter((value): value is string => typeof value === "string")
		.some((value) => value.toLowerCase().includes(query));
}

function matchesObjectLibraryPlacementFilter(
	entry: LevelEditorObjectLibraryPanelEntry,
): boolean {
	switch (objectLibraryPlacementFilter) {
		case "draft-ready":
			return entry.placementReadiness.canStagePlacementDraft;
		case "publish-ready":
			return entry.canPublishPlacement;
		case "replacement-ready":
			return entry.canReplaceSelectedObject;
		case "blocked":
			return (
				!entry.placementReadiness.canStagePlacementDraft &&
				!entry.canReplaceSelectedObject
			);
		case "all":
			return true;
	}
}

function editOperationForReplacementDraft(
	draft: EditorObjectLibraryReplacementDraft,
): LevelEditorAuthoringEditOperation | null {
	if (draft.replacementKind === "replace-level-instance-prefab") {
		if (draft.replacement.prefabId === undefined) {
			return null;
		}

		return {
			id: `object-library:${draft.sourcePlanHash}:replace-prefab`,
			kind: "replace-prefab",
			persistence: "saved",
			stableId: draft.selectedObject.stableId,
			prefabId: draft.replacement.prefabId,
			note: "Object library replacement staged from the editor panel.",
		} satisfies LevelEditorAuthoringEditOperation;
	}

	const componentName = stringValue(
		draft.authoringOperation.payload.componentName,
	);
	const patch = recordValue(draft.authoringOperation.payload.patch);

	if (componentName === null || patch === null) {
		return null;
	}

	return {
		id: `object-library:${draft.sourcePlanHash}:${componentName}`,
		kind: "set-component",
		persistence: "saved",
		stableId: draft.selectedObject.stableId,
		target: "level-instance",
		componentName,
		value: patch,
		note: "Object library asset replacement staged from the editor panel.",
	} satisfies LevelEditorAuthoringEditOperation;
}

function saveOperationForReplacementDraft(
	draft: EditorObjectLibraryReplacementDraft,
): LevelEditorAuthoringOperationData {
	const operation = draft.authoringOperation;
	const kind =
		operation.kind === "replace-component-asset-reference"
			? "replace-level-instance"
			: operation.kind;

	return {
		kind,
		ownerKind: operation.ownerKind,
		ownerTargetId: operation.ownerTargetId,
		subjectId: operation.subjectStableId,
		payload: {
			...operation.payload,
			sourceOperationKind: operation.kind,
			replacementKind: draft.replacementKind,
			replacement: draft.replacement,
			sourcePlanHash: draft.sourcePlanHash,
		},
	} satisfies LevelEditorAuthoringOperationData;
}

function stringValue(value: unknown): string | null {
	return typeof value === "string" && value.length > 0 ? value : null;
}

function recordValue(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function formatWorkflowValue(value: string): string {
	return value
		.split("-")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}
</script>

<section class="editor-panel editor-object-library" aria-label="Object library">
	<header class="editor-panel-header">
		<div>
			<h2>Object Library</h2>
			<p>{model.runtimeSceneId}</p>
		</div>
		<span>{filteredObjectLibraryEntries.length} / {model.summary.entryCount}</span>
	</header>
	<div class="editor-library-browser-controls" aria-label="Object library filters">
		<label>
			<span>Search</span>
			<input
				type="search"
				bind:value={objectLibrarySearchQuery}
				placeholder="Search assets, prefabs, tags"
				aria-label="Search object library"
			/>
		</label>
		<label>
			<span>Kind</span>
			<select bind:value={objectLibraryKindFilter} aria-label="Filter library kind">
				<option value="all">All kinds</option>
				<option value="prefab">Prefabs</option>
				<option value="asset">Assets</option>
			</select>
		</label>
		<label>
			<span>Workflow</span>
			<select
				bind:value={objectLibraryPlacementFilter}
				aria-label="Filter library workflow"
			>
				<option value="all">All workflows</option>
				<option value="draft-ready">Draft placement</option>
				<option value="publish-ready">Publish placement</option>
				<option value="replacement-ready">Replacement ready</option>
				<option value="blocked">Blocked</option>
			</select>
		</label>
	</div>
	<div class="editor-library-grid">
		<div class="editor-library-list">
			{#if filteredObjectLibraryGroups.length > 0}
				{#each filteredObjectLibraryGroups as group}
				<section class="editor-library-group">
					<h3>{group.label}</h3>
					{#each group.entries as entry}
						<button
							type="button"
							class:selected-library-item={entry.id === activeEntry?.id}
							draggable={entry.placementReadiness.canStagePlacementDraft}
							title={entry.unavailableReason ?? entry.sourceOwner}
							data-placement-drag-ready={entry.placementReadiness.canStagePlacementDraft}
							onclick={() => selectEntry(entry)}
							ondragstart={(event) => startPlacementDrag(event, entry)}
						>
							<span>{entry.label}</span>
							<small>
								{entry.kind} / {entry.canReplaceSelectedObject
									? "replaceable"
									: "inspect"}
							</small>
						</button>
					{/each}
				</section>
				{/each}
			{:else}
				<div class="editor-library-empty-state">
					<strong>No library entries match</strong>
					<span>Adjust search, kind, or workflow filters.</span>
				</div>
			{/if}
		</div>
		<div class="editor-library-detail">
			{#if activeEntry}
				<div
					class="editor-preview-media"
					data-preview-mode={activeEntry.preview.mode}
				>
					{#if activeEntry.preview.mode === "image" && activeEntry.preview.url}
						<img src={activeEntry.preview.url} alt="" loading="lazy" />
					{:else if activeEntry.preview.mode === "audio" && activeEntry.preview.url}
						<audio controls src={activeEntry.preview.url}></audio>
					{:else if activeEntry.preview.mode === "material"}
						<span
							class="editor-material-swatch"
							style:background-color={activeEntry.preview.swatchColor ??
								"#39b7a3"}
						></span>
					{:else}
						<span>{activeEntry.preview.assetId ?? activeEntry.preview.kind}</span>
					{/if}
				</div>
				<dl class="editor-facts editor-facts-compact">
					<div>
						<dt>Source</dt>
						<dd>{activeEntry.sourceOwner}</dd>
					</div>
					<div>
						<dt>Preview</dt>
						<dd>{activeEntry.preview.contract}</dd>
					</div>
					<div>
						<dt>Placement</dt>
						<dd>
							{formatWorkflowValue(activeEntry.placementReadiness.status)}
						</dd>
					</div>
					<div>
						<dt>Placement Save</dt>
						<dd>
							{activeEntry.placementReadiness.canStagePlacementDraft
								? "Draft-ready"
								: "Unavailable"}
						</dd>
					</div>
					<div>
						<dt>Scenes</dt>
						<dd>{activeEntry.runtimeSceneIds.join(", ")}</dd>
					</div>
					<div>
						<dt>Tags</dt>
						<dd>
							{activeEntry.tags.length > 0 ? activeEntry.tags.join(", ") : "none"}
						</dd>
					</div>
				</dl>
				<div
					class="editor-workflow-badges"
					aria-label="Object library placement workflow"
				>
					<span>
						{formatWorkflowValue(activeEntry.placementReadiness.status)}
					</span>
					<span>
						{activeEntry.canStagePlacementDraft
							? "Draft placement"
							: "No placement draft"}
					</span>
					<span>
						{activeEntry.canPublishPlacement
							? "Publish-ready"
							: "Not publishable"}
					</span>
					<span>{activeEntry.placementReadiness.writesFiles ? "Writes files" : "No file writes"}</span>
				</div>
				<div class="editor-status-list">
					{#each activeEntry.placementReadiness.reasons as reason}
						<span>{reason}</span>
					{/each}
				</div>
				{#if activePlacementDraft}
					<div
						class="editor-placement-composer"
						aria-label="Placement transform composer"
					>
						<h3>Placement Transform</h3>
						<div class="editor-placement-transform-grid">
							<label>
								<span>Position X</span>
								<input
									type="number"
									step="0.25"
									bind:value={placementTransformEditor.positionX}
								/>
							</label>
							<label>
								<span>Position Y</span>
								<input
									type="number"
									step="0.25"
									bind:value={placementTransformEditor.positionY}
								/>
							</label>
							<label>
								<span>Position Z</span>
								<input
									type="number"
									step="0.25"
									bind:value={placementTransformEditor.positionZ}
								/>
							</label>
							<label>
								<span>Yaw</span>
								<input
									type="number"
									step="5"
									bind:value={placementTransformEditor.yawDegrees}
								/>
							</label>
							<label>
								<span>Scale X</span>
								<input
									type="number"
									min="0.01"
									step="0.05"
									bind:value={placementTransformEditor.scaleX}
								/>
							</label>
							<label>
								<span>Scale Y</span>
								<input
									type="number"
									min="0.01"
									step="0.05"
									bind:value={placementTransformEditor.scaleY}
								/>
							</label>
							<label>
								<span>Scale Z</span>
								<input
									type="number"
									min="0.01"
									step="0.05"
									bind:value={placementTransformEditor.scaleZ}
								/>
							</label>
						</div>
					</div>
				{/if}
				<div class="editor-actions">
					<button
						type="button"
						disabled={!activeEntry.canStagePlacementDraft || !activePlacementDraft}
						title="Stage draft placement operation"
						onclick={stagePlacement}
					>
						Stage Placement Draft
					</button>
					<button
						type="button"
						disabled={!activePlacementDraft}
						title="Reset placement transform to the manifest-backed draft"
						onclick={resetPlacementTransformEditor}
					>
						Reset Transform
					</button>
					<button
						type="button"
						disabled={!activeDraft}
						title={activeEntry.unavailableReason ?? "Stage preview replacement"}
						onclick={stageReplacement}
					>
						Stage Replacement
					</button>
				</div>
			{:else}
				<div class="editor-preview-media" data-preview-mode="none">
					<span>empty</span>
				</div>
			{/if}
		</div>
	</div>
	<LevelEditorObjectPreviewPanel
		selectedObject={model.selectedObject}
		preview={model.selectedObjectPreview}
		replacementDraft={activeDraft}
	/>
	<dl class="editor-facts editor-facts-compact">
		<div>
			<dt>Replaceable</dt>
			<dd>{model.summary.replaceableEntryCount}</dd>
		</div>
		<div>
			<dt>Draft Placement</dt>
			<dd>{model.summary.placeableDraftEntryCount}</dd>
		</div>
		<div>
			<dt>Publish Placement</dt>
			<dd>{model.summary.publishablePlacementEntryCount}</dd>
		</div>
		<div>
			<dt>Staged</dt>
			<dd>{stagedReplacementDrafts.length + stagedPlacements.length}</dd>
		</div>
		<div>
			<dt>Writes</dt>
			<dd>{model.summary.stagedWritesFiles ? "files" : "none"}</dd>
		</div>
		<div>
			<dt>Mode</dt>
			<dd>{model.summary.replacementMode}</dd>
		</div>
	</dl>
	{#if stagedReplacementDrafts.length > 0}
		<ol class="editor-status-list">
			{#each stagedReplacementDrafts as draft}
				<li>
					<strong>{draft.selectedObject.stableId}</strong>
					<span>{draft.replacement.label}</span>
				</li>
			{/each}
		</ol>
	{/if}
	{#if stagedPlacements.length > 0}
		<ol class="editor-status-list editor-staged-placement-list">
			{#each stagedPlacements as placement}
				<li>
					<div>
						<strong>{placement.stableId}</strong>
						<span>{placement.label}</span>
						<small>{formatPlacementTransform(placement)}</small>
					</div>
					<button
						type="button"
						title="Remove staged placement"
						onclick={() => removeStagedPlacement(placement.id)}
					>
						Remove
					</button>
				</li>
			{/each}
		</ol>
	{/if}
</section>
