<script lang="ts">
import { type Stage, T, useTask, useThrelte } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  FrontSide,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  NormalBlending,
  type Texture,
  TextureLoader,
  type WebGLRenderer,
} from 'three'
import type * as THREE from 'three'
import {
  releaseHomeIntroKtx2Loader,
  retainHomeIntroKtx2Loader,
} from './homeIntroKtx2Loader'
import { HomeIntroScreenContentRenderer } from './homeIntroScreenContentRenderer'
import { loadHomeIntroScreenModelInstance } from './homeIntroScreenModel'
import {
  SCREEN_FALLBACK_HEIGHT,
  SCREEN_FALLBACK_WIDTH,
  SCREEN_FRAME_HEIGHT,
  SCREEN_FRAME_WIDTH,
  SCREEN_MEDIA_HEIGHT,
  SCREEN_MEDIA_SURFACE_Z,
  SCREEN_MEDIA_WIDTH,
  SCREEN_MODEL_Z,
  SCREEN_PORTRAIT_ROTATION_Z,
  SCREEN_TEXT_HEIGHT,
  SCREEN_TEXT_SURFACE_Z,
  SCREEN_TEXT_WIDTH,
  SCREEN_VIDEO_PLAYBACK_RATE,
  bindScreenContentGlitchMask,
  buildScreenContentRenderKey,
  getTextureTint,
  loadConfiguredKtx2Texture,
  loadConfiguredTexture,
  resolveThrelteRenderer,
  stepScreenHoverMotion,
} from './homeIntroScreenPanelHelpers'
import {
  createScreenInfoTickerTextureController,
  createScreenTextTexture,
} from './homeIntroScreenTextTextures'
import { createHomeIntroScreenVideoPlayback } from './homeIntroScreenVideoPlayback'

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
export let description = ''
export let stat = ''
export let ctaLabel = ''
export let hovered = false
export let videoPlaybackEnabled = true
export let motionEnabled = true
export let portraitLayout = false
export let motionStage: Stage

const threlte = useThrelte()

let titleTexture: Texture | null = null
let stillTexture: Texture | null = null
let screenTextTexture: CanvasTexture | null = null
let screenInfoTexture: CanvasTexture | null = null
let screenContentTexture: Texture | null = null
let videoTexture: Texture | null = null
let panelRoot: Group | null = null
let screenModel: THREE.Object3D | null = null
let screenContentMesh: Mesh | null = null
let screenContentMaterial: THREE.MeshBasicMaterial | null = null
let screenContentRenderer: HomeIntroScreenContentRenderer | null = null
let screenContentRendererLayout: 'landscape' | 'portrait' | null = null
let screenContentRendered = false
let screenContentRenderKey = ''
let loader: TextureLoader | null = null
let screenLoadAbortController: AbortController | null = null
let screenModelRequested = false
let stillTextureRequested = false
let ktx2TextureRequested = false
let titleTextureRequested = false
let videoReady = false
let hasVideoElement = false
let mounted = false
let disposed = false
let hoverBlend = 0
let mediaOpacity = 1
let titleMediaOpacity = 1
let videoMediaOpacity = 0
let textOpacity = primary ? 0.72 : 0.58
let infoTextOpacity = 0
let mediaTint = '#ffffff'
let titleMediaTint = '#ffffff'
const screenInfoTicker = createScreenInfoTickerTextureController()
const videoPlayback = createHomeIntroScreenVideoPlayback()

$: screenLayout = portraitLayout ? 'portrait' : 'landscape'
$: framePlaneWidth = portraitLayout ? SCREEN_FRAME_HEIGHT : SCREEN_FRAME_WIDTH
$: framePlaneHeight = portraitLayout ? SCREEN_FRAME_WIDTH : SCREEN_FRAME_HEIGHT
$: mediaPlaneWidth = portraitLayout ? SCREEN_MEDIA_HEIGHT : SCREEN_MEDIA_WIDTH
$: mediaPlaneHeight = portraitLayout ? SCREEN_MEDIA_WIDTH : SCREEN_MEDIA_HEIGHT
$: textPlaneWidth = portraitLayout ? mediaPlaneWidth : SCREEN_TEXT_WIDTH
$: textPlaneHeight = portraitLayout ? mediaPlaneHeight : SCREEN_TEXT_HEIGHT

const getRenderer = () =>
  resolveThrelteRenderer(
    threlte.renderer as WebGLRenderer | { current?: WebGLRenderer } | null,
  )

function disposeTitleTexture() {
  titleTexture?.dispose()
  titleTexture = null
}

function applyVideoPlaybackState(state = videoPlayback.state) {
  videoTexture = state.texture
  videoReady = state.ready
  hasVideoElement = state.hasElement
}

function releaseVideoPlayback() {
  applyVideoPlaybackState(videoPlayback.release())
}

function syncVideoPlayback() {
  applyVideoPlaybackState(
    videoPlayback.sync({
      enabled: videoPlaybackEnabled,
      src: videoSrc,
      playbackRate: SCREEN_VIDEO_PLAYBACK_RATE,
      shouldLoadMedia,
      active,
      hovered,
      motionEnabled,
      isMounted: () => mounted,
      onReady: applyVideoPlaybackState,
    }),
  )
}

function disposeScreenTextTexture() {
  screenTextTexture?.dispose()
  screenTextTexture = null
}

function disposeScreenInfoTexture() {
  screenInfoTicker.dispose()
  screenInfoTexture = null
}

function disposeScreenContentRenderer() {
  screenContentRenderer?.dispose()
  screenContentRenderer = null
  screenContentRendererLayout = null
  screenContentTexture = null
  screenContentRendered = false
  screenContentRenderKey = ''
}

function disposeStillTexture() {
  stillTexture?.dispose()
  stillTexture = null
}

function disposeScreenModel() {
  screenModel = null
}

function syncScreenTextTexture() {
  if (!mounted) return

  disposeScreenTextTexture()
  screenTextTexture = createScreenTextTexture({
    ctaLabel,
    kicker,
    layout: screenLayout,
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
    const model = await loadHomeIntroScreenModelInstance(
      SCREEN_FRAME_WIDTH,
      SCREEN_FRAME_HEIGHT,
    )

    if (!mounted || controller.signal.aborted || !model) {
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
  releaseVideoPlayback()
  disposeScreenTextTexture()
  disposeScreenInfoTexture()
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
    const started = loadConfiguredKtx2Texture({
      renderer: getRenderer(),
      src: ktx2Src,
      isMounted: () => mounted,
      onLoaded: texture => {
        stillTexture = texture
      },
      onError: () => {
        if (!stillTextureRequested) loadStillTexture()
      },
    })
    if (started) {
      ktx2TextureRequested = true
      return
    }
  }

  if (shouldLoadStill && !stillTexture && !stillTextureRequested) {
    loadStillTexture()
  }

  if (primary && imageSrc && !titleTextureRequested) {
    titleTextureRequested = true
    titleTexture = loadConfiguredTexture(loader, imageSrc, () => mounted, texture => {
      titleTexture = texture
    })
  }
}

function loadStillTexture() {
  if (!loader || !stillSrc) return

  stillTextureRequested = true
  stillTexture = loadConfiguredTexture(loader, stillSrc, () => mounted, texture => {
    stillTexture = texture
  })
}

function ensureScreenContentRenderer() {
  if (screenContentRenderer && screenContentRendererLayout === screenLayout) {
    return screenContentRenderer
  }

  disposeScreenContentRenderer()
  screenContentRendererLayout = screenLayout
  screenContentRenderer = new HomeIntroScreenContentRenderer(
    portraitLayout ? { renderWidth: 720, renderHeight: 1024 } : {},
  )
  screenContentTexture = screenContentRenderer.texture

  return screenContentRenderer
}

function renderScreenContent() {
  const renderer = getRenderer()
  if (!renderer || !mounted) return

  const renderState = {
    fallbackColor: primary ? '#67e8f9' : '#8b5cf6',
    fallbackOpacity: primary ? 0.32 : 0.16,
    mediaTexture: primary ? titleTexture ?? stillTexture : stillTexture,
    mediaTint: primary ? titleMediaTint : mediaTint,
    videoMediaOpacity,
    videoReady,
    videoTexture,
  }
  const nextRenderKey = buildScreenContentRenderKey(renderState)
  const hasLiveVideo =
    Boolean(videoTexture && videoReady && videoMediaOpacity > 0.001) &&
    videoPlayback.isPlaying

  if (
    screenContentRendered &&
    nextRenderKey === screenContentRenderKey &&
    !hasLiveVideo
  ) {
    return
  }

  const screenRenderer = ensureScreenContentRenderer()

  screenRenderer.render(renderer, renderState)
  screenContentRendered = true
  screenContentRenderKey = nextRenderKey
}

$: if (loader && shouldLoadMedia) {
  ensureMediaTexturesLoaded()
}

$: if (
  mounted &&
  (videoSrc || hasVideoElement) &&
  (active || hovered || hasVideoElement || !motionEnabled || !videoPlaybackEnabled)
) {
  syncVideoPlayback()
}

$: if (mounted && (kicker || title || stat || ctaLabel || portraitLayout)) {
  syncScreenTextTexture()
}

$: mediaTint = getTextureTint(mediaOpacity)
$: titleMediaTint = getTextureTint(titleMediaOpacity)
$: if (screenContentMesh && screenContentMaterial) {
  bindScreenContentGlitchMask(
    screenContentMesh,
    screenContentMaterial as MeshBasicMaterial,
    Boolean(screenModel),
  )
}

function updateScreenMotion(delta: number) {
  const time = performance.now() * 0.001

  if (motionEnabled) {
    const next = stepScreenHoverMotion({
      hoverBlend,
      hovered,
      portraitLayout,
      primary,
      videoReady,
      delta,
      time,
      index,
      panelRoot,
    })
    hoverBlend = next.hoverBlend
    videoMediaOpacity = next.videoMediaOpacity
    titleMediaOpacity = next.titleMediaOpacity
    mediaOpacity = next.mediaOpacity
    textOpacity = next.textOpacity
    infoTextOpacity = next.infoTextOpacity
  }

  if (infoTextOpacity > 0.01) {
    screenInfoTexture = screenInfoTicker.update({
      ctaLabel,
      description,
      kicker,
      stat,
      time,
      title,
    })
  }

  renderScreenContent()
}

useTask(updateScreenMotion, { stage: motionStage, autoInvalidate: false })
</script>

<T.Group bind:ref={panelRoot}>
	{#if screenModel}
		<T.Group position={[0, 0, SCREEN_MODEL_Z]} rotation={[0, 0, portraitLayout ? SCREEN_PORTRAIT_ROTATION_Z : 0]}>
			<T is={screenModel} />
		</T.Group>
	{:else}
		<T.Mesh position={[0, 0, SCREEN_MODEL_Z]} renderOrder={12}>
			<T.PlaneGeometry args={[framePlaneWidth, framePlaneHeight]} />
			<T.MeshPhysicalMaterial
				color="#f8fafc"
				side={DoubleSide}
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
		<T.Mesh bind:ref={screenContentMesh} position={[0, primary ? 0.02 : 0, SCREEN_MEDIA_SURFACE_Z]} renderOrder={80}>
			<T.PlaneGeometry args={[primary && !portraitLayout ? SCREEN_MEDIA_WIDTH : mediaPlaneWidth, primary && !portraitLayout ? SCREEN_MEDIA_HEIGHT : mediaPlaneHeight]} />
			<T.MeshBasicMaterial
				bind:ref={screenContentMaterial}
				map={screenContentTexture}
				side={FrontSide}
				blending={NormalBlending}
				transparent={true}
				depthTest={true}
				depthWrite={false}
			/>
		</T.Mesh>
	{:else}
		<T.Mesh position={[0, 0.02, SCREEN_MEDIA_SURFACE_Z]} renderOrder={80}>
			<T.PlaneGeometry args={[portraitLayout ? SCREEN_FALLBACK_HEIGHT : SCREEN_FALLBACK_WIDTH, portraitLayout ? SCREEN_FALLBACK_WIDTH : SCREEN_FALLBACK_HEIGHT]} />
			<T.MeshBasicMaterial
				color={primary ? "#67e8f9" : "#8b5cf6"}
				side={DoubleSide}
				transparent={true}
				opacity={primary ? 0.32 : 0.16}
				blending={AdditiveBlending}
				depthTest={true}
				depthWrite={false}
			/>
		</T.Mesh>
	{/if}

	{#if screenTextTexture}
		<T.Mesh position={[0, 0.01, SCREEN_TEXT_SURFACE_Z]} renderOrder={90}>
			<T.PlaneGeometry args={[textPlaneWidth, textPlaneHeight]} />
			<T.MeshBasicMaterial map={screenTextTexture} side={FrontSide} transparent={true} opacity={textOpacity} blending={NormalBlending} depthTest={true} depthWrite={false} />
		</T.Mesh>
	{/if}

	{#if screenInfoTexture}
		<T.Mesh position={[0, 0.018, SCREEN_TEXT_SURFACE_Z + 0.006]} renderOrder={91}>
			<T.PlaneGeometry args={[textPlaneWidth, textPlaneHeight]} />
			<T.MeshBasicMaterial map={screenInfoTexture} side={FrontSide} transparent={true} opacity={infoTextOpacity} blending={NormalBlending} depthTest={true} depthWrite={false} />
		</T.Mesh>
	{/if}

</T.Group>
