<!-- 
  Threlte Audio System Component
  Replaces AudioManager.ts with reactive audio management
-->
<script lang="ts">
import { useTask } from '@threlte/core'
import { onMount, onDestroy, createEventDispatcher } from 'svelte'
import { writable } from 'svelte/store'
import { Howl, Howler } from 'howler'
import { isSoundEnabled } from '../stores/uiStore'

// Audio configuration
export let enabled = false // Disabled by default for performance
export let masterVolume = 0.7
export let enableSpatialAudio = true

const dispatch = createEventDispatcher()

// Simple audio manager implementation using Howler.js
class SimpleAudioManager {
  private sounds: Map<string, Howl> = new Map()
  private masterVolume: number = 0.7
  private initialized: boolean = false
  
  async initialize() {
    try {
      // Set up Howler global settings
      Howler.volume(this.masterVolume)
      Howler.autoSuspend = false
      
      this.initialized = true
      console.log('🎵 SimpleAudioManager initialized with Howler.js')
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

onMount(async () => {
  // Update stores
  audioEnabledStore.set(enabled)
  masterVolumeStore.set(masterVolume)
  
  if (!enabled) {
    console.log('🔇 Audio system disabled for performance')
    return
  }

  try {
    console.log('🎵 Initializing Threlte Audio System...')
    
    // Create and initialize audio manager
    audioManager = new SimpleAudioManager()
    await audioManager.initialize()
    
    // Configure audio settings
    audioManager.setMasterVolume(masterVolume)
    
    isInitialized = true
    console.log('✅ Threlte Audio System initialized')
    
    dispatch('audioInitialized', { audioManager })
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
  audioManager.setMasterVolume(masterVolume)
  masterVolumeStore.set(masterVolume)
}

// Reactive sound enabled/disabled changes
$: if (audioManager) {
  if ($isSoundEnabled) {
    audioManager.setMasterVolume(masterVolume)
  } else {
    audioManager.setMasterVolume(0)
  }
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
  if (audioManager) {
    audioManager.dispose()
    console.log('🧹 Threlte Audio System disposed')
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