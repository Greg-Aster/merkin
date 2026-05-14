import type { RuntimeSceneManifest } from '../engine/runtimeSceneManifest'
import type {
  EditorPublishReadinessItem,
  EditorPublishReadinessPanel,
  EditorPublishReadinessSeverity,
  EditorPublishReadinessViewModel,
  EditorPublishWorkflowStep,
  RuntimeAssetCookManifest,
} from './editorPublishReadinessContracts'
import type { EditorSceneDocument } from './editorTypes'

function getWorstSeverity(
  items: EditorPublishReadinessItem[],
): EditorPublishReadinessSeverity {
  if (items.some(item => item.severity === 'blocker')) return 'blocker'
  if (items.some(item => item.severity === 'warning')) return 'warning'
  return 'ready'
}

function addPanel(
  viewModel: EditorPublishReadinessViewModel,
  panel: Omit<EditorPublishReadinessPanel, 'severity'>,
) {
  viewModel.panels.push({
    ...panel,
    severity: getWorstSeverity(panel.items),
  })
}

function getSectionsById(
  sections: EditorPublishReadinessItem[],
  ids: string[],
) {
  const idSet = new Set(ids)
  return sections.filter(section => idSet.has(section.id))
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

function countSceneAssetsByStatus(
  runtimeAssetManifest: RuntimeAssetCookManifest | null,
  runtimeScene: RuntimeSceneManifest | null,
) {
  const sceneAssets = getRuntimeAssetsForScene(
    runtimeAssetManifest,
    runtimeScene,
  )
  let required = 0
  let optional = 0
  let missingVariants = 0

  for (const asset of sceneAssets) {
    if (asset.required) required += 1
    else optional += 1
    const variants = Object.values(asset.qualityVariants ?? {})
    if (variants.length > 0 && !variants.some(variant => variant?.exists)) {
      missingVariants += 1
    }
  }

  return {
    required,
    optional,
    missingVariants,
    total: sceneAssets.length,
  }
}

export function addPublishReadinessProductionPanels(
  viewModel: EditorPublishReadinessViewModel,
  runtimeAssetManifest: RuntimeAssetCookManifest | null,
  runtimeScene: RuntimeSceneManifest | null,
) {
  const assetStatus = countSceneAssetsByStatus(
    runtimeAssetManifest,
    runtimeScene,
  )
  const assetImportItems: EditorPublishReadinessItem[] = [
    ...getSectionsById(viewModel.sections, [
      'authoring-scene',
      'runtime-asset-manifest',
      'runtime-scene-manifest',
      'required-assets',
      'prefab-contract',
    ]),
    {
      id: 'scene-runtime-asset-status',
      label: 'Scene Asset Coverage',
      severity:
        assetStatus.missingVariants > 0 ? 'blocker' : ('ready' as const),
      detail: `${assetStatus.total} runtime assets in scene, ${assetStatus.required} required, ${assetStatus.optional} optional, ${assetStatus.missingVariants} missing cooked variants.`,
    },
  ]

  addPanel(viewModel, {
    id: 'asset-import',
    label: 'Asset Import Status',
    items: assetImportItems,
  })
  addPanel(viewModel, {
    id: 'material-compliance',
    label: 'Material Compliance',
    items: getSectionsById(viewModel.sections, ['material-backlog']),
  })
  addPanel(viewModel, {
    id: 'lod-impostors',
    label: 'LOD And Impostor Status',
    items: getSectionsById(viewModel.sections, ['lod-impostors']),
  })
  addPanel(viewModel, {
    id: 'collision-render-parity',
    label: 'Collision / Render Parity',
    items: getSectionsById(viewModel.sections, [
      'terrain-collision',
      'spawn-readiness',
    ]),
  })
  addPanel(viewModel, {
    id: 'streaming-world-partition',
    label: 'Streaming / World Partition',
    items: getSectionsById(viewModel.sections, [
      'runtime-asset-manifest',
      'runtime-scene-manifest',
    ]),
  })
}

function addWorkflowStep(
  viewModel: EditorPublishReadinessViewModel,
  step: EditorPublishWorkflowStep,
) {
  if (viewModel.workflow.some(existing => existing.id === step.id)) return
  viewModel.workflow.push(step)
}

export function addPublishReadinessWorkflow(
  viewModel: EditorPublishReadinessViewModel,
  scene: EditorSceneDocument | null,
) {
  const commandIds = new Set(viewModel.commands.map(command => command.id))
  const terrainDirty = Boolean(
    scene?.settings?.level?.collision?.terrain?.dirty,
  )

  addWorkflowStep(viewModel, {
    id: 'save-authoring-scene',
    label: 'Save authoring scene',
    command: 'Editor: Save Scene',
    expectedOutput: 'Updated scene JSON for the active level.',
    reason:
      'Publish starts from the current editor document, not stale disk state.',
    required: true,
  })

  addWorkflowStep(viewModel, {
    id: 'generate-heightmap',
    label: 'Generate Heightmap',
    command: 'pnpm --dir apps/game generate:terrain-heightmap',
    expectedOutput:
      'Heightmap image, terrain manifest bounds, and source provenance.',
    reason: commandIds.has('generate-heightmap')
      ? 'Terrain source basket changed.'
      : 'Required only when heightfield terrain sources changed.',
    required: commandIds.has('generate-heightmap'),
  })

  addWorkflowStep(viewModel, {
    id: 'bake-terrain-collision',
    label: 'Bake Terrain Collision',
    command: 'pnpm --dir apps/game bake:terrain-collision',
    expectedOutput: 'Terrain collision manifest and collider artifacts.',
    reason: terrainDirty
      ? 'Terrain collision has dirty editor edits.'
      : 'Required only when terrain collision inputs changed.',
    required: terrainDirty || commandIds.has('bake-terrain-collision'),
  })

  addWorkflowStep(viewModel, {
    id: 'cook-terrain-chunks',
    label: 'Cook Heightfield Chunks',
    command: 'pnpm --dir apps/game cook:terrain-chunks',
    expectedOutput:
      'Runtime terrain chunk meshes referenced by terrain manifest.',
    reason: commandIds.has('cook-terrain-chunks')
      ? 'Terrain visual chunks are missing from the manifest.'
      : 'Required only when terrain visuals or heightmap changed.',
    required: commandIds.has('cook-terrain-chunks'),
  })

  addWorkflowStep(viewModel, {
    id: 'bake-runtime-prefabs',
    label: 'Bake runtime prefabs',
    command: 'pnpm --dir apps/game bake:runtime-prefabs',
    expectedOutput: 'Runtime prefab GLBs and prefab manifest.',
    reason: commandIds.has('bake-runtime-prefabs')
      ? 'Scene prefab contracts are missing or stale.'
      : 'Required only when prefab source contracts changed.',
    required: commandIds.has('bake-runtime-prefabs'),
  })

  addWorkflowStep(viewModel, {
    id: 'cook-runtime-assets',
    label: 'Cook runtime assets and manifests',
    command: commandIds.has('cook-runtime-assets-build')
      ? 'pnpm --dir apps/game cook:runtime-assets:build'
      : 'pnpm --dir apps/game cook:runtime-assets',
    expectedOutput:
      'Runtime asset manifest, scene manifests, LOD metadata, and impostor atlas.',
    reason: commandIds.has('cook-runtime-assets')
      ? 'Cooked runtime contracts are missing or stale.'
      : commandIds.has('cook-runtime-assets-build')
        ? 'LOD variants need a full recook.'
        : 'Refresh runtime manifests before publishing.',
    required:
      commandIds.has('cook-runtime-assets') ||
      commandIds.has('cook-runtime-assets-build'),
  })

  addWorkflowStep(viewModel, {
    id: 'run-audits',
    label: 'Validate Terrain Contract',
    command: 'pnpm --dir apps/game audit:engine',
    expectedOutput:
      'Engine architecture, runtime asset, terrain, and partition audit report.',
    reason: 'Publishing must prove the same contracts used by runtime gates.',
    required: true,
  })

  addWorkflowStep(viewModel, {
    id: 'runtime-smoke',
    label: 'Runtime smoke',
    command:
      'GAME_NO_SERVER=1 GAME_DEV_PORT=4345 pnpm --dir apps/game smoke:boot',
    expectedOutput:
      'Gameplay, editor mode, and migrated levels boot without console warnings or errors.',
    reason:
      'Final publish confidence comes from the same browser readiness gate used by CI.',
    required: true,
  })
}
