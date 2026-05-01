<script lang="ts">
import { T } from '@threlte/core'
import {
  qualityLevelStore,
  qualitySettingsStore,
} from '../features/performance/stores/performanceStore'
import { resolveRuntimeVisibilityPolicy } from '../features/performance/utils/runtimeSceneBudget'

export let ambientIntensity = 1.25
export let hemisphereIntensity = 0.38
export let keyLightIntensity = 0.65
export let fillLightIntensity = 0.2
export let ambientColor = '#cfe4ff'
export let skyColor = '#dbe9ff'
export let groundColor = '#1b2130'
export let keyLightColor = '#d7e6ff'
export let fillLightColor = '#50688f'

$: visibilityPolicy = resolveRuntimeVisibilityPolicy(
  $qualityLevelStore,
  $qualitySettingsStore,
)
$: directionalShadowsEnabled = visibilityPolicy.shadowsEnabled
</script>

<T.Group name="scene-lighting">
  <T.AmbientLight intensity={ambientIntensity} color={ambientColor} />
  <T.HemisphereLight
    {skyColor}
    {groundColor}
    intensity={hemisphereIntensity}
  />
  <T.DirectionalLight
    position={[14, 20, -10]}
    color={keyLightColor}
    intensity={keyLightIntensity}
    castShadow={directionalShadowsEnabled}
  />
  <T.DirectionalLight
    position={[-16, 10, 18]}
    color={fillLightColor}
    intensity={fillLightIntensity}
    castShadow={false}
  />
</T.Group>
