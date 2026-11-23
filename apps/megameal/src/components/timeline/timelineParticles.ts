import { homeIntroParticleClusters } from '../home/homeIntroParticleClusters'
import { hashHomeIntroUnit } from '../home/homeIntroSceneMath'

export function createTimelineParticles(count = 1200, sizeMultiplier = 2.18) {
  const clusterCount = homeIntroParticleClusters.length

  return Array.from({ length: count }, (_, index) => {
    const cluster = index % clusterCount
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
    const radius =
      clusterCenter.spread * (0.1 + radialT * (0.82 + strayT * 1.45))

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
        sizeMultiplier,
      hueOffset: clusterCenter.hue + randomD * 0.08,
      shape: randomE,
      strayT,
      zOffset:
        Math.cos(verticalAngle) *
        clusterCenter.spread *
        (randomD - 0.5) *
        (0.72 + strayT * 0.56),
    }
  })
}
