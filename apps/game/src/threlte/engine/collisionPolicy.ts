import { resolveCollisionChannel } from './collisionChannels'
import {
  getActorCollisionRole,
  getCollisionIntentForRole,
  getLevelCollisionWorkflow,
} from './levelCollisionWorkflow'
import type { SceneSettings } from './sceneDocumentTypes'
import type {
  CollisionChannel,
  CollisionComponent,
  CollisionIntent,
  CollisionShape,
  PhysicsBodyType,
  PrimitiveGeometryKind,
} from './types'

export interface CollisionPolicyInput {
  levelId?: string | null
  actorId: string
  actorKind: 'asset' | 'primitive' | 'prefab' | 'terrain' | 'light' | 'empty'
  levelSettings?: SceneSettings | null
  visible?: boolean
  hasGameplay?: boolean
  bodyType?: PhysicsBodyType
  primitiveGeometry?: PrimitiveGeometryKind
  authoredCollision?: {
    shape?: CollisionShape
    intent?: CollisionIntent
    channel?: CollisionChannel
    enabled?: boolean
    size?: [number, number, number]
    friction?: number
    restitution?: number
    sensor?: boolean
    triangleBudget?: number
  } | null
}

export interface CollisionPolicyResult {
  collision: CollisionComponent | null
  source: 'authored' | 'default' | 'none'
  warning?: string
}

export function getDefaultCollisionShape(
  input: CollisionPolicyInput,
): CollisionShape {
  if (input.actorKind === 'asset') return 'cuboid'
  if (
    input.actorKind === 'primitive' &&
    input.primitiveGeometry === 'cylinder'
  ) {
    return 'cylinder'
  }
  return 'cuboid'
}

function getAuthoredShape(input: CollisionPolicyInput): CollisionShape {
  const defaultShape = getDefaultCollisionShape(input)
  const authoredShape = input.authoredCollision?.shape

  if (!authoredShape) return defaultShape

  if (
    authoredShape === 'cuboid' &&
    defaultShape !== 'cuboid' &&
    !input.authoredCollision?.size
  ) {
    return defaultShape
  }

  return authoredShape
}

export function isTerrainVisualActor(
  actorId: string,
  levelSettings?: SceneSettings | null,
  levelId?: string | null,
) {
  return getActorCollisionRole({
    actorId,
    levelId,
    settings: levelSettings,
  }) === 'visualOnly'
}

export function getDefaultCollisionIntent(input: CollisionPolicyInput) {
  const authoredShape = input.authoredCollision
    ? getAuthoredShape(input)
    : undefined
  const role = getActorCollisionRole({
    actorId: input.actorId,
    levelId: input.levelId,
    settings: input.levelSettings,
    sensor: input.authoredCollision?.sensor,
    shape: authoredShape,
  })

  return getCollisionIntentForRole(role)
}

export function resolveCollisionPolicy(
  input: CollisionPolicyInput,
): CollisionPolicyResult {
  const authoredShape = input.authoredCollision
    ? getAuthoredShape(input)
    : undefined
  const role = getActorCollisionRole({
    actorId: input.actorId,
    levelId: input.levelId,
    settings: input.levelSettings,
    sensor: input.authoredCollision?.sensor,
    shape: authoredShape,
  })
  const workflow = getLevelCollisionWorkflow(input.levelId, input.levelSettings)

  if (role === 'visualOnly') {
    return { collision: null, source: 'none' }
  }

  if (input.authoredCollision?.enabled === false) {
    return { collision: null, source: 'none' }
  }

  if (input.authoredCollision) {
    const shape = authoredShape ?? getAuthoredShape(input)
    const intent =
      input.authoredCollision.intent ??
      (input.authoredCollision.sensor
        ? 'trigger'
        : getCollisionIntentForRole(role))
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
        size: input.authoredCollision.size,
        friction: input.authoredCollision.friction,
        restitution: input.authoredCollision.restitution,
        sensor: intent === 'trigger' ? true : input.authoredCollision.sensor,
        triangleBudget: input.authoredCollision.triangleBudget,
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

  if (workflow.defaultActorCollision === 'lightweight-auto') {
    const intent = getCollisionIntentForRole(role)
    if (intent === 'none') {
      return { collision: null, source: 'none' }
    }

    return {
      source: 'default',
      collision: {
        intent,
        channel: resolveCollisionChannel({
          intent,
          bodyType: input.bodyType,
        }),
        shape: getDefaultCollisionShape(input),
        friction: input.levelSettings?.level?.collision?.defaults?.defaultFriction,
        restitution:
          input.levelSettings?.level?.collision?.defaults?.defaultRestitution,
        sensor: intent === 'trigger',
      },
    }
  }

  return {
    source: 'none',
    collision: null,
    warning: solidByDefault
      ? 'Visible geometry has no authored collision intent; runtime physics is disabled for this actor.'
      : undefined,
  }
}
