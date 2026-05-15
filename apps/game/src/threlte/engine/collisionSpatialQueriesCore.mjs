import { getActorCollisionWorldSize } from './colliderGeometryCore.mjs'

const WALKABLE_SUPPORT_XZ_PADDING = 0.15
const WALKABLE_SUPPORT_MAX_DROP = 2
const WALKABLE_SUPPORT_MAX_PENETRATION = 0.25

function getFiniteNonNegative(value, fallback) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback
}

function resolveWalkableSupportOptions(options) {
  return {
    xzPadding: getFiniteNonNegative(
      options?.xzPadding,
      WALKABLE_SUPPORT_XZ_PADDING,
    ),
    maxDrop: getFiniteNonNegative(options?.maxDrop, WALKABLE_SUPPORT_MAX_DROP),
    maxPenetration: getFiniteNonNegative(
      options?.maxPenetration,
      WALKABLE_SUPPORT_MAX_PENETRATION,
    ),
  }
}

/**
 * @typedef {[number, number, number]} Vec3
 * @typedef {{ size?: unknown } | null} ColliderLocalBoundsLike
 * @typedef {{ colliderLocalBounds?: ColliderLocalBoundsLike } | null} AssetLocalTransformLike
 * @typedef {{
 *   intent?: string,
 *   sensor?: boolean,
 *   shape?: string,
 *   size?: unknown,
 *   assetLocalTransform?: AssetLocalTransformLike,
 * }} CollisionLike
 * @typedef {{ collision?: CollisionLike }} PhysicsLike
 * @typedef {{ geometry?: string, args?: readonly number[] }} PrimitiveLike
 * @typedef {{ primitive?: PrimitiveLike | null }} RenderLike
 * @typedef {{
 *   physics?: PhysicsLike,
 *   render?: RenderLike,
 *   transform: { position: Vec3, scale: Vec3 },
 * }} ActorSpatialQueryInput
 * @typedef {{
 *   xzPadding?: number,
 *   maxDrop?: number,
 *   maxPenetration?: number,
 * }} WalkableSupportOptions
 * @typedef {{
 *   physics?: PhysicsLike,
 *   render?: RenderLike,
 *   transform: { scale: Vec3 },
 * }} ActorColliderSizeInput
 */

/** @param {ActorColliderSizeInput} actor */
export function getActorColliderWorldSize(actor) {
  return getActorCollisionWorldSize({
    collisionSize: actor.physics?.collision.size,
    assetLocalBoundsSize:
      actor.physics?.collision.assetLocalTransform?.colliderLocalBounds?.size,
    primitive: actor.render?.primitive,
    scale: actor.transform.scale,
  })
}

/**
 * @param {ActorSpatialQueryInput} actor
 * @param {Vec3} point
 */
export function actorColliderAabbContainsPoint(actor, point) {
  const [width, height, depth] = getActorColliderWorldSize(actor)
  const [x, y, z] = actor.transform.position
  return (
    point[0] >= x - width / 2 &&
    point[0] <= x + width / 2 &&
    point[1] >= y - height / 2 &&
    point[1] <= y + height / 2 &&
    point[2] >= z - depth / 2 &&
    point[2] <= z + depth / 2
  )
}

/**
 * @param {ActorSpatialQueryInput} actor
 * @param {Vec3} samplePosition
 * @param {WalkableSupportOptions} [options]
 */
export function actorSupportsWalkabilitySample(
  actor,
  samplePosition,
  options = {},
) {
  const collision = actor.physics?.collision
  if (!collision || collision.sensor || collision.intent !== 'walkable') {
    return false
  }

  const supportOptions = resolveWalkableSupportOptions(options)
  const [x, y, z] = samplePosition
  const [width, height, depth] = getActorColliderWorldSize(actor)
  const [actorX, actorY, actorZ] = actor.transform.position
  const halfWidth = width / 2 + supportOptions.xzPadding
  const halfDepth = depth / 2 + supportOptions.xzPadding
  const topY = actorY + height / 2

  if (collision.shape === 'cylinder') {
    const normalizedX = (x - actorX) / halfWidth
    const normalizedZ = (z - actorZ) / halfDepth
    if (normalizedX * normalizedX + normalizedZ * normalizedZ > 1) {
      return false
    }
  } else if (
    Math.abs(x - actorX) > halfWidth ||
    Math.abs(z - actorZ) > halfDepth
  ) {
    return false
  }

  return (
    y >= topY - supportOptions.maxPenetration &&
    y <= topY + supportOptions.maxDrop
  )
}
