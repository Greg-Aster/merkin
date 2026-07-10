import { getCollection } from 'astro:content'
import type { BlogPostData } from '@/types/config'
import I18nKey from '@i18n/i18nKey'
import { i18n } from '@i18n/translation'
import {
  comparePublishedDesc,
  promotedCollectionFilter,
  publicCollectionFilter,
} from '../contracts/content'

type SortedPost = { body: string; data: BlogPostData; slug: string }

type SortedPostsOptions = {
  includeArchived?: boolean
}

export async function getSortedPosts(
  includeDrafts = false,
  options: SortedPostsOptions = {},
): Promise<SortedPost[]> {
  const filter =
    includeDrafts && options.includeArchived
      ? undefined
      : options.includeArchived
        ? publicCollectionFilter
        : promotedCollectionFilter
  const allBlogPosts = (await getCollection(
    'posts',
    includeDrafts
      ? entry => entry.data.archive !== true || options.includeArchived === true
      : filter,
  )) as unknown as SortedPost[]

  const sorted = allBlogPosts.sort(comparePublishedDesc)

  // Continue with setting up next/prev links
  for (let i = 1; i < sorted.length; i++) {
    sorted[i].data.nextSlug = sorted[i - 1].slug
    sorted[i].data.nextTitle = sorted[i - 1].data.title
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    sorted[i].data.prevSlug = sorted[i + 1].slug
    sorted[i].data.prevTitle = sorted[i + 1].data.title
  }

  return sorted
}

export async function getSortedArchivePosts(
  includeDrafts = false,
): Promise<SortedPost[]> {
  return getSortedPosts(includeDrafts, { includeArchived: true })
}

export type Tag = {
  name: string
  count: number
}

export async function getTagList(): Promise<Tag[]> {
  const allBlogPosts = await getCollection<'posts'>(
    'posts',
    import.meta.env.PROD ? publicCollectionFilter : undefined,
  )

  const countMap: { [key: string]: number } = {}
  allBlogPosts.map((post: { data: { tags: string[] } }) => {
    post.data.tags.map((tag: string) => {
      if (!countMap[tag]) countMap[tag] = 0
      countMap[tag]++
    })
  })

  // sort tags
  const keys: string[] = Object.keys(countMap).sort((a, b) => {
    return a.toLowerCase().localeCompare(b.toLowerCase())
  })

  return keys.map(key => ({ name: key, count: countMap[key] }))
}

export type Category = {
  name: string
  count: number
}

// --- Series / Arc helpers ---

export async function getPostsBySeries(
  seriesId: string,
  includeDrafts = false,
): Promise<{ body: string; data: BlogPostData; slug: string }[]> {
  const allPosts = (await getCollection(
    'posts',
    includeDrafts ? undefined : publicCollectionFilter,
  )) as unknown as { body: string; data: BlogPostData; slug: string }[]

  return allPosts
    .filter(post => (post.data as any).series === seriesId)
    .sort((a, b) => {
      const partA = (a.data as any).seriesPart ?? 0
      const partB = (b.data as any).seriesPart ?? 0
      return partA - partB
    })
}

export async function getAllSeries(
  includeDrafts = false,
): Promise<
  Record<string, { body: string; data: BlogPostData; slug: string }[]>
> {
  const allPosts = (await getCollection(
    'posts',
    includeDrafts ? undefined : publicCollectionFilter,
  )) as unknown as { body: string; data: BlogPostData; slug: string }[]

  const grouped: Record<string, typeof allPosts> = {}
  for (const post of allPosts) {
    const seriesId = (post.data as any).series as string | undefined
    if (seriesId) {
      if (!grouped[seriesId]) grouped[seriesId] = []
      grouped[seriesId].push(post)
    }
  }

  // Sort each series by seriesPart
  for (const id of Object.keys(grouped)) {
    grouped[id].sort((a, b) => {
      const partA = (a.data as any).seriesPart ?? 0
      const partB = (b.data as any).seriesPart ?? 0
      return partA - partB
    })
  }

  return grouped
}

export async function getPostsByEra(
  eraSlug: string,
  includeDrafts = false,
): Promise<{ body: string; data: BlogPostData; slug: string }[]> {
  const allPosts = (await getCollection(
    'posts',
    includeDrafts ? undefined : publicCollectionFilter,
  )) as unknown as { body: string; data: BlogPostData; slug: string }[]

  return allPosts
    .filter(post => post.data.timelineEra === eraSlug)
    .sort((a, b) => {
      const yearA = Number(a.data.timelineYear) || 0
      const yearB = Number(b.data.timelineYear) || 0
      return yearA - yearB
    })
}

// --- End series / arc helpers ---

export async function getCategoryList(): Promise<Category[]> {
  const allBlogPosts = await getCollection<'posts'>(
    'posts',
    import.meta.env.PROD ? publicCollectionFilter : undefined,
  )
  const count: { [key: string]: number } = {}
  allBlogPosts.map((post: { data: { category: string | number } }) => {
    if (!post.data.category) {
      const ucKey = i18n(I18nKey.uncategorized)
      count[ucKey] = count[ucKey] ? count[ucKey] + 1 : 1
      return
    }
    count[post.data.category] = count[post.data.category]
      ? count[post.data.category] + 1
      : 1
  })

  const lst = Object.keys(count).sort((a, b) => {
    return a.toLowerCase().localeCompare(b.toLowerCase())
  })

  const ret: Category[] = []
  for (const c of lst) {
    ret.push({ name: c, count: count[c] })
  }
  return ret
}
