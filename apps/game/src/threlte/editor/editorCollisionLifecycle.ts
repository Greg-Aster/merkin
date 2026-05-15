import {
  getDefaultCollisionChannel,
  getDefaultCollisionIntent,
  getDefaultCollisionShape,
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
  'intent' | 'channel' | 'friction' | 'restitution' | 'sensor'
> {
  const intent = getCollisionIntent(node, settings)
  const sensor = node.collision?.sensor ?? intent === 'trigger'
  return {
    intent,
    channel: getCollisionChannel(node, settings),
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
    ...getBaseCollision(node, settings),
    mode: 'auto',
    quality: shape === 'trimesh' ? 'simplifiedMesh' : 'primitive',
  }
}

function getCollisionMode(collision: EditorNodeCollisionData) {
  if (collision.mode) return collision.mode
  if (collision.enabled === false || collision.intent === 'none') return 'none'
  if (collision.sensor || collision.intent === 'trigger') return 'trigger'
  return 'auto'
}

function getCollisionQuality(collision: EditorNodeCollisionData) {
  if (collision.quality) return collision.quality
  return collision.shape === 'trimesh' ? 'trimesh' : 'primitive'
}

function hasGeneratedCollisionProduct(collision: EditorNodeCollisionData) {
  return Boolean(
    collision.colliderUrl ||
      collision.colliderMetadataUrl ||
      collision.colliderCacheKey ||
      collision.sourceAssetUrl ||
      collision.colliderSourceAssetUrl ||
      Object.hasOwn(collision, 'assetLocalTransform') ||
      collision.triangleCount !== undefined ||
      collision.vertexCount !== undefined,
  )
}

export function sanitizeEditorNodeCollisionPolicy(
  collision: EditorNodeCollisionData,
): EditorNodeCollisionData {
  const mode = getCollisionMode(collision)
  const intent =
    mode === 'none'
      ? 'none'
      : mode === 'trigger'
        ? 'trigger'
        : collision.intent ?? 'blocker'

  const productFields = hasGeneratedCollisionProduct(collision)
    ? {
        shape: 'trimesh' as const,
        colliderUrl: collision.colliderUrl,
        colliderMetadataUrl: collision.colliderMetadataUrl,
        colliderCacheKey: collision.colliderCacheKey,
        assetLocalTransform: collision.assetLocalTransform,
        sourceAssetUrl: collision.sourceAssetUrl,
        colliderSourceAssetUrl: collision.colliderSourceAssetUrl,
        triangleCount: collision.triangleCount,
        vertexCount: collision.vertexCount,
      }
    : {}

  return {
    mode,
    quality: getCollisionQuality(collision),
    intent,
    channel: collision.channel,
    lodTier: collision.lodTier ?? collision.lodSourceTier,
    friction: collision.friction,
    restitution: collision.restitution,
    sensor: mode === 'trigger' ? true : collision.sensor,
    maxTriangles: collision.maxTriangles ?? collision.triangleBudget,
    generationStatus: collision.generationStatus,
    generationLastError: collision.generationLastError,
    ...productFields,
  }
}

function stripLegacyGenerationSource(
  patch: EditorSceneNodePatch,
): EditorSceneNodePatch {
  if (!patch.generation || !('originalCollision' in patch.generation)) {
    return patch
  }
  const { originalCollision: _originalCollision, ...generation } =
    patch.generation
  return {
    ...patch,
    generation,
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
  patch = stripLegacyGenerationSource(patch)

  if (patch.collision) {
    return {
      ...patch,
      collision: sanitizeEditorNodeCollisionPolicy(patch.collision),
    }
  }

  if (didRenderAssetChange(currentNode, patch)) {
    const nextNode = {
      ...currentNode,
      ...patch,
    } as EditorSceneNode

    if (currentNode.collision) {
      return {
        ...patch,
        collision: sanitizeEditorNodeCollisionPolicy(currentNode.collision),
      }
    }

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

    const materializedCollision = materializeEditorNodeCollision(
      nextNode,
      settings,
    ).collision
    return materializedCollision
      ? {
          ...patch,
          collision: sanitizeEditorNodeCollisionPolicy(materializedCollision),
        }
      : patch
  }

  return patch
}
