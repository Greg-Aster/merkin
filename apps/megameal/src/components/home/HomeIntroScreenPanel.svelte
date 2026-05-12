<script lang="ts">
import { T, useTask, useThrelte } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import {
  AdditiveBlending,
  DoubleSide,
  FrontSide,
  NormalBlending,
  SRGBColorSpace,
  CanvasTexture,
  type Group,
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
import {
  createCausticTexture,
  createFrostedScrimTexture,
  createSheenTexture,
} from './homeIntroGlassTextures'
import {
  createScreenTextTexture,
  createTextMediaBlurTextureController,
} from './homeIntroScreenTextTextures'
import {
  disposeHomeIntroScreenModel,
  loadHomeIntroScreenModelInstance,
} from './homeIntroScreenModel'

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
let textMediaBlurTexture: CanvasTexture | null = null
let panelRoot: Group | null = null
let frostedScrimTexture: CanvasTexture | null = null
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
let textScrimOpacity = primary ? 0.34 : 0.42
let textMediaBlurOpacity = primary ? 0.42 : 0.46
let textFrostOpacity = primary ? 0.16 : 0.18
let videoElement: HTMLVideoElement | null = null

const additiveBlending = AdditiveBlending
const normalBlending = NormalBlending
const doubleSide = DoubleSide
const frontSide = FrontSide
const textMediaBlurController = createTextMediaBlurTextureController()
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
const textScrimSurfaceZ = -0.028
const textMediaBlurSurfaceZ = -0.026
const textFrostSurfaceZ = -0.024
const textSurfaceZ = -0.018
const textWidth = 2.54
const textHeight = 1.24
const screenVideoPlaybackRate = 0.33

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

function disposeTextMediaBlurTexture() {
  textMediaBlurController.dispose()
  textMediaBlurTexture = null
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

function disposeFrostedScrimTexture() {
  frostedScrimTexture?.dispose()
  frostedScrimTexture = null
}

function disposeScreenModel() {
  disposeHomeIntroScreenModel(screenModel)
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

function syncPanelGlassTextures() {
  if (typeof document === 'undefined') return

  if (!panelGlassEnabled) {
    disposeSheenTexture()
    disposeCausticTexture()
    disposeFrostedScrimTexture()
    return
  }

  sheenTexture ??= createSheenTexture()
  causticTexture ??= createCausticTexture()
  frostedScrimTexture ??= createFrostedScrimTexture()
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
  disposeTextMediaBlurTexture()
  disposeVideoElement()
  disposeScreenTextTexture()
  disposeSheenTexture()
  disposeCausticTexture()
  disposeFrostedScrimTexture()
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

  if (frostedScrimTexture) {
    frostedScrimTexture.offset.x = time * 0.004 + index * 0.021
    frostedScrimTexture.offset.y = Math.sin(time * 0.12 + index) * 0.012
  }

  hoverBlend += ((hovered ? 1 : 0) - hoverBlend) * ease
  const baseTitleOpacity = panelGlassEnabled ? 0.76 : 1
  const baseMediaOpacity = panelGlassEnabled ? (primary ? 0.62 : 0.48) : 1
  videoMediaOpacity = videoReady ? hoverBlend : 0
  titleMediaOpacity =
    baseTitleOpacity +
    (1 - baseTitleOpacity) * hoverBlend -
    videoMediaOpacity * 0.72
  mediaOpacity = baseMediaOpacity + (1 - baseMediaOpacity) * hoverBlend
  mediaGhostOpacity = panelGlassEnabled ? (primary ? 0.46 : 0.28) : 0
  glassEffectOpacity = 1
  const baseTextOpacity = primary ? 0.96 : 0.88
  textOpacity = videoSrc ? baseTextOpacity * (1 - hoverBlend) : baseTextOpacity
  const baseTextScrimOpacity = panelGlassEnabled ? (primary ? 0.48 : 0.54) : 0.56
  textScrimOpacity = videoSrc ? baseTextScrimOpacity * (1 - hoverBlend) : baseTextScrimOpacity
  const baseTextMediaBlurOpacity = panelGlassEnabled ? (primary ? 0.52 : 0.58) : 0
  textMediaBlurOpacity = videoSrc
    ? baseTextMediaBlurOpacity * (1 - hoverBlend)
    : baseTextMediaBlurOpacity
  const baseTextFrostOpacity = panelGlassEnabled ? (primary ? 0.22 : 0.26) : 0
  textFrostOpacity = videoSrc ? baseTextFrostOpacity * (1 - hoverBlend) : baseTextFrostOpacity
  textMediaBlurTexture = textMediaBlurController.update(
    time,
    videoElement,
    textMediaBlurOpacity,
    panelGlassEnabled,
  )

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
		{#if videoTexture && videoReady}
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
		{#if videoTexture && videoReady}
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
		<T.Mesh position={[0, primary ? 0.02 : 0, textScrimSurfaceZ]} renderOrder={20}>
			<T.PlaneGeometry args={[primary ? titleWidth : mediaWidth, primary ? titleHeight : mediaHeight]} />
			<T.MeshBasicMaterial
				color="#020617"
				side={doubleSide}
				transparent={true}
				opacity={textScrimOpacity}
				blending={normalBlending}
				depthWrite={false}
				depthTest={false}
			/>
		</T.Mesh>
	{/if}

	{#if screenTextTexture && textMediaBlurTexture}
		<T.Mesh position={[0, primary ? 0.02 : 0, textMediaBlurSurfaceZ]} renderOrder={20}>
			<T.PlaneGeometry args={[primary ? titleWidth : mediaWidth, primary ? titleHeight : mediaHeight]} />
			<T.MeshBasicMaterial
				map={textMediaBlurTexture}
				side={doubleSide}
				transparent={true}
				opacity={textMediaBlurOpacity}
				blending={normalBlending}
				depthWrite={false}
				depthTest={false}
			/>
		</T.Mesh>
	{/if}

	{#if screenTextTexture && frostedScrimTexture}
		<T.Mesh position={[0, primary ? 0.02 : 0, textFrostSurfaceZ]} renderOrder={20}>
			<T.PlaneGeometry args={[primary ? titleWidth : mediaWidth, primary ? titleHeight : mediaHeight]} />
			<T.MeshBasicMaterial
				map={frostedScrimTexture}
				color="#dbeafe"
				side={doubleSide}
				transparent={true}
				opacity={textFrostOpacity}
				blending={normalBlending}
				depthWrite={false}
				depthTest={false}
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
