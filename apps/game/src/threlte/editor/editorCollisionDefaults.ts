import {
  type ColliderArgs,
  getColliderLocalArgs,
  getCollisionVisualSize,
} from '../engine/colliderGeometry'
import { getDefaultCollisionChannel as getPolicyDefaultCollisionChannel } from '../engine/collisionChannels'
import {
  getDefaultCollisionIntent as getPolicyDefaultCollisionIntent,
  getDefaultCollisionShape as getPolicyDefaultCollisionShape,
  isTerrainVisualActor,
  resolveCollisionPolicy,
} from '../engine/collisionPolicy'
import {
  isEditorProxyCollision,
  isEditorProxyCollisionNeedingBake,
} from '../engine/editorProxyCollision'
import type {
  EditorNodeCollisionData,
  EditorSceneNode,
  EditorSceneSettings,
} from './editorTypes'

export type EditorCollisionSourceStatus = {
  label: string
  detail: string
  tone: 'ok' | 'warning' | 'muted'
}

function isTerrainVisualNode(
  node: EditorSceneNode | null | undefined,
  levelSettings?: EditorSceneSettings | null,
) {
  return isTerrainVisualActor(node?.id ?? '', levelSettings)
}

function getPolicyActorKind(node: EditorSceneNode | null | undefined) {
  return node?.kind === 'asset' ||
    node?.kind === 'primitive' ||
    node?.kind === 'prefab' ||
    node?.kind === 'light'
    ? node.kind
    : 'empty'
}

function resolveNodeCollisionPolicy(
  node: EditorSceneNode | null | undefined,
  levelSettings?: EditorSceneSettings | null,
) {
  return resolveCollisionPolicy({
    actorId: node?.id ?? '',
    actorKind: getPolicyActorKind(node),
    visible: node?.visible,
    hasGameplay: Boolean(node?.gameplay),
    bodyType: node?.physics?.bodyType,
    primitiveGeometry: node?.primitive?.geometry,
    levelSettings,
    authoredCollision: node?.collision,
  })
}

export function getDefaultCollisionShape(
  node: EditorSceneNode | null | undefined,
): EditorNodeCollisionData['shape'] {
  return getPolicyDefaultCollisionShape({
    actorId: node?.id ?? '',
    actorKind: getPolicyActorKind(node),
    primitiveGeometry: node?.primitive?.geometry,
  })
}

export function getDefaultCollisionIntent(
  node: EditorSceneNode | null | undefined,
  levelSettings?: EditorSceneSettings | null,
): NonNullable<EditorNodeCollisionData['intent']> {
  return getPolicyDefaultCollisionIntent({
    actorId: node?.id ?? '',
    actorKind: getPolicyActorKind(node),
    visible: node?.visible,
    hasGameplay: Boolean(node?.gameplay),
    bodyType: node?.physics?.bodyType,
    primitiveGeometry: node?.primitive?.geometry,
    levelSettings,
    authoredCollision: node?.collision,
  })
}

export function getDefaultCollisionChannel(
  node: EditorSceneNode | null | undefined,
  levelSettings?: EditorSceneSettings | null,
) {
  return getPolicyDefaultCollisionChannel({
    intent:
      node?.collision?.intent ?? getDefaultCollisionIntent(node, levelSettings),
    bodyType: node?.physics?.bodyType,
  })
}

export function resolveAuthoredCollisionShape(
  node: EditorSceneNode,
): EditorNodeCollisionData['shape'] {
  const defaultShape = getDefaultCollisionShape(node)
  const authoredShape = node.collision?.shape

  if (!authoredShape) return defaultShape

  if (
    authoredShape === 'cuboid' &&
    defaultShape !== 'cuboid' &&
    !node.collision?.size &&
    !isEditorProxyCollision(node.collision)
  ) {
    return defaultShape
  }

  return authoredShape
}

export function isEditorGeometryNode(
  node: EditorSceneNode | null | undefined,
): node is EditorSceneNode & { kind: 'primitive' | 'asset' | 'prefab' } {
  return (
    !!node &&
    (node.kind === 'primitive' ||
      node.kind === 'asset' ||
      node.kind === 'prefab')
  )
}

export function isDefaultSolidNode(
  node: EditorSceneNode | null | undefined,
  levelSettings?: EditorSceneSettings | null,
) {
  return (
    isEditorGeometryNode(node) &&
    !isTerrainVisualNode(node, levelSettings) &&
    node?.visible !== false &&
    !node?.gameplay &&
    node?.collision?.enabled !== false
  )
}

export function resolveNodeCollision(
  node: EditorSceneNode | null | undefined,
  levelSettings?: EditorSceneSettings | null,
): EditorNodeCollisionData | null {
  if (!isEditorGeometryNode(node)) return null
  const result = resolveNodeCollisionPolicy(node, levelSettings)
  if (!result.collision) return null

  return {
    shape: resolveAuthoredCollisionShape(node),
    intent: result.collision.intent,
    channel: result.collision.channel,
    enabled: true,
    size: result.collision.size,
    colliderUrl: result.collision.colliderUrl,
    colliderMetadataUrl: result.collision.colliderMetadataUrl,
    proxy: node.collision?.proxy,
    bakeStatus: node.collision?.bakeStatus,
    sourceAssetUrl: result.collision.sourceAssetUrl,
    friction: result.collision.friction,
    restitution: result.collision.restitution,
    sensor: result.collision.sensor,
    triangleBudget: result.collision.triangleBudget,
    triangleCount: result.collision.triangleCount,
    vertexCount: result.collision.vertexCount,
  }
}

export function describeNodeCollisionSource(
  node: EditorSceneNode | null | undefined,
  levelSettings?: EditorSceneSettings | null,
): EditorCollisionSourceStatus {
  if (!isEditorGeometryNode(node)) {
    return {
      label: 'No geometry',
      detail:
        'Collision is only available for asset, prefab, or primitive actors.',
      tone: 'muted',
    }
  }

  const result = resolveNodeCollisionPolicy(node, levelSettings)
  const collision = result.collision
  const authoredCollision = node.collision
  const shape = collision?.shape ?? authoredCollision?.shape

  if (isTerrainVisualNode(node, levelSettings)) {
    return {
      label: 'Collision disabled by level role',
      detail:
        'This level marks the actor as visual-only; enabling collision or choosing Blocker/Walkable removes that override.',
      tone: 'warning',
    }
  }

  if (
    shape === 'trimesh' &&
    collision &&
    !String(collision.colliderUrl ?? '').trim()
  ) {
    return {
      label: 'Missing collider asset',
      detail:
        'Asset meshes require a baked collider asset URL; use Bake Mesh Collider before publishing.',
      tone: 'warning',
    }
  }

  if (isEditorProxyCollisionNeedingBake(authoredCollision)) {
    return {
      label: 'Editor proxy collider',
      detail:
        'This actor has playtest collision from visual bounds. Bake a mesh collider before publishing.',
      tone: 'warning',
    }
  }

  if (
    shape === 'trimesh' &&
    collision &&
    String(collision.colliderUrl ?? '').trim()
  ) {
    return {
      label: 'Baked mesh collider',
      detail: 'This actor uses an authored runtime trimesh collider asset.',
      tone: 'ok',
    }
  }

  if (collision && node.renderPolicy?.runtimeStyle === 'skip') {
    return {
      label: 'Collision proxy',
      detail: 'Render is skipped while authored collision remains active.',
      tone: 'ok',
    }
  }

  if (result.source === 'authored' && collision) {
    return {
      label: 'Authored collision',
      detail:
        'This actor uses explicit collision values from the scene document.',
      tone: 'ok',
    }
  }

  if (result.source === 'default' && collision) {
    return {
      label: 'Default policy',
      detail:
        'Collision is inferred by the level workflow; asset meshes still require a baked collider asset.',
      tone: 'muted',
    }
  }

  if (
    authoredCollision?.enabled === false ||
    authoredCollision?.intent === 'none'
  ) {
    return {
      label: 'Disabled',
      detail: 'Collision is explicitly disabled for this actor.',
      tone: 'muted',
    }
  }

  if (result.warning) {
    return {
      label: 'Disabled',
      detail: result.warning,
      tone: 'warning',
    }
  }

  return {
    label: 'Disabled',
    detail: 'Runtime physics is disabled for this actor.',
    tone: 'muted',
  }
}

export function getNodeVisualColliderSizeSource(
  node: EditorSceneNode | null | undefined,
): 'primitive-bounds' | 'authored-bounds' | 'transform-scale' {
  if (!node) return 'transform-scale'

  if (node.primitive) return 'primitive-bounds'
  if (node.generation?.sourceVisualSize?.length === 3) {
    return 'authored-bounds'
  }
  if (
    node.collision?.assetLocalTransform?.visualLocalBounds?.size?.length === 3
  ) {
    return 'authored-bounds'
  }

  return 'transform-scale'
}

export function getNodeVisualColliderSize(
  node: EditorSceneNode | null | undefined,
): [number, number, number] {
  if (!node) return [1, 1, 1]

  return getCollisionVisualSize({
    primitive: node.primitive,
    scale: node.scale,
    authoredWorldSize: node.generation?.sourceVisualSize,
    visualLocalBoundsSize:
      node.collision?.assetLocalTransform?.visualLocalBounds?.size,
  })
}

export function getNodeColliderArgs(
  node: EditorSceneNode | null | undefined,
  levelSettings?: EditorSceneSettings | null,
): ColliderArgs {
  const collision = resolveNodeCollision(node, levelSettings)
  if (!node || !collision) return [0.5, 0.5, 0.5]

  return getColliderLocalArgs({
    shape: collision.shape,
    worldSize: collision.size ?? getNodeVisualColliderSize(node),
    scale: node.scale,
  })
}
