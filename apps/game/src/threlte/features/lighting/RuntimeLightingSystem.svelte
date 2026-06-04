<script lang="ts">
import { T, useTask, useThrelte } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import type { Camera, DirectionalLight } from 'three'
import * as THREE from 'three'
import {
  qualityLevelStore,
  qualitySettingsStore,
} from '../performance/stores/performanceStore'
import { resolveRuntimeVisibilityPolicy } from '../performance/utils/runtimeSceneBudget'
import type {
  RuntimeLightEmitter,
  RuntimeLightingController,
  RuntimeLightingSnapshot,
} from './RuntimeLightingController'
import RuntimeManagedPointLight from './RuntimeManagedPointLight.svelte'

export let controller: RuntimeLightingController

const { camera } = useThrelte()

let snapshot: RuntimeLightingSnapshot
let keyLightRef: DirectionalLight | null = null
let activeCameraPosition: [number, number, number] | null = null
let activeCameraRef: Camera | null = null
let pointLightDistanceAccumulator = 0
let pointLightBudgetRefreshToken = 0
const pointLightViewPosition = new THREE.Vector3()
const pointLightCameraWorldPosition = new THREE.Vector3()
const pointLightInfluenceFrustum = new THREE.Frustum()
const pointLightInfluenceMatrix = new THREE.Matrix4()
const pointLightInfluenceSphere = new THREE.Sphere()

const unsubscribe = controller.subscribe(value => {
  snapshot = value
})

function applyKeyLightShadowBudget() {
  if (!keyLightRef || !environment) return

  keyLightRef.shadow.mapSize.width = keyLightShadowMapSize
  keyLightRef.shadow.mapSize.height = keyLightShadowMapSize
  keyLightRef.shadow.camera.left = -shadowCameraSize
  keyLightRef.shadow.camera.right = shadowCameraSize
  keyLightRef.shadow.camera.top = shadowCameraSize
  keyLightRef.shadow.camera.bottom = -shadowCameraSize
  keyLightRef.shadow.camera.far = shadowCameraFar
  keyLightRef.shadow.camera.updateProjectionMatrix()
}

function isAmbientEmitter(emitter: RuntimeLightEmitter) {
  return emitter.kind === 'ambient'
}

function isPointEmitter(emitter: RuntimeLightEmitter) {
  return emitter.kind === 'point'
}

function getActiveCamera(): Camera | null {
  const candidate = camera as Camera & { current?: Camera | null }
  const resolved = candidate?.current ?? candidate
  return resolved?.position ? resolved : null
}

function updatePointLightBudgetCamera() {
  const activeCamera = getActiveCamera()
  if (!activeCamera) return

  activeCamera.updateMatrixWorld()
  const cameraWithProjectionUpdate = activeCamera as Camera & {
    updateProjectionMatrix?: () => void
  }
  cameraWithProjectionUpdate.updateProjectionMatrix?.()
  activeCameraRef = activeCamera
  activeCamera.getWorldPosition(pointLightCameraWorldPosition)
  activeCameraPosition = [
    pointLightCameraWorldPosition.x,
    pointLightCameraWorldPosition.y,
    pointLightCameraWorldPosition.z,
  ]
  pointLightBudgetRefreshToken += 1
}

function getPointEmitterDistanceToCamera(
  emitter: RuntimeLightEmitter,
  cameraPosition: [number, number, number] | null,
) {
  if (!cameraPosition || !emitter.position) return 0

  const dx = emitter.position[0] - cameraPosition[0]
  const dy = emitter.position[1] - cameraPosition[1]
  const dz = emitter.position[2] - cameraPosition[2]
  return Math.hypot(dx, dy, dz)
}

function preparePointLightInfluenceFrustum(activeCamera: Camera | null) {
  if (!activeCamera) return null

  activeCamera.updateMatrixWorld()
  const cameraWithProjectionUpdate = activeCamera as Camera & {
    updateProjectionMatrix?: () => void
  }
  cameraWithProjectionUpdate.updateProjectionMatrix?.()
  pointLightInfluenceMatrix.multiplyMatrices(
    activeCamera.projectionMatrix,
    activeCamera.matrixWorldInverse,
  )
  pointLightInfluenceFrustum.setFromProjectionMatrix(pointLightInfluenceMatrix)
  return pointLightInfluenceFrustum
}

function getPointEmitterInfluenceRadius(
  emitter: RuntimeLightEmitter,
  policy: ReturnType<typeof resolveRuntimeVisibilityPolicy>,
) {
  const sourceRange =
    typeof emitter.distance === 'number' && Number.isFinite(emitter.distance)
      ? emitter.distance
      : policy.pointLightBudget.maxDistance
  const visibleRange = Math.min(
    Math.max(0, sourceRange),
    Math.max(0, policy.pointLightBudget.maxDistance),
  )
  return Math.max(0.1, visibleRange)
}

function isPointEmitterInfluenceInCameraView(
  emitter: RuntimeLightEmitter,
  activeFrustum: THREE.Frustum | null,
  distanceToCamera: number,
  policy: ReturnType<typeof resolveRuntimeVisibilityPolicy>,
) {
  if (!activeFrustum || !emitter.position) return true
  if (distanceToCamera <= 0.75) return true

  pointLightViewPosition.set(
    emitter.position[0],
    emitter.position[1],
    emitter.position[2],
  )
  pointLightInfluenceSphere.set(
    pointLightViewPosition,
    getPointEmitterInfluenceRadius(emitter, policy),
  )
  return activeFrustum.intersectsSphere(pointLightInfluenceSphere)
}

function getPointEmitterScore(
  emitter: RuntimeLightEmitter,
  policy: ReturnType<typeof resolveRuntimeVisibilityPolicy>,
) {
  const budget = policy.pointLightBudget
  const sourceRange = emitter.distance ?? budget.maxDistance
  const rangeScore = Math.min(
    Math.max(1, sourceRange),
    Math.max(1, budget.maxDistance),
  )
  return Math.max(0, emitter.intensity) * rangeScore
}

function resolveBudgetedPointEmitters(
  emitters: RuntimeLightEmitter[],
  policy: ReturnType<typeof resolveRuntimeVisibilityPolicy>,
  cameraPosition: [number, number, number] | null,
  activeCamera: Camera | null,
  _refreshToken: number,
) {
  const budget = policy.pointLightBudget
  const enabledEmitters = emitters.filter(emitter => emitter.enabled !== false)
  const unbudgetedEmitters = enabledEmitters.filter(
    emitter => emitter.runtimeBudgeted === false,
  )
  const activeFrustum = preparePointLightInfluenceFrustum(activeCamera)
  const budgetedCandidates = enabledEmitters
    .filter(emitter => emitter.runtimeBudgeted !== false && emitter.position)
    .map((emitter, index) => {
      const distanceToCamera = getPointEmitterDistanceToCamera(
        emitter,
        cameraPosition,
      )
      return {
        emitter,
        index,
        distanceToCamera,
        inCameraView: isPointEmitterInfluenceInCameraView(
          emitter,
          activeFrustum,
          distanceToCamera,
          policy,
        ),
        score: getPointEmitterScore(emitter, policy),
      }
    })
    .filter(candidate => candidate.inCameraView)

  if (!budget.enabled || budget.maxVisibleCount <= 0) {
    return unbudgetedEmitters
  }

  budgetedCandidates.sort(
    (a, b) =>
      b.score - a.score ||
      a.distanceToCamera - b.distanceToCamera ||
      a.index - b.index,
  )

  const selectedBudgetedIds = new Set(
    budgetedCandidates
      .slice(0, budget.maxVisibleCount)
      .map(candidate => candidate.emitter.id),
  )

  return enabledEmitters.filter(
    emitter =>
      emitter.runtimeBudgeted === false || selectedBudgetedIds.has(emitter.id),
  )
}

$: environment = snapshot.environment
$: visibilityPolicy = resolveRuntimeVisibilityPolicy(
  $qualityLevelStore,
  $qualitySettingsStore,
)
$: directionalShadowsEnabled =
  visibilityPolicy.shadowsEnabled &&
  environment.shadows.enabled &&
  environment.shadows.maxCastingLights > 0
$: keyLightShadowMapSize = Math.max(
  1,
  environment.shadows.mapSize ?? $qualitySettingsStore.shadowMapSize,
)
$: shadowCameraSize = environment.shadows.cameraSize ?? 48
$: shadowCameraFar = environment.shadows.cameraFar ?? 90
$: ambientEmitters = snapshot.emitters.filter(isAmbientEmitter)
$: pointEmitters = snapshot.emitters.filter(isPointEmitter)
$: budgetedPointEmitters = resolveBudgetedPointEmitters(
  pointEmitters,
  visibilityPolicy,
  activeCameraPosition,
  activeCameraRef,
  pointLightBudgetRefreshToken,
)
$: applyKeyLightShadowBudget()

useTask(delta => {
  pointLightDistanceAccumulator += delta
  if (pointLightDistanceAccumulator < 0.25) return
  pointLightDistanceAccumulator = 0
  updatePointLightBudgetCamera()
})

onMount(() => {
  updatePointLightBudgetCamera()
})

onDestroy(() => {
  unsubscribe()
})
</script>

{#if environment}
  <T.Group name="runtime-lighting-system">
    <T.AmbientLight
      intensity={environment.ambientIntensity}
      color={environment.ambientColor}
    />
    <T.HemisphereLight
      skyColor={environment.skyColor}
      groundColor={environment.groundColor}
      intensity={environment.hemisphereIntensity}
    />
    <T.DirectionalLight
      bind:ref={keyLightRef}
      position={environment.keyLightPosition}
      color={environment.keyLightColor}
      intensity={environment.keyLightIntensity}
      castShadow={directionalShadowsEnabled}
    />
    <T.DirectionalLight
      position={environment.fillLightPosition}
      color={environment.fillLightColor}
      intensity={environment.fillLightIntensity}
      castShadow={false}
    />

    {#each ambientEmitters as emitter (emitter.id)}
      <T.AmbientLight color={emitter.color} intensity={emitter.intensity} />
    {/each}

		{#each budgetedPointEmitters as emitter (emitter.id)}
			<RuntimeManagedPointLight {emitter} />
		{/each}
  </T.Group>
{/if}
