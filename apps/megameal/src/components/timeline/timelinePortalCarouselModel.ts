import { formatTimelineYear } from '@merkin/shared-content'

export type TimelinePortalEvent = {
  title: string
  description?: string
  slug: string
  url?: string
  contentType?: string
  sourceCollection?: string
  year: number
  era?: string
  location?: string
  isKeyEvent?: boolean
  bannerData?: {
    background?: string
    backgroundVideo?: string
  }
}

export type TimelinePortalEraConfig = Record<string, {
  displayName?: string
  startYear?: number
  endYear?: number
  zoomLevel?: number
  panToYear?: number
  backgroundImage?: string
  backgroundVideo?: string
  backgroundVideoPlaybackRate?: number
}>

export type TimelineCarouselInput = {
  x: number
  y: number
  panX: number
  panY: number
  dragX: number
  dragY: number
  wheel: number
  mapZoom: number
  mapOrbitX: number
  mapOrbitY: number
  active: boolean
}

export type TimelineCarouselScreen = {
  kicker: string
  title: string
  stat: string
  ctaLabel: string
  stillSrc: string
  videoSrc: string
  eraKey: string
  year: number
  isKeyEvent: boolean
}

export type TimelinePortalEraSegment = {
  key: string
  displayName: string
  startYear: number
  endYear: number
  startIndex: number
  endIndex: number
  centerIndex: number
  eventCount: number
  isOverlapping: boolean
  backgroundImage?: string
  backgroundVideo?: string
  backgroundVideoPlaybackRate?: number
}

export type TimelinePortalModel = {
  events: TimelinePortalEvent[]
  screens: TimelineCarouselScreen[]
  eraSegments: TimelinePortalEraSegment[]
  eventsByEra: Record<string, TimelinePortalEvent[]>
}

const mainTimelineEraOrder = [
  'ancient-epoch',
  'awakening-era',
  'golden-age',
  'conflict-epoch',
  'transcendent-age',
  'final-epoch',
]

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function getTimelineDockWidth(width: number) {
  if (width < 768) return Math.max(0, width - 24)
  return Math.min(672, Math.max(308, width - 400), Math.max(0, width - 32))
}

export function getTimelineSideMargin(width: number) {
  return Math.min(52, Math.max(10.5, width * 0.04))
}

export function getSelectedCardWidth(sideLaneWidth: number, sideMargin: number) {
  const availableWidth = sideLaneWidth - sideMargin - 16
  return Math.max(136, Math.min(280, availableWidth))
}

export function getStatusWidth(sideLaneWidth: number) {
  const availableWidth = sideLaneWidth - 32
  return Math.max(144, Math.min(320, availableWidth))
}

export function getEraMarkerColor(eraKey: string) {
  const colors: Record<string, string> = {
    'ancient-epoch': '#67e8f9',
    'awakening-era': '#22d3ee',
    'golden-age': '#facc15',
    'conflict-epoch': '#fb7185',
    'transcendent-age': '#a78bfa',
    'final-epoch': '#e2e8f0',
    'singularity-conflict': '#f0abfc',
  }

  return colors[eraKey] ?? '#94a3b8'
}

export function sortTimelinePortalEvents(events: TimelinePortalEvent[]) {
  return [...events].sort((a, b) => a.year - b.year || a.slug.localeCompare(b.slug))
}

function isFiniteEraRange(startYear?: number, endYear?: number) {
  return Number.isFinite(startYear) && Number.isFinite(endYear) && Number(startYear) < Number(endYear)
}

function getEraEntries(eraConfig: TimelinePortalEraConfig) {
  return Object.entries(eraConfig)
    .filter(([key, config]) =>
      key !== 'all-time' &&
      key !== 'all-eras' &&
      key !== 'unknown' &&
      isFiniteEraRange(config.startYear, config.endYear),
    )
    .sort(([keyA, configA], [keyB, configB]) => {
      const startDelta = Number(configA.startYear) - Number(configB.startYear)
      if (startDelta !== 0) return startDelta

      const mainA = mainTimelineEraOrder.includes(keyA) ? 0 : 1
      const mainB = mainTimelineEraOrder.includes(keyB) ? 0 : 1
      if (mainA !== mainB) return mainA - mainB

      return Number(configA.endYear) - Number(configB.endYear)
    })
}

export function getTimelinePortalEraForYear(
  year: number,
  eraConfig: TimelinePortalEraConfig,
): string {
  for (const eraKey of mainTimelineEraOrder) {
    const config = eraConfig[eraKey]
    if (!config || !isFiniteEraRange(config.startYear, config.endYear)) continue
    if (year >= Number(config.startYear) && year <= Number(config.endYear)) return eraKey
  }

  for (const [eraKey, config] of getEraEntries(eraConfig)) {
    if (mainTimelineEraOrder.includes(eraKey)) continue
    if (year >= Number(config.startYear) && year <= Number(config.endYear)) return eraKey
  }

  return 'unknown'
}

function getEventEra(event: TimelinePortalEvent, eraConfig: TimelinePortalEraConfig) {
  if (event.era && eraConfig[event.era]) return event.era
  return getTimelinePortalEraForYear(event.year, eraConfig)
}

function getTimelineIndexForYear(year: number, events: TimelinePortalEvent[]) {
  if (events.length <= 1) return 0

  const minYear = events[0]?.year ?? year
  const maxYear = events[events.length - 1]?.year ?? year
  if (minYear === maxYear) return 0

  return clamp(
    ((year - minYear) / (maxYear - minYear)) * (events.length - 1),
    0,
    events.length - 1,
  )
}

export function createTimelinePortalModel(
  events: TimelinePortalEvent[],
  eraConfig: TimelinePortalEraConfig,
): TimelinePortalModel {
  const sortedEvents = sortTimelinePortalEvents(events)
  const screens = sortedEvents.map(event => createTimelineCarouselScreen(event, eraConfig))
  const eventsByEra = sortedEvents.reduce<Record<string, TimelinePortalEvent[]>>((groups, event) => {
    const eraKey = getEventEra(event, eraConfig)
    groups[eraKey] ??= []
    groups[eraKey].push(event)
    return groups
  }, {})

  const eventIndexBySlug = new Map(sortedEvents.map((event, index) => [event.slug, index]))
  const eraSegments = getEraEntries(eraConfig).map(([key, config]) => {
    const startYear = Number(config.startYear)
    const endYear = Number(config.endYear)
    const eventsInRange = sortedEvents.filter(event => event.year >= startYear && event.year <= endYear)
    const matchingIndices = eventsInRange
      .map(event => eventIndexBySlug.get(event.slug))
      .filter((index): index is number => typeof index === 'number')
    const startIndex =
      matchingIndices.length > 0
        ? Math.min(...matchingIndices)
        : getTimelineIndexForYear(startYear, sortedEvents)
    const endIndex =
      matchingIndices.length > 0
        ? Math.max(...matchingIndices)
        : getTimelineIndexForYear(endYear, sortedEvents)

    return {
      key,
      displayName: config.displayName || key.replaceAll('-', ' '),
      startYear,
      endYear,
      startIndex,
      endIndex,
      centerIndex: (startIndex + endIndex) / 2,
      eventCount: eventsInRange.length,
      isOverlapping: !mainTimelineEraOrder.includes(key),
      backgroundImage: config.backgroundImage,
      backgroundVideo: config.backgroundVideo,
      backgroundVideoPlaybackRate: config.backgroundVideoPlaybackRate,
    }
  })

  return {
    events: sortedEvents,
    screens,
    eraSegments,
    eventsByEra,
  }
}

export function createTimelineCarouselScreen(
  event: TimelinePortalEvent,
  eraConfig: TimelinePortalEraConfig,
): TimelineCarouselScreen {
  const era = getEventEra(event, eraConfig)
  const eraDetails = eraConfig[era] ?? eraConfig['all-eras'] ?? eraConfig['all-time']
  const collection = event.contentType || event.sourceCollection || 'entry'
  const sourceLabel = collection.replaceAll('-', ' ').replaceAll('_', ' ')
  const eraLabel = eraDetails?.displayName || era.replaceAll('-', ' ')

  return {
    kicker: `${eraLabel} / ${sourceLabel}`,
    title: event.title,
    stat: `${formatTimelineYear(event.year)}${event.location ? ` / ${event.location}` : ''}`,
    ctaLabel: 'Open Record',
    stillSrc:
      event.bannerData?.background ||
      eraDetails?.backgroundImage ||
      '/assets/banner/home-intro-stills/timeline.webp',
    videoSrc: event.bannerData?.backgroundVideo || eraDetails?.backgroundVideo || '',
    eraKey: era,
    year: event.year,
    isKeyEvent: Boolean(event.isKeyEvent),
  }
}
