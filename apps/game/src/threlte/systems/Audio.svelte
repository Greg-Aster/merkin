<!-- 
  Threlte Audio System Component
  Replaces AudioManager.ts with reactive audio management
-->
<script lang="ts">
import { useTask } from '@threlte/core'
import { onMount, onDestroy, createEventDispatcher } from 'svelte'
import { writable } from 'svelte/store'
import { Howl, Howler } from 'howler'
import {
  type AudioSfxConfig,
  type AudioSfxId,
} from '@merkin/shared-audio/audio-ids'
import { gameAudioProfile } from '@merkin/shared-audio/game-audio-profile'
import {
  ambienceVolumeSetting,
  isSoundEnabled,
  masterVolumeSetting,
  sfxVolumeSetting,
} from '../stores/uiStore'

// Audio configuration
export let enabled = false // Disabled by default for performance
export let masterVolume = 0.7
export let enableSpatialAudio = true

const dispatch = createEventDispatcher()
const GAME_AMBIENCE_ID = gameAudioProfile.ambience.id
const GAME_AUDIO_BASE = import.meta.env.BASE_URL || '/'
const isDev = import.meta.env.DEV

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
      if (isDev) {
        console.log('🎵 SimpleAudioManager initialized with Howler.js')
      }
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
      ...options
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

function isUiTarget(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement
}

function ensureSound(id: string, src: string | string[], options: any = {}) {
  if (!audioManager) return null
  const existing = audioManager.getSound(id)
  if (existing) return existing
  const resolved = Array.isArray(src) ? src.map(resolveAudioSrc) : resolveAudioSrc(src)
  return audioManager.loadSound(id, resolved, options)
}

function resolveAudioSrc(src: string): string {
  if (/^(https?:)?\/\//.test(src)) return src

  const runtimeBase = typeof window !== 'undefined'
    ? (
        window.location.pathname === '/game' || window.location.pathname.startsWith('/game/')
          ? '/game/'
          : '/'
      )
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

  const target = isUiTarget(event.target) ? event.target : null

  if (target?.closest('input[type="range"], input[type="checkbox"], select, textarea')) {
    return
  }

  if (target?.closest('.settings-button, .settings-overlay, .settings-panel')) {
    playConfiguredSfx('panel-open')
    return
  }

  if (target?.closest('button, a[href], [role="button"]')) {
    playConfiguredSfx('select')
    return
  }

  playConfiguredSfx('soft')
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

  playConfiguredSfx('soft', { volume: 0.18 })
}

onMount(async () => {
  // Update stores
  audioEnabledStore.set(enabled)
  masterVolumeStore.set(masterVolume)
  
  if (!enabled) {
    if (isDev) {
      console.log('🔇 Audio system disabled for performance')
    }
    return
  }

  try {
    if (isDev) {
      console.log('🎵 Initializing Threlte Audio System...')
    }
    
    // Create and initialize audio manager
    audioManager = new SimpleAudioManager()
    await audioManager.initialize()
    
    // Configure audio settings
    audioManager.setMasterVolume(masterVolume)
    ensureConfiguredAmbience()
    ensureConfiguredSfx('soft')
    ensureConfiguredSfx('select')
    ensureConfiguredSfx('panel-open')
    ensureConfiguredSfx('panel-back')
    ensureConfiguredSfx('error')
    ensureConfiguredSfx('scroll')
    
    isInitialized = true
    if (isDev) {
      console.log('✅ Threlte Audio System initialized')
    }
    
    dispatch('audioInitialized', { audioManager })
    window.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('wheel', handleWheel, { passive: true })
    window.addEventListener('keydown', handleKeyDown, true)
  } catch (error) {
    console.error('❌ Failed to initialize Threlte Audio System:', error)
    dispatch('audioError', { error })
  }
})

// Update audio system
useTask((delta) => {
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
  return Math.min(1, Math.max(0, $masterVolumeSetting * $ambienceVolumeSetting * baseVolume))
}

function resolveSfxVolume(baseVolume: number): number {
  return Math.min(1, Math.max(0, $masterVolumeSetting * $sfxVolumeSetting * baseVolume))
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
export function loadSound(id: string, src: string | string[], options: any = {}): Howl | null {
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
    spatialAudio: enableSpatialAudio
  }
}

onDestroy(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('pointerdown', handlePointerDown, true)
    window.removeEventListener('wheel', handleWheel)
    window.removeEventListener('keydown', handleKeyDown, true)
  }
  if (audioManager) {
    audioManager.dispose()
    if (isDev) {
      console.log('🧹 Threlte Audio System disposed')
    }
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
