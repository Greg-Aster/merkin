<!--
  Interactive StarSprite Component
  
  This component creates beautiful star-like sprites with:
  - Hard core and glowing border (like StarMap stars)
  - Twinkling animation
  - Emissive material for bright appearance
  - Click interaction support for fireflies and other interactive elements
  - Perfect for fireflies, particles, or any glowing orbs
-->
<script lang="ts">
  import { T, useTask } from '@threlte/core'
  import { onMount, onDestroy } from 'svelte'
  import * as THREE from 'three'
  import { createEnhancedStarTexture, getStarType } from '../../utils/starUtils'

  // Props for customization
  export let position: [number, number, number] = [0, 0, 0]
  export let color: number | string = 0x87ceeb
  export let size: number = 1.0
  export let intensity: number = 1.0
  export let twinkleSpeed: number = 1.0
  export let animationOffset: number = Math.random() * Math.PI * 2
  export let isKeyElement: boolean = false // Special rendering for important elements
  export let enableTwinkle: boolean = true
  export let opacity: number = 1.0
  
  // Interactive firefly props (optional)
  export let isClickable: boolean = false
  export const fireflyData: any = null // For external reference only
  export let onSpriteReady: ((sprite: THREE.Sprite) => void) | null = null // Callback when sprite is ready
  export let isHovered: boolean = false // External hover state from InteractionSystem

  // Internal state
  let sprite: THREE.Sprite
  let material: THREE.SpriteMaterial
  let texture: THREE.CanvasTexture
  let baseScale: number = size
  let initialColor: number | string = color // Store initial color to avoid recreating texture

  onMount(() => {
    createStarSprite()
  })
  
  // --- INTERACTION HANDLERS ---
  // All interactions now handled by centralized InteractionSystem

  function createStarSprite() {
    // Convert numeric color to hex string for starUtils
    const hexColor = typeof initialColor === 'number' ? `#${initialColor.toString(16).padStart(6, '0')}` : initialColor
    
    // Create enhanced star texture like StarMap (ONCE, not every frame)
    const starType = getStarType(`sprite_${position.join('_')}`, isKeyElement)
    const canvas = createEnhancedStarTexture(hexColor, starType, isKeyElement)
    texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    
    // Create sprite material with additive blending for glow effect
    material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.001,
      blending: THREE.AdditiveBlending, // This creates the beautiful glow
      depthWrite: false, // Prevents z-fighting
      depthTest: true,   // Test depth but don't write - allows proper sorting
      opacity: opacity * intensity
    })

    if (sprite) {
      sprite.material = material
      // Ensure fireflies render after ocean surface
      sprite.renderOrder = 1
    }
  }

  // Update material opacity when intensity changes (this is the glow effect!)
  $: if (material) {
    material.opacity = opacity * intensity
  }

  // Animation loop for twinkling
  useTask(() => {
    if (!sprite || !enableTwinkle) return

    const time = performance.now() * 0.001
    
    // Multi-layered twinkling like StarMap stars
    const twinkleTime = time * twinkleSpeed + animationOffset
    const twinkle1 = Math.sin(twinkleTime) * 0.15
    const twinkle2 = Math.sin(twinkleTime * 1.7 + 1) * 0.1
    const twinkle3 = Math.sin(twinkleTime * 0.3 + 2) * 0.05
    const twinkle = 0.85 + twinkle1 + twinkle2 + twinkle3

    // Apply hover effects (like StarMap) - use external hover state
    const hoverScale = isHovered && isClickable ? 1.3 : 1.0
    const hoverGlow = isHovered && isClickable ? 0.4 : 0.0

    // Apply twinkling to scale and opacity with hover effects
    const finalScale = baseScale * size * twinkle * hoverScale
    const finalOpacity = opacity * intensity * twinkle * (1.0 + hoverGlow)
    
    sprite.scale.setScalar(finalScale)
    if (material) {
      material.opacity = Math.min(1, finalOpacity)
    }
  })

  // Update base scale when size prop changes
  $: {
    baseScale = size
    if (sprite) {
      sprite.scale.setScalar(baseScale)
    }
  }

  // Update position when prop changes
  $: if (sprite) {
    sprite.position.set(...position)
  }

  // Call onSpriteReady when sprite becomes available
  $: if (sprite && onSpriteReady) {
    onSpriteReady(sprite)
  }

  // Cleanup on destroy
  onDestroy(() => {
    if (texture) {
      texture.dispose()
    }
    if (material) {
      material.dispose()
    }
  })
</script>

<T.Sprite
  bind:ref={sprite}
  position={position}
  scale={size}
  {material}
/>

<style>
/* No styles needed */
</style>