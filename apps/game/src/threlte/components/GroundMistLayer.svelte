<script lang="ts">
import { T, useTask } from '@threlte/core'
import { onDestroy } from 'svelte'
import * as THREE from 'three'
import { DEFAULT_RUNTIME_ATMOSPHERE } from '../atmosphere/buildRuntimeAtmosphere'
import type { RuntimeAtmosphereDefinition } from '../atmosphere/runtimeAtmosphereTypes'
import { OptimizationLevel } from '../features/performance/OptimizationManager'
import { qualityLevelStore } from '../features/performance/stores/performanceStore'
import { setRuntimeDiagnostic } from '../stores/runtimeDiagnosticsStore'

export let atmosphere: RuntimeAtmosphereDefinition = DEFAULT_RUNTIME_ATMOSPHERE
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
let mistDiagnosticSignature = ''

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
  const requestedLayers = atmosphere.mist.enabled
    ? atmosphere.mist.layers
    : layers
  switch ($qualityLevelStore) {
    case OptimizationLevel.ULTRA_LOW:
      return Math.max(0, Math.min(1, requestedLayers - 2))
    case OptimizationLevel.LOW:
      return Math.max(1, Math.min(2, requestedLayers - 1))
    case OptimizationLevel.MEDIUM:
      return Math.max(1, Math.min(3, requestedLayers))
    default:
      return Math.max(1, requestedLayers)
  }
})()
$: resolvedEnabled = enabled && atmosphere.enabled && atmosphere.mist.enabled
$: resolvedColor = atmosphere.mist.color ?? color
$: resolvedOpacity = atmosphere.mist.opacity ?? opacity
$: resolvedBaseHeight = atmosphere.heightFog.floor + atmosphere.mist.height
$: resolvedHeightStep = atmosphere.mist.spacing ?? heightStep
$: resolvedScale = atmosphere.mist.scale ?? scale
$: resolvedDriftSpeed = atmosphere.mist.driftSpeed ?? driftSpeed

$: if (resolvedEnabled && !mistTexture && typeof document !== 'undefined') {
  mistTexture = createMistTexture()
}

$: mistDiagnosticKey = [
  resolvedEnabled,
  resolvedColor,
  resolvedOpacity,
  effectiveLayers,
  resolvedBaseHeight,
  resolvedHeightStep,
  resolvedScale,
  resolvedDriftSpeed,
].join('|')

$: if (mistDiagnosticKey !== mistDiagnosticSignature) {
  mistDiagnosticSignature = mistDiagnosticKey
  setRuntimeDiagnostic('mistAtmosphere', {
    label: 'Mist Atmosphere',
    level: resolvedEnabled && effectiveLayers > 0 ? 'ready' : 'idle',
    message:
      resolvedEnabled && effectiveLayers > 0
        ? `Ground mist consumes runtime atmosphere: ${effectiveLayers} layer(s), opacity ${resolvedOpacity.toFixed(3)}.`
        : 'Ground mist disabled by runtime atmosphere.',
    meta: {
      atmosphereId: atmosphere.id,
      layers: effectiveLayers,
      color: resolvedColor,
      opacity: resolvedOpacity,
      baseHeight: resolvedBaseHeight,
      heightStep: resolvedHeightStep,
      scale: resolvedScale,
      driftSpeed: resolvedDriftSpeed,
    },
  })
}

useTask(delta => {
  if (!resolvedEnabled || !mistPlanes.length) return

  animationTime += delta
  mistPlanes.forEach((plane, index) => {
    if (!plane) return
    const drift = animationTime * resolvedDriftSpeed * (1 + index * 0.15)
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

{#if resolvedEnabled && mistTexture && effectiveLayers > 0}
  <T.Group>
    {#each Array.from({ length: effectiveLayers }) as _, index}
      <T.Mesh
        bind:ref={mistPlanes[index * 2]}
        position={[0, resolvedBaseHeight + index * resolvedHeightStep, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={18 + index}
      >
        <T.PlaneGeometry args={[resolvedScale, resolvedScale, 1, 1]} />
        <T.MeshBasicMaterial
          map={mistTexture}
          color={resolvedColor}
          transparent={true}
          opacity={resolvedOpacity * (1 - index * 0.14)}
          depthWrite={false}
          side={THREE.DoubleSide}
          fog={true}
          blending={THREE.NormalBlending}
        />
      </T.Mesh>
      <T.Mesh
        bind:ref={mistPlanes[(index * 2) + 1]}
        position={[0, resolvedBaseHeight + index * resolvedHeightStep + 0.08, 0]}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        renderOrder={18 + index}
      >
        <T.PlaneGeometry args={[resolvedScale * 0.92, resolvedScale * 0.92, 1, 1]} />
        <T.MeshBasicMaterial
          map={mistTexture}
          color={resolvedColor}
          transparent={true}
          opacity={resolvedOpacity * 0.7 * (1 - index * 0.14)}
          depthWrite={false}
          side={THREE.DoubleSide}
          fog={true}
          blending={THREE.NormalBlending}
        />
      </T.Mesh>
    {/each}
  </T.Group>
{/if}
