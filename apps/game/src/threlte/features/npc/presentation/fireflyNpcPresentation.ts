import type {
  NpcBehaviorConfig,
  NpcComponent,
  NpcFireflyPresentationConfig,
} from '../../../engine/npcTypes'

export interface ResolvedFireflyNpcPresentation {
  color: string
  secondaryColor: string
  size: number
  spriteIntensity: number
  lightIntensity: number
  lightDistance: number
  lightDecay: number
  twinkleSpeed: number
  selectionLightBoost: number
  lightBurstSpriteBoost: number
  lightBudgeted: boolean
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

export function resolveFireflyNpcPresentation(
  npc: NpcComponent,
): ResolvedFireflyNpcPresentation | null {
  if (!isFireflyNpcPresentation(npc.presentation)) return null

  const presentation = npc.presentation
  const behavior = npc.behavior
  const hoverWander = isHoverWanderBehavior(behavior) ? behavior : null

  return {
    color: presentation.color,
    secondaryColor: presentation.secondaryColor ?? presentation.color,
    size: finiteNumberOrDefault(presentation.size, 0.58, 0),
    spriteIntensity: finiteNumberOrDefault(
      presentation.spriteIntensity,
      1.15,
      0,
    ),
    lightIntensity: finiteNumberOrDefault(presentation.lightIntensity, 1.15, 0),
    lightDistance: finiteNumberOrDefault(presentation.lightDistance, 4.6, 0),
    lightDecay: finiteNumberOrDefault(presentation.lightDecay, 1.25, 0),
    twinkleSpeed: finiteNumberOrDefault(presentation.twinkleSpeed, 0.9, 0),
    selectionLightBoost: finiteNumberOrDefault(
      presentation.selectionLightBoost,
      1,
      0,
    ),
    lightBurstSpriteBoost: finiteNumberOrDefault(
      presentation.lightBurstSpriteBoost,
      0.3,
      0,
    ),
    lightBudgeted: presentation.lightBudgeted ?? true,
    hoverHeight: finiteNumberOrDefault(hoverWander?.hoverHeight, 0.28),
    bobAmplitude: finiteNumberOrDefault(hoverWander?.bobAmplitude, 0.08, 0),
    bobSpeed: finiteNumberOrDefault(hoverWander?.bobSpeed, 0.55, 0),
    wanderRadius: finiteNumberOrDefault(hoverWander?.radius, 0, 0),
    wanderSpeed: finiteNumberOrDefault(hoverWander?.speed, 0, 0),
    wanderEnabled: hoverWander !== null && hoverWander.radius > 0,
  }
}
