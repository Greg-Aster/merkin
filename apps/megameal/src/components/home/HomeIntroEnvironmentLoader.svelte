<script lang="ts">
import { onDestroy, onMount } from 'svelte'

type HomeIntroEnvironmentComponent =
  typeof import('./HomeIntroEnvironment.svelte').default

let Environment: HomeIntroEnvironmentComponent | null = null
let cleanup: (() => void) | null = null
let loadStarted = false

const mobileMediaQuery = '(max-width: 760px), (pointer: coarse)'

function getConnection() {
  return (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string }
  }).connection
}

function shouldDeferForDevice() {
  const connection = getConnection()
  const effectiveType = connection?.effectiveType ?? ''
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory
  const lowMemoryDevice =
    typeof deviceMemory === 'number' && deviceMemory <= 4

  return (
    window.matchMedia(mobileMediaQuery).matches ||
    connection?.saveData === true ||
    /(^|-)2g$/.test(effectiveType) ||
    effectiveType === '3g' ||
    lowMemoryDevice
  )
}

async function loadEnvironment() {
  if (loadStarted) return
  loadStarted = true
  cleanup?.()
  cleanup = null
  Environment = (await import('./HomeIntroEnvironment.svelte')).default
}

function scheduleWhenIdle() {
  if ('requestIdleCallback' in window) {
    const idleId = window.requestIdleCallback(() => {
      void loadEnvironment()
    }, { timeout: 2400 })
    cleanup = () => window.cancelIdleCallback(idleId)
    return
  }

  const timeoutId = window.setTimeout(() => {
    void loadEnvironment()
  }, 1200)
  cleanup = () => window.clearTimeout(timeoutId)
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
  window.addEventListener(
    'scroll',
    () => {
      if (window.scrollY > 80) start()
    },
    { signal, passive: true },
  )

  cleanup = () => controller.abort()
}

onMount(() => {
  if (shouldDeferForDevice()) {
    waitForIntent()
    return
  }

  scheduleWhenIdle()
})

onDestroy(() => {
  cleanup?.()
})
</script>

{#if Environment}
  <svelte:component this={Environment} />
{/if}
