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

$: rawColliderArgs = createPrimitiveTrimeshArgs(geometry, args)
</script>

<Collider
  shape="trimesh"
  args={rawColliderArgs}
  {collisionGroups}
  {friction}
  {restitution}
  {sensor}
/>
