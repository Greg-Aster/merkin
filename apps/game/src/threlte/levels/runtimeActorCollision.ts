import {
  getActorCollisionWorldSize,
  getColliderLocalArgs,
} from '../engine/colliderGeometry'
import type { ActorDefinition } from '../engine/types'

export function getRuntimeActorColliderArgs(actor: ActorDefinition) {
  const collision = actor.physics?.collision
  if (!collision) return [0.5, 0.5, 0.5] as [number, number, number]

  const worldSize = getActorCollisionWorldSize({
    collisionSize: collision.size,
    assetLocalBoundsSize:
      collision.assetLocalTransform?.colliderLocalBounds?.size,
    primitive: actor.render?.primitive,
    scale: actor.transform.scale,
  })

  return getColliderLocalArgs({
    shape: collision.shape,
    worldSize,
    scale: actor.transform.scale,
  })
}
