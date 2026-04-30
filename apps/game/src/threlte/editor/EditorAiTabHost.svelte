<script lang="ts">
import type { EditorSceneNode } from './editorStore'

export let editorAIMeshStudioComponent:
  | typeof import('./EditorAIMeshStudio.svelte').default
  | null = null

export let comfyUiApiUrl = ''
export let comfyUiStatus = ''
export let comfyUiBusy = false
export let comfyUiReady = false
export let comfyWorkflowEditorStatus = ''
export let selectedComfyWorkflowPath = ''
export let hunyuanApiUrl = ''
export let hunyuanStatus = ''
export let hunyuanBackendStatus = ''
export let hunyuanBusy = false
export let hunyuanServiceReady = false
export let hunyuanBackendCanGenerate = false
export let hunyuanBackendCanRetexture = false
export let hunyuanLastOutputUrl = ''
export let hunyuanLastResultSummary = ''
export let hunyuanLastFitReport = ''
export let hunyuanSupportsReplacement = false
export let hunyuanSupportsTextureWrap = false
export let canApplyGeneratedAssetToSelection = false
export let runtimeAssetFailures: Array<any> = []
export let recentHunyuanJobs: Array<any> = []
export let hunyuanJobsLoading = false
export let hunyuanJobsError = ''
export let selectedHunyuanJobId = ''
export let hunyuanReferenceImageUrl = ''
export let hunyuanDetectedReferenceImageUrl = ''
export let hunyuanPrompt = ''
export let hunyuanScratchName = 'Generated Artifact'
export let hunyuanScratchReferenceImageUrl = ''
export let hunyuanScratchPrompt = ''
export let hunyuanApplyToSimilarNodes = false
export let matchingSelectionCount = 0
export let similarSelectionLabel = 'matching nodes'
export let selectedNode: EditorSceneNode | null = null
export let selectedNodes: EditorSceneNode[] = []
export let canUseAiMeshStudio: (node: EditorSceneNode | null) => boolean = () =>
  false
export let canRetextureSelection: (node: EditorSceneNode | null) => boolean =
  () => false

export let onSelectSimilar: () => void = () => {}
export let onStartComfyUi: () => void = () => {}
export let onRefreshComfyUi: () => void = () => {}
export let onStartHunyuan: () => void = () => {}
export let onRefreshHunyuan: () => void = () => {}
export let onGenerateScratch: () => void = () => {}
export let onInspectSelection: () => void = () => {}
export let onGenerateSelection: () => void = () => {}
export let onTextureSelection: () => void = () => {}
export let onOpenWorkflowTab: () => void = () => {}
export let onResetWorkflowPath: () => void = () => {}
export let onEditGenerateWorkflow: () => void = () => {}
export let onEditTextureWorkflow: () => void = () => {}
export let onOpenGeneratedAsset: () => void = () => {}
export let onApplyGeneratedAsset: () => void = () => {}
export let onSaveGeneratedResult: () => void = () => {}
export let onRefreshRecentJobs: () => void = () => {}
</script>

{#if editorAIMeshStudioComponent}
  <svelte:component
    this={editorAIMeshStudioComponent}
    bind:comfyUiApiUrl
    {comfyUiStatus}
    {comfyUiBusy}
    {comfyUiReady}
    {comfyWorkflowEditorStatus}
    {selectedComfyWorkflowPath}
    bind:hunyuanApiUrl
    {hunyuanStatus}
    {hunyuanBackendStatus}
    {hunyuanBusy}
    {hunyuanServiceReady}
    {hunyuanBackendCanGenerate}
    {hunyuanBackendCanRetexture}
    {hunyuanLastOutputUrl}
    {hunyuanLastResultSummary}
    {hunyuanLastFitReport}
    {hunyuanSupportsReplacement}
    {hunyuanSupportsTextureWrap}
    {canApplyGeneratedAssetToSelection}
    {runtimeAssetFailures}
    {recentHunyuanJobs}
    {hunyuanJobsLoading}
    {hunyuanJobsError}
    bind:selectedHunyuanJobId
    bind:hunyuanReferenceImageUrl
    {hunyuanDetectedReferenceImageUrl}
    bind:hunyuanPrompt
    bind:hunyuanScratchName
    bind:hunyuanScratchReferenceImageUrl
    bind:hunyuanScratchPrompt
    bind:hunyuanApplyToSimilarNodes
    {matchingSelectionCount}
    {similarSelectionLabel}
    {selectedNode}
    {selectedNodes}
    {canUseAiMeshStudio}
    {canRetextureSelection}
    on:selectSimilar={onSelectSimilar}
    on:startComfyUi={onStartComfyUi}
    on:refreshComfyUi={onRefreshComfyUi}
    on:startHunyuan={onStartHunyuan}
    on:refreshHunyuan={onRefreshHunyuan}
    on:generateScratch={onGenerateScratch}
    on:inspectSelection={onInspectSelection}
    on:generateSelection={onGenerateSelection}
    on:textureSelection={onTextureSelection}
    on:openWorkflowTab={onOpenWorkflowTab}
    on:resetWorkflowPath={onResetWorkflowPath}
    on:editGenerateWorkflow={onEditGenerateWorkflow}
    on:editTextureWorkflow={onEditTextureWorkflow}
    on:openGeneratedAsset={onOpenGeneratedAsset}
    on:applyGeneratedAsset={onApplyGeneratedAsset}
    on:saveGeneratedResult={onSaveGeneratedResult}
    on:refreshRecentJobs={onRefreshRecentJobs}
  />
{:else}
  <div class="editor-section">
    <div class="save-message">Loading AI mesh toolsâ€¦</div>
  </div>
{/if}
