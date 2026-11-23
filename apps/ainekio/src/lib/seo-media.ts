import { url } from '../utils/url-utils'
import {
  type CanonicalVideoMeta,
  extractEmbeddedVideoMeta,
  videoMetaBySrc,
} from './video-catalog'

export type { CanonicalVideoMeta }

export function getVideoMetaBySrc(src: string): CanonicalVideoMeta | undefined {
  return videoMetaBySrc.get(src) as CanonicalVideoMeta | undefined
}

export function extractPostVideos(markdownBody: string): CanonicalVideoMeta[] {
  return extractEmbeddedVideoMeta(markdownBody) as CanonicalVideoMeta[]
}

export function toVideoObjectJsonLd(video: CanonicalVideoMeta, site: URL | string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description: video.caption,
    contentUrl: new URL(url(video.src), site).href,
    thumbnailUrl: new URL(url(video.poster), site).href,
    uploadDate: `${video.date}T00:00:00Z`,
    duration: `PT${Math.max(1, Math.round(video.duration))}S`,
  }
}

export const REPO_URLS = [
  'https://github.com/Greg-Aster/Ainekio-bot',
  'https://github.com/Greg-Aster/ainekio-os',
] as const
