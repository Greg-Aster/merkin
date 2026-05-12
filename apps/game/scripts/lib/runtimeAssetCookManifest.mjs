import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  createAuthoringSceneSourceContext,
  getAuthoringSceneSourceMetadata,
  readDeployedAuthoringScenes,
} from './authoringSceneSource.mjs'
import { readGltfAssetMetadata } from './gltfAssetMetadata.mjs'
import {
  readRuntimeAssetImportManifest,
  resolveRuntimeAssetImportMetadata,
  validateRuntimeAssetImports,
} from './runtimeAssetImportManifest.mjs'
import {
  adaptSceneDocumentToLevelDefinition,
  createLevelBuildReport,
  createRuntimeSceneManifest,
  getRuntimePrefabAssetUrl,
  normalizeRuntimeLevelSceneSettings,
} from './runtimeSceneManifest.mjs'

const impostorAtlasTileSize = 256
const impostorAtlasImageUrl =
  '/generated/runtime-game-assets/impostors/bounds-billboard-atlas.svg'
const impostorAtlasManifestUrl =
  '/generated/runtime-game-assets/impostors/bounds-billboard-atlas.json'
const runtimeAssetPublicRoot = 'generated/runtime-game-assets/'
const runtimeAssetStreamingPolicy = {
  strategy: 'required-gate-active-cell-prefetch-lru',
  prefetch: {
    maxConcurrent: 2,
    maxAssetsPerBatch: 12,
  },
  unload: {
    maxUnusedAgeMs: 8000,
    maxUnreferencedEntries: 4,
    maxUnreferencedBytes: 128 * 1024 * 1024,
  },
  memoryPressure: {
    highDeviceMemoryGb: 4,
    mediumDeviceMemoryGb: 8,
    highMaxUnreferencedBytes: 32 * 1024 * 1024,
    mediumMaxUnreferencedBytes: 64 * 1024 * 1024,
  },
}
const lodValidationPolicy = {
  schemaVersion: 1,
  minSourceTrianglesForRatioTarget: 500,
  ratioTolerance: 0.005,
  absoluteTriangleTolerance: 64,
}
const platformCertificationProfiles = {
  schemaVersion: 1,
  defaultProfile: 'desktop',
  profiles: {
    mobile: {
      targetFps: 30,
      defaultTier: 'low',
      maxRuntimeAssetBytes: 64 * 1024 * 1024,
      maxRuntimeAssetFileBytes: 12 * 1024 * 1024,
      maxCombinedTriangles: 300_000,
      maxCombinedDrawCalls: 260,
      maxCombinedMaterialSlots: 180,
      maxCombinedTextureBytes: 96 * 1024 * 1024,
    },
    desktop: {
      targetFps: 60,
      defaultTier: 'high',
      maxRuntimeAssetBytes: 160 * 1024 * 1024,
      maxRuntimeAssetFileBytes: 40 * 1024 * 1024,
      maxCombinedTriangles: 900_000,
      maxCombinedDrawCalls: 420,
      maxCombinedMaterialSlots: 260,
      maxCombinedTextureBytes: 256 * 1024 * 1024,
    },
    tv: {
      targetFps: 30,
      defaultTier: 'medium',
      maxRuntimeAssetBytes: 96 * 1024 * 1024,
      maxRuntimeAssetFileBytes: 24 * 1024 * 1024,
      maxCombinedTriangles: 475_000,
      maxCombinedDrawCalls: 320,
      maxCombinedMaterialSlots: 220,
      maxCombinedTextureBytes: 160 * 1024 * 1024,
    },
  },
}

export const tierConfigs = [
  {
    id: 'high',
    lodIndex: 0,
    role: 'near',
    simplifyRatio: 0.82,
    simplifyError: 0.002,
    simplifyLockBorder: false,
    textureSize: 2048,
  },
  {
    id: 'medium',
    lodIndex: 1,
    role: 'mid',
    simplifyRatio: 0.52,
    simplifyError: 0.005,
    simplifyLockBorder: false,
    textureSize: 1024,
  },
  {
    id: 'low',
    lodIndex: 2,
    role: 'far',
    simplifyRatio: 0.28,
    simplifyError: 0.01,
    simplifyLockBorder: false,
    textureSize: 512,
  },
]

const yggdrasilWorldTreeSourceUrl =
  '/generated/hunyuan3d/yggdrasil-world-tree-merged-2026-04-25t02-07-36-925z/yggdrasil-world-tree-merged-2026-04-25t02-07-36-925z-generated-2026-04-25T02-24-40-321Z.glb'
const anomalyClusterSourceUrls = [
  '/generated/runtime-game-assets/prefabs/anomaly-cluster/anomaly-cluster-cyan.glb',
  '/generated/runtime-game-assets/prefabs/anomaly-cluster/anomaly-cluster-green.glb',
  '/generated/runtime-game-assets/prefabs/anomaly-cluster/anomaly-cluster-magenta.glb',
  '/generated/runtime-game-assets/prefabs/anomaly-cluster/anomaly-cluster-rose.glb',
]
const lodValidationExceptions = new Map(
  anomalyClusterSourceUrls.map(sourceUrl => [
    sourceUrl,
    {
      high: 'animation-ready-small-prefab-high-tier-preserves-authored-source-topology',
    },
  ]),
)

const assetCookTierOverrides = new Map([
  [
    yggdrasilWorldTreeSourceUrl,
    {
      high: {
        simplifyError: 0.006,
        recipe: 'hero-tree-source-retopology-high',
      },
      medium: {
        simplifyError: 0.006,
        recipe: 'hero-tree-source-retopology-medium',
      },
      low: {
        simplifyRatio: 0.1,
        simplifyError: 1,
        recipe: 'hero-tree-source-retopology-low',
        retopology: {
          strategy: 'largest-triangle-area-prune',
          maxTriangles: 14000,
        },
      },
    },
  ],
])

export function getAssetCookTierConfig(sourceUrl, tier) {
  const override = assetCookTierOverrides.get(normalizePublicUrl(sourceUrl))?.[
    tier.id
  ]
  return override ? { ...tier, ...override } : tier
}

export function formatBytes(bytes) {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`
}

export function normalizePublicUrl(url) {
  return url.startsWith('/') ? url : `/${url}`
}

export function createRuntimeAssetCookContext({
  appRoot,
  repoRoot = join(appRoot, '..', '..'),
  publicRoot = join(repoRoot, 'apps/megameal/public'),
  sceneDir = join(appRoot, 'src/threlte/editor/scenes'),
  cookedRoot = join(publicRoot, 'generated/runtime-game-assets'),
} = {}) {
  if (!appRoot) {
    throw new Error('appRoot is required for runtime asset cooking')
  }

  return {
    appRoot,
    repoRoot,
    publicRoot,
    sceneDir,
    cookedRoot,
    manifestPath: join(cookedRoot, 'manifest.json'),
    importManifestPath: join(appRoot, 'authoring/assets/import-manifest.json'),
    runtimeSceneRoot: join(cookedRoot, 'scenes'),
  }
}

export function resolvePublicPath(context, url) {
  return join(context.publicRoot, normalizePublicUrl(url).replace(/^\//, ''))
}

export function getCookedPublicUrl(sourceUrl, tier) {
  let relativeSource = normalizePublicUrl(sourceUrl)
    .replace(/^\//, '')
    .replace(/\.(glb|gltf)$/i, '')
  if (relativeSource.startsWith(runtimeAssetPublicRoot)) {
    relativeSource = relativeSource.slice(runtimeAssetPublicRoot.length)
  }
  return `/generated/runtime-game-assets/${relativeSource}.${tier}.glb`
}

function round(value, places = 4) {
  const scale = 10 ** places
  return Math.round(value * scale) / scale
}

function hashString(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function getGitValue(context, args) {
  try {
    return execFileSync('git', args, {
      cwd: context.repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

function getGitMetadata(context) {
  const dirty = Boolean(getGitValue(context, ['status', '--porcelain']))
  return {
    branch: getGitValue(context, ['rev-parse', '--abbrev-ref', 'HEAD']) || null,
    commit: getGitValue(context, ['rev-parse', 'HEAD']) || null,
    dirty,
  }
}

function createContentBuildFingerprint({ entries, runtimeScenes }) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        assets: Object.values(entries)
          .map(entry => ({
            sourceUrl: entry.sourceUrl,
            sourceSizeBytes: entry.sourceSizeBytes,
            required: entry.required,
            importMetadata: entry.importMetadata ?? null,
            variants: Object.fromEntries(
              Object.entries(entry.qualityVariants ?? {}).map(
                ([tier, variant]) => [
                  tier,
                  {
                    exists: variant.exists,
                    sizeBytes: variant.sizeBytes,
                    triangleCount: variant.metadata?.triangleCount ?? null,
                  },
                ],
              ),
            ),
          }))
          .sort((left, right) => left.sourceUrl.localeCompare(right.sourceUrl)),
        scenes: runtimeScenes
          .map(entry => ({
            levelId: entry.manifest.levelId,
            version: entry.manifest.levelDefinition.version,
            actorCount: entry.manifest.buildReport.actorCount,
            runtimeAssetUrls: entry.manifest.runtime.runtimeAssetUrls,
          }))
          .sort((left, right) => left.levelId.localeCompare(right.levelId)),
      }),
    )
    .digest('hex')
}

function getPreviousGeneratedAtForFingerprint(context, fingerprint) {
  if (!existsSync(context.manifestPath)) return null

  try {
    const previousManifest = JSON.parse(
      readFileSync(context.manifestPath, 'utf8'),
    )
    return previousManifest.contentBuild?.fingerprint === fingerprint
      ? previousManifest.contentBuild.generatedAt ??
          previousManifest.generatedAt ??
          null
      : null
  } catch {
    return null
  }
}

function createContentBuildProvenance({
  context,
  requestedGeneratedAt,
  fingerprint,
}) {
  const generatedAt =
    getPreviousGeneratedAtForFingerprint(context, fingerprint) ??
    requestedGeneratedAt

  return {
    schemaVersion: 1,
    buildId: `runtime-assets-${generatedAt.replace(/[:.]/g, '-')}-${fingerprint.slice(0, 12)}`,
    generatedAt,
    builder: {
      name: 'cook-runtime-assets',
      command: 'pnpm --dir apps/game cook:runtime-assets',
    },
    git: getGitMetadata(context),
    fingerprint,
    rollback: {
      strategy: 'single-previous-manifest',
      currentManifestUrl: '/generated/runtime-game-assets/manifest.json',
      previousManifestUrl:
        '/generated/runtime-game-assets/manifest.previous.json',
    },
  }
}

function getAtlasColor(sourceUrl) {
  const hash = hashString(sourceUrl)
  const hue = hash % 360
  const saturation = 48 + (hash % 28)
  const lightness = 42 + (hash % 18)
  return `hsl(${hue} ${saturation}% ${lightness}%)`
}

function getBoundsBillboardRect(bounds) {
  const [width, height] = bounds?.size ?? [1, 1, 1]
  const safeWidth = Math.max(0.001, Math.abs(width))
  const safeHeight = Math.max(0.001, Math.abs(height))
  const maxContentSize = impostorAtlasTileSize * 0.76
  const scale = Math.min(
    maxContentSize / safeWidth,
    maxContentSize / safeHeight,
  )
  const rectWidth = Math.max(8, safeWidth * scale)
  const rectHeight = Math.max(8, safeHeight * scale)

  return {
    x: round((impostorAtlasTileSize - rectWidth) / 2, 2),
    y: round((impostorAtlasTileSize - rectHeight) / 2, 2),
    width: round(rectWidth, 2),
    height: round(rectHeight, 2),
  }
}

function createImpostorAtlas(entries, generatedAt) {
  const atlasEntries = Object.entries(entries)
    .filter(([, entry]) => entry.metadata?.bounds)
    .sort(([left], [right]) => left.localeCompare(right))

  if (atlasEntries.length === 0) return null

  const columns = Math.max(1, Math.ceil(Math.sqrt(atlasEntries.length)))
  const rows = Math.ceil(atlasEntries.length / columns)
  const imageSize = {
    width: columns * impostorAtlasTileSize,
    height: rows * impostorAtlasTileSize,
  }

  return {
    schemaVersion: 1,
    strategy: 'bounds-billboard-atlas',
    generatedAt,
    imageUrl: impostorAtlasImageUrl,
    manifestUrl: impostorAtlasManifestUrl,
    tileSize: impostorAtlasTileSize,
    imageSize,
    columns,
    rows,
    entryCount: atlasEntries.length,
    entries: atlasEntries.map(([sourceUrl, entry], index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const x = column * impostorAtlasTileSize
      const y = row * impostorAtlasTileSize

      return {
        sourceUrl,
        index,
        color: getAtlasColor(sourceUrl),
        cell: {
          x,
          y,
          width: impostorAtlasTileSize,
          height: impostorAtlasTileSize,
        },
        uv: {
          u0: round(x / imageSize.width),
          v0: round(y / imageSize.height),
          u1: round((x + impostorAtlasTileSize) / imageSize.width),
          v1: round((y + impostorAtlasTileSize) / imageSize.height),
        },
        billboardRect: getBoundsBillboardRect(entry.metadata.bounds),
        bounds: entry.metadata.bounds,
      }
    }),
  }
}

export function createImpostorAtlasSvg(atlas) {
  if (!atlas) return ''

  const tiles = atlas.entries
    .map(entry => {
      const { cell, billboardRect } = entry
      const label = entry.sourceUrl
        .split('/')
        .filter(Boolean)
        .slice(-2)
        .join('/')
      return [
        `<g transform="translate(${cell.x} ${cell.y})">`,
        `<rect width="${cell.width}" height="${cell.height}" fill="#090b10"/>`,
        `<rect x="0.5" y="0.5" width="${cell.width - 1}" height="${cell.height - 1}" fill="none" stroke="#263240"/>`,
        `<rect x="${billboardRect.x}" y="${billboardRect.y}" width="${billboardRect.width}" height="${billboardRect.height}" rx="2" fill="${entry.color}" opacity="0.82"/>`,
        `<line x1="${cell.width / 2}" y1="${billboardRect.y}" x2="${cell.width / 2}" y2="${billboardRect.y + billboardRect.height}" stroke="#ffffff" opacity="0.2"/>`,
        `<text x="10" y="${cell.height - 12}" fill="#d8e5f2" font-family="monospace" font-size="9">${label}</text>`,
        '</g>',
      ].join('')
    })
    .join('')

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${atlas.imageSize.width}" height="${atlas.imageSize.height}" viewBox="0 0 ${atlas.imageSize.width} ${atlas.imageSize.height}">`,
    '<rect width="100%" height="100%" fill="#05070a"/>',
    tiles,
    '</svg>',
  ].join('\n')
}

function collectSceneAssets(context) {
  const byUrl = new Map()
  const authoringScenes = readDeployedAuthoringScenes(
    createAuthoringSceneSourceContext(context),
  )

  for (const authoringScene of authoringScenes) {
    const levelId = authoringScene.document.levelId ?? authoringScene.levelId
    const nodes = authoringScene.document.nodes
    for (const node of nodes) {
      const url =
        node.asset?.url ??
        getRuntimePrefabAssetUrl(node.prefab?.type, node.prefab?.variant)
      if (typeof url !== 'string' || !/\.(glb|gltf)$/i.test(url)) continue

      const normalizedUrl = normalizePublicUrl(url)
      const entry = byUrl.get(normalizedUrl) ?? {
        sourceUrl: normalizedUrl,
        scenes: new Map(),
      }

      const sceneNodeIds = entry.scenes.get(levelId) ?? []
      sceneNodeIds.push(node.id)
      entry.scenes.set(levelId, sceneNodeIds)
      byUrl.set(normalizedUrl, entry)
    }
  }

  return [...byUrl.values()].sort((a, b) =>
    a.sourceUrl.localeCompare(b.sourceUrl),
  )
}

function getRuntimeSceneManifestPublicUrl(levelId) {
  return `/generated/runtime-game-assets/scenes/${levelId}.runtime-scene.json`
}

function getWorldPartitionPublicUrl(levelId) {
  return `/runtime-world-partitions/${levelId}.partition.json`
}

async function buildRuntimeSceneManifests(
  context,
  generatedAt = new Date().toISOString(),
) {
  const manifests = []
  const authoringScenes = readDeployedAuthoringScenes(
    createAuthoringSceneSourceContext(context),
  )

  for (const authoringScene of authoringScenes) {
    const normalizedScene = {
      ...authoringScene.document,
      settings: normalizeRuntimeLevelSceneSettings(
        authoringScene.levelId,
        authoringScene.document.settings,
      ),
    }
    const levelDefinition = adaptSceneDocumentToLevelDefinition(normalizedScene)
    const buildReport = createLevelBuildReport(levelDefinition)
    const worldPartitionUrl = getWorldPartitionPublicUrl(authoringScene.levelId)
    const worldPartitionPath = resolvePublicPath(context, worldPartitionUrl)

    manifests.push({
      outputUrl: getRuntimeSceneManifestPublicUrl(authoringScene.levelId),
      outputPath: resolvePublicPath(
        context,
        getRuntimeSceneManifestPublicUrl(authoringScene.levelId),
      ),
      manifest: createRuntimeSceneManifest({
        scene: normalizedScene,
        sceneId: authoringScene.sceneId,
        sourcePath: authoringScene.sourceRelativePath,
        levelDefinition,
        buildReport,
        generatedAt,
        worldPartitionUrl: existsSync(worldPartitionPath)
          ? worldPartitionUrl
          : undefined,
      }),
    })
  }

  return manifests
}

function getAssetRuntimeUsage(asset, runtimeScenes) {
  const requiredBySceneIds = new Set(
    runtimeScenes
      .filter(entry =>
        entry.manifest.runtime.requiredAssetUrls.includes(asset.sourceUrl),
      )
      .map(entry => entry.manifest.levelId),
  )

  return {
    status: requiredBySceneIds.size > 0 ? 'required' : 'optional',
    required: requiredBySceneIds.size > 0,
    scenes: [...asset.scenes.entries()].map(([sceneId, nodeIds]) => ({
      sceneId,
      nodeIds: [...new Set(nodeIds)].sort(),
      status: requiredBySceneIds.has(sceneId) ? 'required' : 'optional',
    })),
  }
}

function getLodValidation({
  sourceUrl,
  sourceMetadata,
  variantMetadata,
  tier,
}) {
  const sourceTriangles = sourceMetadata?.triangleCount ?? 0
  const variantTriangles = variantMetadata?.triangleCount ?? 0
  const targetTriangleCount = sourceTriangles
    ? Math.ceil(sourceTriangles * tier.simplifyRatio)
    : 0
  const actualRatio =
    sourceTriangles > 0 ? round(variantTriangles / sourceTriangles) : null
  const triangleOverage = Math.max(0, variantTriangles - targetTriangleCount)
  const ratioOverage =
    actualRatio === null
      ? null
      : round(Math.max(0, actualRatio - tier.simplifyRatio))
  const targetStatus = getLodTargetStatus({
    sourceTriangles,
    variantTriangles,
    triangleOverage,
    ratioOverage,
  })
  const sourceException =
    lodValidationExceptions.get(normalizePublicUrl(sourceUrl))?.[tier.id] ??
    null
  const generated = Boolean(variantMetadata?.valid)

  return {
    generator: 'gltf-transform optimize',
    generated,
    policy: lodValidationPolicy,
    sourceTriangleCount: sourceTriangles,
    variantTriangleCount: variantTriangles,
    targetTriangleCount,
    actualRatio,
    targetRatio: tier.simplifyRatio,
    triangleOverage,
    ratioOverage,
    exemptionReason: generated
      ? targetStatus.exemptionReason ?? sourceException
      : null,
    meetsTarget: generated && (targetStatus.meetsTarget || !!sourceException),
    monotonicOrder: ['high', 'medium', 'low'],
  }
}

function getLodTargetStatus({
  sourceTriangles,
  variantTriangles,
  triangleOverage,
  ratioOverage,
}) {
  if (sourceTriangles <= 0 || variantTriangles <= 0) {
    return { meetsTarget: false, exemptionReason: null }
  }
  if (triangleOverage <= 0) {
    return { meetsTarget: true, exemptionReason: null }
  }
  if (sourceTriangles < lodValidationPolicy.minSourceTrianglesForRatioTarget) {
    return {
      meetsTarget: true,
      exemptionReason: 'source-below-min-triangle-policy',
    }
  }
  if (triangleOverage <= lodValidationPolicy.absoluteTriangleTolerance) {
    return { meetsTarget: true, exemptionReason: 'absolute-triangle-tolerance' }
  }
  if (
    ratioOverage !== null &&
    ratioOverage <= lodValidationPolicy.ratioTolerance
  ) {
    return { meetsTarget: true, exemptionReason: 'ratio-tolerance' }
  }

  return { meetsTarget: false, exemptionReason: null }
}

function getAssetImpostorDescriptor(metadata, atlasEntry) {
  return {
    generated: !!metadata?.bounds && !!atlasEntry,
    strategy: 'bounds-billboard',
    sourceTier: 'low',
    textureSize: impostorAtlasTileSize,
    bounds: metadata?.bounds ?? null,
    atlas: atlasEntry
      ? {
          imageUrl: impostorAtlasImageUrl,
          manifestUrl: impostorAtlasManifestUrl,
          index: atlasEntry.index,
          cell: atlasEntry.cell,
          uv: atlasEntry.uv,
          billboardRect: atlasEntry.billboardRect,
        }
      : null,
    reason: metadata?.bounds
      ? atlasEntry
        ? 'generated from source mesh bounds into runtime impostor atlas'
        : 'source mesh bounds available but atlas cell unavailable'
      : 'source mesh bounds unavailable',
  }
}

function getApprovedMaterialExceptionReason(sourceUrl) {
  if (sourceUrl.startsWith('/generated/hunyuan3d/')) {
    return 'AI generated runtime asset uses texture/factor fallback material slots pending authored PBR pass.'
  }
  if (sourceUrl.startsWith('/generated/style-lab/')) {
    return 'Style lab generated runtime asset uses simplified material slots pending authored PBR pass.'
  }
  if (sourceUrl.startsWith('/generated/runtime-game-assets/prefabs/')) {
    return 'Baked procedural prefab uses material-factor palette slots pending authored atlas/PBR pass.'
  }
  return null
}

function getMissingRecommendedSlotApprovals({ metadata, scope, reason }) {
  if (!reason) return []

  return (metadata?.materialValidation?.missingRecommendedSlots ?? []).map(
    entry => ({
      scope,
      materialIndex: entry.materialIndex,
      materialName: entry.materialName,
      slot: entry.slot,
      fallback: entry.fallback,
      reason,
    }),
  )
}

function getMaterialCompliance({ sourceUrl, sourceMetadata, qualityVariants }) {
  const reason = getApprovedMaterialExceptionReason(sourceUrl)
  const approvedMissingRecommendedSlots = [
    ...getMissingRecommendedSlotApprovals({
      metadata: sourceMetadata,
      scope: 'source',
      reason,
    }),
  ]

  for (const [tier, variant] of Object.entries(qualityVariants)) {
    approvedMissingRecommendedSlots.push(
      ...getMissingRecommendedSlotApprovals({
        metadata: variant.metadata,
        scope: `variant:${tier}`,
        reason,
      }),
    )
  }

  const materialAuthoring = sourceMetadata?.materialAuthoring ?? null
  const status = materialAuthoring
    ? 'authored-source'
    : approvedMissingRecommendedSlots.length > 0
      ? 'approved-fallback'
      : 'complete-or-exempt'

  return {
    policy: 'pbr-slots-required-with-approved-exceptions',
    status,
    materialAuthoring,
    approvedMissingRecommendedSlots,
  }
}

function createManifestEntry(context, asset, runtimeScenes, importManifest) {
  const sourcePath = resolvePublicPath(context, asset.sourceUrl)
  const sourceExists = existsSync(sourcePath)
  const sourceSizeBytes = sourceExists ? statSync(sourcePath).size : 0
  const usage = getAssetRuntimeUsage(asset, runtimeScenes)
  const sourceMetadata = sourceExists
    ? readGltfAssetMetadata(sourcePath)
    : undefined
  const qualityVariants = {}

  for (const tier of tierConfigs) {
    const url = getCookedPublicUrl(asset.sourceUrl, tier.id)
    const fullPath = resolvePublicPath(context, url)
    const exists = existsSync(fullPath)
    const variantMetadata = exists ? readGltfAssetMetadata(fullPath) : undefined
    const cookTier = getAssetCookTierConfig(asset.sourceUrl, tier)
    qualityVariants[tier.id] = {
      url,
      lodTier: tier.id,
      lodIndex: tier.lodIndex,
      lodRole: tier.role,
      status: usage.status,
      required: usage.required,
      exists,
      sizeBytes: exists ? statSync(fullPath).size : 0,
      metadata: variantMetadata,
      pipeline: {
        command: 'gltf-transform optimize',
        compress: 'quantize',
        textureCompress: 'webp',
        textureSize: cookTier.textureSize,
        simplifyRatio: cookTier.simplifyRatio,
        simplifyError: cookTier.simplifyError,
        simplifyLockBorder: cookTier.simplifyLockBorder,
        recipe: cookTier.recipe ?? null,
        retopology: cookTier.retopology ?? null,
      },
      lodValidation: getLodValidation({
        sourceUrl: asset.sourceUrl,
        sourceMetadata,
        variantMetadata,
        tier,
      }),
    }
  }

  const sourceUrl = asset.sourceUrl
  const importMetadata = resolveRuntimeAssetImportMetadata({
    context,
    manifest: importManifest,
    sourceUrl,
  })

  return {
    sourceUrl: asset.sourceUrl,
    status: usage.status,
    required: usage.required,
    sourceExists,
    sourceSizeBytes,
    sourcePath: relative(context.repoRoot, sourcePath),
    scenes: usage.scenes,
    lod: {
      strategy: 'mesh-simplification',
      sourceTier: 'source',
      defaultTier: 'medium',
      fallbackOrder: ['medium', 'high', 'low'],
      tiers: tierConfigs.map(tier => ({
        id: tier.id,
        index: tier.lodIndex,
        role: tier.role,
        textureSize: tier.textureSize,
        simplifyRatio: tier.simplifyRatio,
        simplifyError: tier.simplifyError,
        simplifyLockBorder: tier.simplifyLockBorder,
      })),
    },
    impostor: null,
    materialCompliance: getMaterialCompliance({
      sourceUrl: asset.sourceUrl,
      sourceMetadata,
      qualityVariants,
    }),
    importMetadata,
    metadata: sourceMetadata,
    rawGeneratedRuntimeAsset: asset.sourceUrl.startsWith('/generated/'),
    qualityVariants,
  }
}

export async function buildRuntimeAssetManifest(context) {
  const requestedGeneratedAt = new Date().toISOString()
  const importManifest = readRuntimeAssetImportManifest(context)
  const assets = collectSceneAssets(context)
  let runtimeScenes = await buildRuntimeSceneManifests(
    context,
    requestedGeneratedAt,
  )
  const entries = Object.fromEntries(
    assets.map(asset => [
      asset.sourceUrl,
      createManifestEntry(context, asset, runtimeScenes, importManifest),
    ]),
  )
  const contentFingerprint = createContentBuildFingerprint({
    entries,
    runtimeScenes,
  })
  const generatedAt =
    getPreviousGeneratedAtForFingerprint(context, contentFingerprint) ??
    requestedGeneratedAt
  if (generatedAt !== requestedGeneratedAt) {
    runtimeScenes = await buildRuntimeSceneManifests(context, generatedAt)
  }
  const impostorAtlas = createImpostorAtlas(entries, generatedAt)
  const impostorAtlasEntries = new Map(
    (impostorAtlas?.entries ?? []).map(entry => [entry.sourceUrl, entry]),
  )
  for (const [sourceUrl, entry] of Object.entries(entries)) {
    entry.impostor = getAssetImpostorDescriptor(
      entry.metadata,
      impostorAtlasEntries.get(sourceUrl),
    )
  }
  const totalSourceBytes = Object.values(entries).reduce(
    (sum, entry) => sum + entry.sourceSizeBytes,
    0,
  )
  const cookedAssets = Object.values(entries).filter(entry =>
    Object.values(entry.qualityVariants).some(variant => variant.exists),
  )
  const cookedVariantCount = Object.values(entries).reduce(
    (sum, entry) =>
      sum +
      Object.values(entry.qualityVariants).filter(variant => variant.exists)
        .length,
    0,
  )
  const cookedTierCoverage = Object.fromEntries(
    tierConfigs.map(tier => [
      tier.id,
      Object.values(entries).filter(
        entry => entry.qualityVariants[tier.id]?.exists,
      ).length,
    ]),
  )
  const metadataAssetCount = Object.values(entries).filter(
    entry => entry.metadata?.valid,
  ).length
  const requiredAssetCount = Object.values(entries).filter(
    entry => entry.required,
  ).length
  const variantMetadataCount = Object.values(entries).reduce(
    (sum, entry) =>
      sum +
      Object.values(entry.qualityVariants).filter(
        variant => variant.metadata?.valid,
      ).length,
    0,
  )
  const lodAssetCount = Object.values(entries).filter(
    entry =>
      entry.lod?.strategy === 'mesh-simplification' &&
      Array.isArray(entry.lod.tiers) &&
      entry.lod.tiers.length === tierConfigs.length,
  ).length
  const impostorDescriptorCount = Object.values(entries).filter(
    entry => entry.impostor?.generated,
  ).length
  const authoringSourceMetadata = getAuthoringSceneSourceMetadata(
    createAuthoringSceneSourceContext(context),
  )
  const importValidation = validateRuntimeAssetImports({
    manifest: importManifest,
    entries,
  })

  return {
    schemaVersion: 1,
    generatedAt,
    contentBuild: createContentBuildProvenance({
      context,
      requestedGeneratedAt,
      fingerprint: contentFingerprint,
    }),
    ...authoringSourceMetadata,
    importManifest: {
      schemaVersion: importManifest.schemaVersion,
      path: importManifest.relativePath,
      namingConventions: importManifest.namingConventions,
      familyCount: importManifest.families.length,
      explicitAssetCount: Object.keys(importManifest.assets).length,
    },
    importValidation,
    cookedAssetDirectory: relative(context.repoRoot, context.cookedRoot),
    runtimeSceneDirectory: relative(context.repoRoot, context.runtimeSceneRoot),
    runtimeSelection: {
      mode: 'adaptive',
      defaultTier: 'medium',
      tiers: tierConfigs.map(tier => tier.id),
      fallbackOrder: {
        low: ['low', 'medium', 'high'],
        medium: ['medium', 'high', 'low'],
        high: ['high', 'medium', 'low'],
      },
    },
    streamingPolicy: runtimeAssetStreamingPolicy,
    platformCertification: platformCertificationProfiles,
    summary: {
      sourceAssetCount: Object.keys(entries).length,
      sourceAssetBytes: totalSourceBytes,
      sourceAssetSize: formatBytes(totalSourceBytes),
      cookedAssetCount: cookedAssets.length,
      cookedVariantCount,
      cookedTierCoverage,
      missingSourceAssetCount: Object.values(entries).filter(
        entry => !entry.sourceExists,
      ).length,
      rawGeneratedRuntimeAssetCount: Object.values(entries).filter(
        entry => entry.rawGeneratedRuntimeAsset,
      ).length,
      requiredAssetCount,
      optionalAssetCount: Object.keys(entries).length - requiredAssetCount,
      metadataAssetCount,
      variantMetadataCount,
      lodAssetCount,
      impostorDescriptorCount,
      impostorAtlasEntryCount: impostorAtlas?.entryCount ?? 0,
      runtimeSceneManifestCount: runtimeScenes.length,
    },
    impostorAtlas,
    assets: entries,
    runtimeScenes: Object.fromEntries(
      runtimeScenes.map(entry => [
        entry.manifest.levelId,
        {
          url: entry.outputUrl,
          sourceScene: entry.manifest.source.path,
          actorCount: entry.manifest.buildReport.actorCount,
          requiredRenderActorCount:
            entry.manifest.runtime.requiredRenderActorIds.length,
          requiredAssetCount: entry.manifest.runtime.requiredAssetUrls.length,
          runtimeAssetCount: entry.manifest.runtime.runtimeAssetUrls.length,
          buildErrors: entry.manifest.buildReport.errors,
          buildWarnings: entry.manifest.buildReport.warnings,
        },
      ]),
    ),
    runtimeSceneManifests: runtimeScenes,
  }
}

export function getRuntimeSceneBuildErrors(manifest) {
  return Object.values(manifest.runtimeScenes).flatMap(scene =>
    scene.buildErrors.map(error => `${scene.url}: ${error}`),
  )
}
