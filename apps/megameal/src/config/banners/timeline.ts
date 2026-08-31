import type { TimelineBannerData } from './types'

/**
 * Timeline banner registration only.
 *
 * Rendering, event data, camera state, and interaction belong to the canonical
 * TimelinePortalCarousel. This module remains the banner system's data guard;
 * it must not grow a second timeline renderer or interaction configuration.
 */
export const timelineBannerData: TimelineBannerData = {
  category: 'MEGA MEAL',
}

export function isTimelineBannerData(data: unknown): data is TimelineBannerData {
  if (!data || typeof data !== 'object' || !('category' in data)) return false

  return (
    typeof (data as TimelineBannerData).category === 'string' &&
    (data as TimelineBannerData).category.trim().length > 0
  )
}

export function validateTimelineBannerConfig(config: TimelineBannerData): {
  isValid: boolean
  warnings: string[]
  errors: string[]
} {
  const errors = isTimelineBannerData(config)
    ? []
    : ['Category is required for timeline banner']

  return {
    isValid: errors.length === 0,
    warnings: [],
    errors,
  }
}

export const timelineBannerConfig = {
  data: timelineBannerData,
  validate: validateTimelineBannerConfig,
}
