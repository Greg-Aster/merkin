<script lang="ts">
import { createEventDispatcher } from 'svelte'
import EditorAssetPreview from './EditorAssetPreview.svelte'
import type { HunyuanJobStatus } from './editorHunyuanJobPolling'
import type { EditorSceneNode } from './editorStore'

const dispatch = createEventDispatcher()

export let comfyUiStatus = ''
export let comfyUiApiUrl = ''
export let comfyUiBusy = false
export let comfyUiReady = false
export let comfyWorkflowEditorStatus = ''
export let selectedComfyWorkflowPath = ''
export let workflowBrowserPath = ''
export let workflowBrowserItems: Array<{
  name: string
  path: string
  isDirectory: boolean
}> = []
export let workflowBrowserError = ''
export let workflowBrowserLoading = false

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
export let recentHunyuanJobs: HunyuanJobStatus[] = []
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
export let canApplyGeneratedAssetToSelection = false
export let onWorkflowBrowserUp: () => void = () => {}
export let onWorkflowBrowserRefresh: () => void = () => {}
export let onSelectWorkflowItem: (item: {
  name: string
  path: string
  isDirectory: boolean
}) => void = () => {}

$: selectedHunyuanJob =
  recentHunyuanJobs.find(job => job.id === selectedHunyuanJobId) ?? null
$: selectedSourcePreviewUrl = selectedNode?.asset?.url ?? ''
$: currentReferencePreviewUrl =
  hunyuanReferenceImageUrl || hunyuanDetectedReferenceImageUrl || ''
$: latestJobReferenceImageUrl =
  selectedHunyuanJob?.result?.referenceImageUrl || ''
$: aiServiceSummary =
  comfyUiReady && hunyuanServiceReady
    ? 'ready'
    : comfyUiBusy || hunyuanBusy
      ? 'checking services'
      : 'service setup required'
$: aiNextAction = !comfyUiReady
  ? 'Start or refresh ComfyUI.'
  : !hunyuanServiceReady
    ? 'Start or refresh the mesh backend.'
    : hunyuanLastOutputUrl
      ? 'Review the latest output, then add or apply it.'
      : canUseAiMeshStudio(selectedNode)
        ? 'Choose generate or retexture for the selected source.'
        : 'Provide a scratch prompt or select a supported mesh source.'

function getJobSummary(job: HunyuanJobStatus | null) {
  if (!job) return ''
  return job.sourceName || job.assetUrl || job.id
}

function getJobDetail(job: HunyuanJobStatus | null) {
  if (!job) return ''
  return job.error || job.result?.message || ''
}

function emit(type: string) {
  dispatch(type)
}
</script>

<div class="editor-section">
  <div class="label">Experimental AI Lab</div>
  <div class="editor-status-card">
    <div class="editor-status-title">{aiNextAction}</div>
    <div class="save-message">Experimental service-backed workflow: check services, choose generate or retexture, provide prompt/reference, run job, review output, then add or apply.</div>
    <div class="editor-chip-row">
      <span class:ready={comfyUiReady} class:warn={!comfyUiReady} class="editor-chip">ComfyUI {comfyUiReady ? 'ready' : 'not ready'}</span>
      <span class:ready={hunyuanServiceReady} class:warn={!hunyuanServiceReady} class="editor-chip">mesh backend {hunyuanServiceReady ? 'ready' : 'not ready'}</span>
      <span class:warn={hunyuanBusy || comfyUiBusy} class:ready={!hunyuanBusy && !comfyUiBusy} class="editor-chip">{aiServiceSummary}</span>
    </div>
  </div>

  <div class="tuple-group">
    <div class="tuple-label">ComfyUI</div>
    <div class="save-message">{comfyUiStatus}</div>
  </div>
  <div class="button-row compact editor-mt-sm">
    <button disabled={comfyUiBusy} on:click={() => emit('startComfyUi')}>
      {comfyUiBusy ? 'Working…' : comfyUiReady ? 'ComfyUI Ready' : 'Start ComfyUI'}
    </button>
    <button disabled={comfyUiBusy} on:click={() => emit('refreshComfyUi')}>
      Refresh ComfyUI
    </button>
  </div>
  <div class="tuple-group">
    <div class="tuple-label">ComfyUI API</div>
    <input class="text-input" bind:value={comfyUiApiUrl} />
  </div>
  <div class="tuple-group">
    <div class="tuple-label">AI Pipeline Template</div>
    <input class="text-input" value={selectedComfyWorkflowPath} readonly />
  </div>
  <div class="button-row compact editor-mt-sm">
    <button on:click={() => emit('resetWorkflowPath')}>Use Built-In</button>
  </div>
  <details class="editor-mt-sm">
    <summary class="save-message">Pipeline Template Browser</summary>
    <div class="button-row compact editor-mt-sm">
      <button data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={onWorkflowBrowserUp}>Up</button>
      <button data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={onWorkflowBrowserRefresh}>Refresh</button>
    </div>
    <div class="save-message path-label">{workflowBrowserPath}</div>
    {#if workflowBrowserError}
      <div class="save-message error-message">{workflowBrowserError}</div>
    {/if}
    <div class="hierarchy-list asset-browser-list">
      {#if workflowBrowserLoading}
        <div class="save-message">Loading workflows...</div>
      {:else}
        {#each workflowBrowserItems as item (item.path)}
          <button class:active={selectedComfyWorkflowPath === item.path} data-sfx-hover="hover-soft" data-sfx-click={item.isDirectory ? 'soft' : 'select'} on:click={() => onSelectWorkflowItem(item)}>
            <span class="node-label">{item.isDirectory ? 'dir' : 'workflow'} {item.name}</span>
            <span class="kind">{item.isDirectory ? 'dir' : 'workflow'}</span>
          </button>
        {/each}
      {/if}
    </div>
  </details>

  <div class="tuple-group">
    <div class="tuple-label">Mesh Backend</div>
    <div class="save-message">{hunyuanBackendStatus}</div>
  </div>
  <div class="button-row compact editor-mt-sm">
    <button disabled={hunyuanBusy} on:click={() => emit('startHunyuan')}>
      {hunyuanBusy ? 'Working…' : hunyuanServiceReady ? 'Backend Ready' : 'Start Hunyuan'}
    </button>
    <button disabled={hunyuanBusy} on:click={() => emit('refreshHunyuan')}>
      Refresh Backend
    </button>
  </div>
  <div class="tuple-group">
    <div class="tuple-label">Hunyuan API</div>
    <input class="text-input" bind:value={hunyuanApiUrl} />
  </div>

  <div class="button-row compact">
    <button disabled={hunyuanBusy || !hunyuanBackendCanGenerate} on:click={() => emit('generateScratch')}>
      {hunyuanBusy ? 'Working…' : 'Generate And Add To Scene'}
    </button>
    <button disabled={hunyuanBusy} on:click={() => emit('editGenerateWorkflow')}>
      Edit Generate Workflow
    </button>
  </div>
  <div class="tuple-group">
    <div class="tuple-label">New Asset Name</div>
    <input class="text-input" bind:value={hunyuanScratchName} />
  </div>
  <div class="tuple-group">
    <div class="tuple-label">Scratch Reference Image</div>
    <input class="text-input" bind:value={hunyuanScratchReferenceImageUrl} placeholder="/models/.../reference.png" />
  </div>
  <div class="save-message">Creates a brand-new asset in the generated library and adds it to the scene without replacing the current selection.</div>
  <div class="tuple-group">
    <div class="tuple-label">Scratch Prompt</div>
    <textarea
      rows="4"
      placeholder="Describe the new mesh you want to create. If no reference image is set, this prompt will be used to generate one first."
      bind:value={hunyuanScratchPrompt}
    ></textarea>
  </div>

  {#if canUseAiMeshStudio(selectedNode) && selectedNodes.length <= 1}
    <div class="editor-subsection">
      <div class="tuple-group">
        <div class="tuple-label">Selected Source</div>
        <input class="text-input" value={selectedNode?.name ?? ''} readonly />
      </div>
      <div class="tuple-group">
        <div class="tuple-label">{selectedNode?.asset ? 'Asset URL' : 'Source Type'}</div>
        <input
          class="text-input"
          value={
            selectedNode?.asset
              ? selectedNode.asset.url
              : selectedNode?.prefab
                ? `Prefab · ${selectedNode.prefab.type}`
                : selectedNode?.primitive
                  ? `Primitive · ${selectedNode.primitive.geometry}`
                  : ''
          }
          readonly
        />
      </div>
      <div class="save-message">{hunyuanStatus}</div>
      <div class="button-row compact editor-mt-sm">
        <button disabled={hunyuanBusy || !selectedNode?.asset} on:click={() => emit('inspectSelection')}>
          Refresh Asset
        </button>
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Reference Image</div>
        <input class="text-input" bind:value={hunyuanReferenceImageUrl} placeholder="/models/.../textures/basecolor.jpg" />
      </div>
      {#if hunyuanDetectedReferenceImageUrl}
        <div class="save-message">Detected reference: {hunyuanDetectedReferenceImageUrl}</div>
      {:else}
        <div class="save-message">Optional. Leave blank and the editor will generate a reference image from the prompt before generating or re-texturing.</div>
      {/if}
      {#if selectedSourcePreviewUrl}
        <EditorAssetPreview
          assetUrl={selectedSourcePreviewUrl}
          label="Selected Mesh Preview"
          hint="Preview of the mesh currently attached to the selected node."
        />
      {/if}
      {#if currentReferencePreviewUrl}
        <EditorAssetPreview
          imageUrl={currentReferencePreviewUrl}
          label="Current Reference Image"
          hint="This is the image feeding the current AI run."
          height={180}
        />
      {/if}
      <div class="tuple-group">
        <div class="tuple-label">Prompt / Style Note</div>
        <textarea
          rows="4"
          placeholder="Describe the mesh or texture treatment you want. If no reference image is set, this prompt will drive automatic reference-image generation."
          bind:value={hunyuanPrompt}
        ></textarea>
      </div>
      {#if matchingSelectionCount > 1}
        <label class="checkbox">
          <input type="checkbox" bind:checked={hunyuanApplyToSimilarNodes} />
          Apply result to all {matchingSelectionCount} {similarSelectionLabel}
        </label>
        <div class="button-row compact editor-mt-sm">
          <button on:click={() => emit('selectSimilar')}>Select Similar</button>
        </div>
      {/if}
      <div class="button-grid">
        <button
          disabled={hunyuanBusy || !hunyuanBackendCanGenerate || !hunyuanSupportsReplacement}
          on:click={() => emit('generateSelection')}
        >
          {hunyuanBusy ? 'Working…' : selectedNode?.asset ? 'Generate Replacement Mesh' : selectedNode?.primitive ? 'Generate From Primitive' : 'Generate From Prefab'}
        </button>
        <button
          disabled={hunyuanBusy || !hunyuanBackendCanRetexture || !hunyuanSupportsTextureWrap || !canRetextureSelection(selectedNode)}
          on:click={() => emit('textureSelection')}
        >
          {hunyuanBusy ? 'Working…' : 'Re-Texture Existing Mesh'}
        </button>
      </div>
      <div class="button-row compact editor-mt-sm">
        <button disabled={hunyuanBusy} on:click={() => emit('editGenerateWorkflow')}>Edit Generate Workflow</button>
        <button disabled={!canRetextureSelection(selectedNode) || hunyuanBusy} on:click={() => emit('editTextureWorkflow')}>Edit Texture Workflow</button>
      </div>
      {#if comfyWorkflowEditorStatus}
        <div class="save-message">{comfyWorkflowEditorStatus}</div>
      {/if}
      <div class="save-message">
        {selectedNode?.asset
          ? 'Generate Replacement Mesh replaces the selected node with a new generated asset. Re-Texture Existing Mesh keeps the node and swaps in a texture-wrapped variant.'
          : selectedNode?.primitive
            ? 'Generate From Primitive exports the current procedural geometry to a temporary GLB, runs it through the AI queue, and replaces the primitive with a generated asset.'
            : 'Generate From Prefab exports the current prefab geometry, runs it through the AI queue, and replaces the prefab with a generated asset.'}
      </div>
      {#if hunyuanLastOutputUrl}
        <div class="editor-subsection">
          <div class="tuple-group">
            <div class="tuple-label">Generated Asset</div>
            <input class="text-input" value={hunyuanLastOutputUrl} readonly />
          </div>
          <EditorAssetPreview
            assetUrl={hunyuanLastOutputUrl}
            label="Latest Generated Mesh"
            hint="Preview of the most recent generated or retextured asset."
          />
          {#if hunyuanLastResultSummary}
            <div class="save-message">{hunyuanLastResultSummary}</div>
          {/if}
          {#if hunyuanLastFitReport}
            <div class="save-message">{hunyuanLastFitReport}</div>
          {/if}
          <div class="button-row compact editor-mt-sm">
            <button on:click={() => emit('openGeneratedAsset')}>Open In Generated Assets</button>
            <button disabled={!canApplyGeneratedAssetToSelection} on:click={() => emit('applyGeneratedAsset')}>Apply To Selection</button>
          </div>
          <div class="button-row compact editor-mt-sm">
            <button on:click={() => emit('saveGeneratedResult')}>Save Level</button>
          </div>
        </div>
      {/if}
    </div>
  {:else if selectedNodes.length > 1}
    <div class="save-message">AI mesh tools need a single selected asset node. Multi-selection is not supported here.</div>
  {:else if selectedNode}
    <div class="save-message">The current selection is not an imported asset or supported prefab. Select a mesh-backed asset node or a procedural prefab to open AI mesh generation.</div>
  {:else}
    <div class="save-message">Select a single imported asset or prefab in the hierarchy, then use this panel to generate a new mesh or re-texture it.</div>
  {/if}

  {#if !canUseAiMeshStudio(selectedNode) && hunyuanLastOutputUrl}
    <div class="editor-subsection">
      <div class="tuple-group">
        <div class="tuple-label">Latest Generated Asset</div>
        <input class="text-input" value={hunyuanLastOutputUrl} readonly />
      </div>
      {#if hunyuanLastResultSummary}
        <div class="save-message">{hunyuanLastResultSummary}</div>
      {/if}
      {#if hunyuanLastFitReport}
        <div class="save-message">{hunyuanLastFitReport}</div>
      {/if}
      <div class="button-row compact editor-mt-sm">
        <button on:click={() => emit('openGeneratedAsset')}>Open In Generated Assets</button>
        <button disabled={!canApplyGeneratedAssetToSelection} on:click={() => emit('applyGeneratedAsset')}>Apply To Selection</button>
        <button on:click={() => emit('saveGeneratedResult')}>Save Level</button>
      </div>
    </div>
  {/if}

  <div class="editor-subsection">
    <div class="tuple-group">
      <div class="tuple-label">Recent AI Jobs</div>
      <div class="save-message">Track queue status, failures, and the latest generated assets.</div>
    </div>
    <div class="button-row compact editor-mt-sm">
      <button disabled={hunyuanJobsLoading} on:click={() => emit('refreshRecentJobs')}>
        {hunyuanJobsLoading ? 'Refreshing…' : 'Refresh Jobs'}
      </button>
    </div>
    {#if hunyuanJobsError}
      <div class="save-message error-message">{hunyuanJobsError}</div>
    {:else if recentHunyuanJobs.length === 0}
      <div class="save-message">No recent Hunyuan jobs yet.</div>
    {:else}
      <div class="hierarchy-list asset-browser-list">
        {#each recentHunyuanJobs as job (job.id)}
          <button class:active={selectedHunyuanJobId === job.id} on:click={() => selectedHunyuanJobId = job.id}>
            <span class="node-label">{job.status === 'failed' ? '❌' : job.status === 'succeeded' ? '✅' : job.status === 'running' ? '⏳' : '🕓'} {getJobSummary(job)}</span>
            <span class="kind">{job.mode || job.status}</span>
          </button>
        {/each}
      </div>
      {#if selectedHunyuanJob}
        <div class="editor-subsection">
          <div class="tuple-group">
            <div class="tuple-label">Selected Job</div>
            <input class="text-input" value={selectedHunyuanJob.id} readonly />
          </div>
          <div class="tuple-group">
            <div class="tuple-label">Status</div>
            <input class="text-input" value={`${selectedHunyuanJob.status}${selectedHunyuanJob.queuePosition ? ` · queue ${selectedHunyuanJob.queuePosition}` : ''}`} readonly />
          </div>
          {#if selectedHunyuanJob.sourceName}
            <div class="tuple-group">
              <div class="tuple-label">Source</div>
              <input class="text-input" value={selectedHunyuanJob.sourceName} readonly />
            </div>
          {/if}
          {#if selectedHunyuanJob.result?.assetUrl}
            <div class="tuple-group">
              <div class="tuple-label">Output Asset</div>
              <input class="text-input" value={selectedHunyuanJob.result.assetUrl} readonly />
            </div>
          {/if}
          {#if latestJobReferenceImageUrl}
            <EditorAssetPreview
              imageUrl={latestJobReferenceImageUrl}
              label="Selected Job Reference Image"
              hint="This is the ComfyUI image reference recorded for the selected AI job."
              height={180}
            />
          {/if}
          {#if selectedHunyuanJob.result?.assetUrl}
            <EditorAssetPreview
              assetUrl={selectedHunyuanJob.result.assetUrl}
              label="Selected Job Output Mesh"
              hint="Preview of the output mesh produced by the selected AI job."
            />
          {/if}
          {#if selectedHunyuanJob.prompt}
            <div class="tuple-group">
              <div class="tuple-label">Prompt</div>
              <textarea rows="3" readonly>{selectedHunyuanJob.prompt}</textarea>
            </div>
          {/if}
          {#if getJobDetail(selectedHunyuanJob)}
            <div class="tuple-group">
              <div class="tuple-label">Failure / Detail</div>
              <textarea rows="4" readonly>{getJobDetail(selectedHunyuanJob)}</textarea>
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</div>
