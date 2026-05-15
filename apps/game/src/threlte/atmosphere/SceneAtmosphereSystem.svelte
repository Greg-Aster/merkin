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
  resolveSceneAtmosphereDefinition,
  runtimeAtmosphereToSceneAtmosphereDefinition,
  setSceneAtmosphereDefinition,
} from './atmosphereMaterialRegistry'
import type { RuntimeAtmosphereDefinition } from './runtimeAtmosphereTypes'

export let levelId = ''
export let atmosphere: RuntimeAtmosphereDefinition | null = null
export let color = '#7b8797'
export let density = 0.001
export let heightFogEnabled = false
export let heightFogColor = '#7b8797'
export let heightFogDensity = 0
export let heightFogFloor = 0
export let heightFogCeiling = 4
export let refreshKey = ''
export let scanIntervalSeconds = 0.75

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
  atmosphere: SceneAtmosphereDefinition,
  reason: string,
) {
  const diagnostics = getSceneAtmosphereMaterialDiagnostics()
  const diagnosticSignature = JSON.stringify({
    atmosphere: getAtmosphereKey(atmosphere),
    diagnostics,
  })
  if (diagnosticSignature === lastDiagnosticSignature) return
  lastDiagnosticSignature = diagnosticSignature

  const level = !atmosphere.enabled
    ? 'idle'
    : diagnostics.bypassedMaterialCount > 0
      ? 'warning'
      : diagnostics.heightParticipantCount > 0 ||
          diagnostics.distanceParticipantCount > 0
        ? 'ready'
        : 'warning'

  const message = !atmosphere.enabled
    ? 'Scene atmosphere disabled.'
    : `Distance fog ${atmosphere.distanceFog.enabled ? 'on' : 'off'} density ${atmosphere.distanceFog.density.toFixed(5)}; height fog ${atmosphere.heightFog.enabled ? 'on' : 'off'} floor ${atmosphere.heightFog.floor.toFixed(2)} ceiling ${atmosphere.heightFog.ceiling.toFixed(2)} density ${atmosphere.heightFog.density.toFixed(5)}; materials ${diagnostics.distanceParticipantCount} distance / ${diagnostics.heightParticipantCount} height participants, ${diagnostics.bypassedMaterialCount} bypassing.`

  const meta = {
    levelId,
    reason,
    distanceFogEnabled: atmosphere.distanceFog.enabled,
    distanceFogColor: atmosphere.distanceFog.color.getHexString(),
    distanceFogDensity: atmosphere.distanceFog.density,
    heightFogEnabled: atmosphere.heightFog.enabled,
    heightFogColor: atmosphere.heightFog.color.getHexString(),
    heightFogDensity: atmosphere.heightFog.density,
    heightFogFloor: atmosphere.heightFog.floor,
    heightFogCeiling: atmosphere.heightFog.ceiling,
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

$: activeAtmosphere = atmosphere
  ? runtimeAtmosphereToSceneAtmosphereDefinition(atmosphere, {
      levelId,
      refreshKey,
    })
  : resolveSceneAtmosphereDefinition({
      color,
      density,
      heightFogEnabled,
      heightFogColor,
      heightFogDensity,
      heightFogFloor,
      heightFogCeiling,
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
