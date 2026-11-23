<script lang="ts">
import { onDestroy, onMount, tick } from 'svelte'

type AvatarSource = string | { src?: string }

interface RuntimeAuthorContext {
  slug: string
  customAvatar: string
  customName: string
  customBio: string
  customLink: string
  isHomePage: boolean
}

interface LayoutStateDetail {
  isOneColumn: boolean
  isFullscreen: boolean
}

export let slug = ''
export let customAvatar = ''
export let customName = ''
export let customBio = ''
export let customLink = ''
export let isHomePage = false
export let sidebarVisible = true
export let profileConfig: any = {}
export let avatarConfig: any = {}

let runtimeAuthorContext: RuntimeAuthorContext | null = null
let currentAvatarIndex = 0
let animationDirection = 1
let animationTimer: number | null = null
let isCompactViewport = false
let isSidebarVisible = sidebarVisible
let isVisible = false
let mediaActive = false
let mediaFailed = false
let mediaRenderKey = 0
let mounted = false
let ownerElement: HTMLDivElement | null = null
let panelElement: HTMLDivElement | null = null
let triggerElement: HTMLButtonElement | null = null
let closeElement: HTMLButtonElement | null = null

$: effectiveSlug = runtimeAuthorContext?.slug ?? slug
$: effectiveCustomAvatar = runtimeAuthorContext?.customAvatar ?? customAvatar
$: effectiveCustomName = runtimeAuthorContext?.customName ?? customName
$: effectiveCustomBio = runtimeAuthorContext?.customBio ?? customBio
$: effectiveCustomLink = runtimeAuthorContext?.customLink ?? customLink
$: effectiveIsHomePage = runtimeAuthorContext?.isHomePage ?? isHomePage

$: displayName = effectiveCustomName || profileConfig?.name || 'Author'
$: displayBio = effectiveCustomBio || profileConfig?.bio || ''
$: displayLink = normalizeBaseUrl(effectiveCustomLink || '/about/')
$: avatarSources = normalizeAvatarList(avatarConfig?.avatarList)
$: useDefaultAvatars = !effectiveCustomAvatar
$: activeAvatarIndex = effectiveIsHomePage || !useDefaultAvatars
  ? 0
  : getAvatarIndexFromSlug(effectiveSlug, avatarSources.length || 1)
$: hasMultipleAvatars =
  useDefaultAvatars && !effectiveIsHomePage && avatarSources.length > 1
$: currentAvatarSource = resolveCurrentAvatarSource()
$: currentAvatarAlt = effectiveCustomAvatar
  ? `Profile image of ${displayName}`
  : hasMultipleAvatars
    ? 'Profile image of the author'
    : 'Profile image of the site owner'

function normalizeBaseUrl(path: string): string {
  if (!path) return ''
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('//') ||
    path.startsWith('data:')
  ) {
    return path
  }

  const normalizedBase = import.meta.env.BASE_URL || '/'
  const trimmedBase = normalizedBase.endsWith('/')
    ? normalizedBase.slice(0, -1)
    : normalizedBase

  if (!path.startsWith('/')) return path
  if (trimmedBase && path.startsWith(`${trimmedBase}/`)) return path
  return `${trimmedBase}${path}`.replace(/\/+/g, '/')
}

function normalizeAvatarSource(source: AvatarSource | null | undefined) {
  if (!source) return ''
  const resolved = typeof source === 'string' ? source : source.src || ''
  return normalizeBaseUrl(resolved)
}

function normalizeAvatarList(sources: AvatarSource[] | null | undefined) {
  if (!Array.isArray(sources)) return []
  return sources.map(normalizeAvatarSource).filter(Boolean)
}

function resolveCurrentAvatarSource() {
  if (effectiveCustomAvatar) return normalizeAvatarSource(effectiveCustomAvatar)
  if (effectiveIsHomePage && avatarConfig?.homeAvatar) {
    return normalizeAvatarSource(avatarConfig.homeAvatar)
  }
  return avatarSources[currentAvatarIndex] || avatarSources[activeAvatarIndex] || ''
}

function getAvatarIndexFromSlug(value: string, arrayLength: number) {
  if (!value || arrayLength <= 1) return 0

  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash &= hash
  }
  return Math.abs(hash) % arrayLength
}

function isVideoFile(source: string) {
  return /\.(mp4|webm|mov|avi)(\?|$)/i.test(source)
}

function stopAvatarAnimation() {
  if (animationTimer === null) return
  window.clearInterval(animationTimer)
  animationTimer = null
}

function restartAvatarAnimation(resetIndex = false) {
  stopAvatarAnimation()
  if (resetIndex) {
    currentAvatarIndex = activeAvatarIndex
    animationDirection = 1
  }
  if (!mounted || !mediaActive || !hasMultipleAvatars) return

  const interval = Math.max(Number(avatarConfig?.animationInterval) || 3500, 1000)
  animationTimer = window.setInterval(() => {
    let nextIndex = currentAvatarIndex + animationDirection
    if (nextIndex >= avatarSources.length) {
      animationDirection = -1
      nextIndex = Math.max(avatarSources.length - 2, 0)
    } else if (nextIndex < 0) {
      animationDirection = 1
      nextIndex = Math.min(1, avatarSources.length - 1)
    }
    currentAvatarIndex = nextIndex
    mediaFailed = false
    mediaRenderKey += 1
  }, interval)
}

function releaseVideo(video: HTMLVideoElement) {
  video.pause()
  video.removeAttribute('src')
  video.load()
}

function registerVideo(video: HTMLVideoElement) {
  const videoConfig = avatarConfig?.videoConfig || {}
  const playbackRate = Number(videoConfig.playbackRate) || 0.5
  const shouldLoop = videoConfig.loop ?? true
  const loopDelay = Number(videoConfig.loopDelay) || 0
  const playOnce = videoConfig.playOnce || false
  let loopTimer: number | null = null

  const configure = () => {
    video.playbackRate = playbackRate
    video.loop = shouldLoop && loopDelay === 0 && !playOnce
  }

  const handleEnded = () => {
    if (playOnce) return
    if (!shouldLoop || loopDelay <= 0) return
    loopTimer = window.setTimeout(() => {
      video.currentTime = 0
      void video.play().catch(() => {
        mediaFailed = true
      })
    }, loopDelay)
  }

  const handleError = () => {
    mediaFailed = true
  }

  video.addEventListener('loadedmetadata', configure)
  video.addEventListener('ended', handleEnded)
  video.addEventListener('error', handleError)
  if (video.readyState >= 1) configure()

  return {
    destroy() {
      if (loopTimer !== null) window.clearTimeout(loopTimer)
      video.removeEventListener('loadedmetadata', configure)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('error', handleError)
      releaseVideo(video)
    },
  }
}

function setMediaActive(nextActive: boolean) {
  if (mediaActive === nextActive) return
  mediaActive = nextActive
  mediaFailed = false
  mediaRenderKey += 1
  restartAvatarAnimation(nextActive)
}

function openProfile() {
  isVisible = true
  setMediaActive(true)
  void tick().then(() => {
    window.requestAnimationFrame(() => {
      const closeButton =
        closeElement ||
        panelElement?.querySelector<HTMLButtonElement>('[aria-label="Close profile"]')
      closeButton?.focus()
    })
  })
}

function closeProfile({ restoreFocus = true } = {}) {
  if (!isVisible) return
  isVisible = false
  if (isCompactViewport) setMediaActive(false)
  if (restoreFocus) {
    void tick().then(() => {
      window.requestAnimationFrame(() => {
        const triggerButton =
          triggerElement ||
          ownerElement?.querySelector<HTMLButtonElement>('[aria-label="Open profile"]')
        triggerButton?.focus()
      })
    })
  }
}

function toggleProfile() {
  if (isVisible) closeProfile()
  else openProfile()
}

function syncAuthorContextFromDOM() {
  const contextElement = document.getElementById('author-context')
  if (!(contextElement instanceof HTMLElement)) return

  runtimeAuthorContext = {
    slug: contextElement.dataset.slug || '',
    customAvatar: contextElement.dataset.customAvatar || '',
    customName: contextElement.dataset.customName || '',
    customBio: contextElement.dataset.customBio || '',
    customLink: contextElement.dataset.customLink || '',
    isHomePage: contextElement.dataset.isHomePage === 'true',
  }
  void tick().then(() => restartAvatarAnimation(true))
}

function handleProfileToggle() {
  if (isCompactViewport) toggleProfile()
  else panelElement?.focus()
}

function handleDocumentClick(event: MouseEvent) {
  if (!isVisible || !(event.target instanceof Node)) return
  if (ownerElement?.contains(event.target)) return
  closeProfile({ restoreFocus: false })
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isVisible) closeProfile()
}

function retryMedia() {
  mediaFailed = false
  mediaRenderKey += 1
}

function syncMediaAdmission() {
  setMediaActive((!isCompactViewport && isSidebarVisible) || isVisible)
}

function syncLayoutStateFromDOM() {
  const sidebarState = document.getElementById('main-grid')?.dataset.sidebar
  isSidebarVisible =
    sidebarState !== 'hidden' && !document.body.classList.contains('fullscreen-mode')
  if (!isCompactViewport && !isSidebarVisible) isVisible = false
  syncMediaAdmission()
}

onMount(() => {
  mounted = true
  currentAvatarIndex = activeAvatarIndex
  syncAuthorContextFromDOM()

  const mediaQuery = window.matchMedia('(max-width: 767px)')
  const syncViewport = () => {
    isCompactViewport = mediaQuery.matches
    if (!isCompactViewport) isVisible = false
    syncMediaAdmission()
  }
  const handleAuthorContext = (event: Event) => {
    const customEvent = event as CustomEvent<RuntimeAuthorContext>
    if (!customEvent.detail) return
    runtimeAuthorContext = customEvent.detail
    void tick().then(() => restartAvatarAnimation(true))
  }
  const handleLayoutState = (event: Event) => {
    const customEvent = event as CustomEvent<LayoutStateDetail>
    if (!customEvent.detail) return
    isSidebarVisible =
      !customEvent.detail.isOneColumn && !customEvent.detail.isFullscreen
    if (!isCompactViewport && !isSidebarVisible) isVisible = false
    syncMediaAdmission()
  }
  const handlePageLoad = () => {
    syncAuthorContextFromDOM()
    syncLayoutStateFromDOM()
  }

  syncViewport()
  syncLayoutStateFromDOM()
  mediaQuery.addEventListener('change', syncViewport)
  window.addEventListener('merkin:author-context', handleAuthorContext)
  document.addEventListener('blog-core:layout-state', handleLayoutState)
  document.addEventListener('astro:page-load', handlePageLoad)
  document.addEventListener('profile:toggle', handleProfileToggle)
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleDocumentKeydown)

  return () => {
    mediaQuery.removeEventListener('change', syncViewport)
    window.removeEventListener('merkin:author-context', handleAuthorContext)
    document.removeEventListener('blog-core:layout-state', handleLayoutState)
    document.removeEventListener('astro:page-load', handlePageLoad)
    document.removeEventListener('profile:toggle', handleProfileToggle)
    document.removeEventListener('click', handleDocumentClick)
    document.removeEventListener('keydown', handleDocumentKeydown)
  }
})

onDestroy(() => {
  mounted = false
  stopAvatarAnimation()
})
</script>

<div
  class="responsive-profile-owner"
  class:responsive-profile-owner--sidebar-hidden={!isSidebarVisible}
  bind:this={ownerElement}
>
  <button
    bind:this={triggerElement}
    type="button"
    class="profile-mobile-trigger btn-regular md:hidden"
    aria-label="Open profile"
    aria-controls="responsive-profile-panel"
    aria-expanded={isVisible}
    on:click={toggleProfile}
  >
    <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM5 21a7 7 0 0114 0" />
    </svg>
  </button>

  <div
    bind:this={panelElement}
    id="responsive-profile-panel"
    class="responsive-profile-panel"
    class:responsive-profile-panel--open={isVisible}
    role={isCompactViewport ? 'dialog' : undefined}
    aria-modal={isCompactViewport ? 'true' : undefined}
    aria-label={isCompactViewport ? 'Profile' : undefined}
    tabindex="-1"
  >
    <div class="profile-mobile-heading md:hidden">
      <span>Profile</span>
      <button
        bind:this={closeElement}
        type="button"
        aria-label="Close profile"
        class="btn-plain flex h-8 w-8 items-center justify-center rounded-full"
        on:click={() => closeProfile()}
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>

    <div class="card-base p-3">
      <a
        aria-label="Go to About Page"
        href={displayLink}
        class="group relative mx-auto mb-3 mt-1 block max-w-[12rem] overflow-hidden rounded-xl active:scale-95 md:mx-0 md:mt-0 md:max-w-none"
      >
        <div class="pointer-events-none absolute z-50 flex h-full w-full items-center justify-center transition group-hover:bg-black/30 group-active:bg-black/50">
          <svg aria-hidden="true" class="h-12 w-12 scale-90 text-white opacity-0 transition group-hover:scale-100 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
          </svg>
        </div>

        <div class="relative aspect-square w-full overflow-hidden rounded-xl">
          {#if mediaActive && currentAvatarSource && !mediaFailed}
            {#key `${currentAvatarSource}:${mediaRenderKey}`}
              {#if isVideoFile(currentAvatarSource)}
                <video
                  use:registerVideo
                  src={currentAvatarSource}
                  aria-label={currentAvatarAlt}
                  class="avatar-image h-full w-full object-contain"
                  autoplay
                  muted
                  playsinline
                  disablePictureInPicture
                  preload="metadata"
                ></video>
              {:else}
                <img
                  src={currentAvatarSource}
                  alt={currentAvatarAlt}
                  class="avatar-image h-full w-full object-contain"
                  loading="eager"
                  on:error={() => (mediaFailed = true)}
                />
              {/if}
            {/key}
          {:else if mediaFailed}
            <div class="profile-media-placeholder" role="status">
              <span>Profile image unavailable.</span>
              <button type="button" class="btn-plain rounded-lg px-2 py-1 text-sm" on:click|preventDefault={retryMedia}>Retry</button>
            </div>
          {:else}
            <div class="profile-media-placeholder" aria-hidden="true">
              <svg class="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM5 21a7 7 0 0114 0" />
              </svg>
            </div>
          {/if}
        </div>
      </a>

      <div class="px-2">
        <div class="mb-1 text-center text-xl font-bold transition dark:text-neutral-50">{displayName}</div>
        <div class="mx-auto mb-2 h-1 w-5 rounded-full bg-[var(--primary)] transition"></div>
        <div class="mb-2.5 text-center text-neutral-400 transition">{displayBio}</div>
      </div>
    </div>
  </div>
</div>

<style>
  .responsive-profile-owner {
    display: contents;
  }

  .profile-mobile-trigger {
    position: fixed;
    top: 4.25rem;
    right: 0.75rem;
    z-index: 59;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.75rem;
  }

  .responsive-profile-panel {
    position: fixed;
    top: 4.25rem;
    right: 0.75rem;
    z-index: 60;
    width: min(17.5rem, calc(100vw - 1.5rem));
    max-height: calc(100svh - 5rem);
    overflow-y: auto;
    opacity: 0;
    transform: translateY(1rem);
    pointer-events: none;
    transition: opacity 180ms ease, transform 180ms ease;
  }

  .responsive-profile-panel--open {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  .profile-mobile-heading {
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.375rem;
    padding: 0.375rem 0.5rem;
    border-radius: 0.75rem;
    background: var(--card-bg);
    font-weight: 700;
  }

  .profile-media-placeholder {
    display: flex;
    width: 100%;
    height: 100%;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border-radius: 0.75rem;
    color: rgb(255 255 255 / 0.75);
    background: linear-gradient(135deg, #60a5fa, #8b5cf6);
    text-align: center;
  }

  .avatar-image {
    border-radius: 0.75rem;
    animation: profile-media-enter 220ms ease both;
  }

  @keyframes profile-media-enter {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (min-width: 768px) {
    .responsive-profile-owner {
      display: block;
    }

    .responsive-profile-owner--sidebar-hidden {
      display: none;
    }

    .profile-mobile-trigger {
      display: none;
    }

    .responsive-profile-panel {
      position: static;
      width: auto;
      max-height: none;
      overflow: visible;
      opacity: 1;
      transform: none;
      pointer-events: auto;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .responsive-profile-panel,
    .avatar-image {
      transition: none;
      animation: none;
    }
  }
</style>
