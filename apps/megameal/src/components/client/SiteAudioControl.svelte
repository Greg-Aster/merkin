<script lang="ts">
import Icon from '@iconify/svelte/dist/Icon.svelte'
import { onMount } from 'svelte'
import {
  minimumSiteAudioVolume,
  readSiteAudioVolume,
  siteAudioConfig,
} from '../../config/audio'
import type { SiteAudioState } from '../../utils/site-audio'
import {
  getLoadedSiteAudioManager,
  loadSiteAudioManager,
  siteAudioLoadFailedEvent,
} from '../../utils/site-audio-loader'

import '../../styles/features/extracted/site-audio-control.css'
let audioState: SiteAudioState = {
  enabled: false,
  masterVolume: siteAudioConfig.defaultMasterVolume,
  ambienceVolume: siteAudioConfig.defaultAmbienceVolume,
  sfxVolume: siteAudioConfig.defaultSfxVolume,
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
let mounted = false
let managerUnsubscribe: (() => void) | null = null
let audioLoadFailed = false

type SiteAudioManager = Awaited<ReturnType<typeof loadSiteAudioManager>>

const subscribeToAudioManager = (manager: SiteAudioManager) => {
  if (!mounted || managerUnsubscribe) return
  managerUnsubscribe = manager.subscribe(state => {
    audioState = state
  })
}

const ensureAudioManager = async () => {
  try {
    const manager = await loadSiteAudioManager()
    audioLoadFailed = false
    subscribeToAudioManager(manager)
    return manager
  } catch (error) {
    audioLoadFailed = true
    throw error
  }
}

const retainVisibleLoadFailure = () => {
  // The panel exposes the recoverable failure and its reload action.
}

const readStoredVolume = (
  storageKey: string,
  fallback: number,
  legacyStorageKey?: string,
) => {
  const stored = readSiteAudioVolume(window.localStorage.getItem(storageKey))
  if (stored !== null) return stored
  if (!legacyStorageKey) return fallback

  return (
    readSiteAudioVolume(window.localStorage.getItem(legacyStorageKey)) ??
    fallback
  )
}

const syncStoredAudioState = () => {
  const storedEnabled = window.localStorage.getItem(siteAudioConfig.storageKey)
  audioState = {
    ...audioState,
    enabled:
      storedEnabled === null
        ? siteAudioConfig.enabledByDefault
        : storedEnabled === 'true',
    masterVolume: readStoredVolume(
      siteAudioConfig.masterVolumeStorageKey,
      siteAudioConfig.defaultMasterVolume,
    ),
    ambienceVolume: readStoredVolume(
      siteAudioConfig.ambienceVolumeStorageKey,
      siteAudioConfig.defaultAmbienceVolume,
      siteAudioConfig.legacyVolumeStorageKey,
    ),
    sfxVolume: readStoredVolume(
      siteAudioConfig.sfxVolumeStorageKey,
      siteAudioConfig.defaultSfxVolume,
      siteAudioConfig.legacyVolumeStorageKey,
    ),
    hasConfiguredTracks: siteAudioConfig.tracks.length > 0,
  }
}

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
      marker.remove()
      portaled = false
    },
  }
}

const clearPanelCloseTimer = () => {
  if (panelCloseTimer === null || typeof window === 'undefined') return
  window.clearTimeout(panelCloseTimer)
  panelCloseTimer = null
}

const setAudioEnabledFromGesture = async (
  nextEnabled: boolean,
  event: MouseEvent,
) => {
  const siteAudioManager = await ensureAudioManager()
  await siteAudioManager.unlockFromGesture(event)
  siteAudioManager.setEnabled(nextEnabled)
}

const toggleAudio = (event: MouseEvent) => {
  openMixerPanel()
  void setAudioEnabledFromGesture(!audioState.enabled, event).catch(
    retainVisibleLoadFailure,
  )
}

const prepareAudioManager = () => {
  void ensureAudioManager().catch(retainVisibleLoadFailure)
}

const setMasterVolume = (event: Event) => {
  const target = event.currentTarget as HTMLInputElement | null
  if (!target) return
  void ensureAudioManager()
    .then(manager => {
      manager.setMasterVolume(Number(target.value))
    })
    .catch(retainVisibleLoadFailure)
}

const setAmbienceVolume = (event: Event) => {
  const target = event.currentTarget as HTMLInputElement | null
  if (!target) return
  void ensureAudioManager()
    .then(manager => {
      manager.setAmbienceVolume(Number(target.value))
    })
    .catch(retainVisibleLoadFailure)
}

const setSfxVolume = (event: Event) => {
  const target = event.currentTarget as HTMLInputElement | null
  if (!target) return
  void ensureAudioManager()
    .then(manager => {
      manager.setSfxVolume(Number(target.value))
    })
    .catch(retainVisibleLoadFailure)
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

const reloadAfterAudioLoadFailure = () => {
  window.location.reload()
}

const openMixerPanel = () => {
  clearPanelCloseTimer()
  panelOpen = true
  void ensureAudioManager().catch(retainVisibleLoadFailure)
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
  mounted = true
  syncStoredAudioState()
  syncViewportMode()

  const loadedManager = getLoadedSiteAudioManager()
  if (loadedManager) subscribeToAudioManager(loadedManager)

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

  const handleAudioLoadFailure = () => {
    audioLoadFailed = true
  }

  document.addEventListener('click', handlePointerDown)
  document.addEventListener('keydown', handleDocumentKeyDown)
  window.addEventListener(siteAudioLoadFailedEvent, handleAudioLoadFailure)

  return () => {
    mounted = false
    clearPanelCloseTimer()
    managerUnsubscribe?.()
    managerUnsubscribe = null
    document.removeEventListener('click', handlePointerDown)
    document.removeEventListener('keydown', handleDocumentKeyDown)
    window.removeEventListener(siteAudioLoadFailedEvent, handleAudioLoadFailure)
    mediaQuery.removeEventListener('change', handleViewportChange)
  }
})

$: buttonLabel = audioState.enabled
  ? 'Turn site sound off'
  : 'Turn site sound on'
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
    on:pointerdown={prepareAudioManager}
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

      {#if audioLoadFailed}
        <p role="status" aria-live="polite">
          Sound controls are temporarily unavailable.
          <button
            type="button"
            class="btn-plain rounded-lg px-2 py-1 text-sm font-medium"
            on:click={reloadAfterAudioLoadFailure}
          >
            Reload to try again
          </button>
        </p>
      {/if}

      <label class="site-audio-panel__slider">
        <span>Master</span>
        <span>{masterVolumePercent}%</span>
        <input
          type="range"
          min={minimumSiteAudioVolume}
          max="1"
          step="0.01"
          value={audioState.masterVolume}
          disabled={audioLoadFailed}
          on:input={setMasterVolume}
        />
      </label>

      <label class="site-audio-panel__slider">
        <span>Ambience</span>
        <span>{ambienceVolumePercent}%</span>
        <input
          type="range"
          min={minimumSiteAudioVolume}
          max="1"
          step="0.01"
          value={audioState.ambienceVolume}
          disabled={audioLoadFailed}
          on:input={setAmbienceVolume}
        />
      </label>

      <label class="site-audio-panel__slider">
        <span>Effects</span>
        <span>{sfxVolumePercent}%</span>
        <input
          type="range"
          min={minimumSiteAudioVolume}
          max="1"
          step="0.01"
          value={audioState.sfxVolume}
          disabled={audioLoadFailed}
          on:input={setSfxVolume}
        />
      </label>
    </div>
  {/if}
</div>
