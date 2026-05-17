<script lang="ts">
import { getContext, onDestroy, onMount } from 'svelte'
import {
  RUNTIME_LIGHTING_CONTEXT,
  type RuntimeLightingController,
  type RuntimeLightingEnvironment,
} from '../features/lighting'
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

const controller = getContext<RuntimeLightingController | null>(
  RUNTIME_LIGHTING_CONTEXT,
)
const ownerId = `scene-lighting-profile-${Math.random().toString(36).slice(2)}`

let mounted = false

$: profileLighting = renderProfile?.lighting
$: environment = {
  ambientIntensity,
  hemisphereIntensity,
  keyLightIntensity,
  fillLightIntensity,
  ambientColor: profileLighting?.ambientColor ?? ambientColor,
  skyColor: profileLighting?.skyColor ?? skyColor,
  groundColor: profileLighting?.groundColor ?? groundColor,
  keyLightColor: profileLighting?.keyLightColor ?? keyLightColor,
  fillLightColor: profileLighting?.fillLightColor ?? fillLightColor,
  keyLightPosition: profileLighting?.keyLightPosition ?? [14, 20, -10],
  fillLightPosition: profileLighting?.fillLightPosition ?? [-16, 10, 18],
  shadows: {
    enabled: renderProfile?.shadows.enabled ?? true,
    maxCastingLights: renderProfile?.shadows.maxCastingLights ?? 1,
    mapSize: renderProfile?.shadows.mapSize ?? 1024,
    cameraSize: renderProfile?.shadows.cameraSize ?? 48,
    cameraFar: renderProfile?.shadows.cameraFar ?? 90,
  },
  renderProfileId: renderProfile?.id ?? 'runtime-default',
  renderProfileTier: renderProfile?.tier ?? 'desktop',
} satisfies RuntimeLightingEnvironment

function publishEnvironment() {
  if (!controller || !mounted) return
  controller.setEnvironment(ownerId, environment)
}

onMount(() => {
  mounted = true
  publishEnvironment()
})

$: if (mounted && environment) {
  publishEnvironment()
}

onDestroy(() => {
  controller?.clearEnvironment(ownerId)
})
</script>
