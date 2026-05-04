<script lang="ts">
import type { EditorSceneNode } from './editorStore'

export let editorStyleStudioComponent:
  | typeof import('./EditorStyleStudio.svelte').default
  | null = null

export let styleProfileName = 'Painterly Storybook'
export let stylePrompt = ''
export let styleNegativePrompt = ''
export let styleLoraNotes = ''
export let styleControlNetNotes = ''
export let styleReferenceImageUrl = ''
export let styleSimplifyRatio = 0.6
export let styleSimplifyError = 0.001
export let stylePresets: Array<any> = []
export let styleBusy = false
export let styleStatus = ''
export let styleInspectReport = ''
export let styleSourceSummary = ''
export let styleWorkspaceManifestUrl = ''
export let styleWorkspaceSourceAssetUrl = ''
export let styleGeneratedReferenceImageUrl = ''
export let styleSimplifiedAssetUrl = ''
export let styleBlenderExportPath = ''
export let styleBlenderOpenCommand = ''
export let styleBatchBusy = false
export let styleBatchStatus = ''
export let hunyuanLastFitReport = ''
export let styleBatchResumeAvailable = false
export let styleBatchResumeSummary = ''
export let styleSceneCandidates: Array<any> = []
export let runtimeAssetFailures: Array<any> = []
export let comfyUiStatus = ''
export let comfyUiBusy = false
export let comfyUiReady = false
export let hunyuanBackendStatus = ''
export let hunyuanBusy = false
export let hunyuanServiceReady = false
export let hunyuanDetectedReferenceImageUrl = ''
export let selectedNode: EditorSceneNode | null = null
export let selectedNodes: EditorSceneNode[] = []
export let canUseStyleStudio: (node: EditorSceneNode | null) => boolean = () =>
  false

export let onStartComfyUi: () => void = () => {}
export let onRefreshComfyUi: () => void = () => {}
export let onStartHunyuan: () => void = () => {}
export let onRefreshHunyuan: () => void = () => {}
export let onInspectAsset: () => void = () => {}
export let onApplyStylePreset: (presetId: string) => void = () => {}
export let onPrepareWorkspace: () => void = () => {}
export let onSimplifyAsset: () => void = () => {}
export let onExportBlender: () => void = () => {}
export let onRunRetexture: () => void = () => {}
export let onRunReimagine: () => void = () => {}
export let onSelectAllBatchCandidates: () => void = () => {}
export let onClearBatchCandidates: () => void = () => {}
export let onPauseBatch: () => void = () => {}
export let onCancelBatch: () => void = () => {}
export let onResumeBatch: () => void = () => {}
export let onDiscardBatch: () => void = () => {}
export let onRunBatchRetexture: () => void = () => {}
export let onRunBatchReimagine: () => void = () => {}
export let onToggleBatchCandidate: (
  candidateId: string,
  selected: boolean,
) => void = () => {}
export let onUpdateBatchDescriptor: (
  candidateId: string,
  descriptor: string,
) => void = () => {}
</script>

{#if editorStyleStudioComponent}
  <svelte:component
    this={editorStyleStudioComponent}
    bind:styleProfileName
    bind:stylePrompt
    bind:styleNegativePrompt
    bind:styleLoraNotes
    bind:styleControlNetNotes
    {stylePresets}
    bind:styleReferenceImageUrl
    bind:styleSimplifyRatio
    bind:styleSimplifyError
    {styleBusy}
    {styleStatus}
    {styleInspectReport}
    {styleSourceSummary}
    {styleWorkspaceManifestUrl}
    {styleWorkspaceSourceAssetUrl}
    {styleGeneratedReferenceImageUrl}
    {styleSimplifiedAssetUrl}
    {styleBlenderExportPath}
    {styleBlenderOpenCommand}
    {styleBatchBusy}
    {styleBatchStatus}
    {hunyuanLastFitReport}
    {styleBatchResumeAvailable}
    {styleBatchResumeSummary}
    {styleSceneCandidates}
    {runtimeAssetFailures}
    {comfyUiStatus}
    {comfyUiBusy}
    {comfyUiReady}
    {hunyuanBackendStatus}
    {hunyuanBusy}
    {hunyuanServiceReady}
    {hunyuanDetectedReferenceImageUrl}
    {selectedNode}
    {selectedNodes}
    {canUseStyleStudio}
    on:startComfyUi={onStartComfyUi}
    on:refreshComfyUi={onRefreshComfyUi}
    on:startHunyuan={onStartHunyuan}
    on:refreshHunyuan={onRefreshHunyuan}
    on:inspectAsset={onInspectAsset}
    on:applyStylePreset={(event) => onApplyStylePreset(event.detail.presetId)}
    on:prepareWorkspace={onPrepareWorkspace}
    on:simplifyAsset={onSimplifyAsset}
    on:exportBlender={onExportBlender}
    on:runRetexture={onRunRetexture}
    on:runReimagine={onRunReimagine}
    on:selectAllBatchCandidates={onSelectAllBatchCandidates}
    on:clearBatchCandidates={onClearBatchCandidates}
    on:pauseBatch={onPauseBatch}
    on:cancelBatch={onCancelBatch}
    on:resumeBatch={onResumeBatch}
    on:discardBatch={onDiscardBatch}
    on:runBatchRetexture={onRunBatchRetexture}
    on:runBatchReimagine={onRunBatchReimagine}
    on:toggleBatchCandidate={(event) => onToggleBatchCandidate(event.detail.candidateId, event.detail.selected)}
    on:updateBatchDescriptor={(event) => onUpdateBatchDescriptor(event.detail.candidateId, event.detail.descriptor)}
  />
{:else}
  <div class="editor-section">
    <div class="save-message">Loading Style Studio...</div>
  </div>
{/if}
