<script lang="ts">
import { siteSfxManager } from '@/utils/site-sfx'
import { T, useTask } from '@threlte/core'
import { onMount } from 'svelte'
import { Euler, Quaternion, Vector3 } from 'three'
import type * as THREE from 'three'
import HomeIntroLogoModel from './HomeIntroLogoModel.svelte'
import HomeIntroParticleField from './HomeIntroParticleField.svelte'
import HomeIntroRingGlow from './HomeIntroRingGlow.svelte'
import HomeIntroSceneBackdrop from './HomeIntroSceneBackdrop.svelte'
import { homeIntroParticleClusters } from './homeIntroParticleClusters'
import { hashHomeIntroUnit } from './homeIntroSceneMath'
import {
  getHomeIntroBannerSyncEvent,
  getHomeIntroRestedScreenIndex,
  homeIntroIntroOffsetScreens,
  homeIntroScreens,
  homeIntroWheelToScreenRatio,
} from './homeIntroScreens'

type IntroInputState = {
  x: number
  y: number
  dragX: number
  dragY: number
  wheel: number
  reveal: number
  introOffsetScreens: number
  active: boolean
}

type SceneQuality = 'high' | 'balanced' | 'lean'
type ScreenPanelComponent =
  typeof import('./HomeIntroScreenPanel.svelte').default

export let input: IntroInputState
export let titleImageSrc = ''
export let sceneQuality: SceneQuality = 'high'
export let onLogoReady: (() => void) | undefined
export let hoveredScreenIndex = -1
export let portalVisible = true
export let motionEnabled = true
export let logoEffectsEnabled = true

let world: THREE.Group | null = null
let camera: THREE.PerspectiveCamera | null = null
let emblem: THREE.Group | null = null
let ringGlowA: THREE.Group | null = null
let ringGlowB: THREE.Group | null = null
let ringGlowC: THREE.Group | null = null
let logoMeshRoot: THREE.Group | null = null
let logoSearchLightA: THREE.SpotLight | null = null
let logoSearchTargetA: THREE.Group | null = null
let starColumn: THREE.Group | null = null
let screenRail: THREE.Group | null = null
const screenNodes: THREE.Group[] = []
let portraitMobile = false
let particleLimit = 1250
let introParticleLimit = 560
let particleExpansionElapsed = 0
let logoIntroStartedAt = 0
let atmosphereReveal = 0
let carouselMounted = false
let carouselComponentReady = false
let ScreenPanel: ScreenPanelComponent | null = null
let carouselComponentPromise: Promise<void> | null = null
let screenOrbitInitialized = false
let logoImpactSfxIntroStartedAt = 0
let portalIntroReadyDispatched = false

const particleCount = 1250
const particleExpansionChunk = 64
const particleExpansionInterval = 0.14
const particleSizeMultiplier = 2.18
const particleClusterCount = homeIntroParticleClusters.length
const primaryScreenIndex = 0
const screenOrbitRadiusX = 5.25
const screenOrbitRadiusZ = 3.75
const screenOrbitCenterZ = -0.72
const screenStepY = 2.24
const screenAngleStep = 0.9
const effectScrollStepY = screenStepY * homeIntroWheelToScreenRatio
const particleScrollSpan = 48
const logoEmitterOffsetY = -1.22
const logoEmitterParticleScrollRatio = 0.16
const screenPanelMountOverscan = 2.25
const targetScreenEuler = new Euler(0, 0, 0, 'YXZ')
const targetScreenQuaternion = new Quaternion()
const logoLightTarget = new Vector3(0, 0, -1.05)
const logoSearchLightPosition = new Vector3()
const logoIntroDuration = 2.05
const logoImpactDuration = 0.42
const logoRotationOffset = Math.PI
const portalLightTransmissionScale = 0.48
const logoFloatPitchAmplitude = 0.038
const logoFloatYawAmplitude = 0.064
const logoFloatRollAmplitude = 0.026
const logoFloatScaleAmplitude = 0.012
const fullLogoAtlasSrc = '/assets/sprites/sprite-rest-atlas.webp'
const leanLogoAtlasSrc = '/assets/sprites/sprite-rest-atlas-lean.webp'
let activeBannerSyncKey = ''
let effectWheel = 0
let activeScreenIndex = primaryScreenIndex
const portalScreens = homeIntroScreens
const screenCount = portalScreens.length
let screenMediaLoadStates = Array.from(
  { length: screenCount },
  (_, index) => index === primaryScreenIndex,
)
let screenPanelMountStates = Array.from(
  { length: screenCount },
  (_, index) => index === primaryScreenIndex,
)

$: sceneScale = portraitMobile ? 0.78 : 1
$: cameraPosition = portraitMobile
  ? ([0, 0.2, 8.85] as [number, number, number])
  : ([0, 0.08, 6.8] as [number, number, number])
$: cameraFov = portraitMobile ? 48 : 44
$: railPosition = portraitMobile
  ? ([0, 0.46, -0.68] as [number, number, number])
  : ([0, 0, -0.34] as [number, number, number])
$: starColumnPosition = portraitMobile
  ? ([0, 0.08, -2.02] as [number, number, number])
  : ([0, 0, -1.86] as [number, number, number])
$: starColumnScale = portraitMobile
  ? ([1.82, 1, 1.14] as [number, number, number])
  : ([1.38, 1, 1.06] as [number, number, number])
$: sceneBackdropSrc =
  portalScreens[activeScreenIndex]?.webglStillSrc ??
  portalScreens[activeScreenIndex]?.stillSrc ??
  ''
$: sceneBackdropPosition = portraitMobile
  ? ([0, 0.08, -4.4] as [number, number, number])
  : ([0, 0, -4.2] as [number, number, number])
$: sceneBackdropSize = portraitMobile
  ? ([8.2, 12.4] as [number, number])
  : ([16, 9] as [number, number])
$: particleDensityMultiplier =
  sceneQuality === 'lean' ? 1.1 : sceneQuality === 'balanced' ? 1.55 : 1.8
$: emblemScale = portraitMobile
  ? ([3.64, 3.64, 3.64] as [number, number, number])
  : ([3.98, 3.98, 3.98] as [number, number, number])
$: emblemBaseY = portraitMobile ? 0.08 : -0.04
$: logoIntroStartPosition = portraitMobile
  ? ([0, 0.2, 2.65] as [number, number, number])
  : ([0, 0.08, 1.9] as [number, number, number])
$: logoAtlasSrc = sceneQuality === 'lean' ? leanLogoAtlasSrc : fullLogoAtlasSrc
$: particleLimit =
  sceneQuality === 'lean'
    ? portraitMobile
      ? 260
      : 360
    : sceneQuality === 'balanced'
      ? 820
      : particleCount
$: introParticleLimit =
  sceneQuality === 'lean'
    ? particleLimit
    : sceneQuality === 'balanced'
      ? 420
      : 560

function syncViewportMode() {
  if (typeof window === 'undefined') return
  portraitMobile =
    window.innerWidth <= 760 && window.innerHeight > window.innerWidth
}

function shouldMountCarousel() {
  const wheel = Number.isFinite(input.wheel) ? input.wheel : 0
  const reveal = Number.isFinite(input.reveal) ? input.reveal : 0

  return input.active || reveal > 0.01 || Math.abs(wheel) > 0.02
}

function mountCarousel() {
  if (carouselMounted) return

  carouselMounted = true
  screenOrbitInitialized = false
  particleExpansionElapsed = 0
  void loadCarouselComponent()
}

function loadCarouselComponent() {
  carouselComponentPromise ??= import('./HomeIntroScreenPanel.svelte')
    .then(screenPanelModule => {
      primeScreenLayoutForCurrentWheel()
      ScreenPanel = screenPanelModule.default
      carouselComponentReady = true
    })
    .catch(error => {
      carouselMounted = false
      carouselComponentReady = false
      console.error('Failed to load portal carousel:', error)
    })

  return carouselComponentPromise
}

function playLogoImpactSfx(introStartedAt: number) {
  if (
    typeof window === 'undefined' ||
    !introStartedAt ||
    logoImpactSfxIntroStartedAt === introStartedAt
  ) {
    return
  }

  logoImpactSfxIntroStartedAt = introStartedAt
  siteSfxManager.playIfUnlocked('portal-impact')
}

function dispatchPortalIntroReady() {
  if (typeof window === 'undefined' || portalIntroReadyDispatched) return

  portalIntroReadyDispatched = true
  document.documentElement.dataset.megamealPortalIntroReady = 'true'
  window.dispatchEvent(
    new CustomEvent('megameal:portal-intro-ready', {
      detail: {
        phase: 'logo-settled',
      },
    }),
  )
}

function handleLogoReady() {
  if (!logoIntroStartedAt) {
    logoIntroStartedAt = performance.now() * 0.001
  }

  onLogoReady?.()
}

onMount(() => {
  syncViewportMode()
  window.addEventListener('resize', syncViewportMode)

  return () => {
    window.removeEventListener('resize', syncViewportMode)
    delete document.documentElement.dataset.megamealPortalIntroReady
  }
})

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
  const strayT = randomE > 0.68 ? ((randomE - 0.68) / 0.32) ** 0.72 : 0
  const edgeAngle = randomF * Math.PI * 2
  const radius = clusterCenter.spread * (0.1 + radialT * (0.82 + strayT * 1.75))
  const anchorX =
    clusterCenter.x * (1 - strayT * 0.48) + Math.cos(edgeAngle) * strayT * 3.6
  const anchorZ = clusterCenter.z + Math.sin(edgeAngle) * strayT * 1.6

  return {
    anchorX,
    anchorY: clusterCenter.y,
    anchorZ,
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
    zOffset:
      Math.cos(verticalAngle) *
      clusterCenter.spread *
      (randomD - 0.5) *
      (0.72 + strayT * 0.56),
  }
}

function createParticles(count: number) {
  return Array.from({ length: Math.min(count, particleCount) }, (_, index) =>
    createParticle(index),
  )
}

let particles = createParticles(introParticleLimit)

const screens = Array.from({ length: screenCount }, (_, index) => {
  return {
    position: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    scale: 1,
    sceneId: portalScreens[index].sceneId,
    kicker: portalScreens[index].kicker,
    title: portalScreens[index].title,
    description: portalScreens[index].description,
    stat: portalScreens[index].stat,
    ctaLabel: portalScreens[index].ctaLabel,
    stillSrc:
      portalScreens[index].webglStillSrc ?? portalScreens[index].stillSrc,
    ktx2Src: portalScreens[index].ktx2StillSrc ?? '',
    videoSrc: portalScreens[index].videoSrc,
    primary: index === primaryScreenIndex,
  }
})
$: syncParticleBudget(carouselMounted ? particles.length : introParticleLimit)
$: visibleParticles = particles

function syncParticleBudget(nextLimit: number) {
  const targetLimit = Math.min(nextLimit, particleCount)
  if (particles.length === targetLimit) return

  if (particles.length > targetLimit) {
    particles = particles.slice(0, targetLimit)
    return
  }

  const nextParticles = particles.slice()
  for (let index = particles.length; index < targetLimit; index += 1) {
    nextParticles.push(createParticle(index))
  }
  particles = nextParticles
}

function updateParticleExpansion(delta: number) {
  const targetLimit = carouselMounted ? particleLimit : introParticleLimit

  if (particles.length > targetLimit) {
    syncParticleBudget(targetLimit)
    return
  }

  if (!carouselMounted || particles.length >= targetLimit) return

  particleExpansionElapsed += delta
  if (particleExpansionElapsed < particleExpansionInterval) return

  const chunks = Math.floor(
    particleExpansionElapsed / particleExpansionInterval,
  )
  particleExpansionElapsed -= chunks * particleExpansionInterval
  syncParticleBudget(
    Math.min(targetLimit, particles.length + particleExpansionChunk * chunks),
  )
}

function clampScreenIndex(value: number) {
  return Math.min(screenCount - 1, Math.max(0, value))
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(value: number) {
  const normalized = clamp01(value)
  return normalized * normalized * (3 - normalized * 2)
}

function updateLogoSearchLight(
  light: THREE.SpotLight | null,
  target: THREE.Group | null,
  time: number,
  phase: number,
  intensity: number,
  radiusX: number,
  radiusY: number,
  frontOffset: number,
) {
  if (!light || !target) return

  const drift = time * 0.24 + phase
  const sweep = time * 0.11 + phase * 0.7
  const targetX = logoLightTarget.x + Math.cos(sweep) * 0.18
  const targetY = logoLightTarget.y + Math.sin(sweep) * 0.14

  target.position.set(targetX, targetY, logoLightTarget.z)
  logoSearchLightPosition.set(
    logoLightTarget.x + Math.cos(drift) * radiusX,
    logoLightTarget.y + 0.42 + Math.sin(drift) * radiusY,
    logoLightTarget.z + frontOffset,
  )
  light.position.copy(logoSearchLightPosition)
  light.intensity = atmosphereReveal * intensity * portalLightTransmissionScale

  if (light.target !== target) {
    light.target = target
  }
}

function getIntroOffsetScreens() {
  return Number.isFinite(input.introOffsetScreens)
    ? input.introOffsetScreens
    : homeIntroIntroOffsetScreens
}

function getSelectedScreenIndex(wheel: number) {
  const introOffsetScreens = getIntroOffsetScreens()

  return (
    primaryScreenIndex +
    wheel * homeIntroWheelToScreenRatio -
    introOffsetScreens
  )
}

function getBannerSelectedScreenIndex(selectedIndex: number) {
  const reveal = clamp01(Number.isFinite(input.reveal) ? input.reveal : 0)

  if (selectedIndex < 1) {
    return Math.max(0, Math.min(1, Math.max(selectedIndex, reveal)))
  }

  return selectedIndex
}

function syncBannerToFrontScreen(selectedIndex: number) {
  if (typeof window === 'undefined') return

  const syncEvent = getHomeIntroBannerSyncEvent(selectedIndex)
  if (!syncEvent || syncEvent.syncKey === activeBannerSyncKey) return

  activeBannerSyncKey = syncEvent.syncKey
  window.dispatchEvent(
    new CustomEvent('merkin:banner-select-scene', {
      detail: syncEvent.detail,
    }),
  )
}

function syncScreenMediaLoadStates(selectedIndex: number) {
  let changed = false
  const activeIndex = clampScreenIndex(Math.round(selectedIndex))
  const next = screenMediaLoadStates.map((loaded, index) => {
    const shouldLoad =
      loaded ||
      index === primaryScreenIndex ||
      index === activeIndex ||
      Math.abs(index - selectedIndex) <= 1.15

    if (shouldLoad !== loaded) changed = true
    return shouldLoad
  })

  if (changed) {
    screenMediaLoadStates = next
  }
}

function syncScreenPanelMountStates(selectedIndex: number) {
  let changed = false
  const activeIndex = clampScreenIndex(Math.round(selectedIndex))
  const next = screenPanelMountStates.map((mounted, index) => {
    const shouldMount =
      index === primaryScreenIndex ||
      index === activeIndex ||
      Math.abs(index - selectedIndex) <= screenPanelMountOverscan

    if (shouldMount !== mounted) changed = true
    return shouldMount
  })

  if (changed) {
    screenPanelMountStates = next
  }
}

function getScreenOrbitTarget(index: number, visualSelectedIndex: number) {
  const offset = index - visualSelectedIndex
  const depth = Math.abs(offset)
  const spiral = offset * screenAngleStep
  const orbitRadiusX = screenOrbitRadiusX * (portraitMobile ? 0.52 : 1)
  const orbitRadiusZ = screenOrbitRadiusZ * (portraitMobile ? 0.76 : 1)
  const stepY = screenStepY * (portraitMobile ? 0.9 : 1)
  const x = Math.sin(spiral) * orbitRadiusX
  const y = -offset * stepY
  const z = screenOrbitCenterZ + Math.cos(spiral) * orbitRadiusZ - depth * 0.08
  const outwardYaw = Math.atan2(
    x / orbitRadiusX,
    (z - screenOrbitCenterZ) / orbitRadiusZ,
  )
  const pitch = Math.sin(spiral) * -0.025
  const roll = Math.sin(spiral) * 0.018
  const scale = portraitMobile ? 0.88 : 1.12

  return { x, y, z, pitch, yaw: outwardYaw, roll, scale }
}

function primeScreenLayoutForCurrentWheel() {
  const wheel = Number.isFinite(input.wheel) ? input.wheel : effectWheel
  const selectedIndex = getSelectedScreenIndex(wheel)
  const visualSelectedIndex = getHomeIntroRestedScreenIndex(selectedIndex)
  activeScreenIndex = clampScreenIndex(Math.round(selectedIndex))
  syncScreenMediaLoadStates(selectedIndex)
  syncScreenPanelMountStates(selectedIndex)

  screens.forEach((screen, index) => {
    const target = getScreenOrbitTarget(index, visualSelectedIndex)
    screen.position = [target.x, target.y, target.z]
    screen.rotation = [target.pitch, target.yaw, target.roll]
    screen.scale = target.scale
  })
}

function updateScreenOrbit(wheel: number, ease: number) {
  const selectedIndex = getSelectedScreenIndex(wheel)
  const visualSelectedIndex = getHomeIntroRestedScreenIndex(selectedIndex)
  activeScreenIndex = clampScreenIndex(Math.round(selectedIndex))
  syncBannerToFrontScreen(getBannerSelectedScreenIndex(selectedIndex))
  syncScreenMediaLoadStates(selectedIndex)
  syncScreenPanelMountStates(selectedIndex)
  const snapToTarget = !screenOrbitInitialized
  let positionedAnyScreen = false

  for (let index = 0; index < screenCount; index += 1) {
    const screen = screenNodes[index]
    if (!screen) continue

    const target = getScreenOrbitTarget(index, visualSelectedIndex)
    targetScreenEuler.set(target.pitch, target.yaw, target.roll)
    targetScreenQuaternion.setFromEuler(targetScreenEuler)
    positionedAnyScreen = true

    if (snapToTarget) {
      screen.position.set(target.x, target.y, target.z)
      screen.quaternion.copy(targetScreenQuaternion)
      screen.scale.setScalar(target.scale)
    } else {
      screen.position.x += (target.x - screen.position.x) * ease
      screen.position.y += (target.y - screen.position.y) * ease
      screen.position.z += (target.z - screen.position.z) * ease
      screen.quaternion.slerp(targetScreenQuaternion, ease)

      const scale = screen.scale.x + (target.scale - screen.scale.x) * ease
      screen.scale.setScalar(scale)
    }
  }

  if (snapToTarget && positionedAnyScreen) {
    screenOrbitInitialized = true
  }
}

useTask(delta => {
  if (!portalVisible) return

  const wheel = Number.isFinite(input.wheel) ? input.wheel : 0
  effectWheel = wheel
  const introOffsetScreens = getIntroOffsetScreens()
  const selectedIndex = getSelectedScreenIndex(effectWheel)
  syncBannerToFrontScreen(getBannerSelectedScreenIndex(selectedIndex))
  syncScreenMediaLoadStates(selectedIndex)
  syncScreenPanelMountStates(selectedIndex)
  if (!motionEnabled) return

  const time = performance.now() * 0.001
  const ease = 1 - Math.exp(-delta * 4.8)
  const pointerX = Number.isFinite(input.x) ? input.x : 0
  const pointerY = Number.isFinite(input.y) ? input.y : 0
  const visualSelectedIndex = getHomeIntroRestedScreenIndex(selectedIndex)
  const visualScrollScreens =
    visualSelectedIndex - primaryScreenIndex + introOffsetScreens
  const spiralPhase = visualSelectedIndex * screenAngleStep
  const logoCarouselPhase = visualScrollScreens * screenAngleStep
  const screenVerticalStep = screenStepY * (portraitMobile ? 0.9 : 1)
  const logoScrollRise = Math.max(0, visualScrollScreens) * screenVerticalStep
  const revealProgress = clamp01(
    Number.isFinite(input.reveal) ? input.reveal : 0,
  )
  const logoIntroElapsed = logoIntroStartedAt
    ? Math.max(0, time - logoIntroStartedAt)
    : 0
  const logoIntroRaw = clamp01(logoIntroElapsed / logoIntroDuration)
  const logoIntroDrop = logoIntroRaw
  const logoIntroScale = logoIntroRaw
  const logoImpactElapsed = logoIntroElapsed - logoIntroDuration
  const logoImpactRaw =
    logoImpactElapsed >= 0 ? clamp01(logoImpactElapsed / logoImpactDuration) : 1
  const logoImpactStrength =
    logoImpactElapsed >= 0 && logoImpactRaw < 1 ? (1 - logoImpactRaw) ** 2 : 0
  if (logoEffectsEnabled && logoImpactElapsed >= 0 && logoImpactRaw < 1) {
    playLogoImpactSfx(logoIntroStartedAt)
  }
  if (logoIntroRaw >= 1 && revealProgress < 0.08) {
    dispatchPortalIntroReady()
  }
  atmosphereReveal = smoothstep((logoIntroRaw - 0.72) / 0.28)
  activeScreenIndex = clampScreenIndex(Math.round(selectedIndex))

  if (!carouselMounted && shouldMountCarousel()) {
    mountCarousel()
  }
  updateParticleExpansion(delta)

  if (camera) {
    const shakeX =
      logoImpactStrength *
      (portraitMobile ? 0.045 : 0.035) *
      Math.sin(time * 82)
    const shakeY =
      logoImpactStrength *
      (portraitMobile ? 0.06 : 0.045) *
      Math.sin(time * 107)
    camera.position.set(
      cameraPosition[0] + shakeX,
      cameraPosition[1] + shakeY,
      cameraPosition[2],
    )
  }

  if (world) {
    world.rotation.x += (-pointerY * 0.085 - world.rotation.x) * ease
    world.rotation.y += (pointerX * 0.12 - world.rotation.y) * ease
    world.position.x += (pointerX * 0.1 - world.position.x) * ease
    world.position.y += (-pointerY * 0.055 - world.position.y) * ease
  }

  if (emblem) {
    const baseZ = portraitMobile ? -1.42 : -0.9
    const emblemRestY =
      emblemBaseY + logoScrollRise + Math.sin(time * 0.82) * 0.08
    const emblemTargetY =
      emblemBaseY + (emblemRestY - emblemBaseY) * logoIntroDrop
    emblem.rotation.x = Math.sin(time * 0.56) * 0.08 + input.dragY * 1.8
    emblem.rotation.y = spiralPhase + time * 0.18 + input.dragX * 2.6
    emblem.rotation.z = Math.sin(time * 0.32) * 0.045
    emblem.position.x += (0 - emblem.position.x) * ease
    emblem.position.y +=
      ((logoIntroRaw < 1 ? emblemTargetY : emblemRestY) - emblem.position.y) *
      ease
    emblem.position.z += (baseZ - emblem.position.z) * ease
  }

  if (logoMeshRoot) {
    const logoBaseY = portraitMobile ? 0.2 : 0.08
    const logoBaseZ = portraitMobile ? -1.45 : -1.05
    const logoFloatScale = portraitMobile ? 0.78 : 1
    const logoDriftX = Math.sin(time * 0.31) * (portraitMobile ? 0.026 : 0.038)
    const logoStartY = logoBaseY
    const logoStartZ = portraitMobile ? 2.65 : 1.9
    const logoRestY =
      logoBaseY +
      logoScrollRise +
      Math.sin(time * 0.38) * 0.052 * logoFloatScale
    const logoRestZ =
      logoBaseZ + Math.sin(time * 0.24 + 0.6) * 0.034 * logoFloatScale
    const logoTargetY = logoStartY + (logoRestY - logoStartY) * logoIntroDrop
    const logoTargetZ = logoStartZ + (logoRestZ - logoStartZ) * logoIntroDrop
    const logoTargetScale = 2.35 + (1 - 2.35) * logoIntroScale
    const logoFloatPitch =
      Math.sin(time * 0.34) * logoFloatPitchAmplitude * logoFloatScale
    const logoFloatYaw =
      Math.sin(time * 0.26 + 0.85) * logoFloatYawAmplitude * logoFloatScale
    const logoFloatRoll =
      Math.sin(time * 0.21 + 1.6) * logoFloatRollAmplitude * logoFloatScale
    const logoIdleScale =
      1 + Math.sin(time * 0.29 + 1.1) * logoFloatScaleAmplitude * logoFloatScale

    if (logoIntroRaw < 1) {
      logoMeshRoot.position.set(0, logoTargetY, logoTargetZ)
      logoMeshRoot.scale.setScalar(logoTargetScale)
    } else {
      logoMeshRoot.position.x += (logoDriftX - logoMeshRoot.position.x) * ease
      logoMeshRoot.position.y += (logoRestY - logoMeshRoot.position.y) * ease
      logoMeshRoot.position.z += (logoRestZ - logoMeshRoot.position.z) * ease
      logoMeshRoot.scale.setScalar(
        logoMeshRoot.scale.x + (logoIdleScale - logoMeshRoot.scale.x) * ease,
      )
    }
    logoMeshRoot.rotation.x =
      -0.075 - logoCarouselPhase * 0.075 + logoFloatPitch + input.dragY * 0.035
    logoMeshRoot.rotation.y =
      logoRotationOffset -
      logoCarouselPhase +
      logoFloatYaw +
      input.dragX * 0.035
    logoMeshRoot.rotation.z = 0.045 - logoCarouselPhase * 0.05 + logoFloatRoll
    logoMeshRoot.getWorldPosition(logoLightTarget)
  } else {
    logoLightTarget.set(0, 0, -1.05)
  }

  if (ringGlowA) ringGlowA.rotation.z += delta * 0.34
  if (ringGlowB) ringGlowB.rotation.x -= delta * 0.2
  if (ringGlowC) ringGlowC.rotation.y += delta * 0.26

  updateLogoSearchLight(
    logoSearchLightA,
    logoSearchTargetA,
    time,
    0,
    320,
    2.85,
    1.36,
    6.25,
  )

  if (starColumn) {
    const emitterTargetX =
      Math.sin(time * 0.31) * (portraitMobile ? 0.01 : 0.016)
    const emitterTargetY =
      railPosition[1] +
      logoScrollRise +
      logoEmitterOffsetY +
      Math.sin(time * 0.33) * 0.018
    const emitterTargetZ = portraitMobile ? -1.38 : -1.02

    if (logoIntroRaw < 1) {
      starColumn.position.set(emitterTargetX, emitterTargetY, emitterTargetZ)
    } else {
      starColumn.position.x += (emitterTargetX - starColumn.position.x) * ease
      starColumn.position.y += (emitterTargetY - starColumn.position.y) * ease
      starColumn.position.z += (emitterTargetZ - starColumn.position.z) * ease
    }

    starColumn.rotation.y = -spiralPhase + time * 0.055 - input.dragX * 0.5
    starColumn.rotation.z = Math.sin(time * 0.18) * 0.035
  }

  if (screenRail) {
    screenRail.rotation.y +=
      (revealProgress * -input.dragX * 0.24 - screenRail.rotation.y) * ease
    screenRail.position.x = railPosition[0]
    screenRail.position.y =
      railPosition[1] +
      Math.sin(time * 0.45) * 0.055 * revealProgress +
      effectWheel * 0.025 * revealProgress
    screenRail.position.z = railPosition[2]
    screenRail.scale.setScalar(1)
  }

  if (carouselComponentReady) {
    updateScreenOrbit(effectWheel, ease)
  }
})
</script>

<T.PerspectiveCamera bind:ref={camera} makeDefault position={cameraPosition} fov={cameraFov} />

<T.AmbientLight intensity={0.0} color="#dbeafe" />
<T.Group bind:ref={logoSearchTargetA} />
<T.SpotLight
	bind:ref={logoSearchLightA}
	color="#dff7ff"
	distance={16.5}
	decay={1.02}
	angle={0.9}
	penumbra={0.98}
/>

<T.Group bind:ref={world} position={[0, 0, 0]} scale={[sceneScale, sceneScale, sceneScale]}>
	<HomeIntroSceneBackdrop
		src={sceneBackdropSrc}
		position={sceneBackdropPosition}
		size={sceneBackdropSize}
	/>

	{#if carouselComponentReady && ScreenPanel}
		<T.Group bind:ref={screenRail} position={railPosition} visible={screenOrbitInitialized}>
			{#each screens as screen, index}
				<T.Group
					bind:ref={screenNodes[index]}
					position={screen.position}
					rotation={screen.rotation}
					scale={[screen.scale, screen.scale, screen.scale]}
				>
					{#if screenPanelMountStates[index]}
						<svelte:component
							this={ScreenPanel}
							{index}
							imageSrc={screen.primary ? titleImageSrc : ""}
							stillSrc={screen.stillSrc}
							ktx2Src={screen.ktx2Src}
							videoSrc={screen.videoSrc}
							kicker={screen.kicker}
							title={screen.title}
							description={screen.description}
							stat={screen.stat}
							ctaLabel={screen.ctaLabel}
							hovered={index === hoveredScreenIndex}
							primary={screen.primary}
							active={index === activeScreenIndex}
							shouldLoadMedia={screenMediaLoadStates[index]}
							{motionEnabled}
							{sceneQuality}
						/>
					{/if}
				</T.Group>
			{/each}
		</T.Group>
	{/if}

  <T.Group bind:ref={starColumn} position={starColumnPosition} scale={starColumnScale}>
		<HomeIntroParticleField
			particles={visibleParticles}
			{input}
			wheel={effectWheel * logoEmitterParticleScrollRatio}
			scrollStep={effectScrollStepY}
			scrollSpan={particleScrollSpan}
			{atmosphereReveal}
			densityMultiplier={particleDensityMultiplier}
			{motionEnabled}
		/>
	</T.Group>

	<T.Group bind:ref={emblem} position={[0, emblemBaseY, -2.28]} scale={emblemScale}>
		<T.Group bind:ref={ringGlowA} rotation={[Math.PI / 2, 0, 0]}>
			<HomeIntroRingGlow
				radius={0.86}
				count={0}
				color="#67e8f9"
				hueCycleBase={0.52}
				hueCycleSpeed={0.01}
				opacity={0.5}
				size={0.3}
				haloOpacity={1}
				emitter={true}
				emitterAngle={0.18}
				emitterSize={1.16}
				emitterOpacity={1}
				emitterFrontFacing={true}
				emitterFrontOffset={1.65}
				{atmosphereReveal}
				{motionEnabled}
			/>
		</T.Group>

		<T.Group bind:ref={ringGlowB} rotation={[0.32, Math.PI / 2, 0.26]}>
			<HomeIntroRingGlow
				radius={0.88}
				count={0}
				color="#8b5cf6"
				hueCycleBase={0.72}
				hueCycleSpeed={0.009}
				opacity={0.9}
				size={0.27}
				haloOpacity={1}
				emitter={true}
				emitterAngle={2.24}
				emitterSize={1.04}
				emitterOpacity={1}
				emitterFrontFacing={true}
				emitterFrontOffset={1.55}
				{atmosphereReveal}
				{motionEnabled}
			/>
		</T.Group>

		<T.Group bind:ref={ringGlowC} rotation={[0.76, 0.28, Math.PI / 2]}>
			<HomeIntroRingGlow
				radius={0.82}
				count={0}
				color="#a78bfa"
				hueCycleBase={0.78}
				hueCycleSpeed={0.008}
				opacity={0.9}
				size={0.24}
				haloOpacity={1}
				emitter={true}
				emitterAngle={4.18}
				emitterSize={0.94}
				emitterOpacity={1}
				emitterFrontFacing={true}
				emitterFrontOffset={1.45}
				{atmosphereReveal}
				{motionEnabled}
			/>
		</T.Group>

	</T.Group>
</T.Group>

<T.Group bind:ref={logoMeshRoot} position={logoIntroStartPosition} scale={[2.35, 2.35, 2.35]}>
	<T.Group>
		<HomeIntroLogoModel
			{sceneQuality}
			animatedAtlasSrc={logoAtlasSrc}
			animatedAtlasColumns={6}
			animatedAtlasRows={4}
			animatedAtlasFrames={23}
			animatedAtlasFps={6}
			animatedAtlasBlendMode="multiply"
			animatedAtlasIntensity={.7}
			animatedAtlasBaseIntensity={.7}
			animatedAtlasUvOffsetX={0}
			animatedAtlasUvOffsetY={0}
			animatedAtlasUvScaleX={.92}
			animatedAtlasUvScaleY={0.8}
			animatedAtlasUvFlipX={false}
			animatedAtlasUvFlipY={false}
			onReady={handleLogoReady}
		/>
	</T.Group>
</T.Group>
