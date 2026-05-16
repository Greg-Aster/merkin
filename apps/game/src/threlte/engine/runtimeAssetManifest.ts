import type { AssetLocalTransformMetadata } from './assetLocalTransform'

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
  pipeline?: {
    command: string
    compress: string
    textureCompress: string
    textureSize: number
    simplifyRatio: number
    simplifyError: number
    simplifyLockBorder: boolean
  }
  lodValidation?: {
    generator: string
    generated: boolean
    policy?: {
      schemaVersion: number
      minSourceTrianglesForRatioTarget: number
      ratioTolerance: number
      absoluteTriangleTolerance: number
    }
    sourceTriangleCount: number
    variantTriangleCount: number
    targetTriangleCount: number
    actualRatio: number | null
    targetRatio: number
    triangleOverage?: number
    ratioOverage?: number | null
    exemptionReason?:
      | 'source-below-min-triangle-policy'
      | 'absolute-triangle-tolerance'
      | 'ratio-tolerance'
      | null
    meetsTarget: boolean
    monotonicOrder: RuntimeAssetLodTier[]
  }
}

export interface RuntimeAssetImportMetadata {
  schemaVersion: number
  id: string
  familyId: string | null
  sourceUrl: string
  sourcePath: string
  sourceRoot: string | null
  sourceKind:
    | 'render-source'
    | 'prefab-bake-source'
    | 'third-party-render-source'
    | string
  authoringTool: string | null
  sourceNote: string | null
  license: string | null
  owner: string | null
  status: string | null
  intendedLevels: string[]
  materialPolicy: Record<string, unknown> | null
  collisionPolicy: Record<string, unknown> | null
  targetBudgets: {
    maxSourceBytes?: number
    maxRuntimeVariantBytes?: number
    maxTextureSize?: number
    defaultTier?: RuntimeAssetLodTier | string
  } | null
  naming: Record<string, unknown> | null
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

export interface RuntimeAssetFingerprint {
  algorithm?: 'sha256' | string
  value?: string
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
  pbrFactors: {
    baseColorFactor: [number, number, number, number]
    metallicFactor: number
    roughnessFactor: number
    emissiveFactor: [number, number, number]
    hasExplicitMetallicFactor: boolean
    hasExplicitRoughnessFactor: boolean
    hasMetallicRoughnessTexture: boolean
  }
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
  geometryValidation: {
    missingPositionPrimitiveCount: number
    missingNormalPrimitiveCount: number
    missingTexcoordPrimitiveCount: number
  }
  assetLocalTransform?: AssetLocalTransformMetadata | null
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
  unusedTextureCount?: number
  unusedImageCount?: number
  unusedTextureBytes?: number
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

export interface RuntimeStyleBakeProvenance {
  schemaVersion: 1
  status:
    | 'clean'
    | 'missing-generated-asset'
    | 'missing-generated-metadata'
    | 'missing-source-asset'
    | 'stale-source'
    | 'stale-settings'
    | 'not-cooked'
    | 'over-budget'
  runtimeCookRequired: boolean
  runtimeCooked: boolean
  metadataUrl: string
  sourceAssetUrl?: string
  generatedAssetUrl: string
  sourceAssetFingerprint?: RuntimeAssetFingerprint | null
  currentSourceAssetFingerprint?: RuntimeAssetFingerprint | null
  sourceAssetFingerprintMatches?: boolean | null
  styleSettings?: {
    profileId?: string | null
    styleProfileName?: string | null
    prompt?: string | null
    negativePrompt?: string | null
    textureSize?: number | null
    aoStrength?: number | null
    cavityStrength?: number | null
    curvatureStrength?: number | null
    lineStrength?: number | null
    brushStrength?: number | null
    geometrySimplification?: number | null
    outputTier?: string | null
    bevelCleanup?: boolean | null
    weightedNormalCleanup?: boolean | null
    lineGeometry?: boolean | null
    mode?: string | null
    backend?: string | null
    shapeModel?: string | null
    paintModel?: string | null
    referenceImageUrl?: string | null
  } | null
  styleSettingsFingerprint?: RuntimeAssetFingerprint | null
  expectedStyleSettingsFingerprint?: RuntimeAssetFingerprint | null
  styleSettingsFingerprintMatches?: boolean | null
  budget?: {
    selectedTier?: RuntimeAssetLodTier
    maxTextureSize?: number | null
    maxTextureCount?: number | null
    textureCount?: number | null
    oversizedTextures?: number
    unusedTextureCount?: number
    overBudget?: boolean
  }
  diagnostics?: string[]
}

export interface RuntimeAssetManifestEntry {
  sourceUrl: string
  status?: 'required' | 'optional'
  required?: boolean
  sourceExists?: boolean
  sourceSizeBytes?: number
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
      simplifyLockBorder: boolean
    }>
  }
  impostor?: {
    generated: boolean
    strategy: 'bounds-billboard'
    sourceTier: RuntimeAssetLodTier
    textureSize: number
    bounds: RuntimeAssetMetadata['bounds']
    atlas: {
      imageUrl: string
      manifestUrl: string
      index: number
      cell: { x: number; y: number; width: number; height: number }
      uv: { u0: number; v0: number; u1: number; v1: number }
      billboardRect: { x: number; y: number; width: number; height: number }
    } | null
    reason: string
  }
  materialCompliance?: {
    policy: 'pbr-slots-required-with-approved-exceptions'
    approvedMissingRecommendedSlots: Array<{
      scope: string
      materialIndex: number
      materialName?: string
      slot: string
      fallback: string
      reason: string
    }>
  }
  importMetadata?: RuntimeAssetImportMetadata | null
  styleBake?: RuntimeStyleBakeProvenance | null
  metadata?: RuntimeAssetMetadata
  qualityVariants?: Partial<
    Record<'low' | 'medium' | 'high', RuntimeAssetVariant>
  >
}

export interface RuntimeAssetManifest {
  schemaVersion: number
  contentBuild?: {
    schemaVersion: number
    buildId: string
    generatedAt: string
    builder: {
      name: string
      command: string
    }
    git: {
      branch: string | null
      commit: string | null
      dirty: boolean
    }
    fingerprint: string
    rollback: {
      strategy: 'single-previous-manifest'
      currentManifestUrl: string
      previousManifestUrl: string
    }
  }
  importManifest?: {
    schemaVersion: number
    path: string
    namingConventions?: Record<string, string> | null
    familyCount: number
    explicitAssetCount: number
  }
  importValidation?: {
    failures: string[]
    warnings: string[]
    report: {
      importManifestPath: string
      missingImportManifest: number
      metadataAssetCount: number
      missingImportMetadata: number
      duplicateAssetIds: number
      missingOwner: number
      missingImportStatus: number
      missingMaterialProvenance: number
      missingCollisionPairing: number
      oversizedTextures: number
    }
  }
  runtimeSelection?: {
    mode: 'adaptive'
    defaultTier: RuntimeAssetLodTier
    tiers: RuntimeAssetLodTier[]
    fallbackOrder: Record<RuntimeAssetLodTier, RuntimeAssetLodTier[]>
  }
  streamingPolicy?: {
    strategy: 'required-gate-active-cell-prefetch-lru'
    prefetch: {
      maxConcurrent: number
      maxAssetsPerBatch: number
    }
    unload: {
      maxUnusedAgeMs: number
      maxUnreferencedEntries: number
      maxUnreferencedBytes: number
    }
    memoryPressure: {
      highDeviceMemoryGb: number
      mediumDeviceMemoryGb: number
      highMaxUnreferencedBytes: number
      mediumMaxUnreferencedBytes: number
    }
  }
  platformCertification?: {
    schemaVersion: number
    defaultProfile: 'mobile' | 'desktop' | 'tv'
    profiles: Record<
      'mobile' | 'desktop' | 'tv',
      {
        targetFps: number
        defaultTier: RuntimeAssetLodTier
        maxRuntimeAssetBytes: number
        maxRuntimeAssetFileBytes: number
        maxCombinedTriangles: number
        maxCombinedDrawCalls: number
        maxCombinedMaterialSlots: number
        maxCombinedTextureBytes: number
      }
    >
  }
  impostorAtlas?: {
    schemaVersion: number
    strategy: 'bounds-billboard-atlas'
    generatedAt: string
    imageUrl: string
    manifestUrl: string
    tileSize: number
    imageSize: { width: number; height: number }
    columns: number
    rows: number
    entryCount: number
    entries: Array<{
      sourceUrl: string
      index: number
      color: string
      cell: { x: number; y: number; width: number; height: number }
      uv: { u0: number; v0: number; u1: number; v1: number }
      billboardRect: { x: number; y: number; width: number; height: number }
      bounds: RuntimeAssetMetadata['bounds']
    }>
  }
  assets: Record<string, RuntimeAssetManifestEntry>
}

export type RuntimeAssetLodTier = 'low' | 'medium' | 'high'

const manifestUrl = '/generated/runtime-game-assets/manifest.json'
const tierRank: Record<RuntimeAssetQualityTier | RuntimeAssetLodTier, number> =
  {
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

declare global {
  interface Window {
    __gameRuntimeProfile?: {
      id?: string | null
      targetClass?: string | null
      platformProfile?: string | null
      expectedRuntimeTier?: string | null
      runtimeAssetTier?: string | null
    }
  }
}

export interface RuntimeAssetResolution {
  sourceUrl: string
  resolvedUrl: string
  tier: RuntimeAssetLodTier
  status: 'required' | 'optional'
  required: boolean
  sizeBytes: number
}

function normalizeSourceUrl(sourceUrl: string) {
  return sourceUrl.startsWith('/') ? sourceUrl : `/${sourceUrl}`
}

function normalizeLevelId(levelId: string | null | undefined) {
  return String(levelId ?? '')
    .trim()
    .toLowerCase()
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

function normalizeLodTier(tier: string | null | undefined) {
  switch (tier) {
    case 'low':
    case 'medium':
    case 'high':
      return tier
    default:
      return null
  }
}

function normalizeRuntimeQualityTier(tier: string | null | undefined) {
  switch (tier) {
    case 'ultra_low':
    case 'low':
    case 'medium':
    case 'high':
    case 'ultra':
      return tier
    default:
      return null
  }
}

export function getRuntimeProfileAssetTierForProfile(
  profile: Window['__gameRuntimeProfile'] | null | undefined,
) {
  if (!profile) return null

  const explicitTier = normalizeLodTier(profile?.runtimeAssetTier)
  if (explicitTier) return explicitTier

  const expectedTier = normalizeRuntimeQualityTier(profile?.expectedRuntimeTier)
  if (expectedTier) {
    return getLodTierForQuality(expectedTier)
  }

  switch (profile?.platformProfile) {
    case 'mobile':
      return 'low'
    case 'desktop':
      return 'high'
    case 'tv':
      return 'medium'
    default:
      break
  }

  if (profile?.targetClass?.startsWith('mobile-low')) return 'low'
  if (profile?.targetClass?.startsWith('desktop-high')) return 'high'
  if (profile?.targetClass?.startsWith('tv-medium')) return 'medium'

  return null
}

function getRuntimeProfileAssetTier() {
  if (typeof window === 'undefined') return null
  return getRuntimeProfileAssetTierForProfile(window.__gameRuntimeProfile)
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
  const profileTier = getRuntimeProfileAssetTier()
  const requestedTier =
    profileTier ??
    getLodTierForQuality(normalizeTier(qualityTier) as RuntimeAssetQualityTier)
  const cappedTier = clampTier(requestedTier, options.maxTier)

  if (profileTier) return cappedTier
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

function resolveVariantFromManifest(
  manifest: RuntimeAssetManifest | null,
  sourceUrl: string,
  qualityTier: RuntimeAssetLodTier,
) {
  const entry = manifest?.assets?.[sourceUrl]
  if (!entry?.qualityVariants) {
    return {
      entry,
      variant: null,
      tier: qualityTier,
      url: sourceUrl,
      sizeBytes: entry?.metadata?.textureBytes ?? 0,
    }
  }

  for (const tier of getTierPreference(qualityTier)) {
    const variant = entry.qualityVariants[tier]
    if (variant?.exists && variant.url) {
      return {
        entry,
        variant,
        tier,
        url: variant.url,
        sizeBytes: variant.sizeBytes ?? 0,
      }
    }
  }

  return {
    entry,
    variant: null,
    tier: qualityTier,
    url: sourceUrl,
    sizeBytes: entry?.metadata?.textureBytes ?? 0,
  }
}

function resolveFromManifest(
  manifest: RuntimeAssetManifest | null,
  sourceUrl: string,
  qualityTier: RuntimeAssetLodTier,
) {
  return resolveVariantFromManifest(manifest, sourceUrl, qualityTier).url
}

function createRuntimeAssetResolution(
  manifest: RuntimeAssetManifest | null,
  sourceUrl: string,
  qualityTier: RuntimeAssetLodTier,
): RuntimeAssetResolution {
  const normalizedSourceUrl = normalizeSourceUrl(sourceUrl)
  const resolved = resolveVariantFromManifest(
    manifest,
    normalizedSourceUrl,
    qualityTier,
  )
  const status = resolved.entry?.status === 'required' ? 'required' : 'optional'

  return {
    sourceUrl: normalizedSourceUrl,
    resolvedUrl: resolved.url,
    tier: resolved.tier,
    status,
    required: status === 'required' || resolved.entry?.required === true,
    sizeBytes: resolved.sizeBytes,
  }
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

export function resolveRuntimeAssetInfoSync(
  sourceUrl: string,
  qualityTier: RuntimeAssetQualityTier | string,
  options: { levelId?: string | null } = {},
) {
  const { normalizedSourceUrl, resolvedTier } = getCachedRuntimeAssetUrl(
    sourceUrl,
    qualityTier,
    options,
  )
  if (!runtimeAssetManifest) return null

  return createRuntimeAssetResolution(
    runtimeAssetManifest,
    normalizedSourceUrl,
    resolvedTier,
  )
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

export async function resolveRuntimeAssetInfo(
  sourceUrl: string,
  qualityTier: RuntimeAssetQualityTier | string,
  options: { levelId?: string | null } = {},
) {
  const { normalizedSourceUrl, resolvedTier } = getCachedRuntimeAssetUrl(
    sourceUrl,
    qualityTier,
    options,
  )
  const manifest = await loadRuntimeAssetManifest()
  return createRuntimeAssetResolution(
    manifest,
    normalizedSourceUrl,
    resolvedTier,
  )
}
