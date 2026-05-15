<script lang="ts">
import { createEventDispatcher } from 'svelte'
import type { EditorSceneNode } from './editorStore'
import type {
  EditorStyleBakeBackend,
  EditorStyleBakeOutputTier,
  EditorStyleBakeProduct,
  EditorStyleBakeStatus,
} from './editorStyleBakeTypes'

const dispatch = createEventDispatcher()

export let workspaceMode: 'generation' | 'bake' = 'generation'
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
export let styleBakedAssetUrl = ''
export let styleBakeBackend: EditorStyleBakeBackend = 'procedural-material'
export let styleBakeTextureSize = 256
export let styleBakeLineStrength = 0.35
export let styleBakeBrushStrength = 0.25
export let styleBakeAoStrength = 0.8
export let styleBakeCavityStrength = 0.65
export let styleBakeCurvatureStrength = 0.45
export let styleBakeGeometrySimplification = 0
export let styleBakeOutputTier: EditorStyleBakeOutputTier = 'preview'
export let styleBakeForceRefresh = false
export let styleBakeCurrentSourceAssetUrl = ''
export let styleBakeProduct: EditorStyleBakeProduct | null = null
export let styleBakeProductStatus: EditorStyleBakeStatus = 'missing'
export let styleBakeLastError = ''
export let styleBakeLastSuccessfulAt = ''
export let styleBakeCanApply = false
export let styleBakeCanRevert = false
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
export let comfyUiLowVramMode = false
export let hunyuanBackendStatus = ''
export let hunyuanBusy = false
export let hunyuanServiceReady = false
export let hunyuanDetectedReferenceImageUrl = ''

export let selectedNode: EditorSceneNode | null = null
export let selectedNodes: EditorSceneNode[] = []
export let canUseStyleStudio: (node: EditorSceneNode | null) => boolean = () =>
  false
export let runtimeAssetFailures: Array<{
  id: string
  source: string
  message: string
  updatedAt: number
}> = []

let candidateSearch = ''
let showSelectedCandidatesOnly = false
let showCandidateDetails = false
let focusedCandidateId = ''
let forceProceduralBatch = false

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

function emitProceduralBatch(scope: string) {
  dispatch('runProceduralBatch', { scope, force: forceProceduralBatch })
}

function focusCandidate(candidateId: string) {
  focusedCandidateId = candidateId
}

function getCandidateState(candidate: (typeof styleSceneCandidates)[number]) {
  const status = candidate.status.toLowerCase()
  if (status.includes('failed') || status.includes('error')) return 'failed'
  if (status.includes('cancelled')) return 'cancelled'
  if (
    status.includes('applied') ||
    status.includes('finished') ||
    status.includes('cached') ||
    status.includes('reused')
  )
    return 'applied'
  if (
    status.includes('queued') ||
    status.includes('running') ||
    status.includes('generating') ||
    status.includes('reimagining') ||
    status.includes('baking') ||
    status.includes('preparing') ||
    status.includes('checking')
  ) {
    return 'working'
  }
  return candidate.selected ? 'selected' : 'available'
}

function getCandidateStateLabel(
  candidate: (typeof styleSceneCandidates)[number],
) {
  const state = getCandidateState(candidate)
  if (state === 'failed') return 'Failed'
  if (state === 'cancelled') return 'Cancelled'
  if (state === 'applied') return 'Applied'
  if (state === 'working') return 'Working'
  if (state === 'selected') return 'Selected'
  return 'Not selected'
}

$: hasSelectedAsset =
  selectedNodes.length <= 1 && canUseStyleStudio(selectedNode)
$: generationWorkspace = workspaceMode === 'generation'
$: bakeWorkspace = workspaceMode === 'bake'
$: hasInspection =
  styleInspectReport.trim().length > 0 || styleSourceSummary.trim().length > 0
$: resolvedReferenceImageUrl =
  styleReferenceImageUrl ||
  styleGeneratedReferenceImageUrl ||
  hunyuanDetectedReferenceImageUrl
$: hasReference = resolvedReferenceImageUrl.trim().length > 0
$: hasStyleBrief = stylePrompt.trim().length > 0
$: workspaceReady = styleWorkspaceManifestUrl.trim().length > 0
$: blenderBakeSelected = styleBakeBackend === 'blender-geometry'
$: canBakeProceduralStyle = hasSelectedAsset
$: styleBakeProductAssetUrl = styleBakeProduct?.assetUrl ?? styleBakedAssetUrl
$: styleBakeProductMetadataUrl = styleBakeProduct?.metadataUrl ?? ''
$: styleBakeSettingsDirty = !!(
  styleBakeProduct &&
  (styleBakeProduct.settings.textureSize !== Number(styleBakeTextureSize) ||
    styleBakeProduct.settings.lineStrength !== Number(styleBakeLineStrength) ||
    styleBakeProduct.settings.brushStrength !== Number(styleBakeBrushStrength) ||
    styleBakeProduct.settings.aoStrength !== Number(styleBakeAoStrength) ||
    styleBakeProduct.settings.cavityStrength !== Number(styleBakeCavityStrength) ||
    styleBakeProduct.settings.curvatureStrength !==
      Number(styleBakeCurvatureStrength) ||
    styleBakeProduct.settings.geometrySimplification !==
      Number(styleBakeGeometrySimplification) ||
    styleBakeProduct.settings.outputTier !== styleBakeOutputTier ||
    styleBakeProduct.source.assetUrl !== styleBakeCurrentSourceAssetUrl)
)
$: effectiveStyleBakeProductStatus =
  styleBakeLastError.trim().length > 0
    ? 'failed'
    : styleBakeSettingsDirty
      ? 'dirty'
      : styleBakeProductStatus
$: canApplyStyleBakePreview =
  styleBakeCanApply &&
  !styleBakeSettingsDirty &&
  effectiveStyleBakeProductStatus !== 'failed'
$: styleBakeStatusLabel =
  effectiveStyleBakeProductStatus === 'clean'
    ? 'clean'
    : effectiveStyleBakeProductStatus === 'dirty'
      ? 'dirty preview'
      : effectiveStyleBakeProductStatus === 'failed'
        ? 'failed'
        : 'missing'
$: styleBakeRunMessage = !hasSelectedAsset
  ? 'Select one geometry-backed object before baking.'
  : blenderBakeSelected
    ? 'Blender geometry bake runs through the headless backend and fails clearly if Blender is unavailable.'
    : 'Procedural preview preserves object identity and does not need a reference image.'
$: canBakeTexture = hasSelectedAsset && (hasReference || hasStyleBrief)
$: canReplaceMesh = hasSelectedAsset && hasStyleBrief
$: selectedBatchCount = styleSceneCandidates.filter(
  candidate => candidate.selected,
).length
$: totalBatchCount = styleSceneCandidates.length
$: selectedBakeableCount = selectedNodes.filter(node =>
  canUseStyleStudio(node),
).length
$: selectedBakeableScopeCount =
  selectedBakeableCount || (selectedNode && canUseStyleStudio(selectedNode) ? 1 : 0)
$: canBatchRetexture = selectedBatchCount > 0 && (hasReference || hasStyleBrief)
$: canBatchReimagine = selectedBatchCount > 0 && hasStyleBrief
$: canBatchProceduralStyle = totalBatchCount > 0
$: servicesReady = comfyUiReady && hunyuanServiceReady
$: selectedSourceLabel = selectedNode?.name ?? 'No object selected'
$: selectedSourceKind = selectedNode?.asset
  ? 'Mesh asset'
  : selectedNode?.primitive
    ? `Primitive ${selectedNode.primitive.geometry}`
    : selectedNode?.prefab
      ? `Prefab ${selectedNode.prefab.type}`
      : 'Unsupported selection'
$: normalizedCandidateSearch = candidateSearch.trim().toLowerCase()
$: visibleStyleSceneCandidates = styleSceneCandidates.filter(candidate => {
  if (showSelectedCandidatesOnly && !candidate.selected) return false
  if (!normalizedCandidateSearch) return true
  return [
    candidate.name,
    candidate.kindLabel,
    candidate.descriptor,
    candidate.status,
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedCandidateSearch)
})
$: focusedCandidate =
  visibleStyleSceneCandidates.find(candidate => candidate.id === focusedCandidateId) ??
  visibleStyleSceneCandidates[0] ??
  null
$: batchAppliedCount = styleSceneCandidates.filter(
  candidate =>
    candidate.status.toLowerCase().includes('applied') ||
    candidate.status.toLowerCase().includes('finished'),
).length
$: batchFailedCount = styleSceneCandidates.filter(
  candidate =>
    candidate.status.toLowerCase().includes('failed') ||
    candidate.status.toLowerCase().includes('error'),
).length
$: styleRunLog = [
  styleBatchStatus,
  styleStatus,
  bakeWorkspace ? styleBakeLastError : '',
  bakeWorkspace && styleBakeLastSuccessfulAt
    ? `Last successful bake: ${styleBakeLastSuccessfulAt}`
    : '',
  generationWorkspace ? hunyuanLastFitReport : '',
  ...runtimeAssetFailures
    .slice(0, 3)
    .map(failure => `${failure.source}: ${failure.message}`),
].filter(entry => entry && entry.trim().length > 0)
</script>

<div class="editor-section">
  <div class="label">{generationWorkspace ? 'Asset Regeneration' : 'Production Bake'}</div>

  <div class="editor-status-card editor-regeneration-hero">
    <div>
      <div class="editor-status-title">
        {generationWorkspace
          ? 'Regenerate assets without losing control of the level.'
          : 'Configure final bake products before production.'}
      </div>
      <div class="editor-step-copy">
        {generationWorkspace
          ? 'Pick scope, set the art direction, run one safe action, then review generated assets, collision status, and save state before publishing.'
          : 'Choose the object scope, tune deterministic bake settings, generate the product, then apply or rerun before publish.'}
      </div>
    </div>
    <div class="editor-chip-row">
      {#if generationWorkspace}
        <div class:ready={servicesReady} class:warn={!servicesReady} class="editor-chip">
          {servicesReady ? 'AI services ready' : 'Services need check'}
        </div>
        <div class:warn={comfyUiLowVramMode} class="editor-chip">
          {comfyUiLowVramMode ? 'low VRAM launch' : 'standard launch'}
        </div>
      {/if}
      <div class:ready={selectedBatchCount > 0 || hasSelectedAsset} class:warn={selectedBatchCount === 0 && !hasSelectedAsset} class="editor-chip">
        {selectedBatchCount > 0 ? `${selectedBatchCount} batch selected` : hasSelectedAsset ? 'single object selected' : 'no scope'}
      </div>
      {#if generationWorkspace}
        <div class:ready={hasStyleBrief} class:warn={!hasStyleBrief} class="editor-chip">
          {hasStyleBrief ? 'style brief ready' : 'needs brief'}
        </div>
      {:else}
        <div class:ready={effectiveStyleBakeProductStatus === 'clean'} class:warn={effectiveStyleBakeProductStatus === 'dirty' || effectiveStyleBakeProductStatus === 'missing'} class:danger={effectiveStyleBakeProductStatus === 'failed'} class="editor-chip">
          style bake {styleBakeStatusLabel}
        </div>
      {/if}
      <div class:ready={workspaceReady} class:warn={!workspaceReady} class="editor-chip">
        {workspaceReady ? 'workspace ready' : 'workspace pending'}
      </div>
    </div>
  </div>

  <div class="editor-regeneration-grid editor-mt-sm">
    <section class="editor-workflow-step">
      <div class="editor-workflow-heading">
        <div class="editor-step-number">1</div>
        <div>
          <div class="editor-step-title">Scope</div>
          <div class="editor-step-copy">Choose whether this run affects the selected object or a curated batch. Keep broad scene runs filtered and intentional.</div>
        </div>
      </div>

      <div class="editor-scope-summary editor-mt-sm">
        <div>
          <div class="tuple-label">Selected Object</div>
          <div class="editor-status-title">{selectedSourceLabel}</div>
          <div class="save-message">{selectedSourceKind}</div>
        </div>
        <div>
          <div class="tuple-label">Batch Scope</div>
          <div class="editor-status-title">{selectedBatchCount} / {totalBatchCount}</div>
          <div class="save-message">visible geometry candidates</div>
        </div>
      </div>

      <div class="button-row compact editor-mt-sm">
        <button disabled={styleBatchBusy} on:click={() => emit('selectAllBatchCandidates')}>
          Select All
        </button>
        <button disabled={styleBatchBusy} on:click={() => emit('clearBatchCandidates')}>
          Clear Batch
        </button>
      </div>

      <div class="tuple-group">
        <div class="tuple-label">Find Candidate</div>
        <input class="text-input" bind:value={candidateSearch} placeholder="filter by name, type, descriptor, or status" />
      </div>
      <label class="checkbox">
        <input type="checkbox" bind:checked={showSelectedCandidatesOnly} />
        <span>Show selected candidates only</span>
      </label>
      <label class="checkbox">
        <input type="checkbox" bind:checked={showCandidateDetails} />
        <span>Show object descriptors</span>
      </label>
      {#if generationWorkspace}
        <label class="checkbox">
          <input type="checkbox" bind:checked={comfyUiLowVramMode} disabled={comfyUiBusy || hunyuanBusy || styleBatchBusy} />
          <span>Low VRAM launch mode</span>
        </label>
      {/if}
    </section>

    {#if generationWorkspace}
    <section class="editor-workflow-step">
      <div class="editor-workflow-heading">
        <div class="editor-step-number">2</div>
        <div>
          <div class="editor-step-title">Art Direction</div>
          <div class="editor-step-copy">This is the brief shared by single-object and batch runs. Keep identity in descriptors; keep the look here.</div>
        </div>
      </div>

      <div class="tuple-group editor-mt-sm">
        <div class="tuple-label">Style Profile</div>
        <input class="text-input" bind:value={styleProfileName} placeholder="Abyssal Neon Cosmic Horror" />
      </div>

      <div class="tuple-group">
        <div class="tuple-label">Preset</div>
        <select
          class="text-input"
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
          <option value="">Choose preset...</option>
          {#each stylePresets as preset (preset.id)}
            <option value={preset.id}>{preset.label}</option>
          {/each}
        </select>
      </div>

      <div class="tuple-group">
        <div class="tuple-label">Target Look</div>
        <textarea
          rows="4"
          bind:value={stylePrompt}
          placeholder="Example: dark cosmic horror material, rune-carved stone, selective violet emissive fissures, strong silhouette hierarchy"
        ></textarea>
      </div>

      <div class="tuple-group">
        <div class="tuple-label">Reference Image</div>
        <input class="text-input" bind:value={styleReferenceImageUrl} placeholder="/generated/.../reference.png" />
      </div>

      {#if resolvedReferenceImageUrl}
        <div class="editor-image-preview-card">
          <div class="tuple-label">Reference Preview</div>
          <img class="editor-image-preview" src={resolvedReferenceImageUrl} alt="Current style reference" />
        </div>
      {/if}

      <details class="editor-advanced-block editor-mt-sm">
        <summary>Advanced prompt controls</summary>
        <div class="tuple-group">
          <div class="tuple-label">Avoid</div>
          <textarea rows="3" bind:value={styleNegativePrompt} placeholder="photoreal noise, hard glare, plastic surfaces, broken UVs"></textarea>
        </div>
        <div class="tuple-group">
          <div class="tuple-label">LoRA / Adapter Notes</div>
          <textarea rows="2" bind:value={styleLoraNotes} placeholder="Optional model-stack notes." ></textarea>
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Shape Preservation Notes</div>
          <textarea rows="2" bind:value={styleControlNetNotes} placeholder="Optional silhouette, depth, or structure constraints." ></textarea>
        </div>
      </details>
    </section>
    {:else}
    <section class="editor-workflow-step">
      <div class="editor-workflow-heading">
        <div class="editor-step-number">2</div>
        <div>
          <div class="editor-step-title">Style Contract</div>
          <div class="editor-step-copy">Review the style identity that will be stamped into the deterministic bake product.</div>
        </div>
      </div>

      <div class="tuple-group editor-mt-sm">
        <div class="tuple-label">Style Profile</div>
        <input class="text-input" bind:value={styleProfileName} placeholder="NES dungeon runtime bake" />
      </div>

      <div class="tuple-group">
        <div class="tuple-label">Bake Notes</div>
        <textarea
          rows="3"
          bind:value={stylePrompt}
          placeholder="Object-preserving style notes for this bake product"
        ></textarea>
      </div>
    </section>
    {/if}
  </div>

  {#if bakeWorkspace}
  <section class="editor-workflow-step editor-mt-sm">
    <div class="editor-workflow-heading">
      <div class="editor-step-number">3</div>
      <div>
        <div class="editor-step-title">Bake Controls</div>
        <div class="editor-step-copy">Choose the deterministic bake path and tune the generated texture product before running the selected object.</div>
      </div>
    </div>

    <div class="editor-field-grid editor-mt-sm">
      <label class="editor-field">
        <span class="editor-field-label">Bake Backend</span>
        <select class="text-input" bind:value={styleBakeBackend}>
          <option value="procedural-material">Procedural Preview</option>
          <option value="blender-geometry">Blender Geometry Bake</option>
        </select>
      </label>
      <label class="editor-field">
        <span class="editor-field-label">Output Tier</span>
        <select class="text-input" bind:value={styleBakeOutputTier}>
          <option value="preview">Preview</option>
          <option value="runtime">Runtime</option>
          <option value="hero">Hero</option>
        </select>
      </label>
      <label class="editor-field">
        <span class="editor-field-label">Texture Size</span>
        <input class="tuple-input" type="number" min="32" max="2048" step="32" bind:value={styleBakeTextureSize} />
      </label>
      <label class="editor-field">
        <span class="editor-field-label">Line Strength</span>
        <input class="tuple-input" type="number" min="0" max="1" step="0.05" bind:value={styleBakeLineStrength} />
      </label>
      <label class="editor-field">
        <span class="editor-field-label">Brush / Noise</span>
        <input class="tuple-input" type="number" min="0" max="1" step="0.05" bind:value={styleBakeBrushStrength} />
      </label>
      <label class="editor-field">
        <span class="editor-field-label">AO Strength</span>
        <input class="tuple-input" type="number" min="0" max="2" step="0.05" bind:value={styleBakeAoStrength} />
      </label>
      <label class="editor-field">
        <span class="editor-field-label">Cavity Strength</span>
        <input class="tuple-input" type="number" min="0" max="2" step="0.05" bind:value={styleBakeCavityStrength} />
      </label>
      <label class="editor-field">
        <span class="editor-field-label">Curvature Strength</span>
        <input class="tuple-input" type="number" min="0" max="2" step="0.05" bind:value={styleBakeCurvatureStrength} />
      </label>
      <label class="editor-field">
        <span class="editor-field-label">Geometry Simplification</span>
        <input class="tuple-input" type="number" min="0" max="0.95" step="0.05" bind:value={styleBakeGeometrySimplification} />
      </label>
      <label class="checkbox">
        <input type="checkbox" bind:checked={styleBakeForceRefresh} />
        <span>Refresh cached bake</span>
      </label>
    </div>

    <div class="editor-chip-row">
      <div class:ready={!blenderBakeSelected} class:warn={blenderBakeSelected} class="editor-chip">
        {blenderBakeSelected ? 'Blender required locally' : 'deterministic procedural'}
      </div>
      <div class:ready={effectiveStyleBakeProductStatus === 'clean'} class:warn={effectiveStyleBakeProductStatus === 'dirty' || effectiveStyleBakeProductStatus === 'missing'} class:danger={effectiveStyleBakeProductStatus === 'failed'} class="editor-chip">
        {styleBakeStatusLabel}
      </div>
      <div class:ready={canApplyStyleBakePreview} class:warn={!canApplyStyleBakePreview} class="editor-chip">
        {canApplyStyleBakePreview ? 'apply available' : styleBakeSettingsDirty ? 'rerun before apply' : 'nothing to apply'}
      </div>
      <div class:ready={styleBakeCanRevert} class:warn={!styleBakeCanRevert} class="editor-chip">
        {styleBakeCanRevert ? 'revert available' : 'nothing to revert'}
      </div>
    </div>
  </section>
  {/if}

  <section class="editor-workflow-step editor-mt-sm">
    <div class="editor-workflow-heading">
      <div class="editor-step-number">{generationWorkspace ? '3' : '4'}</div>
      <div>
        <div class="editor-step-title">{generationWorkspace ? 'Run AI Generation' : 'Run Bake'}</div>
        <div class="editor-step-copy">
          {generationWorkspace
            ? 'Use texture generation to preserve the object. Use mesh replacement only when you want a new generated object.'
            : 'Generate object-preserving bake products for preview, runtime, or hero output before publish.'}
        </div>
      </div>
    </div>

    <div class="editor-action-grid editor-mt-sm">
      {#if bakeWorkspace}
      <div class="editor-action-card recommended">
        <div class="editor-status-title">Deterministic Style Bake</div>
        <div class="save-message">{styleBakeRunMessage}</div>
        <div class="button-row editor-mt-sm">
          <button disabled={!canBakeProceduralStyle || styleBusy} on:click={() => emit('bakeProceduralStyle')}>
            {styleBusy ? 'Working...' : blenderBakeSelected ? 'Run Blender Bake Preview' : 'Run Bake Preview'}
          </button>
          <button disabled={!canApplyStyleBakePreview || styleBusy} on:click={() => emit('applyStyleBakePreview')}>
            Apply
          </button>
          <button disabled={!styleBakeCanRevert || styleBusy} on:click={() => emit('revertStyleBakePreview')}>
            Revert
          </button>
          <button disabled={styleBatchBusy || selectedBakeableScopeCount === 0} on:click={() => emitProceduralBatch('selected-objects')}>
            Bake Selected
          </button>
          <button disabled={styleBatchBusy || selectedBatchCount === 0} on:click={() => emitProceduralBatch('batch-selection')}>
            Bake Batch
          </button>
          <button disabled={styleBatchBusy || !canBatchProceduralStyle} on:click={() => emitProceduralBatch('visible')}>
            Bake Visible
          </button>
          <button disabled={styleBatchBusy || !canBatchProceduralStyle} on:click={() => emitProceduralBatch('level')}>
            Bake Level
          </button>
        </div>
        <label class="checkbox editor-mt-sm">
          <input type="checkbox" bind:checked={forceProceduralBatch} disabled={styleBatchBusy} />
          <span>Force batch cache refresh</span>
        </label>
      </div>
      {/if}

      {#if generationWorkspace}
      <div class="editor-action-card">
        <div class="editor-status-title">AI Texture Source</div>
        <div class="save-message">Restyles selected geometry using generated texture source art while preserving object identity.</div>
        <div class="button-row compact editor-mt-sm">
          <button disabled={!canBakeTexture || styleBusy || hunyuanBusy} on:click={() => emit('runRetexture')}>
            {hunyuanBusy ? 'Working...' : 'AI Restyle Selected'}
          </button>
          <button disabled={styleBatchBusy || !canBatchRetexture} on:click={() => emit('runBatchRetexture')}>
            {styleBatchBusy ? 'Working...' : 'Restyle Batch'}
          </button>
        </div>
      </div>

      <div class="editor-action-card danger">
        <div class="editor-status-title">Reimagine As New Mesh</div>
        <div class="save-message">Can change silhouette, topology, collision, and scale. Review before saving.</div>
        <div class="button-row compact editor-mt-sm">
          <button class="danger" disabled={!canReplaceMesh || styleBusy || hunyuanBusy} on:click={() => emit('runReimagine')}>
            {hunyuanBusy ? 'Working...' : 'Replace Selected'}
          </button>
          <button class="danger" disabled={styleBatchBusy || !canBatchReimagine} on:click={() => emit('runBatchReimagine')}>
            {styleBatchBusy ? 'Working...' : 'Replace Batch'}
          </button>
        </div>
      </div>
      {/if}
    </div>

    {#if generationWorkspace && !hasStyleBrief}
      <div class="save-message">Write a target look before running mesh replacement or large batch work.</div>
    {/if}
    {#if generationWorkspace && !hasReference && !hasStyleBrief}
      <div class="save-message">AI texture source generation needs a reference image or target look.</div>
    {/if}
  </section>

  <section class="editor-workflow-step editor-mt-sm">
    <div class="editor-workflow-heading">
      <div class="editor-step-number">{generationWorkspace ? '4' : '5'}</div>
      <div>
        <div class="editor-step-title">Progress And Review</div>
        <div class="editor-step-copy">
          {generationWorkspace
            ? 'Generated assets are not done until the result is applied, collision is valid, and the level is saved.'
            : 'Bake products are not production-ready until the selected product is clean, applied, and publish checks pass.'}
        </div>
      </div>
    </div>

    <div class="editor-chip-row">
      {#if bakeWorkspace}
      <div class:ready={effectiveStyleBakeProductStatus === 'clean'} class:warn={effectiveStyleBakeProductStatus === 'dirty' || effectiveStyleBakeProductStatus === 'missing'} class:danger={effectiveStyleBakeProductStatus === 'failed'} class="editor-chip">
        style bake {styleBakeStatusLabel}
      </div>
      {/if}
      <div class:ready={batchAppliedCount > 0} class="editor-chip">{batchAppliedCount} applied</div>
      <div class:danger={batchFailedCount > 0} class="editor-chip">{batchFailedCount} failed</div>
      <div class:warn={runtimeAssetFailures.length > 0} class:ready={runtimeAssetFailures.length === 0} class="editor-chip">
        {runtimeAssetFailures.length === 0 ? 'no runtime failures' : `${runtimeAssetFailures.length} runtime issue${runtimeAssetFailures.length === 1 ? '' : 's'}`}
      </div>
      <div class:ready={workspaceReady} class:warn={!workspaceReady} class="editor-chip">
        {workspaceReady ? 'workspace staged' : 'workspace will auto-stage'}
      </div>
    </div>

    {#if bakeWorkspace}
    <div class="editor-scope-summary editor-mt-sm">
      <div>
        <div class="tuple-label">Current Source Asset</div>
        <div class="save-message">{styleBakeCurrentSourceAssetUrl || selectedNode?.asset?.url || 'Source is resolved when the bake runs.'}</div>
      </div>
      <div>
        <div class="tuple-label">Generated Style Product</div>
        {#if styleBakeProductAssetUrl}
          <input class="text-input" value={styleBakeProductAssetUrl} readonly />
        {:else}
          <div class="save-message">No generated style product yet.</div>
        {/if}
      </div>
    </div>
    {/if}

    {#if bakeWorkspace && styleBakeProductMetadataUrl}
      <div class="tuple-group">
        <div class="tuple-label">Product Metadata</div>
        <input class="text-input" value={styleBakeProductMetadataUrl} readonly />
      </div>
    {/if}

    {#if styleRunLog.length > 0}
      <div class="editor-run-log editor-mt-sm">
        {#each styleRunLog as line, index (`${index}-${line}`)}
          <div class:error-message={line.toLowerCase().includes('failed') || line.toLowerCase().includes('error')} class="save-message">{line}</div>
        {/each}
      </div>
    {:else}
      <div class="save-message">No active {generationWorkspace ? 'regeneration' : 'bake'} messages yet.</div>
    {/if}

    <div class="button-row compact editor-mt-sm">
      <button disabled={!styleBatchBusy} on:click={() => emit('pauseBatch')}>
        Pause Batch
      </button>
      <button class="danger" disabled={!styleBatchBusy} on:click={() => emit('cancelBatch')}>
        Cancel Batch
      </button>
    </div>

    {#if styleBatchResumeAvailable && !styleBatchBusy}
      <div class="button-row compact editor-mt-sm">
        <button on:click={() => emit('resumeBatch')}>Resume Last Session</button>
        <button on:click={() => emit('discardBatch')}>Discard Saved Session</button>
      </div>
      <div class="save-message">{styleBatchResumeSummary}</div>
    {/if}
  </section>

  {#if totalBatchCount > 0}
    <section class="editor-workflow-step editor-mt-sm">
      <div class="editor-workflow-heading">
        <div class="editor-step-number">{generationWorkspace ? '5' : '6'}</div>
        <div>
          <div class="editor-step-title">Scene Candidate Browser</div>
          <div class="editor-step-copy">
            {visibleStyleSceneCandidates.length} visible of {totalBatchCount}. Status is shown per object during {generationWorkspace ? 'reimagine and restyle batches' : 'production bake batches'}.
          </div>
        </div>
      </div>
      <div class="editor-candidate-outliner editor-mt-sm">
        <div class="editor-candidate-header">
          <span>Object</span>
          <span>Type</span>
          <span>Status</span>
        </div>
        <div class="editor-candidate-rows" role="tree">
          {#if visibleStyleSceneCandidates.length === 0}
            <div class="editor-candidate-empty">No scene candidates match the current filter.</div>
          {/if}
          {#each visibleStyleSceneCandidates as candidate (candidate.id)}
            <div
              class="editor-candidate-row"
              class:active={focusedCandidate?.id === candidate.id}
              class:selected={candidate.selected}
              class:working={getCandidateState(candidate) === 'working'}
              class:failed={getCandidateState(candidate) === 'failed'}
              class:applied={getCandidateState(candidate) === 'applied'}
            >
              <label class="editor-candidate-check" title={candidate.selected ? 'Remove from batch' : 'Add to batch'}>
                <input
                  type="checkbox"
                  checked={candidate.selected}
                  disabled={styleBatchBusy}
                  on:change={(event) => emitBatchToggle(candidate.id, (event.currentTarget as HTMLInputElement).checked)}
                />
              </label>
              <button type="button" class="editor-candidate-name" on:click={() => focusCandidate(candidate.id)}>
                <span class="editor-candidate-label">{candidate.name}</span>
                {#if showCandidateDetails}
                  <span class="editor-candidate-detail">{candidate.descriptor}</span>
                {/if}
              </button>
              <span class="editor-candidate-kind">{candidate.kindLabel}</span>
              <span
                class="editor-candidate-status"
                class:ready={getCandidateState(candidate) === 'applied'}
                class:warn={getCandidateState(candidate) === 'working' || getCandidateState(candidate) === 'selected'}
                class:danger={getCandidateState(candidate) === 'failed' || getCandidateState(candidate) === 'cancelled'}
                title={candidate.status || getCandidateStateLabel(candidate)}
              >
                {getCandidateStateLabel(candidate)}
              </span>
            </div>
          {/each}
        </div>
      </div>
      {#if focusedCandidate}
        <div class="editor-candidate-detail-panel editor-mt-sm">
          <div>
            <div class="tuple-label">Focused Candidate</div>
            <div class="editor-status-title">{focusedCandidate.name}</div>
            <div class="save-message">{focusedCandidate.kindLabel}</div>
          </div>
          <div class="editor-chip-row">
            <span class:ready={focusedCandidate.selected} class:warn={!focusedCandidate.selected} class="editor-chip">
              {focusedCandidate.selected ? 'included in batch' : 'not in batch'}
            </span>
            <span
              class:ready={getCandidateState(focusedCandidate) === 'applied'}
              class:warn={getCandidateState(focusedCandidate) === 'working'}
              class:danger={getCandidateState(focusedCandidate) === 'failed'}
              class="editor-chip"
            >
              {getCandidateStateLabel(focusedCandidate)}
            </span>
          </div>
          <div class="tuple-group">
            <div class="tuple-label">Object Descriptor</div>
            <input
              class="text-input"
              value={focusedCandidate.descriptor}
              disabled={styleBatchBusy}
              placeholder="weathered pillar, ruined floor slab, retro-futurist bench"
              on:input={(event) => emitBatchDescriptorUpdate(focusedCandidate.id, (event.currentTarget as HTMLInputElement).value)}
            />
          </div>
          <div class="save-message">{focusedCandidate.status || `No ${generationWorkspace ? 'regeneration' : 'bake'} job has run for this object yet.`}</div>
        </div>
      {/if}
    </section>
  {/if}

  {#if selectedNodes.length > 1}
    <div class="editor-status-card">
      <div class="editor-status-title">One asset at a time</div>
      <div class="save-message">
        Single-object controls still work one node at a time. The scene batch section above can {generationWorkspace ? 'regenerate' : 'bake'} many geometry nodes.
      </div>
    </div>
  {:else if hasSelectedAsset}
    <details class="editor-advanced-block editor-mt-sm">
      <summary>Diagnostics and staging utilities</summary>
      <div class="editor-status-card editor-mt-sm">
        <div class="editor-status-title">{selectedNode?.name}</div>
        <div class="save-message">{selectedNode?.asset?.url}</div>
        {#if styleSourceSummary}
          <div class="save-message">{styleSourceSummary}</div>
        {/if}
        <div class="editor-chip-row">
          {#if generationWorkspace}
            <div class:ready={comfyUiReady} class:warn={!comfyUiReady} class="editor-chip">
              {comfyUiReady ? 'ComfyUI ready' : 'ComfyUI offline'}
            </div>
            <div class:ready={hunyuanServiceReady} class:warn={!hunyuanServiceReady} class="editor-chip">
              {hunyuanServiceReady ? 'Hunyuan ready' : 'Hunyuan offline'}
            </div>
          {/if}
          <div class:ready={hasInspection} class:warn={!hasInspection} class="editor-chip">
            {hasInspection ? 'source analyzed' : 'needs analysis'}
          </div>
          <div class:ready={workspaceReady} class:warn={!workspaceReady} class="editor-chip">
            {workspaceReady ? 'workspace staged' : 'workspace missing'}
          </div>
        </div>
        <div class="button-row compact editor-mt-sm">
          {#if generationWorkspace}
            <button disabled={comfyUiBusy} on:click={() => emit('startComfyUi')}>
              {comfyUiBusy ? 'Starting ComfyUI...' : 'Start / Check ComfyUI'}
            </button>
            <button disabled={hunyuanBusy} on:click={() => emit('startHunyuan')}>
              {hunyuanBusy ? 'Starting Hunyuan...' : 'Start / Check Hunyuan'}
            </button>
          {/if}
          <button disabled={styleBusy} on:click={() => emit('inspectAsset')}>
            {styleBusy ? 'Working...' : 'Analyze Source'}
          </button>
          <button disabled={styleBusy} on:click={() => emit('prepareWorkspace')}>
            {styleBusy ? 'Working...' : 'Package Workspace'}
          </button>
        </div>
      </div>

      {#if bakeWorkspace}
      <div class="editor-workflow-step editor-mt-sm">
        <div class="editor-workflow-heading">
          <div class="editor-step-number">A</div>
          <div>
            <div class="editor-step-title">Mesh Prep And Blender Handoff</div>
            <div class="editor-step-copy">Create a lower-poly variant or package the selected asset for manual work without mixing it into the style-bake run path.</div>
          </div>
        </div>
        <div class="editor-field-grid editor-mt-sm">
          <label class="editor-field">
            <span class="editor-field-label">Simplify Ratio</span>
            <input class="tuple-input" type="number" min="0.05" max="1" step="0.05" bind:value={styleSimplifyRatio} />
          </label>
          <label class="editor-field">
            <span class="editor-field-label">Error Threshold</span>
            <input class="tuple-input" type="number" min="0.00001" max="1" step="0.0001" bind:value={styleSimplifyError} />
          </label>
        </div>
        <div class="button-grid editor-mt-sm">
          <button disabled={styleBusy} on:click={() => emit('simplifyAsset')}>
            {styleBusy ? 'Working...' : 'Create Low-Poly Variant'}
          </button>
          <button disabled={styleBusy} on:click={() => emit('exportBlender')}>
            {styleBusy ? 'Working...' : 'Package For Blender'}
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
      {/if}

      {#if (generationWorkspace && hunyuanDetectedReferenceImageUrl) || styleWorkspaceManifestUrl || styleWorkspaceSourceAssetUrl}
        <div class="editor-scope-summary editor-mt-sm">
          {#if generationWorkspace && hunyuanDetectedReferenceImageUrl}
            <div>
              <div class="tuple-label">Detected Source Image</div>
              <div class="save-message">{hunyuanDetectedReferenceImageUrl}</div>
            </div>
          {/if}
          {#if styleWorkspaceManifestUrl}
            <div>
              <div class="tuple-label">Workspace Manifest</div>
              <input class="text-input" value={styleWorkspaceManifestUrl} readonly />
            </div>
          {/if}
          {#if styleWorkspaceSourceAssetUrl}
            <div>
              <div class="tuple-label">Workspace Source Mesh</div>
              <input class="text-input" value={styleWorkspaceSourceAssetUrl} readonly />
            </div>
          {/if}
        </div>
      {/if}

      {#if styleInspectReport}
        <div class="editor-workflow-step editor-mt-sm">
          <div class="editor-step-title">Asset Report</div>
          <div class="editor-step-copy">Source glTF inspection for density, texture, and geometry review.</div>
          <div class="tuple-group">
            <textarea rows="10" readonly value={styleInspectReport}></textarea>
          </div>
        </div>
      {/if}
    </details>
  {:else if selectedNode}
    <div class="editor-status-card">
      <div class="editor-status-title">Unsupported Selection</div>
      <div class="save-message">This workflow currently works on geometry-backed nodes only. Select an imported mesh, primitive, or prefab.</div>
    </div>
  {:else}
    <div class="editor-status-card">
      <div class="editor-status-title">No Asset Selected</div>
      <div class="save-message">
        {generationWorkspace
          ? 'Select a single geometry node to use the focused workflow, or use the scene batch section above to regenerate many objects together.'
          : 'Select a single geometry node to preview a bake, or use the scene batch section above to bake many objects together.'}
      </div>
    </div>
  {/if}
</div>
