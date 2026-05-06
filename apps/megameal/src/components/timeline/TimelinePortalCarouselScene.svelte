<script lang="ts" context="module">
import { CanvasTexture, SRGBColorSpace } from 'three'
import type { Texture } from 'three'

let sharedTimelineStarTexture: Texture | null = null

function getTimelineStarTexture() {
  if (sharedTimelineStarTexture) return sharedTimelineStarTexture
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) return null

  const center = canvas.width / 2
  const gradient = context.createRadialGradient(center, center, 0, center, center, center)
  gradient.addColorStop(0, 'rgb(255 255 255 / 1)')
  gradient.addColorStop(0.14, 'rgb(236 254 255 / 0.9)')
  gradient.addColorStop(0.34, 'rgb(103 232 249 / 0.42)')
  gradient.addColorStop(0.72, 'rgb(59 130 246 / 0.14)')
  gradient.addColorStop(1, 'rgb(59 130 246 / 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.save()
  context.translate(center, center)
  context.globalCompositeOperation = 'screen'
  context.strokeStyle = 'rgb(255 255 255 / 0.84)'
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(-46, 0)
  context.lineTo(46, 0)
  context.moveTo(0, -46)
  context.lineTo(0, 46)
  context.stroke()
  context.rotate(Math.PI / 4)
  context.strokeStyle = 'rgb(165 243 252 / 0.5)'
  context.lineWidth = 1.25
  context.beginPath()
  context.moveTo(-28, 0)
  context.lineTo(28, 0)
  context.moveTo(0, -28)
  context.lineTo(0, 28)
  context.stroke()
  context.restore()

  sharedTimelineStarTexture = new CanvasTexture(canvas)
  sharedTimelineStarTexture.colorSpace = SRGBColorSpace
  sharedTimelineStarTexture.needsUpdate = true

  return sharedTimelineStarTexture
}
</script>

<script lang="ts">
import { T, useTask } from '@threlte/core'
import { createEventDispatcher, onDestroy, onMount } from 'svelte'
import type * as THREE from 'three'
import { AdditiveBlending, Euler, Quaternion, Vector3 } from 'three'
import HomeIntroParticleField from '../home/HomeIntroParticleField.svelte'
import HomeIntroScreenPanel from '../home/HomeIntroScreenPanel.svelte'
import { homeIntroParticleClusters } from '../home/homeIntroParticleClusters'
import { hashHomeIntroUnit } from '../home/homeIntroSceneMath'

type TimelineCarouselInput = {
  x: number
  y: number
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
export let sceneQuality: 'high' | 'balanced' | 'lean' = 'balanced'

const dispatch = createEventDispatcher<{
  starpositions: { positions: TimelineStarScreenPosition[] }
}>()

let camera: THREE.PerspectiveCamera | null = null
let world: THREE.Group | null = null
let screenRail: THREE.Group | null = null
let starRail: THREE.Group | null = null
let selectedScreenNode: THREE.Group | null = null
let starColumn: THREE.Group | null = null
let portraitMobile = false
let selectedScreenInitialized = false

const screenOrbitRadiusX = 5.1
const screenOrbitRadiusY = 3.15
const screenOrbitCenterZ = -2.42
const screenStepZ = 2.34
const starAngleVariance = 0.34
const starRadiusVariance = 0.34
const starVerticalVariance = 0.44
const starDepthVariance = 0.34
const targetScreenEuler = new Euler(0, 0, 0, 'YXZ')
const targetScreenQuaternion = new Quaternion()
const particleClusterCount = homeIntroParticleClusters.length
const particleSizeMultiplier = 2.18
const particleCount = 900
const effectScrollStepY = screenStepZ * 2.35
const particleScrollSpan = 48
const backgroundParticleTravelRate = 0.24
const starColor = '#67c7d6'
const activeStarColor = '#dffbff'
const starGlowColor = '#0891b2'
const additiveBlending = AdditiveBlending
const timelineStarTexture = getTimelineStarTexture()
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
$: starColumnPosition = portraitMobile
  ? ([0, 0.02, -1.1] as [number, number, number])
  : ([0, 0, -1.18] as [number, number, number])
$: starColumnScale = portraitMobile
  ? ([1.72, 1.44, 1.08] as [number, number, number])
  : ([1.62, 1.68, 1.22] as [number, number, number])
$: loadedStarIndexes = getLoadedStarIndexes(input.wheel)
$: loadedStarIndexSet = new Set(loadedStarIndexes)

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
  const radialT = randomA ** 1.25
  const angle = randomB * Math.PI * 2
  const verticalAngle = (randomC - 0.5) * Math.PI
  const strayT = randomE > 0.74 ? ((randomE - 0.74) / 0.26) ** 0.72 : 0
  const edgeAngle = randomF * Math.PI * 2
  const radius = clusterCenter.spread * (0.1 + radialT * (0.82 + strayT * 1.45))

  return {
    anchorX: clusterCenter.x * (1 - strayT * 0.58) + Math.cos(edgeAngle) * strayT * 2.8,
    anchorY: clusterCenter.y,
    anchorZ: clusterCenter.z + Math.sin(edgeAngle) * strayT * 1.25,
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

function getRestedScreenIndex(selectedIndex: number) {
  const activeIndex = clampScreenIndex(Math.round(selectedIndex))
  const delta = selectedIndex - activeIndex
  const distance = Math.abs(delta)

  if (distance <= 0.001 || distance >= 0.5) return selectedIndex
  return activeIndex + Math.sign(delta) * Math.pow(distance / 0.5, 1.45) * 0.5
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

function addNeighborEra(eraKeys: Set<string>, startIndex: number, direction: -1 | 1) {
  for (
    let index = startIndex + direction;
    index >= 0 && index < screens.length;
    index += direction
  ) {
    const eraKey = getScreenEraKey(index)
    if (eraKey !== getScreenEraKey(startIndex)) {
      eraKeys.add(eraKey)
      return
    }
  }
}

function getLoadedStarIndexes(selectedIndex: number) {
  if (screens.length === 0) return []

  const activeIndex = clampScreenIndex(Math.round(selectedIndex))
  const activeEraKey = getScreenEraKey(activeIndex)
  const eraIndexes = getEraMemberIndexes(activeEraKey)
  const firstEraIndex = eraIndexes[0] ?? activeIndex
  const lastEraIndex = eraIndexes[eraIndexes.length - 1] ?? activeIndex
  const eraKeys = new Set([activeEraKey])

  if (activeIndex - firstEraIndex <= 2) addNeighborEra(eraKeys, activeIndex, -1)
  if (lastEraIndex - activeIndex <= 2) addNeighborEra(eraKeys, activeIndex, 1)

  return screens
    .map((screen, index) => ({
      index,
      loaded:
        eraKeys.has(screen.eraKey || 'unknown') ||
        Math.abs(index - activeIndex) <= 1 ||
        index === selectedScreenIndex ||
        index === hoveredScreenIndex,
    }))
    .filter(({ loaded }) => loaded)
    .map(({ index }) => index)
}

function getTimelineStarTarget(index: number, visualSelectedIndex: number) {
  const offset = index - visualSelectedIndex
  const depth = Math.abs(offset)
  const eraKey = getScreenEraKey(index)
  const eraMemberIndexes = getEraMemberIndexes(eraKey)
  const eraMemberIndex = Math.max(0, getEraMemberIndex(index))
  const eraMemberCount = Math.max(1, eraMemberIndexes.length)
  const eraT = eraMemberCount <= 1 ? 0.5 : eraMemberIndex / (eraMemberCount - 1)
  const eraAnchorAngle = getEraHash(eraKey, 503) * Math.PI * 2
  const branch = eraMemberIndex % 3
  const branchSpread = (branch - 1) * (0.32 + getEraHash(eraKey, 613) * 0.2)
  const localArc = (eraT - 0.5) * (0.52 + getEraHash(eraKey, 719) * 0.38)
  const angleJitter = (getStarHash(index, 503) - 0.5) * starAngleVariance * 2.1
  const radiusJitterX = 0.82 + getStarHash(index, 907) * starRadiusVariance * 1.8
  const radiusJitterY = 0.82 + getStarHash(index, 1291) * starRadiusVariance * 1.8
  const verticalJitter = (getStarHash(index, 1777) - 0.5) * starVerticalVariance * 1.9
  const depthJitter = (getStarHash(index, 2137) - 0.5) * starDepthVariance
  const orbitAngle = eraAnchorAngle + branchSpread + localArc + angleJitter
  const orbitRadiusX = screenOrbitRadiusX * (portraitMobile ? 0.52 : 1)
  const orbitRadiusY = screenOrbitRadiusY * (portraitMobile ? 0.64 : 1)
  const stepZ = screenStepZ * (portraitMobile ? 0.82 : 1)
  const constellationTilt = (eraT - 0.5) * (portraitMobile ? 0.74 : 1.05)
  const x =
    Math.sin(orbitAngle) * orbitRadiusX * radiusJitterX +
    Math.cos(eraAnchorAngle) * constellationTilt
  const y =
    Math.cos(orbitAngle) * orbitRadiusY * radiusJitterY +
    Math.sin(eraAnchorAngle) * constellationTilt +
    verticalJitter
  const z = screenOrbitCenterZ - (offset + depthJitter) * stepZ
  const distanceToCamera = Math.max(1, cameraPosition[2] - z)
  const yaw = Math.atan2(-x, distanceToCamera) * 0.84
  const pitch = Math.atan2(y, distanceToCamera) * 0.58
  const depthScale = Math.max(0.56, 1 - depth * 0.045)

  return {
    x,
    y,
    z,
    pitch,
    yaw,
    roll: Math.sin(orbitAngle) * 0.04,
    scale: (portraitMobile ? 0.82 : 1) * depthScale,
    depth,
  }
}

function getSelectedScreenTarget(selectedIndex: number, visualSelectedIndex: number) {
  const star = getTimelineStarTarget(selectedIndex, visualSelectedIndex)
  const lift = portraitMobile ? 0.44 : 0.58

  return {
    ...star,
    x: star.x * 0.72,
    y: star.y * 0.72 + lift,
    z: star.z + 0.46,
    scale: portraitMobile ? 0.72 : 0.9,
  }
}

function updateSelectedScreen(selectedIndex: number, ease: number) {
  if (!selectedScreenNode || selectedScreenIndex < 0 || selectedScreenIndex >= screens.length) {
    selectedScreenInitialized = false
    return
  }

  const visualSelectedIndex = getRestedScreenIndex(selectedIndex)
  const target = getSelectedScreenTarget(selectedScreenIndex, visualSelectedIndex)
  targetScreenEuler.set(target.pitch, target.yaw, target.roll)
  targetScreenQuaternion.setFromEuler(targetScreenEuler)

  if (!selectedScreenInitialized) {
    selectedScreenNode.position.set(target.x, target.y, target.z)
    selectedScreenNode.quaternion.copy(targetScreenQuaternion)
    selectedScreenNode.scale.setScalar(target.scale)
    selectedScreenInitialized = true
    return
  }

  selectedScreenNode.position.x += (target.x - selectedScreenNode.position.x) * ease
  selectedScreenNode.position.y += (target.y - selectedScreenNode.position.y) * ease
  selectedScreenNode.position.z += (target.z - selectedScreenNode.position.z) * ease
  selectedScreenNode.quaternion.slerp(targetScreenQuaternion, ease)
  selectedScreenNode.scale.setScalar(selectedScreenNode.scale.x + (target.scale - selectedScreenNode.scale.x) * ease)
}

function syncProjectedStarPositions(selectedIndex: number) {
  if (!camera || !starRail || typeof window === 'undefined') return

  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  world?.updateMatrixWorld(true)
  starRail.updateMatrixWorld(true)

  const positions = loadedStarIndexes
    .map(index => {
      const star = getTimelineStarTarget(index, selectedIndex)

      projectedStarPosition.set(star.x, star.y, star.z)
      projectedStarPosition.applyMatrix4(starRail.matrixWorld)
      projectedStarPosition.project(camera)

      const visible =
        projectedStarPosition.z > -1 &&
        projectedStarPosition.z < 1 &&
        Math.abs(projectedStarPosition.x) <= 1.2 &&
        Math.abs(projectedStarPosition.y) <= 1.2
      const projectable = projectedStarPosition.z > -1 && projectedStarPosition.z < 1
      const targetSize = Math.max(
        portraitMobile ? 42 : 46,
        Math.min(portraitMobile ? 68 : 76, (portraitMobile ? 56 : 62) * star.scale),
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
  const pointerX = Number.isFinite(input.x) ? input.x : 0
  const pointerY = Number.isFinite(input.y) ? input.y : 0
  const selectedIndex = Number.isFinite(input.wheel) ? input.wheel : 0
  if (camera) camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2])

  if (world) {
    world.rotation.x += (-pointerY * 0.085 - world.rotation.x) * ease
    world.rotation.y += (pointerX * 0.12 - world.rotation.y) * ease
    world.position.x += (pointerX * 0.1 - world.position.x) * ease
    world.position.y += (-pointerY * 0.055 - world.position.y) * ease
  }

  if (starColumn) {
    starColumn.position.x += (starColumnPosition[0] - starColumn.position.x) * ease
    starColumn.position.y += (starColumnPosition[1] - starColumn.position.y) * ease
    starColumn.position.z += (starColumnPosition[2] - starColumn.position.z) * ease
    starColumn.rotation.x = Math.PI / 2 + Math.sin(time * 0.18) * 0.035
    starColumn.rotation.y = pointerX * 0.08
    starColumn.rotation.z = 0
  }

  if (screenRail) {
    screenRail.rotation.z += (-input.dragX * 0.08 - screenRail.rotation.z) * ease
    screenRail.rotation.x += (input.dragY * 0.08 - screenRail.rotation.x) * ease
    screenRail.position.x = railPosition[0]
    screenRail.position.y = railPosition[1]
    screenRail.position.z = railPosition[2]
  }

  if (starRail) {
    starRail.rotation.z += (-input.dragX * 0.08 - starRail.rotation.z) * ease
    starRail.rotation.x += (input.dragY * 0.08 - starRail.rotation.x) * ease
    starRail.position.x = railPosition[0]
    starRail.position.y = railPosition[1]
    starRail.position.z = railPosition[2]
  }

  updateSelectedScreen(selectedIndex, ease)
  syncProjectedStarPositions(selectedIndex)
})
</script>

<T.PerspectiveCamera bind:ref={camera} makeDefault position={cameraPosition} fov={cameraFov} />

<T.Group bind:ref={world} position={[0, 0, 0]} scale={[sceneScale, sceneScale, sceneScale]}>
  <T.Group bind:ref={starRail} position={railPosition}>
    {#each screens as screen, index}
      {#if loadedStarIndexSet.has(index)}
        {@const star = getTimelineStarTarget(index, input.wheel)}
        {@const starActive = index === selectedScreenIndex || index === hoveredScreenIndex}
        <T.Group position={[star.x, star.y, star.z]} scale={[star.scale, star.scale, star.scale]}>
          <T.Sprite scale={starActive ? [1.1, 1.1, 1.1] : [0.52, 0.52, 0.52]}>
            <T.SpriteMaterial
              map={timelineStarTexture}
              color={starActive ? activeStarColor : starColor}
              transparent={true}
              blending={additiveBlending}
              depthWrite={false}
            />
          </T.Sprite>
          <T.Sprite scale={starActive ? [1.74, 1.74, 1.74] : [0.74, 0.74, 0.74]}>
            <T.SpriteMaterial
              map={timelineStarTexture}
              color={starGlowColor}
              transparent={true}
              blending={additiveBlending}
              depthWrite={false}
            />
          </T.Sprite>
        </T.Group>
      {/if}
    {/each}
  </T.Group>

  <T.Group bind:ref={screenRail} position={railPosition}>
    {#if selectedScreenIndex >= 0 && screens[selectedScreenIndex]}
      <T.Group bind:ref={selectedScreenNode}>
        <HomeIntroScreenPanel
          index={selectedScreenIndex}
          stillSrc={screens[selectedScreenIndex].stillSrc}
          videoSrc={screens[selectedScreenIndex].videoSrc}
          kicker={screens[selectedScreenIndex].kicker}
          title={screens[selectedScreenIndex].title}
          stat={screens[selectedScreenIndex].stat}
          ctaLabel={screens[selectedScreenIndex].ctaLabel}
          hovered={selectedScreenIndex === hoveredScreenIndex}
          primary={true}
          active={true}
          shouldLoadMedia={true}
          {sceneQuality}
          />
      </T.Group>
    {/if}
  </T.Group>

  <T.Group bind:ref={starColumn} position={starColumnPosition} scale={starColumnScale}>
    <HomeIntroParticleField
      {particles}
      {input}
      wheel={input.wheel * backgroundParticleTravelRate}
      scrollStep={effectScrollStepY}
      scrollSpan={particleScrollSpan}
      atmosphereReveal={1}
      axialSpinSpeed={0.018}
      axialSpinInputScale={-0.07}
      pointSizeScale={0.3}
      opacityScale={1}
    />
  </T.Group>
</T.Group>
