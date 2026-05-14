<script lang="ts">
import { Collider } from '@threlte/rapier'
import { createPrimitiveTrimeshArgs } from '../engine/primitiveGeometry'
import type { PrimitiveGeometryKind } from '../engine/types'

export let geometry: PrimitiveGeometryKind = 'box'
export let args: number[] = [1, 1, 1]
export let friction = 0.7
export let restitution = 0
export let sensor = false
export let collisionGroups: number | undefined = undefined
export let scale: [number, number, number] = [1, 1, 1]

$: rawColliderArgs = createPrimitiveTrimeshArgs(geometry, args)
$: scaledVertices = new Float32Array(rawColliderArgs[0].length)
$: {
  for (let i = 0; i < rawColliderArgs[0].length; i += 3) {
    scaledVertices[i] = rawColliderArgs[0][i] * scale[0]
    scaledVertices[i + 1] = rawColliderArgs[0][i + 1] * scale[1]
    scaledVertices[i + 2] = rawColliderArgs[0][i + 2] * scale[2]
  }
}
$: colliderArgs = [scaledVertices, rawColliderArgs[1]]
</script>

<Collider
  shape="trimesh"
  args={colliderArgs}
  {collisionGroups}
  {friction}
  {restitution}
  {sensor}
/>
