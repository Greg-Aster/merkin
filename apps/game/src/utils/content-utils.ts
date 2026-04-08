import { getCollection } from 'astro:content'

export type GamePostData = {
  title: string
  published: Date
  draft?: boolean
  description?: string
  tags?: string[]
  category?: string
  timelineYear?: string
  bannerType?: string
  era?: string
  location?: string
  isKeyEvent?: boolean
  isLevel?: boolean
  levelId?: string | null
  nextSlug?: string
  nextTitle?: string
  prevSlug?: string
  prevTitle?: string
}

export async function getSortedPosts(
  includeDrafts = false,
): Promise<{ body: string; data: GamePostData; slug: string }[]> {
  const allPosts = (await getCollection('posts', ({ data }) => {
    return includeDrafts ? true : data.draft !== true
  })) as unknown as { body: string; data: GamePostData; slug: string }[]

  const sorted = allPosts.sort((a, b) => {
    const dateA = new Date(a.data.published)
    const dateB = new Date(b.data.published)
    return dateA > dateB ? -1 : 1
  })

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
