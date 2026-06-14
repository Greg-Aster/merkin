<script lang="ts">
import type {
	EditorObjectLibraryReplacementDraft,
	EditorObjectLibraryReplacementSubject,
} from "../../game/editor/objectLibrary/index.js";
import type { LevelEditorObjectLibraryPreviewModel } from "./levelEditorObjectLibrary.js";

type Props = {
	readonly selectedObject: EditorObjectLibraryReplacementSubject | null;
	readonly preview?: LevelEditorObjectLibraryPreviewModel | null;
	readonly replacementDraft?: EditorObjectLibraryReplacementDraft | null;
};

const {
	selectedObject,
	preview = null,
	replacementDraft = null,
}: Props = $props();
const componentSummary = $derived(
	selectedObject?.componentNames.length
		? selectedObject.componentNames.join(", ")
		: "none",
);
const assetSummary = $derived(
	selectedObject?.assetIds.length ? selectedObject.assetIds.join(", ") : "none",
);
</script>

<section class="editor-selected-preview" aria-label="Selected object preview">
	{#if selectedObject}
		<div
			class="editor-preview-media"
			data-preview-mode={preview?.mode ?? "none"}
		>
			{#if preview?.mode === "image" && preview.url}
				<img src={preview.url} alt="" loading="lazy" />
			{:else if preview?.mode === "audio" && preview.url}
				<audio controls src={preview.url}></audio>
			{:else if preview?.mode === "material"}
				<span
					class="editor-material-swatch"
					style:background-color={preview.swatchColor ?? "#39b7a3"}
				></span>
			{:else if preview?.mode === "model"}
				<span>{preview.assetId ?? "model preview"}</span>
			{:else}
				<span>{preview?.kind ?? "data"}</span>
			{/if}
		</div>
		<div class="editor-preview-copy">
			<strong>{selectedObject.label}</strong>
			<span>{selectedObject.stableId}</span>
			<dl class="editor-facts editor-facts-compact">
				<div>
					<dt>Prefab</dt>
					<dd>{selectedObject.currentPrefabId}</dd>
				</div>
				<div>
					<dt>Owner</dt>
					<dd>{selectedObject.sourceOwner}</dd>
				</div>
				<div>
					<dt>Components</dt>
					<dd>{componentSummary}</dd>
				</div>
				<div>
					<dt>Assets</dt>
					<dd>{assetSummary}</dd>
				</div>
			</dl>
			{#if replacementDraft}
				<dl class="editor-facts editor-facts-compact">
					<div>
						<dt>Replacement</dt>
						<dd>{replacementDraft.replacement.label}</dd>
					</div>
					<div>
						<dt>Mode</dt>
						<dd>{replacementDraft.mode}</dd>
					</div>
					<div>
						<dt>Stable ID</dt>
						<dd>{replacementDraft.preserveStableId ? "preserved" : "changed"}</dd>
					</div>
					<div>
						<dt>Writes</dt>
						<dd>{replacementDraft.writesFiles ? "files" : "none"}</dd>
					</div>
				</dl>
			{/if}
		</div>
	{:else}
		<div class="editor-preview-media" data-preview-mode="none">
			<span>none</span>
		</div>
		<div class="editor-preview-copy">
			<strong>No object selected</strong>
			<span>Object preview is empty until the outliner selects an instance.</span>
		</div>
	{/if}
</section>
