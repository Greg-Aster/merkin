<script lang="ts">
import { T } from '@threlte/core'
import { onDestroy } from 'svelte'
import type { DirectionalLight } from 'three'
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

let snapshot: RuntimeLightingSnapshot
let keyLightRef: DirectionalLight | null = null

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

$: environment = snapshot.environment
$: visibilityPolicy = resolveRuntimeVisibilityPolicy(
  $qualityLevelStore,
  $qualitySettingsStore,
)
$: directionalShadowsEnabled =
  visibilityPolicy.shadowsEnabled &&
  environment.shadows.enabled &&
  environment.renderProfileTier !== 'desktop' &&
  environment.shadows.maxCastingLights > 0
$: keyLightShadowMapSize = Math.max(
  1,
  environment.shadows.mapSize ?? $qualitySettingsStore.shadowMapSize,
)
$: shadowCameraSize = environment.shadows.cameraSize ?? 48
$: shadowCameraFar = environment.shadows.cameraFar ?? 90
$: ambientEmitters = snapshot.emitters.filter(isAmbientEmitter)
$: pointEmitters = snapshot.emitters.filter(isPointEmitter)
$: applyKeyLightShadowBudget()

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

    {#each pointEmitters as emitter (emitter.id)}
      <RuntimeManagedPointLight {emitter} />
    {/each}
  </T.Group>
{/if}
