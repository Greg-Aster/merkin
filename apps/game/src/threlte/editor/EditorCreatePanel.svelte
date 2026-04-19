<script lang="ts">
  import EditorAssetPreview from './EditorAssetPreview.svelte'

  export let createQuickNodeActions: Array<{ label: string, action: () => void }> = []
  export let createPrefabGroups: Array<{
    label: string
    items: Array<{ label: string, type: string, position: [number, number, number] }>
  }> = []
  export let assetOptions: Array<{ label: string, url: string }> = []
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
  export let assetBrowserItems: Array<{ name: string, path: string, isDirectory: boolean }> = []
  export let assetBrowserFilter = ''
  export let assetBrowserError = ''
  export let assetBrowserLoading = false
  export let selectedLibraryItem: { name: string, path: string, isDirectory: boolean } | null = null
  export let selectedLibraryItemUrl = ''
  export let assetPickerTargetNodeId = ''
  export let assetPickerTargetName = ''
  export let generatedRootPath = ''
  export let modelsRootPath = ''

  export let onAddFireflyToSelection: () => void = () => {}
  export let onAddPrefab: (label: string, type: string, position: [number, number, number]) => void = () => {}
  export let onAddCuratedAsset: (label: string, url: string) => void = () => {}
  export let onGenerateToLibrary: () => void = () => {}
  export let onGenerateAndAdd: () => void = () => {}
  export let onOpenGeneratedAssets: () => void = () => {}
  export let onAddLatestGenerated: () => void = () => {}
  export let onSelectAssetLibraryRoot: (path: string) => void = () => {}
  export let onAssetBrowserUp: () => void = () => {}
  export let onAssetBrowserRefresh: () => void = () => {}
  export let onCancelAssetPicker: () => void = () => {}
  export let onSelectLibraryItem: (item: { name: string, path: string, isDirectory: boolean }) => void = () => {}
  export let onAddSelectedLibraryAssetToScene: () => void = () => {}
  export let onInspectSelectedLibraryAsset: () => void = () => {}
  export let onApplySelectedLibraryAsset: () => void = () => {}
  export let onRunLibraryGenerate: () => void = () => {}
  export let onRunLibraryTexture: () => void = () => {}
</script>

<div class="editor-section">
  <div class="label">Quick Create</div>
  <div class="button-grid">
    {#each createQuickNodeActions as item (item.label)}
      <button on:click={item.action}>{item.label}</button>
    {/each}
  </div>
  <div class="save-message">Quick-create helpers and gameplay markers. Use the organized prefab and asset sections below for everything else.</div>
  <div class="button-row compact editor-mt-sm">
    <button on:click={onAddFireflyToSelection} disabled={selectedNodesCount === 0}>Add Firefly To Selection</button>
  </div>
  <div class="save-message">Places one firefly above each selected object without parenting it into the object's scale.</div>
</div>

<div class="editor-section">
  <div class="label">Prefab Library</div>
  {#each createPrefabGroups as group (group.label)}
    <div class="editor-subsection">
      <div class="tuple-label">{group.label}</div>
      <div class="asset-list prefab-list">
        {#each group.items as item (item.label)}
          <button on:click={() => onAddPrefab(item.label, item.type, item.position)}>{item.label}</button>
        {/each}
      </div>
    </div>
  {/each}
  <div class="editor-subsection">
    <div class="tuple-label">Curated Imports</div>
    <div class="asset-list">
      {#each assetOptions as asset (asset.label)}
        <button on:click={() => onAddCuratedAsset(asset.label, asset.url)}>{asset.label}</button>
      {/each}
    </div>
  </div>
</div>

<div class="editor-section">
  <div class="label">AI Generate To Library</div>
  <div class="save-message">Use the same Hunyuan workflow here to create new library assets without replacing scene nodes.</div>
  <div class="tuple-group">
    <div class="tuple-label">New Asset Name</div>
    <input class="text-input" bind:value={hunyuanScratchName} />
  </div>
  <div class="tuple-group">
    <div class="tuple-label">Reference Image</div>
    <input class="text-input" bind:value={hunyuanScratchReferenceImageUrl} placeholder="/generated/hunyuan3d/references/example.png" />
  </div>
  <div class="tuple-group">
    <div class="tuple-label">Prompt</div>
    <textarea rows="4" bind:value={hunyuanScratchPrompt} placeholder="Describe the new mesh you want in the library."></textarea>
  </div>
  <div class="button-row compact-two-columns">
    <button disabled={hunyuanBusy || !hunyuanBackendCanGenerate} on:click={onGenerateToLibrary}>{hunyuanBusy ? 'Working…' : 'Generate To Library'}</button>
    <button disabled={hunyuanBusy || !hunyuanBackendCanGenerate} on:click={onGenerateAndAdd}>{hunyuanBusy ? 'Working…' : 'Generate + Add'}</button>
  </div>
  <div class="save-message">{hunyuanStatus}</div>
</div>

<div class="editor-section">
  <div class="label">Generated Quick Access</div>
  <div class="save-message">Generated assets can now be opened or added directly here, and they spawn at full scene scale.</div>
  <div class="button-row compact editor-mb-sm">
    <button on:click={onOpenGeneratedAssets}>Open Generated Assets</button>
    <button disabled={!hunyuanLastOutputUrl} on:click={onAddLatestGenerated}>Add Latest Generated</button>
  </div>
  {#if hunyuanLastOutputUrl}
    <div class="tuple-group">
      <div class="tuple-label">Latest Generated</div>
      <input class="text-input" value={hunyuanLastOutputUrl} readonly />
    </div>
  {/if}
</div>

<div class="editor-section">
  <div class="label">Asset Library</div>
  <div class="button-row compact-two-columns">
    <button class:active={assetBrowserPath.startsWith(modelsRootPath)} on:click={() => onSelectAssetLibraryRoot(modelsRootPath)}>Imported Models</button>
    <button class:active={assetBrowserPath.startsWith(generatedRootPath)} on:click={() => onSelectAssetLibraryRoot(generatedRootPath)}>Generated Assets</button>
  </div>
  <div class="button-row compact editor-mt-sm">
    <button on:click={onAssetBrowserUp}>Up</button>
    <button on:click={onAssetBrowserRefresh}>Refresh</button>
  </div>
  <div class="save-message path-label">{assetBrowserPath}</div>
  <div class="save-message">Browse imported or generated meshes. Click a file to select it, then place it, inspect it, or reimagine it with AI.</div>
  {#if assetPickerTargetNodeId}
    <div class="save-message">Asset picker is active for {assetPickerTargetName || 'selected object'}.</div>
    <div class="button-row compact editor-mb-sm">
      <button on:click={onCancelAssetPicker}>Cancel Picker</button>
    </div>
  {/if}
  <div class="tuple-group editor-mb-sm">
    <div class="tuple-label">Filter</div>
    <input class="text-input" bind:value={assetBrowserFilter} placeholder="Filter asset names" />
  </div>
  {#if assetBrowserError}
    <div class="save-message error-message">{assetBrowserError}</div>
  {/if}
  <div class="hierarchy-list asset-browser-list">
    {#if assetBrowserLoading}
      <div class="save-message">Loading assets…</div>
    {:else}
      {#each assetBrowserItems.filter((item) => !assetBrowserFilter.trim() || item.name.toLowerCase().includes(assetBrowserFilter.trim().toLowerCase())) as item (item.path)}
        <button class:active={selectedLibraryItem?.path === item.path} on:click={() => onSelectLibraryItem(item)}>
          <span class="node-label">{item.isDirectory ? '📁' : '📦'} {item.name}</span>
          <span class="kind">{item.isDirectory ? 'dir' : 'asset'}</span>
        </button>
      {/each}
    {/if}
  </div>
  {#if selectedLibraryItem && !selectedLibraryItem.isDirectory}
    <div class="editor-subsection">
      <div class="tuple-label">Selected Asset</div>
      <input class="text-input" value={selectedLibraryItem.name} readonly />
      <input class="text-input" value={selectedLibraryItemUrl} readonly />
      <EditorAssetPreview
        assetUrl={selectedLibraryItemUrl}
        label="Selected Asset Preview"
        hint={selectedLibraryItem.path.startsWith(generatedRootPath)
          ? 'Generated asset preview. This will add to the scene at full scale.'
          : 'Imported asset preview. This will add using compatibility scale.'}
      />
      <div class="save-message">{selectedLibraryItem.path.startsWith(generatedRootPath) ? 'Generated assets add at full scene scale.' : 'Imported models add with compatibility scale.'}</div>
      <div class="button-row compact-two-columns editor-mt-sm">
        <button on:click={onAddSelectedLibraryAssetToScene}>Add To Scene</button>
        <button disabled={hunyuanBusy || !selectedLibraryItemUrl} on:click={onInspectSelectedLibraryAsset}>Inspect AI</button>
      </div>
      {#if assetPickerTargetNodeId}
        <div class="button-row compact editor-mt-sm">
          <button on:click={onApplySelectedLibraryAsset}>Use For Selected Object</button>
        </div>
      {/if}
      <div class="tuple-group">
        <div class="tuple-label">AI Prompt / Style Note</div>
        <textarea rows="3" bind:value={hunyuanPrompt} placeholder="Describe how to reimagine this asset."></textarea>
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Reference Image</div>
        <input class="text-input" bind:value={hunyuanReferenceImageUrl} placeholder="Optional override reference image" />
      </div>
      {#if hunyuanDetectedReferenceImageUrl}
        <div class="save-message">Detected reference: {hunyuanDetectedReferenceImageUrl}</div>
      {/if}
      <div class="button-grid editor-mt-sm">
        <button disabled={hunyuanBusy || !hunyuanBackendCanGenerate} on:click={onRunLibraryGenerate}>
          {hunyuanBusy ? 'Working…' : 'Reimagine To New Asset'}
        </button>
        <button disabled={hunyuanBusy || !hunyuanBackendCanRetexture} on:click={onRunLibraryTexture}>
          {hunyuanBusy ? 'Working…' : 'Retexture To New Asset'}
        </button>
      </div>
      <div class="save-message">AI actions never overwrite the original file. They create a new generated asset in the library.</div>
    </div>
  {/if}
</div>
