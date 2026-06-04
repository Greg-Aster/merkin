<script lang="ts">
import { T, useTask, useThrelte } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import type { Camera, DirectionalLight } from 'three'
import * as THREE from 'three'
import {
  clearRuntimeLightingTelemetry,
  publishRuntimeLightingTelemetry,
} from '../../stores/runtimeLightingTelemetry'
import { runtimeRenderProfileStore } from '../../stores/runtimeRenderProfileStore'
import {
  qualityLevelStore,
  qualitySettingsStore,
} from '../performance/stores/performanceStore'
import {
  resolveRuntimePointLightVisibility,
  resolveRuntimeVisibilityPolicy,
} from '../performance/utils/runtimeSceneBudget'
import type {
  RuntimeLightBudgetGroup,
  RuntimeLightEmitter,
  RuntimeLightingController,
  RuntimeLightingSnapshot,
  RuntimeResolvedPointLightEmitter,
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
let selectedPointEmitterState = new Map<string, { selectedUntil: number }>()
const pointLightViewPosition = new THREE.Vector3()
const pointLightCameraWorldPosition = new THREE.Vector3()
const pointLightInfluenceFrustum = new THREE.Frustum()
const pointLightInfluenceMatrix = new THREE.Matrix4()
const pointLightInfluenceSphere = new THREE.Sphere()

type PointEmitterWithPosition = RuntimeLightEmitter & {
  kind: 'point'
  position: [number, number, number]
}

type PointLightCandidate = {
  emitter: PointEmitterWithPosition
  resolvedEmitter: RuntimeResolvedPointLightEmitter
  index: number
  distanceToCamera: number
  inCameraView: boolean
  score: number
  selectionScore: number
  stableRank: number
  group: RuntimeLightBudgetGroup
}

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

function isPointEmitterWithPosition(
  emitter: RuntimeLightEmitter,
): emitter is PointEmitterWithPosition {
  return emitter.kind === 'point' && Boolean(emitter.position)
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
  const maxBudgetRange = Math.max(0, policy.pointLightBudget.maxDistance)
  const visibleRange =
    maxBudgetRange > 0
      ? Math.min(Math.max(0, sourceRange), maxBudgetRange)
      : Math.max(0, sourceRange)
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
  resolvedEmitter: RuntimeResolvedPointLightEmitter,
) {
  const budget = policy.pointLightBudget
  const sourceRange = emitter.distance ?? budget.maxDistance
  const rangeCap = budget.maxDistance > 0 ? budget.maxDistance : sourceRange
  const rangeScore = Math.min(Math.max(1, sourceRange), Math.max(1, rangeCap))
  const group = getPointEmitterBudgetGroup(emitter)
  const groupPriority = budget.groupBudgets[group]?.priority ?? 0
  return (
    groupPriority * 1_000_000 +
    Math.max(0, emitter.budget.priority) * 10_000 +
    Math.max(0, resolvedEmitter.intensity) *
      Math.max(1, resolvedEmitter.distance || rangeScore)
  )
}

function getPointEmitterBudgetGroup(
  emitter: RuntimeLightEmitter,
): RuntimeLightBudgetGroup {
  return emitter.budget.group
}

function getStableSelectionRank(emitter: RuntimeLightEmitter) {
  const stableKey =
    emitter.budget.stableKey ||
    `${getPointEmitterBudgetGroup(emitter)}:${emitter.ownerId || emitter.id}`
  let hash = 2166136261
  for (let index = 0; index < stableKey.length; index += 1) {
    hash ^= stableKey.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function getGroupVisibleLimit(
  group: RuntimeLightBudgetGroup,
  policy: ReturnType<typeof resolveRuntimeVisibilityPolicy>,
) {
  const configuredLimit =
    policy.pointLightBudget.groupBudgets[group]?.maxVisibleCount
  if (!Number.isFinite(configuredLimit)) return Number.POSITIVE_INFINITY
  return Math.max(0, Math.floor(Number(configuredLimit)))
}

function getSelectionHoldSeconds(
  policy: ReturnType<typeof resolveRuntimeVisibilityPolicy>,
) {
  return Math.max(0, policy.pointLightBudget.selectionHoldSeconds)
}

function resolveUnbudgetedPointEmitter(
  emitter: PointEmitterWithPosition,
): RuntimeResolvedPointLightEmitter | null {
  const intensity = Math.max(0, emitter.intensity)
  if (emitter.enabled === false || intensity <= 0) return null

  return {
    ...emitter,
    intensity,
    distance: Math.max(0, emitter.distance ?? 0),
    decay: emitter.decay ?? 2,
    position: [...emitter.position],
  }
}

function resolveBudgetedPointEmitter(
  emitter: PointEmitterWithPosition,
  policy: ReturnType<typeof resolveRuntimeVisibilityPolicy>,
): RuntimeResolvedPointLightEmitter | null {
  const resolvedLight = resolveRuntimePointLightVisibility({
    policy,
    sourceIntensity: emitter.intensity,
    sourceDistance: emitter.distance ?? 0,
  })
  if (!resolvedLight.visible) return null

  return {
    ...emitter,
    intensity: resolvedLight.intensity,
    distance: resolvedLight.distance,
    decay: emitter.decay ?? 2,
    position: [...emitter.position],
  }
}

function resolveBudgetedPointEmitters(
  emitters: RuntimeLightEmitter[],
  policy: ReturnType<typeof resolveRuntimeVisibilityPolicy>,
  cameraPosition: [number, number, number] | null,
  activeCamera: Camera | null,
  _refreshToken: number,
): RuntimeResolvedPointLightEmitter[] {
  const budget = policy.pointLightBudget
  const enabledEmitters = emitters
    .filter(emitter => emitter.enabled !== false)
    .filter(isPointEmitterWithPosition)
  const unbudgetedEmitters = enabledEmitters
    .filter(emitter => emitter.budget.budgeted === false)
    .map(resolveUnbudgetedPointEmitter)
    .filter(
      (emitter): emitter is RuntimeResolvedPointLightEmitter =>
        emitter !== null,
    )
  const activeFrustum = preparePointLightInfluenceFrustum(activeCamera)
  const now =
    typeof performance === 'undefined'
      ? Date.now() / 1000
      : performance.now() / 1000
  const budgetedCandidates = enabledEmitters
    .filter(emitter => emitter.budget.budgeted !== false)
    .map((emitter, index) => {
      const resolvedEmitter = resolveBudgetedPointEmitter(emitter, policy)
      if (!resolvedEmitter) return null
      const distanceToCamera = getPointEmitterDistanceToCamera(
        emitter,
        cameraPosition,
      )
      const score = getPointEmitterScore(emitter, policy, resolvedEmitter)
      const selectedState = selectedPointEmitterState.get(emitter.id)
      const selected = Boolean(
        selectedState && selectedState.selectedUntil > now,
      )
      const selectionScore = selected
        ? score * (1 + budget.selectionHysteresis)
        : score
      return {
        emitter,
        resolvedEmitter,
        index,
        distanceToCamera,
        inCameraView: isPointEmitterInfluenceInCameraView(
          emitter,
          activeFrustum,
          distanceToCamera,
          policy,
        ),
        score,
        selectionScore,
        stableRank: getStableSelectionRank(emitter),
        group: getPointEmitterBudgetGroup(emitter),
      }
    })
    .filter((candidate): candidate is PointLightCandidate =>
      Boolean(candidate?.inCameraView),
    )

  if (!budget.enabled || budget.maxVisibleCount <= 0) {
    selectedPointEmitterState = new Map()
    return unbudgetedEmitters
  }

  budgetedCandidates.sort(
    (a, b) =>
      b.selectionScore - a.selectionScore ||
      b.score - a.score ||
      a.distanceToCamera - b.distanceToCamera ||
      a.stableRank - b.stableRank ||
      a.index - b.index,
  )

  const selectedBudgetedIds = new Set<string>()
  const selectedGroupCounts = new Map<RuntimeLightBudgetGroup, number>()
  const activeBudgetedIds = new Set(
    budgetedCandidates.map(candidate => candidate.emitter.id),
  )
  const addCandidate = (candidate: (typeof budgetedCandidates)[number]) => {
    if (selectedBudgetedIds.has(candidate.emitter.id)) return
    if (selectedBudgetedIds.size >= budget.maxVisibleCount) return

    const groupLimit = getGroupVisibleLimit(candidate.group, policy)
    const groupCount = selectedGroupCounts.get(candidate.group) ?? 0
    if (groupCount >= groupLimit) return

    selectedBudgetedIds.add(candidate.emitter.id)
    selectedGroupCounts.set(candidate.group, groupCount + 1)
  }

  const heldCandidates = budgetedCandidates
    .filter(candidate => {
      const state = selectedPointEmitterState.get(candidate.emitter.id)
      return state && state.selectedUntil > now
    })
    .sort(
      (a, b) =>
        (selectedPointEmitterState.get(b.emitter.id)?.selectedUntil ?? 0) -
          (selectedPointEmitterState.get(a.emitter.id)?.selectedUntil ?? 0) ||
        b.score - a.score,
    )

  heldCandidates.forEach(addCandidate)
  budgetedCandidates.forEach(addCandidate)

  const nextSelectedPointEmitterState = new Map(selectedPointEmitterState)
  for (const candidate of budgetedCandidates) {
    if (!selectedBudgetedIds.has(candidate.emitter.id)) continue
    nextSelectedPointEmitterState.set(candidate.emitter.id, {
      selectedUntil: now + getSelectionHoldSeconds(policy),
    })
  }
  for (const [id, state] of nextSelectedPointEmitterState) {
    if (!activeBudgetedIds.has(id) || state.selectedUntil <= now) {
      nextSelectedPointEmitterState.delete(id)
    }
  }
  selectedPointEmitterState = nextSelectedPointEmitterState

  const candidateByEmitterId = new Map(
    budgetedCandidates.map(candidate => [
      candidate.emitter.id,
      candidate.resolvedEmitter,
    ]),
  )

  return [
    ...unbudgetedEmitters,
    ...enabledEmitters
      .filter(emitter => emitter.budget.budgeted !== false)
      .filter(emitter => selectedBudgetedIds.has(emitter.id))
      .map(emitter => candidateByEmitterId.get(emitter.id))
      .filter(
        (emitter): emitter is RuntimeResolvedPointLightEmitter =>
          emitter !== undefined,
      ),
  ]
}

function createRuntimePointLightingTelemetry(
  emitters: RuntimeLightEmitter[],
  activeEmitters: RuntimeResolvedPointLightEmitter[],
) {
  const activeIds = new Set(activeEmitters.map(emitter => emitter.id))
  const groups = new Map<
    RuntimeLightBudgetGroup,
    { totalPointLights: number; activePointLights: number }
  >()
  let totalFireflyPointLights = 0
  let activeFireflyPointLights = 0

  for (const emitter of emitters) {
    const group = getPointEmitterBudgetGroup(emitter)
    const groupTelemetry = groups.get(group) ?? {
      totalPointLights: 0,
      activePointLights: 0,
    }
    groupTelemetry.totalPointLights += 1
    if (activeIds.has(emitter.id)) {
      groupTelemetry.activePointLights += 1
    }
    groups.set(group, groupTelemetry)

    if (group === 'firefly-npc') {
      totalFireflyPointLights += 1
      if (activeIds.has(emitter.id)) activeFireflyPointLights += 1
    }
  }

  return {
    pointLights: {
      total: emitters.length,
      active: activeEmitters.length,
      inactive: Math.max(0, emitters.length - activeEmitters.length),
    },
    fireflyPointLights: {
      total: totalFireflyPointLights,
      active: activeFireflyPointLights,
      inactive: Math.max(0, totalFireflyPointLights - activeFireflyPointLights),
    },
    groups: Object.fromEntries(groups),
  }
}

$: environment = snapshot.environment
$: visibilityPolicy = resolveRuntimeVisibilityPolicy(
  $qualityLevelStore,
  $qualitySettingsStore,
  $runtimeRenderProfileStore.lighting.pointLightBudget,
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
$: resolvedPointEmitters = resolveBudgetedPointEmitters(
  pointEmitters,
  visibilityPolicy,
  activeCameraPosition,
  activeCameraRef,
  pointLightBudgetRefreshToken,
)
$: publishRuntimeLightingTelemetry(
  createRuntimePointLightingTelemetry(pointEmitters, resolvedPointEmitters),
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
  clearRuntimeLightingTelemetry()
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

    {#each resolvedPointEmitters as emitter (emitter.id)}
      <RuntimeManagedPointLight {emitter} />
    {/each}
  </T.Group>
{/if}
