<!--
  Threlte Renderer Component
  Configures the WebGL renderer and reacts to quality tier changes.
-->
<script lang="ts">
import { T, useThrelte } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import * as THREE from 'three'
import {
  type QualitySettings,
  qualitySettingsStore,
} from '../features/performance'

// Renderer configuration
export const antialias = true
export const alpha = false
export const powerPreference: 'default' | 'high-performance' | 'low-power' =
  'high-performance'
export const maxPixelRatio = 2

// Mobile detection (used only for renderer creation params — quality system handles everything else)
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  )

const config = {
  antialias: isMobile ? false : antialias,
  alpha,
  powerPreference: isMobile ? 'low-power' : powerPreference,
  maxPixelRatio: isMobile ? 1.5 : maxPixelRatio,
}

const { renderer } = useThrelte()

function applyQualitySettings(
  quality: Pick<QualitySettings, 'canvasScale' | 'shadowMapSize'>,
) {
  if (!renderer) return

  // Apply quality scaling through pixel ratio only. Scaling both pixel ratio and
  // framebuffer size was over-allocating the render target on HiDPI laptops.
  const basePixelRatio = Math.min(
    window.devicePixelRatio || 1,
    config.maxPixelRatio,
  )
  const scaledPixelRatio = Math.max(0.5, basePixelRatio * quality.canvasScale)
  renderer.setPixelRatio(scaledPixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight, false)
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'

  // Shadow map
  renderer.shadowMap.enabled = quality.shadowMapSize > 0
  if (quality.shadowMapSize > 0) {
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }
  // Broadcast shadow map size so lights can update their shadow.mapSize
  window.dispatchEvent(
    new CustomEvent('game:shadowMapSize', { detail: quality.shadowMapSize }),
  )
}

let currentQualitySettings: Pick<
  QualitySettings,
  'canvasScale' | 'shadowMapSize'
> = { ...$qualitySettingsStore }

function applyRendererProfile() {
  applyQualitySettings(currentQualitySettings)
}

let unsubscribeQuality: (() => void) | undefined
let handleResize: (() => void) | undefined

onMount(() => {
  if (!renderer) {
    console.warn('⚠️ Renderer not available in Threlte context')
    return
  }

  if (import.meta.env.DEV) {
    console.log('🎨 Configuring Threlte renderer...')
  }

  // One-time renderer setup
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  if ('useLegacyLights' in renderer) {
    ;(renderer as THREE.WebGLRenderer & { useLegacyLights?: boolean }).useLegacyLights = true
  }
  renderer.setClearColor(0x000000, 1)
  renderer.autoClear = true
  renderer.info.autoReset = true

  // Subscribe to quality changes — applies canvas scale and shadow settings reactively
  unsubscribeQuality = qualitySettingsStore.subscribe(quality => {
    currentQualitySettings = quality
    applyRendererProfile()
  })

  handleResize = () => {
    applyRendererProfile()
  }
  window.addEventListener('resize', handleResize)

  if (import.meta.env.DEV) {
    console.log('✅ Threlte renderer configured')
  }
})

onDestroy(() => {
  unsubscribeQuality?.()
  if (handleResize) {
    window.removeEventListener('resize', handleResize)
  }
})

export { config }
</script>

<T.WebGLRenderer
  antialias={config.antialias}
  alpha={config.alpha}
  premultipliedAlpha={false}
  stencil={!isMobile}
  preserveDrawingBuffer={false}
  powerPreference={config.powerPreference}
/>
