<script lang="ts">
import { T, useTask, useThrelte } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import * as THREE from 'three'
import { setRuntimeDiagnostic } from '../stores/runtimeDiagnosticsStore'
import {
  DEFAULT_SKY_ATMOSPHERE,
  type SkyAtmosphereDefinition,
  type SkyAtmosphereMaterial,
  createSkyAtmosphereGeometry,
  createSkyAtmosphereMaterial,
  updateSkyAtmosphereCameraUniforms,
  updateSkyAtmosphereUniforms,
} from './skyAtmosphereMaterial'

export let texture: THREE.CubeTexture
export let backgroundIntensity = 1
export let backgroundBlurriness = 0
export let aerialPerspectiveBoost = 0
export let atmosphere: SkyAtmosphereDefinition = DEFAULT_SKY_ATMOSPHERE

const { scene, camera, renderer, invalidate } = useThrelte()

let skyboxMesh: THREE.Mesh | null = null
let skyboxMaterial: SkyAtmosphereMaterial | null = null
let skyboxGeometry: THREE.BoxGeometry | null = null
let pmremGenerator: THREE.PMREMGenerator | null = null
let blurredBackgroundRenderTarget: THREE.WebGLRenderTarget | null = null
let blurredBackgroundSource: THREE.CubeTexture | null = null
let currentBackgroundTexture: THREE.Texture | THREE.CubeTexture | null = null
let currentRadius = 900

const backgroundRotationEuler = new THREE.Euler()
const backgroundRotationMatrix4 = new THREE.Matrix4()

function finiteNumberOrDefault(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback
}

function clampNumber(
  value: number,
  min: number,
  max: number,
  fallback: number,
) {
  return Math.min(max, Math.max(min, finiteNumberOrDefault(value, fallback)))
}

function getBackgroundIntensity(value: number) {
  return Math.max(0, finiteNumberOrDefault(value, 1))
}

function getBackgroundBlurriness(value: number) {
  return Math.max(0, finiteNumberOrDefault(value, 0))
}

function getActiveCamera(): THREE.Camera | null {
  const candidate = camera as THREE.Camera & { current?: THREE.Camera | null }
  const resolved = candidate?.current ?? candidate
  return resolved && resolved.position instanceof THREE.Vector3
    ? resolved
    : null
}

function isCubeTexture(
  candidate: THREE.Texture | THREE.CubeTexture | null,
): candidate is THREE.CubeTexture {
  return Boolean(
    candidate &&
      'isCubeTexture' in candidate &&
      (candidate as THREE.CubeTexture & { isCubeTexture?: boolean })
        .isCubeTexture,
  )
}

function disposeBlurredBackground() {
  blurredBackgroundRenderTarget?.dispose()
  blurredBackgroundRenderTarget = null
  blurredBackgroundSource = null
}

function getRenderableBackgroundTexture(
  nextTexture: THREE.CubeTexture,
  nextBackgroundBlurriness: number,
) {
  const nextBlurriness = getBackgroundBlurriness(nextBackgroundBlurriness)
  if (nextBlurriness <= 0 || !renderer) {
    disposeBlurredBackground()
    return nextTexture
  }

  if (
    blurredBackgroundSource !== nextTexture ||
    !blurredBackgroundRenderTarget
  ) {
    disposeBlurredBackground()
    pmremGenerator ??= new THREE.PMREMGenerator(renderer)
    blurredBackgroundRenderTarget = pmremGenerator.fromCubemap(nextTexture)
    blurredBackgroundSource = nextTexture
  }

  return blurredBackgroundRenderTarget.texture
}

function updateSkyboxBackgroundRotation(
  backgroundTexture: THREE.Texture | THREE.CubeTexture,
) {
  if (!skyboxMaterial) return

  backgroundRotationEuler.copy(scene.backgroundRotation)

  // Match Three's WebGLBackground cube-map orientation rules.
  backgroundRotationEuler.x *= -1
  backgroundRotationEuler.y *= -1
  backgroundRotationEuler.z *= -1

  if (
    isCubeTexture(backgroundTexture) &&
    !backgroundTexture.isRenderTargetTexture
  ) {
    backgroundRotationEuler.y *= -1
    backgroundRotationEuler.z *= -1
  }

  skyboxMaterial.uniforms.backgroundRotation.value.setFromMatrix4(
    backgroundRotationMatrix4.makeRotationFromEuler(backgroundRotationEuler),
  )
}

function updateSkyboxTextureSettings(
  nextTexture: THREE.CubeTexture,
  nextBackgroundIntensity: number,
  nextBackgroundBlurriness: number,
) {
  if (!skyboxMaterial || !nextTexture) return

  const backgroundTexture = getRenderableBackgroundTexture(
    nextTexture,
    nextBackgroundBlurriness,
  )
  currentBackgroundTexture = backgroundTexture
  skyboxMaterial.uniforms.envMap.value = backgroundTexture
  skyboxMaterial.uniforms.flipEnvMap.value =
    isCubeTexture(backgroundTexture) && !backgroundTexture.isRenderTargetTexture
      ? -1
      : 1
  skyboxMaterial.uniforms.backgroundBlurriness.value = getBackgroundBlurriness(
    nextBackgroundBlurriness,
  )
  skyboxMaterial.uniforms.backgroundIntensity.value = getBackgroundIntensity(
    nextBackgroundIntensity,
  )
  updateSkyboxBackgroundRotation(backgroundTexture)
  skyboxMaterial.toneMapped =
    THREE.ColorManagement.getTransfer(backgroundTexture.colorSpace) !==
    THREE.SRGBTransfer
  skyboxMaterial.needsUpdate = true
  invalidate()
}

function updateSkyboxAtmosphereSettings(
  nextAtmosphere: SkyAtmosphereDefinition,
) {
  if (!skyboxMaterial) return

  updateSkyAtmosphereUniforms(skyboxMaterial, nextAtmosphere)
  reportSkyAtmosphereDiagnostic(nextAtmosphere)
  invalidate()
}

function reportSkyAtmosphereDiagnostic(
  nextAtmosphere: SkyAtmosphereDefinition,
) {
  const distanceFogActive =
    nextAtmosphere.enabled &&
    nextAtmosphere.distanceFog.enabled &&
    nextAtmosphere.distanceFog.density > 0
  const heightFogActive =
    nextAtmosphere.enabled &&
    nextAtmosphere.heightFog.enabled &&
    nextAtmosphere.heightFog.density > 0
  const aerialPerspectiveActive =
    nextAtmosphere.enabled &&
    nextAtmosphere.aerialPerspective.enabled &&
    (distanceFogActive || heightFogActive)

  setRuntimeDiagnostic('skyAtmosphere', {
    label: 'Sky Atmosphere',
    level: aerialPerspectiveActive ? 'ready' : 'warning',
    message: aerialPerspectiveActive
      ? `Skybox aerial perspective active: distance ${nextAtmosphere.distanceFog.density.toFixed(5)}, height ${nextAtmosphere.heightFog.density.toFixed(5)}.`
      : 'Skybox is rendering, but no active atmosphere values are participating.',
    meta: {
      backgroundBlurriness: getBackgroundBlurriness(backgroundBlurriness),
      backgroundIntensity: getBackgroundIntensity(backgroundIntensity),
      backgroundTextureMapping: currentBackgroundTexture?.mapping ?? null,
      distanceFogActive,
      distanceFogColor: nextAtmosphere.distanceFog.color,
      distanceFogDensity: nextAtmosphere.distanceFog.density,
      heightFogActive,
      heightFogColor: nextAtmosphere.heightFog.color,
      heightFogDensity: nextAtmosphere.heightFog.density,
      heightFogFloor: nextAtmosphere.heightFog.floor,
      heightFogCeiling: nextAtmosphere.heightFog.ceiling,
      skyOcclusion: nextAtmosphere.aerialPerspective.skyOcclusion,
      horizonBoost: nextAtmosphere.aerialPerspective.horizonBoost,
      radius: currentRadius,
    },
  })
}

useTask(() => {
  const activeCamera = getActiveCamera()
  if (!activeCamera || !skyboxMesh || !skyboxMaterial) return

  skyboxMesh.position.copy(activeCamera.position)

  const far = (activeCamera as THREE.Camera & { far?: number }).far
  const baseRadius = Number.isFinite(far)
    ? Math.max(650, Math.min(1200, (far ?? 2000) * 0.55))
    : 900
  currentRadius =
    baseRadius * (1 + clampNumber(aerialPerspectiveBoost, 0, 1, 0) * 2)
  skyboxMesh.scale.setScalar(currentRadius)
  updateSkyAtmosphereCameraUniforms(
    skyboxMaterial,
    activeCamera.position,
    currentRadius,
  )
})

onMount(() => {
  skyboxGeometry = createSkyAtmosphereGeometry()
  skyboxMaterial = createSkyAtmosphereMaterial()
  updateSkyboxTextureSettings(
    texture,
    backgroundIntensity,
    backgroundBlurriness,
  )
  updateSkyboxAtmosphereSettings(atmosphere)
})

onDestroy(() => {
  disposeBlurredBackground()
  pmremGenerator?.dispose()
  pmremGenerator = null
  skyboxGeometry?.dispose()
  skyboxMaterial?.dispose()
  skyboxGeometry = null
  skyboxMaterial = null
  setRuntimeDiagnostic('skyAtmosphere', {
    label: 'Sky Atmosphere',
    level: 'idle',
    message: 'Sky atmosphere renderer disabled.',
  })
})

$: updateSkyboxTextureSettings(
  texture,
  backgroundIntensity,
  backgroundBlurriness,
)
$: updateSkyboxAtmosphereSettings(atmosphere)
</script>

{#if skyboxGeometry && skyboxMaterial}
  <T.Mesh
    bind:ref={skyboxMesh}
    frustumCulled={false}
    renderOrder={-10000}
    geometry={skyboxGeometry}
    material={skyboxMaterial}
  />
{/if}
