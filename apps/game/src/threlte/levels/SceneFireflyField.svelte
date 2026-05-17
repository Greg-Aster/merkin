<script lang="ts">
import { T, useTask } from '@threlte/core'
import StarSprite from '../components/StarSprite.svelte'
import ManagedLight from '../features/lighting/ManagedLight.svelte'

interface SceneFirefly {
  id: string
  position: [number, number, number]
  phase: number
  color: string
  size: number
  twinkleSpeed: number
  driftSpeed: number
}

export let enabled = true
export let fieldId = 'scene-fireflies'
export let count = 36
export let lightCount = 8
export let radius = 120
export let minHeight = 2
export let maxHeight = 5
export let center: [number, number, number] = [0, 0, 0]
export let color = '#f4ffb8'
export let secondaryColor = '#8defff'
export let size = 0.58
export let spriteIntensity = 1.45
export let lightIntensity = 44
export let lightDistance = 28
export let lightDecay = 1.35
export let twinkleSpeed = 0.82
export let driftSpeed = 0.28
export let sway = 1.5

let elapsed = 0
let fireflies: SceneFirefly[] = []

function clampCount(value: number, fallback: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback
}

function seededUnit(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return value - Math.floor(value)
}

function buildFireflies() {
  const resolvedCount = clampCount(count, 0)
  const resolvedRadius = Math.max(0, radius)
  const heightSpan = Math.max(0.1, maxHeight - minHeight)
  const nextFireflies: SceneFirefly[] = []

  for (let index = 0; index < resolvedCount; index += 1) {
    const angle = seededUnit(index, 1) * Math.PI * 2
    const distance = Math.sqrt(seededUnit(index, 2)) * resolvedRadius
    const height = minHeight + seededUnit(index, 3) * heightSpan
    const tint = index % 4 === 0 ? secondaryColor : color

    nextFireflies.push({
      id: `${fieldId}-${index}`,
      position: [
        Math.cos(angle) * distance,
        height,
        Math.sin(angle) * distance,
      ],
      phase: seededUnit(index, 4) * Math.PI * 2,
      color: tint,
      size: size * (0.75 + seededUnit(index, 5) * 0.55),
      twinkleSpeed: twinkleSpeed * (0.75 + seededUnit(index, 6) * 0.65),
      driftSpeed: driftSpeed * (0.75 + seededUnit(index, 7) * 0.6),
    })
  }

  fireflies = nextFireflies
}

function getPosition(firefly: SceneFirefly): [number, number, number] {
  const phase = firefly.phase + elapsed * firefly.driftSpeed
  return [
    firefly.position[0] + Math.sin(phase) * sway,
    firefly.position[1] + Math.sin(phase * 1.37) * Math.min(0.7, sway * 0.35),
    firefly.position[2] + Math.cos(phase * 0.83) * sway,
  ]
}

function getPulse(firefly: SceneFirefly) {
  const wave =
    (Math.sin(elapsed * firefly.twinkleSpeed + firefly.phase) + 1) / 2
  const threshold = 0.78
  if (wave <= threshold) return 0
  return Math.min(1, (wave - threshold) / (1 - threshold))
}

function getSpriteIntensity(pulse: number) {
  return spriteIntensity * (0.55 + pulse * 0.85)
}

function getLightIntensity(pulse: number) {
  return lightIntensity * pulse * pulse
}

$: buildSignature = JSON.stringify({
  fieldId,
  count,
  radius,
  minHeight,
  maxHeight,
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
</script>

{#if enabled && fireflies.length > 0}
  <T.Group name={fieldId} position={center}>
    {#each fireflies as firefly, index (firefly.id)}
      {@const fireflyPosition = getPosition(firefly)}
      {@const pulse = getPulse(firefly)}
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
      />
      {#if index < resolvedLightCount && pulse > 0.02}
        <ManagedLight
          id={`scene-firefly-light-${firefly.id}`}
          ownerId={firefly.id}
          position={fireflyPosition}
          color={firefly.color}
          intensity={getLightIntensity(pulse)}
          distance={lightDistance * (0.78 + pulse * 0.22)}
          decay={lightDecay}
        />
      {/if}
    {/each}
  </T.Group>
{/if}
