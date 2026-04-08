import { Howl } from 'howler'
import {
  siteAudioConfig,
  siteSfxProfile,
  type AudioSfxConfig,
  type AudioSfxId,
} from '../config/audio'

export type SiteSfxId = AudioSfxId

declare global {
  interface Window {
    playSiteSfx?: (id: SiteSfxId) => void
  }
}

const sfxConfigMap: Record<SiteSfxId, AudioSfxConfig> = siteSfxProfile

class SiteSfxManager {
  private howls = new Map<SiteSfxId, Howl>()
  private initialized = false

  initialize(): void {
    if (this.initialized || typeof window === 'undefined') return

    this.initialized = true
    window.playSiteSfx = (id: SiteSfxId) => {
      this.play(id)
    }
  }

  play(id: SiteSfxId): void {
    if (typeof window === 'undefined') return
    if (!this.isAudioEnabled()) return

    const config = sfxConfigMap[id]
    if (!config) return

    const howl = this.getHowl(config)
    howl.volume(this.getResolvedVolume(config))
    if (config.interrupt !== false) {
      howl.stop()
    }

    const playId = howl.play()
    if (typeof playId === 'number') {
      howl.rate(this.getResolvedRate(config), playId)
    }
  }

  private getHowl(config: AudioSfxConfig): Howl {
    const existing = this.howls.get(config.id)
    if (existing) return existing

    const howl = new Howl({
      src: [encodeURI(config.src)],
      volume: this.getResolvedVolume(config),
      preload: true,
      html5: config.html5 ?? false,
    })

    this.howls.set(config.id, howl)
    return howl
  }

  private isAudioEnabled(): boolean {
    if (typeof window === 'undefined') return false

    const stored = window.localStorage.getItem(siteAudioConfig.storageKey)
    return stored === 'true'
  }

  private getMasterVolume(): number {
    if (typeof window === 'undefined') return siteAudioConfig.defaultMasterVolume

    const stored = Number(window.localStorage.getItem(siteAudioConfig.masterVolumeStorageKey))
    if (!Number.isFinite(stored)) return siteAudioConfig.defaultMasterVolume

    return Math.min(1, Math.max(0, stored))
  }

  private getSfxVolume(): number {
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

  private getResolvedVolume(config: AudioSfxConfig): number {
    return Math.min(1, Math.max(0, this.getMasterVolume() * this.getSfxVolume() * config.volume))
  }

  private getResolvedRate(config: AudioSfxConfig): number {
    const baseRate = config.rate ?? 1
    const jitter = config.rateJitter ?? 0
    if (jitter <= 0) return baseRate

    const randomized = baseRate + (Math.random() * jitter * 2 - jitter)
    return Math.min(1.25, Math.max(0.65, randomized))
  }
}

export const siteSfxManager = new SiteSfxManager()

export function playSiteSfx(id: SiteSfxId): void {
  siteSfxManager.play(id)
}
