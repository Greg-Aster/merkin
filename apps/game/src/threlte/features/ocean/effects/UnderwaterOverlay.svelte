<!--
  src/threlte/effects/UnderwaterOverlay.svelte
  
  Screen overlay component for underwater blue tint effect
  Renders as UI overlay, not 3D object
-->

<script lang="ts">
import { onDestroy, onMount } from 'svelte'
import {
  underwaterConfigStore,
  underwaterIntensity,
  underwaterStateStore,
} from '../stores/underwaterStore'

// Props
export let enabled = true
export let underwaterFogColor: string | number = 0x0a1922
export let atmosphereFogColor = '#7b8797'
export let atmosphereFogDensity = 0
export let atmosphereHeightFogEnabled = false
export let atmosphereHeightFogColor = '#7b8797'
export let atmosphereHeightFogDensity = 0
export let atmosphereHeightFogFloor = 0
export let atmosphereHeightFogCeiling = 4

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
$: shouldAnimate = enabled && (isUnderwater || transitionProgress > 0)

type Rgb = [number, number, number]

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function colorToRgb(value: string | number | null | undefined, fallback: Rgb) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255] as Rgb
  }

  if (typeof value !== 'string') return fallback

  const hex = value.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    const parsed = Number.parseInt(hex, 16)
    return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255] as Rgb
  }

  const rgbMatch = value.match(
    /rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/,
  )
  if (rgbMatch) {
    return [
      Number(rgbMatch[1]),
      Number(rgbMatch[2]),
      Number(rgbMatch[3]),
    ] as Rgb
  }

  return fallback
}

function mixRgb(a: Rgb, b: Rgb, amount: number) {
  const t = clamp01(amount)
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ] as Rgb
}

function rgba(color: Rgb, alpha: number) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`
}

function getAtmosphereInfluence() {
  const heightFogBand = Math.max(
    0.001,
    atmosphereHeightFogCeiling - atmosphereHeightFogFloor,
  )
  const heightFogBandFactor = atmosphereHeightFogEnabled
    ? Math.min(1.5, Math.max(0.35, 6 / heightFogBand))
    : 0

  return clamp01(
    0.28 +
      atmosphereFogDensity * 70 +
      atmosphereHeightFogDensity * 650 * heightFogBandFactor,
  )
}

function getOverlayGradient() {
  const waterColor = colorToRgb(underwaterFogColor, [10, 25, 34])
  const atmosphereColor = colorToRgb(
    atmosphereHeightFogEnabled ? atmosphereHeightFogColor : atmosphereFogColor,
    [123, 135, 151],
  )
  const influence = getAtmosphereInfluence()
  const depthFactor = clamp01(depth / Math.max(1, config.maxDepth))
  const innerColor = mixRgb([45, 105, 130], atmosphereColor, influence * 0.35)
  const midColor = mixRgb(waterColor, atmosphereColor, influence)
  const outerColor = mixRgb(
    [0, 10, 20],
    atmosphereColor,
    influence * (0.35 + depthFactor * 0.25),
  )

  return {
    influence,
    gradient: `
        radial-gradient(
          ellipse at center,
          ${rgba(innerColor, 0.1 + depthFactor * 0.04)} 0%,
          ${rgba(midColor, 0.3 + depthFactor * 0.08)} 70%,
          ${rgba(outerColor, 0.5 + depthFactor * 0.12)} 100%
        )
      `,
  }
}

onMount(() => {
  if (enabled) {
    createOverlay()
    if (shouldAnimate) {
      startAnimation()
    } else {
      updateOverlay()
    }
  }
})

onDestroy(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  removeOverlay()
})

function createOverlay() {
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
}

function removeOverlay() {
  if (overlayElement && overlayElement.parentNode) {
    overlayElement.parentNode.removeChild(overlayElement)
  }
}

function startAnimation() {
  if (animationId) return

  function animate() {
    if (overlayElement) {
      updateOverlay()
    }
    animationId = requestAnimationFrame(animate)
  }
  animate()
}

function stopAnimation() {
  if (!animationId) return
  cancelAnimationFrame(animationId)
  animationId = 0
}

function updateOverlay() {
  if (!overlayElement) return

  if (isUnderwater && config.enableColorGrading) {
    const { gradient, influence } = getOverlayGradient()
    const transitionFactor = Math.max(transitionProgress, 0.18)
    const targetOpacity =
      Math.min(0.82, 0.48 + intensity * 0.22 + influence * 0.14) *
      transitionFactor
    overlayElement.style.opacity = targetOpacity.toString()
    overlayElement.style.background = gradient

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
  if (shouldAnimate) {
    startAnimation()
  } else {
    stopAnimation()
    updateOverlay()
  }
}
</script>

<!-- This component doesn't render any Svelte markup -->
<!-- It creates and manages a DOM overlay element directly -->
