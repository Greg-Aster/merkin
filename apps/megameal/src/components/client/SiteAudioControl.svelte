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
let shellElement: HTMLDivElement | null = null
let panelElement: HTMLDivElement | null = null
let nudgeElement: HTMLDivElement | null = null
let isMobileViewport = false
let showAudioNudge = false
let audioNudgeFading = false
let audioNudgeDismissed = false
let audioNudgeFadeTimer: number | null = null
const audioNudgeDismissedStorageKey = 'megameal-site-audio-nudge-dismissed-v2'

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

const readAudioNudgeDismissed = () => {
  if (typeof window === 'undefined') return true

  try {
    return window.sessionStorage.getItem(audioNudgeDismissedStorageKey) === 'true'
  } catch {
    return false
  }
}

const writeAudioNudgeDismissed = () => {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem(audioNudgeDismissedStorageKey, 'true')
  } catch {
    // sessionStorage can be unavailable in restricted browser modes.
  }
}

const clearAudioNudgeFadeTimer = () => {
  if (audioNudgeFadeTimer === null || typeof window === 'undefined') return
  window.clearTimeout(audioNudgeFadeTimer)
  audioNudgeFadeTimer = null
}

const revealAudioNudge = () => {
  clearAudioNudgeFadeTimer()
  audioNudgeFading = false
  showAudioNudge = true
}

const dismissAudioNudge = (options: { remember?: boolean } = {}) => {
  if (!showAudioNudge && audioNudgeDismissed) return

  audioNudgeDismissed = true
  if (options.remember ?? true) {
    writeAudioNudgeDismissed()
  }

  if (!showAudioNudge || typeof window === 'undefined') {
    showAudioNudge = false
    audioNudgeFading = false
    return
  }

  audioNudgeFading = true
  clearAudioNudgeFadeTimer()
  audioNudgeFadeTimer = window.setTimeout(() => {
    showAudioNudge = false
    audioNudgeFading = false
    audioNudgeFadeTimer = null
  }, 220)
}

const toggleAudio = async () => {
  await siteAudioManager.unlockFromGesture()
  siteAudioManager.toggle()
  dismissAudioNudge({ remember: false })
}

const enableAudioFromNudge = async () => {
  await siteAudioManager.unlockFromGesture()
  siteAudioManager.setEnabled(true)
  dismissAudioNudge({ remember: false })
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
    shellElement?.contains(target) ||
      panelElement?.contains(target) ||
      nudgeElement?.contains(target),
  )
}

const handleAudioButtonClick = async () => {
  dismissAudioNudge()
  await siteAudioManager.unlockFromGesture()

  if (isMobileViewport) {
    panelOpen = false
    siteAudioManager.setEnabled(!audioState.enabled)
    return
  }

  panelOpen = !panelOpen
}

onMount(() => {
  siteAudioManager.initialize()
  syncViewportMode()
  audioNudgeDismissed = readAudioNudgeDismissed()

  const unsubscribe = siteAudioManager.subscribe(state => {
    audioState = state
    if (state.enabled || !state.hasConfiguredTracks || panelOpen || audioNudgeDismissed) {
      showAudioNudge = false
      return
    }

    revealAudioNudge()
  })

  document.addEventListener('astro:page-load', syncAudioForCurrentPage)

  const handleFirstGesture = () => {
    void siteAudioManager.unlockFromGesture()
  }
  const mediaQuery = window.matchMedia('(max-width: 767px)')
  const handleViewportChange = () => {
    syncViewportMode()
  }
  document.addEventListener('pointerdown', handleFirstGesture, {
    passive: true,
  })
  document.addEventListener('touchstart', handleFirstGesture, {
    passive: true,
  })
  document.addEventListener('keydown', handleFirstGesture)
  mediaQuery.addEventListener('change', handleViewportChange)

  const handlePointerDown = (event: MouseEvent) => {
    if (!panelOpen) return
    if (targetIsInsideAudioControl(event.target)) return
    panelOpen = false
  }

  document.addEventListener('click', handlePointerDown)

  const handleNudgeIgnore = (event: Event) => {
    if (targetIsInsideAudioControl(event.target)) return
    dismissAudioNudge()
  }

  const handleNudgeScroll = () => {
    dismissAudioNudge()
  }

  document.addEventListener('click', handleNudgeIgnore)
  document.addEventListener('keydown', handleNudgeIgnore)
  window.addEventListener('wheel', handleNudgeScroll, { passive: true })
  window.addEventListener('scroll', handleNudgeScroll, { passive: true })
  window.addEventListener('touchmove', handleNudgeScroll, { passive: true })

  return () => {
    clearAudioNudgeFadeTimer()
    unsubscribe()
    document.removeEventListener('astro:page-load', syncAudioForCurrentPage)
    document.removeEventListener('pointerdown', handleFirstGesture)
    document.removeEventListener('touchstart', handleFirstGesture)
    document.removeEventListener('keydown', handleFirstGesture)
    document.removeEventListener('click', handlePointerDown)
    document.removeEventListener('click', handleNudgeIgnore)
    document.removeEventListener('keydown', handleNudgeIgnore)
    window.removeEventListener('wheel', handleNudgeScroll)
    window.removeEventListener('scroll', handleNudgeScroll)
    window.removeEventListener('touchmove', handleNudgeScroll)
    mediaQuery.removeEventListener('change', handleViewportChange)
  }
})

$: if (audioState.enabled || panelOpen) {
  showAudioNudge = false
}

$: buttonLabel = panelOpen
  ? 'Close sound controls'
  : isMobileViewport && !audioState.enabled
    ? 'Enable site sound'
    : isMobileViewport
      ? 'Disable site sound'
    : 'Open sound controls'
$: buttonTitle = audioState.enabled
  ? audioState.activeTrackLabel
    ? isMobileViewport
      ? `Sound is on. ${audioState.activeTrackLabel}. Tap to turn off.`
      : `Sound controls. Current ambience: ${audioState.activeTrackLabel}`
    : isMobileViewport
      ? 'Sound is on. Tap to turn off.'
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

<div class="site-audio-shell" bind:this={shellElement}>
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

  {#if showAudioNudge}
    <div
      class="site-audio-nudge"
      class:site-audio-nudge--hiding={audioNudgeFading}
      role="dialog"
      aria-label="Sound suggestion"
      bind:this={nudgeElement}
      use:portalToBody={isMobileViewport}
    >
      <div class="site-audio-nudge__copy">
        <div class="site-audio-nudge__title">Best with sound</div>
        <p>Experience MEGAMEAL with the ambient mix on.</p>
      </div>
      <button
        type="button"
        class="site-audio-nudge__switch"
        role="switch"
        aria-checked={audioState.enabled}
        aria-label="Turn on site sound"
        on:click={enableAudioFromNudge}
      >
        <span>Sound</span>
        <span class="site-audio-nudge__switch-track" aria-hidden="true">
          <span class="site-audio-nudge__switch-thumb"></span>
        </span>
      </button>
    </div>
  {/if}

  {#if panelOpen}
    <div
      class="site-audio-panel card-base2"
      bind:this={panelElement}
      use:portalToBody={isMobileViewport}
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
