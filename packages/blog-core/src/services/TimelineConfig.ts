export interface TimelineEvent {
  title: string
  description: string
  slug: string
  year: number
  url?: string
  contentType?: string
  sourceCollection?: string
  era?: string
  category?: string
  isKeyEvent: boolean
  levelId?: string
  isLevel?: boolean
  location?: string
  isDraft?: boolean
  showInTimeline?: boolean
  tags?: string[]
  timelineYear?: number
  timelineEra?: string
  timelineLocation?: string
  uniqueId?: string
  bannerData?: {
    category?: string
    startYear?: number
    endYear?: number
    background?: string
    eraConfig?: {
      [eraKey: string]: {
        displayName: string
        startYear: number
        endYear: number
      }
    }
  }
}

export interface TimelineViewConfig {
  defaultZoom: number
  maxZoom: number
  minZoom: number
  zoomStep: number
  padding: number
  zoomRatioThresholds: {
    verySmall: number
    small: number
    medium: number
    large: number
    veryLarge: number
  }
  zoomLevels: {
    verySmall: number
    small: number
    medium: number
    large: number
    veryLarge: number
    full: number
  }
}

export const defaultTimelineViewConfig: TimelineViewConfig = {
  defaultZoom: 1,
  maxZoom: 5,
  minZoom: 0.5,
  zoomStep: 0.2,
  padding: 15,
  zoomRatioThresholds: {
    verySmall: 50,
    small: 20,
    medium: 10,
    large: 4,
    veryLarge: 2,
  },
  zoomLevels: {
    verySmall: 4,
    small: 3,
    medium: 2.5,
    large: 2,
    veryLarge: 1.5,
    full: 1.2,
  },
}

export interface EraConfig {
  displayName: string
  startYear: number
  endYear: number
  colorClass?: string
  badgeClass?: string
  zoomLevel?: number
  panToYear?: number
  customPadding?: number
  backgroundImage?: string
  backgroundVideo?: string
  backgroundVideoPlaybackRate?: number
}

// Era configuration type mapping
export interface EraConfigMap {
  [eraKey: string]: EraConfig
}

export interface TimelineConstellationConfig {
  centerAzimuth: number
  centerElevation: number
  spread: number
  pattern: string
}

export interface TimelineConstellationPoint {
  azOffset: number
  elOffset: number
}

export interface TimelineConstellationConfigMap {
  [eraKey: string]: TimelineConstellationConfig
}

export interface TimelineConstellationPatternMap {
  [pattern: string]: TimelineConstellationPoint[]
}

export interface TimelineConnectionPatternMap {
  [pattern: string]: Array<[number, number]>
}
