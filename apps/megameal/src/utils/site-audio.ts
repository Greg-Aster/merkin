import { Howl, Howler } from 'howler'
import {
  getTrackForPathname,
  siteAudioConfig,
  type SiteAudioTrackConfig,
} from '../config/audio'

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: string | HTMLIFrameElement,
        options: {
          events?: {
            onStateChange?: (event: { data: number }) => void
          }
        },
      ) => unknown
      PlayerState: {
        PLAYING: number
        PAUSED: number
        ENDED: number
        CUED: number
      }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

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

class SiteAudioManager {
  private enabled = siteAudioConfig.enabledByDefault
  private masterVolume = siteAudioConfig.defaultMasterVolume
  private ambienceVolume = siteAudioConfig.defaultAmbienceVolume
  private sfxVolume = siteAudioConfig.defaultSfxVolume
  private currentTrack: SiteAudioTrackConfig | null = null
  private currentHowl: Howl | null = null
  private listeners = new Set<SiteAudioListener>()
  private initialized = false
  private audioUnlocked = false
  private pendingPathname: string | null = null
  private suspended = false
  private suspensionReason: string | null = null
  private activeAudibleMedia = new Set<HTMLMediaElement>()
  private activeYouTubePlayers = new Set<string>()
  private suspendedHowl: Howl | null = null
  private youtubeApiPromise: Promise<void> | null = null
  private boundYouTubeFrames = new WeakSet<HTMLIFrameElement>()
  private youtubeFrameCounter = 0

  initialize(): void {
    if (this.initialized || typeof window === 'undefined') return

    this.initialized = true
    this.enabled = this.readStoredPreference()
    this.masterVolume = this.readStoredMasterVolume()
    this.ambienceVolume = this.readStoredAmbienceVolume()
    this.sfxVolume = this.readStoredSfxVolume()
    Howler.autoUnlock = true
    Howler.html5PoolSize = 12

    this.pendingPathname = window.location.pathname
    this.bindMediaLifecycle()
    this.bindSuspensionEvents()
    this.bindYouTubeEmbeds()
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
      if (!this.suspended && this.audioUnlocked) {
        this.syncForPath(window.location.pathname, true)
      }
    }

    this.emit()
  }

  setMasterVolume(nextVolume: number): void {
    const clampedVolume = Math.min(1, Math.max(0, nextVolume))
    this.masterVolume = clampedVolume
    this.writeStoredMasterVolume(clampedVolume)

    if (this.currentHowl && this.currentTrack && !this.suspended) {
      this.currentHowl.volume(this.resolveTrackVolume(this.currentTrack))
    }

    this.emit()
  }

  setAmbienceVolume(nextVolume: number): void {
    const clampedVolume = Math.min(1, Math.max(0, nextVolume))
    this.ambienceVolume = clampedVolume
    this.writeStoredAmbienceVolume(clampedVolume)

    if (this.currentHowl && this.currentTrack && !this.suspended) {
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
    this.pendingPathname = pathname

    if (!this.enabled) {
      this.stopCurrentTrack()
      this.emit()
      return
    }

    if ((!this.audioUnlocked && !userInitiated) || this.suspended) {
      if (!this.suspended) {
        this.stopCurrentTrack()
      }
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
        (userInitiated || this.audioUnlocked) &&
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

  private swapTrack(nextTrack: SiteAudioTrackConfig): void {
    const previousHowl = this.currentHowl
    const previousTrack = this.currentTrack

    const nextHowl = new Howl({
      src: [encodeURI(nextTrack.src)],
      loop: nextTrack.loop ?? true,
      volume: 0,
      html5: nextTrack.html5 ?? false,
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
    if (this.audioUnlocked && !this.suspended) {
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

  async unlockFromGesture(): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      const ctx = Howler.ctx
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume()
      }
      this.audioUnlocked = true
    } catch (error) {
      console.warn('Site audio unlock failed:', error)
      return
    }

    if (this.enabled && this.pendingPathname && !this.suspended) {
      this.syncForPath(this.pendingPathname, true)
    } else {
      this.emit()
    }
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

    if (this.enabled && this.audioUnlocked) {
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
      this.suspendedHowl = null
      return
    }

    const howlToStop = this.currentHowl
    const startingVolume = howlToStop.volume()

    this.currentHowl = null
    this.currentTrack = null
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
      this.activeYouTubePlayers.clear()
      this.syncEmbeddedMediaSuspension()
    }

    document.addEventListener('play', (event) => syncMediaState(event.target), true)
    document.addEventListener('pause', (event) => syncMediaState(event.target), true)
    document.addEventListener('ended', (event) => syncMediaState(event.target), true)
    document.addEventListener('emptied', (event) => syncMediaState(event.target), true)
    document.addEventListener('volumechange', (event) => syncMediaState(event.target), true)
    document.addEventListener('astro:page-load', refreshMediaState)
  }

  private bindSuspensionEvents(): void {
    window.addEventListener('megameal:audio-suspend', (event) => {
      const detail = event instanceof CustomEvent ? event.detail as { reason?: string } | undefined : undefined
      this.suspendAmbience(detail?.reason ?? 'external-request')
    })

    window.addEventListener('megameal:audio-resume', (event) => {
      const detail = event instanceof CustomEvent ? event.detail as { reason?: string } | undefined : undefined
      this.resumeAmbience(detail?.reason)
    })
  }

  private isMediaAudible(element: HTMLMediaElement): boolean {
    return !element.paused && !element.ended && !element.muted && element.volume > 0
  }

  private syncEmbeddedMediaSuspension(): void {
    const hasActiveEmbeddedMedia =
      this.activeAudibleMedia.size > 0 || this.activeYouTubePlayers.size > 0

    if (hasActiveEmbeddedMedia) {
      this.suspendAmbience('embedded-media')
    } else if (this.suspended && this.suspensionReason === 'embedded-media') {
      this.resumeAmbience('embedded-media')
    }
  }

  private bindYouTubeEmbeds(): void {
    const bindFrames = () => {
      const frames = Array.from(document.querySelectorAll('iframe')).filter((frame): frame is HTMLIFrameElement =>
        frame instanceof HTMLIFrameElement && this.isYouTubeEmbed(frame),
      )

      if (frames.length === 0) return

      void this.ensureYouTubeIframeApi().then(() => {
        frames.forEach(frame => this.attachYouTubePlayer(frame))
      })
    }

    bindFrames()
    document.addEventListener('astro:page-load', bindFrames)
  }

  private async ensureYouTubeIframeApi(): Promise<void> {
    if (typeof window === 'undefined') return
    if (window.YT?.Player) return

    if (!this.youtubeApiPromise) {
      this.youtubeApiPromise = new Promise<void>((resolve, reject) => {
        const existingScript = document.querySelector<HTMLScriptElement>('script[data-megameal-youtube-api="true"]')
        const previousReady = window.onYouTubeIframeAPIReady

        window.onYouTubeIframeAPIReady = () => {
          previousReady?.()
          resolve()
        }

        if (existingScript) return

        const script = document.createElement('script')
        script.src = 'https://www.youtube.com/iframe_api'
        script.async = true
        script.dataset.megamealYoutubeApi = 'true'
        script.onerror = () => reject(new Error('Failed to load YouTube iframe API'))
        document.head.appendChild(script)
      }).catch((error) => {
        this.youtubeApiPromise = null
        console.warn('Unable to initialize YouTube iframe API:', error)
      })
    }

    await this.youtubeApiPromise
  }

  private attachYouTubePlayer(frame: HTMLIFrameElement): void {
    if (this.boundYouTubeFrames.has(frame) || !window.YT?.Player) return

    const normalizedSrc = this.normalizeYouTubeSrc(frame.src)
    if (normalizedSrc !== frame.src) {
      frame.src = normalizedSrc
    }

    if (!frame.id) {
      this.youtubeFrameCounter += 1
      frame.id = `megameal-youtube-${this.youtubeFrameCounter}`
    }

    this.boundYouTubeFrames.add(frame)

    new window.YT.Player(frame, {
      events: {
        onStateChange: (event: { data: number }) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            this.activeYouTubePlayers.add(frame.id)
          } else if (
            event.data === window.YT.PlayerState.PAUSED ||
            event.data === window.YT.PlayerState.ENDED ||
            event.data === window.YT.PlayerState.CUED
          ) {
            this.activeYouTubePlayers.delete(frame.id)
          }

          this.syncEmbeddedMediaSuspension()
        },
      },
    })
  }

  private isYouTubeEmbed(frame: HTMLIFrameElement): boolean {
    try {
      const url = new URL(frame.src, window.location.origin)
      return (
        (url.hostname === 'www.youtube.com' || url.hostname === 'www.youtube-nocookie.com') &&
        url.pathname.startsWith('/embed/')
      )
    } catch {
      return false
    }
  }

  private normalizeYouTubeSrc(src: string): string {
    try {
      const url = new URL(src, window.location.origin)
      if (
        url.hostname !== 'www.youtube.com' &&
        url.hostname !== 'www.youtube-nocookie.com'
      ) {
        return src
      }

      url.searchParams.set('enablejsapi', '1')
      url.searchParams.set('playsinline', '1')
      url.searchParams.set('origin', window.location.origin)
      return url.toString()
    } catch {
      return src
    }
  }

  private emit(): void {
    const state = this.getState()
    this.listeners.forEach(listener => listener(state))
  }
}

export const siteAudioManager = new SiteAudioManager()
