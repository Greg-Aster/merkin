<script lang="ts">
import { useTask } from '@threlte/core'
import { createEventDispatcher, onDestroy } from 'svelte'
import * as THREE from 'three'
import StarSprite from '../../../components/StarSprite.svelte'
import type { NpcComponent } from '../../../engine/npcTypes'
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
  resolveFireflyNpcPresentation,
} from './fireflyNpcPresentation'

const dispatch = createEventDispatcher<{
  npcInteraction: RuntimeNpcInteractionEvent
}>()

export let actorId = ''
export let actor: RuntimeNpcActor | null = null
export let levelId = ''
export let npc: NpcComponent
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
const npcFireflyPointLightScale = 0.16

function getMotionOffset(
  presentation: ResolvedFireflyNpcPresentation,
): [number, number, number] {
  const phase = getNpcPresentationAnimationPhase(npc.id || actorId)

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
) {
  return (
    presentation.spriteIntensity *
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
) {
  const lightDrivenSpriteIntensity = getLightDrivenSpriteIntensity(presentation)
  if (!presentation.shockwaveEnabled) return lightDrivenSpriteIntensity

  const shockwaveBoost = getShockwaveBoost(presentation)
  return Math.max(
    lightDrivenSpriteIntensity * (1 + shockwaveIgnition * 1.4 * shockwaveBoost),
    0.72 + shockwaveIgnition * 0.65 * shockwaveBoost,
  )
}

function getSpriteVisualIntensity(
  presentation: ResolvedFireflyNpcPresentation,
) {
  const shockwaveSpriteIntensity = getShockwaveSpriteIntensity(presentation)
  return Math.max(
    interactionHovered
      ? Math.max(shockwaveSpriteIntensity * 1.2, 1.05)
      : shockwaveSpriteIntensity,
    shockwaveSpriteIntensity +
      lightBurstGlow * presentation.lightBurstSpriteBoost,
  )
}

function getLightIntensity(presentation: ResolvedFireflyNpcPresentation) {
  const selectedBoost = 1 + selectionBlend * presentation.selectionLightBoost
  const hoverBoost = interactionHovered
    ? Math.max(presentation.lightIntensity * 1.18, presentation.lightIntensity)
    : presentation.lightIntensity
  return (
    hoverBoost *
    selectedBoost *
    getShockwaveIntensityMultiplier(presentation) *
    npcFireflyPointLightScale
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

$: presentation = resolveFireflyNpcPresentation(npc)

onDestroy(() => {
  interactionHovered = false
})
</script>

{#if presentation}
  {@const motionOffset = getMotionOffset(presentation)}
  {@const spriteColor = getSpriteColor(presentation)}
  {@const spriteVisualIntensity = getSpriteVisualIntensity(presentation)}
  {@const spriteOpacityIntensity = Math.min(1, spriteVisualIntensity)}
  {@const lightIntensity = getLightIntensity(presentation)}
  {@const shockwaveSpriteIntensity = getShockwaveSpriteIntensity(presentation)}
  {@const shockwaveSizeMultiplier =
    getShockwaveSpriteSizeMultiplier(presentation)}
  {@const shouldRenderLight =
    presentation.lightIntensity > 0 && presentation.lightDistance > 0}
  {#if shouldRenderLight}
    <ManagedLight
      id={`npc-firefly-light-${npc.id || actorId}`}
      ownerId={npc.id || actorId}
      position={motionOffset}
      color={spriteColor}
      intensity={lightIntensity}
      distance={presentation.lightDistance *
        getShockwaveDistanceMultiplier(presentation)}
      decay={presentation.lightDecay}
      runtimeBudgeted={presentation.lightBudgeted}
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
