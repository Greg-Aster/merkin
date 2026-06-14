import { formatTimelineYear } from '@merkin/shared-content'
import archiveManifest from '../../../../../packages/shared-data/generated/archive.json'
import { isPublicArchiveRecord } from '../../contracts/archive'

export type ArchiveStoryMapPost = (typeof archiveManifest.items)[number]

export interface ArchiveStoryMapRecord {
  post: ArchiveStoryMapPost
  indexLabel: string
  isLocked: boolean
  access: 'open' | 'restricted'
  collection: string
  collectionLabel: string
  timelineLabel: string
  searchText: string
  nodeStyle: string
}

export interface ArchiveStoryMapGroup {
  id: string
  title: string
  description: string
  tone: string
  previewImages: string[]
  posts: ArchiveStoryMapRecord[]
  openCount: number
  restrictedCount: number
  collectionValues: string[]
  collectionSummary: string
}

function normalizeId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function getArchiveGroupTitle(post: ArchiveStoryMapPost) {
  if (post.seriesTitle) return post.seriesTitle
  if (post.series === 'first-contact-manual')
    return "The Interstellar Traveler's First Contact Manual"
  if (post.series) return post.series
  if (post.collection === 'videos') return 'Video Archive'
  if (post.collection === 'reader') return 'Reader Files'
  if (post.collection === 'products') return 'Commercial Records'
  if (post.collection === 'about') return 'Personnel Files'
  if (post.collection === 'cookbook') return 'Galactic Cookbook'
  if (post.sourcePath?.includes('miranda-bloody-mary'))
    return 'The Miranda Incident'
  if (post.tags?.some(tag => /cookbook|recipe/i.test(tag)))
    return 'Galactic Cookbook'
  if (post.category === 'Site Updates') return 'Site Transmissions'
  if (
    post.category === 'Store Announcement' ||
    post.sourcePath?.includes('/store/')
  )
    return 'Commercial Records'
  if (post.sourcePath?.startsWith('timelines/')) return 'Chronology Fragments'
  return 'Core Entry Points'
}

function getGroupDescription(title: string) {
  const descriptions: Record<string, string> = {
    'Core Entry Points':
      'Primary gateways into the MEGAMEAL universe and its competing transmission modes.',
    'Site Transmissions':
      'Development notes, assistant dispatches, and project-facing updates from the active surface.',
    'Galactic Cookbook':
      'Culinary records, recipe fragments, and edible historical artifacts from the archive.',
    'Chronology Fragments':
      'Loose timeline records that define eras, disasters, ascensions, and lost civilizations.',
    "The Interstellar Traveler's First Contact Manual":
      'A survival manual for contact with beings that do not care if you remain intact.',
    'Commercial Records':
      'Storefront debris, product records, and corporate commerce fragments.',
    'Video Archive':
      'Screening rooms, transmissions, commercials, and recovered moving-image evidence.',
    'Reader Files':
      'Long-form manuals, chapters, and serialized documents from the broader archive.',
    'Personnel Files':
      'Profiles, witnesses, departments, and known entities connected to the record.',
    'The Miranda Incident':
      'Recovered testimony, recipes, access denials, and contradictory evidence from a temporal catastrophe.',
    'The Snuggloid Emergence':
      'Companion-product records documenting the rise of a suspiciously affectionate species.',
  }

  return (
    descriptions[title] ??
    'Related records in the broader MEGAMEAL story graph.'
  )
}

function getGroupTone(index: number) {
  const tones = [
    'core',
    'signal',
    'cookbook',
    'chronology',
    'manual',
    'commercial',
    'miranda',
    'snuggloid',
  ]
  return tones[index % tones.length]
}

function formatYear(value: string | null | undefined) {
  if (!value) return 'undated'
  const year = new Date(value).getUTCFullYear()
  return Number.isFinite(year) ? String(year) : 'undated'
}

function getTimelineLabel(post: ArchiveStoryMapPost) {
  if (typeof post.timelineYear === 'number') {
    return formatTimelineYear(post.timelineYear)
  }
  return formatYear(post.published)
}

export function getCollectionLabel(value: string | null | undefined) {
  if (!value) return 'Record'
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
}

function getNodeStyle(index: number, total: number) {
  const safeTotal = Math.max(total, 1)
  const angle = (index / safeTotal) * Math.PI * 2 - Math.PI / 2
  const ring = index % 3
  const radius = ring === 0 ? 32 : ring === 1 ? 40 : 24
  const x = 50 + Math.cos(angle) * radius
  const y = 50 + Math.sin(angle) * radius * 0.72
  const delay = index * 0.12
  return `--node-x: ${x.toFixed(2)}%; --node-y: ${y.toFixed(2)}%; --node-delay: ${delay.toFixed(2)}s;`
}

function getPreviewImages(posts: ArchiveStoryMapPost[], tone: string) {
  const fallbackByTone: Record<string, string[]> = {
    core: [
      '/posts/timeline/universe.png',
      '/posts/timeline/universe-avatar.png',
    ],
    signal: ['/assets/banner/golden-era.jpg', '/posts/horror.png'],
    cookbook: [
      '/posts/cookbook/cookbook.png',
      '/posts/timeline/zelephant-roast.png',
    ],
    chronology: [
      '/posts/timeline/archive.png',
      '/posts/timeline/corporate.png',
    ],
    manual: [
      '/posts/timeline/chronos.png',
      '/posts/timeline/awakening-era.png',
    ],
    commercial: [
      '/posts/Mega-Meal-Explained/ultra-sign.png',
      '/posts/Mega-Meal-Explained/burger-hole.png',
    ],
    miranda: [
      '/posts/timeline/redacted.png',
      '/posts/timeline/vault-keypad.png',
    ],
    snuggloid: [
      '/posts/timeline/snuggloid-entity.png',
      '/posts/timeline/snuggloid1.png',
    ],
  }

  const seen = new Set<string>()
  const discovered = posts
    .flatMap(post => [post.image, post.bannerData?.background])
    .filter((value): value is string => Boolean(value))
    .filter(value => {
      if (seen.has(value)) return false
      seen.add(value)
      return true
    })

  return [
    ...discovered,
    ...(fallbackByTone[tone] ?? fallbackByTone.core),
  ].slice(0, 3)
}

const preferredOrder = [
  'Core Entry Points',
  'The Miranda Incident',
  'Video Archive',
  "The Interstellar Traveler's First Contact Manual",
  'Reader Files',
  'Chronology Fragments',
  'Galactic Cookbook',
  'Commercial Records',
  'Personnel Files',
  'The Snuggloid Emergence',
  'Site Transmissions',
]

function compareArchiveStoryMapPosts(
  left: ArchiveStoryMapPost,
  right: ArchiveStoryMapPost,
) {
  const partA = left.seriesPart ?? Number.POSITIVE_INFINITY
  const partB = right.seriesPart ?? Number.POSITIVE_INFINITY
  if (partA !== partB) return partA - partB

  const timelineA = left.timelineYear ?? Number.POSITIVE_INFINITY
  const timelineB = right.timelineYear ?? Number.POSITIVE_INFINITY
  if (timelineA !== timelineB) return timelineA - timelineB

  return (
    new Date(right.published ?? 0).getTime() -
    new Date(left.published ?? 0).getTime()
  )
}

function getArchiveStoryMapRecord({
  post,
  index,
  total,
  groupTitle,
  groupDescription,
}: {
  post: ArchiveStoryMapPost
  index: number
  total: number
  groupTitle: string
  groupDescription: string
}): ArchiveStoryMapRecord {
  const isLocked = !isPublicArchiveRecord(post)
  const collection = post.collection ?? ''
  const collectionLabel = getCollectionLabel(collection)
  const timelineLabel = getTimelineLabel(post)

  return {
    post,
    indexLabel: String(index + 1).padStart(2, '0'),
    isLocked,
    access: isLocked ? 'restricted' : 'open',
    collection,
    collectionLabel,
    timelineLabel,
    searchText:
      `${post.title} ${groupTitle} ${groupDescription} ${collectionLabel} ${timelineLabel} ${isLocked ? 'restricted locked' : 'open'}`.toLowerCase(),
    nodeStyle: getNodeStyle(index, total),
  }
}

export function getArchiveStoryMapModel(
  posts: ArchiveStoryMapPost[] = archiveManifest.items,
) {
  const grouped = new Map<string, ArchiveStoryMapPost[]>()

  for (const post of posts) {
    const groupTitle = getArchiveGroupTitle(post)
    if (!grouped.has(groupTitle)) grouped.set(groupTitle, [])
    grouped.get(groupTitle)?.push(post)
  }

  const archiveGroups: ArchiveStoryMapGroup[] = Array.from(grouped.entries())
    .sort(([a], [b]) => {
      const aIndex = preferredOrder.indexOf(a)
      const bIndex = preferredOrder.indexOf(b)
      if (aIndex !== -1 || bIndex !== -1) {
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
      }
      return a.localeCompare(b)
    })
    .map(([title, groupPosts], index) => {
      const tone = getGroupTone(index)
      const description = getGroupDescription(title)
      const sortedPosts = [...groupPosts].sort(compareArchiveStoryMapPosts)
      const records = sortedPosts.map((post, recordIndex) =>
        getArchiveStoryMapRecord({
          post,
          index: recordIndex,
          total: sortedPosts.length,
          groupTitle: title,
          groupDescription: description,
        }),
      )
      const collectionValues = Array.from(
        new Set(sortedPosts.map(post => post.collection).filter(Boolean)),
      )
      const openCount = sortedPosts.filter(isPublicArchiveRecord).length

      return {
        id: normalizeId(title),
        title,
        description,
        tone,
        previewImages: getPreviewImages(sortedPosts, tone),
        posts: records,
        openCount,
        restrictedCount: sortedPosts.length - openCount,
        collectionValues,
        collectionSummary: collectionValues.map(getCollectionLabel).join(' / '),
      }
    })

  const collectionFilters = Array.from(
    new Set(posts.map(post => post.collection).filter(Boolean)),
  ).sort((a, b) => getCollectionLabel(a).localeCompare(getCollectionLabel(b)))

  return {
    archiveGroups,
    collectionFilters,
  }
}
