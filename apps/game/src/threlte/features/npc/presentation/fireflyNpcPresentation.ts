import type {
  NpcBehaviorConfig,
  NpcComponent,
  NpcFireflyPresentationConfig,
} from '../../../engine/npcTypes'
import {
  DEFAULT_SCENE_FIREFLY_LIGHTING,
  type ResolvedSceneFireflyLighting,
} from '../../../engine/sceneFireflyField'

export interface ResolvedFireflyNpcPresentation {
  color: string
  secondaryColor: string
  size: number
  spriteIntensity: number
  lightIntensity: number
  lightDistance: number
  lightDecay: number
  minimumLightIntensityScale: number
  pulseThreshold: number
  pulseSoftness: number
  activeLightPercent: number
  blinkPeriodSecondsMin: number
  blinkPeriodSecondsMax: number
  blinkFadeSeconds: number
  populationId?: string
  populationIndex?: number
  populationCount?: number
  lightPhase?: number
  twinkleSpeed: number
  lightBurstBoost: number
  selectionLightBoost: number
  lightBurstSpriteBoost: number
  lightBudgeted: boolean
  shockwaveEnabled: boolean
  hoverHeight: number
  bobAmplitude: number
  bobSpeed: number
  wanderRadius: number
  wanderSpeed: number
  wanderEnabled: boolean
}

function finiteNumberOrDefault(
  value: number | null | undefined,
  fallback: number,
  min?: number,
) {
  const resolved = Number.isFinite(value) ? Number(value) : fallback
  return min === undefined ? resolved : Math.max(min, resolved)
}

function isHoverWanderBehavior(
  behavior: NpcBehaviorConfig | undefined,
): behavior is Extract<NpcBehaviorConfig, { type: 'hover-wander' }> {
  return behavior?.type === 'hover-wander'
}

export function isFireflyNpcPresentation(
  presentation: NpcComponent['presentation'] | undefined,
): presentation is NpcFireflyPresentationConfig {
  return presentation?.type === 'firefly'
}

export function getNpcPresentationAnimationPhase(id: string) {
  return (
    Array.from(id).reduce(
      (accumulator, character) => accumulator + character.charCodeAt(0),
      0,
    ) * 0.0175
  )
}

export function getNpcPresentationStableUnit(id: string, salt: string) {
  const stableKey = `${id}:${salt}`
  let hash = 2166136261
  for (let index = 0; index < stableKey.length; index += 1) {
    hash ^= stableKey.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

export function resolveFireflyNpcPresentation(
  npc: NpcComponent,
  fireflyLighting: ResolvedSceneFireflyLighting = DEFAULT_SCENE_FIREFLY_LIGHTING,
): ResolvedFireflyNpcPresentation | null {
  if (!isFireflyNpcPresentation(npc.presentation)) return null

  const presentation = npc.presentation
  const behavior = npc.behavior
  const hoverWander = isHoverWanderBehavior(behavior) ? behavior : null

  return {
    color: presentation.color,
    secondaryColor: presentation.secondaryColor ?? presentation.color,
    size: finiteNumberOrDefault(presentation.size, 0.58, 0),
    spriteIntensity: fireflyLighting.spriteIntensity,
    lightIntensity: fireflyLighting.lightIntensity,
    lightDistance: fireflyLighting.lightDistance,
    lightDecay: fireflyLighting.lightDecay,
    minimumLightIntensityScale: fireflyLighting.minimumLightIntensityScale,
    pulseThreshold: fireflyLighting.pulseThreshold,
    pulseSoftness: fireflyLighting.pulseSoftness,
    activeLightPercent: fireflyLighting.activeLightPercent,
    blinkPeriodSecondsMin: fireflyLighting.blinkPeriodSecondsMin,
    blinkPeriodSecondsMax: fireflyLighting.blinkPeriodSecondsMax,
    blinkFadeSeconds: fireflyLighting.blinkFadeSeconds,
    populationId: presentation.populationId,
    populationIndex: presentation.populationIndex,
    populationCount: presentation.populationCount,
    lightPhase: presentation.lightPhase,
    twinkleSpeed: finiteNumberOrDefault(presentation.twinkleSpeed, 0.9, 0),
    lightBurstBoost: finiteNumberOrDefault(presentation.lightBurstBoost, 1, 0),
    selectionLightBoost: finiteNumberOrDefault(
      presentation.selectionLightBoost,
      3,
      0,
    ),
    lightBurstSpriteBoost: finiteNumberOrDefault(
      presentation.lightBurstSpriteBoost,
      0.55,
      0,
    ),
    lightBudgeted: fireflyLighting.lightBudgeted,
    shockwaveEnabled: presentation.shockwaveEnabled ?? false,
    hoverHeight: finiteNumberOrDefault(hoverWander?.hoverHeight, 0.28),
    bobAmplitude: finiteNumberOrDefault(hoverWander?.bobAmplitude, 0.08, 0),
    bobSpeed: finiteNumberOrDefault(hoverWander?.bobSpeed, 0.55, 0),
    wanderRadius: finiteNumberOrDefault(hoverWander?.radius, 0, 0),
    wanderSpeed: finiteNumberOrDefault(hoverWander?.speed, 0, 0),
    wanderEnabled: hoverWander !== null && hoverWander.radius > 0,
  }
}
