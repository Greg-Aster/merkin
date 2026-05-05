<script lang="ts">
import { onDestroy, onMount } from 'svelte'

type HomeIntroEnvironmentComponent =
  typeof import('./HomeIntroEnvironment.svelte').default

let Environment: HomeIntroEnvironmentComponent | null = null
let cleanup: (() => void) | null = null
let loadStarted = false

async function loadEnvironment() {
  if (loadStarted) return
  loadStarted = true
  cleanup?.()
  cleanup = null
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
  waitForIntent()
})

onDestroy(() => {
  cleanup?.()
})
</script>

{#if Environment}
  <svelte:component this={Environment} />
{:else}
  <img
    class="home-intro-environment-loader__still"
    src="/assets/banner/home-intro-stills/home-intro.webp"
    alt=""
    loading="eager"
    decoding="async"
    fetchpriority="low"
    aria-hidden="true"
  />
{/if}

<style>
  .home-intro-environment-loader__still {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    opacity: 0.72;
    filter: saturate(1.05) contrast(1.04);
  }
</style>
