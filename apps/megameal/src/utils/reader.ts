import type { CollectionEntry } from 'astro:content'

export const FIRST_CONTACT_MANUAL_BOOK_SLUG = 'first-contact-manual'
export const FIRST_CONTACT_MANUAL_TITLE =
  "The Interstellar Traveler's First Contact Manual"
export const FIRST_CONTACT_MANUAL_DESCRIPTION =
  'An unvarnished survival manual for first contact, cosmic indifference, hostile civilizations, and other reasons to stay quiet.'

export const FIRST_CONTACT_MANUAL_POST_ORDER = [
  'timelines/first-contact-index',
  'timelines/first-contact-forward',
  'timelines/first-contact-1',
  'timelines/first-contact-2',
  'timelines/first-contact-3',
  'timelines/first-contact-4',
  'timelines/first-contact-5',
  'timelines/first-contact-afterword',
] as const

const firstContactReaderSlugs: Record<string, string> = {
  'timelines/first-contact-index': '',
  'timelines/first-contact-forward': 'forward',
  'timelines/first-contact-1': 'chapter-1',
  'timelines/first-contact-2': 'chapter-2',
  'timelines/first-contact-3': 'chapter-3',
  'timelines/first-contact-4': 'chapter-4',
  'timelines/first-contact-5': 'chapter-5',
  'timelines/first-contact-afterword': 'afterword',
}

const firstContactOrder = new Map(
  FIRST_CONTACT_MANUAL_POST_ORDER.map((slug, index) => [slug, index]),
)

export function isFirstContactManualPost(entry: CollectionEntry<'posts'>) {
  return firstContactOrder.has(entry.slug)
}

export function sortFirstContactManualEntries(
  entries: CollectionEntry<'posts'>[],
) {
  return entries
    .filter(isFirstContactManualPost)
    .sort(
      (a, b) =>
        (firstContactOrder.get(a.slug) ?? 999) -
        (firstContactOrder.get(b.slug) ?? 999),
    )
}

export function firstContactManualHref(
  entryOrSlug: CollectionEntry<'posts'> | string,
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

export function firstContactManualRouteParam(entry: CollectionEntry<'posts'>) {
  const href = firstContactManualHref(entry)
  return href.replace(/^\/reader\//, '').replace(/\/$/, '')
}

export function firstContactManualRedirects() {
  return Object.fromEntries(
    Object.keys(firstContactReaderSlugs).map(postSlug => [
      postSlug,
      firstContactManualHref(postSlug),
    ]),
  )
}
