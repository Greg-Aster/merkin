<script lang="ts">
import {
  getRichMediaCapabilities,
  scheduleRichMediaActivation,
} from '@/utils/richMediaCapabilities'
import { onMount, tick } from 'svelte'

type TimelineBackgroundMediaState =
  | 'poster'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'unavailable'
type TimelineBackgroundMediaPolicy =
  | 'pending'
  | 'automatic'
  | 'manual'
  | 'reduced-motion'

export let videoSrc = '/assets/banner/universbg0001-0121.webm'
export let posterSrc = '/assets/banner/posters/universe-poster.webp'
export let playbackRate = 0.25

let container: HTMLDivElement | null = null
let video: HTMLVideoElement | null = null
let showVideo = false
let mediaState: TimelineBackgroundMediaState = 'poster'
let mediaPolicy: TimelineBackgroundMediaPolicy = 'pending'
let failureMessage = ''
let playbackTimeout = 0

function clearPlaybackTimeout() {
  if (!playbackTimeout) return
  window.clearTimeout(playbackTimeout)
  playbackTimeout = 0
}

function syncPlaybackRate() {
  if (!video) return
  video.defaultPlaybackRate = playbackRate
  video.playbackRate = playbackRate
}

function markPlaying() {
  clearPlaybackTimeout()
  failureMessage = ''
  mediaState = 'playing'
  syncPlaybackRate()
}

function markUnavailable() {
  clearPlaybackTimeout()
  video?.pause()
  mediaState = 'unavailable'
  failureMessage =
    'Timeline background motion could not start. The still background remains available.'
}

async function startVideo() {
  if (
    mediaPolicy === 'reduced-motion' ||
    mediaState === 'loading' ||
    mediaState === 'playing'
  )
    return

  failureMessage = ''
  mediaState = 'loading'
  showVideo = true
  await tick()

  if (!video) {
    markUnavailable()
    return
  }

  video.defaultMuted = true
  video.muted = true
  video.playsInline = true
  syncPlaybackRate()
  if (video.readyState === HTMLMediaElement.HAVE_NOTHING) video.load()
  clearPlaybackTimeout()
  playbackTimeout = window.setTimeout(markUnavailable, 20_000)

  try {
    await video.play()
    markPlaying()
  } catch {
    markUnavailable()
  }
}

export function start() {
  if (mediaPolicy === 'manual') void startVideo()
}

onMount(() => {
  const reducedMotionQuery = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  )
  let cancelAutomaticStart = () => {}
  let inView = true
  let resumeWhenActive = false

  function isActive() {
    return document.visibilityState === 'visible' && inView
  }

  function scheduleAutomaticStart() {
    cancelAutomaticStart()
    cancelAutomaticStart = scheduleRichMediaActivation(() => {
      if (isActive()) void startVideo()
    })
  }

  function applyPolicy() {
    cancelAutomaticStart()
    cancelAutomaticStart = () => {}

    if (reducedMotionQuery.matches) {
      mediaPolicy = 'reduced-motion'
      video?.pause()
      showVideo = false
      mediaState = 'poster'
      failureMessage = ''
    } else if (getRichMediaCapabilities().shouldAutoload) {
      mediaPolicy = 'automatic'
      if (mediaState === 'poster') scheduleAutomaticStart()
    } else {
      mediaPolicy = 'manual'
    }
  }

  function syncActivity() {
    if (!isActive()) {
      resumeWhenActive = mediaState === 'playing'
      video?.pause()
      return
    }

    if (resumeWhenActive && video) {
      resumeWhenActive = false
      video.play().then(markPlaying).catch(markUnavailable)
    } else if (mediaPolicy === 'automatic' && mediaState === 'poster') {
      scheduleAutomaticStart()
    }
  }

  const observer = new IntersectionObserver(entries => {
    inView = entries.some(entry => entry.isIntersecting)
    syncActivity()
  })
  if (container) observer.observe(container)
  reducedMotionQuery.addEventListener('change', applyPolicy)
  document.addEventListener('visibilitychange', syncActivity)
  applyPolicy()

  return () => {
    cancelAutomaticStart()
    observer.disconnect()
    reducedMotionQuery.removeEventListener('change', applyPolicy)
    document.removeEventListener('visibilitychange', syncActivity)
    clearPlaybackTimeout()
    video?.pause()
  }
})
</script>

<div
  bind:this={container}
  class="pointer-events-none absolute inset-0 z-0 overflow-hidden"
  data-timeline-background-video="universe"
  data-timeline-background-media-state={mediaState}
  data-timeline-background-media-policy={mediaPolicy}
  aria-hidden="true"
>
  <img
    class="h-full w-full object-cover brightness-[0.88] saturate-[1.12]"
    src={posterSrc}
    alt=""
    loading="eager"
    fetchpriority="high"
    decoding="async"
  />
  {#if showVideo}
    <video
      bind:this={video}
      class={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${mediaState === 'playing' ? 'opacity-100' : 'opacity-0'} brightness-[0.88] saturate-[1.12]`}
      muted
      loop
      playsinline
      preload="none"
      on:play={syncPlaybackRate}
      on:playing={markPlaying}
      on:error={markUnavailable}
    >
      <source src={videoSrc} type="video/webm" on:error={markUnavailable} />
    </video>
  {/if}
  <div class="absolute inset-0 bg-slate-950/20"></div>
</div>

{#if mediaState === 'unavailable'}
  <div
    class="pointer-events-auto absolute right-3 top-3 z-20 max-w-xs rounded-lg border border-amber-200/35 bg-slate-950/92 p-3 font-mono text-xs text-slate-100 shadow-xl backdrop-blur"
    role="status"
    data-timeline-background-media-failure
  >
    <p>{failureMessage}</p>
    <button
      type="button"
      class="mt-2 rounded border border-cyan-100/30 px-3 py-1.5 font-bold text-cyan-50 transition hover:border-cyan-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
      on:click={startVideo}
      data-timeline-interactive
    >
      Retry background motion
    </button>
  </div>
{/if}
