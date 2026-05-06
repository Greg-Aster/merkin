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
  gradient.addColorStop(0, 'rgb(255 255 255 / 0.86)')
  gradient.addColorStop(0.12, 'rgb(235 252 255 / 0.76)')
  gradient.addColorStop(0.32, 'rgb(125 211 252 / 0.34)')
  gradient.addColorStop(0.68, 'rgb(99 102 241 / 0.11)')
  gradient.addColorStop(1, 'rgb(59 130 246 / 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.save()
  context.translate(center, center)
  context.globalCompositeOperation = 'screen'
  context.strokeStyle = 'rgb(255 255 255 / 0.58)'
  context.lineWidth = 1.4
  context.beginPath()
  context.moveTo(-31, 0)
  context.lineTo(31, 0)
  context.moveTo(0, -31)
  context.lineTo(0, 31)
  context.stroke()
  context.strokeStyle = 'rgb(165 243 252 / 0.28)'
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
export let axialSpinSpeed = 0
export let axialSpinInputScale = 0
export let pointSizeScale = 1
export let opacityScale = 1

let points: Points | null = null

const starTexture = getStarTexture()
const coreGeometry = new BufferGeometry()
const haloGeometry = new BufferGeometry()
let positions = new Float32Array(0)
let coreColors = new Float32Array(0)
let haloColors = new Float32Array(0)
let coreSizes = new Float32Array(0)
let haloSizes = new Float32Array(0)
let coreAlphas = new Float32Array(0)
let haloAlphas = new Float32Array(0)
let particleCapacity = 0
const color = new Color()
const haloColor = new Color()
const particleCapacityStep = 128
const particleMotionScale = 0.62
const particlePointSizeScale = 4.8
const haloPointSizeScale = 3.05
const coreAlphaScale = 0.72
const haloAlphaScale = 0.62

function createParticleMaterial() {
  return new ShaderMaterial({
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
}

const coreMaterial = createParticleMaterial()
const haloMaterial = createParticleMaterial()

function wrapCentered(value: number, span: number) {
  const halfSpan = span / 2
  return ((((value + halfSpan) % span) + span) % span) - halfSpan
}

function syncGeometryAttributes() {
  if (particleCapacity >= particles.length) {
    coreGeometry.setDrawRange(0, particles.length)
    haloGeometry.setDrawRange(0, particles.length)
    return
  }

  particleCapacity =
    Math.ceil(particles.length / particleCapacityStep) * particleCapacityStep
  positions = new Float32Array(particleCapacity * 3)
  coreColors = new Float32Array(particleCapacity * 3)
  haloColors = new Float32Array(particleCapacity * 3)
  coreSizes = new Float32Array(particleCapacity)
  haloSizes = new Float32Array(particleCapacity)
  coreAlphas = new Float32Array(particleCapacity)
  haloAlphas = new Float32Array(particleCapacity)

  const positionAttribute = new BufferAttribute(positions, 3)
  coreGeometry.setAttribute('position', positionAttribute)
  haloGeometry.setAttribute('position', positionAttribute)
  coreGeometry.setAttribute('pointColor', new BufferAttribute(coreColors, 3))
  haloGeometry.setAttribute('pointColor', new BufferAttribute(haloColors, 3))
  coreGeometry.setAttribute('pointSize', new BufferAttribute(coreSizes, 1))
  haloGeometry.setAttribute('pointSize', new BufferAttribute(haloSizes, 1))
  coreGeometry.setAttribute('pointAlpha', new BufferAttribute(coreAlphas, 1))
  haloGeometry.setAttribute('pointAlpha', new BufferAttribute(haloAlphas, 1))
  coreGeometry.setDrawRange(0, particles.length)
  haloGeometry.setDrawRange(0, particles.length)
}

$: syncGeometryAttributes()

useTask(() => {
  const time = performance.now() * 0.001
  const motionTime = time * particleMotionScale
  const pointerX = Number.isFinite(input.x) ? input.x : 0
  const verticalScroll = wheel * scrollStep
  const axialRotation = time * axialSpinSpeed + input.dragX * axialSpinInputScale
  const axialCos = Math.cos(axialRotation)
  const axialSin = Math.sin(axialRotation)

  const pixelRatio =
    typeof window === 'undefined' ? 1 : Math.min(1.6, window.devicePixelRatio || 1)
  coreMaterial.uniforms.pixelRatio.value = pixelRatio
  haloMaterial.uniforms.pixelRatio.value = pixelRatio

  particles.forEach((particle, index) => {
    const spin = particle.angle + motionTime * particle.speed + input.dragX * 0.42
    const pulse = Math.sin(time * 1.25 + index) * 0.22 + 0.78
    const centerWeight = 1 - particle.radialT
    const strayOpacity = 1 - particle.strayT * 0.42
    const clusterPulse = Math.sin(
      motionTime * 0.72 + particle.phase + particle.cluster,
    )
    const clusterOrbit =
      Math.sin(motionTime * 0.36 + particle.cluster * 1.7) *
      particle.clusterStrength *
      0.08
    const reactiveRadius =
      particle.radius * (1 + clusterPulse * particle.clusterStrength * 0.06) +
      clusterOrbit +
      (input.active ? 0.07 : 0.028) * Math.sin(motionTime * 2.2 + index)
    const groupedSpin =
      spin +
      Math.sin(motionTime * 0.42 + particle.phase) *
        particle.clusterStrength *
        0.08
    const flare =
      particle.shape > 0.78 ? 1.55 : particle.shape > 0.54 ? 1.18 : 0.92
    const hue =
      particle.hueOffset + Math.sin(time * 0.08 + index) * 0.025
    const coreAlpha =
      atmosphereReveal *
      Math.min(1.0, 0.42 + centerWeight * 0.58 + pulse * 0.12) *
      strayOpacity *
      coreAlphaScale
    const haloAlpha =
      atmosphereReveal *
      (0.18 + centerWeight * 0.36 + pulse * 0.06) *
      strayOpacity *
      haloAlphaScale

    const baseX =
      particle.anchorX +
      Math.cos(groupedSpin) * reactiveRadius +
      pointerX * 0.08
    const baseZ =
      particle.anchorZ +
      particle.zOffset +
      Math.sin(groupedSpin) * reactiveRadius * 0.72

    positions[index * 3] = baseX * axialCos - baseZ * axialSin
    positions[index * 3 + 1] =
      wrapCentered(
        particle.anchorY + particle.height + verticalScroll,
        scrollSpan,
      ) +
      Math.sin(motionTime * 1.1 + particle.phase) *
        (0.05 + particle.clusterStrength * 0.11)
    positions[index * 3 + 2] = baseX * axialSin + baseZ * axialCos

    color.setHSL(hue, 0.86, 0.7 + centerWeight * 0.2)
    coreColors[index * 3] = color.r
    coreColors[index * 3 + 1] = color.g
    coreColors[index * 3 + 2] = color.b

    haloColor.setHSL(particle.hueOffset + 0.04, 0.96, 0.56)
    haloColors[index * 3] = haloColor.r
    haloColors[index * 3 + 1] = haloColor.g
    haloColors[index * 3 + 2] = haloColor.b

    const spriteScale = particle.size * flare * (1.26 + pulse * 0.5)
    coreSizes[index] = spriteScale * particlePointSizeScale * pointSizeScale
    haloSizes[index] = coreSizes[index] * haloPointSizeScale
    coreAlphas[index] = coreAlpha * opacityScale
    haloAlphas[index] = haloAlpha * opacityScale
  })

  const positionAttribute = coreGeometry.getAttribute('position')
  const coreColorAttribute = coreGeometry.getAttribute('pointColor')
  const haloColorAttribute = haloGeometry.getAttribute('pointColor')
  const coreSizeAttribute = coreGeometry.getAttribute('pointSize')
  const haloSizeAttribute = haloGeometry.getAttribute('pointSize')
  const coreAlphaAttribute = coreGeometry.getAttribute('pointAlpha')
  const haloAlphaAttribute = haloGeometry.getAttribute('pointAlpha')
  positionAttribute.needsUpdate = true
  coreColorAttribute.needsUpdate = true
  haloColorAttribute.needsUpdate = true
  coreSizeAttribute.needsUpdate = true
  haloSizeAttribute.needsUpdate = true
  coreAlphaAttribute.needsUpdate = true
  haloAlphaAttribute.needsUpdate = true
})

onDestroy(() => {
  coreGeometry.dispose()
  haloGeometry.dispose()
  coreMaterial.dispose()
  haloMaterial.dispose()
})
</script>

<T.Points args={[haloGeometry, haloMaterial]} />
<T.Points bind:ref={points} args={[coreGeometry, coreMaterial]} />
