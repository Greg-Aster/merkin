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
	selectMeshCandidateId(value);
}

function selectMeshCandidateId(value: string): void {
	selectedMeshEntryId = value;
	onSelectEntry?.(value);
}

function selectMaterialCandidate(event: Event): void {
	const value = (event.currentTarget as HTMLSelectElement).value;
	selectMaterialCandidateId(value);
}

function selectMaterialCandidateId(value: string): void {
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

function formatCandidateUsage(
	candidate: LevelEditorRenderableAssetPickerCandidate,
): string {
	if (candidate.usageState === "unused") {
		return "Unused in scene";
	}

	return `${candidate.usageCount} scene use${candidate.usageCount === 1 ? "" : "s"}`;
}

function candidateSelectionState(
	candidate: LevelEditorRenderableAssetPickerCandidate,
	selectedCandidate: LevelEditorRenderableAssetPickerCandidate | null,
	selectedState: "current" | "dirty" | "staged" | "unavailable",
): "current" | "dirty" | "staged" | "available" {
	if (candidate.id === selectedCandidate?.id) {
		return selectedState === "unavailable" ? "available" : selectedState;
	}

	return candidate.isCurrent ? "current" : "available";
}

function candidateSelectionLabel(
	candidate: LevelEditorRenderableAssetPickerCandidate,
	selectedCandidate: LevelEditorRenderableAssetPickerCandidate | null,
	selectedState: "current" | "dirty" | "staged" | "unavailable",
): string {
	const state = candidateSelectionState(
		candidate,
		selectedCandidate,
		selectedState,
	);

	switch (state) {
		case "current":
			return "Current";
		case "dirty":
			return "Selected";
		case "staged":
			return "Staged";
		case "available":
			return "Available";
	}
}
</script>

<section
	class="editor-inspector-component-group"
	data-workflow-publishability="publishable"
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
			<dd>Save Level / Publish</dd>
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
			<label class="editor-field" data-workflow-publishability="publishable">
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
			<label class="editor-field" data-workflow-publishability="publishable">
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
		<div
			class="editor-renderable-candidate-board"
			aria-label="Renderable asset candidate cards"
		>
			<section aria-label="Mesh candidates">
				<header>
					<strong>Mesh Candidates</strong>
					<span>{pickerModel.meshCandidates.length} manifest choices</span>
				</header>
				<div class="editor-renderable-candidate-grid">
					{#each pickerModel.meshCandidates as candidate}
						<button
							type="button"
							class="editor-renderable-candidate-card"
							data-candidate-state={candidateSelectionState(
								candidate,
								pickerModel.selectedMeshCandidate,
								pickerModel.meshSelectionState.state,
							)}
							aria-pressed={candidate.id === pickerModel.selectedMeshCandidate?.id}
							onclick={() => selectMeshCandidateId(candidate.id)}
						>
							<span>
								<strong>{candidate.label}</strong>
								<small>{candidate.assetId}</small>
							</span>
							<span>
								<small>{candidate.sourceOwner}</small>
								<small>{candidate.previewContract}</small>
							</span>
							<span>
								<small>{candidate.assetKind}</small>
								<small>{formatCandidateUsage(candidate)}</small>
							</span>
							<em>
								{candidateSelectionLabel(
									candidate,
									pickerModel.selectedMeshCandidate,
									pickerModel.meshSelectionState.state,
								)}
							</em>
						</button>
					{/each}
				</div>
			</section>
			<section aria-label="Material candidates">
				<header>
					<strong>Material Candidates</strong>
					<span>{pickerModel.materialCandidates.length} manifest choices</span>
				</header>
				<div class="editor-renderable-candidate-grid">
					{#each pickerModel.materialCandidates as candidate}
						<button
							type="button"
							class="editor-renderable-candidate-card"
							data-candidate-state={candidateSelectionState(
								candidate,
								pickerModel.selectedMaterialCandidate,
								pickerModel.materialSelectionState.state,
							)}
							aria-pressed={candidate.id === pickerModel.selectedMaterialCandidate?.id}
							onclick={() => selectMaterialCandidateId(candidate.id)}
						>
							<span>
								<strong>{candidate.label}</strong>
								<small>{candidate.assetId}</small>
							</span>
							<span>
								<small>{candidate.sourceOwner}</small>
								<small>{candidate.previewContract}</small>
							</span>
							<span>
								<small>{candidate.assetKind}</small>
								<small>{formatCandidateUsage(candidate)}</small>
							</span>
							<em>
								{candidateSelectionLabel(
									candidate,
									pickerModel.selectedMaterialCandidate,
									pickerModel.materialSelectionState.state,
								)}
							</em>
						</button>
					{/each}
				</div>
			</section>
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
				disabled={!pickerModel.canStageSelectedMesh}
				title="Preview and stage the selected mesh reference"
				onclick={() => stageCandidate(pickerModel.selectedMeshCandidate)}
			>
				Stage Mesh
			</button>
			<button
				type="button"
				disabled={!pickerModel.canStageSelectedMaterial}
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

<style>
	.editor-renderable-candidate-board,
	.editor-renderable-candidate-board > section,
	.editor-renderable-candidate-card {
		display: grid;
	}

	.editor-renderable-candidate-board {
		gap: 0.75rem;
	}

	.editor-renderable-candidate-board > section {
		gap: 0.5rem;
		min-width: 0;
	}

	.editor-renderable-candidate-board header {
		display: flex;
		gap: 0.75rem;
		align-items: baseline;
		justify-content: space-between;
		color: var(--editor-muted);
		font-size: 0.72rem;
		text-transform: uppercase;
	}

	.editor-renderable-candidate-board header strong,
	.editor-renderable-candidate-card strong {
		color: var(--editor-text-strong);
	}

	.editor-renderable-candidate-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10.5rem, 1fr));
		gap: 0.5rem;
	}

	.editor-renderable-candidate-card {
		gap: 0.45rem;
		align-content: start;
		min-height: 6.75rem;
		padding: 0.65rem;
		text-align: left;
	}

	.editor-renderable-candidate-card[aria-pressed="true"] {
		border-color: rgb(57 183 163 / 80%);
		background: rgb(57 183 163 / 14%);
	}

	.editor-renderable-candidate-card[data-candidate-state="staged"] {
		border-color: rgb(101 208 138 / 72%);
		box-shadow: inset 3px 0 0 rgb(101 208 138 / 80%);
	}

	.editor-renderable-candidate-card[data-candidate-state="dirty"] {
		border-color: rgb(231 191 98 / 72%);
		box-shadow: inset 3px 0 0 rgb(231 191 98 / 80%);
	}

	.editor-renderable-candidate-card strong,
	.editor-renderable-candidate-card small {
		display: block;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.editor-renderable-candidate-card strong {
		font-size: 0.78rem;
	}

	.editor-renderable-candidate-card small {
		color: var(--editor-dim);
		font-size: 0.68rem;
		line-height: 1.25;
	}

	.editor-renderable-candidate-card em {
		width: fit-content;
		padding: 0.18rem 0.38rem;
		border: 1px solid rgb(255 255 255 / 14%);
		border-radius: 999px;
		color: var(--editor-muted);
		font-size: 0.63rem;
		font-style: normal;
		font-weight: 900;
		text-transform: uppercase;
	}
</style>
