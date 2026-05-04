<!-- Runtime audio system for ambience, music, SFX, and spatial sound. -->
<script lang="ts">
import {
  type AudioSfxConfig,
  type AudioSfxId,
} from '@merkin/shared-audio/audio-ids'
import { gameAudioProfile } from '@merkin/shared-audio/game-audio-profile'
import { useTask } from '@threlte/core'
import { Howl, Howler } from 'howler'
import { createEventDispatcher, onDestroy, onMount } from 'svelte'
import { writable } from 'svelte/store'
import {
  ambienceVolumeSetting,
  isSoundEnabled,
  masterVolumeSetting,
  sfxVolumeSetting,
} from '../stores/uiStore'
import { runtimeDebugLog } from '../utils/runtimeLog'

// Audio configuration
export let enabled = false // Disabled by default for performance
export let masterVolume = 0.7
export let enableSpatialAudio = true

const dispatch = createEventDispatcher()
const GAME_AMBIENCE_ID = gameAudioProfile.ambience.id
const GAME_AUDIO_BASE = import.meta.env.BASE_URL || '/'

// Simple audio manager implementation using Howler.js
class SimpleAudioManager {
  private sounds: Map<string, Howl> = new Map()
  private masterVolume: number = 0.7
  private initialized: boolean = false

  async initialize() {
    try {
      // Set up Howler global settings
      Howler.volume(this.masterVolume)
      Howler.autoUnlock = true
      Howler.autoSuspend = false

      this.initialized = true
      runtimeDebugLog('🎵 SimpleAudioManager initialized with Howler.js')
    } catch (error) {
      console.error('Failed to initialize audio:', error)
      throw error
    }
  }

  setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    Howler.volume(this.masterVolume)
  }

  getMasterVolume(): number {
    return this.masterVolume
  }

  loadSound(id: string, src: string | string[], options: any = {}): Howl {
    const sound = new Howl({
      src: Array.isArray(src) ? src : [src],
      volume: options.volume || 1.0,
      loop: options.loop || false,
      autoplay: options.autoplay || false,
      spatial: enableSpatialAudio && options.spatial,
      onloaderror: (_soundId, error) => {
        console.warn(`Audio load failed for "${id}"`, src, error)
      },
      onplayerror: (_soundId, error) => {
        console.warn(`Audio play failed for "${id}"`, src, error)
        sound.once('unlock', () => {
          sound.play()
        })
      },
      ...options,
    })

    this.sounds.set(id, sound)
    return sound
  }

  play(id: string): number | null {
    const sound = this.sounds.get(id)
    if (sound) {
      return sound.play()
    }
    console.warn(`Audio: Sound "${id}" not found`)
    return null
  }

  pause(id: string) {
    const sound = this.sounds.get(id)
    if (sound) {
      sound.pause()
    }
  }

  stop(id: string) {
    const sound = this.sounds.get(id)
    if (sound) {
      sound.stop()
    }
  }

  setVolume(id: string, volume: number) {
    const sound = this.sounds.get(id)
    if (sound) {
      sound.volume(Math.max(0, Math.min(1, volume)))
    }
  }

  getSound(id: string): Howl | undefined {
    return this.sounds.get(id)
  }

  unload(id: string) {
    const sound = this.sounds.get(id)
    if (sound) {
      sound.unload()
      this.sounds.delete(id)
    }
  }

  update(delta: number) {
    // Update spatial audio positions if needed
    // Howler handles most updates automatically
  }

  dispose() {
    // Unload all sounds
    for (const [id, sound] of this.sounds) {
      sound.unload()
    }
    this.sounds.clear()
    this.initialized = false
  }

  isReady(): boolean {
    return this.initialized
  }

  getSoundIds(): string[] {
    return Array.from(this.sounds.keys())
  }
}

// Reactive stores
export const audioEnabledStore = writable(enabled)
export const masterVolumeStore = writable(masterVolume)
export const loadedSoundsStore = writable<string[]>([])

let audioManager: SimpleAudioManager | null = null
let isInitialized = false
let hasUserUnlockedAudio = false
let lastScrollSoundAt = 0
let lastHoverAnchor: HTMLElement | null = null
let lastFocusTarget: HTMLElement | null = null
let lastPointerAt = -Infinity
const INTERACTIVE_SELECTOR = 'button, a[href], [role="button"], summary'
const lastPlayedAt = new Map<AudioSfxId, number>()

function isCoolingDown(id: AudioSfxId, cooldownMs = 0) {
  if (cooldownMs <= 0) return false
  const now = window.performance.now()
  const previous = lastPlayedAt.get(id) ?? -Infinity
  if (now - previous < cooldownMs) {
    return true
  }
  lastPlayedAt.set(id, now)
  return false
}

function isNativeInteractive(element: HTMLElement | null) {
  return !!element?.closest(INTERACTIVE_SELECTOR)
}

function readExplicitSfx(
  element: HTMLElement | null,
  trigger: 'click' | 'hover' | 'focus' | 'key',
): AudioSfxId | null {
  if (!element) return null

  const explicitElement = element.closest<HTMLElement>(`[data-sfx-${trigger}]`)
  if (!explicitElement) return null

  const explicit =
    trigger === 'click'
      ? explicitElement.dataset.sfxClick
      : trigger === 'hover'
        ? explicitElement.dataset.sfxHover
        : trigger === 'focus'
          ? explicitElement.dataset.sfxFocus
          : explicitElement.dataset.sfxKey

  return (explicit as AudioSfxId | undefined) ?? null
}

function isMutedSurface(element: HTMLElement) {
  return !!element.closest('audio, video, textarea, [contenteditable="true"]')
}

function isPointerMutedSurface(element: HTMLElement) {
  return (
    isMutedSurface(element) ||
    !!element.closest(
      'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]), select',
    )
  )
}

function isTypingField(element: HTMLElement) {
  return !!element.closest(
    'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable="true"]',
  )
}

function resolvePointerSfx(target: EventTarget | null): AudioSfxId | null {
  const element = target instanceof HTMLElement ? target : null
  if (!element) return null

  const explicit = readExplicitSfx(element, 'click')
  if (explicit) return explicit

  if (isPointerMutedSurface(element)) {
    return null
  }

  if (element.closest('.settings-overlay, .close-button')) {
    return 'panel-close'
  }

  if (element.closest('.settings-button')) {
    return 'panel-open'
  }

  if (element.closest('.danger, [data-danger="true"]')) {
    return 'warning'
  }

  if (element.closest('.settings-panel, .editor-section')) {
    return 'soft'
  }

  if (isNativeInteractive(element)) {
    return 'soft'
  }

  return 'soft'
}

function getHoverAnchor(target: EventTarget | null): HTMLElement | null {
  const element = target instanceof HTMLElement ? target : null
  if (!element || isMutedSurface(element)) return null

  return (
    element.closest<HTMLElement>(
      '[data-sfx-hover], button, a[href], [role="button"]',
    ) ?? null
  )
}

function resolveHoverSfx(anchor: HTMLElement | null): AudioSfxId | null {
  if (!anchor) return null

  const explicit = readExplicitSfx(anchor, 'hover')
  if (explicit) return explicit

  if (
    anchor.matches(
      '.settings-button, .close-button, .danger, [data-danger="true"]',
    )
  ) {
    return 'hover-emphasis'
  }

  if (anchor.matches('button, a[href], [role="button"]')) {
    return 'hover-soft'
  }

  return null
}

function resolveFocusSfx(target: EventTarget | null): AudioSfxId | null {
  const element = target instanceof HTMLElement ? target : null
  if (!element || isMutedSurface(element)) return null

  const explicit = readExplicitSfx(element, 'focus')
  if (explicit) return explicit

  if (element.matches('input, textarea, select, button, a[href]')) {
    return 'focus-soft'
  }

  return null
}

function resolveKeySfx(target: EventTarget | null): AudioSfxId | null {
  const element = target instanceof HTMLElement ? target : null
  if (!element || isTypingField(element) || isMutedSurface(element)) return null

  const explicitKey = readExplicitSfx(element, 'key')
  if (explicitKey) return explicitKey

  const explicitClick = readExplicitSfx(element, 'click')
  if (explicitClick) return explicitClick

  return resolvePointerSfx(element)
}

function ensureSound(id: string, src: string | string[], options: any = {}) {
  if (!audioManager) return null
  const existing = audioManager.getSound(id)
  if (existing) return existing
  const resolved = Array.isArray(src)
    ? src.map(resolveAudioSrc)
    : resolveAudioSrc(src)
  return audioManager.loadSound(id, resolved, options)
}

function resolveAudioSrc(src: string): string {
  if (/^(https?:)?\/\//.test(src)) return src

  const runtimeBase =
    typeof window !== 'undefined'
      ? window.location.pathname === '/game' ||
        window.location.pathname.startsWith('/game/')
        ? '/game/'
        : '/'
      : GAME_AUDIO_BASE
  const basePath = runtimeBase.endsWith('/') ? runtimeBase : `${runtimeBase}/`
  const relativePath = src.replace(/^\/+/, '')
  return new URL(relativePath, `http://megameal.local${basePath}`).pathname
}

function ensureConfiguredSfx(
  id: AudioSfxId,
  overrides: Partial<AudioSfxConfig> = {},
) {
  const config = { ...gameAudioProfile.sfx[id], ...overrides }
  return ensureSound(config.id, config.src, {
    volume: resolveSfxVolume(config.volume),
    preload: config.preload ?? true,
    html5: config.html5 ?? false,
  })
}

function ensureConfiguredAmbience() {
  const config = gameAudioProfile.ambience
  return ensureSound(config.id, config.src, {
    loop: config.loop ?? true,
    volume: resolveAmbienceVolume(config.volume),
    html5: config.html5 ?? false,
    preload: config.preload ?? false,
  })
}

function playConfiguredSfx(
  id: AudioSfxId,
  overrides: Partial<AudioSfxConfig> = {},
) {
  if (!audioManager) return

  const config = { ...gameAudioProfile.sfx[id], ...overrides }
  if (isCoolingDown(id, config.cooldownMs ?? 0)) return
  const sound = ensureConfiguredSfx(id, overrides)
  if (!sound) return

  sound.volume(resolveSfxVolume(config.volume))
  if (config.interrupt !== false) {
    sound.stop()
  }

  const playId = sound.play()
  if (typeof playId === 'number') {
    const baseRate = config.rate ?? 1
    const jitter = config.rateJitter ?? 0
    sound.rate(baseRate + (Math.random() * jitter * 2 - jitter), playId)
  }
}

async function unlockAudioContext() {
  if (typeof window === 'undefined') return

  try {
    const ctx = Howler.ctx
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume()
    }
  } catch (error) {
    console.warn('Audio unlock failed:', error)
  }
}

function startAmbienceIfNeeded() {
  if (!audioManager || !$isSoundEnabled || !hasUserUnlockedAudio) return
  const ambience = ensureConfiguredAmbience()

  if (!ambience) return
  if (!ambience.playing()) {
    ambience.volume(resolveAmbienceVolume(gameAudioProfile.ambience.volume))
    ambience.play()
  }
}

async function handlePointerDown(event: PointerEvent) {
  if (!audioManager || !$isSoundEnabled) return
  if (event.button !== 0) return

  hasUserUnlockedAudio = true
  await unlockAudioContext()
  startAmbienceIfNeeded()

  const sfxId = resolvePointerSfx(event.target)
  if (sfxId) {
    playConfiguredSfx(sfxId)
  }
}

async function handleWheel(event: WheelEvent) {
  if (!audioManager || !$isSoundEnabled) return

  hasUserUnlockedAudio = true
  await unlockAudioContext()
  startAmbienceIfNeeded()

  if (Math.abs(event.deltaY) < 14 && Math.abs(event.deltaX) < 14) return

  const now = window.performance.now()
  if (now - lastScrollSoundAt < 650) return
  lastScrollSoundAt = now

  const sweepConfig = gameAudioProfile.sfx.scroll
  const sweep = ensureConfiguredSfx('scroll')

  if (!sweep) return
  sweep.stop()
  sweep.volume(resolveSfxVolume(sweepConfig.volume))
  const playId = sweep.play()
  if (typeof playId === 'number') {
    const baseRate = sweepConfig.rate ?? 1
    const jitter = sweepConfig.rateJitter ?? 0
    sweep.rate(baseRate + (Math.random() * jitter * 2 - jitter), playId)
  }
}

async function handleKeyDown(event: KeyboardEvent) {
  if (!audioManager || !$isSoundEnabled) return
  if (!['Enter', ' ', 'Escape'].includes(event.key)) return

  hasUserUnlockedAudio = true
  await unlockAudioContext()
  startAmbienceIfNeeded()

  if (event.key === 'Escape') {
    playConfiguredSfx('panel-back')
    return
  }

  const sfxId = resolveKeySfx(event.target)
  if (sfxId) {
    playConfiguredSfx(sfxId, { volume: 0.18 })
  }
}

function handleDelegatedPointerDown(event: PointerEvent) {
  lastPointerAt = window.performance.now()
  void handlePointerDown(event)
}

function handleMouseOver(event: MouseEvent) {
  const anchor = getHoverAnchor(event.target)
  if (!anchor || anchor === lastHoverAnchor) return

  const related = event.relatedTarget
  if (related instanceof Node && anchor.contains(related)) return

  lastHoverAnchor = anchor
  const sfxId = resolveHoverSfx(anchor)
  if (sfxId) {
    playConfiguredSfx(sfxId)
  }
}

function handleMouseOut(event: MouseEvent) {
  if (!lastHoverAnchor) return

  const target = event.target
  const related = event.relatedTarget
  if (!(target instanceof Node) || !lastHoverAnchor.contains(target)) return
  if (related instanceof Node && lastHoverAnchor.contains(related)) return

  lastHoverAnchor = null
}

function handleFocusIn(event: FocusEvent) {
  const target = event.target instanceof HTMLElement ? event.target : null
  if (!target || target === lastFocusTarget) return
  if (window.performance.now() - lastPointerAt < 140) return

  lastFocusTarget = target
  const sfxId = resolveFocusSfx(target)
  if (sfxId) {
    playConfiguredSfx(sfxId)
  }
}

function handleFocusOut(event: FocusEvent) {
  if (event.target === lastFocusTarget) {
    lastFocusTarget = null
  }
}

onMount(async () => {
  // Update stores
  audioEnabledStore.set(enabled)
  masterVolumeStore.set(masterVolume)

  if (!enabled) {
    runtimeDebugLog('🔇 Audio system disabled for performance')
    return
  }

  try {
    runtimeDebugLog('🎵 Initializing Threlte Audio System...')

    // Create and initialize audio manager
    audioManager = new SimpleAudioManager()
    await audioManager.initialize()

    // Configure audio settings
    audioManager.setMasterVolume(masterVolume)
    ensureConfiguredAmbience()
    ensureConfiguredSfx('soft')
    ensureConfiguredSfx('select')
    ensureConfiguredSfx('hover-soft')
    ensureConfiguredSfx('hover-emphasis')
    ensureConfiguredSfx('focus-soft')
    ensureConfiguredSfx('panel-open')
    ensureConfiguredSfx('panel-close')
    ensureConfiguredSfx('panel-back')
    ensureConfiguredSfx('error')
    ensureConfiguredSfx('scroll')

    isInitialized = true
    runtimeDebugLog('✅ Threlte Audio System initialized')

    dispatch('audioInitialized', { audioManager })
    window.addEventListener('pointerdown', handleDelegatedPointerDown, true)
    window.addEventListener('mouseover', handleMouseOver, true)
    window.addEventListener('mouseout', handleMouseOut, true)
    window.addEventListener('focusin', handleFocusIn, true)
    window.addEventListener('focusout', handleFocusOut, true)
    window.addEventListener('wheel', handleWheel, { passive: true })
    window.addEventListener('keydown', handleKeyDown, true)
  } catch (error) {
    console.error('❌ Failed to initialize Threlte Audio System:', error)
    dispatch('audioError', { error })
  }
})

// Update audio system
useTask(delta => {
  if (audioManager && isInitialized) {
    audioManager.update(delta)
  }
})

// Reactive volume changes
$: if (audioManager) {
  audioManager.setMasterVolume($masterVolumeSetting)
  masterVolumeStore.set($masterVolumeSetting)
  const ambience = audioManager.getSound(GAME_AMBIENCE_ID)
  if (ambience) {
    ambience.volume(resolveAmbienceVolume(gameAudioProfile.ambience.volume))
  }
}

// Reactive sound enabled/disabled changes
$: if (audioManager) {
  if ($isSoundEnabled) {
    audioManager.setMasterVolume($masterVolumeSetting)
    if (hasUserUnlockedAudio) {
      startAmbienceIfNeeded()
    }
  } else {
    audioManager.setMasterVolume(0)
    audioManager.stop(GAME_AMBIENCE_ID)
  }
}

function resolveAmbienceVolume(baseVolume: number): number {
  return Math.min(
    1,
    Math.max(0, $masterVolumeSetting * $ambienceVolumeSetting * baseVolume),
  )
}

function resolveSfxVolume(baseVolume: number): number {
  return Math.min(
    1,
    Math.max(0, $masterVolumeSetting * $sfxVolumeSetting * baseVolume),
  )
}

// Reactive enabled state
$: {
  audioEnabledStore.set(enabled)
}

// Update loaded sounds store
$: if (audioManager) {
  loadedSoundsStore.set(audioManager.getSoundIds())
}

// Export audio functions for external use
export function loadSound(
  id: string,
  src: string | string[],
  options: any = {},
): Howl | null {
  if (audioManager) {
    const sound = audioManager.loadSound(id, src, options)
    loadedSoundsStore.set(audioManager.getSoundIds())
    dispatch('soundLoaded', { id, src })
    return sound
  }
  return null
}

export function playSound(id: string): number | null {
  if (audioManager) {
    const playId = audioManager.play(id)
    if (playId !== null) {
      dispatch('soundPlayed', { id, playId })
    }
    return playId
  }
  return null
}

export function pauseSound(id: string) {
  if (audioManager) {
    audioManager.pause(id)
    dispatch('soundPaused', { id })
  }
}

export function stopSound(id: string) {
  if (audioManager) {
    audioManager.stop(id)
    dispatch('soundStopped', { id })
  }
}

export function setSoundVolume(id: string, volume: number) {
  if (audioManager) {
    audioManager.setVolume(id, volume)
    dispatch('soundVolumeChanged', { id, volume })
  }
}

export function unloadSound(id: string) {
  if (audioManager) {
    audioManager.unload(id)
    loadedSoundsStore.set(audioManager.getSoundIds())
    dispatch('soundUnloaded', { id })
  }
}

export function getAudioStats() {
  if (!audioManager) return null

  return {
    enabled,
    initialized: isInitialized,
    masterVolume: audioManager.getMasterVolume(),
    loadedSounds: audioManager.getSoundIds().length,
    spatialAudio: enableSpatialAudio,
  }
}

onDestroy(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('pointerdown', handleDelegatedPointerDown, true)
    window.removeEventListener('mouseover', handleMouseOver, true)
    window.removeEventListener('mouseout', handleMouseOut, true)
    window.removeEventListener('focusin', handleFocusIn, true)
    window.removeEventListener('focusout', handleFocusOut, true)
    window.removeEventListener('wheel', handleWheel)
    window.removeEventListener('keydown', handleKeyDown, true)
  }
  if (audioManager) {
    audioManager.dispose()
    runtimeDebugLog('🧹 Threlte Audio System disposed')
  }
})

// Export audio manager for external access
export { audioManager }
</script>

<!-- No visual output - this is a system component -->

{#if enabled && isInitialized}
  <!-- Audio context indicator -->
  <slot />
{/if}
