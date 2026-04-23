import {
  defaultEraConfig,
  defaultEraDisplayNames,
  defaultTimelineViewConfig,
  extractEraConfig,
  getEraClasses,
  getEraConfigForYear,
  getEraDisplayName,
  getEraFromYear,
  getTimelineStatistics,
  groupEventsByEra,
} from '../config/timelineconfig.ts'
// Use 'import type' for types and interfaces
import type {
  EraConfig,
  EraConfigMap,
  TimelineEvent,
  TimelineViewConfig,
} from '../config/timelineconfig.ts'
// TimelineService.ts - Server-side timeline service
import { getSortedPosts } from '../utils/content-utils'

function resolveTimelineYear(
  timelineYear?: string,
  fallbackYear?: number,
): number | null {
  if (timelineYear) {
    const parsedYear = Number.parseInt(timelineYear, 10)
    if (Number.isFinite(parsedYear)) {
      return parsedYear
    }
  }

  return fallbackYear ?? null
}

// Modified getTimelineEvents function to include banner posts
export async function getTimelineEvents(
  options: {
    category?: string
    startYear?: number
    endYear?: number
    era?: string
    onlyKeyEvents?: boolean
    includeDrafts?: boolean
    includeBanners?: boolean
  } = {},
): Promise<TimelineEvent[]> {
  const {
    category,
    startYear,
    endYear,
    era,
    onlyKeyEvents,
    includeDrafts = true,
    includeBanners = true,
  } = options

  // Get all posts, including drafts by default for the timeline
  const posts = await getSortedPosts(includeDrafts)

  // First pass: collect all posts with timeline data and extract bannerData
  let timelineEvents: TimelineEvent[] = posts.flatMap(post => {
    const isTimelineBanner =
      includeBanners &&
      post.data.bannerType === 'timeline' &&
      Boolean(post.data.bannerData)

    if (!post.data.timelineYear && !isTimelineBanner) {
      return []
    }

    const fallbackYear = isTimelineBanner
      ? post.data.published?.getFullYear() ?? new Date().getFullYear()
      : undefined
    const year = resolveTimelineYear(post.data.timelineYear, fallbackYear)

    if (year === null) {
      return []
    }

    const timelineEvent: TimelineEvent = {
      title: post.data.title,
      description: post.data.description || '',
      slug: post.slug,
      year,
      era: post.data.timelineEra || undefined,
      category: post.data.category,
      isKeyEvent: post.data.isKeyEvent || false,
      location: post.data.timelineLocation,
      isDraft: post.data.draft || false,
    }

    if (isTimelineBanner && post.data.bannerData) {
      timelineEvent.bannerData = post.data.bannerData
    }

    return [timelineEvent]
  })

  // Extract era configuration from banner posts
  const eraConfig = extractEraConfig(timelineEvents)

  // Second pass: fill in missing era information based on years and era configuration
  timelineEvents = timelineEvents.map(event => {
    // Only update era if it's not explicitly set
    if (!event.era) {
      // Convert era configuration to the format expected by getEraFromYear
      const yearRanges: { [key: string]: [number, number] } = {}
      Object.entries(eraConfig).forEach(([eraKey, config]) => {
        yearRanges[eraKey] = [config.startYear, config.endYear]
      })
      event.era = getEraFromYear(event.year, yearRanges)
    }
    return event
  })

  // Apply filters
  timelineEvents = timelineEvents.filter(event => {
    if (category && event.category !== category) return false
    if (startYear && event.year < startYear) return false
    if (endYear && event.year > endYear) return false
    if (era && event.era !== era) return false
    if (onlyKeyEvents && !event.isKeyEvent) return false
    return true
  })

  // Sort by year ascending
  return timelineEvents.sort((a, b) => a.year - b.year)
}

// Re-export these for convenience
export {
  defaultEraConfig,
  defaultEraDisplayNames,
  defaultTimelineViewConfig,
  getEraFromYear,
  getEraDisplayName,
  getEraClasses,
  extractEraConfig,
  groupEventsByEra,
  getTimelineStatistics,
  getEraConfigForYear,
}

// Re-export types
export type { TimelineEvent, EraConfig, EraConfigMap, TimelineViewConfig }
