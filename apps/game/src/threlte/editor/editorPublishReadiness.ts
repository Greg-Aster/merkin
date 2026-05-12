import { createLevelBuildReport } from '../engine/levelValidation'
import {
  type RuntimeSceneManifest,
  validateRuntimeSceneManifest,
} from '../engine/runtimeSceneManifest'
import { withEditorSceneEngineData } from '../engine/sceneDocumentRuntime'
import {
  type EditorPublishReadinessCommand,
  type EditorPublishReadinessItem,
  type EditorPublishReadinessViewModel,
  type RuntimeAssetCookManifest,
  type RuntimePrefabManifest,
  type TerrainManifest,
  createEmptyEditorPublishReadinessViewModel,
} from './editorPublishReadinessContracts'
import {
  addPublishReadinessProductionPanels,
  addPublishReadinessWorkflow,
} from './editorPublishReadinessWorkflow'
import type {
  EditorSceneDocument,
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
  return (runtimeScene?.runtime.runtimeAssetUrls ?? [])
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
        : `${report.actorCount} actors, ${report.runtimeAssetUrls.length} runtime assets, ${report.requiredAssetUrls.length} required assets.`,
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
      authoringReport.requiredAssetUrls,
      runtimeScene.runtime.requiredAssetUrls,
    ) ||
      !sameStringSet(
        authoringReport.runtimeAssetUrls,
        runtimeScene.runtime.runtimeAssetUrls,
      ))
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
      : `${runtimeScene.runtime.runtimeAssetUrls.length} cooked runtime assets, ${runtimeScene.runtime.requiredAssetUrls.length} required.`,
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
  const missing = (runtimeScene?.runtime.requiredAssetUrls ?? []).filter(
    url => {
      const asset = assets[url]
      if (!asset) return true
      const variants = Object.values(asset.qualityVariants ?? {})
      return variants.length > 0 && !variants.some(variant => variant?.exists)
    },
  )

  addSection(viewModel, {
    id: 'required-assets',
    label: 'Required Assets',
    severity: missing.length ? 'blocker' : 'ready',
    detail: missing.length
      ? `${missing.length} required runtime asset(s) are missing from the manifest: ${missing.slice(0, 3).join(', ')}.`
      : `${runtimeScene?.runtime.requiredAssetUrls.length ?? 0} required assets are present in cooked contracts.`,
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
  const sceneAssetUrls = runtimeScene?.runtime.runtimeAssetUrls ?? []
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
) {
  const terrainSettings = scene?.settings?.level?.collision?.terrain
  const terrainManifestUrl = getEditorPublishReadinessTerrainManifestUrl(
    scene,
    runtimeScene,
  )
  const requiresBakedTerrain =
    terrainSettings?.source === 'baked-heightmap' ||
    scene?.settings?.level?.ground?.collisionSource === 'baked-heightfield' ||
    Boolean(terrainManifestUrl)
  const blockers = [
    requiresBakedTerrain && !terrainManifestUrl
      ? 'Terrain manifest URL is missing.'
      : '',
    terrainSettings?.dirty
      ? 'Terrain collision has editor changes that need a bake.'
      : '',
    requiresBakedTerrain && terrainManifestUrl && !terrainManifest
      ? `Terrain manifest is unavailable: ${terrainError || terrainManifestUrl}.`
      : '',
    requiresBakedTerrain &&
    terrainManifest &&
    !terrainManifest.collision?.terrain?.url
      ? 'Terrain manifest is missing a baked collision artifact.'
      : '',
  ].filter(Boolean)
  const warnings = [
    requiresBakedTerrain &&
    terrainManifest &&
    !terrainManifest.visualChunks?.chunkCount
      ? 'Terrain manifest has no cooked visual chunks.'
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
      (requiresBakedTerrain
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
  if (warnings.length) {
    addUniqueCommand(viewModel.commands, {
      id: 'cook-terrain-chunks',
      command: 'pnpm --dir apps/game cook:terrain-chunks',
      reason: 'Cook missing terrain visual chunks.',
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
  addSpawnSection(viewModel, input.scene, input.runtimeScene)
  addTerrainSection(
    viewModel,
    input.scene,
    input.runtimeScene,
    input.terrainManifest,
    input.terrainError ?? '',
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
