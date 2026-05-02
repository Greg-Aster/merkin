<script lang="ts" context="module">
import { CanvasTexture, SRGBColorSpace } from 'three'
import type { Texture } from 'three'

let sharedStarTexture: Texture | null = null

function getStarTexture() {
  if (sharedStarTexture) return sharedStarTexture
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96
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
  gradient.addColorStop(0, 'rgb(255 255 255 / 1)')
  gradient.addColorStop(0.12, 'rgb(235 252 255 / 0.96)')
  gradient.addColorStop(0.32, 'rgb(125 211 252 / 0.46)')
  gradient.addColorStop(0.68, 'rgb(99 102 241 / 0.16)')
  gradient.addColorStop(1, 'rgb(59 130 246 / 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.save()
  context.translate(center, center)
  context.globalCompositeOperation = 'screen'
  context.strokeStyle = 'rgb(255 255 255 / 0.88)'
  context.lineWidth = 1.6
  context.beginPath()
  context.moveTo(-31, 0)
  context.lineTo(31, 0)
  context.moveTo(0, -31)
  context.lineTo(0, 31)
  context.stroke()
  context.strokeStyle = 'rgb(165 243 252 / 0.44)'
  context.lineWidth = 1
  context.rotate(Math.PI / 4)
  context.beginPath()
  context.moveTo(-18, 0)
  context.lineTo(18, 0)
  context.moveTo(0, -18)
  context.lineTo(0, 18)
  context.stroke()
  context.restore()

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  sharedStarTexture = texture

  return sharedStarTexture
}
</script>

<script lang="ts">
import { T, useTask } from '@threlte/core'
import { AdditiveBlending } from 'three'
import type { Sprite, SpriteMaterial } from 'three'

type IntroInputState = {
  x: number
  y: number
  dragX: number
  dragY: number
  wheel: number
  active: boolean
}

type ParticleConfig = {
  anchorX: number
  anchorY: number
  anchorZ: number
  angle: number
  cluster: number
  clusterStrength: number
  height: number
  radius: number
  phase: number
  radialT: number
  speed: number
  size: number
  hueOffset: number
  shape: number
  strayT: number
  zOffset: number
}

export let index: number
export let input: IntroInputState
export let particle: ParticleConfig
export let wheel = 0
export let scrollStep = 1
export let scrollSpan = 10
export let atmosphereReveal = 1

let mesh: Sprite | null = null
let coreMaterial: SpriteMaterial | null = null
let haloMaterial: SpriteMaterial | null = null

const additiveBlending = AdditiveBlending
const starTexture = getStarTexture()

function wrapCentered(value: number, span: number) {
  const halfSpan = span / 2
  return ((((value + halfSpan) % span) + span) % span) - halfSpan
}

useTask(() => {
  const time = performance.now() * 0.001
  const pointerX = Number.isFinite(input.x) ? input.x : 0
  const verticalScroll = wheel * scrollStep
  const spin = particle.angle + time * particle.speed + input.dragX * 0.42
  const pulse = Math.sin(time * 1.25 + index) * 0.22 + 0.78
  const centerWeight = 1 - particle.radialT
  const strayOpacity = 1 - particle.strayT * 0.42
  const clusterPulse = Math.sin(time * 0.72 + particle.phase + particle.cluster)
  const clusterOrbit =
    Math.sin(time * 0.36 + particle.cluster * 1.7) *
    particle.clusterStrength *
    0.08
  const reactiveRadius =
    particle.radius * (1 + clusterPulse * particle.clusterStrength * 0.06) +
    clusterOrbit +
    (input.active ? 0.07 : 0.028) * Math.sin(time * 2.2 + index)
  const groupedSpin =
    spin +
    Math.sin(time * 0.42 + particle.phase) * particle.clusterStrength * 0.08

  if (mesh) {
    mesh.position.x =
      particle.anchorX +
      Math.cos(groupedSpin) * reactiveRadius +
      pointerX * 0.08
    mesh.position.y =
      wrapCentered(
        particle.anchorY + particle.height + verticalScroll,
        scrollSpan,
      ) +
      Math.sin(time * 1.1 + particle.phase) *
        (0.05 + particle.clusterStrength * 0.11)
    mesh.position.z =
      particle.anchorZ +
      particle.zOffset +
      Math.sin(groupedSpin) * reactiveRadius * 0.72
    const flare =
      particle.shape > 0.78 ? 1.55 : particle.shape > 0.54 ? 1.18 : 0.92
    mesh.scale.setScalar(particle.size * flare * (1.26 + pulse * 0.5))
  }

  if (coreMaterial) {
    const hue = particle.hueOffset + Math.sin(time * 0.08 + index) * 0.025
    coreMaterial.color.setHSL(hue, 0.88, 0.76 + centerWeight * 0.22)
    coreMaterial.opacity = atmosphereReveal * Math.min(
      1.0,
      0.42 + centerWeight * 0.58 + pulse * 0.12,
    ) * strayOpacity
  }

  if (haloMaterial) {
    const hue = particle.hueOffset + 0.04
    haloMaterial.color.setHSL(hue, 0.98, 0.62)
    haloMaterial.opacity =
      atmosphereReveal *
      (0.18 + centerWeight * 0.36 + pulse * 0.06) *
      strayOpacity
  }
})
</script>

<T.Sprite bind:ref={mesh}>
	<T.SpriteMaterial
		bind:ref={coreMaterial}
		map={starTexture}
		color="#e0f2fe"
		transparent={true}
		opacity={1.0 * atmosphereReveal}
		blending={additiveBlending}
		depthWrite={false}
	/>
	<T.Sprite scale={[2.9, 2.9, 2.9]}>
		<T.SpriteMaterial
			bind:ref={haloMaterial}
			map={starTexture}
			color="#38bdf8"
			transparent={true}
			opacity={0.32 * atmosphereReveal}
			blending={additiveBlending}
			depthWrite={false}
		/>
	</T.Sprite>
</T.Sprite>
