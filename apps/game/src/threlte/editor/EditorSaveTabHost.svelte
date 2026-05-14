<script lang="ts">
import type { EditorSceneDocument } from '../engine/sceneDocumentTypes'
import EditorSavePanel from './EditorSavePanel.svelte'
import {
  type EditorPublishPipelineState,
  createInitialEditorPublishPipelineState,
} from './editorPublishReadinessContracts'
import type { EditorTerrainStatusSnapshot } from './editorTerrainPipeline'

export let levelId = ''
export let editorScene: EditorSceneDocument | null = null
export let metadataTitle = ''
export let metadataStatus: 'active' | 'draft' | 'archived' = 'draft'
export let metadataDeployed = false
export let metadataStarMapEnabled = false
export let metadataStarMapYear = 2100
export let metadataStarMapDescription = ''
export let metadataSourceKind: 'scene' = 'scene'
export let saveAsTitle = ''
export let saveAsLevelId = ''
export let importBuffer = ''
export let saveMessage = ''
export let groundTerrainPublishPending = false
export let terrainStatus: EditorTerrainStatusSnapshot | null = null
export let terrainPipelinePending = false
export let worldPartitionCookPending = false
export let publishPipelineState: EditorPublishPipelineState =
  createInitialEditorPublishPipelineState()

export let onSaveLevelMetadata: () => void = () => {}
export let onSaveLocal: () => void = () => {}
export let onOverwriteLevel: () => void = () => {}
export let onCopySceneJson: () => void = () => {}
export let onReloadDisk: () => void = () => {}
export let onLoadPackagedScene: () => void = () => {}
export let onLoadOriginalSnapshot: () => void = () => {}
export let onLoadBackupSnapshot: () => void = () => {}
export let onSaveAsNewLevel: () => void = () => {}
export let onApplyImport: () => void = () => {}
export let onPublishLevel: () => void = () => {}
export let onPublishGroundTerrainContracts: () => void = () => {}
</script>

<EditorSavePanel
  {levelId}
  {editorScene}
  bind:metadataTitle
  bind:metadataStatus
  bind:metadataDeployed
  bind:metadataStarMapEnabled
  bind:metadataStarMapYear
  bind:metadataStarMapDescription
  bind:metadataSourceKind
  bind:saveAsTitle
  bind:saveAsLevelId
  bind:importBuffer
  {saveMessage}
  {groundTerrainPublishPending}
  {terrainStatus}
  {terrainPipelinePending}
  {worldPartitionCookPending}
  {publishPipelineState}
  {onSaveLevelMetadata}
  {onSaveLocal}
  {onOverwriteLevel}
  {onCopySceneJson}
  {onReloadDisk}
  {onLoadPackagedScene}
  {onLoadOriginalSnapshot}
  {onLoadBackupSnapshot}
  {onSaveAsNewLevel}
  {onApplyImport}
  {onPublishLevel}
  {onPublishGroundTerrainContracts}
/>
