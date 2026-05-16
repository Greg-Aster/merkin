import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'

const requiredVariantTiers = ['high', 'medium', 'low']
const defaultBudgetTier = 'medium'
const nestedRuntimeAssetPath =
  '/generated/runtime-game-assets/' + 'generated/runtime-game-assets/'
const renderProfilePlatformTiers = ['mobile', 'desktop', 'tv']
const renderProfileReflectionModes = new Set([
  'none',
  'static-environment',
  'screen-space',
  'planar',
  'probe',
])
const renderProfileReflectionSources = new Set([
  'none',
  'skybox',
  'generated-cubemap',
  'planar-water',
  'screen-space',
  'probe',
])
const renderProfilePostPasses = new Set([
  'tone-mapping',
  'ambient-occlusion',
  'bloom',
  'color-grading',
  'vignette',
  'anti-aliasing',
  'depth-fog',
])
const heroAuthoredPbrSourceUrls = new Set([
  '/generated/runtime-game-assets/prefabs/anomaly-cluster/anomaly-cluster-cyan.glb',
  '/generated/runtime-game-assets/prefabs/anomaly-cluster/anomaly-cluster-green.glb',
  '/generated/runtime-game-assets/prefabs/anomaly-cluster/anomaly-cluster-magenta.glb',
  '/generated/runtime-game-assets/prefabs/anomaly-cluster/anomaly-cluster-rose.glb',
  '/generated/runtime-game-assets/prefabs/story-marker/story-marker-amber.glb',
  '/generated/runtime-game-assets/prefabs/story-marker/story-marker-cyan.glb',
  '/generated/runtime-game-assets/prefabs/story-marker/story-marker-green.glb',
  '/generated/runtime-game-assets/prefabs/story-marker/story-marker-magenta.glb',
  '/generated/runtime-game-assets/prefabs/story-marker/story-marker-red.glb',
])

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

function isFiniteNumberArray(value, length) {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every(component => Number.isFinite(component))
  )
}

function isValidMaterialMetadata(material) {
  const pbrFactors = material?.pbrFactors
  return (
    Number.isInteger(material?.index) &&
    isFiniteNumberArray(pbrFactors?.baseColorFactor, 4) &&
    Number.isFinite(pbrFactors?.metallicFactor) &&
    Number.isFinite(pbrFactors?.roughnessFactor) &&
    isFiniteNumberArray(pbrFactors?.emissiveFactor, 3) &&
    typeof pbrFactors?.hasExplicitMetallicFactor === 'boolean' &&
    typeof pbrFactors?.hasExplicitRoughnessFactor === 'boolean' &&
    typeof pbrFactors?.hasMetallicRoughnessTexture === 'boolean'
  )
}

function isValidGeometryValidation(validation) {
  return (
    Number.isInteger(validation?.missingPositionPrimitiveCount) &&
    Number.isInteger(validation?.missingNormalPrimitiveCount) &&
    Number.isInteger(validation?.missingTexcoordPrimitiveCount)
  )
}

function isValidAssetMetadata(metadata) {
  return (
    metadata?.valid === true &&
    Number.isInteger(metadata.triangleCount) &&
    Number.isInteger(metadata.vertexCount) &&
    isValidGeometryValidation(metadata.geometryValidation) &&
    Number.isInteger(metadata.materialSlots) &&
    Number.isInteger(metadata.textureCount) &&
    Number.isInteger(metadata.imageCount) &&
    Number.isFinite(metadata.textureBytes) &&
    Array.isArray(metadata.materials) &&
    metadata.materials.length === metadata.materialCount &&
    metadata.materials.every(isValidMaterialMetadata) &&
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

function isValidStreamingPolicy(policy) {
  return (
    policy?.strategy === 'required-gate-active-cell-prefetch-lru' &&
    Number.isInteger(policy.prefetch?.maxConcurrent) &&
    policy.prefetch.maxConcurrent > 0 &&
    Number.isInteger(policy.prefetch?.maxAssetsPerBatch) &&
    policy.prefetch.maxAssetsPerBatch > 0 &&
    Number.isFinite(policy.unload?.maxUnusedAgeMs) &&
    policy.unload.maxUnusedAgeMs > 0 &&
    Number.isInteger(policy.unload?.maxUnreferencedEntries) &&
    policy.unload.maxUnreferencedEntries >= 0 &&
    Number.isFinite(policy.unload?.maxUnreferencedBytes) &&
    policy.unload.maxUnreferencedBytes > 0 &&
    Number.isFinite(policy.memoryPressure?.highDeviceMemoryGb) &&
    Number.isFinite(policy.memoryPressure?.mediumDeviceMemoryGb) &&
    Number.isFinite(policy.memoryPressure?.highMaxUnreferencedBytes) &&
    Number.isFinite(policy.memoryPressure?.mediumMaxUnreferencedBytes)
  )
}

function isValidPlatformCertification(certification) {
  const profiles = certification?.profiles
  if (
    certification?.schemaVersion !== 1 ||
    !['mobile', 'desktop', 'tv'].includes(certification.defaultProfile) ||
    !profiles
  ) {
    return false
  }

  return ['mobile', 'desktop', 'tv'].every(profileId => {
    const profile = profiles[profileId]
    return (
      ['low', 'medium', 'high'].includes(profile?.defaultTier) &&
      Number.isFinite(profile.targetFps) &&
      Number.isFinite(profile.maxRuntimeAssetBytes) &&
      Number.isFinite(profile.maxRuntimeAssetFileBytes) &&
      Number.isFinite(profile.maxCombinedTriangles) &&
      Number.isFinite(profile.maxCombinedDrawCalls) &&
      Number.isFinite(profile.maxCombinedMaterialSlots) &&
      Number.isFinite(profile.maxCombinedTextureBytes)
    )
  })
}

function isValidContentBuildProvenance(contentBuild) {
  return (
    contentBuild?.schemaVersion === 1 &&
    typeof contentBuild.buildId === 'string' &&
    contentBuild.buildId.length > 0 &&
    typeof contentBuild.generatedAt === 'string' &&
    contentBuild.builder?.name === 'cook-runtime-assets' &&
    typeof contentBuild.builder?.command === 'string' &&
    typeof contentBuild.git?.dirty === 'boolean' &&
    typeof contentBuild.fingerprint === 'string' &&
    /^[a-f0-9]{64}$/.test(contentBuild.fingerprint) &&
    contentBuild.rollback?.strategy === 'single-previous-manifest' &&
    contentBuild.rollback.currentManifestUrl ===
      '/generated/runtime-game-assets/manifest.json' &&
    contentBuild.rollback.previousManifestUrl ===
      '/generated/runtime-game-assets/manifest.previous.json'
  )
}

function isValidImportManifestSummary(importManifest) {
  return (
    importManifest?.schemaVersion === 1 &&
    typeof importManifest.path === 'string' &&
    importManifest.path.length > 0 &&
    Number.isInteger(importManifest.familyCount) &&
    Number.isInteger(importManifest.explicitAssetCount)
  )
}

function isFiniteVec3(value) {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(component => Number.isFinite(component))
  )
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0
}

function getRuntimeRenderProfile(sceneManifest) {
  return (
    sceneManifest.runtime?.renderProfile ??
    sceneManifest.levelDefinition?.settings?.level?.renderProfile ??
    null
  )
}

function auditRuntimeRenderProfile(sceneManifest) {
  const levelId = sceneManifest.levelId
  const renderProfile = getRuntimeRenderProfile(sceneManifest)
  const failures = []
  if (!renderProfile) {
    return {
      valid: false,
      failures: [`${levelId}: runtime scene manifest is missing renderProfile`],
    }
  }

  if (!renderProfilePlatformTiers.includes(renderProfile.defaultTier)) {
    failures.push(`${levelId}: renderProfile defaultTier is invalid`)
  }
  const qualityTiers = renderProfile.qualityTiers ?? {}
  for (const tier of renderProfilePlatformTiers) {
    if (!qualityTiers[tier]) {
      failures.push(`${levelId}: renderProfile missing ${tier} quality tier`)
    }
    const tierReflections = qualityTiers[tier]?.reflections
    const tierReflectionSource = tierReflections?.source
    if (
      tierReflectionSource !== undefined &&
      !renderProfileReflectionSources.has(tierReflectionSource)
    ) {
      failures.push(
        `${levelId}: renderProfile ${tier} reflections.source is invalid`,
      )
    }
    const tierRequiredReflectionAssetUrls = tierReflections?.requiredAssetUrls
    if (
      tierRequiredReflectionAssetUrls !== undefined &&
      !Array.isArray(tierRequiredReflectionAssetUrls)
    ) {
      failures.push(
        `${levelId}: renderProfile ${tier} reflections.requiredAssetUrls is invalid`,
      )
    } else {
      for (const [index, url] of (
        tierRequiredReflectionAssetUrls ?? []
      ).entries()) {
        if (typeof url !== 'string' || url.length === 0) {
          failures.push(
            `${levelId}: renderProfile ${tier} reflections.requiredAssetUrls[${index}] is invalid`,
          )
        }
      }
    }
    const tierEstimatedTextureBytes = tierReflections?.estimatedTextureBytes
    if (
      tierEstimatedTextureBytes !== undefined &&
      !isNonNegativeInteger(tierEstimatedTextureBytes)
    ) {
      failures.push(
        `${levelId}: renderProfile ${tier} reflections.estimatedTextureBytes is invalid`,
      )
    }
    const tierEstimatedRenderPasses = tierReflections?.estimatedRenderPasses
    if (
      tierEstimatedRenderPasses !== undefined &&
      !isNonNegativeInteger(tierEstimatedRenderPasses)
    ) {
      failures.push(
        `${levelId}: renderProfile ${tier} reflections.estimatedRenderPasses is invalid`,
      )
    }
  }
  const maxCastingLights = renderProfile.shadows?.maxCastingLights
  if (!Number.isInteger(maxCastingLights) || maxCastingLights < 0) {
    failures.push(
      `${levelId}: renderProfile shadows.maxCastingLights is invalid`,
    )
  }
  const shadowMapSize = renderProfile.shadows?.mapSize
  if (
    renderProfile.shadows?.enabled &&
    (!Number.isInteger(shadowMapSize) || shadowMapSize <= 0)
  ) {
    failures.push(`${levelId}: renderProfile enabled shadows need mapSize`)
  }
  if (!renderProfileReflectionModes.has(renderProfile.reflections?.mode)) {
    failures.push(`${levelId}: renderProfile reflections.mode is invalid`)
  }
  const reflectionSource = renderProfile.reflections?.source
  if (
    reflectionSource !== undefined &&
    !renderProfileReflectionSources.has(reflectionSource)
  ) {
    failures.push(`${levelId}: renderProfile reflections.source is invalid`)
  }
  const reflectionIntent = renderProfile.reflections?.intent
  if (
    reflectionIntent !== undefined &&
    (typeof reflectionIntent !== 'string' || reflectionIntent.length === 0)
  ) {
    failures.push(`${levelId}: renderProfile reflections.intent is invalid`)
  }
  const requiredReflectionAssetUrls =
    renderProfile.reflections?.requiredAssetUrls
  if (
    requiredReflectionAssetUrls !== undefined &&
    !Array.isArray(requiredReflectionAssetUrls)
  ) {
    failures.push(
      `${levelId}: renderProfile reflections.requiredAssetUrls is invalid`,
    )
  } else {
    for (const [index, url] of (requiredReflectionAssetUrls ?? []).entries()) {
      if (typeof url !== 'string' || url.length === 0) {
        failures.push(
          `${levelId}: renderProfile reflections.requiredAssetUrls[${index}] is invalid`,
        )
      }
    }
  }
  const estimatedTextureBytes = renderProfile.reflections?.estimatedTextureBytes
  if (
    estimatedTextureBytes !== undefined &&
    !isNonNegativeInteger(estimatedTextureBytes)
  ) {
    failures.push(
      `${levelId}: renderProfile reflections.estimatedTextureBytes is invalid`,
    )
  }
  const estimatedRenderPasses = renderProfile.reflections?.estimatedRenderPasses
  if (
    estimatedRenderPasses !== undefined &&
    !isNonNegativeInteger(estimatedRenderPasses)
  ) {
    failures.push(
      `${levelId}: renderProfile reflections.estimatedRenderPasses is invalid`,
    )
  }
  const visualBookmarks = renderProfile.visualBookmarks
  if (!Array.isArray(visualBookmarks) || visualBookmarks.length === 0) {
    failures.push(`${levelId}: renderProfile visualBookmarks is missing`)
  } else {
    const bookmarkIds = new Set()
    for (const [index, bookmark] of visualBookmarks.entries()) {
      const path = `visualBookmarks[${index}]`
      if (typeof bookmark?.id !== 'string' || bookmark.id.length === 0) {
        failures.push(`${levelId}: renderProfile ${path}.id is invalid`)
      } else if (bookmarkIds.has(bookmark.id)) {
        failures.push(`${levelId}: renderProfile ${path}.id is duplicated`)
      } else {
        bookmarkIds.add(bookmark.id)
      }
      if (!isFiniteVec3(bookmark?.cameraPosition)) {
        failures.push(
          `${levelId}: renderProfile ${path}.cameraPosition is invalid`,
        )
      }
      if (!isFiniteVec3(bookmark?.cameraTarget)) {
        failures.push(
          `${levelId}: renderProfile ${path}.cameraTarget is invalid`,
        )
      }
      if (
        bookmark?.playerPosition !== undefined &&
        !isFiniteVec3(bookmark.playerPosition)
      ) {
        failures.push(
          `${levelId}: renderProfile ${path}.playerPosition is invalid`,
        )
      }
      const viewport = bookmark?.viewport
      if (
        viewport !== undefined &&
        (!isPositiveInteger(viewport.width) ||
          !isPositiveInteger(viewport.height))
      ) {
        failures.push(`${levelId}: renderProfile ${path}.viewport is invalid`)
      }
      if (
        bookmark?.settleMs !== undefined &&
        !isNonNegativeInteger(bookmark.settleMs)
      ) {
        failures.push(`${levelId}: renderProfile ${path}.settleMs is invalid`)
      }
    }
  }
  const passes = renderProfile.postProcessing?.passes
  if (!Array.isArray(passes)) {
    failures.push(`${levelId}: renderProfile postProcessing.passes is missing`)
  } else {
    const invalidPasses = passes.filter(
      pass => !renderProfilePostPasses.has(pass),
    )
    if (invalidPasses.length > 0) {
      failures.push(
        `${levelId}: renderProfile postProcessing.passes is invalid: ${invalidPasses.join(', ')}`,
      )
    }
  }

  return {
    valid: failures.length === 0,
    failures,
  }
}

function getTextureLimit(asset, variant) {
  return (
    variant?.pipeline?.textureSize ??
    asset.lod?.tiers?.find(tier => tier.id === variant?.lodTier)?.textureSize
  )
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
  asset,
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

  const approvedMissingRecommendedSlots = new Set(
    (asset.materialCompliance?.approvedMissingRecommendedSlots ?? []).map(
      entry =>
        `${entry.scope}|${entry.materialIndex}|${entry.slot}|${entry.fallback}`,
    ),
  )
  const unapprovedMissingRecommendedSlots = missingRecommendedSlots.filter(
    entry =>
      !approvedMissingRecommendedSlots.has(
        `${scope}|${entry.materialIndex}|${entry.slot}|${entry.fallback}`,
      ),
  )
  report.unapprovedMissingRecommendedMaterialSlots +=
    unapprovedMissingRecommendedSlots.length

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
  if (unapprovedMissingRecommendedSlots.length > 0) {
    failures.push(
      `${sourceUrl}: ${scope} has unapproved missing recommended material slots: ${unapprovedMissingRecommendedSlots
        .map(
          entry =>
            `material=${entry.materialIndex} slot=${entry.slot} fallback=${entry.fallback}`,
        )
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

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function isValidAtlasCell(cell) {
  return (
    cell &&
    isFiniteNumber(cell.x) &&
    isFiniteNumber(cell.y) &&
    isFiniteNumber(cell.width) &&
    isFiniteNumber(cell.height) &&
    cell.width > 0 &&
    cell.height > 0
  )
}

function isValidAtlasUv(uv) {
  return (
    uv &&
    isFiniteNumber(uv.u0) &&
    isFiniteNumber(uv.v0) &&
    isFiniteNumber(uv.u1) &&
    isFiniteNumber(uv.v1) &&
    uv.u0 >= 0 &&
    uv.v0 >= 0 &&
    uv.u1 <= 1 &&
    uv.v1 <= 1 &&
    uv.u1 > uv.u0 &&
    uv.v1 > uv.v0
  )
}

function isValidLodValidation(validation, sourceMetadata, variantMetadata) {
  return (
    validation?.generator === 'gltf-transform optimize' &&
    validation.generated === true &&
    validation.policy?.schemaVersion === 1 &&
    Number.isInteger(validation.policy.minSourceTrianglesForRatioTarget) &&
    isFiniteNumber(validation.policy.ratioTolerance) &&
    isFiniteNumber(validation.policy.absoluteTriangleTolerance) &&
    validation.sourceTriangleCount === sourceMetadata.triangleCount &&
    validation.variantTriangleCount === variantMetadata.triangleCount &&
    isFiniteNumber(validation.targetRatio) &&
    isFiniteNumber(validation.targetTriangleCount) &&
    (isFiniteNumber(validation.actualRatio) ||
      validation.actualRatio === null) &&
    Number.isInteger(validation.triangleOverage) &&
    (isFiniteNumber(validation.ratioOverage) ||
      validation.ratioOverage === null) &&
    typeof validation.meetsTarget === 'boolean' &&
    (typeof validation.exemptionReason === 'string' ||
      validation.exemptionReason === null)
  )
}

function getVariantTriangleCount(asset, tier) {
  return asset.qualityVariants?.[tier]?.metadata?.triangleCount
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

function addBudgetWarning({
  warnings,
  levelId,
  label,
  actual,
  budget,
  format = value => value,
}) {
  if (!Number.isFinite(budget) || actual <= budget) return
  warnings.push(
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

function auditStyleBakeAsset({ failures, warnings, report, sourceUrl, asset }) {
  const styleBake = asset.styleBake
  if (!styleBake) return

  report.styleBakeAssetCount += 1

  if (!styleBake.metadataUrl) {
    report.styleBakeMissingMetadata += 1
    failures.push(`${sourceUrl}: style-baked asset is missing metadataUrl`)
  }
  if (styleBake.status === 'missing-generated-metadata') {
    report.styleBakeMissingMetadata += 1
    failures.push(`${sourceUrl}: generated style metadata is missing`)
  }
  if (styleBake.status === 'missing-generated-asset') {
    report.styleBakeMissingGeneratedAsset += 1
    failures.push(`${sourceUrl}: generated style-baked GLB is missing`)
  }
  if (styleBake.status === 'missing-source-asset') {
    report.styleBakeMissingSource += 1
    failures.push(`${sourceUrl}: style bake source asset is missing`)
  }
  if (styleBake.sourceAssetFingerprintMatches === false) {
    report.styleBakeStaleSource += 1
    failures.push(
      `${sourceUrl}: style bake source fingerprint is stale against metadata`,
    )
  }
  if (styleBake.styleSettingsFingerprintMatches === false) {
    report.styleBakeStaleSettings += 1
    failures.push(
      `${sourceUrl}: style settings fingerprint is stale against metadata`,
    )
  }
  if (styleBake.runtimeCookRequired && !styleBake.runtimeCooked) {
    report.styleBakeNotCooked += 1
    failures.push(`${sourceUrl}: style-baked GLB has not been runtime-cooked`)
  }

  const unusedTextureCount = Number(styleBake.budget?.unusedTextureCount ?? 0)
  if (unusedTextureCount > 0) {
    report.unusedTexturePayloads += unusedTextureCount
    const message = `${sourceUrl}: style-baked GLB contains ${unusedTextureCount} unused texture payload(s) after prune/optimize`
    if (asset.required) {
      failures.push(message)
    } else {
      warnings.push(message)
    }
  }

  for (const diagnostic of styleBake.diagnostics ?? []) {
    warnings.push(`${sourceUrl}: ${diagnostic}`)
  }
}

function createRuntimeAssetBudgetReportForTier({
  sceneManifest,
  assets,
  tier,
  profileId = null,
}) {
  const levelId = sceneManifest.levelId
  const budgetReport = createEmptyBudgetReport(levelId, tier)
  budgetReport.profileId = profileId
  const failures = []
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
    getSceneAuthoredTextureBytes(sceneManifest) + budgetReport.assetTextureBytes

  return { budgetReport, failures }
}

export function auditRuntimeAssetManifestObject({
  manifest,
  runtimeSceneManifests = [],
}) {
  const failures = []
  const warnings = []
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
    missingImpostorAtlas: 0,
    missingStreamingPolicy: 0,
    missingPlatformProfiles: 0,
    missingContentBuildProvenance: 0,
    missingImportManifest: 0,
    missingImportMetadata: 0,
    duplicateImportAssetIds: 0,
    importMetadataWarnings: 0,
    missingRenderProfiles: 0,
    impostorAtlasEntryCount: 0,
    missingLodValidation: 0,
    lodTargetMisses: 0,
    lodTriangleOrderFailures: 0,
    missingStatus: 0,
    missingTextureReferences: 0,
    missingRecommendedMaterialSlots: 0,
    unapprovedMissingRecommendedMaterialSlots: 0,
    heroAuthoredPbrRegressions: 0,
    unsupportedShaderFeatures: 0,
    oversizedTextures: 0,
    unusedTexturePayloads: 0,
    styleBakeAssetCount: 0,
    styleBakeMissingMetadata: 0,
    styleBakeMissingGeneratedAsset: 0,
    styleBakeMissingSource: 0,
    styleBakeStaleSource: 0,
    styleBakeStaleSettings: 0,
    styleBakeNotCooked: 0,
    budgetReports: [],
    platformBudgetReports: [],
  }

  const assets = manifest.assets ?? {}
  const impostorAtlas = manifest.impostorAtlas ?? null
  const atlasEntries = new Map(
    (impostorAtlas?.entries ?? []).map(entry => [entry.sourceUrl, entry]),
  )
  report.sourceAssetCount = Object.keys(assets).length
  report.impostorAtlasEntryCount = atlasEntries.size

  if (
    !impostorAtlas ||
    impostorAtlas.strategy !== 'bounds-billboard-atlas' ||
    !impostorAtlas.imageUrl ||
    !impostorAtlas.manifestUrl ||
    !isFiniteNumber(impostorAtlas.tileSize) ||
    !Array.isArray(impostorAtlas.entries)
  ) {
    report.missingImpostorAtlas += 1
    failures.push(
      'runtime asset manifest must include a generated impostor atlas',
    )
  }
  if (!isValidStreamingPolicy(manifest.streamingPolicy)) {
    report.missingStreamingPolicy += 1
    failures.push(
      'runtime asset manifest must include an asset-bundle streaming policy',
    )
  }
  if (!isValidPlatformCertification(manifest.platformCertification)) {
    report.missingPlatformProfiles += 1
    failures.push(
      'runtime asset manifest must include mobile, desktop, and tv certification profiles',
    )
  }
  if (!isValidContentBuildProvenance(manifest.contentBuild)) {
    report.missingContentBuildProvenance += 1
    failures.push(
      'runtime asset manifest must include content build provenance and rollback metadata',
    )
  }
  if (!isValidImportManifestSummary(manifest.importManifest)) {
    report.missingImportManifest += 1
    failures.push(
      'runtime asset manifest must include source import manifest metadata',
    )
  }
  if (manifest.importValidation?.failures?.length > 0) {
    failures.push(...manifest.importValidation.failures)
  }
  report.importMetadataWarnings =
    manifest.importValidation?.warnings?.length ?? 0
  report.missingImportMetadata =
    manifest.importValidation?.report?.missingImportMetadata ?? 0
  report.duplicateImportAssetIds =
    manifest.importValidation?.report?.duplicateAssetIds ?? 0

  for (const [sourceUrl, asset] of Object.entries(assets)) {
    if (!['required', 'optional'].includes(asset.status)) {
      report.missingStatus += 1
      failures.push(
        `${sourceUrl}: asset manifest status must be required or optional`,
      )
    }
    if (asset.required) report.requiredAssetCount += 1
    else report.optionalAssetCount += 1
    auditStyleBakeAsset({ failures, warnings, report, sourceUrl, asset })

    if (!asset.importMetadata?.id) {
      report.missingImportMetadata += 1
      failures.push(`${sourceUrl}: asset manifest must include import metadata`)
    }

    if (
      asset.lod?.strategy !== 'mesh-simplification' ||
      !Array.isArray(asset.lod?.tiers) ||
      asset.lod.tiers.length !== requiredVariantTiers.length
    ) {
      report.missingLodContract += 1
      failures.push(
        `${sourceUrl}: asset manifest must declare mesh-simplification LOD tiers`,
      )
    }
    if (
      asset.impostor?.generated !== true ||
      !asset.impostor?.bounds ||
      !asset.impostor?.atlas ||
      !isValidAtlasCell(asset.impostor.atlas.cell) ||
      !isValidAtlasUv(asset.impostor.atlas.uv) ||
      !atlasEntries.has(sourceUrl)
    ) {
      report.missingImpostorDescriptor += 1
      failures.push(
        `${sourceUrl}: asset manifest must include a generated impostor atlas descriptor`,
      )
    }

    if (isValidAssetMetadata(asset.metadata)) {
      report.metadataAssetCount += 1
      addMaterialValidationReport({
        failures,
        report,
        sourceUrl,
        asset,
        metadata: asset.metadata,
        textureLimit: 4096,
        scope: 'source',
      })
    } else {
      report.missingMetadata += 1
      failures.push(`${sourceUrl}: source asset metadata is missing or invalid`)
    }

    if (heroAuthoredPbrSourceUrls.has(sourceUrl)) {
      const missingRecommendedSlots =
        asset.metadata?.materialValidation?.missingRecommendedSlots ?? []
      const approvedMissingRecommendedSlots =
        asset.materialCompliance?.approvedMissingRecommendedSlots ?? []
      if (
        asset.materialCompliance?.status !== 'authored-source' ||
        missingRecommendedSlots.length > 0 ||
        approvedMissingRecommendedSlots.length > 0
      ) {
        report.heroAuthoredPbrRegressions += 1
        failures.push(
          `${sourceUrl}: hero-visible prefab must keep authored source PBR maps with no approved recommended-slot fallbacks`,
        )
      }
    }

    const variants = asset.qualityVariants ?? {}
    for (const tier of requiredVariantTiers) {
      const variant = variants[tier]
      if (variant.url?.includes(nestedRuntimeAssetPath)) {
        failures.push(
          `${sourceUrl}: ${tier} variant URL is nested under the runtime asset root`,
        )
      }
      if (!variant?.exists) {
        report.missingVariantMetadata += 1
        failures.push(
          `${sourceUrl}: ${tier} LOD variant is missing; publish requires high, medium, and low cooked meshes`,
        )
        continue
      }

      report.cookedVariantCount += 1
      if (variant.lodTier !== tier) {
        report.missingLodTier += 1
        failures.push(
          `${sourceUrl}: ${tier} variant must declare lodTier=${tier}`,
        )
      }
      if (!['required', 'optional'].includes(variant.status)) {
        report.missingStatus += 1
        failures.push(
          `${sourceUrl}: ${tier} variant status must be required or optional`,
        )
      }
      if (isValidAssetMetadata(variant.metadata)) {
        report.variantMetadataCount += 1
        if (
          isValidAssetMetadata(asset.metadata) &&
          !isValidLodValidation(
            variant.lodValidation,
            asset.metadata,
            variant.metadata,
          )
        ) {
          report.missingLodValidation += 1
          failures.push(
            `${sourceUrl}: ${tier} variant missing LOD validation metadata`,
          )
        }
        if (variant.lodValidation?.meetsTarget === false) {
          report.lodTargetMisses += 1
        }
        if (
          isValidAssetMetadata(asset.metadata) &&
          variant.metadata.triangleCount > asset.metadata.triangleCount
        ) {
          report.lodTriangleOrderFailures += 1
          failures.push(
            `${sourceUrl}: ${tier} variant triangle count exceeds source (${variant.metadata.triangleCount}/${asset.metadata.triangleCount})`,
          )
        }
        addMaterialValidationReport({
          failures,
          report,
          sourceUrl,
          asset,
          metadata: variant.metadata,
          textureLimit: getTextureLimit(asset, variant),
          scope: `variant:${tier}`,
        })
      } else {
        report.missingVariantMetadata += 1
        failures.push(
          `${sourceUrl}: ${tier} variant metadata is missing or invalid`,
        )
      }
    }

    const highTriangles = getVariantTriangleCount(asset, 'high')
    const mediumTriangles = getVariantTriangleCount(asset, 'medium')
    const lowTriangles = getVariantTriangleCount(asset, 'low')
    if (
      [highTriangles, mediumTriangles, lowTriangles].every(Number.isFinite) &&
      !(highTriangles >= mediumTriangles && mediumTriangles >= lowTriangles)
    ) {
      report.lodTriangleOrderFailures += 1
      failures.push(
        `${sourceUrl}: cooked LOD triangles must be monotonic high >= medium >= low`,
      )
    }
  }

  for (const sceneManifest of runtimeSceneManifests) {
    const levelId = sceneManifest.levelId
    const budget =
      sceneManifest.levelDefinition?.settings?.level?.graphicsBudget
    const renderProfileAudit = auditRuntimeRenderProfile(sceneManifest)
    if (!renderProfileAudit.valid) report.missingRenderProfiles += 1
    failures.push(...renderProfileAudit.failures)
    const tier = getBudgetTier(sceneManifest)
    const { budgetReport, failures: budgetSourceFailures } =
      createRuntimeAssetBudgetReportForTier({ sceneManifest, assets, tier })
    failures.push(...budgetSourceFailures)
    report.budgetReports.push(budgetReport)

    addBudgetWarning({
      warnings,
      levelId,
      label: `${tier} runtime asset payload`,
      actual: budgetReport.runtimeAssetBytes,
      budget: budget?.maxRuntimeAssetBytes,
      format: formatBytes,
    })
    addBudgetWarning({
      warnings,
      levelId,
      label: `${tier} runtime asset file`,
      actual: budgetReport.largestRuntimeAssetBytes,
      budget: budget?.maxRuntimeAssetFileBytes,
      format: formatBytes,
    })
    addBudgetWarning({
      warnings,
      levelId,
      label: 'combined draw calls',
      actual: budgetReport.combinedDrawCalls,
      budget: budget?.maxEstimatedDrawCalls,
    })
    addBudgetWarning({
      warnings,
      levelId,
      label: 'combined material slots',
      actual: budgetReport.combinedMaterialSlots,
      budget: budget?.maxAuthoredMaterialSlots,
    })
    addBudgetWarning({
      warnings,
      levelId,
      label: 'combined triangles',
      actual: budgetReport.combinedTriangles,
      budget: budget?.maxEstimatedTriangles,
    })
    addBudgetWarning({
      warnings,
      levelId,
      label: 'combined texture bytes',
      actual: budgetReport.combinedTextureBytes,
      budget: budget?.maxAuthoredTextureBytes,
      format: formatBytes,
    })

    const profiles = manifest.platformCertification?.profiles ?? {}
    for (const [profileId, profile] of Object.entries(profiles)) {
      const {
        budgetReport: profileBudgetReport,
        failures: profileBudgetSourceFailures,
      } = createRuntimeAssetBudgetReportForTier({
        sceneManifest,
        assets,
        tier: profile.defaultTier,
        profileId,
      })
      failures.push(...profileBudgetSourceFailures)
      report.platformBudgetReports.push(profileBudgetReport)
      addBudgetWarning({
        warnings,
        levelId,
        label: `${profileId} certification payload`,
        actual: profileBudgetReport.runtimeAssetBytes,
        budget: profile.maxRuntimeAssetBytes,
        format: formatBytes,
      })
      addBudgetWarning({
        warnings,
        levelId,
        label: `${profileId} certification file`,
        actual: profileBudgetReport.largestRuntimeAssetBytes,
        budget: profile.maxRuntimeAssetFileBytes,
        format: formatBytes,
      })
      addBudgetWarning({
        warnings,
        levelId,
        label: `${profileId} certification draw calls`,
        actual: profileBudgetReport.combinedDrawCalls,
        budget: profile.maxCombinedDrawCalls,
      })
      addBudgetWarning({
        warnings,
        levelId,
        label: `${profileId} certification material slots`,
        actual: profileBudgetReport.combinedMaterialSlots,
        budget: profile.maxCombinedMaterialSlots,
      })
      addBudgetWarning({
        warnings,
        levelId,
        label: `${profileId} certification triangles`,
        actual: profileBudgetReport.combinedTriangles,
        budget: profile.maxCombinedTriangles,
      })
      addBudgetWarning({
        warnings,
        levelId,
        label: `${profileId} certification texture bytes`,
        actual: profileBudgetReport.combinedTextureBytes,
        budget: profile.maxCombinedTextureBytes,
        format: formatBytes,
      })
    }
  }

  return { failures, warnings, report }
}

export function auditRuntimeAssetManifest({
  manifestPath,
  runtimeSceneDir,
  readJsonFile,
}) {
  if (!existsSync(manifestPath)) {
    return {
      failures: ['runtime asset manifest is missing'],
      warnings: [],
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
        missingImpostorAtlas: 0,
        missingStreamingPolicy: 0,
        missingPlatformProfiles: 0,
        missingContentBuildProvenance: 0,
        missingImportManifest: 0,
        missingImportMetadata: 0,
        duplicateImportAssetIds: 0,
        importMetadataWarnings: 0,
        missingRenderProfiles: 0,
        impostorAtlasEntryCount: 0,
        missingLodValidation: 0,
        lodTargetMisses: 0,
        lodTriangleOrderFailures: 0,
        missingStatus: 0,
        missingTextureReferences: 0,
        missingRecommendedMaterialSlots: 0,
        unapprovedMissingRecommendedMaterialSlots: 0,
        heroAuthoredPbrRegressions: 0,
        unsupportedShaderFeatures: 0,
        oversizedTextures: 0,
        unusedTexturePayloads: 0,
        styleBakeAssetCount: 0,
        styleBakeMissingMetadata: 0,
        styleBakeMissingGeneratedAsset: 0,
        styleBakeMissingSource: 0,
        styleBakeStaleSource: 0,
        styleBakeStaleSettings: 0,
        styleBakeNotCooked: 0,
        budgetReports: [],
        platformBudgetReports: [],
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
