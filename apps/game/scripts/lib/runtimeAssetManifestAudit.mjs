import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'

const requiredVariantTiers = ['high', 'medium', 'low']
const defaultBudgetTier = 'medium'

function formatBytes(bytes) {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`
}

function isValidTextureMetadata(texture) {
  return (
    Number.isInteger(texture.index) &&
    typeof texture.mimeType === 'string' &&
    (Number.isFinite(texture.width) || texture.width === null) &&
    (Number.isFinite(texture.height) || texture.height === null) &&
    Array.isArray(texture.roles) &&
    ['srgb', 'linear', 'mixed', 'unknown'].includes(texture.colorSpace) &&
    ['basisu', 'webp', 'none'].includes(texture.compression)
  )
}

function isValidAssetMetadata(metadata) {
  return (
    metadata?.valid === true &&
    Number.isInteger(metadata.triangleCount) &&
    Number.isInteger(metadata.vertexCount) &&
    Number.isInteger(metadata.materialSlots) &&
    Number.isInteger(metadata.textureCount) &&
    Number.isInteger(metadata.imageCount) &&
    Number.isFinite(metadata.textureBytes) &&
    Array.isArray(metadata.materials) &&
    metadata.materials.length === metadata.materialCount &&
    Boolean(metadata.materialValidation) &&
    Array.isArray(metadata.materialValidation.missingTextureReferences) &&
    Array.isArray(metadata.materialValidation.missingRecommendedSlots) &&
    Array.isArray(metadata.materialValidation.unsupportedExtensions) &&
    Array.isArray(metadata.textures) &&
    metadata.textures.every(isValidTextureMetadata) &&
    Array.isArray(metadata.compression?.extensionsUsed) &&
    typeof metadata.compression?.geometry?.quantized === 'boolean'
  )
}

function getTextureLimit(asset, variant) {
  return variant?.pipeline?.textureSize ?? asset.lod?.tiers?.find(
    tier => tier.id === variant?.lodTier,
  )?.textureSize
}

function getOversizedTextures(metadata, maxTextureSize) {
  if (!Number.isFinite(maxTextureSize)) return []

  return metadata.textures.filter(texture => {
    const width = texture.width
    const height = texture.height
    if (!Number.isFinite(width) || !Number.isFinite(height)) return false
    return width > maxTextureSize || height > maxTextureSize
  })
}

function addMaterialValidationReport({
  failures,
  report,
  sourceUrl,
  metadata,
  textureLimit,
  scope,
}) {
  const missingReferences =
    metadata.materialValidation?.missingTextureReferences ?? []
  const unsupportedExtensions =
    metadata.materialValidation?.unsupportedExtensions ?? []
  const missingRecommendedSlots =
    metadata.materialValidation?.missingRecommendedSlots ?? []
  const oversizedTextures = getOversizedTextures(metadata, textureLimit)

  report.missingTextureReferences += missingReferences.length
  report.missingRecommendedMaterialSlots += missingRecommendedSlots.length
  report.unsupportedShaderFeatures += unsupportedExtensions.length
  report.oversizedTextures += oversizedTextures.length

  if (missingReferences.length > 0) {
    failures.push(
      `${sourceUrl}: ${scope} material references missing textures: ${missingReferences
        .map(
          entry =>
            `material=${entry.materialIndex} slot=${entry.slot} texture=${entry.textureIndex}`,
        )
        .join(', ')}`,
    )
  }
  if (unsupportedExtensions.length > 0) {
    failures.push(
      `${sourceUrl}: ${scope} uses unsupported material extensions: ${unsupportedExtensions
        .map(entry => `${entry.extension} on material ${entry.materialIndex}`)
        .join(', ')}`,
    )
  }
  if (oversizedTextures.length > 0) {
    failures.push(
      `${sourceUrl}: ${scope} texture dimensions exceed ${textureLimit}px: ${oversizedTextures
        .map(texture => `${texture.index}=${texture.width}x${texture.height}`)
        .join(', ')}`,
    )
  }
}

function getBudgetTier(sceneManifest) {
  const maxTier =
    sceneManifest.levelDefinition?.settings?.level?.runtimeAssets?.maxTier
  return requiredVariantTiers.includes(maxTier) ? maxTier : defaultBudgetTier
}

function createEmptyBudgetReport(levelId, tier) {
  return {
    levelId,
    tier,
    runtimeAssetCount: 0,
    runtimeAssetBytes: 0,
    largestRuntimeAssetBytes: 0,
    assetDrawCalls: 0,
    assetMaterialSlots: 0,
    assetTriangles: 0,
    assetTextureBytes: 0,
    combinedDrawCalls: 0,
    combinedMaterialSlots: 0,
    combinedTriangles: 0,
    combinedTextureBytes: 0,
  }
}

function getScenePrimitiveTriangles(sceneManifest) {
  return (
    sceneManifest.levelDefinition?.settings?.level?.graphicsBudget
      ?.scenePrimitiveTriangles ?? 0
  )
}

function getSceneAuthoredMaterialSlots(sceneManifest) {
  return (
    sceneManifest.levelDefinition?.settings?.level?.graphicsBudget
      ?.sceneAuthoredMaterialSlots ??
    sceneManifest.buildReport?.primitiveActorCount ??
    0
  )
}

function getSceneAuthoredTextureBytes(sceneManifest) {
  return (
    sceneManifest.levelDefinition?.settings?.level?.graphicsBudget
      ?.sceneAuthoredTextureBytes ?? 0
  )
}

function getSceneGeometryDrawCalls(sceneManifest) {
  return (
    sceneManifest.levelDefinition?.settings?.level?.graphicsBudget
      ?.sceneGeometryDrawCalls ??
    sceneManifest.buildReport?.primitiveActorCount ??
    0
  )
}

function addBudgetFailure({
  failures,
  levelId,
  label,
  actual,
  budget,
  format = value => value,
}) {
  if (!Number.isFinite(budget) || actual <= budget) return
  failures.push(
    `${levelId}: ${label} exceeds graphicsBudget ${format(actual)}/${format(budget)}`,
  )
}

function getRuntimeAssetBudgetSource(asset, tier) {
  const variant = asset?.qualityVariants?.[tier]
  if (variant?.exists && variant.metadata?.valid) {
    return {
      sizeBytes: variant.sizeBytes ?? 0,
      metadata: variant.metadata,
    }
  }

  if (asset?.sourceExists && asset.metadata?.valid) {
    return {
      sizeBytes: asset.sourceSizeBytes ?? 0,
      metadata: asset.metadata,
    }
  }

  return null
}

export function auditRuntimeAssetManifestObject({
  manifest,
  runtimeSceneManifests = [],
}) {
  const failures = []
  const report = {
    exists: true,
    sourceAssetCount: 0,
    requiredAssetCount: 0,
    optionalAssetCount: 0,
    metadataAssetCount: 0,
    cookedVariantCount: 0,
    variantMetadataCount: 0,
    missingMetadata: 0,
    missingVariantMetadata: 0,
    missingLodTier: 0,
    missingLodContract: 0,
    missingImpostorDescriptor: 0,
    missingStatus: 0,
    missingTextureReferences: 0,
    missingRecommendedMaterialSlots: 0,
    unsupportedShaderFeatures: 0,
    oversizedTextures: 0,
    budgetReports: [],
  }

  const assets = manifest.assets ?? {}
  report.sourceAssetCount = Object.keys(assets).length

  for (const [sourceUrl, asset] of Object.entries(assets)) {
    if (!['required', 'optional'].includes(asset.status)) {
      report.missingStatus += 1
      failures.push(`${sourceUrl}: asset manifest status must be required or optional`)
    }
    if (asset.required) report.requiredAssetCount += 1
    else report.optionalAssetCount += 1

    if (
      asset.lod?.strategy !== 'mesh-simplification' ||
      !Array.isArray(asset.lod?.tiers) ||
      asset.lod.tiers.length !== requiredVariantTiers.length
    ) {
      report.missingLodContract += 1
      failures.push(`${sourceUrl}: asset manifest must declare mesh-simplification LOD tiers`)
    }
    if (asset.impostor?.generated !== true || !asset.impostor?.bounds) {
      report.missingImpostorDescriptor += 1
      failures.push(`${sourceUrl}: asset manifest must include a generated impostor descriptor`)
    }

    if (isValidAssetMetadata(asset.metadata)) {
      report.metadataAssetCount += 1
      addMaterialValidationReport({
        failures,
        report,
        sourceUrl,
        metadata: asset.metadata,
        textureLimit: 4096,
        scope: 'source',
      })
    } else {
      report.missingMetadata += 1
      failures.push(`${sourceUrl}: source asset metadata is missing or invalid`)
    }

    const variants = asset.qualityVariants ?? {}
    for (const tier of requiredVariantTiers) {
      const variant = variants[tier]
      if (!variant?.exists) continue

      report.cookedVariantCount += 1
      if (variant.lodTier !== tier) {
        report.missingLodTier += 1
        failures.push(`${sourceUrl}: ${tier} variant must declare lodTier=${tier}`)
      }
      if (!['required', 'optional'].includes(variant.status)) {
        report.missingStatus += 1
        failures.push(`${sourceUrl}: ${tier} variant status must be required or optional`)
      }
      if (isValidAssetMetadata(variant.metadata)) {
        report.variantMetadataCount += 1
        addMaterialValidationReport({
          failures,
          report,
          sourceUrl,
          metadata: variant.metadata,
          textureLimit: getTextureLimit(asset, variant),
          scope: `${tier} variant`,
        })
      } else {
        report.missingVariantMetadata += 1
        failures.push(`${sourceUrl}: ${tier} variant metadata is missing or invalid`)
      }
    }
  }

  for (const sceneManifest of runtimeSceneManifests) {
    const levelId = sceneManifest.levelId
    const budget = sceneManifest.levelDefinition?.settings?.level?.graphicsBudget
    const tier = getBudgetTier(sceneManifest)
    const budgetReport = createEmptyBudgetReport(levelId, tier)
    const runtimeAssetUrls = sceneManifest.runtime?.runtimeAssetUrls ?? []

    for (const sourceUrl of runtimeAssetUrls) {
      const asset = assets[sourceUrl]
      const budgetSource = getRuntimeAssetBudgetSource(asset, tier)
      const metadata = budgetSource?.metadata
      if (!metadata?.valid) {
        failures.push(
          `${levelId}: runtime asset "${sourceUrl}" has no usable ${tier} or source metadata`,
        )
        continue
      }

      budgetReport.runtimeAssetCount += 1
      budgetReport.runtimeAssetBytes += budgetSource.sizeBytes
      budgetReport.largestRuntimeAssetBytes = Math.max(
        budgetReport.largestRuntimeAssetBytes,
        budgetSource.sizeBytes,
      )
      budgetReport.assetDrawCalls += metadata.meshPrimitiveCount ?? 0
      budgetReport.assetMaterialSlots += metadata.materialSlots ?? 0
      budgetReport.assetTriangles += metadata.triangleCount ?? 0
      budgetReport.assetTextureBytes += metadata.textureBytes ?? 0
    }

    budgetReport.combinedDrawCalls =
      getSceneGeometryDrawCalls(sceneManifest) + budgetReport.assetDrawCalls
    budgetReport.combinedMaterialSlots =
      getSceneAuthoredMaterialSlots(sceneManifest) +
      budgetReport.assetMaterialSlots
    budgetReport.combinedTriangles =
      getScenePrimitiveTriangles(sceneManifest) + budgetReport.assetTriangles
    budgetReport.combinedTextureBytes =
      getSceneAuthoredTextureBytes(sceneManifest) +
      budgetReport.assetTextureBytes
    report.budgetReports.push(budgetReport)

    addBudgetFailure({
      failures,
      levelId,
      label: `${tier} runtime asset payload`,
      actual: budgetReport.runtimeAssetBytes,
      budget: budget?.maxRuntimeAssetBytes,
      format: formatBytes,
    })
    addBudgetFailure({
      failures,
      levelId,
      label: `${tier} runtime asset file`,
      actual: budgetReport.largestRuntimeAssetBytes,
      budget: budget?.maxRuntimeAssetFileBytes,
      format: formatBytes,
    })
    addBudgetFailure({
      failures,
      levelId,
      label: 'combined draw calls',
      actual: budgetReport.combinedDrawCalls,
      budget: budget?.maxEstimatedDrawCalls,
    })
    addBudgetFailure({
      failures,
      levelId,
      label: 'combined material slots',
      actual: budgetReport.combinedMaterialSlots,
      budget: budget?.maxAuthoredMaterialSlots,
    })
    addBudgetFailure({
      failures,
      levelId,
      label: 'combined triangles',
      actual: budgetReport.combinedTriangles,
      budget: budget?.maxEstimatedTriangles,
    })
    addBudgetFailure({
      failures,
      levelId,
      label: 'combined texture bytes',
      actual: budgetReport.combinedTextureBytes,
      budget: budget?.maxAuthoredTextureBytes,
      format: formatBytes,
    })
  }

  return { failures, report }
}

export function auditRuntimeAssetManifest({
  manifestPath,
  runtimeSceneDir,
  readJsonFile,
}) {
  if (!existsSync(manifestPath)) {
    return {
      failures: ['runtime asset manifest is missing'],
      report: {
        exists: false,
        sourceAssetCount: 0,
        requiredAssetCount: 0,
        optionalAssetCount: 0,
        metadataAssetCount: 0,
        cookedVariantCount: 0,
        variantMetadataCount: 0,
        missingMetadata: 0,
        missingVariantMetadata: 0,
        missingLodTier: 0,
        missingLodContract: 0,
        missingImpostorDescriptor: 0,
        missingStatus: 0,
        missingTextureReferences: 0,
        missingRecommendedMaterialSlots: 0,
        unsupportedShaderFeatures: 0,
        oversizedTextures: 0,
        budgetReports: [],
      },
    }
  }

  const manifest = readJsonFile(manifestPath)
  const runtimeSceneManifests = runtimeSceneDir
    ? Object.values(manifest.runtimeScenes ?? {}).map(scene =>
        readJsonFile(join(runtimeSceneDir, basename(scene.url))),
      )
    : []

  return auditRuntimeAssetManifestObject({ manifest, runtimeSceneManifests })
}
