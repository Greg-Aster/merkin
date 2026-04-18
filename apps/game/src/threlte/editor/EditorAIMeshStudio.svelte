<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { EditorSceneNode } from './editorStore'
  import RuntimeDiagnosticsPanel from '../ui/RuntimeDiagnosticsPanel.svelte'

  const dispatch = createEventDispatcher()

  export let comfyUiStatus = ''
  export let comfyUiApiUrl = ''
  export let comfyUiBusy = false
  export let comfyUiReady = false

  export let hunyuanApiUrl = ''
  export let hunyuanStatus = ''
  export let hunyuanBackendStatus = ''
  export let hunyuanBusy = false
  export let hunyuanServiceReady = false
  export let hunyuanBackendCanGenerate = false
  export let hunyuanBackendCanRetexture = false
  export let hunyuanLastOutputUrl = ''
  export let hunyuanSupportsReplacement = false
  export let hunyuanSupportsTextureWrap = false
  export let hunyuanReferenceImageUrl = ''
  export let hunyuanDetectedReferenceImageUrl = ''
  export let hunyuanPrompt = ''

  export let hunyuanScratchName = 'Generated Artifact'
  export let hunyuanScratchReferenceImageUrl = ''
  export let hunyuanScratchPrompt = ''

  export let selectedNode: EditorSceneNode | null = null
  export let selectedNodes: EditorSceneNode[] = []
  export let canUseAiMeshStudio: (node: EditorSceneNode | null) => boolean = () => false
  export let canRetextureSelection: (node: EditorSceneNode | null) => boolean = () => false

  function emit(type: string) {
    dispatch(type)
  }
</script>

<div class="editor-section">
  <div class="label">AI Mesh Studio</div>

  <RuntimeDiagnosticsPanel title="Engine Status" compact={true} />

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
      {hunyuanBusy ? 'Working…' : 'Generate New Mesh Asset'}
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
  <div class="save-message">Optional. Leave blank and the editor will generate a reference image from your prompt automatically before running Hunyuan.</div>
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
        <input class="text-input" value={selectedNode?.asset ? selectedNode.asset.url : `Prefab · ${selectedNode?.prefab?.type ?? ''}`} readonly />
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
      <div class="tuple-group">
        <div class="tuple-label">Prompt / Style Note</div>
        <textarea
          rows="4"
          placeholder="Describe the mesh or texture treatment you want. If no reference image is set, this prompt will drive automatic reference-image generation."
          bind:value={hunyuanPrompt}
        ></textarea>
      </div>
      <div class="button-grid">
        <button
          disabled={hunyuanBusy || !hunyuanBackendCanGenerate || !hunyuanSupportsReplacement}
          on:click={() => emit('generateSelection')}
        >
          {hunyuanBusy ? 'Working…' : selectedNode?.asset ? 'Generate Replacement Mesh' : 'Generate From Prefab'}
        </button>
        <button
          disabled={hunyuanBusy || !hunyuanBackendCanRetexture || !hunyuanSupportsTextureWrap || !canRetextureSelection(selectedNode)}
          on:click={() => emit('textureSelection')}
        >
          {hunyuanBusy ? 'Working…' : 'Re-Texture Existing Mesh'}
        </button>
      </div>
      <div class="save-message">{selectedNode?.asset ? 'Generate a new textured GLB from the selected asset, or keep the mesh and ask Hunyuan to regenerate its wrapped texture set.' : 'Generate a brand-new textured GLB from this prefab selection. Once generated, the node will switch from prefab rendering to the imported mesh asset.'}</div>
      {#if hunyuanLastOutputUrl}
        <div class="tuple-group">
          <div class="tuple-label">Generated Asset</div>
          <input class="text-input" value={hunyuanLastOutputUrl} readonly />
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
</div>
