<script lang="ts">
import { T, useTask, useThrelte } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import {
  AdditiveBlending,
  Box3,
  DoubleSide,
  FrontSide,
  NormalBlending,
  SRGBColorSpace,
  Vector3,
  CanvasTexture,
  type Group,
  type Texture,
  type WebGLRenderer,
  TextureLoader,
  VideoTexture,
} from 'three'
import type * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  getHomeIntroKtx2Loader,
  releaseHomeIntroKtx2Loader,
  retainHomeIntroKtx2Loader,
} from './homeIntroKtx2Loader'
import {
  createCausticTexture,
  createSheenTexture,
} from './homeIntroGlassTextures'

type SceneQuality = 'high' | 'balanced' | 'lean'

export let index: number
export let primary = false
export let imageSrc = ''
export let stillSrc = ''
export let ktx2Src = ''
export let videoSrc = ''
export let shouldLoadMedia = primary
export let active = primary
export let sceneQuality: SceneQuality = 'high'
export let kicker = ''
export let title = ''
export let stat = ''
export let ctaLabel = ''
export let hovered = false

const threlte = useThrelte()

let titleTexture: Texture | null = null
let stillTexture: Texture | null = null
let screenTextTexture: CanvasTexture | null = null
let videoTexture: VideoTexture | null = null
let panelRoot: Group | null = null
let sheenTexture: CanvasTexture | null = null
let causticTexture: CanvasTexture | null = null
let screenModel: THREE.Object3D | null = null
let sheenSweep: Group | null = null
let secondarySheenSweep: Group | null = null
let loader: TextureLoader | null = null
let screenLoadAbortController: AbortController | null = null
let screenModelRequested = false
let stillTextureRequested = false
let ktx2TextureRequested = false
let titleTextureRequested = false
let videoRequested = false
let videoReady = false
let mounted = false
let disposed = false
let hoverBlend = 0
let mediaOpacity = 1
let titleMediaOpacity = 1
let videoMediaOpacity = 0
let mediaGhostOpacity = 1
let glassEffectOpacity = 1
let textOpacity = primary ? 0.72 : 0.58
let videoElement: HTMLVideoElement | null = null

const additiveBlending = AdditiveBlending
const normalBlending = NormalBlending
const doubleSide = DoubleSide
const frontSide = FrontSide
const frameWidth = 3.18
const frameHeight = 1.78
const glowWidth = frameWidth * 0.98
const glowHeight = frameHeight * 0.98
const mediaWidth = frameWidth * .95
const mediaHeight = frameHeight * .95
const titleWidth = mediaWidth
const titleHeight = mediaHeight
const fallbackWidth = 2.76
const fallbackHeight = 0.44
const sheenWidth = 0.42
const sheenHeight = frameHeight * 1.55
const causticWidth = frameWidth * 0.98
const causticHeight = frameHeight * 0.92
const glassMediaOffset = 0.014
const glassMediaGhostScale = 1.012
const mediaSurfaceZ = -0.034
const mediaGhostNearZ = -0.042
const mediaGhostFarZ = -0.05
const textSurfaceZ = -0.018
const textWidth = 2.54
const textHeight = 1.24
const screenModelSrc = '/assets/3D/screen.glb'
const screenVideoPlaybackRate = 0.33
const screenGltfLoader = new GLTFLoader()
const screenBounds = new Box3()
const screenCenter = new Vector3()
const screenSize = new Vector3()

$: panelGlassEnabled = sceneQuality !== 'lean'

function getRenderer() {
  const renderer = threlte.renderer as
    | WebGLRenderer
    | { current?: WebGLRenderer }
    | null

  return renderer && 'current' in renderer ? renderer.current ?? null : renderer
}

function disposeTitleTexture() {
  titleTexture?.dispose()
  titleTexture = null
}

function disposeVideoTexture() {
  videoTexture?.dispose()
  videoTexture = null
}

function disposeVideoElement() {
  if (!videoElement) return

  videoElement.pause()
  videoElement.removeAttribute('src')
  videoElement.load()
  videoElement = null
}

function disposeScreenTextTexture() {
  screenTextTexture?.dispose()
  screenTextTexture = null
}

function disposeStillTexture() {
  stillTexture?.dispose()
  stillTexture = null
}

function disposeSheenTexture() {
  sheenTexture?.dispose()
  sheenTexture = null
}

function disposeCausticTexture() {
  causticTexture?.dispose()
  causticTexture = null
}

function disposeMaterial(material: THREE.Material) {
  Object.values(material).forEach(value => {
    if (value && typeof value === 'object' && 'isTexture' in value) {
      ;(value as Texture).dispose()
    }
  })
  material.dispose()
}

function disposeObjectResources(object: THREE.Object3D | null) {
  object?.traverse(item => {
    const mesh = item as THREE.Mesh
    if (!mesh.isMesh) return

    mesh.geometry?.dispose()

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]

    materials.forEach(material => {
      if (material) disposeMaterial(material)
    })
  })
}

function disposeScreenModel() {
  disposeObjectResources(screenModel)
  screenModel = null
}

function configureMediaTexture(texture: Texture, invertY = false) {
  texture.colorSpace = SRGBColorSpace

  if (invertY) {
    texture.repeat.y = -1
    texture.offset.y = 1
  }

  texture.needsUpdate = true
}

function ensureVideoLoaded() {
  if (
    videoRequested ||
    typeof document === 'undefined' ||
    !shouldLoadMedia ||
    !videoSrc
  ) {
    return
  }

  videoRequested = true
  videoReady = false
  const video = document.createElement('video')
  video.muted = true
  video.loop = true
  video.playsInline = true
  video.preload = 'metadata'
  video.crossOrigin = 'anonymous'
  video.playbackRate = screenVideoPlaybackRate
  video.src = videoSrc

  video.addEventListener(
    'canplay',
    () => {
      if (!mounted || videoElement !== video) return
      videoReady = true
    },
    { once: true },
  )

  videoElement = video
  videoTexture = new VideoTexture(video)
  configureMediaTexture(videoTexture)
  video.load()
}

function syncVideoPlayback() {
  if (!videoSrc) return

  const shouldPlay = shouldLoadMedia && (active || hovered)

  if (shouldPlay) {
    ensureVideoLoaded()
    if (videoElement) videoElement.playbackRate = screenVideoPlaybackRate
    videoElement?.play().catch(() => {
      // The still image remains visible if autoplay is blocked.
    })
    return
  }

  videoElement?.pause()
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
) {
  const words = value.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''

  words.forEach(word => {
    const nextLine = line ? `${line} ${word}` : word
    if (context.measureText(nextLine).width <= maxWidth || !line) {
      line = nextLine
      return
    }

    lines.push(line)
    line = word
  })

  if (line) lines.push(line)
  return lines
}

function createScreenTextTexture() {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const context = canvas.getContext('2d')
  if (!context) return null

  context.clearRect(0, 0, canvas.width, canvas.height)

  const maxWidth = 820
  const x = 92
  let y = 120

  context.textBaseline = 'top'
  context.fillStyle = 'rgb(103 232 249 / 0.86)'
  context.font = '700 28px "JetBrains Mono", ui-monospace, monospace'
  context.fillText((kicker || stat || 'PORTAL').toUpperCase(), x, y)

  y += 54
  context.fillStyle = 'rgb(248 250 252 / 0.96)'
  context.shadowColor = 'rgb(103 232 249 / 0.42)'
  context.shadowBlur = 18
  context.font = '800 76px Inter, ui-sans-serif, system-ui, sans-serif'

  wrapCanvasText(context, title || 'MEGA MEAL SAGA', maxWidth)
    .slice(0, 2)
    .forEach(line => {
      context.fillText(line, x, y)
      y += 82
    })

  context.shadowBlur = 0
  context.fillStyle = 'rgb(226 232 240 / 0.78)'
  context.font = '600 24px "JetBrains Mono", ui-monospace, monospace'
  const detail = stat || ctaLabel
  if (detail) {
    context.fillText(detail.toUpperCase(), x, 372)
  }

  if (ctaLabel) {
    const label = ctaLabel.toUpperCase()
    context.fillStyle = 'rgb(15 23 42 / 0.78)'
    context.fillRect(x, 420, Math.min(420, context.measureText(label).width + 66), 52)
    context.strokeStyle = 'rgb(103 232 249 / 0.72)'
    context.lineWidth = 2
    context.strokeRect(x, 420, Math.min(420, context.measureText(label).width + 66), 52)
    context.fillStyle = 'rgb(224 242 254 / 0.94)'
    context.font = '800 24px "JetBrains Mono", ui-monospace, monospace'
    context.fillText(label, x + 28, 434)
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true

  return texture
}

function syncScreenTextTexture() {
  if (!mounted) return

  disposeScreenTextTexture()
  screenTextTexture = createScreenTextTexture()
}

function syncPanelGlassTextures() {
  if (typeof document === 'undefined') return

  if (!panelGlassEnabled) {
    disposeSheenTexture()
    disposeCausticTexture()
    return
  }

  sheenTexture ??= createSheenTexture()
  causticTexture ??= createCausticTexture()
}

function fitScreenModel(model: THREE.Object3D) {
  model.updateMatrixWorld(true)
  screenBounds.setFromObject(model)
  if (screenBounds.isEmpty()) return

  screenBounds.getCenter(screenCenter)
  screenBounds.getSize(screenSize)

  const scale = Math.min(
    frameWidth / Math.max(screenSize.x, 0.001),
    frameHeight / Math.max(screenSize.y, 0.001),
  )

  model.scale.setScalar(scale)
  model.position.set(
    -screenCenter.x * scale,
    -screenCenter.y * scale,
    -screenCenter.z * scale,
  )
}

function tuneScreenModel(model: THREE.Object3D) {
  model.traverse(item => {
    const mesh = item as THREE.Mesh
    if (!mesh.isMesh) return

    mesh.castShadow = false
    mesh.receiveShadow = false
    mesh.frustumCulled = false
    mesh.renderOrder = 12

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]

    materials.forEach((sourceMaterial, materialIndex) => {
      if (!sourceMaterial) return

      const material = sourceMaterial.clone() as THREE.MeshPhysicalMaterial
      material.transparent = material.transparent || material.opacity < 1
      material.depthWrite = false
      material.side = DoubleSide
      material.needsUpdate = true

      if (Array.isArray(mesh.material)) {
        mesh.material[materialIndex] = material
      } else {
        mesh.material = material
      }
    })
  })
}

async function loadScreenModel() {
  if (screenModelRequested || typeof window === 'undefined') return

  screenModelRequested = true
  const controller = new AbortController()
  screenLoadAbortController = controller

  try {
    const gltf = await screenGltfLoader.loadAsync(screenModelSrc)
    const model = gltf.scene ?? gltf.scenes?.[0] ?? null

    if (!mounted || controller.signal.aborted || !model) {
      disposeObjectResources(model)
      return
    }

    fitScreenModel(model)
    tuneScreenModel(model)
    screenModel = model
  } catch {
    screenModel = null
  } finally {
    if (screenLoadAbortController === controller) {
      screenLoadAbortController = null
    }
  }
}

function cleanupPanel() {
  if (disposed) return

  disposed = true
  mounted = false
  screenLoadAbortController?.abort()
  screenLoadAbortController = null
  releaseHomeIntroKtx2Loader()
  loader = null
  disposeScreenModel()
  disposeStillTexture()
  disposeTitleTexture()
  disposeVideoTexture()
  disposeVideoElement()
  disposeScreenTextTexture()
  disposeSheenTexture()
  disposeCausticTexture()
}

onMount(() => {
  mounted = true
  disposed = false
  retainHomeIntroKtx2Loader()
  loader = new TextureLoader()
  syncPanelGlassTextures()
  syncScreenTextTexture()
  loadScreenModel()
  ensureMediaTexturesLoaded()

  return cleanupPanel
})

onDestroy(cleanupPanel)

function ensureMediaTexturesLoaded() {
  if (!loader || !shouldLoadMedia) return

  const shouldLoadStill = stillSrc && (!primary || !imageSrc)
  const shouldLoadKtx2Still =
    shouldLoadStill && ktx2Src && sceneQuality !== 'lean'

  if (shouldLoadKtx2Still && !stillTexture && !ktx2TextureRequested) {
    const ktx2Loader = getHomeIntroKtx2Loader(getRenderer())

    if (ktx2Loader) {
      ktx2TextureRequested = true
      ktx2Loader.load(
        ktx2Src,
        texture => {
          if (!mounted) {
            texture.dispose()
            return
          }
          configureMediaTexture(texture, true)
          stillTexture = texture
        },
        undefined,
        () => {
          if (!mounted || stillTextureRequested) return
          loadStillTexture()
        },
      )
      return
    }
  }

  if (shouldLoadStill && !stillTexture && !stillTextureRequested) {
    loadStillTexture()
  }

  if (primary && imageSrc && !titleTextureRequested) {
    titleTextureRequested = true
    titleTexture = loader.load(imageSrc, texture => {
      if (!mounted) {
        texture.dispose()
        return
      }
      configureMediaTexture(texture)
      titleTexture = texture
    })
  }
}

function loadStillTexture() {
  if (!loader || !stillSrc) return

  stillTextureRequested = true
  stillTexture = loader.load(stillSrc, texture => {
    if (!mounted) {
      texture.dispose()
      return
    }
    configureMediaTexture(texture)
    stillTexture = texture
  })
}

$: if (loader && shouldLoadMedia) {
  ensureMediaTexturesLoaded()
}

$: if (mounted && videoSrc && (active || hovered || videoElement)) {
  syncVideoPlayback()
}

$: if (mounted && (kicker || title || stat || ctaLabel)) {
  syncScreenTextTexture()
}

$: syncPanelGlassTextures()

useTask(delta => {
  const time = performance.now() * 0.001
  const ease = 1 - Math.exp(-delta * 8)
  const panelPhase = index * 0.19
  const travel = frameWidth * 2.3
  const startX = -travel * 0.5
  const primarySpeed = primary ? 0.18 : 0.12
  const secondarySpeed = primary ? 0.13 : 0.09
  const primaryPass = (time * primarySpeed + panelPhase) % 1
  const secondaryPass = (time * secondarySpeed + panelPhase + 0.46) % 1

  if (sheenSweep) {
    sheenSweep.position.x = startX + primaryPass * travel
    sheenSweep.position.y = Math.sin(time * 0.42 + index) * 0.035
  }

  if (secondarySheenSweep) {
    secondarySheenSweep.position.x = startX + secondaryPass * travel
    secondarySheenSweep.position.y = Math.cos(time * 0.36 + index) * 0.028
  }

  if (causticTexture) {
    causticTexture.offset.x = time * (primary ? 0.012 : 0.008) + index * 0.037
    causticTexture.offset.y = Math.sin(time * 0.18 + index) * 0.018
    causticTexture.rotation = Math.sin(time * 0.08 + index) * 0.035
  }

  hoverBlend += ((hovered ? 1 : 0) - hoverBlend) * ease
  const baseTitleOpacity = panelGlassEnabled ? 0.76 : 1
  const baseMediaOpacity = panelGlassEnabled ? (primary ? 0.62 : 0.48) : 1
  const activeBlend = active ? 1 : hoverBlend
  videoMediaOpacity = videoReady ? activeBlend : 0
  titleMediaOpacity =
    baseTitleOpacity +
    (1 - baseTitleOpacity) * hoverBlend -
    videoMediaOpacity * 0.72
  mediaOpacity = baseMediaOpacity + (1 - baseMediaOpacity) * hoverBlend
  mediaGhostOpacity = panelGlassEnabled ? (primary ? 0.46 : 0.28) : 0
  glassEffectOpacity = 1
  const baseTextOpacity = primary ? 0.96 : 0.88
  textOpacity = videoSrc ? baseTextOpacity * (1 - hoverBlend) : baseTextOpacity

  if (panelRoot) {
    panelRoot.position.z = hoverBlend * 0.045
    panelRoot.rotation.x = hoverBlend * -0.018
    panelRoot.rotation.y = Math.sin(time * 0.8 + index) * hoverBlend * 0.018
    const scale = 1 + hoverBlend * 0.028
    panelRoot.scale.set(scale, scale, scale)
  }
})
</script>

<T.Group bind:ref={panelRoot}>
	{#if screenModel}
		<T.Group position={[0, 0, -0.07]}>
			<T is={screenModel} />
		</T.Group>
	{:else}
		<T.Mesh position={[0, 0, -0.07]} renderOrder={12}>
			<T.PlaneGeometry args={[frameWidth, frameHeight]} />
			<T.MeshPhysicalMaterial
				color="#f8fafc"
				side={doubleSide}
				transparent={true}
				opacity={primary ? 0.16 : 0.11}
				roughness={0.26}
				metalness={0.04}
				transmission={0.92}
				thickness={1.45}
				clearcoat={1}
				clearcoatRoughness={0.12}
				ior={1.7}
				reflectivity={0.62}
				iridescence={primary ? 0.36 : 0.24}
				iridescenceIOR={1.42}
				iridescenceThicknessRange={[120, 420]}
				attenuationColor={primary ? "#67e8f9" : "#a78bfa"}
				attenuationDistance={primary ? 2.1 : 1.55}
				emissive={primary ? "#0e7490" : "#1e1b4b"}
				emissiveIntensity={primary ? 0.025 : 0.014}
				depthWrite={false}
			/>
		</T.Mesh>
	{/if}

	<T.Mesh position={[0, 0, -0.052]}>
		<T.PlaneGeometry args={[frameWidth, frameHeight]} />
			<T.MeshBasicMaterial
				color="#f8fafc"
				side={doubleSide}
				transparent={true}
				opacity={(primary ? 0.018 : 0.012) * glassEffectOpacity}
				blending={normalBlending}
				depthWrite={false}
			/>
	</T.Mesh>

	<T.Mesh position={[0, 0, -0.045]}>
		<T.PlaneGeometry args={[glowWidth, glowHeight]} />
			<T.MeshBasicMaterial
				color={primary ? "#1e1b4b" : "#172554"}
				side={doubleSide}
				transparent={true}
				opacity={(primary ? 0.07 : 0.045) * glassEffectOpacity}
				blending={additiveBlending}
				depthWrite={false}
			/>
	</T.Mesh>

	{#if panelGlassEnabled}
		<T.Mesh position={[0, 0, 0.105]}>
			<T.PlaneGeometry args={[causticWidth, causticHeight]} />
			<T.MeshBasicMaterial
				map={causticTexture}
				color={primary ? "#e0f2fe" : "#c4b5fd"}
				side={frontSide}
				transparent={true}
				opacity={(primary ? 0.26 : 0.16) * glassEffectOpacity}
				blending={additiveBlending}
				depthWrite={false}
				depthTest={true}
			/>
		</T.Mesh>
	{/if}

	{#if panelGlassEnabled}
		<T.Group bind:ref={sheenSweep} position={[-frameWidth * 0.5, 0, 0.132]} rotation={[0, 0, -0.48]}>
			<T.Mesh>
				<T.PlaneGeometry args={[sheenWidth, sheenHeight]} />
				<T.MeshBasicMaterial
					map={sheenTexture}
					color="#dff7ff"
					side={doubleSide}
					transparent={true}
					opacity={(primary ? 0.14 : 0.08) * glassEffectOpacity}
					blending={additiveBlending}
					depthWrite={false}
					depthTest={true}
				/>
			</T.Mesh>
		</T.Group>

		<T.Group bind:ref={secondarySheenSweep} position={[frameWidth * 0.3, 0, 0.128]} rotation={[0, 0, -0.48]}>
			<T.Mesh>
				<T.PlaneGeometry args={[sheenWidth * 0.56, sheenHeight * 0.92]} />
				<T.MeshBasicMaterial
					map={sheenTexture}
					color="#c4b5fd"
					side={doubleSide}
					transparent={true}
					opacity={(primary ? 0.08 : 0.05) * glassEffectOpacity}
					blending={additiveBlending}
					depthWrite={false}
					depthTest={true}
				/>
			</T.Mesh>
		</T.Group>
	{/if}

	{#if primary && titleTexture}
		{#if panelGlassEnabled}
			<T.Mesh position={[glassMediaOffset, 0.02 - glassMediaOffset * 0.44, mediaGhostFarZ]} scale={[glassMediaGhostScale, glassMediaGhostScale, 1]}>
				<T.PlaneGeometry args={[titleWidth, titleHeight]} />
				<T.MeshBasicMaterial
					map={titleTexture}
					color="#67e8f9"
					side={frontSide}
					transparent={true}
					opacity={0.2 * mediaGhostOpacity}
					blending={additiveBlending}
					depthWrite={false}
				/>
			</T.Mesh>

			<T.Mesh position={[-glassMediaOffset * 0.72, 0.02 + glassMediaOffset * 0.32, mediaGhostNearZ]} scale={[1.006, 1.006, 1]}>
				<T.PlaneGeometry args={[titleWidth, titleHeight]} />
				<T.MeshBasicMaterial
					map={titleTexture}
					color="#a78bfa"
					side={frontSide}
					transparent={true}
					opacity={0.14 * mediaGhostOpacity}
					blending={additiveBlending}
					depthWrite={false}
				/>
			</T.Mesh>
		{/if}

		<T.Mesh position={[0, 0.02, mediaSurfaceZ]}>
			<T.PlaneGeometry args={[titleWidth, titleHeight]} />
			<T.MeshBasicMaterial
				map={titleTexture}
				side={frontSide}
				transparent={true}
				opacity={titleMediaOpacity}
				blending={normalBlending}
				depthWrite={!panelGlassEnabled}
			/>
		</T.Mesh>
		{#if videoTexture}
			<T.Mesh position={[0, 0.02, mediaSurfaceZ + 0.002]}>
				<T.PlaneGeometry args={[titleWidth, titleHeight]} />
				<T.MeshBasicMaterial
					map={videoTexture}
					side={frontSide}
					transparent={true}
					opacity={videoMediaOpacity}
					blending={normalBlending}
					depthWrite={false}
				/>
			</T.Mesh>
		{/if}
	{:else if stillTexture}
		{#if panelGlassEnabled}
			<T.Mesh position={[glassMediaOffset, -glassMediaOffset * 0.46, mediaGhostFarZ]} scale={[glassMediaGhostScale, glassMediaGhostScale, 1]}>
				<T.PlaneGeometry args={[mediaWidth, mediaHeight]} />
				<T.MeshBasicMaterial
					map={stillTexture}
					color="#67e8f9"
					side={frontSide}
					transparent={true}
					opacity={(primary ? 0.18 : 0.12) * mediaGhostOpacity}
					blending={additiveBlending}
					depthWrite={false}
				/>
			</T.Mesh>

			<T.Mesh position={[-glassMediaOffset * 0.78, glassMediaOffset * 0.36, mediaGhostNearZ]} scale={[1.008, 1.008, 1]}>
				<T.PlaneGeometry args={[mediaWidth, mediaHeight]} />
				<T.MeshBasicMaterial
					map={stillTexture}
					color="#c4b5fd"
					side={frontSide}
					transparent={true}
					opacity={(primary ? 0.12 : 0.08) * mediaGhostOpacity}
					blending={additiveBlending}
					depthWrite={false}
				/>
			</T.Mesh>
		{/if}

		<T.Mesh position={[0, 0, mediaSurfaceZ]}>
			<T.PlaneGeometry args={[mediaWidth, mediaHeight]} />
			<T.MeshBasicMaterial
				map={stillTexture}
				side={frontSide}
				transparent={true}
				opacity={mediaOpacity}
				blending={normalBlending}
				depthWrite={!panelGlassEnabled}
			/>
		</T.Mesh>
		{#if videoTexture}
			<T.Mesh position={[0, 0, mediaSurfaceZ + 0.002]}>
				<T.PlaneGeometry args={[mediaWidth, mediaHeight]} />
				<T.MeshBasicMaterial
					map={videoTexture}
					side={frontSide}
					transparent={true}
					opacity={videoMediaOpacity}
					blending={normalBlending}
					depthWrite={false}
				/>
			</T.Mesh>
		{/if}
	{:else}
		<T.Mesh position={[0, 0.02, mediaSurfaceZ]}>
			<T.PlaneGeometry args={[fallbackWidth, fallbackHeight]} />
			<T.MeshBasicMaterial
				color={primary ? "#67e8f9" : "#8b5cf6"}
				side={doubleSide}
				transparent={true}
				opacity={primary ? 0.32 : 0.16}
				blending={additiveBlending}
				depthWrite={false}
			/>
		</T.Mesh>
	{/if}

	{#if screenTextTexture}
		<T.Mesh position={[0, 0.01, textSurfaceZ]} renderOrder={21}>
			<T.PlaneGeometry args={[textWidth, textHeight]} />
			<T.MeshBasicMaterial
				map={screenTextTexture}
				side={doubleSide}
				transparent={true}
				opacity={textOpacity}
				blending={normalBlending}
				depthWrite={false}
				depthTest={false}
			/>
		</T.Mesh>
	{/if}

</T.Group>
