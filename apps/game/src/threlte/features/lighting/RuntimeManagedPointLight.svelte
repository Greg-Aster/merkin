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

let currentDistanceToCamera = 0
let distanceAccumulator = 0

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
    return {
      visible: emitter.enabled !== false,
      intensity: emitter.intensity,
      distance: emitter.distance ?? 0,
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

useTask(delta => {
  distanceAccumulator += delta
  if (distanceAccumulator < 0.25) return
  distanceAccumulator = 0
  updateCameraDistance()
})
</script>

<T.PointLight
  position={pointPosition}
  color={emitter.color}
  intensity={budgetedLight.intensity}
  distance={budgetedLight.distance}
  decay={emitter.decay ?? 2}
  visible={budgetedLight.visible}
  castShadow={false}
/>
