<script lang="ts">
import type { EditorSceneDocument } from '../engine/sceneDocumentTypes'
import type { TerrainRuntimeComponentSource } from '../features/terrain'

export let levelId = ''
export let editorScene: EditorSceneDocument | null = null
export let pendingLevelId = ''
export let editorLevelOptions: Array<{
  id: string
  label: string
  deployed: boolean
  status: string
}> = []
export let newLevelTitle = ''
export let newLevelIdInput = ''
export let newLevelTemplateId = ''
export let canUndo = false
export let canRedo = false
export let interactionMode = 'objects'
export let viewportLightingMode = 'authored'
export let terrainSculptSettings: {
  enabled?: boolean
  autoBakeCollision?: boolean
} | null = null
export let terrainBrushMode = 'raise'
export let terrainBrushSize = 24
export let terrainBrushStrength = 0.35
export let terrainBrushFalloff = 0.55
export let terrainCollisionSettings: {
  source?: 'baked-heightmap' | 'source-glb' | 'scene-authored' | 'none'
  runtimeSource?: TerrainRuntimeComponentSource
  manifestUrl?: string
  heightmapUrl?: string
  heightmapResolution?: number
  sourceAssetUrl?: string
  sourceNodeId?: string
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
} | null = null
export let terrainCollisionBakePending = false
export let terrainHeightmapGeneratePending = false
export let terrainChunkCookPending = false
export let selectedTerrainSourceAssetUrl = ''
export let transformMode = 'translate'
export let transformSpace = 'world'
export let transformAxis = 'all'
export let snappingEnabled = false
export let translateSnap = 1
export let rotateSnap = 15
export let scaleSnap = 0.1
export let surfaceSnapEnabled = false
export let surfaceSnapOffset = 0

export let onUndo: () => void = () => {}
export let onRedo: () => void = () => {}
export let onSwitchLevel: () => void = () => {}
export let onCreateLevel: () => void = () => {}
export let onSetInteractionMode: (mode: string) => void = () => {}
export let onSetViewportLightingMode: (mode: string) => void = () => {}
export let onSetTerrainBrushMode: (mode: string) => void = () => {}
export let onSetTerrainBrushSize: (value: number) => void = () => {}
export let onSetTerrainBrushStrength: (value: number) => void = () => {}
export let onSetTerrainBrushFalloff: (value: number) => void = () => {}
export let onSetTransformMode: (mode: string) => void = () => {}
export let onSetTransformSpace: (mode: string) => void = () => {}
export let onSetTransformAxis: (axis: string) => void = () => {}
export let onSetSnappingEnabled: (value: boolean) => void = () => {}
export let onSetTranslateSnap: (value: number) => void = () => {}
export let onSetRotateSnap: (value: number) => void = () => {}
export let onSetScaleSnap: (value: number) => void = () => {}
export let onSetSurfaceSnapEnabled: (value: boolean) => void = () => {}
export let onSetSurfaceSnapOffset: (value: number) => void = () => {}

$: sceneNodes = editorScene?.nodes ?? []
$: assetNodeCount = sceneNodes.filter(node => Boolean(node.asset)).length
$: gameplayNodeCount = sceneNodes.filter(node => Boolean(node.gameplay)).length
$: colliderNodeCount = sceneNodes.filter(
  node => Boolean(node.collision) && node.collision?.enabled !== false,
).length
</script>

<div class="editor-section">
  <div class="label">Scene</div>
  <div class="save-message">
    {levelId || 'Untitled scene'} · {sceneNodes.length} object{sceneNodes.length === 1 ? '' : 's'} · {assetNodeCount} asset node{assetNodeCount === 1 ? '' : 's'}
  </div>
  <div class="save-message">
    {gameplayNodeCount} gameplay · {colliderNodeCount} collider{colliderNodeCount === 1 ? '' : 's'}
  </div>
</div>

<div class="editor-section">
  <div class="label">Selection</div>
  <div class="save-message">
    Select an item in the viewport or outliner to inspect transform, asset, gameplay, and collision details.
  </div>
</div>

<div class="editor-section">
  <div class="label">Mode</div>
  <select class="text-input" value={interactionMode} on:change={(event) => onSetInteractionMode((event.currentTarget as HTMLSelectElement).value)}>
    <option value="objects">Objects</option>
    <option value="terrain">Terrain</option>
  </select>
  <select class="text-input editor-mt-input" value={viewportLightingMode} on:change={(event) => onSetViewportLightingMode((event.currentTarget as HTMLSelectElement).value)}>
    <option value="authored">Authored lighting</option>
    <option value="workbench">Workbench lighting</option>
  </select>
</div>
