import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import {
  buildRuntimeAssetManifest,
  createImpostorAtlasSvg,
  createRuntimeAssetCookContext,
  formatBytes,
  getRuntimeSceneBuildErrors,
  normalizePublicUrl,
  resolvePublicPath,
  tierConfigs,
} from './lib/runtimeAssetCookManifest.mjs'
import { auditRuntimeAssetManifestObject } from './lib/runtimeAssetManifestAudit.mjs'
import { cookRuntimeAssetVariant } from './lib/runtimeAssetVariantCooker.mjs'

const appRoot = join(import.meta.dirname, '..')
const context = createRuntimeAssetCookContext({ appRoot })

function hasFlag(name) {
  return process.argv.includes(name)
}

function getArg(name) {
  const prefix = `${name}=`
  return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length)
}

function printSummary(manifest) {
  const tierCoverage = manifest.summary.cookedTierCoverage ?? {}
  const assetAudit = auditRuntimeAssetManifestObject({
    manifest,
    runtimeSceneManifests: manifest.runtimeSceneManifests.map(
      entry => entry.manifest,
    ),
  })
  const runtimeSceneBuildErrorCount = Object.values(
    manifest.runtimeScenes,
  ).reduce((sum, scene) => sum + scene.buildErrors.length, 0)

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
    `required/optional assets: ${manifest.summary.requiredAssetCount}/${manifest.summary.optionalAssetCount}`,
  )
  console.log(
    `metadata coverage: source=${manifest.summary.metadataAssetCount} variants=${manifest.summary.variantMetadataCount}`,
  )
  console.log(
    `import metadata: assets=${manifest.importValidation.report.metadataAssetCount} missing=${manifest.importValidation.report.missingImportMetadata} warnings=${manifest.importValidation.warnings.length}`,
  )
  console.log(
    `lod/impostor coverage: lod=${manifest.summary.lodAssetCount} impostors=${manifest.summary.impostorDescriptorCount}`,
  )
  console.log(
    `impostor atlas entries: ${manifest.summary.impostorAtlasEntryCount ?? 0}`,
  )
  console.log(`render budget errors: ${assetAudit.failures.length}`)
  console.log(
    `raw generated runtime assets: ${manifest.summary.rawGeneratedRuntimeAssetCount}`,
  )
  console.log(`missing source assets: ${manifest.summary.missingSourceAssetCount}`)
  console.log(
    `runtime scene manifests: ${manifest.summary.runtimeSceneManifestCount}`,
  )
  console.log(`runtime scene build errors: ${runtimeSceneBuildErrorCount}`)

  const largest = Object.values(manifest.assets)
    .sort((a, b) => b.sourceSizeBytes - a.sourceSizeBytes)
    .slice(0, 8)

  console.log('')
  console.log('largest runtime source assets')
  for (const asset of largest) {
    console.log(`- ${asset.sourceUrl} (${formatBytes(asset.sourceSizeBytes)})`)
  }
}

function writeManifestOutputs(manifest) {
  mkdirSync(context.cookedRoot, { recursive: true })
  mkdirSync(context.runtimeSceneRoot, { recursive: true })

  for (const entry of manifest.runtimeSceneManifests) {
    writeFileSync(entry.outputPath, `${JSON.stringify(entry.manifest, null, 2)}\n`)
    console.log(`wrote ${relative(context.repoRoot, entry.outputPath)}`)
  }

  const { runtimeSceneManifests, ...assetManifest } = manifest
  const previousManifestPath = join(
    dirname(context.manifestPath),
    'manifest.previous.json',
  )
  if (existsSync(context.manifestPath)) {
    copyFileSync(context.manifestPath, previousManifestPath)
    console.log(`wrote ${relative(context.repoRoot, previousManifestPath)}`)
  }
  writeFileSync(context.manifestPath, `${JSON.stringify(assetManifest, null, 2)}\n`)
  console.log('')
  console.log(`wrote ${relative(context.repoRoot, context.manifestPath)}`)

  if (manifest.impostorAtlas) {
    const atlasManifestPath = resolvePublicPath(
      context,
      manifest.impostorAtlas.manifestUrl,
    )
    const atlasImagePath = resolvePublicPath(
      context,
      manifest.impostorAtlas.imageUrl,
    )
    mkdirSync(dirname(atlasManifestPath), { recursive: true })
    writeFileSync(
      atlasManifestPath,
      `${JSON.stringify(manifest.impostorAtlas, null, 2)}\n`,
    )
    writeFileSync(atlasImagePath, `${createImpostorAtlasSvg(manifest.impostorAtlas)}\n`)
    console.log(`wrote ${relative(context.repoRoot, atlasManifestPath)}`)
    console.log(`wrote ${relative(context.repoRoot, atlasImagePath)}`)
  }
}

const shouldCook = hasFlag('--cook')
const shouldWriteManifest = hasFlag('--write-manifest') || shouldCook
const forceCook = hasFlag('--force')
const requestedAsset = getArg('--asset')
const requestedTier = getArg('--tier')
const maxAssets = Number.parseInt(getArg('--max-assets') ?? '0', 10)

let manifest = await buildRuntimeAssetManifest(context)
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
      cookRuntimeAssetVariant({
        context,
        sourceUrl: asset.sourceUrl,
        tier,
        force: forceCook,
      })
    }
  }

  manifest = await buildRuntimeAssetManifest(context)
}

if (shouldWriteManifest) {
  writeManifestOutputs(manifest)
}

if (manifest.summary.missingSourceAssetCount > 0) {
  process.exitCode = 1
}

if (manifest.importValidation.failures.length > 0) {
  console.error('')
  console.error('runtime asset import manifest errors')
  for (const error of manifest.importValidation.failures) {
    console.error(`- ${error}`)
  }
  process.exitCode = 1
}

if (manifest.importValidation.warnings.length > 0) {
  console.warn('')
  console.warn('runtime asset import manifest warnings')
  for (const warning of manifest.importValidation.warnings.slice(0, 20)) {
    console.warn(`- ${warning}`)
  }
  if (manifest.importValidation.warnings.length > 20) {
    console.warn(
      `- ... ${manifest.importValidation.warnings.length - 20} additional warning(s)`,
    )
  }
}

const runtimeSceneBuildErrors = getRuntimeSceneBuildErrors(manifest)
const runtimeAssetManifestAudit = auditRuntimeAssetManifestObject({
  manifest,
  runtimeSceneManifests: manifest.runtimeSceneManifests.map(
    entry => entry.manifest,
  ),
})

if (runtimeSceneBuildErrors.length > 0) {
  console.error('')
  console.error('runtime scene manifest build errors')
  for (const error of runtimeSceneBuildErrors) {
    console.error(`- ${error}`)
  }
  process.exitCode = 1
}

if (runtimeAssetManifestAudit.failures.length > 0) {
  console.error('')
  console.error('runtime asset manifest audit errors')
  for (const error of runtimeAssetManifestAudit.failures) {
    console.error(`- ${error}`)
  }
  process.exitCode = 1
}
