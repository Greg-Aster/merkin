<script lang="ts">
import { onMount } from 'svelte'

let isMobile = false
let isFullScreen = false
let supportsFullscreen = false

function getFullscreenElement(): Element | null {
  return (
    document.fullscreenElement ||
    (document as Document & { webkitFullscreenElement?: Element })
      .webkitFullscreenElement ||
    null
  )
}

function getViewportElement(): HTMLElement {
  return document.getElementById('game-viewport') ?? document.documentElement
}

function syncViewportHeight() {
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight
  document.documentElement.style.setProperty(
    '--game-dvh',
    `${viewportHeight}px`,
  )
}

function nudgeBrowserChromeAway() {
  window.setTimeout(() => {
    window.scrollTo(0, 1)
    syncViewportHeight()
  }, 80)
}

async function toggleFullScreen() {
  const viewport = getViewportElement()
  const fullscreenTarget = viewport as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void
  }
  const fullscreenDocument = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void
  }

  try {
    if (!getFullscreenElement()) {
      if (viewport.requestFullscreen) {
        await viewport.requestFullscreen()
      } else if (fullscreenTarget.webkitRequestFullscreen) {
        await fullscreenTarget.webkitRequestFullscreen()
      }
    } else if (document.exitFullscreen) {
      await document.exitFullscreen()
    } else if (fullscreenDocument.webkitExitFullscreen) {
      await fullscreenDocument.webkitExitFullscreen()
    }
  } catch (error) {
    console.warn('Unable to toggle fullscreen mode:', error)
  }
}

function handleFullScreenChange() {
  isFullScreen = !!getFullscreenElement()
  syncViewportHeight()
}

onMount(() => {
  isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    )

  supportsFullscreen = Boolean(
    document.fullscreenEnabled ||
      (document as Document & { webkitFullscreenEnabled?: boolean })
        .webkitFullscreenEnabled ||
      document.documentElement.requestFullscreen ||
      (
        document.documentElement as HTMLElement & {
          webkitRequestFullscreen?: () => void
        }
      ).webkitRequestFullscreen,
  )

  syncViewportHeight()
  nudgeBrowserChromeAway()

  const viewport = window.visualViewport
  const resizeHandler = () => syncViewportHeight()

  viewport?.addEventListener('resize', resizeHandler)
  window.addEventListener('orientationchange', nudgeBrowserChromeAway)
  window.addEventListener('resize', resizeHandler)
  document.addEventListener('fullscreenchange', handleFullScreenChange)
  document.addEventListener(
    'webkitfullscreenchange',
    handleFullScreenChange as EventListener,
  )

  return () => {
    viewport?.removeEventListener('resize', resizeHandler)
    window.removeEventListener('orientationchange', nudgeBrowserChromeAway)
    window.removeEventListener('resize', resizeHandler)
    document.removeEventListener('fullscreenchange', handleFullScreenChange)
    document.removeEventListener(
      'webkitfullscreenchange',
      handleFullScreenChange as EventListener,
    )
  }
})
</script>

<svelte:head>
  <style>
    html, body {
      overscroll-behavior-y: contain;
    }

    :root {
      --game-dvh: 100vh;
    }

    #game-viewport {
      height: var(--game-dvh);
      min-height: var(--game-dvh);
    }
  </style>
</svelte:head>

{#if isMobile && supportsFullscreen}
  <button
    class="fullscreen-button"
    data-sfx-hover="hover-soft"
    data-sfx-click="panel-open"
    on:click|preventDefault|stopPropagation={toggleFullScreen}
    aria-label={isFullScreen ? 'Exit full-screen mode' : 'Enter full-screen mode'}
    data-mobile-ui="true"
  >
    {#if isFullScreen}
      ⤢
    {:else}
      ⛶
    {/if}
  </button>
{/if}

<style>
  .fullscreen-button {
    position: fixed;
    top: 60px;
    left: 12px;
    z-index: 1000;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.24);
    background: rgba(10, 18, 28, 0.16);
    color: rgba(255, 255, 255, 0.82);
    font-size: 18px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0.34;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    transition: opacity 0.2s ease, background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
  }

  .fullscreen-button:active {
    transform: scale(0.96);
    opacity: 0.72;
    background: rgba(26, 42, 58, 0.38);
    border-color: rgba(255, 255, 255, 0.48);
  }
 </style>
