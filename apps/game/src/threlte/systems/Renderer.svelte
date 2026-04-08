<!--
  Threlte Renderer Component
  Configures the WebGL renderer and reacts to quality tier changes.
-->
<script lang="ts">
import { T, useThrelte } from '@threlte/core'
import { onMount, onDestroy } from 'svelte'
import * as THREE from 'three'
import { qualitySettingsStore } from '../features/performance'

// Renderer configuration
export let antialias = true
export let alpha = false
export let powerPreference: 'default' | 'high-performance' | 'low-power' = 'high-performance'
export let maxPixelRatio = 2

// Mobile detection (used only for renderer creation params — quality system handles everything else)
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
)

const config = {
  antialias: isMobile ? false : antialias,
  alpha,
  powerPreference: isMobile ? 'low-power' : powerPreference,
  maxPixelRatio: isMobile ? 1.5 : maxPixelRatio,
}

const { renderer } = useThrelte()

function applyQualitySettings(quality: { canvasScale: number; shadowMapSize: number }) {
  if (!renderer) return

  // Canvas scale — drives render resolution
  const scale = quality.canvasScale
  const w = Math.floor(window.innerWidth * scale)
  const h = Math.floor(window.innerHeight * scale)
  renderer.setSize(w, h)
  renderer.domElement.style.width = window.innerWidth + 'px'
  renderer.domElement.style.height = window.innerHeight + 'px'

  // Shadow map
  renderer.shadowMap.enabled = quality.shadowMapSize > 0
  if (quality.shadowMapSize > 0) {
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }
  // Broadcast shadow map size so lights can update their shadow.mapSize
  window.dispatchEvent(new CustomEvent('game:shadowMapSize', { detail: quality.shadowMapSize }))
}

let unsubscribe: (() => void) | undefined

onMount(() => {
  if (!renderer) {
    console.warn('⚠️ Renderer not available in Threlte context')
    return
  }

  console.log('🎨 Configuring Threlte renderer...')

  // One-time renderer setup
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.setClearColor(0x000000, 1)
  renderer.autoClear = true
  renderer.info.autoReset = false

  // Pixel ratio (fixed — not quality-tier dependent)
  const pixelRatio = Math.min(window.devicePixelRatio, config.maxPixelRatio)
  renderer.setPixelRatio(pixelRatio)

  // Subscribe to quality changes — applies canvas scale and shadow settings reactively
  unsubscribe = qualitySettingsStore.subscribe(quality => {
    applyQualitySettings(quality)
  })

  console.log('✅ Threlte renderer configured')
})

onDestroy(() => {
  unsubscribe?.()
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

<style>
/* No styles needed - this is a system component */
</style>
