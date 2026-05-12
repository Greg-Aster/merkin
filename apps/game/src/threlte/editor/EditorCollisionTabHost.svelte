<script lang="ts">
import { onDestroy } from 'svelte'
import { getLevelCollisionWorkflow } from '../engine/levelCollisionWorkflow'
import type {
  LevelCollisionBudget,
  LevelCollisionDefaultPolicy,
  SharedLevelGroundSettings,
} from '../engine/sceneDocumentTypes'
import type { TerrainRuntimeComponentSource } from '../features/terrain'
import {
  clearHeightmapSourcePreviewNodeIds,
  setHeightmapSourcePreviewNodeIds,
} from './editorHeightmapSourcePreview'
import type { EditorSceneNode } from './editorTypes'

type GroundSettings = NonNullable<SharedLevelGroundSettings['ground']>

type TerrainCollisionSettings = {
  source?: 'baked-heightmap' | 'scene-authored' | 'none'
  runtimeSource?: TerrainRuntimeComponentSource
  manifestUrl?: string
  heightmapUrl?: string
  heightmapResolution?: number
  sourceAssetUrl?: string
  sourceAssetUrls?: string[]
  sourceNodeId?: string
  sourceNodeIds?: string[]
  sourceName?: string
  sourceTriangleCount?: number
  colliderUrl?: string
  metadataUrl?: string
  colliderResolution?: number
  triangleCount?: number
  vertexCount?: number
  dirty?: boolean
  lastGeneratedAt?: string
  heightOverrideCount?: number
  chunksPath?: string
  chunkGrid?: number
  chunkCount?: number
}

export let levelId = ''
export let collisionOverlayEnabled = false
export let collisionDefaultPolicy: LevelCollisionDefaultPolicy =
  'lightweight-auto'
export let collisionBudget: LevelCollisionBudget = 'mobile'
export let groundSettings: GroundSettings | null = null
export let terrainSculptSettings: {
  enabled?: boolean
  autoBakeCollision?: boolean
} | null = null
export let terrainCollisionSettings: TerrainCollisionSettings | null = null
export let terrainCollisionBakePending = false
export let terrainHeightmapGeneratePending = false
export let terrainChunkCookPending = false
export let selectedNode: EditorSceneNode | null = null
export let selectedNodes: EditorSceneNode[] = []
export let heightmapSourceNodes: EditorSceneNode[] = []
export let selectedTerrainSourceName = ''
export let selectedTerrainSourceAssetUrl = ''

export let onSetCollisionOverlayEnabled: (value: boolean) => void = () => {}
export let onSetCollisionDefaultPolicy: (
  value: LevelCollisionDefaultPolicy,
) => void = () => {}
export let onSetCollisionBudget: (value: LevelCollisionBudget) => void =
  () => {}
export let onSetTerrainAutoBake: (value: boolean) => void = () => {}
export let onBakeTerrainCollision: () => void = () => {}
export let onGenerateTerrainHeightmap: () => void = () => {}
export let onCookTerrainChunks: () => void = () => {}

function getHeightmapUrlFromManifestUrl(manifestUrl: string | undefined) {
  if (!manifestUrl) return ''
  const fileName = manifestUrl.split('/').pop() ?? ''
  const terrainId = fileName.replace(/\.manifest\.json$/, '')
  return terrainId ? `/terrain/heightmaps/${terrainId}_heightmap.png` : ''
}

function getSelectedHeightmapNodes() {
  const seen = new Set<string>()
  const nodes = heightmapSourceNodes.length
    ? heightmapSourceNodes
    : selectedNodes.length
      ? selectedNodes
      : selectedNode
        ? [selectedNode]
        : []
  return nodes.filter(node => {
    if (seen.has(node.id)) return false
    seen.add(node.id)
    return true
  })
}

function getHeightmapSelectionStatus(node: EditorSceneNode) {
  if (heightmapSourceNodes.some(source => source.id === node.id)) {
    if (node.asset?.url) return 'included asset'
    if (node.prefab) return 'included prefab'
    if (node.primitive) return 'included primitive'
    return 'included'
  }
  if (node.id === selectedNode?.id) return 'not a terrain source'
  return 'not active source'
}

function getHeightmapSourcePreviewIds() {
  return heightmapSourceNodes.map(node => node.id)
}

$: levelCollisionWorkflow = getLevelCollisionWorkflow(levelId)
$: terrainCollisionSource =
  terrainCollisionSettings?.source ??
  (levelCollisionWorkflow.terrainCollision === 'heightmap'
    ? 'baked-heightmap'
    : levelCollisionWorkflow.terrainCollision)
$: terrainSculptingAvailable =
  Boolean(terrainSculptSettings?.enabled) ||
  terrainCollisionSource === 'baked-heightmap' ||
  Boolean(terrainCollisionSettings?.manifestUrl)
$: terrainManifestUrl =
  terrainCollisionSettings?.manifestUrl ??
  groundSettings?.terrainManifestUrl ??
  levelCollisionWorkflow.terrainManifestUrl
$: heightmapPreviewUrl =
  terrainCollisionSettings?.heightmapUrl ??
  getHeightmapUrlFromManifestUrl(terrainManifestUrl)
$: heightmapLabel =
  terrainCollisionSettings?.heightmapUrl ||
  heightmapPreviewUrl ||
  'manifest heightmap'
$: heightmapSelectedNodes = getSelectedHeightmapNodes()
$: heightmapIncludedNodeCount = heightmapSourceNodes.length
$: heightmapSourcePreviewNodeIds = getHeightmapSourcePreviewIds()
$: setHeightmapSourcePreviewNodeIds(heightmapSourcePreviewNodeIds)
$: groundActorIds = groundSettings?.groundActorIds ?? []
$: groundContractWarnings = [
  !groundSettings ? 'Ground contract missing.' : '',
  groundSettings?.visualSource === 'scene-actors' && groundActorIds.length === 0
    ? 'Scene-actor ground needs groundActorIds.'
    : '',
  groundSettings?.collisionSource === 'baked-heightfield' &&
  !groundSettings?.terrainManifestUrl &&
  !terrainCollisionSettings?.manifestUrl
    ? 'Baked-heightfield ground needs a terrain manifest.'
    : '',
].filter(Boolean)

onDestroy(() => {
  clearHeightmapSourcePreviewNodeIds()
})
</script>

<div class="editor-section">
  <div class="label">Collision View</div>
  <label class="checkbox"><input type="checkbox" checked={collisionOverlayEnabled} data-sfx-click="soft" on:change={(event) => onSetCollisionOverlayEnabled((event.currentTarget as HTMLInputElement).checked)} /> Collision Overlay</label>
  <div class="button-row compact-three-columns editor-mt-sm">
    <button class:active={collisionDefaultPolicy === 'lightweight-auto'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetCollisionDefaultPolicy('lightweight-auto')}>Auto</button>
    <button class:active={collisionDefaultPolicy === 'authored-only'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetCollisionDefaultPolicy('authored-only')}>Authored</button>
    <button class:active={collisionDefaultPolicy === 'none'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetCollisionDefaultPolicy('none')}>Off</button>
  </div>
  <div class="button-row compact-three-columns editor-mt-sm">
    <button class:active={collisionBudget === 'mobile'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetCollisionBudget('mobile')}>Mobile</button>
    <button class:active={collisionBudget === 'balanced'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetCollisionBudget('balanced')}>Balanced</button>
    <button class:active={collisionBudget === 'desktop'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetCollisionBudget('desktop')}>Desktop</button>
  </div>
  <div class="save-message">Collision source: {terrainCollisionSource}{terrainCollisionSettings?.dirty ? ' - terrain bake needed' : ''}</div>
  <div class="save-message">Terrain component data: {terrainCollisionSettings?.runtimeSource ?? (terrainSculptingAvailable ? 'built-in-manifest' : 'scene-authored')}</div>
</div>

<div class="editor-section">
  <div class="label">Ground Contract</div>
  <div class="save-message">Mode: {groundSettings?.mode ?? 'unconfigured'}</div>
  <div class="save-message">Visual source: {groundSettings?.visualSource ?? 'unconfigured'}</div>
  <div class="save-message">Collision source: {groundSettings?.collisionSource ?? 'unconfigured'}</div>
  <div class="save-message">Required surface: {groundSettings?.requiredWalkableSurfaceId ?? 'none'}</div>
  <div class="save-message">Terrain manifest: {terrainManifestUrl ?? 'none'}</div>
  <div class="save-message">Ground actors: {groundActorIds.length ? groundActorIds.join(', ') : 'none'}</div>
  {#each groundContractWarnings as warning}
    <div class="save-message">{warning}</div>
  {/each}
</div>

<div class="editor-section">
  <div class="label">Terrain Heightmap</div>
  <div class="heightmap-preview-window">
    {#if heightmapPreviewUrl}
      <img src={heightmapPreviewUrl} alt={`${levelId} heightmap preview`} />
    {:else}
      <div class="heightmap-empty">No heightmap</div>
    {/if}
  </div>
  <div class="heightmap-selection-list">
    <div class="heightmap-selection-header">
      <span>Selected Items</span>
      <span>{heightmapIncludedNodeCount} included</span>
    </div>
    {#if heightmapSelectedNodes.length}
      {#each heightmapSelectedNodes as node (node.id)}
        <div class:included={heightmapSourceNodes.some(source => source.id === node.id)} class="heightmap-selection-row">
          <span class="heightmap-selection-name">{node.name}</span>
          <span class="heightmap-selection-meta">{node.kind} - {getHeightmapSelectionStatus(node)}</span>
        </div>
      {/each}
    {:else}
      <div class="heightmap-selection-empty">Select a mesh, primitive, prefab, or group to define the heightmap sources.</div>
    {/if}
  </div>
  <button class="full" disabled={terrainHeightmapGeneratePending || !selectedTerrainSourceAssetUrl} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onGenerateTerrainHeightmap}>
    {terrainHeightmapGeneratePending ? 'Generating Heightmap...' : 'Generate Heightmap From Selection'}
  </button>
  <div class="save-message">
    Source: {selectedTerrainSourceName || terrainCollisionSettings?.sourceName || 'select terrain source objects'}
  </div>
  <div class="save-message">
    Viewport outline: {selectedTerrainSourceAssetUrl ? 'included heightmap sources while this utility is open' : 'none'}
  </div>
  {#if heightmapPreviewUrl || terrainManifestUrl}
    <div class="save-message">
      Heightmap: {heightmapLabel} {terrainCollisionSettings?.heightmapResolution ? `(${terrainCollisionSettings.heightmapResolution})` : ''}; manifest: {terrainManifestUrl ?? 'none'}
    </div>
  {/if}
  {#if terrainCollisionSettings?.sourceTriangleCount}
    <div class="save-message">Source mesh triangles: {terrainCollisionSettings.sourceTriangleCount}</div>
  {/if}
</div>

<div class="editor-section">
  <div class="label">Terrain Collision</div>
  <label class="checkbox"><input type="checkbox" checked={terrainSculptSettings?.autoBakeCollision ?? false} data-sfx-click="soft" on:change={(event) => onSetTerrainAutoBake((event.currentTarget as HTMLInputElement).checked)} /> Auto Bake Collision</label>
  <button class="full" disabled={terrainCollisionBakePending} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onBakeTerrainCollision}>
    {terrainCollisionBakePending ? 'Baking Collision...' : 'Bake Terrain Collision'}
  </button>
  <button class="full" disabled={terrainChunkCookPending || !(terrainCollisionSettings?.heightmapUrl || terrainManifestUrl)} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onCookTerrainChunks}>
    {terrainChunkCookPending ? 'Cooking Chunks...' : 'Cook Visual Chunks'}
  </button>
  <div class="save-message">
    {#if terrainCollisionSettings?.colliderUrl}
      collider {terrainCollisionSettings.colliderResolution ?? 0}, {terrainCollisionSettings.triangleCount ?? 0} triangles, {terrainCollisionSettings.heightOverrideCount ?? 0} height edits
    {:else}
      No baked terrain collision artifact is recorded for this scene.
    {/if}
  </div>
  {#if terrainCollisionSettings?.chunksPath}
    <div class="save-message">Chunks: {terrainCollisionSettings.chunkCount ?? 0} files at {terrainCollisionSettings.chunksPath}</div>
  {/if}
</div>

<style>
  .heightmap-preview-window {
    width: 100%;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    overflow: hidden;
    border: 1px solid rgba(126, 203, 255, 0.28);
    background: #050914;
    border-radius: 0.45rem;
    margin-bottom: 0.55rem;
  }

  .heightmap-preview-window img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .heightmap-empty {
    color: rgba(226, 244, 255, 0.62);
    font-size: 0.78rem;
  }

  .heightmap-selection-list {
    display: grid;
    gap: 0.35rem;
    margin-bottom: 0.55rem;
  }

  .heightmap-selection-header,
  .heightmap-selection-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .heightmap-selection-header {
    color: rgba(226, 244, 255, 0.72);
    font-size: 0.72rem;
    text-transform: uppercase;
  }

  .heightmap-selection-row {
    min-width: 0;
    border: 1px solid rgba(126, 203, 255, 0.16);
    border-radius: 0.35rem;
    padding: 0.38rem 0.45rem;
    background: rgba(5, 9, 20, 0.48);
  }

  .heightmap-selection-row.included {
    border-color: rgba(126, 203, 255, 0.52);
    background: rgba(126, 203, 255, 0.12);
  }

  .heightmap-selection-name,
  .heightmap-selection-meta {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .heightmap-selection-name {
    min-width: 0;
    color: rgba(226, 244, 255, 0.92);
    font-size: 0.78rem;
  }

  .heightmap-selection-meta,
  .heightmap-selection-empty {
    flex: 0 0 auto;
    color: rgba(226, 244, 255, 0.58);
    font-size: 0.7rem;
  }

  .heightmap-selection-empty {
    border: 1px dashed rgba(126, 203, 255, 0.2);
    border-radius: 0.35rem;
    padding: 0.5rem;
  }
</style>
