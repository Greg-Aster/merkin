<script lang="ts">
  import { T, useTask } from '@threlte/core'
  import { onDestroy } from 'svelte'
  import * as THREE from 'three'

  export let enabled = true
  export let count = 160
  export let radius = 140
  export let minHeight = 0.5
  export let maxHeight = 16
  export let color = '#b8d9ff'
  export let secondaryColor = '#f3e8b2'
  export let size = 1.2
  export let opacity = 0.28
  export let driftSpeed = 0.22
  export let sway = 0.85
  export let center: [number, number, number] = [0, 0, 0]
  export let distribution: 'volume' | 'ground' = 'volume'
  export let blendMode: 'normal' | 'additive' = 'additive'
  export let groundBandStrength = 0.35
  export let intensity = 1

  let geometry: THREE.BufferGeometry | null = null
  let material: THREE.PointsMaterial | null = null
  let spriteTexture: THREE.Texture | null = null
  let basePositions = new Float32Array(0)
  let phases = new Float32Array(0)
  let speeds = new Float32Array(0)
  let currentCount = 0
  let animationTime = 0

  function randomPointInRadius(maxRadius: number) {
    const angle = Math.random() * Math.PI * 2
    const distance = Math.sqrt(Math.random()) * maxRadius
    return [Math.cos(angle) * distance, Math.sin(angle) * distance]
  }

  function createSpriteTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const context = canvas.getContext('2d')
    if (!context) return null

    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.85)')
    gradient.addColorStop(0.75, 'rgba(255,255,255,0.12)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 128, 128)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }

  function disposeResources() {
    geometry?.dispose()
    material?.dispose()
    spriteTexture?.dispose()
    geometry = null
    material = null
    spriteTexture = null
  }

  function rebuildParticles() {
    if (typeof document === 'undefined' || !enabled) return

    disposeResources()

    currentCount = Math.max(1, Math.floor(count))
    const positions = new Float32Array(currentCount * 3)
    const colors = new Float32Array(currentCount * 3)
    const sizes = new Float32Array(currentCount)
    basePositions = new Float32Array(currentCount * 3)
    phases = new Float32Array(currentCount)
    speeds = new Float32Array(currentCount)

    const primary = new THREE.Color(color)
    const secondary = new THREE.Color(secondaryColor)

    for (let index = 0; index < currentCount; index += 1) {
      const offset = index * 3
      const [x, z] = randomPointInRadius(radius)
      const heightRange = Math.max(0.01, maxHeight - minHeight)
      const groundedBias = Math.min(Math.max(groundBandStrength, 0.05), 1)
      const y = distribution === 'ground'
        ? minHeight + (Math.pow(Math.random(), 1 + groundedBias * 4) * heightRange)
        : minHeight + Math.random() * heightRange
      const tint = index % 4 === 0 ? secondary : primary

      basePositions[offset] = x
      basePositions[offset + 1] = y
      basePositions[offset + 2] = z

      positions[offset] = x
      positions[offset + 1] = y
      positions[offset + 2] = z

      colors[offset] = tint.r * intensity
      colors[offset + 1] = tint.g * intensity
      colors[offset + 2] = tint.b * intensity

      sizes[index] = size * (0.65 + Math.random() * 0.9)
      phases[index] = Math.random() * Math.PI * 2
      speeds[index] = 0.45 + Math.random() * 0.8
    }

    geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    spriteTexture = createSpriteTexture()
    material = new THREE.PointsMaterial({
      size,
      map: spriteTexture ?? undefined,
      transparent: true,
      opacity,
      vertexColors: true,
      depthWrite: false,
      alphaTest: 0.02,
      blending: blendMode === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending,
      sizeAttenuation: true,
    })
  }

  $: if (enabled) {
    rebuildParticles()
  } else {
    disposeResources()
  }

  useTask((delta) => {
    if (!enabled || !geometry || currentCount === 0) return

    animationTime += delta
    const positions = geometry.attributes.position.array as Float32Array
    const heightSpan = Math.max(0.01, maxHeight - minHeight)

    for (let index = 0; index < currentCount; index += 1) {
      const offset = index * 3
      const phase = phases[index] + animationTime * driftSpeed * speeds[index]
      const rise = ((basePositions[offset + 1] - minHeight) + animationTime * driftSpeed * 0.8 * speeds[index]) % heightSpan

      positions[offset] = basePositions[offset] + Math.sin(phase) * sway
      positions[offset + 1] = minHeight + rise
      positions[offset + 2] = basePositions[offset + 2] + Math.cos(phase * 0.8) * sway
    }

    geometry.attributes.position.needsUpdate = true
  })

  onDestroy(() => {
    disposeResources()
  })
</script>

{#if enabled && geometry && material}
  <T.Group position={center}>
    <T.Points geometry={geometry} material={material} />
  </T.Group>
{/if}
