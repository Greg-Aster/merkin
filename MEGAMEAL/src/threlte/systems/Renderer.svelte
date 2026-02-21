<!-- 
  Threlte Renderer Component - Simplified for Phase 4
  Now focuses only on renderer configuration, post-processing handled separately
-->
<script lang="ts">
import { T, useThrelte } from '@threlte/core'
import { onMount } from 'svelte'
import * as THREE from 'three'

// Renderer configuration - matches existing Engine.ts settings
export let antialias = true
export let alpha = false
export let powerPreference: 'default' | 'high-performance' | 'low-power' = 'high-performance'
export let maxPixelRatio = 2

// Mobile optimization
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
)

// Threlte context
const { renderer } = useThrelte()

// Configuration object
const config = {
  antialias: isMobile ? false : antialias, // Disable on mobile for performance
  alpha,
  powerPreference: isMobile ? 'low-power' : powerPreference,
  maxPixelRatio: isMobile ? 1.5 : maxPixelRatio
}

onMount(() => {
  if (!renderer) {
    console.warn('⚠️ Renderer not available in Threlte context')
    return
  }
  
  console.log('🎨 Configuring Threlte renderer...')
  
  // Shadow mapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  
  // Tone mapping
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  
  // Background
  renderer.setClearColor(0x000000, 1)
  renderer.autoClear = true
  
  // Performance optimizations
  renderer.info.autoReset = false
  
  // Mobile resolution scaling
  if (isMobile) {
    const mobileScale = 0.75
    const width = Math.floor(window.innerWidth * mobileScale)
    const height = Math.floor(window.innerHeight * mobileScale)
    renderer.setSize(width, height)
    renderer.domElement.style.width = window.innerWidth + 'px'
    renderer.domElement.style.height = window.innerHeight + 'px'
  }
  
  // Pixel ratio
  const pixelRatio = Math.min(window.devicePixelRatio, config.maxPixelRatio)
  renderer.setPixelRatio(pixelRatio)
  
  console.log('✅ Threlte renderer configured with optimizations')
})

// Export configuration for other components
export { config }
</script>

<!-- Renderer configuration -->
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