<script lang="ts">
import type { EditorObjectLibraryReplacementDraft } from "../../game/editor/objectLibrary/index.js";
import type {
	LevelEditorAuthoringQueueState,
	LevelEditorQueuedAuthoringOperation,
} from "./levelEditorAuthoringStore.js";
import type {
	LevelEditorObjectLibraryPanelModel,
	LevelEditorObjectLibraryPreviewModel,
} from "./levelEditorObjectLibrary.js";
import {
	type LevelEditorRenderableAssetPickerCandidate,
	buildLevelEditorRenderableAssetPickerModel,
	createRenderableAssetPickerQueueEntry,
} from "./levelEditorRenderableAssetPickerModel.js";

type StageAuthoringOperationsCallback = (
	entry: LevelEditorQueuedAuthoringOperation,
) => void;

type Props = {
	readonly objectLibraryModel: LevelEditorObjectLibraryPanelModel;
	readonly selectedEntryId?: string | null;
	readonly authoringQueue?: LevelEditorAuthoringQueueState | null;
	readonly onSelectEntry?: (entryId: string) => void;
	readonly onStageReplacement?: (
		draft: EditorObjectLibraryReplacementDraft,
	) => void;
	readonly onStageAuthoringOperations?: StageAuthoringOperationsCallback;
};

const {
	objectLibraryModel,
	selectedEntryId = null,
	authoringQueue = null,
	onSelectEntry,
	onStageReplacement,
	onStageAuthoringOperations,
}: Props = $props();
let selectedMeshEntryId: string | null = $state(null);
let selectedMaterialEntryId: string | null = $state(null);
const pickerModel = $derived(
	buildLevelEditorRenderableAssetPickerModel({
		objectLibraryModel,
		selectedMeshEntryId,
		selectedMaterialEntryId,
		queuedOperations: authoringQueue?.queuedOperations ?? [],
	}),
);
const selectedPreview = $derived(
	pickerModel.selectedMeshCandidate?.preview ??
		pickerModel.selectedMaterialCandidate?.preview ??
		null,
);

$effect(() => {
	const meshCandidate = pickerModel.meshCandidates.find(
		(candidate) => candidate.id === selectedEntryId,
	);

	if (meshCandidate) {
		selectedMeshEntryId = meshCandidate.id;
		return;
	}

	const materialCandidate = pickerModel.materialCandidates.find(
		(candidate) => candidate.id === selectedEntryId,
	);

	if (materialCandidate) {
		selectedMaterialEntryId = materialCandidate.id;
	}
});

function selectMeshCandidate(event: Event): void {
	const value = (event.currentTarget as HTMLSelectElement).value;
	selectedMeshEntryId = value;
	onSelectEntry?.(value);
}

function selectMaterialCandidate(event: Event): void {
	const value = (event.currentTarget as HTMLSelectElement).value;
	selectedMaterialEntryId = value;
	onSelectEntry?.(value);
}

function stageCandidate(
	candidate: LevelEditorRenderableAssetPickerCandidate | null,
): void {
	if (!candidate) {
		return;
	}

	const entry = createRenderableAssetPickerQueueEntry({
		runtimeSceneId: pickerModel.runtimeSceneId,
		draft: candidate.draft,
	});

	onStageReplacement?.(candidate.draft);

	if (entry) {
		onStageAuthoringOperations?.(entry);
	}
}

function formatAssetId(assetId: string | null): string {
	return assetId ?? "none";
}

function canStageCandidate(
	candidate: LevelEditorRenderableAssetPickerCandidate | null,
	state: "current" | "dirty" | "staged" | "unavailable",
): boolean {
	return candidate !== null && state === "dirty";
}
</script>

<section
	class="editor-inspector-component-group"
	data-workflow-publishability="draft-only"
	aria-label="Renderable asset picker"
>
	<header class="editor-inspector-component-header">
		<div>
			<h3>Renderable</h3>
			<p>{pickerModel.statusLabel}</p>
		</div>
		<span>Level Instance</span>
	</header>
	<dl class="editor-facts editor-facts-compact">
		<div>
			<dt>Current Mesh</dt>
			<dd>{formatAssetId(pickerModel.currentMeshId)}</dd>
		</div>
		<div>
			<dt>Current Material</dt>
			<dd>{formatAssetId(pickerModel.currentMaterialId)}</dd>
		</div>
		<div>
			<dt>Scope</dt>
			<dd>{pickerModel.selectedScopeId}</dd>
		</div>
		<div>
			<dt>Writes</dt>
			<dd>queued authoring only</dd>
		</div>
		<div>
			<dt>Mesh State</dt>
			<dd>{pickerModel.meshSelectionState.label}</dd>
		</div>
		<div>
			<dt>Material State</dt>
			<dd>{pickerModel.materialSelectionState.label}</dd>
		</div>
	</dl>
	{#if pickerModel.status === "ready"}
		<div class="editor-actions" aria-label="Renderable replacement scope">
			{#each pickerModel.scopeOptions as scopeOption}
				<button
					type="button"
					disabled={scopeOption.disabled}
					title={scopeOption.description}
					aria-pressed={scopeOption.selected}
				>
					{scopeOption.label}
				</button>
			{/each}
		</div>
		<div class="editor-inspector-fields">
			<label class="editor-field" data-workflow-publishability="draft-only">
				<span class="editor-field-title">Mesh</span>
				<select
					aria-label="Select renderable mesh"
					value={pickerModel.selectedMeshCandidate?.id ?? ""}
					onchange={selectMeshCandidate}
				>
					{#each pickerModel.meshCandidates as candidate}
						<option value={candidate.id}>
							{candidate.isCurrent ? "Current / " : ""}{candidate.label}
						</option>
					{/each}
				</select>
				<span class="editor-field-meta">
					{pickerModel.selectedMeshCandidate?.assetId ?? "No mesh candidate"} /
					{pickerModel.meshSelectionState.reason}
				</span>
			</label>
			<label class="editor-field" data-workflow-publishability="draft-only">
				<span class="editor-field-title">Material</span>
				<select
					aria-label="Select renderable material"
					value={pickerModel.selectedMaterialCandidate?.id ?? ""}
					onchange={selectMaterialCandidate}
				>
					{#each pickerModel.materialCandidates as candidate}
						<option value={candidate.id}>
							{candidate.isCurrent ? "Current / " : ""}{candidate.label}
						</option>
					{/each}
				</select>
				<span class="editor-field-meta">
					{pickerModel.selectedMaterialCandidate?.assetId ??
						"No material candidate"} /
					{pickerModel.materialSelectionState.reason}
				</span>
			</label>
		</div>
		{#if selectedPreview}
			<div
				class="editor-preview-media"
				data-preview-mode={selectedPreview.mode}
			>
				{#if selectedPreview.mode === "image" && selectedPreview.url}
					<img src={selectedPreview.url} alt="" loading="lazy" />
				{:else if selectedPreview.mode === "audio" && selectedPreview.url}
					<audio controls src={selectedPreview.url}></audio>
				{:else if selectedPreview.mode === "material"}
					<span
						class="editor-material-swatch"
						style:background-color={selectedPreview.swatchColor ?? "#39b7a3"}
					></span>
				{:else}
					<span>{selectedPreview.assetId ?? selectedPreview.kind}</span>
				{/if}
			</div>
		{/if}
		<div class="editor-actions">
			<button
				type="button"
				disabled={!canStageCandidate(
					pickerModel.selectedMeshCandidate,
					pickerModel.meshSelectionState.state,
				)}
				title="Preview and stage the selected mesh reference"
				onclick={() => stageCandidate(pickerModel.selectedMeshCandidate)}
			>
				Stage Mesh
			</button>
			<button
				type="button"
				disabled={!canStageCandidate(
					pickerModel.selectedMaterialCandidate,
					pickerModel.materialSelectionState.state,
				)}
				title="Preview and stage the selected material reference"
				onclick={() => stageCandidate(pickerModel.selectedMaterialCandidate)}
			>
				Stage Material
			</button>
		</div>
	{:else}
		<div class="editor-library-empty-state">
			<strong>{pickerModel.status}</strong>
			<span>{pickerModel.statusLabel}</span>
		</div>
	{/if}
</section>
