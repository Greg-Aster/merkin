<script lang="ts">
import { useTask } from '@threlte/core'
import { createEventDispatcher, onDestroy } from 'svelte'
import * as THREE from 'three'
import StarSprite from '../../../components/StarSprite.svelte'
import type { NpcComponent } from '../../../engine/npcTypes'
import ManagedLight from '../../lighting/ManagedLight.svelte'
import RuntimeNpcInteractionTarget from '../RuntimeNpcInteractionTarget.svelte'
import { npcInteractionEvents } from '../npcStateStore'
import type {
  RuntimeNpcActor,
  RuntimeNpcInteractionEvent,
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
export let activationStrength = 0
export let interactionSystem: any = null
export let interactiveEnabled = false

let animationTime = 0
let selectionBlend = 0
let activationBlend = 0
let interactionHovered = false
let lastStateInteractionEventId = ''
let stateActivationStrength = 0

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

function getLightPulse(presentation: ResolvedFireflyNpcPresentation) {
  const phase = getNpcPresentationAnimationPhase(npc.id || actorId)
  const wave =
    (Math.sin(animationTime * presentation.twinkleSpeed + phase) + 1) / 2
  const threshold = 0.78
  if (wave <= threshold) return 0
  return Math.min(1, (wave - threshold) / (1 - threshold))
}

function getSpriteColor(presentation: ResolvedFireflyNpcPresentation) {
  if (selectionBlend <= 0.01) return presentation.color

  const baseColor = new THREE.Color(presentation.color)
  const selectedColor = new THREE.Color(presentation.secondaryColor)
  return `#${baseColor.lerp(selectedColor, Math.min(1, selectionBlend)).getHexString()}`
}

function getSpriteIntensity(
  presentation: ResolvedFireflyNpcPresentation,
  pulse: number,
) {
  const selectedBoost = 1 + selectionBlend * 0.35
  const activationBoost =
    1 + activationBlend * presentation.lightBurstSpriteBoost
  return (
    presentation.spriteIntensity *
    (0.68 + pulse * 0.72) *
    selectedBoost *
    activationBoost
  )
}

function getLightIntensity(
  presentation: ResolvedFireflyNpcPresentation,
  pulse: number,
) {
  const drive = Math.max(pulse * pulse, selectionBlend * 0.35, activationBlend)
  return (
    presentation.lightIntensity *
    drive *
    (1 + selectionBlend * presentation.selectionLightBoost)
  )
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
    stateActivationStrength = 1
  }
  stateActivationStrength = THREE.MathUtils.damp(
    stateActivationStrength,
    0,
    3.6,
    delta,
  )
  const selectionTarget = selected || interactionHovered ? 1 : 0
  const selectionSpeed = selectionTarget > selectionBlend ? 7.5 : 5.5
  selectionBlend = THREE.MathUtils.damp(
    selectionBlend,
    selectionTarget,
    selectionSpeed,
    delta,
  )
  activationBlend = THREE.MathUtils.damp(
    activationBlend,
    Math.max(
      0,
      Math.min(1, Math.max(activationStrength, stateActivationStrength)),
    ),
    4.5,
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
  {@const pulse = getLightPulse(presentation)}
  {@const spriteColor = getSpriteColor(presentation)}
  {@const spriteIntensity = getSpriteIntensity(presentation, pulse)}
  {@const lightIntensity = getLightIntensity(presentation, pulse)}
  {@const shouldRenderLight =
    presentation.lightIntensity > 0 &&
    presentation.lightDistance > 0 &&
    (pulse > 0.02 || selectionBlend > 0.01 || activationBlend > 0.01)}
  {#if shouldRenderLight}
    <ManagedLight
      id={`npc-firefly-light-${npc.id || actorId}`}
      ownerId={npc.id || actorId}
      position={motionOffset}
      color={spriteColor}
      intensity={lightIntensity}
      distance={presentation.lightDistance * (0.82 + pulse * 0.18)}
      decay={presentation.lightDecay}
      runtimeBudgeted={presentation.lightBudgeted}
    />
  {/if}
  <StarSprite
    position={motionOffset}
    color={spriteColor}
    size={presentation.size * (1 + selectionBlend * 0.18 + activationBlend * 0.1)}
    intensity={Math.min(1.45, spriteIntensity)}
    twinkleSpeed={presentation.twinkleSpeed}
    animationOffset={animationTime}
    starType="sparkle"
    isKeyElement={true}
    enableTwinkle={true}
    enableHoverScale={false}
    glowBoost={1 + selectionBlend * 1.2 + activationBlend * 1.4}
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
    />
  {/if}
  {#if selectionBlend > 0.01}
    <StarSprite
      position={motionOffset}
      color={presentation.secondaryColor}
      size={presentation.size * (1.18 + selectionBlend * 0.24)}
      intensity={selectionBlend * Math.max(0.9, spriteIntensity * 0.85)}
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
