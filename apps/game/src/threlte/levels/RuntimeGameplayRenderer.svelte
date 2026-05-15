<script lang="ts">
import { T, useTask } from '@threlte/core'
import { createEventDispatcher, onDestroy } from 'svelte'
import * as THREE from 'three'
import AdaptivePointLight from '../components/AdaptivePointLight.svelte'
import GroundMistLayer from '../components/GroundMistLayer.svelte'
import ProceduralMesh from '../components/ProceduralMesh.svelte'
import StarSprite from '../components/StarSprite.svelte'
import type { RuntimeGameplayRenderNode } from '../engine/runtimeGameplayTypes'
import {
  activeConversationSession,
  conversationActions,
} from '../features/conversation/runtime'
import { gameActions } from '../stores/gameStateStore'
import {
  getRuntimeNodeAnimationPhase,
  resolveRuntimeFireflyPresentation,
} from './runtimeGameplayPresentation'

const dispatch = createEventDispatcher()

export let node: RuntimeGameplayRenderNode
export let editorEnabled = false
export let selected = false
export let interactionSystem: any = null
export let interactiveEnabled = false

let markerHovered = false
let lightBurstGlow = 0
let shockwaveIgnited = false
let shockwaveIgnition = 0
let animationTime = 0
let fireflyConversationSelected = false
let fireflyInteractionSelected = false
let fireflySelectionBlend = 0
let fireflySelectionTimeoutId: ReturnType<typeof setTimeout> | null = null
const gameplayPointLightScale = 0.16

let fireflyPresentation = resolveRuntimeFireflyPresentation(node)

async function startFireflyDialogue() {
  const npcId = getFireflyConversationId()
  const readOnlyDuration = 7000

  markFireflySelected(readOnlyDuration)

  const personality = {
    id: npcId,
    name: node.gameplay?.author || node.gameplay?.title || node.name,
    species: 'Firefly',
    behavior: { defaultMood: 'peaceful' },
  }

  conversationActions.startReadOnlyConversation(
    npcId,
    personality,
    node.gameplay?.body || node.gameplay?.excerpt || 'You are alone here.',
    readOnlyDuration,
  )
  gameActions.recordInteraction('editor_firefly_click', npcId)
}

function markFireflySelected(duration: number) {
  fireflyInteractionSelected = true

  if (fireflySelectionTimeoutId) {
    window.clearTimeout(fireflySelectionTimeoutId)
  }

  fireflySelectionTimeoutId = window.setTimeout(
    () => {
      fireflyInteractionSelected = false
      fireflySelectionTimeoutId = null
    },
    Math.max(250, duration),
  )
}

function getFireflyConversationId() {
  return `editor-firefly-${node.id}`
}

function isFireflySelected() {
  if (selected) return true
  if (node.gameplay?.type !== 'firefly') return false
  return fireflyConversationSelected || fireflyInteractionSelected
}

function registerInteractiveMarker(sprite: THREE.Sprite) {
  if (
    !interactiveEnabled ||
    !interactionSystem?.registerInteractiveObject ||
    !node.gameplay
  )
    return

  interactionSystem.registerInteractiveObject({
    id: `editor-node-${node.id}`,
    sprite,
    type: 'object',
    data: node,
    index: 0,
    handlers: {
      onClick: () => {
        if (node.gameplay?.type === 'portal' && node.gameplay.targetLevelId) {
          dispatch('portalTransition', { levelId: node.gameplay.targetLevelId })
          return
        }

        if (node.gameplay?.type === 'firefly') {
          void startFireflyDialogue()
          return
        }

        if (node.gameplay?.type === 'note') {
          dispatch('noteRead', {
            title: node.gameplay.title || node.name,
            author: node.gameplay.author || 'Recovered Fragment',
            location: node.gameplay.location || 'Sci-Fi Room',
            excerpt: node.gameplay.excerpt || '',
            body: node.gameplay.body || node.gameplay.excerpt || '',
          })
        }
      },
      onHover: (_data: RuntimeGameplayRenderNode, hovered: boolean) => {
        markerHovered = hovered
      },
      onLightBurst: (
        _data: RuntimeGameplayRenderNode,
        burst: { strength: number },
      ) => {
        lightBurstGlow = Math.max(
          lightBurstGlow,
          (0.45 + burst.strength * 0.75) * fireflyPresentation.lightBurstBoost,
        )
        if (fireflyPresentation.shockwaveEnabled) {
          shockwaveIgnited = true
        }
      },
    },
  })
}

function getFireflyMotionOffset() {
  const basePhase = getRuntimeNodeAnimationPhase(node.id)

  return [
    fireflyPresentation.wanderEnabled
      ? Math.sin(animationTime * fireflyPresentation.wanderSpeed + basePhase) *
        fireflyPresentation.wanderRadius
      : 0,
    fireflyPresentation.hoverHeight +
      Math.sin(animationTime * fireflyPresentation.bobSpeed + basePhase * 0.5) *
        fireflyPresentation.bobAmplitude,
    fireflyPresentation.wanderEnabled
      ? Math.cos(animationTime * fireflyPresentation.wanderSpeed + basePhase) *
        fireflyPresentation.wanderRadius
      : 0,
  ] as [number, number, number]
}

useTask(delta => {
  animationTime += delta
  lightBurstGlow = Math.max(0, lightBurstGlow - delta * 1.25)
  const fireflySelectionTarget = isFireflySelected() ? 1 : 0
  const fireflySelectionSpeed =
    fireflySelectionTarget > fireflySelectionBlend ? 7.5 : 5.5
  fireflySelectionBlend = THREE.MathUtils.damp(
    fireflySelectionBlend,
    fireflySelectionTarget,
    fireflySelectionSpeed,
    delta,
  )
  shockwaveIgnition = THREE.MathUtils.damp(
    shockwaveIgnition,
    shockwaveIgnited ? 1 : 0,
    4.5,
    delta,
  )
})

$: fireflyConversationSelected =
  node.gameplay?.type === 'firefly' &&
  $activeConversationSession?.npcId === getFireflyConversationId()
$: fireflyPresentation = resolveRuntimeFireflyPresentation(node)
$: fireflyBaseColor = fireflyPresentation.baseColor
$: fireflyIgnitionColor = (() => {
  const baseColor = new THREE.Color(fireflyBaseColor)
  const ignitedColor = new THREE.Color('#ff1830')
  return `#${baseColor.lerp(ignitedColor, shockwaveIgnition).getHexString()}`
})()

onDestroy(() => {
  if (fireflySelectionTimeoutId) {
    window.clearTimeout(fireflySelectionTimeoutId)
  }
  if (interactionSystem?.unregisterInteractiveObject) {
    interactionSystem.unregisterInteractiveObject(`editor-node-${node.id}`)
  }
})
</script>

{#if node.gameplay}
  {#if node.gameplay.type === 'firefly'}
    {@const fireflyMotionOffset = getFireflyMotionOffset()}
    {@const baseLightIntensity = fireflyPresentation.lightIntensity}
    {@const baseSpriteIntensity = fireflyPresentation.spriteIntensity}
    {@const lightDrivenSpriteIntensity = baseSpriteIntensity * Math.min(1.35, Math.max(0.72, baseLightIntensity / 3.2))}
    {@const selectionBlend = fireflySelectionBlend}
    {@const fireflySelected = selectionBlend > 0.01}
    {@const selectionLightMultiplier = 1 + selectionBlend * fireflyPresentation.selectionLightBoost}
    {@const selectionSpriteIntensityMultiplier = 1}
    {@const selectionGlowBoost = 1 + selectionBlend * 1.2 + (markerHovered ? 0.25 : 0)}
    {@const shockwaveBoost = fireflyPresentation.shockwaveEnabled ? fireflyPresentation.lightBurstBoost : 1}
    {@const shockwaveIntensityMultiplier = fireflyPresentation.shockwaveEnabled ? 1 + shockwaveIgnition * 2.8 * shockwaveBoost : 1}
    {@const shockwaveDistanceMultiplier = fireflyPresentation.shockwaveEnabled ? 1 + shockwaveIgnition * 1.1 * shockwaveBoost : 1}
    {@const shockwaveSpriteSizeMultiplier = fireflyPresentation.shockwaveEnabled ? 1 + shockwaveIgnition * 0.55 * shockwaveBoost : 1}
    {@const shockwaveSpriteIntensity = fireflyPresentation.shockwaveEnabled
      ? Math.max(lightDrivenSpriteIntensity * (1 + shockwaveIgnition * 1.4 * shockwaveBoost), 0.72 + shockwaveIgnition * 0.65 * shockwaveBoost)
      : lightDrivenSpriteIntensity}
    {@const baseSpriteVisualIntensity = Math.max(
      (markerHovered ? Math.max(shockwaveSpriteIntensity * 1.2, 1.05) : shockwaveSpriteIntensity) * selectionSpriteIntensityMultiplier,
      shockwaveSpriteIntensity * selectionSpriteIntensityMultiplier + lightBurstGlow * fireflyPresentation.lightBurstSpriteBoost,
    )}
    {@const baseSpriteOpacityIntensity = Math.min(1, baseSpriteVisualIntensity)}
    {@const baseSpriteGlowBoost = selectionGlowBoost * (1 + Math.max(0, baseSpriteVisualIntensity - 1) * 1.8)}
    {@const shouldRenderFireflyPointLight = baseLightIntensity > 0 && fireflyPresentation.lightDistance > 0}
    {#if shouldRenderFireflyPointLight}
      <AdaptivePointLight
        position={fireflyMotionOffset}
        color={fireflyIgnitionColor}
        intensity={(markerHovered ? Math.max(baseLightIntensity * 1.18, baseLightIntensity) : baseLightIntensity) * selectionLightMultiplier * shockwaveIntensityMultiplier * gameplayPointLightScale}
        distance={fireflyPresentation.lightDistance * shockwaveDistanceMultiplier}
        decay={fireflyPresentation.lightDecay}
      />
    {/if}
    <StarSprite
      position={fireflyMotionOffset}
      color={fireflyIgnitionColor}
      size={(node.gameplay.markerSize ?? 0.58) * (1 + lightBurstGlow * 0.08) * shockwaveSpriteSizeMultiplier}
      intensity={baseSpriteOpacityIntensity}
      twinkleSpeed={fireflyPresentation.twinkleSpeed}
      animationOffset={animationTime}
      starType="sparkle"
      isKeyElement={true}
      enableTwinkle={true}
      enableHoverScale={false}
      glowBoost={baseSpriteGlowBoost}
      opacity={1}
      isClickable={interactiveEnabled}
      isHovered={markerHovered}
      onSpriteReady={registerInteractiveMarker}
    />
    {#if fireflySelected}
      <StarSprite
        position={fireflyMotionOffset}
        color={fireflyIgnitionColor}
        size={(node.gameplay.markerSize ?? 0.58) * (1 + lightBurstGlow * 0.08) * shockwaveSpriteSizeMultiplier}
        intensity={selectionBlend * Math.max(1.15, shockwaveSpriteIntensity * 0.95)}
        twinkleSpeed={fireflyPresentation.twinkleSpeed}
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
  {:else if node.gameplay.type === 'audio-region'}
    {#if editorEnabled}
    <ProceduralMesh
      geometry="box"
      args={[1, 1, 1]}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
      scale={[1, 1, 1]}
      color={node.gameplay.markerColor ?? '#7ecbff'}
      emissive={node.gameplay.markerColor ?? '#7ecbff'}
      emissiveIntensity={selected || markerHovered ? 0.4 : 0.12}
      metalness={0.08}
      roughness={0.92}
      transparent={true}
      opacity={0.12}
    />
    <ProceduralMesh
      geometry="torus"
      args={[0.5, 0.03, 12, 24]}
      position={[0, Math.max(0.3, node.scale[1] * 0.5), 0]}
      rotation={[Math.PI / 2, animationTime * 0.35, 0]}
      scale={[1, 1, 1]}
      color={node.gameplay.markerColor ?? '#7ecbff'}
      emissive={node.gameplay.markerColor ?? '#7ecbff'}
      emissiveIntensity={0.35}
      metalness={1}
      roughness={0.04}
      transparent={true}
      opacity={0.45}
    />
    {/if}
  {:else if node.gameplay.type === 'fog-volume'}
    {#if editorEnabled}
    <ProceduralMesh
      geometry="box"
      args={[1, 1, 1]}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
      scale={[1, 1, 1]}
      color={node.gameplay.fogColor ?? node.gameplay.markerColor ?? '#cfdcff'}
      emissive={node.gameplay.fogColor ?? node.gameplay.markerColor ?? '#cfdcff'}
      emissiveIntensity={selected || markerHovered ? 0.28 : 0.08}
      metalness={0.02}
      roughness={1}
      transparent={true}
      opacity={0.1}
    />
    <ProceduralMesh
      geometry="torus"
      args={[0.5, 0.02, 12, 24]}
      position={[0, Math.max(0.3, node.scale[1] * 0.5), 0]}
      rotation={[Math.PI / 2, 0, Math.sin(animationTime * 0.3) * 0.25]}
      scale={[1, 1, 1]}
      color={node.gameplay.fogColor ?? node.gameplay.markerColor ?? '#cfdcff'}
      emissive={node.gameplay.fogColor ?? node.gameplay.markerColor ?? '#cfdcff'}
      emissiveIntensity={0.2}
      metalness={1}
      roughness={0.05}
      transparent={true}
      opacity={0.38}
    />
    {/if}
  {:else if node.gameplay.type === 'mist-region'}
    {#if editorEnabled}
      <ProceduralMesh
        geometry="box"
        args={[1, 1, 1]}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        scale={[1, 1, 1]}
        color={node.gameplay.mistColor ?? '#b992ff'}
        emissive={node.gameplay.mistColor ?? '#b992ff'}
        emissiveIntensity={selected || markerHovered ? 0.34 : 0.1}
        metalness={0.02}
        roughness={1}
        transparent={true}
        opacity={0.12}
      />
      <ProceduralMesh
        geometry="torus"
        args={[0.6, 0.025, 12, 24]}
        position={[0, 0.18, 0]}
        rotation={[Math.PI / 2, 0, Math.sin(animationTime * 0.3) * 0.25]}
        scale={[1, 1, 1]}
        color={node.gameplay.mistColor ?? '#b992ff'}
        emissive={node.gameplay.mistColor ?? '#b992ff'}
        emissiveIntensity={0.24}
        metalness={1}
        roughness={0.05}
        transparent={true}
        opacity={0.42}
      />
    {:else}
      <GroundMistLayer
        enabled={true}
        color={node.gameplay.mistColor ?? '#241557'}
        opacity={node.gameplay.mistOpacity ?? 0.14}
        layers={Math.max(1, Math.round(node.gameplay.mistLayers ?? 3))}
        baseHeight={0}
        heightStep={node.gameplay.mistSpacing ?? 0.45}
        scale={node.gameplay.mistScale ?? 360}
        driftSpeed={node.gameplay.mistDriftSpeed ?? 0.05}
      />
    {/if}
  {:else if node.gameplay.type === 'note'}
    <StarSprite
      position={[0, 0.16, 0]}
      color={node.gameplay.markerColor ?? '#7ecbff'}
      size={(node.gameplay.markerSize ?? 0.7) * (markerHovered ? 1.12 : 1 + lightBurstGlow * 0.1)}
      intensity={Math.max(markerHovered ? 1.08 : 0.9, 0.9 + lightBurstGlow * 0.75)}
      twinkleSpeed={1}
      animationOffset={0}
      starType="sparkle"
      isKeyElement={true}
      enableTwinkle={true}
      opacity={1}
      isClickable={interactiveEnabled}
      isHovered={markerHovered}
      onSpriteReady={registerInteractiveMarker}
    />
  {:else}
    <ProceduralMesh
      geometry="torus"
      args={[node.gameplay.type === 'portal' ? 1.4 : 0.38, node.gameplay.type === 'portal' ? 0.035 : 0.018, 12, 28]}
      position={[0, node.gameplay.type === 'portal' ? 1.05 : 0.1, 0]}
      rotation={[Math.PI / 2, 0, 0]}
      scale={[1, 1, 1]}
      color={node.gameplay.markerColor ?? '#7ecbff'}
      emissive={node.gameplay.markerColor ?? '#7ecbff'}
      emissiveIntensity={Math.max(markerHovered ? 1.1 : 0.48, 0.48 + lightBurstGlow)}
      metalness={1}
      roughness={0.03}
      transparent={true}
      opacity={0.68}
    />

    <StarSprite
      position={[0, node.gameplay.type === 'portal' ? 1.12 : 0.12, 0]}
      color={node.gameplay.markerColor ?? '#7ecbff'}
      size={(node.gameplay.markerSize ?? 0.7) * (markerHovered ? 1.15 : 1 + lightBurstGlow * 0.12)}
      intensity={Math.max(markerHovered ? 1.05 : 0.85, 0.85 + lightBurstGlow * 0.8)}
      twinkleSpeed={1.2}
      animationOffset={0}
      enableTwinkle={true}
      opacity={1}
      isClickable={interactiveEnabled}
      isHovered={markerHovered}
      onSpriteReady={registerInteractiveMarker}
    />
  {/if}
{/if}
