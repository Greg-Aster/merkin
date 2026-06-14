<script lang="ts">
import type { LevelEditorAuthoringEditOperation } from "../../engine/data/levelAuthoring/index.js";
import type { LevelEditorAuthoringOperationData } from "../../game/editor/authoring/saveTransaction.js";
import type {
	NpcAuthoringCatalog,
	NpcAuthoringOperation,
} from "../../game/editor/npcAuthoring/index.js";
import {
	createDuplicateNpcOperation,
	createInsertFireflyNpcOperation,
	createRemoveNpcOperation,
} from "../../game/editor/npcAuthoring/index.js";
import type { LevelEditorQueuedAuthoringOperation } from "./levelEditorAuthoringStore.js";
import { parseNpcAuthoringCatalog } from "./levelEditorEnvironmentPanels.js";

type StageAuthoringOperationsCallback = (
	entry: LevelEditorQueuedAuthoringOperation,
) => void;

type Props = {
	readonly serializedNpcCatalog: string;
	readonly selectedRuntimeSceneId: string;
	readonly selectedLevelId: string;
	readonly onStageAuthoringOperations?: StageAuthoringOperationsCallback;
};

const {
	serializedNpcCatalog,
	selectedRuntimeSceneId,
	selectedLevelId,
	onStageAuthoringOperations,
}: Props = $props();
const catalog: NpcAuthoringCatalog =
	parseNpcAuthoringCatalog(serializedNpcCatalog);
const selectedTemplate = catalog.templates[0];
let memberId = $state("new-firefly");
let removeStableId = $state(selectedTemplate?.stableIdPrefix ?? "firefly");
let duplicateSourceStableId = $state(
	catalog.currentPopulations[0]?.members[0]
		? `${catalog.currentPopulations[0].stableIdPrefix}:${catalog.currentPopulations[0].members[0].id}`
		: selectedTemplate?.stableIdPrefix ?? "firefly",
);
let duplicateNextStableId = $state(
	`${selectedTemplate?.stableIdPrefix ?? "firefly"}:copy`,
);
let stagedOperations: readonly NpcAuthoringOperation[] = $state([]);

function stageInsert(): void {
	if (!selectedTemplate) {
		return;
	}

	stageOperation(
		createInsertFireflyNpcOperation({
			runtimeSceneId: selectedRuntimeSceneId,
			levelId: selectedLevelId,
			memberId: normalizedMemberId(memberId),
			position: selectedTemplate.defaults.transform.position,
			scale: selectedTemplate.defaults.transform.scale,
		}),
	);
}

function stageRemove(): void {
	stageOperation(
		createRemoveNpcOperation({
			runtimeSceneId: selectedRuntimeSceneId,
			levelId: selectedLevelId,
			stableId: removeStableId,
		}),
	);
}

function stageDuplicate(): void {
	stageOperation(
		createDuplicateNpcOperation({
			runtimeSceneId: selectedRuntimeSceneId,
			levelId: selectedLevelId,
			sourceStableId: duplicateSourceStableId,
			nextStableId: duplicateNextStableId,
		}),
	);
}

function stageOperation(operation: NpcAuthoringOperation): void {
	const nextOperations = [
		operation,
		...stagedOperations.filter(
			(candidate) => operationKey(candidate) !== operationKey(operation),
		),
	].slice(0, 12);

	stagedOperations = nextOperations;
	emitStagedAuthoringOperations(nextOperations);
}

function operationKey(operation: NpcAuthoringOperation): string {
	switch (operation.operation) {
		case "insert-firefly-npc":
			return `${operation.operation}:${operation.memberId}`;
		case "remove-npc":
			return `${operation.operation}:${operation.stableId}`;
		case "duplicate-npc":
			return `${operation.operation}:${operation.sourceStableId}:${operation.nextStableId}`;
	}
}

function normalizedMemberId(value: string): string {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9-]+/g, "-")
			.replace(/^-|-$/g, "")
			.slice(0, 48) || "new-firefly"
	);
}

function readTextInput(event: Event): string {
	return (event.currentTarget as HTMLInputElement).value;
}

function updateMemberId(event: Event): void {
	memberId = readTextInput(event);
}

function updateRemoveStableId(event: Event): void {
	removeStableId = readTextInput(event);
}

function updateDuplicateSourceStableId(event: Event): void {
	duplicateSourceStableId = readTextInput(event);
}

function updateDuplicateNextStableId(event: Event): void {
	duplicateNextStableId = readTextInput(event);
}

function emitStagedAuthoringOperations(
	operations: readonly NpcAuthoringOperation[],
): void {
	const authoringOperations = operations.flatMap(
		(operation) => operation.operationDraft.authoringOperations,
	);
	const saveOperations = operations.flatMap((operation) =>
		operation.operationDraft.authoringOperations.map((authoringOperation) =>
			saveOperationForNpcDraft(operation, authoringOperation),
		),
	);

	if (authoringOperations.length === 0 && saveOperations.length === 0) {
		return;
	}

	onStageAuthoringOperations?.({
		id: `npc:${selectedRuntimeSceneId}`,
		label: "NPC authoring",
		...(authoringOperations.length === 0
			? {}
			: { operations: authoringOperations }),
		...(saveOperations.length === 0 ? {} : { saveOperations }),
	});
}

function saveOperationForNpcDraft(
	operation: NpcAuthoringOperation,
	authoringOperation: LevelEditorAuthoringEditOperation,
): LevelEditorAuthoringOperationData {
	return {
		kind: authoringOperationKindForNpcDraft(authoringOperation),
		ownerKind: "level",
		ownerTargetId: `${operation.runtimeSceneId}:level`,
		subjectId: subjectIdForNpcDraft(operation, authoringOperation),
		payload: {
			sourceOperation: operation.operation,
			operationDraftStatus: operation.operationDraft.status,
			authoringOperation,
		},
	} satisfies LevelEditorAuthoringOperationData;
}

function authoringOperationKindForNpcDraft(
	authoringOperation: LevelEditorAuthoringEditOperation,
): LevelEditorAuthoringOperationData["kind"] {
	switch (authoringOperation.kind) {
		case "insert-instance":
			return "insert-level-instance";
		case "remove-instance":
			return "remove-level-instance";
		default:
			return "replace-level-instance";
	}
}

function subjectIdForNpcDraft(
	operation: NpcAuthoringOperation,
	authoringOperation: LevelEditorAuthoringEditOperation,
): string {
	switch (authoringOperation.kind) {
		case "insert-instance":
			return authoringOperation.instance.stableId;
		case "remove-instance":
		case "replace-prefab":
		case "remove-component":
		case "set-component":
		case "set-portal-target":
		case "set-transform":
			return authoringOperation.stableId;
		default:
			return operation.operation;
	}
}
</script>

<section class="editor-panel" aria-label="NPC authoring">
	<header class="editor-panel-header">
		<div>
			<h2>NPC</h2>
			<p>{selectedRuntimeSceneId}</p>
		</div>
		<span>{catalog.templates.length}</span>
	</header>

	{#if selectedTemplate}
		<dl class="editor-facts editor-facts-compact">
			<div>
				<dt>Template</dt>
				<dd>{selectedTemplate.label}</dd>
			</div>
			<div>
				<dt>Prefab</dt>
				<dd>{selectedTemplate.prefabId}</dd>
			</div>
			<div>
				<dt>Runtime AI</dt>
				<dd>{selectedTemplate.runtimeSupport.aiStack}</dd>
			</div>
			<div>
				<dt>Contracts</dt>
				<dd>{selectedTemplate.contracts.join(", ")}</dd>
			</div>
		</dl>

		<div class="editor-inspector-fields">
			<label class="editor-field">
				<span>Member ID</span>
				<input
					value={memberId}
					type="text"
					oninput={updateMemberId}
				/>
			</label>
			<label class="editor-field">
				<span>Remove Stable ID</span>
				<input
					value={removeStableId}
					type="text"
					oninput={updateRemoveStableId}
				/>
			</label>
			<label class="editor-field">
				<span>Duplicate Source</span>
				<input
					value={duplicateSourceStableId}
					type="text"
					oninput={updateDuplicateSourceStableId}
				/>
			</label>
			<label class="editor-field">
				<span>Duplicate Stable ID</span>
				<input
					value={duplicateNextStableId}
					type="text"
					oninput={updateDuplicateNextStableId}
				/>
			</label>
		</div>

		<div class="editor-actions">
			<button type="button" onclick={stageInsert}>Insert</button>
			<button type="button" onclick={stageRemove}>Remove</button>
			<button type="button" onclick={stageDuplicate}>Duplicate</button>
		</div>
	{/if}

	<section class="editor-outliner-group">
		<h3>Current Populations</h3>
		{#each catalog.currentPopulations as population}
			<dl class="editor-facts editor-facts-compact">
				<div>
					<dt>{population.id}</dt>
					<dd>{population.members.length} members</dd>
				</div>
			</dl>
		{/each}
	</section>

	<section class="editor-outliner-group">
		<h3>Drafts</h3>
		{#if stagedOperations.length === 0}
			<p class="editor-note">No NPC operation drafts staged.</p>
		{:else}
			<ol>
				{#each stagedOperations as operation}
					<li>
						<strong>{operation.operation}</strong>
						<span>{operation.operationDraft.status}</span>
					</li>
				{/each}
			</ol>
		{/if}
	</section>
</section>
