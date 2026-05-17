<!--
  Real lightweight post-processing.
  Uses a true EffectComposer bloom pass and keeps screen-space styling minimal.
-->
<script lang="ts">
import { useTask, useThrelte } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import * as THREE from 'three'
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import type { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import type { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js'
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import type { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import {
  type DepthFogShaderUniforms,
  createDepthFogShader,
  updateDepthFogShaderUniforms,
} from '../atmosphere/depthFogShader'
import { runtimeAtmosphereStore } from '../atmosphere/runtimeAtmosphereStore'
import type { RuntimeAtmosphereDefinition } from '../atmosphere/runtimeAtmosphereTypes'
import {
  qualityLevelStore,
  qualitySettingsStore,
} from '../features/performance/stores/performanceStore'
import {
  type RuntimePostProcessingPolicy,
  resolveRuntimePostProcessingPolicy,
} from '../features/performance/utils/runtimeVisualQualityPolicy'
import {
  type BloomConfig,
  type ToneMappingConfig,
  adaptiveBloomConfig,
  adaptiveToneMappingConfig,
  setQualityLevel,
} from '../stores/postProcessingStore'
import { setRuntimeDiagnostic } from '../stores/runtimeDiagnosticsStore'
import {
  type ResolvedRuntimeRenderProfile,
  runtimeRenderProfileStore,
} from '../stores/runtimeRenderProfileStore'
import {
  setRuntimePostProcessingDiagnostics,
  setRuntimeRenderLifecyclePhase,
} from '../stores/runtimeRenderRegistry'
import { runtimeVisualStyleStore } from '../styles/runtimeVisualStyleStore'
import type { RuntimeVisualStyleSettings } from '../styles/runtimeVisualStyleStore'
import { runtimeDebugLog } from '../utils/runtimeLog'
import { KuwaharaDepthMaskPass, KuwaharaPass } from './KuwaharaPass'

const { renderer, scene, camera, size, autoRender, renderStage } = useThrelte()

type EffectComposerModule =
  typeof import('three/examples/jsm/postprocessing/EffectComposer.js')
type RenderPassModule =
  typeof import('three/examples/jsm/postprocessing/RenderPass.js')
type ShaderPassModule =
  typeof import('three/examples/jsm/postprocessing/ShaderPass.js')
type OutputPassModule =
  typeof import('three/examples/jsm/postprocessing/OutputPass.js')
type SSAOPassModule =
  typeof import('three/examples/jsm/postprocessing/SSAOPass.js')
type UnrealBloomPassModule =
  typeof import('three/examples/jsm/postprocessing/UnrealBloomPass.js')

export let toneMappingExposure = 1.0
export let levelId = ''
export let optionalPostProcessingEnabled = true

let composer: EffectComposer | null = null
let ssaoPass: SSAOPass | null = null
let bloomPass: UnrealBloomPass | null = null
let colorGradingPass: ShaderPass | null = null
let preToneMappingPass: OutputPass | null = null
let kuwaharaDepthMaskPass: KuwaharaDepthMaskPass | null = null
let kuwaharaPass: KuwaharaPass | null = null
let outputPass: OutputPass | null = null
let depthFogPass: (ShaderPass & { uniforms: DepthFogShaderUniforms }) | null =
  null
let effectComposerModule: EffectComposerModule | null = null
let renderPassModule: RenderPassModule | null = null
let shaderPassModule: ShaderPassModule | null = null
let outputPassModule: OutputPassModule | null = null
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

function getPostProcessingPolicy(input?: {
  renderProfile?: ResolvedRuntimeRenderProfile
  visualStyle?: RuntimeVisualStyleSettings
  bloom?: BloomConfig
  toneMapping?: ToneMappingConfig
  atmosphere?: RuntimeAtmosphereDefinition
  optionalEnabled?: boolean
  baseExposure?: number
}) {
  const policy = resolveRuntimePostProcessingPolicy({
    baseExposure: input?.baseExposure ?? toneMappingExposure,
    visualStyle: input?.visualStyle ?? $runtimeVisualStyleStore,
    bloom: input?.bloom ?? $adaptiveBloomConfig,
    toneMapping: input?.toneMapping ?? $adaptiveToneMappingConfig,
    renderProfile: input?.renderProfile ?? $runtimeRenderProfileStore,
    atmosphere: input?.atmosphere ?? $runtimeAtmosphereStore,
  })
  if (input?.optionalEnabled ?? optionalPostProcessingEnabled) return policy

  return {
    ...policy,
    colorGradingEnabled: false,
    colorSaturation: 1,
    colorContrast: 1,
    colorWarmth: 1,
    bloomEnabled: false,
    bloomStrength: 0,
    ambientOcclusionEnabled: false,
    ambientOcclusionIntensity: 0,
    ambientOcclusionRadius: 0,
    kuwaharaEnabled: false,
    kuwaharaRadius: 0,
    kuwaharaMix: 0,
    kuwaharaResolutionScale: 1,
    vignetteStrength: 0,
  }
}

function disposeComposer() {
  ssaoPass?.dispose()
  bloomPass?.dispose()
  depthFogPass?.material.dispose()
  colorGradingPass?.material.dispose()
  preToneMappingPass?.dispose()
  kuwaharaDepthMaskPass?.dispose()
  kuwaharaPass?.dispose()
  outputPass?.dispose()
  composer?.dispose()
  composer = null
  ssaoPass = null
  bloomPass = null
  colorGradingPass = null
  preToneMappingPass = null
  kuwaharaDepthMaskPass = null
  kuwaharaPass = null
  outputPass = null
  depthFogPass = null
}

function createDepthTexture(width: number, height: number) {
  const depthTexture = new THREE.DepthTexture(width, height)
  depthTexture.format = THREE.DepthFormat
  depthTexture.type = THREE.UnsignedIntType
  depthTexture.minFilter = THREE.NearestFilter
  depthTexture.magFilter = THREE.NearestFilter
  depthTexture.generateMipmaps = false
  return depthTexture
}

function attachDepthTexture(renderTarget: THREE.WebGLRenderTarget | undefined) {
  if (!renderTarget) return
  if (renderTarget.depthTexture) return

  renderTarget.depthBuffer = true
  renderTarget.depthTexture = createDepthTexture(
    renderTarget.width,
    renderTarget.height,
  )
}

function getComposerLogicalSize() {
  if (!renderer) return new THREE.Vector2($size.width, $size.height)
  return renderer.getSize(new THREE.Vector2())
}

function createPostProcessingRenderTarget(width: number, height: number) {
  const renderTarget = new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
    depthBuffer: true,
    stencilBuffer: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  })
  renderTarget.texture.colorSpace = THREE.LinearSRGBColorSpace
  renderTarget.texture.generateMipmaps = false
  renderTarget.texture.wrapS = THREE.ClampToEdgeWrapping
  renderTarget.texture.wrapT = THREE.ClampToEdgeWrapping
  return renderTarget
}

function createRendererStateOutputPass(
  outputPassFactory: OutputPassModule,
  override: {
    toneMapping?: THREE.WebGLRenderer['toneMapping']
    outputColorSpace?: THREE.WebGLRenderer['outputColorSpace']
  } = {},
) {
  const pass = new outputPassFactory.OutputPass()
  const originalRender = pass.render.bind(pass)
  pass.render = (
    nextRenderer,
    writeBuffer,
    readBuffer,
    deltaTime,
    maskActive,
  ) => {
    const previousToneMapping = nextRenderer.toneMapping
    const previousOutputColorSpace = nextRenderer.outputColorSpace
    if (override.toneMapping !== undefined) {
      nextRenderer.toneMapping = override.toneMapping
    }
    if (override.outputColorSpace !== undefined) {
      nextRenderer.outputColorSpace = override.outputColorSpace
    }
    originalRender(nextRenderer, writeBuffer, readBuffer, deltaTime, maskActive)
    nextRenderer.toneMapping = previousToneMapping
    nextRenderer.outputColorSpace = previousOutputColorSpace
  }
  return pass
}

async function ensurePostProcessingModules() {
  if (
    effectComposerModule &&
    renderPassModule &&
    shaderPassModule &&
    outputPassModule &&
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
      import('three/examples/jsm/postprocessing/OutputPass.js'),
      import('three/examples/jsm/postprocessing/SSAOPass.js'),
      import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
    ])
      .then(
        ([
          effectComposer,
          renderPass,
          shaderPass,
          outputPassFactory,
          ssao,
          unrealBloom,
        ]) => {
          effectComposerModule = effectComposer
          renderPassModule = renderPass
          shaderPassModule = shaderPass
          outputPassModule = outputPassFactory
          ssaoPassModule = ssao
          unrealBloomPassModule = unrealBloom
          return true
        },
      )
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
  const outputPassFactory = outputPassModule
  const ssao = ssaoPassModule
  const unrealBloom = unrealBloomPassModule
  if (
    !modulesReady ||
    setupToken !== composerSetupToken ||
    !effectComposer ||
    !renderPass ||
    !shaderPass ||
    !outputPassFactory ||
    !ssao ||
    !unrealBloom
  )
    return

  disposeComposer()
  const policy = getPostProcessingPolicy()
  composerPassKey = getComposerPassKey(policy)

  if (
    !policy.depthFogEnabled &&
    !policy.ambientOcclusionEnabled &&
    !policy.bloomEnabled &&
    !policy.colorGradingEnabled &&
    !policy.kuwaharaEnabled
  ) {
    autoRender.set(true)
    return
  }

  const composerSize = getComposerLogicalSize()
  const renderTarget = createPostProcessingRenderTarget(
    composerSize.width,
    composerSize.height,
  )
  attachDepthTexture(renderTarget)

  if ('samples' in renderTarget) {
    ;(renderTarget as THREE.WebGLRenderTarget & { samples?: number }).samples =
      0
  }

  composer = new effectComposer.EffectComposer(renderer, renderTarget)
  composer.setPixelRatio(renderer.getPixelRatio())
  composer.setSize(composerSize.width, composerSize.height)
  attachDepthTexture(
    (composer as EffectComposer & { renderTarget1?: THREE.WebGLRenderTarget })
      .renderTarget1,
  )
  attachDepthTexture(
    (composer as EffectComposer & { renderTarget2?: THREE.WebGLRenderTarget })
      .renderTarget2,
  )
  autoRender.set(false)
  composer.addPass(new renderPass.RenderPass(scene, activeCamera))

  if (policy.kuwaharaEnabled) {
    kuwaharaDepthMaskPass = new KuwaharaDepthMaskPass()
    kuwaharaDepthMaskPass.setCamera(activeCamera)
    composer.addPass(kuwaharaDepthMaskPass)
  }

  if (policy.depthFogEnabled) {
    depthFogPass = new shaderPass.ShaderPass(
      createDepthFogShader(),
    ) as ShaderPass & {
      uniforms: DepthFogShaderUniforms
    }
    const originalRender = depthFogPass.render.bind(depthFogPass)
    depthFogPass.render = (
      nextRenderer,
      writeBuffer,
      readBuffer,
      deltaTime,
      maskActive,
    ) => {
      depthFogPass!.uniforms.tDepth.value = readBuffer.depthTexture ?? null
      updateDepthFogSettings(
        activePostProcessingPolicy ?? getPostProcessingPolicy(),
      )
      originalRender(
        nextRenderer,
        writeBuffer,
        readBuffer,
        deltaTime,
        maskActive,
      )
    }
    updateDepthFogSettings(policy)
    composer.addPass(depthFogPass)
  }

  if (policy.ambientOcclusionEnabled) {
    ssaoPass = new ssao.SSAOPass(
      scene,
      activeCamera,
      composerSize.width,
      composerSize.height,
      8,
    )
    ssaoPass.output = ssao.SSAOPass.OUTPUT.Default
    composer.addPass(ssaoPass)
  }

  if (policy.kuwaharaEnabled) {
    preToneMappingPass = createRendererStateOutputPass(outputPassFactory, {
      outputColorSpace: THREE.LinearSRGBColorSpace,
    })
    composer.addPass(preToneMappingPass)

    kuwaharaPass = new KuwaharaPass(
      composerSize.width * renderer.getPixelRatio(),
      composerSize.height * renderer.getPixelRatio(),
      {
        radius: policy.kuwaharaRadius,
        mix: policy.kuwaharaMix,
        resolutionScale: policy.kuwaharaResolutionScale,
        depthMask: kuwaharaDepthMaskPass?.texture ?? null,
        depthAware: Boolean(kuwaharaDepthMaskPass),
      },
    )
    composer.addPass(kuwaharaPass)
    updateKuwaharaSettings(policy)
  }

  if (policy.bloomEnabled) {
    bloomPass = new unrealBloom.UnrealBloomPass(composerSize, 0, 0.22, 0.9)
    composer.addPass(bloomPass)
  }

  if (policy.colorGradingEnabled) {
    colorGradingPass = new shaderPass.ShaderPass(runtimeColorGradingShader)
    composer.addPass(colorGradingPass)
    updateColorGradingSettings(policy)
  }

  outputPass = createRendererStateOutputPass(
    outputPassFactory,
    policy.kuwaharaEnabled
      ? {
          toneMapping: THREE.NoToneMapping,
        }
      : {},
  )
  composer.addPass(outputPass)
}

function getComposerPassKey(policy = getPostProcessingPolicy()) {
  return [
    policy.depthFogEnabled ? 'depth-fog' : 'no-depth-fog',
    policy.ambientOcclusionEnabled ? 'ao' : 'no-ao',
    policy.bloomEnabled ? 'bloom' : 'no-bloom',
    policy.colorGradingEnabled ? 'color' : 'no-color',
    policy.kuwaharaEnabled ? 'kuwahara' : 'no-kuwahara',
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

function updateDepthFogSettings(policy: RuntimePostProcessingPolicy) {
  const activeCamera = getActiveCamera()
  if (!depthFogPass || !activeCamera) return

  depthFogPass.enabled = policy.depthFogEnabled
  updateDepthFogShaderUniforms(depthFogPass, {
    atmosphere: $runtimeAtmosphereStore,
    camera: activeCamera,
  })
}

function updateColorGradingSettings(policy: RuntimePostProcessingPolicy) {
  if (!colorGradingPass) return

  colorGradingPass.enabled = policy.colorGradingEnabled
  colorGradingPass.uniforms.saturation.value = policy.colorSaturation
  colorGradingPass.uniforms.contrast.value = policy.colorContrast
  colorGradingPass.uniforms.warmth.value = policy.colorWarmth
}

function updateKuwaharaSettings(policy: RuntimePostProcessingPolicy) {
  if (!kuwaharaPass) return

  kuwaharaPass.enabled = policy.kuwaharaEnabled
  kuwaharaPass.radius = policy.kuwaharaRadius
  kuwaharaPass.mix = policy.kuwaharaMix
  kuwaharaPass.resolutionScale = policy.kuwaharaResolutionScale
}

function updateComposerSize(
  _width: number,
  _height: number,
  _canvasScale: number,
) {
  if (!composer || !renderer) return
  const composerSize = getComposerLogicalSize()
  const pixelRatio = renderer.getPixelRatio()
  composer.setPixelRatio(pixelRatio)
  composer.setSize(composerSize.width, composerSize.height)
}

function updateOverlayStyle(policy: RuntimePostProcessingPolicy) {
  if (!vignetteElement) return

  const vignetteStrength = policy.vignetteStrength
  vignetteElement.style.backgroundImage = `radial-gradient(circle at 50% 48%, rgba(0,0,0,0) 42%, rgba(2,4,14,${(vignetteStrength * 0.42).toFixed(3)}) 78%, rgba(1,2,8,${vignetteStrength.toFixed(3)}) 100%)`
  vignetteElement.style.backgroundRepeat = 'no-repeat'
  vignetteElement.style.backgroundSize = '100% 100%'
  vignetteElement.style.opacity = '1'
}

function profileAllowsPostPass(
  pass: 'bloom' | 'color-grading' | 'depth-fog' | 'kuwahara',
) {
  const postProcessing = $runtimeRenderProfileStore.postProcessing
  if (!postProcessing.enabled) return false
  return (
    postProcessing.passes.length === 0 || postProcessing.passes.includes(pass)
  )
}

function getDepthFogParticipationReason(policy: RuntimePostProcessingPolicy) {
  const profile = $runtimeRenderProfileStore
  const atmosphere = $runtimeAtmosphereStore
  if (policy.depthFogEnabled) return 'active'
  if (!profile.postProcessing.enabled) return 'profile disabled'
  if (!profileAllowsPostPass('depth-fog')) {
    return `disabled by ${profile.tier} profile pass list`
  }
  if (!atmosphere.enabled) return 'atmosphere disabled'
  if (
    !(
      (atmosphere.distanceFog.enabled && atmosphere.distanceFog.density > 0) ||
      (atmosphere.heightFog.enabled && atmosphere.heightFog.density > 0)
    )
  ) {
    return 'zero fog density'
  }
  return 'inactive'
}

function getBloomParticipationReason(policy: RuntimePostProcessingPolicy) {
  const profile = $runtimeRenderProfileStore
  if (policy.bloomEnabled) return 'active'
  if (!optionalPostProcessingEnabled) {
    return 'optional post-processing disabled by quality settings'
  }
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
  if (!optionalPostProcessingEnabled) {
    return 'optional post-processing disabled by quality settings'
  }
  if (!profile.postProcessing.enabled) return 'profile disabled'
  if (!profileAllowsPostPass('color-grading')) {
    return `disabled by ${profile.tier} profile pass list`
  }
  return 'neutral color grade'
}

function getKuwaharaParticipationReason(policy: RuntimePostProcessingPolicy) {
  const profile = $runtimeRenderProfileStore
  if (policy.kuwaharaEnabled) return 'active'
  if (!optionalPostProcessingEnabled) {
    return 'optional post-processing disabled by quality settings'
  }
  if (!profile.postProcessing.enabled) return 'profile disabled'
  if (!profileAllowsPostPass('kuwahara')) {
    return `disabled by ${profile.tier} profile pass list`
  }
  if (!profile.postProcessing.kuwahara.enabled) return 'disabled by profile'
  return 'inactive'
}

function publishPostProcessingDiagnostics(policy: RuntimePostProcessingPolicy) {
  if (!levelId) return

  const profile = $runtimeRenderProfileStore
  const depthFogReason = getDepthFogParticipationReason(policy)
  const bloomReason = getBloomParticipationReason(policy)
  const colorGradingReason = getColorGradingParticipationReason(policy)
  const kuwaharaReason = getKuwaharaParticipationReason(policy)
  const depthFogEnabled = depthFogPass?.enabled ?? policy.depthFogEnabled
  const bloomEnabled = bloomPass?.enabled ?? policy.bloomEnabled
  const colorGradingEnabled =
    colorGradingPass?.enabled ?? policy.colorGradingEnabled
  const kuwaharaEnabled = kuwaharaPass?.enabled ?? policy.kuwaharaEnabled
  setRuntimePostProcessingDiagnostics(levelId, {
    enabled: Boolean(composer) && profile.postProcessing.enabled,
    profileId: profile.id,
    passes: profile.postProcessing.enabled ? profile.postProcessing.passes : [],
    atmosphereId: $runtimeAtmosphereStore.id,
    ambientOcclusionEnabled:
      ssaoPass?.enabled ?? policy.ambientOcclusionEnabled,
    depthFogEnabled,
    bloomEnabled,
    colorGradingEnabled,
    kuwaharaEnabled,
    kuwaharaRadius: policy.kuwaharaRadius,
    kuwaharaMix: policy.kuwaharaMix,
    kuwaharaResolutionScale: policy.kuwaharaResolutionScale,
    depthFogReason,
    bloomReason,
    colorGradingReason,
    kuwaharaReason,
    reason: profile.postProcessing.enabled ? undefined : 'profile-disabled',
  })
  setRuntimeDiagnostic('postProcessing', {
    label: 'Post Processing',
    level: profile.postProcessing.enabled ? 'ready' : 'warning',
    message: `${levelId}/${profile.id}/${profile.tier}: depth fog ${depthFogEnabled ? 'on' : `off (${depthFogReason})`}; bloom ${bloomEnabled ? `on strength ${policy.bloomStrength.toFixed(2)} threshold ${policy.bloomThreshold.toFixed(2)}` : `off (${bloomReason})`}; color grading ${colorGradingEnabled ? `on sat ${policy.colorSaturation.toFixed(2)} contrast ${policy.colorContrast.toFixed(2)} warmth ${policy.colorWarmth.toFixed(2)}` : `off (${colorGradingReason})`}; kuwahara ${kuwaharaEnabled ? `on radius ${policy.kuwaharaRadius} mix ${policy.kuwaharaMix.toFixed(2)} res ${policy.kuwaharaResolutionScale.toFixed(2)}` : `off (${kuwaharaReason})`}; passes ${profile.postProcessing.enabled ? profile.postProcessing.passes.join(', ') || 'all' : 'disabled'}.`,
    meta: {
      levelId,
      profileId: profile.id,
      tier: profile.tier,
      enabled: profile.postProcessing.enabled,
      passes: profile.postProcessing.passes,
      depthFogEnabled,
      depthFogReason,
      bloomEnabled,
      bloomReason,
      bloomStrength: policy.bloomStrength,
      bloomThreshold: policy.bloomThreshold,
      colorGradingEnabled,
      colorGradingReason,
      colorSaturation: policy.colorSaturation,
      colorContrast: policy.colorContrast,
      colorWarmth: policy.colorWarmth,
      kuwaharaEnabled,
      kuwaharaReason,
      kuwaharaRadius: policy.kuwaharaRadius,
      kuwaharaMix: policy.kuwaharaMix,
      kuwaharaResolutionScale: policy.kuwaharaResolutionScale,
      optionalPostProcessingEnabled,
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
      depthFogEnabled,
      depthFogReason,
      bloomEnabled,
      bloomReason,
      colorGradingEnabled,
      colorGradingReason,
      kuwaharaEnabled,
      kuwaharaReason,
      kuwaharaRadius: policy.kuwaharaRadius,
      kuwaharaMix: policy.kuwaharaMix,
      kuwaharaResolutionScale: policy.kuwaharaResolutionScale,
      optionalPostProcessingEnabled,
    },
  })
}

$: setQualityLevel($qualityLevelStore)
$: activePostProcessingPolicy = getPostProcessingPolicy({
  renderProfile: $runtimeRenderProfileStore,
  visualStyle: $runtimeVisualStyleStore,
  bloom: $adaptiveBloomConfig,
  toneMapping: $adaptiveToneMappingConfig,
  atmosphere: $runtimeAtmosphereStore,
  optionalEnabled: optionalPostProcessingEnabled,
  baseExposure: toneMappingExposure,
})
$: updateRendererStyle(activePostProcessingPolicy)
$: rebuildComposerIfPassesChanged(activePostProcessingPolicy)
$: updateDepthFogSettings(activePostProcessingPolicy)
$: updateAmbientOcclusionSettings(activePostProcessingPolicy)
$: updateBloomSettings(activePostProcessingPolicy)
$: updateColorGradingSettings(activePostProcessingPolicy)
$: updateKuwaharaSettings(activePostProcessingPolicy)
$: updateComposerSize(
  $size.width,
  $size.height,
  $qualitySettingsStore.canvasScale,
)
$: updateOverlayStyle(activePostProcessingPolicy)
$: publishPostProcessingDiagnostics(activePostProcessingPolicy)

onMount(() => {
  ensureOverlay()
  void setupComposer().then(() => {
    const policy = getPostProcessingPolicy()
    updateRendererStyle(policy)
    updateDepthFogSettings(policy)
    updateAmbientOcclusionSettings(policy)
    updateBloomSettings(policy)
    updateColorGradingSettings(policy)
    updateKuwaharaSettings(policy)
    updateOverlayStyle(policy)
    publishPostProcessingDiagnostics(policy)

    runtimeDebugLog('Runtime post-processing loaded')
  })
})

useTask(
  'simple-postprocessing-render',
  delta => {
    const activeCamera = getActiveCamera()
    if (!composer || !activeCamera) return
    kuwaharaDepthMaskPass?.setCamera(activeCamera)
    updateDepthFogSettings(activePostProcessingPolicy)
    composer.render(delta)
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
