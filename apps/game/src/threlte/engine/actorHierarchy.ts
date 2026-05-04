import type { ActorDefinition } from './types'
import {
  createWorldMatrixResolver,
  type HierarchyNodeTransform,
} from './hierarchyTransforms'

export function createActorWorldMatrixResolver(actors: ActorDefinition[]) {
  return createWorldMatrixResolver(
    actors.map(
      (actor): HierarchyNodeTransform => ({
        id: actor.id,
        parentId: actor.parentId,
        position: actor.transform.position,
        rotation: actor.transform.rotation,
        scale: actor.transform.scale,
      }),
    ),
  )
}
