<script lang="ts">
import type { EditorSceneDocument } from '../engine/sceneDocumentTypes'
import type { TerrainRuntimeComponentSource } from '../features/terrain'
import EditorEnvironmentTabHost from './EditorEnvironmentTabHost.svelte'
import EditorPlayerTabHost from './EditorPlayerTabHost.svelte'
import {
  type EditorTerrainStatusSnapshot,
  describeEditorTerrainPipeline,
} from './editorTerrainPipeline'

type TerrainCollisionSettings = {
  source?: 'baked-heightmap' | 'source-glb' | 'scene-authored' | 'none'
  runtimeSource?: TerrainRuntimeComponentSource
  manifestUrl?: string
  heightmapUrl?: string
  sourceAssetUrl?: string
  sourceAssetUrls?: string[]
  sourceNodeId?: string
  sourceNodeIds?: string[]
  sourceName?: string
  dirty?: boolean
  heightmapDirty?: boolean
  chunksPath?: string
  lastGeneratedAt?: string
  lastChunksGeneratedAt?: string
}

export let levelId = ''
export let editorScene: EditorSceneDocument | null = null
export let terrainSculptSettings: {
  enabled?: boolean
  autoBakeCollision?: boolean
} | null = null
export let terrainCollisionSettings: TerrainCollisionSettings | null = null
export let terrainStatus: EditorTerrainStatusSnapshot | null = null
export let selectedTerrainSourceName = ''
export let selectedTerrainSourceAssetUrl = ''
export let worldPartitionCookPending = false
export let environmentTabProps: Record<string, unknown> = {}
export let playerTabProps: Record<string, unknown> = {}
export let onCookWorldPartition: () => void = () => {}
export let onBakeTerrain: () => void = () => {}

let activeWorldSubflow: 'environment' | 'player' | 'terrain' | '' = 'environment'

$: sceneNodes = editorScene?.nodes ?? []
$: terrainSourceCount =
  terrainCollisionSettings?.sourceNodeIds?.length ??
  (terrainCollisionSettings?.sourceNodeId ? 1 : 0)
$: terrainState = terrainCollisionSettings?.manifestUrl
  ? terrainCollisionSettings.dirty || terrainCollisionSettings.heightmapDirty
    ? 'terrain products need refresh'
    : 'terrain manifest ready'
  : terrainSculptSettings?.enabled
    ? 'terrain sculpting enabled'
    : 'scene-authored terrain'
$: spawnPosition = editorScene?.settings?.spawn?.position
$: terrainPipeline = describeEditorTerrainPipeline({
  scene: editorScene,
  selectedTerrainSourceName,
  selectedTerrainSourceAssetUrl,
  terrainStatus,
})
</script>

<div class="editor-section">
  <div class="label">World Setup</div>
  <div class="editor-status-card">
    <div class="editor-status-title">{levelId || 'Untitled level'}</div>
    <div class="save-message">{sceneNodes.length} object(s) in scene · {terrainState}</div>
    <div class="editor-chip-row">
      <span class:ready={Boolean(spawnPosition)} class:warn={!spawnPosition} class="editor-chip">
        spawn {spawnPosition ? 'set' : 'missing'}
      </span>
      <span class:ready={terrainSourceCount > 0} class:warn={terrainSourceCount === 0} class="editor-chip">
        terrain sources {terrainSourceCount}
      </span>
      <span class:warn={worldPartitionCookPending} class:ready={!worldPartitionCookPending} class="editor-chip">
        partition {worldPartitionCookPending ? 'cooking' : 'idle'}
      </span>
      <span class:ready={terrainPipeline.publishStatus.state === 'ready'} class:warn={terrainPipeline.publishStatus.state === 'warning'} class:danger={terrainPipeline.publishStatus.state === 'blocked'} class="editor-chip">
        {terrainPipeline.modeLabel}
      </span>
    </div>
    <div class="save-message">Terrain visual owner: {terrainPipeline.authoritativeVisualSource}</div>
  </div>
</div>

<div class="editor-section">
  <div class="label">World Subflows</div>
  <div class="button-grid">
    <button
      class:active={activeWorldSubflow === 'environment'}
      data-sfx-hover="hover-soft"
      data-sfx-click="select"
      on:click={() => activeWorldSubflow = activeWorldSubflow === 'environment' ? '' : 'environment'}
    >
      Environment
    </button>
    <button
      class:active={activeWorldSubflow === 'player'}
      data-sfx-hover="hover-soft"
      data-sfx-click="select"
      on:click={() => activeWorldSubflow = activeWorldSubflow === 'player' ? '' : 'player'}
    >
      Player
    </button>
    <button
      class:active={activeWorldSubflow === 'terrain'}
      data-sfx-hover="hover-soft"
      data-sfx-click="select"
      on:click={() => activeWorldSubflow = activeWorldSubflow === 'terrain' ? '' : 'terrain'}
    >
      Terrain
    </button>
  </div>
  <div class="save-message">Open one job at a time. Collision bakes live in Collision; publish checks live in Build.</div>
</div>

{#if activeWorldSubflow === 'environment'}
  <EditorEnvironmentTabHost {...environmentTabProps} />
{/if}

{#if activeWorldSubflow === 'player'}
  <EditorPlayerTabHost {...playerTabProps} />
{/if}

{#if activeWorldSubflow === 'terrain'}
<div class="editor-section">
  <div class="label">Terrain & World Partition</div>
  <div class="editor-chip-row">
    <span class="editor-chip">{terrainPipeline.modeLabel}</span>
    <span class:ready={terrainPipeline.renderChunkStatus.state === 'ready'} class:warn={terrainPipeline.renderChunkStatus.state === 'warning' || terrainPipeline.renderChunkStatus.state === 'inactive'} class:danger={terrainPipeline.renderChunkStatus.state === 'blocked'} class="editor-chip">render {terrainPipeline.renderChunkStatus.state}</span>
    <span class:ready={terrainPipeline.collisionStatus.state === 'ready'} class:warn={terrainPipeline.collisionStatus.state === 'warning' || terrainPipeline.collisionStatus.state === 'inactive'} class:danger={terrainPipeline.collisionStatus.state === 'blocked'} class="editor-chip">collision {terrainPipeline.collisionStatus.state}</span>
  </div>
  <div class="save-message">
    Source: {selectedTerrainSourceName || selectedTerrainSourceAssetUrl || terrainCollisionSettings?.sourceName || 'select terrain source objects'}
  </div>
  <div class="save-message">
    Source existence: {terrainPipeline.sourceExistenceStatus.detail}
  </div>
  <div class="save-message">
    Authoritative visual source: {terrainPipeline.authoritativeVisualSource} · fallback: {terrainPipeline.fallbackSurfaceStatus.detail}
  </div>
  <div class="save-message">
    Manifest: {terrainCollisionSettings?.manifestUrl || 'none'} · chunks: {terrainCollisionSettings?.chunksPath || 'none'}
  </div>
  <button
    class="full"
    disabled={!terrainPipeline.commands.find(command => command.id === 'bake-terrain')?.enabled}
    title={terrainPipeline.commands.find(command => command.id === 'bake-terrain')?.reason ?? ''}
    data-sfx-hover="hover-emphasis"
    data-sfx-click="confirm"
    on:click={onBakeTerrain}
  >
    Bake Terrain
  </button>
  <button
    class="full"
    disabled={worldPartitionCookPending}
    data-sfx-hover="hover-emphasis"
    data-sfx-click="confirm"
    on:click={onCookWorldPartition}
  >
    {worldPartitionCookPending ? 'Cooking World Partition...' : 'Cook World Partition'}
  </button>
  <div class="save-message">Collision bakes and terrain output review live in Collision; publish checks live in Build.</div>
</div>
{/if}
