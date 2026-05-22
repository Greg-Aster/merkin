import archiveManifest from '../../../../packages/shared-data/generated/archive.json'

export type ArchiveRecord = (typeof archiveManifest.items)[number]

export interface ArchivePanelGroup {
  year: number
  posts: {
    title: string
    url: string
    published: string
    tags: string[]
  }[]
}

export function normalizeArchiveTaxonomyValue(value: string) {
  return value.trim().toLowerCase()
}

const TAXONOMY_LABEL_OVERRIDES = new Map([
  ['ai', 'AI'],
  ['sci-fi', 'Sci-Fi'],
  ['xl', 'XL'],
])

export function formatArchiveTaxonomyLabel(value: string) {
  return normalizeArchiveTaxonomyValue(value)
    .split(/\s+/)
    .map(word => {
      const override = TAXONOMY_LABEL_OVERRIDES.get(word)
      if (override) return override

      return word
        .split('-')
        .map(part => {
          const partOverride = TAXONOMY_LABEL_OVERRIDES.get(part)
          if (partOverride) return partOverride

          return `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`
        })
        .join('-')
    })
    .join(' ')
}

export function getArchiveTags() {
  const tags = new Set<string>()

  for (const record of archiveManifest.items) {
    for (const tag of record.tags ?? []) {
      const normalizedTag = normalizeArchiveTaxonomyValue(tag)
      if (normalizedTag) tags.add(normalizedTag)
    }
  }

  return Array.from(tags).sort((a, b) => a.localeCompare(b))
}

export function getArchiveCategories() {
  const categories = new Set<string>()

  for (const record of archiveManifest.items) {
    const normalizedCategory = normalizeArchiveTaxonomyValue(
      record.category ?? '',
    )
    if (normalizedCategory) categories.add(normalizedCategory)
  }

  return Array.from(categories).sort((a, b) => a.localeCompare(b))
}

export function getArchiveRecordsByTaxonomy({
  tags,
  categories,
}: {
  tags?: string[]
  categories?: string[]
} = {}) {
  const normalizedTags = new Set(
    (tags ?? []).map(normalizeArchiveTaxonomyValue).filter(Boolean),
  )
  const normalizedCategories = new Set(
    (categories ?? []).map(normalizeArchiveTaxonomyValue).filter(Boolean),
  )

  return archiveManifest.items.filter(record => {
    if (normalizedTags.size > 0) {
      const recordTags = new Set(
        (record.tags ?? []).map(normalizeArchiveTaxonomyValue),
      )
      if (![...normalizedTags].some(tag => recordTags.has(tag))) return false
    }

    if (normalizedCategories.size > 0) {
      const recordCategory = normalizeArchiveTaxonomyValue(record.category ?? '')
      if (!normalizedCategories.has(recordCategory)) return false
    }

    return true
  })
}

function getArchiveRecordDate(record: ArchiveRecord) {
  return record.published ?? record.updated ?? '1970-01-01T00:00:00.000Z'
}

export function getArchivePanelGroups(records: ArchiveRecord[]) {
  const sortedRecords = [...records].sort(
    (a, b) =>
      new Date(getArchiveRecordDate(b)).getTime() -
      new Date(getArchiveRecordDate(a)).getTime(),
  )

  const grouped = new Map<number, ArchiveRecord[]>()

  for (const record of sortedRecords) {
    const year = new Date(getArchiveRecordDate(record)).getFullYear()
    const posts = grouped.get(year) ?? []
    posts.push(record)
    grouped.set(year, posts)
  }

  return Array.from(grouped.entries()).map<ArchivePanelGroup>(
    ([year, records]) => ({
      year,
      posts: records.map(record => ({
        title: record.title,
        url: record.draft ? '/archive/' : record.url,
        published: getArchiveRecordDate(record),
        tags: record.tags ?? [],
      })),
    }),
  )
}
