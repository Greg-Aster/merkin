import { Howl, Howler } from 'howler'
import {
  type SiteAudioTrackConfig,
  getTracksForPathname,
  siteAudioConfig,
} from '../config/audio'
import { markSiteAudioUnlocked } from './site-audio-activation'

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
type YouTubeEngagementAction = 'play' | 'pause' | 'ended' | 'cued'
type PageAmbientTrackConfig = Omit<SiteAudioTrackConfig, 'routes'> & {
  routes?: string[]
}
type VideoAnalyticsWindow = Window & {
  plausible?: (
    eventName: string,
    options?: { props?: Record<string, string> },
  ) => void
  gtag?: (
    command: 'event',
    eventName: string,
    params: Record<string, string>,
  ) => void
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
  private activeYouTubePlayers = new Set<string>()
  private suspendedHowl: Howl | null = null
  private youtubeApiPromise: Promise<void> | null = null
  private boundYouTubeFrames = new WeakSet<HTMLIFrameElement>()
  private youtubeFrameIds = new WeakMap<HTMLIFrameElement, string>()
  private youtubeMutationObserver: MutationObserver | null = null
  private youtubeFrameCounter = 0

  initialize(): void {
    if (this.initialized || typeof window === 'undefined') return

    this.initialized = true
    this.enabled = this.readStoredPreference()
    this.masterVolume = this.readStoredMasterVolume()
    this.ambienceVolume = this.readStoredAmbienceVolume()
    this.sfxVolume = this.readStoredSfxVolume()
    Howler.autoUnlock = true
    Howler.autoSuspend = false
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
      if (!this.suspended && this.hasUnlockedAudio()) {
        this.syncForPath(window.location.pathname, true)
      }
    }

    this.emit()
    this.notifyConfigChange()
  }

  setMasterVolume(nextVolume: number): void {
    const clampedVolume = Math.min(1, Math.max(0, nextVolume))
    this.masterVolume = clampedVolume
    this.writeStoredMasterVolume(clampedVolume)

    if (this.currentHowl && this.currentTrack && !this.suspended) {
      this.currentHowl.volume(this.resolveTrackVolume(this.currentTrack))
    }

    this.emit()
    this.notifyConfigChange()
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
    const nextTrack = this.pickNextTrack()
    if (!nextTrack) {
      this.stopCurrentTrack()
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

  async unlockFromGesture(): Promise<boolean> {
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

    const stored = Number(
      window.localStorage.getItem(siteAudioConfig.masterVolumeStorageKey),
    )
    if (!Number.isFinite(stored)) return siteAudioConfig.defaultMasterVolume

    return Math.min(1, Math.max(0, stored))
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

    const stored = Number(
      window.localStorage.getItem(siteAudioConfig.ambienceVolumeStorageKey),
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

    return siteAudioConfig.defaultAmbienceVolume
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

  private writeStoredSfxVolume(volume: number): void {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      siteAudioConfig.sfxVolumeStorageKey,
      String(volume),
    )
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
      this.activeYouTubePlayers.clear()
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
    window.addEventListener('megameal:audio-suspend', event => {
      const detail =
        event instanceof CustomEvent
          ? (event.detail as { reason?: string } | undefined)
          : undefined
      this.suspendAmbience(detail?.reason ?? 'external-request')
    })

    window.addEventListener('megameal:audio-resume', event => {
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
      this.activeAudibleMedia.size > 0 || this.activeYouTubePlayers.size > 0

    if (hasActiveEmbeddedMedia) {
      this.suspendAmbience('embedded-media')
    } else if (this.suspended && this.suspensionReason === 'embedded-media') {
      this.resumeAmbience('embedded-media')
    }
  }

  private bindYouTubeEmbeds(): void {
    const bindFrames = () => {
      const frames = this.getYouTubeFrames(document)

      if (frames.length === 0) return

      void this.ensureYouTubeIframeApi().then(() => {
        frames.forEach(frame => this.attachYouTubePlayer(frame))
      })
    }

    bindFrames()
    document.addEventListener('astro:page-load', bindFrames)

    if (this.youtubeMutationObserver || !document.body) return

    this.youtubeMutationObserver = new MutationObserver(mutations => {
      const addedFrames: HTMLIFrameElement[] = []
      let removedActiveFrame = false

      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          addedFrames.push(...this.getYouTubeFrames(node))
        })

        mutation.removedNodes.forEach(node => {
          for (const frame of this.getYouTubeFrames(node)) {
            const frameId = this.youtubeFrameIds.get(frame) ?? frame.id
            if (frameId && this.activeYouTubePlayers.delete(frameId)) {
              removedActiveFrame = true
            }
          }
        })
      }

      if (addedFrames.length > 0) {
        void this.ensureYouTubeIframeApi().then(() => {
          addedFrames.forEach(frame => this.attachYouTubePlayer(frame))
        })
      }

      if (removedActiveFrame) {
        this.syncEmbeddedMediaSuspension()
      }
    })

    this.youtubeMutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  private getYouTubeFrames(root: ParentNode | Node): HTMLIFrameElement[] {
    const frames: HTMLIFrameElement[] = []

    if (root instanceof HTMLIFrameElement && this.isYouTubeEmbed(root)) {
      frames.push(root)
    }

    if ('querySelectorAll' in root) {
      frames.push(
        ...Array.from(root.querySelectorAll('iframe')).filter(
          (frame): frame is HTMLIFrameElement =>
            frame instanceof HTMLIFrameElement && this.isYouTubeEmbed(frame),
        ),
      )
    }

    return frames
  }

  private async ensureYouTubeIframeApi(): Promise<void> {
    if (typeof window === 'undefined') return
    if (window.YT?.Player) return

    if (!this.youtubeApiPromise) {
      this.youtubeApiPromise = new Promise<void>((resolve, reject) => {
        const existingScript = document.querySelector<HTMLScriptElement>(
          'script[data-megameal-youtube-api="true"], script[src*="youtube.com/iframe_api"]',
        )
        const previousReady = window.onYouTubeIframeAPIReady
        let waitTimeout: number | null = null
        let remainingChecks = 200
        let settled = false

        const cleanup = () => {
          if (waitTimeout !== null) {
            window.clearTimeout(waitTimeout)
            waitTimeout = null
          }

          if (window.onYouTubeIframeAPIReady === handleReady) {
            window.onYouTubeIframeAPIReady = previousReady
          }
        }

        const settle = (callback: () => void) => {
          if (settled) return

          settled = true
          cleanup()
          callback()
        }

        const waitForPlayer = () => {
          if (waitTimeout !== null) {
            window.clearTimeout(waitTimeout)
            waitTimeout = null
          }

          if (window.YT?.Player) {
            settle(resolve)
            return
          }

          remainingChecks -= 1
          if (remainingChecks <= 0) {
            settle(() =>
              reject(new Error('Timed out waiting for YouTube iframe API')),
            )
            return
          }

          waitTimeout = window.setTimeout(waitForPlayer, 50)
        }

        const handleReady = () => {
          previousReady?.()
          waitForPlayer()
        }

        window.onYouTubeIframeAPIReady = handleReady

        if (existingScript) {
          waitForPlayer()
          return
        }

        const script = document.createElement('script')
        script.src = 'https://www.youtube.com/iframe_api'
        script.async = true
        script.dataset.megamealYoutubeApi = 'true'
        script.onerror = () =>
          settle(() => reject(new Error('Failed to load YouTube iframe API')))
        document.head.appendChild(script)
        waitForPlayer()
      }).catch(error => {
        this.youtubeApiPromise = null
        console.warn('Unable to initialize YouTube iframe API:', error)
      })
    }

    await this.youtubeApiPromise
  }

  private attachYouTubePlayer(frame: HTMLIFrameElement): void {
    const youtubeApi = window.YT
    if (this.boundYouTubeFrames.has(frame) || !youtubeApi?.Player) return

    if (!this.hasNormalizedYouTubeSrc(frame.src)) {
      const normalizedSrc = this.normalizeYouTubeSrc(frame.src)
      frame.src = normalizedSrc
    }

    if (!frame.id) {
      this.youtubeFrameCounter += 1
      frame.id = `megameal-youtube-${this.youtubeFrameCounter}`
    }

    this.boundYouTubeFrames.add(frame)
    this.youtubeFrameIds.set(frame, frame.id)

    new youtubeApi.Player(frame, {
      events: {
        onStateChange: (event: { data: number }) => {
          if (event.data === youtubeApi.PlayerState.PLAYING) {
            this.activeYouTubePlayers.add(frame.id)
            this.emitYouTubeEngagement(frame, 'play')
          } else if (
            event.data === youtubeApi.PlayerState.PAUSED ||
            event.data === youtubeApi.PlayerState.ENDED ||
            event.data === youtubeApi.PlayerState.CUED
          ) {
            this.activeYouTubePlayers.delete(frame.id)
            if (event.data === youtubeApi.PlayerState.PAUSED) {
              this.emitYouTubeEngagement(frame, 'pause')
            } else if (event.data === youtubeApi.PlayerState.ENDED) {
              this.emitYouTubeEngagement(frame, 'ended')
            } else {
              this.emitYouTubeEngagement(frame, 'cued')
            }
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
        (url.hostname === 'www.youtube.com' ||
          url.hostname === 'www.youtube-nocookie.com') &&
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

  private hasNormalizedYouTubeSrc(src: string): boolean {
    try {
      const url = new URL(src, window.location.origin)
      if (
        url.hostname !== 'www.youtube.com' &&
        url.hostname !== 'www.youtube-nocookie.com'
      ) {
        return true
      }

      return (
        url.searchParams.get('enablejsapi') === '1' &&
        url.searchParams.get('playsinline') === '1' &&
        url.searchParams.get('origin') === window.location.origin
      )
    } catch {
      return true
    }
  }

  private emitYouTubeEngagement(
    frame: HTMLIFrameElement,
    action: YouTubeEngagementAction,
  ): void {
    if (typeof window === 'undefined') return

    const detail = {
      action,
      videoId: this.extractYouTubeVideoId(frame.src),
      title: frame.title.replace(/\s+-\s+YouTube video player$/, ''),
      src: frame.src,
      pagePath: window.location.pathname,
      source:
        frame.dataset.videoBannerIframe === 'true'
          ? 'video-banner'
          : 'youtube-embed',
    }

    window.dispatchEvent(
      new CustomEvent('megameal:youtube-engagement', { detail }),
    )

    this.trackVideoAnalytics(`youtube_${action}`, {
      action: detail.action,
      video_id: detail.videoId,
      video_title: detail.title,
      page_path: detail.pagePath,
      source: detail.source,
    })
  }

  private trackVideoAnalytics(
    eventName: string,
    props: Record<string, string>,
  ): void {
    const analyticsWindow = window as VideoAnalyticsWindow

    try {
      analyticsWindow.plausible?.(eventName, { props })
      analyticsWindow.gtag?.('event', eventName, props)
    } catch {
      // Analytics providers must never block media playback.
    }
  }

  private extractYouTubeVideoId(src: string): string {
    try {
      const url = new URL(src, window.location.origin)
      if (!url.pathname.startsWith('/embed/')) return ''

      return url.pathname.split('/embed/')[1]?.split('/')[0] ?? ''
    } catch {
      return ''
    }
  }

  private emit(): void {
    const state = this.getState()
    this.listeners.forEach(listener => listener(state))
  }

  private notifyConfigChange(): void {
    if (typeof window === 'undefined') return

    window.dispatchEvent(
      new CustomEvent('megameal:audio-config-change', {
        detail: this.getState(),
      }),
    )
  }
}

export const siteAudioManager = new SiteAudioManager()
