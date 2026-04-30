import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative } from 'node:path'

const appRoot = join(import.meta.dirname, '..')
const repoRoot = join(appRoot, '..', '..')
const sceneDir = join(appRoot, 'src/threlte/editor/scenes')
const publicRoot = join(repoRoot, 'apps/megameal/public')
const cookedRoot = join(publicRoot, 'generated/runtime-game-assets')
const manifestPath = join(cookedRoot, 'manifest.json')

const tierConfigs = [
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

function hasFlag(name) {
  return process.argv.includes(name)
}

function getArg(name) {
  const prefix = `${name}=`
  return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length)
}

function stripBom(source) {
  return source.replace(/^\uFEFF/, '')
}

function readJson(filePath) {
  return JSON.parse(stripBom(readFileSync(filePath, 'utf8')))
}

function formatBytes(bytes) {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`
}

function normalizePublicUrl(url) {
  return url.startsWith('/') ? url : `/${url}`
}

function resolvePublicPath(url) {
  return join(publicRoot, normalizePublicUrl(url).replace(/^\//, ''))
}

function getSceneFiles() {
  return readdirSync(sceneDir)
    .filter(file => file.endsWith('.scene.json'))
    .sort()
}

function collectSceneAssets() {
  const byUrl = new Map()

  for (const file of getSceneFiles()) {
    const scene = readJson(join(sceneDir, file))
    const sceneId = scene.levelId ?? file.replace(/\.scene\.json$/, '')
    const nodes = Array.isArray(scene.nodes) ? scene.nodes : []

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

      const sceneNodeIds = entry.scenes.get(sceneId) ?? []
      sceneNodeIds.push(node.id)
      entry.scenes.set(sceneId, sceneNodeIds)
      byUrl.set(normalizedUrl, entry)
    }
  }

  return [...byUrl.values()].sort((a, b) =>
    a.sourceUrl.localeCompare(b.sourceUrl),
  )
}

function getCookedPublicUrl(sourceUrl, tier) {
  const relativeSource = sourceUrl.replace(/^\//, '').replace(/\.glb$/i, '')
  return `/generated/runtime-game-assets/${relativeSource}.${tier}.glb`
}

function createManifestEntry(asset) {
  const sourcePath = resolvePublicPath(asset.sourceUrl)
  const sourceExists = existsSync(sourcePath)
  const sourceSizeBytes = sourceExists ? statSync(sourcePath).size : 0
  const qualityVariants = {}

  for (const tier of tierConfigs) {
    const url = getCookedPublicUrl(asset.sourceUrl, tier.id)
    const fullPath = resolvePublicPath(url)
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
    sourcePath: relative(repoRoot, sourcePath),
    scenes: [...asset.scenes.entries()].map(([sceneId, nodeIds]) => ({
      sceneId,
      nodeIds: [...new Set(nodeIds)].sort(),
    })),
    rawGeneratedRuntimeAsset: asset.sourceUrl.startsWith('/generated/'),
    qualityVariants,
  }
}

function buildManifest() {
  const assets = collectSceneAssets()
  const entries = Object.fromEntries(
    assets.map(asset => [asset.sourceUrl, createManifestEntry(asset)]),
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

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceSceneDirectory: relative(repoRoot, sceneDir),
    cookedAssetDirectory: relative(repoRoot, cookedRoot),
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
    },
    assets: entries,
  }
}

function cookVariant(sourceUrl, tier, options = {}) {
  const inputPath = resolvePublicPath(sourceUrl)
  const outputUrl = getCookedPublicUrl(sourceUrl, tier.id)
  const outputPath = resolvePublicPath(outputUrl)

  if (!existsSync(inputPath)) {
    throw new Error(`Missing source asset: ${sourceUrl}`)
  }

  if (!options.force && existsSync(outputPath)) {
    console.log(`[cook-runtime-assets] skipped existing ${outputUrl}`)
    return
  }

  mkdirSync(dirname(outputPath), { recursive: true })

  const args = [
    'exec',
    'gltf-transform',
    'optimize',
    inputPath,
    outputPath,
    '--compress',
    'quantize',
    '--texture-compress',
    'webp',
    '--texture-size',
    String(tier.textureSize),
    '--simplify',
    'true',
    '--simplify-ratio',
    String(tier.simplifyRatio),
    '--simplify-error',
    String(tier.simplifyError),
  ]

  const result = spawnSync('pnpm', args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  if (result.status !== 0) {
    throw new Error(
      `Failed to cook ${sourceUrl} ${tier.id} with exit code ${result.status}`,
    )
  }
}

function printSummary(manifest) {
  const tierCoverage = manifest.summary.cookedTierCoverage ?? {}

  console.log('Runtime asset cooking manifest')
  console.log('==============================')
  console.log(`source assets: ${manifest.summary.sourceAssetCount}`)
  console.log(`source payload: ${manifest.summary.sourceAssetSize}`)
  console.log(`cooked assets with variants: ${manifest.summary.cookedAssetCount}`)
  console.log(`cooked variants: ${manifest.summary.cookedVariantCount}`)
  console.log(
    `tier coverage: high=${tierCoverage.high} medium=${tierCoverage.medium} low=${tierCoverage.low}`,
  )
  console.log(
    `raw generated runtime assets: ${manifest.summary.rawGeneratedRuntimeAssetCount}`,
  )
  console.log(`missing source assets: ${manifest.summary.missingSourceAssetCount}`)

  const largest = Object.values(manifest.assets)
    .sort((a, b) => b.sourceSizeBytes - a.sourceSizeBytes)
    .slice(0, 8)

  console.log('')
  console.log('largest runtime source assets')
  for (const asset of largest) {
    console.log(`- ${asset.sourceUrl} (${formatBytes(asset.sourceSizeBytes)})`)
  }
}

const shouldCook = hasFlag('--cook')
const shouldWriteManifest = hasFlag('--write-manifest') || shouldCook
const forceCook = hasFlag('--force')
const requestedAsset = getArg('--asset')
const requestedTier = getArg('--tier')
const maxAssets = Number.parseInt(getArg('--max-assets') ?? '0', 10)

let manifest = buildManifest()
printSummary(manifest)

if (shouldCook) {
  let assetsToCook = Object.values(manifest.assets)
  if (requestedAsset) {
    const normalizedAsset = normalizePublicUrl(requestedAsset)
    assetsToCook = assetsToCook.filter(asset => asset.sourceUrl === normalizedAsset)
  }
  if (maxAssets > 0) {
    assetsToCook = assetsToCook.slice(0, maxAssets)
  }

  const tiersToCook = requestedTier
    ? tierConfigs.filter(tier => tier.id === requestedTier)
    : tierConfigs

  if (tiersToCook.length === 0) {
    throw new Error(`Unknown tier: ${requestedTier}`)
  }

  for (const asset of assetsToCook) {
    for (const tier of tiersToCook) {
      console.log(`[cook-runtime-assets] ${asset.sourceUrl} -> ${tier.id}`)
      cookVariant(asset.sourceUrl, tier, { force: forceCook })
    }
  }

  manifest = buildManifest()
}

if (shouldWriteManifest) {
  mkdirSync(cookedRoot, { recursive: true })
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log('')
  console.log(`wrote ${relative(repoRoot, manifestPath)}`)
}

if (manifest.summary.missingSourceAssetCount > 0) {
  process.exitCode = 1
}
