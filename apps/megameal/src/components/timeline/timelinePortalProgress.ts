export const timelineVisitedRecordsStorageKey =
  'megameal:timeline:visited-records:v1'

function normalizeVisitedSlugs(value: unknown) {
  if (!Array.isArray(value)) return []

  return [...new Set(
    value.filter((slug): slug is string =>
      typeof slug === 'string' && slug.trim().length > 0,
    ),
  )]
}

export function loadTimelineVisitedSlugs() {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(timelineVisitedRecordsStorageKey)
    return stored ? normalizeVisitedSlugs(JSON.parse(stored)) : []
  } catch (error) {
    console.warn('[timeline] Could not read visited-record progress.', error)
    return []
  }
}

export function persistTimelineVisitedSlugs(slugs: string[]) {
  if (typeof window === 'undefined') return false

  try {
    window.localStorage.setItem(
      timelineVisitedRecordsStorageKey,
      JSON.stringify(normalizeVisitedSlugs(slugs)),
    )
    return true
  } catch (error) {
    console.warn('[timeline] Could not save visited-record progress.', error)
    return false
  }
}

export function addTimelineVisitedSlug(slugs: string[], slug: string) {
  return normalizeVisitedSlugs([...slugs, slug])
}
