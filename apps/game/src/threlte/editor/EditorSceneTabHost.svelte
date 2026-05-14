<script lang="ts">
import type { EditorSceneDocument } from '../engine/sceneDocumentTypes'
import type { TerrainRuntimeComponentSource } from '../features/terrain'
import EditorSceneToolsPanel from './EditorSceneToolsPanel.svelte'
import {
  type EditorPublishPipelineState,
  createInitialEditorPublishPipelineState,
} from './editorPublishReadinessContracts'

type EditorLevelOption = {
  id: string
  label: string
  deployed: boolean
  status: string
}

type TerrainCollisionSettings = {
  source?: 'baked-heightmap' | 'source-glb' | 'scene-authored' | 'none'
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
  sourceBounds?: {
    min: [number, number, number]
    max: [number, number, number]
  }
  colliderUrl?: string
  metadataUrl?: string
  colliderResolution?: number
  triangleCount?: number
  vertexCount?: number
  dirty?: boolean
  heightmapDirty?: boolean
  lastGeneratedAt?: string
  heightOverrideCount?: number
  chunksPath?: string
  chunkGrid?: number
  chunkCount?: number
  chunkLods?: number[]
  lastChunksGeneratedAt?: string
}
type TerrainSculptSettings = {
  enabled?: boolean
  autoBakeCollision?: boolean
}

export let levelId = ''
export let editorScene: EditorSceneDocument | null = null
export let pendingLevelId = ''
export let editorLevelOptions: EditorLevelOption[] = []
export let newLevelTitle = ''
export let newLevelIdInput = ''
export let newLevelTemplateId = ''
export let canUndo = false
export let canRedo = false
export let interactionMode = 'objects'
export let viewportLightingMode = 'authored'
export let terrainSculptSettings: TerrainSculptSettings | null = null
export let terrainCollisionSettings: TerrainCollisionSettings | null = null
export let terrainCollisionBakePending = false
export let terrainHeightmapGeneratePending = false
export let terrainChunkCookPending = false
export let worldPartitionCookPending = false
export let groundTerrainPublishPending = false
export let publishPipelineState: EditorPublishPipelineState =
  createInitialEditorPublishPipelineState()
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
export let onCookWorldPartition: () => void = () => {}
export let onPublishLevel: () => void = () => {}
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
  {editorScene}
  bind:pendingLevelId
  {editorLevelOptions}
  bind:newLevelTitle
  bind:newLevelIdInput
  bind:newLevelTemplateId
  {canUndo}
  {canRedo}
  {interactionMode}
  {viewportLightingMode}
  {terrainSculptSettings}
  {terrainCollisionSettings}
  {terrainCollisionBakePending}
  {terrainHeightmapGeneratePending}
  {terrainChunkCookPending}
  {worldPartitionCookPending}
  {groundTerrainPublishPending}
  {publishPipelineState}
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
  {onCookWorldPartition}
  {onPublishLevel}
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
