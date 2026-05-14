import {
  getDefaultCollisionChannel,
  getDefaultCollisionIntent,
  getDefaultCollisionShape,
  getNodeVisualColliderSize,
  isDefaultSolidNode,
  isEditorGeometryNode,
  resolveAuthoredCollisionShape,
} from './editorCollisionDefaults'
import type { EditorSceneNodePatch } from './editorCommands'
import type {
  EditorNodeCollisionData,
  EditorSceneNode,
  EditorSceneSettings,
} from './editorTypes'

function isMeshBackedNode(node: EditorSceneNode | null | undefined) {
  return node?.kind === 'asset' || node?.kind === 'prefab'
}

function getNodeRenderAssetUrl(node: EditorSceneNode | null | undefined) {
  return node?.asset?.url ?? ''
}

function getCollisionSourceAssetUrl(
  collision: EditorNodeCollisionData | null | undefined,
) {
  return (
    collision?.sourceAssetUrl ??
    collision?.assetLocalTransform?.sourceAssetUrl ??
    ''
  )
}

function getCollisionIntent(
  node: EditorSceneNode,
  settings?: EditorSceneSettings | null,
) {
  const authored = node.collision
  if (authored?.intent && authored.intent !== 'none') return authored.intent
  return getDefaultCollisionIntent(node, settings)
}

function getCollisionChannel(
  node: EditorSceneNode,
  settings?: EditorSceneSettings | null,
) {
  return (
    node.collision?.channel ??
    getDefaultCollisionChannel(
      {
        ...node,
        collision: {
          shape: node.collision?.shape ?? getDefaultCollisionShape(node),
          intent: getCollisionIntent(node, settings),
          enabled: true,
        },
      },
      settings,
    )
  )
}

function getBaseCollision(
  node: EditorSceneNode,
  settings?: EditorSceneSettings | null,
): Pick<
  EditorNodeCollisionData,
  'intent' | 'channel' | 'enabled' | 'friction' | 'restitution' | 'sensor'
> {
  const intent = getCollisionIntent(node, settings)
  const sensor = node.collision?.sensor ?? intent === 'trigger'
  return {
    intent,
    channel: getCollisionChannel(node, settings),
    enabled: true,
    friction: node.collision?.friction ?? 0.7,
    restitution: node.collision?.restitution ?? 0,
    sensor,
  }
}

export function createEditorProxyCollision(
  node: EditorSceneNode,
  settings?: EditorSceneSettings | null,
  options: { size?: [number, number, number] } = {},
): EditorNodeCollisionData {
  return {
    shape: 'cuboid',
    ...getBaseCollision(node, settings),
    size: options.size ?? getNodeVisualColliderSize(node),
    proxy: true,
    bakeStatus: 'needsBake',
    sourceAssetUrl: node.asset?.url,
  }
}

export function materializeEditorNodeCollision(
  node: EditorSceneNode,
  settings?: EditorSceneSettings | null,
): EditorSceneNode {
  if (!isEditorGeometryNode(node)) return node
  if (!isDefaultSolidNode(node, settings)) return node
  if (node.collision) {
    const renderAssetUrl = getNodeRenderAssetUrl(node)
    const collisionSourceAssetUrl = getCollisionSourceAssetUrl(node.collision)
    const staleRenderAssetCollision =
      isMeshBackedNode(node) &&
      renderAssetUrl &&
      collisionSourceAssetUrl &&
      collisionSourceAssetUrl !== renderAssetUrl
    const missingBakedMeshCollider =
      isMeshBackedNode(node) &&
      resolveAuthoredCollisionShape(node) === 'trimesh' &&
      !node.collision.colliderUrl

    if (staleRenderAssetCollision || missingBakedMeshCollider) {
      return {
        ...node,
        collision: createEditorProxyCollision(node, settings),
      }
    }

    return node
  }

  const shape = getDefaultCollisionShape(node)
  return {
    ...node,
    physics: {
      bodyType: 'fixed',
      ...(node.physics ?? {}),
    },
    collision: isMeshBackedNode(node)
      ? createEditorProxyCollision(node, settings)
      : {
          shape,
          ...getBaseCollision(node, settings),
          ...(shape === 'trimesh'
            ? { triangleBudget: 5000 }
            : { size: getNodeVisualColliderSize(node) }),
        },
  }
}

function didRenderAssetChange(
  currentNode: EditorSceneNode,
  patch: EditorSceneNodePatch,
) {
  const nextKind = patch.kind ?? currentNode.kind
  const nextAssetUrl = patch.asset?.url ?? currentNode.asset?.url
  const nextPrefab = patch.prefab ?? currentNode.prefab
  const nextPrimitive = patch.primitive ?? currentNode.primitive

  return (
    nextKind !== currentNode.kind ||
    nextAssetUrl !== currentNode.asset?.url ||
    nextPrefab?.type !== currentNode.prefab?.type ||
    nextPrefab?.variant !== currentNode.prefab?.variant ||
    nextPrimitive?.geometry !== currentNode.primitive?.geometry ||
    JSON.stringify(nextPrimitive?.args ?? null) !==
      JSON.stringify(currentNode.primitive?.args ?? null)
  )
}

function scaleProxySize(
  size: [number, number, number],
  previousScale: [number, number, number],
  nextScale: [number, number, number],
): [number, number, number] {
  return size.map((value, index) => {
    const previous = Math.abs(Number(previousScale[index] ?? 1))
    const next = Math.abs(Number(nextScale[index] ?? 1))
    if (!Number.isFinite(previous) || previous <= 0.0001) return value
    if (!Number.isFinite(next) || next <= 0.0001) return value
    return Math.max(0.05, Math.abs(Number(value)) * (next / previous))
  }) as [number, number, number]
}

export function applyCollisionLifecycleToPatch(
  currentNode: EditorSceneNode,
  patch: EditorSceneNodePatch,
  settings?: EditorSceneSettings | null,
): EditorSceneNodePatch {
  if (patch.collision) return patch

  const renderAssetChanged = didRenderAssetChange(currentNode, patch)

  if (renderAssetChanged) {
    const nextNode = {
      ...currentNode,
      ...patch,
    } as EditorSceneNode

    if (
      !isEditorGeometryNode(nextNode) ||
      !isDefaultSolidNode(nextNode, settings)
    ) {
      return patch
    }

    if (
      nextNode.collision?.enabled === false ||
      nextNode.collision?.intent === 'none'
    ) {
      return patch
    }

    if (isMeshBackedNode(nextNode)) {
      return {
        ...patch,
        collision: createEditorProxyCollision(nextNode, settings),
      }
    }

    return {
      ...patch,
      collision: materializeEditorNodeCollision(
        {
          ...nextNode,
          collision: undefined,
        },
        settings,
      ).collision,
    }
  }

  if (
    patch.scale &&
    !renderAssetChanged &&
    currentNode.collision?.proxy &&
    currentNode.collision.size
  ) {
    return {
      ...patch,
      collision: {
        ...currentNode.collision,
        size: scaleProxySize(
          currentNode.collision.size,
          currentNode.scale,
          patch.scale,
        ),
        bakeStatus:
          currentNode.collision.bakeStatus === 'ready'
            ? 'stale'
            : currentNode.collision.bakeStatus ?? 'needsBake',
      },
    }
  }

  return patch
}
