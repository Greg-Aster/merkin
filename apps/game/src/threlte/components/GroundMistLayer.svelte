<script lang="ts">
import { T, useTask } from '@threlte/core'
import { onDestroy } from 'svelte'
import * as THREE from 'three'
import { OptimizationLevel } from '../features/performance/OptimizationManager'
import { qualityLevelStore } from '../features/performance/stores/performanceStore'

export let enabled = true
export let color = '#241557'
export let opacity = 0.14
export let layers = 3
export let scale = 360
export let baseHeight = 0.4
export let heightStep = 0.45
export let driftSpeed = 0.05

let mistTexture: THREE.Texture | null = null
let mistPlanes: Array<THREE.Mesh | null> = []
let animationTime = 0

function createMistTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256

  const context = canvas.getContext('2d')
  if (!context) return null

  const gradient = context.createRadialGradient(128, 128, 20, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)')
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.55)')
  gradient.addColorStop(0.72, 'rgba(255,255,255,0.12)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 256, 256)

  for (let index = 0; index < 84; index += 1) {
    const x = Math.random() * 256
    const y = Math.random() * 256
    const radius = 18 + Math.random() * 42
    const puff = context.createRadialGradient(x, y, 0, x, y, radius)
    puff.addColorStop(0, 'rgba(255,255,255,0.2)')
    puff.addColorStop(0.6, 'rgba(255,255,255,0.08)')
    puff.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = puff
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1.4, 1.4)
  texture.needsUpdate = true
  return texture
}

$: effectiveLayers = (() => {
  switch ($qualityLevelStore) {
    case OptimizationLevel.ULTRA_LOW:
      return Math.max(0, Math.min(1, layers - 2))
    case OptimizationLevel.LOW:
      return Math.max(1, Math.min(2, layers - 1))
    case OptimizationLevel.MEDIUM:
      return Math.max(1, Math.min(3, layers))
    default:
      return Math.max(1, layers)
  }
})()

$: if (enabled && !mistTexture && typeof document !== 'undefined') {
  mistTexture = createMistTexture()
}

useTask(delta => {
  if (!enabled || !mistPlanes.length) return

  animationTime += delta
  mistPlanes.forEach((plane, index) => {
    if (!plane) return
    const drift = animationTime * driftSpeed * (1 + index * 0.15)
    plane.position.x =
      Math.sin(drift + index * 1.2) * (3.5 + (index % 6) * 1.25)
    plane.position.z =
      Math.cos(drift * 0.7 + index * 1.5) * (4.5 + (index % 5) * 1.15)
    plane.rotation.z = Math.sin(drift * 0.25 + index) * 0.04
  })
})

onDestroy(() => {
  mistTexture?.dispose()
  mistTexture = null
  mistPlanes = []
})
</script>

{#if enabled && mistTexture && effectiveLayers > 0}
  <T.Group>
    {#each Array.from({ length: effectiveLayers }) as _, index}
      <T.Mesh
        bind:ref={mistPlanes[index * 2]}
        position={[0, baseHeight + index * heightStep, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={18 + index}
      >
        <T.PlaneGeometry args={[scale, scale, 1, 1]} />
        <T.MeshBasicMaterial
          map={mistTexture}
          color={color}
          transparent={true}
          opacity={opacity * (1 - index * 0.14)}
          depthWrite={false}
          side={THREE.DoubleSide}
          fog={true}
          blending={THREE.NormalBlending}
        />
      </T.Mesh>
      <T.Mesh
        bind:ref={mistPlanes[(index * 2) + 1]}
        position={[0, baseHeight + index * heightStep + 0.08, 0]}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        renderOrder={18 + index}
      >
        <T.PlaneGeometry args={[scale * 0.92, scale * 0.92, 1, 1]} />
        <T.MeshBasicMaterial
          map={mistTexture}
          color={color}
          transparent={true}
          opacity={opacity * 0.7 * (1 - index * 0.14)}
          depthWrite={false}
          side={THREE.DoubleSide}
          fog={true}
          blending={THREE.NormalBlending}
        />
      </T.Mesh>
    {/each}
  </T.Group>
{/if}
