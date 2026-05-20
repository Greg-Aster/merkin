<script lang="ts">
import type { EditorSceneDocument } from '../engine/sceneDocumentTypes'
import EditorWorkflowPanel from './EditorWorkflowPanel.svelte'
import {
  type EditorPublishPipelineState,
  createInitialEditorPublishPipelineState,
} from './editorPublishReadinessContracts'
import type { EditorTerrainStatusSnapshot } from './editorTerrainPipeline'

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
export let onOpenOutput: () => void = () => {}
</script>

<EditorWorkflowPanel
  {editorScene}
  {levelId}
  {terrainCollisionBakePending}
  {terrainChunkCookPending}
  {worldPartitionCookPending}
  {groundTerrainPublishPending}
  {selectedTerrainSourceName}
  {selectedTerrainSourceAssetUrl}
  {terrainCollisionSettings}
  {terrainStatus}
  {publishPipelineState}
  {saveMessage}
  {onOpenCollisionTools}
  {onBakeTerrain}
  {onBakeTerrainCollision}
  {onCookTerrainChunks}
  {onCookWorldPartition}
  {onValidateTerrainContract}
  {onPublishLevel}
  {onPublishGroundTerrainContracts}
  {onOpenSaveTools}
  {onOpenOutput}
/>
