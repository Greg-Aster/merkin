<script lang="ts">
import { T, useTask } from '@threlte/core'
import { onDestroy } from 'svelte'
import * as THREE from 'three'
import StarSprite from '../components/StarSprite.svelte'
import type { NpcConversationConfig } from '../engine/npcTypes'
import ManagedLight from '../features/lighting/ManagedLight.svelte'
import { startNpcConversation } from '../features/npc'

interface SceneFirefly {
  id: string
  position: [number, number, number]
  phase: number
  color: string
  size: number
  twinkleSpeed: number
  driftSpeed: number
  interaction?: SceneFireflyInteraction
}

interface SceneFireflyInteraction {
  npcId: string
  displayName: string
  mode: 'lost-soul' | 'profile'
  profileId?: string
  body?: string
}

interface SceneFireflyInteractiveSettings {
  enabled?: boolean
  profileChance?: number
  profileIds?: string[]
  durationMs?: number
  lostSoulResponses?: string[]
}

export let enabled = true
export let fieldId = 'scene-fireflies'
export let levelId = ''
export let interactionSystem: any = null
export let interactiveEnabled = false
export let count = 36
export let lightCount = 8
export let radius = 120
export let minHeight = 2
export let maxHeight = 5
export let center: [number, number, number] = [0, 0, 0]
export let terrainFollow = false
export let terrainReady = true
export let getHeightAt:
  | ((x: number, z: number) => number | null | undefined)
  | null = null
export let distribution: 'uniform' | 'center-falloff' = 'uniform'
export let densityExponent = 0.5
export let palette: string[] = []
export let interactive: SceneFireflyInteractiveSettings | undefined = undefined
export let color = '#f4ffb8'
export let secondaryColor = '#8defff'
export let size = 0.58
export let spriteIntensity = 1.45
export let lightIntensity = 44
export let lightDistance = 28
export let lightDecay = 1.35
export let lightBudgeted = true
export let twinkleSpeed = 0.82
export let driftSpeed = 0.28
export let sway = 1.5

let elapsed = 0
let fireflies: SceneFirefly[] = []
let hoveredFireflyId = ''
const registeredInteractionIds = new Set<string>()

const defaultProfileIds = [
  'elara-voss',
  'helena-zhao',
  'ava-chen',
  'maya-okafor',
  'soren-klein',
  'gregory-aster',
  'kaelen-vance',
  'eleanor-kim',
  'vex-kanarath',
  'merkin',
]

const defaultLostSoulResponses = [
  '*glows with curiosity, then dims sadly*',
  '*speaks in a language you do not understand... the words fade like whispers*',
  '*flickers weakly* Where... where am I?',
  '*pulses with longing* We are all lost here...',
  '*light grows dim, barely visible* I... miss... someone...',
  '*flashes frantically, then goes dark for a moment*',
  '*glows softly, as if trying to remember something important*',
  '*dances in erratic patterns, clearly confused*',
  '*A faint, sorrowful hum accompanies its gentle, pulsing light.*',
  '*Its light traces the shape of a forgotten symbol in the air before fading.*',
  'I remember a name, but not whose it was... Was it mine?',
  '*Flickers in time with a slow, mournful melody only it can hear.*',
  'We were promised a dawn that never came.',
  '*Its light seems to search for something, or someone, in the darkness.*',
  'Have you seen the others? They were just here...',
  '*A single, bright flash, followed by a long, sorrowful dimming.*',
  'The stars feel so far away tonight.',
  '*It spells out a single, desperate word in points of light: "Wait."*',
  '*Pulses with a soft, warm glow, like a distant, cherished memory.*',
  "I was on my way to... I can't recall. It was important, though.",
]

const lostSoulNames = [
  'Wandering Star',
  'Twilight Wisp',
  'Stellar Wanderer',
  'Drifting Light',
  'Celestial Wisp',
  'Night Wanderer',
  'Fading Ember',
  'Lost Lamplight',
]

function clampCount(value: number, fallback: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback
}

function seededUnit(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return value - Math.floor(value)
}

function getDistributionExponent() {
  if (distribution === 'center-falloff') {
    return Math.max(0.01, densityExponent)
  }
  return 0.5
}

function getFireflyColor(index: number) {
  const resolvedPalette = palette.filter(entry => entry.trim().length > 0)
  if (resolvedPalette.length > 0) {
    return resolvedPalette[index % resolvedPalette.length]
  }
  return index % 4 === 0 ? secondaryColor : color
}

function getProfileIds() {
  const profileIds = interactive?.profileIds?.filter(entry => entry.trim())
  return profileIds && profileIds.length > 0 ? profileIds : defaultProfileIds
}

function getLostSoulResponses() {
  const responses = interactive?.lostSoulResponses?.filter(entry =>
    entry.trim(),
  )
  return responses && responses.length > 0
    ? responses
    : defaultLostSoulResponses
}

function getTitleCaseProfileName(profileId: string) {
  return profileId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getFireflyInteraction(
  index: number,
): SceneFireflyInteraction | undefined {
  if (!interactive?.enabled) return undefined

  const profileChance = Math.max(
    0,
    Math.min(1, interactive.profileChance ?? 0.15),
  )
  const profileCount = Math.floor(clampCount(count, 0) * profileChance)
  const npcId = `${fieldId}-ambient-${index}`

  if (index < profileCount) {
    const profileIds = getProfileIds()
    const profileId = profileIds[index % profileIds.length]
    return {
      npcId,
      displayName: getTitleCaseProfileName(profileId),
      mode: 'profile',
      profileId,
    }
  }

  const responses = getLostSoulResponses()
  const name = lostSoulNames[index % lostSoulNames.length]
  return {
    npcId,
    displayName: `${name} ${index + 1}`,
    mode: 'lost-soul',
    body: responses[Math.floor(seededUnit(index, 8) * responses.length)],
  }
}

function getTerrainRelativeHeight(localX: number, localZ: number) {
  if (!terrainFollow || !terrainReady || !getHeightAt) {
    return center[1]
  }

  const worldX = center[0] + localX
  const worldZ = center[2] + localZ
  const terrainHeight = getHeightAt(worldX, worldZ)
  return typeof terrainHeight === 'number' && Number.isFinite(terrainHeight)
    ? terrainHeight
    : center[1]
}

function buildFireflies() {
  clearFireflyInteractions()
  const resolvedCount = clampCount(count, 0)
  const resolvedRadius = Math.max(0, radius)
  const heightSpan = Math.max(0.1, maxHeight - minHeight)
  const distanceExponent = getDistributionExponent()
  const nextFireflies: SceneFirefly[] = []

  for (let index = 0; index < resolvedCount; index += 1) {
    const angle = seededUnit(index, 1) * Math.PI * 2
    const distance =
      Math.pow(seededUnit(index, 2), distanceExponent) * resolvedRadius
    const localX = Math.cos(angle) * distance
    const localZ = Math.sin(angle) * distance
    const terrainHeight = getTerrainRelativeHeight(localX, localZ)
    const height = terrainHeight + minHeight + seededUnit(index, 3) * heightSpan
    const tint = getFireflyColor(index)

    nextFireflies.push({
      id: `${fieldId}-${index}`,
      position: [localX, height - center[1], localZ],
      phase: seededUnit(index, 4) * Math.PI * 2,
      color: tint,
      size: size * (0.75 + seededUnit(index, 5) * 0.55),
      twinkleSpeed: twinkleSpeed * (0.75 + seededUnit(index, 6) * 0.65),
      driftSpeed: driftSpeed * (0.75 + seededUnit(index, 7) * 0.6),
      interaction: getFireflyInteraction(index),
    })
  }

  fireflies = nextFireflies
}

function getPosition(
  firefly: SceneFirefly,
  elapsedTime: number,
): [number, number, number] {
  const phase = firefly.phase + elapsedTime * firefly.driftSpeed
  return [
    firefly.position[0] + Math.sin(phase) * sway,
    firefly.position[1] + Math.sin(phase * 1.37) * Math.min(0.7, sway * 0.35),
    firefly.position[2] + Math.cos(phase * 0.83) * sway,
  ]
}

function getPulse(firefly: SceneFirefly, elapsedTime: number) {
  const wave =
    (Math.sin(elapsedTime * firefly.twinkleSpeed + firefly.phase) + 1) / 2
  const threshold = 0.78
  if (wave <= threshold) return 0
  const normalized = Math.min(1, (wave - threshold) / (1 - threshold))
  return normalized * normalized * (3 - 2 * normalized)
}

function getSpriteIntensity(pulse: number) {
  return spriteIntensity * (0.55 + pulse * 0.85)
}

function getLightIntensity(pulse: number) {
  return lightIntensity * pulse * pulse
}

function getInteractiveObjectId(firefly: SceneFirefly) {
  return `scene-firefly-${firefly.interaction?.npcId ?? firefly.id}`
}

function unregisterFireflyInteraction(id: string) {
  if (interactionSystem?.unregisterInteractiveObject) {
    interactionSystem.unregisterInteractiveObject(id)
  }
  registeredInteractionIds.delete(id)
}

function clearFireflyInteractions() {
  for (const id of Array.from(registeredInteractionIds)) {
    unregisterFireflyInteraction(id)
  }
  hoveredFireflyId = ''
}

function registerFireflyInteraction(
  firefly: SceneFirefly,
  sprite: THREE.Sprite,
) {
  if (
    !interactiveEnabled ||
    !interactive?.enabled ||
    !firefly.interaction ||
    !interactionSystem?.registerInteractiveObject
  ) {
    return
  }

  const objectId = getInteractiveObjectId(firefly)
  registeredInteractionIds.add(objectId)
  interactionSystem.registerInteractiveObject({
    id: objectId,
    sprite,
    type: 'npc',
    data: {
      type: 'scene-firefly',
      levelId,
      fieldId,
      npcId: firefly.interaction.npcId,
      displayName: firefly.interaction.displayName,
      mode: firefly.interaction.mode,
    },
    index: 0,
    handlers: {
      onClick: () => {
        void startFireflyConversation(firefly)
      },
      onHover: (_data: unknown, hovered: boolean) => {
        hoveredFireflyId = hovered ? firefly.id : ''
      },
    },
  })
}

function getFireflyConversation(firefly: SceneFirefly): NpcConversationConfig {
  const durationMs = interactive?.durationMs ?? 4000
  if (
    firefly.interaction?.mode === 'profile' &&
    firefly.interaction.profileId
  ) {
    return {
      mode: 'profile',
      personalityId: firefly.interaction.profileId,
      fallback: {
        body:
          firefly.interaction.body ||
          '*glows softly, trying to remember the shape of its old voice*',
        durationMs,
      },
    }
  }

  return {
    mode: 'read-only',
    body: firefly.interaction?.body || '*glows softly in the darkness*',
    durationMs,
  }
}

async function startFireflyConversation(firefly: SceneFirefly) {
  if (!firefly.interaction) return
  await startNpcConversation({
    identity: {
      npcId: firefly.interaction.npcId,
      actorId: firefly.id,
      levelId,
      displayName: firefly.interaction.displayName,
      archetype: 'firefly',
    },
    interaction: {
      eventKey:
        firefly.interaction.mode === 'profile'
          ? 'firefly_profile_conversation'
          : 'firefly_lost_soul',
    },
    conversation: getFireflyConversation(firefly),
    context: {
      location: levelId,
      timeOfDay: 'night',
      gameState: {
        fieldId,
        fireflyKind: firefly.interaction.mode,
      },
    },
  })
}

$: buildSignature = JSON.stringify({
  fieldId,
  count,
  radius,
  minHeight,
  maxHeight,
  center,
  terrainFollow,
  terrainReady,
  hasTerrainSampler: Boolean(getHeightAt),
  distribution,
  densityExponent,
  palette,
  interactive,
  color,
  secondaryColor,
  size,
  twinkleSpeed,
  driftSpeed,
})
$: if (buildSignature) {
  buildFireflies()
}
$: resolvedLightCount = Math.min(clampCount(lightCount, 0), fireflies.length)

useTask(delta => {
  if (!enabled) return
  elapsed += delta
})

onDestroy(() => {
  clearFireflyInteractions()
})
</script>

{#if enabled && fireflies.length > 0}
  <T.Group name={fieldId} position={center}>
    {#each fireflies as firefly, index (firefly.id)}
      {@const fireflyPosition = getPosition(firefly, elapsed)}
      {@const pulse = getPulse(firefly, elapsed)}
      <StarSprite
        position={fireflyPosition}
        color={firefly.color}
        size={firefly.size}
        intensity={getSpriteIntensity(pulse)}
        twinkleSpeed={firefly.twinkleSpeed}
        animationOffset={firefly.phase}
        starType="sparkle"
        isKeyElement={false}
        enableTwinkle={true}
        enableHoverScale={false}
        glowBoost={1 + pulse * 1.2}
        opacity={0.95}
        isClickable={Boolean(interactive?.enabled && firefly.interaction)}
        isHovered={hoveredFireflyId === firefly.id}
        onSpriteReady={(sprite) => registerFireflyInteraction(firefly, sprite)}
      />
      {#if index < resolvedLightCount}
        <ManagedLight
          id={`scene-firefly-light-${firefly.id}`}
          ownerId={firefly.id}
          position={fireflyPosition}
          color={firefly.color}
          intensity={getLightIntensity(pulse)}
          distance={lightDistance * (0.78 + pulse * 0.22)}
          decay={lightDecay}
          runtimeBudgeted={lightBudgeted}
        />
      {/if}
    {/each}
  </T.Group>
{/if}
