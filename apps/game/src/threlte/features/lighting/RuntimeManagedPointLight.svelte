<script lang="ts">
import { T, useTask } from '@threlte/core'
import * as THREE from 'three'
import type { RuntimeResolvedPointLightEmitter } from './RuntimeLightingController'

export let emitter: RuntimeResolvedPointLightEmitter

const lightVisibilityThreshold = 0.001

let renderedIntensity = 0
let renderedDistance = 0
let renderedVisible = false
let renderedLightInitialized = false

function getPointPosition(
  pointEmitter: RuntimeResolvedPointLightEmitter,
): [number, number, number] {
  return pointEmitter.position
}

$: pointPosition = getPointPosition(emitter)
$: targetIntensity = Math.max(0, emitter.intensity)
$: targetDistance = Math.max(0, emitter.distance)
$: targetVisible =
  emitter.enabled !== false && targetIntensity > lightVisibilityThreshold
$: if (!renderedLightInitialized) {
  renderedIntensity = targetIntensity
  renderedDistance = targetDistance
  renderedVisible = targetVisible
  renderedLightInitialized = true
}

useTask(delta => {
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
    targetVisible ||
    renderedIntensity > lightVisibilityThreshold ||
    renderedDistance > lightVisibilityThreshold
})
</script>

<T.PointLight
  position={pointPosition}
  color={emitter.color}
  intensity={renderedIntensity}
  distance={renderedDistance}
  decay={emitter.decay}
  visible={renderedVisible}
  castShadow={emitter.castsShadow ?? false}
/>
