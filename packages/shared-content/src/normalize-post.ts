import type {
  SharedBannerData,
  SharedPost,
  SharedRawPostFrontmatter,
  SharedTimelineEvent,
} from './types.ts'

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function asIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString()
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString()
  }

  return null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && !!item.trim())
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeBannerData(value: unknown): SharedBannerData | undefined {
  if (!isRecord(value)) return undefined

  const normalized: SharedBannerData = {
    ...value,
  }

  const startYear = asNumber(value.startYear)
  const endYear = asNumber(value.endYear)

  if (startYear !== undefined) normalized.startYear = startYear
  if (endYear !== undefined) normalized.endYear = endYear

  const compact = value.compact
  if (typeof compact === 'boolean') normalized.compact = compact

  const eraConfig = value.eraConfig
  if (isRecord(eraConfig)) {
    const normalizedEntries: [
      string,
      { displayName: string; startYear: number; endYear: number },
    ][] = []

    for (const [key, config] of Object.entries(eraConfig)) {
      if (!isRecord(config)) continue

      normalizedEntries.push([
        key,
        {
          displayName: asString(config.displayName) ?? key,
          startYear: asNumber(config.startYear) ?? 0,
          endYear: asNumber(config.endYear) ?? 0,
        },
      ])
    }

    normalized.eraConfig = Object.fromEntries(normalizedEntries)
  }

  return normalized
}

function routeBaseForCollection(collection: string): string {
  if (collection === 'products') return 'store'
  if (collection === 'posts') return 'posts'
  return collection
}

function buildContentUrl(collection: string, slug: string): string {
  if (collection === 'cookbook' && slug === 'cookbook-index') return '/cookbook/'
  return `/${routeBaseForCollection(collection)}/${slug}/`
}

export function normalizePost(input: {
  slug: string
  sourcePath: string
  frontmatter: SharedRawPostFrontmatter
  collection?: string
}): SharedPost {
  const { sourcePath, frontmatter } = input
  const collection = input.collection ?? 'posts'
  const slug = asString(frontmatter.slug) ?? input.slug
  const title = asString(frontmatter.title) ?? asString(frontmatter.name) ?? slug
  const description =
    asString(frontmatter.description) ?? asString(frontmatter.tagline) ?? ''
  const timelineYear = asNumber(frontmatter.timelineYear)
  const yIndex = asNumber(frontmatter.yIndex)
  const seriesPart = asNumber(frontmatter.seriesPart)
  const showInTimeline =
    typeof frontmatter.showInTimeline === 'boolean'
      ? frontmatter.showInTimeline
      : undefined

  return {
    id: slug,
    slug,
    sourcePath,
    collection,
    url: buildContentUrl(collection, slug),
    title,
    description,
    published: asIsoDate(frontmatter.published),
    updated: asIsoDate(frontmatter.updated),
    draft: asBoolean(frontmatter.draft, false),
    tags: asStringArray(frontmatter.tags),
    category: asString(frontmatter.category),
    yIndex,
    image: asString(frontmatter.image),
    bannerType: asString(frontmatter.bannerType),
    bannerData: normalizeBannerData(frontmatter.bannerData),
    timelineYear,
    timelineEra: asString(frontmatter.timelineEra),
    timelineLocation: asString(frontmatter.timelineLocation),
    isKeyEvent: asBoolean(frontmatter.isKeyEvent, false),
    showInTimeline,
    isLevel: asBoolean(frontmatter.isLevel, false),
    levelId: asString(frontmatter.levelId) ?? null,
    series: asString(frontmatter.series),
    seriesPart,
    seriesTitle: asString(frontmatter.seriesTitle),
    contentFormat: asString(frontmatter.contentFormat),
  }
}

export function toTimelineEvent(
  post: SharedPost,
  options: { includeBanners?: boolean; fallbackYear?: number } = {},
): SharedTimelineEvent | null {
  const includeBanners = options.includeBanners ?? true
  const publishedYear = post.published ? new Date(post.published).getUTCFullYear() : undefined
  const fallbackYear = options.fallbackYear ?? new Date().getUTCFullYear()

  if (post.showInTimeline === false) return null

  let year = post.timelineYear

  if (
    year === undefined &&
    includeBanners &&
    post.bannerType === 'timeline' &&
    post.bannerData
  ) {
    year = publishedYear ?? fallbackYear
  }

  if (year === undefined && post.showInTimeline === true) {
    year = publishedYear ?? fallbackYear
  }

  if (year === undefined) return null

  return {
    title: post.title,
    description: post.description,
    slug: post.slug,
    sourcePath: post.sourcePath,
    url: post.url,
    contentType: post.collection === 'products' ? 'store' : post.collection,
    sourceCollection: post.collection,
    year,
    era: post.timelineEra,
    category: post.category,
    isKeyEvent: post.isKeyEvent,
    isLevel: post.isLevel,
    levelId: post.levelId ?? null,
    location: post.timelineLocation,
    isDraft: post.draft,
    showInTimeline: post.showInTimeline,
    tags: post.tags,
    timelineYear: year,
    timelineEra: post.timelineEra,
    timelineLocation: post.timelineLocation,
    uniqueId: post.slug,
    bannerData: post.bannerData,
  }
}
