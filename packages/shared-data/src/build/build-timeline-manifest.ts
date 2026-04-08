import { toTimelineEvent } from '@merkin/shared-content'
import type { SharedTimelineEvent } from '@merkin/shared-content'
import type { SharedPostsManifest, SharedTimelineManifest } from '../types.ts'

function sortTimelineEvents(events: SharedTimelineEvent[]): SharedTimelineEvent[] {
  return [...events].sort((left, right) => {
    if (left.year !== right.year) return left.year - right.year
    return left.slug.localeCompare(right.slug)
  })
}

export function buildTimelineManifest(
  postsManifest: SharedPostsManifest,
  options: { includeBanners?: boolean } = {},
): SharedTimelineManifest {
  const items = postsManifest.items
    .map(post => toTimelineEvent(post, options))
    .filter((event): event is SharedTimelineEvent => event !== null)

  const sortedItems = sortTimelineEvents(items)

  return {
    generatedAt: new Date().toISOString(),
    sourceRoot: postsManifest.sourceRoot,
    count: sortedItems.length,
    items: sortedItems,
  }
}
