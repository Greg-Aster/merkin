import postsManifest from '../../../../packages/shared-data/generated/posts.json'

export type GamePostData = {
  title: string
  published?: Date | string | null
  draft?: boolean
  description?: string
  tags?: string[]
  category?: string
  timelineYear?: number
  bannerType?: string
  timelineEra?: string
  timelineLocation?: string
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
  const allPosts: { body: string; data: GamePostData; slug: string }[] =
    postsManifest.items
      .filter(post => (includeDrafts ? true : post.draft !== true))
      .map(post => ({
        body: '',
        data: {
          title: post.title,
          published: post.published,
          draft: post.draft,
          description: post.description,
          tags: post.tags,
          category: post.category,
          timelineYear: post.timelineYear,
          bannerType: post.bannerType,
          timelineEra: post.timelineEra,
          timelineLocation: post.timelineLocation,
          isKeyEvent: post.isKeyEvent,
          isLevel: post.isLevel,
          levelId: post.levelId ?? null,
        } satisfies GamePostData,
        slug: post.slug,
      }))

  const sorted = allPosts.sort((a, b) => {
    const dateA = new Date(a.data.published ?? 0)
    const dateB = new Date(b.data.published ?? 0)
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
