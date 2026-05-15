<script lang="ts">
import { getLevelRuntimeContract } from '../engine/levelContracts'
import { createLevelBuildReport } from '../engine/levelValidation'
import { withEditorSceneEngineData } from '../engine/sceneDocumentRuntime'
import {
  fpsStore,
  frameTimeStore,
  longTaskStore,
  memoryStore,
  qualityLevelStore,
  renderInfoStore,
} from '../features/performance/stores/performanceStore'
import { getRuntimeFrameRatePolicy } from '../features/performance/utils/runtimeFrameRatePolicy'
import {
  classifyRuntimePerformancePressure,
  formatRuntimePressureBytes,
} from '../features/performance/utils/runtimePerformancePressure'
import { runtimeStreamingTelemetrySummaryStore } from '../stores/runtimeStreamingTelemetry'
import {
  type EditorPublishPipelineState,
  createInitialEditorPublishPipelineState,
} from './editorPublishReadinessContracts'
import type { EditorSceneDocument, EditorSceneNode } from './editorTypes'

type PerformanceMetric = {
  label: string
  value: number
  budget?: number
  over: boolean
}

export let levelId = ''
export let editorScene: EditorSceneDocument | null = null
export let editorNodes: EditorSceneNode[] = []
export let publishPipelineState: EditorPublishPipelineState =
  createInitialEditorPublishPipelineState()
export let onOpenBuildTools: () => void = () => {}
export let onOpenCollisionTools: () => void = () => {}
export let onSelectNodes: (nodeIds: string[], label: string) => void = () => {}

const meshCollisionQualities = new Set([
  'convexHull',
  'simplifiedMesh',
  'trimesh',
])
const runtimeRenderableKinds = new Set([
  'asset',
  'primitive',
  'prefab',
  'light',
])

function getBuildReport(scene: EditorSceneDocument | null) {
  if (!scene) return null

  try {
    const sceneWithEngine = withEditorSceneEngineData(scene)
    return createLevelBuildReport(sceneWithEngine.engine!.levelDefinition)
  } catch {
    return null
  }
}

function isCollisionEnabled(node: EditorSceneNode) {
  const collision = node.collision
  if (!collision) return false
  if (collision.mode === 'none') return false
  if (collision.intent === 'none') return false
  if (collision.enabled === false) return false
  return true
}

function isMeshCollisionNode(node: EditorSceneNode) {
  const collision = node.collision
  if (!collision || !isCollisionEnabled(node)) return false
  return (
    collision.shape === 'trimesh' ||
    Boolean(collision.colliderUrl) ||
    meshCollisionQualities.has(collision.quality ?? '')
  )
}

function isSourceLodCollisionNode(node: EditorSceneNode) {
  const collision = node.collision
  return (
    isCollisionEnabled(node) &&
    (collision?.lodTier === 'source' || collision?.lodSourceTier === 'source')
  )
}

function isRuntimeRenderableNode(node: EditorSceneNode) {
  return node.visible !== false && runtimeRenderableKinds.has(node.kind)
}

function formatMetricValue(metric: PerformanceMetric) {
  if (Number.isFinite(metric.budget))
    return `${metric.value} / ${metric.budget}`
  return String(metric.value)
}

$: buildReport = getBuildReport(editorScene)
$: activeLevelId = levelId || editorScene?.levelId || buildReport?.levelId || ''
$: runtimeContract = getLevelRuntimeContract(activeLevelId)
$: dirtyCollisionNodes = editorNodes.filter(
  node =>
    isCollisionEnabled(node) &&
    (node.collision?.generationStatus === 'dirty' ||
      node.collision?.generationStatus === 'failed'),
)
$: meshCollisionNodes = editorNodes.filter(isMeshCollisionNode)
$: sourceLodCollisionNodes = editorNodes.filter(isSourceLodCollisionNode)
$: neverCullNodes = editorNodes.filter(
  node =>
    isRuntimeRenderableNode(node) &&
    node.renderPolicy?.cullingPolicy === 'never',
)
$: runtimeBudgetNodes = editorNodes.filter(
  node =>
    isRuntimeRenderableNode(node) &&
    node.renderPolicy?.cullingPolicy !== 'never',
)
$: terrainRuntimeMode =
  editorScene?.settings?.level?.ground?.terrainRuntimeMode ??
  editorScene?.settings?.level?.ground?.mode ??
  'scene-authored'
$: performanceMetrics = [
  {
    label: 'Actors',
    value: buildReport?.actorCount ?? editorNodes.length,
    over: false,
  },
  {
    label: 'Runtime Assets',
    value: buildReport?.runtimeReadinessContract.runtimeAssetUrls.length ?? 0,
    budget: runtimeContract.maxRuntimeAssetCount,
    over:
      (buildReport?.runtimeReadinessContract.runtimeAssetUrls.length ?? 0) >
      runtimeContract.maxRuntimeAssetCount,
  },
  {
    label: 'Mesh Collision',
    value: buildReport?.trimeshActorCount ?? meshCollisionNodes.length,
    budget: runtimeContract.maxTrimeshActors,
    over:
      (buildReport?.trimeshActorCount ?? meshCollisionNodes.length) >
      runtimeContract.maxTrimeshActors,
  },
  {
    label: 'Primitives',
    value: buildReport?.primitiveActorCount ?? 0,
    budget: runtimeContract.maxPrimitiveActorCount,
    over:
      (buildReport?.primitiveActorCount ?? 0) >
      runtimeContract.maxPrimitiveActorCount,
  },
  {
    label: 'Never Cull',
    value: buildReport?.neverCullActorCount ?? neverCullNodes.length,
    budget: runtimeContract.maxNeverCullActorCount,
    over:
      (buildReport?.neverCullActorCount ?? neverCullNodes.length) >
      runtimeContract.maxNeverCullActorCount,
  },
  {
    label: 'Fireflies',
    value: buildReport?.gameplayFireflyActorCount ?? 0,
    budget: runtimeContract.maxGameplayFireflyCount,
    over:
      (buildReport?.gameplayFireflyActorCount ?? 0) >
      runtimeContract.maxGameplayFireflyCount,
  },
]
$: performanceSystems = [
  {
    label: 'Dynamic Quality',
    state: 'Active',
    detail: 'Runtime quality tiers are available.',
  },
  {
    label: 'Runtime Asset LODs',
    state: 'Cooked',
    detail:
      'High, medium, and low mesh variants are part of the cook contract.',
  },
  {
    label: 'Terrain LOD',
    state: String(terrainRuntimeMode),
    detail:
      terrainRuntimeMode === 'glb-chunk-terrain' ||
      terrainRuntimeMode === 'terrain-chunks'
        ? 'Chunked terrain runtime is selected.'
        : 'Scene-authored terrain is selected.',
    warning:
      terrainRuntimeMode !== 'glb-chunk-terrain' &&
      terrainRuntimeMode !== 'terrain-chunks',
  },
  {
    label: 'Distance Culling',
    state: `${runtimeBudgetNodes.length} budgeted / ${neverCullNodes.length} pinned`,
    detail: 'Runtime-budget actors can be culled by quality and distance.',
    warning: neverCullNodes.length > runtimeContract.maxNeverCullActorCount,
  },
]
$: budgetWarnings = buildReport?.warnings ?? []
$: buildErrors = buildReport?.errors ?? []
$: latestPublishError = publishPipelineState.error.trim()
$: runtimeTelemetry = $runtimeStreamingTelemetrySummaryStore
$: runtimeFrameRatePolicy = getRuntimeFrameRatePolicy()
$: livePressure = classifyRuntimePerformancePressure({
  fps: $fpsStore,
  frameTimeMs: $frameTimeStore,
  targetFps: runtimeFrameRatePolicy.targetFps,
  lowFps: runtimeFrameRatePolicy.lowFps,
  renderInfo: $renderInfoStore,
  memory: $memoryStore,
  longTasks: $longTaskStore,
  streaming: runtimeTelemetry,
})
$: liveMetricRows = livePressure.metrics.slice(0, 10)
</script>

<div class="editor-section">
  <div class="label">Performance Status</div>
  <div class="editor-status-card">
    <div class="editor-status-title">
      {budgetWarnings.length ? 'Budget warnings present' : 'Performance budgets clear'}
    </div>
    <div class="editor-chip-row">
      <span class={budgetWarnings.length > 0 ? 'editor-chip warn' : 'editor-chip ready'}>
        {budgetWarnings.length} warning(s)
      </span>
      <span class={buildErrors.length > 0 ? 'editor-chip danger' : 'editor-chip ready'}>
        {buildErrors.length} blocker(s)
      </span>
      <span class={dirtyCollisionNodes.length > 0 ? 'editor-chip warn' : 'editor-chip ready'}>
        {dirtyCollisionNodes.length} dirty collision
      </span>
    </div>
    {#if latestPublishError}
      <div class="save-message error-message">{latestPublishError}</div>
    {/if}
  </div>
</div>

<div class="editor-section">
  <div class="label">Live Runtime Pressure</div>
  <div class="editor-status-card">
    <div class="editor-status-title">{livePressure.headline}</div>
    <div class="save-message">{livePressure.message}</div>
    <div class="editor-chip-row">
      <span class={livePressure.level === 'ready' ? 'editor-chip ready' : livePressure.level === 'critical' ? 'editor-chip danger' : 'editor-chip warn'}>
        {livePressure.level}
      </span>
      <span class="editor-chip">quality {$qualityLevelStore}</span>
      <span class="editor-chip">asset tier {runtimeTelemetry.selectedAssetTier}</span>
      <span class="editor-chip">{runtimeTelemetry.partitioned ? 'partitioned' : 'unpartitioned'}</span>
    </div>
  </div>
  <div class="editor-field-grid editor-field-grid--triple">
    {#each liveMetricRows as metric (metric.id)}
      <div class="editor-status-card">
        <div class="editor-field-label">{metric.label}</div>
        <div class="editor-status-title">{metric.valueLabel}</div>
        <div class="save-message">Budget: {metric.budgetLabel}</div>
        <div class="editor-chip-row">
          <span class={metric.level === 'ready' ? 'editor-chip ready' : metric.level === 'critical' ? 'editor-chip danger' : 'editor-chip warn'}>
            {metric.level}
          </span>
        </div>
      </div>
    {/each}
  </div>
  {#if livePressure.bottlenecks.length}
    <div class="editor-status-card">
      <div class="editor-status-title">Top Bottlenecks</div>
      {#each livePressure.bottlenecks.slice(0, 4) as bottleneck (bottleneck.id)}
        <div class="save-message">
          {bottleneck.label}: {bottleneck.valueLabel} / {bottleneck.budgetLabel}. {bottleneck.action}
        </div>
      {/each}
    </div>
  {/if}
</div>

<div class="editor-section">
  <div class="label">Live Streaming</div>
  <div class="editor-field-grid editor-field-grid--triple">
    <div class="editor-status-card">
      <div class="editor-field-label">Active Actors</div>
      <div class="editor-status-title">{runtimeTelemetry.activeActorCount}</div>
      <div class="save-message">{runtimeTelemetry.activeRenderableActorCount} renderable</div>
    </div>
    <div class="editor-status-card">
      <div class="editor-field-label">Active Cells</div>
      <div class="editor-status-title">{runtimeTelemetry.activeCellCount} / {runtimeTelemetry.totalCellCount}</div>
      <div class="save-message">{runtimeTelemetry.prefetchCellCount} prefetch, {runtimeTelemetry.evictableCellCount} evictable</div>
    </div>
    <div class="editor-status-card">
      <div class="editor-field-label">Runtime Assets</div>
      <div class="editor-status-title">{runtimeTelemetry.loadedRenderAssetCount} / {runtimeTelemetry.requiredAssetCount}</div>
      <div class="save-message">{runtimeTelemetry.deferredOptionalAssetCount} optional deferred</div>
    </div>
    <div class="editor-status-card">
      <div class="editor-field-label">GLB Cache</div>
      <div class="editor-status-title">{formatRuntimePressureBytes(runtimeTelemetry.gltfCacheBytes)}</div>
      <div class="save-message">{runtimeTelemetry.gltfCacheLoadedEntries} loaded, {runtimeTelemetry.gltfCachePendingEntries} pending</div>
    </div>
    <div class="editor-status-card">
      <div class="editor-field-label">Unused Cache</div>
      <div class="editor-status-title">{formatRuntimePressureBytes(runtimeTelemetry.gltfCacheUnreferencedBytes)}</div>
      <div class="save-message">{runtimeTelemetry.gltfCacheUnreferencedEntries} unreferenced entr{runtimeTelemetry.gltfCacheUnreferencedEntries === 1 ? 'y' : 'ies'}</div>
    </div>
    <div class="editor-status-card">
      <div class="editor-field-label">Renderer</div>
      <div class="editor-status-title">{$renderInfoStore.calls} calls</div>
      <div class="save-message">{$renderInfoStore.triangles} triangles, {$memoryStore.textures} textures</div>
    </div>
  </div>
</div>

<div class="editor-section">
  <div class="label">Scene Complexity</div>
  <div class="editor-field-grid editor-field-grid--triple">
    {#each performanceMetrics as metric (metric.label)}
      <div class="editor-status-card">
        <div class="editor-field-label">{metric.label}</div>
        <div class="editor-status-title">{formatMetricValue(metric)}</div>
        <div class="editor-chip-row">
          <span class={metric.over ? 'editor-chip warn' : 'editor-chip ready'}>
            {metric.over ? 'Over Budget' : 'Within Budget'}
          </span>
        </div>
      </div>
    {/each}
  </div>
</div>

<div class="editor-section">
  <div class="label">Runtime Systems</div>
  <div class="editor-field-grid">
    {#each performanceSystems as system (system.label)}
      <div class="editor-status-card">
        <div class="editor-field-label">{system.label}</div>
        <div class="editor-status-title">{system.state}</div>
        <div class="save-message">{system.detail}</div>
        <div class="editor-chip-row">
          <span class={system.warning ? 'editor-chip warn' : 'editor-chip ready'}>
            {system.warning ? 'Review' : 'Ready'}
          </span>
        </div>
      </div>
    {/each}
  </div>
</div>

<div class="editor-section">
  <div class="label">Management Tools</div>
  <div class="button-grid">
    <button
      type="button"
      disabled={dirtyCollisionNodes.length === 0}
      on:click={() => onSelectNodes(dirtyCollisionNodes.map(node => node.id), 'Dirty collision actors')}
    >
      Select Dirty Collision
    </button>
    <button
      type="button"
      disabled={meshCollisionNodes.length === 0}
      on:click={() => onSelectNodes(meshCollisionNodes.map(node => node.id), 'Mesh collision actors')}
    >
      Select Mesh Collision
    </button>
    <button
      type="button"
      disabled={neverCullNodes.length === 0}
      on:click={() => onSelectNodes(neverCullNodes.map(node => node.id), 'Never-cull actors')}
    >
      Select Never Cull
    </button>
    <button
      type="button"
      disabled={sourceLodCollisionNodes.length === 0}
      on:click={() => onSelectNodes(sourceLodCollisionNodes.map(node => node.id), 'Source LOD collision actors')}
    >
      Select Source LOD
    </button>
    <button
      type="button"
      disabled={runtimeBudgetNodes.length === 0}
      on:click={() => onSelectNodes(runtimeBudgetNodes.map(node => node.id), 'Runtime-budget actors')}
    >
      Select Runtime Budget
    </button>
    <button type="button" on:click={onOpenCollisionTools}>
      Open Collision Tools
    </button>
    <button type="button" on:click={onOpenBuildTools}>
      Open Build Tools
    </button>
  </div>
</div>

{#if budgetWarnings.length || buildErrors.length}
  <div class="editor-section">
    <div class="label">Diagnostics</div>
    {#each buildErrors as error (error)}
      <div class="save-message error-message">Blocker: {error}</div>
    {/each}
    {#each budgetWarnings as warning (warning)}
      <div class="save-message">Warning: {warning}</div>
    {/each}
  </div>
{/if}
