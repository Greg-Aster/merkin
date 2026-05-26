<script lang="ts">
import { T, useTask, useThrelte } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import {
  AdditiveBlending,
  DoubleSide,
  FrontSide,
  LinearFilter,
  NormalBlending,
  SRGBColorSpace,
  CanvasTexture,
  type Group,
  type Mesh,
  type Texture,
  type WebGLRenderer,
  TextureLoader,
  VideoTexture,
} from 'three'
import type * as THREE from 'three'
import {
  getHomeIntroKtx2Loader,
  releaseHomeIntroKtx2Loader,
  retainHomeIntroKtx2Loader,
} from './homeIntroKtx2Loader'
import { createScreenTextTexture } from './homeIntroScreenTextTextures'
import {
  disposeHomeIntroScreenModel,
  loadHomeIntroScreenModelInstance,
} from './homeIntroScreenModel'
import { homeIntroReflectionOnlyUserDataKey } from './homeIntroReflectionOnly'
import { HomeIntroScreenContentRenderer } from './homeIntroScreenContentRenderer'

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
export let motionEnabled = true

const threlte = useThrelte()

let titleTexture: Texture | null = null
let stillTexture: Texture | null = null
let screenTextTexture: CanvasTexture | null = null
let screenContentTexture: Texture | null = null
let videoTexture: VideoTexture | null = null
let panelRoot: Group | null = null
let screenModel: THREE.Object3D | null = null
let screenContentMesh: Mesh | null = null
let screenContentMaterial: THREE.MeshBasicMaterial | null = null
let screenContentRenderer: HomeIntroScreenContentRenderer | null = null
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
let textOpacity = primary ? 0.72 : 0.58
let textScrimOpacity = primary ? 0.34 : 0.42
let mediaTint = '#ffffff'
let titleMediaTint = '#ffffff'
let videoElement: HTMLVideoElement | null = null

const additiveBlending = AdditiveBlending
const normalBlending = NormalBlending
const doubleSide = DoubleSide
const frontSide = FrontSide
const frameWidth = 3.18
const frameHeight = 1.78
const screenModelZ = -0.07
const mediaWidth = frameWidth * 1.1
const mediaHeight = frameHeight * 1.1
const titleWidth = mediaWidth
const titleHeight = mediaHeight
const fallbackWidth = 2.76
const fallbackHeight = 0.44
const mediaSurfaceZ = -0.16
const textWidth = 2.54
const textHeight = 1.24
const screenVideoPlaybackRate = 0.33

function getTextureTint(opacity: number) {
  const channel = Math.round(Math.min(1, Math.max(0, opacity)) * 255)
    .toString(16)
    .padStart(2, '0')

  return `#${channel}${channel}${channel}`
}

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

function disposeScreenContentRenderer() {
  screenContentRenderer?.dispose()
  screenContentRenderer = null
  screenContentTexture = null
}

function disposeStillTexture() {
  stillTexture?.dispose()
  stillTexture = null
}

function disposeScreenModel() {
  disposeHomeIntroScreenModel(screenModel)
  screenModel = null
}

function configureMediaTexture(texture: Texture, invertY = false) {
  texture.colorSpace = SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter

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

  if (!motionEnabled) return videoElement?.pause()

  if (shouldLoadMedia && (active || hovered)) {
    ensureVideoLoaded()
  }

  const shouldPlay = shouldLoadMedia && hovered

  if (shouldPlay) {
    if (videoElement) videoElement.playbackRate = screenVideoPlaybackRate
    videoElement?.play().catch(() => {
      // The still image remains visible if autoplay is blocked.
    })
    return
  }

  videoElement?.pause()
}

function syncScreenTextTexture() {
  if (!mounted) return

  disposeScreenTextTexture()
  screenTextTexture = createScreenTextTexture({
    ctaLabel,
    kicker,
    stat,
    title,
  })
}

async function loadScreenModel() {
  if (screenModelRequested || typeof window === 'undefined') return

  screenModelRequested = true
  const controller = new AbortController()
  screenLoadAbortController = controller

  try {
    const model = await loadHomeIntroScreenModelInstance(frameWidth, frameHeight)

    if (!mounted || controller.signal.aborted || !model) {
      disposeHomeIntroScreenModel(model)
      return
    }

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
  disposeScreenContentRenderer()
}

onMount(() => {
  mounted = true
  disposed = false
  retainHomeIntroKtx2Loader()
  loader = new TextureLoader()
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

function ensureScreenContentRenderer() {
  if (screenContentRenderer) return screenContentRenderer

  screenContentRenderer = new HomeIntroScreenContentRenderer({
    mediaWidth,
    mediaHeight,
    textWidth,
    textHeight,
  })
  screenContentTexture = screenContentRenderer.texture

  return screenContentRenderer
}

function renderScreenContent() {
  const renderer = getRenderer()
  if (!renderer || !mounted) return

  const screenRenderer = ensureScreenContentRenderer()

  screenRenderer.render(renderer, {
    fallbackColor: primary ? '#67e8f9' : '#8b5cf6',
    fallbackOpacity: primary ? 0.32 : 0.16,
    mediaTexture: primary ? titleTexture : stillTexture,
    mediaTint: primary ? titleMediaTint : mediaTint,
    screenTextTexture,
    textOpacity,
    textScrimOpacity,
    videoMediaOpacity,
    videoReady,
    videoTexture,
  })
}

$: if (loader && shouldLoadMedia) {
  ensureMediaTexturesLoaded()
}

$: if (mounted && videoSrc && (active || hovered || videoElement || !motionEnabled)) {
  syncVideoPlayback()
}

$: if (mounted && (kicker || title || stat || ctaLabel)) {
  syncScreenTextTexture()
}

$: mediaTint = getTextureTint(mediaOpacity)
$: titleMediaTint = getTextureTint(titleMediaOpacity)
$: if (screenContentMesh && screenContentMaterial) {
  const reflectionOnly = Boolean(screenModel)
  const canWriteMainPass = !reflectionOnly

  screenContentMesh.userData[homeIntroReflectionOnlyUserDataKey] = reflectionOnly
  screenContentMesh.visible = true
  screenContentMaterial.colorWrite = canWriteMainPass
  screenContentMaterial.depthWrite = canWriteMainPass
  screenContentMesh.onBeforeRender = renderer => {
    const renderTarget = renderer.getRenderTarget()
    const renderTargetName = renderTarget?.texture?.name ?? ''
    const canWriteGlassPass =
      Boolean(renderTarget) &&
      renderTargetName !== 'HomeIntroLogoGlitch.logo'
    const canWriteCurrentPass = !reflectionOnly || canWriteGlassPass

    screenContentMaterial!.colorWrite = canWriteCurrentPass
    screenContentMaterial!.depthWrite = canWriteCurrentPass
  }
  screenContentMesh.onAfterRender = () => {
    screenContentMaterial!.colorWrite = canWriteMainPass
    screenContentMaterial!.depthWrite = canWriteMainPass
  }
}

useTask(delta => {
  const time = performance.now() * 0.001
  const ease = 1 - Math.exp(-delta * 8)

  if (motionEnabled) {
    hoverBlend += ((hovered ? 1 : 0) - hoverBlend) * ease
    const baseTitleOpacity = 0.94
    const baseMediaOpacity = primary ? 0.92 : 0.86
    videoMediaOpacity = videoReady ? hoverBlend : 0
    titleMediaOpacity =
      baseTitleOpacity +
      (1 - baseTitleOpacity) * hoverBlend -
      videoMediaOpacity * 0.18
    mediaOpacity = baseMediaOpacity + (1 - baseMediaOpacity) * hoverBlend
    const baseTextOpacity = primary ? 0.96 : 0.88
    textOpacity = videoSrc ? baseTextOpacity * (1 - hoverBlend) : baseTextOpacity
    const baseTextScrimOpacity = primary ? 0.38 : 0.44
    textScrimOpacity = videoSrc ? baseTextScrimOpacity * (1 - hoverBlend) : baseTextScrimOpacity

    if (panelRoot) {
      panelRoot.position.z = hoverBlend * 0.045
      panelRoot.rotation.x = hoverBlend * -0.018
      panelRoot.rotation.y = Math.sin(time * 0.8 + index) * hoverBlend * 0.018
      const scale = 1 + hoverBlend * 0.028
      panelRoot.scale.set(scale, scale, scale)
    }
  }

  renderScreenContent()
})
</script>

<T.Group bind:ref={panelRoot}>
	{#if screenModel}
		<T.Group position={[0, 0, screenModelZ]}>
			<T is={screenModel} />
		</T.Group>
	{:else}
		<T.Mesh position={[0, 0, screenModelZ]} renderOrder={12}>
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

	{#if screenContentTexture}
		<T.Mesh
			bind:ref={screenContentMesh}
			position={[0, primary ? 0.02 : 0, mediaSurfaceZ]}
		>
			<T.PlaneGeometry args={[primary ? titleWidth : mediaWidth, primary ? titleHeight : mediaHeight]} />
			<T.MeshBasicMaterial
				bind:ref={screenContentMaterial}
				map={screenContentTexture}
				side={frontSide}
				blending={normalBlending}
				depthWrite={true}
			/>
		</T.Mesh>
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

</T.Group>
