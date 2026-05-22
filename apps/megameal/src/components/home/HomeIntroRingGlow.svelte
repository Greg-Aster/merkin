<script lang="ts" context="module">
import { CanvasTexture } from 'three'
import type { Texture } from 'three'
import { configureGeneratedCanvasTexture } from '@/utils/threeTextureUtils'

let sharedGlowTexture: Texture | null = null
let sharedRingGlowTexture: Texture | null = null

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

  sharedGlowTexture = configureGeneratedCanvasTexture(new CanvasTexture(canvas))

  return sharedGlowTexture
}

function getRingGlowTexture() {
  if (sharedRingGlowTexture) return sharedRingGlowTexture
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
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
  gradient.addColorStop(0, 'rgb(255 255 255 / 0)')
  gradient.addColorStop(0.52, 'rgb(255 255 255 / 0)')
  gradient.addColorStop(0.61, 'rgb(255 255 255 / 0.05)')
  gradient.addColorStop(0.68, 'rgb(255 255 255 / 0.34)')
  gradient.addColorStop(0.72, 'rgb(255 255 255 / 0.9)')
  gradient.addColorStop(0.76, 'rgb(255 255 255 / 0.28)')
  gradient.addColorStop(0.86, 'rgb(255 255 255 / 0.055)')
  gradient.addColorStop(1, 'rgb(255 255 255 / 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  sharedRingGlowTexture = configureGeneratedCanvasTexture(
    new CanvasTexture(canvas),
  )

  return sharedRingGlowTexture
}
</script>

<script lang="ts">
import { T, useTask } from '@threlte/core'
import { AdditiveBlending, DoubleSide, Vector3 } from 'three'
import type { Group } from 'three'

export let radius = 1
export let count = 36
export let color = '#67e8f9'
export let hueCycleBase: number | null = null
export let hueCycleSpeed = 0.01
export let opacity = 0.18
export let size = 0.16
export let rotation: [number, number, number] = [0, 0, 0]
export let spinAxis: 'x' | 'y' | 'z' = 'z'
export let spinSpeed = 0
export let atmosphereReveal = 1
export let haloOpacity = 0.26
export let emitter = false
export let emitterAngle = 0
export let emitterSize = 0.72
export let emitterOpacity = 0.86
export let emitterFrontFacing = false
export let emitterFrontOffset = 1.35

let group: Group | null = null
let emitterGroup: Group | null = null
let animatedColor = color

const additiveBlending = AdditiveBlending
const doubleSide = DoubleSide
const glowTexture = getGlowTexture()
const ringGlowTexture = getRingGlowTexture()
const emitterLocalPosition = new Vector3()
const emitterWorldPosition = new Vector3()
const groupWorldPosition = new Vector3()

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
  if (hueCycleBase !== null) {
    const hue = (((hueCycleBase + time * hueCycleSpeed) % 1) + 1) % 1
    animatedColor = `hsl(${Math.round(hue * 360)} 86% 48%)`
  } else {
    animatedColor = color
  }

  group.rotation.set(rotation[0], rotation[1], rotation[2])
  group.rotation[spinAxis] += time * spinSpeed

  if (emitterGroup) {
    emitterLocalPosition.set(
      emitterPosition[0],
      emitterPosition[1],
      emitterPosition[2],
    )

    if (emitterFrontFacing) {
      emitterWorldPosition.copy(emitterLocalPosition)
      group.localToWorld(emitterWorldPosition)
      group.getWorldPosition(groupWorldPosition)
      emitterWorldPosition.z =
        groupWorldPosition.z + emitterFrontOffset
      group.worldToLocal(emitterWorldPosition)
      emitterGroup.position.copy(emitterWorldPosition)
    } else {
      emitterGroup.position.copy(emitterLocalPosition)
    }
  }

})
</script>

<T.Group bind:ref={group}>
  <T.Mesh>
    <T.PlaneGeometry args={[radius * 2.8, radius * 2.8]} />
    <T.MeshBasicMaterial
      map={ringGlowTexture}
      color={animatedColor}
      transparent={true}
      opacity={atmosphereReveal * haloOpacity}
      side={doubleSide}
      blending={additiveBlending}
      depthWrite={false}
      depthTest={true}
    />
  </T.Mesh>
  {#each sparks as spark}
    <T.Sprite position={[spark.x, spark.y, 0]} scale={[spark.size, spark.size, spark.size]}>
      <T.SpriteMaterial
        map={glowTexture}
        color={animatedColor}
        transparent={true}
        opacity={atmosphereReveal * opacity * (0.74 + Math.sin(spark.phase) * 0.08)}
        blending={additiveBlending}
        depthWrite={false}
      />
    </T.Sprite>
  {/each}
  {#if emitter}
    <T.Group bind:ref={emitterGroup}>
      <T.Sprite scale={[emitterSize, emitterSize, emitterSize]}>
        <T.SpriteMaterial
          map={glowTexture}
          color={animatedColor}
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
