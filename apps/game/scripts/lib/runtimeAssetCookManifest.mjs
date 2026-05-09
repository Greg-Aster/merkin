import { existsSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  createAuthoringSceneSourceContext,
  getAuthoringSceneSourceMetadata,
  readDeployedAuthoringScenes,
} from './authoringSceneSource.mjs'
import {
  adaptSceneDocumentToLevelDefinition,
  createLevelBuildReport,
  createRuntimeSceneManifest,
  normalizeRuntimeLevelSceneSettings,
} from './runtimeSceneManifest.mjs'
import { readGltfAssetMetadata } from './gltfAssetMetadata.mjs'

export const tierConfigs = [
  {
    id: 'high',
    lodIndex: 0,
    role: 'near',
    simplifyRatio: 0.82,
    simplifyError: 0.00008,
    textureSize: 2048,
  },
  {
    id: 'medium',
    lodIndex: 1,
    role: 'mid',
    simplifyRatio: 0.52,
    simplifyError: 0.00012,
    textureSize: 1024,
  },
  {
    id: 'low',
    lodIndex: 2,
    role: 'far',
    simplifyRatio: 0.28,
    simplifyError: 0.0002,
    textureSize: 512,
  },
]

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
    runtimeSceneRoot: join(cookedRoot, 'scenes'),
  }
}

export function resolvePublicPath(context, url) {
  return join(context.publicRoot, normalizePublicUrl(url).replace(/^\//, ''))
}

export function getCookedPublicUrl(sourceUrl, tier) {
  const relativeSource = sourceUrl
    .replace(/^\//, '')
    .replace(/\.(glb|gltf)$/i, '')
  return `/generated/runtime-game-assets/${relativeSource}.${tier}.glb`
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
      const url = node.asset?.url
      if (typeof url !== 'string' || !/\.(glb|gltf)$/i.test(url)) continue

      const normalizedUrl = normalizePublicUrl(url)
      const entry =
        byUrl.get(normalizedUrl) ??
        {
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

async function buildRuntimeSceneManifests(context) {
  const manifests = []
  const generatedAt = new Date().toISOString()
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

function getAssetImpostorDescriptor(metadata) {
  return {
    generated: !!metadata?.bounds,
    strategy: 'bounds-billboard',
    sourceTier: 'low',
    textureSize: 256,
    bounds: metadata?.bounds ?? null,
    reason: metadata?.bounds
      ? 'generated from source mesh bounds'
      : 'source mesh bounds unavailable',
  }
}

function createManifestEntry(context, asset, runtimeScenes) {
  const sourcePath = resolvePublicPath(context, asset.sourceUrl)
  const sourceExists = existsSync(sourcePath)
  const sourceSizeBytes = sourceExists ? statSync(sourcePath).size : 0
  const usage = getAssetRuntimeUsage(asset, runtimeScenes)
  const sourceMetadata = sourceExists ? readGltfAssetMetadata(sourcePath) : undefined
  const qualityVariants = {}

  for (const tier of tierConfigs) {
    const url = getCookedPublicUrl(asset.sourceUrl, tier.id)
    const fullPath = resolvePublicPath(context, url)
    const exists = existsSync(fullPath)
    qualityVariants[tier.id] = {
      url,
      lodTier: tier.id,
      lodIndex: tier.lodIndex,
      lodRole: tier.role,
      status: usage.status,
      required: usage.required,
      exists,
      sizeBytes: exists ? statSync(fullPath).size : 0,
      metadata: exists
        ? readGltfAssetMetadata(fullPath)
        : undefined,
      pipeline: {
        command: 'gltf-transform optimize',
        compress: 'quantize',
        textureCompress: 'webp',
        textureSize: tier.textureSize,
        simplifyRatio: tier.simplifyRatio,
        simplifyError: tier.simplifyError,
      },
    }
  }

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
      })),
    },
    impostor: getAssetImpostorDescriptor(sourceMetadata),
    metadata: sourceMetadata,
    rawGeneratedRuntimeAsset: asset.sourceUrl.startsWith('/generated/'),
    qualityVariants,
  }
}

export async function buildRuntimeAssetManifest(context) {
  const assets = collectSceneAssets(context)
  const runtimeScenes = await buildRuntimeSceneManifests(context)
  const entries = Object.fromEntries(
    assets.map(asset => [
      asset.sourceUrl,
      createManifestEntry(context, asset, runtimeScenes),
    ]),
  )
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

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    ...authoringSourceMetadata,
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
      runtimeSceneManifestCount: runtimeScenes.length,
    },
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
