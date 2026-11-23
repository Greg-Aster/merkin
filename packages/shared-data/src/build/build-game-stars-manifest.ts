import type { SharedGameStar, SharedGameStarsManifest, SharedTimelineManifest } from '../types.ts'

function sortGameStars(items: SharedGameStar[]): SharedGameStar[] {
  return [...items].sort((left, right) => {
    if (left.year !== right.year) return left.year - right.year
    return left.slug.localeCompare(right.slug)
  })
}

export function buildGameStarsManifest(
  timelineManifest: SharedTimelineManifest,
): SharedGameStarsManifest {
  const items = sortGameStars(
    timelineManifest.items.map(event => ({
      ...event,
      uniqueId: event.slug,
    })),
  )

  return {
    count: items.length,
    items,
  }
}
