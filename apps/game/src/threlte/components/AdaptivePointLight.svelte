<script lang="ts">
import { T, useTask, useThrelte } from '@threlte/core'
import * as THREE from 'three'
import {
  qualityLevelStore,
  qualitySettingsStore,
} from '../features/performance/stores/performanceStore'
import {
  resolveRuntimePointLightVisibility,
  resolveRuntimeVisibilityPolicy,
} from '../features/performance/utils/runtimeSceneBudget'

export let position: [number, number, number] = [0, 0, 0]
export let color = '#ffffff'
export let intensity = 1
export let distance = 0
export let decay = 2

const { camera } = useThrelte()
const worldPosition = new THREE.Vector3()
let pointLightRef: THREE.PointLight | null = null
let visible = true
let effectiveIntensity = intensity
let effectiveDistance = distance
let distanceAccumulator = 0
let currentDistanceToCamera = 0

function getActiveCamera(): THREE.Camera | null {
  const candidate = camera as THREE.Camera & { current?: THREE.Camera | null }
  const resolved = candidate?.current ?? candidate
  return resolved && resolved.position instanceof THREE.Vector3
    ? resolved
    : null
}

function applyLightBudget() {
  const policy = resolveRuntimeVisibilityPolicy(
    $qualityLevelStore,
    $qualitySettingsStore,
  )
  const lightVisibility = resolveRuntimePointLightVisibility({
    policy,
    distanceToCamera: currentDistanceToCamera,
    sourceIntensity: intensity,
    sourceDistance: distance,
  })

  visible = lightVisibility.visible
  effectiveIntensity = lightVisibility.intensity
  effectiveDistance = lightVisibility.distance
}

$: applyLightBudget()

useTask(delta => {
  const activeCamera = getActiveCamera()
  if (!activeCamera || !pointLightRef) return

  distanceAccumulator += delta
  if (distanceAccumulator < 0.25) return
  distanceAccumulator = 0

  pointLightRef.getWorldPosition(worldPosition)
  currentDistanceToCamera = activeCamera.position.distanceTo(worldPosition)
  applyLightBudget()
})
</script>

<T.PointLight
  bind:ref={pointLightRef}
  {position}
  {color}
  intensity={effectiveIntensity}
  distance={effectiveDistance}
  {decay}
  visible={visible}
  castShadow={false}
/>
