/**
 * Video banner data and validation.
 *
 * BannerStage owns the rendered YouTube iframe and its privacy/view-count
 * policy. Keep embed URL parameters out of this config module so old autoplay
 * defaults cannot drift away from the rendered player behavior.
 */

import type { VideoBannerData } from './types'

const PLACEHOLDER_VIDEO_ID = 'YOUR_YOUTUBE_VIDEO_ID_HERE'
const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/
const YOUTUBE_URL_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
]

/**
 * Default video banner configuration.
 *
 * For rendered iframe behavior, see BannerStage.astro.
 */
export const videoBannerData: VideoBannerData = {
  videoId: PLACEHOLDER_VIDEO_ID,
}

function extractVideoId(value: string): string | null {
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = value.match(pattern)
    if (match?.[1]) return match[1]
  }

  if (YOUTUBE_VIDEO_ID_PATTERN.test(value)) return value

  return null
}

export function validateVideoBannerConfig(
  config: Partial<VideoBannerData> | null | undefined,
): {
  isValid: boolean
  warnings: string[]
  errors: string[]
} {
  const warnings: string[] = []
  const errors: string[] = []
  const videoId = config?.videoId?.trim()

  if (!videoId) {
    errors.push('Video ID is required for video banner')
  } else if (videoId === PLACEHOLDER_VIDEO_ID) {
    errors.push(
      'Default placeholder video ID detected. Please set a real YouTube video ID.',
    )
  } else {
    const cleanVideoId = extractVideoId(videoId)
    if (!cleanVideoId) {
      errors.push('Invalid YouTube video ID format')
    } else if (cleanVideoId !== videoId) {
      warnings.push(
        `Video ID appears to be a URL. Consider using just the ID: ${cleanVideoId}`,
      )
    }
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  }
}

export function isVideoBannerData(data: unknown): data is VideoBannerData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'videoId' in data &&
    typeof data.videoId === 'string' &&
    data.videoId.trim() !== '' &&
    data.videoId !== PLACEHOLDER_VIDEO_ID
  )
}

export const videoBannerConfig = {
  data: videoBannerData,
  validateVideoBannerConfig,
  isVideoBannerData,
} as const
