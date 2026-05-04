<script lang="ts">
import { Collider } from '@threlte/rapier'
import { createPrimitiveTrimeshArgs } from '../engine/primitiveGeometry'
import type { PrimitiveGeometryKind } from '../engine/types'

export let geometry: PrimitiveGeometryKind = 'box'
export let args: number[] = [1, 1, 1]
export let friction = 0.7
export let restitution = 0
export let sensor = false

$: colliderArgs = createPrimitiveTrimeshArgs(geometry, args)
</script>

<Collider
  shape="trimesh"
  args={colliderArgs}
  {friction}
  {restitution}
  {sensor}
/>
