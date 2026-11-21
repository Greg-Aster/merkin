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

type YouTubeEngagementAction = 'play' | 'pause' | 'ended' | 'cued'

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

export function isYouTubeEmbed(frame: HTMLIFrameElement): boolean {
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

export function normalizeYouTubeSrc(src: string): string {
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

export function hasNormalizedYouTubeSrc(src: string): boolean {
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

export function extractYouTubeVideoId(src: string): string {
  try {
    const url = new URL(src, window.location.origin)
    if (!url.pathname.startsWith('/embed/')) return ''

    return url.pathname.split('/embed/')[1]?.split('/')[0] ?? ''
  } catch {
    return ''
  }
}

function trackVideoAnalytics(
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

function emitYouTubeEngagement(
  frame: HTMLIFrameElement,
  action: YouTubeEngagementAction,
): void {
  if (typeof window === 'undefined') return

  const detail = {
    action,
    videoId: extractYouTubeVideoId(frame.src),
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

  trackVideoAnalytics(`youtube_${action}`, {
    action: detail.action,
    video_id: detail.videoId,
    video_title: detail.title,
    page_path: detail.pagePath,
    source: detail.source,
  })
}

function getYouTubeFrames(root: ParentNode | Node): HTMLIFrameElement[] {
  const frames: HTMLIFrameElement[] = []

  if (root instanceof HTMLIFrameElement && isYouTubeEmbed(root)) {
    frames.push(root)
  }

  const queryableRoot = root as {
    querySelectorAll?: unknown
  }
  if (typeof queryableRoot.querySelectorAll === 'function') {
    frames.push(
      ...Array.from(queryableRoot.querySelectorAll('iframe')).filter(
        (frame): frame is HTMLIFrameElement =>
          frame instanceof HTMLIFrameElement && isYouTubeEmbed(frame),
      ),
    )
  }

  return frames
}

export class SiteAudioYouTubeBridge {
  private activePlayers = new Set<string>()
  private apiPromise: Promise<void> | null = null
  private boundFrames = new WeakSet<HTMLIFrameElement>()
  private frameIds = new WeakMap<HTMLIFrameElement, string>()
  private mutationObserver: MutationObserver | null = null
  private frameCounter = 0

  constructor(private readonly onActiveStateChange: () => void) {}

  hasActivePlayers(): boolean {
    return this.activePlayers.size > 0
  }

  clearActivePlayers(): void {
    this.activePlayers.clear()
  }

  bind(): void {
    const bindFrames = () => {
      const frames = getYouTubeFrames(document)
      if (frames.length === 0) return

      void this.ensureApi().then(() => {
        frames.forEach(frame => this.attachPlayer(frame))
      })
    }

    bindFrames()
    document.addEventListener('astro:page-load', bindFrames)

    if (this.mutationObserver || !document.body) return

    this.mutationObserver = new MutationObserver(mutations => {
      const addedFrames: HTMLIFrameElement[] = []
      let removedActiveFrame = false

      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          addedFrames.push(...getYouTubeFrames(node))
        })

        mutation.removedNodes.forEach(node => {
          for (const frame of getYouTubeFrames(node)) {
            const frameId = this.frameIds.get(frame) ?? frame.id
            if (frameId && this.activePlayers.delete(frameId)) {
              removedActiveFrame = true
            }
          }
        })
      }

      if (addedFrames.length > 0) {
        void this.ensureApi().then(() => {
          addedFrames.forEach(frame => this.attachPlayer(frame))
        })
      }

      if (removedActiveFrame) {
        this.onActiveStateChange()
      }
    })

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  private async ensureApi(): Promise<void> {
    if (typeof window === 'undefined') return
    if (window.YT?.Player) return

    if (!this.apiPromise) {
      this.apiPromise = new Promise<void>((resolve, reject) => {
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
        this.apiPromise = null
        console.warn('Unable to initialize YouTube iframe API:', error)
      })
    }

    await this.apiPromise
  }

  private attachPlayer(frame: HTMLIFrameElement): void {
    const youtubeApi = window.YT
    if (this.boundFrames.has(frame) || !youtubeApi?.Player) return

    if (!hasNormalizedYouTubeSrc(frame.src)) {
      frame.src = normalizeYouTubeSrc(frame.src)
    }

    if (!frame.id) {
      this.frameCounter += 1
      frame.id = `megameal-youtube-${this.frameCounter}`
    }

    this.boundFrames.add(frame)
    this.frameIds.set(frame, frame.id)

    new youtubeApi.Player(frame, {
      events: {
        onStateChange: (event: { data: number }) => {
          if (event.data === youtubeApi.PlayerState.PLAYING) {
            this.activePlayers.add(frame.id)
            emitYouTubeEngagement(frame, 'play')
          } else if (
            event.data === youtubeApi.PlayerState.PAUSED ||
            event.data === youtubeApi.PlayerState.ENDED ||
            event.data === youtubeApi.PlayerState.CUED
          ) {
            this.activePlayers.delete(frame.id)
            if (event.data === youtubeApi.PlayerState.PAUSED) {
              emitYouTubeEngagement(frame, 'pause')
            } else if (event.data === youtubeApi.PlayerState.ENDED) {
              emitYouTubeEngagement(frame, 'ended')
            } else {
              emitYouTubeEngagement(frame, 'cued')
            }
          }

          this.onActiveStateChange()
        },
      },
    })
  }
}
