<!--
  src/threlte/effects/UnderwaterOverlay.svelte
  
  Screen overlay component for underwater blue tint effect
  Renders as UI overlay, not 3D object
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { 
    underwaterStateStore, 
    underwaterConfigStore,
    underwaterIntensity 
  } from '../stores/underwaterStore'

  // Props
  export let enabled = true

  // Component state
  let overlayElement: HTMLDivElement
  let animationId: number

  // Reactive values
  $: isUnderwater = $underwaterStateStore.isUnderwater
  $: depth = $underwaterStateStore.depth
  $: transitionProgress = $underwaterStateStore.transitionProgress
  $: intensity = $underwaterIntensity
  $: config = $underwaterConfigStore
  
  // Debug reactive changes
  $: if (isUnderwater) {
    console.log('🎨 UnderwaterOverlay: Player underwater - depth:', depth, 'intensity:', intensity)
  } else {
    console.log('🎨 UnderwaterOverlay: Player above water')
  }

  onMount(() => {
    console.log('🎨 UnderwaterOverlay: Mounting with enabled:', enabled)
    if (enabled) {
      createOverlay()
      startAnimation()
    }
  })

  onDestroy(() => {
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
    removeOverlay()
  })

  function createOverlay() {
    console.log('🎨 UnderwaterOverlay: Creating overlay element')
    // Create overlay element
    overlayElement = document.createElement('div')
    overlayElement.id = 'underwater-overlay'
    overlayElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 1000;
      background: radial-gradient(
        ellipse at center,
        rgba(10, 30, 40, 0.5) 0%,
        rgba(5, 20, 30, 0.7) 60%,
        rgba(0, 10, 20, 0.9) 100%
      );
      opacity: 0;
      transition: opacity 0.2s ease-in-out;
      mix-blend-mode: normal;
    `
    
    document.body.appendChild(overlayElement)
    console.log('🎨 UnderwaterOverlay: Overlay element added to DOM:', overlayElement)
  }

  function removeOverlay() {
    if (overlayElement && overlayElement.parentNode) {
      overlayElement.parentNode.removeChild(overlayElement)
    }
  }

  function startAnimation() {
    function animate() {
      if (overlayElement) {
        updateOverlay()
      }
      animationId = requestAnimationFrame(animate)
    }
    animate()
  }

  function updateOverlay() {
    if (!overlayElement) return

    if (isUnderwater && config.enableColorGrading) {
      // FORCE dramatic underwater effect - always highly visible
      const targetOpacity = 0.7 // Fixed 70% opacity when underwater - should be very visible!
      overlayElement.style.opacity = targetOpacity.toString()
      
      // Update color based on depth
      const lightness = Math.max(20, 60 - (depth * 2))
      const hue = 200 // Blue hue
      const saturation = Math.min(80, 60 + (depth * 3))
      
      overlayElement.style.background = `
        radial-gradient(
          ellipse at center,
          hsla(${hue}, ${saturation}%, ${lightness + 20}%, 0.1) 0%,
          hsla(${hue}, ${saturation}%, ${lightness}%, 0.3) 70%,
          hsla(${hue}, ${saturation}%, ${lightness - 10}%, 0.5) 100%
        )
      `
      
      // Add subtle animation for underwater shimmer
      const shimmerOffset = Math.sin(Date.now() * 0.001) * 10
      overlayElement.style.transform = `translateX(${shimmerOffset}px)`
      
    } else {
      // Fade out when not underwater
      overlayElement.style.opacity = '0'
      overlayElement.style.transform = 'translateX(0px)'
    }
  }

  // Reactive updates
  $: if (overlayElement) {
    updateOverlay()
  }
</script>

<!-- This component doesn't render any Svelte markup -->
<!-- It creates and manages a DOM overlay element directly -->

<style>
  /* 
    Styles are applied directly via JavaScript for performance
    and to ensure the overlay appears above the Threlte canvas
  */
</style>