import { DEFAULT_LEVEL_ID } from '../levels/levelRegistry'
import type { StarData } from '../stores/gameStateStore'

export type ActiveLevelNote = {
  title: string
  author: string
  location: string
  excerpt: string
  body: string
}

export type PendingLevelReturn = {
  levelType: string
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
}

export function extractSelectedStar(detail: any): StarData | null {
  if (!detail) return null

  const baseStar = detail.star ?? detail.eventData ?? detail
  if (!baseStar) return null

  const mergedScreenPosition = {
    ...(baseStar.screenPosition ?? {}),
    ...(detail.screenPosition ?? {}),
  }

  return {
    ...baseStar,
    screenPosition:
      Object.keys(mergedScreenPosition).length > 0
        ? mergedScreenPosition
        : undefined,
  }
}

export function createTimelineEventFromStar(star: StarData | null) {
  if (!star) return null

  return {
    id: star.uniqueId,
    title: star.title,
    description: star.description,
    slug: star.slug,
    year: star.timelineYear,
    era: star.timelineEra,
    location: star.timelineLocation,
    isKeyEvent: star.isKeyEvent,
    isLevel: star.isLevel,
    levelId: star.levelId,
    tags: star.tags,
    category: star.category,
    unlocked: true,
    screenPosition: star.screenPosition,
  }
}

export function createPendingLevelReturn(
  detail: {
    levelType?: string
    title?: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
  } = {},
): PendingLevelReturn {
  return {
    levelType: detail.levelType || DEFAULT_LEVEL_ID,
    title: detail.title || 'Return to Observatory?',
    message:
      detail.message || 'Leave this level and travel back to the observatory?',
    confirmLabel: detail.confirmLabel || 'Return',
    cancelLabel: detail.cancelLabel || 'Cancel',
  }
}
