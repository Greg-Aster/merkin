import type { RuntimeGameplayRenderNode } from '../engine/runtimeGameplayTypes'

export interface RuntimeFireflyPresentation {
  baseColor: string
  lightIntensity: number
  lightDistance: number
  lightDecay: number
  spriteIntensity: number
  lightBurstBoost: number
  twinkleSpeed: number
  hoverHeight: number
  bobAmplitude: number
  bobSpeed: number
  wanderEnabled: boolean
  wanderRadius: number
  wanderSpeed: number
  selectionLightBoost: number
  lightBurstSpriteBoost: number
  shockwaveEnabled: boolean
}

function isLegacySolitudeFirefly(node: RuntimeGameplayRenderNode) {
  return node.gameplay?.type === 'firefly' && node.id.startsWith('solitude-')
}

function isLegacyYggdrasilFirefly(node: RuntimeGameplayRenderNode) {
  return node.gameplay?.type === 'firefly' && node.id.startsWith('yggdrasil-')
}

function isLegacySolitudeHeroFirefly(node: RuntimeGameplayRenderNode) {
  return node.id === 'solitude-firefly'
}

function resolveLegacyFireflySetting<T>(
  node: RuntimeGameplayRenderNode,
  authored: T | undefined,
  legacyValue: T,
  tunedValue: T,
  fallbackValue: T,
) {
  if (
    isLegacySolitudeFirefly(node) &&
    (authored === undefined || authored === legacyValue)
  ) {
    return tunedValue
  }
  return authored ?? fallbackValue
}

function resolveFireflyLightIntensity(node: RuntimeGameplayRenderNode) {
  if (isLegacyYggdrasilFirefly(node)) {
    return resolveLegacyFireflySetting(
      node,
      node.gameplay?.lightIntensity,
      4,
      0.32,
      0.32,
    )
  }
  if (isLegacySolitudeHeroFirefly(node)) {
    return resolveLegacyFireflySetting(
      node,
      node.gameplay?.lightIntensity,
      5,
      1.45,
      1.15,
    )
  }
  return resolveLegacyFireflySetting(
    node,
    node.gameplay?.lightIntensity,
    4,
    1.15,
    1.15,
  )
}

function resolveFireflyLightDistance(node: RuntimeGameplayRenderNode) {
  if (isLegacyYggdrasilFirefly(node)) {
    return resolveLegacyFireflySetting(
      node,
      node.gameplay?.lightDistance,
      6,
      2.2,
      2.2,
    )
  }
  if (isLegacySolitudeHeroFirefly(node)) {
    return resolveLegacyFireflySetting(
      node,
      node.gameplay?.lightDistance,
      2,
      4.6,
      4.6,
    )
  }
  return resolveLegacyFireflySetting(
    node,
    node.gameplay?.lightDistance,
    6,
    4.6,
    4.6,
  )
}

function resolveFireflyLightDecay(node: RuntimeGameplayRenderNode) {
  if (isLegacyYggdrasilFirefly(node)) {
    return resolveLegacyFireflySetting(
      node,
      node.gameplay?.lightDecay,
      1.6,
      1.9,
      1.9,
    )
  }
  if (isLegacySolitudeHeroFirefly(node)) {
    return resolveLegacyFireflySetting(
      node,
      node.gameplay?.lightDecay,
      2,
      1.25,
      1.25,
    )
  }
  return resolveLegacyFireflySetting(
    node,
    node.gameplay?.lightDecay,
    1.6,
    1.25,
    1.25,
  )
}

function resolveFireflySpriteIntensity(node: RuntimeGameplayRenderNode) {
  if (isLegacyYggdrasilFirefly(node)) {
    return resolveLegacyFireflySetting(
      node,
      node.gameplay?.spriteIntensity,
      0.95,
      0.72,
      0.72,
    )
  }
  if (isLegacySolitudeHeroFirefly(node)) {
    return resolveLegacyFireflySetting(
      node,
      node.gameplay?.spriteIntensity,
      1.95,
      1.2,
      1.15,
    )
  }
  return resolveLegacyFireflySetting(
    node,
    node.gameplay?.spriteIntensity,
    0.95,
    1.15,
    1.15,
  )
}

function resolveFireflyLightBurstBoost(node: RuntimeGameplayRenderNode) {
  const authored = node.gameplay?.lightBurstBoost
  if (typeof authored === 'number' && Number.isFinite(authored)) {
    return Math.max(0, authored)
  }
  if (isLegacySolitudeHeroFirefly(node)) return 1.75
  if (isLegacyYggdrasilFirefly(node)) return 0.38
  if (isLegacySolitudeFirefly(node)) return 1.4
  return 1
}

function supportsShockwaveFireflyIgnition(node: RuntimeGameplayRenderNode) {
  if (node.gameplay?.type !== 'firefly') return false
  const author = (node.gameplay.author ?? '').toLowerCase()
  const name = (node.name ?? '').toLowerCase()
  return (
    node.id.includes('pillar-firefly') ||
    author.includes('pillar firefly') ||
    name.includes('pillar')
  )
}

export function getRuntimeNodeAnimationPhase(id: string) {
  return (
    Array.from(id).reduce(
      (accumulator, character) => accumulator + character.charCodeAt(0),
      0,
    ) * 0.0175
  )
}

export function resolveRuntimeFireflyPresentation(
  node: RuntimeGameplayRenderNode,
): RuntimeFireflyPresentation {
  const authoredColor = node.gameplay?.markerColor
  const baseColor =
    isLegacySolitudeFirefly(node) &&
    (!authoredColor || authoredColor === '#f5f1a8')
      ? '#ff4658'
      : authoredColor ?? '#ff4658'

  return {
    baseColor,
    lightIntensity: resolveFireflyLightIntensity(node),
    lightDistance: resolveFireflyLightDistance(node),
    lightDecay: resolveFireflyLightDecay(node),
    spriteIntensity: resolveFireflySpriteIntensity(node),
    lightBurstBoost: resolveFireflyLightBurstBoost(node),
    twinkleSpeed: isLegacySolitudeHeroFirefly(node)
      ? resolveLegacyFireflySetting(
          node,
          node.gameplay?.twinkleSpeed,
          0.5,
          0.9,
          0.9,
        )
      : resolveLegacyFireflySetting(
          node,
          node.gameplay?.twinkleSpeed,
          1.6,
          0.9,
          0.9,
        ),
    hoverHeight: resolveLegacyFireflySetting(
      node,
      node.gameplay?.hoverHeight,
      0.36,
      0.28,
      0.28,
    ),
    bobAmplitude: resolveLegacyFireflySetting(
      node,
      node.gameplay?.bobAmplitude,
      0.14,
      0.08,
      0.08,
    ),
    bobSpeed: resolveLegacyFireflySetting(
      node,
      node.gameplay?.bobSpeed,
      1.4,
      0.55,
      0.55,
    ),
    wanderEnabled: resolveLegacyFireflySetting(
      node,
      node.gameplay?.wanderEnabled,
      false,
      true,
      true,
    ),
    wanderRadius: resolveLegacyFireflySetting(
      node,
      node.gameplay?.wanderRadius,
      0.35,
      0.16,
      0.16,
    ),
    wanderSpeed: resolveLegacyFireflySetting(
      node,
      node.gameplay?.wanderSpeed,
      0.45,
      0.18,
      0.18,
    ),
    selectionLightBoost: isLegacyYggdrasilFirefly(node) ? 0.65 : 3,
    lightBurstSpriteBoost: isLegacyYggdrasilFirefly(node) ? 0.18 : 0.55,
    shockwaveEnabled: supportsShockwaveFireflyIgnition(node),
  }
}
