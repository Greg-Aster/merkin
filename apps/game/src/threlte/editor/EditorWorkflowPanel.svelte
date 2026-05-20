<script lang="ts">
import type { EditorSceneDocument } from '../engine/sceneDocumentTypes'
import {
  type EditorPublishPipelineState,
  createInitialEditorPublishPipelineState,
} from './editorPublishReadinessContracts'
import {
  type EditorTerrainStatusSnapshot,
  describeEditorTerrainPipeline,
} from './editorTerrainPipeline'

export let editorScene: EditorSceneDocument | null = null
export let levelId = ''
export let terrainCollisionBakePending = false
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
export let onBakeTerrainCollision: () => void = () => {}
export let onCookTerrainChunks: () => void = () => {}
export let onCookWorldPartition: () => void = () => {}
export let onValidateTerrainContract: () => void = () => {}
export let onPublishLevel: () => void = () => {}
export let onPublishGroundTerrainContracts: () => void = () => {}
export let onOpenSaveTools: () => void = () => {}

$: pipelineRunning =
  terrainCollisionBakePending ||
  terrainChunkCookPending ||
  worldPartitionCookPending ||
  groundTerrainPublishPending ||
  publishPipelineState.running
$: terrainPipeline = describeEditorTerrainPipeline({
  scene: editorScene,
  selectedTerrainSourceName,
  selectedTerrainSourceAssetUrl,
  terrainStatus,
})
$: bakeTerrainCommand = terrainPipeline.commands.find(
  command => command.id === 'bake-terrain',
)
$: visibleTerrainCommands = terrainPipeline.commands.filter(command =>
  [
    'cook-glb-chunks',
    'bake-terrain-collision',
    'validate-terrain-contract',
    'publish-level',
  ].includes(command.id),
)
$: publishSummary = publishPipelineState.summary?.levelId
  ? `${publishPipelineState.summary.title} published with ${publishPipelineState.summary.stepsRun.length} step(s).`
  : ''
</script>

<div class="editor-section" aria-live="polite">
  <div class="label">Bake / Cook Status</div>
  <div class="editor-chip-row">
    <span class:warn={pipelineRunning} class:ready={!pipelineRunning} class="editor-chip">
      {pipelineRunning ? 'running' : 'idle'}
    </span>
    <span class:ready={terrainPipeline.publishStatus.state === 'ready'} class:warn={terrainPipeline.publishStatus.state === 'warning'} class:danger={terrainPipeline.publishStatus.state === 'blocked'} class="editor-chip">
      {terrainPipeline.modeLabel}
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
  <div class="save-message">Source: {terrainCollisionSettings?.sourceAssetUrl || selectedTerrainSourceAssetUrl || selectedTerrainSourceName || 'none recorded'}</div>
  <div class="save-message">Manifest: {terrainPipeline.manifestUrl || 'none recorded'}</div>
  <div class="save-message">Required action: {terrainPipeline.requiredAction}</div>
  {#each [terrainPipeline.sourceExistenceStatus, terrainPipeline.renderChunkStatus, terrainPipeline.collisionStatus, terrainPipeline.dirtyStatus, terrainPipeline.publishStatus] as status (status.label)}
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
  <div class="button-row compact editor-mt-sm">
    {#each visibleTerrainCommands as command (command.id)}
      {#if command.id === 'bake-terrain-collision'}
        <button disabled={terrainCollisionBakePending || !command.enabled} title={command.reason} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onBakeTerrainCollision}>
          {terrainCollisionBakePending ? 'Baking Terrain Collision...' : 'Bake Terrain Collision'}
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
</div>
