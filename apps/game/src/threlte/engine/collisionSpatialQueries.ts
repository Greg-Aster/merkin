import { getActorCollisionWorldSize } from './colliderGeometry'
import type { ActorDefinition, Vec3 } from './types'

const WALKABLE_SUPPORT_XZ_PADDING = 0.15
const WALKABLE_SUPPORT_MAX_DROP = 2
const WALKABLE_SUPPORT_MAX_PENETRATION = 0.25

export function getActorColliderWorldSize(actor: ActorDefinition): Vec3 {
  return getActorCollisionWorldSize({
    collisionSize: actor.physics?.collision.size,
    assetLocalBoundsSize:
      actor.physics?.collision.assetLocalTransform?.colliderLocalBounds?.size,
    primitive: actor.render?.primitive,
    scale: actor.transform.scale,
  })
}

export function actorColliderAabbContainsPoint(
  actor: ActorDefinition,
  point: Vec3,
) {
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

export function actorSupportsWalkabilitySample(
  actor: ActorDefinition,
  samplePosition: Vec3,
) {
  const collision = actor.physics?.collision
  if (!collision || collision.sensor || collision.intent !== 'walkable') {
    return false
  }

  const [x, y, z] = samplePosition
  const [width, height, depth] = getActorColliderWorldSize(actor)
  const [actorX, actorY, actorZ] = actor.transform.position
  const halfWidth = width / 2 + WALKABLE_SUPPORT_XZ_PADDING
  const halfDepth = depth / 2 + WALKABLE_SUPPORT_XZ_PADDING
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
    y >= topY - WALKABLE_SUPPORT_MAX_PENETRATION &&
    y <= topY + WALKABLE_SUPPORT_MAX_DROP
  )
}
