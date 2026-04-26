<script lang="ts">
import { T } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import {
  AdditiveBlending,
  DoubleSide,
  FrontSide,
  NormalBlending,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  VideoTexture,
} from 'three'

export let index: number
export let primary = false
export let imageSrc = ''
export let stillSrc = ''
export let videoSrc = ''

let titleTexture: Texture | null = null
let stillTexture: Texture | null = null
let videoTexture: VideoTexture | null = null
let videoElement: HTMLVideoElement | null = null
let videoReadyHandler: (() => void) | null = null

const additiveBlending = AdditiveBlending
const normalBlending = NormalBlending
const doubleSide = DoubleSide
const frontSide = FrontSide

function disposeVideo() {
  if (videoElement && videoReadyHandler) {
    videoElement.removeEventListener('loadeddata', videoReadyHandler)
    videoElement.removeEventListener('canplay', videoReadyHandler)
  }
  videoElement?.pause()
  videoElement?.removeAttribute('src')
  videoElement?.load()
  videoTexture?.dispose()
  videoReadyHandler = null
  videoElement = null
  videoTexture = null
}

function disposeTitleTexture() {
  titleTexture?.dispose()
  titleTexture = null
}

function disposeStillTexture() {
  stillTexture?.dispose()
  stillTexture = null
}

onMount(() => {
  const loader = new TextureLoader()

  if (stillSrc) {
    stillTexture = loader.load(stillSrc, texture => {
      texture.colorSpace = SRGBColorSpace
      texture.needsUpdate = true
      stillTexture = texture
    })
  }

  if (videoSrc) {
    videoElement = document.createElement('video')
    videoElement.src = videoSrc
    videoElement.crossOrigin = 'anonymous'
    videoElement.loop = true
    videoElement.muted = true
    videoElement.playsInline = true
    videoElement.autoplay = true
    videoElement.preload = 'auto'

    videoReadyHandler = () => {
      if (!videoElement || videoTexture) return

      const texture = new VideoTexture(videoElement)
      texture.colorSpace = SRGBColorSpace
      texture.needsUpdate = true
      videoTexture = texture
    }

    videoElement.addEventListener('loadeddata', videoReadyHandler)
    videoElement.addEventListener('canplay', videoReadyHandler)
    if (videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      videoReadyHandler()
    }
    videoElement.load()
    videoElement.play().catch(() => {
      // Autoplay can still be blocked in unusual browser states; the panel
      // keeps its fallback tint until playback is available.
    })
  }

  if (primary && imageSrc) {
    titleTexture = loader.load(imageSrc, texture => {
      texture.colorSpace = SRGBColorSpace
      texture.needsUpdate = true
      titleTexture = texture
    })
  }

  return () => {
    disposeVideo()
    disposeStillTexture()
    disposeTitleTexture()
  }
})

onDestroy(() => {
  disposeVideo()
  disposeStillTexture()
  disposeTitleTexture()
})
</script>

<T.Group>
	<T.Mesh position={[0, 0, -0.045]}>
		<T.PlaneGeometry args={[primary ? 4.76 : 3.18, primary ? 2.68 : 1.78]} />
		<T.MeshBasicMaterial
			color={primary ? "#030712" : "#020617"}
			side={doubleSide}
			transparent={true}
			opacity={primary ? 0.78 : 0.5}
			blending={normalBlending}
			depthWrite={false}
		/>
	</T.Mesh>

	<T.Mesh position={[0, 0, -0.035]}>
		<T.PlaneGeometry args={[primary ? 4.96 : 3.38, primary ? 2.88 : 1.98]} />
		<T.MeshBasicMaterial
			color={primary ? "#1e1b4b" : "#172554"}
			side={doubleSide}
			transparent={true}
			opacity={primary ? 0.2 : 0.16}
			blending={additiveBlending}
			depthWrite={false}
		/>
	</T.Mesh>

	{#if stillTexture}
		<T.Mesh position={[0, 0, 0]}>
			<T.PlaneGeometry args={[primary ? 4.46 : 2.92, primary ? 2.5 : 1.64]} />
			<T.MeshBasicMaterial
				map={stillTexture}
				side={frontSide}
				transparent={true}
				opacity={primary ? 0.96 : 0.82}
				blending={normalBlending}
				depthWrite={false}
			/>
		</T.Mesh>
	{:else if videoTexture}
		<T.Mesh position={[0, 0, 0]}>
			<T.PlaneGeometry args={[primary ? 4.46 : 2.92, primary ? 2.5 : 1.64]} />
			<T.MeshBasicMaterial
				map={videoTexture}
				side={frontSide}
				transparent={true}
				opacity={primary ? 0.96 : 0.82}
				blending={normalBlending}
				depthWrite={false}
			/>
		</T.Mesh>
	{:else if primary && titleTexture}
		<T.Mesh position={[0, 0.02, 0.01]}>
			<T.PlaneGeometry args={[4.84, 2.08]} />
			<T.MeshBasicMaterial
				map={titleTexture}
				side={frontSide}
				transparent={true}
				opacity={0.98}
				blending={normalBlending}
				depthWrite={false}
			/>
		</T.Mesh>
	{:else}
		<T.Mesh position={[0, 0.02, 0.01]}>
			<T.PlaneGeometry args={[primary ? 4.68 : 2.76, primary ? 0.72 : 0.44]} />
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

	{#if primary && titleTexture}
		<T.Mesh position={[0, 0.02, 0.018]}>
			<T.PlaneGeometry args={[3.36, 1.44]} />
			<T.MeshBasicMaterial
				map={titleTexture}
				side={frontSide}
				transparent={true}
				opacity={0.62}
				blending={normalBlending}
				depthWrite={false}
			/>
		</T.Mesh>
	{/if}

	<T.Mesh position={[0, 0, 0.02]}>
		<T.PlaneGeometry args={[primary ? 5.06 : 3.46, primary ? 2.94 : 2.04]} />
		<T.MeshBasicMaterial
			color={primary ? "#22d3ee" : "#6366f1"}
			wireframe={true}
			side={doubleSide}
			transparent={true}
			opacity={primary ? 0.18 : 0.095}
			blending={additiveBlending}
			depthWrite={false}
		/>
	</T.Mesh>
</T.Group>
