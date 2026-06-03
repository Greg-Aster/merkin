<script lang="ts">
import type { EditorSceneDocument } from '../engine/sceneDocumentTypes'
import type {
  EditorTerrainStatusSnapshot,
} from './editorTerrainPipeline'
import { describeEditorTerrainPipeline } from './editorTerrainPipeline'

type TerrainCollisionSettings = {
  source?: 'source-glb' | 'scene-authored' | 'none'
  manifestUrl?: string
  sourceAssetUrl?: string
  sourceAssetUrls?: string[]
  sourceName?: string
  bakePreset?: 'mobile' | 'desktop' | 'high'
  targetTriangles?: number
  maxBytes?: number
  collisionSourceAssetUrl?: string
  colliderUrl?: string
  metadataUrl?: string
  colliderResolution?: number
  triangleCount?: number
  vertexCount?: number
  collisionProduct?: {
    byteSize?: number
    bakeMode?: string
    preset?: string
    targetTriangles?: number
    maxBytes?: number
  }
  dirty?: boolean
}

export let levelId = ''
export let editorScene: EditorSceneDocument | null = null
export let terrainCollisionSettings: TerrainCollisionSettings | null = null
export let terrainStatus: EditorTerrainStatusSnapshot | null = null
export let selectedTerrainSourceName = ''
export let selectedTerrainSourceAssetUrl = ''
export let terrainCollisionBakePending = false
export let terrainChunkCookPending = false
export let onUpdateTerrainBakeSettings: (patch: Record<string, unknown>) => void =
  () => {}
export let onBakeTerrainCollision: () => void = () => {}
export let onCookTerrainChunks: () => void = () => {}
export let onBakeTerrain: () => void = () => {}

$: terrainPipeline = describeEditorTerrainPipeline({
  scene: editorScene,
  selectedTerrainSourceName,
  selectedTerrainSourceAssetUrl,
  terrainStatus,
})
$: bakeCommand = terrainPipeline.commands.find(
  command => command.id === 'bake-terrain-collision',
)
$: cookCommand = terrainPipeline.commands.find(
  command => command.id === 'cook-glb-chunks',
)
$: fullBakeCommand = terrainPipeline.commands.find(
  command => command.id === 'bake-terrain',
)
$: sourceLabel =
  terrainCollisionSettings?.sourceName ||
  terrainCollisionSettings?.sourceAssetUrl ||
  terrainCollisionSettings?.sourceAssetUrls?.[0] ||
  selectedTerrainSourceAssetUrl ||
  selectedTerrainSourceName ||
  'no source GLB recorded'
$: bakePreset = terrainCollisionSettings?.bakePreset ?? 'desktop'
$: targetTriangles = terrainCollisionSettings?.targetTriangles ?? 25000
$: maxBytes = terrainCollisionSettings?.maxBytes ?? 6291456
$: colliderByteSize =
  terrainCollisionSettings?.collisionProduct?.byteSize ??
  0

function updateNumberSetting(key: string, value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return
  onUpdateTerrainBakeSettings({ [key]: parsed })
}
</script>

<div class="editor-section">
  <div class="label">Terrain Collision</div>
  <div class="editor-status-card">
    <div class="editor-status-title">{levelId || 'Untitled level'}</div>
    <div class="save-message">Mode: {terrainPipeline.modeLabel}</div>
    <div class="save-message">Source: {sourceLabel}</div>
    <div class="editor-chip-row">
      <span class:ready={terrainPipeline.sourceExistenceStatus.state === 'ready'} class:warn={terrainPipeline.sourceExistenceStatus.state === 'warning'} class:danger={terrainPipeline.sourceExistenceStatus.state === 'blocked'} class="editor-chip">
        source {terrainPipeline.sourceExistenceStatus.state}
      </span>
      <span class:ready={terrainPipeline.renderChunkStatus.state === 'ready'} class:warn={terrainPipeline.renderChunkStatus.state === 'warning' || terrainPipeline.renderChunkStatus.state === 'inactive'} class:danger={terrainPipeline.renderChunkStatus.state === 'blocked'} class="editor-chip">
        chunks {terrainPipeline.renderChunkStatus.state}
      </span>
      <span class:ready={terrainPipeline.collisionStatus.state === 'ready'} class:warn={terrainPipeline.collisionStatus.state === 'warning' || terrainPipeline.collisionStatus.state === 'inactive'} class:danger={terrainPipeline.collisionStatus.state === 'blocked'} class="editor-chip">
        collision {terrainPipeline.collisionStatus.state}
      </span>
    </div>
  </div>
</div>

<div class="editor-section">
  <div class="label">Source-Linked Collision</div>
  <div class="save-message">Manifest: {terrainCollisionSettings?.manifestUrl || 'none'}</div>
  <div class="save-message">Collider: {terrainCollisionSettings?.colliderUrl || 'none'}</div>
  <div class="save-message">Metadata: {terrainCollisionSettings?.metadataUrl || 'none'}</div>
  <div class="save-message">
    Mesh: {terrainCollisionSettings?.triangleCount ?? 0} triangles, {terrainCollisionSettings?.vertexCount ?? 0} vertices
    {terrainCollisionSettings?.dirty ? ' - bake needed' : ''}
  </div>
  <div class="save-message">
    Bake: {terrainCollisionSettings?.collisionProduct?.bakeMode ?? 'editor-walkable-surface'} · {colliderByteSize} bytes
  </div>
  <label class="editor-field">
    <span>Preset</span>
    <select
      class="text-input"
      value={bakePreset}
      on:change={(event) => onUpdateTerrainBakeSettings({ bakePreset: (event.currentTarget as HTMLSelectElement).value })}
    >
      <option value="mobile">Mobile · 10k / 3 MB</option>
      <option value="desktop">Desktop · 25k / 6 MB</option>
      <option value="high">High · 50k / 10 MB</option>
    </select>
  </label>
  <label class="editor-field">
    <span>Target triangles</span>
    <input class="tuple-input" type="number" min="1" step="1000" value={targetTriangles} on:change={(event) => updateNumberSetting('targetTriangles', (event.currentTarget as HTMLInputElement).value)} />
  </label>
  <label class="editor-field">
    <span>Max bytes</span>
    <input class="tuple-input" type="number" min="1" step="524288" value={maxBytes} on:change={(event) => updateNumberSetting('maxBytes', (event.currentTarget as HTMLInputElement).value)} />
  </label>
  <label class="editor-field">
    <span>Collision source GLB</span>
    <input class="text-input" type="text" value={terrainCollisionSettings?.collisionSourceAssetUrl ?? ''} on:change={(event) => onUpdateTerrainBakeSettings({ collisionSourceAssetUrl: (event.currentTarget as HTMLInputElement).value.trim() })} />
  </label>
  <button
    class="full"
    disabled={!fullBakeCommand?.enabled || terrainCollisionBakePending || terrainChunkCookPending}
    title={fullBakeCommand?.reason ?? ''}
    data-sfx-hover="hover-emphasis"
    data-sfx-click="confirm"
    on:click={onBakeTerrain}
  >
    Bake Terrain
  </button>
  <button
    class="full"
    disabled={!cookCommand?.enabled || terrainChunkCookPending}
    title={cookCommand?.reason ?? ''}
    data-sfx-hover="hover-emphasis"
    data-sfx-click="confirm"
    on:click={onCookTerrainChunks}
  >
    {terrainChunkCookPending ? 'Cooking Source GLB Chunks...' : 'Cook Source GLB Chunks'}
  </button>
  <button
    class="full"
    disabled={!bakeCommand?.enabled || terrainCollisionBakePending}
    title={bakeCommand?.reason ?? ''}
    data-sfx-hover="hover-emphasis"
    data-sfx-click="confirm"
    on:click={onBakeTerrainCollision}
  >
    {terrainCollisionBakePending ? 'Baking Source-Linked Collision...' : 'Bake Source-Linked Collision'}
  </button>
</div>
