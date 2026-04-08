import { Howl, Howler } from 'howler'
import {
  getTrackForPathname,
  siteAudioConfig,
  type SiteAudioTrackConfig,
} from '../config/audio'

export interface SiteAudioState {
  enabled: boolean
  masterVolume: number
  ambienceVolume: number
  sfxVolume: number
  activeTrackId: string | null
  activeTrackLabel: string | null
  hasConfiguredTracks: boolean
}

type SiteAudioListener = (state: SiteAudioState) => void

class SiteAudioManager {
  private enabled = siteAudioConfig.enabledByDefault
  private masterVolume = siteAudioConfig.defaultMasterVolume
  private ambienceVolume = siteAudioConfig.defaultAmbienceVolume
  private sfxVolume = siteAudioConfig.defaultSfxVolume
  private currentTrack: SiteAudioTrackConfig | null = null
  private currentHowl: Howl | null = null
  private listeners = new Set<SiteAudioListener>()
  private initialized = false

  initialize(): void {
    if (this.initialized || typeof window === 'undefined') return

    this.initialized = true
    this.enabled = this.readStoredPreference()
    this.masterVolume = this.readStoredMasterVolume()
    this.ambienceVolume = this.readStoredAmbienceVolume()
    this.sfxVolume = this.readStoredSfxVolume()
    Howler.autoUnlock = true
    Howler.html5PoolSize = 4

    this.syncForPath(window.location.pathname)
    this.emit()
  }

  subscribe(listener: SiteAudioListener): () => void {
    this.listeners.add(listener)
    listener(this.getState())
    return () => {
      this.listeners.delete(listener)
    }
  }

  getState(): SiteAudioState {
    return {
      enabled: this.enabled,
      masterVolume: this.masterVolume,
      ambienceVolume: this.ambienceVolume,
      sfxVolume: this.sfxVolume,
      activeTrackId: this.currentTrack?.id ?? null,
      activeTrackLabel: this.currentTrack?.label ?? null,
      hasConfiguredTracks: siteAudioConfig.tracks.length > 0,
    }
  }

  toggle(): void {
    this.setEnabled(!this.enabled)
  }

  setEnabled(nextEnabled: boolean): void {
    this.enabled = nextEnabled
    this.writeStoredPreference(nextEnabled)

    if (!nextEnabled) {
      this.stopCurrentTrack()
    } else if (typeof window !== 'undefined') {
      this.syncForPath(window.location.pathname, true)
    }

    this.emit()
  }

  setMasterVolume(nextVolume: number): void {
    const clampedVolume = Math.min(1, Math.max(0, nextVolume))
    this.masterVolume = clampedVolume
    this.writeStoredMasterVolume(clampedVolume)

    if (this.currentHowl && this.currentTrack) {
      this.currentHowl.volume(this.resolveTrackVolume(this.currentTrack))
    }

    this.emit()
  }

  setAmbienceVolume(nextVolume: number): void {
    const clampedVolume = Math.min(1, Math.max(0, nextVolume))
    this.ambienceVolume = clampedVolume
    this.writeStoredAmbienceVolume(clampedVolume)

    if (this.currentHowl && this.currentTrack) {
      this.currentHowl.volume(this.resolveTrackVolume(this.currentTrack))
    }

    this.emit()
  }

  setSfxVolume(nextVolume: number): void {
    const clampedVolume = Math.min(1, Math.max(0, nextVolume))
    this.sfxVolume = clampedVolume
    this.writeStoredSfxVolume(clampedVolume)
    this.emit()
  }

  syncForPath(pathname: string, userInitiated = false): void {
    if (!this.enabled) {
      this.stopCurrentTrack()
      this.emit()
      return
    }

    const nextTrack = getTrackForPathname(pathname)
    if (!nextTrack) {
      this.stopCurrentTrack()
      this.emit()
      return
    }

    if (
      this.currentTrack?.id === nextTrack.id &&
      this.currentHowl
    ) {
      if (
        userInitiated &&
        !this.currentHowl.playing()
      ) {
        this.currentHowl.play()
      }
      this.emit()
      return
    }

    this.swapTrack(nextTrack)
    this.emit()
  }

  private swapTrack(nextTrack: SiteAudioTrackConfig): void {
    const previousHowl = this.currentHowl
    const previousTrack = this.currentTrack

    const nextHowl = new Howl({
      src: [encodeURI(nextTrack.src)],
      loop: nextTrack.loop ?? true,
      volume: 0,
      html5: nextTrack.html5 ?? true,
      preload: true,
      onplayerror: () => {
        nextHowl.once('unlock', () => {
          nextHowl.play()
        })
      },
      onloaderror: () => {
        if (this.currentHowl === nextHowl) {
          this.currentHowl = null
          this.currentTrack = null
          this.emit()
        }
      },
    })

    this.currentHowl = nextHowl
    this.currentTrack = nextTrack

    const targetVolume = this.resolveTrackVolume(nextTrack)

    nextHowl.once('play', () => {
      nextHowl.fade(0, targetVolume, siteAudioConfig.fadeDurationMs)
    })
    nextHowl.play()

    if (previousHowl && previousTrack) {
      const startingVolume = previousHowl.volume()
      previousHowl.fade(startingVolume, 0, siteAudioConfig.fadeDurationMs)
      window.setTimeout(() => {
        previousHowl.stop()
        previousHowl.unload()
      }, siteAudioConfig.fadeDurationMs + 50)
    }
  }

  private stopCurrentTrack(): void {
    if (!this.currentHowl) {
      this.currentTrack = null
      return
    }

    const howlToStop = this.currentHowl
    const startingVolume = howlToStop.volume()

    this.currentHowl = null
    this.currentTrack = null

    howlToStop.fade(startingVolume, 0, siteAudioConfig.fadeDurationMs)
    window.setTimeout(() => {
      howlToStop.stop()
      howlToStop.unload()
    }, siteAudioConfig.fadeDurationMs + 50)
  }

  private readStoredPreference(): boolean {
    if (typeof window === 'undefined') return siteAudioConfig.enabledByDefault

    const stored = window.localStorage.getItem(siteAudioConfig.storageKey)
    if (stored === null) return siteAudioConfig.enabledByDefault
    return stored === 'true'
  }

  private writeStoredPreference(enabled: boolean): void {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(siteAudioConfig.storageKey, String(enabled))
  }

  private readStoredMasterVolume(): number {
    if (typeof window === 'undefined') return siteAudioConfig.defaultMasterVolume

    const stored = Number(window.localStorage.getItem(siteAudioConfig.masterVolumeStorageKey))
    if (!Number.isFinite(stored)) return siteAudioConfig.defaultMasterVolume

    return Math.min(1, Math.max(0, stored))
  }

  private writeStoredMasterVolume(volume: number): void {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(siteAudioConfig.masterVolumeStorageKey, String(volume))
  }

  private readStoredAmbienceVolume(): number {
    if (typeof window === 'undefined') return siteAudioConfig.defaultAmbienceVolume

    const stored = Number(window.localStorage.getItem(siteAudioConfig.ambienceVolumeStorageKey))
    if (Number.isFinite(stored)) {
      return Math.min(1, Math.max(0, stored))
    }

    const legacy = Number(window.localStorage.getItem(siteAudioConfig.legacyVolumeStorageKey))
    if (Number.isFinite(legacy)) {
      return Math.min(1, Math.max(0, legacy))
    }

    return siteAudioConfig.defaultAmbienceVolume
  }

  private writeStoredAmbienceVolume(volume: number): void {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(siteAudioConfig.ambienceVolumeStorageKey, String(volume))
  }

  private readStoredSfxVolume(): number {
    if (typeof window === 'undefined') return siteAudioConfig.defaultSfxVolume

    const stored = Number(window.localStorage.getItem(siteAudioConfig.sfxVolumeStorageKey))
    if (Number.isFinite(stored)) {
      return Math.min(1, Math.max(0, stored))
    }

    const legacy = Number(window.localStorage.getItem(siteAudioConfig.legacyVolumeStorageKey))
    if (Number.isFinite(legacy)) {
      return Math.min(1, Math.max(0, legacy))
    }

    return siteAudioConfig.defaultSfxVolume
  }

  private writeStoredSfxVolume(volume: number): void {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(siteAudioConfig.sfxVolumeStorageKey, String(volume))
  }

  private resolveTrackVolume(track: SiteAudioTrackConfig): number {
    return Math.min(1, Math.max(0, this.masterVolume * this.ambienceVolume * (track.volume ?? 1)))
  }

  private emit(): void {
    const state = this.getState()
    this.listeners.forEach(listener => listener(state))
  }
}

export const siteAudioManager = new SiteAudioManager()
