<script lang="ts">
import { T, useTask, useThrelte } from '@threlte/core'
import * as THREE from 'three'
import {
  qualityLevelStore,
  qualitySettingsStore,
} from '../performance/stores/performanceStore'
import {
  resolveRuntimePointLightVisibility,
  resolveRuntimeVisibilityPolicy,
} from '../performance/utils/runtimeSceneBudget'
import type { RuntimeLightEmitter } from './RuntimeLightingController'

export let emitter: RuntimeLightEmitter

const { camera } = useThrelte()
const worldPosition = new THREE.Vector3()
const lightVisibilityThreshold = 0.001

let currentDistanceToCamera = 0
let distanceAccumulator = 0
let renderedIntensity = 0
let renderedDistance = 0
let renderedVisible = false
let renderedLightInitialized = false

function getActiveCamera(): THREE.Camera | null {
  const candidate = camera as THREE.Camera & { current?: THREE.Camera | null }
  const resolved = candidate?.current ?? candidate
  return resolved && resolved.position instanceof THREE.Vector3
    ? resolved
    : null
}

function getPointPosition(): [number, number, number] {
  return emitter.position ?? [0, 0, 0]
}

function updateCameraDistance() {
  const activeCamera = getActiveCamera()
  if (!activeCamera) return

  const position = getPointPosition()
  worldPosition.set(position[0], position[1], position[2])
  currentDistanceToCamera = activeCamera.position.distanceTo(worldPosition)
}

function resolveLightBudget() {
  if (emitter.runtimeBudgeted === false) {
    const intensity = Math.max(0, emitter.intensity)
    const distance = Math.max(0, emitter.distance ?? 0)
    return {
      visible:
        emitter.enabled !== false && intensity > lightVisibilityThreshold,
      intensity,
      distance,
    }
  }

  const policy = resolveRuntimeVisibilityPolicy($qualityLevelStore, {
    ...$qualitySettingsStore,
    enableDynamicLighting: $qualitySettingsStore.enableDynamicLighting,
  })

  return resolveRuntimePointLightVisibility({
    policy,
    distanceToCamera: currentDistanceToCamera,
    sourceIntensity: emitter.intensity,
    sourceDistance: emitter.distance ?? 0,
  })
}

$: pointPosition = getPointPosition()
$: budgetedLight = resolveLightBudget()
$: if (!renderedLightInitialized && budgetedLight) {
  renderedIntensity = budgetedLight.intensity
  renderedDistance = budgetedLight.distance
  renderedVisible = budgetedLight.visible
  renderedLightInitialized = true
}

useTask(delta => {
  distanceAccumulator += delta
  if (distanceAccumulator < 0.25) return
  distanceAccumulator = 0
  updateCameraDistance()
})

useTask(delta => {
  const targetIntensity = budgetedLight.visible ? budgetedLight.intensity : 0
  const targetDistance = budgetedLight.visible ? budgetedLight.distance : 0
  const intensityDamping = targetIntensity > renderedIntensity ? 12 : 4.5
  const distanceDamping = targetDistance > renderedDistance ? 10 : 4

  renderedIntensity = THREE.MathUtils.damp(
    renderedIntensity,
    targetIntensity,
    intensityDamping,
    delta,
  )
  renderedDistance = THREE.MathUtils.damp(
    renderedDistance,
    targetDistance,
    distanceDamping,
    delta,
  )
  renderedVisible =
    budgetedLight.visible ||
    renderedIntensity > lightVisibilityThreshold ||
    renderedDistance > lightVisibilityThreshold
})
</script>

<T.PointLight
  position={pointPosition}
  color={emitter.color}
  intensity={renderedIntensity}
  distance={renderedDistance}
  decay={emitter.decay ?? 2}
  visible={renderedVisible}
  castShadow={false}
/>
