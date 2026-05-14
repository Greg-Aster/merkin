<script lang="ts">
import { T } from '@threlte/core'
import { onDestroy } from 'svelte'
import * as THREE from 'three'
import { runtimeVisualStyleStore } from '../../../styles/runtimeVisualStyleStore'

export let heightData: Float32Array
export let resolution = 0
export let worldSize = 1
export let worldSizeX: number | undefined = undefined
export let worldSizeZ: number | undefined = undefined
export let verticalOffset = 0
export let bounds: {
  min: [number, number, number]
  max: [number, number, number]
} | null = null

let surfaceGeometry: THREE.PlaneGeometry | null = null
let albedoTexture: THREE.CanvasTexture | null = null
let roughnessTexture: THREE.CanvasTexture | null = null
let normalTexture: THREE.CanvasTexture | null = null
let normalScale = new THREE.Vector2(0.55, 0.55)

function disposeResources() {
  surfaceGeometry?.dispose()
  albedoTexture?.dispose()
  roughnessTexture?.dispose()
  normalTexture?.dispose()
  surfaceGeometry = null
  albedoTexture = null
  roughnessTexture = null
  normalTexture = null
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

  const terrainStyle = $runtimeVisualStyleStore.terrain
  const baseColor = new THREE.Color(terrainStyle.baseColor)
  const midColor = new THREE.Color(terrainStyle.midColor)
  const peakColor = new THREE.Color(terrainStyle.peakColor)
  const ridgeColor = new THREE.Color(terrainStyle.ridgeColor)
  const shadowColor = new THREE.Color(terrainStyle.shadowColor)

  for (let y = 0; y < resolution; y += 1) {
    for (let x = 0; x < resolution; x += 1) {
      const height = sampleHeight(x, y)
      const normalized = (height - minHeight) / heightRange
      const right = sampleHeight(Math.min(x + 1, resolution - 1), y)
      const down = sampleHeight(x, Math.min(y + 1, resolution - 1))
      const slope = Math.min(
        1,
        Math.abs(right - height) * 1.8 + Math.abs(down - height) * 1.8,
      )
      const grain =
        (Math.sin(x * 0.17) + Math.cos(y * 0.13) + Math.sin((x + y) * 0.07)) / 3

      const dampness = Math.max(0, 0.55 - normalized) * 0.8
      const color = baseColor
        .clone()
        .lerp(midColor, normalized * 0.65)
        .lerp(peakColor, Math.max(0, normalized - 0.45) / 0.55)
        .lerp(ridgeColor, slope * 0.42)
        .lerp(shadowColor, dampness * 0.4)

      const brightness = 0.85 + grain * 0.08 + slope * 0.08
      const pixelIndex = (y * resolution + x) * 4

      imageData.data[pixelIndex] = Math.max(
        0,
        Math.min(255, color.r * 255 * brightness),
      )
      imageData.data[pixelIndex + 1] = Math.max(
        0,
        Math.min(255, color.g * 255 * brightness),
      )
      imageData.data[pixelIndex + 2] = Math.max(
        0,
        Math.min(255, color.b * 255 * brightness),
      )
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
  const terrainStyle = $runtimeVisualStyleStore.terrain

  for (let y = 0; y < resolution; y += 1) {
    for (let x = 0; x < resolution; x += 1) {
      const height = sampleHeight(x, y)
      const right = sampleHeight(Math.min(x + 1, resolution - 1), y)
      const down = sampleHeight(x, Math.min(y + 1, resolution - 1))
      const slope = Math.min(
        1,
        Math.abs(right - height) * 2.2 + Math.abs(down - height) * 2.2,
      )
      const grain = (Math.sin(x * 0.09) + Math.cos(y * 0.11)) * 0.5
      const roughness = Math.max(
        92,
        Math.min(255, terrainStyle.roughness * 255 + slope * 16 + grain * 10),
      )
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

function createNormalTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = resolution
  canvas.height = resolution
  const context = canvas.getContext('2d')
  if (!context) return null

  const imageData = context.createImageData(resolution, resolution)
  const terrainStyle = $runtimeVisualStyleStore.terrain
  const normalStrength = Math.max(0.01, terrainStyle.normalStrength)

  for (let y = 0; y < resolution; y += 1) {
    for (let x = 0; x < resolution; x += 1) {
      const left = sampleHeight(Math.max(0, x - 1), y)
      const right = sampleHeight(Math.min(resolution - 1, x + 1), y)
      const up = sampleHeight(x, Math.max(0, y - 1))
      const down = sampleHeight(x, Math.min(resolution - 1, y + 1))

      const dx = (right - left) * normalStrength
      const dy = (down - up) * normalStrength
      const normal = new THREE.Vector3(-dx, -dy, 1).normalize()
      const pixelIndex = (y * resolution + x) * 4

      imageData.data[pixelIndex] = (normal.x * 0.5 + 0.5) * 255
      imageData.data[pixelIndex + 1] = (normal.y * 0.5 + 0.5) * 255
      imageData.data[pixelIndex + 2] = (normal.z * 0.5 + 0.5) * 255
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

  const planeWidth =
    worldSizeX ?? (bounds ? bounds.max[0] - bounds.min[0] : worldSize)
  const planeDepth =
    worldSizeZ ?? (bounds ? bounds.max[2] - bounds.min[2] : worldSize)
  const geometry = new THREE.PlaneGeometry(
    planeWidth,
    planeDepth,
    resolution - 1,
    resolution - 1,
  )
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
  normalTexture = createNormalTexture()
  normalScale = new THREE.Vector2(
    $runtimeVisualStyleStore.terrain.normalStrength,
    $runtimeVisualStyleStore.terrain.normalStrength,
  )
}

$: terrainStyleSignature = JSON.stringify($runtimeVisualStyleStore.terrain)

$: if (heightData && resolution > 1 && terrainStyleSignature) {
  rebuildSurface()
}

$: surfacePosition = bounds
  ? [
      (bounds.min[0] + bounds.max[0]) / 2,
      verticalOffset,
      (bounds.min[2] + bounds.max[2]) / 2,
    ]
  : [0, verticalOffset, 0]

onDestroy(() => {
  disposeResources()
})
</script>

{#if surfaceGeometry}
  <T.Mesh
    name="terrain-surface"
    geometry={surfaceGeometry}
    position={surfacePosition}
    rotation={[-Math.PI / 2, 0, 0]}
    userData={{ renderStyleSkip: true }}
    receiveShadow
  >
    <T.MeshStandardMaterial
      color="#ffffff"
      map={albedoTexture}
      bumpMap={albedoTexture}
      bumpScale={$runtimeVisualStyleStore.terrain.bumpScale}
      normalMap={normalTexture}
      normalScale={normalScale}
      roughnessMap={roughnessTexture}
      roughness={$runtimeVisualStyleStore.terrain.roughness}
      metalness={0.04}
      envMapIntensity={$runtimeVisualStyleStore.terrain.envMapIntensity}
    />
  </T.Mesh>
{/if}
