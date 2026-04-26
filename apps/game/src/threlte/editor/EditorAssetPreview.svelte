<script lang="ts">
import { onDestroy } from 'svelte'
import * as THREE from 'three'
import { cloneCachedGltfScene } from '../utils/gltfAssetCache'

export let assetUrl = ''
export let imageUrl = ''
export let label = 'Preview'
export let hint = ''
export let height = 220

let canvas: HTMLCanvasElement | null = null
let resizeObserver: ResizeObserver | null = null
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let previewObject: THREE.Object3D | null = null
let frameId = 0
let loadToken = 0
let status = ''

const meshPattern = /\.(glb|gltf)$/i
const imagePattern = /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i

function isMeshUrl(value: string) {
  return meshPattern.test(value.split('?')[0] || '')
}

function isImageUrl(value: string) {
  return imagePattern.test(value.split('?')[0] || '')
}

$: resolvedImageUrl =
  imageUrl || (!assetUrl && isImageUrl(imageUrl) ? imageUrl : '')
$: resolvedMeshUrl = isMeshUrl(assetUrl) ? assetUrl : ''
$: previewMode = resolvedMeshUrl ? 'mesh' : resolvedImageUrl ? 'image' : 'empty'

function disposePreviewObject(object: THREE.Object3D | null) {
  if (!object) return

  object.traverse(child => {
    const mesh = child as THREE.Mesh
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]
    for (const material of materials) {
      if (!material) continue
      material.dispose?.()
    }
  })
}

function stopPreviewLoop() {
  if (frameId) {
    cancelAnimationFrame(frameId)
    frameId = 0
  }
}

function destroyRenderer() {
  stopPreviewLoop()
  resizeObserver?.disconnect()
  resizeObserver = null

  if (scene && previewObject) {
    scene.remove(previewObject)
    disposePreviewObject(previewObject)
  }

  previewObject = null
  scene = null
  camera = null

  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss?.()
    renderer = null
  }
}

function renderFrame() {
  if (!renderer || !scene || !camera) return
  if (previewObject) {
    previewObject.rotation.y += 0.0045
  }
  renderer.render(scene, camera)
  frameId = requestAnimationFrame(renderFrame)
}

function fitCameraToObject(object: THREE.Object3D) {
  if (!camera) return

  const bounds = new THREE.Box3().setFromObject(object)
  if (bounds.isEmpty()) return

  const size = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())
  object.position.sub(center)

  const maxDimension = Math.max(size.x, size.y, size.z) || 1
  const distance = maxDimension * 1.85
  camera.position.set(distance * 0.55, distance * 0.35, distance)
  camera.near = Math.max(0.01, distance / 100)
  camera.far = distance * 20
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()
}

async function loadMeshPreview() {
  if (!canvas || !resolvedMeshUrl || typeof window === 'undefined') return

  const currentToken = ++loadToken
  status = 'Loading mesh preview…'
  destroyRenderer()

  const parent = canvas.parentElement
  const width = Math.max(220, parent?.clientWidth ?? 320)
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  })
  renderer.setPixelRatio(pixelRatio)
  renderer.setSize(width, height, false)

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(
    32,
    width / Math.max(height, 1),
    0.1,
    100,
  )
  scene.add(new THREE.HemisphereLight(0xe8f5ff, 0x1c2731, 1.45))

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.15)
  keyLight.position.set(4, 6, 8)
  scene.add(keyLight)

  const rimLight = new THREE.DirectionalLight(0xaed9ff, 0.45)
  rimLight.position.set(-5, 3, -6)
  scene.add(rimLight)

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 48),
    new THREE.MeshBasicMaterial({
      color: 0x173244,
      transparent: true,
      opacity: 0.18,
    }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -1.1
  scene.add(floor)

  resizeObserver = new ResizeObserver(() => {
    if (!canvas || !renderer || !camera) return
    const nextWidth = Math.max(220, canvas.parentElement?.clientWidth ?? width)
    renderer.setSize(nextWidth, height, false)
    camera.aspect = nextWidth / Math.max(height, 1)
    camera.updateProjectionMatrix()
  })
  if (parent) {
    resizeObserver.observe(parent)
  }

  try {
    const object = await cloneCachedGltfScene(resolvedMeshUrl)
    if (currentToken !== loadToken || !scene) return

    previewObject = object
    scene.add(previewObject)
    fitCameraToObject(previewObject)
    status = ''
    renderFrame()
  } catch (error) {
    console.error('Mesh preview failed:', error)
    status = error instanceof Error ? error.message : 'Mesh preview failed.'
  }
}

$: if (previewMode === 'mesh' && canvas) {
  void loadMeshPreview()
} else if (previewMode !== 'mesh') {
  destroyRenderer()
  status = previewMode === 'empty' ? 'Nothing to preview.' : ''
}

onDestroy(() => {
  destroyRenderer()
})
</script>

<div class="editor-preview-card">
  <div class="tuple-label">{label}</div>
  {#if previewMode === 'mesh'}
    <div class="editor-preview-surface" style={`height:${height}px`}>
      <canvas bind:this={canvas} class="editor-preview-canvas"></canvas>
      {#if status}
        <div class="editor-preview-overlay">{status}</div>
      {/if}
    </div>
  {:else if previewMode === 'image'}
    <div class="editor-preview-surface" style={`height:${height}px`}>
      <img class="editor-image-preview" src={resolvedImageUrl} alt={label} />
    </div>
  {:else}
    <div class="editor-preview-empty" style={`height:${Math.min(height, 150)}px`}>
      <div class="save-message">Nothing to preview yet.</div>
    </div>
  {/if}
  {#if hint}
    <div class="save-message">{hint}</div>
  {/if}
</div>
