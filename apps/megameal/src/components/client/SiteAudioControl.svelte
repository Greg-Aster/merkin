<script lang="ts">
import Icon from '@iconify/svelte/dist/Icon.svelte'
import { onMount } from 'svelte'
import { type SiteAudioState, siteAudioManager } from '../../utils/site-audio'

import '../../styles/features/extracted/site-audio-control.css'
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

const toggleAudio = async () => {
  await siteAudioManager.unlockFromGesture()
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

  const unsubscribe = siteAudioManager.subscribe(state => {
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
  document.addEventListener('pointerdown', handleFirstGesture, {
    passive: true,
  })
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
    class="nav-action-button btn-plain scale-animation rounded-lg active:scale-90 site-audio-button"
    class:site-audio-button--enabled={audioState.enabled}
    on:click={handleAudioButtonClick}
  >
    <Icon
      icon={audioState.enabled ? 'material-symbols:volume-up-rounded' : 'material-symbols:volume-off-rounded'}
      class="nav-action-icon"
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
