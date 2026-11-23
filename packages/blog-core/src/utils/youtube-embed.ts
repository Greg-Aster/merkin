export const youtubeEmbedAllow =
  'autoplay; encrypted-media; picture-in-picture'

export const youtubeEmbedReferrerPolicy = 'strict-origin-when-cross-origin'

type YouTubeEmbedHost = 'nocookie' | 'standard'
type YouTubeParamValue = string | number | boolean | null | undefined

export interface YouTubeEmbedOptions {
  autoplay?: boolean | number
  controls?: boolean | number
  enableJsApi?: boolean
  host?: YouTubeEmbedHost
  mute?: boolean | number
  origin?: string | URL | null
  params?: Record<string, YouTubeParamValue>
  playsInline?: boolean
  rel?: boolean | number
}

const embedHosts: Record<YouTubeEmbedHost, string> = {
  nocookie: 'https://www.youtube-nocookie.com',
  standard: 'https://www.youtube.com',
}

const youtubeVideoIdPattern = /^[a-zA-Z0-9_-]{11}$/

function boolish(value: boolean | number): string {
  return value === true || value === 1 ? '1' : '0'
}

function normalizeOrigin(origin?: string | URL | null): string | undefined {
  if (!origin) return undefined

  try {
    return new URL(origin.toString()).origin
  } catch {
    return undefined
  }
}

function setParam(
  params: URLSearchParams,
  key: string,
  value: YouTubeParamValue,
): void {
  if (value === null || value === undefined || value === false) return
  params.set(key, value === true ? '1' : String(value))
}

function getYouTubeVideoIdFromUrl(url: URL): string | null {
  if (url.pathname.startsWith('/embed/')) {
    const videoId = url.pathname.split('/embed/')[1]?.split('/')[0]
    return videoId && youtubeVideoIdPattern.test(videoId) ? videoId : null
  }

  if (url.hostname === 'youtu.be') {
    const videoId = url.pathname.split('/')[1]
    return videoId && youtubeVideoIdPattern.test(videoId) ? videoId : null
  }

  const videoId = url.searchParams.get('v')
  return videoId && youtubeVideoIdPattern.test(videoId) ? videoId : null
}

export function extractYouTubeVideoId(value: string): string | null {
  if (youtubeVideoIdPattern.test(value)) return value

  try {
    const url = new URL(value)
    return getYouTubeVideoIdFromUrl(url)
  } catch {
    return null
  }
}

export function buildYouTubeEmbedUrl(
  videoId: string,
  options: YouTubeEmbedOptions = {},
): string {
  const host = options.host ?? 'nocookie'
  const url = new URL(`/embed/${videoId}`, embedHosts[host])
  const origin = normalizeOrigin(options.origin)

  setParam(url.searchParams, 'enablejsapi', options.enableJsApi ?? true)
  setParam(url.searchParams, 'playsinline', options.playsInline ?? true)
  setParam(url.searchParams, 'rel', options.rel ?? 0)
  if (origin) setParam(url.searchParams, 'origin', origin)
  if (options.controls !== undefined) {
    setParam(url.searchParams, 'controls', boolish(options.controls))
  }
  if (options.autoplay !== undefined) {
    setParam(url.searchParams, 'autoplay', boolish(options.autoplay))
  }
  if (options.mute !== undefined) {
    setParam(url.searchParams, 'mute', boolish(options.mute))
  }

  Object.entries(options.params ?? {}).forEach(([key, value]) => {
    setParam(url.searchParams, key, value)
  })

  return url.toString()
}

export function normalizeYouTubeEmbedUrl(
  src: string,
  options: YouTubeEmbedOptions = {},
): string {
  let url: URL

  try {
    url = new URL(src)
  } catch {
    return src
  }

  const videoId = getYouTubeVideoIdFromUrl(url)
  if (!videoId) return src

  return buildYouTubeEmbedUrl(videoId, {
    ...options,
    params: {
      ...Object.fromEntries(url.searchParams.entries()),
      ...options.params,
    },
  })
}
