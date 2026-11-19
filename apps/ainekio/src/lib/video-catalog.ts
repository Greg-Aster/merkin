import gallery from '../data/gallery.json'
import postVideos from '../data/post-videos.json'

export interface CanonicalVideoMeta {
  id: string
  src: string
  poster: string
  title: string
  caption: string
  date: string
  duration: number
}

export const galleryItems = gallery

export const videoMetaBySrc = new Map<string, CanonicalVideoMeta>()

for (const item of gallery) {
  if (item.src && item.poster) {
    videoMetaBySrc.set(item.src, {
      id: item.id,
      src: item.src,
      poster: item.poster,
      title: item.title,
      caption: item.caption,
      date: item.date || '2026-11-06',
      duration: Math.max(1, Math.round(item.duration || 1)),
    })
  }
}

for (const item of postVideos) {
  if (!videoMetaBySrc.has(item.src)) {
    videoMetaBySrc.set(item.src, {
      ...item,
      duration: Math.max(1, Math.round(item.duration || 1)),
    })
  }
}

export function extractEmbeddedVideoMeta(markdownBody: string): CanonicalVideoMeta[] {
  const seen = new Set<string>()
  const results: CanonicalVideoMeta[] = []
  const sourceRegex = /<source\b[^>]*\bsrc=["']([^"']+\.mp4)["'][^>]*>/gi

  let match: RegExpExecArray | null
  while ((match = sourceRegex.exec(markdownBody)) !== null) {
    const src = match[1]
    if (seen.has(src)) continue
    seen.add(src)
    const meta = videoMetaBySrc.get(src)
    if (meta) results.push(meta)
  }

  return results
}
