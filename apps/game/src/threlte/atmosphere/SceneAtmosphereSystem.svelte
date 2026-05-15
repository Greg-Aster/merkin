<script lang="ts">
import { useTask, useThrelte } from '@threlte/core'
import { onDestroy, tick } from 'svelte'
import * as THREE from 'three'
import { setRuntimeDiagnostic } from '../stores/runtimeDiagnosticsStore'
import {
  type SceneAtmosphereDefinition,
  clearSceneAtmosphereMaterialRegistry,
  createDisabledSceneAtmosphereDefinition,
  getSceneAtmosphereMaterialDiagnostics,
  refreshSceneAtmosphereParticipants,
  runtimeAtmosphereToSceneAtmosphereDefinition,
  setSceneAtmosphereDefinition,
} from './atmosphereMaterialRegistry'
import { DEFAULT_RUNTIME_ATMOSPHERE } from './buildRuntimeAtmosphere'
import type { RuntimeAtmosphereDefinition } from './runtimeAtmosphereTypes'

export let levelId = ''
export let atmosphere: RuntimeAtmosphereDefinition = DEFAULT_RUNTIME_ATMOSPHERE
export let refreshKey = ''
export let scanIntervalSeconds = 5

const { scene, invalidate } = useThrelte()

let fog: THREE.FogExp2 | null = null
let deferredMaterialRefreshToken = 0
let lastAtmosphereKey = ''
let lastRefreshKey = ''
let lastDiagnosticSignature = ''
let scanAccumulator = 0
let activeAtmosphere = createDisabledSceneAtmosphereDefinition()

function getAtmosphereKey(atmosphere: SceneAtmosphereDefinition) {
  return [
    atmosphere.enabled ? 1 : 0,
    atmosphere.distanceFog.enabled ? 1 : 0,
    atmosphere.distanceFog.color.getHexString(),
    atmosphere.distanceFog.density,
    atmosphere.heightFog.enabled ? 1 : 0,
    atmosphere.heightFog.color.getHexString(),
    atmosphere.heightFog.density,
    atmosphere.heightFog.floor,
    atmosphere.heightFog.ceiling,
    atmosphere.source.levelId ?? '',
    atmosphere.source.refreshKey ?? '',
  ].join('|')
}

function syncSceneFog(atmosphere: SceneAtmosphereDefinition) {
  if (!scene) return

  if (!atmosphere.enabled) {
    if (scene.fog === fog) scene.fog = null
    fog = null
    return
  }

  const fogColor = atmosphere.distanceFog.enabled
    ? atmosphere.distanceFog.color
    : atmosphere.heightFog.color
  const fogDensity = atmosphere.distanceFog.enabled
    ? atmosphere.distanceFog.density
    : 0

  if (!fog) {
    fog = new THREE.FogExp2(fogColor, fogDensity)
  }

  fog.color.copy(fogColor)
  fog.density = fogDensity
  scene.fog = fog
}

function publishAtmosphereDiagnostic(
  sceneAtmosphere: SceneAtmosphereDefinition,
  reason: string,
) {
  const diagnostics = getSceneAtmosphereMaterialDiagnostics()
  const diagnosticSignature = JSON.stringify({
    atmosphere: getAtmosphereKey(sceneAtmosphere),
    diagnostics,
  })
  if (diagnosticSignature === lastDiagnosticSignature) return
  lastDiagnosticSignature = diagnosticSignature

  const level = !sceneAtmosphere.enabled
    ? 'idle'
    : diagnostics.warningBypassedMaterialCount > 0
      ? 'warning'
      : diagnostics.heightParticipantCount > 0 ||
          diagnostics.distanceParticipantCount > 0
        ? 'ready'
        : 'warning'

  const message = !sceneAtmosphere.enabled
    ? 'Scene atmosphere disabled.'
    : `Distance fog ${sceneAtmosphere.distanceFog.enabled ? 'on' : 'off'} density ${sceneAtmosphere.distanceFog.density.toFixed(5)}; height fog ${sceneAtmosphere.heightFog.enabled ? 'on' : 'off'} floor ${sceneAtmosphere.heightFog.floor.toFixed(2)} ceiling ${sceneAtmosphere.heightFog.ceiling.toFixed(2)} density ${sceneAtmosphere.heightFog.density.toFixed(5)}; materials ${diagnostics.distanceParticipantCount} distance / ${diagnostics.heightParticipantCount} height participants, ${diagnostics.warningBypassedMaterialCount} warning bypasses, ${diagnostics.expectedBypassedMaterialCount} expected bypasses.`

  const meta = {
    levelId,
    reason,
    sourceKind: atmosphere.source.kind,
    sourceProfile: atmosphere.source.profileId || atmosphere.id || 'authored',
    distanceFogEnabled: sceneAtmosphere.distanceFog.enabled,
    distanceFogColor: sceneAtmosphere.distanceFog.color.getHexString(),
    distanceFogDensity: sceneAtmosphere.distanceFog.density,
    heightFogEnabled: sceneAtmosphere.heightFog.enabled,
    heightFogColor: sceneAtmosphere.heightFog.color.getHexString(),
    heightFogDensity: sceneAtmosphere.heightFog.density,
    heightFogFloor: sceneAtmosphere.heightFog.floor,
    heightFogCeiling: sceneAtmosphere.heightFog.ceiling,
    ...diagnostics,
  }

  setRuntimeDiagnostic('fog', {
    label: 'Scene Fog Materials',
    level,
    message,
    meta,
  })
}

function refreshAtmosphereParticipants(
  atmosphere: SceneAtmosphereDefinition,
  reason: string,
) {
  if (!scene) return

  refreshSceneAtmosphereParticipants(scene, {
    source: 'scene-scan',
    renderPath: 'scene',
    levelId,
    reason,
  })
  publishAtmosphereDiagnostic(atmosphere, reason)
  invalidate()
}

async function refreshAtmosphereParticipantsAfterMount(
  atmosphere: SceneAtmosphereDefinition,
  reason: string,
) {
  const token = ++deferredMaterialRefreshToken
  await tick()
  if (token !== deferredMaterialRefreshToken) return

  refreshAtmosphereParticipants(atmosphere, reason)
}

useTask(delta => {
  if (!scene || scanIntervalSeconds <= 0) return

  scanAccumulator += delta
  if (scanAccumulator < scanIntervalSeconds) return
  scanAccumulator = 0

  refreshAtmosphereParticipants(activeAtmosphere, 'scheduled-scan')
})

$: activeAtmosphere = runtimeAtmosphereToSceneAtmosphereDefinition(atmosphere, {
  levelId,
  refreshKey,
})

$: {
  const atmosphereKey = getAtmosphereKey(activeAtmosphere)
  if (atmosphereKey !== lastAtmosphereKey) {
    lastAtmosphereKey = atmosphereKey
    setSceneAtmosphereDefinition(activeAtmosphere)
    syncSceneFog(activeAtmosphere)
    refreshAtmosphereParticipants(activeAtmosphere, 'settings-change')
    void refreshAtmosphereParticipantsAfterMount(
      activeAtmosphere,
      'settings-change-deferred',
    )
  }
}

$: if (refreshKey !== lastRefreshKey) {
  lastRefreshKey = refreshKey
  refreshAtmosphereParticipants(activeAtmosphere, 'refresh-key')
  void refreshAtmosphereParticipantsAfterMount(
    activeAtmosphere,
    'refresh-key-deferred',
  )
}

onDestroy(() => {
  deferredMaterialRefreshToken += 1
  const disabledAtmosphere = createDisabledSceneAtmosphereDefinition()
  setSceneAtmosphereDefinition(disabledAtmosphere)
  if (scene?.fog === fog) {
    scene.fog = null
    invalidate()
  }
  fog = null
  clearSceneAtmosphereMaterialRegistry()
  publishAtmosphereDiagnostic(disabledAtmosphere, 'destroy')
})
</script>
