import gameStarsManifest from '../../../../packages/shared-data/generated/game-stars.json'
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

type SharedGameStar = (typeof gameStarsManifest.items)[number]

function normalizeSharedGameStar(event: SharedGameStar): TimelineEvent {
  return {
    title: event.title,
    description: event.description || '',
    slug: event.slug,
    sourcePath: event.sourcePath,
    year: event.year,
    era: event.era || '',
    category: event.category,
    tags: event.tags || [],
    isKeyEvent: event.isKeyEvent || false,
    isLevel: event.isLevel || false,
    levelId: event.levelId || undefined,
    location: event.location,
    isDraft: event.isDraft || false,
    timelineYear: event.timelineYear,
    timelineEra: event.timelineEra,
    timelineLocation: event.timelineLocation,
    uniqueId: event.uniqueId,
    bannerData: event.bannerData,
  }
}

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
    includeBanners: _includeBanners = true,
  } = options

  let timelineEvents = gameStarsManifest.items
    .map(normalizeSharedGameStar)
    .filter(event => (includeDrafts ? true : event.isDraft !== true))

  const eraConfig = extractEraConfig(timelineEvents)

  timelineEvents = timelineEvents.map(event => {
    if (!event.era) {
      const yearRanges: { [key: string]: [number, number] } = {}
      Object.entries(eraConfig).forEach(([eraKey, config]) => {
        yearRanges[eraKey] = [config.startYear, config.endYear]
      })

      event.era = getEraFromYear(event.year, yearRanges)
    }
    return event
  })

  timelineEvents = timelineEvents.filter(event => {
    if (category && event.category !== category) return false
    if (startYear && event.year < startYear) return false
    if (endYear && event.year > endYear) return false
    if (era && event.era !== era) return false
    if (onlyKeyEvents && !event.isKeyEvent) return false
    return true
  })

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
