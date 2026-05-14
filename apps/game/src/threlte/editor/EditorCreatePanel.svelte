<script lang="ts">
import EditorAssetPreview from './EditorAssetPreview.svelte'

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
export let mergeDescriptor = ''

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
export let onMergeSelectionToAsset: () => void = () => {}
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
export let onOpenAiTab: () => void = () => {}

// Primary quick-add slots: the four most common first-touch actions.
// The rest are kept reachable behind progressive disclosure.
const PRIMARY_QUICK_ADD_LABELS = new Set(['Empty', 'Box', 'Light', 'Marker'])

$: primaryQuickNodeActions = createQuickNodeActions.filter(action =>
  PRIMARY_QUICK_ADD_LABELS.has(action.label),
)
$: secondaryQuickNodeActions = createQuickNodeActions.filter(
  action => !PRIMARY_QUICK_ADD_LABELS.has(action.label),
)

$: normalizedAssetBrowserFilter = assetBrowserFilter.trim().toLowerCase()
$: filteredAssetBrowserItems = assetBrowserItems.filter(
  item =>
    !normalizedAssetBrowserFilter ||
    item.name.toLowerCase().includes(normalizedAssetBrowserFilter),
)
$: selectedLibraryAssetIsGenerated = isGeneratedAsset(selectedLibraryItem)
$: selectedLibraryAssetHint = selectedLibraryItem
  ? selectedLibraryAssetIsGenerated
    ? 'Generated asset preview. This will add to the scene at full scale.'
    : 'Imported asset preview. This will add using compatibility scale.'
  : ''
$: selectedLibraryAssetScaleNote = selectedLibraryItem
  ? selectedLibraryAssetIsGenerated
    ? 'Generated assets add at full scene scale.'
    : 'Imported models add with compatibility scale.'
  : ''
$: hasSelectedAsset = !!selectedLibraryItem && !selectedLibraryItem.isDirectory

function isActiveAssetRoot(rootPath: string) {
  return (
    !!rootPath &&
    (assetBrowserPath === rootPath ||
      assetBrowserPath.startsWith(`${rootPath}/`))
  )
}

function isGeneratedAsset(item: LibraryItem | null) {
  return (
    !!item && !!generatedRootPath && item.path.startsWith(generatedRootPath)
  )
}

function openSelectedAssetInAi() {
  onInspectSelectedLibraryAsset()
  onOpenAiTab()
}
</script>

<div class="editor-section">
  <div class="label">Add Something Workflow</div>
  <div class="editor-status-card">
    <div class="editor-status-title">Choose, preview, add, edit</div>
    <div class="save-message">Pick a primitive, prefab, imported model, or generated asset. Library files show a preview before placement.</div>
    <div class="editor-chip-row">
      <span class="editor-chip ready">add selects the new object</span>
      <span class:ready={selectedNodesCount > 0} class:warn={selectedNodesCount === 0} class="editor-chip">
        {selectedNodesCount ? 'selected object becomes parent' : 'adds at scene root'}
      </span>
    </div>
  </div>
  <div class="save-message">Next: use the edit-details workflow for transform, material, collision, and gameplay settings.</div>
</div>

<div class="editor-section">
  <div class="label">Quick Add</div>
  <div class="button-grid">
    {#each primaryQuickNodeActions as item (item.label)}
      <button data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={item.action}>{item.label}</button>
    {/each}
  </div>
  {#if secondaryQuickNodeActions.length > 0 || selectedNodesCount > 0}
    <details class="editor-create-details editor-mt-sm">
      <summary>More primitives & helpers</summary>
      <div class="editor-create-details-body">
        {#if secondaryQuickNodeActions.length > 0}
          <div class="button-grid">
            {#each secondaryQuickNodeActions as item (item.label)}
              <button data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={item.action}>{item.label}</button>
            {/each}
          </div>
        {/if}
        <div class="button-row compact editor-mt-sm">
          <button data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={onAddFireflyToSelection} disabled={selectedNodesCount === 0}>Add Firefly To Selection</button>
        </div>
      </div>
    </details>
  {/if}
  <div class="save-message">Common primitives and helpers. Prefabs and the curated content library are below.</div>
</div>

<div class="editor-section">
  <div class="label">Content Browser</div>
  <div class="button-row compact-two-columns editor-mt-sm">
    <button class:active={isActiveAssetRoot(modelsRootPath)} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSelectAssetLibraryRoot(modelsRootPath)}>Imported Models</button>
    <button class:active={isActiveAssetRoot(generatedRootPath)} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSelectAssetLibraryRoot(generatedRootPath)}>Generated Assets</button>
  </div>
  {#if assetPickerTargetNodeId}
    <div class="save-message">Asset picker active for {assetPickerTargetName || 'selected object'}.</div>
    <div class="button-row compact editor-mb-sm">
      <button data-sfx-hover="hover-soft" data-sfx-click="panel-close" on:click={onCancelAssetPicker}>Cancel Picker</button>
    </div>
  {/if}
  {#if assetBrowserError}
    <div class="save-message error-message">{assetBrowserError}</div>
  {/if}
  <details class="editor-create-details editor-mt-sm">
    <summary>Browse selected library</summary>
    <div class="editor-create-details-body">
      <div class="tuple-group">
        <div class="tuple-label">Search</div>
        <input class="text-input" bind:value={assetBrowserFilter} data-sfx-focus="focus-soft" placeholder="Search assets, prefabs, or imports" />
      </div>
      <div class="save-message path-label">{assetBrowserPath || 'Pick a library to browse.'}</div>
      <div class="hierarchy-list asset-browser-list">
        {#if assetBrowserLoading}
          <div class="save-message">Loading assets...</div>
        {:else if filteredAssetBrowserItems.length === 0}
          <div class="save-message">No assets match the current filter.</div>
        {:else}
          {#each filteredAssetBrowserItems as item (item.path)}
            <button class:active={selectedLibraryItem?.path === item.path} data-sfx-hover="hover-soft" data-sfx-click={item.isDirectory ? 'soft' : 'select'} on:click={() => onSelectLibraryItem(item)}>
              <span class="node-label">{item.name}</span>
              <span class="kind">{item.isDirectory ? 'dir' : 'asset'}</span>
            </button>
          {/each}
        {/if}
      </div>
      <div class="button-row compact">
        <button data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={onAssetBrowserUp}>Up</button>
        <button data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={onAssetBrowserRefresh}>Refresh</button>
      </div>
      {#if assetOptions.length > 0}
        <div class="editor-subsection editor-mt-sm">
          <div class="tuple-label">Pinned Imports</div>
          <div class="asset-list">
            {#each assetOptions as asset (asset.label)}
              <button data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={() => onAddCuratedAsset(asset.label, asset.url)}>{asset.label}</button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </details>
</div>

<div class="editor-section">
  <div class="label">Selection Asset</div>
  <div class="save-message">Package the current selection as a reusable generated asset, then browse it from Generated Assets.</div>
  <div class="tuple-group">
    <div class="tuple-label">Asset Notes</div>
    <input class="text-input" bind:value={mergeDescriptor} data-sfx-focus="focus-soft" placeholder="Optional descriptor for the exported selection" />
  </div>
  <button
    class="full"
    disabled={selectedNodesCount === 0}
    data-sfx-hover="hover-emphasis"
    data-sfx-click="confirm"
    on:click={onMergeSelectionToAsset}
  >
    Merge Selection To Asset
  </button>
</div>

<div class="editor-section">
  <div class="label">Selected Asset</div>
  {#if hasSelectedAsset && selectedLibraryItem}
    <div class="tuple-group">
      <div class="tuple-label">Selected Asset</div>
      <input class="text-input" value={selectedLibraryItem.name} readonly />
    </div>
    <EditorAssetPreview
      assetUrl={selectedLibraryItemUrl}
      label="Selected Asset Preview"
      hint={selectedLibraryAssetHint}
      height={160}
    />
    <div class="save-message">{selectedLibraryAssetScaleNote}</div>
    <div class="button-row compact-two-columns editor-mt-sm">
      <button data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={onAddSelectedLibraryAssetToScene}>Add To Scene</button>
      <button data-sfx-hover="hover-soft" data-sfx-click="panel-open" disabled={hunyuanBusy || !selectedLibraryItemUrl} on:click={openSelectedAssetInAi}>Open In AI Mesh</button>
    </div>
    {#if assetPickerTargetNodeId}
      <div class="button-row compact editor-mt-sm">
        <button data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onApplySelectedLibraryAsset}>Use For Selected Object</button>
      </div>
    {/if}
    <details class="editor-create-details editor-mt-sm">
      <summary>Asset details</summary>
      <div class="editor-create-details-body">
        <div class="tuple-group">
          <div class="tuple-label">Source URL</div>
          <input class="text-input" value={selectedLibraryItemUrl} readonly />
        </div>
        {#if hunyuanDetectedReferenceImageUrl}
          <div class="save-message">Detected reference: {hunyuanDetectedReferenceImageUrl}</div>
        {/if}
      </div>
    </details>
  {:else}
    <EditorAssetPreview
      label="Selected Asset Preview"
      hint="Select an imported or generated asset above to preview it before adding to the scene."
      height={120}
    />
  {/if}
</div>

<div class="editor-section">
  <div class="label">Prefab Library</div>
  <div class="save-message">Curated multi-part prefabs. Expand a category to drop one in.</div>
  {#each createPrefabGroups as group (group.label)}
    <details class="editor-create-details editor-mt-sm">
      <summary>{group.label} ({group.items.length})</summary>
      <div class="editor-create-details-body">
        <div class="asset-list prefab-list">
          {#each group.items as item (item.label)}
            <button data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={() => onAddPrefab(item.label, item.type, item.position)}>{item.label}</button>
          {/each}
        </div>
      </div>
    </details>
  {/each}
</div>

<div class="editor-section">
  <div class="label">Experimental Asset Generation</div>
  <div class="save-message">AI generation is separate from core create. Use AI Mesh Studio for service status, prompts, queue progress, output preview, and add/apply actions.</div>
  <div class="button-row compact">
    <button data-sfx-hover="hover-soft" data-sfx-click="panel-open" on:click={onOpenAiTab}>Open AI Mesh Studio</button>
  </div>
  {#if hunyuanStatus}
    <div class="save-message">{hunyuanStatus}</div>
  {/if}
  <details class="editor-create-details editor-mt-sm">
    <summary>Generate new asset</summary>
    <div class="editor-create-details-body">
      <div class="tuple-group">
        <div class="tuple-label">New Asset Name</div>
        <input class="text-input" bind:value={hunyuanScratchName} data-sfx-focus="focus-soft" />
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Reference Image</div>
        <input class="text-input" bind:value={hunyuanScratchReferenceImageUrl} data-sfx-focus="focus-soft" placeholder="/generated/hunyuan3d/references/example.png" />
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Prompt</div>
        <textarea rows="4" bind:value={hunyuanScratchPrompt} data-sfx-focus="focus-soft" placeholder="Describe the new asset to generate"></textarea>
      </div>
      <div class="button-row compact">
        <button disabled={hunyuanBusy || !hunyuanBackendCanGenerate} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onGenerateToLibrary}>
          {hunyuanBusy ? 'Generating...' : 'Generate To Library'}
        </button>
        <button disabled={hunyuanBusy || !hunyuanBackendCanGenerate} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onGenerateAndAdd}>
          {hunyuanBusy ? 'Generating...' : 'Generate And Add'}
        </button>
      </div>
    </div>
  </details>
  {#if hasSelectedAsset && selectedLibraryItem}
    <details class="editor-create-details editor-mt-sm">
      <summary>Reimagine selected library asset</summary>
      <div class="editor-create-details-body">
        <div class="tuple-group">
          <div class="tuple-label">Reference Image</div>
          <input class="text-input" bind:value={hunyuanReferenceImageUrl} data-sfx-focus="focus-soft" placeholder="/models/.../textures/basecolor.jpg" />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Prompt</div>
          <textarea rows="4" bind:value={hunyuanPrompt} data-sfx-focus="focus-soft" placeholder="Describe the generated variant or texture pass"></textarea>
        </div>
        <div class="button-row compact">
          <button disabled={hunyuanBusy || !hunyuanBackendCanGenerate} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onRunLibraryGenerate}>
            Reimagine Asset
          </button>
          <button disabled={hunyuanBusy || !hunyuanBackendCanRetexture} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onRunLibraryTexture}>
            Retexture Asset
          </button>
        </div>
      </div>
    </details>
  {/if}
  <details class="editor-create-details editor-mt-sm">
    <summary>AI library shortcuts</summary>
    <div class="editor-create-details-body">
      <div class="button-row compact">
        <button data-sfx-hover="hover-soft" data-sfx-click="panel-open" on:click={onOpenGeneratedAssets}>Open Generated Assets</button>
        <button data-sfx-hover="hover-soft" data-sfx-click="confirm" disabled={!hunyuanLastOutputUrl} on:click={onAddLatestGenerated}>Add Latest Generated</button>
      </div>
      {#if hunyuanLastOutputUrl}
        <div class="tuple-group">
          <div class="tuple-label">Latest Generated</div>
          <input class="text-input" value={hunyuanLastOutputUrl} readonly />
        </div>
      {/if}
    </div>
  </details>
</div>

<style>
.editor-create-details {
  border: 1px solid rgba(126, 203, 255, 0.12);
  border-radius: 0.55rem;
  background: rgba(10, 16, 24, 0.55);
}

.editor-create-details > summary {
  list-style: none;
  cursor: pointer;
  padding: 0.34rem 0.5rem;
  font-size: 0.74rem;
  color: #cfeaff;
  letter-spacing: 0.02em;
  display: flex;
  align-items: center;
  gap: 0.32rem;
}

.editor-create-details > summary::-webkit-details-marker {
  display: none;
}

.editor-create-details > summary::before {
  content: '▸';
  display: inline-block;
  font-size: 0.7rem;
  color: #7fa8c4;
  transition: transform 0.12s ease;
}

.editor-create-details[open] > summary::before {
  transform: rotate(90deg);
}

.editor-create-details[open] > summary {
  border-bottom: 1px solid rgba(126, 203, 255, 0.08);
}

.editor-create-details:not([open]) .editor-create-details-body {
  display: none;
}

.editor-create-details-body {
  padding: 0.42rem 0.5rem 0.52rem;
}
</style>
