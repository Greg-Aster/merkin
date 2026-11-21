import { Howl, Howler } from 'howler'
import {
  type SiteAudioTrackConfig,
  clampSiteAudioVolume,
  getTracksForPathname,
  readSiteAudioVolume,
  siteAudioConfig,
} from '../config/audio'
import { homePortalEvents } from '../contracts/homePortal'
import {
  isSiteAudioActivationGesture,
  markSiteAudioUnlocked,
} from './site-audio-activation'
import { SiteAudioYouTubeBridge } from './site-audio-youtube'

export interface SiteAudioState {
  enabled: boolean
  masterVolume: number
  ambienceVolume: number
  sfxVolume: number
  activeTrackId: string | null
  activeTrackLabel: string | null
  hasConfiguredTracks: boolean
  suspended: boolean
  suspensionReason: string | null
}

type SiteAudioListener = (state: SiteAudioState) => void
type SiteAudioSyncOptions = {
  forceRescore?: boolean
}
type PageAmbientTrackConfig = Omit<SiteAudioTrackConfig, 'routes'> & {
  routes?: string[]
}
type NavigatorWithUserActivation = Navigator & {
  userActivation?: {
    isActive?: boolean
  }
}

export function resolvePageAmbientTrackConfig(
  payloadText: string | null | undefined,
  pathname: string,
): SiteAudioTrackConfig[] {
  if (!payloadText) return []

  try {
    const parsed = JSON.parse(payloadText) as
      | PageAmbientTrackConfig
      | PageAmbientTrackConfig[]
    const tracks = Array.isArray(parsed) ? parsed : [parsed]

    return tracks.flatMap((track, index) => {
      if (!track || typeof track !== 'object') return []
      if (
        typeof track.src !== 'string' ||
        track.src.length === 0 ||
        typeof track.label !== 'string' ||
        track.label.length === 0
      ) {
        return []
      }

      return [
        {
          id:
            typeof track.id === 'string' && track.id.length > 0
              ? track.id
              : `page-ambient:${pathname.replace(/\/+$/, '') || '/'}:${index}`,
          src: track.src,
          label: track.label,
          routes: [pathname],
          loop: track.loop,
          volume:
            typeof track.volume === 'number'
              ? Math.min(1, Math.max(0, track.volume))
              : undefined,
          html5: track.html5,
        },
      ]
    })
  } catch {
    return []
  }
}

class SiteAudioManager {
  private enabled = siteAudioConfig.enabledByDefault
  private masterVolume = siteAudioConfig.defaultMasterVolume
  private ambienceVolume = siteAudioConfig.defaultAmbienceVolume
  private sfxVolume = siteAudioConfig.defaultSfxVolume
  private currentTrack: SiteAudioTrackConfig | null = null
  private currentTrackPool: SiteAudioTrackConfig[] = []
  private queuedTrackPool: SiteAudioTrackConfig[] = []
  private currentHowl: Howl | null = null
  private listeners = new Set<SiteAudioListener>()
  private initialized = false
  private audioUnlocked = false
  private pendingPathname: string | null = null
  private suspended = false
  private suspensionReason: string | null = null
  private activeAudibleMedia = new Set<HTMLMediaElement>()
  private suspendedHowl: Howl | null = null
  private youtubeBridge = new SiteAudioYouTubeBridge(() => {
    this.syncEmbeddedMediaSuspension()
  })

  initialize(): void {
    if (this.initialized || typeof window === 'undefined') return

    this.initialized = true
    this.enabled = this.readStoredPreference()
    this.masterVolume = this.readStoredMasterVolume()
    this.ambienceVolume = this.readStoredAmbienceVolume()
    this.sfxVolume = this.readStoredSfxVolume()
    // The app owns audio activation so WebAudio resume attempts stay behind
    // known gesture gates instead of Howler also trying from scroll/touch fallbacks.
    Howler.autoUnlock = false
    Howler.autoSuspend = false
    Howler.html5PoolSize = 12

    this.pendingPathname = window.location.pathname
    this.bindMediaLifecycle()
    this.bindSuspensionEvents()
    this.youtubeBridge.bind()
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
      suspended: this.suspended,
      suspensionReason: this.suspensionReason,
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
      this.pendingPathname = window.location.pathname
      if (!this.suspended && this.hasUnlockedAudio()) {
        this.syncForPath(window.location.pathname, true)
      }
    }

    this.emit()
    this.notifyConfigChange()
  }

  setMasterVolume(nextVolume: number): void {
    const clampedVolume = clampSiteAudioVolume(
      nextVolume,
      siteAudioConfig.defaultMasterVolume,
    )
    this.masterVolume = clampedVolume
    this.writeStoredMasterVolume(clampedVolume)

    if (this.currentHowl && this.currentTrack && !this.suspended) {
      this.currentHowl.volume(this.resolveTrackVolume(this.currentTrack))
    }

    this.emit()
    this.notifyConfigChange()
  }

  setAmbienceVolume(nextVolume: number): void {
    const clampedVolume = clampSiteAudioVolume(
      nextVolume,
      siteAudioConfig.defaultAmbienceVolume,
    )
    this.ambienceVolume = clampedVolume
    this.writeStoredAmbienceVolume(clampedVolume)

    if (this.currentHowl && this.currentTrack && !this.suspended) {
      this.currentHowl.volume(this.resolveTrackVolume(this.currentTrack))
    }

    this.emit()
  }

  setSfxVolume(nextVolume: number): void {
    const clampedVolume = clampSiteAudioVolume(
      nextVolume,
      siteAudioConfig.defaultSfxVolume,
    )
    this.sfxVolume = clampedVolume
    this.writeStoredSfxVolume(clampedVolume)
    this.emit()
  }

  syncForPath(
    pathname: string,
    userInitiated = false,
    options: SiteAudioSyncOptions = {},
  ): void {
    this.pendingPathname = pathname
    const forceRescore = options.forceRescore === true

    if (!this.enabled) {
      this.stopCurrentTrack()
      this.emit()
      return
    }

    const hasUnlockedAudio = this.hasUnlockedAudio()

    if ((!hasUnlockedAudio && !userInitiated) || this.suspended) {
      if (!this.suspended) {
        this.stopCurrentTrack()
      }
      this.emit()
      return
    }

    const nextTrackPool = this.getTracksForCurrentPage(pathname)
    if (nextTrackPool.length === 0) {
      this.stopCurrentTrack()
      this.emit()
      return
    }

    const currentTrack = this.currentTrack
    if (
      !forceRescore &&
      this.currentHowl &&
      currentTrack &&
      nextTrackPool.some(track => this.isSameTrack(currentTrack, track))
    ) {
      this.currentTrackPool = nextTrackPool
      this.queuedTrackPool = this.queuedTrackPool.filter(queueTrack =>
        nextTrackPool.some(track => this.isSameTrack(queueTrack, track)),
      )
      if (
        (userInitiated || hasUnlockedAudio) &&
        !this.suspended &&
        !this.currentHowl.playing()
      ) {
        this.currentHowl.play()
      }
      this.emit()
      return
    }

    this.currentTrackPool = nextTrackPool
    this.queuedTrackPool = []
    const nextTrack = this.pickNextTrack(currentTrack)
    if (!nextTrack) {
      this.stopCurrentTrack()
      this.emit()
      return
    }

    if (
      this.currentHowl &&
      currentTrack &&
      this.isSameTrack(currentTrack, nextTrack)
    ) {
      if (
        (userInitiated || hasUnlockedAudio) &&
        !this.suspended &&
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

  private getTracksForCurrentPage(pathname: string): SiteAudioTrackConfig[] {
    const pageTracks = this.readPageAmbientTracks(pathname)
    return pageTracks.length > 0 ? pageTracks : getTracksForPathname(pathname)
  }

  private readPageAmbientTracks(pathname: string): SiteAudioTrackConfig[] {
    if (typeof document === 'undefined') return []

    const payload = document.getElementById('megameal-page-ambient-track')
    if (!payload) return []

    return resolvePageAmbientTrackConfig(payload.textContent, pathname)
  }

  private isSameTrack(
    currentTrack: SiteAudioTrackConfig,
    nextTrack: SiteAudioTrackConfig,
  ): boolean {
    return (
      currentTrack.id === nextTrack.id &&
      currentTrack.src === nextTrack.src &&
      currentTrack.label === nextTrack.label &&
      currentTrack.loop === nextTrack.loop &&
      currentTrack.volume === nextTrack.volume &&
      currentTrack.html5 === nextTrack.html5
    )
  }

  private swapTrack(nextTrack: SiteAudioTrackConfig): void {
    const previousHowl = this.currentHowl
    const previousTrack = this.currentTrack

    const nextHowl = new Howl({
      src: [encodeURI(nextTrack.src)],
      loop: this.shouldLoopTrack(nextTrack),
      volume: 0,
      html5: nextTrack.html5 ?? false,
      preload: true,
      onend: () => {
        if (this.currentHowl !== nextHowl) return
        this.playNextTrackFromPool(nextTrack)
      },
      onplayerror: (_soundId: number, error: unknown) => {
        console.warn(
          `Site ambience play failed for "${nextTrack.id}"`,
          nextTrack.src,
          error,
        )
        nextHowl.once('unlock', () => {
          nextHowl.play()
        })
      },
      onloaderror: (_soundId: number, error: unknown) => {
        console.warn(
          `Site ambience load failed for "${nextTrack.id}"`,
          nextTrack.src,
          error,
        )
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
    if (this.hasUnlockedAudio() && !this.suspended) {
      nextHowl.play()
    }

    if (previousHowl && previousTrack) {
      const startingVolume = previousHowl.volume()
      previousHowl.fade(startingVolume, 0, siteAudioConfig.fadeDurationMs)
      window.setTimeout(() => {
        previousHowl.stop()
        previousHowl.unload()
      }, siteAudioConfig.fadeDurationMs + 50)
    }
  }

  private shouldLoopTrack(track: SiteAudioTrackConfig): boolean {
    if (this.currentTrackPool.length <= 1) return track.loop ?? true

    return track.loop === true
  }

  private pickNextTrack(
    previousTrack: SiteAudioTrackConfig | null = this.currentTrack,
  ): SiteAudioTrackConfig | null {
    if (this.currentTrackPool.length === 0) return null
    if (this.currentTrackPool.length === 1) return this.currentTrackPool[0]

    if (this.queuedTrackPool.length === 0) {
      const candidates = this.currentTrackPool.filter(track => {
        return !previousTrack || !this.isSameTrack(previousTrack, track)
      })
      this.queuedTrackPool = this.shuffleTracks(
        candidates.length > 0 ? candidates : this.currentTrackPool,
      )
    }

    return this.queuedTrackPool.shift() ?? null
  }

  private shuffleTracks(
    tracks: SiteAudioTrackConfig[],
  ): SiteAudioTrackConfig[] {
    const shuffled = [...tracks]
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      const current = shuffled[index]
      shuffled[index] = shuffled[swapIndex]
      shuffled[swapIndex] = current
    }

    return shuffled
  }

  private playNextTrackFromPool(previousTrack: SiteAudioTrackConfig): void {
    if (
      !this.enabled ||
      this.suspended ||
      !this.hasUnlockedAudio() ||
      this.currentTrackPool.length <= 1
    ) {
      return
    }

    const nextTrack = this.pickNextTrack(previousTrack)
    if (nextTrack) {
      this.swapTrack(nextTrack)
      this.emit()
    }
  }

  async unlockFromGesture(event?: Event): Promise<boolean> {
    if (typeof window === 'undefined') return false

    if (this.hasUnlockedAudio()) {
      this.setAudioUnlocked()
      if (this.enabled && this.pendingPathname && !this.suspended) {
        this.syncForPath(this.pendingPathname, true)
      } else {
        this.emit()
      }

      return true
    }

    try {
      const userActivation = (navigator as NavigatorWithUserActivation)
        .userActivation
      const hasTrustedGesture =
        event?.isTrusted === true && isSiteAudioActivationGesture(event)
      if (userActivation?.isActive === false && !hasTrustedGesture) {
        return false
      }

      const ctx = Howler.ctx
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume()
      }
      if (ctx ? ctx.state === 'running' : true) {
        this.setAudioUnlocked()
      }
    } catch (error) {
      console.warn('Site audio unlock failed:', error)
      return false
    }

    if (
      this.audioUnlocked &&
      this.enabled &&
      this.pendingPathname &&
      !this.suspended
    ) {
      this.syncForPath(this.pendingPathname, true)
    } else {
      this.emit()
    }

    return this.audioUnlocked
  }

  suspendAmbience(reason = 'external-media'): void {
    this.suspended = true
    this.suspensionReason = reason

    if (this.currentHowl) {
      this.pauseCurrentTrack()
    }

    this.emit()
  }

  resumeAmbience(reason?: string): void {
    if (reason && this.suspensionReason && this.suspensionReason !== reason) {
      return
    }

    this.suspended = false
    this.suspensionReason = null

    if (this.enabled && this.hasUnlockedAudio()) {
      if (this.currentHowl && this.currentTrack) {
        this.resumeCurrentTrack()
      } else if (this.pendingPathname) {
        this.syncForPath(this.pendingPathname, true)
      }
    } else {
      this.emit()
    }
  }

  private stopCurrentTrack(): void {
    if (!this.currentHowl) {
      this.currentTrack = null
      this.currentTrackPool = []
      this.queuedTrackPool = []
      this.suspendedHowl = null
      return
    }

    const howlToStop = this.currentHowl
    const startingVolume = howlToStop.volume()

    this.currentHowl = null
    this.currentTrack = null
    this.currentTrackPool = []
    this.queuedTrackPool = []
    if (this.suspendedHowl === howlToStop) {
      this.suspendedHowl = null
    }

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
    if (typeof window === 'undefined')
      return siteAudioConfig.defaultMasterVolume

    return this.readStoredVolume(
      siteAudioConfig.masterVolumeStorageKey,
      siteAudioConfig.defaultMasterVolume,
    )
  }

  private writeStoredMasterVolume(volume: number): void {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      siteAudioConfig.masterVolumeStorageKey,
      String(volume),
    )
  }

  private readStoredAmbienceVolume(): number {
    if (typeof window === 'undefined')
      return siteAudioConfig.defaultAmbienceVolume

    return this.readStoredVolume(
      siteAudioConfig.ambienceVolumeStorageKey,
      siteAudioConfig.defaultAmbienceVolume,
      siteAudioConfig.legacyVolumeStorageKey,
    )
  }

  private writeStoredAmbienceVolume(volume: number): void {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      siteAudioConfig.ambienceVolumeStorageKey,
      String(volume),
    )
  }

  private readStoredSfxVolume(): number {
    if (typeof window === 'undefined') return siteAudioConfig.defaultSfxVolume

    return this.readStoredVolume(
      siteAudioConfig.sfxVolumeStorageKey,
      siteAudioConfig.defaultSfxVolume,
      siteAudioConfig.legacyVolumeStorageKey,
    )
  }

  private writeStoredSfxVolume(volume: number): void {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      siteAudioConfig.sfxVolumeStorageKey,
      String(volume),
    )
  }

  private readStoredVolume(
    storageKey: string,
    fallback: number,
    legacyStorageKey?: string,
  ): number {
    const stored = readSiteAudioVolume(window.localStorage.getItem(storageKey))
    if (stored !== null) return stored

    if (legacyStorageKey) {
      const legacy = readSiteAudioVolume(
        window.localStorage.getItem(legacyStorageKey),
      )
      if (legacy !== null) return legacy
    }

    return fallback
  }

  private hasUnlockedAudio(): boolean {
    if (this.audioUnlocked) return true

    if (Howler.ctx?.state !== 'running') return false

    this.setAudioUnlocked()
    return true
  }

  private setAudioUnlocked(): void {
    this.audioUnlocked = true
    markSiteAudioUnlocked()
  }

  private resolveTrackVolume(track: SiteAudioTrackConfig): number {
    return Math.min(
      1,
      Math.max(
        0,
        this.masterVolume * this.ambienceVolume * (track.volume ?? 1),
      ),
    )
  }

  private pauseCurrentTrack(): void {
    if (!this.currentHowl || !this.currentTrack) return

    const howlToPause = this.currentHowl
    this.suspendedHowl = howlToPause
    const startingVolume = howlToPause.volume()

    howlToPause.fade(startingVolume, 0, siteAudioConfig.fadeDurationMs)
    window.setTimeout(() => {
      if (this.suspendedHowl !== howlToPause || !this.suspended) return
      howlToPause.pause()
    }, siteAudioConfig.fadeDurationMs + 50)
  }

  private resumeCurrentTrack(): void {
    if (!this.currentHowl || !this.currentTrack) return

    const targetVolume = this.resolveTrackVolume(this.currentTrack)
    if (!this.currentHowl.playing()) {
      this.currentHowl.play()
    }
    this.currentHowl.fade(0, targetVolume, siteAudioConfig.fadeDurationMs)
    this.suspendedHowl = null
    this.emit()
  }

  private bindMediaLifecycle(): void {
    const syncMediaState = (target: EventTarget | null) => {
      if (!(target instanceof HTMLMediaElement)) return

      if (this.isMediaAudible(target)) {
        this.activeAudibleMedia.add(target)
      } else {
        this.activeAudibleMedia.delete(target)
      }

      this.syncEmbeddedMediaSuspension()
    }

    const refreshMediaState = () => {
      this.activeAudibleMedia = new Set(
        Array.from(document.querySelectorAll('audio, video')).filter(
          (element): element is HTMLMediaElement =>
            element instanceof HTMLMediaElement && this.isMediaAudible(element),
        ),
      )
      this.youtubeBridge.clearActivePlayers()
      this.syncEmbeddedMediaSuspension()
    }

    document.addEventListener(
      'play',
      event => syncMediaState(event.target),
      true,
    )
    document.addEventListener(
      'pause',
      event => syncMediaState(event.target),
      true,
    )
    document.addEventListener(
      'ended',
      event => syncMediaState(event.target),
      true,
    )
    document.addEventListener(
      'emptied',
      event => syncMediaState(event.target),
      true,
    )
    document.addEventListener(
      'volumechange',
      event => syncMediaState(event.target),
      true,
    )
    document.addEventListener('astro:page-load', refreshMediaState)
  }

  private bindSuspensionEvents(): void {
    window.addEventListener(homePortalEvents.audioSuspend, event => {
      const detail =
        event instanceof CustomEvent
          ? (event.detail as { reason?: string } | undefined)
          : undefined
      this.suspendAmbience(detail?.reason ?? 'external-request')
    })

    window.addEventListener(homePortalEvents.audioResume, event => {
      const detail =
        event instanceof CustomEvent
          ? (event.detail as { reason?: string } | undefined)
          : undefined
      this.resumeAmbience(detail?.reason)
    })
  }

  private isMediaAudible(element: HTMLMediaElement): boolean {
    return (
      !element.paused && !element.ended && !element.muted && element.volume > 0
    )
  }

  private syncEmbeddedMediaSuspension(): void {
    const hasActiveEmbeddedMedia =
      this.activeAudibleMedia.size > 0 || this.youtubeBridge.hasActivePlayers()

    if (hasActiveEmbeddedMedia) {
      this.suspendAmbience('embedded-media')
    } else if (this.suspended && this.suspensionReason === 'embedded-media') {
      this.resumeAmbience('embedded-media')
    }
  }

  private emit(): void {
    const state = this.getState()
    this.listeners.forEach(listener => listener(state))
  }

  private notifyConfigChange(): void {
    if (typeof window === 'undefined') return

    window.dispatchEvent(
      new CustomEvent(homePortalEvents.audioConfigChange, {
        detail: this.getState(),
      }),
    )
  }
}

export const siteAudioManager = new SiteAudioManager()
