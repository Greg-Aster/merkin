<script lang="ts">
import EditorCreatePanel from './EditorCreatePanel.svelte'

type LibraryItem = {
  name: string
  path: string
  isDirectory: boolean
}

export let createQuickNodeActions: Array<{
  label: string
  action: () => void
}> = []
export let createPrefabGroups: Array<{
  label: string
  items: Array<{
    label: string
    type: string
    position: [number, number, number]
  }>
}> = []
export let assetOptions: Array<{ label: string; url: string }> = []
export let selectedNodesCount = 0
export let hunyuanBusy = false
export let hunyuanBackendCanGenerate = false
export let hunyuanBackendCanRetexture = false
export let hunyuanStatus = ''
export let hunyuanPrompt = ''
export let hunyuanReferenceImageUrl = ''
export let hunyuanScratchName = 'Generated Artifact'
export let hunyuanScratchReferenceImageUrl = ''
export let hunyuanScratchPrompt = ''
export let hunyuanDetectedReferenceImageUrl = ''
export let hunyuanLastOutputUrl = ''
export let assetBrowserPath = ''
export let assetBrowserItems: LibraryItem[] = []
export let assetBrowserFilter = ''
export let assetBrowserError = ''
export let assetBrowserLoading = false
export let selectedLibraryItem: LibraryItem | null = null
export let selectedLibraryItemUrl = ''
export let assetPickerTargetNodeId = ''
export let assetPickerTargetName = ''
export let generatedRootPath = ''
export let modelsRootPath = ''

export let onAddFireflyToSelection: () => void = () => {}
export let onAddPrefab: (
  label: string,
  type: string,
  position: [number, number, number],
) => void = () => {}
export let onAddCuratedAsset: (label: string, url: string) => void = () => {}
export let onGenerateToLibrary: () => void = () => {}
export let onGenerateAndAdd: () => void = () => {}
export let onOpenGeneratedAssets: () => void = () => {}
export let onAddLatestGenerated: () => void = () => {}
export let onSelectAssetLibraryRoot: (path: string) => void = () => {}
export let onAssetBrowserUp: () => void = () => {}
export let onAssetBrowserRefresh: () => void = () => {}
export let onCancelAssetPicker: () => void = () => {}
export let onSelectLibraryItem: (item: LibraryItem) => void = () => {}
export let onAddSelectedLibraryAssetToScene: () => void = () => {}
export let onInspectSelectedLibraryAsset: () => void = () => {}
export let onApplySelectedLibraryAsset: () => void = () => {}
export let onRunLibraryGenerate: () => void = () => {}
export let onRunLibraryTexture: () => void = () => {}
</script>

<EditorCreatePanel
  {createQuickNodeActions}
  {createPrefabGroups}
  {assetOptions}
  {selectedNodesCount}
  {hunyuanBusy}
  {hunyuanBackendCanGenerate}
  {hunyuanBackendCanRetexture}
  bind:hunyuanStatus
  bind:hunyuanPrompt
  bind:hunyuanReferenceImageUrl
  bind:hunyuanScratchName
  bind:hunyuanScratchReferenceImageUrl
  bind:hunyuanScratchPrompt
  {hunyuanDetectedReferenceImageUrl}
  {hunyuanLastOutputUrl}
  {assetBrowserPath}
  {assetBrowserItems}
  bind:assetBrowserFilter
  {assetBrowserError}
  {assetBrowserLoading}
  {selectedLibraryItem}
  {selectedLibraryItemUrl}
  {assetPickerTargetNodeId}
  {assetPickerTargetName}
  {generatedRootPath}
  {modelsRootPath}
  {onAddFireflyToSelection}
  {onAddPrefab}
  {onAddCuratedAsset}
  {onGenerateToLibrary}
  {onGenerateAndAdd}
  {onOpenGeneratedAssets}
  {onAddLatestGenerated}
  {onSelectAssetLibraryRoot}
  {onAssetBrowserUp}
  {onAssetBrowserRefresh}
  {onCancelAssetPicker}
  {onSelectLibraryItem}
  {onAddSelectedLibraryAssetToScene}
  {onInspectSelectedLibraryAsset}
  {onApplySelectedLibraryAsset}
  {onRunLibraryGenerate}
  {onRunLibraryTexture}
/>
