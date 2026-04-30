<script lang="ts">
import EditorSavePanel from './EditorSavePanel.svelte'

export let metadataTitle = ''
export let metadataStatus: 'active' | 'draft' | 'archived' = 'draft'
export let metadataDeployed = false
export let metadataStarMapEnabled = false
export let metadataStarMapYear = 2100
export let metadataStarMapDescription = ''
export let metadataSourceKind: 'component' | 'scene' = 'scene'
export let metadataSourceComponentKey: 'observatory' | 'solitude' =
  'observatory'
export let saveAsTitle = ''
export let saveAsLevelId = ''
export let importBuffer = ''
export let saveMessage = ''

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
</script>

<EditorSavePanel
  bind:metadataTitle
  bind:metadataStatus
  bind:metadataDeployed
  bind:metadataStarMapEnabled
  bind:metadataStarMapYear
  bind:metadataStarMapDescription
  bind:metadataSourceKind
  bind:metadataSourceComponentKey
  bind:saveAsTitle
  bind:saveAsLevelId
  bind:importBuffer
  {saveMessage}
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
/>
