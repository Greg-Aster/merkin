import * as THREE from 'three'
import type { ActorDefinition } from './types'

export function createActorWorldMatrixResolver(actors: ActorDefinition[]) {
  const actorById = new Map(actors.map(actor => [actor.id, actor]))
  const matrixCache = new Map<string, THREE.Matrix4>()

  function resolveActorMatrix(actorId: string): THREE.Matrix4 {
    const cached = matrixCache.get(actorId)
    if (cached) return cached.clone()

    const actor = actorById.get(actorId)
    if (!actor) return new THREE.Matrix4()

    const position = new THREE.Vector3(...actor.transform.position)
    const rotation = new THREE.Euler(...actor.transform.rotation)
    const quaternion = new THREE.Quaternion().setFromEuler(rotation)
    const scale = new THREE.Vector3(...actor.transform.scale)
    const localMatrix = new THREE.Matrix4().compose(position, quaternion, scale)

    const parentMatrix = actor.parentId
      ? resolveActorMatrix(actor.parentId)
      : new THREE.Matrix4()
    const worldMatrix = parentMatrix.multiply(localMatrix)
    matrixCache.set(actorId, worldMatrix.clone())
    return worldMatrix
  }

  return resolveActorMatrix
}
