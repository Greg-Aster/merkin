<script lang="ts" context="module">
import { CanvasTexture, SRGBColorSpace } from 'three'
import type { Texture } from 'three'

type TimelineStarTextureVariant = 0 | 1 | 2 | 3

const timelineStarTextureVariants = [
  { points: 4, rayRadius: 54, secondaryRadius: 34, rayWidth: 2.4, secondaryWidth: 1.45 },
  { points: 5, rayRadius: 50, secondaryRadius: 25, rayWidth: 2.05, secondaryWidth: 1.25 },
  { points: 6, rayRadius: 52, secondaryRadius: 30, rayWidth: 2.2, secondaryWidth: 1.3 },
  { points: 8, rayRadius: 48, secondaryRadius: 22, rayWidth: 1.85, secondaryWidth: 1.05 },
] as const
const sharedTimelineStarTextures = new Map<TimelineStarTextureVariant, Texture>()
let sharedTimelineOrbitTexture: Texture | null = null

function getTimelineStarTexture(variant: TimelineStarTextureVariant = 0) {
  const cachedTexture = sharedTimelineStarTextures.get(variant)
  if (cachedTexture) return cachedTexture
  if (typeof document === 'undefined') return null

  const textureVariant = timelineStarTextureVariants[variant] ?? timelineStarTextureVariants[0]
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) return null

  const center = canvas.width / 2
  const gradient = context.createRadialGradient(center, center, 0, center, center, center)
  gradient.addColorStop(0, 'rgb(255 255 255 / 1)')
  gradient.addColorStop(0.08, 'rgb(255 255 255 / 1)')
  gradient.addColorStop(0.18, 'rgb(236 254 255 / 0.82)')
  gradient.addColorStop(0.36, 'rgb(103 232 249 / 0.36)')
  gradient.addColorStop(0.72, 'rgb(59 130 246 / 0.11)')
  gradient.addColorStop(1, 'rgb(59 130 246 / 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.save()
  context.translate(center, center)
  context.globalCompositeOperation = 'screen'
  context.lineCap = 'round'
  context.strokeStyle = 'rgb(255 255 255 / 0.92)'
  context.lineWidth = textureVariant.rayWidth
  context.beginPath()
  for (let index = 0; index < textureVariant.points; index += 1) {
    const angle = (index / textureVariant.points) * Math.PI * 2
    context.moveTo(0, 0)
    context.lineTo(Math.cos(angle) * textureVariant.rayRadius, Math.sin(angle) * textureVariant.rayRadius)
  }
  context.stroke()
  context.strokeStyle = 'rgb(165 243 252 / 0.58)'
  context.lineWidth = textureVariant.secondaryWidth
  context.beginPath()
  for (let index = 0; index < textureVariant.points; index += 1) {
    const angle = ((index + 0.5) / textureVariant.points) * Math.PI * 2
    context.moveTo(0, 0)
    context.lineTo(
      Math.cos(angle) * textureVariant.secondaryRadius,
      Math.sin(angle) * textureVariant.secondaryRadius,
    )
  }
  context.stroke()
  context.fillStyle = 'rgb(255 255 255 / 0.96)'
  context.beginPath()
  context.arc(0, 0, 6.5, 0, Math.PI * 2)
  context.fill()
  context.restore()

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  sharedTimelineStarTextures.set(variant, texture)

  return texture
}

function getTimelineOrbitTexture() {
  if (sharedTimelineOrbitTexture) return sharedTimelineOrbitTexture
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) return null

  const center = canvas.width / 2
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.save()
  context.translate(center, center)
  context.globalCompositeOperation = 'screen'

  const glow = context.createRadialGradient(0, 0, 12, 0, 0, 56)
  glow.addColorStop(0, 'rgb(125 211 252 / 0)')
  glow.addColorStop(0.54, 'rgb(125 211 252 / 0.16)')
  glow.addColorStop(0.72, 'rgb(125 211 252 / 0.06)')
  glow.addColorStop(1, 'rgb(125 211 252 / 0)')
  context.fillStyle = glow
  context.beginPath()
  context.arc(0, 0, 58, 0, Math.PI * 2)
  context.fill()

  context.strokeStyle = 'rgb(186 230 253 / 0.54)'
  context.lineWidth = 1.35
  context.setLineDash([4, 7])
  context.beginPath()
  context.arc(0, 0, 38, 0, Math.PI * 2)
  context.stroke()

  context.setLineDash([])
  context.strokeStyle = 'rgb(255 255 255 / 0.2)'
  context.lineWidth = 0.9
  context.beginPath()
  context.arc(0, 0, 25, 0, Math.PI * 2)
  context.stroke()
  context.restore()

  sharedTimelineOrbitTexture = new CanvasTexture(canvas)
  sharedTimelineOrbitTexture.colorSpace = SRGBColorSpace
  sharedTimelineOrbitTexture.needsUpdate = true

  return sharedTimelineOrbitTexture
}
</script>

<script lang="ts">
import { T, useTask } from '@threlte/core'
import { createEventDispatcher, onDestroy, onMount } from 'svelte'
import type * as THREE from 'three'
import { AdditiveBlending, Vector3 } from 'three'
import HomeIntroParticleField from '../home/HomeIntroParticleField.svelte'
import { homeIntroParticleClusters } from '../home/homeIntroParticleClusters'
import { hashHomeIntroUnit } from '../home/homeIntroSceneMath'

type TimelineCarouselInput = {
  x: number
  y: number
  panX: number
  panY: number
  dragX: number
  dragY: number
  wheel: number
  active: boolean
}

export type TimelineCarouselScreen = {
  kicker: string
  title: string
  stat: string
  ctaLabel: string
  stillSrc: string
  videoSrc: string
  eraKey: string
  year: number
  isKeyEvent: boolean
}

export type TimelineStarScreenPosition = {
  index: number
  x: number
  y: number
  size: number
  visible: boolean
  eraKey: string
  isKeyEvent: boolean
}

export let input: TimelineCarouselInput
export let screens: TimelineCarouselScreen[] = []
export let selectedScreenIndex = -1
export let hoveredScreenIndex = -1

const dispatch = createEventDispatcher<{
  starpositions: { positions: TimelineStarScreenPosition[] }
}>()

let camera: THREE.PerspectiveCamera | null = null
let world: THREE.Group | null = null
let starRail: THREE.Group | null = null
let starColumn: THREE.Group | null = null
let portraitMobile = false
let starAnimationTime = 0

const screenOrbitRadiusX = 5.65
const screenOrbitRadiusY = 3.85
const screenOrbitCenterZ = -2.42
const screenStepZ = 1.28
const starAngleVariance = 0.92
const starRadiusVariance = 0.48
const starVerticalVariance = 0.72
const starDepthVariance = 0.42
const particleClusterCount = homeIntroParticleClusters.length
const particleSizeMultiplier = 2.18
const particleCount = 1200
const effectScrollStepY = screenStepZ * 2.35
const particleScrollSpan = 48
const starColor = '#67c7d6'
const activeStarColor = '#dffbff'
const starGlowColor = '#0891b2'
const additiveBlending = AdditiveBlending
const timelineOrbitTexture = getTimelineOrbitTexture()
const projectedStarPosition = new Vector3()
let lastProjectedStarPositionSignature = ''

$: sceneScale = portraitMobile ? 0.78 : 1
$: cameraPosition = portraitMobile
  ? ([0, 0.2, 8.85] as [number, number, number])
  : ([0, 0.08, 6.8] as [number, number, number])
$: cameraFov = portraitMobile ? 48 : 44
$: railPosition = portraitMobile
  ? ([0, 0.08, -0.58] as [number, number, number])
  : ([0, 0, -0.34] as [number, number, number])
$: activeCameraPosition = input ? getCameraTimelinePosition(input.wheel) : cameraPosition
$: starColumnPosition = portraitMobile
  ? ([0, 0.02, -1.1] as [number, number, number])
  : ([0, 0, -1.18] as [number, number, number])
$: starColumnScale = portraitMobile
  ? ([2.16, 2.22, 1.38] as [number, number, number])
  : ([2.08, 2.52, 1.54] as [number, number, number])
$: timelineStarIndexes = screens.map((_, index) => index)

function syncViewportMode() {
  if (typeof window === 'undefined') return
  portraitMobile = window.innerWidth <= 760 && window.innerHeight > window.innerWidth
}

function createParticle(index: number) {
  const cluster = index % particleClusterCount
  const clusterCenter = homeIntroParticleClusters[cluster]
  const randomA = Math.abs(hashHomeIntroUnit(index + 1))
  const randomB = Math.abs(hashHomeIntroUnit(index + 17))
  const randomC = Math.abs(hashHomeIntroUnit(index + 41))
  const randomD = Math.abs(hashHomeIntroUnit(index + 79))
  const randomE = Math.abs(hashHomeIntroUnit(index + 131))
  const randomF = Math.abs(hashHomeIntroUnit(index + 181))
  const randomG = Math.abs(hashHomeIntroUnit(index + 229))
  const randomH = Math.abs(hashHomeIntroUnit(index + 283))
  const radialT = randomA ** 1.25
  const angle = randomB * Math.PI * 2
  const verticalAngle = (randomC - 0.5) * Math.PI
  const strayT = randomE > 0.74 ? ((randomE - 0.74) / 0.26) ** 0.72 : 0
  const edgeAngle = randomF * Math.PI * 2
  const radius = clusterCenter.spread * (0.1 + radialT * (0.82 + strayT * 1.45))

  return {
    anchorX:
      clusterCenter.x * 0.45 +
      (randomG - 0.5) * 5.8 +
      Math.cos(edgeAngle) * strayT * 2.4,
    anchorY: clusterCenter.y,
    anchorZ:
      clusterCenter.z * 0.45 +
      (randomH - 0.5) * 3.4 +
      Math.sin(edgeAngle) * strayT * 1.35,
    angle,
    cluster,
    clusterStrength: 0.26 + (1 - radialT) * 0.58,
    height: Math.sin(verticalAngle) * clusterCenter.spread * 1.42,
    radius,
    phase: randomB * Math.PI * 2,
    radialT,
    speed: 0.038 + randomD * 0.072 + radialT * 0.032,
    size:
      (0.012 + (1 - radialT) * 0.024 + randomE * 0.014) *
      (1 - strayT * 0.22) *
      particleSizeMultiplier,
    hueOffset: clusterCenter.hue + randomD * 0.08,
    shape: randomE,
    strayT,
    zOffset: Math.cos(verticalAngle) * clusterCenter.spread * (randomD - 0.5) * (0.72 + strayT * 0.56),
  }
}

const particles = Array.from({ length: particleCount }, (_, index) => createParticle(index))

function clampScreenIndex(value: number) {
  return Math.min(Math.max(screens.length - 1, 0), Math.max(0, value))
}

function getTimelineStepZ() {
  return screenStepZ * (portraitMobile ? 0.82 : 1)
}

function getCameraTimelinePosition(selectedIndex: number) {
  const visualSelectedIndex = clampScreenIndex(selectedIndex)
  const panScaleX = portraitMobile ? 1.3 : 1.85
  const panScaleY = portraitMobile ? 1.05 : 1.45
  const panX = Number.isFinite(input?.panX) ? input.panX : 0
  const panY = Number.isFinite(input?.panY) ? input.panY : 0

  return [
    railPosition[0] + cameraPosition[0] + panX * panScaleX,
    railPosition[1] + cameraPosition[1] + panY * panScaleY,
    cameraPosition[2] - visualSelectedIndex * getTimelineStepZ(),
  ] as [number, number, number]
}

function getScreenEraKey(index: number) {
  return screens[index]?.eraKey ?? 'unknown'
}

function getEraMemberIndexes(eraKey: string) {
  return screens.reduce<number[]>((indexes, screen, index) => {
    if ((screen.eraKey || 'unknown') === eraKey) indexes.push(index)
    return indexes
  }, [])
}

function getEraMemberIndex(index: number) {
  return getEraMemberIndexes(getScreenEraKey(index)).indexOf(index)
}

function getEraHash(eraKey: string, salt = 0) {
  let hash = salt + 2166136261
  for (let index = 0; index < eraKey.length; index += 1) {
    hash ^= eraKey.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hashHomeIntroUnit(hash))
}

function getStarHash(index: number, salt: number) {
  return Math.abs(hashHomeIntroUnit(index + salt))
}

function getTimelineStarColor(index: number, eraKey: string, isActive: boolean, isKeyEvent: boolean) {
  if (isActive) return activeStarColor
  if (isKeyEvent) {
    const keyPalette = ['#fef08a', '#fde68a', '#facc15', '#fdba74', '#f9a8d4', '#ddd6fe']
    return keyPalette[Math.min(keyPalette.length - 1, Math.floor(getStarHash(index, 2971) * keyPalette.length))]
  }

  const palettes: Record<string, string[]> = {
    'ancient-epoch': ['#67e8f9', '#bae6fd', '#93c5fd', '#a7f3d0', '#fde68a', '#f8fafc'],
    'awakening-era': ['#38bdf8', '#22d3ee', '#5eead4', '#bfdbfe', '#c4b5fd', '#f0fdfa'],
    'golden-age': ['#fde68a', '#facc15', '#fdba74', '#fef3c7', '#f9a8d4', '#93c5fd'],
    'conflict-epoch': ['#fb7185', '#fda4af', '#f97316', '#fecdd3', '#c4b5fd', '#fef08a'],
    'transcendent-age': ['#c4b5fd', '#ddd6fe', '#f0abfc', '#bfdbfe', '#67e8f9', '#f8fafc'],
    'final-epoch': ['#e2e8f0', '#f8fafc', '#cbd5e1', '#bae6fd', '#ddd6fe', '#f0fdfa'],
    'singularity-conflict': ['#f0abfc', '#c4b5fd', '#f9a8d4', '#e879f9', '#67e8f9', '#fef08a'],
  }
  const palette = palettes[eraKey] ?? [starColor, '#bae6fd', '#f8fafc']
  const paletteIndex = Math.min(palette.length - 1, Math.floor(getStarHash(index, 3001) * palette.length))

  return palette[paletteIndex]
}

function getTimelineStarGlowColor(index: number, screen: TimelineCarouselScreen, isActive: boolean) {
  if (isActive) return activeStarColor
  if (screen.isKeyEvent) return getTimelineStarColor(index, screen.eraKey, false, true)

  const glowPalettes: Record<string, string[]> = {
    'ancient-epoch': ['#22d3ee', '#38bdf8', '#5eead4', '#60a5fa', '#facc15'],
    'awakening-era': ['#06b6d4', '#14b8a6', '#38bdf8', '#818cf8', '#93c5fd'],
    'golden-age': ['#f59e0b', '#facc15', '#fb7185', '#38bdf8', '#fde68a'],
    'conflict-epoch': ['#e11d48', '#fb7185', '#f97316', '#c084fc', '#facc15'],
    'transcendent-age': ['#8b5cf6', '#c084fc', '#e879f9', '#38bdf8', '#f8fafc'],
    'final-epoch': ['#94a3b8', '#e2e8f0', '#60a5fa', '#a78bfa', '#67e8f9'],
    'singularity-conflict': ['#d946ef', '#a78bfa', '#fb7185', '#22d3ee', '#facc15'],
  }
  const palette = glowPalettes[screen.eraKey] ?? [starGlowColor, '#38bdf8', '#a78bfa']
  const paletteIndex = Math.min(palette.length - 1, Math.floor(getStarHash(index, 3187) * palette.length))

  return palette[paletteIndex]
}

function getTimelineStarSize(index: number, isKeyEvent: boolean) {
  const baseSize = 0.78 + getStarHash(index, 3319) * 0.58
  return isKeyEvent ? baseSize * 1.18 : baseSize
}

function getTimelineStarVisual(
  index: number,
  screen: TimelineCarouselScreen,
  isActive: boolean,
  animationTime: number,
) {
  const size = getTimelineStarSize(index, screen.isKeyEvent)
  const variant = Math.min(
    timelineStarTextureVariants.length - 1,
    Math.floor(getStarHash(index, 3571) * timelineStarTextureVariants.length),
  ) as TimelineStarTextureVariant
  const activeScale = isActive ? 1.42 : 1
  const keyScale = screen.isKeyEvent ? 1.12 : 1
  const rotation = getStarHash(index, 3907) * Math.PI
  const phase = getStarHash(index, 4211) * Math.PI * 2
  const slowPulse = Math.sin(animationTime * 1.05 + phase) * (isActive ? 0.16 : 0.025)
  const glowPulse = Math.sin(animationTime * 0.82 + phase) * (isActive ? 0.24 : 0.035)
  const pulse = 1 + slowPulse
  const drift = 1 + glowPulse

  return {
    color: getTimelineStarColor(index, screen.eraKey, isActive, screen.isKeyEvent),
    glowColor: getTimelineStarGlowColor(index, screen, isActive),
    texture: getTimelineStarTexture(variant),
    coreScale: [
      0.58 * size * activeScale * keyScale * pulse,
      0.58 * size * activeScale * keyScale * pulse,
      0.58 * size * activeScale * keyScale * pulse,
    ] as [number, number, number],
    glowScale: [
      1.08 * size * activeScale * keyScale * (isActive ? 1.18 : 1) * drift,
      1.08 * size * activeScale * keyScale * (isActive ? 1.18 : 1) * drift,
      1.08 * size * activeScale * keyScale * (isActive ? 1.18 : 1) * drift,
    ] as [number, number, number],
    glintScale: [
      0.22 * size * activeScale,
      0.22 * size * activeScale,
      0.22 * size * activeScale,
    ] as [number, number, number],
    orbitScale: [
      1.78 * size * (isActive ? 1.28 + glowPulse * 0.42 : 1) * keyScale,
      1.78 * size * (isActive ? 1.28 + glowPulse * 0.42 : 1) * keyScale,
      1.78 * size * (isActive ? 1.28 + glowPulse * 0.42 : 1) * keyScale,
    ] as [number, number, number],
    rotation,
    glintRotation: rotation + Math.PI / 4,
    orbitRotation: -rotation * 0.45 + animationTime * (isActive ? 0.18 : 0.08),
  }
}

function getTimelineStarHitScale(index: number, isKeyEvent: boolean) {
  return getTimelineStarSize(index, isKeyEvent) * (isKeyEvent ? 1.08 : 1)
}

function getTimelineStarAnchor(index: number) {
  const eraKey = getScreenEraKey(index)
  const eraMemberIndexes = getEraMemberIndexes(eraKey)
  const eraMemberIndex = Math.max(0, getEraMemberIndex(index))
  const eraMemberCount = Math.max(1, eraMemberIndexes.length)
  const eraT = eraMemberCount <= 1 ? 0.5 : eraMemberIndex / (eraMemberCount - 1)
  const eraAnchorAngle = getEraHash(eraKey, 503) * Math.PI * 2
  const branch = eraMemberIndex % 3
  const branchSpread = (branch - 1) * (0.42 + getEraHash(eraKey, 613) * 0.34)
  const localArc = (eraT - 0.5) * (0.82 + getEraHash(eraKey, 719) * 0.82)
  const angleJitter = (getStarHash(index, 503) - 0.5) * starAngleVariance * 2.1
  const radiusJitterX = 0.74 + getStarHash(index, 907) * starRadiusVariance * 1.9
  const radiusJitterY = 0.74 + getStarHash(index, 1291) * starRadiusVariance * 1.9
  const verticalJitter = (getStarHash(index, 1777) - 0.5) * starVerticalVariance * 2.2
  const depthJitter = (getStarHash(index, 2137) - 0.5) * starDepthVariance
  const orbitAngle = eraAnchorAngle + branchSpread + localArc + angleJitter
  const orbitRadiusX = screenOrbitRadiusX * (portraitMobile ? 0.52 : 1)
  const orbitRadiusY = screenOrbitRadiusY * (portraitMobile ? 0.64 : 1)
  const stepZ = getTimelineStepZ()
  const constellationTilt = (eraT - 0.5) * (portraitMobile ? 0.74 : 1.05)
  const orbitX =
    Math.sin(orbitAngle) * orbitRadiusX * radiusJitterX +
    Math.cos(eraAnchorAngle) * constellationTilt
  const orbitY =
    Math.cos(orbitAngle) * orbitRadiusY * radiusJitterY +
    Math.sin(eraAnchorAngle) * constellationTilt +
    verticalJitter
  const fieldX =
    (getStarHash(index, 2309) - 0.5) *
    orbitRadiusX *
    (portraitMobile ? 1.64 : 2.08)
  const fieldY =
    (getStarHash(index, 2671) - 0.5) *
    orbitRadiusY *
    (portraitMobile ? 1.58 : 2.02)
  const x = orbitX * 0.46 + fieldX * 0.74
  const y = orbitY * 0.42 + fieldY * 0.76
  const z = screenOrbitCenterZ - (index + depthJitter) * stepZ

  return {
    x,
    y,
    z,
    orbitAngle,
  }
}

function getTimelineStarTarget(index: number, visualSelectedIndex: number) {
  const offset = index - visualSelectedIndex
  const depth = Math.abs(offset)
  const anchor = getTimelineStarAnchor(index)
  const cameraTimelinePosition = getCameraTimelinePosition(visualSelectedIndex)
  const cameraLocalX = cameraTimelinePosition[0] - railPosition[0]
  const cameraLocalY = cameraTimelinePosition[1] - railPosition[1]
  const cameraLocalZ = cameraTimelinePosition[2] - railPosition[2]
  const deltaX = cameraLocalX - anchor.x
  const deltaZ = cameraLocalZ - anchor.z
  const distanceToCamera = Math.max(1, Math.hypot(deltaX, deltaZ))
  const yaw = Math.atan2(deltaX, deltaZ) * 0.84
  const pitch = Math.atan2(anchor.y - cameraLocalY, distanceToCamera) * 0.58
  const depthScale = Math.max(0.56, 1 - depth * 0.045)

  return {
    x: anchor.x,
    y: anchor.y,
    z: anchor.z,
    pitch,
    yaw,
    roll: Math.sin(anchor.orbitAngle) * 0.04,
    scale: (portraitMobile ? 0.82 : 1) * depthScale,
    depth,
  }
}

function syncProjectedStarPositions(selectedIndex: number) {
  if (!camera || !starRail || typeof window === 'undefined') return

  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  world?.updateMatrixWorld(true)
  starRail.updateMatrixWorld(true)

  const positions = timelineStarIndexes
    .map(index => {
      const star = getTimelineStarTarget(index, selectedIndex)

      projectedStarPosition.set(star.x, star.y, star.z)
      projectedStarPosition.applyMatrix4(starRail.matrixWorld)
      projectedStarPosition.project(camera)

      const visible =
        projectedStarPosition.z > -1 &&
        projectedStarPosition.z < 1 &&
        Math.abs(projectedStarPosition.x) <= 1.26 &&
        Math.abs(projectedStarPosition.y) <= 1.26
      const projectable = projectedStarPosition.z > -1 && projectedStarPosition.z < 1
      const targetSize = Math.max(
        portraitMobile ? 42 : 46,
        Math.min(
          portraitMobile ? 82 : 90,
          (portraitMobile ? 56 : 62) *
            star.scale *
            getTimelineStarHitScale(index, Boolean(screens[index]?.isKeyEvent)),
        ),
      )

      return {
        index,
        x: (projectedStarPosition.x + 1) * 50,
        y: (1 - projectedStarPosition.y) * 50,
        size: projectable ? targetSize : 0,
        visible,
        eraKey: screens[index]?.eraKey ?? 'unknown',
        isKeyEvent: Boolean(screens[index]?.isKeyEvent),
      }
    })

  const signature = positions
    .map(position => `${position.index}:${position.x.toFixed(1)}:${position.y.toFixed(1)}:${position.size.toFixed(1)}:${position.visible ? 1 : 0}`)
    .join('|')

  if (signature === lastProjectedStarPositionSignature) return
  lastProjectedStarPositionSignature = signature
  dispatch('starpositions', { positions })
}

onMount(() => {
  syncViewportMode()
  window.addEventListener('resize', syncViewportMode)

  return () => {
    window.removeEventListener('resize', syncViewportMode)
  }
})

onDestroy(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', syncViewportMode)
  }
})

useTask(delta => {
  const time = performance.now() * 0.001
  const ease = 1 - Math.exp(-delta * 4.8)
  const selectedIndex = Number.isFinite(input.wheel) ? input.wheel : 0
  const targetCameraPosition = getCameraTimelinePosition(selectedIndex)
  starAnimationTime += (time - starAnimationTime) * Math.min(1, delta * 6)

  if (camera) {
    camera.position.set(targetCameraPosition[0], targetCameraPosition[1], targetCameraPosition[2])
    camera.rotation.set(0, 0, 0)
  }

  if (world) {
    world.rotation.x += (0 - world.rotation.x) * ease
    world.rotation.y += (0 - world.rotation.y) * ease
    world.position.x += (0 - world.position.x) * ease
    world.position.y += (0 - world.position.y) * ease
  }

  if (starColumn) {
    starColumn.position.x += (starColumnPosition[0] - starColumn.position.x) * ease
    starColumn.position.y += (starColumnPosition[1] - starColumn.position.y) * ease
    starColumn.position.z += (starColumnPosition[2] - starColumn.position.z) * ease
    starColumn.rotation.x = Math.PI / 2
    starColumn.rotation.y = 0
    starColumn.rotation.z = 0
  }

  if (starRail) {
    starRail.rotation.z += (0 - starRail.rotation.z) * ease
    starRail.rotation.x += (0 - starRail.rotation.x) * ease
    starRail.position.x = railPosition[0]
    starRail.position.y = railPosition[1]
    starRail.position.z = railPosition[2]
  }

  syncProjectedStarPositions(selectedIndex)
})
</script>

<T.PerspectiveCamera bind:ref={camera} makeDefault position={activeCameraPosition} fov={cameraFov} />

<T.Group bind:ref={world} position={[0, 0, 0]} scale={[sceneScale, sceneScale, sceneScale]}>
  <T.Group bind:ref={starRail} position={railPosition}>
    {#each screens as screen, index}
      {@const star = getTimelineStarTarget(index, input.wheel)}
      {@const starActive = index === selectedScreenIndex || index === hoveredScreenIndex}
      {@const starVisual = getTimelineStarVisual(index, screen, starActive, starAnimationTime)}
      <T.Group position={[star.x, star.y, star.z]} scale={[star.scale, star.scale, star.scale]}>
        {#if timelineOrbitTexture && (starActive || screen.isKeyEvent)}
          <T.Sprite scale={starVisual.orbitScale}>
            <T.SpriteMaterial
              map={timelineOrbitTexture}
              color={starVisual.glowColor}
              rotation={starVisual.orbitRotation}
              transparent={true}
              blending={additiveBlending}
              depthWrite={false}
            />
          </T.Sprite>
        {/if}
        <T.Sprite scale={starVisual.coreScale}>
          <T.SpriteMaterial
            map={starVisual.texture}
            color={starVisual.color}
            rotation={starVisual.rotation}
            transparent={true}
            blending={additiveBlending}
            depthWrite={false}
          />
        </T.Sprite>
        <T.Sprite scale={starVisual.glowScale}>
          <T.SpriteMaterial
            map={starVisual.texture}
            color={starVisual.glowColor}
            rotation={starVisual.rotation}
            transparent={true}
            blending={additiveBlending}
            depthWrite={false}
          />
        </T.Sprite>
        <T.Sprite scale={starVisual.glintScale}>
          <T.SpriteMaterial
            map={starVisual.texture}
            color="#ffffff"
            rotation={starVisual.glintRotation}
            transparent={true}
            blending={additiveBlending}
            depthWrite={false}
          />
        </T.Sprite>
      </T.Group>
    {/each}
  </T.Group>

  <T.Group bind:ref={starColumn} position={starColumnPosition} scale={starColumnScale}>
    <HomeIntroParticleField
      {particles}
      {input}
      wheel={0}
      scrollStep={effectScrollStepY}
      scrollSpan={particleScrollSpan}
      atmosphereReveal={1}
      axialSpinSpeed={0}
      axialSpinInputScale={0}
      pointSizeScale={0.3}
      opacityScale={1}
      motionEnabled={false}
    />
  </T.Group>
</T.Group>
