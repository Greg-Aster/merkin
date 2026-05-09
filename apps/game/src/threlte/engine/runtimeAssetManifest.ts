export type RuntimeAssetQualityTier =
  | 'ultra_low'
  | 'low'
  | 'medium'
  | 'high'
  | 'ultra'

export interface RuntimeAssetVariant {
  url: string
  lodTier?: 'low' | 'medium' | 'high'
  lodIndex?: number
  lodRole?: 'near' | 'mid' | 'far'
  status?: 'required' | 'optional'
  required?: boolean
  exists: boolean
  sizeBytes?: number
  metadata?: RuntimeAssetMetadata
}

export interface RuntimeAssetTextureMetadata {
  index: number
  name?: string
  imageIndex: number | null
  mimeType: string
  width: number | null
  height: number | null
  byteLength: number | null
  roles: string[]
  colorSpace: 'srgb' | 'linear' | 'mixed' | 'unknown'
  compression: 'basisu' | 'webp' | 'none'
}

export interface RuntimeAssetMaterialPbrSlot {
  textureIndex: number | null
  hasTexture: boolean
  hasFactor: boolean
  state: 'texture' | 'factor' | 'default'
}

export interface RuntimeAssetMaterialMetadata {
  index: number
  name?: string
  alphaMode: 'OPAQUE' | 'MASK' | 'BLEND' | string
  doubleSided: boolean
  pbrSlots: {
    baseColor: RuntimeAssetMaterialPbrSlot
    metallicRoughness: RuntimeAssetMaterialPbrSlot
    normal: RuntimeAssetMaterialPbrSlot
    occlusion: RuntimeAssetMaterialPbrSlot
    emissive: RuntimeAssetMaterialPbrSlot
  }
  extensions: string[]
  unsupportedExtensions: string[]
}

export interface RuntimeAssetMetadata {
  format: 'glb' | 'gltf'
  valid: boolean
  errors: string[]
  nodeCount: number
  meshCount: number
  meshPrimitiveCount: number
  vertexCount: number
  triangleCount: number
  bounds: {
    min: [number, number, number]
    max: [number, number, number]
    size: [number, number, number]
    center: [number, number, number]
  } | null
  materialCount: number
  materialSlots: number
  materials: RuntimeAssetMaterialMetadata[]
  materialValidation: {
    missingTextureReferences: Array<{
      materialIndex: number
      materialName?: string
      slot: string
      textureIndex: number
    }>
    missingRecommendedSlots: Array<{
      materialIndex: number
      materialName?: string
      slot: string
      fallback: string
    }>
    unsupportedExtensions: Array<{
      materialIndex: number
      materialName?: string
      extension: string
    }>
  }
  textureCount: number
  imageCount: number
  textureBytes: number
  textures: RuntimeAssetTextureMetadata[]
  compression: {
    extensionsUsed: string[]
    geometry: {
      dracoPrimitiveCount: number
      meshoptAccessorCount: number
      quantized: boolean
    }
    textures: {
      basisuTextureCount: number
      webpTextureCount: number
      mimeTypes: Record<string, number>
    }
  }
}

export interface RuntimeAssetManifestEntry {
  sourceUrl: string
  status?: 'required' | 'optional'
  required?: boolean
  lod?: {
    strategy: 'mesh-simplification'
    sourceTier: 'source'
    defaultTier: 'medium'
    fallbackOrder: RuntimeAssetLodTier[]
    tiers: Array<{
      id: RuntimeAssetLodTier
      index: number
      role: 'near' | 'mid' | 'far'
      textureSize: number
      simplifyRatio: number
      simplifyError: number
    }>
  }
  impostor?: {
    generated: boolean
    strategy: 'bounds-billboard'
    sourceTier: RuntimeAssetLodTier
    textureSize: number
    bounds: RuntimeAssetMetadata['bounds']
    reason: string
  }
  metadata?: RuntimeAssetMetadata
  qualityVariants?: Partial<Record<'low' | 'medium' | 'high', RuntimeAssetVariant>>
}

export interface RuntimeAssetManifest {
  schemaVersion: number
  runtimeSelection?: {
    mode: 'adaptive'
    defaultTier: RuntimeAssetLodTier
    tiers: RuntimeAssetLodTier[]
    fallbackOrder: Record<RuntimeAssetLodTier, RuntimeAssetLodTier[]>
  }
  assets: Record<string, RuntimeAssetManifestEntry>
}

export type RuntimeAssetLodTier = 'low' | 'medium' | 'high'

const manifestUrl = '/generated/runtime-game-assets/manifest.json'
const tierRank: Record<RuntimeAssetQualityTier | RuntimeAssetLodTier, number> = {
  ultra_low: 0,
  low: 1,
  medium: 2,
  high: 3,
  ultra: 4,
}

let manifestPromise: Promise<RuntimeAssetManifest | null> | null = null
let runtimeAssetManifest: RuntimeAssetManifest | null = null
const resolvedUrlCache = new Map<string, string>()
const levelAssetTiers = new Map<string, RuntimeAssetLodTier>()

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

function getLodTierForQuality(qualityTier: RuntimeAssetQualityTier) {
  switch (qualityTier) {
    case 'ultra_low':
    case 'low':
      return 'low'
    case 'high':
    case 'ultra':
      return 'high'
    default:
      return 'medium'
  }
}

function clampTier(
  tier: RuntimeAssetLodTier,
  maxTier: RuntimeAssetQualityTier | string | undefined,
) {
  if (!maxTier) return tier
  const normalizedMaxTier = getLodTierForQuality(
    normalizeTier(maxTier) as RuntimeAssetQualityTier,
  )
  return tierRank[tier] > tierRank[normalizedMaxTier] ? normalizedMaxTier : tier
}

function getConnectionEffectiveType() {
  if (typeof navigator === 'undefined') return null
  return (navigator as any).connection?.effectiveType as string | undefined
}

function shouldConstrainRuntimeAssets() {
  if (typeof navigator === 'undefined') return false
  const connection = (navigator as any).connection
  if (connection?.saveData) return true
  if (['slow-2g', '2g', '3g'].includes(connection?.effectiveType)) return true
  const memory = (navigator as any).deviceMemory
  if (typeof memory === 'number' && memory <= 4) return true
  return navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4
}

export function selectRuntimeAssetLodTier(
  qualityTier: RuntimeAssetQualityTier | string,
  options: { maxTier?: RuntimeAssetQualityTier | string } = {},
): RuntimeAssetLodTier {
  const requestedTier = getLodTierForQuality(
    normalizeTier(qualityTier) as RuntimeAssetQualityTier,
  )
  const cappedTier = clampTier(requestedTier, options.maxTier)

  if (!shouldConstrainRuntimeAssets()) return cappedTier
  if (cappedTier === 'high') return clampTier('medium', options.maxTier)
  if (cappedTier === 'medium' && getConnectionEffectiveType() === '2g') {
    return 'low'
  }

  return cappedTier
}

function getTierPreference(qualityTier: RuntimeAssetLodTier) {
  switch (qualityTier) {
    case 'low':
      return ['low', 'medium', 'high'] as const
    case 'medium':
      return ['medium', 'high', 'low'] as const
    case 'high':
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
  levelAssetTiers.set(
    normalizedLevelId,
    selectRuntimeAssetLodTier(qualityTier, options),
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
    selectRuntimeAssetLodTier(fallbackTier)
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
  qualityTier: RuntimeAssetLodTier,
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
