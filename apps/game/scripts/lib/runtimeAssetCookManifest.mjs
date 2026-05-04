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

export const tierConfigs = [
  {
    id: 'high',
    simplifyRatio: 0.82,
    simplifyError: 0.00008,
    textureSize: 2048,
  },
  {
    id: 'medium',
    simplifyRatio: 0.52,
    simplifyError: 0.00012,
    textureSize: 1024,
  },
  {
    id: 'low',
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
  const relativeSource = sourceUrl.replace(/^\//, '').replace(/\.glb$/i, '')
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
      if (typeof url !== 'string' || !url.endsWith('.glb')) continue

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

function createManifestEntry(context, asset) {
  const sourcePath = resolvePublicPath(context, asset.sourceUrl)
  const sourceExists = existsSync(sourcePath)
  const sourceSizeBytes = sourceExists ? statSync(sourcePath).size : 0
  const qualityVariants = {}

  for (const tier of tierConfigs) {
    const url = getCookedPublicUrl(asset.sourceUrl, tier.id)
    const fullPath = resolvePublicPath(context, url)
    qualityVariants[tier.id] = {
      url,
      exists: existsSync(fullPath),
      sizeBytes: existsSync(fullPath) ? statSync(fullPath).size : 0,
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
    sourceExists,
    sourceSizeBytes,
    sourcePath: relative(context.repoRoot, sourcePath),
    scenes: [...asset.scenes.entries()].map(([sceneId, nodeIds]) => ({
      sceneId,
      nodeIds: [...new Set(nodeIds)].sort(),
    })),
    rawGeneratedRuntimeAsset: asset.sourceUrl.startsWith('/generated/'),
    qualityVariants,
  }
}

export async function buildRuntimeAssetManifest(context) {
  const assets = collectSceneAssets(context)
  const entries = Object.fromEntries(
    assets.map(asset => [asset.sourceUrl, createManifestEntry(context, asset)]),
  )
  const runtimeScenes = await buildRuntimeSceneManifests(context)
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
  const authoringSourceMetadata = getAuthoringSceneSourceMetadata(
    createAuthoringSceneSourceContext(context),
  )

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    ...authoringSourceMetadata,
    cookedAssetDirectory: relative(context.repoRoot, context.cookedRoot),
    runtimeSceneDirectory: relative(context.repoRoot, context.runtimeSceneRoot),
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
