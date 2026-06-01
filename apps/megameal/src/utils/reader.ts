import type { CollectionEntry } from 'astro:content'

type ReaderEntry = CollectionEntry<'reader'>

export const FIRST_CONTACT_MANUAL_BOOK_SLUG = 'first-contact-manual'
export const FIRST_CONTACT_MANUAL_TITLE =
  "The Interstellar Traveler's First Contact Manual"
export const FIRST_CONTACT_MANUAL_DESCRIPTION =
  'An unvarnished survival manual for first contact, cosmic indifference, hostile civilizations, and other reasons to stay quiet.'
const FIRST_CONTACT_MANUAL_SLUG_PREFIX = `${FIRST_CONTACT_MANUAL_BOOK_SLUG}/`

const firstContactLegacyPostSlugs: Record<string, string> = {
  'timelines/first-contact-index': 'first-contact-manual/index',
  'timelines/first-contact-forward': 'first-contact-manual/forward',
  'timelines/first-contact-1': 'first-contact-manual/chapter-1',
  'timelines/first-contact-2': 'first-contact-manual/chapter-2',
  'timelines/first-contact-3': 'first-contact-manual/chapter-3',
  'timelines/first-contact-4': 'first-contact-manual/chapter-4',
  'timelines/first-contact-5': 'first-contact-manual/chapter-5',
  'timelines/first-contact-afterword': 'first-contact-manual/afterword',
  'timelines/first-contact-working-copy': 'first-contact-manual/working-copy',
}

function firstContactManualLocalSlug(slug: string) {
  return slug.startsWith(FIRST_CONTACT_MANUAL_SLUG_PREFIX)
    ? slug.slice(FIRST_CONTACT_MANUAL_SLUG_PREFIX.length)
    : slug
}

function firstContactManualSortKey(slug: string) {
  const localSlug = firstContactManualLocalSlug(slug)
  const chapterMatch = /^chapter-(\d+)$/.exec(localSlug)

  if (localSlug === 'index') return 0
  if (localSlug === 'forward') return 10
  if (chapterMatch) return 100 + Number(chapterMatch[1])
  if (localSlug === 'afterword') return 10000

  return 11000
}

export function isFirstContactManualEntry(entry: ReaderEntry) {
  return entry.slug.startsWith(FIRST_CONTACT_MANUAL_SLUG_PREFIX)
}

export function sortFirstContactManualEntries(
  entries: ReaderEntry[],
) {
  return entries
    .filter(isFirstContactManualEntry)
    .sort((a, b) => {
      const sortDelta =
        firstContactManualSortKey(a.slug) - firstContactManualSortKey(b.slug)

      return sortDelta || a.slug.localeCompare(b.slug)
    })
}

export function firstContactManualHref(
  entryOrSlug: ReaderEntry | string,
  anchor = '',
) {
  const postSlug =
    typeof entryOrSlug === 'string' ? entryOrSlug : entryOrSlug.slug
  const localSlug = firstContactManualLocalSlug(postSlug)
  const readerSlug = localSlug === 'index' ? '' : localSlug
  const base = readerSlug
    ? `/reader/${FIRST_CONTACT_MANUAL_BOOK_SLUG}/${readerSlug}/`
    : `/reader/${FIRST_CONTACT_MANUAL_BOOK_SLUG}/`

  return anchor ? `${base}${anchor}` : base
}

export function firstContactManualRouteParam(entry: ReaderEntry) {
  const href = firstContactManualHref(entry)
  return href.replace(/^\/reader\//, '').replace(/\/$/, '')
}

export function firstContactManualRedirects() {
  return Object.fromEntries(
    Object.entries(firstContactLegacyPostSlugs).map(([postSlug, readerSlug]) => [
      postSlug,
      firstContactManualHref(readerSlug),
    ]),
  )
}
