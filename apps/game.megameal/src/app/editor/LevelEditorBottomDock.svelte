<script lang="ts">
import type {
	LevelEditorAuthoringTransaction,
	LevelEditorRuntimeTelemetryPayload,
} from "../../engine/data/index.js";
import type { EditorObjectLibraryReplacementDraft } from "../../game/editor/objectLibrary/index.js";
import LevelEditorAiAssetLab from "./LevelEditorAiAssetLab.svelte";
import LevelEditorCameraPanel from "./LevelEditorCameraPanel.svelte";
import LevelEditorEnvironmentPanel from "./LevelEditorEnvironmentPanel.svelte";
import LevelEditorNpcPanel from "./LevelEditorNpcPanel.svelte";
import LevelEditorObjectLibraryPanel from "./LevelEditorObjectLibraryPanel.svelte";
import LevelEditorPreviewControls from "./LevelEditorPreviewControls.svelte";
import type {
	LevelEditorAuthoringQueueState,
	LevelEditorQueuedAuthoringOperation,
} from "./levelEditorAuthoringStore.js";
import type { LevelEditorObjectLibraryPanelModel } from "./levelEditorObjectLibrary.js";
import type { LevelEditorSessionSummary } from "./levelEditorSession.js";
import type { LevelEditorWorkbenchBottomDockRegion } from "./levelEditorWorkbenchModel.js";
import type {
	LevelEditorQueuedOperationSummary,
	LevelEditorStagedFieldEdit,
	LevelEditorStagedPublishReadiness,
} from "./levelEditorWorkspaceUi.js";

type BottomDockTabId =
	LevelEditorWorkbenchBottomDockRegion["tabs"][number]["id"];

type EditorStatus = {
	readonly kind: string;
	readonly label: string;
};

type Props = {
	readonly workspace: LevelEditorSessionSummary["workspace"];
	readonly editorSession: LevelEditorSessionSummary;
	readonly tabs: readonly LevelEditorWorkbenchBottomDockRegion["tabs"][number][];
	readonly selectedTabId: BottomDockTabId;
	readonly selectedCommandPlanId: "build" | "publish";
	readonly status: EditorStatus;
	readonly objectLibraryPanelModel: LevelEditorObjectLibraryPanelModel;
	readonly selectedObjectLibraryEntryId: string | null;
	readonly serializedEnvironmentModel: string;
	readonly serializedNpcCatalog: string;
	readonly selectedStableIds: readonly string[];
	readonly authoringQueue: LevelEditorAuthoringQueueState;
	readonly stagedPublishReadiness: LevelEditorStagedPublishReadiness;
	readonly stagedFieldEdits: readonly LevelEditorStagedFieldEdit[];
	readonly queuedOperationSummaries: readonly LevelEditorQueuedOperationSummary[];
	readonly latestTransaction?: LevelEditorAuthoringTransaction;
	readonly outputLog: LevelEditorSessionSummary["workspace"]["outputLog"];
	readonly runtimeTelemetry?: LevelEditorRuntimeTelemetryPayload;
	readonly runtimeTelemetryState: string;
	readonly runtimeLifecycleLabel: string;
	readonly runtimePositionLabel: string;
	readonly runtimeHealthLabel: string;
	readonly runtimeInputLabel: string;
	readonly runtimeChargeLabel: string;
	readonly onSelectTab: (tabId: BottomDockTabId) => void;
	readonly onSelectCommandPlan: (planId: "build" | "publish") => void;
	readonly onSelectObjectLibraryEntry: (entryId: string) => void;
	readonly onStageObjectLibraryReplacement: (
		draft: EditorObjectLibraryReplacementDraft,
	) => void;
	readonly onStageAuthoringOperations: (
		entry: LevelEditorQueuedAuthoringOperation,
	) => void;
	readonly onRemoveQueuedAuthoringOperationEntry: (entryId: string) => void;
	readonly onRemoveStagedFieldEdit: (stableId: string, path: string) => void;
	readonly stagedFieldObjectLabel: (stableId: string) => string;
};

const {
	workspace,
	editorSession,
	tabs,
	selectedTabId,
	selectedCommandPlanId,
	status,
	objectLibraryPanelModel,
	selectedObjectLibraryEntryId,
	serializedEnvironmentModel,
	serializedNpcCatalog,
	selectedStableIds,
	authoringQueue,
	stagedPublishReadiness,
	stagedFieldEdits,
	queuedOperationSummaries,
	latestTransaction,
	outputLog,
	runtimeTelemetry,
	runtimeTelemetryState,
	runtimeLifecycleLabel,
	runtimePositionLabel,
	runtimeHealthLabel,
	runtimeInputLabel,
	runtimeChargeLabel,
	onSelectTab,
	onSelectCommandPlan,
	onSelectObjectLibraryEntry,
	onStageObjectLibraryReplacement,
	onStageAuthoringOperations,
	onRemoveQueuedAuthoringOperationEntry,
	onRemoveStagedFieldEdit,
	stagedFieldObjectLabel,
}: Props = $props();

const selectedCommandPlan = $derived(
	selectedCommandPlanId === "publish"
		? workspace.commandPlans.publish
		: workspace.commandPlans.build,
);
</script>

<section class="editor-bottom-dock" aria-label="Editor bottom dock">
	<nav
		class="editor-bottom-dock-tabs"
		aria-label="Bottom dock panels"
		role="tablist"
	>
		{#each tabs as tab}
			<button
				id={`editor-bottom-dock-tab-${tab.id}`}
				type="button"
				role="tab"
				class:active-bottom-dock-tab={selectedTabId === tab.id}
				aria-controls="editor-bottom-dock-panel"
				aria-selected={selectedTabId === tab.id}
				data-bottom-dock-tab={tab.id}
				onclick={() => onSelectTab(tab.id)}
			>
				<span>{tab.label}</span>
				<small>{tab.itemCount}</small>
			</button>
		{/each}
	</nav>

	<div
		id="editor-bottom-dock-panel"
		class="editor-bottom-dock-primary"
		role="tabpanel"
		aria-labelledby={`editor-bottom-dock-tab-${selectedTabId}`}
		data-active-bottom-dock-tab={selectedTabId}
	>
		{#if selectedTabId === "content-browser"}
			<div class="editor-bottom-dock-content-grid">
				<LevelEditorObjectLibraryPanel
					model={objectLibraryPanelModel}
					selectedEntryId={selectedObjectLibraryEntryId}
					onSelectEntry={onSelectObjectLibraryEntry}
					onStageReplacement={onStageObjectLibraryReplacement}
					onStageAuthoringOperations={onStageAuthoringOperations}
					onRemoveAuthoringOperations={onRemoveQueuedAuthoringOperationEntry}
				/>
				<LevelEditorEnvironmentPanel
					serializedEnvironmentModel={serializedEnvironmentModel}
					onStageAuthoringOperations={onStageAuthoringOperations}
				/>
				<LevelEditorNpcPanel
					serializedNpcCatalog={serializedNpcCatalog}
					selectedRuntimeSceneId={workspace.selectedRuntimeSceneId}
					selectedLevelId={workspace.selectedLevelId}
					onStageAuthoringOperations={onStageAuthoringOperations}
				/>
				<LevelEditorCameraPanel
					selectedRuntimeSceneId={workspace.selectedRuntimeSceneId}
				/>
				<LevelEditorAiAssetLab
					runtimeSceneId={workspace.selectedRuntimeSceneId}
					selectedStableIds={selectedStableIds}
					onStageAuthoringOperations={onStageAuthoringOperations}
				/>
			</div>
		{:else if selectedTabId === "validation-report"}
			<section
				class="editor-panel editor-validation-report"
				aria-label="Validation report"
			>
				<header class="editor-panel-header">
					<h2>Validation Report</h2>
					<span>
						{workspace.validationReport.errorCount} errors / {workspace.validationReport.warningCount} warnings
					</span>
				</header>
				<div class="editor-status-list">
					{#if workspace.validationReport.items.length === 0}
						<span>no workspace validation findings</span>
					{:else}
						{#each workspace.validationReport.items as item}
							<span title={item.id}>
								{item.severity}: {item.category} / {item.message}
							</span>
						{/each}
					{/if}
				</div>
				<p class="editor-status" data-state={status.kind}>{status.label}</p>
			</section>
		{:else if selectedTabId === "command-plan" || selectedTabId === "publish-gates"}
			<section class="editor-panel editor-command-plan" aria-label="Command plan">
				<header class="editor-panel-header">
					<h2>
						{selectedTabId === "publish-gates" ? "Publish Gates" : "Commands"}
					</h2>
					<span>{workspace.authoring.status}</span>
				</header>
				<dl class="editor-facts editor-facts-compact">
					<div>
						<dt>Draft Target</dt>
						<dd>{workspace.authoring.saveTarget?.targetFile ?? "not registered"}</dd>
					</div>
					<div>
						<dt>Authoring Records</dt>
						<dd>{workspace.authoring.recordCount}</dd>
					</div>
					<div>
						<dt>Document Hash</dt>
						<dd>{workspace.authoring.documentContentHash ?? "blocked"}</dd>
					</div>
					<div>
						<dt>Writable Targets</dt>
						<dd>
							{workspace.authoring.writableTargetCount} / {workspace.authoring.ownerTargetCount}
						</dd>
					</div>
				</dl>
				<div class="editor-plan-switcher" role="tablist" aria-label="Command plans">
					<button
						type="button"
						class:selected-plan={selectedCommandPlanId === "build"}
						onclick={() => onSelectCommandPlan("build")}
					>
						Build
					</button>
					<button
						type="button"
						class:selected-plan={selectedCommandPlanId === "publish"}
						onclick={() => onSelectCommandPlan("publish")}
					>
						Publish Gates
					</button>
				</div>
				<ol class="editor-plan-list">
					{#each selectedCommandPlan.steps as step}
						<li>
							<strong>{step.phase}</strong>
							<span>{step.label}</span>
							<small>
								{step.command ?? step.action}
								{step.writesAuthoredSource ? " / writes authored source" : ""}
							</small>
						</li>
					{/each}
				</ol>
				{#if latestTransaction}
					<div class="editor-transaction-preview">
						<strong>{latestTransaction.id}</strong>
						<span>
							{latestTransaction.operations.length} operations / {latestTransaction.baseDocumentHash}
						</span>
					</div>
				{/if}
				{#if workspace.authoring.errors.length > 0}
					<div class="editor-status-list">
						{#each workspace.authoring.errors as error}
							<span>{error}</span>
						{/each}
					</div>
				{/if}
			</section>
		{:else if selectedTabId === "staged-operations"}
			<section
				class="editor-panel editor-staged-operations"
				aria-label="Staged operations"
			>
				<header class="editor-panel-header">
					<h2>Staged Operations</h2>
					<span>{authoringQueue.operationCount}</span>
				</header>
				<dl class="editor-facts editor-facts-compact">
					<div>
						<dt>Field Edits</dt>
						<dd>{authoringQueue.stagedFieldEditCount}</dd>
					</div>
					<div>
						<dt>Queued Entries</dt>
						<dd>{authoringQueue.queuedOperationEntryCount}</dd>
					</div>
					<div>
						<dt>Total Operations</dt>
						<dd>{authoringQueue.operationCount}</dd>
					</div>
					<div>
						<dt>Owner Write</dt>
						<dd>{stagedPublishReadiness.label}</dd>
					</div>
					<div>
						<dt>Undo / Redo</dt>
						<dd>
							{authoringQueue.undoDepth} / {authoringQueue.redoDepth}
						</dd>
					</div>
					<div>
						<dt>History Limit</dt>
						<dd>{authoringQueue.historyLimit}</dd>
					</div>
				</dl>
				{#if stagedPublishReadiness.reasons.length > 0}
					<div class="editor-status-list" aria-label="Staged publish readiness">
						{#each stagedPublishReadiness.reasons as reason}
							<span>{reason}</span>
						{/each}
					</div>
				{/if}
				{#if stagedFieldEdits.length > 0}
					<ol class="editor-staged-operation-list" aria-label="Staged field edits">
						{#each stagedFieldEdits as edit}
							<li>
								<div>
									<strong>{stagedFieldObjectLabel(edit.stableId)}</strong>
									<span>{edit.label} / {edit.path}</span>
								</div>
								<small>
									{String(edit.before)} -> {String(edit.after)}
								</small>
								<button
									type="button"
									onclick={() => onRemoveStagedFieldEdit(edit.stableId, edit.path)}
								>
									Revert
								</button>
							</li>
						{/each}
					</ol>
				{/if}
				{#if queuedOperationSummaries.length > 0}
					<ol class="editor-staged-operation-list" aria-label="Queued authoring operations">
						{#each queuedOperationSummaries as summary}
							<li>
								<div>
									<strong>{summary.label}</strong>
									<span>{summary.id} / {summary.statusLabel}</span>
								</div>
								<small>
									{summary.persistenceLabel}: {summary.detail}
									{#if summary.reasons.length > 0}
										{" "}
										{summary.reasons.join(" ")}
									{/if}
									{" "}
									({summary.editOperationCount} edit operations /
									{summary.saveOperationCount} save operations)
								</small>
								<button
									type="button"
									onclick={() => onRemoveQueuedAuthoringOperationEntry(summary.id)}
								>
									Remove
								</button>
							</li>
						{/each}
					</ol>
				{:else if stagedFieldEdits.length === 0}
					<p class="editor-status" data-state="ready">
						No queued object-library, viewport, AI, NPC, environment, or camera
						operations.
					</p>
				{/if}
			</section>
		{:else if selectedTabId === "output-log"}
			<section class="editor-panel editor-output-log" aria-label="Output log">
				<header class="editor-panel-header">
					<h2>Output Log</h2>
					<span>{outputLog.length}</span>
				</header>
				<ol>
					{#each outputLog as entry}
						<li data-log-level={entry.level}>
							<strong>{entry.source}</strong>
							<span>{entry.message}</span>
						</li>
					{/each}
				</ol>
			</section>
		{/if}
	</div>

	<div class="editor-bottom-dock-secondary" aria-label="Secondary diagnostics">
		<details class="editor-panel editor-live-runtime" aria-label="Live runtime status">
			<summary class="editor-panel-header">
				<h2>Live Runtime</h2>
				<span data-telemetry-state={runtimeTelemetryState}>
					{runtimeTelemetryState}
				</span>
			</summary>
			<div class="editor-runtime-topline">
				<strong>Megameal</strong>
				<span>{runtimeLifecycleLabel}</span>
			</div>
			<dl class="editor-runtime-grid" aria-live="polite">
				<div>
					<dt>Health</dt>
					<dd>{runtimeHealthLabel}</dd>
				</div>
				<div>
					<dt>Collected</dt>
					<dd>{runtimeTelemetry?.collectedCount ?? "pending"}</dd>
				</div>
				<div>
					<dt>Remaining</dt>
					<dd>{runtimeTelemetry?.remainingCollectibles ?? "pending"}</dd>
				</div>
				<div>
					<dt>Position</dt>
					<dd>{runtimePositionLabel}</dd>
				</div>
				<div>
					<dt>Tick</dt>
					<dd>{runtimeTelemetry?.tick ?? "pending"}</dd>
				</div>
				<div>
					<dt>Move</dt>
					<dd>
						{runtimeTelemetry ? (runtimeTelemetry.moving ? "active" : "idle") : "pending"}
					</dd>
				</div>
				<div>
					<dt>Input</dt>
					<dd>{runtimeInputLabel}</dd>
				</div>
				<div>
					<dt>Charge</dt>
					<dd>{runtimeChargeLabel}</dd>
				</div>
			</dl>
		</details>
		<details class="editor-panel editor-collision-preview" aria-label="Collision preview">
			<summary class="editor-panel-header">
				<h2>Collision Preview</h2>
				<span>
					{editorSession.preview.status === "ready"
						? editorSession.preview.entryCount
						: "no draft"}
				</span>
			</summary>
			<LevelEditorPreviewControls
				selectedRuntimeSceneId={workspace.selectedRuntimeSceneId}
				serializedPreviewPatch={editorSession.preview.serializedPatch}
				previewStatus={editorSession.preview.status}
				missingReason={editorSession.preview.missingReason}
				onStageAuthoringOperations={onStageAuthoringOperations}
			/>
		</details>
		<details class="editor-panel editor-terrain-bake" aria-label="Terrain bake">
			<summary class="editor-panel-header">
				<h2>Terrain / Bake</h2>
				<span>{editorSession.terrain.packageCount} packages</span>
			</summary>
			<dl class="editor-facts editor-facts-compact">
				<div>
					<dt>Scene</dt>
					<dd>{editorSession.terrain.selectedRuntimeSceneId}</dd>
				</div>
				<div>
					<dt>Collision Chunks</dt>
					<dd>{editorSession.terrain.collisionChunkCount}</dd>
				</div>
				<div>
					<dt>Walkable</dt>
					<dd>{editorSession.terrain.walkableChunkCount}</dd>
				</div>
				<div>
					<dt>Bake Hash</dt>
					<dd>{editorSession.bake.derivedBakeHash ?? "not available"}</dd>
				</div>
			</dl>
		</details>
	</div>
</section>
