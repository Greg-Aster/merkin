<script lang="ts">
import { T, useTask } from '@threlte/core'
import { createEventDispatcher, onDestroy } from 'svelte'
import * as THREE from 'three'
import GroundMistLayer from '../components/GroundMistLayer.svelte'
import ProceduralMesh from '../components/ProceduralMesh.svelte'
import StarSprite from '../components/StarSprite.svelte'
import type { RuntimeGameplayRenderNode } from '../engine/runtimeGameplayTypes'
import { activeConversationSession } from '../features/conversation/conversationStores'
import { gameActions } from '../stores/gameStateStore'

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
let conversationFeaturePromise: Promise<
  typeof import('../features/conversation')
> | null = null
const gameplayPointLightScale = 1

function supportsShockwaveFireflyIgnition() {
  if (node.gameplay?.type !== 'firefly') return false
  const author = (node.gameplay.author ?? '').toLowerCase()
  const name = (node.name ?? '').toLowerCase()
  return (
    node.id.includes('pillar-firefly') ||
    author.includes('pillar firefly') ||
    name.includes('pillar')
  )
}

function isSolitudeFirefly() {
  return node.gameplay?.type === 'firefly' && node.id.startsWith('solitude-')
}

function resolveFireflyColor() {
  const authored = node.gameplay?.markerColor
  if (isSolitudeFirefly() && (!authored || authored === '#f5f1a8')) {
    return '#ff4658'
  }
  return authored ?? '#ff4658'
}

function resolveFireflySetting<T>(
  authored: T | undefined,
  legacyValue: T,
  tunedValue: T,
  fallbackValue: T,
) {
  if (
    isSolitudeFirefly() &&
    (authored === undefined || authored === legacyValue)
  ) {
    return tunedValue
  }
  return authored ?? fallbackValue
}

function resolveFireflyLightIntensity() {
  if (node.id === 'solitude-firefly') {
    return resolveFireflySetting(node.gameplay?.lightIntensity, 5, 1.45, 1.15)
  }
  return resolveFireflySetting(node.gameplay?.lightIntensity, 4, 1.15, 1.15)
}

function resolveFireflyLightDistance() {
  if (node.id === 'solitude-firefly') {
    return resolveFireflySetting(node.gameplay?.lightDistance, 2, 4.6, 4.6)
  }
  return resolveFireflySetting(node.gameplay?.lightDistance, 6, 4.6, 4.6)
}

function resolveFireflyLightDecay() {
  if (node.id === 'solitude-firefly') {
    return resolveFireflySetting(node.gameplay?.lightDecay, 2, 1.25, 1.25)
  }
  return resolveFireflySetting(node.gameplay?.lightDecay, 1.6, 1.25, 1.25)
}

function resolveFireflySpriteIntensity() {
  if (node.id === 'solitude-firefly') {
    return resolveFireflySetting(
      node.gameplay?.spriteIntensity,
      1.95,
      1.2,
      1.15,
    )
  }
  return resolveFireflySetting(node.gameplay?.spriteIntensity, 0.95, 1.15, 1.15)
}

function resolveFireflyLightBurstBoost() {
  const authored = node.gameplay?.lightBurstBoost
  if (typeof authored === 'number' && Number.isFinite(authored)) {
    return Math.max(0, authored)
  }
  if (node.id === 'solitude-firefly') {
    return 1.75
  }
  if (isSolitudeFirefly()) {
    return 1.4
  }
  return 1.0
}

function resolveFireflyTwinkleSpeed() {
  if (node.id === 'solitude-firefly') {
    return resolveFireflySetting(node.gameplay?.twinkleSpeed, 0.5, 0.9, 0.9)
  }
  return resolveFireflySetting(node.gameplay?.twinkleSpeed, 1.6, 0.9, 0.9)
}

function loadConversationFeature() {
  if (!conversationFeaturePromise) {
    conversationFeaturePromise = import('../features/conversation')
  }

  return conversationFeaturePromise
}

async function startFireflyDialogue() {
  const { conversationActions } = await loadConversationFeature()
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
          (0.45 + burst.strength * 0.75) * resolveFireflyLightBurstBoost(),
        )
        if (supportsShockwaveFireflyIgnition()) {
          shockwaveIgnited = true
        }
      },
    },
  })
}

function getFireflyMotionOffset() {
  const hoverHeight = resolveFireflySetting(
    node.gameplay?.hoverHeight,
    0.36,
    0.28,
    0.28,
  )
  const bobAmplitude = resolveFireflySetting(
    node.gameplay?.bobAmplitude,
    0.14,
    0.08,
    0.08,
  )
  const bobSpeed = resolveFireflySetting(
    node.gameplay?.bobSpeed,
    1.4,
    0.55,
    0.55,
  )
  const wanderEnabled = resolveFireflySetting(
    node.gameplay?.wanderEnabled,
    false,
    true,
    true,
  )
  const wanderRadius = resolveFireflySetting(
    node.gameplay?.wanderRadius,
    0.35,
    0.16,
    0.16,
  )
  const wanderSpeed = resolveFireflySetting(
    node.gameplay?.wanderSpeed,
    0.45,
    0.18,
    0.18,
  )
  const basePhase =
    Array.from(node.id).reduce(
      (accumulator, character) => accumulator + character.charCodeAt(0),
      0,
    ) * 0.0175

  return [
    wanderEnabled
      ? Math.sin(animationTime * wanderSpeed + basePhase) * wanderRadius
      : 0,
    hoverHeight +
      Math.sin(animationTime * bobSpeed + basePhase * 0.5) * bobAmplitude,
    wanderEnabled
      ? Math.cos(animationTime * wanderSpeed + basePhase) * wanderRadius
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
$: fireflyBaseColor = resolveFireflyColor()
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
    {@const baseLightIntensity = resolveFireflyLightIntensity()}
    {@const baseSpriteIntensity = resolveFireflySpriteIntensity()}
    {@const lightDrivenSpriteIntensity = baseSpriteIntensity * Math.max(0.75, baseLightIntensity / 1.15)}
    {@const selectionBlend = fireflySelectionBlend}
    {@const fireflySelected = selectionBlend > 0.01}
    {@const selectionLightMultiplier = 1 + selectionBlend * 3}
    {@const selectionSpriteIntensityMultiplier = 1}
    {@const selectionGlowBoost = 1 + selectionBlend * 1.2 + (markerHovered ? 0.25 : 0)}
    {@const shockwaveBoost = supportsShockwaveFireflyIgnition() ? resolveFireflyLightBurstBoost() : 1}
    {@const shockwaveIntensityMultiplier = supportsShockwaveFireflyIgnition() ? 1 + shockwaveIgnition * 12 * shockwaveBoost : 1}
    {@const shockwaveDistanceMultiplier = supportsShockwaveFireflyIgnition() ? 1 + shockwaveIgnition * 1.1 * shockwaveBoost : 1}
    {@const shockwaveSpriteSizeMultiplier = supportsShockwaveFireflyIgnition() ? 1 + shockwaveIgnition * 0.55 * shockwaveBoost : 1}
    {@const shockwaveSpriteIntensity = supportsShockwaveFireflyIgnition()
      ? Math.max(lightDrivenSpriteIntensity * (1 + shockwaveIgnition * 5.2 * shockwaveBoost), 1 + shockwaveIgnition * 2.6 * shockwaveBoost)
      : lightDrivenSpriteIntensity}
    {@const baseSpriteVisualIntensity = Math.max(
      (markerHovered ? Math.max(shockwaveSpriteIntensity * 1.2, 1.05) : shockwaveSpriteIntensity) * selectionSpriteIntensityMultiplier,
      shockwaveSpriteIntensity * selectionSpriteIntensityMultiplier + lightBurstGlow * 0.55,
    )}
    {@const baseSpriteOpacityIntensity = Math.min(1, baseSpriteVisualIntensity)}
    {@const baseSpriteGlowBoost = selectionGlowBoost * (1 + Math.max(0, baseSpriteVisualIntensity - 1) * 1.8)}
    <T.PointLight
      position={fireflyMotionOffset}
      color={fireflyIgnitionColor}
      intensity={(markerHovered ? Math.max(baseLightIntensity * 1.18, baseLightIntensity) : baseLightIntensity) * selectionLightMultiplier * shockwaveIntensityMultiplier * gameplayPointLightScale}
      distance={resolveFireflyLightDistance() * shockwaveDistanceMultiplier}
      decay={resolveFireflyLightDecay()}
    />
    <StarSprite
      position={fireflyMotionOffset}
      color={fireflyIgnitionColor}
      size={(node.gameplay.markerSize ?? 0.58) * (1 + lightBurstGlow * 0.08) * shockwaveSpriteSizeMultiplier}
      intensity={baseSpriteOpacityIntensity}
      twinkleSpeed={resolveFireflyTwinkleSpeed()}
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
        twinkleSpeed={resolveFireflyTwinkleSpeed()}
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
  {:else if node.gameplay.type === 'fog-volume'}
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
