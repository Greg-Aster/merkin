<script lang="ts">
  import type { EditorSceneNode } from './editorStore'

  export let workflowBrowserPath = ''
  export let workflowBrowserItems: Array<{ name: string, path: string, isDirectory: boolean }> = []
  export let workflowBrowserError = ''
  export let workflowBrowserLoading = false
  export let selectedComfyWorkflowPath = ''
  export let workflowSelectionSummary = ''
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
  export let onSelectWorkflowItem: (item: { name: string, path: string, isDirectory: boolean }) => void = () => {}
  export let onOutlinerFocus: () => void = () => {}
  export let onSelectSimilar: () => void = () => {}
  export let onAddFireflyToSelection: () => void = () => {}
  export let onClearSelection: () => void = () => {}
  export let onHideSelected: () => void = () => {}
  export let onHideUnselected: () => void = () => {}
  export let onShowAll: () => void = () => {}
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

  $: generateLabel = selectedNode?.asset ? 'Generate Replacement Mesh' : 'Generate From Prefab'
</script>

<div class="editor-section">
  <div class="label">Workflow Template</div>
  <div class="save-message">Selected workflow becomes the default for generate/retexture runs and for the Edit Workflow buttons.</div>
  <div class="tuple-group editor-mt-sm">
    <div class="tuple-label">Current Workflow</div>
    <input class="text-input" value={selectedComfyWorkflowPath} readonly />
  </div>
  <div class="button-row compact editor-mt-sm">
    <button on:click={onResetWorkflowPath}>Use Built-In Default</button>
    <button on:click={onWorkflowBrowserUp}>Up</button>
    <button on:click={onWorkflowBrowserRefresh}>Refresh</button>
  </div>
  <div class="save-message path-label">{workflowBrowserPath}</div>
  {#if workflowBrowserError}
    <div class="save-message error-message">{workflowBrowserError}</div>
  {/if}
  <div class="hierarchy-list asset-browser-list">
    {#if workflowBrowserLoading}
      <div class="save-message">Loading workflows…</div>
    {:else}
      {#each workflowBrowserItems as item (item.path)}
        <button class:active={selectedComfyWorkflowPath === item.path} on:click={() => onSelectWorkflowItem(item)}>
          <span class="node-label">{item.isDirectory ? '📁' : '🧠'} {item.name}</span>
          <span class="kind">{item.isDirectory ? 'dir' : 'workflow'}</span>
        </button>
      {/each}
    {/if}
  </div>
</div>

<div class="editor-section">
  <div class="label">Selection</div>
  <div class="save-message">{workflowSelectionSummary}</div>
  <div class="button-row compact editor-mt-sm">
    <button on:click={onOutlinerFocus}>Outliner On Right</button>
    <button on:click={onSelectSimilar} disabled={!selectedNode || similarNodeCount <= 1}>Select Similar</button>
  </div>
  <div class="button-row compact editor-mt-sm">
    <button on:click={onAddFireflyToSelection} disabled={selectedNodes.length === 0}>Add Firefly To Selection</button>
    <button on:click={onClearSelection} disabled={selectedNodes.length === 0}>Clear Selection</button>
  </div>
  <div class="button-row compact editor-mt-sm">
    <button on:click={onHideSelected} disabled={selectedNodes.length === 0}>Hide Selected</button>
    <button on:click={onHideUnselected} disabled={selectedNodes.length === 0}>Hide Unselected</button>
    <button on:click={onShowAll} disabled={!canShowAll}>Show All</button>
  </div>
  <div class="save-message">Blender-style shortcuts: `H` hides selected, `Shift+H` hides unselected, `Alt+H` shows all.</div>
</div>

<div class="editor-section">
  <div class="label">Reimagine</div>
  <div class="save-message">Generate a replacement for the selected object, or re-texture an existing mesh-backed asset.</div>
  <div class="button-row compact editor-mt-sm">
    <button on:click={onGenerateSelection} disabled={!workflowCanGenerateSelection || hunyuanBusy}>
      {hunyuanBusy ? 'Working…' : generateLabel}
    </button>
    <button on:click={onTextureSelection} disabled={!workflowCanRetextureSelection || hunyuanBusy}>
      {hunyuanBusy ? 'Working…' : 'Re-Texture Selected'}
    </button>
  </div>
  <div class="button-row compact editor-mt-sm">
    <button on:click={onOpenAiTab}>Open AI Details</button>
    <button on:click={onRefreshBackend} disabled={hunyuanBusy}>Refresh Backend</button>
  </div>
  <div class="button-row compact editor-mt-sm">
    <button on:click={onEditGenerateWorkflow} disabled={hunyuanBusy}>Edit Generate Workflow</button>
    <button on:click={onEditTextureWorkflow} disabled={!selectedNode?.asset || hunyuanBusy}>Edit Texture Workflow</button>
  </div>
  {#if comfyWorkflowEditorStatus}
    <div class="save-message">{comfyWorkflowEditorStatus}</div>
  {/if}
  <div class="save-message">{hunyuanStatus}</div>
</div>

<div class="editor-section">
  <div class="label">Reuse</div>
  <div class="save-message">Use the last generated asset immediately, or jump straight into the generated asset library.</div>
  <div class="button-row compact editor-mt-sm">
    <button on:click={onOpenGeneratedAssets} disabled={!hunyuanLastOutputUrl}>Open Generated Assets</button>
    <button on:click={onAddLatestGenerated} disabled={!hunyuanLastOutputUrl}>Add Latest Generated</button>
  </div>
  <div class="button-row compact editor-mt-sm">
    <button on:click={onApplyLatestToSelection} disabled={!canApplyGeneratedAssetToSelection}>Apply Latest To Selection</button>
    <button on:click={onOpenAssetLibrary}>Open Asset Library</button>
  </div>
  {#if hunyuanLastOutputUrl}
    <div class="tuple-group editor-mt-sm">
      <div class="tuple-label">Latest Generated</div>
      <input class="text-input" value={hunyuanLastOutputUrl} readonly />
    </div>
  {/if}
</div>

<div class="editor-section">
  <div class="label">Save</div>
  <div class="save-message">Persist your work explicitly after a good generation pass.</div>
  <div class="button-row compact editor-mt-sm">
    <button on:click={onSaveLocal}>Save Local</button>
    <button on:click={onOverwriteLevel}>Overwrite Level</button>
  </div>
  <div class="button-row compact editor-mt-sm">
    <button on:click={onReloadDisk}>Reload Disk</button>
    <button on:click={onOpenSaveTools}>Open Save Tools</button>
  </div>
</div>

<div class="editor-section">
  <div class="label">Recent AI Jobs</div>
  <div class="save-message">Latest queue status and failures without digging through logs.</div>
  <div class="button-row compact editor-mt-sm">
    <button on:click={onRefreshJobs}>Refresh Jobs</button>
    <button on:click={onOpenAiTab}>Open AI Jobs Panel</button>
  </div>
  {#if selectedHunyuanJob}
    <div class="tuple-group editor-mt-sm">
      <div class="tuple-label">Latest Job</div>
      <input class="text-input" value={`${selectedHunyuanJob.status} · ${selectedHunyuanJob.sourceName || selectedHunyuanJob.id}`} readonly />
    </div>
    {#if selectedHunyuanJob.error || selectedHunyuanJob.result?.message}
      <div class="save-message">{selectedHunyuanJob.error || selectedHunyuanJob.result?.message}</div>
    {/if}
  {:else}
    <div class="save-message">No recent jobs yet.</div>
  {/if}
</div>
