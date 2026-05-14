<script lang="ts">
import RuntimeDiagnosticsPanel from '../ui/RuntimeDiagnosticsPanel.svelte'
import type { HunyuanJobStatus } from './editorHunyuanJobPolling'
import {
  type EditorPublishPipelineState,
  createInitialEditorPublishPipelineState,
} from './editorPublishReadinessContracts'

export let saveMessage = ''
export let runtimeAssetFailures: Array<{
  id: string
  source: string
  message: string
  updatedAt: number
}> = []
export let recentHunyuanJobs: HunyuanJobStatus[] = []
export let hunyuanJobsLoading = false
export let hunyuanJobsError = ''
export let selectedHunyuanJobId = ''
export let publishPipelineState: EditorPublishPipelineState =
  createInitialEditorPublishPipelineState()
export let onRefreshRecentJobs: () => void = () => {}

$: selectedHunyuanJob =
  recentHunyuanJobs.find(job => job.id === selectedHunyuanJobId) ??
  recentHunyuanJobs[0] ??
  null
$: publishSummary = publishPipelineState.summary

function formatTimestamp(timestamp: number) {
  if (!timestamp) return 'never'
  return new Date(timestamp).toLocaleTimeString()
}
</script>

<div class="editor-section">
  <div class="label">Output</div>
  <div class="tuple-group">
    <div class="tuple-label">Recent Operation</div>
    <div class="save-message">{saveMessage || 'No recent editor operation.'}</div>
  </div>
  {#if publishPipelineState.error}
    <div class="save-message error-message">{publishPipelineState.error}</div>
  {/if}
  {#if publishSummary}
    <div class="editor-status-card editor-mt-sm">
      <div class="editor-status-title">Publish Summary</div>
      <div class="save-message">{publishSummary.title} ({publishSummary.levelId}) runtime published.</div>
      <div class="save-message">Steps run: {publishSummary.stepsRun.length}</div>
      <div class="save-message">Registry deployed: {publishSummary.registryDeployed ? 'yes' : 'no'}</div>
      {#if publishSummary.artifacts.length}
        <div class="save-message">Artifacts: {publishSummary.artifacts.join(', ')}</div>
      {/if}
    </div>
  {/if}
</div>

<div class="editor-section">
  <div class="label">Runtime Diagnostics</div>
  <RuntimeDiagnosticsPanel title="Runtime Status" compact={true} />
</div>

<div class="editor-section">
  <div class="label">Asset Failures</div>
  {#if runtimeAssetFailures.length}
    {#each runtimeAssetFailures.slice(0, 8) as failure (failure.id)}
      <div class="save-message error-message">{failure.source}: {failure.message} ({formatTimestamp(failure.updatedAt)})</div>
    {/each}
  {:else}
    <div class="save-message">No recent runtime asset failures.</div>
  {/if}
</div>

<div class="editor-section">
  <div class="label">AI Job Output</div>
  <div class="button-row compact">
    <button disabled={hunyuanJobsLoading} data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={onRefreshRecentJobs}>
      {hunyuanJobsLoading ? 'Refreshing...' : 'Refresh Jobs'}
    </button>
  </div>
  {#if hunyuanJobsError}
    <div class="save-message error-message">{hunyuanJobsError}</div>
  {:else if selectedHunyuanJob}
    <div class="tuple-group editor-mt-sm">
      <div class="tuple-label">Latest Job</div>
      <input class="text-input" value={`${selectedHunyuanJob.status} · ${selectedHunyuanJob.sourceName || selectedHunyuanJob.id}`} readonly />
    </div>
    {#if selectedHunyuanJob.result?.assetUrl}
      <div class="tuple-group">
        <div class="tuple-label">Output Asset</div>
        <input class="text-input" value={selectedHunyuanJob.result.assetUrl} readonly />
      </div>
    {/if}
    {#if selectedHunyuanJob.error || selectedHunyuanJob.result?.message}
      <div class="save-message" class:error-message={Boolean(selectedHunyuanJob.error)}>
        {selectedHunyuanJob.error || selectedHunyuanJob.result?.message}
      </div>
    {/if}
  {:else}
    <div class="save-message">No recent AI jobs.</div>
  {/if}
</div>
