import type { CollectionEntry } from 'astro:content'

type ReaderEntry = CollectionEntry<'reader'>

export const FIRST_CONTACT_MANUAL_BOOK_SLUG = 'first-contact-manual'
export const FIRST_CONTACT_MANUAL_TITLE =
  "The Interstellar Traveler's First Contact Manual"
export const FIRST_CONTACT_MANUAL_DESCRIPTION =
  'An unvarnished survival manual for first contact, cosmic indifference, hostile civilizations, and other reasons to stay quiet.'

export const FIRST_CONTACT_MANUAL_POST_ORDER = [
  'first-contact-manual/index',
  'first-contact-manual/forward',
  'first-contact-manual/chapter-1',
  'first-contact-manual/chapter-2',
  'first-contact-manual/chapter-3',
  'first-contact-manual/chapter-4',
  'first-contact-manual/chapter-5',
  'first-contact-manual/afterword',
] as const

const firstContactReaderSlugs: Record<string, string> = {
  'first-contact-manual/index': '',
  'first-contact-manual/forward': 'forward',
  'first-contact-manual/chapter-1': 'chapter-1',
  'first-contact-manual/chapter-2': 'chapter-2',
  'first-contact-manual/chapter-3': 'chapter-3',
  'first-contact-manual/chapter-4': 'chapter-4',
  'first-contact-manual/chapter-5': 'chapter-5',
  'first-contact-manual/afterword': 'afterword',
}

const firstContactLegacyPostSlugs: Record<string, string> = {
  'timelines/first-contact-index': 'first-contact-manual/index',
  'timelines/first-contact-forward': 'first-contact-manual/forward',
  'timelines/first-contact-1': 'first-contact-manual/chapter-1',
  'timelines/first-contact-2': 'first-contact-manual/chapter-2',
  'timelines/first-contact-3': 'first-contact-manual/chapter-3',
  'timelines/first-contact-4': 'first-contact-manual/chapter-4',
  'timelines/first-contact-5': 'first-contact-manual/chapter-5',
  'timelines/first-contact-afterword': 'first-contact-manual/afterword',
  'timelines/first-contact-working-copy': 'first-contact-manual/forward',
}

const firstContactOrder: Map<string, number> = new Map(
  FIRST_CONTACT_MANUAL_POST_ORDER.map((slug, index) => [slug, index]),
)

export function isFirstContactManualEntry(entry: ReaderEntry) {
  return firstContactOrder.has(entry.slug)
}

export function sortFirstContactManualEntries(
  entries: ReaderEntry[],
) {
  return entries
    .filter(isFirstContactManualEntry)
    .sort(
      (a, b) =>
        (firstContactOrder.get(a.slug) ?? 999) -
        (firstContactOrder.get(b.slug) ?? 999),
    )
}

export function firstContactManualHref(
  entryOrSlug: ReaderEntry | string,
  anchor = '',
) {
  const postSlug =
    typeof entryOrSlug === 'string' ? entryOrSlug : entryOrSlug.slug
  const readerSlug = firstContactReaderSlugs[postSlug]
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
