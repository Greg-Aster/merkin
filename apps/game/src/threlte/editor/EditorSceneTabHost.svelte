<script lang="ts">
import type {
  LevelCollisionBudget,
  LevelCollisionDefaultPolicy,
  SharedLevelGroundSettings,
} from '../engine/sceneDocumentTypes'
import type { TerrainRuntimeComponentSource } from '../features/terrain'
import EditorSceneToolsPanel from './EditorSceneToolsPanel.svelte'

type EditorLevelOption = {
  id: string
  label: string
  deployed: boolean
  status: string
}

type TerrainCollisionSettings = {
  source?: 'baked-heightmap' | 'scene-authored' | 'none'
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
}
type GroundSettings = NonNullable<SharedLevelGroundSettings['ground']>
type TerrainSculptSettings = {
  enabled?: boolean
  autoBakeCollision?: boolean
}

export let levelId = ''
export let pendingLevelId = ''
export let editorLevelOptions: EditorLevelOption[] = []
export let newLevelTitle = ''
export let newLevelIdInput = ''
export let newLevelTemplateId = ''
export let canUndo = false
export let canRedo = false
export let interactionMode = 'objects'
export let viewportLightingMode = 'authored'
export let collisionOverlayEnabled = false
export let collisionDefaultPolicy: LevelCollisionDefaultPolicy =
  'lightweight-auto'
export let collisionBudget: LevelCollisionBudget = 'mobile'
export let groundSettings: GroundSettings | null = null
export let terrainSculptSettings: TerrainSculptSettings | null = null
export let terrainCollisionSettings: TerrainCollisionSettings | null = null
export let terrainCollisionBakePending = false
export let terrainHeightmapGeneratePending = false
export let terrainChunkCookPending = false
export let worldPartitionCookPending = false
export let groundTerrainPublishPending = false
export let selectedTerrainSourceName = ''
export let selectedTerrainSourceAssetUrl = ''
export let terrainBrushMode = 'raise'
export let terrainBrushSize = 24
export let terrainBrushStrength = 0.35
export let terrainBrushFalloff = 0.55
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
export let onCookWorldPartition: () => void = () => {}
export let onPublishGroundTerrainContracts: () => void = () => {}
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
</script>

<EditorSceneToolsPanel
  {levelId}
  bind:pendingLevelId
  {editorLevelOptions}
  bind:newLevelTitle
  bind:newLevelIdInput
  bind:newLevelTemplateId
  {canUndo}
  {canRedo}
  {interactionMode}
  {viewportLightingMode}
  {collisionOverlayEnabled}
  {collisionDefaultPolicy}
  {collisionBudget}
  {groundSettings}
  {terrainSculptSettings}
  {terrainCollisionSettings}
  {terrainCollisionBakePending}
  {terrainHeightmapGeneratePending}
  {terrainChunkCookPending}
  {worldPartitionCookPending}
  {groundTerrainPublishPending}
  {selectedTerrainSourceName}
  {selectedTerrainSourceAssetUrl}
  {terrainBrushMode}
  {terrainBrushSize}
  {terrainBrushStrength}
  {terrainBrushFalloff}
  {transformMode}
  {transformSpace}
  {transformAxis}
  {snappingEnabled}
  {translateSnap}
  {rotateSnap}
  {scaleSnap}
  {surfaceSnapEnabled}
  {surfaceSnapOffset}
  {onUndo}
  {onRedo}
  {onSwitchLevel}
  {onCreateLevel}
  {onSetInteractionMode}
  {onSetViewportLightingMode}
  {onSetCollisionOverlayEnabled}
  {onSetCollisionDefaultPolicy}
  {onSetCollisionBudget}
  {onSetTerrainAutoBake}
  {onBakeTerrainCollision}
  {onGenerateTerrainHeightmap}
  {onCookTerrainChunks}
  {onCookWorldPartition}
  {onPublishGroundTerrainContracts}
  {onSetTerrainBrushMode}
  {onSetTerrainBrushSize}
  {onSetTerrainBrushStrength}
  {onSetTerrainBrushFalloff}
  {onSetTransformMode}
  {onSetTransformSpace}
  {onSetTransformAxis}
  {onSetSnappingEnabled}
  {onSetTranslateSnap}
  {onSetRotateSnap}
  {onSetScaleSnap}
  {onSetSurfaceSnapEnabled}
  {onSetSurfaceSnapOffset}
/>
