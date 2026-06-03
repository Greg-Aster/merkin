<script lang="ts">
import Icon from '@iconify/svelte/dist/Icon.svelte'
import { onMount } from 'svelte'
import { type SiteAudioState, siteAudioManager } from '../../utils/site-audio'
import { addSiteAudioActivationListeners } from '../../utils/site-audio-activation'

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
let panelPinned = false
let shellElement: HTMLDivElement | null = null
let panelElement: HTMLDivElement | null = null
let isMobileViewport = false
let panelCloseTimer: number | null = null

const portalToBody = (node: HTMLElement, enabled: boolean) => {
  if (typeof document === 'undefined') {
    return {}
  }

  const marker = document.createComment('site-audio-portal')
  let portaled = false

  const moveToBody = () => {
    if (portaled || !node.parentNode || !document.body) return
    node.parentNode.insertBefore(marker, node)
    document.body.appendChild(node)
    portaled = true
  }

  const restore = () => {
    if (!portaled) return
    const parent = marker.parentNode
    if (parent) {
      parent.insertBefore(node, marker)
      parent.removeChild(marker)
    }
    portaled = false
  }

  if (enabled) {
    moveToBody()
  }

  return {
    update(nextEnabled: boolean) {
      if (nextEnabled) {
        moveToBody()
      } else {
        restore()
      }
    },
    destroy() {
      restore()
    },
  }
}

const syncAudioForCurrentPage = () => {
  if (typeof window === 'undefined') return
  siteAudioManager.syncForPath(window.location.pathname)
}

const clearPanelCloseTimer = () => {
  if (panelCloseTimer === null || typeof window === 'undefined') return
  window.clearTimeout(panelCloseTimer)
  panelCloseTimer = null
}

const setAudioEnabledFromGesture = async (nextEnabled: boolean) => {
  await siteAudioManager.unlockFromGesture()
  siteAudioManager.setEnabled(nextEnabled)
}

const toggleAudio = () => {
  openMixerPanel()
  void setAudioEnabledFromGesture(!audioState.enabled)
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

const targetIsInsideAudioControl = (target: EventTarget | null) => {
  if (!(target instanceof Node)) return false
  return Boolean(
    shellElement?.contains(target) || panelElement?.contains(target),
  )
}

const closeMixerPanel = () => {
  clearPanelCloseTimer()
  panelPinned = false
  panelOpen = false
}

const openMixerPanel = () => {
  clearPanelCloseTimer()
  panelOpen = true
}

const pinMixerPanel = () => {
  clearPanelCloseTimer()
  panelPinned = true
  panelOpen = true
}

const scheduleMixerPanelClose = () => {
  if (panelPinned || typeof window === 'undefined') return
  clearPanelCloseTimer()
  panelCloseTimer = window.setTimeout(() => {
    panelOpen = false
    panelCloseTimer = null
  }, 180)
}

const handleAudioControlFocusOut = (event: FocusEvent) => {
  if (targetIsInsideAudioControl(event.relatedTarget)) return
  scheduleMixerPanelClose()
}

const handleDocumentKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && panelOpen) {
    closeMixerPanel()
  }
}

onMount(() => {
  siteAudioManager.initialize()
  syncViewportMode()

  const unsubscribe = siteAudioManager.subscribe(state => {
    audioState = state
  })

  document.addEventListener('astro:page-load', syncAudioForCurrentPage)

  const stopListeningForAudioActivation = addSiteAudioActivationListeners(
    () => {
      void siteAudioManager.unlockFromGesture()
    },
  )
  const mediaQuery = window.matchMedia('(max-width: 767px)')
  const handleViewportChange = () => {
    syncViewportMode()
  }
  mediaQuery.addEventListener('change', handleViewportChange)

  const handlePointerDown = (event: MouseEvent) => {
    if (!panelOpen) return
    if (targetIsInsideAudioControl(event.target)) return
    closeMixerPanel()
  }

  document.addEventListener('click', handlePointerDown)
  document.addEventListener('keydown', handleDocumentKeyDown)

  return () => {
    clearPanelCloseTimer()
    unsubscribe()
    document.removeEventListener('astro:page-load', syncAudioForCurrentPage)
    stopListeningForAudioActivation()
    document.removeEventListener('click', handlePointerDown)
    document.removeEventListener('keydown', handleDocumentKeyDown)
    mediaQuery.removeEventListener('change', handleViewportChange)
  }
})

$: buttonLabel = audioState.enabled ? 'Turn site sound off' : 'Turn site sound on'
$: buttonTitle = audioState.enabled
  ? audioState.activeTrackLabel
    ? `Sound is on. Current ambience: ${audioState.activeTrackLabel}.`
    : 'Sound is on.'
  : audioState.hasConfiguredTracks
    ? 'Turn site sound on'
    : 'Site sound has no configured tracks yet.'
$: masterVolumePercent = Math.round(audioState.masterVolume * 100)
$: ambienceVolumePercent = Math.round(audioState.ambienceVolume * 100)
$: sfxVolumePercent = Math.round(audioState.sfxVolume * 100)
</script>

<div
  class="site-audio-shell"
  bind:this={shellElement}
  on:pointerenter={openMixerPanel}
  on:pointerleave={scheduleMixerPanelClose}
  on:focusin={openMixerPanel}
  on:focusout={handleAudioControlFocusOut}
>
  <button
    type="button"
    aria-label={buttonLabel}
    aria-pressed={audioState.enabled}
    aria-expanded={panelOpen}
    aria-controls="site-audio-panel"
    aria-haspopup="dialog"
    title={buttonTitle}
    class="nav-action-button btn-plain scale-animation rounded-lg active:scale-90 site-audio-button"
    class:site-audio-button--enabled={audioState.enabled}
    data-sfx-hover="hover-soft"
    data-sfx-click="soft"
    on:click={toggleAudio}
  >
    <Icon
      icon={audioState.enabled ? 'material-symbols:volume-up-rounded' : 'material-symbols:volume-off-rounded'}
      class="nav-action-icon"
    />
  </button>

  {#if panelOpen}
    <div
      id="site-audio-panel"
      class="site-audio-panel card-base2"
      role="dialog"
      aria-label="Sound mix controls"
      bind:this={panelElement}
      use:portalToBody={isMobileViewport}
      on:pointerenter={openMixerPanel}
      on:pointerleave={scheduleMixerPanelClose}
      on:pointerdown={pinMixerPanel}
      on:focusin={openMixerPanel}
      on:focusout={handleAudioControlFocusOut}
    >
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
    </div>
  {/if}
</div>
