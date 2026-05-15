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
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import type { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { runtimeAtmosphereStore } from '../atmosphere/runtimeAtmosphereStore'
import { qualityLevelStore } from '../features/performance/stores/performanceStore'
import {
  type RuntimePostProcessingPolicy,
  resolveRuntimePostProcessingPolicy,
} from '../features/performance/utils/runtimeVisualQualityPolicy'
import {
  adaptiveBloomConfig,
  adaptiveToneMappingConfig,
  setQualityLevel,
} from '../stores/postProcessingStore'
import { setRuntimeDiagnostic } from '../stores/runtimeDiagnosticsStore'
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
type ShaderPassModule =
  typeof import('three/examples/jsm/postprocessing/ShaderPass.js')
type SSAOPassModule =
  typeof import('three/examples/jsm/postprocessing/SSAOPass.js')
type UnrealBloomPassModule =
  typeof import('three/examples/jsm/postprocessing/UnrealBloomPass.js')

export let toneMappingExposure = 1.0
export let levelId = ''

let composer: EffectComposer | null = null
let ssaoPass: SSAOPass | null = null
let bloomPass: UnrealBloomPass | null = null
let colorGradingPass: ShaderPass | null = null
let effectComposerModule: EffectComposerModule | null = null
let renderPassModule: RenderPassModule | null = null
let shaderPassModule: ShaderPassModule | null = null
let ssaoPassModule: SSAOPassModule | null = null
let unrealBloomPassModule: UnrealBloomPassModule | null = null
let postProcessingModulesPromise: Promise<boolean> | null = null
let vignetteElement: HTMLDivElement | null = null
let overlayContainer: HTMLElement | null = null
let composerPassKey = ''
let composerSetupToken = 0
let activePostProcessingPolicy: RuntimePostProcessingPolicy

const runtimeColorGradingShader = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1 },
    contrast: { value: 1 },
    warmth: { value: 1 },
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform float contrast;
    uniform float warmth;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      color.rgb = mix(vec3(luma), color.rgb, saturation);
      color.rgb = (color.rgb - 0.5) * contrast + 0.5;

      float warmthDelta = warmth - 1.0;
      color.r *= 1.0 + warmthDelta * 0.16;
      color.g *= 1.0 + max(warmthDelta, 0.0) * 0.04;
      color.b *= 1.0 - warmthDelta * 0.16;

      gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0), color.a);
    }
  `,
}

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
    atmosphere: $runtimeAtmosphereStore,
  })
}

function disposeComposer() {
  ssaoPass?.dispose()
  bloomPass?.dispose()
  composer?.dispose()
  composer = null
  ssaoPass = null
  bloomPass = null
  colorGradingPass = null
}

async function ensurePostProcessingModules() {
  if (
    effectComposerModule &&
    renderPassModule &&
    shaderPassModule &&
    ssaoPassModule &&
    unrealBloomPassModule
  ) {
    return true
  }

  if (!postProcessingModulesPromise) {
    postProcessingModulesPromise = Promise.all([
      import('three/examples/jsm/postprocessing/EffectComposer.js'),
      import('three/examples/jsm/postprocessing/RenderPass.js'),
      import('three/examples/jsm/postprocessing/ShaderPass.js'),
      import('three/examples/jsm/postprocessing/SSAOPass.js'),
      import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
    ])
      .then(([effectComposer, renderPass, shaderPass, ssao, unrealBloom]) => {
        effectComposerModule = effectComposer
        renderPassModule = renderPass
        shaderPassModule = shaderPass
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
  const shaderPass = shaderPassModule
  const ssao = ssaoPassModule
  const unrealBloom = unrealBloomPassModule
  if (
    !modulesReady ||
    setupToken !== composerSetupToken ||
    !effectComposer ||
    !renderPass ||
    !shaderPass ||
    !ssao ||
    !unrealBloom
  )
    return

  disposeComposer()
  const policy = getPostProcessingPolicy()
  composerPassKey = getComposerPassKey(policy)

  if (
    !policy.ambientOcclusionEnabled &&
    !policy.bloomEnabled &&
    !policy.colorGradingEnabled
  ) {
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

  if (policy.colorGradingEnabled) {
    colorGradingPass = new shaderPass.ShaderPass(runtimeColorGradingShader)
    composer.addPass(colorGradingPass)
    updateColorGradingSettings(policy)
  }
}

function getComposerPassKey(policy = getPostProcessingPolicy()) {
  return [
    policy.ambientOcclusionEnabled ? 'ao' : 'no-ao',
    policy.bloomEnabled ? 'bloom' : 'no-bloom',
    policy.colorGradingEnabled ? 'color' : 'no-color',
  ].join(':')
}

function rebuildComposerIfPassesChanged(policy: RuntimePostProcessingPolicy) {
  const nextPassKey = getComposerPassKey(policy)
  if (nextPassKey === composerPassKey) return
  void setupComposer()
}

function updateRendererStyle(policy: RuntimePostProcessingPolicy) {
  if (!renderer) return

  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = policy.exposure
  renderer.outputColorSpace = THREE.SRGBColorSpace
}

function updateBloomSettings(policy: RuntimePostProcessingPolicy) {
  if (!bloomPass) return

  bloomPass.enabled = policy.bloomEnabled
  bloomPass.strength = policy.bloomStrength
  bloomPass.radius = policy.bloomRadius
  bloomPass.threshold = policy.bloomThreshold
}

function updateAmbientOcclusionSettings(policy: RuntimePostProcessingPolicy) {
  if (!ssaoPass) return

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

function updateColorGradingSettings(policy: RuntimePostProcessingPolicy) {
  if (!colorGradingPass) return

  colorGradingPass.enabled = policy.colorGradingEnabled
  colorGradingPass.uniforms.saturation.value = policy.colorSaturation
  colorGradingPass.uniforms.contrast.value = policy.colorContrast
  colorGradingPass.uniforms.warmth.value = policy.colorWarmth
}

function updateComposerSize(width: number, height: number) {
  if (!composer) return
  composer.setSize(width, height)
  ssaoPass?.setSize(width, height)
}

function updateOverlayStyle(policy: RuntimePostProcessingPolicy) {
  if (!vignetteElement) return

  const vignetteStrength = policy.vignetteStrength
  vignetteElement.style.backgroundImage = `radial-gradient(circle at 50% 48%, rgba(0,0,0,0) 42%, rgba(2,4,14,${(vignetteStrength * 0.42).toFixed(3)}) 78%, rgba(1,2,8,${vignetteStrength.toFixed(3)}) 100%)`
  vignetteElement.style.backgroundRepeat = 'no-repeat'
  vignetteElement.style.backgroundSize = '100% 100%'
  vignetteElement.style.opacity = '1'
}

function profileAllowsPostPass(pass: 'bloom' | 'color-grading') {
  const postProcessing = $runtimeRenderProfileStore.postProcessing
  if (!postProcessing.enabled) return false
  return (
    postProcessing.passes.length === 0 || postProcessing.passes.includes(pass)
  )
}

function getBloomParticipationReason(policy: RuntimePostProcessingPolicy) {
  const profile = $runtimeRenderProfileStore
  if (policy.bloomEnabled) return 'active'
  if (!profile.postProcessing.enabled) return 'profile disabled'
  if (!profileAllowsPostPass('bloom')) {
    return `disabled by ${profile.tier} profile pass list`
  }
  if (!$adaptiveBloomConfig.enabled) {
    return `disabled by performance tier ${$qualityLevelStore}`
  }
  if ($adaptiveBloomConfig.intensity <= 0.01) return 'zero intensity'
  return 'inactive by atmosphere settings'
}

function getColorGradingParticipationReason(
  policy: RuntimePostProcessingPolicy,
) {
  const profile = $runtimeRenderProfileStore
  if (policy.colorGradingEnabled) return 'active'
  if (!profile.postProcessing.enabled) return 'profile disabled'
  if (!profileAllowsPostPass('color-grading')) {
    return `disabled by ${profile.tier} profile pass list`
  }
  return 'neutral color grade'
}

function publishPostProcessingDiagnostics(policy: RuntimePostProcessingPolicy) {
  if (!levelId) return

  const profile = $runtimeRenderProfileStore
  const bloomReason = getBloomParticipationReason(policy)
  const colorGradingReason = getColorGradingParticipationReason(policy)
  const bloomEnabled = bloomPass?.enabled ?? policy.bloomEnabled
  const colorGradingEnabled =
    colorGradingPass?.enabled ?? policy.colorGradingEnabled
  setRuntimePostProcessingDiagnostics(levelId, {
    enabled: Boolean(composer) && profile.postProcessing.enabled,
    profileId: profile.id,
    passes: profile.postProcessing.enabled ? profile.postProcessing.passes : [],
    atmosphereId: $runtimeAtmosphereStore.id,
    ambientOcclusionEnabled:
      ssaoPass?.enabled ?? policy.ambientOcclusionEnabled,
    bloomEnabled,
    colorGradingEnabled,
    bloomReason,
    colorGradingReason,
    reason: profile.postProcessing.enabled ? undefined : 'profile-disabled',
  })
  setRuntimeDiagnostic('postProcessing', {
    label: 'Post Processing',
    level: profile.postProcessing.enabled ? 'ready' : 'warning',
    message: `${levelId}/${profile.id}/${profile.tier}: bloom ${bloomEnabled ? `on strength ${policy.bloomStrength.toFixed(2)} threshold ${policy.bloomThreshold.toFixed(2)}` : `off (${bloomReason})`}; color grading ${colorGradingEnabled ? `on sat ${policy.colorSaturation.toFixed(2)} contrast ${policy.colorContrast.toFixed(2)} warmth ${policy.colorWarmth.toFixed(2)}` : `off (${colorGradingReason})`}; passes ${profile.postProcessing.enabled ? profile.postProcessing.passes.join(', ') || 'all' : 'disabled'}.`,
    meta: {
      levelId,
      profileId: profile.id,
      tier: profile.tier,
      enabled: profile.postProcessing.enabled,
      passes: profile.postProcessing.passes,
      bloomEnabled,
      bloomReason,
      bloomStrength: policy.bloomStrength,
      bloomThreshold: policy.bloomThreshold,
      colorGradingEnabled,
      colorGradingReason,
      colorSaturation: policy.colorSaturation,
      colorContrast: policy.colorContrast,
      colorWarmth: policy.colorWarmth,
    },
  })
  setRuntimeRenderLifecyclePhase({
    levelId,
    phase: 'post-processing-ready',
    message: `${levelId}: post-processing ${profile.postProcessing.enabled ? 'ready' : 'disabled'} for profile ${profile.id}.`,
    detail: {
      profileId: profile.id,
      tier: profile.tier,
      atmosphereId: $runtimeAtmosphereStore.id,
      passes: profile.postProcessing.passes,
      ambientOcclusionEnabled:
        ssaoPass?.enabled ?? policy.ambientOcclusionEnabled,
      bloomEnabled,
      bloomReason,
      colorGradingEnabled,
      colorGradingReason,
    },
  })
}

$: setQualityLevel($qualityLevelStore)
$: activePostProcessingPolicy = resolveRuntimePostProcessingPolicy({
  baseExposure: toneMappingExposure,
  visualStyle: $runtimeVisualStyleStore,
  bloom: $adaptiveBloomConfig,
  toneMapping: $adaptiveToneMappingConfig,
  renderProfile: $runtimeRenderProfileStore,
  atmosphere: $runtimeAtmosphereStore,
})
$: updateRendererStyle(activePostProcessingPolicy)
$: rebuildComposerIfPassesChanged(activePostProcessingPolicy)
$: updateAmbientOcclusionSettings(activePostProcessingPolicy)
$: updateBloomSettings(activePostProcessingPolicy)
$: updateColorGradingSettings(activePostProcessingPolicy)
$: updateComposerSize($size.width, $size.height)
$: updateOverlayStyle(activePostProcessingPolicy)
$: publishPostProcessingDiagnostics(activePostProcessingPolicy)

onMount(() => {
  ensureOverlay()
  void setupComposer().then(() => {
    const policy = getPostProcessingPolicy()
    updateRendererStyle(policy)
    updateAmbientOcclusionSettings(policy)
    updateBloomSettings(policy)
    updateColorGradingSettings(policy)
    updateOverlayStyle(policy)
    publishPostProcessingDiagnostics(policy)

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
