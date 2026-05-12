import type {
  EditorPublishBakePlan,
  EditorPublishBakeStep,
  EditorPublishBakeStepResult,
  EditorPublishBakeStepState,
  EditorPublishPipelineState,
  EditorPublishReadinessViewModel,
} from './editorPublishReadinessContracts'
import type { EditorSceneDocument } from './editorTypes'

export type EditorPublishBakePlanMetadata = {
  requiredCommandIds?: string[]
  runtimeSceneManifest?: {
    sourceUpdatedAt?: string
    runtimeAssetUrls?: string[]
    requiredAssetUrls?: string[]
    worldPartitionUrl?: string
    terrainManifestUrl?: string
  } | null
  runtimeSceneManifestMissing?: boolean
  runtimeSceneManifestError?: string
  terrainManifestMissing?: boolean
  terrainCollisionMissing?: boolean
  terrainChunksMissing?: boolean
  worldPartitionMissing?: boolean
  authoringRuntimeAssetUrls?: string[]
  dirty?: {
    actorTransforms?: boolean
    assetUrls?: boolean
    runtimeManifest?: boolean
    worldPartition?: boolean
  }
}

export type ComputeEditorPublishBakePlanInput = {
  levelId: string
  scene: EditorSceneDocument | null
  metadata?: EditorPublishBakePlanMetadata
}

export function createEditorPublishBakePlanMetadataFromReadiness(
  readiness: Pick<
    EditorPublishReadinessViewModel,
    'commands' | 'sections'
  > | null,
): EditorPublishBakePlanMetadata {
  const commandIds = readiness?.commands.map(command => command.id) ?? []
  const hasCommand = (id: string) => commandIds.includes(id)
  const hasSection = (id: string, severity: 'blocker' | 'warning' | 'ready') =>
    Boolean(
      readiness?.sections.some(
        section => section.id === id && section.severity === severity,
      ),
    )

  return {
    requiredCommandIds: commandIds,
    runtimeSceneManifestMissing: hasSection(
      'runtime-scene-manifest',
      'blocker',
    ),
    terrainCollisionMissing: hasSection('terrain-collision', 'blocker'),
    terrainChunksMissing: hasCommand('cook-terrain-chunks'),
    dirty: {
      runtimeManifest:
        hasCommand('cook-runtime-assets') ||
        hasCommand('cook-runtime-assets-build'),
    },
  }
}

export const EDITOR_PUBLISH_BAKE_STEPS: EditorPublishBakeStep[] = [
  'save-scene',
  'bake-terrain-collision',
  'cook-terrain-chunks',
  'cook-world-partition',
  'cook-runtime-assets',
  'audit-engine',
  'deploy-registry',
]

export const EDITOR_PUBLISH_BAKE_STEP_LABELS: Record<
  EditorPublishBakeStep,
  string
> = {
  'save-scene': 'Save authoring scene',
  'bake-terrain-collision': 'Bake terrain collision',
  'cook-terrain-chunks': 'Cook terrain chunks',
  'cook-world-partition': 'Cook world partition',
  'cook-runtime-assets': 'Cook runtime manifests',
  'audit-engine': 'Run engine audit',
  'deploy-registry': 'Deploy level registry',
}

const SKIPPED_REASONS: Record<EditorPublishBakeStep, string> = {
  'save-scene': 'Scene save is always required before publish.',
  'bake-terrain-collision':
    'Terrain collision inputs do not require a fresh bake.',
  'cook-terrain-chunks': 'Terrain visual chunks are already represented.',
  'cook-world-partition':
    'World partition settings are not enabled for this scene.',
  'cook-runtime-assets': 'Runtime manifests are always cooked before publish.',
  'audit-engine': 'Engine audit is always required before deploy.',
  'deploy-registry':
    'Registry deploy only runs after all required publish steps pass.',
}

function emptyReasons(): Record<EditorPublishBakeStep, string[]> {
  return {
    'save-scene': [],
    'bake-terrain-collision': [],
    'cook-terrain-chunks': [],
    'cook-world-partition': [],
    'cook-runtime-assets': [],
    'audit-engine': [],
    'deploy-registry': [],
  }
}

function hasMeaningfulSceneContent(scene: EditorSceneDocument | null) {
  return Boolean(scene?.nodes?.length)
}

function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  const rightSet = new Set(right)
  return left.every(value => rightSet.has(value))
}

function collectExplicitSceneAssetUrls(scene: EditorSceneDocument | null) {
  return Array.from(
    new Set(
      (scene?.nodes ?? [])
        .map(node => node.asset?.url)
        .filter((url): url is string => Boolean(url)),
    ),
  )
}

export function computeEditorPublishBakePlan(
  input: ComputeEditorPublishBakePlanInput,
): EditorPublishBakePlan {
  const reasons = emptyReasons()
  const blockers: string[] = []
  const warnings: string[] = []
  const steps = new Set<EditorPublishBakeStep>()
  const scene = input.scene
  const metadata = input.metadata ?? {}
  const hasRuntimeSceneMetadata = 'runtimeSceneManifest' in metadata
  const commandIds = new Set(metadata.requiredCommandIds ?? [])
  const levelSettings = scene?.settings?.level
  const terrain = levelSettings?.collision?.terrain
  const ground = levelSettings?.ground
  const worldPartition = levelSettings?.worldPartition
  const runtimeAssets = levelSettings?.runtimeAssets
  const terrainSculptEnabled = Boolean(levelSettings?.terrainSculpt?.enabled)
  const terrainDirty = Boolean(terrain?.dirty)
  const explicitAssetUrls = collectExplicitSceneAssetUrls(scene)
  const bakedTerrainEnabled =
    terrain?.source === 'baked-heightmap' ||
    terrain?.runtimeSource === 'generated-heightmap' ||
    terrain?.runtimeSource === 'editor-manifest' ||
    Boolean(terrain?.manifestUrl)
  const terrainChunkRuntimeRequested =
    terrainSculptEnabled ||
    ground?.mode === 'terrain-chunks' ||
    ground?.mode === 'hybrid' ||
    ground?.visualSource === 'terrain-chunks' ||
    Boolean(terrain?.chunksPath)

  steps.add('save-scene')
  reasons['save-scene'].push(
    'Publish starts by saving the current editor document to disk.',
  )

  if (!scene) {
    blockers.push('No scene document is loaded for publish.')
  } else if (!hasMeaningfulSceneContent(scene)) {
    blockers.push('Scene has no authored nodes and cannot be published.')
  }

  if (
    bakedTerrainEnabled &&
    (terrainDirty ||
      !terrain?.colliderUrl ||
      !terrain?.metadataUrl ||
      metadata.terrainManifestMissing ||
      metadata.terrainCollisionMissing ||
      commandIds.has('bake-terrain-collision'))
  ) {
    steps.add('bake-terrain-collision')
    if (terrainDirty) {
      reasons['bake-terrain-collision'].push(
        'Terrain collision has dirty editor edits.',
      )
    }
    if (!terrain?.colliderUrl || !terrain?.metadataUrl) {
      reasons['bake-terrain-collision'].push(
        'Terrain collision runtime artifacts are missing from scene settings.',
      )
    }
    if (metadata.terrainManifestMissing || metadata.terrainCollisionMissing) {
      reasons['bake-terrain-collision'].push(
        'Terrain manifest metadata reports missing collision output.',
      )
    }
    if (commandIds.has('bake-terrain-collision')) {
      reasons['bake-terrain-collision'].push(
        'Publish readiness requires a terrain collision bake.',
      )
    }
  } else {
    reasons['bake-terrain-collision'].push(
      SKIPPED_REASONS['bake-terrain-collision'],
    )
  }

  if (
    bakedTerrainEnabled &&
    terrainChunkRuntimeRequested &&
    (terrainDirty ||
      !terrain?.chunksPath ||
      !terrain?.chunkCount ||
      metadata.terrainChunksMissing ||
      commandIds.has('cook-terrain-chunks'))
  ) {
    steps.add('cook-terrain-chunks')
    if (terrainDirty) {
      reasons['cook-terrain-chunks'].push(
        'Terrain visuals may be stale because terrain inputs are dirty.',
      )
    }
    if (!terrain?.chunksPath || !terrain?.chunkCount) {
      reasons['cook-terrain-chunks'].push(
        'Terrain chunk runtime artifacts are missing from scene settings.',
      )
    }
    if (metadata.terrainChunksMissing) {
      reasons['cook-terrain-chunks'].push(
        'Terrain manifest metadata reports missing visual chunks.',
      )
    }
    if (commandIds.has('cook-terrain-chunks')) {
      reasons['cook-terrain-chunks'].push(
        'Publish readiness requires a terrain chunk cook.',
      )
    }
  } else {
    reasons['cook-terrain-chunks'].push(SKIPPED_REASONS['cook-terrain-chunks'])
  }

  if (
    worldPartition &&
    (worldPartition.dirty ||
      worldPartition.actorTransformsDirty ||
      metadata.dirty?.worldPartition ||
      metadata.dirty?.actorTransforms ||
      metadata.worldPartitionMissing ||
      !worldPartition.partitionUrl ||
      (metadata.runtimeSceneManifest?.worldPartitionUrl &&
        metadata.runtimeSceneManifest.worldPartitionUrl !==
          worldPartition.partitionUrl))
  ) {
    steps.add('cook-world-partition')
    if (worldPartition.dirty || metadata.dirty?.worldPartition) {
      reasons['cook-world-partition'].push(
        'World partition settings are marked dirty.',
      )
    }
    if (
      worldPartition.actorTransformsDirty ||
      metadata.dirty?.actorTransforms
    ) {
      reasons['cook-world-partition'].push(
        'Actor transform changes can alter world partition cell assignment.',
      )
    }
    if (metadata.worldPartitionMissing || !worldPartition.partitionUrl) {
      reasons['cook-world-partition'].push(
        'World partition runtime artifact is missing.',
      )
    }
    if (
      metadata.runtimeSceneManifest?.worldPartitionUrl &&
      metadata.runtimeSceneManifest.worldPartitionUrl !==
        worldPartition.partitionUrl
    ) {
      reasons['cook-world-partition'].push(
        'Cooked scene manifest references a different world partition artifact.',
      )
    }
  } else if (worldPartition) {
    reasons['cook-world-partition'].push(
      worldPartition.partitionUrl
        ? 'World partition artifact is recorded and no partition dirty marker is set.'
        : 'World partition settings exist but no partition artifact is recorded.',
    )
  } else {
    reasons['cook-world-partition'].push(
      SKIPPED_REASONS['cook-world-partition'],
    )
  }

  steps.add('cook-runtime-assets')
  if (
    metadata.runtimeSceneManifestMissing ||
    metadata.runtimeSceneManifestError ||
    (hasRuntimeSceneMetadata && !metadata.runtimeSceneManifest)
  ) {
    reasons['cook-runtime-assets'].push(
      metadata.runtimeSceneManifestError
        ? `Runtime scene manifest is unavailable: ${metadata.runtimeSceneManifestError}.`
        : 'Runtime scene manifest must exist before deploy.',
    )
  }
  if (
    scene?.updatedAt &&
    metadata.runtimeSceneManifest?.sourceUpdatedAt &&
    scene.updatedAt !== metadata.runtimeSceneManifest.sourceUpdatedAt
  ) {
    reasons['cook-runtime-assets'].push(
      'Authoring scene timestamp differs from the cooked runtime scene manifest.',
    )
  }
  if (
    metadata.authoringRuntimeAssetUrls &&
    metadata.runtimeSceneManifest?.runtimeAssetUrls &&
    !sameStringSet(
      metadata.authoringRuntimeAssetUrls,
      metadata.runtimeSceneManifest.runtimeAssetUrls,
    )
  ) {
    reasons['cook-runtime-assets'].push(
      'Authoring runtime asset URLs differ from the cooked scene manifest.',
    )
  }
  if (
    metadata.runtimeSceneManifest?.runtimeAssetUrls &&
    explicitAssetUrls.some(
      assetUrl =>
        !metadata.runtimeSceneManifest?.runtimeAssetUrls?.includes(assetUrl),
    )
  ) {
    reasons['cook-runtime-assets'].push(
      'One or more current scene asset URLs are missing from the cooked runtime scene manifest.',
    )
  }
  if (
    runtimeAssets?.dirty ||
    runtimeAssets?.assetUrlsDirty ||
    metadata.dirty?.runtimeManifest ||
    metadata.dirty?.assetUrls ||
    commandIds.has('cook-runtime-assets') ||
    commandIds.has('cook-runtime-assets-build')
  ) {
    reasons['cook-runtime-assets'].push(
      'Runtime asset or manifest dirty markers require a fresh cook.',
    )
  }
  if (commandIds.has('bake-runtime-prefabs')) {
    reasons['cook-runtime-assets'].push(
      'Runtime prefab contracts are missing or stale; engine audit will keep deploy blocked until prefab artifacts are rebuilt.',
    )
    warnings.push(
      'Runtime prefab baking is not a dedicated publish step yet; rebuild prefab artifacts before deploy if audit requires it.',
    )
  }
  reasons['cook-runtime-assets'].push(
    'Runtime scene manifests are cooked after scene, terrain, and partition outputs.',
  )

  steps.add('audit-engine')
  reasons['audit-engine'].push(
    'Engine audit must pass before the level is marked deployed.',
  )

  steps.add('deploy-registry')
  reasons['deploy-registry'].push(
    'Registry deployment happens only after the build and audit pass.',
  )

  return {
    levelId: input.levelId,
    steps: EDITOR_PUBLISH_BAKE_STEPS.filter(step => steps.has(step)),
    reasons,
    blockers,
    warnings,
  }
}

export type EditorPublishBakeStepRow = {
  id: EditorPublishBakeStep
  label: string
  state: EditorPublishBakeStepState
  statusLabel: string
  reasons: string[]
  message: string
  artifacts: string[]
  stdout: string
  stderr: string
}

function getStatusLabel(state: EditorPublishBakeStepState) {
  if (state === 'passed') return 'passed'
  if (state === 'failed') return 'failed'
  if (state === 'running') return 'running'
  if (state === 'skipped') return 'skipped'
  return 'pending'
}

function getResultState(
  plan: EditorPublishBakePlan,
  step: EditorPublishBakeStep,
  result?: EditorPublishBakeStepResult,
): EditorPublishBakeStepState {
  if (result?.state) return result.state
  return plan.steps.includes(step) ? 'pending' : 'skipped'
}

export function getEditorPublishBakeStepRows(
  plan: EditorPublishBakePlan,
  pipelineState: EditorPublishPipelineState | null,
): EditorPublishBakeStepRow[] {
  return EDITOR_PUBLISH_BAKE_STEPS.map(step => {
    const result =
      pipelineState?.plan?.levelId === plan.levelId
        ? pipelineState.stepResults[step]
        : undefined
    const state = getResultState(plan, step, result)
    return {
      id: step,
      label: EDITOR_PUBLISH_BAKE_STEP_LABELS[step],
      state,
      statusLabel: getStatusLabel(state),
      reasons: plan.reasons[step]?.length
        ? plan.reasons[step]
        : [SKIPPED_REASONS[step]],
      message: result?.message ?? '',
      artifacts: result?.artifacts ?? [],
      stdout: result?.stdout ?? '',
      stderr: result?.stderr ?? '',
    }
  })
}
