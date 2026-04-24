import type {
  OutlinerBuildContext,
  OutlinerDisplayMode,
  OutlinerModeOption,
  OutlinerNodeViewportState,
  OutlinerRow,
  OutlinerRowActionState,
  OutlinerSelectionIntent,
  OutlinerTreeItem,
} from './editorOutlinerTypes'
import type { EditorSceneNode } from './editorTypes'

export const OUTLINER_MODE_OPTIONS: OutlinerModeOption[] = [
  { id: 'view-layer', label: 'View Layer', shortLabel: 'View' },
  { id: 'collections', label: 'Collections', shortLabel: 'Collections' },
  { id: 'blender-file', label: 'Blender File', shortLabel: 'File' },
  { id: 'data-api', label: 'Data API', shortLabel: 'Data' },
]

export function sanitizeOutlinerIdPart(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  )
}

export function getOutlinerExpandedIds(
  expandedIdsByMode: Record<OutlinerDisplayMode, string[]>,
  mode: OutlinerDisplayMode,
) {
  return new Set(expandedIdsByMode[mode] ?? [])
}

export function setOutlinerExpandedIds(
  expandedIdsByMode: Record<OutlinerDisplayMode, string[]>,
  mode: OutlinerDisplayMode,
  ids: Set<string>,
) {
  return {
    ...expandedIdsByMode,
    [mode]: Array.from(ids),
  }
}

function getNodeChildren(nodeId: string | null, nodes: EditorSceneNode[]) {
  return nodes.filter(node => (node.parentId ?? null) === nodeId)
}

function getNodeIcon(node: EditorSceneNode) {
  if (node.kind === 'group') return '▤'
  if (node.kind === 'light') return '☀'
  if (node.asset) return '◆'
  if (node.prefab) return '◫'
  if (node.primitive) return '●'
  if (node.gameplay) return '✦'
  return '○'
}

function getNodeDetail(node: EditorSceneNode) {
  if (node.prefab?.type) return node.prefab.type
  if (node.primitive?.geometry) return node.primitive.geometry
  if (node.gameplay?.type) return node.gameplay.type
  if (node.asset?.url) {
    const assetName = node.asset.url.split('/').filter(Boolean).pop()
    return assetName ?? node.kind
  }
  return node.kind
}

function getNodeMemberIds(nodeId: string, nodes: EditorSceneNode[]) {
  const result: string[] = []
  const visit = (currentId: string) => {
    result.push(currentId)
    for (const child of getNodeChildren(currentId, nodes)) {
      visit(child.id)
    }
  }
  visit(nodeId)
  return result
}

function buildViewLayerNodeItem(
  node: EditorSceneNode,
  context: OutlinerBuildContext,
): OutlinerTreeItem {
  const children = getNodeChildren(node.id, context.nodes).map(child =>
    buildViewLayerNodeItem(child, context),
  )
  return {
    id: `outliner:view-layer:node:${node.id}`,
    label: node.name,
    type: 'node',
    icon: getNodeIcon(node),
    detail: getNodeDetail(node),
    nodeId: node.id,
    nodeIds: [node.id],
    children,
    dimmed: context.nodeViewportStateById.get(node.id)?.dimmed ?? false,
    supportsDrop: true,
    draggable: true,
  }
}

function buildOutlinerNodeLeaf(
  node: EditorSceneNode,
  viewportStateById: Map<string, OutlinerNodeViewportState>,
): OutlinerTreeItem {
  return {
    id: `outliner:leaf:${node.id}`,
    label: node.name,
    type: 'node',
    icon: getNodeIcon(node),
    detail: getNodeDetail(node),
    nodeId: node.id,
    nodeIds: [node.id],
    dimmed: viewportStateById.get(node.id)?.dimmed ?? false,
  }
}

function buildViewLayerOutlinerItems(context: OutlinerBuildContext) {
  return [
    {
      id: 'outliner:view-layer:scene',
      label: 'Scene Collection',
      type: 'scene',
      icon: '▾',
      detail: `${context.nodes.length} objects`,
      nodeIds: context.nodes.map(node => node.id),
      children: getNodeChildren(null, context.nodes).map(node =>
        buildViewLayerNodeItem(node, context),
      ),
    },
  ] satisfies OutlinerTreeItem[]
}

function buildCollectionGroupItem(
  groupNode: EditorSceneNode,
  context: OutlinerBuildContext,
): OutlinerTreeItem {
  const childItems = getNodeChildren(groupNode.id, context.nodes).map(child =>
    child.kind === 'group'
      ? buildCollectionGroupItem(child, context)
      : buildViewLayerNodeItem(child, context),
  )
  return {
    id: `outliner:collections:group:${groupNode.id}`,
    label: groupNode.name,
    type: 'collection',
    icon: '▤',
    detail: `${Math.max(0, getNodeMemberIds(groupNode.id, context.nodes).length - 1)} contents`,
    nodeId: groupNode.id,
    nodeIds: getNodeMemberIds(groupNode.id, context.nodes),
    children: childItems,
    dimmed: context.nodeViewportStateById.get(groupNode.id)?.dimmed ?? false,
  }
}

function buildSmartCollectionItem(
  id: string,
  label: string,
  icon: string,
  nodeIds: string[],
  viewportStateById: Map<string, OutlinerNodeViewportState>,
  nodes: EditorSceneNode[],
  detail = `${nodeIds.length} objects`,
) {
  return {
    id,
    label,
    type: 'collection' as const,
    icon,
    detail,
    nodeIds,
    children: nodeIds
      .map(nodeId => nodes.find(node => node.id === nodeId))
      .filter(Boolean)
      .map(node =>
        buildOutlinerNodeLeaf(node as EditorSceneNode, viewportStateById),
      ),
  }
}

function buildCollectionsOutlinerItems(context: OutlinerBuildContext) {
  const topLevelGroups = context.nodes.filter(
    node => !node.parentId && node.kind === 'group',
  )
  const looseRootNodeIds = context.nodes
    .filter(node => !node.parentId && node.kind !== 'group')
    .map(node => node.id)
  const assetNodeIds = context.nodes
    .filter(node => !!node.asset)
    .map(node => node.id)
  const prefabNodeIds = context.nodes
    .filter(node => !!node.prefab)
    .map(node => node.id)
  const primitiveNodeIds = context.nodes
    .filter(node => !!node.primitive)
    .map(node => node.id)
  const lightNodeIds = context.nodes
    .filter(node => !!node.light)
    .map(node => node.id)
  const gameplayNodeIds = context.nodes
    .filter(node => !!node.gameplay)
    .map(node => node.id)
  const generatedNodeIds = context.nodes
    .filter(node => node.asset?.url?.startsWith('/generated/'))
    .map(node => node.id)
  const hiddenNodeIds = context.nodes
    .filter(node => !node.visible)
    .map(node => node.id)
  const lockedNodeIds = context.nodes
    .filter(node => node.locked ?? false)
    .map(node => node.id)

  const smartCollections = [
    buildSmartCollectionItem(
      'outliner:collections:smart:assets',
      'Mesh Assets',
      '◆',
      assetNodeIds,
      context.nodeViewportStateById,
      context.nodes,
    ),
    buildSmartCollectionItem(
      'outliner:collections:smart:prefabs',
      'Prefabs',
      '◫',
      prefabNodeIds,
      context.nodeViewportStateById,
      context.nodes,
    ),
    buildSmartCollectionItem(
      'outliner:collections:smart:primitives',
      'Primitives',
      '●',
      primitiveNodeIds,
      context.nodeViewportStateById,
      context.nodes,
    ),
    buildSmartCollectionItem(
      'outliner:collections:smart:lights',
      'Lights',
      '☀',
      lightNodeIds,
      context.nodeViewportStateById,
      context.nodes,
    ),
    buildSmartCollectionItem(
      'outliner:collections:smart:gameplay',
      'Gameplay',
      '✦',
      gameplayNodeIds,
      context.nodeViewportStateById,
      context.nodes,
    ),
    buildSmartCollectionItem(
      'outliner:collections:smart:generated',
      'Generated Meshes',
      '⬢',
      generatedNodeIds,
      context.nodeViewportStateById,
      context.nodes,
    ),
    buildSmartCollectionItem(
      'outliner:collections:smart:hidden',
      'Hidden',
      '◌',
      hiddenNodeIds,
      context.nodeViewportStateById,
      context.nodes,
    ),
    buildSmartCollectionItem(
      'outliner:collections:smart:locked',
      'Locked',
      '⛶',
      lockedNodeIds,
      context.nodeViewportStateById,
      context.nodes,
    ),
  ].filter(item => (item.nodeIds?.length ?? 0) > 0)

  return [
    {
      id: 'outliner:collections:scene',
      label: 'Scene Collection',
      type: 'scene',
      icon: '▾',
      detail: `${context.nodes.length} objects`,
      nodeIds: context.nodes.map(node => node.id),
      children: [
        ...topLevelGroups.map(node => buildCollectionGroupItem(node, context)),
        ...(looseRootNodeIds.length > 0
          ? [
              buildSmartCollectionItem(
                'outliner:collections:loose',
                'Loose Objects',
                '○',
                looseRootNodeIds,
                context.nodeViewportStateById,
                context.nodes,
              ),
            ]
          : []),
        ...(smartCollections.length > 0
          ? [
              {
                id: 'outliner:collections:smart',
                label: 'Smart Collections',
                type: 'collection' as const,
                icon: '☰',
                detail: `${smartCollections.length} sets`,
                nodeIds: context.nodes.map(node => node.id),
                children: smartCollections,
              },
            ]
          : []),
      ],
    },
  ] satisfies OutlinerTreeItem[]
}

function createDatablockLeaf(
  label: string,
  type: OutlinerTreeItem['type'],
  icon: string,
  nodeIds: string[],
  detail: string | undefined,
  nodes: EditorSceneNode[],
  viewportStateById: Map<string, OutlinerNodeViewportState>,
) {
  return {
    id: `outliner:datablock:${type}:${sanitizeOutlinerIdPart(label)}`,
    label,
    type,
    icon,
    detail:
      detail ?? `${nodeIds.length} object${nodeIds.length === 1 ? '' : 's'}`,
    nodeIds,
    children: nodeIds
      .map(nodeId => nodes.find(node => node.id === nodeId))
      .filter(Boolean)
      .map(node =>
        buildOutlinerNodeLeaf(node as EditorSceneNode, viewportStateById),
      ),
  } satisfies OutlinerTreeItem
}

function buildBlenderFileOutlinerItems(context: OutlinerBuildContext) {
  const uniqueAssets = new Map<string, string[]>()
  const uniqueMaterials = new Map<string, string[]>()
  const uniquePrefabs = new Map<string, string[]>()
  const uniqueGameplay = new Map<string, string[]>()

  for (const node of context.nodes) {
    if (node.asset?.url) {
      uniqueAssets.set(node.asset.url, [
        ...(uniqueAssets.get(node.asset.url) ?? []),
        node.id,
      ])
    }

    const materialKey =
      node.material?.mapUrl ||
      node.material?.color ||
      node.primitive?.color ||
      ''
    if (materialKey) {
      uniqueMaterials.set(materialKey, [
        ...(uniqueMaterials.get(materialKey) ?? []),
        node.id,
      ])
    }

    if (node.prefab?.type) {
      uniquePrefabs.set(node.prefab.type, [
        ...(uniquePrefabs.get(node.prefab.type) ?? []),
        node.id,
      ])
    }

    if (node.gameplay?.type) {
      uniqueGameplay.set(node.gameplay.type, [
        ...(uniqueGameplay.get(node.gameplay.type) ?? []),
        node.id,
      ])
    }
  }

  const collectionItems =
    buildCollectionsOutlinerItems(context)[0]?.children ?? []
  const sceneNodeIds = context.nodes.map(node => node.id)

  return [
    {
      id: 'outliner:blender-file:root',
      label: 'Blender File',
      type: 'scene',
      icon: '▾',
      detail: context.levelId,
      nodeIds: sceneNodeIds,
      children: [
        {
          id: 'outliner:blender-file:scenes',
          label: 'Scenes',
          type: 'category',
          icon: '◫',
          detail: '1 scene',
          nodeIds: sceneNodeIds,
          children: [
            {
              id: `outliner:blender-file:scene:${context.levelId}`,
              label: context.levelId,
              type: 'scene',
              icon: '◫',
              detail: `${context.nodes.length} objects`,
              nodeIds: sceneNodeIds,
            },
          ],
        },
        {
          id: 'outliner:blender-file:collections',
          label: 'Collections',
          type: 'category',
          icon: '▤',
          detail: `${collectionItems.length} entries`,
          nodeIds: sceneNodeIds,
          children: collectionItems,
        },
        {
          id: 'outliner:blender-file:objects',
          label: 'Objects',
          type: 'category',
          icon: '○',
          detail: `${context.nodes.length} objects`,
          nodeIds: sceneNodeIds,
          children: context.nodes.map(node =>
            buildOutlinerNodeLeaf(node, context.nodeViewportStateById),
          ),
        },
        {
          id: 'outliner:blender-file:assets',
          label: 'Mesh Assets',
          type: 'category',
          icon: '◆',
          detail: `${uniqueAssets.size} datablocks`,
          children: Array.from(uniqueAssets.entries()).map(
            ([assetUrl, nodeIds]) => {
              const assetName =
                assetUrl.split('/').filter(Boolean).pop() ?? assetUrl
              return createDatablockLeaf(
                assetName,
                'asset',
                '◆',
                nodeIds,
                assetUrl,
                context.nodes,
                context.nodeViewportStateById,
              )
            },
          ),
        },
        {
          id: 'outliner:blender-file:materials',
          label: 'Materials',
          type: 'category',
          icon: '◈',
          detail: `${uniqueMaterials.size} datablocks`,
          children: Array.from(uniqueMaterials.entries()).map(
            ([materialKey, nodeIds]) =>
              createDatablockLeaf(
                materialKey.startsWith('#')
                  ? materialKey
                  : materialKey.split('/').filter(Boolean).pop() ?? materialKey,
                'material',
                '◈',
                nodeIds,
                materialKey,
                context.nodes,
                context.nodeViewportStateById,
              ),
          ),
        },
        {
          id: 'outliner:blender-file:prefabs',
          label: 'Prefabs',
          type: 'category',
          icon: '◫',
          detail: `${uniquePrefabs.size} prefab families`,
          children: Array.from(uniquePrefabs.entries()).map(
            ([prefabType, nodeIds]) =>
              createDatablockLeaf(
                prefabType,
                'prefab',
                '◫',
                nodeIds,
                undefined,
                context.nodes,
                context.nodeViewportStateById,
              ),
          ),
        },
        {
          id: 'outliner:blender-file:gameplay',
          label: 'Gameplay',
          type: 'category',
          icon: '✦',
          detail: `${uniqueGameplay.size} gameplay families`,
          children: Array.from(uniqueGameplay.entries()).map(
            ([gameplayType, nodeIds]) =>
              createDatablockLeaf(
                gameplayType,
                'gameplay',
                '✦',
                nodeIds,
                undefined,
                context.nodes,
                context.nodeViewportStateById,
              ),
          ),
        },
      ],
    },
  ] satisfies OutlinerTreeItem[]
}

function buildDataApiValueItem(
  prefix: string,
  key: string,
  value: unknown,
  depth = 0,
): OutlinerTreeItem {
  const id = `${prefix}:${sanitizeOutlinerIdPart(key)}`
  if (depth > 6) {
    return {
      id,
      label: key,
      type: 'setting',
      icon: '•',
      value: '[depth limit]',
    }
  }

  if (Array.isArray(value)) {
    return {
      id,
      label: key,
      type: 'category',
      icon: '≡',
      detail: `[${value.length}]`,
      children: value.map((entry, index) =>
        buildDataApiValueItem(id, `${index}`, entry, depth + 1),
      ),
    }
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    return {
      id,
      label: key,
      type: 'category',
      icon: '▸',
      detail: `${entries.length} fields`,
      children: entries.map(([childKey, childValue]) =>
        buildDataApiValueItem(id, childKey, childValue, depth + 1),
      ),
    }
  }

  return {
    id,
    label: key,
    type: 'setting',
    icon: '•',
    value: value == null ? 'null' : String(value),
  }
}

function buildDataApiOutlinerItems(context: OutlinerBuildContext) {
  const selectionItem = context.selectedNode
    ? {
        id: 'outliner:data-api:selection',
        label: 'Active Object',
        type: 'category' as const,
        icon: '◎',
        detail: context.selectedNode.name,
        nodeId: context.selectedNode.id,
        nodeIds: [context.selectedNode.id],
        children: Object.entries(context.selectedNode).map(([key, value]) =>
          buildDataApiValueItem('outliner:data-api:selection', key, value),
        ),
      }
    : {
        id: 'outliner:data-api:selection',
        label: 'Active Object',
        type: 'category' as const,
        icon: '◎',
        detail: 'Nothing selected',
        children: [],
      }

  return [
    {
      id: 'outliner:data-api:root',
      label: 'Data API',
      type: 'scene',
      icon: '▾',
      detail: context.levelId,
      children: [
        {
          id: 'outliner:data-api:scene',
          label: 'Scene',
          type: 'category',
          icon: '◫',
          detail: `${context.nodes.length} objects`,
          nodeIds: context.nodes.map(node => node.id),
          children: [
            buildDataApiValueItem(
              'outliner:data-api:scene',
              'levelId',
              context.levelId,
            ),
            buildDataApiValueItem(
              'outliner:data-api:scene',
              'version',
              context.scene?.version ?? 0,
            ),
            buildDataApiValueItem(
              'outliner:data-api:scene',
              'updatedAt',
              context.scene?.updatedAt ?? 'unknown',
            ),
            buildDataApiValueItem(
              'outliner:data-api:scene',
              'nodeCount',
              context.nodes.length,
            ),
            buildDataApiValueItem(
              'outliner:data-api:scene',
              'settings',
              context.scene?.settings ?? {},
            ),
          ],
        },
        selectionItem,
      ],
    },
  ] satisfies OutlinerTreeItem[]
}

export function buildOutlinerItems(context: OutlinerBuildContext) {
  switch (context.mode) {
    case 'collections':
      return buildCollectionsOutlinerItems(context)
    case 'blender-file':
      return buildBlenderFileOutlinerItems(context)
    case 'data-api':
      return buildDataApiOutlinerItems(context)
    case 'view-layer':
    default:
      return buildViewLayerOutlinerItems(context)
  }
}

export function getDefaultExpandedOutlinerIds(
  mode: OutlinerDisplayMode,
  nodes: EditorSceneNode[],
) {
  const expanded = new Set<string>()

  if (mode === 'view-layer') {
    expanded.add('outliner:view-layer:scene')
    for (const node of nodes) {
      if (getNodeChildren(node.id, nodes).length > 0) {
        expanded.add(`outliner:view-layer:node:${node.id}`)
      }
    }
    return expanded
  }

  if (mode === 'collections') {
    expanded.add('outliner:collections:scene')
    expanded.add('outliner:collections:smart')
    for (const node of nodes.filter(candidate => candidate.kind === 'group')) {
      expanded.add(`outliner:collections:group:${node.id}`)
    }
    return expanded
  }

  if (mode === 'blender-file') {
    expanded.add('outliner:blender-file:root')
    expanded.add('outliner:blender-file:scenes')
    expanded.add('outliner:blender-file:collections')
    expanded.add('outliner:blender-file:objects')
    return expanded
  }

  expanded.add('outliner:data-api:root')
  expanded.add('outliner:data-api:scene')
  expanded.add('outliner:data-api:selection')
  return expanded
}

export function ensureOutlinerDefaultExpansion(
  expandedIdsByMode: Record<OutlinerDisplayMode, string[]>,
  mode: OutlinerDisplayMode,
  nodes: EditorSceneNode[],
) {
  const current = getOutlinerExpandedIds(expandedIdsByMode, mode)
  if (current.size > 1) return expandedIdsByMode
  return setOutlinerExpandedIds(
    expandedIdsByMode,
    mode,
    getDefaultExpandedOutlinerIds(mode, nodes),
  )
}

function outlinerItemMatches(item: OutlinerTreeItem, query: string) {
  const haystack =
    `${item.label} ${item.detail ?? ''} ${item.value ?? ''}`.toLowerCase()
  return haystack.includes(query)
}

export function flattenOutlinerItems(
  items: OutlinerTreeItem[],
  query: string,
  expandedIds: Set<string>,
) {
  const normalizedQuery = query.trim().toLowerCase()
  const rows: OutlinerRow[] = []

  const buildRows = (
    item: OutlinerTreeItem,
    depth: number,
  ): { visible: boolean; rows: OutlinerRow[] } => {
    const childResults = (item.children ?? []).map(child =>
      buildRows(child, depth + 1),
    )
    const childVisible = childResults.some(result => result.visible)
    const selfVisible =
      !normalizedQuery || outlinerItemMatches(item, normalizedQuery)
    const visible = selfVisible || childVisible

    if (!visible) {
      return { visible: false, rows: [] }
    }

    const hasChildren = (item.children?.length ?? 0) > 0
    const expanded =
      hasChildren && (normalizedQuery ? true : expandedIds.has(item.id))
    const nextRows: OutlinerRow[] = [
      {
        ...item,
        depth,
        hasChildren,
        expanded,
      },
    ]

    if (expanded) {
      for (const result of childResults) {
        if (result.visible) nextRows.push(...result.rows)
      }
    }

    return {
      visible: true,
      rows: nextRows,
    }
  }

  for (const item of items) {
    const result = buildRows(item, 0)
    if (result.visible) rows.push(...result.rows)
  }

  return rows
}

export function getOutlinerTargetNodeIds(item: OutlinerTreeItem) {
  return Array.from(new Set(item.nodeIds ?? (item.nodeId ? [item.nodeId] : [])))
}

export function isOutlinerRowSelected(
  item: OutlinerTreeItem,
  selectedNodeIds: string[],
) {
  const ids = getOutlinerTargetNodeIds(item)
  return ids.length > 0 && ids.every(id => selectedNodeIds.includes(id))
}

export function getOutlinerRowActionState(
  item: OutlinerTreeItem,
  nodes: EditorSceneNode[],
  isolatedNodeIds: string[],
): OutlinerRowActionState {
  const nodeIds = getOutlinerTargetNodeIds(item)
  const resolvedNodes = nodeIds
    .map(id => nodes.find(node => node.id === id))
    .filter(Boolean) as EditorSceneNode[]
  const isolatedSet = new Set(isolatedNodeIds)
  return {
    allVisible:
      resolvedNodes.length > 0 && resolvedNodes.every(node => node.visible),
    allSelectable:
      resolvedNodes.length > 0 &&
      resolvedNodes.every(node => !(node.locked ?? false)),
    allIsolated: nodeIds.length > 0 && nodeIds.every(id => isolatedSet.has(id)),
  }
}

export function collectExpandableOutlinerIds(items: OutlinerTreeItem[]) {
  const expanded = new Set<string>()
  const visit = (entries: OutlinerTreeItem[]) => {
    for (const item of entries) {
      if ((item.children?.length ?? 0) > 0) {
        expanded.add(item.id)
        visit(item.children ?? [])
      }
    }
  }
  visit(items)
  return expanded
}

export function collectOutlinerRootExpandedIds(items: OutlinerTreeItem[]) {
  const expanded = new Set<string>()
  for (const item of items) {
    if ((item.children?.length ?? 0) > 0) {
      expanded.add(item.id)
    }
  }
  return expanded
}

export function resolveOutlinerSelectionIntent(
  item: OutlinerTreeItem,
  event: MouseEvent,
  visibleNodeOrder: string[],
): OutlinerSelectionIntent {
  const ids = getOutlinerTargetNodeIds(item)
  if (item.nodeId) {
    const additive = event.shiftKey
    const toggle = event.metaKey || event.ctrlKey
    return {
      kind: 'select-node',
      nodeId: item.nodeId,
      additive,
      toggle,
      rangeOrder: additive ? visibleNodeOrder : undefined,
    }
  }

  if (ids.length > 0) {
    return {
      kind: 'select-set',
      nodeIds: ids,
      additive: event.metaKey || event.ctrlKey,
    }
  }

  if (item.children?.length) {
    return {
      kind: 'toggle-expand',
      itemId: item.id,
    }
  }

  return { kind: 'noop' }
}

export function getOutlinerSubtitle(
  mode: OutlinerDisplayMode,
  nodes: EditorSceneNode[],
  selectedNodes: EditorSceneNode[],
  selectedNode: EditorSceneNode | null,
) {
  if (mode === 'view-layer') {
    if (selectedNodes.length > 1) return `${selectedNodes.length} selected`
    if (selectedNode) return selectedNode.name
    return `${nodes.length} objects`
  }
  if (mode === 'collections') return 'Scene collections and smart sets'
  if (mode === 'blender-file') return 'Datablocks and scene contents'
  return 'Scene and selection data'
}

export function getOutlinerFilterPlaceholder(mode: OutlinerDisplayMode) {
  if (mode === 'data-api') return 'Search keys and values'
  if (mode === 'blender-file') return 'Search datablocks and objects'
  return 'Search scene objects'
}
