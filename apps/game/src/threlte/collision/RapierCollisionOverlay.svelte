<script lang="ts">
import { T, useTask } from '@threlte/core'
import { useRapier } from '@threlte/rapier'
import { onDestroy } from 'svelte'
import { BufferAttribute, BufferGeometry, LineSegments } from 'three'

export let enabled = false

const { world, debug } = useRapier()
const geometry = new BufferGeometry()
const overlay = new LineSegments(geometry)
let disposed = false

overlay.name = 'rapier-runtime-collision-overlay'

function clearGeometry() {
  geometry.deleteAttribute('position')
  geometry.deleteAttribute('color')
  geometry.setDrawRange(0, 0)
}

$: if (!disposed) {
  debug.set(enabled)
}

const debugTask = useTask(() => {
  if (disposed || !enabled) {
    clearGeometry()
    return
  }

  const buffers = world.debugRender()
  const vertices = new Float32Array(buffers.vertices)
  const colors = new Float32Array(buffers.colors)
  geometry.setAttribute('position', new BufferAttribute(vertices, 3))
  geometry.setAttribute('color', new BufferAttribute(colors, 4))
  geometry.setDrawRange(0, buffers.vertices.length / 3)
})

onDestroy(() => {
  disposed = true
  debugTask.stop()
  debug.set(false)
  clearGeometry()
  geometry.dispose()
})
</script>

{#if enabled}
  <T
    is={overlay}
    frustumCulled={false}
    renderOrder={1000000}
  >
    <T is={geometry} />
    <T.LineBasicMaterial
      vertexColors
      depthTest={false}
      depthWrite={false}
      transparent
      opacity={0.92}
    />
  </T>
{/if}
