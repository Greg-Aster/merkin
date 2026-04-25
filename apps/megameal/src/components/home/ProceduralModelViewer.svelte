<script lang="ts">
import { onDestroy } from 'svelte'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export let label = '3D product preview'
export let variant: 'snuggaloid' | 'generic' = 'generic'
export let fullscreen = false
export let assetUrl = '/models/polyhaven/Barrel_01/Barrel_01_1k.gltf'

let shell: HTMLDivElement | null = null
let canvas: HTMLCanvasElement | null = null
let resizeObserver: ResizeObserver | null = null
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let previewObject: THREE.Object3D | null = null
let baseCameraPosition = new THREE.Vector3(2.6, 1.5, 4.4)
let frameId = 0
let loadToken = 0
let status = 'Loading 3D asset…'
let targetRotationX = -0.18
let targetRotationY = 0.45
let currentRotationX = -0.18
let currentRotationY = 0.45
let pointerId: number | null = null
let isDragging = false
let zoomValue = 44
let targetZoomScale = 1
let currentZoomScale = 1
let lastInteractionAt = 0
let activeViewPreset: 'front' | 'side' | 'top' | 'underside' = 'front'

const gltfLoader = new GLTFLoader()
const idleRotationDelayMs = 1800
const idleRotationSpeed = 0.003
const snuggaloidFallbackColor = new THREE.Color('#f3d0da')
const minZoomValue = 0
const maxZoomValue = 100
const zoomStep = 12

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function disposePreviewObject(object: THREE.Object3D | null) {
  if (!object) return

  object.traverse(child => {
    const mesh = child as THREE.Mesh
    mesh.geometry?.dispose?.()

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]
    for (const material of materials) {
      if (!material) continue
      for (const value of Object.values(material)) {
        if (
          value &&
          typeof value === 'object' &&
          'isTexture' in value &&
          value.isTexture
        ) {
          value.dispose()
        }
      }
      material.dispose?.()
    }
  })
}

function stopRenderLoop() {
  if (!frameId) return
  cancelAnimationFrame(frameId)
  frameId = 0
}

function destroyViewer() {
  stopRenderLoop()
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

function fitCameraToObject(object: THREE.Object3D) {
  if (!camera) return

  const bounds = new THREE.Box3().setFromObject(object)
  if (bounds.isEmpty()) return

  const size = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())
  object.position.sub(center)

  const maxDimension = Math.max(size.x, size.y, size.z) || 1
  const distance = maxDimension * 1.9

  baseCameraPosition = new THREE.Vector3(
    distance * 0.6,
    distance * 0.36,
    distance,
  )
  camera.position.copy(baseCameraPosition)
  camera.near = Math.max(0.01, distance / 100)
  camera.far = distance * 24
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()
}

function zoomScaleForValue(value: number) {
  const normalized = clamp(value / 100, 0, 1)
  return 1.8 - normalized * 1.15
}

function setZoomValue(nextValue: number) {
  zoomValue = clamp(nextValue, minZoomValue, maxZoomValue)
  targetZoomScale = zoomScaleForValue(zoomValue)
  lastInteractionAt = Date.now()
}

function shouldApplyFallbackMaterial(material: THREE.Material | undefined) {
  if (!material) return true
  if (!('color' in material) || !(material.color instanceof THREE.Color)) {
    return true
  }
  if ('map' in material && material.map) return false
  if ('vertexColors' in material && material.vertexColors) return false
  const isNearBlack =
    material.color.r < 0.08 &&
    material.color.g < 0.08 &&
    material.color.b < 0.08
  const isNearDefaultWhite =
    material.color.r > 0.96 &&
    material.color.g > 0.96 &&
    material.color.b > 0.96
  return isNearBlack || isNearDefaultWhite
}

function buildFallbackMaterial() {
  return new THREE.MeshStandardMaterial({
    color: snuggaloidFallbackColor.clone(),
    roughness: 0.72,
    metalness: 0.08,
    emissive: new THREE.Color('#5f1d4f'),
    emissiveIntensity: 0.18,
  })
}

function stylePreviewMesh(mesh: THREE.Mesh) {
  mesh.castShadow = false
  mesh.receiveShadow = false

  if (variant !== 'snuggaloid') return

  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map(material =>
      shouldApplyFallbackMaterial(material)
        ? buildFallbackMaterial()
        : material,
    )
    return
  }

  if (shouldApplyFallbackMaterial(mesh.material)) {
    mesh.material = buildFallbackMaterial()
  }
}

function updateTargetRotation(clientX: number, clientY: number) {
  if (!shell) return

  const bounds = shell.getBoundingClientRect()
  if (bounds.width <= 0 || bounds.height <= 0) return

  const normalizedX = (clientX - bounds.left) / bounds.width
  const normalizedY = (clientY - bounds.top) / bounds.height

  targetRotationY = clamp((normalizedX - 0.5) * 1.8, -1.1, 1.1)
  targetRotationX = clamp((0.5 - normalizedY) * 1.05, -0.65, 0.42)
  activeViewPreset = 'front'
  lastInteractionAt = Date.now()
}

function handlePointerDown(event: PointerEvent) {
  pointerId = event.pointerId
  isDragging = true
  shell?.setPointerCapture(event.pointerId)
  lastInteractionAt = Date.now()
  updateTargetRotation(event.clientX, event.clientY)
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging || event.pointerId !== pointerId) return
  updateTargetRotation(event.clientX, event.clientY)
}

function releasePointer(event?: PointerEvent) {
  if (event && pointerId !== null && event.pointerId !== pointerId) return

  if (pointerId !== null && shell?.hasPointerCapture(pointerId)) {
    shell.releasePointerCapture(pointerId)
  }

  isDragging = false
  pointerId = null
  lastInteractionAt = Date.now()
}

function resetRotation() {
  if (isDragging) return
  lastInteractionAt = Date.now()
}

function nudgeZoom(direction: -1 | 1) {
  setZoomValue(zoomValue + direction * zoomStep)
}

function setViewPreset(preset: typeof activeViewPreset) {
  activeViewPreset = preset
  if (preset === 'front') {
    targetRotationX = -0.12
    targetRotationY = 0.18
  } else if (preset === 'side') {
    targetRotationX = -0.08
    targetRotationY = 1.22
  } else if (preset === 'top') {
    targetRotationX = -1.1
    targetRotationY = 0.08
  } else if (preset === 'underside') {
    targetRotationX = 0.86
    targetRotationY = 0.2
  }
  lastInteractionAt = Date.now()
}

function blockPointer(event: PointerEvent) {
  event.stopPropagation()
}

function renderFrame() {
  if (!renderer || !scene || !camera) return

  if (previewObject) {
    if (!isDragging && Date.now() - lastInteractionAt > idleRotationDelayMs) {
      targetRotationY += idleRotationSpeed
    }

    currentRotationX += (targetRotationX - currentRotationX) * 0.08
    currentRotationY += (targetRotationY - currentRotationY) * 0.08
    previewObject.rotation.x = currentRotationX
    previewObject.rotation.y = currentRotationY
  }

  currentZoomScale += (targetZoomScale - currentZoomScale) * 0.12
  camera.position.copy(baseCameraPosition).multiplyScalar(currentZoomScale)
  camera.lookAt(0, 0, 0)

  renderer.render(scene, camera)
  frameId = requestAnimationFrame(renderFrame)
}

async function loadModelPreview() {
  if (!canvas || typeof window === 'undefined') return

  const currentToken = ++loadToken
  status = 'Loading 3D asset…'
  destroyViewer()
  targetZoomScale = zoomScaleForValue(zoomValue)
  currentZoomScale = targetZoomScale
  lastInteractionAt = Date.now()

  const parent = canvas.parentElement
  const width = Math.max(260, parent?.clientWidth ?? 480)
  const height = Math.max(320, parent?.clientHeight ?? (fullscreen ? 560 : 420))
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = variant === 'snuggaloid' ? 1.16 : 1
  renderer.setPixelRatio(pixelRatio)
  renderer.setSize(width, height, false)

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(
    32,
    width / Math.max(height, 1),
    0.1,
    100,
  )

  scene.add(new THREE.AmbientLight(0xffffff, 0.5))

  const hemisphereLight = new THREE.HemisphereLight(0xf8fafc, 0x1e1b4b, 1.2)
  scene.add(hemisphereLight)

  const spotLight = new THREE.SpotLight(0xfff1c1, 42, 24, 0.42, 0.44)
  spotLight.position.set(4.8, 8, 5.4)
  scene.add(spotLight)
  scene.add(spotLight.target)

  const rimLight = new THREE.DirectionalLight(0xd8b4fe, 0.8)
  rimLight.position.set(-5, 3, -4)
  scene.add(rimLight)

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(4.2, 64),
    new THREE.MeshBasicMaterial({
      color: variant === 'snuggaloid' ? 0xf472b6 : 0x60a5fa,
      transparent: true,
      opacity: 0.16,
    }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -1.35
  scene.add(floor)

  resizeObserver = new ResizeObserver(() => {
    if (!canvas || !renderer || !camera) return
    const nextWidth = Math.max(260, canvas.parentElement?.clientWidth ?? width)
    const nextHeight = Math.max(
      320,
      canvas.parentElement?.clientHeight ?? height,
    )
    renderer.setSize(nextWidth, nextHeight, false)
    camera.aspect = nextWidth / Math.max(nextHeight, 1)
    camera.updateProjectionMatrix()
  })
  if (parent) {
    resizeObserver.observe(parent)
  }

  try {
    const gltf = await gltfLoader.loadAsync(assetUrl)
    if (currentToken !== loadToken || !scene) return

    previewObject = gltf.scene
    previewObject.traverse(child => {
      const mesh = child as THREE.Mesh
      stylePreviewMesh(mesh)
    })
    scene.add(previewObject)
    fitCameraToObject(previewObject)
    status = ''
    renderFrame()
  } catch (error) {
    console.error('Model preview failed:', error)
    status = error instanceof Error ? error.message : '3D asset preview failed.'
  }
}

$: if (canvas && assetUrl && variant && typeof fullscreen === 'boolean') {
  void loadModelPreview()
}

onDestroy(() => {
  destroyViewer()
})
</script>

<div
	bind:this={shell}
	class={`procedural-viewer-shell ${fullscreen ? "procedural-viewer-shell--fullscreen" : ""} ${
		variant === "snuggaloid"
			? "procedural-viewer-shell--snuggaloid"
			: "procedural-viewer-shell--generic"
	}`}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={releasePointer}
	onpointercancel={releasePointer}
	onpointerleave={resetRotation}
	onlostpointercapture={() => releasePointer()}
>
	<div class="procedural-viewer">
		<canvas bind:this={canvas}></canvas>
		{#if status}
			<div class="procedural-viewer__status">{status}</div>
		{/if}
	</div>

	<div class="procedural-viewer__hud">
		<span>{label}</span>
		<span>{isDragging ? "Rotate in progress" : "Drag to inspect"}</span>
	</div>

	<div
		class="procedural-viewer__control-strip"
		onpointerdown={blockPointer}
		onpointerup={blockPointer}
	>
		<button type="button" onclick={() => nudgeZoom(-1)} aria-label="Zoom out" title="Zoom out">
			−
		</button>
		<button
			type="button"
			class:procedural-viewer__view-button--active={activeViewPreset === "front"}
			onclick={() => setViewPreset("front")}
			aria-label="Front view"
			title="Front view"
		>
			◎
		</button>
		<button
			type="button"
			class:procedural-viewer__view-button--active={activeViewPreset === "side"}
			onclick={() => setViewPreset("side")}
			aria-label="Side view"
			title="Side view"
		>
			◧
		</button>
		<button
			type="button"
			class:procedural-viewer__view-button--active={activeViewPreset === "top"}
			onclick={() => setViewPreset("top")}
			aria-label="Top view"
			title="Top view"
		>
			⬒
		</button>
		<button
			type="button"
			class:procedural-viewer__view-button--active={activeViewPreset === "underside"}
			onclick={() => setViewPreset("underside")}
			aria-label="Underside view"
			title="Underside view"
		>
			⌵
		</button>
		<button type="button" onclick={() => nudgeZoom(1)} aria-label="Zoom in" title="Zoom in">
			+
		</button>
	</div>
</div>

<style>
	.procedural-viewer-shell {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 18rem;
		overflow: hidden;
		border-radius: inherit;
		background:
			radial-gradient(circle at 22% 18%, rgb(255 255 255 / 0.14), transparent 24%),
			radial-gradient(circle at 78% 82%, rgb(244 114 182 / 0.2), transparent 28%),
			linear-gradient(180deg, rgb(15 23 42 / 0.96), rgb(2 6 23 / 0.98));
		touch-action: none;
	}

	.procedural-viewer-shell--fullscreen {
		min-height: 32rem;
	}

	.procedural-viewer {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		cursor: grab;
	}

	.procedural-viewer canvas {
		display: block;
		width: 100%;
		height: 100%;
		cursor: grab;
	}

	.procedural-viewer__status {
		position: absolute;
		inset: auto 1rem 1rem 1rem;
		padding: 0.75rem 0.9rem;
		border: 1px solid rgb(248 113 113 / 0.24);
		border-radius: 0.9rem;
		background: rgb(15 23 42 / 0.86);
		color: rgb(226 232 240 / 0.94);
		font-size: 0.76rem;
		line-height: 1.45;
	}

	.procedural-viewer__hud {
		position: absolute;
		right: 0.85rem;
		bottom: 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.16rem;
		padding: 0.55rem 0.75rem;
		border: 1px solid rgb(148 163 184 / 0.2);
		border-radius: 0.85rem;
		background: rgb(2 6 23 / 0.72);
		color: rgb(226 232 240 / 0.92);
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		backdrop-filter: blur(10px);
		pointer-events: none;
	}

	.procedural-viewer__hud span:last-child {
		color: rgb(148 163 184 / 0.86);
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}

	.procedural-viewer__control-strip {
		position: absolute;
		left: 0.85rem;
		bottom: 0.85rem;
		display: flex;
		align-items: center;
		gap: 0.38rem;
		padding: 0.45rem;
		border: 1px solid rgb(148 163 184 / 0.2);
		border-radius: 0.85rem;
		background: rgb(2 6 23 / 0.72);
		backdrop-filter: blur(10px);
		pointer-events: auto;
	}

	.procedural-viewer__control-strip button {
		border: 1px solid rgb(125 211 252 / 0.26);
		border-radius: 0.68rem;
		background: rgb(15 23 42 / 0.86);
		color: rgb(226 232 240 / 0.94);
		font-size: 0.9rem;
		font-weight: 700;
		line-height: 1;
		transition:
			background-color 180ms ease,
			border-color 180ms ease,
			transform 180ms ease;
		width: 2rem;
		height: 2rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.procedural-viewer__control-strip button:hover,
	.procedural-viewer__control-strip button:focus-visible,
	.procedural-viewer__view-button--active {
		border-color: rgb(125 211 252 / 0.56);
		background: rgb(14 116 144 / 0.3);
		transform: translateY(-1px);
	}

	@media (max-width: 640px) {
		.procedural-viewer__control-strip {
			right: 0.85rem;
			justify-content: center;
		}
	}
</style>
