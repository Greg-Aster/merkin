import { LinearFilter, SRGBColorSpace, VideoTexture } from 'three'
import type { Texture } from 'three'

type LoadVideoOptions = {
  src: string
  playbackRate: number
  isMounted: () => boolean
  onReady: () => void
}

type SyncVideoOptions = LoadVideoOptions & {
  enabled: boolean
  shouldLoadMedia: boolean
  active: boolean
  hovered: boolean
  motionEnabled: boolean
}

export type HomeIntroScreenVideoPlaybackState = {
  texture: VideoTexture | null
  ready: boolean
  hasElement: boolean
}

function configureVideoTexture(texture: Texture) {
  texture.colorSpace = SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
}

export function createHomeIntroScreenVideoPlayback() {
  let videoElement: HTMLVideoElement | null = null
  let texture: VideoTexture | null = null
  let requested = false
  let ready = false
  let loadedSrc = ''

  function getState(): HomeIntroScreenVideoPlaybackState {
    return {
      texture,
      ready,
      hasElement: Boolean(videoElement),
    }
  }

  function releaseTexture() {
    texture?.dispose()
    texture = null
  }

  function releaseElement() {
    if (!videoElement) return

    videoElement.pause()
    videoElement.removeAttribute('src')
    videoElement.load()
    videoElement = null
  }

  function release() {
    ready = false
    requested = false
    loadedSrc = ''
    releaseTexture()
    releaseElement()

    return getState()
  }

  function ensureLoaded({
    src,
    playbackRate,
    isMounted,
    onReady,
  }: LoadVideoOptions) {
    if (!src || typeof document === 'undefined') return
    if (requested && loadedSrc === src) return
    if (requested) release()

    requested = true
    ready = false
    loadedSrc = src

    const video = document.createElement('video')
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.preload = 'metadata'
    video.crossOrigin = 'anonymous'
    video.playbackRate = playbackRate
    video.src = src

    video.addEventListener(
      'canplay',
      () => {
        if (!isMounted() || videoElement !== video) return
        ready = true
        onReady()
      },
      { once: true },
    )

    videoElement = video
    texture = new VideoTexture(video)
    configureVideoTexture(texture)
    video.load()
  }

  function play(playbackRate: number) {
    if (videoElement) videoElement.playbackRate = playbackRate
    videoElement?.play().catch(() => {
      // The still image remains visible if autoplay is blocked.
    })
  }

  function pause() {
    videoElement?.pause()
  }

  return {
    get state() {
      return getState()
    },
    get isPlaying() {
      return videoElement?.paused === false
    },
    sync({
      enabled,
      src,
      playbackRate,
      shouldLoadMedia,
      active,
      hovered,
      motionEnabled,
      isMounted,
      onReady,
    }: SyncVideoOptions) {
      if (!enabled || !src) return release()

      if (!motionEnabled) {
        pause()
        return getState()
      }

      if (shouldLoadMedia && (active || hovered)) {
        ensureLoaded({ src, playbackRate, isMounted, onReady })
      }

      if (shouldLoadMedia && hovered) {
        play(playbackRate)
      } else {
        pause()
      }

      return getState()
    },
    release,
  }
}
