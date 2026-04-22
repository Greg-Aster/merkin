import type { SceneDefinition, SceneHistoryEntry } from './types'

export const BANNER_STAGE_HISTORY_COOKIE = 'megameal_banner_stage_history'

export interface SceneRotationOptions {
  cookie?: string
  cookieName?: string
  pagePath: string
  now?: Date
  historyLimit?: number
}

function readNamedCookie(
  cookieSource: string,
  cookieName: string,
): string | null {
  const prefix = `${cookieName}=`
  for (const part of cookieSource.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length)
    }
  }
  return null
}

export function parseSceneHistoryCookie(
  cookieSource = '',
  cookieName = BANNER_STAGE_HISTORY_COOKIE,
): SceneHistoryEntry[] {
  const rawValue = cookieSource.includes('=')
    ? readNamedCookie(cookieSource, cookieName)
    : cookieSource || null

  if (!rawValue) return []

  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue))
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is SceneHistoryEntry =>
        typeof entry?.sceneId === 'string' &&
        typeof entry?.shownAt === 'string',
    )
  } catch {
    return []
  }
}

export function serializeSceneHistoryCookie(
  entries: SceneHistoryEntry[],
  options: {
    cookieName?: string
    maxAgeDays?: number
    path?: string
  } = {},
) {
  const {
    cookieName = BANNER_STAGE_HISTORY_COOKIE,
    maxAgeDays = 365,
    path = '/',
  } = options

  const payload = encodeURIComponent(JSON.stringify(entries))
  const maxAge = Math.max(1, Math.floor(maxAgeDays * 24 * 60 * 60))
  return `${cookieName}=${payload}; Path=${path}; Max-Age=${maxAge}; SameSite=Lax`
}

export function recordSceneHistory(
  entries: SceneHistoryEntry[],
  sceneId: string,
  now = new Date(),
  historyLimit = 12,
) {
  const nextEntries = [
    { sceneId, shownAt: now.toISOString() },
    ...entries.filter(entry => entry.sceneId !== sceneId),
  ]

  return nextEntries.slice(0, historyLimit)
}

function matchesEligiblePage(pagePath: string, pattern: string) {
  if (!pattern || pattern === '*') return true
  if (pattern.endsWith('*')) {
    return pagePath.startsWith(pattern.slice(0, -1))
  }
  return pagePath === pattern
}

export function isSceneEligibleForPage(
  definition: SceneDefinition,
  pagePath: string,
) {
  const eligiblePages = definition.eligiblePages ?? []
  if (eligiblePages.length === 0) return true
  return eligiblePages.some(pattern => matchesEligiblePage(pagePath, pattern))
}

export function wasSceneShownWithinInterval(
  definition: SceneDefinition,
  entries: SceneHistoryEntry[],
  now = new Date(),
) {
  const minIntervalDays = definition.minIntervalDays ?? 0
  if (minIntervalDays <= 0) return false

  const priorEntry = entries.find(entry => entry.sceneId === definition.id)
  if (!priorEntry) return false

  const shownAt = new Date(priorEntry.shownAt)
  if (Number.isNaN(shownAt.getTime())) return false

  const elapsedMs = now.getTime() - shownAt.getTime()
  return elapsedMs < minIntervalDays * 24 * 60 * 60 * 1000
}

function weightedPick(definitions: SceneDefinition[]) {
  const totalWeight = definitions.reduce(
    (sum, definition) => sum + Math.max(0, definition.weight ?? 1),
    0,
  )

  if (totalWeight <= 0) return definitions[0] ?? null

  let cursor = Math.random() * totalWeight
  for (const definition of definitions) {
    cursor -= Math.max(0, definition.weight ?? 1)
    if (cursor <= 0) return definition
  }

  return definitions[definitions.length - 1] ?? null
}

export function chooseSceneFromRegistry(
  definitions: SceneDefinition[],
  options: SceneRotationOptions,
) {
  const {
    cookie = '',
    cookieName = BANNER_STAGE_HISTORY_COOKIE,
    pagePath,
    now = new Date(),
    historyLimit = 12,
  } = options

  const history = parseSceneHistoryCookie(cookie, cookieName)
  const pageEligible = definitions.filter(definition =>
    isSceneEligibleForPage(definition, pagePath),
  )

  const recentIds = new Set(
    history.slice(0, historyLimit).map(entry => entry.sceneId),
  )
  const freshPool = pageEligible.filter(
    definition =>
      !recentIds.has(definition.id) &&
      !wasSceneShownWithinInterval(definition, history, now),
  )
  const intervalPool = pageEligible.filter(
    definition => !wasSceneShownWithinInterval(definition, history, now),
  )

  const pool =
    freshPool.length > 0
      ? freshPool
      : intervalPool.length > 0
        ? intervalPool
        : pageEligible

  const selected = weightedPick(pool)

  return {
    selected,
    history,
    nextHistory: selected
      ? recordSceneHistory(history, selected.id, now, historyLimit)
      : history,
  }
}
