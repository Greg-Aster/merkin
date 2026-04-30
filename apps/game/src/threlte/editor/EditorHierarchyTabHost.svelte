<script lang="ts">
import EditorHierarchyPanel from './EditorHierarchyPanel.svelte'
import type { OutlinerNodeViewportState } from './editorOutlinerTypes'
import type { EditorSceneNode } from './editorStore'

export let hierarchyFilter = ''
export let selectedNodes: EditorSceneNode[] = []
export let selectedNodeIds: string[] = []
export let filteredFlattenedNodes: Array<
  EditorSceneNode & { __depth: number }
> = []
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
export let onNodeDragStart: (nodeId: string, event: DragEvent) => void =
  () => {}
export let onNodeDragEnd: () => void = () => {}
export let onNodeDragEnter: (nodeId: string, event: DragEvent) => void =
  () => {}
export let onNodeDragOver: (nodeId: string, event: DragEvent) => void = () => {}
export let onNodeDragLeave: (nodeId: string) => void = () => {}
export let onNodeDrop: (nodeId: string, event: DragEvent) => void = () => {}
export let onNodeSelect: (nodeId: string, event: MouseEvent) => void = () => {}
export let onToggleVisibility: (nodeId: string, event?: MouseEvent) => void =
  () => {}
export let onToggleLocked: (nodeId: string, event?: MouseEvent) => void =
  () => {}
export let onSoloNode: (nodeId: string, event?: MouseEvent) => void = () => {}
export let onToggleIsolation: (nodeId: string, event?: MouseEvent) => void =
  () => {}
export let onGroupSelection: () => void = () => {}
export let onUngroupSelection: () => void = () => {}
export let onDuplicateSelection: () => void = () => {}
export let onDeleteSelection: () => void = () => {}
export let onClearSelection: () => void = () => {}
</script>

<EditorHierarchyPanel
  bind:hierarchyFilter
  {selectedNodes}
  {selectedNodeIds}
  {filteredFlattenedNodes}
  {hierarchyRootDropActive}
  {hierarchyDropTargetId}
  {hasGroupSelection}
  {isolatedNodeIds}
  {hasHiddenNodes}
  {hasLockedNodes}
  {nodeViewportStateById}
  {onFilterClear}
  {onFilterChange}
  {onIsolateSelection}
  {onShowAll}
  {onSelectSimilar}
  {onUnhideAll}
  {onUnlockAll}
  {onRootDragEnter}
  {onRootDragOver}
  {onRootDragLeave}
  {onRootDrop}
  {onNodeDragStart}
  {onNodeDragEnd}
  {onNodeDragEnter}
  {onNodeDragOver}
  {onNodeDragLeave}
  {onNodeDrop}
  {onNodeSelect}
  {onToggleVisibility}
  {onToggleLocked}
  {onSoloNode}
  {onToggleIsolation}
  {onGroupSelection}
  {onUngroupSelection}
  {onDuplicateSelection}
  {onDeleteSelection}
  {onClearSelection}
/>
