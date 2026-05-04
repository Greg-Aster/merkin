<!--
  Real lightweight post-processing.
  Uses a true EffectComposer bloom pass and keeps screen-space styling minimal.
-->
<script lang="ts">
import { useTask, useThrelte } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import * as THREE from 'three'
import { runtimeDebugLog } from '../utils/runtimeLog'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { qualityLevelStore } from '../features/performance/stores/performanceStore'
import { resolveRuntimePostProcessingPolicy } from '../features/performance/utils/runtimeVisualQualityPolicy'
import {
  adaptiveBloomConfig,
  adaptiveToneMappingConfig,
  setQualityLevel,
} from '../stores/postProcessingStore'
import { runtimeVisualStyleStore } from '../styles/runtimeVisualStyleStore'

const { renderer, scene, camera, size, autoRender, renderStage } = useThrelte()


export let toneMappingExposure = 1.0

let composer: EffectComposer | null = null
let bloomPass: UnrealBloomPass | null = null
let vignetteElement: HTMLDivElement | null = null
let overlayContainer: HTMLElement | null = null

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

function setupComposer() {
  const activeCamera = getActiveCamera()
  if (
    !renderer ||
    !scene ||
    !activeCamera ||
    $size.width < 2 ||
    $size.height < 2
  )
    return

  composer?.dispose()

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

  composer = new EffectComposer(renderer, renderTarget)
  composer.addPass(new RenderPass(scene, activeCamera))

  bloomPass = new UnrealBloomPass(
    new THREE.Vector2($size.width, $size.height),
    0,
    0.22,
    0.9,
  )
  composer.addPass(bloomPass)
}

function updateRendererStyle() {
  if (!renderer) return

  const policy = resolveRuntimePostProcessingPolicy({
    baseExposure: toneMappingExposure,
    visualStyle: $runtimeVisualStyleStore,
    bloom: $adaptiveBloomConfig,
    toneMapping: $adaptiveToneMappingConfig,
  })

  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = policy.exposure
  renderer.outputColorSpace = THREE.SRGBColorSpace
}

function updateBloomSettings() {
  if (!bloomPass) return

  const policy = resolveRuntimePostProcessingPolicy({
    baseExposure: toneMappingExposure,
    visualStyle: $runtimeVisualStyleStore,
    bloom: $adaptiveBloomConfig,
    toneMapping: $adaptiveToneMappingConfig,
  })

  bloomPass.enabled = policy.bloomEnabled
  bloomPass.strength = policy.bloomStrength
  bloomPass.radius = policy.bloomRadius
  bloomPass.threshold = policy.bloomThreshold
}

function updateComposerSize() {
  if (!composer) return
  composer.setSize($size.width, $size.height)
}

function updateOverlayStyle() {
  if (!vignetteElement) return

  const policy = resolveRuntimePostProcessingPolicy({
    baseExposure: toneMappingExposure,
    visualStyle: $runtimeVisualStyleStore,
    bloom: $adaptiveBloomConfig,
    toneMapping: $adaptiveToneMappingConfig,
  })
  const vignetteStrength = policy.vignetteStrength
  vignetteElement.style.backgroundImage = `radial-gradient(circle at 50% 48%, rgba(0,0,0,0) 42%, rgba(2,4,14,${(vignetteStrength * 0.42).toFixed(3)}) 78%, rgba(1,2,8,${vignetteStrength.toFixed(3)}) 100%)`
  vignetteElement.style.backgroundRepeat = 'no-repeat'
  vignetteElement.style.backgroundSize = '100% 100%'
  vignetteElement.style.opacity = '1'
}

$: setQualityLevel($qualityLevelStore)
$: updateRendererStyle()
$: updateBloomSettings()
$: updateComposerSize()
$: updateOverlayStyle()

onMount(() => {
  autoRender.set(false)
  ensureOverlay()
  setupComposer()
  updateRendererStyle()
  updateBloomSettings()
  updateOverlayStyle()

  runtimeDebugLog('✨ Real bloom post-processing loaded')
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
  composer?.dispose()
  composer = null
  bloomPass = null
  vignetteElement?.remove()
  vignetteElement = null
  overlayContainer = null
})
</script>
