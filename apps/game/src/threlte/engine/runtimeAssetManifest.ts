export type RuntimeAssetQualityTier =
  | 'ultra_low'
  | 'low'
  | 'medium'
  | 'high'
  | 'ultra'

export interface RuntimeAssetVariant {
  url: string
  exists: boolean
  sizeBytes?: number
}

export interface RuntimeAssetManifestEntry {
  sourceUrl: string
  qualityVariants?: Partial<Record<'low' | 'medium' | 'high', RuntimeAssetVariant>>
}

export interface RuntimeAssetManifest {
  schemaVersion: number
  assets: Record<string, RuntimeAssetManifestEntry>
}

const manifestUrl = '/generated/runtime-game-assets/manifest.json'
const tierRank: Record<RuntimeAssetQualityTier, number> = {
  ultra_low: 0,
  low: 1,
  medium: 2,
  high: 3,
  ultra: 4,
}

let manifestPromise: Promise<RuntimeAssetManifest | null> | null = null
let runtimeAssetManifest: RuntimeAssetManifest | null = null
const resolvedUrlCache = new Map<string, string>()
const levelAssetTiers = new Map<string, RuntimeAssetQualityTier>()

function normalizeSourceUrl(sourceUrl: string) {
  return sourceUrl.startsWith('/') ? sourceUrl : `/${sourceUrl}`
}

function normalizeLevelId(levelId: string | null | undefined) {
  return String(levelId ?? '').trim().toLowerCase()
}

function normalizeTier(tier: RuntimeAssetQualityTier | string) {
  switch (tier) {
    case 'ultra_low':
    case 'low':
    case 'medium':
    case 'high':
    case 'ultra':
      return tier
    default:
      return 'medium'
  }
}

function clampTier(
  tier: RuntimeAssetQualityTier,
  maxTier: RuntimeAssetQualityTier | string | undefined,
) {
  if (!maxTier) return tier
  const normalizedMaxTier = normalizeTier(maxTier) as RuntimeAssetQualityTier
  return tierRank[tier] > tierRank[normalizedMaxTier] ? normalizedMaxTier : tier
}

function getTierPreference(qualityTier: RuntimeAssetQualityTier) {
  switch (qualityTier) {
    case 'ultra_low':
    case 'low':
      return ['low', 'medium', 'high'] as const
    case 'medium':
      return ['medium', 'high', 'low'] as const
    case 'high':
    case 'ultra':
      return ['high', 'medium', 'low'] as const
    default:
      return ['medium', 'high', 'low'] as const
  }
}

async function loadRuntimeAssetManifest() {
  if (runtimeAssetManifest) return runtimeAssetManifest
  if (typeof fetch !== 'function') return null

  if (!manifestPromise) {
    manifestPromise = fetch(manifestUrl)
      .then(async response => {
        if (!response.ok) return null
        runtimeAssetManifest = (await response.json()) as RuntimeAssetManifest
        return runtimeAssetManifest
      })
      .catch(() => null)
  }

  return manifestPromise
}

export async function preloadRuntimeAssetManifest() {
  return await loadRuntimeAssetManifest()
}

export function beginLevelRuntimeAssetScope(
  levelId: string,
  qualityTier: RuntimeAssetQualityTier | string,
  options: { maxTier?: RuntimeAssetQualityTier | string } = {},
) {
  const normalizedLevelId = normalizeLevelId(levelId)
  if (!normalizedLevelId) return
  const normalizedTier = normalizeTier(qualityTier) as RuntimeAssetQualityTier
  levelAssetTiers.set(
    normalizedLevelId,
    clampTier(normalizedTier, options.maxTier),
  )
}

export function endLevelRuntimeAssetScope(levelId: string) {
  const normalizedLevelId = normalizeLevelId(levelId)
  if (!normalizedLevelId) return
  levelAssetTiers.delete(normalizedLevelId)
}

export function getLevelRuntimeAssetTier(
  levelId: string | null | undefined,
  fallbackTier: RuntimeAssetQualityTier | string,
) {
  return (
    levelAssetTiers.get(normalizeLevelId(levelId)) ??
    (normalizeTier(fallbackTier) as RuntimeAssetQualityTier)
  )
}

function getCachedRuntimeAssetUrl(
  sourceUrl: string,
  qualityTier: RuntimeAssetQualityTier | string,
  options: { levelId?: string | null } = {},
) {
  const normalizedSourceUrl = normalizeSourceUrl(sourceUrl)
  const resolvedTier = getLevelRuntimeAssetTier(options.levelId, qualityTier)
  const cacheKey = `${resolvedTier}|${normalizedSourceUrl}`
  return {
    cacheKey,
    normalizedSourceUrl,
    resolvedTier,
    cached: resolvedUrlCache.get(cacheKey) ?? null,
  }
}

function resolveFromManifest(
  manifest: RuntimeAssetManifest | null,
  sourceUrl: string,
  qualityTier: RuntimeAssetQualityTier,
) {
  const entry = manifest?.assets?.[sourceUrl]
  if (!entry?.qualityVariants) {
    return sourceUrl
  }

  for (const tier of getTierPreference(qualityTier)) {
    const variant = entry.qualityVariants[tier]
    if (variant?.exists && variant.url) {
      return variant.url
    }
  }

  return sourceUrl
}

export function resolveRuntimeAssetUrlSync(
  sourceUrl: string,
  qualityTier: RuntimeAssetQualityTier | string,
  options: { levelId?: string | null } = {},
) {
  const { cacheKey, normalizedSourceUrl, resolvedTier, cached } =
    getCachedRuntimeAssetUrl(sourceUrl, qualityTier, options)
  if (cached) return cached
  if (!runtimeAssetManifest) return null

  const resolvedUrl = resolveFromManifest(
    runtimeAssetManifest,
    normalizedSourceUrl,
    resolvedTier,
  )
  resolvedUrlCache.set(cacheKey, resolvedUrl)
  return resolvedUrl
}

export async function resolveRuntimeAssetUrl(
  sourceUrl: string,
  qualityTier: RuntimeAssetQualityTier | string,
  options: { levelId?: string | null } = {},
) {
  const { cacheKey, normalizedSourceUrl, resolvedTier, cached } =
    getCachedRuntimeAssetUrl(sourceUrl, qualityTier, options)
  if (cached) return cached

  const manifest = await loadRuntimeAssetManifest()
  const resolvedUrl = resolveFromManifest(
    manifest,
    normalizedSourceUrl,
    resolvedTier,
  )
  resolvedUrlCache.set(cacheKey, resolvedUrl)
  return resolvedUrl
}
