<script lang="ts">
import { T, useTask, useThrelte } from '@threlte/core'
import { AdditiveBlending, DoubleSide } from 'three'
import type { TimelineAutopilotPhase } from './timelinePortalFlight'

type Position = [number, number, number]
type TimelineTemporalTarget = {
  x: number
  y: number
  z: number
  scale: number
}

export let cameraPosition: Position = [0, 0, 0]
export let target: TimelineTemporalTarget | null = null
export let railPosition: Position = [0, 0, 0]
export let sceneScale = 1
export let effectStrength = 0
export let autopilotPhase: TimelineAutopilotPhase = 'manual'
export let eraAccent = '#67e8f9'
export let viewMode: 'travel' | 'map' = 'travel'
export let motionEnabled = true
export let portraitMobile = false

const warpRingIndexes = Array.from({ length: 12 }, (_, index) => index)
const timeEchoIndexes = [0, 1, 2]
const eraRiftIndexes = [0, 1]
const flareIndexes = [0, 1]
const additiveBlending = AdditiveBlending
const doubleSide = DoubleSide
const { invalidate } = useThrelte()

let temporalTime = 0
let currentStrength = 0
let arrivalProgress = 1
let eraRiftProgress = 1
let observedAutopilotPhase: TimelineAutopilotPhase = 'manual'
let observedEraAccent = ''

$: targetWorldPosition = target
  ? ([
      (railPosition[0] + target.x) * sceneScale,
      (railPosition[1] + target.y) * sceneScale,
      (railPosition[2] + target.z) * sceneScale,
    ] as Position)
  : null
$: if (autopilotPhase !== observedAutopilotPhase) {
  if (autopilotPhase === 'dwell') arrivalProgress = motionEnabled ? 0 : 1
  observedAutopilotPhase = autopilotPhase
  invalidate()
}
$: if (eraAccent !== observedEraAccent) {
  if (observedEraAccent) eraRiftProgress = motionEnabled ? 0 : 1
  observedEraAccent = eraAccent
  invalidate()
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function getWarpRing(index: number) {
  const count = portraitMobile ? 8 : warpRingIndexes.length
  const progress = ((index / count) + temporalTime * (0.12 + currentStrength * 0.16)) % 1
  const radius = (2.2 + progress * 3.2) * (portraitMobile ? 0.78 : 1)
  return {
    position: [
      cameraPosition[0] + Math.sin(index * 1.7 + temporalTime * 0.32) * progress * 0.28,
      cameraPosition[1] + Math.cos(index * 1.3 + temporalTime * 0.26) * progress * 0.2,
      cameraPosition[2] - 3.8 - progress * 38,
    ] as Position,
    scale: [radius, radius, 1] as Position,
    rotation: index * 0.47 + temporalTime * (index % 2 === 0 ? 0.11 : -0.08),
    opacity: currentStrength * Math.sin(progress * Math.PI) * (index % 3 === 0 ? 0.12 : 0.065),
    color: index % 3 === 0 ? eraAccent : index % 2 === 0 ? '#67e8f9' : '#c084fc',
  }
}

function getTimeEcho(index: number) {
  const progress = ((temporalTime * 0.24) + index / timeEchoIndexes.length) % 1
  const radius = (target?.scale ?? 1) * (1.25 + progress * 2.4)
  return {
    position: targetWorldPosition
      ? ([
          targetWorldPosition[0],
          targetWorldPosition[1],
          targetWorldPosition[2] + index * 0.08,
        ] as Position)
      : ([0, 0, -100] as Position),
    scale: [radius, radius, 1] as Position,
    opacity: currentStrength * (1 - progress) * 0.1,
  }
}

function getArrivalPulse() {
  const eased = 1 - Math.pow(1 - arrivalProgress, 3)
  const radius = (target?.scale ?? 1) * (1.35 + eased * 7.5)
  return {
    scale: [radius, radius, 1] as Position,
    opacity: Math.sin(arrivalProgress * Math.PI) * (1 - arrivalProgress) * 0.42,
  }
}

function getEraRift(index: number) {
  const progress = clamp01(eraRiftProgress - index * 0.12)
  const radius = 1.8 + progress * (portraitMobile ? 9 : 14)
  return {
    position: [cameraPosition[0], cameraPosition[1], cameraPosition[2] - 7 - index * 0.8] as Position,
    scale: [radius, radius, 1] as Position,
    opacity: Math.sin(progress * Math.PI) * (1 - progress) * (index === 0 ? 0.34 : 0.18),
  }
}

function getBackgroundFlare(index: number) {
  const cycle = (temporalTime * 0.045 + (index === 0 ? 0.18 : 0.62)) % 1
  const pulse = cycle < 0.075 ? Math.sin((cycle / 0.075) * Math.PI) : 0
  const horizontalOffset = (index === 0 ? -1 : 1) * (portraitMobile ? 3.1 : 7.2)
  const verticalOffset = index === 0 ? 3.6 : -2.8
  const radius = 0.55 + pulse * 2.6
  return {
    position: [
      cameraPosition[0] + horizontalOffset,
      cameraPosition[1] + verticalOffset,
      cameraPosition[2] - 22 - index * 7,
    ] as Position,
    scale: [radius, radius, 1] as Position,
    opacity: pulse * currentStrength * 0.24,
  }
}

useTask(delta => {
  const frameDelta = Math.min(delta, 0.05)
  const targetStrength = motionEnabled && viewMode === 'travel'
    ? clamp01(effectStrength)
    : 0
  const strengthEase = 1 - Math.exp(-frameDelta * 5.6)
  currentStrength += (targetStrength - currentStrength) * strengthEase
  if (currentStrength < 0.001 && targetStrength === 0) currentStrength = 0
  if (currentStrength > 0) temporalTime += frameDelta
  if (arrivalProgress < 1) arrivalProgress = clamp01(arrivalProgress + frameDelta / 1.65)
  if (eraRiftProgress < 1) eraRiftProgress = clamp01(eraRiftProgress + frameDelta / 2.05)

  if (
    currentStrength > 0 ||
    Math.abs(targetStrength - currentStrength) > 0.002 ||
    arrivalProgress < 1 ||
    eraRiftProgress < 1
  ) invalidate()
}, { autoInvalidate: false })
</script>

{#if viewMode === 'travel' && motionEnabled}
  {#each warpRingIndexes as index}
    {#if !portraitMobile || index < 8}
      {@const ring = getWarpRing(index)}
      <T.Mesh position={ring.position} scale={ring.scale} rotation={[0, 0, ring.rotation]} renderOrder={-8}>
        <T.RingGeometry args={[0.982, 1, 64]} />
        <T.MeshBasicMaterial
          color={ring.color}
          opacity={ring.opacity}
          side={doubleSide}
          transparent={true}
          blending={additiveBlending}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </T.Mesh>
    {/if}
  {/each}

  {#if targetWorldPosition && autopilotPhase === 'travel'}
    {#each timeEchoIndexes as index}
      {@const echo = getTimeEcho(index)}
      <T.Mesh position={echo.position} scale={echo.scale} renderOrder={4}>
        <T.RingGeometry args={[0.975, 1, 48]} />
        <T.MeshBasicMaterial
          color={index % 2 === 0 ? eraAccent : '#f0abfc'}
          opacity={echo.opacity}
          side={doubleSide}
          transparent={true}
          blending={additiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </T.Mesh>
    {/each}
  {/if}

  {#if targetWorldPosition && arrivalProgress < 1}
    {@const arrival = getArrivalPulse()}
    <T.Mesh position={targetWorldPosition} scale={arrival.scale} renderOrder={7}>
      <T.RingGeometry args={[0.95, 1, 72]} />
      <T.MeshBasicMaterial
        color="#f8fafc"
        opacity={arrival.opacity}
        side={doubleSide}
        transparent={true}
        blending={additiveBlending}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </T.Mesh>
  {/if}

  {#if eraRiftProgress < 1}
    {#each eraRiftIndexes as index}
      {@const rift = getEraRift(index)}
      <T.Mesh position={rift.position} scale={rift.scale} renderOrder={6}>
        <T.RingGeometry args={[0.97, 1, 72]} />
        <T.MeshBasicMaterial
          color={index === 0 ? eraAccent : '#f0abfc'}
          opacity={rift.opacity}
          side={doubleSide}
          transparent={true}
          blending={additiveBlending}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </T.Mesh>
    {/each}
  {/if}

  {#if currentStrength > 0.05}
    {#each flareIndexes as index}
      {@const flare = getBackgroundFlare(index)}
      <T.Mesh position={flare.position} scale={flare.scale} renderOrder={-4}>
        <T.RingGeometry args={[0.93, 1, 48]} />
        <T.MeshBasicMaterial
          color={index === 0 ? '#fef08a' : '#f0abfc'}
          opacity={flare.opacity}
          side={doubleSide}
          transparent={true}
          blending={additiveBlending}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </T.Mesh>
    {/each}
  {/if}
{/if}
