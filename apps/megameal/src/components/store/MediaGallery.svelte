<script lang="ts">
import { onDestroy, onMount } from 'svelte'
import '../../styles/features/store/media-gallery.css'

export interface MediaItem {
  type: 'image' | 'video' | 'youtube'
  src?: string
  videoId?: string
  poster?: string
  alt?: string
  caption?: string
}

interface Props {
  items: MediaItem[]
  autoPlayInterval?: number
  class?: string
}

const {
  items = [],
  autoPlayInterval = 5000,
  class: className = '',
}: Props = $props()

let currentIndex = $state(0)
let isPaused = $state(false)
let isYoutubePlaying = $state(false)
let timer: ReturnType<typeof setInterval> | null = null
let touchStartX = 0
let videoEl = $state<HTMLVideoElement | null>(null)

const hasMultiple = $derived(items.length > 1)

function goTo(index: number) {
  if (index === currentIndex) return
  if (videoEl) videoEl.pause()
  isYoutubePlaying = false
  currentIndex = ((index % items.length) + items.length) % items.length
  resetTimer()
}

function next() {
  goTo(currentIndex + 1)
}
function prev() {
  goTo(currentIndex - 1)
}

function resetTimer() {
  if (timer) clearInterval(timer)
  if (items.length <= 1) return
  timer = setInterval(() => {
    if (!isPaused && !isYoutubePlaying) next()
  }, autoPlayInterval)
}

function handleVideoEnd() {
  if (items.length > 1) next()
}

function handleMessage(e: MessageEvent) {
  try {
    const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
    if (data?.event === 'onStateChange') {
      if (data.info === 1) {
        isYoutubePlaying = true
        isPaused = true
      }
      if (data.info === 0 || data.info === 2) {
        isYoutubePlaying = false
        isPaused = false
      }
    }
  } catch {
    /* ignore malformed postMessages */
  }
}

onMount(() => {
  resetTimer()
  window.addEventListener('message', handleMessage)
})

onDestroy(() => {
  if (timer) clearInterval(timer)
  if (typeof window !== 'undefined') {
    window.removeEventListener('message', handleMessage)
  }
})

function thumbBg(item: MediaItem): string {
  if (item.type === 'image' && item.src)
    return `background-image:url('${item.src}')`
  if (item.type === 'video' && item.poster)
    return `background-image:url('${item.poster}')`
  if (item.type === 'youtube' && item.videoId)
    return `background-image:url('https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg')`
  return ''
}

function isVideoType(item: MediaItem) {
  return item.type === 'youtube' || item.type === 'video'
}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class={['media-gallery relative select-none overflow-hidden rounded-[var(--radius-large)] bg-slate-900', className].filter(Boolean).join(' ')}
  role="application"
  aria-roledescription="carousel"
  aria-label="Product media gallery"
  onmouseenter={() => { isPaused = true }}
  onmouseleave={() => { isPaused = false }}
  onkeydown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); next() } if (e.key === 'ArrowLeft') { e.preventDefault(); prev() } }}
  ontouchstart={(e) => { touchStartX = e.touches[0].clientX }}
  ontouchend={(e) => { const dx = e.changedTouches[0].clientX - touchStartX; if (Math.abs(dx) > 40) dx < 0 ? next() : prev() }}
  tabindex="0"
>
  <!-- Main stage -->
  <div class="media-stage relative w-full aspect-video">
    {#each items as item, i}
      <div
        class={[
          'absolute inset-0 transition-opacity duration-500',
          i === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        ].join(' ')}
        aria-hidden={i !== currentIndex}
      >
        {#if item.type === 'image'}
          <img
            src={item.src}
            alt={item.alt ?? 'Product image'}
            class="w-full h-full object-contain bg-slate-900"
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        {:else if item.type === 'video'}
          <video
            bind:this={videoEl}
            src={item.src}
            poster={item.poster}
            autoplay={i === currentIndex}
            muted
            playsinline
            onended={handleVideoEnd}
            onplay={() => { isPaused = true }}
            onpause={() => { isPaused = false }}
            class="w-full h-full object-contain bg-slate-900"
          >
            <track kind="captions" />
          </video>
        {:else if item.type === 'youtube'}
          {#if i === currentIndex}
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${item.videoId}?enablejsapi=1&rel=0&modestbranding=1`}
              title={item.caption ?? item.alt ?? 'Product video'}
              class="w-full h-full"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
          {:else}
            <div
              class="w-full h-full bg-cover bg-center bg-slate-800"
              style={`background-image:url('https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg')`}
            >
              <div class="w-full h-full flex items-center justify-center bg-black/30">
                <div class="w-16 h-16 rounded-full bg-red-600/90 flex items-center justify-center shadow-xl">
                  <svg viewBox="0 0 24 24" fill="white" class="w-8 h-8 ml-1"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
            </div>
          {/if}
        {/if}

        {#if item.caption}
          <div class="absolute bottom-0 left-0 right-0 px-4 py-2 bg-gradient-to-t from-black/70 to-transparent text-xs text-white/80 italic z-20">
            {item.caption}
          </div>
        {/if}
      </div>
    {/each}

    <!-- Prev/Next -->
    {#if hasMultiple}
      <button
        onclick={(e) => { e.stopPropagation(); prev() }}
        class="gallery-nav absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center transition"
        aria-label="Previous"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
      </button>
      <button
        onclick={(e) => { e.stopPropagation(); next() }}
        class="gallery-nav absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center transition"
        aria-label="Next"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
      </button>

      <!-- Counter -->
      <div class="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-black/50 text-white text-xs font-mono">
        {currentIndex + 1}/{items.length}
      </div>

      <!-- Progress bar -->
      {#if !isYoutubePlaying}
        <div class="absolute bottom-0 left-0 right-0 z-20 h-0.5 bg-white/10">
          <div class="h-full bg-[var(--primary)]" style={`width:${((currentIndex + 1) / items.length) * 100}%`}></div>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Thumbnail strip -->
  {#if hasMultiple}
    <div class="flex gap-1.5 px-2 py-2 bg-slate-950/60 overflow-x-auto scrollbar-none" role="tablist">
      {#each items as item, i}
        <button
          role="tab"
          aria-selected={i === currentIndex}
          aria-label={`View item ${i + 1}`}
          onclick={(e) => { e.stopPropagation(); goTo(i) }}
          class={[
            'relative flex-shrink-0 w-14 h-10 rounded overflow-hidden border-2 transition',
            i === currentIndex ? 'border-[var(--primary)] opacity-100' : 'border-transparent opacity-50 hover:opacity-75'
          ].join(' ')}
        >
          <div class="w-full h-full bg-cover bg-center bg-slate-700" style={thumbBg(item)}></div>
          {#if isVideoType(item)}
            <div class="absolute inset-0 flex items-center justify-center bg-black/30">
              {#if item.type === 'youtube'}
                <div class="w-4 h-4 rounded-sm bg-red-600 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="white" class="w-2.5 h-2.5 ml-px"><path d="M8 5v14l11-7z"/></svg>
                </div>
              {:else}
                <svg viewBox="0 0 24 24" fill="white" class="w-4 h-4 opacity-80"><path d="M8 5v14l11-7z"/></svg>
              {/if}
            </div>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

