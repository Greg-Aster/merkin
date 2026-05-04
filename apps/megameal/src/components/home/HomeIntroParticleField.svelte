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
  context.strokeStyle = 'rgb(255 255 255 / 0.82)'
  context.lineWidth = 1.4
  context.beginPath()
  context.moveTo(-31, 0)
  context.lineTo(31, 0)
  context.moveTo(0, -31)
  context.lineTo(0, 31)
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
import { onDestroy } from 'svelte'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
} from 'three'
import type { Points } from 'three'

type IntroInputState = {
  x: number
  dragX: number
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

export let input: IntroInputState
export let particles: ParticleConfig[] = []
export let wheel = 0
export let scrollStep = 1
export let scrollSpan = 10
export let atmosphereReveal = 1

let points: Points | null = null

const starTexture = getStarTexture()
const geometry = new BufferGeometry()
let positions = new Float32Array(0)
let colors = new Float32Array(0)
let sizes = new Float32Array(0)
let alphas = new Float32Array(0)
let particleCapacity = 0
const color = new Color()
const material = new ShaderMaterial({
  uniforms: {
    pointTexture: { value: starTexture },
    pixelRatio: { value: 1 },
  },
  vertexShader: `
    uniform float pixelRatio;
    attribute float pointSize;
    attribute float pointAlpha;
    attribute vec3 pointColor;
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      vAlpha = pointAlpha;
      vColor = pointColor;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = pointSize * pixelRatio * (300.0 / max(1.0, -mvPosition.z));
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D pointTexture;
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      vec4 sprite = texture2D(pointTexture, gl_PointCoord);
      gl_FragColor = vec4(vColor, sprite.a * vAlpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: AdditiveBlending,
})

function wrapCentered(value: number, span: number) {
  const halfSpan = span / 2
  return ((((value + halfSpan) % span) + span) % span) - halfSpan
}

function syncGeometryAttributes() {
  if (particleCapacity === particles.length) {
    geometry.setDrawRange(0, particles.length)
    return
  }

  particleCapacity = particles.length
  positions = new Float32Array(particleCapacity * 3)
  colors = new Float32Array(particleCapacity * 3)
  sizes = new Float32Array(particleCapacity)
  alphas = new Float32Array(particleCapacity)
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('pointColor', new BufferAttribute(colors, 3))
  geometry.setAttribute('pointSize', new BufferAttribute(sizes, 1))
  geometry.setAttribute('pointAlpha', new BufferAttribute(alphas, 1))
  geometry.setDrawRange(0, particles.length)
}

$: syncGeometryAttributes()

useTask(() => {
  const time = performance.now() * 0.001
  const pointerX = Number.isFinite(input.x) ? input.x : 0
  const verticalScroll = wheel * scrollStep

  material.uniforms.pixelRatio.value =
    typeof window === 'undefined' ? 1 : Math.min(1.6, window.devicePixelRatio || 1)

  particles.forEach((particle, index) => {
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
    const flare =
      particle.shape > 0.78 ? 1.55 : particle.shape > 0.54 ? 1.18 : 0.92
    const hue =
      particle.hueOffset +
      time * 0.012 +
      Math.sin(time * 0.08 + index) * 0.025
    const alpha =
      atmosphereReveal *
      Math.min(1.0, 0.42 + centerWeight * 0.58 + pulse * 0.12) *
      strayOpacity

    positions[index * 3] =
      particle.anchorX +
      Math.cos(groupedSpin) * reactiveRadius +
      pointerX * 0.08
    positions[index * 3 + 1] =
      wrapCentered(
        particle.anchorY + particle.height + verticalScroll,
        scrollSpan,
      ) +
      Math.sin(time * 1.1 + particle.phase) *
        (0.05 + particle.clusterStrength * 0.11)
    positions[index * 3 + 2] =
      particle.anchorZ +
      particle.zOffset +
      Math.sin(groupedSpin) * reactiveRadius * 0.72

    color.setHSL(hue, 0.9, 0.72 + centerWeight * 0.24)
    colors[index * 3] = color.r
    colors[index * 3 + 1] = color.g
    colors[index * 3 + 2] = color.b
    sizes[index] = particle.size * flare * (34 + pulse * 16)
    alphas[index] = alpha
  })

  const positionAttribute = geometry.getAttribute('position')
  const colorAttribute = geometry.getAttribute('pointColor')
  const sizeAttribute = geometry.getAttribute('pointSize')
  const alphaAttribute = geometry.getAttribute('pointAlpha')
  positionAttribute.needsUpdate = true
  colorAttribute.needsUpdate = true
  sizeAttribute.needsUpdate = true
  alphaAttribute.needsUpdate = true
})

onDestroy(() => {
  geometry.dispose()
  material.dispose()
})
</script>

<T.Points bind:ref={points} args={[geometry, material]} />
