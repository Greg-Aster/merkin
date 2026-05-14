<script lang="ts">
  import { onDestroy, onMount } from 'svelte'

  export let videoSrc = '/assets/banner/archive_1.webm'
  export let posterSrc = '/assets/banner/archive_still.png'
  export let playbackRate = 0.2

  let videoElement: HTMLVideoElement | null = null
  let driftY = 0
  let pointerX = 0
  let pointerY = 0
  let ready = false
  let reducedMotion = false

  const setPlaybackRate = () => {
    if (!videoElement) return
    if (Math.abs(videoElement.playbackRate - playbackRate) > 0.001) {
      videoElement.playbackRate = playbackRate
    }
  }

  const playVideo = () => {
    if (!videoElement) return
    videoElement.muted = true
    setPlaybackRate()
    ready = videoElement.readyState >= 2
    videoElement.play().catch(() => {})
  }

  const markVideoReady = () => {
    ready = true
    setPlaybackRate()
  }

  const handleScroll = () => {
    if (reducedMotion) return
    driftY = Math.min(window.scrollY * 0.035, 72)
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (reducedMotion) return
    pointerX = (event.clientX / window.innerWidth - 0.5) * 18
    pointerY = (event.clientY / window.innerHeight - 0.5) * 12
  }

  onMount(() => {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setPlaybackRate()
    playVideo()

    videoElement?.addEventListener('loadedmetadata', setPlaybackRate)
    videoElement?.addEventListener('play', setPlaybackRate)
    videoElement?.addEventListener('loadeddata', markVideoReady)
    videoElement?.addEventListener('canplay', markVideoReady)

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    handleScroll()

    return () => {
      videoElement?.removeEventListener('loadedmetadata', setPlaybackRate)
      videoElement?.removeEventListener('play', setPlaybackRate)
      videoElement?.removeEventListener('loadeddata', markVideoReady)
      videoElement?.removeEventListener('canplay', markVideoReady)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('pointermove', handlePointerMove)
    }
  })

  onDestroy(() => {
    videoElement?.pause()
  })
</script>

<div
  class="pointer-events-none fixed inset-0 z-[1] overflow-hidden bg-slate-950"
  aria-hidden="true"
  data-archive-atmosphere
>
  <video
    bind:this={videoElement}
    class={`absolute inset-0 h-full w-full object-cover blur-[1px] transition-opacity duration-700 ${ready ? 'opacity-85' : 'opacity-0'} brightness-[0.72] contrast-125 saturate-[0.86]`}
    autoplay
    loop
    muted
    playsinline
    preload="metadata"
    poster={posterSrc}
    data-playback-rate={playbackRate}
  >
    <source src={videoSrc} type="video/webm" />
  </video>

  <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,8,14,0.22),rgba(0,0,0,0.54)_58%,rgba(0,0,0,0.72))]"></div>
  <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.42),transparent_18%,transparent_82%,rgba(0,0,0,0.48))]"></div>

  <div
    class="absolute inset-[-10%] opacity-30 mix-blend-screen transition-transform duration-500 ease-out will-change-transform [background-image:linear-gradient(rgba(94,234,212,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.08)_1px,transparent_1px)] [background-size:5.5rem_5.5rem]"
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
