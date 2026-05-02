<script lang="ts" context="module">
import { CanvasTexture, SRGBColorSpace } from 'three'
import type { Texture } from 'three'

let sharedGlowTexture: Texture | null = null

function getGlowTexture() {
  if (sharedGlowTexture) return sharedGlowTexture
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) return null

  const center = canvas.width / 2
  const gradient = context.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    center,
  )
  gradient.addColorStop(0, 'rgb(255 255 255 / 0.95)')
  gradient.addColorStop(0.16, 'rgb(225 252 255 / 0.7)')
  gradient.addColorStop(0.42, 'rgb(125 211 252 / 0.24)')
  gradient.addColorStop(1, 'rgb(59 130 246 / 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  sharedGlowTexture = new CanvasTexture(canvas)
  sharedGlowTexture.colorSpace = SRGBColorSpace
  sharedGlowTexture.needsUpdate = true

  return sharedGlowTexture
}
</script>

<script lang="ts">
import { T, useTask } from '@threlte/core'
import { AdditiveBlending } from 'three'
import type { Group, SpotLight } from 'three'

export let radius = 1
export let count = 36
export let color = '#67e8f9'
export let opacity = 0.18
export let size = 0.16
export let rotation: [number, number, number] = [0, 0, 0]
export let spinAxis: 'x' | 'y' | 'z' = 'z'
export let spinSpeed = 0
export let atmosphereReveal = 1
export let emitter = false
export let emitterAngle = 0
export let emitterSize = 0.72
export let emitterOpacity = 0.86
export let emitterIntensity = 16
export let emitterDistance = 4.8
export let emitterDecay = 1.35
export let emitterSpotAngle = 0.34
export let emitterSpotPenumbra = 0.72
export let emitterPointFill = 0.18

let group: Group | null = null
let emitterLight: SpotLight | null = null
let emitterTarget: Group | null = null

const additiveBlending = AdditiveBlending
const glowTexture = getGlowTexture()

$: sparks = Array.from({ length: count }, (_, index) => {
  const progress = index / Math.max(count, 1)
  const angle = progress * Math.PI * 2
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    phase: angle + index * 0.37,
    size: size * (0.72 + ((index * 17) % 9) / 20),
  }
})
$: emitterPosition = [
  Math.cos(emitterAngle) * radius,
  Math.sin(emitterAngle) * radius,
  0,
] as [number, number, number]

useTask(() => {
  if (!group) return

  const time = performance.now() * 0.001
  group.rotation.set(rotation[0], rotation[1], rotation[2])
  group.rotation[spinAxis] += time * spinSpeed

  if (emitterLight && emitterTarget && emitterLight.target !== emitterTarget) {
    emitterLight.target = emitterTarget
  }
})
</script>

<T.Group bind:ref={group}>
  <T.Group bind:ref={emitterTarget} />
  {#each sparks as spark}
    <T.Sprite position={[spark.x, spark.y, 0]} scale={[spark.size, spark.size, spark.size]}>
      <T.SpriteMaterial
        map={glowTexture}
        color={color}
        transparent={true}
        opacity={atmosphereReveal * opacity * (0.74 + Math.sin(spark.phase) * 0.08)}
        blending={additiveBlending}
        depthWrite={false}
      />
    </T.Sprite>
  {/each}
  {#if emitter}
    <T.Group position={emitterPosition}>
      <T.SpotLight
        bind:ref={emitterLight}
        intensity={emitterIntensity * atmosphereReveal}
        distance={emitterDistance}
        decay={emitterDecay}
        angle={emitterSpotAngle}
        penumbra={emitterSpotPenumbra}
        color={color}
      />
      <T.PointLight
        intensity={emitterIntensity * emitterPointFill * atmosphereReveal}
        distance={Math.min(emitterDistance, radius * 2.2)}
        decay={emitterDecay}
        color={color}
      />
      <T.Sprite scale={[emitterSize, emitterSize, emitterSize]}>
        <T.SpriteMaterial
          map={glowTexture}
          color={color}
          transparent={true}
          opacity={atmosphereReveal * emitterOpacity}
          blending={additiveBlending}
          depthWrite={false}
          depthTest={false}
        />
      </T.Sprite>
    </T.Group>
  {/if}
</T.Group>
