<script lang="ts">
import { T } from '@threlte/core'
import { onDestroy } from 'svelte'
import * as THREE from 'three'
import { createPrimitiveGeometry } from '../engine/primitiveGeometry'
import type { PrimitiveGeometryKind } from '../engine/types'

export let geometry: PrimitiveGeometryKind = 'box'
export let args: number[] = [1, 1, 1]
export let color = '#4df0ff'

let meshGeometry: THREE.BufferGeometry | null = null
let material: THREE.MeshBasicMaterial | null = null
let signature = ''

function rebuildGeometry() {
  const nextSignature = JSON.stringify({ geometry, args })
  if (nextSignature === signature && meshGeometry && material) return

  meshGeometry?.dispose()
  material?.dispose()
  signature = nextSignature
  meshGeometry = createPrimitiveGeometry(geometry, args)
  material = new THREE.MeshBasicMaterial({
    color,
    depthTest: false,
    depthWrite: false,
    opacity: 0.42,
    transparent: true,
    wireframe: true,
  })
}

$: rebuildGeometry()

onDestroy(() => {
  meshGeometry?.dispose()
  material?.dispose()
})
</script>

{#if meshGeometry && material}
  <T.Mesh geometry={meshGeometry} {material} renderOrder={18} frustumCulled={false} />
{/if}
