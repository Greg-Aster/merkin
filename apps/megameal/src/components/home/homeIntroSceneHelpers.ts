import { homeIntroParticleClusters } from './homeIntroParticleClusters'
import { hashHomeIntroUnit } from './homeIntroSceneMath'
import { homeIntroScreens } from './homeIntroScreens'

export const HOME_INTRO_PARTICLE_COUNT = 1250
export const HOME_INTRO_PARTICLE_SIZE_MULTIPLIER = 2.18
export const HOME_INTRO_SCREEN_ORBIT_RADIUS_X = 5.25
export const HOME_INTRO_SCREEN_ORBIT_RADIUS_Z = 3.75
export const HOME_INTRO_SCREEN_ORBIT_CENTER_Z = -0.72
export const HOME_INTRO_SCREEN_STEP_Y = 2.24
export const HOME_INTRO_SCREEN_ANGLE_STEP = 0.9

const particleClusterCount = homeIntroParticleClusters.length

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function smoothstep(value: number): number {
  const normalized = clamp01(value)
  return normalized * normalized * (3 - normalized * 2)
}

export function createHomeIntroParticle(index: number) {
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
      HOME_INTRO_PARTICLE_SIZE_MULTIPLIER,
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

export function createHomeIntroParticles(count: number) {
  return Array.from(
    { length: Math.min(count, HOME_INTRO_PARTICLE_COUNT) },
    (_, index) => createHomeIntroParticle(index),
  )
}

type HomeIntroScreenEntry = (typeof homeIntroScreens)[number] & {
  stillSrc?: string
  webglStillSrc?: string
  ktx2StillSrc?: string
}

export function buildHomeIntroScreenDescriptors(primaryScreenIndex = 0) {
  return (homeIntroScreens as readonly HomeIntroScreenEntry[]).map(
    (screen, index) => ({
      position: [0, 0, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
      sceneId: screen.sceneId,
      kicker: screen.kicker,
      title: screen.title,
      description: screen.description,
      stat: screen.stat,
      ctaLabel: screen.ctaLabel,
      stillSrc: screen.webglStillSrc ?? screen.stillSrc ?? '',
      ktx2Src: screen.ktx2StillSrc ?? '',
      videoSrc: screen.videoSrc,
      primary: index === primaryScreenIndex,
    }),
  )
}

export function getHomeIntroScreenOrbitTarget(
  index: number,
  visualSelectedIndex: number,
  portraitMobile: boolean,
) {
  const offset = index - visualSelectedIndex
  const depth = Math.abs(offset)
  const spiral = offset * HOME_INTRO_SCREEN_ANGLE_STEP
  const orbitRadiusX =
    HOME_INTRO_SCREEN_ORBIT_RADIUS_X * (portraitMobile ? 0.68 : 1)
  const orbitRadiusZ =
    HOME_INTRO_SCREEN_ORBIT_RADIUS_Z * (portraitMobile ? 0.72 : 1)
  const stepY = HOME_INTRO_SCREEN_STEP_Y * (portraitMobile ? 0.88 : 1)
  const x = Math.sin(spiral) * orbitRadiusX
  const y = -offset * stepY
  const z =
    HOME_INTRO_SCREEN_ORBIT_CENTER_Z + Math.cos(spiral) * orbitRadiusZ - depth * 0.08
  const outwardYaw = Math.atan2(
    x / orbitRadiusX,
    (z - HOME_INTRO_SCREEN_ORBIT_CENTER_Z) / orbitRadiusZ,
  )
  const pitch = Math.sin(spiral) * -0.025
  const roll = Math.sin(spiral) * 0.018
  const scale = (portraitMobile ? [1.18, 1.18, 1.18] : [1.12, 1.12, 1.12]) as [
    number,
    number,
    number,
  ]

  return { x, y, z, pitch, yaw: outwardYaw, roll, scale }
}

export function getHomeIntroBannerSelectedIndex(
  selectedIndex: number,
  revealValue: number,
): number {
  const reveal = clamp01(Number.isFinite(revealValue) ? revealValue : 0)
  if (selectedIndex < 1) {
    return Math.max(0, Math.min(1, Math.max(selectedIndex, reveal)))
  }
  return selectedIndex
}
