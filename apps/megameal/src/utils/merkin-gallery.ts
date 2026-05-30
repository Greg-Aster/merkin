import type { CollectionEntry } from 'astro:content'
import { url } from './url-utils'

export const MERKIN_GALLERY_TIME_ZONE = 'America/Los_Angeles'

export type MerkinEntry = CollectionEntry<'merkin'>
export type MerkinMedia = MerkinEntry['data']['media']

export function getMerkinHref(entry: MerkinEntry) {
  return `/merkin/${entry.slug}/`
}

export function resolveMerkinAsset(path: string) {
  if (/^(?:https?:|data:|blob:)/.test(path)) return path

  return url(path)
}

export function getMerkinThumbnail(entry: MerkinEntry) {
  const { media } = entry.data
  return resolveMerkinAsset(media.thumbnail ?? media.poster ?? media.src)
}

export function getMerkinOgImage(entry: MerkinEntry) {
  const { media } = entry.data
  const imagePath =
    media.type === 'video'
      ? (media.thumbnail ?? media.poster ?? '/posts/timeline/merkin.png')
      : (media.thumbnail ?? media.src)

  return resolveMerkinAsset(imagePath)
}

export function compareMerkinEntries(a: MerkinEntry, b: MerkinEntry) {
  return b.data.date.localeCompare(a.data.date) || a.slug.localeCompare(b.slug)
}

export function getMerkinTodayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: MERKIN_GALLERY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))

  return `${values.year}-${values.month}-${values.day}`
}

export function getPublishableMerkinEntries(
  entries: MerkinEntry[],
  todayKey = getMerkinTodayKey(),
) {
  return entries
    .filter(entry => entry.data.draft !== true && entry.data.date <= todayKey)
    .sort(compareMerkinEntries)
}

export function formatMerkinDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}
