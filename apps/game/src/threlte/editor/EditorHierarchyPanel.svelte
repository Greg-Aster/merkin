<script lang="ts">
  import type { EditorSceneNode } from './editorStore'
  import type { OutlinerNodeViewportState } from './editorOutlinerTypes'

  export let hierarchyFilter = ''
  export let selectedNodes: EditorSceneNode[] = []
  export let selectedNodeIds: string[] = []
  export let filteredFlattenedNodes: Array<EditorSceneNode & { __depth: number }> = []
  export let hierarchyRootDropActive = false
  export let hierarchyDropTargetId: string | null = null
  export let hasGroupSelection = false
  export let isolatedNodeIds: string[] = []
  export let hasHiddenNodes = false
  export let hasLockedNodes = false
  export let nodeViewportStateById = new Map<string, OutlinerNodeViewportState>()

  export let onFilterClear: () => void = () => {}
  export let onFilterChange: (value: string) => void = () => {}
  export let onIsolateSelection: () => void = () => {}
  export let onShowAll: () => void = () => {}
  export let onSelectSimilar: () => void = () => {}
  export let onUnhideAll: () => void = () => {}
  export let onUnlockAll: () => void = () => {}
  export let onRootDragEnter: (event: DragEvent) => void = () => {}
  export let onRootDragOver: (event: DragEvent) => void = () => {}
  export let onRootDragLeave: () => void = () => {}
  export let onRootDrop: (event: DragEvent) => void = () => {}
  export let onNodeDragStart: (nodeId: string, event: DragEvent) => void = () => {}
  export let onNodeDragEnd: () => void = () => {}
  export let onNodeDragEnter: (nodeId: string, event: DragEvent) => void = () => {}
  export let onNodeDragOver: (nodeId: string, event: DragEvent) => void = () => {}
  export let onNodeDragLeave: (nodeId: string) => void = () => {}
  export let onNodeDrop: (nodeId: string, event: DragEvent) => void = () => {}
  export let onNodeSelect: (nodeId: string, event: MouseEvent) => void = () => {}
  export let onToggleVisibility: (nodeId: string, event?: MouseEvent) => void = () => {}
  export let onToggleLocked: (nodeId: string, event?: MouseEvent) => void = () => {}
  export let onSoloNode: (nodeId: string, event?: MouseEvent) => void = () => {}
  export let onToggleIsolation: (nodeId: string, event?: MouseEvent) => void = () => {}
  export let onGroupSelection: () => void = () => {}
  export let onUngroupSelection: () => void = () => {}
  export let onDuplicateSelection: () => void = () => {}
  export let onDeleteSelection: () => void = () => {}
  export let onClearSelection: () => void = () => {}
</script>

<div class="editor-section">
  <div class="label">Hierarchy</div>
  <div class="save-message">{selectedNodes.length > 1 ? `${selectedNodes.length} selected` : selectedNodes.length === 1 ? '1 selected' : 'Nothing selected'}</div>
  <div class="tuple-group editor-mb-sm">
    <div class="tuple-label">Filter</div>
    <input class="text-input" bind:value={hierarchyFilter} placeholder="Search by name, kind, prefab, gameplay, or asset path" />
  </div>
  <div class="button-row compact editor-mb-sm">
    <button on:click={onIsolateSelection} disabled={selectedNodes.length === 0}>Isolate</button>
    <button on:click={onShowAll} disabled={isolatedNodeIds.length === 0}>Show All</button>
  </div>
  <div class="button-row compact editor-mb-sm">
    <button on:click={onSelectSimilar}>Select Similar</button>
    <button on:click={onFilterClear} disabled={!hierarchyFilter.trim()}>Clear Filter</button>
  </div>
  <div class="button-row compact editor-mb-sm">
    <button on:click={onUnhideAll} disabled={!hasHiddenNodes}>Unhide All</button>
    <button on:click={onUnlockAll} disabled={!hasLockedNodes}>Unlock All</button>
  </div>
  <div
    class="hierarchy-root-drop"
    role="button"
    tabindex="-1"
    aria-label="Drop selection on scene root"
    class:active={hierarchyRootDropActive}
    on:dragenter={onRootDragEnter}
    on:dragover={onRootDragOver}
    on:dragleave={onRootDragLeave}
    on:drop={onRootDrop}
  >
    Drop here to parent to Scene Root
  </div>
  <div class="hierarchy-list">
    {#if filteredFlattenedNodes.length === 0}
      <div class="save-message">No nodes match the current filter.</div>
    {/if}
    {#each filteredFlattenedNodes as node (node.id)}
      <div
        draggable={true}
        class="hierarchy-item"
        role="treeitem"
        tabindex="-1"
        aria-selected={selectedNodeIds.includes(node.id)}
        class:selected={selectedNodeIds.includes(node.id)}
        class:drop-target={hierarchyDropTargetId === node.id}
        class:dimmed={nodeViewportStateById.get(node.id)?.dimmed ?? false}
        on:dragstart={(event) => onNodeDragStart(node.id, event)}
        on:dragend={onNodeDragEnd}
        on:dragenter={(event) => onNodeDragEnter(node.id, event)}
        on:dragover={(event) => onNodeDragOver(node.id, event)}
        on:dragleave={() => onNodeDragLeave(node.id)}
        on:drop={(event) => onNodeDrop(node.id, event)}
      >
        <button class="hierarchy-entry" on:click={(event) => onNodeSelect(node.id, event)}>
          <span class="node-label" style={`padding-left:${node.__depth * 0.85}rem`}>{node.name}</span>
          <span class="kind">{node.kind}</span>
        </button>
        <div class="hierarchy-actions">
          <button class:active={node.visible} title={node.visible ? 'Hide node' : 'Show node'} on:click={(event) => onToggleVisibility(node.id, event)}>
            {node.visible ? '👁' : '🚫'}
          </button>
          <button class:active={node.locked ?? false} title={node.locked ? 'Unlock node' : 'Lock node'} on:click={(event) => onToggleLocked(node.id, event)}>
            {node.locked ? '🔒' : '🔓'}
          </button>
          <button title="Solo node" on:click={(event) => onSoloNode(node.id, event)}>
            S
          </button>
          <button class:active={nodeViewportStateById.get(node.id)?.isolated ?? false} title={(nodeViewportStateById.get(node.id)?.isolated ?? false) ? 'Remove isolate' : 'Isolate node'} on:click={(event) => onToggleIsolation(node.id, event)}>
            ⦿
          </button>
        </div>
      </div>
    {/each}
  </div>
  <div class="button-row compact editor-mt-md">
    <button on:click={onGroupSelection} disabled={selectedNodes.length === 0}>Group</button>
    <button on:click={onUngroupSelection} disabled={!hasGroupSelection}>Ungroup</button>
  </div>
  <div class="button-row compact editor-mt-sm">
    <button on:click={onDuplicateSelection} disabled={selectedNodes.length === 0}>Duplicate</button>
    <button class="danger" on:click={onDeleteSelection} disabled={selectedNodes.length === 0}>Delete</button>
  </div>
  <div class="button-row compact editor-mt-sm">
    <button on:click={onClearSelection} disabled={selectedNodes.length === 0}>Clear</button>
  </div>
</div>
