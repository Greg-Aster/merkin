<script lang="ts">
import { onDestroy, onMount } from 'svelte'
import type { EditorSceneDocument } from '../engine/sceneDocumentTypes'
import {
  createEditorPublishReadinessController,
  createInitialEditorPublishReadinessState,
} from './editorPublishReadinessController'
import {
  getPublishReadinessAdvisoryActions,
  getPublishReadinessBudgetIssues,
  getPublishReadinessGateFailures,
  getPublishReadinessPublishBlockReason,
  getPublishReadinessRequiredActions,
} from './editorPublishReadinessPresentation'

export let levelId = ''
export let editorScene: EditorSceneDocument | null = null
export let groundTerrainPublishPending = false
export let terrainPipelinePending = false
export let worldPartitionCookPending = false
export let onPublishGroundTerrainContracts: () => void = () => {}

let publishReadiness = createInitialEditorPublishReadinessState()
let mounted = false

const publishReadinessController = createEditorPublishReadinessController({
  onState: state => {
    publishReadiness = state
  },
})

function refreshPublishReadiness(force = false) {
  void publishReadinessController.refresh(
    {
      levelId,
      scene: editorScene,
    },
    { force },
  )
}

$: if (mounted) {
  refreshPublishReadiness()
}

onMount(() => {
  mounted = true
  refreshPublishReadiness()
})

onDestroy(() => {
  publishReadinessController.destroy()
})

$: requiredActions = getPublishReadinessRequiredActions(publishReadiness)
$: advisoryActions = getPublishReadinessAdvisoryActions(publishReadiness)
$: gateFailures = getPublishReadinessGateFailures(publishReadiness)
$: budgetIssues = getPublishReadinessBudgetIssues(publishReadiness)
$: pipelinePending =
  groundTerrainPublishPending ||
  terrainPipelinePending ||
  worldPartitionCookPending
$: publishBlockReason = getPublishReadinessPublishBlockReason(
  publishReadiness,
  {
    loading: publishReadiness.loading,
    error: publishReadiness.error,
    pipelinePending,
  },
)
$: publishDisabled = Boolean(publishBlockReason)
</script>

<div class="editor-section" aria-live="polite">
  <div class="label">Publish Readiness</div>
  {#if publishReadiness.loading}
    <div class="save-message">Loading pipeline contracts...</div>
  {:else if publishReadiness.error}
    <div class="save-message error-message">Publish readiness unavailable: {publishReadiness.error}</div>
  {:else}
    <div class="editor-chip-row" aria-label="Publish readiness summary">
      <span class:ready={publishReadiness.status === 'ready'} class:warn={publishReadiness.status === 'warning'} class:danger={publishReadiness.status === 'blocker'} class="editor-chip">{publishReadiness.headline}</span>
      <span class:danger={publishReadiness.blockers.length > 0} class:ready={publishReadiness.blockers.length === 0} class="editor-chip">{publishReadiness.blockers.length} blocker(s)</span>
      <span class:warn={publishReadiness.warnings.length > 0} class:ready={publishReadiness.warnings.length === 0} class="editor-chip">{publishReadiness.warnings.length} warning(s)</span>
    </div>
    <div class="save-message">Build: {publishReadiness.buildId || 'unversioned'}</div>
    <div class="save-message">Generated: {publishReadiness.generatedAt || 'unknown'}</div>

    {#if gateFailures.length}
      <div class="editor-status-card">
        <div class="editor-status-title">Validation Failures</div>
        {#each gateFailures.slice(0, 8) as failure (`${failure.panel.id}:${failure.item.id}`)}
          <div class="save-message" class:error-message={failure.item.severity === 'blocker'}>{failure.item.severity}: {failure.panel.label} - {failure.item.label}: {failure.item.detail}</div>
        {/each}
        {#if gateFailures.length > 8}
          <div class="save-message">{gateFailures.length - 8} more validation issue(s).</div>
        {/if}
      </div>
    {:else}
      <div class="editor-status-card">
        <div class="editor-status-title">Validation Gates</div>
        <div class="save-message">All cooked manifest, spawn, collision, asset, material, LOD, and prefab gates are ready.</div>
      </div>
    {/if}

    {#if budgetIssues.length}
      <div class="editor-status-card">
        <div class="editor-status-title">Budget Issues</div>
        {#each budgetIssues as metric (metric.label)}
          <div class="save-message error-message">{metric.label}: {metric.value} / {metric.budget ?? 'unknown'}</div>
        {/each}
      </div>
    {/if}

    {#if requiredActions.length}
      <div class="editor-status-card">
        <div class="editor-status-title">Required Publish Actions</div>
        {#each requiredActions as step (step.id)}
          <div class="save-message">run: {step.label} - {step.command}</div>
          <div class="save-message">Output: {step.expectedOutput}</div>
        {/each}
      </div>
    {/if}

    {#if advisoryActions.length}
      <div class="editor-status-card">
        <div class="editor-status-title">Conditional Actions</div>
        {#each advisoryActions as step (step.id)}
          <div class="save-message">skip: {step.label} - {step.reason}</div>
        {/each}
      </div>
    {/if}

    {#if publishReadiness.commands.length}
      <div class="editor-status-card">
        <div class="editor-status-title">Command Queue</div>
        {#each publishReadiness.commands as command (command.id)}
          <div class="save-message">{command.command} - {command.reason}</div>
        {/each}
      </div>
    {/if}

    {#if publishReadiness.panels.length}
      <div class="editor-chip-row" aria-label="Production gate status">
        {#each publishReadiness.panels as panel (panel.id)}
          <span class:ready={panel.severity === 'ready'} class:warn={panel.severity === 'warning'} class:danger={panel.severity === 'blocker'} class="editor-chip">{panel.label}</span>
        {/each}
      </div>
    {:else}
      <div class="editor-status-card">
        <div class="editor-status-title">Validation Sections</div>
        {#each publishReadiness.sections as section (section.id)}
          <div class="save-message">{section.severity}: {section.label} - {section.detail}</div>
        {/each}
      </div>
    {/if}

    <button
      class="full"
      disabled={publishDisabled}
      data-sfx-hover="hover-emphasis"
      data-sfx-click="confirm"
      on:click={onPublishGroundTerrainContracts}
    >
      {groundTerrainPublishPending ? 'Publishing Runtime...' : 'Publish Runtime Contracts'}
    </button>
    {#if publishBlockReason}
      <div class="save-message error-message">{publishBlockReason}</div>
    {:else}
      <div class="save-message">Publish will save the scene, regenerate runtime manifests, and run the engine audit.</div>
    {/if}
  {/if}
  <div class="button-row compact editor-mt-sm">
    <button data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={() => refreshPublishReadiness(true)}>Refresh</button>
    {#if publishReadiness.commands.length}
      <button data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={() => void navigator.clipboard?.writeText?.(publishReadiness.commands.map(command => command.command).join('\n'))}>Copy Commands</button>
    {/if}
  </div>
</div>
