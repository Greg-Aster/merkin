<script lang="ts">
import { EDITOR_API_BASE } from '@config/editorApi'
import type { EditorSceneDocument } from '../engine/sceneDocumentTypes'
import {
  type EditorPublishPipelineState,
  createInitialEditorPublishPipelineState,
} from './editorPublishReadinessContracts'
import {
  type EditorTerrainSourceAssetStatus,
  type EditorTerrainStatusSnapshot,
  describeEditorTerrainPipeline,
} from './editorTerrainPipeline'

export let editorScene: EditorSceneDocument | null = null
export let levelId = ''
export let terrainCollisionBakePending = false
export let terrainHeightmapGeneratePending = false
export let terrainChunkCookPending = false
export let worldPartitionCookPending = false
export let groundTerrainPublishPending = false
export let selectedTerrainSourceName = ''
export let selectedTerrainSourceAssetUrl = ''
export let terrainCollisionSettings: Record<string, any> | null = null
export let terrainStatus: EditorTerrainStatusSnapshot | null = null
export let publishPipelineState: EditorPublishPipelineState =
  createInitialEditorPublishPipelineState()
export let saveMessage = ''

export let onOpenCollisionTools: () => void = () => {}
export let onBakeTerrain: () => void = () => {}
export let onGenerateTerrainHeightmap: () => void = () => {}
export let onBakeTerrainCollision: () => void = () => {}
export let onCookTerrainChunks: () => void = () => {}
export let onCookWorldPartition: () => void = () => {}
export let onValidateTerrainContract: () => void = () => {}
export let onPublishLevel: () => void = () => {}
export let onPublishGroundTerrainContracts: () => void = () => {}
export let onOpenSaveTools: () => void = () => {}
export let onOpenOutput: () => void = () => {}

let terrainStatusKey = ''
let terrainStatusRequestId = 0
let terrainSourceAssets: EditorTerrainSourceAssetStatus[] = []
let missingTerrainSourceAssets: EditorTerrainSourceAssetStatus[] = []
let terrainStatusError = ''

async function loadTerrainStatus(key: string) {
  const requestId = ++terrainStatusRequestId
  terrainStatusError = ''

  try {
    const response = await fetch(
      `${EDITOR_API_BASE}/api/editor-terrain/status`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          levelId: levelId || editorScene?.levelId,
          scene: editorScene,
        }),
      },
    )
    const payload = await response.json()
    if (requestId !== terrainStatusRequestId || key !== terrainStatusKey) return
    if (!payload?.success) {
      throw new Error(payload?.message ?? 'Terrain status unavailable')
    }
    terrainSourceAssets = Array.isArray(payload.sourceAssets)
      ? payload.sourceAssets
      : []
    missingTerrainSourceAssets = Array.isArray(payload.missingSourceAssets)
      ? payload.missingSourceAssets
      : terrainSourceAssets.filter(source => source.exists === false)
  } catch (error) {
    if (requestId !== terrainStatusRequestId || key !== terrainStatusKey) return
    terrainSourceAssets = []
    missingTerrainSourceAssets = []
    terrainStatusError =
      error instanceof Error ? error.message : 'Terrain status unavailable'
  }
}

$: terrainChunksStale =
  Boolean(terrainCollisionSettings?.lastGeneratedAt) &&
  (!terrainCollisionSettings?.lastChunksGeneratedAt ||
    Date.parse(String(terrainCollisionSettings.lastChunksGeneratedAt)) <
      Date.parse(String(terrainCollisionSettings.lastGeneratedAt)))
$: hasTerrainSource =
  Boolean(selectedTerrainSourceAssetUrl) ||
  Boolean(terrainCollisionSettings?.sourceAssetUrl) ||
  Boolean(terrainCollisionSettings?.sourceNodeId) ||
  Number(terrainCollisionSettings?.sourceNodeIds?.length ?? 0) > 0
$: hasHeightmap = Boolean(
  terrainCollisionSettings?.heightmapUrl ||
    terrainCollisionSettings?.manifestUrl,
)
$: hasCollider = Boolean(terrainCollisionSettings?.colliderUrl)
$: hasChunks = Boolean(terrainCollisionSettings?.chunksPath)
$: pipelineRunning =
  terrainCollisionBakePending ||
  terrainHeightmapGeneratePending ||
  terrainChunkCookPending ||
  worldPartitionCookPending ||
  groundTerrainPublishPending ||
  publishPipelineState.running
$: terrainRows = [
  {
    id: 'source',
    label: 'Terrain Source',
    ready: hasTerrainSource,
    detail:
      selectedTerrainSourceName ||
      terrainCollisionSettings?.sourceName ||
      'select bakeable terrain sources',
  },
  {
    id: 'heightmap',
    label: 'Heightmap',
    ready: hasHeightmap && !terrainCollisionSettings?.heightmapDirty,
    detail: terrainCollisionSettings?.heightmapDirty
      ? 'source basket changed'
      : terrainCollisionSettings?.heightmapUrl ||
        terrainCollisionSettings?.manifestUrl ||
        'not generated',
  },
  {
    id: 'collision',
    label: 'Collision Bake',
    ready: hasCollider && !terrainCollisionSettings?.dirty,
    detail: terrainCollisionSettings?.dirty
      ? 'bake required'
      : terrainCollisionSettings?.colliderUrl || 'not baked',
  },
  {
    id: 'chunks',
    label: 'Visual Chunks',
    ready: hasChunks && !terrainChunksStale,
    detail: terrainChunksStale
      ? 'chunks older than heightmap'
      : terrainCollisionSettings?.chunksPath || 'not cooked',
  },
]
$: publishSummary = publishPipelineState.summary?.levelId
  ? `${publishPipelineState.summary.title} published with ${publishPipelineState.summary.stepsRun.length} step(s).`
  : ''
$: terrainPipeline = describeEditorTerrainPipeline({
  scene: editorScene,
  selectedTerrainSourceName,
  selectedTerrainSourceAssetUrl,
  terrainStatus: terrainStatus ?? {
    sourceAssets: terrainSourceAssets,
    missingSourceAssets: missingTerrainSourceAssets,
  },
})
$: nextTerrainStatusKey = JSON.stringify({
  levelId: levelId || editorScene?.levelId || '',
  sources: terrainPipeline.sourceGlbUrls,
  nodeIds:
    terrainCollisionSettings?.sourceNodeIds ??
    terrainCollisionSettings?.sourceNodeId ??
    '',
})
$: if (nextTerrainStatusKey !== terrainStatusKey) {
  terrainStatusKey = nextTerrainStatusKey
  if (levelId || editorScene?.levelId) {
    void loadTerrainStatus(nextTerrainStatusKey)
  }
}
$: sourceExistenceDetail = terrainStatusError
  ? terrainStatusError
  : terrainSourceAssets.length
    ? terrainSourceAssets
        .map(
          source =>
            `${source.url || source.sourceName || 'scene source'}: ${
              source.exists ? 'exists' : 'missing'
            }`,
        )
        .join(' · ')
    : terrainPipeline.sourceExistenceStatus.detail
$: bakeTerrainCommand = terrainPipeline.commands.find(
  command => command.id === 'bake-terrain',
)
$: visibleTerrainCommands = terrainPipeline.commands.filter(command => {
  if (terrainPipeline.mode === 'heightfield-terrain') {
    return [
      'generate-heightmap',
      'cook-heightfield-chunks',
      'bake-terrain-collision',
      'validate-terrain-contract',
      'publish-level',
    ].includes(command.id)
  }
  if (terrainPipeline.mode === 'glb-chunk-terrain') {
    return [
      'cook-glb-chunks',
      'bake-terrain-collision',
      'validate-terrain-contract',
      'publish-level',
    ].includes(command.id)
  }
  return ['validate-terrain-contract', 'publish-level'].includes(command.id)
})
</script>

<div class="editor-section" aria-live="polite">
  <div class="label">Bake / Cook Status</div>
  <div class="editor-chip-row">
    <span class:warn={pipelineRunning} class:ready={!pipelineRunning} class="editor-chip">
      {pipelineRunning ? 'running' : 'idle'}
    </span>
    <span class:ready={terrainRows.every(row => row.ready)} class:warn={!terrainRows.every(row => row.ready)} class="editor-chip">
      {terrainRows.filter(row => row.ready).length}/{terrainRows.length} terrain gates
    </span>
  </div>
  {#if saveMessage}
    <div class="save-message">{saveMessage}</div>
  {/if}
  {#if publishPipelineState.error}
    <div class="save-message error-message">{publishPipelineState.error}</div>
  {:else if publishSummary}
    <div class="save-message">{publishSummary}</div>
  {/if}
</div>

<div class="editor-section">
  <div class="label">Terrain Pipeline</div>
  <div class="editor-chip-row" aria-label="Terrain mode">
    <span class="editor-chip">{terrainPipeline.modeLabel}</span>
    <span class="editor-chip">visual {terrainPipeline.visualSource}</span>
    <span class="editor-chip">collision {terrainPipeline.collisionSource}</span>
  </div>
  <div class="save-message">Authoritative visual source: {terrainPipeline.authoritativeVisualSource}</div>
  <div class="save-message">Authority: {terrainPipeline.authoritySummary}</div>
  <div class="save-message">Required action: {terrainPipeline.requiredAction}</div>
  <div class="save-message">Source GLB/GLTF: {terrainPipeline.sourceGlbUrls[0] ?? 'none recorded'}</div>
  <div class="save-message">Source existence: {sourceExistenceDetail}</div>
  <div class="save-message">Source provenance: {terrainPipeline.sourceHash || terrainPipeline.sourceProvenance}</div>
  <div class="save-message">Runtime manifest: {terrainPipeline.manifestUrl || 'none recorded'}</div>
  {#each terrainRows as row (row.id)}
    <div class="editor-chip-row" aria-label={`${row.label}: ${row.ready ? 'ready' : 'needs work'}`}>
      <span class:ready={row.ready} class:warn={!row.ready} class="editor-chip">
        {row.ready ? 'ready' : 'needed'}
      </span>
      <span class="save-message">{row.label}: {row.detail}</span>
    </div>
  {/each}
  {#each [terrainPipeline.renderChunkStatus, terrainPipeline.collisionStatus, terrainPipeline.fallbackSurfaceStatus, terrainPipeline.dirtyStatus, terrainPipeline.publishStatus] as status (status.label)}
    <div class="editor-chip-row" aria-label={`${status.label}: ${status.state}`}>
      <span class:ready={status.state === 'ready'} class:warn={status.state === 'warning' || status.state === 'inactive'} class:danger={status.state === 'blocked'} class="editor-chip">{status.state}</span>
      <span class="save-message">{status.label}: {status.detail}</span>
    </div>
  {/each}
  {#each terrainPipeline.blockers as blocker}
    <div class="save-message error-message">{blocker}</div>
  {/each}
  <button
    class="full"
    disabled={pipelineRunning || !bakeTerrainCommand?.enabled}
    title={bakeTerrainCommand?.reason ?? ''}
    data-sfx-hover="hover-emphasis"
    data-sfx-click="confirm"
    on:click={onBakeTerrain}
  >
    {pipelineRunning ? 'Terrain Pipeline Running...' : 'Bake Terrain'}
  </button>
  {#if bakeTerrainCommand && !bakeTerrainCommand.enabled}
    <div class="save-message error-message">{bakeTerrainCommand.reason}</div>
  {:else if bakeTerrainCommand}
    <div class="save-message">{bakeTerrainCommand.reason}</div>
  {/if}
  <div class="button-row compact editor-mt-sm">
    {#each visibleTerrainCommands as command (command.id)}
      {#if command.id === 'generate-heightmap'}
        <button disabled={terrainHeightmapGeneratePending || !command.enabled} title={command.reason} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onGenerateTerrainHeightmap}>
          {terrainHeightmapGeneratePending ? 'Generating Heightmap...' : 'Generate Heightmap'}
        </button>
      {:else if command.id === 'bake-terrain-collision'}
        <button disabled={terrainCollisionBakePending || !command.enabled} title={command.reason} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onBakeTerrainCollision}>
          {terrainCollisionBakePending ? 'Baking Terrain Collision...' : 'Bake Terrain Collision'}
        </button>
      {:else if command.id === 'cook-heightfield-chunks'}
        <button disabled={terrainChunkCookPending || !command.enabled} title={command.reason} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onCookTerrainChunks}>
          {terrainChunkCookPending ? 'Cooking Heightfield Chunks...' : 'Cook Heightfield Chunks'}
        </button>
      {:else if command.id === 'cook-glb-chunks'}
        <button disabled={terrainChunkCookPending || !command.enabled} title={command.reason} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onCookTerrainChunks}>
          {terrainChunkCookPending ? 'Cooking GLB Chunks...' : 'Cook GLB Chunks'}
        </button>
      {:else if command.id === 'validate-terrain-contract'}
        <button data-sfx-hover="hover-soft" data-sfx-click="panel-open" on:click={onValidateTerrainContract}>
          Validate Terrain Contract
        </button>
      {:else if command.id === 'publish-level'}
        <button disabled={!command.enabled || publishPipelineState.running} title={command.reason} data-sfx-hover="hover-soft" data-sfx-click="panel-open" on:click={onPublishLevel}>
          Publish Level
        </button>
      {/if}
    {/each}
  </div>
  <div class="button-row compact editor-mt-sm">
    <button data-sfx-hover="hover-soft" data-sfx-click="panel-open" on:click={onOpenCollisionTools}>
      Collision Details
    </button>
  </div>
</div>

<div class="editor-section">
  <div class="label">World Partition</div>
  <button class="full" disabled={worldPartitionCookPending} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onCookWorldPartition}>
    {worldPartitionCookPending ? 'Cooking Partition...' : 'Cook Actor Partition'}
  </button>
  <div class="save-message">Cooks visual-only actor roots into spatial runtime cells. Collision, gameplay, lights, audio, and never-cull actors stay resident.</div>
</div>

<div class="editor-section">
  <div class="label">Publish Outputs</div>
  <div class="button-row compact">
    <button disabled={groundTerrainPublishPending || publishPipelineState.running} data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={onPublishGroundTerrainContracts}>
      {groundTerrainPublishPending ? 'Publishing Contracts...' : 'Publish Terrain Contracts'}
    </button>
    <button data-sfx-hover="hover-soft" data-sfx-click="panel-open" on:click={onOpenSaveTools}>
      Save / Publish
    </button>
  </div>
  <div class="button-row compact editor-mt-sm">
    <button data-sfx-hover="hover-soft" data-sfx-click="panel-open" on:click={onOpenOutput}>
      Output / Diagnostics
    </button>
  </div>
  <div class="save-message">Publish readiness and deployment live in Save / Publish. Runtime diagnostics and command output live in Output.</div>
</div>
