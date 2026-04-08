<!--
  src/threlte/effects/UnderwaterEffect.svelte
  
  Reusable underwater effect component following MEGAMEAL Threlte architecture
  
  Features:
  - Blue color grading overlay
  - Particle-based bubble system  
  - Mist/fog particles
  - Reactive to depth changes
  - Performance optimized with LOD
-->

<script lang="ts">
  import { T } from '@threlte/core'
  import { onMount, onDestroy } from 'svelte'
  import * as THREE from 'three'
  import { 
    underwaterStateStore, 
    underwaterConfigStore, 
    underwaterIntensity,
    underwaterFogDensity,
    underwaterUtils
  } from '../stores/underwaterStore'

  // Props
  export let enabled = true
  export let position: [number, number, number] = [0, 0, 0]
  export let size: [number, number, number] = [100, 20, 100] // width, height, depth

  // Component state
  let bubbleParticles: THREE.Points
  let mistParticles: THREE.Points
  let overlayPlane: THREE.Mesh
  let animationId: number

  // Reactive values
  $: isUnderwater = $underwaterStateStore.isUnderwater
  $: depth = $underwaterStateStore.depth  
  $: transitionProgress = $underwaterStateStore.transitionProgress
  $: intensity = $underwaterIntensity
  $: fogDensity = $underwaterFogDensity
  $: config = $underwaterConfigStore

  // Particle system setup
  let bubbleGeometry: THREE.BufferGeometry
  let mistGeometry: THREE.BufferGeometry
  let bubbleMaterial: THREE.PointsMaterial
  let mistMaterial: THREE.PointsMaterial
  
  onMount(() => {
    if (enabled) {
      initializeParticleSystems()
      startAnimation()
    }
  })

  onDestroy(() => {
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
    cleanupGeometry()
  })

  function initializeParticleSystems() {
    // Bubble particle system
    bubbleGeometry = new THREE.BufferGeometry()
    const bubblePositions = new Float32Array(config.bubbleParticleCount * 3)
    const bubbleVelocities = new Float32Array(config.bubbleParticleCount * 3)
    const bubbleSizes = new Float32Array(config.bubbleParticleCount)
    
    for (let i = 0; i < config.bubbleParticleCount; i++) {
      const i3 = i * 3
      
      // Random positions within water bounds
      bubblePositions[i3] = (Math.random() - 0.5) * size[0]
      bubblePositions[i3 + 1] = Math.random() * size[1] 
      bubblePositions[i3 + 2] = (Math.random() - 0.5) * size[2]
      
      // Random upward velocities
      bubbleVelocities[i3] = (Math.random() - 0.5) * 0.02
      bubbleVelocities[i3 + 1] = 0.01 + Math.random() * 0.05
      bubbleVelocities[i3 + 2] = (Math.random() - 0.5) * 0.02
      
      // Random bubble sizes
      bubbleSizes[i] = 0.1 + Math.random() * 0.3
    }
    
    bubbleGeometry.setAttribute('position', new THREE.BufferAttribute(bubblePositions, 3))
    bubbleGeometry.setAttribute('velocity', new THREE.BufferAttribute(bubbleVelocities, 3))
    bubbleGeometry.setAttribute('size', new THREE.BufferAttribute(bubbleSizes, 1))

    // Bubble material with circular sprite
    bubbleMaterial = new THREE.PointsMaterial({
      color: 0x87CEEB,
      size: 0.2,
      transparent: true,
      opacity: 0.6,
      map: createBubbleTexture(),
      alphaTest: 0.1,
      depthWrite: false
    })

    // Mist particle system
    mistGeometry = new THREE.BufferGeometry()
    const mistPositions = new Float32Array(config.mistParticleCount * 3)
    const mistOpacities = new Float32Array(config.mistParticleCount)
    
    for (let i = 0; i < config.mistParticleCount; i++) {
      const i3 = i * 3
      
      mistPositions[i3] = (Math.random() - 0.5) * size[0] * 1.2
      mistPositions[i3 + 1] = Math.random() * size[1]
      mistPositions[i3 + 2] = (Math.random() - 0.5) * size[2] * 1.2
      
      mistOpacities[i] = Math.random() * 0.3
    }
    
    mistGeometry.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3))
    mistGeometry.setAttribute('opacity', new THREE.BufferAttribute(mistOpacities, 1))

    mistMaterial = new THREE.PointsMaterial({
      color: 0x4682B4,
      size: 2.0,
      transparent: true,
      opacity: 0.1,
      map: createMistTexture(),
      alphaTest: 0.05,
      depthWrite: false
    })
  }

  function createBubbleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }

  function createMistTexture(): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)')
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }

  function startAnimation() {
    function animate() {
      if (isUnderwater && bubbleGeometry && mistGeometry) {
        updateBubbles()
        updateMist()
      }
      animationId = requestAnimationFrame(animate)
    }
    animate()
  }

  function updateBubbles() {
    const positions = bubbleGeometry.attributes.position.array as Float32Array
    const velocities = bubbleGeometry.attributes.velocity.array as Float32Array
    
    for (let i = 0; i < config.bubbleParticleCount; i++) {
      const i3 = i * 3
      
      // Update positions
      positions[i3] += velocities[i3]
      positions[i3 + 1] += velocities[i3 + 1]
      positions[i3 + 2] += velocities[i3 + 2]
      
      // Reset bubbles that reach the surface
      if (positions[i3 + 1] > size[1]) {
        positions[i3] = (Math.random() - 0.5) * size[0]
        positions[i3 + 1] = 0
        positions[i3 + 2] = (Math.random() - 0.5) * size[2]
      }
      
      // Keep bubbles within bounds horizontally
      if (Math.abs(positions[i3]) > size[0] / 2) {
        velocities[i3] *= -0.5
      }
      if (Math.abs(positions[i3 + 2]) > size[2] / 2) {
        velocities[i3 + 2] *= -0.5
      }
    }
    
    bubbleGeometry.attributes.position.needsUpdate = true
  }

  function updateMist() {
    const positions = mistGeometry.attributes.position.array as Float32Array
    
    for (let i = 0; i < config.mistParticleCount; i++) {
      const i3 = i * 3
      
      // Gentle drift motion
      positions[i3] += Math.sin(Date.now() * 0.0001 + i) * 0.01
      positions[i3 + 2] += Math.cos(Date.now() * 0.0001 + i) * 0.01
    }
    
    mistGeometry.attributes.position.needsUpdate = true
  }

  function cleanupGeometry() {
    bubbleGeometry?.dispose()
    mistGeometry?.dispose()
    bubbleMaterial?.dispose()
    mistMaterial?.dispose()
  }

  // Update material properties based on underwater state
  $: if (bubbleMaterial && mistMaterial) {
    bubbleMaterial.opacity = intensity * 0.6 * transitionProgress
    mistMaterial.opacity = intensity * 0.2 * transitionProgress
  }
</script>

<!-- Underwater Effect Container -->
{#if enabled && isUnderwater}
  <T.Group {position}>
    
    <!-- Bubble Particles -->
    {#if config.enableBubbles && bubbleGeometry && bubbleMaterial}
      <T.Points 
        bind:ref={bubbleParticles}
        geometry={bubbleGeometry}
        material={bubbleMaterial}
      />
    {/if}
    
    <!-- Mist Particles -->
    {#if config.enableMist && mistGeometry && mistMaterial}
      <T.Points 
        bind:ref={mistParticles}
        geometry={mistGeometry}
        material={mistMaterial}
      />
    {/if}
    
    <!-- Underwater Ambient Light -->
    <T.AmbientLight 
      color={underwaterUtils.getWaterColor(depth)}
      intensity={0.3 * transitionProgress}
    />
    
    <!-- Underwater Fog (simulated with large transparent sphere) -->
    {#if config.enableColorGrading}
      <T.Mesh position={[0, size[1]/2, 0]}>
        <T.SphereGeometry args={[size[0], 32, 32]} />
        <T.MeshBasicMaterial 
          color={underwaterUtils.getWaterColor(depth)}
          transparent={true}
          opacity={fogDensity * 0.1}
          side={THREE.BackSide}
        />
      </T.Mesh>
    {/if}
    
  </T.Group>
{/if}

<style>
  /* Component styles if needed */
</style>