<script lang="ts">
import { useTask } from '@threlte/core'
import { createEventDispatcher, onDestroy } from 'svelte'
import * as THREE from 'three'
import StarSprite from '../../../components/StarSprite.svelte'
import type { NpcComponent } from '../../../engine/npcTypes'
import {
  DEFAULT_SCENE_FIREFLY_LIGHTING,
  type ResolvedSceneFireflyLighting,
} from '../../../engine/sceneFireflyField'
import { activeConversationSession } from '../../conversation/runtime'
import ManagedLight from '../../lighting/ManagedLight.svelte'
import RuntimeNpcInteractionTarget from '../RuntimeNpcInteractionTarget.svelte'
import { npcInteractionEvents } from '../npcStateStore'
import type {
  RuntimeNpcActor,
  RuntimeNpcInteractionEvent,
  RuntimeNpcLightBurstEvent,
} from '../runtimeNpcTypes'
import {
  type ResolvedFireflyNpcPresentation,
  getNpcPresentationAnimationPhase,
  getNpcPresentationStableUnit,
  resolveFireflyNpcPresentation,
} from './fireflyNpcPresentation'

const dispatch = createEventDispatcher<{
  npcInteraction: RuntimeNpcInteractionEvent
}>()

export let actorId = ''
export let actor: RuntimeNpcActor | null = null
export let levelId = ''
export let npc: NpcComponent
export let fireflyLighting: ResolvedSceneFireflyLighting =
  DEFAULT_SCENE_FIREFLY_LIGHTING
export let selected = false
export let interactionSystem: any = null
export let interactiveEnabled = false

let animationTime = 0
let selectionBlend = 0
let interactionHovered = false
let lastStateInteractionEventId = ''
let interactionSelectedUntil = 0
let lightBurstGlow = 0
let shockwaveIgnited = false
let shockwaveIgnition = 0

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function smoothStep(value: number) {
  const resolved = clamp01(value)
  return resolved * resolved * (3 - 2 * resolved)
}

function getStableFireflyId() {
  return npc.id || actorId || 'firefly-npc'
}

function getNormalizedLightPhase(presentation: ResolvedFireflyNpcPresentation) {
  if (
    typeof presentation.lightPhase === 'number' &&
    Number.isFinite(presentation.lightPhase)
  ) {
    return ((presentation.lightPhase % 1) + 1) % 1
  }
  if (
    typeof presentation.populationIndex === 'number' &&
    Number.isFinite(presentation.populationIndex) &&
    typeof presentation.populationCount === 'number' &&
    Number.isFinite(presentation.populationCount) &&
    presentation.populationCount > 0
  ) {
    return (
      (((presentation.populationIndex / presentation.populationCount) % 1) +
        1) %
      1
    )
  }
  return getNpcPresentationStableUnit(getStableFireflyId(), 'blink-phase')
}

function getMotionOffset(
  presentation: ResolvedFireflyNpcPresentation,
): [number, number, number] {
  const phase = getNpcPresentationAnimationPhase(getStableFireflyId())

  return [
    presentation.wanderEnabled
      ? Math.sin(animationTime * presentation.wanderSpeed + phase) *
        presentation.wanderRadius
      : 0,
    presentation.hoverHeight +
      Math.sin(animationTime * presentation.bobSpeed + phase * 0.5) *
        presentation.bobAmplitude,
    presentation.wanderEnabled
      ? Math.cos(animationTime * presentation.wanderSpeed + phase) *
        presentation.wanderRadius
      : 0,
  ]
}

function getSpriteColor(presentation: ResolvedFireflyNpcPresentation) {
  const baseColor = new THREE.Color(presentation.color)
  if (presentation.shockwaveEnabled) {
    baseColor.lerp(new THREE.Color('#ff1830'), Math.min(1, shockwaveIgnition))
  }
  return `#${baseColor.getHexString()}`
}

function getLightDrivenSpriteIntensity(
  presentation: ResolvedFireflyNpcPresentation,
  pulse: number,
) {
  return (
    presentation.spriteIntensity *
    (0.52 + pulse * 0.82) *
    Math.min(1.35, Math.max(0.72, presentation.lightIntensity / 3.2))
  )
}

function getShockwaveBoost(presentation: ResolvedFireflyNpcPresentation) {
  return presentation.shockwaveEnabled ? presentation.lightBurstBoost : 1
}

function getShockwaveIntensityMultiplier(
  presentation: ResolvedFireflyNpcPresentation,
) {
  if (!presentation.shockwaveEnabled) return 1
  return 1 + shockwaveIgnition * 2.8 * getShockwaveBoost(presentation)
}

function getShockwaveDistanceMultiplier(
  presentation: ResolvedFireflyNpcPresentation,
) {
  if (!presentation.shockwaveEnabled) return 1
  return 1 + shockwaveIgnition * 1.1 * getShockwaveBoost(presentation)
}

function getShockwaveSpriteSizeMultiplier(
  presentation: ResolvedFireflyNpcPresentation,
) {
  if (!presentation.shockwaveEnabled) return 1
  return 1 + shockwaveIgnition * 0.55 * getShockwaveBoost(presentation)
}

function getShockwaveSpriteIntensity(
  presentation: ResolvedFireflyNpcPresentation,
  pulse: number,
) {
  const lightDrivenSpriteIntensity = getLightDrivenSpriteIntensity(
    presentation,
    pulse,
  )
  if (!presentation.shockwaveEnabled) return lightDrivenSpriteIntensity

  const shockwaveBoost = getShockwaveBoost(presentation)
  return Math.max(
    lightDrivenSpriteIntensity * (1 + shockwaveIgnition * 1.4 * shockwaveBoost),
    0.72 + shockwaveIgnition * 0.65 * shockwaveBoost,
  )
}

function getSpriteVisualIntensity(
  presentation: ResolvedFireflyNpcPresentation,
  pulse: number,
) {
  const shockwaveSpriteIntensity = getShockwaveSpriteIntensity(
    presentation,
    pulse,
  )
  return Math.max(
    interactionHovered
      ? Math.max(shockwaveSpriteIntensity * 1.2, 1.05)
      : shockwaveSpriteIntensity,
    shockwaveSpriteIntensity +
      lightBurstGlow * presentation.lightBurstSpriteBoost,
  )
}

function getFireflyPulse(presentation: ResolvedFireflyNpcPresentation) {
  const phase = getNpcPresentationAnimationPhase(getStableFireflyId())
  const wave =
    (Math.sin(animationTime * presentation.twinkleSpeed + phase) + 1) / 2
  const threshold = Math.max(0, Math.min(0.95, presentation.pulseThreshold))
  const softness = Math.max(0.01, Math.min(1, presentation.pulseSoftness))
  const normalized =
    threshold <= 0
      ? wave
      : Math.max(0, Math.min(1, (wave - threshold) / (1 - threshold)))
  const gated = normalized * normalized * (3 - 2 * normalized)
  return THREE.MathUtils.lerp(gated, wave, softness)
}

function getFireflyBlinkPeriod(presentation: ResolvedFireflyNpcPresentation) {
  const minPeriod = Math.max(0.25, presentation.blinkPeriodSecondsMin)
  const maxPeriod = Math.max(minPeriod, presentation.blinkPeriodSecondsMax)
  return THREE.MathUtils.lerp(
    minPeriod,
    maxPeriod,
    getNpcPresentationStableUnit(getStableFireflyId(), 'blink-period'),
  )
}

function getFireflyBlinkScale(presentation: ResolvedFireflyNpcPresentation) {
  const activeLightPercent = clamp01(presentation.activeLightPercent)
  if (activeLightPercent <= 0) return 0
  if (activeLightPercent >= 1) return 1

  const periodSeconds = getFireflyBlinkPeriod(presentation)
  const activeSeconds = Math.max(0, periodSeconds * activeLightPercent)
  if (activeSeconds <= 0) return 0

  const phaseSeconds = getNormalizedLightPhase(presentation) * periodSeconds
  const cycleTime = (animationTime + phaseSeconds) % periodSeconds
  if (cycleTime >= activeSeconds) return 0

  const fadeSeconds = Math.min(
    Math.max(0, presentation.blinkFadeSeconds),
    activeSeconds * 0.5,
  )
  if (fadeSeconds <= 0) return 1

  return Math.min(
    smoothStep(cycleTime / fadeSeconds),
    smoothStep((activeSeconds - cycleTime) / fadeSeconds),
  )
}

function getVisualPulse(
  presentation: ResolvedFireflyNpcPresentation,
  pulse: number,
  blinkScale: number,
) {
  if (clamp01(presentation.activeLightPercent) >= 1) return pulse
  return Math.max(pulse * 0.35, blinkScale)
}

function getLightIntensity(
  presentation: ResolvedFireflyNpcPresentation,
  pulse: number,
  blinkScale: number,
) {
  const baseGlow = Math.max(
    0,
    Math.min(1, presentation.minimumLightIntensityScale),
  )
  const pulseScale = baseGlow + (1 - baseGlow) * pulse * pulse
  const selectedBoost = 1 + selectionBlend * presentation.selectionLightBoost
  const hoverBoost = interactionHovered
    ? Math.max(presentation.lightIntensity * 1.18, presentation.lightIntensity)
    : presentation.lightIntensity
  return (
    hoverBoost *
    pulseScale *
    blinkScale *
    selectedBoost *
    getShockwaveIntensityMultiplier(presentation)
  )
}

function getLightDistance(
  presentation: ResolvedFireflyNpcPresentation,
  pulse: number,
  blinkScale: number,
) {
  return (
    presentation.lightDistance *
    (0.72 + pulse * 0.28) *
    (0.35 + blinkScale * 0.65) *
    getShockwaveDistanceMultiplier(presentation)
  )
}

function handleLightBurst(
  burst: RuntimeNpcLightBurstEvent,
  presentation: ResolvedFireflyNpcPresentation,
) {
  lightBurstGlow = Math.max(
    lightBurstGlow,
    (0.45 + burst.strength * 0.75) * presentation.lightBurstBoost,
  )
  if (presentation.shockwaveEnabled) {
    shockwaveIgnited = true
  }
}

useTask(delta => {
  animationTime += delta
  const latestInteraction = [...$npcInteractionEvents]
    .reverse()
    .find(event => event.npcId === npc.id && event.actorId === actorId)
  if (
    latestInteraction &&
    latestInteraction.id !== lastStateInteractionEventId
  ) {
    lastStateInteractionEventId = latestInteraction.id
    const readOnlyDuration =
      npc.conversation?.mode === 'read-only'
        ? npc.conversation.durationMs ?? 7000
        : npc.conversation?.mode === 'profile'
          ? npc.conversation.fallback?.durationMs ?? 7000
          : 7000
    interactionSelectedUntil = Date.now() + Math.max(250, readOnlyDuration)
  }
  lightBurstGlow = Math.max(0, lightBurstGlow - delta * 1.25)
  shockwaveIgnition = THREE.MathUtils.damp(
    shockwaveIgnition,
    shockwaveIgnited ? 1 : 0,
    4.5,
    delta,
  )
  const conversationSelected = $activeConversationSession?.npcId === npc.id
  const interactionSelected = interactionSelectedUntil > Date.now()
  const selectionTarget =
    selected ||
    interactionHovered ||
    conversationSelected ||
    interactionSelected
      ? 1
      : 0
  const selectionSpeed = selectionTarget > selectionBlend ? 7.5 : 5.5
  selectionBlend = THREE.MathUtils.damp(
    selectionBlend,
    selectionTarget,
    selectionSpeed,
    delta,
  )
})

$: presentation = resolveFireflyNpcPresentation(npc, fireflyLighting)

onDestroy(() => {
  interactionHovered = false
})
</script>

{#if presentation}
  {@const motionOffset = getMotionOffset(presentation)}
  {@const spriteColor = getSpriteColor(presentation)}
  {@const pulse = getFireflyPulse(presentation)}
  {@const blinkScale = getFireflyBlinkScale(presentation)}
  {@const visualPulse = getVisualPulse(presentation, pulse, blinkScale)}
  {@const lightPulse = pulse * blinkScale}
  {@const spriteVisualIntensity = getSpriteVisualIntensity(
    presentation,
    visualPulse,
  )}
  {@const spriteOpacityIntensity = Math.min(1, spriteVisualIntensity)}
  {@const lightIntensity = getLightIntensity(
    presentation,
    lightPulse,
    blinkScale,
  )}
  {@const lightDistance = getLightDistance(
    presentation,
    lightPulse,
    blinkScale,
  )}
  {@const shockwaveSpriteIntensity = getShockwaveSpriteIntensity(
    presentation,
    visualPulse,
  )}
  {@const shockwaveSizeMultiplier =
    getShockwaveSpriteSizeMultiplier(presentation)}
  {@const shouldRenderLight =
    lightIntensity > 0.001 && lightDistance > 0.001}
  {#if shouldRenderLight}
    <ManagedLight
      id={`npc-firefly-light-${npc.id || actorId}`}
      ownerId={npc.id || actorId}
      position={motionOffset}
      color={spriteColor}
      intensity={lightIntensity}
      distance={lightDistance}
      decay={presentation.lightDecay}
      runtimeBudgeted={presentation.lightBudgeted}
      budgetGroup="firefly-npc"
      priority={8 + lightPulse * 4 + selectionBlend * 12 + lightBurstGlow * 6}
      stableSelectionKey={`firefly-npc:${npc.id || actorId}`}
      selectionHint="firefly-npc"
    />
  {/if}
  <StarSprite
    position={motionOffset}
    color={spriteColor}
    size={presentation.size *
      (1 + lightBurstGlow * 0.08) *
      shockwaveSizeMultiplier}
    intensity={spriteOpacityIntensity}
    twinkleSpeed={presentation.twinkleSpeed}
    animationOffset={animationTime}
    starType="sparkle"
    isKeyElement={true}
    enableTwinkle={true}
    enableHoverScale={false}
    glowBoost={(1 + selectionBlend * 1.2 + (interactionHovered ? 0.25 : 0)) *
      (1 + Math.max(0, spriteVisualIntensity - 1) * 1.8)}
    opacity={1}
    isClickable={false}
    isHovered={interactionHovered}
  />
  {#if actor && interactiveEnabled}
    <RuntimeNpcInteractionTarget
      {actor}
      {npc}
      {levelId}
      {interactionSystem}
      {interactiveEnabled}
      position={motionOffset}
      scale={Math.max(1.1, presentation.size * 1.8)}
      on:npcInteraction={(event) => dispatch('npcInteraction', event.detail)}
      on:npcHover={(event) => {
        interactionHovered = event.detail.hovered
      }}
      on:npcLightBurst={(event) => handleLightBurst(event.detail, presentation)}
    />
  {/if}
  {#if selectionBlend > 0.01}
    <StarSprite
      position={motionOffset}
      color={spriteColor}
      size={presentation.size *
        (1 + lightBurstGlow * 0.08) *
        shockwaveSizeMultiplier}
      intensity={selectionBlend *
        Math.max(1.15, shockwaveSpriteIntensity * 0.95)}
      twinkleSpeed={presentation.twinkleSpeed}
      animationOffset={animationTime + 0.35}
      starType="sparkle"
      isKeyElement={true}
      enableTwinkle={true}
      enableHoverScale={false}
      glowBoost={1 + selectionBlend * 2.2}
      opacity={0.92 * selectionBlend}
      isClickable={false}
      isHovered={false}
    />
  {/if}
{/if}
