<!--
  FireflyAvatar - Small firefly visual for conversation dialog
  
  Creates a tiny animated firefly visual to represent the NPC in conversations
  Uses same visual principles as the main firefly system
-->
<script lang="ts">
  import { onMount } from 'svelte'
  
  export let color: string = '#87ceeb' // Default firefly color
  export let size: number = 20 // Size in pixels
  export let intensity: number = 1.0
  export let animate: boolean = true
  
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D
  let animationFrame: number
  let startTime = Date.now()
  
  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext('2d')!
      if (animate) {
        startAnimation()
      } else {
        drawFirefly(1.0)
      }
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  })
  
  function startAnimation() {
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000
      const twinkle = 0.7 + 0.3 * Math.sin(elapsed * 2) // Gentle pulsing
      drawFirefly(twinkle * intensity)
      animationFrame = requestAnimationFrame(animate)
    }
    animate()
  }
  
  function drawFirefly(currentIntensity: number) {
    if (!ctx) return
    
    const centerX = size / 2
    const centerY = size / 2
    const radius = size * 0.3
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size)
    
    // Create radial gradient for glow effect
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius * 2
    )
    
    // Parse color and create glow
    const baseColor = color.startsWith('#') ? color.slice(1) : color
    const r = parseInt(baseColor.slice(0, 2), 16)
    const g = parseInt(baseColor.slice(2, 4), 16)
    const b = parseInt(baseColor.slice(4, 6), 16)
    
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${currentIntensity})`)
    gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${currentIntensity * 0.8})`)
    gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${currentIntensity * 0.3})`)
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
    
    // Draw outer glow
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    
    // Draw bright core
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 0.3, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${Math.min(255, r + 50)}, ${Math.min(255, g + 50)}, ${Math.min(255, b + 50)}, ${currentIntensity})`
    ctx.fill()
  }
  
  // Update when color or intensity changes
  $: if (ctx && !animate) {
    drawFirefly(intensity)
  }
</script>

<canvas
  bind:this={canvas}
  width={size}
  height={size}
  class="firefly-avatar"
  style="width: {size}px; height: {size}px;"
/>

<style>
  .firefly-avatar {
    border-radius: 50%;
    filter: blur(0.5px); /* Subtle blur for softer glow */
  }
</style>