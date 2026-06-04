<script lang="ts">
import { T, useTask } from '@threlte/core'
import * as THREE from 'three'
import type { QualitySettings } from '../performance/OptimizationManager'
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

const lightVisibilityThreshold = 0.001

let renderedIntensity = 0
let renderedDistance = 0
let renderedVisible = false
let renderedLightInitialized = false

function getPointPosition(
  pointEmitter: RuntimeLightEmitter,
): [number, number, number] {
  return pointEmitter.position ?? [0, 0, 0]
}

function resolveLightBudget(
  pointEmitter: RuntimeLightEmitter,
  qualityLevel: string,
  qualitySettings: QualitySettings,
) {
  if (pointEmitter.runtimeBudgeted === false) {
    const intensity = Math.max(0, pointEmitter.intensity)
    const distance = Math.max(0, pointEmitter.distance ?? 0)
    return {
      visible:
        pointEmitter.enabled !== false && intensity > lightVisibilityThreshold,
      intensity,
      distance,
    }
  }

  const policy = resolveRuntimeVisibilityPolicy(qualityLevel, {
    ...qualitySettings,
    enableDynamicLighting: qualitySettings.enableDynamicLighting,
  })

  return resolveRuntimePointLightVisibility({
    policy,
    sourceIntensity: pointEmitter.intensity,
    sourceDistance: pointEmitter.distance ?? 0,
  })
}

$: pointPosition = getPointPosition(emitter)
$: budgetedLight = resolveLightBudget(
  emitter,
  $qualityLevelStore,
  $qualitySettingsStore,
)
$: if (!renderedLightInitialized && budgetedLight) {
  renderedIntensity = budgetedLight.intensity
  renderedDistance = budgetedLight.distance
  renderedVisible = budgetedLight.visible
  renderedLightInitialized = true
}

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
