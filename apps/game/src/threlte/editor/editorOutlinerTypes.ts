import type { EditorSceneDocument, EditorSceneNode } from './editorTypes'

export type OutlinerDisplayMode =
  | 'view-layer'
  | 'collections'
  | 'blender-file'
  | 'data-api'
export type OutlinerItemType =
  | 'scene'
  | 'collection'
  | 'node'
  | 'category'
  | 'setting'
  | 'asset'
  | 'material'
  | 'prefab'
  | 'light'
  | 'gameplay'

export type OutlinerModeOption = {
  id: OutlinerDisplayMode
  label: string
  shortLabel: string
}

export type OutlinerTreeItem = {
  id: string
  label: string
  type: OutlinerItemType
  icon: string
  detail?: string
  value?: string
  nodeId?: string
  nodeIds?: string[]
  children?: OutlinerTreeItem[]
  dimmed?: boolean
  supportsDrop?: boolean
  draggable?: boolean
}

export type OutlinerRow = OutlinerTreeItem & {
  depth: number
  hasChildren: boolean
  expanded: boolean
}

export type OutlinerNodeViewportState = {
  effectiveVisible: boolean
  isolated: boolean
  dimmed: boolean
  locked: boolean
}

export type OutlinerBuildContext = {
  mode: OutlinerDisplayMode
  levelId: string
  nodes: EditorSceneNode[]
  scene: EditorSceneDocument | null
  selectedNode: EditorSceneNode | null
  nodeViewportStateById: Map<string, OutlinerNodeViewportState>
}

export type OutlinerRowActionState = {
  allVisible: boolean
  allSelectable: boolean
  allIsolated: boolean
}

export type OutlinerSelectionIntent =
  | {
      kind: 'select-node'
      nodeId: string
      additive: boolean
      toggle: boolean
      rangeOrder?: string[]
    }
  | {
      kind: 'select-set'
      nodeIds: string[]
      additive: boolean
    }
  | {
      kind: 'toggle-expand'
      itemId: string
    }
  | {
      kind: 'noop'
    }
