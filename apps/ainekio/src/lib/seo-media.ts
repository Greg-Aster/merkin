import gallery from '../data/gallery.json'
import postVideos from '../data/post-videos.json'
import { url } from '../utils/url-utils'

export interface CanonicalVideoMeta {
  id: string
  src: string
  poster: string
  title: string
  caption: string
  date: string
  duration: number
}

const videoBySrc = new Map<string, CanonicalVideoMeta>()

for (const item of gallery) {
  if (item.src && item.poster) {
    videoBySrc.set(item.src, {
      id: item.id,
      src: item.src,
      poster: item.poster,
      title: item.title,
      caption: item.caption,
      date: item.date || '2026-11-06',
      duration: item.duration || 1,
    })
  }
}

for (const item of postVideos) {
  if (!videoBySrc.has(item.src)) {
    videoBySrc.set(item.src, item)
  }
}

export function getVideoMetaBySrc(src: string): CanonicalVideoMeta | undefined {
  return videoBySrc.get(src)
}

export function extractPostVideos(markdownBody: string): CanonicalVideoMeta[] {
  const seen = new Set<string>()
  const results: CanonicalVideoMeta[] = []
  const sourceRegex = /<source\b[^>]*\bsrc=["']([^"']+\.mp4)["'][^>]*>/gi

  let match: RegExpExecArray | null
  while ((match = sourceRegex.exec(markdownBody)) !== null) {
    const src = match[1]
    if (seen.has(src)) continue
    seen.add(src)
    const meta = videoBySrc.get(src)
    if (meta) results.push(meta)
  }

  return results
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
