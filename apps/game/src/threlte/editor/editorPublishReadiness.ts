import {
  compareAssetLocalBounds,
  validateAssetLocalTransformMetadata,
} from '../engine/assetLocalTransform'
import {
  classifyTerrainAuthority,
  getTerrainAuthorityDiagnostics,
} from '../engine/groundContract'
import { createLevelBuildReport } from '../engine/levelValidation'
import {
  type RuntimeSceneManifest,
  getBuildReportRequiredAssetUrls,
  getBuildReportRuntimeAssetUrls,
  getRuntimeSceneRequiredRenderActorIds,
  getRuntimeSceneRequiredAssetUrls,
  getRuntimeSceneRuntimeAssetUrls,
  validateRuntimeSceneManifest,
} from '../engine/runtimeSceneManifest'
import { withEditorSceneEngineData } from '../engine/sceneDocumentRuntime'
import {
  type TerrainManifest,
  validateTerrainManifestCollisionContract,
} from '../features/terrain/terrainManifest'
import {
  type EditorPublishReadinessCommand,
  type EditorPublishReadinessItem,
  type EditorPublishReadinessViewModel,
  type LoadedManifest,
  type MeshColliderBakeMetadata,
  type RuntimeAssetCookManifest,
  type RuntimePrefabManifest,
  type StyleBakeFingerprint,
  type StyleBakeMetadata,
  createEmptyEditorPublishReadinessViewModel,
} from './editorPublishReadinessContracts'
import {
  addPublishReadinessProductionPanels,
  addPublishReadinessWorkflow,
} from './editorPublishReadinessWorkflow'
import { isSourceGlbChunkTerrain } from './editorTerrainModeGuards'
import type { EditorTerrainSourceAssetStatus } from './editorTerrainPipeline'
import type {
  EditorSceneDocument,
  EditorSceneNode,
  SharedLevelGraphicsBudgetSettings,
} from './editorTypes'

const requiredRuntimeAssetLodTiers = ['high', 'medium', 'low'] as const

function addUniqueCommand(
  commands: EditorPublishReadinessCommand[],
  command: EditorPublishReadinessCommand,
) {
  if (commands.some(existing => existing.command === command.command)) return
  commands.push(command)
}

function getCookRuntimeAssetsCommand(
  viewModel: EditorPublishReadinessViewModel,
  script = 'cook:runtime-assets',
) {
  return `pnpm --dir apps/game ${script} -- --level=${viewModel.levelId}`
}

function pushIssue(
  viewModel: EditorPublishReadinessViewModel,
  item: EditorPublishReadinessItem,
) {
  if (item.severity === 'blocker') {
    viewModel.blockers.push(item)
  } else if (item.severity === 'warning') {
    viewModel.warnings.push(item)
  }
}

function addSection(
  viewModel: EditorPublishReadinessViewModel,
  item: EditorPublishReadinessItem,
) {
  viewModel.sections.push(item)
  pushIssue(viewModel, item)
}

function formatBytes(value: number | undefined) {
  if (!Number.isFinite(value) || value === undefined) return 'unknown'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function normalizePublicUrl(url: string | undefined | null) {
  const trimmed = String(url ?? '').trim()
  if (!trimmed) return ''
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function getCompanionJsonUrl(assetUrl: string) {
  return /\.(glb|gltf)$/i.test(assetUrl)
    ? assetUrl.replace(/\.(glb|gltf)$/i, '.json')
    : ''
}

function getNodeStyleBakeProduct(node: EditorSceneNode) {
  return node.generation?.styleBakeProduct ?? null
}

export function getEditorStyleBakeMetadataUrl(node: EditorSceneNode) {
  const product = getNodeStyleBakeProduct(node)
  const explicit =
    product?.metadataUrl ?? product?.generatedMetadataUrl ?? ''
  if (explicit) return normalizePublicUrl(explicit)

  const assetUrl =
    product?.generatedAssetUrl ??
    product?.assetUrl ??
    node.asset?.url ??
    node.generation?.lastBakedAssetUrl ??
    ''
  return getCompanionJsonUrl(normalizePublicUrl(assetUrl))
}

function isGeneratedStyleBakeUrl(url: string) {
  return (
    url.startsWith('/generated/style-lab/baked-style/') ||
    /-style-baked\.glb$/i.test(url)
  )
}

export function isEditorStyleBakeCandidate(node: EditorSceneNode) {
  const product = getNodeStyleBakeProduct(node)
  if (product?.mode === 'ai-texture-source') return false
  const assetUrl = normalizePublicUrl(node.asset?.url)
  return Boolean(
    product ||
      (assetUrl && isGeneratedStyleBakeUrl(assetUrl)),
  )
}

function normalizeFingerprint(
  value: StyleBakeFingerprint | string | Record<string, unknown> | null | undefined,
): StyleBakeFingerprint | null {
  if (!value) return null
  if (typeof value === 'string') return { algorithm: 'sha256', value }
  const fingerprintValue = value.value
  return typeof fingerprintValue === 'string'
    ? {
        algorithm:
          typeof value.algorithm === 'string' ? value.algorithm : 'sha256',
        value: fingerprintValue,
      }
    : null
}

function fingerprintsMatch(
  left: StyleBakeFingerprint | string | Record<string, unknown> | null | undefined,
  right: StyleBakeFingerprint | string | Record<string, unknown> | null | undefined,
) {
  const leftFingerprint = normalizeFingerprint(left)
  const rightFingerprint = normalizeFingerprint(right)
  if (!leftFingerprint?.value || !rightFingerprint?.value) return null
  return leftFingerprint.value === rightFingerprint.value
}

function getStyleMetadataSettingsFingerprint(metadata: StyleBakeMetadata | null) {
  return (
    metadata?.styleSettingsFingerprint ??
    metadata?.settingsFingerprint ??
    null
  )
}

function getRuntimeStyleBakeStatus(
  runtimeAssetManifest: RuntimeAssetCookManifest | null,
  assetUrl: string,
) {
  return runtimeAssetManifest?.assets?.[assetUrl]?.styleBake ?? null
}

function getRuntimeAssetEntry(
  runtimeAssetManifest: RuntimeAssetCookManifest | null,
  assetUrl: string,
) {
  return runtimeAssetManifest?.assets?.[assetUrl] ?? null
}

function getStyleBakeSelectedTier(runtimeScene: RuntimeSceneManifest | null) {
  const tier =
    runtimeScene?.runtime.assetTierCap ??
    ((runtimeScene?.levelDefinition.settings as any)?.level?.runtimeAssets
      ?.maxTier as string | undefined)
  return tier === 'high' || tier === 'low' || tier === 'medium'
    ? tier
    : 'medium'
}

function getVariantOversizedTextureCount(
  asset: ReturnType<typeof getRuntimeAssetEntry>,
  tier: 'high' | 'medium' | 'low',
) {
  const variant = asset?.qualityVariants?.[tier]
  const textureLimit =
    variant?.pipeline?.textureSize ??
    asset?.lod?.tiers?.find(lodTier => lodTier.id === tier)?.textureSize
  if (!Number.isFinite(textureLimit)) return 0

  return (variant?.metadata?.textures ?? []).filter(texture => {
    const width = texture.width
    const height = texture.height
    return (
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      (Number(width) > Number(textureLimit) ||
        Number(height) > Number(textureLimit))
    )
  }).length
}

function asStringSet(values: string[] | undefined) {
  return new Set((values ?? []).filter(Boolean))
}

function sameStringSet(
  left: string[] | undefined,
  right: string[] | undefined,
) {
  const leftSet = asStringSet(left)
  const rightSet = asStringSet(right)
  if (leftSet.size !== rightSet.size) return false
  for (const value of leftSet) {
    if (!rightSet.has(value)) return false
  }
  return true
}

function isFiniteVec3(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(component => Number.isFinite(component))
  )
}

function getPrefabKey(
  type: string | undefined,
  variant: string | null | undefined,
) {
  const normalizedType = String(type ?? '').trim()
  const normalizedVariant = String(variant ?? '').trim()
  return normalizedVariant
    ? `${normalizedType}:${normalizedVariant}`
    : normalizedType
}

function getGraphicsBudget(
  scene: EditorSceneDocument | null,
  runtimeScene: RuntimeSceneManifest | null,
) {
  return ((runtimeScene?.levelDefinition.settings as any)?.level
    ?.graphicsBudget ??
    scene?.settings?.level?.graphicsBudget ??
    null) as SharedLevelGraphicsBudgetSettings['graphicsBudget'] | null
}

function getRuntimeAssetsForScene(
  runtimeAssetManifest: RuntimeAssetCookManifest | null,
  runtimeScene: RuntimeSceneManifest | null,
) {
  const assets = runtimeAssetManifest?.assets ?? {}
  return getRuntimeSceneRuntimeAssetUrls(runtimeScene)
    .map(url => assets[url])
    .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
}

function countLodMisses(runtimeAssetManifest: RuntimeAssetCookManifest | null) {
  return Object.values(runtimeAssetManifest?.assets ?? {}).reduce(
    (sum, asset) =>
      sum +
      Object.values(asset.qualityVariants ?? {}).filter(
        variant => variant?.lodValidation?.meetsTarget === false,
      ).length,
    0,
  )
}

function countMissingLodVariants(
  runtimeAssetManifest: RuntimeAssetCookManifest | null,
) {
  return Object.values(runtimeAssetManifest?.assets ?? {}).reduce(
    (sum, asset) =>
      sum +
      requiredRuntimeAssetLodTiers.filter(
        tier => !asset.qualityVariants?.[tier]?.exists,
      ).length,
    0,
  )
}

function countMaterialExceptions(
  runtimeAssetManifest: RuntimeAssetCookManifest | null,
) {
  return Object.values(runtimeAssetManifest?.assets ?? {}).reduce(
    (sum, asset) =>
      sum +
      (asset.materialCompliance?.approvedMissingRecommendedSlots?.length ?? 0),
    0,
  )
}

function countMaterialBacklog(
  runtimeAssetManifest: RuntimeAssetCookManifest | null,
) {
  let missingReferences = 0
  let missingRecommendedSlots = 0
  let unsupportedExtensions = 0

  for (const asset of Object.values(runtimeAssetManifest?.assets ?? {})) {
    const validation = asset.metadata?.materialValidation
    missingReferences += validation?.missingTextureReferences.length ?? 0
    missingRecommendedSlots += validation?.missingRecommendedSlots.length ?? 0
    unsupportedExtensions += validation?.unsupportedExtensions.length ?? 0
  }

  return {
    missingReferences,
    missingRecommendedSlots,
    unsupportedExtensions,
  }
}

function calculateRuntimeBudgetMetrics(
  runtimeAssetManifest: RuntimeAssetCookManifest | null,
  runtimeScene: RuntimeSceneManifest | null,
  graphicsBudget: SharedLevelGraphicsBudgetSettings['graphicsBudget'] | null,
) {
  const sceneAssets = getRuntimeAssetsForScene(
    runtimeAssetManifest,
    runtimeScene,
  )
  let runtimeAssetBytes = 0
  let largestRuntimeAssetBytes = 0
  let estimatedTriangles = 0
  let estimatedDrawCalls = 0
  let authoredMaterialSlots = 0
  let authoredTextureBytes = 0

  for (const asset of sceneAssets) {
    const mediumVariant = asset.qualityVariants?.medium
    const anyVariant =
      mediumVariant ??
      asset.qualityVariants?.low ??
      asset.qualityVariants?.high ??
      null
    const sizeBytes = anyVariant?.sizeBytes ?? 0
    runtimeAssetBytes += sizeBytes
    largestRuntimeAssetBytes = Math.max(largestRuntimeAssetBytes, sizeBytes)
    estimatedTriangles += asset.metadata?.triangleCount ?? 0
    estimatedDrawCalls += asset.metadata?.meshPrimitiveCount ?? 0
    authoredMaterialSlots += asset.metadata?.materialSlots ?? 0
    authoredTextureBytes += asset.metadata?.textureBytes ?? 0
  }

  return [
    {
      label: 'Runtime asset bytes',
      value: formatBytes(runtimeAssetBytes),
      budget: formatBytes(graphicsBudget?.maxRuntimeAssetBytes),
      overBudget:
        Number.isFinite(graphicsBudget?.maxRuntimeAssetBytes) &&
        runtimeAssetBytes > Number(graphicsBudget?.maxRuntimeAssetBytes),
    },
    {
      label: 'Largest runtime asset',
      value: formatBytes(largestRuntimeAssetBytes),
      budget: formatBytes(graphicsBudget?.maxRuntimeAssetFileBytes),
      overBudget:
        Number.isFinite(graphicsBudget?.maxRuntimeAssetFileBytes) &&
        largestRuntimeAssetBytes >
          Number(graphicsBudget?.maxRuntimeAssetFileBytes),
    },
    {
      label: 'Estimated draw calls',
      value: String(estimatedDrawCalls),
      budget: String(graphicsBudget?.maxEstimatedDrawCalls ?? 'unknown'),
      overBudget:
        Number.isFinite(graphicsBudget?.maxEstimatedDrawCalls) &&
        estimatedDrawCalls > Number(graphicsBudget?.maxEstimatedDrawCalls),
    },
    {
      label: 'Estimated triangles',
      value: String(estimatedTriangles),
      budget: String(graphicsBudget?.maxEstimatedTriangles ?? 'unknown'),
      overBudget:
        Number.isFinite(graphicsBudget?.maxEstimatedTriangles) &&
        estimatedTriangles > Number(graphicsBudget?.maxEstimatedTriangles),
    },
    {
      label: 'Material slots',
      value: String(authoredMaterialSlots),
      budget: String(graphicsBudget?.maxAuthoredMaterialSlots ?? 'unknown'),
      overBudget:
        Number.isFinite(graphicsBudget?.maxAuthoredMaterialSlots) &&
        authoredMaterialSlots >
          Number(graphicsBudget?.maxAuthoredMaterialSlots),
    },
    {
      label: 'Texture bytes',
      value: formatBytes(authoredTextureBytes),
      budget: formatBytes(graphicsBudget?.maxAuthoredTextureBytes),
      overBudget:
        Number.isFinite(graphicsBudget?.maxAuthoredTextureBytes) &&
        authoredTextureBytes > Number(graphicsBudget?.maxAuthoredTextureBytes),
    },
  ]
}

export function getEditorPublishReadinessTerrainManifestUrl(
  scene: EditorSceneDocument | null,
  runtimeScene: RuntimeSceneManifest | null,
) {
  return (
    runtimeScene?.runtime.terrainManifestUrl ??
    scene?.settings?.level?.ground?.terrainManifestUrl ??
    scene?.settings?.level?.collision?.terrain?.manifestUrl ??
    ''
  )
}

function addManifestContractSection(
  viewModel: EditorPublishReadinessViewModel,
  runtimeAssetManifest: RuntimeAssetCookManifest | null,
  runtimeAssetError: string,
) {
  if (!runtimeAssetManifest) {
    addSection(viewModel, {
      id: 'runtime-asset-manifest',
      label: 'Cooked Runtime Manifest',
      severity: 'blocker',
      detail: `Runtime asset manifest is unavailable: ${runtimeAssetError || 'not loaded'}.`,
    })
    addUniqueCommand(viewModel.commands, {
      id: 'cook-runtime-assets',
      command: getCookRuntimeAssetsCommand(viewModel),
      reason: 'Regenerate the runtime asset and scene manifests.',
    })
    return
  }

  const missingRuntimeContracts = [
    runtimeAssetManifest.streamingPolicy ? '' : 'streaming policy',
    runtimeAssetManifest.platformCertification ? '' : 'platform profiles',
    runtimeAssetManifest.contentBuild ? '' : 'content build',
    runtimeAssetManifest.impostorAtlas ? '' : 'impostor atlas',
  ].filter(Boolean)

  addSection(viewModel, {
    id: 'runtime-asset-manifest',
    label: 'Cooked Runtime Manifest',
    severity: missingRuntimeContracts.length ? 'blocker' : 'ready',
    detail: missingRuntimeContracts.length
      ? `Missing ${missingRuntimeContracts.join(', ')}.`
      : `${Object.keys(runtimeAssetManifest.assets ?? {}).length} assets with streaming, platform, provenance, and impostor contracts.`,
  })
}

function addAuthoringSceneSection(
  viewModel: EditorPublishReadinessViewModel,
  scene: EditorSceneDocument | null,
) {
  if (!scene) {
    addSection(viewModel, {
      id: 'authoring-scene',
      label: 'Authoring Scene',
      severity: 'blocker',
      detail: 'No editor scene document is loaded.',
    })
    return null
  }

  const sceneWithEngine = withEditorSceneEngineData(scene)
  const report = createLevelBuildReport(sceneWithEngine.engine!.levelDefinition)

  addSection(viewModel, {
    id: 'authoring-scene',
    label: 'Authoring Scene',
    severity: report.errors.length > 0 ? 'blocker' : 'ready',
    detail:
      report.errors.length > 0
        ? `${report.errors.length} authoring contract issue(s): ${report.errors
            .slice(0, 2)
            .join(' ')}`
        : `${report.actorCount} actors, ${getBuildReportRuntimeAssetUrls(report).length} runtime assets, ${getBuildReportRequiredAssetUrls(report).length} required assets.`,
  })

  for (const error of report.errors) {
    pushIssue(viewModel, {
      id: `authoring-${viewModel.blockers.length}`,
      label: 'Authoring Contract',
      severity: 'blocker',
      detail: error,
    })
  }

  return report
}

function addRuntimeSceneSection(
  viewModel: EditorPublishReadinessViewModel,
  scene: EditorSceneDocument | null,
  runtimeScene: RuntimeSceneManifest | null,
  runtimeSceneError: string,
  authoringReport: ReturnType<typeof createLevelBuildReport> | null,
) {
  if (!runtimeScene) {
    addSection(viewModel, {
      id: 'runtime-scene-manifest',
      label: 'Cooked Scene Manifest',
      severity: 'blocker',
      detail: `Cooked scene manifest is unavailable: ${runtimeSceneError || 'not loaded'}.`,
    })
    addUniqueCommand(viewModel.commands, {
      id: 'cook-runtime-assets',
      command: getCookRuntimeAssetsCommand(viewModel),
      reason: 'Create the missing cooked scene manifest.',
    })
    return
  }

  const validation = validateRuntimeSceneManifest(
    runtimeScene,
    viewModel.levelId,
  )
  const stale =
    Boolean(scene?.updatedAt && runtimeScene.source.updatedAt) &&
    scene?.updatedAt !== runtimeScene.source.updatedAt
  const assetMismatch =
    authoringReport !== null &&
    (!sameStringSet(
      getBuildReportRequiredAssetUrls(authoringReport),
      getRuntimeSceneRequiredAssetUrls(runtimeScene),
    ) ||
      !sameStringSet(
        getBuildReportRuntimeAssetUrls(authoringReport),
        getRuntimeSceneRuntimeAssetUrls(runtimeScene),
      ))
  const runtimeAssetUrls = getRuntimeSceneRuntimeAssetUrls(runtimeScene)
  const requiredAssetUrls = getRuntimeSceneRequiredAssetUrls(runtimeScene)
  const blockerDetails = [
    ...validation.errors,
    stale
      ? 'Authoring scene updatedAt does not match the cooked scene source.'
      : '',
    assetMismatch
      ? 'Authoring runtime asset sets do not match the cooked scene manifest.'
      : '',
  ].filter(Boolean)

  addSection(viewModel, {
    id: 'runtime-scene-manifest',
    label: 'Cooked Scene Manifest',
    severity: blockerDetails.length ? 'blocker' : 'ready',
    detail: blockerDetails.length
      ? blockerDetails.slice(0, 2).join(' ')
      : `${runtimeAssetUrls.length} cooked runtime assets, ${requiredAssetUrls.length} required.`,
  })

  if (blockerDetails.length) {
    addUniqueCommand(viewModel.commands, {
      id: 'cook-runtime-assets',
      command: getCookRuntimeAssetsCommand(viewModel),
      reason:
        'Refresh cooked scene contracts so they match the authoring document.',
    })
  }
}

function addRequiredAssetsSection(
  viewModel: EditorPublishReadinessViewModel,
  runtimeAssetManifest: RuntimeAssetCookManifest | null,
  runtimeScene: RuntimeSceneManifest | null,
) {
  const assets = runtimeAssetManifest?.assets ?? {}
  const requiredAssetUrls = getRuntimeSceneRequiredAssetUrls(runtimeScene)
  const missing = requiredAssetUrls.filter(url => {
    const asset = assets[url]
    if (!asset) return true
    return requiredRuntimeAssetLodTiers.some(
      tier => !asset.qualityVariants?.[tier]?.exists,
    )
  })

  addSection(viewModel, {
    id: 'required-assets',
    label: 'Required Assets',
    severity: missing.length ? 'blocker' : 'ready',
    detail: missing.length
      ? `${missing.length} required runtime asset(s) are missing from the manifest: ${missing.slice(0, 3).join(', ')}.`
      : `${requiredAssetUrls.length} required assets are present in cooked contracts.`,
  })

  if (missing.length) {
    addUniqueCommand(viewModel.commands, {
      id: 'cook-runtime-assets',
      command: getCookRuntimeAssetsCommand(viewModel),
      reason: 'Cook missing required runtime assets.',
    })
  }
}

function addImportMetadataSection(
  viewModel: EditorPublishReadinessViewModel,
  runtimeAssetManifest: RuntimeAssetCookManifest | null,
  runtimeScene: RuntimeSceneManifest | null,
) {
  const assets = runtimeAssetManifest?.assets ?? {}
  const sceneAssetUrls = getRuntimeSceneRuntimeAssetUrls(runtimeScene)
  const sceneAssets = sceneAssetUrls.map(url => assets[url]).filter(Boolean)
  const missing = sceneAssetUrls.filter(url => !assets[url]?.importMetadata?.id)
  const warnings = (
    runtimeAssetManifest?.importValidation?.warnings ?? []
  ).filter(warning => sceneAssetUrls.some(url => warning.startsWith(`${url}:`)))
  const manifestPath = runtimeAssetManifest?.importManifest?.path ?? ''

  addSection(viewModel, {
    id: 'asset-import-metadata',
    label: 'Import Metadata',
    severity: missing.length
      ? 'blocker'
      : warnings.length
        ? 'warning'
        : 'ready',
    detail: missing.length
      ? `${missing.length} scene asset(s) lack import metadata: ${missing.slice(0, 3).join(', ')}.`
      : warnings.length
        ? `${warnings.length} import metadata warning(s). ${warnings[0]}`
        : `${sceneAssets.length} scene asset import contract(s) resolved from ${manifestPath || 'the import manifest'}.`,
  })

  if (missing.length || warnings.length) {
    addUniqueCommand(viewModel.commands, {
      id: 'cook-runtime-assets',
      command: getCookRuntimeAssetsCommand(viewModel),
      reason: 'Validate runtime asset source import metadata.',
    })
  }
}

function addStyleBakeIssue(
  viewModel: EditorPublishReadinessViewModel,
  node: EditorSceneNode,
  required: boolean,
  detail: string,
) {
  pushIssue(viewModel, {
    id: `style-bake-${node.id}-${viewModel.blockers.length + viewModel.warnings.length}`,
    label: 'Style-Baked Asset',
    severity: required ? 'blocker' : 'warning',
    detail: `Actor "${node.id}": ${detail}`,
  })
}

function addStyleBakeProductsSection(
  viewModel: EditorPublishReadinessViewModel,
  scene: EditorSceneDocument | null,
  runtimeAssetManifest: RuntimeAssetCookManifest | null,
  runtimeScene: RuntimeSceneManifest | null,
  styleBakeMetadata: Record<string, LoadedManifest<StyleBakeMetadata>>,
) {
  const styleNodes = (scene?.nodes ?? []).filter(isEditorStyleBakeCandidate)
  const sceneRequiredRenderActorIds = new Set([
    ...getRuntimeSceneRequiredRenderActorIds(runtimeScene),
    ...(scene?.settings?.level?.runtimeAssets?.requiredRenderActorIds ?? []),
  ])
  const requiredAssetUrls = new Set(getRuntimeSceneRequiredAssetUrls(runtimeScene))
  const selectedTier = getStyleBakeSelectedTier(runtimeScene)
  let cleanCount = 0
  let needBakeCount = 0
  let staleSourceCount = 0
  let staleSettingsCount = 0
  let missingGeneratedCount = 0
  let missingMetadataCount = 0
  let notCookedCount = 0
  let overBudgetCount = 0
  let unusedTextureCount = 0

  for (const node of styleNodes) {
    const product = getNodeStyleBakeProduct(node)
    const assetUrl = normalizePublicUrl(
      product?.generatedAssetUrl ??
        product?.assetUrl ??
        node.asset?.url ??
        node.generation?.lastBakedAssetUrl,
    )
    const metadataUrl = getEditorStyleBakeMetadataUrl(node)
    const loadedMetadata = metadataUrl ? styleBakeMetadata[metadataUrl] : null
    const metadata = loadedMetadata?.value ?? null
    const sourceAssetUrl = normalizePublicUrl(
      product?.sourceAssetUrl ??
        metadata?.sourceAssetUrl ??
        node.generation?.originalAssetUrl,
    )
    const asset = getRuntimeAssetEntry(runtimeAssetManifest, assetUrl)
    const runtimeStyleBake = getRuntimeStyleBakeStatus(
      runtimeAssetManifest,
      assetUrl,
    )
    const required = Boolean(
      product?.required ||
        sceneRequiredRenderActorIds.has(node.id) ||
        requiredAssetUrls.has(assetUrl) ||
        asset?.required,
    )
    const nodeIssuesBefore =
      needBakeCount +
      staleSourceCount +
      staleSettingsCount +
      missingGeneratedCount +
      missingMetadataCount +
      notCookedCount +
      overBudgetCount +
      unusedTextureCount

    const productStatus = product?.state?.status ?? product?.status
    const needsBake =
      !assetUrl ||
      assetUrl === sourceAssetUrl ||
      assetUrl.startsWith('/generated/style-lab/sources/') ||
      productStatus === 'dirty' ||
      productStatus === 'stale' ||
      productStatus === 'missing' ||
      productStatus === 'failed'
    if (needsBake) {
      needBakeCount += 1
      addStyleBakeIssue(
        viewModel,
        node,
        required,
        productStatus === 'failed'
          ? `style bake failed${product?.state?.reason ? `: ${product.state.reason}` : ''}.`
          : 'needs a generated style-baked GLB before publish.',
      )
    }

    if (asset && asset.sourceExists === false) {
      missingGeneratedCount += 1
      addStyleBakeIssue(
        viewModel,
        node,
        required,
        `generated style asset is missing: ${assetUrl}.`,
      )
    } else if (!asset && assetUrl && runtimeAssetManifest) {
      missingGeneratedCount += 1
      addStyleBakeIssue(
        viewModel,
        node,
        required,
        `runtime asset cook manifest has no entry for generated style asset ${assetUrl}.`,
      )
    }

    const metadataKnownByRuntime =
      runtimeStyleBake &&
      runtimeStyleBake.status !== 'missing-generated-metadata'
    if (metadataUrl && !metadata && !metadataKnownByRuntime) {
      missingMetadataCount += 1
      addStyleBakeIssue(
        viewModel,
        node,
        required,
        `generated style metadata is unavailable: ${loadedMetadata?.error || metadataUrl}.`,
      )
    } else if (!metadataUrl && !runtimeStyleBake) {
      missingMetadataCount += 1
      addStyleBakeIssue(
        viewModel,
        node,
        required,
        'generated style metadata URL is missing.',
      )
    }

    const sceneSourceFingerprint = normalizeFingerprint(
      product?.sourceAssetFingerprint,
    )
    const metadataSourceFingerprint = normalizeFingerprint(
      metadata?.sourceAssetFingerprint ??
        runtimeStyleBake?.sourceAssetFingerprint,
    )
    const sourceMatch =
      runtimeStyleBake?.sourceAssetFingerprintMatches === false
        ? false
        : fingerprintsMatch(sceneSourceFingerprint, metadataSourceFingerprint)
    if (sourceMatch === false) {
      staleSourceCount += 1
      addStyleBakeIssue(
        viewModel,
        node,
        required,
        'source mesh fingerprint differs from the generated style metadata.',
      )
    }

    const sceneSettingsFingerprint = normalizeFingerprint(
      product?.settingsFingerprint,
    )
    const metadataSettingsFingerprint = normalizeFingerprint(
      getStyleMetadataSettingsFingerprint(metadata) ??
        runtimeStyleBake?.styleSettingsFingerprint,
    )
    const settingsMatch =
      runtimeStyleBake?.styleSettingsFingerprintMatches === false
        ? false
        : fingerprintsMatch(
            sceneSettingsFingerprint,
            metadataSettingsFingerprint,
          )
    if (settingsMatch === false) {
      staleSettingsCount += 1
      addStyleBakeIssue(
        viewModel,
        node,
        required,
        'style settings fingerprint differs from the generated style metadata.',
      )
    }

    const runtimeCooked =
      runtimeStyleBake?.runtimeCooked ??
      (asset
        ? requiredRuntimeAssetLodTiers.every(
            tier => asset.qualityVariants?.[tier]?.exists,
          )
        : false)
    if (assetUrl && runtimeAssetManifest && !runtimeCooked) {
      notCookedCount += 1
      addStyleBakeIssue(
        viewModel,
        node,
        required,
        'runtime asset cook has not produced all required style-baked LOD variants.',
      )
    }

    const selectedVariant = asset?.qualityVariants?.[selectedTier]
    const selectedMetadata = selectedVariant?.metadata ?? asset?.metadata
    const variantOversizedTextures = getVariantOversizedTextureCount(
      asset,
      selectedTier,
    )
    const sourceUnusedTextures = Number(asset?.metadata?.unusedTextureCount ?? 0)
    const cookedUnusedTextures =
      selectedMetadata && selectedMetadata !== asset?.metadata
        ? Number(selectedMetadata.unusedTextureCount ?? 0)
        : 0
    const variantUnusedTextures = sourceUnusedTextures + cookedUnusedTextures
    const styleBudgetOver =
      runtimeStyleBake?.budget?.overBudget === true ||
      variantOversizedTextures > 0
    if (styleBudgetOver) {
      overBudgetCount += 1
      addStyleBakeIssue(
        viewModel,
        node,
        false,
        `${selectedTier} style-baked texture budget is exceeded${variantOversizedTextures ? ` by ${variantOversizedTextures} texture(s)` : ''}.`,
      )
    }
    if (variantUnusedTextures > 0) {
      unusedTextureCount += 1
      addStyleBakeIssue(
        viewModel,
        node,
        required,
        `generated GLB contains ${variantUnusedTextures} unused texture payload(s) after prune/optimize.`,
      )
    }

    const nodeIssuesAfter =
      needBakeCount +
      staleSourceCount +
      staleSettingsCount +
      missingGeneratedCount +
      missingMetadataCount +
      notCookedCount +
      overBudgetCount +
      unusedTextureCount
    if (nodeIssuesAfter === nodeIssuesBefore) cleanCount += 1
  }

  const blockerCount = viewModel.blockers.filter(
    item => item.label === 'Style-Baked Asset',
  ).length
  const warningCount = viewModel.warnings.filter(
    item => item.label === 'Style-Baked Asset',
  ).length
  const issueCount = blockerCount + warningCount

  addSection(viewModel, {
    id: 'style-bake-products',
    label: 'Style-Baked Runtime Assets',
    severity: blockerCount ? 'blocker' : warningCount ? 'warning' : 'ready',
    detail: styleNodes.length
      ? issueCount
        ? `${cleanCount} clean, ${needBakeCount} need style bake, ${staleSourceCount} stale source, ${staleSettingsCount} stale settings, ${missingGeneratedCount} missing generated GLB, ${missingMetadataCount} missing metadata, ${notCookedCount} not runtime-cooked, ${overBudgetCount} over budget.`
        : `${cleanCount} style-baked object(s) have current metadata, cooked runtime products, and ${selectedTier} texture budgets.`
      : 'No style-baked products are required by this scene.',
  })

  if (
    needBakeCount ||
    staleSourceCount ||
    staleSettingsCount ||
    missingGeneratedCount ||
    missingMetadataCount ||
    unusedTextureCount
  ) {
    addUniqueCommand(viewModel.commands, {
      id: 'bake-style-assets',
      command: 'Editor: run Style Bake for required stale objects',
      reason:
        'Regenerate missing, stale, dirty, or malformed style-baked products.',
    })
  }
  if (notCookedCount || missingGeneratedCount) {
    addUniqueCommand(viewModel.commands, {
      id: 'cook-runtime-assets',
      command: getCookRuntimeAssetsCommand(viewModel),
      reason: 'Cook generated style-baked GLBs into runtime LOD products.',
    })
  }
  if (overBudgetCount) {
    addUniqueCommand(viewModel.commands, {
      id: 'report-graphics-backlog',
      command: 'pnpm --dir apps/game report:graphics-backlog',
      reason: 'Inspect over-budget style-baked texture content.',
    })
  }
}

function isVisualOnlyActor(scene: EditorSceneDocument, nodeId: string) {
  const actorIds = scene.settings?.level?.collision?.roles?.visualOnlyActorIds
  return Array.isArray(actorIds) && actorIds.includes(nodeId)
}

function getCollisionMode(collision: EditorSceneNode['collision']) {
  if (!collision) return 'none'
  if (collision.mode) return collision.mode
  if (collision.enabled === false || collision.intent === 'none') return 'none'
  if (collision.sensor || collision.intent === 'trigger') return 'trigger'
  return 'auto'
}

function isCollisionEnabled(collision: EditorSceneNode['collision']) {
  return getCollisionMode(collision) !== 'none'
}

function requiresMeshColliderMetadata(node: EditorSceneNode) {
  const collision = node.collision
  if (node.kind !== 'asset' || !isCollisionEnabled(collision)) return false
  return (
    collision?.shape === 'trimesh' ||
    collision?.quality === 'simplifiedMesh' ||
    collision?.quality === 'trimesh' ||
    collision?.quality === 'convexHull'
  )
}

function getCollisionTriangleBudget(collision: EditorSceneNode['collision']) {
  return collision?.maxTriangles ?? collision?.triangleBudget
}

function getCollisionValidationSeverity(node: EditorSceneNode) {
  const intent = node.collision?.intent
  return intent === 'detailMesh' || intent === 'none' ? 'warning' : 'blocker'
}

function pushColliderMetadataIssue(
  viewModel: EditorPublishReadinessViewModel,
  node: EditorSceneNode,
  detail: string,
) {
  pushIssue(viewModel, {
    id: `mesh-collider-${node.id}-${viewModel.blockers.length + viewModel.warnings.length}`,
    label: 'Mesh Collider Metadata',
    severity: getCollisionValidationSeverity(node),
    detail: `Actor "${node.id}": ${detail}`,
  })
}

function addMeshColliderMetadataSection(
  viewModel: EditorPublishReadinessViewModel,
  scene: EditorSceneDocument | null,
  colliderMetadata: Record<string, LoadedManifest<MeshColliderBakeMetadata>>,
) {
  const assetCollisionNodes = (scene?.nodes ?? []).filter(
    node =>
      requiresMeshColliderMetadata(node) &&
      !isVisualOnlyActor(scene!, node.id),
  )
  let validCount = 0
  let legacyCount = 0
  let staleCount = 0
  let driftCount = 0
  let missingCount = 0
  let dirtyCount = 0

  for (const node of assetCollisionNodes) {
    const collision = node.collision
    if (!collision) continue
    const generationDirty =
      collision.generationStatus === 'dirty' ||
      collision.generationStatus === 'generating' ||
      collision.generationStatus === 'failed'
    if (generationDirty) {
      dirtyCount += 1
      pushColliderMetadataIssue(
        viewModel,
        node,
        `generated collider status is ${collision.generationStatus}${collision.generationLastError ? `: ${collision.generationLastError}` : ''}.`,
      )
    }
    if (!collision.colliderUrl) {
      missingCount += 1
      pushColliderMetadataIssue(
        viewModel,
        node,
        'missing collision.colliderUrl.',
      )
      continue
    }
    if (!collision.colliderMetadataUrl && !collision.assetLocalTransform) {
      legacyCount += 1
      pushColliderMetadataIssue(
        viewModel,
        node,
        'missing collision.colliderMetadataUrl and inline asset-local metadata.',
      )
      continue
    }

    const loaded = collision.colliderMetadataUrl
      ? colliderMetadata[collision.colliderMetadataUrl]
      : null
    if (collision.colliderMetadataUrl && !loaded?.value) {
      missingCount += 1
      pushColliderMetadataIssue(
        viewModel,
        node,
        `collider metadata could not be loaded: ${loaded?.error || collision.colliderMetadataUrl}.`,
      )
      continue
    }

    const metadata: MeshColliderBakeMetadata = loaded?.value ?? {
      assetLocalTransform: collision.assetLocalTransform,
    }
    const transformValidation = validateAssetLocalTransformMetadata(metadata)
    if (transformValidation.state === 'missing') {
      legacyCount += 1
      pushColliderMetadataIssue(
        viewModel,
        node,
        'collider metadata is legacy and has no asset-local transform contract.',
      )
      continue
    }
    if (!transformValidation.valid || !transformValidation.metadata) {
      missingCount += 1
      pushColliderMetadataIssue(
        viewModel,
        node,
        `asset-local transform metadata is malformed: ${transformValidation.errors.join(' ')}`,
      )
      continue
    }

    const sourceAssetUrl =
      metadata.sourceAssetUrl ?? transformValidation.metadata.sourceAssetUrl
    if (node.asset?.url && sourceAssetUrl !== node.asset.url) {
      staleCount += 1
      pushColliderMetadataIssue(
        viewModel,
        node,
        `stale source asset URL ${sourceAssetUrl || 'unknown'} does not match ${node.asset.url}.`,
      )
    }

    const boundsComparison = compareAssetLocalBounds({
      visualLocalBounds:
        transformValidation.metadata.visualLocalBounds ??
        metadata.visualLocalBounds,
      colliderLocalBounds:
        transformValidation.metadata.colliderLocalBounds ??
        metadata.colliderLocalBounds ??
        metadata.bounds,
      tolerance: 0.05,
    })
    if (!boundsComparison.withinTolerance) {
      driftCount += 1
      pushColliderMetadataIssue(
        viewModel,
        node,
        `visual/collider local bounds drift exceeds tolerance (${boundsComparison.maxDelta.toFixed(3)}).`,
      )
    }

    const triangleBudget = getCollisionTriangleBudget(collision)
    if (
      Number.isFinite(metadata.triangleCount) &&
      Number.isFinite(triangleBudget) &&
      Number(metadata.triangleCount) > Number(triangleBudget)
    ) {
      pushColliderMetadataIssue(
        viewModel,
        node,
        `collider has ${metadata.triangleCount} triangles, exceeding budget ${triangleBudget}.`,
      )
    }

    if (
      sourceAssetUrl === node.asset?.url &&
      boundsComparison.withinTolerance &&
      !generationDirty
    ) {
      validCount += 1
    }
  }

  const issueCount =
    legacyCount + staleCount + driftCount + missingCount + dirtyCount
  addSection(viewModel, {
    id: 'mesh-collider-metadata',
    label: 'Mesh Collider Metadata',
    severity: viewModel.blockers.some(
      issue => issue.label === 'Mesh Collider Metadata',
    )
      ? 'blocker'
      : issueCount
        ? 'warning'
        : 'ready',
    detail: issueCount
      ? `${validCount} valid, ${legacyCount} legacy, ${staleCount} stale, ${driftCount} bounds drift, ${missingCount} missing or malformed, ${dirtyCount} dirty or failed.`
      : `${validCount} asset-local mesh collider contract(s) are valid.`,
  })

  if (issueCount) {
    addUniqueCommand(viewModel.commands, {
      id: 'bake-scene-mesh-colliders',
      command: `pnpm --dir apps/game bake:scene-mesh-colliders -- --level=${viewModel.levelId}`,
      reason:
        'Regenerate dirty, stale, legacy, or missing mesh collider metadata.',
    })
  }
}

function addSpawnSection(
  viewModel: EditorPublishReadinessViewModel,
  scene: EditorSceneDocument | null,
  runtimeScene: RuntimeSceneManifest | null,
) {
  const authoringSpawn = scene
    ? withEditorSceneEngineData(scene).engine?.levelDefinition.spawn.player
    : null
  const cookedSpawn = runtimeScene?.levelDefinition.spawn.player ?? null
  const blockers = [
    !isFiniteVec3(authoringSpawn)
      ? 'Authoring scene has no finite player spawn.'
      : '',
    runtimeScene && !isFiniteVec3(cookedSpawn)
      ? 'Cooked scene manifest has no finite player spawn.'
      : '',
  ].filter(Boolean)
  const mismatch =
    isFiniteVec3(authoringSpawn) &&
    isFiniteVec3(cookedSpawn) &&
    authoringSpawn.join(',') !== cookedSpawn.join(',')

  addSection(viewModel, {
    id: 'spawn-readiness',
    label: 'Spawn Gate',
    severity: blockers.length ? 'blocker' : mismatch ? 'warning' : 'ready',
    detail:
      blockers[0] ??
      (mismatch
        ? `Authoring spawn [${authoringSpawn.join(', ')}] differs from cooked spawn [${cookedSpawn.join(', ')}].`
        : `Player spawn [${(authoringSpawn ?? cookedSpawn ?? []).join(', ')}] is finite and represented in the runtime contract.`),
  })
}

function addTerrainSection(
  viewModel: EditorPublishReadinessViewModel,
  scene: EditorSceneDocument | null,
  runtimeScene: RuntimeSceneManifest | null,
  terrainManifest: TerrainManifest | null,
  terrainError: string,
  missingTerrainSourceAssets: EditorTerrainSourceAssetStatus[],
) {
  const terrainSettings = scene?.settings?.level?.collision?.terrain
  const groundSettings = scene?.settings?.level?.ground
  const renderChunks =
    terrainSettings?.renderChunks ?? groundSettings?.renderChunks
  const glbChunkTerrainRequested = isSourceGlbChunkTerrain({
    terrainRuntimeMode: terrainSettings?.runtimeMode,
    groundTerrainRuntimeMode: groundSettings?.terrainRuntimeMode,
    terrainVisualSource: terrainSettings?.visualSource,
    groundTerrainVisualSource: groundSettings?.terrainVisualSource,
    groundVisualSource: groundSettings?.visualSource,
    renderChunkType: renderChunks?.type,
    terrainSource: terrainSettings?.source,
  })
  const missingRequiredTerrainSourceAssets = glbChunkTerrainRequested
    ? missingTerrainSourceAssets.filter(
        source => source.sourceType === 'asset' || Boolean(source.url),
      )
    : []
  const firstMissingSource = missingRequiredTerrainSourceAssets[0]
  const missingSourceAssetMessage = firstMissingSource
    ? `Source asset missing: ${firstMissingSource.url || firstMissingSource.path || firstMissingSource.sourceName || 'unknown source'}. Place the exported source under apps/megameal/public or update the terrain source URL.`
    : ''
  const levelDefinition = scene
    ? withEditorSceneEngineData(scene).engine?.levelDefinition
    : runtimeScene?.levelDefinition
  const terrainManifestUrl = getEditorPublishReadinessTerrainManifestUrl(
    scene,
    runtimeScene,
  )
  const terrainAuthorityDiagnostics = levelDefinition
    ? getTerrainAuthorityDiagnostics({
        level: levelDefinition,
        manifest: terrainManifest,
        manifestUrl: terrainManifestUrl,
        enforceFinalAuthority: true,
      })
    : { errors: [], warnings: [] }
  const terrainAuthority = levelDefinition
    ? classifyTerrainAuthority({
        level: levelDefinition,
        manifest: terrainManifest,
        manifestUrl: terrainManifestUrl,
      })
    : null
  const terrainCollisionContractDiagnostics = terrainManifest
    ? validateTerrainManifestCollisionContract({
        manifest: terrainManifest,
        levelId: scene?.levelId ?? runtimeScene?.levelId,
        spawnPoint: levelDefinition?.spawn.player,
      })
    : { errors: [], warnings: [] }
  const requiresBakedTerrain =
    terrainAuthority?.mode === 'heightfield-terrain' ||
    terrainAuthority?.collisionSource === 'source-linked-terrain-collision'
  const terrainManifestRequired =
    requiresBakedTerrain || terrainAuthority?.mode === 'glb-chunk-terrain'
  const terrainProductsRequired = terrainAuthority?.mode !== 'scene-authored'
  const terrainChunksStale =
    Boolean(terrainSettings?.lastGeneratedAt) &&
    (!terrainSettings?.lastChunksGeneratedAt ||
      Date.parse(terrainSettings.lastChunksGeneratedAt) <
        Date.parse(terrainSettings.lastGeneratedAt ?? ''))
  const blockers = [
    missingSourceAssetMessage,
    terrainManifestRequired && !terrainManifestUrl
      ? 'Terrain manifest URL is missing.'
      : '',
    terrainProductsRequired && terrainSettings?.heightmapDirty
      ? 'Terrain source basket changed; generate the heightmap before publishing.'
      : '',
    terrainProductsRequired && terrainSettings?.dirty
      ? 'Terrain collision has editor changes that need a bake.'
      : '',
    terrainManifestRequired && terrainManifestUrl && !terrainManifest
      ? `Terrain manifest is unavailable: ${terrainError || terrainManifestUrl}.`
      : '',
    terrainManifestRequired &&
    terrainManifest &&
    !terrainManifest.collision?.terrain?.url
      ? 'Terrain manifest is missing a baked collision artifact.'
      : '',
    ...terrainAuthorityDiagnostics.errors,
    ...terrainCollisionContractDiagnostics.errors,
  ].filter(Boolean)
  const warnings = [
    ...terrainAuthorityDiagnostics.warnings,
    ...terrainCollisionContractDiagnostics.warnings,
    terrainManifestRequired &&
    terrainManifest &&
    !terrainManifest.visualChunks?.chunkCount &&
    terrainAuthority?.mode !== 'heightfield-terrain'
      ? 'Terrain manifest has no cooked visual chunks.'
      : '',
    requiresBakedTerrain && terrainChunksStale
      ? 'Terrain visual chunks are older than the current heightmap/collision state.'
      : '',
  ].filter(Boolean)

  addSection(viewModel, {
    id: 'terrain-collision',
    label: 'Collision And Ground',
    severity: blockers.length
      ? 'blocker'
      : warnings.length
        ? 'warning'
        : 'ready',
    detail:
      blockers[0] ??
      warnings[0] ??
      (terrainManifestRequired
        ? `Baked terrain collision ${terrainManifest?.collision?.terrain?.url ?? terrainManifestUrl} with ${terrainManifest?.visualChunks?.chunkCount ?? 0} visual chunks.`
        : 'Scene-authored collision path is active.'),
  })

  if (terrainSettings?.dirty) {
    addUniqueCommand(viewModel.commands, {
      id: 'bake-terrain-collision',
      command: 'pnpm --dir apps/game bake:terrain-collision',
      reason: 'Bake dirty terrain collision edits.',
    })
  }
  if (terrainSettings?.heightmapDirty) {
    addUniqueCommand(viewModel.commands, {
      id: 'generate-heightmap',
      command: 'pnpm --dir apps/game generate:terrain-heightmap',
      reason: 'Generate Heightmap from the recorded terrain source.',
    })
  }
  if (warnings.length || terrainChunksStale) {
    addUniqueCommand(viewModel.commands, {
      id: glbChunkTerrainRequested
        ? 'cook-terrain-glb-chunks'
        : 'cook-terrain-chunks',
      command: glbChunkTerrainRequested
        ? 'pnpm --dir apps/game cook:terrain-glb-chunks'
        : 'pnpm --dir apps/game cook:terrain-chunks',
      reason: terrainChunksStale
        ? 'Cook terrain visual chunks after heightmap or collision changes.'
        : 'Cook missing terrain visual chunks.',
    })
  }
  if (missingRequiredTerrainSourceAssets.length > 0) {
    addUniqueCommand(viewModel.commands, {
      id: 'cook-terrain-glb-chunks',
      command: 'pnpm --dir apps/game cook:terrain-glb-chunks',
      reason:
        'Restore the recorded source GLB/GLTF before cooking terrain chunks.',
    })
  }
}

function addGraphicsSection(
  viewModel: EditorPublishReadinessViewModel,
  runtimeAssetManifest: RuntimeAssetCookManifest | null,
  runtimeScene: RuntimeSceneManifest | null,
  graphicsBudget: SharedLevelGraphicsBudgetSettings['graphicsBudget'] | null,
) {
  const metrics = calculateRuntimeBudgetMetrics(
    runtimeAssetManifest,
    runtimeScene,
    graphicsBudget,
  )
  viewModel.metrics.push(...metrics)
  const overBudget = metrics.filter(metric => metric.overBudget)

  addSection(viewModel, {
    id: 'graphics-budget',
    label: 'Graphics Budget',
    severity: overBudget.length ? 'warning' : 'ready',
    detail: overBudget.length
      ? `${overBudget.map(metric => metric.label).join(', ')} over budget.`
      : 'Runtime asset bytes, file size, draw calls, triangles, materials, and textures are within declared budgets.',
  })

  if (overBudget.length) {
    addUniqueCommand(viewModel.commands, {
      id: 'report-graphics-backlog',
      command: 'pnpm --dir apps/game report:graphics-backlog',
      reason: 'Inspect over-budget graphics content and reduction candidates.',
    })
  }
}

function addMaterialAndLodSections(
  viewModel: EditorPublishReadinessViewModel,
  runtimeAssetManifest: RuntimeAssetCookManifest | null,
) {
  const materialBacklog = countMaterialBacklog(runtimeAssetManifest)
  const materialExceptions = countMaterialExceptions(runtimeAssetManifest)
  const materialBlockers =
    materialBacklog.missingReferences + materialBacklog.unsupportedExtensions
  addSection(viewModel, {
    id: 'material-backlog',
    label: 'Material Backlog',
    severity: materialBlockers
      ? 'blocker'
      : materialExceptions
        ? 'warning'
        : 'ready',
    detail: materialBlockers
      ? `${materialBacklog.missingReferences} missing texture reference(s), ${materialBacklog.unsupportedExtensions} unsupported material extension(s).`
      : materialExceptions
        ? `${materialExceptions} approved missing recommended PBR slot exception(s).`
        : 'No material blockers or approved exception backlog in the runtime manifest.',
  })

  const missingLodVariants = countMissingLodVariants(runtimeAssetManifest)
  const lodMisses = countLodMisses(runtimeAssetManifest)
  const impostorCount = runtimeAssetManifest?.impostorAtlas?.entryCount ?? 0
  const lodBlockers = missingLodVariants + lodMisses
  addSection(viewModel, {
    id: 'lod-impostors',
    label: 'LOD And Impostors',
    severity: lodBlockers ? 'blocker' : 'ready',
    detail: missingLodVariants
      ? `${missingLodVariants} cooked LOD variant(s) are missing.`
      : lodMisses
        ? `${lodMisses} LOD variant(s) miss target simplification policy.`
      : `${impostorCount} impostor atlas entr${impostorCount === 1 ? 'y' : 'ies'} and no LOD target misses.`,
  })

  if (lodBlockers) {
    addUniqueCommand(viewModel.commands, {
      id: 'cook-runtime-assets-build',
      command: getCookRuntimeAssetsCommand(
        viewModel,
        'cook:runtime-assets:build',
      ),
      reason: 'Generate every runtime LOD variant and manifest metadata.',
    })
  }
}

function addPrefabSection(
  viewModel: EditorPublishReadinessViewModel,
  scene: EditorSceneDocument | null,
  prefabManifest: RuntimePrefabManifest | null,
  prefabError: string,
) {
  const scenePrefabKeys = new Set(
    (scene?.nodes ?? [])
      .filter(node => node.prefab)
      .map(node => getPrefabKey(node.prefab?.type, node.prefab?.variant)),
  )
  const bakedPrefabKeys = new Set(
    (prefabManifest?.prefabs ?? []).map(prefab =>
      getPrefabKey(prefab.type, prefab.variant),
    ),
  )
  const missing = [...scenePrefabKeys].filter(key => !bakedPrefabKeys.has(key))

  addSection(viewModel, {
    id: 'prefab-contract',
    label: 'Prefab Contract',
    severity: !prefabManifest || missing.length ? 'blocker' : 'ready',
    detail: !prefabManifest
      ? `Runtime prefab manifest is unavailable: ${prefabError || 'not loaded'}.`
      : missing.length
        ? `${missing.length} scene prefab contract(s) are not baked: ${missing.join(', ')}.`
        : `${prefabManifest.summary?.prefabCount ?? bakedPrefabKeys.size} baked prefab contracts cover scene prefab usage.`,
  })

  if (!prefabManifest || missing.length) {
    addUniqueCommand(viewModel.commands, {
      id: 'bake-runtime-prefabs',
      command: 'pnpm --dir apps/game bake:runtime-prefabs',
      reason: 'Refresh baked runtime prefab artifacts and contract manifest.',
    })
  }
}

export function buildEditorPublishReadinessViewModel(input: {
  levelId: string
  scene: EditorSceneDocument | null
  runtimeAssetManifest: RuntimeAssetCookManifest | null
  runtimeAssetError?: string
  runtimeScene: RuntimeSceneManifest | null
  runtimeSceneError?: string
  prefabManifest: RuntimePrefabManifest | null
  prefabError?: string
  terrainManifest: TerrainManifest | null
  terrainError?: string
  terrainSourceAssets?: EditorTerrainSourceAssetStatus[]
  missingTerrainSourceAssets?: EditorTerrainSourceAssetStatus[]
  colliderMetadata?: Record<string, LoadedManifest<MeshColliderBakeMetadata>>
  styleBakeMetadata?: Record<string, LoadedManifest<StyleBakeMetadata>>
}): EditorPublishReadinessViewModel {
  const viewModel = createEmptyEditorPublishReadinessViewModel(input.levelId)
  const authoringReport = addAuthoringSceneSection(viewModel, input.scene)
  addManifestContractSection(
    viewModel,
    input.runtimeAssetManifest,
    input.runtimeAssetError ?? '',
  )
  addRuntimeSceneSection(
    viewModel,
    input.scene,
    input.runtimeScene,
    input.runtimeSceneError ?? '',
    authoringReport,
  )
  addRequiredAssetsSection(
    viewModel,
    input.runtimeAssetManifest,
    input.runtimeScene,
  )
  addImportMetadataSection(
    viewModel,
    input.runtimeAssetManifest,
    input.runtimeScene,
  )
  addMeshColliderMetadataSection(
    viewModel,
    input.scene,
    input.colliderMetadata ?? {},
  )
  addStyleBakeProductsSection(
    viewModel,
    input.scene,
    input.runtimeAssetManifest,
    input.runtimeScene,
    input.styleBakeMetadata ?? {},
  )
  addSpawnSection(viewModel, input.scene, input.runtimeScene)
  addTerrainSection(
    viewModel,
    input.scene,
    input.runtimeScene,
    input.terrainManifest,
    input.terrainError ?? '',
    input.missingTerrainSourceAssets ?? [],
  )
  addGraphicsSection(
    viewModel,
    input.runtimeAssetManifest,
    input.runtimeScene,
    getGraphicsBudget(input.scene, input.runtimeScene),
  )
  addMaterialAndLodSections(viewModel, input.runtimeAssetManifest)
  addPrefabSection(
    viewModel,
    input.scene,
    input.prefabManifest,
    input.prefabError ?? '',
  )
  addPublishReadinessProductionPanels(
    viewModel,
    input.runtimeAssetManifest,
    input.runtimeScene,
  )

  addUniqueCommand(viewModel.commands, {
    id: 'audit-engine',
    command: 'pnpm --dir apps/game audit:engine',
    reason: 'Verify editor readiness against the engine audit gates.',
  })
  addPublishReadinessWorkflow(viewModel, input.scene)

  viewModel.buildId = input.runtimeAssetManifest?.contentBuild?.buildId ?? ''
  viewModel.generatedAt =
    input.runtimeScene?.generatedAt ??
    input.runtimeAssetManifest?.generatedAt ??
    ''
  viewModel.status =
    viewModel.blockers.length > 0
      ? 'blocker'
      : viewModel.warnings.length > 0
        ? 'warning'
        : 'ready'
  viewModel.headline =
    viewModel.status === 'ready'
      ? 'Publish ready'
      : viewModel.status === 'warning'
        ? 'Publish ready with warnings'
        : 'Publish blocked'

  return viewModel
}
