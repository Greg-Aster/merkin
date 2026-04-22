<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { EditorSceneNode } from './editorStore'

  const dispatch = createEventDispatcher()

  export let styleProfileName = 'Painterly Storybook'
  export let stylePrompt = ''
  export let styleNegativePrompt = ''
  export let styleLoraNotes = ''
  export let styleControlNetNotes = ''
  export let styleReferenceImageUrl = ''
  export let styleSimplifyRatio = 0.6
  export let styleSimplifyError = 0.001

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
  export let stylePresets: Array<{
    id: string
    label: string
    prompt: string
    negativePrompt: string
    loraNotes: string
    controlNetNotes: string
  }> = []
  export let styleSceneCandidates: Array<{
    id: string
    name: string
    kindLabel: string
    descriptor: string
    selected: boolean
    status: string
  }> = []

  export let comfyUiStatus = ''
  export let comfyUiBusy = false
  export let comfyUiReady = false
  export let hunyuanBackendStatus = ''
  export let hunyuanBusy = false
  export let hunyuanServiceReady = false
  export let hunyuanDetectedReferenceImageUrl = ''

  export let selectedNode: EditorSceneNode | null = null
  export let selectedNodes: EditorSceneNode[] = []
  export let canUseStyleStudio: (node: EditorSceneNode | null) => boolean = () => false
  export let runtimeAssetFailures: Array<{ id: string, source: string, message: string, updatedAt: number }> = []
  export let pipelineLogEnabled = false
  export let pipelineLogEntries: string[] = []

  function emit(type: string) {
    dispatch(type)
  }

  function emitPresetApply(presetId: string) {
    dispatch('applyStylePreset', { presetId })
  }

  function emitBatchToggle(candidateId: string, selected: boolean) {
    dispatch('toggleBatchCandidate', { candidateId, selected })
  }

  function emitBatchDescriptorUpdate(candidateId: string, descriptor: string) {
    dispatch('updateBatchDescriptor', { candidateId, descriptor })
  }

  function emitPipelineLogToggle(value: boolean) {
    dispatch('setPipelineLogEnabled', { value })
  }

  $: hasSelectedAsset = selectedNodes.length <= 1 && canUseStyleStudio(selectedNode)
  $: hasInspection = styleInspectReport.trim().length > 0 || styleSourceSummary.trim().length > 0
  $: resolvedReferenceImageUrl = styleReferenceImageUrl || styleGeneratedReferenceImageUrl || hunyuanDetectedReferenceImageUrl
  $: hasReference = resolvedReferenceImageUrl.trim().length > 0
  $: hasStyleBrief = stylePrompt.trim().length > 0
  $: workspaceReady = styleWorkspaceManifestUrl.trim().length > 0
  $: canBakeTexture = hasSelectedAsset && (hasReference || hasStyleBrief)
  $: canReplaceMesh = hasSelectedAsset && hasStyleBrief
  $: selectedBatchCount = styleSceneCandidates.filter((candidate) => candidate.selected).length
  $: totalBatchCount = styleSceneCandidates.length
  $: canBatchRetexture = selectedBatchCount > 0 && (hasReference || hasStyleBrief)
  $: canBatchReimagine = selectedBatchCount > 0 && hasStyleBrief
</script>

<div class="editor-section">
  <div class="label">Style Studio</div>

  {#if totalBatchCount > 0}
    <div class="editor-status-card editor-mt-sm">
      <div class="editor-status-title">Scene Regeneration Batch</div>
      <div class="save-message">Use one shared style brief, then choose a few objects or the whole scene. Each selected object runs through the queue independently, so repeated pillars can keep their identity while still varying by seed.</div>
      <div class="editor-chip-row">
        <div class:ready={selectedBatchCount > 0} class:warn={selectedBatchCount === 0} class="editor-chip">
          {selectedBatchCount} selected
        </div>
        <div class="editor-chip">
          {totalBatchCount} geometry nodes
        </div>
      </div>
      <div class="button-row compact editor-mt-sm">
        <button disabled={styleBatchBusy} on:click={() => emit('selectAllBatchCandidates')}>
          Select All
        </button>
        <button disabled={styleBatchBusy} on:click={() => emit('clearBatchCandidates')}>
          Unselect All
        </button>
        <button disabled={!styleBatchBusy} on:click={() => emit('pauseBatch')}>
          Pause Batch
        </button>
        <button class="danger" disabled={!styleBatchBusy} on:click={() => emit('cancelBatch')}>
          Cancel + Discard
        </button>
      </div>
      {#if styleBatchResumeAvailable && !styleBatchBusy}
        <div class="button-row compact editor-mt-sm">
          <button on:click={() => emit('resumeBatch')}>Resume Last Session</button>
          <button on:click={() => emit('discardBatch')}>Discard Saved Session</button>
        </div>
        <div class="save-message">{styleBatchResumeSummary}</div>
      {/if}
      <div class="button-row compact editor-mt-sm">
        <button disabled={styleBatchBusy || !canBatchRetexture} on:click={() => emit('runBatchRetexture')}>
          {styleBatchBusy ? 'Baking Scene…' : 'Bake Style Onto Selected Meshes'}
        </button>
        <button disabled={styleBatchBusy || !canBatchReimagine} on:click={() => emit('runBatchReimagine')}>
          {styleBatchBusy ? 'Reimagining Scene…' : 'Reimagine Selected Objects'}
        </button>
      </div>
      {#if !hasStyleBrief}
        <div class="save-message">Full mesh reimagine stays disabled until you write the shared style brief below.</div>
      {/if}
      {#if !hasReference && !hasStyleBrief}
        <div class="save-message">Texture-only batch needs a shared style brief or a reference image.</div>
      {/if}
      {#if styleBatchStatus}
        <div class="save-message">{styleBatchStatus}</div>
      {/if}
      {#if hunyuanLastFitReport}
        <div class="save-message">{hunyuanLastFitReport}</div>
      {/if}
    </div>

    {#if runtimeAssetFailures.length > 0}
      <div class="editor-status-card editor-mt-sm">
        <div class="editor-status-title">Recent Asset Failures</div>
        <div class="save-message">These come from the runtime loader, not just the prompt.</div>
        {#each runtimeAssetFailures.slice(0, 5) as failure (failure.id)}
          <div class="save-message error-message">{failure.source}: {failure.message}</div>
        {/each}
      </div>
    {/if}

    <div class="save-message editor-mt-sm">Pipeline events are mirrored to the local tools terminal instead of being kept in a large panel here.</div>

    <div class="editor-workflow-step editor-mt-sm">
      <div class="editor-step-title">Shared Style Brief</div>
      <div class="editor-step-copy">These settings drive the whole batch. Object descriptors below are combined with this brief for each job.</div>
      <div class="tuple-group editor-mt-sm">
        <div class="tuple-label">Style Profile</div>
        <input class="text-input" bind:value={styleProfileName} placeholder="Painterly Storybook, Soft Ruin Watercolor, Ghibli Stone Garden" />
      </div>
      <div class="tuple-group">
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem;">
          <div class="tuple-label">Target Look</div>
          <select
            style="padding: 0.28rem 0.35rem; font-size: 0.62rem; background: rgba(86, 148, 192, 0.12); border: 1px solid rgba(126, 203, 255, 0.24); color: #a7d3ef; border-radius: 0.3rem; cursor: pointer; min-width: 120px;"
            title="Quick presets"
            on:change={(e) => {
              const presetId = e.currentTarget.value
              if (presetId) {
                const preset = stylePresets.find((p) => p.id === presetId)
                if (preset) {
                  stylePrompt = preset.prompt
                  styleNegativePrompt = preset.negativePrompt
                  styleLoraNotes = preset.loraNotes
                  styleControlNetNotes = preset.controlNetNotes
                  styleProfileName = preset.label
                  e.currentTarget.value = ''
                }
              }
            }}
          >
            <option value="" style="color: #333;">Quick presets…</option>
            {#each stylePresets as preset (preset.id)}
              <option value={preset.id} style="color: #333;">{preset.label}</option>
            {/each}
          </select>
        </div>
        <textarea
          rows="4"
          bind:value={stylePrompt}
          placeholder="Example: hand-painted storybook ruins, softened edges, visible brush gradients, unified materials, no photoreal surface noise"
        ></textarea>
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Reference Image</div>
        <input class="text-input" bind:value={styleReferenceImageUrl} placeholder="/generated/.../reference.png" />
      </div>
      {#if resolvedReferenceImageUrl}
        <div class="editor-image-preview-card">
          <div class="tuple-label">Batch Reference Preview</div>
          <img class="editor-image-preview" src={resolvedReferenceImageUrl} alt="Batch style reference" />
        </div>
      {/if}
      <div class="tuple-group">
        <div class="tuple-label">LoRA / Adapter Notes</div>
        <textarea rows="2" bind:value={styleLoraNotes} placeholder="Optional notes for model stack, LoRAs, or adapters." ></textarea>
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Shape Preservation Notes</div>
        <textarea rows="2" bind:value={styleControlNetNotes} placeholder="Optional notes on silhouette, depth, or structure constraints." ></textarea>
      </div>
    </div>

    <div class="editor-workflow-step editor-mt-sm">
      <div class="editor-step-title">Scene Candidates</div>
      <div class="editor-step-copy">Each object keeps its own descriptor. That descriptor is combined with the shared style brief when the batch runs.</div>
      <div class="editor-style-batch-list editor-mt-sm">
        {#each styleSceneCandidates as candidate (candidate.id)}
          <div class="editor-style-batch-item">
            <label class="checkbox editor-style-batch-toggle">
              <input
                type="checkbox"
                checked={candidate.selected}
                disabled={styleBatchBusy}
                on:change={(event) => emitBatchToggle(candidate.id, (event.currentTarget as HTMLInputElement).checked)}
              />
              <span>{candidate.name}</span>
            </label>
            <div class="save-message">{candidate.kindLabel}</div>
            <div class="tuple-label editor-mt-sm">Object Descriptor</div>
            <input
              class="text-input editor-mt-sm"
              value={candidate.descriptor}
              disabled={styleBatchBusy}
              placeholder="weathered pillar, ruined floor slab, retro-futurist bench"
              on:input={(event) => emitBatchDescriptorUpdate(candidate.id, (event.currentTarget as HTMLInputElement).value)}
            />
            {#if candidate.status}
              <div class="save-message editor-mt-sm">{candidate.status}</div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if selectedNodes.length > 1}
    <div class="editor-status-card">
      <div class="editor-status-title">One asset at a time</div>
      <div class="save-message">Single-object controls still work one node at a time. The scene batch section above can work across many geometry nodes.</div>
    </div>
  {:else if hasSelectedAsset}
    <div class="editor-status-card">
      <div class="editor-status-title">{selectedNode?.name}</div>
      <div class="save-message">{selectedNode?.asset?.url}</div>
      {#if styleSourceSummary}
        <div class="save-message">{styleSourceSummary}</div>
      {/if}
      <div class="save-message">ComfyUI: {comfyUiStatus}</div>
      <div class="save-message">Hunyuan: {hunyuanBackendStatus}</div>
      <div class="editor-chip-row">
        <div class:ready={comfyUiReady} class:warn={!comfyUiReady} class="editor-chip">
          {comfyUiReady ? 'ComfyUI Ready' : 'ComfyUI Offline'}
        </div>
        <div class:ready={hunyuanServiceReady} class:warn={!hunyuanServiceReady} class="editor-chip">
          {hunyuanServiceReady ? 'Hunyuan Ready' : 'Hunyuan Offline'}
        </div>
        <div class:ready={hasInspection} class:warn={!hasInspection} class="editor-chip">
          {hasInspection ? 'Source Analyzed' : 'Needs Analysis'}
        </div>
        <div class:ready={workspaceReady} class:warn={!workspaceReady} class="editor-chip">
          {workspaceReady ? 'Workspace Ready' : 'Workspace Missing'}
        </div>
      </div>
      <div class="save-message">{styleStatus}</div>
      <div class="button-row compact editor-mt-sm">
        <button disabled={comfyUiBusy} on:click={() => emit('startComfyUi')}>
          {comfyUiBusy ? 'Starting ComfyUI…' : 'Start / Check ComfyUI'}
        </button>
        <button disabled={hunyuanBusy} on:click={() => emit('startHunyuan')}>
          {hunyuanBusy ? 'Starting Hunyuan…' : 'Start / Check Hunyuan'}
        </button>
      </div>
    </div>

    <div class="editor-status-card editor-mt-sm">
      <div class="editor-status-title">Recommended Path</div>
      <div class="save-message">1. Analyze the source mesh. 2. Describe the target look. 3. Package the style workspace. 4. Bake the style onto the current mesh.</div>
      <div class="save-message">The safe action is texture-only. Mesh replacement is separated below and clearly marked.</div>
    </div>

    {#if stylePresets.length > 0}
      <div class="editor-workflow-step editor-mt-sm">
        <div class="editor-workflow-heading">
          <div class="editor-step-number">0</div>
          <div>
            <div class="editor-step-title">Curated Presets</div>
            <div class="editor-step-copy">Start from a production-ready preset instead of rewriting the brief from scratch.</div>
          </div>
        </div>
        <div class="asset-list editor-mt-sm">
          {#each stylePresets as preset (preset.id)}
            <button on:click={() => emitPresetApply(preset.id)}>{preset.label}</button>
          {/each}
        </div>
      </div>
    {/if}

    <div class="editor-workflow-step editor-mt-sm">
      <div class="editor-workflow-heading">
        <div class="editor-step-number">1</div>
        <div>
          <div class="editor-step-title">Analyze Source Mesh</div>
          <div class="editor-step-copy">Reads the current asset, inspects textures and geometry, and detects a usable source image if one exists.</div>
        </div>
      </div>
      <div class="button-row compact editor-mt-sm">
        <button disabled={styleBusy} on:click={() => emit('inspectAsset')}>
          {styleBusy ? 'Working…' : 'Analyze Mesh + Textures'}
        </button>
      </div>
      {#if hunyuanDetectedReferenceImageUrl}
        <div class="save-message">Detected source image: {hunyuanDetectedReferenceImageUrl}</div>
      {/if}
    </div>

    <div class="editor-workflow-step editor-mt-sm">
      <div class="editor-workflow-heading">
        <div class="editor-step-number">2</div>
        <div>
          <div class="editor-step-title">Describe The Target Look</div>
          <div class="editor-step-copy">This is the art brief. Keep it focused on the desired painted finish, not object identity.</div>
        </div>
      </div>

      <div class="tuple-group editor-mt-sm">
        <div class="tuple-label">Style Profile</div>
        <input class="text-input" bind:value={styleProfileName} />
      </div>
      <div class="tuple-group">
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem;">
          <div class="tuple-label">Target Look</div>
          <select
            style="padding: 0.28rem 0.35rem; font-size: 0.62rem; background: rgba(86, 148, 192, 0.12); border: 1px solid rgba(126, 203, 255, 0.24); color: #a7d3ef; border-radius: 0.3rem; cursor: pointer; min-width: 120px;"
            title="Quick presets"
            on:change={(e) => {
              const presetId = e.currentTarget.value
              if (presetId) {
                const preset = stylePresets.find((p) => p.id === presetId)
                if (preset) {
                  stylePrompt = preset.prompt
                  styleNegativePrompt = preset.negativePrompt
                  styleLoraNotes = preset.loraNotes
                  styleControlNetNotes = preset.controlNetNotes
                  styleProfileName = preset.label
                  e.currentTarget.value = ''
                }
              }
            }}
          >
            <option value="" style="color: #333;">Quick presets…</option>
            {#each stylePresets as preset (preset.id)}
              <option value={preset.id} style="color: #333;">{preset.label}</option>
            {/each}
          </select>
        </div>
        <textarea
          rows="4"
          bind:value={stylePrompt}
          placeholder="Example: hand-painted storybook prop, broad brush gradients, softened material detail, unified painterly wear"
        ></textarea>
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Avoid</div>
        <textarea
          rows="3"
          bind:value={styleNegativePrompt}
          placeholder="Example: photoreal noise, hard metallic glare, plastic surfaces, inconsistent texture detail"
        ></textarea>
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Reference Image</div>
        <input class="text-input" bind:value={styleReferenceImageUrl} placeholder="/generated/.../reference.png" />
      </div>
      {#if resolvedReferenceImageUrl}
        <div class="editor-image-preview-card">
          <div class="tuple-label">Current Reference Preview</div>
          <img class="editor-image-preview" src={resolvedReferenceImageUrl} alt="Current style reference" />
          <div class="save-message">This is the image currently feeding the style workflow.</div>
        </div>
      {/if}
      {#if styleGeneratedReferenceImageUrl}
        <div class="editor-image-preview-card">
          <div class="tuple-label">Generated Comfy Reference</div>
          <img class="editor-image-preview" src={styleGeneratedReferenceImageUrl} alt="Generated Comfy reference" />
          <div class="save-message">{styleGeneratedReferenceImageUrl}</div>
        </div>
      {/if}
      <div class="tuple-group">
        <div class="tuple-label">LoRA / Adapter Notes</div>
        <textarea
          rows="2"
          bind:value={styleLoraNotes}
          placeholder="Optional notes for the model stack you want this asset family to use."
        ></textarea>
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Shape Preservation Notes</div>
        <textarea
          rows="2"
          bind:value={styleControlNetNotes}
          placeholder="Optional notes on what silhouette or structure must stay intact."
        ></textarea>
      </div>
    </div>

    <div class="editor-workflow-step editor-mt-sm">
      <div class="editor-workflow-heading">
        <div class="editor-step-number">3</div>
        <div>
          <div class="editor-step-title">Package Style Workspace</div>
          <div class="editor-step-copy">Bundles the current mesh, reference image, and style brief into one workspace. This is the staging step before AI or Blender work.</div>
        </div>
      </div>
      <div class="button-row compact editor-mt-sm">
        <button disabled={styleBusy} on:click={() => emit('prepareWorkspace')}>
          {styleBusy ? 'Working…' : 'Package Mesh + References'}
        </button>
      </div>
      <div class="save-message">Do this before any AI style bake. It makes the workflow reproducible and easier to debug.</div>
      {#if styleWorkspaceManifestUrl}
        <div class="tuple-group">
          <div class="tuple-label">Workspace Manifest</div>
          <input class="text-input" value={styleWorkspaceManifestUrl} readonly />
        </div>
      {/if}
      {#if styleWorkspaceSourceAssetUrl}
        <div class="tuple-group">
          <div class="tuple-label">Workspace Source Mesh</div>
          <input class="text-input" value={styleWorkspaceSourceAssetUrl} readonly />
        </div>
      {/if}
    </div>

    <div class="editor-workflow-step editor-workflow-step-recommended editor-mt-sm">
      <div class="editor-workflow-heading">
        <div class="editor-step-number">4</div>
        <div>
          <div class="editor-step-title">Safe Action: Bake Style Onto Current Mesh</div>
          <div class="editor-step-copy">Keeps the object identity and overall shape. This is the texture-and-surface route, not a recreation route.</div>
        </div>
      </div>
      <div class="button-row compact editor-mt-sm">
        <button disabled={!canBakeTexture || styleBusy || hunyuanBusy} on:click={() => emit('runRetexture')}>
          {hunyuanBusy ? 'Working…' : 'Keep Shape, Bake New Style'}
        </button>
      </div>
      {#if !hasReference && !hasStyleBrief}
        <div class="save-message">Disabled until you provide a target look or a reference image.</div>
      {:else if !workspaceReady}
        <div class="save-message">If the workspace is missing, the editor will restore the last one or package a fresh one automatically.</div>
      {:else}
        <div class="save-message">Recommended for consistent art direction without changing the object into something else.</div>
      {/if}
      <div class="save-message">What you can see here today: the reference image ComfyUI used. The final painted result is currently baked into the output `.glb`, not surfaced as a separate texture preview yet.</div>
    </div>

    <div class="editor-workflow-step editor-workflow-step-danger editor-mt-sm">
      <div class="editor-workflow-heading">
        <div class="editor-step-number">5</div>
        <div>
          <div class="editor-step-title">Advanced: Replace Mesh With New AI Variant</div>
          <div class="editor-step-copy">This can change the shape, topology, and proportions. Use it when you actually want a new object, not just a new finish.</div>
        </div>
      </div>
      <div class="button-row compact editor-mt-sm">
        <button class="danger" disabled={!canReplaceMesh || styleBusy || hunyuanBusy} on:click={() => emit('runReimagine')}>
          {hunyuanBusy ? 'Working…' : 'Replace Mesh With AI Variant'}
        </button>
      </div>
      {#if !hasStyleBrief}
        <div class="save-message">Disabled until you provide a target look.</div>
      {:else if !workspaceReady}
        <div class="save-message">If the workspace is missing, the editor will restore the last one or package a fresh one automatically.</div>
      {:else}
        <div class="save-message">Not recommended for simple style application.</div>
      {/if}
    </div>

    <div class="editor-workflow-step editor-mt-sm">
      <div class="editor-workflow-heading">
        <div class="editor-step-number">6</div>
        <div>
          <div class="editor-step-title">Mesh Prep And Blender Handoff</div>
          <div class="editor-step-copy">Create a lower-poly variant or package the asset for manual work in Blender.</div>
        </div>
      </div>
      <div class="tuple-group editor-mt-sm">
        <div class="tuple-label">Simplify Ratio</div>
        <input class="tuple-input" type="number" min="0.05" max="1" step="0.05" bind:value={styleSimplifyRatio} />
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Error Threshold</div>
        <input class="tuple-input" type="number" min="0.00001" max="1" step="0.0001" bind:value={styleSimplifyError} />
      </div>
      <div class="button-grid editor-mt-sm">
        <button disabled={styleBusy} on:click={() => emit('simplifyAsset')}>
          {styleBusy ? 'Working…' : 'Create Low-Poly Variant'}
        </button>
        <button disabled={styleBusy} on:click={() => emit('exportBlender')}>
          {styleBusy ? 'Working…' : 'Package For Blender'}
        </button>
      </div>
      {#if styleSimplifiedAssetUrl}
        <div class="tuple-group">
          <div class="tuple-label">Low-Poly Variant</div>
          <input class="text-input" value={styleSimplifiedAssetUrl} readonly />
        </div>
      {/if}
      {#if styleBlenderExportPath}
        <div class="tuple-group">
          <div class="tuple-label">Blender Package</div>
          <input class="text-input" value={styleBlenderExportPath} readonly />
        </div>
      {/if}
      {#if styleBlenderOpenCommand}
        <div class="tuple-group">
          <div class="tuple-label">Open Command</div>
          <input class="text-input" value={styleBlenderOpenCommand} readonly />
        </div>
      {/if}
    </div>

    {#if styleInspectReport}
      <div class="editor-workflow-step editor-mt-sm">
        <div class="editor-step-title">Asset Report</div>
        <div class="editor-step-copy">This is the source breakdown from glTF inspection. Use it to spot overly dense meshes or oversized textures.</div>
        <div class="tuple-group">
          <textarea rows="10" readonly value={styleInspectReport}></textarea>
        </div>
      </div>
    {/if}
  {:else if selectedNode}
    <div class="editor-status-card">
      <div class="editor-status-title">Unsupported Selection</div>
      <div class="save-message">Style Studio currently works on geometry-backed nodes only. Select an imported mesh, primitive, or prefab.</div>
    </div>
  {:else}
    <div class="editor-status-card">
      <div class="editor-status-title">No Asset Selected</div>
      <div class="save-message">Select a single geometry node to use the focused workflow, or use the scene batch section above to regenerate many objects together.</div>
    </div>
  {/if}
</div>
