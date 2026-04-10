<script lang="ts">
import Icon from '@iconify/svelte/dist/Icon.svelte'
import { onMount } from 'svelte'
import {
  siteAudioManager,
  type SiteAudioState,
} from '../../utils/site-audio'

let audioState: SiteAudioState = {
  enabled: false,
  masterVolume: 1,
  ambienceVolume: 0.42,
  sfxVolume: 0.48,
  activeTrackId: null,
  activeTrackLabel: null,
  hasConfiguredTracks: false,
  suspended: false,
  suspensionReason: null,
}
let panelOpen = false
let panelElement: HTMLDivElement | null = null
let isMobileViewport = false

const syncAudioForCurrentPage = () => {
  if (typeof window === 'undefined') return
  siteAudioManager.syncForPath(window.location.pathname)
}

const toggleAudio = () => {
  siteAudioManager.unlockFromGesture()
  siteAudioManager.toggle()
}

const setMasterVolume = (event: Event) => {
  const target = event.currentTarget as HTMLInputElement | null
  if (!target) return
  siteAudioManager.setMasterVolume(Number(target.value))
}

const setAmbienceVolume = (event: Event) => {
  const target = event.currentTarget as HTMLInputElement | null
  if (!target) return
  siteAudioManager.setAmbienceVolume(Number(target.value))
}

const setSfxVolume = (event: Event) => {
  const target = event.currentTarget as HTMLInputElement | null
  if (!target) return
  siteAudioManager.setSfxVolume(Number(target.value))
}

const syncViewportMode = () => {
  if (typeof window === 'undefined') return
  isMobileViewport = window.matchMedia('(max-width: 767px)').matches
}

const handleAudioButtonClick = () => {
  if (isMobileViewport && !panelOpen && !audioState.enabled) {
    toggleAudio()
    return
  }

  panelOpen = !panelOpen
}

onMount(() => {
  siteAudioManager.initialize()
  syncViewportMode()

  const unsubscribe = siteAudioManager.subscribe((state) => {
    audioState = state
  })

  document.addEventListener('astro:page-load', syncAudioForCurrentPage)

  const handleFirstGesture = () => {
    siteAudioManager.unlockFromGesture()
  }
  const mediaQuery = window.matchMedia('(max-width: 767px)')
  const handleViewportChange = () => {
    syncViewportMode()
  }
  document.addEventListener('pointerdown', handleFirstGesture, { passive: true })
  document.addEventListener('keydown', handleFirstGesture)
  mediaQuery.addEventListener('change', handleViewportChange)

  const handlePointerDown = (event: MouseEvent) => {
    if (!panelOpen || !panelElement) return
    if (panelElement.contains(event.target as Node)) return
    panelOpen = false
  }

  document.addEventListener('click', handlePointerDown)

  return () => {
    unsubscribe()
    document.removeEventListener('astro:page-load', syncAudioForCurrentPage)
    document.removeEventListener('pointerdown', handleFirstGesture)
    document.removeEventListener('keydown', handleFirstGesture)
    document.removeEventListener('click', handlePointerDown)
    mediaQuery.removeEventListener('change', handleViewportChange)
  }
})

$: buttonLabel = panelOpen
  ? 'Close sound controls'
  : isMobileViewport && !audioState.enabled
    ? 'Enable site sound'
    : 'Open sound controls'
$: buttonTitle = audioState.enabled
  ? audioState.activeTrackLabel
    ? isMobileViewport
      ? `Sound is on. ${audioState.activeTrackLabel}. Tap for mix controls.`
      : `Sound controls. Current ambience: ${audioState.activeTrackLabel}`
    : isMobileViewport
      ? 'Sound is on. Tap for mix controls.'
      : 'Sound controls'
  : audioState.hasConfiguredTracks
    ? isMobileViewport
      ? 'Enable site sound'
      : 'Open sound controls'
    : 'Open sound controls. Tracks can be added later.'
$: masterVolumePercent = Math.round(audioState.masterVolume * 100)
$: ambienceVolumePercent = Math.round(audioState.ambienceVolume * 100)
$: sfxVolumePercent = Math.round(audioState.sfxVolume * 100)
</script>

<div class="site-audio-shell" bind:this={panelElement}>
  <button
    type="button"
    aria-label={buttonLabel}
    aria-expanded={panelOpen}
    title={buttonTitle}
    class="btn-plain scale-animation rounded-lg h-9 w-9 md:h-11 md:w-11 active:scale-90 site-audio-button"
    class:site-audio-button--enabled={audioState.enabled}
    on:click={handleAudioButtonClick}
  >
    <Icon
      icon={audioState.enabled ? 'material-symbols:volume-up-rounded' : 'material-symbols:volume-off-rounded'}
      class="text-[1.25rem]"
    />
  </button>

  {#if panelOpen}
    <div class="site-audio-panel card-base2">
      <div class="site-audio-panel__header">
        <div>
          <div class="site-audio-panel__kicker">Sound Mix</div>
          <div class="site-audio-panel__title">
            {audioState.activeTrackLabel ?? (audioState.hasConfiguredTracks ? 'Standby' : 'No tracks configured')}
          </div>
        </div>
        <button
          type="button"
          class="btn-plain rounded-lg h-9 px-3 text-sm font-medium"
          aria-pressed={audioState.enabled}
          on:click={toggleAudio}
        >
          {audioState.enabled ? 'On' : 'Off'}
        </button>
      </div>

      <label class="site-audio-panel__slider">
        <span>Master</span>
        <span>{masterVolumePercent}%</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={audioState.masterVolume}
          on:input={setMasterVolume}
        />
      </label>

      <label class="site-audio-panel__slider">
        <span>Ambience</span>
        <span>{ambienceVolumePercent}%</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={audioState.ambienceVolume}
          on:input={setAmbienceVolume}
        />
      </label>

      <label class="site-audio-panel__slider">
        <span>Effects</span>
        <span>{sfxVolumePercent}%</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={audioState.sfxVolume}
          on:input={setSfxVolume}
        />
      </label>

      <p class="site-audio-panel__note">
        {#if audioState.enabled && audioState.suspended}
          Ambience is paused while another media player is active.
        {:else if audioState.enabled}
          Route ambience changes automatically, while effects stay available for interactions across the site.
        {:else}
          Audio stays off until you enable it.
        {/if}
      </p>
    </div>
  {/if}
</div>

<style>
  .site-audio-shell {
    position: relative;
    display: flex;
    align-items: center;
  }

  .site-audio-button {
    position: relative;
    transition:
      color 180ms ease,
      box-shadow 220ms ease,
      background-color 180ms ease;
  }

  .site-audio-button::after {
    content: '';
    position: absolute;
    right: 0.45rem;
    bottom: 0.45rem;
    width: 0.42rem;
    height: 0.42rem;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.5);
    box-shadow: 0 0 0 rgba(96, 165, 250, 0);
    transition:
      background-color 180ms ease,
      box-shadow 220ms ease,
      transform 180ms ease;
  }

  .site-audio-button--enabled {
    color: oklch(0.78 0.14 var(--hue));
  }

  .site-audio-button--enabled::after {
    background: oklch(0.74 0.19 var(--hue));
    box-shadow: 0 0 12px oklch(0.74 0.19 var(--hue) / 0.55);
    transform: scale(1.1);
  }

  @media (max-width: 767px) {
    .site-audio-button--enabled {
      box-shadow:
        inset 0 0 0 1px oklch(0.74 0.19 var(--hue) / 0.28),
        0 0 18px oklch(0.74 0.19 var(--hue) / 0.18);
    }
  }

  .site-audio-panel {
    position: absolute;
    top: calc(100% + 0.65rem);
    right: 0;
    width: min(18rem, calc(100vw - 1.5rem));
    padding: 0.9rem;
    border-radius: 1rem;
    z-index: 80;
    background:
      linear-gradient(180deg, rgba(7, 15, 28, 0.92), rgba(7, 12, 22, 0.88));
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      0 18px 48px rgba(0, 0, 0, 0.32),
      0 0 0 1px rgba(114, 176, 255, 0.08);
    backdrop-filter: blur(14px) saturate(1.1);
  }

  .site-audio-panel__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.9rem;
  }

  .site-audio-panel__kicker {
    font-size: 0.68rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.85);
    margin-bottom: 0.22rem;
  }

  .site-audio-panel__title {
    font-size: 0.92rem;
    font-weight: 600;
    color: rgba(241, 245, 249, 0.95);
  }

  .site-audio-panel__slider {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.45rem 0.75rem;
    align-items: center;
    color: rgba(226, 232, 240, 0.88);
    font-size: 0.82rem;
    margin-top: 0.65rem;
  }

  .site-audio-panel__slider input {
    grid-column: 1 / -1;
    accent-color: oklch(0.74 0.19 var(--hue));
    cursor: pointer;
  }

  .site-audio-panel__note {
    margin: 0.75rem 0 0;
    font-size: 0.74rem;
    line-height: 1.45;
    color: rgba(148, 163, 184, 0.9);
  }

  @media (max-width: 767px) {
    .site-audio-panel {
      position: fixed;
      left: 0.75rem;
      right: 0.75rem;
      top: auto;
      bottom: max(0.75rem, env(safe-area-inset-bottom));
      width: auto;
      max-height: min(72vh, 24rem);
      overflow: auto;
      border-radius: 1.15rem;
      z-index: 120;
    }
  }
</style>
