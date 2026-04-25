import {
  ensureOutlinerDefaultExpansion,
  getOutlinerExpandedIds,
  getOutlinerRowActionState,
  getOutlinerTargetNodeIds,
  resolveOutlinerSelectionIntent,
  setOutlinerExpandedIds,
} from './editorOutliner'
import type {
  OutlinerDisplayMode,
  OutlinerTreeItem,
} from './editorOutlinerTypes'
import type { EditorSceneNode, EditorState } from './editorTypes'

type SelectionOptions = {
  additive?: boolean
  toggle?: boolean
  rangeOrder?: string[]
}

type EditorOutlinerControllerDeps = {
  getEditorNodes: () => EditorSceneNode[]
  getEditorState: () => EditorState
  getOutlinerDisplayMode: () => OutlinerDisplayMode
  setOutlinerDisplayMode: (mode: OutlinerDisplayMode) => void
  getOutlinerExpandedIdsByMode: () => Record<OutlinerDisplayMode, string[]>
  setOutlinerExpandedIdsByMode: (
    value: Record<OutlinerDisplayMode, string[]>,
  ) => void
  getOutlinerVisibleNodeOrder: () => string[]
  selectEditorNode: (nodeId: string, options?: SelectionOptions) => void
  setSelectedNodes: (nodeIds: string[], anchorId?: string | null) => void
  patchNodes: (nodeIds: string[], patch: Partial<EditorSceneNode>) => void
  clearIsolatedNodes: () => void
  setIsolatedNodes: (nodeIds: string[]) => void
  getDraggedHierarchyNodeIds: () => string[]
  setDraggedHierarchyNodeIds: (nodeIds: string[]) => void
  getDragSelectionIds: () => string[]
  setHierarchyDropTargetId: (nodeId: string | null) => void
  setHierarchyRootDropActive: (active: boolean) => void
  reparentNodes: (nodeIds: string[], parentId: string | null) => boolean
  setSaveMessage: (message: string) => void
}

function stopEvent(event?: MouseEvent | DragEvent) {
  event?.preventDefault()
  event?.stopPropagation()
}

export function createEditorOutlinerController(
  deps: EditorOutlinerControllerDeps,
) {
  function applyOutlinerExpandedIds(
    mode: OutlinerDisplayMode,
    ids: Set<string>,
  ) {
    deps.setOutlinerExpandedIdsByMode(
      setOutlinerExpandedIds(deps.getOutlinerExpandedIdsByMode(), mode, ids),
    )
  }

  function ensureExpandedState(mode: OutlinerDisplayMode) {
    deps.setOutlinerExpandedIdsByMode(
      ensureOutlinerDefaultExpansion(
        deps.getOutlinerExpandedIdsByMode(),
        mode,
        deps.getEditorNodes(),
      ),
    )
  }

  function setDisplayMode(mode: OutlinerDisplayMode) {
    deps.setOutlinerDisplayMode(mode)
    ensureExpandedState(mode)
  }

  function toggleExpanded(itemId: string, event?: MouseEvent) {
    stopEvent(event)
    const mode = deps.getOutlinerDisplayMode()
    const expanded = getOutlinerExpandedIds(
      deps.getOutlinerExpandedIdsByMode(),
      mode,
    )
    if (expanded.has(itemId)) {
      expanded.delete(itemId)
    } else {
      expanded.add(itemId)
    }
    applyOutlinerExpandedIds(mode, expanded)
  }

  function getRowActionState(item: OutlinerTreeItem) {
    return getOutlinerRowActionState(
      item,
      deps.getEditorNodes(),
      deps.getEditorState().isolatedNodeIds ?? [],
    )
  }

  function handleSelection(item: OutlinerTreeItem, event: MouseEvent) {
    const intent = resolveOutlinerSelectionIntent(
      item,
      event,
      deps.getOutlinerVisibleNodeOrder(),
    )
    if (intent.kind === 'select-node') {
      deps.selectEditorNode(intent.nodeId, {
        additive: intent.additive,
        toggle: intent.toggle,
        rangeOrder: intent.rangeOrder,
      })
      return
    }
    if (intent.kind === 'select-set') {
      if (intent.additive) {
        deps.setSelectedNodes(
          Array.from(
            new Set([
              ...(deps.getEditorState().selectedNodeIds ?? []),
              ...intent.nodeIds,
            ]),
          ),
          intent.nodeIds[0] ?? null,
        )
      } else {
        deps.setSelectedNodes(intent.nodeIds, intent.nodeIds[0] ?? null)
      }
      return
    }
    if (intent.kind === 'toggle-expand') {
      toggleExpanded(intent.itemId, event)
    }
  }

  function toggleItemVisibility(item: OutlinerTreeItem, event?: MouseEvent) {
    stopEvent(event)
    const ids = getOutlinerTargetNodeIds(item)
    if (ids.length === 0) return
    const nodes = ids
      .map(id => deps.getEditorNodes().find(candidate => candidate.id === id))
      .filter(Boolean) as EditorSceneNode[]
    const nextVisible = !nodes.every(node => node.visible)
    deps.patchNodes(ids, { visible: nextVisible })
  }

  function toggleItemSelectable(item: OutlinerTreeItem, event?: MouseEvent) {
    stopEvent(event)
    const ids = getOutlinerTargetNodeIds(item)
    if (ids.length === 0) return
    const nodes = ids
      .map(id => deps.getEditorNodes().find(candidate => candidate.id === id))
      .filter(Boolean) as EditorSceneNode[]
    const nextLocked = nodes.every(node => node.locked ?? false) ? false : true
    deps.patchNodes(ids, { locked: nextLocked })
  }

  function toggleItemIsolation(item: OutlinerTreeItem, event?: MouseEvent) {
    stopEvent(event)
    const ids = getOutlinerTargetNodeIds(item)
    if (ids.length === 0) return
    const isolated = new Set(deps.getEditorState().isolatedNodeIds)
    const sameIsolation =
      ids.length === isolated.size && ids.every(id => isolated.has(id))
    if (sameIsolation) {
      deps.clearIsolatedNodes()
      return
    }
    deps.setIsolatedNodes(ids)
  }

  function startDrag(nodeId: string, event: DragEvent) {
    const editorState = deps.getEditorState()
    const ids =
      editorState.selectedNodeIds.includes(nodeId) &&
      deps.getDragSelectionIds().length > 0
        ? deps.getDragSelectionIds()
        : [nodeId]

    deps.setDraggedHierarchyNodeIds(ids)
    if (!editorState.selectedNodeIds.includes(nodeId)) {
      deps.selectEditorNode(nodeId)
    }

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', ids.join(','))
    }
  }

  function clearDragState() {
    deps.setDraggedHierarchyNodeIds([])
    deps.setHierarchyDropTargetId(null)
    deps.setHierarchyRootDropActive(false)
  }

  function allowDrop(event: DragEvent, targetId: string | null) {
    event.preventDefault()
    deps.setHierarchyDropTargetId(targetId)
    deps.setHierarchyRootDropActive(targetId === null)
  }

  function drop(event: DragEvent, targetId: string | null) {
    event.preventDefault()
    const ids =
      deps.getDraggedHierarchyNodeIds().length > 0
        ? deps.getDraggedHierarchyNodeIds()
        : (event.dataTransfer?.getData('text/plain') ?? '')
            .split(',')
            .filter(Boolean)

    if (ids.length === 0) {
      clearDragState()
      return
    }

    const applied = deps.reparentNodes(ids, targetId)
    deps.setSaveMessage(
      applied
        ? targetId
          ? 'Hierarchy moved under parent'
          : 'Hierarchy moved to root'
        : 'Invalid hierarchy drop',
    )
    clearDragState()
  }

  return {
    ensureExpandedState,
    setDisplayMode,
    toggleExpanded,
    getRowActionState,
    handleSelection,
    toggleItemVisibility,
    toggleItemSelectable,
    toggleItemIsolation,
    startDrag,
    clearDragState,
    allowDrop,
    drop,
  }
}
