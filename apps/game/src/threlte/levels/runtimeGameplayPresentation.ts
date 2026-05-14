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

function resolveFireflyNumberSetting(
  node: RuntimeGameplayRenderNode,
  field: string,
  fallbackValue: number,
  minimumValue?: number,
) {
  const authored = node.gameplay?.[field]
  const resolved =
    typeof authored === 'number' && Number.isFinite(authored)
      ? authored
      : fallbackValue
  return minimumValue === undefined
    ? resolved
    : Math.max(minimumValue, resolved)
}

function resolveFireflyBooleanSetting(
  node: RuntimeGameplayRenderNode,
  field: string,
  fallbackValue: boolean,
) {
  const authored = node.gameplay?.[field]
  return typeof authored === 'boolean' ? authored : fallbackValue
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
  const baseColor = authoredColor ?? '#ff4658'

  return {
    baseColor,
    lightIntensity: resolveFireflyNumberSetting(node, 'lightIntensity', 1.15),
    lightDistance: resolveFireflyNumberSetting(node, 'lightDistance', 4.6),
    lightDecay: resolveFireflyNumberSetting(node, 'lightDecay', 1.25),
    spriteIntensity: resolveFireflyNumberSetting(node, 'spriteIntensity', 1.15),
    lightBurstBoost: resolveFireflyNumberSetting(
      node,
      'lightBurstBoost',
      1,
      0,
    ),
    twinkleSpeed: resolveFireflyNumberSetting(node, 'twinkleSpeed', 0.9),
    hoverHeight: resolveFireflyNumberSetting(node, 'hoverHeight', 0.28),
    bobAmplitude: resolveFireflyNumberSetting(node, 'bobAmplitude', 0.08),
    bobSpeed: resolveFireflyNumberSetting(node, 'bobSpeed', 0.55),
    wanderEnabled: resolveFireflyBooleanSetting(node, 'wanderEnabled', true),
    wanderRadius: resolveFireflyNumberSetting(node, 'wanderRadius', 0.16),
    wanderSpeed: resolveFireflyNumberSetting(node, 'wanderSpeed', 0.18),
    selectionLightBoost: resolveFireflyNumberSetting(
      node,
      'selectionLightBoost',
      3,
      0,
    ),
    lightBurstSpriteBoost: resolveFireflyNumberSetting(
      node,
      'lightBurstSpriteBoost',
      0.55,
      0,
    ),
    shockwaveEnabled: supportsShockwaveFireflyIgnition(node),
  }
}
