<script lang="ts">
import { T } from '@threlte/core'
import type { DirectionalLight } from 'three'
import {
  qualityLevelStore,
  qualitySettingsStore,
} from '../features/performance/stores/performanceStore'
import { resolveRuntimeVisibilityPolicy } from '../features/performance/utils/runtimeSceneBudget'
import type { ResolvedRuntimeRenderProfile } from '../stores/runtimeRenderProfileStore'

export let ambientIntensity = 1.25
export let hemisphereIntensity = 0.38
export let keyLightIntensity = 0.65
export let fillLightIntensity = 0.2
export let renderProfile: ResolvedRuntimeRenderProfile | null = null
export let ambientColor = '#cfe4ff'
export let skyColor = '#dbe9ff'
export let groundColor = '#1b2130'
export let keyLightColor = '#d7e6ff'
export let fillLightColor = '#50688f'

let keyLightRef: DirectionalLight | null = null

function applyKeyLightShadowBudget() {
  if (!keyLightRef) return

  keyLightRef.shadow.mapSize.width = keyLightShadowMapSize
  keyLightRef.shadow.mapSize.height = keyLightShadowMapSize
  keyLightRef.shadow.camera.left = -shadowCameraSize
  keyLightRef.shadow.camera.right = shadowCameraSize
  keyLightRef.shadow.camera.top = shadowCameraSize
  keyLightRef.shadow.camera.bottom = -shadowCameraSize
  keyLightRef.shadow.camera.far = shadowCameraFar
  keyLightRef.shadow.camera.updateProjectionMatrix()
}

$: visibilityPolicy = resolveRuntimeVisibilityPolicy(
  $qualityLevelStore,
  $qualitySettingsStore,
)
$: directionalShadowsEnabled =
  visibilityPolicy.shadowsEnabled &&
  (renderProfile?.shadows.enabled ?? true) &&
  renderProfile?.tier !== 'desktop' &&
  (renderProfile?.shadows.maxCastingLights ?? 1) > 0
$: keyLightShadowMapSize = Math.max(
  1,
  renderProfile?.shadows.mapSize ?? $qualitySettingsStore.shadowMapSize,
)
$: shadowCameraSize = renderProfile?.shadows.cameraSize ?? 48
$: shadowCameraFar = renderProfile?.shadows.cameraFar ?? 90
$: profileLighting = renderProfile?.lighting
$: resolvedAmbientColor = profileLighting?.ambientColor ?? ambientColor
$: resolvedSkyColor = profileLighting?.skyColor ?? skyColor
$: resolvedGroundColor = profileLighting?.groundColor ?? groundColor
$: resolvedKeyLightColor = profileLighting?.keyLightColor ?? keyLightColor
$: resolvedFillLightColor = profileLighting?.fillLightColor ?? fillLightColor
$: keyLightPosition = profileLighting?.keyLightPosition ?? [14, 20, -10]
$: fillLightPosition = profileLighting?.fillLightPosition ?? [-16, 10, 18]
$: applyKeyLightShadowBudget()
</script>

<T.Group name="scene-lighting">
  <T.AmbientLight intensity={ambientIntensity} color={resolvedAmbientColor} />
  <T.HemisphereLight
    skyColor={resolvedSkyColor}
    groundColor={resolvedGroundColor}
    intensity={hemisphereIntensity}
  />
  <T.DirectionalLight
    bind:ref={keyLightRef}
    position={keyLightPosition}
    color={resolvedKeyLightColor}
    intensity={keyLightIntensity}
    castShadow={directionalShadowsEnabled}
  />
  <T.DirectionalLight
    position={fillLightPosition}
    color={resolvedFillLightColor}
    intensity={fillLightIntensity}
    castShadow={false}
  />
</T.Group>
