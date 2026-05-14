import {
  compareAssetLocalBounds,
  validateAssetLocalTransformMetadata,
} from '../engine/assetLocalTransform'
import { isEditorProxyCollision } from '../engine/editorProxyCollision'
import {
  classifyTerrainAuthority,
  getTerrainAuthorityDiagnostics,
} from '../engine/groundContract'
import { createLevelBuildReport } from '../engine/levelValidation'
import {
  type RuntimeSceneManifest,
  getBuildReportRequiredAssetUrls,
  getBuildReportRuntimeAssetUrls,
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

function addUniqueCommand(
  commands: EditorPublishReadinessCommand[],
  command: EditorPublishReadinessCommand,
) {
  if (commands.some(existing => existing.command === command.command)) return
  commands.push(command)
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
      command: 'pnpm --dir apps/game cook:runtime-assets',
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
      command: 'pnpm --dir apps/game cook:runtime-assets',
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
      command: 'pnpm --dir apps/game cook:runtime-assets',
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
    const variants = Object.values(asset.qualityVariants ?? {})
    return variants.length > 0 && !variants.some(variant => variant?.exists)
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
      command: 'pnpm --dir apps/game cook:runtime-assets',
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
      command: 'pnpm --dir apps/game cook:runtime-assets',
      reason: 'Validate runtime asset source import metadata.',
    })
  }
}

function isVisualOnlyActor(scene: EditorSceneDocument, nodeId: string) {
  const actorIds = scene.settings?.level?.collision?.roles?.visualOnlyActorIds
  return Array.isArray(actorIds) && actorIds.includes(nodeId)
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
      node.kind === 'asset' &&
      node.collision?.enabled !== false &&
      node.collision?.intent !== 'none' &&
      !isVisualOnlyActor(scene!, node.id),
  )
  let validCount = 0
  let legacyCount = 0
  let staleCount = 0
  let driftCount = 0
  let missingCount = 0

  for (const node of assetCollisionNodes) {
    const collision = node.collision
    if (!collision) continue
    if (isEditorProxyCollision(collision)) {
      missingCount += 1
      pushColliderMetadataIssue(
        viewModel,
        node,
        'uses an editor proxy collider and needs a baked mesh collider before publishing.',
      )
      continue
    }
    if (collision.shape !== 'trimesh') continue
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

    if (
      Number.isFinite(metadata.triangleCount) &&
      Number.isFinite(collision.triangleBudget) &&
      Number(metadata.triangleCount) > Number(collision.triangleBudget)
    ) {
      pushColliderMetadataIssue(
        viewModel,
        node,
        `collider has ${metadata.triangleCount} triangles, exceeding budget ${collision.triangleBudget}.`,
      )
    }

    if (
      sourceAssetUrl === node.asset?.url &&
      boundsComparison.withinTolerance
    ) {
      validCount += 1
    }
  }

  const issueCount = legacyCount + staleCount + driftCount + missingCount
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
      ? `${validCount} valid, ${legacyCount} legacy, ${staleCount} stale, ${driftCount} bounds drift, ${missingCount} missing or malformed.`
      : `${validCount} asset-local mesh collider contract(s) are valid.`,
  })

  if (issueCount) {
    addUniqueCommand(viewModel.commands, {
      id: 'bake-scene-mesh-colliders',
      command: `pnpm --dir apps/game bake:scene-mesh-colliders -- --level=${viewModel.levelId} --force`,
      reason: 'Regenerate stale or legacy mesh collider metadata.',
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
    severity: overBudget.length ? 'blocker' : 'ready',
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

  const lodMisses = countLodMisses(runtimeAssetManifest)
  const impostorCount = runtimeAssetManifest?.impostorAtlas?.entryCount ?? 0
  addSection(viewModel, {
    id: 'lod-impostors',
    label: 'LOD And Impostors',
    severity: lodMisses ? 'blocker' : 'ready',
    detail: lodMisses
      ? `${lodMisses} LOD variant(s) miss target simplification policy.`
      : `${impostorCount} impostor atlas entr${impostorCount === 1 ? 'y' : 'ies'} and no LOD target misses.`,
  })

  if (lodMisses) {
    addUniqueCommand(viewModel.commands, {
      id: 'cook-runtime-assets-build',
      command: 'pnpm --dir apps/game cook:runtime-assets:build',
      reason: 'Regenerate runtime LOD variants and manifest metadata.',
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
