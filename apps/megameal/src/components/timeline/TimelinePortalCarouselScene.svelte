<script lang="ts">
import { T, useTask, useThrelte } from '@threlte/core'
import { createEventDispatcher, onMount } from 'svelte'
import type * as THREE from 'three'
import { AdditiveBlending, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three'
import HomeIntroParticleField from '../home/HomeIntroParticleField.svelte'
import { hashHomeIntroUnit } from '../home/homeIntroSceneMath'
import TimelineTemporalEffects from './TimelineTemporalEffects.svelte'
import type { TimelineAutopilotPhase } from './timelinePortalFlight'
import type {
  TimelineCarouselInput,
  TimelineCarouselScreen,
} from './timelinePortalCarouselModel'
import { getEraMarkerColor } from './timelinePortalCarouselModel'
import { createTimelineParticles } from './timelineParticles'
import type { TimelineStarScreenPosition } from './timelinePortalPresentation'
import { getTimelineOrbitTexture } from './timelineStarTextures'
import {
  getTimelineStarHash as getStarHash,
  getTimelineStarHitScale,
  getTimelineStarVisual,
} from './timelineStarVisuals'

type TimelineViewMode = 'travel' | 'map'

export let input: TimelineCarouselInput
export let screens: TimelineCarouselScreen[] = []
export let selectedScreenIndex = -1
export let hoveredScreenIndex = -1
export let viewMode: TimelineViewMode = 'travel'
export let ambientOrbitEnabled = true
export let visitedScreenIndexes: number[] = []
export let travelEffectStrength = 0
export let autopilotPhase: TimelineAutopilotPhase = 'manual'

const dispatch = createEventDispatcher<{
  starpositions: { positions: TimelineStarScreenPosition[] }
}>()

let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera | null = null
let travelCamera: THREE.PerspectiveCamera | null = null
let mapCamera: THREE.OrthographicCamera | null = null
let world: THREE.Group | null = null
let starRail: THREE.Group | null = null
let starColumn: THREE.Group | null = null
let portraitMobile = false
let viewportAspect = 16 / 9
let activeStarIntensities: number[] = []
let timelineStarTargets: ReturnType<typeof getTimelineStarTarget>[] = []
let timelineStarVisuals: ReturnType<typeof getTimelineStarVisual>[] = []
let sceneFrameSignature = ''
let sceneFramePending = true, ambientMapOrbitTime = 0
let currentTravelEffectStrength = 0

const screenOrbitRadiusX = 5.65
const screenOrbitRadiusY = 3.85
const screenOrbitCenterZ = -2.42
const screenStepZ = 1.28
const starAngleVariance = 0.92
const starRadiusVariance = 0.48
const starVerticalVariance = 0.72
const starDepthVariance = 0.42
const effectScrollStepY = screenStepZ * 2.35
const particleScrollSpan = 48
const mapTimelineDepthScale = 8.5
const mapDesktopTimelineDepthScale = 15.5
const mapStarXScale = 10
const mapEraLaneSpread = 150
const mapDesktopLaneSpread = 320
const mapPortraitVerticalOffset = 165
const mapOrbitMaxYaw = 0.62
const mapOrbitMaxPitch = 0.38
const additiveBlending = AdditiveBlending
const timelineOrbitTexture = getTimelineOrbitTexture()
const projectedStarPosition = new Vector3()
let lastProjectedStarPositionSignature = ''
const { camera: defaultCamera, invalidate, size: canvasSize } = useThrelte()

$: sceneScale = portraitMobile ? 0.78 : 1
$: camera = viewMode === 'map' ? mapCamera : travelCamera
$: cameraPosition = portraitMobile
  ? ([0, 0.2, 8.85] as [number, number, number])
  : ([0, 0.08, 6.8] as [number, number, number])
$: cameraFov = portraitMobile ? 48 : 44
$: railPosition = portraitMobile
  ? ([0, 0.08, -0.58] as [number, number, number])
  : ([0, 0, -0.34] as [number, number, number])
$: mapCameraFrame = getTimelineMapCameraFrame()
$: mapCameraPosition = getTimelineMapCameraPosition()
$: activeCameraPosition = input ? getCameraTimelinePosition(input.wheel) : cameraPosition
$: starColumnPosition = portraitMobile
  ? ([0, 0.02, -1.1] as [number, number, number])
  : ([0, 0, -1.18] as [number, number, number])
$: starColumnScale = portraitMobile
  ? ([2.16, 2.22, 1.38] as [number, number, number])
  : ([2.08, 2.52, 1.54] as [number, number, number])
$: timelineStarIndexes = screens.map((_, index) => index)
$: visitedScreenIndexSet = new Set(visitedScreenIndexes)
$: activeStarIntensities = screens.map((_, index) =>
  index === selectedScreenIndex || index === hoveredScreenIndex ? 1 : 0,
)
$: timelineStarTargets = timelineStarIndexes.map(index =>
  getTimelineStarTarget(index, input.wheel, viewMode, portraitMobile),
)
$: timelineStarVisuals = screens.map((screen, index) =>
  getTimelineStarVisual(
    index,
    screen,
    activeStarIntensities[index] ?? 0,
    visitedScreenIndexSet.has(index),
    0,
  ),
)
$: sceneFrameSignature = [
  input.wheel,
  input.panX,
  input.panY,
  input.mapZoom,
  input.mapOrbitX,
  input.mapOrbitY,
  input.active,
  viewMode,
  ambientOrbitEnabled,
  travelEffectStrength,
  visitedScreenIndexes.join(','),
  portraitMobile,
  viewportAspect,
  screens.length,
].join('|')
$: if (sceneFrameSignature && camera) {
  defaultCamera.set(camera)
  scheduleSceneFrame()
}

function syncViewportMode(width: number, height: number) {
  if (width <= 0 || height <= 0) return
  portraitMobile =
    typeof window !== 'undefined'
      ? window.innerWidth <= 760 && window.innerHeight > window.innerWidth
      : width <= 760 && height > width
  viewportAspect = Math.max(0.4, width / height)
}

const particles = createTimelineParticles()

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

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getMapZoom() {
  return clampValue(Number.isFinite(input?.mapZoom) ? input.mapZoom : 1, 0.55, 2.8)
}

function getMapOrbitX() {
  return clampValue(Number.isFinite(input?.mapOrbitX) ? input.mapOrbitX : 0, -1, 1)
}

function getMapOrbitY() {
  return clampValue(Number.isFinite(input?.mapOrbitY) ? input.mapOrbitY : 0, -1, 1)
}

function getTimelineMapCameraFrame() {
  const stepZ = getTimelineStepZ() * (portraitMobile ? mapTimelineDepthScale : mapDesktopTimelineDepthScale)
  const timelineSpan = Math.max(1, screens.length - 1) * stepZ

  if (!portraitMobile) {
    const baseWidth = Math.max(timelineSpan + 190, 720)
    const baseHeight = Math.max(baseWidth / Math.max(viewportAspect, 0.4), mapDesktopLaneSpread + 180, 360)
    const height = baseHeight / getMapZoom()
    const width = height * viewportAspect

    return { width, height, centerX: 0, centerY: 0 }
  }

  const starFieldWidth = screenOrbitRadiusX * 5.4
  const depthFrame = timelineSpan + 7.5
  const widthFrame = starFieldWidth / Math.max(viewportAspect, 0.4)
  const baseHeight = Math.max(18, depthFrame, widthFrame) * 1.26
  const height = baseHeight / getMapZoom()
  const width = height * viewportAspect

  return {
    width,
    height,
    centerX: 0,
    centerY: screenOrbitCenterZ - timelineSpan / 2 + mapPortraitVerticalOffset,
  }
}

function getTimelineMapCameraPosition(frame = mapCameraFrame) {
  const panX = Number.isFinite(input?.panX) ? input.panX : 0
  const panY = Number.isFinite(input?.panY) ? input.panY : 0
  const panScale = 0.34

  return [
    frame.centerX + railPosition[0] + panX * frame.width * panScale,
    frame.centerY + panY * frame.height * panScale,
    620,
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

function getTimelineStarTarget(
  index: number,
  visualSelectedIndex: number,
  currentViewMode: TimelineViewMode,
  isPortraitMobile: boolean,
) {
  const offset = index - visualSelectedIndex
  const depth = Math.abs(offset)
  const anchor = getTimelineStarAnchor(index)
  if (currentViewMode === 'map') {
    if (!isPortraitMobile) {
      const desktopTimelineStep = getTimelineStepZ() * mapDesktopTimelineDepthScale
      const timelineSpan = Math.max(1, screens.length - 1) * desktopTimelineStep
      const eraLane = (getEraHash(getScreenEraKey(index), 887) - 0.5) * mapDesktopLaneSpread
      const localJitterX = (getStarHash(index, 4567) - 0.5) * 28
      const localJitterY = (getStarHash(index, 4889) - 0.5) * 38
      const localDepth = (getStarHash(index, 6043) - 0.5) * 26

      return {
        x: -timelineSpan / 2 + index * desktopTimelineStep + anchor.x * 2.8 + localJitterX,
        y: anchor.y * 17 + eraLane + localJitterY,
        z: localDepth + anchor.x * 1.6,
        pitch: 0,
        yaw: 0,
        roll: 0,
        scale: 10.4,
        depth,
      }
    }

    const responsiveXScale = mapStarXScale * 0.68
    const responsiveLaneSpread = mapEraLaneSpread * 0.58
    const eraLane = (getEraHash(getScreenEraKey(index), 887) - 0.5) * responsiveLaneSpread
    const localJitter = (getStarHash(index, 4567) - 0.5) * 12
    const localDepth = (getStarHash(index, 6043) - 0.5) * 22

    return {
      x: anchor.x * responsiveXScale + anchor.y * 0.72 + eraLane + localJitter,
      y: screenOrbitCenterZ - index * getTimelineStepZ() * mapTimelineDepthScale + mapPortraitVerticalOffset,
      z: localDepth + anchor.x * 1.8,
      pitch: 0,
      yaw: 0,
      roll: 0,
      scale: isPortraitMobile ? 8.2 : 10.4,
      depth,
    }
  }

  const cameraTimelinePosition = getCameraTimelinePosition(visualSelectedIndex)
  const cameraLocalX = cameraTimelinePosition[0] - railPosition[0]
  const cameraLocalY = cameraTimelinePosition[1] - railPosition[1]
  const cameraLocalZ = cameraTimelinePosition[2] - railPosition[2]
  const deltaX = cameraLocalX - anchor.x
  const deltaZ = cameraLocalZ - anchor.z
  const distanceToCamera = Math.max(1, Math.hypot(deltaX, deltaZ))
  const yaw = Math.atan2(deltaX, deltaZ) * 0.84
  const pitch = Math.atan2(anchor.y - cameraLocalY, distanceToCamera) * 0.58
  const depthScale =
    currentViewMode === 'map' ? 1 : Math.max(0.56, 1 - depth * 0.045)

  return {
    x: anchor.x,
    y: anchor.y,
    z: anchor.z,
    pitch,
    yaw,
    roll: Math.sin(anchor.orbitAngle) * 0.04,
    scale: (isPortraitMobile ? 0.82 : 1) * depthScale,
    depth,
  }
}

function syncProjectedStarPositions() {
  if (!camera || !starRail || typeof window === 'undefined') return

  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  world?.updateMatrixWorld(true)
  starRail.updateMatrixWorld(true)

  const positions = timelineStarIndexes
    .map(index => {
      const star = timelineStarTargets[index]
      if (!star) return null

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
    .filter((position): position is TimelineStarScreenPosition => position !== null)

  const signature = positions
    .map(position => `${position.index}:${position.x.toFixed(1)}:${position.y.toFixed(1)}:${position.size.toFixed(1)}:${position.visible ? 1 : 0}`)
    .join('|')

  if (signature === lastProjectedStarPositionSignature) return
  lastProjectedStarPositionSignature = signature
  dispatch('starpositions', { positions })
}

onMount(() => {
  syncViewportMode(canvasSize.current.width, canvasSize.current.height)
  const unsubscribeCanvasSize = canvasSize.subscribe(({ width, height }) => {
    syncViewportMode(width, height)
    scheduleSceneFrame()
  })
  let initialFrame = window.requestAnimationFrame(() => {
    initialFrame = window.requestAnimationFrame(scheduleSceneFrame)
  })

  return () => {
    window.cancelAnimationFrame(initialFrame)
    unsubscribeCanvasSize()
  }
})

useTask(delta => {
  const ambientOrbitAvailable = viewMode === 'map' && ambientOrbitEnabled
  const shouldAdvanceAmbientOrbit = ambientOrbitAvailable && !input.active
  const targetTravelEffectStrength = viewMode === 'travel'
    ? clampValue(travelEffectStrength, 0, 1)
    : 0
  const travelEffectSettling =
    Math.abs(targetTravelEffectStrength - currentTravelEffectStrength) > 0.002
  if (
    (!sceneFramePending && !shouldAdvanceAmbientOrbit && !travelEffectSettling) ||
    !camera ||
    !starRail
  ) return
  if (shouldAdvanceAmbientOrbit) ambientMapOrbitTime += Math.min(delta, 0.05)
  const travelEffectEase = 1 - Math.exp(-Math.min(delta, 0.05) * 5.4)
  currentTravelEffectStrength +=
    (targetTravelEffectStrength - currentTravelEffectStrength) * travelEffectEase
  if (Math.abs(targetTravelEffectStrength - currentTravelEffectStrength) <= 0.002) {
    currentTravelEffectStrength = targetTravelEffectStrength
  }

  const selectedIndex = Number.isFinite(input.wheel) ? input.wheel : 0
  const targetCameraPosition = getCameraTimelinePosition(selectedIndex)

  if (camera) {
    if (viewMode === 'map') {
      const currentMapCameraFrame = getTimelineMapCameraFrame()
      const currentMapCameraPosition = getTimelineMapCameraPosition(currentMapCameraFrame)
      camera.position.set(currentMapCameraPosition[0], currentMapCameraPosition[1], currentMapCameraPosition[2])
      camera.rotation.set(0, 0, 0)
      if (camera instanceof OrthographicCamera) {
        camera.left = -currentMapCameraFrame.width / 2
        camera.right = currentMapCameraFrame.width / 2
        camera.top = currentMapCameraFrame.height / 2
        camera.bottom = -currentMapCameraFrame.height / 2
        camera.zoom = 1
        camera.updateProjectionMatrix()
      }
    } else {
      camera.position.set(targetCameraPosition[0], targetCameraPosition[1], targetCameraPosition[2])
      camera.rotation.set(
        0,
        0,
        -input.panX * 0.012 - currentTravelEffectStrength * 0.007,
      )
      if (camera instanceof PerspectiveCamera) {
        const nextFov = cameraFov + currentTravelEffectStrength * 8
        if (Math.abs(camera.fov - nextFov) > 0.01) {
          camera.fov = nextFov
          camera.updateProjectionMatrix()
        }
      }
    }
  }

  if (world) {
    world.rotation.set(0, 0, 0)
    world.position.set(0, 0, 0)
  }

  if (starColumn) {
    starColumn.position.set(...starColumnPosition)
    starColumn.rotation.set(Math.PI / 2, 0, 0)
    starColumn.scale.set(
      starColumnScale[0] * (1 - currentTravelEffectStrength * 0.05),
      starColumnScale[1] * (1 + currentTravelEffectStrength * 1.45),
      starColumnScale[2] * (1 - currentTravelEffectStrength * 0.04),
    )
  }

  if (starRail) {
    const ambientPitch = ambientOrbitAvailable ? Math.sin(ambientMapOrbitTime * 0.09) * 0.035 : 0
    const ambientYaw = ambientOrbitAvailable ? Math.sin(ambientMapOrbitTime * 0.12 + 0.55) * 0.22 : 0
    const targetRailRotationX = viewMode === 'map' ? -getMapOrbitY() * mapOrbitMaxPitch + ambientPitch : 0
    const targetRailRotationY = viewMode === 'map' ? getMapOrbitX() * mapOrbitMaxYaw + ambientYaw : 0

    starRail.rotation.set(targetRailRotationX, targetRailRotationY, 0)
    starRail.position.set(...railPosition)
  }

  syncProjectedStarPositions()
  sceneFramePending = false
  if (
    shouldAdvanceAmbientOrbit ||
    Math.abs(targetTravelEffectStrength - currentTravelEffectStrength) > 0.002
  ) scheduleSceneFrame()
}, { autoInvalidate: false })

function scheduleSceneFrame() {
  sceneFramePending = true
  invalidate()
}
</script>

<T.OrthographicCamera
  bind:ref={mapCamera}
  manual={true}
  position={mapCameraPosition}
  rotation={[0, 0, 0]}
  left={-mapCameraFrame.width / 2}
  right={mapCameraFrame.width / 2}
  top={mapCameraFrame.height / 2}
  bottom={-mapCameraFrame.height / 2}
  zoom={1}
  near={0.1}
  far={1600}
/>
<T.PerspectiveCamera
  bind:ref={travelCamera}
  position={activeCameraPosition}
  fov={cameraFov}
/>

<T.Group bind:ref={world} position={[0, 0, 0]} scale={[sceneScale, sceneScale, sceneScale]}>
  <T.Group bind:ref={starRail} position={railPosition}>
    {#each screens as screen, index}
      {@const star = timelineStarTargets[index]}
      {@const starVisual = timelineStarVisuals[index]}
      {#if star && starVisual}
      <T.Group position={[star.x, star.y, star.z]} scale={[star.scale, star.scale, star.scale]}>
        {#if timelineOrbitTexture}
          <T.Sprite scale={starVisual.orbitScale}>
            <T.SpriteMaterial
              map={timelineOrbitTexture}
              color={starVisual.glowColor}
              rotation={starVisual.orbitRotation}
              opacity={starVisual.orbitOpacity}
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
      {/if}
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
      pointSizeScale={0.3}
      motionEnabled={false}
    />
  </T.Group>
</T.Group>

<TimelineTemporalEffects
  cameraPosition={activeCameraPosition}
  target={timelineStarTargets[selectedScreenIndex] ?? null}
  {railPosition}
  {sceneScale}
  effectStrength={travelEffectStrength}
  {autopilotPhase}
  eraAccent={getEraMarkerColor(screens[selectedScreenIndex]?.eraKey ?? 'unknown')}
  viewMode={viewMode}
  motionEnabled={ambientOrbitEnabled}
  {portraitMobile}
/>
