<!--
  Real lightweight post-processing.
  Uses a true EffectComposer bloom pass and keeps screen-space styling minimal.
-->
<script lang="ts">
import { useTask, useThrelte } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import * as THREE from 'three'
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import type { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js'
import type { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { qualityLevelStore } from '../features/performance/stores/performanceStore'
import { resolveRuntimePostProcessingPolicy } from '../features/performance/utils/runtimeVisualQualityPolicy'
import {
  adaptiveBloomConfig,
  adaptiveToneMappingConfig,
  setQualityLevel,
} from '../stores/postProcessingStore'
import { runtimeRenderProfileStore } from '../stores/runtimeRenderProfileStore'
import {
  setRuntimePostProcessingDiagnostics,
  setRuntimeRenderLifecyclePhase,
} from '../stores/runtimeRenderRegistry'
import { runtimeVisualStyleStore } from '../styles/runtimeVisualStyleStore'
import { runtimeDebugLog } from '../utils/runtimeLog'

const { renderer, scene, camera, size, autoRender, renderStage } = useThrelte()

type EffectComposerModule =
  typeof import('three/examples/jsm/postprocessing/EffectComposer.js')
type RenderPassModule =
  typeof import('three/examples/jsm/postprocessing/RenderPass.js')
type SSAOPassModule =
  typeof import('three/examples/jsm/postprocessing/SSAOPass.js')
type UnrealBloomPassModule =
  typeof import('three/examples/jsm/postprocessing/UnrealBloomPass.js')

export let toneMappingExposure = 1.0
export let levelId = ''

let composer: EffectComposer | null = null
let ssaoPass: SSAOPass | null = null
let bloomPass: UnrealBloomPass | null = null
let effectComposerModule: EffectComposerModule | null = null
let renderPassModule: RenderPassModule | null = null
let ssaoPassModule: SSAOPassModule | null = null
let unrealBloomPassModule: UnrealBloomPassModule | null = null
let postProcessingModulesPromise: Promise<boolean> | null = null
let vignetteElement: HTMLDivElement | null = null
let overlayContainer: HTMLElement | null = null
let composerPassKey = ''
let composerSetupToken = 0

function getActiveCamera() {
  const candidate = camera as THREE.Camera & { current?: THREE.Camera | null }
  return candidate?.current ?? candidate
}

function ensureOverlay() {
  if (!renderer?.domElement) return

  overlayContainer = renderer.domElement.parentElement
  if (!overlayContainer) return

  if (getComputedStyle(overlayContainer).position === 'static') {
    overlayContainer.style.position = 'relative'
  }

  vignetteElement = document.createElement('div')
  vignetteElement.setAttribute('data-runtime-vignette', 'true')
  vignetteElement.style.position = 'absolute'
  vignetteElement.style.inset = '0'
  vignetteElement.style.pointerEvents = 'none'
  vignetteElement.style.zIndex = '3'
  overlayContainer.appendChild(vignetteElement)
}

function getPostProcessingPolicy() {
  return resolveRuntimePostProcessingPolicy({
    baseExposure: toneMappingExposure,
    visualStyle: $runtimeVisualStyleStore,
    bloom: $adaptiveBloomConfig,
    toneMapping: $adaptiveToneMappingConfig,
    renderProfile: $runtimeRenderProfileStore,
  })
}

function disposeComposer() {
  ssaoPass?.dispose()
  bloomPass?.dispose()
  composer?.dispose()
  composer = null
  ssaoPass = null
  bloomPass = null
}

async function ensurePostProcessingModules() {
  if (
    effectComposerModule &&
    renderPassModule &&
    ssaoPassModule &&
    unrealBloomPassModule
  ) {
    return true
  }

  if (!postProcessingModulesPromise) {
    postProcessingModulesPromise = Promise.all([
      import('three/examples/jsm/postprocessing/EffectComposer.js'),
      import('three/examples/jsm/postprocessing/RenderPass.js'),
      import('three/examples/jsm/postprocessing/SSAOPass.js'),
      import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
    ])
      .then(([effectComposer, renderPass, ssao, unrealBloom]) => {
        effectComposerModule = effectComposer
        renderPassModule = renderPass
        ssaoPassModule = ssao
        unrealBloomPassModule = unrealBloom
        return true
      })
      .catch(error => {
        postProcessingModulesPromise = null
        console.warn('Failed to load post-processing effects:', error)
        return false
      })
  }

  return postProcessingModulesPromise
}

async function setupComposer() {
  const setupToken = ++composerSetupToken
  const activeCamera = getActiveCamera()
  if (
    !renderer ||
    !scene ||
    !activeCamera ||
    $size.width < 2 ||
    $size.height < 2
  )
    return

  const modulesReady = await ensurePostProcessingModules()
  const effectComposer = effectComposerModule
  const renderPass = renderPassModule
  const ssao = ssaoPassModule
  const unrealBloom = unrealBloomPassModule
  if (
    !modulesReady ||
    setupToken !== composerSetupToken ||
    !effectComposer ||
    !renderPass ||
    !ssao ||
    !unrealBloom
  )
    return

  disposeComposer()
  const policy = getPostProcessingPolicy()
  composerPassKey = getComposerPassKey(policy)

  if (!policy.ambientOcclusionEnabled && !policy.bloomEnabled) {
    autoRender.set(true)
    return
  }

  const renderTarget = new THREE.WebGLRenderTarget($size.width, $size.height, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: true,
    stencilBuffer: false,
  })

  if ('samples' in renderTarget) {
    ;(renderTarget as THREE.WebGLRenderTarget & { samples?: number }).samples =
      0
  }

  composer = new effectComposer.EffectComposer(renderer, renderTarget)
  autoRender.set(false)
  composer.addPass(new renderPass.RenderPass(scene, activeCamera))

  if (policy.ambientOcclusionEnabled) {
    ssaoPass = new ssao.SSAOPass(
      scene,
      activeCamera,
      $size.width,
      $size.height,
      8,
    )
    ssaoPass.output = ssao.SSAOPass.OUTPUT.Default
    composer.addPass(ssaoPass)
  }

  if (policy.bloomEnabled) {
    bloomPass = new unrealBloom.UnrealBloomPass(
      new THREE.Vector2($size.width, $size.height),
      0,
      0.22,
      0.9,
    )
    composer.addPass(bloomPass)
  }
}

function getComposerPassKey(policy = getPostProcessingPolicy()) {
  return [
    policy.ambientOcclusionEnabled ? 'ao' : 'no-ao',
    policy.bloomEnabled ? 'bloom' : 'no-bloom',
  ].join(':')
}

function rebuildComposerIfPassesChanged() {
  const nextPassKey = getComposerPassKey()
  if (nextPassKey === composerPassKey) return
  void setupComposer()
}

function updateRendererStyle() {
  if (!renderer) return

  const policy = getPostProcessingPolicy()

  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = policy.exposure
  renderer.outputColorSpace = THREE.SRGBColorSpace
}

function updateBloomSettings() {
  if (!bloomPass) return

  const policy = getPostProcessingPolicy()

  bloomPass.enabled = policy.bloomEnabled
  bloomPass.strength = policy.bloomStrength
  bloomPass.radius = policy.bloomRadius
  bloomPass.threshold = policy.bloomThreshold
}

function updateAmbientOcclusionSettings() {
  if (!ssaoPass) return

  const policy = getPostProcessingPolicy()
  ssaoPass.camera = getActiveCamera()
  ssaoPass.enabled = policy.ambientOcclusionEnabled
  ssaoPass.kernelRadius =
    policy.ambientOcclusionRadius *
    (0.65 + policy.ambientOcclusionIntensity * 0.55)
  ssaoPass.minDistance = policy.ambientOcclusionMinDistance
  ssaoPass.maxDistance =
    policy.ambientOcclusionMaxDistance *
    (0.75 + policy.ambientOcclusionIntensity * 0.5)
}

function updateComposerSize() {
  if (!composer) return
  composer.setSize($size.width, $size.height)
  ssaoPass?.setSize($size.width, $size.height)
}

function updateOverlayStyle() {
  if (!vignetteElement) return

  const policy = getPostProcessingPolicy()
  const vignetteStrength = policy.vignetteStrength
  vignetteElement.style.backgroundImage = `radial-gradient(circle at 50% 48%, rgba(0,0,0,0) 42%, rgba(2,4,14,${(vignetteStrength * 0.42).toFixed(3)}) 78%, rgba(1,2,8,${vignetteStrength.toFixed(3)}) 100%)`
  vignetteElement.style.backgroundRepeat = 'no-repeat'
  vignetteElement.style.backgroundSize = '100% 100%'
  vignetteElement.style.opacity = '1'
}

function publishPostProcessingDiagnostics() {
  if (!levelId) return

  const profile = $runtimeRenderProfileStore
  const policy = getPostProcessingPolicy()
  setRuntimePostProcessingDiagnostics(levelId, {
    enabled: Boolean(composer) && profile.postProcessing.enabled,
    profileId: profile.id,
    passes: profile.postProcessing.enabled ? profile.postProcessing.passes : [],
    ambientOcclusionEnabled:
      ssaoPass?.enabled ?? policy.ambientOcclusionEnabled,
    bloomEnabled: bloomPass?.enabled ?? policy.bloomEnabled,
    reason: profile.postProcessing.enabled ? undefined : 'profile-disabled',
  })
  setRuntimeRenderLifecyclePhase({
    levelId,
    phase: 'post-processing-ready',
    message: `${levelId}: post-processing ${profile.postProcessing.enabled ? 'ready' : 'disabled'} for profile ${profile.id}.`,
    detail: {
      profileId: profile.id,
      tier: profile.tier,
      passes: profile.postProcessing.passes,
      ambientOcclusionEnabled:
        ssaoPass?.enabled ?? policy.ambientOcclusionEnabled,
      bloomEnabled: bloomPass?.enabled ?? false,
    },
  })
}

$: setQualityLevel($qualityLevelStore)
$: updateRendererStyle()
$: rebuildComposerIfPassesChanged()
$: updateAmbientOcclusionSettings()
$: updateBloomSettings()
$: updateComposerSize()
$: updateOverlayStyle()
$: publishPostProcessingDiagnostics()

onMount(() => {
  ensureOverlay()
  void setupComposer().then(() => {
    updateRendererStyle()
    updateAmbientOcclusionSettings()
    updateBloomSettings()
    updateOverlayStyle()
    publishPostProcessingDiagnostics()

    runtimeDebugLog('Real bloom and SSAO post-processing loaded')
  })
})

useTask(
  'simple-postprocessing-render',
  () => {
    const activeCamera = getActiveCamera()
    if (!composer || !activeCamera) return
    composer.render()
  },
  {
    stage: renderStage,
    autoInvalidate: false,
  },
)

onDestroy(() => {
  autoRender.set(true)
  disposeComposer()
  if (levelId) {
    setRuntimePostProcessingDiagnostics(levelId, {
      enabled: false,
      profileId: $runtimeRenderProfileStore.id,
      passes: [],
      reason: 'post-processing-unmounted',
    })
  }
  vignetteElement?.remove()
  vignetteElement = null
  overlayContainer = null
})
</script>
