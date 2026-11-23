<script lang="ts">
import {
  getRichMediaCapabilities,
  scheduleRichMediaActivation,
} from '@/utils/richMediaCapabilities'
import { onMount, tick } from 'svelte'

type ArchiveMediaState =
  | 'poster'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'unavailable'
type ArchiveMediaPolicy = 'pending' | 'automatic' | 'manual' | 'reduced-motion'

export let videoSrc = '/assets/banner/archive_1.webm'
export let posterSrc = '/assets/banner/archive_still.png'
export let posterSrcset =
  '/assets/banner/archive-still-1280.webp 1280w, /assets/banner/archive-still-1920.webp 1920w'
export let compactPosterSrc = '/assets/banner/home-intro-stills/archive.webp'
export let playbackRate = 0.2

let videoElement: HTMLVideoElement | null = null
let driftY = 0
let pointerX = 0
let pointerY = 0
let showVideo = false
let mediaState: ArchiveMediaState = 'poster'
let mediaPolicy: ArchiveMediaPolicy = 'pending'
let failureMessage = ''
let playbackTimeout = 0

function clearPlaybackTimeout() {
  if (!playbackTimeout) return
  window.clearTimeout(playbackTimeout)
  playbackTimeout = 0
}

function setPlaybackRate() {
  if (!videoElement) return
  videoElement.defaultPlaybackRate = playbackRate
  videoElement.playbackRate = playbackRate
}

function markVideoPlaying() {
  clearPlaybackTimeout()
  failureMessage = ''
  mediaState = 'playing'
  setPlaybackRate()
}

function markVideoUnavailable() {
  clearPlaybackTimeout()
  videoElement?.pause()
  mediaState = 'unavailable'
  failureMessage =
    'Archive background motion could not start. The still background remains available.'
}

async function startVideo() {
  if (mediaState === 'loading' || mediaState === 'playing') return

  failureMessage = ''
  mediaState = 'loading'
  showVideo = true
  await tick()

  if (!videoElement) {
    markVideoUnavailable()
    return
  }

  videoElement.defaultMuted = true
  videoElement.muted = true
  videoElement.playsInline = true
  setPlaybackRate()
  if (videoElement.readyState === HTMLMediaElement.HAVE_NOTHING) {
    videoElement.load()
  }
  clearPlaybackTimeout()
  playbackTimeout = window.setTimeout(markVideoUnavailable, 20_000)

  try {
    await videoElement.play()
    markVideoPlaying()
  } catch {
    markVideoUnavailable()
  }
}

function toggleVideo() {
  if (mediaState === 'playing') {
    videoElement?.pause()
    mediaState = 'paused'
    return
  }

  void startVideo()
}

function handleScroll() {
  if (mediaPolicy === 'reduced-motion') return
  driftY = Math.min(window.scrollY * 0.035, 72)
}

function handlePointerMove(event: PointerEvent) {
  if (mediaPolicy === 'reduced-motion') return
  pointerX = (event.clientX / window.innerWidth - 0.5) * 18
  pointerY = (event.clientY / window.innerHeight - 0.5) * 12
}

onMount(() => {
  const reducedMotionQuery = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  )
  let cancelAutomaticStart = () => {}
  let resumeWhenVisible = false

  function scheduleAutomaticStart() {
    cancelAutomaticStart()
    cancelAutomaticStart = scheduleRichMediaActivation(() => {
      if (document.visibilityState === 'visible') void startVideo()
    })
  }

  function applyMediaPolicy() {
    cancelAutomaticStart()
    cancelAutomaticStart = () => {}

    if (reducedMotionQuery.matches) {
      mediaPolicy = 'reduced-motion'
      videoElement?.pause()
      showVideo = false
      mediaState = 'poster'
      failureMessage = ''
    } else if (getRichMediaCapabilities().shouldAutoload) {
      mediaPolicy = 'automatic'
      scheduleAutomaticStart()
    } else {
      mediaPolicy = 'manual'
    }
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      resumeWhenVisible = mediaState === 'playing'
      videoElement?.pause()
    } else if (resumeWhenVisible && videoElement) {
      resumeWhenVisible = false
      videoElement.play().then(markVideoPlaying).catch(markVideoUnavailable)
    } else if (mediaPolicy === 'automatic' && mediaState === 'poster') {
      scheduleAutomaticStart()
    }
  }

  reducedMotionQuery.addEventListener('change', applyMediaPolicy)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  applyMediaPolicy()
  handleScroll()

  return () => {
    cancelAutomaticStart()
    reducedMotionQuery.removeEventListener('change', applyMediaPolicy)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('scroll', handleScroll)
    window.removeEventListener('pointermove', handlePointerMove)
    clearPlaybackTimeout()
    videoElement?.pause()
  }
})
</script>

<div
  class="pointer-events-none fixed inset-0 z-[1] overflow-hidden bg-slate-950"
  aria-hidden="true"
  data-archive-atmosphere
  data-archive-media-state={mediaState}
  data-archive-media-policy={mediaPolicy}
>
  <picture>
    <source
      media="(max-width: 760px), (max-height: 640px)"
      srcset={compactPosterSrc}
      type="image/webp"
    />
    <source srcset={posterSrcset} sizes="100vw" type="image/webp" />
    <img
      src={posterSrc}
      alt=""
      width="1920"
      height="1080"
      loading="eager"
      fetchpriority="high"
      decoding="async"
      class="absolute inset-0 h-full w-full object-cover blur-[1px] brightness-[0.72] contrast-125 saturate-[0.86]"
    />
  </picture>

  {#if showVideo}
    <video
      bind:this={videoElement}
      class={`absolute inset-0 h-full w-full object-cover blur-[1px] transition-opacity duration-700 ${mediaState === 'playing' ? 'opacity-85' : 'opacity-0'} brightness-[0.72] contrast-125 saturate-[0.86]`}
      loop
      muted
      playsinline
      preload="none"
      data-playback-rate={playbackRate}
      on:play={setPlaybackRate}
      on:playing={markVideoPlaying}
      on:error={markVideoUnavailable}
    >
      <source src={videoSrc} type="video/webm" on:error={markVideoUnavailable} />
    </video>
  {/if}

  <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,8,14,0.22),rgba(0,0,0,0.54)_58%,rgba(0,0,0,0.72))]"></div>
  <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.42),transparent_18%,transparent_82%,rgba(0,0,0,0.48))]"></div>

  <div
    class="absolute inset-[-10%] opacity-30 mix-blend-screen transition-transform duration-500 ease-out [background-image:linear-gradient(rgba(94,234,212,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.08)_1px,transparent_1px)] [background-size:5.5rem_5.5rem]"
    style={`transform: translate3d(${pointerX * 0.5}px, ${driftY + pointerY * 0.5}px, 0);`}
  ></div>

  <div
    class="absolute inset-x-[-6%] top-[20%] h-px bg-cyan-200/22 blur-[1px] transition-transform duration-500 ease-out"
    style={`transform: translate3d(${pointerX * -0.35}px, ${driftY * 0.45}px, 0);`}
  ></div>
  <div
    class="absolute inset-x-[-6%] top-[55%] h-px bg-sky-300/16 blur-[1px] transition-transform duration-500 ease-out"
    style={`transform: translate3d(${pointerX * 0.25}px, ${driftY * 0.32}px, 0);`}
  ></div>

  <div class="absolute inset-0 opacity-[0.16] mix-blend-screen [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.14)_0_1px,transparent_1px_6px)]"></div>
  <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.32)_42%,rgba(0,0,0,0.62))]"></div>
</div>

{#if (mediaPolicy === 'manual' && mediaState === 'poster') || mediaState === 'playing' || mediaState === 'paused'}
  <button
    type="button"
    class="fixed bottom-4 right-4 z-[70] rounded-full border border-cyan-100/30 bg-slate-950/88 px-4 py-2 font-mono text-xs font-bold text-cyan-50 shadow-xl backdrop-blur transition hover:border-cyan-100/60 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
    on:click={toggleVideo}
    data-archive-motion-control
  >
    {mediaState === 'playing'
      ? 'Pause archive background'
      : mediaState === 'paused'
        ? 'Resume archive background'
        : 'Play archive background'}
  </button>
{:else if mediaState === 'unavailable'}
  <div
    class="fixed bottom-4 right-4 z-[70] max-w-xs rounded-lg border border-amber-200/35 bg-slate-950/92 p-3 font-mono text-xs text-slate-100 shadow-xl backdrop-blur"
    role="status"
    data-archive-media-failure
  >
    <p>{failureMessage}</p>
    <button
      type="button"
      class="mt-2 rounded border border-cyan-100/30 px-3 py-1.5 font-bold text-cyan-50 transition hover:border-cyan-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
      on:click={startVideo}
    >
      Retry motion
    </button>
  </div>
{/if}
