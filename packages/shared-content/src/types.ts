export type SharedBannerEraConfig = Record<
  string,
  {
    displayName: string
    startYear: number
    endYear: number
  }
>

export type SharedBannerData = {
  videoId?: string
  imageUrl?: string
  category?: string
  startYear?: number
  endYear?: number
  background?: string
  title?: string
  height?: string
  compact?: boolean
  eraConfig?: SharedBannerEraConfig
  [key: string]: unknown
}

export type SharedRawPostFrontmatter = Record<string, unknown> & {
  title?: unknown
  name?: unknown
  slug?: unknown
  tagline?: unknown
  description?: unknown
  published?: unknown
  updated?: unknown
  draft?: unknown
  archive?: unknown
  tags?: unknown
  category?: unknown
  yIndex?: unknown
  image?: unknown
  bannerType?: unknown
  bannerData?: unknown
  timelineYear?: unknown
  timelineEra?: unknown
  timelineLocation?: unknown
  isKeyEvent?: unknown
  showInTimeline?: unknown
  isLevel?: unknown
  levelId?: unknown
  series?: unknown
  seriesPart?: unknown
  seriesTitle?: unknown
  contentFormat?: unknown
}

export type SharedPost = {
  id: string
  slug: string
  sourcePath: string
  collection: string
  url: string
  title: string
  description: string
  published: string | null
  updated: string | null
  draft: boolean
  archive: boolean
  tags: string[]
  category?: string
  yIndex?: number
  image?: string
  bannerType?: string
  bannerData?: SharedBannerData
  timelineYear?: number
  timelineEra?: string
  timelineLocation?: string
  isKeyEvent: boolean
  showInTimeline?: boolean
  isLevel: boolean
  levelId?: string | null
  series?: string
  seriesPart?: number
  seriesTitle?: string
  contentFormat?: string
}

export type SharedTimelineEvent = {
  title: string
  description: string
  slug: string
  sourcePath: string
  url: string
  contentType: string
  sourceCollection: string
  year: number
  era?: string
  category?: string
  isKeyEvent: boolean
  isLevel?: boolean
  levelId?: string | null
  location?: string
  isDraft?: boolean
  archive?: boolean
  showInTimeline?: boolean
  tags: string[]
  timelineYear: number
  timelineEra?: string
  timelineLocation?: string
  uniqueId: string
  bannerData?: SharedBannerData
}

export type SharedQuizOption = {
  id?: string
  label?: string
  text?: string
  value?: string
  scores?: Record<string, number>
  [key: string]: unknown
}

export type SharedQuizQuestion = {
  id?: string
  prompt: string
  options: SharedQuizOption[]
}

export type SharedQuiz = {
  id: string
  slug: string
  sourcePath: string
  title: string
  description?: string
  draft: boolean
  questions: SharedQuizQuestion[]
  results?: unknown
}

export type SharedProduct = {
  id: string
  slug: string
  title: string
  description?: string
  price?: number
  currency?: string
  image?: string
  active: boolean
  [key: string]: unknown
}
