<script lang="ts">
import EditorWorkflowPanel from './EditorWorkflowPanel.svelte'
import type { EditorSceneNode } from './editorStore'

type WorkflowBrowserItem = {
  name: string
  path: string
  isDirectory: boolean
}

export let workflowBrowserPath = ''
export let workflowBrowserItems: WorkflowBrowserItem[] = []
export let workflowBrowserError = ''
export let workflowBrowserLoading = false
export let selectedComfyWorkflowPath = ''
export let workflowSelectionSummary = ''
export let mergeDescriptor = ''
export let selectedNode: EditorSceneNode | null = null
export let selectedNodes: EditorSceneNode[] = []
export let similarNodeCount = 0
export let comfyWorkflowEditorStatus = ''
export let hunyuanStatus = ''
export let hunyuanBusy = false
export let workflowCanGenerateSelection = false
export let workflowCanRetextureSelection = false
export let canApplyGeneratedAssetToSelection = false
export let hunyuanLastOutputUrl = ''
export let selectedHunyuanJob: any = null
export let canShowAll = false

export let onResetWorkflowPath: () => void = () => {}
export let onWorkflowBrowserUp: () => void = () => {}
export let onWorkflowBrowserRefresh: () => void = () => {}
export let onSelectWorkflowItem: (item: WorkflowBrowserItem) => void = () => {}
export let onOutlinerFocus: () => void = () => {}
export let onSelectSimilar: () => void = () => {}
export let onAddFireflyToSelection: () => void = () => {}
export let onClearSelection: () => void = () => {}
export let onHideSelected: () => void = () => {}
export let onHideUnselected: () => void = () => {}
export let onShowAll: () => void = () => {}
export let onMergeSelectionToAsset: () => void = () => {}
export let onGenerateSelection: () => void = () => {}
export let onTextureSelection: () => void = () => {}
export let onOpenAiTab: () => void = () => {}
export let onRefreshBackend: () => void = () => {}
export let onEditGenerateWorkflow: () => void = () => {}
export let onEditTextureWorkflow: () => void = () => {}
export let onOpenGeneratedAssets: () => void = () => {}
export let onAddLatestGenerated: () => void = () => {}
export let onApplyLatestToSelection: () => void = () => {}
export let onOpenAssetLibrary: () => void = () => {}
export let onSaveLocal: () => void = () => {}
export let onOverwriteLevel: () => void = () => {}
export let onReloadDisk: () => void = () => {}
export let onOpenSaveTools: () => void = () => {}
export let onRefreshJobs: () => void = () => {}
</script>

<EditorWorkflowPanel
  {workflowBrowserPath}
  {workflowBrowserItems}
  {workflowBrowserError}
  {workflowBrowserLoading}
  {selectedComfyWorkflowPath}
  {workflowSelectionSummary}
  bind:mergeDescriptor
  {selectedNode}
  {selectedNodes}
  {similarNodeCount}
  {comfyWorkflowEditorStatus}
  {hunyuanStatus}
  {hunyuanBusy}
  {workflowCanGenerateSelection}
  {workflowCanRetextureSelection}
  {canApplyGeneratedAssetToSelection}
  {hunyuanLastOutputUrl}
  {selectedHunyuanJob}
  {canShowAll}
  {onResetWorkflowPath}
  {onWorkflowBrowserUp}
  {onWorkflowBrowserRefresh}
  {onSelectWorkflowItem}
  {onOutlinerFocus}
  {onSelectSimilar}
  {onAddFireflyToSelection}
  {onClearSelection}
  {onHideSelected}
  {onHideUnselected}
  {onShowAll}
  {onMergeSelectionToAsset}
  {onGenerateSelection}
  {onTextureSelection}
  {onOpenAiTab}
  {onRefreshBackend}
  {onEditGenerateWorkflow}
  {onEditTextureWorkflow}
  {onOpenGeneratedAssets}
  {onAddLatestGenerated}
  {onApplyLatestToSelection}
  {onOpenAssetLibrary}
  {onSaveLocal}
  {onOverwriteLevel}
  {onReloadDisk}
  {onOpenSaveTools}
  {onRefreshJobs}
/>
