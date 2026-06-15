<script lang="ts">
import { siteSfxManager } from '@/utils/site-sfx'
import { onDestroy, onMount } from 'svelte'
import { homePortalEvents } from '../../contracts/homePortal'
import '../../styles/features/extracted/home-intro-environment.css'

type HomeIntroEnvironmentComponent =
  typeof import('./HomeIntroEnvironment.svelte').default

let Environment: HomeIntroEnvironmentComponent | null = null
let cleanupCallbacks: Array<() => void> = []
let loadStarted = false
let awakenSfxPlayed = false
let showLoadingWindow = false
let loadFailed = false
const loadingWindowDelayMs = 900

function addCleanup(callback: () => void) {
  cleanupCallbacks.push(callback)
}

function cleanupAll() {
  cleanupCallbacks.forEach(callback => callback())
  cleanupCallbacks = []
}

function isDirectAudioIntent(event?: Event): boolean {
  return (
    event?.type === 'click' ||
    event?.type === 'pointerdown' ||
    event?.type === 'keydown' ||
    event?.type === 'touchstart'
  )
}

function playPortalAwakenSfx(options: { unlockFromGesture?: boolean } = {}) {
  if (awakenSfxPlayed || typeof window === 'undefined') return

  awakenSfxPlayed = true
  if (options.unlockFromGesture) {
    void siteSfxManager.unlockFromGesture().then(unlocked => {
      if (unlocked) siteSfxManager.play('portal-awaken')
    })
    return
  }

  siteSfxManager.playIfUnlocked('portal-awaken')
}

async function loadEnvironment(options: { unlockFromGesture?: boolean } = {}) {
  if (loadStarted) return
  loadStarted = true
  playPortalAwakenSfx({ unlockFromGesture: options.unlockFromGesture })
  cleanupAll()

  try {
    Environment = (await import('./HomeIntroEnvironment.svelte')).default
  } catch (error) {
    loadFailed = true
    showLoadingWindow = true
    console.error('Failed to load portal environment:', error)
  }
}

function waitForIntent() {
  const controller = new AbortController()
  const { signal } = controller
  const start = (event?: Event) => {
    void loadEnvironment({ unlockFromGesture: isDirectAudioIntent(event) })
  }

  window.addEventListener(homePortalEvents.portalAdvance, start, { signal })
  window.addEventListener('click', start, { signal })
  window.addEventListener('pointerdown', start, {
    signal,
    passive: true,
  })
  window.addEventListener('keydown', start, { signal })
  window.addEventListener('touchstart', start, {
    signal,
    passive: true,
  })
  window.addEventListener('wheel', start, { signal, passive: true })
  window.addEventListener('touchmove', start, {
    signal,
    passive: true,
  })
  window.addEventListener(
    'scroll',
    () => {
      if (window.scrollY > 80) start()
    },
    { signal, passive: true },
  )

  addCleanup(() => controller.abort())
}

function scheduleAutoload() {
  let firstFrame = 0
  let secondFrame = 0
  let idleId = 0
  let fallbackTimeout = 0

  const startWhenIdle = () => {
    fallbackTimeout = window.setTimeout(() => {
      void loadEnvironment()
    }, 1400)

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(
        () => {
          window.clearTimeout(fallbackTimeout)
          void loadEnvironment()
        },
        { timeout: 2200 },
      )
    }
  }

  firstFrame = window.requestAnimationFrame(() => {
    secondFrame = window.requestAnimationFrame(startWhenIdle)
  })

  addCleanup(() => {
    window.cancelAnimationFrame(firstFrame)
    window.cancelAnimationFrame(secondFrame)
    window.clearTimeout(fallbackTimeout)
    if (idleId) {
      window.cancelIdleCallback(idleId)
    }
  })
}

function scheduleLoadingWindow() {
  const timeout = window.setTimeout(() => {
    if (!Environment) showLoadingWindow = true
  }, loadingWindowDelayMs)

  addCleanup(() => window.clearTimeout(timeout))
}

onMount(() => {
  scheduleLoadingWindow()
  waitForIntent()
  scheduleAutoload()
})

onDestroy(() => {
  cleanupAll()
})
</script>

{#if Environment}
  <svelte:component this={Environment} />
{:else}
  <div class="home-intro-environment-loader__placeholder">
    {#if showLoadingWindow}
      <div
        class="home-intro-environment-loader__panel"
        role="status"
        aria-live="polite"
      >
        <div class="home-intro-environment-loader__signal" aria-hidden="true">
          <span></span>
        </div>
        <div class="home-intro-environment-loader__copy">
          <p class="home-intro-environment-loader__kicker">
            Commercial Portal
          </p>
          <p class="home-intro-environment-loader__title">
            {loadFailed ? 'Signal Interrupted' : 'Signal Acquisition'}
          </p>
          <p class="home-intro-environment-loader__text">
            {loadFailed
              ? 'Portal systems are refusing the handshake.'
              : 'Broadcast systems warming.'}
          </p>
        </div>
      </div>
    {/if}
  </div>
{/if}
