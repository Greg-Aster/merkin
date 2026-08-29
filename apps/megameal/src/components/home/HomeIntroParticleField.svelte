<script lang="ts" context="module">
import { CanvasTexture } from 'three'
import type { Texture } from 'three'
import { configureGeneratedCanvasTexture } from '@/utils/threeTextureUtils'

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

  const texture = configureGeneratedCanvasTexture(new CanvasTexture(canvas))
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
export let pointSizeScale = 1
export let opacityScale = 1
export let motionEnabled = true
export let densityMultiplier = 1

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
let lastStaticUpdateSignature = ''
const color = new Color()
const haloColor = new Color()
const particleCapacityStep = 128
const particleMotionScale = 0.62
const particlePointSizeScale = 5.25
const haloPointSizeScale = 2.55
const coreAlphaScale = 1
const haloAlphaScale = 0.9

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

function hashUnit(value: number) {
  return Math.abs(Math.sin(value * 12.9898) * 43758.5453) % 1
}

function getRenderParticleCount() {
  if (!particles.length) return 0

  return Math.max(
    particles.length,
    Math.floor(particles.length * Math.max(1, densityMultiplier)),
  )
}

function syncGeometryAttributes() {
  const renderParticleCount = getRenderParticleCount()

  if (particleCapacity >= renderParticleCount) {
    coreGeometry.setDrawRange(0, renderParticleCount)
    haloGeometry.setDrawRange(0, renderParticleCount)
    return
  }

  particleCapacity =
    Math.ceil(renderParticleCount / particleCapacityStep) * particleCapacityStep
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
  coreGeometry.setDrawRange(0, renderParticleCount)
  haloGeometry.setDrawRange(0, renderParticleCount)
}

$: syncGeometryAttributes()

useTask(() => {
  const renderParticleCount = getRenderParticleCount()
  if (renderParticleCount <= 0) return

  const pixelRatio =
    typeof window === 'undefined' ? 1 : Math.min(1.6, window.devicePixelRatio || 1)
  if (!motionEnabled) {
    const staticUpdateSignature = [
      renderParticleCount,
      particles.length,
      wheel,
      scrollStep,
      scrollSpan,
      atmosphereReveal,
      pointSizeScale,
      opacityScale,
      densityMultiplier,
      pixelRatio,
    ].join('|')

    if (staticUpdateSignature === lastStaticUpdateSignature) return
    lastStaticUpdateSignature = staticUpdateSignature
  } else {
    lastStaticUpdateSignature = ''
  }

  const time = motionEnabled ? performance.now() * 0.001 : 0
  const motionTime = time * particleMotionScale
  const pointerX = motionEnabled && Number.isFinite(input.x) ? input.x : 0
  const inputDragX = motionEnabled && Number.isFinite(input.dragX) ? input.dragX : 0
  const inputActive = motionEnabled && input.active
  const verticalScroll = wheel * scrollStep

  coreMaterial.uniforms.pixelRatio.value = pixelRatio
  haloMaterial.uniforms.pixelRatio.value = pixelRatio

  for (let index = 0; index < renderParticleCount; index += 1) {
    const sourceIndex = index % particles.length
    const variantIndex = Math.floor(index / particles.length)
    const particle = particles[sourceIndex]
    const variantA = variantIndex === 0 ? 0.5 : hashUnit(sourceIndex + variantIndex * 113)
    const variantB = variantIndex === 0 ? 0.5 : hashUnit(sourceIndex + variantIndex * 197)
    const variantC = variantIndex === 0 ? 0.5 : hashUnit(sourceIndex + variantIndex * 281)
    const variantD = variantIndex === 0 ? particle.shape : hashUnit(sourceIndex + variantIndex * 337)
    const variantAngle = particle.phase + variantA * Math.PI * 2 + variantIndex * 1.618
    const variantDistance = variantIndex === 0
      ? 0
      : (0.24 + variantB * 1.28) * (0.72 + particle.radialT * 0.54)
    const variantScale = variantIndex === 0 ? 1 : 0.82 + variantC * 0.32
    const sizeVariance = variantIndex === 0
      ? 0.7 + variantD * 0.62
      : 0.46 + variantD * 1.18
    const spin = particle.angle + motionTime * particle.speed + inputDragX * 0.42
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
      (inputActive ? 0.07 : 0.028) * Math.sin(motionTime * 2.2 + index)
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
      Math.cos(variantAngle) * variantDistance * (1.1 + particle.strayT * 0.3) +
      Math.cos(groupedSpin) * reactiveRadius +
      pointerX * 0.08
    const baseZ =
      particle.anchorZ +
      particle.zOffset +
      Math.sin(variantAngle) * variantDistance * 0.82 +
      Math.sin(groupedSpin) * reactiveRadius * 0.72

    positions[index * 3] = baseX
    positions[index * 3 + 1] =
      wrapCentered(
        particle.anchorY +
          particle.height +
          (variantB - 0.5) * (variantIndex === 0 ? 0 : 1.25) +
          verticalScroll,
        scrollSpan,
      ) +
      Math.sin(motionTime * 1.1 + particle.phase) *
        (0.05 + particle.clusterStrength * 0.11)
    positions[index * 3 + 2] = baseZ

    color.setHSL(hue, 0.78, 0.46 + centerWeight * 0.16)
    coreColors[index * 3] = color.r
    coreColors[index * 3 + 1] = color.g
    coreColors[index * 3 + 2] = color.b

    haloColor.setHSL(particle.hueOffset + 0.04, 0.82, 0.32)
    haloColors[index * 3] = haloColor.r
    haloColors[index * 3 + 1] = haloColor.g
    haloColors[index * 3 + 2] = haloColor.b

    const spriteScale =
      particle.size *
      flare *
      (1.18 + pulse * 0.46) *
      variantScale *
      sizeVariance
    coreSizes[index] = spriteScale * particlePointSizeScale * pointSizeScale
    haloSizes[index] = coreSizes[index] * haloPointSizeScale
    coreAlphas[index] = coreAlpha * opacityScale
    haloAlphas[index] = haloAlpha * opacityScale
  }

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
}, { autoInvalidate: false })

onDestroy(() => {
  coreGeometry.dispose()
  haloGeometry.dispose()
  coreMaterial.dispose()
  haloMaterial.dispose()
})
</script>

<T.Points args={[haloGeometry, haloMaterial]} />
<T.Points args={[coreGeometry, coreMaterial]} />
