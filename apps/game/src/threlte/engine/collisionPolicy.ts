import type { AssetLocalTransformMetadata } from './assetLocalTransform'
import { resolveCollisionChannel } from './collisionChannels'
import {
  getActorCollisionRole,
  getCollisionIntentForRole,
} from './levelCollisionWorkflow'
import type { SceneSettings } from './sceneDocumentTypes'
import type {
  CollisionChannel,
  CollisionComponent,
  CollisionGenerationQuality,
  CollisionIntent,
  CollisionPolicyMode,
  CollisionShape,
  PhysicsBodyType,
  PrimitiveGeometryKind,
} from './types'

export interface AuthoredCollisionPolicy {
  mode?: CollisionPolicyMode
  intent?: CollisionIntent
  channel?: CollisionChannel
  quality?: CollisionGenerationQuality
  lodTier?: 'source' | 'high' | 'medium' | 'low'
  maxTriangles?: number
  walkableSlopeLimitDeg?: number
  friction?: number
  restitution?: number
  sensor?: boolean
}

export interface NormalizedCollisionPolicy extends AuthoredCollisionPolicy {
  mode: CollisionPolicyMode
}

export function normalizeCollisionPolicy(
  policy: AuthoredCollisionPolicy | null | undefined,
): NormalizedCollisionPolicy {
  return {
    ...policy,
    mode: policy?.mode ?? 'auto',
  }
}

export interface CollisionPolicyInput {
  levelId?: string | null
  actorId: string
  actorKind: 'asset' | 'primitive' | 'prefab' | 'terrain' | 'light' | 'empty'
  levelSettings?: SceneSettings | null
  visible?: boolean
  hasGameplay?: boolean
  bodyType?: PhysicsBodyType
  primitiveGeometry?: PrimitiveGeometryKind
  authoredCollision?:
    | (AuthoredCollisionPolicy & {
        shape?: CollisionShape
        enabled?: boolean
        lodSourceTier?: 'source' | 'low' | 'medium' | 'high'
        generationStatus?: 'ready' | 'dirty' | 'generating' | 'failed'
        generationLastError?: string
        size?: [number, number, number]
        colliderUrl?: string
        colliderMetadataUrl?: string
        colliderCacheKey?: string
        assetLocalTransform?: AssetLocalTransformMetadata | null
        sourceAssetUrl?: string
        colliderSourceAssetUrl?: string
        lockToObject?: boolean
        friction?: number
        restitution?: number
        sensor?: boolean
        triangleBudget?: number
        triangleCount?: number
        vertexCount?: number
      })
    | null
}

export interface CollisionPolicyResult {
  collision: CollisionComponent | null
  source: 'authored' | 'default' | 'none'
  warning?: string
}

export function getDefaultCollisionShape(
  input: CollisionPolicyInput,
): CollisionShape {
  if (input.primitiveGeometry === 'cylinder') {
    return 'cylinder'
  }
  if (
    input.actorKind === 'asset' ||
    input.actorKind === 'prefab' ||
    input.actorKind === 'primitive'
  ) {
    return 'cuboid'
  }
  return 'cuboid'
}

function getAuthoredShape(input: CollisionPolicyInput): CollisionShape {
  const defaultShape = getDefaultCollisionShape(input)
  const authoredShape = input.authoredCollision?.shape
  const quality = input.authoredCollision?.quality

  if (!authoredShape) {
    if (
      quality === 'convexHull' ||
      quality === 'trimesh' ||
      quality === 'simplifiedMesh'
    ) {
      return 'trimesh'
    }
    if (
      quality !== 'primitive' &&
      (input.actorKind === 'asset' || input.actorKind === 'prefab')
    ) {
      return 'trimesh'
    }
    return input.authoredCollision?.colliderUrl ? 'trimesh' : defaultShape
  }

  return authoredShape
}

function normalizeColliderUrl(value: string | undefined) {
  const normalized = String(value ?? '').trim()
  return normalized.length > 0 ? normalized : undefined
}

export function isTerrainVisualActor(
  actorId: string,
  levelSettings?: SceneSettings | null,
  levelId?: string | null,
) {
  return (
    getActorCollisionRole({
      actorId,
      levelId,
      settings: levelSettings,
    }) === 'visualOnly'
  )
}

export function getDefaultCollisionIntent(input: CollisionPolicyInput) {
  const authoredPolicy = input.authoredCollision
    ? normalizeCollisionPolicy(input.authoredCollision)
    : null
  const authoredShape = input.authoredCollision
    ? getAuthoredShape(input)
    : undefined
  const role = getActorCollisionRole({
    actorId: input.actorId,
    levelId: input.levelId,
    settings: input.levelSettings,
    sensor: authoredPolicy?.sensor,
    shape: authoredShape,
  })

  return getCollisionIntentForRole(role)
}

export function resolveCollisionPolicy(
  input: CollisionPolicyInput,
): CollisionPolicyResult {
  const authoredPolicy = input.authoredCollision
    ? normalizeCollisionPolicy(input.authoredCollision)
    : null
  const authoredShape = input.authoredCollision
    ? getAuthoredShape(input)
    : undefined
  const role = getActorCollisionRole({
    actorId: input.actorId,
    levelId: input.levelId,
    settings: input.levelSettings,
    sensor: authoredPolicy?.sensor,
    shape: authoredShape,
  })
  if (role === 'visualOnly') {
    return { collision: null, source: 'none' }
  }

  if (
    authoredPolicy?.mode === 'none' ||
    input.authoredCollision?.enabled === false
  ) {
    return { collision: null, source: 'none' }
  }

  if (input.authoredCollision && authoredPolicy) {
    const shape = authoredShape ?? getAuthoredShape(input)
    const intent =
      authoredPolicy.mode === 'trigger'
        ? 'trigger'
        : input.authoredCollision.intent ??
          (authoredPolicy.sensor ? 'trigger' : getCollisionIntentForRole(role))
    if (intent === 'none') {
      return { collision: null, source: 'none' }
    }

    return {
      source: 'authored',
      collision: {
        intent,
        channel: resolveCollisionChannel({
          intent,
          bodyType: input.bodyType,
          authoredChannel: input.authoredCollision.channel,
        }),
        shape,
        quality: input.authoredCollision.quality,
        lodSourceTier:
          input.authoredCollision.lodSourceTier ??
          input.authoredCollision.lodTier,
        generationStatus: input.authoredCollision.generationStatus,
        generationLastError: input.authoredCollision.generationLastError,
        size: input.authoredCollision.size,
        colliderUrl: normalizeColliderUrl(input.authoredCollision.colliderUrl),
        colliderMetadataUrl: normalizeColliderUrl(
          input.authoredCollision.colliderMetadataUrl,
        ),
        colliderCacheKey: input.authoredCollision.colliderCacheKey,
        assetLocalTransform: input.authoredCollision.assetLocalTransform,
        sourceAssetUrl: input.authoredCollision.sourceAssetUrl,
        colliderSourceAssetUrl: input.authoredCollision.colliderSourceAssetUrl,
        lockToObject: input.authoredCollision.lockToObject,
        friction: input.authoredCollision.friction,
        restitution: input.authoredCollision.restitution,
        sensor: intent === 'trigger' ? true : authoredPolicy.sensor,
        triangleBudget:
          input.authoredCollision.triangleBudget ??
          input.authoredCollision.maxTriangles,
        triangleCount: input.authoredCollision.triangleCount,
        vertexCount: input.authoredCollision.vertexCount,
      },
    }
  }

  const solidByDefault =
    (input.actorKind === 'asset' ||
      input.actorKind === 'primitive' ||
      input.actorKind === 'prefab') &&
    input.visible !== false &&
    !input.hasGameplay

  if (!solidByDefault) {
    return { collision: null, source: 'none' }
  }

  return {
    source: 'none',
    collision: null,
    warning: solidByDefault
      ? 'Visible geometry has no authored collision intent; runtime physics is disabled for this actor.'
      : undefined,
  }
}
