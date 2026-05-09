import { mkdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  buildRuntimeAssetManifest,
  createRuntimeAssetCookContext,
  formatBytes,
  getRuntimeSceneBuildErrors,
  normalizePublicUrl,
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
    `lod/impostor coverage: lod=${manifest.summary.lodAssetCount} impostors=${manifest.summary.impostorDescriptorCount}`,
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
  writeFileSync(context.manifestPath, `${JSON.stringify(assetManifest, null, 2)}\n`)
  console.log('')
  console.log(`wrote ${relative(context.repoRoot, context.manifestPath)}`)
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
