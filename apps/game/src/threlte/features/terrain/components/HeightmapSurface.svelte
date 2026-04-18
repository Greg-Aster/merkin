<script lang="ts">
  import { onDestroy } from 'svelte'
  import { T } from '@threlte/core'
  import * as THREE from 'three'

  export let heightData: Float32Array
  export let resolution = 0
  export let worldSize = 1
  export let worldSizeX: number | undefined = undefined
  export let worldSizeZ: number | undefined = undefined
  export let bounds: { min: [number, number, number], max: [number, number, number] } | null = null

  let surfaceGeometry: THREE.PlaneGeometry | null = null
  let albedoTexture: THREE.CanvasTexture | null = null
  let roughnessTexture: THREE.CanvasTexture | null = null

  function disposeResources() {
    surfaceGeometry?.dispose()
    albedoTexture?.dispose()
    roughnessTexture?.dispose()
    surfaceGeometry = null
    albedoTexture = null
    roughnessTexture = null
  }

  function sampleHeight(x: number, y: number) {
    if (!heightData || resolution <= 0) return 0
    const clampedX = Math.min(Math.max(x, 0), resolution - 1)
    const clampedY = Math.min(Math.max(y, 0), resolution - 1)
    return heightData[clampedY * resolution + clampedX] ?? 0
  }

  function createTerrainTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = resolution
    canvas.height = resolution
    const context = canvas.getContext('2d')
    if (!context) return null

    const imageData = context.createImageData(resolution, resolution)
    let minHeight = Number.POSITIVE_INFINITY
    let maxHeight = Number.NEGATIVE_INFINITY

    for (let index = 0; index < heightData.length; index += 1) {
      const value = heightData[index]
      if (value < minHeight) minHeight = value
      if (value > maxHeight) maxHeight = value
    }

    const heightRange = Math.max(0.0001, maxHeight - minHeight)

    for (let y = 0; y < resolution; y += 1) {
      for (let x = 0; x < resolution; x += 1) {
        const height = sampleHeight(x, y)
        const normalized = (height - minHeight) / heightRange
        const right = sampleHeight(Math.min(x + 1, resolution - 1), y)
        const down = sampleHeight(x, Math.min(y + 1, resolution - 1))
        const slope = Math.min(1, Math.abs(right - height) * 1.8 + Math.abs(down - height) * 1.8)
        const grain = (
          Math.sin(x * 0.17)
          + Math.cos(y * 0.13)
          + Math.sin((x + y) * 0.07)
        ) / 3

        const baseRed = 64 + normalized * 14 + grain * 8
        const baseGreen = 72 + normalized * 18 + grain * 10
        const baseBlue = 78 + normalized * 22 + grain * 12
        const highlight = slope * 18
        const pixelIndex = (y * resolution + x) * 4

        imageData.data[pixelIndex] = Math.max(0, Math.min(255, baseRed + highlight))
        imageData.data[pixelIndex + 1] = Math.max(0, Math.min(255, baseGreen + highlight * 0.7))
        imageData.data[pixelIndex + 2] = Math.max(0, Math.min(255, baseBlue + highlight * 0.45))
        imageData.data[pixelIndex + 3] = 255
      }
    }

    context.putImageData(imageData, 0, 0)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.needsUpdate = true
    return texture
  }

  function createRoughnessTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = resolution
    canvas.height = resolution
    const context = canvas.getContext('2d')
    if (!context) return null

    const imageData = context.createImageData(resolution, resolution)

    for (let y = 0; y < resolution; y += 1) {
      for (let x = 0; x < resolution; x += 1) {
        const height = sampleHeight(x, y)
        const right = sampleHeight(Math.min(x + 1, resolution - 1), y)
        const down = sampleHeight(x, Math.min(y + 1, resolution - 1))
        const slope = Math.min(1, Math.abs(right - height) * 2.2 + Math.abs(down - height) * 2.2)
        const grain = (Math.sin(x * 0.09) + Math.cos(y * 0.11)) * 0.5
        const roughness = 188 + slope * 42 + grain * 8
        const pixelIndex = (y * resolution + x) * 4

        imageData.data[pixelIndex] = roughness
        imageData.data[pixelIndex + 1] = roughness
        imageData.data[pixelIndex + 2] = roughness
        imageData.data[pixelIndex + 3] = 255
      }
    }

    context.putImageData(imageData, 0, 0)
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.needsUpdate = true
    return texture
  }

  function rebuildSurface() {
    if (!heightData || resolution <= 1 || typeof document === 'undefined') return

    disposeResources()

    const planeWidth = worldSizeX ?? (bounds ? bounds.max[0] - bounds.min[0] : worldSize)
    const planeDepth = worldSizeZ ?? (bounds ? bounds.max[2] - bounds.min[2] : worldSize)
    const geometry = new THREE.PlaneGeometry(planeWidth, planeDepth, resolution - 1, resolution - 1)
    const positions = geometry.attributes.position

    for (let vertexIndex = 0; vertexIndex < positions.count; vertexIndex += 1) {
      const height = heightData[vertexIndex] ?? 0
      positions.setZ(vertexIndex, height)
    }

    positions.needsUpdate = true
    geometry.computeVertexNormals()

    surfaceGeometry = geometry
    albedoTexture = createTerrainTexture()
    roughnessTexture = createRoughnessTexture()
  }

  $: if (heightData && resolution > 1) {
    rebuildSurface()
  }

  $: surfacePosition = bounds
    ? [
        (bounds.min[0] + bounds.max[0]) / 2,
        0,
        (bounds.min[2] + bounds.max[2]) / 2,
      ]
    : [0, 0, 0]

  onDestroy(() => {
    disposeResources()
  })
</script>

{#if surfaceGeometry}
  <T.Mesh
    geometry={surfaceGeometry}
    position={surfacePosition}
    rotation={[-Math.PI / 2, 0, 0]}
    receiveShadow
  >
    <T.MeshStandardMaterial
      color="#6f7b84"
      map={albedoTexture}
      bumpMap={albedoTexture}
      bumpScale={0.04}
      roughnessMap={roughnessTexture}
      roughness={0.92}
      metalness={0.04}
      envMapIntensity={0.4}
    />
  </T.Mesh>
{/if}
