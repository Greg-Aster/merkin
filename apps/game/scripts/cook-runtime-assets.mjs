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

function assertSafeLevelId(levelId) {
  if (!levelId) return
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(levelId)) {
    throw new Error(`Invalid --level value: ${levelId}`)
  }
}

function cloneQualityVariantsForLevel(asset, required) {
  return Object.fromEntries(
    Object.entries(asset.qualityVariants ?? {}).map(([tier, variant]) => [
      tier,
      {
        ...variant,
        required,
        status: required ? 'required' : 'optional',
      },
    ]),
  )
}

function getScopedImportValidation(importValidation, assets) {
  const sourceUrls = new Set(Object.keys(assets))
  const sourceUrlList = [...sourceUrls]
  const importManifestPath = importValidation?.report?.importManifestPath
  const keepScopedMessage = message => {
    if (sourceUrlList.some(sourceUrl => message.includes(sourceUrl))) return true
    return (
      message.startsWith('runtime asset import manifest') ||
      (importManifestPath && message.includes(importManifestPath))
    )
  }
  const failures = (importValidation?.failures ?? []).filter(keepScopedMessage)
  const warnings = (importValidation?.warnings ?? []).filter(keepScopedMessage)
  const duplicateImportAssetIds = new Set()
  const seenImportAssetIds = new Set()
  let metadataAssetCount = 0
  let missingImportMetadata = 0

  for (const asset of Object.values(assets)) {
    const importAssetId = asset.importMetadata?.id
    if (!importAssetId) {
      missingImportMetadata += 1
      continue
    }
    metadataAssetCount += 1
    if (seenImportAssetIds.has(importAssetId)) {
      duplicateImportAssetIds.add(importAssetId)
    }
    seenImportAssetIds.add(importAssetId)
  }

  return {
    ...(importValidation ?? {}),
    failures,
    warnings,
    report: {
      ...(importValidation?.report ?? {}),
      metadataAssetCount,
      missingImportMetadata,
      duplicateAssetIds: duplicateImportAssetIds.size,
    },
  }
}

function createManifestSummaryForAssets({ assets, runtimeScenes, impostorAtlas }) {
  const entries = Object.values(assets)
  const totalSourceBytes = entries.reduce(
    (sum, entry) => sum + entry.sourceSizeBytes,
    0,
  )
  const cookedAssets = entries.filter(entry =>
    Object.values(entry.qualityVariants ?? {}).some(variant => variant.exists),
  )
  const cookedVariantCount = entries.reduce(
    (sum, entry) =>
      sum +
      Object.values(entry.qualityVariants ?? {}).filter(variant => variant.exists)
        .length,
    0,
  )
  const cookedTierCoverage = Object.fromEntries(
    tierConfigs.map(tier => [
      tier.id,
      entries.filter(entry => entry.qualityVariants?.[tier.id]?.exists).length,
    ]),
  )
  const requiredAssetCount = entries.filter(entry => entry.required).length
  const variantMetadataCount = entries.reduce(
    (sum, entry) =>
      sum +
      Object.values(entry.qualityVariants ?? {}).filter(
        variant => variant.metadata?.valid,
      ).length,
    0,
  )

  return {
    sourceAssetCount: entries.length,
    sourceAssetBytes: totalSourceBytes,
    sourceAssetSize: formatBytes(totalSourceBytes),
    cookedAssetCount: cookedAssets.length,
    cookedVariantCount,
    cookedTierCoverage,
    missingSourceAssetCount: entries.filter(entry => !entry.sourceExists).length,
    rawGeneratedRuntimeAssetCount: entries.filter(
      entry => entry.rawGeneratedRuntimeAsset,
    ).length,
    styleBakeAssetCount: entries.filter(entry => entry.styleBake).length,
    staleStyleBakeAssetCount: entries.filter(
      entry =>
        entry.styleBake &&
        !['clean', 'over-budget'].includes(entry.styleBake.status),
    ).length,
    requiredAssetCount,
    optionalAssetCount: entries.length - requiredAssetCount,
    metadataAssetCount: entries.filter(entry => entry.metadata?.valid).length,
    variantMetadataCount,
    lodAssetCount: entries.filter(
      entry =>
        entry.lod?.strategy === 'mesh-simplification' &&
        Array.isArray(entry.lod.tiers) &&
        entry.lod.tiers.length === tierConfigs.length,
    ).length,
    impostorDescriptorCount: entries.filter(entry => entry.impostor?.generated)
      .length,
    impostorAtlasEntryCount: impostorAtlas?.entryCount ?? 0,
    runtimeSceneManifestCount: Object.keys(runtimeScenes).length,
  }
}

function scopeRuntimeAssetManifest(manifest, levelId) {
  if (!levelId) return manifest

  const sceneEntry = manifest.runtimeSceneManifests.find(
    entry => entry.manifest.levelId === levelId,
  )
  const runtimeScene = manifest.runtimeScenes[levelId]
  if (!sceneEntry || !runtimeScene) {
    throw new Error(`Unknown runtime scene level: ${levelId}`)
  }

  const requiredAssetUrls = new Set(
    sceneEntry.manifest.runtime?.requiredAssetUrls ?? [],
  )
  const assetUrls = new Set([
    ...(sceneEntry.manifest.runtime?.runtimeAssetUrls ?? []),
    ...requiredAssetUrls,
  ])
  const assets = Object.fromEntries(
    Object.entries(manifest.assets ?? {})
      .filter(([sourceUrl]) => assetUrls.has(sourceUrl))
      .map(([sourceUrl, asset]) => {
        const required = requiredAssetUrls.has(sourceUrl)
        return [
          sourceUrl,
          {
            ...asset,
            required,
            status: required ? 'required' : 'optional',
            scenes: (asset.scenes ?? []).filter(scene => scene.sceneId === levelId),
            qualityVariants: cloneQualityVariantsForLevel(asset, required),
          },
        ]
      }),
  )
  const impostorAtlas = manifest.impostorAtlas
    ? {
        ...manifest.impostorAtlas,
        entries: manifest.impostorAtlas.entries.filter(entry =>
          assetUrls.has(entry.sourceUrl),
        ),
      }
    : null
  if (impostorAtlas) {
    impostorAtlas.entryCount = impostorAtlas.entries.length
  }
  const runtimeScenes = { [levelId]: runtimeScene }

  return {
    ...manifest,
    scope: {
      mode: 'level',
      levelId,
    },
    importValidation: getScopedImportValidation(
      manifest.importValidation,
      assets,
    ),
    summary: createManifestSummaryForAssets({
      assets,
      runtimeScenes,
      impostorAtlas,
    }),
    impostorAtlas,
    assets,
    runtimeScenes,
    runtimeSceneManifests: [sceneEntry],
  }
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
  if (manifest.scope?.levelId) {
    console.log(`scope: ${manifest.scope.levelId}`)
  }
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
  console.log(`render audit errors: ${assetAudit.failures.length}`)
  console.log(`render budget warnings: ${assetAudit.warnings.length}`)
  console.log(
    `raw generated runtime assets: ${manifest.summary.rawGeneratedRuntimeAssetCount}`,
  )
  console.log(
    `style-baked runtime assets: ${manifest.summary.styleBakeAssetCount ?? 0} (${manifest.summary.staleStyleBakeAssetCount ?? 0} stale/missing)`,
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

function writeManifestOutputs(manifest, { levelId } = {}) {
  mkdirSync(context.cookedRoot, { recursive: true })
  mkdirSync(context.runtimeSceneRoot, { recursive: true })

  const sceneManifestEntries = levelId
    ? manifest.runtimeSceneManifests.filter(
        entry => entry.manifest.levelId === levelId,
      )
    : manifest.runtimeSceneManifests

  for (const entry of sceneManifestEntries) {
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
const requestedLevel = getArg('--level') ?? ''
const maxAssets = Number.parseInt(getArg('--max-assets') ?? '0', 10)

assertSafeLevelId(requestedLevel)

let manifest = await buildRuntimeAssetManifest(context)
let validationManifest = scopeRuntimeAssetManifest(manifest, requestedLevel)
printSummary(validationManifest)

if (shouldCook) {
  let assetsToCook = Object.values(validationManifest.assets)
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
  validationManifest = scopeRuntimeAssetManifest(manifest, requestedLevel)
}

let hasPreWriteManifestError = false

if (validationManifest.importValidation.failures.length > 0) {
  console.error('')
  console.error('runtime asset import manifest errors')
  for (const error of validationManifest.importValidation.failures) {
    console.error(`- ${error}`)
  }
  hasPreWriteManifestError = true
}

if (validationManifest.importValidation.warnings.length > 0) {
  console.warn('')
  console.warn('runtime asset import manifest warnings')
  for (const warning of validationManifest.importValidation.warnings.slice(
    0,
    20,
  )) {
    console.warn(`- ${warning}`)
  }
  if (validationManifest.importValidation.warnings.length > 20) {
    console.warn(
      `- ... ${validationManifest.importValidation.warnings.length - 20} additional warning(s)`,
    )
  }
}

const runtimeSceneBuildErrors = getRuntimeSceneBuildErrors(validationManifest)
const runtimeAssetManifestAudit = auditRuntimeAssetManifestObject({
  manifest: validationManifest,
  runtimeSceneManifests: validationManifest.runtimeSceneManifests.map(
    entry => entry.manifest,
  ),
})

if (runtimeSceneBuildErrors.length > 0) {
  console.error('')
  console.error('runtime scene manifest build errors')
  for (const error of runtimeSceneBuildErrors) {
    console.error(`- ${error}`)
  }
  hasPreWriteManifestError = true
}

if (runtimeAssetManifestAudit.failures.length > 0) {
  console.error('')
  console.error('runtime asset manifest audit errors')
  for (const error of runtimeAssetManifestAudit.failures) {
    console.error(`- ${error}`)
  }
  process.exitCode = 1
}

if (runtimeAssetManifestAudit.warnings.length > 0) {
  console.warn('')
  console.warn('runtime asset manifest audit warnings')
  for (const warning of runtimeAssetManifestAudit.warnings) {
    console.warn(`- ${warning}`)
  }
}

if (validationManifest.summary.missingSourceAssetCount > 0) {
  hasPreWriteManifestError = true
}

if (hasPreWriteManifestError) {
  if (shouldWriteManifest) {
    console.error('')
    console.error('refusing to write runtime manifests because validation failed')
  }
  process.exit(1)
}

if (shouldWriteManifest) {
  writeManifestOutputs(manifest, { levelId: requestedLevel })
}
