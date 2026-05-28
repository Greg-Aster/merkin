import { Howl, Howler } from 'howler'
import {
  type AudioSfxConfig,
  type AudioSfxId,
  siteAudioConfig,
  siteSfxProfile,
} from '../config/audio'
import { markSiteAudioUnlocked } from './site-audio-activation'

export type SiteSfxId = AudioSfxId

const sfxConfigMap: Record<SiteSfxId, AudioSfxConfig> = siteSfxProfile

class SiteSfxManager {
  private howls = new Map<SiteSfxId, Howl>()
  private lastPlayedAt = new Map<SiteSfxId, number>()
  private initialized = false
  private audioUnlocked = false

  initialize(): void {
    if (this.initialized || typeof window === 'undefined') return

    this.initialized = true
    Howler.autoUnlock = true
  }

  hasUnlockedAudio(): boolean {
    if (this.audioUnlocked) return true

    if (Howler.ctx?.state !== 'running') return false

    this.setAudioUnlocked()
    return true
  }

  async unlockFromGesture(): Promise<boolean> {
    if (typeof window === 'undefined') return false

    try {
      // Call this only from direct activation handlers. Wheel and touchmove
      // paths should use playIfUnlocked so they never trigger autoplay blocks.
      const userActivation = (
        navigator as Navigator & {
          userActivation?: { isActive?: boolean }
        }
      ).userActivation
      if (!this.hasUnlockedAudio() && userActivation?.isActive === false) {
        return false
      }

      const ctx = Howler.ctx
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume()
      }
      if (ctx ? ctx.state === 'running' : true) {
        this.setAudioUnlocked()
      }
      return this.audioUnlocked
    } catch (error) {
      console.warn('Site SFX unlock failed:', error)
      return false
    }
  }

  playIfUnlocked(id: SiteSfxId): void {
    if (!this.hasUnlockedAudio()) return

    this.play(id)
  }

  play(id: SiteSfxId): void {
    if (typeof window === 'undefined') return
    if (!this.isAudioEnabled()) return

    const config = sfxConfigMap[id]
    if (!config) return
    if (this.isCoolingDown(config)) return

    const howl = this.getHowl(config)
    howl.volume(this.getResolvedVolume(config))
    if (config.interrupt !== false) {
      howl.stop()
    }

    const playId = howl.play()
    if (typeof playId === 'number') {
      this.lastPlayedAt.set(id, window.performance.now())
      howl.rate(this.getResolvedRate(config), playId)
    }
  }

  private isCoolingDown(config: AudioSfxConfig): boolean {
    const cooldownMs = config.cooldownMs ?? 0
    if (cooldownMs <= 0) return false

    const lastPlayedAt = this.lastPlayedAt.get(config.id) ?? -Infinity
    return window.performance.now() - lastPlayedAt < cooldownMs
  }

  private getHowl(config: AudioSfxConfig): Howl {
    const existing = this.howls.get(config.id)
    if (existing) return existing

    const howl = new Howl({
      src: [encodeURI(config.src)],
      volume: this.getResolvedVolume(config),
      preload: true,
      html5: config.html5 ?? false,
      onloaderror: (_soundId: number, error: unknown) => {
        console.warn(
          `Site SFX load failed for "${config.id}"`,
          config.src,
          error,
        )
      },
      onplayerror: (_soundId: number, error: unknown) => {
        console.warn(
          `Site SFX play failed for "${config.id}"`,
          config.src,
          error,
        )
        howl.once('unlock', () => {
          howl.play()
        })
      },
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
    if (typeof window === 'undefined')
      return siteAudioConfig.defaultMasterVolume

    const stored = Number(
      window.localStorage.getItem(siteAudioConfig.masterVolumeStorageKey),
    )
    if (!Number.isFinite(stored)) return siteAudioConfig.defaultMasterVolume

    return Math.min(1, Math.max(0, stored))
  }

  private getSfxVolume(): number {
    if (typeof window === 'undefined') return siteAudioConfig.defaultSfxVolume

    const stored = Number(
      window.localStorage.getItem(siteAudioConfig.sfxVolumeStorageKey),
    )
    if (Number.isFinite(stored)) {
      return Math.min(1, Math.max(0, stored))
    }

    const legacy = Number(
      window.localStorage.getItem(siteAudioConfig.legacyVolumeStorageKey),
    )
    if (Number.isFinite(legacy)) {
      return Math.min(1, Math.max(0, legacy))
    }

    return siteAudioConfig.defaultSfxVolume
  }

  private getResolvedVolume(config: AudioSfxConfig): number {
    return Math.min(
      1,
      Math.max(0, this.getMasterVolume() * this.getSfxVolume() * config.volume),
    )
  }

  private getResolvedRate(config: AudioSfxConfig): number {
    const baseRate = config.rate ?? 1
    const jitter = config.rateJitter ?? 0
    if (jitter <= 0) return baseRate

    const randomized = baseRate + (Math.random() * jitter * 2 - jitter)
    return Math.min(1.25, Math.max(0.65, randomized))
  }

  private setAudioUnlocked(): void {
    this.audioUnlocked = true
    markSiteAudioUnlocked()
  }
}

export const siteSfxManager = new SiteSfxManager()

export function playSiteSfx(id: SiteSfxId): void {
  siteSfxManager.play(id)
}
