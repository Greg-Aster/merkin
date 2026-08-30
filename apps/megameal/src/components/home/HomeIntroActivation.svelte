<script lang="ts">
import { homePortalEvents } from '@/contracts/homePortal'
import {
  getRichMediaCapabilities,
  scheduleRichMediaActivation,
} from '@/utils/richMediaCapabilities'
import { onMount } from 'svelte'

type ActivationState = 'standby' | 'loading' | 'ready' | 'unavailable'
type HomeIntroEnvironmentComponent =
  typeof import('./HomeIntroEnvironment.svelte').default

let activationState: ActivationState = 'standby'
let EnvironmentComponent: HomeIntroEnvironmentComponent | null = null

function supportsWebGl() {
  try {
    const canvas = document.createElement('canvas')
    const options = {
      alpha: true,
      antialias: false,
      failIfMajorPerformanceCaveat: false,
    }
    const context =
      canvas.getContext('webgl2', options) ??
      canvas.getContext('webgl', options)

    if (!context) return false

    context.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

function handleSceneError(_error: unknown) {
  EnvironmentComponent = null
  activationState = 'unavailable'
}

onMount(() => {
  let disposed = false
  let cancelScheduledActivation = () => {}

  const removeIntentListeners = () => {
    window.removeEventListener('pointerdown', activateFromIntent)
    window.removeEventListener('touchstart', activateFromIntent)
    window.removeEventListener('wheel', activateFromIntent)
    window.removeEventListener('keydown', activateFromIntent)
    window.removeEventListener(
      homePortalEvents.portalAdvance,
      activateFromIntent,
    )
  }

  const clearScheduledActivation = () => {
    cancelScheduledActivation()
    cancelScheduledActivation = () => {}
  }

  async function activate() {
    if (disposed || activationState !== 'standby') return

    clearScheduledActivation()
    removeIntentListeners()

    if (!supportsWebGl()) {
      activationState = 'unavailable'
      return
    }

    activationState = 'loading'
    try {
      const module = await import('./HomeIntroEnvironment.svelte')
      if (disposed) return

      EnvironmentComponent = module.default
      activationState = 'ready'
    } catch {
      if (disposed) return

      EnvironmentComponent = null
      activationState = 'unavailable'
    }
  }

  function activateFromIntent() {
    void activate()
  }

  window.addEventListener('pointerdown', activateFromIntent, { once: true })
  window.addEventListener('touchstart', activateFromIntent, {
    once: true,
    passive: true,
  })
  window.addEventListener('wheel', activateFromIntent, {
    once: true,
    passive: true,
  })
  window.addEventListener('keydown', activateFromIntent, { once: true })
  window.addEventListener(homePortalEvents.portalAdvance, activateFromIntent, {
    once: true,
  })

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches
  if (!prefersReducedMotion && getRichMediaCapabilities().shouldAutoload) {
    cancelScheduledActivation = scheduleRichMediaActivation(
      () => void activate(),
    )
  }

  return () => {
    disposed = true
    clearScheduledActivation()
    removeIntentListeners()
  }
})
</script>

<div
  class="megameal-home-intro__environment"
  aria-hidden="true"
  data-home-intro-activation={activationState}
>
  {#if EnvironmentComponent && activationState === 'ready'}
    <svelte:boundary onerror={handleSceneError}>
      <svelte:component this={EnvironmentComponent} />
    </svelte:boundary>
  {:else if activationState === 'unavailable'}
    <p
      class="absolute bottom-4 left-1/2 -translate-x-1/2 rounded bg-slate-950/80 px-3 py-2 text-center font-mono text-xs text-slate-100"
    >
      Interactive portal unavailable. Continue below.
    </p>
  {/if}
</div>

{#if activationState === 'unavailable'}
  <p class="megameal-home-intro__screen-reader-copy" role="status">
    The interactive portal could not start. The rest of the site remains available below.
  </p>
{/if}
