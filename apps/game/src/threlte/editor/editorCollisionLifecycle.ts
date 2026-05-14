import {
  getDefaultCollisionChannel,
  getDefaultCollisionIntent,
  getDefaultCollisionShape,
  getNodeVisualColliderSize,
  isEditorGeometryNode,
  shouldAuthorPrimitiveCollisionByDefault,
} from './editorCollisionDefaults'
import type { EditorSceneNodePatch } from './editorCommands'
import type {
  EditorNodeCollisionData,
  EditorSceneNode,
  EditorSceneSettings,
} from './editorTypes'

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

function createDefaultCollision(
  node: EditorSceneNode,
  settings?: EditorSceneSettings | null,
): EditorNodeCollisionData {
  const shape = getDefaultCollisionShape(node)
  return {
    shape,
    ...getBaseCollision(node, settings),
    ...(shape === 'trimesh'
      ? { triangleBudget: 5000 }
      : { size: getNodeVisualColliderSize(node) }),
  }
}

function hasFiniteVec3(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(component => Number.isFinite(component))
  )
}

export function preserveCollisionForVisualReplacement(
  node: EditorSceneNode,
  options: { visualScaleBakedIntoMesh?: boolean } = {},
): EditorNodeCollisionData | undefined {
  if (!node.collision) return undefined

  const collision = structuredClone(node.collision) as EditorNodeCollisionData
  if (
    !options.visualScaleBakedIntoMesh ||
    collision.shape === 'trimesh' ||
    collision.enabled === false ||
    collision.intent === 'none' ||
    hasFiniteVec3(collision.size)
  ) {
    return collision
  }

  return {
    ...collision,
    size: getNodeVisualColliderSize(node),
  }
}

export function materializeEditorNodeCollision(
  node: EditorSceneNode,
  settings?: EditorSceneSettings | null,
): EditorSceneNode {
  if (!isEditorGeometryNode(node)) return node
  if (!shouldAuthorPrimitiveCollisionByDefault(node, settings)) return node
  if (node.collision) return node

  return {
    ...node,
    physics: {
      ...(node.physics ?? {}),
      bodyType: 'fixed',
    },
    collision: createDefaultCollision(node, settings),
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

export function applyCollisionLifecycleToPatch(
  currentNode: EditorSceneNode,
  patch: EditorSceneNodePatch,
  settings?: EditorSceneSettings | null,
): EditorSceneNodePatch {
  if (patch.collision) return patch

  if (didRenderAssetChange(currentNode, patch)) {
    const nextNode = {
      ...currentNode,
      ...patch,
    } as EditorSceneNode

    if (
      !isEditorGeometryNode(nextNode) ||
      !shouldAuthorPrimitiveCollisionByDefault(nextNode, settings)
    ) {
      return patch
    }

    if (
      nextNode.collision?.enabled === false ||
      nextNode.collision?.intent === 'none'
    ) {
      return patch
    }

    if (currentNode.collision) return patch

    return {
      ...patch,
      collision: materializeEditorNodeCollision(nextNode, settings).collision,
    }
  }

  return patch
}
