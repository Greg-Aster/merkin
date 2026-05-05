<script lang="ts">
import { onDestroy, onMount } from 'svelte'
import { siteSfxManager } from '@/utils/site-sfx'

type HomeIntroEnvironmentComponent =
  typeof import('./HomeIntroEnvironment.svelte').default

let Environment: HomeIntroEnvironmentComponent | null = null
let cleanupCallbacks: Array<() => void> = []
let loadStarted = false
let awakenSfxPlayed = false

function addCleanup(callback: () => void) {
  cleanupCallbacks.push(callback)
}

function cleanupAll() {
  cleanupCallbacks.forEach((callback) => callback())
  cleanupCallbacks = []
}

function shouldAutoloadEnvironment() {
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string }
  }).connection
  const effectiveType = connection?.effectiveType ?? ''
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory

  return !(
    connection?.saveData === true ||
    /(^|-)2g$/.test(effectiveType) ||
    effectiveType === '3g' ||
    (typeof deviceMemory === 'number' && deviceMemory <= 2)
  )
}

function playPortalAwakenSfx() {
  if (awakenSfxPlayed || typeof window === 'undefined') return

  awakenSfxPlayed = true
  void siteSfxManager.unlockFromGesture().finally(() => {
    siteSfxManager.play('portal-awaken')
  })
}

async function loadEnvironment() {
  if (loadStarted) return
  loadStarted = true
  playPortalAwakenSfx()
  cleanupAll()
  Environment = (await import('./HomeIntroEnvironment.svelte')).default
}

function waitForIntent() {
  const controller = new AbortController()
  const { signal } = controller
  const start = () => {
    void loadEnvironment()
  }

  window.addEventListener('merkin:portal-advance', start, { signal })
  window.addEventListener('pointerdown', start, { signal, passive: true })
  window.addEventListener('keydown', start, { signal })
  window.addEventListener('wheel', start, { signal, passive: true })
  window.addEventListener('touchmove', start, { signal, passive: true })
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

onMount(() => {
  waitForIntent()
  if (shouldAutoloadEnvironment()) {
    scheduleAutoload()
  }
})

onDestroy(() => {
  cleanupAll()
})
</script>

{#if Environment}
  <svelte:component this={Environment} />
{:else}
  <div class="home-intro-environment-loader__placeholder" aria-hidden="true"></div>
{/if}

<style>
  .home-intro-environment-loader__placeholder {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    overflow: hidden;
    background:
      radial-gradient(circle at 50% 44%, rgb(8 47 73 / 0.36), transparent 62%),
      linear-gradient(180deg, rgb(2 6 23), rgb(3 7 18));
  }
</style>
