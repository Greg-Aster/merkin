<!--
  Reusable Skybox Component
  Handles loading a 6-sided cubemap for efficient, high-quality backgrounds.
-->
<script lang="ts">
import { useThrelte } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import * as THREE from 'three'
import SkyAtmosphereRenderer from '../atmosphere/SkyAtmosphereRenderer.svelte'
import {
  DEFAULT_SKY_ATMOSPHERE,
  type SkyAtmosphereDefinition,
} from '../atmosphere/skyAtmosphereMaterial'
import { runtimeDebugLog } from '../utils/runtimeLog'

// The path to the FOLDER containing your 6 cubemap images
export let path: string = '/assets/hdri/skywip4-cubemap/' // Example path

// The 6 image files, in order: +X, -X, +Y, -Y, +Z, -Z
export let files: [string, string, string, string, string, string] = [
  'px.png',
  'nx.png',
  'py.png',
  'ny.png',
  'pz.png',
  'nz.png',
]
export let backgroundIntensity = 1
export let backgroundBlurriness = 0
export let environmentIntensity = 1
export let aerialPerspectiveBoost = 0
export let atmosphere: SkyAtmosphereDefinition = DEFAULT_SKY_ATMOSPHERE

const { scene } = useThrelte()

let mounted = false
let loadedTexture: THREE.CubeTexture | null = null
let loadSerial = 0
let lastSkyboxKey = ''
let skyboxVisible = false

function finiteNumberOrDefault(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback
}

function getBackgroundIntensity(value: number) {
  return Math.max(0, finiteNumberOrDefault(value, 1))
}

function getEnvironmentIntensity(value: number) {
  return Math.max(0, finiteNumberOrDefault(value, 1))
}

function applySceneIntensitySettings(
  nextBackgroundValue: number,
  nextBackgroundBlurriness: number,
  nextEnvironmentValue: number,
) {
  const nextBackgroundIntensity = getBackgroundIntensity(nextBackgroundValue)
  const nextEnvironmentIntensity = getEnvironmentIntensity(nextEnvironmentValue)

  scene.backgroundIntensity = nextBackgroundIntensity
  scene.backgroundBlurriness = Math.max(
    0,
    finiteNumberOrDefault(nextBackgroundBlurriness, 0),
  )
  scene.environmentIntensity = nextEnvironmentIntensity

  skyboxVisible = Boolean(loadedTexture) && nextBackgroundIntensity > 0

  if (!loadedTexture) return

  scene.background = null
  scene.environment = nextEnvironmentIntensity > 0 ? loadedTexture : null
}

function loadSkybox(nextPath: string, nextFiles: typeof files) {
  const nextSkyboxKey = `${nextPath}|${nextFiles.join('|')}`
  if (!mounted || nextSkyboxKey === lastSkyboxKey) return

  lastSkyboxKey = nextSkyboxKey
  const requestSerial = ++loadSerial
  const loader = new THREE.CubeTextureLoader()
  loader.setPath(nextPath)
  loader.load(
    nextFiles,
    cubeTexture => {
      if (requestSerial !== loadSerial) {
        cubeTexture.dispose()
        return
      }

      if (scene.environment === loadedTexture) scene.environment = null
      if (scene.background === loadedTexture) scene.background = null
      loadedTexture?.dispose()
      loadedTexture = cubeTexture
      // A cubemap texture is the ideal format for scene environments.
      applySceneIntensitySettings(
        backgroundIntensity,
        backgroundBlurriness,
        environmentIntensity,
      )
      runtimeDebugLog('✅ Cubemap skybox loaded successfully.')
    },
    undefined,
    error => {
      console.error('❌ Failed to load cubemap texture:', error)
    },
  )
}

onMount(() => {
  mounted = true
  loadSkybox(path, files)
})

onDestroy(() => {
  loadSerial += 1
  if (scene.environment === loadedTexture) scene.environment = null
  if (scene.background === loadedTexture) scene.background = null
  loadedTexture?.dispose()
  loadedTexture = null
})

$: loadSkybox(path, files)
$: applySceneIntensitySettings(
  backgroundIntensity,
  backgroundBlurriness,
  environmentIntensity,
)
</script>

<!-- 
  The visible cubemap is rendered as atmosphere-aware geometry because native
  Three scene backgrounds do not receive renderer-owned fog.
-->

{#if skyboxVisible && loadedTexture}
  <SkyAtmosphereRenderer
    texture={loadedTexture}
    {backgroundIntensity}
    {backgroundBlurriness}
    {aerialPerspectiveBoost}
    {atmosphere}
  />
{/if}
