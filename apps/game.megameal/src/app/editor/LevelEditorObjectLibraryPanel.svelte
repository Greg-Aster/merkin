<script lang="ts">
import type { LevelEditorAuthoringEditOperation } from "../../engine/data/levelAuthoring/index.js";
import type { LevelEditorAuthoringOperationData } from "../../game/editor/authoring/saveTransaction.js";
import type { EditorObjectLibraryReplacementDraft } from "../../game/editor/objectLibrary/index.js";
import LevelEditorObjectPreviewPanel from "./LevelEditorObjectPreviewPanel.svelte";
import type { LevelEditorQueuedAuthoringOperation } from "./levelEditorAuthoringStore.js";
import type {
	LevelEditorObjectLibraryPanelEntry,
	LevelEditorObjectLibraryPanelModel,
} from "./levelEditorObjectLibrary.js";

type StageAuthoringOperationsCallback = (
	entry: LevelEditorQueuedAuthoringOperation,
) => void;

type Props = {
	readonly model: LevelEditorObjectLibraryPanelModel;
	readonly selectedEntryId?: string | null;
	readonly onStageReplacement?: (
		draft: EditorObjectLibraryReplacementDraft,
	) => void;
	readonly onStageAuthoringOperations?: StageAuthoringOperationsCallback;
};

const {
	model,
	selectedEntryId = null,
	onStageReplacement,
	onStageAuthoringOperations,
}: Props = $props();
let activeEntryId: string = $state(
	selectedEntryId ?? model.selectedEntryId ?? "",
);
let stagedReplacementDrafts: readonly EditorObjectLibraryReplacementDraft[] =
	$state([]);
const entries = $derived(model.groups.flatMap((group) => group.entries));
const activeEntry: LevelEditorObjectLibraryPanelEntry | null = $derived(
	entries.find((entry) => entry.id === activeEntryId) ??
		model.selectedEntry ??
		entries[0] ??
		null,
);
const activeDraft = $derived(activeEntry?.replacementDraft ?? null);

function selectEntry(entry: LevelEditorObjectLibraryPanelEntry): void {
	activeEntryId = entry.id;
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
	emitStagedAuthoringOperations(nextDrafts);
}

function emitStagedAuthoringOperations(
	drafts: readonly EditorObjectLibraryReplacementDraft[],
): void {
	const operations = drafts.flatMap((draft) => {
		const operation = editOperationForReplacementDraft(draft);
		return operation === null ? [] : [operation];
	});
	const saveOperations = drafts.map(saveOperationForReplacementDraft);

	onStageAuthoringOperations?.({
		id: `object-library:${model.runtimeSceneId}`,
		label: "Object library replacements",
		...(operations.length === 0 ? {} : { operations }),
		saveOperations,
	});
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
</script>

<section class="editor-panel editor-object-library" aria-label="Object library">
	<header class="editor-panel-header">
		<div>
			<h2>Object Library</h2>
			<p>{model.runtimeSceneId}</p>
		</div>
		<span>{model.summary.entryCount}</span>
	</header>
	<div class="editor-library-grid">
		<div class="editor-library-list">
			{#each model.groups as group}
				<section class="editor-library-group">
					<h3>{group.label}</h3>
					{#each group.entries as entry}
						<button
							type="button"
							class:selected-library-item={entry.id === activeEntry?.id}
							title={entry.unavailableReason ?? entry.sourceOwner}
							onclick={() => selectEntry(entry)}
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
				<div class="editor-actions">
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
			<dt>Staged</dt>
			<dd>{stagedReplacementDrafts.length}</dd>
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
</section>
