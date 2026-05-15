<script lang="ts">
import { onDestroy, onMount } from 'svelte'
import type { EditorSceneDocument } from '../engine/sceneDocumentTypes'
import {
  computeEditorPublishBakePlan,
  createEditorPublishBakePlanMetadataFromReadiness,
  getEditorPublishBakeStepRows,
} from './editorPublishBakePlan'
import {
  type EditorPublishPipelineState,
  createInitialEditorPublishPipelineState,
} from './editorPublishReadinessContracts'
import {
  createEditorPublishReadinessController,
  createInitialEditorPublishReadinessState,
} from './editorPublishReadinessController'
import {
  getPublishReadinessAdvisoryActions,
  getPublishReadinessBudgetIssues,
  getPublishReadinessGateFailures,
  getPublishReadinessPipelineSteps,
  getPublishReadinessPublishBlockReason,
  getPublishReadinessRequiredActions,
} from './editorPublishReadinessPresentation'
import {
  type EditorTerrainStatusSnapshot,
  describeEditorTerrainPipeline,
} from './editorTerrainPipeline'

export let levelId = ''
export let editorScene: EditorSceneDocument | null = null
export let groundTerrainPublishPending = false
export let terrainPipelinePending = false
export let terrainStatus: EditorTerrainStatusSnapshot | null = null
export let worldPartitionCookPending = false
export let publishPipelineState: EditorPublishPipelineState =
  createInitialEditorPublishPipelineState()
export let onPublishLevel: () => void = () => {}
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
      terrainSourceAssets: terrainStatus?.sourceAssets,
      missingTerrainSourceAssets: terrainStatus?.missingSourceAssets,
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
  worldPartitionCookPending ||
  publishPipelineState.running
$: publishBlockReason = getPublishReadinessPublishBlockReason(
  publishReadiness,
  {
    loading: publishReadiness.loading,
    error: publishReadiness.error,
    pipelinePending,
  },
)
$: pipelineSteps = getPublishReadinessPipelineSteps(publishReadiness, {
  loading: publishReadiness.loading,
  error: publishReadiness.error,
  pipelinePending,
})
$: bakePlan =
  publishPipelineState.plan?.levelId === levelId
    ? publishPipelineState.plan
    : computeEditorPublishBakePlan({
        levelId,
        scene: editorScene,
        metadata:
          createEditorPublishBakePlanMetadataFromReadiness(publishReadiness),
      })
$: bakeStepRows = getEditorPublishBakeStepRows(bakePlan, publishPipelineState)
$: publishSummary = publishPipelineState.summary
$: publishRunBlockReason = publishReadiness.loading
  ? 'Readiness check is still loading.'
  : publishReadiness.error
    ? publishReadiness.error
    : pipelinePending
      ? 'A bake, cook, or publish operation is still running.'
      : bakePlan.blockers[0] || ''
$: publishDisabled = Boolean(publishRunBlockReason)
$: terrainPipeline = describeEditorTerrainPipeline({
  scene: editorScene,
  terrainStatus,
})
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

    <div class="editor-status-card">
      <div class="editor-status-title">Terrain Contract</div>
      <div class="editor-chip-row">
        <span class="editor-chip">{terrainPipeline.modeLabel}</span>
        <span class:ready={terrainPipeline.renderChunkStatus.state === 'ready'} class:warn={terrainPipeline.renderChunkStatus.state === 'warning' || terrainPipeline.renderChunkStatus.state === 'inactive'} class:danger={terrainPipeline.renderChunkStatus.state === 'blocked'} class="editor-chip">render {terrainPipeline.renderChunkStatus.state}</span>
        <span class:ready={terrainPipeline.collisionStatus.state === 'ready'} class:warn={terrainPipeline.collisionStatus.state === 'warning' || terrainPipeline.collisionStatus.state === 'inactive'} class:danger={terrainPipeline.collisionStatus.state === 'blocked'} class="editor-chip">collision {terrainPipeline.collisionStatus.state}</span>
        <span class:ready={terrainPipeline.publishStatus.state === 'ready'} class:warn={terrainPipeline.publishStatus.state === 'warning'} class:danger={terrainPipeline.publishStatus.state === 'blocked'} class="editor-chip">publish {terrainPipeline.publishStatus.state}</span>
      </div>
      <div class="save-message">Authoritative visual source: {terrainPipeline.authoritativeVisualSource}</div>
      <div class="save-message">Authority: {terrainPipeline.authoritySummary}</div>
      <div class="save-message">Required action: {terrainPipeline.requiredAction}</div>
      <div class="save-message">Source GLB/GLTF: {terrainPipeline.sourceGlbUrls[0] ?? 'none recorded'}</div>
      <div class="save-message">Source existence: {terrainPipeline.sourceExistenceStatus.detail}</div>
      <div class="save-message">Source provenance: {terrainPipeline.sourceHash || terrainPipeline.sourceProvenance}</div>
      <div class="save-message">Runtime manifest: {terrainPipeline.manifestUrl || 'none recorded'}</div>
      <div class="save-message">Fallback surface: {terrainPipeline.fallbackSurfaceStatus.detail}</div>
      {#each terrainPipeline.blockers as blocker}
        <div class="save-message error-message">{blocker}</div>
      {/each}
      {#each terrainPipeline.warnings as warning}
        <div class="save-message">{warning}</div>
      {/each}
    </div>

    <div class="editor-status-card">
      <div class="editor-status-title">Publish Build Plan</div>
      {#each bakeStepRows as step (step.id)}
        <div class="editor-chip-row" aria-label={`${step.label}: ${step.statusLabel}`}>
          <span class:ready={step.state === 'passed'} class:warn={step.state === 'pending' || step.state === 'running' || step.state === 'skipped'} class:danger={step.state === 'failed'} class="editor-chip">{step.statusLabel}</span>
          <span class="save-message">{step.label}</span>
        </div>
        {#each step.reasons as reason}
          <div class="save-message">{reason}</div>
        {/each}
        {#if step.message}
          <div class="save-message" class:error-message={step.state === 'failed'}>{step.message}</div>
        {/if}
        {#if step.artifacts.length}
          <div class="save-message">Artifacts: {step.artifacts.join(', ')}</div>
        {/if}
        {#if step.stdout || step.stderr}
          <details>
            <summary class="save-message">Command output</summary>
            <textarea readonly rows="5">{[step.stdout, step.stderr].filter(Boolean).join('\n')}</textarea>
          </details>
        {/if}
      {/each}
      {#if bakePlan.warnings.length}
        {#each bakePlan.warnings as warning}
          <div class="save-message error-message">{warning}</div>
        {/each}
      {/if}
      {#if bakePlan.blockers.length}
        {#each bakePlan.blockers as blocker}
          <div class="save-message error-message">{blocker}</div>
        {/each}
      {/if}
    </div>

    {#if publishSummary}
      <div class="editor-status-card">
        <div class="editor-status-title">Publish Summary</div>
        <div class="save-message">{publishSummary.title} ({publishSummary.levelId}) runtime published.</div>
        <div class="save-message">Steps run: {publishSummary.stepsRun.length}</div>
        <div class="save-message">Registry deployed: {publishSummary.registryDeployed ? 'yes' : 'no'}</div>
        {#if publishSummary.artifacts.length}
          <div class="save-message">Generated artifacts: {publishSummary.artifacts.join(', ')}</div>
        {/if}
      </div>
    {/if}

    {#if publishPipelineState.error}
      <div class="editor-status-card">
        <div class="editor-status-title">Publish Failure</div>
        <div class="save-message error-message">{publishPipelineState.error}</div>
      </div>
    {/if}

    <div class="editor-status-card">
      <div class="editor-status-title">Production Flow</div>
      {#each pipelineSteps as step (step.id)}
        <div class="editor-chip-row" aria-label={`${step.label}: ${step.statusLabel}`}>
          <span class:ready={step.state === 'success'} class:warn={step.state === 'warning' || step.state === 'pending' || step.state === 'next'} class:danger={step.state === 'failure'} class="editor-chip">{step.statusLabel}</span>
          <span class="save-message">{step.label}: {step.reason}</span>
        </div>
        {#if step.nextAction}
          <div class="save-message">Next: {step.nextAction}</div>
        {/if}
      {/each}
    </div>

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
          <div class="save-message">{metric.label}: {metric.value} / {metric.budget ?? 'unknown'}</div>
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
      on:click={onPublishLevel}
    >
      {publishPipelineState.running ? 'Publishing Level...' : 'Publish Level'}
    </button>
    {#if publishRunBlockReason}
      <div class="save-message error-message">{publishRunBlockReason}</div>
    {:else if publishBlockReason}
      <div class="save-message">{publishBlockReason} Publish can run the build, but deployment waits for build and audit success.</div>
    {:else}
      <div class="save-message">Publish will save the scene, run required bake and cook steps, audit the runtime, then deploy the registry.</div>
    {/if}
    <button
      class="full"
      disabled={groundTerrainPublishPending || publishPipelineState.running}
      data-sfx-hover="hover-soft"
      data-sfx-click="confirm"
      on:click={onPublishGroundTerrainContracts}
    >
      {groundTerrainPublishPending ? 'Publishing Runtime Contracts...' : 'Publish Terrain Contracts'}
    </button>
  {/if}
  <div class="button-row compact editor-mt-sm">
    <button data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={() => refreshPublishReadiness(true)}>Refresh</button>
    {#if publishReadiness.commands.length}
      <button data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={() => void navigator.clipboard?.writeText?.(publishReadiness.commands.map(command => command.command).join('\n'))}>Copy Commands</button>
    {/if}
  </div>
</div>
