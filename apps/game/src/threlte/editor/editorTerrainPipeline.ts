import { classifyTerrainAuthority } from '../engine/groundContract'
import type { EditorSceneDocument } from '../engine/sceneDocumentTypes'
import { isSourceGlbChunkTerrain } from './editorTerrainModeGuards'

export type EditorTerrainPipelineMode =
  | 'scene-authored'
  | 'glb-chunk-terrain'

export type EditorTerrainPipelineStatusState =
  | 'ready'
  | 'warning'
  | 'blocked'
  | 'inactive'

export type EditorTerrainPipelineCommandId =
  | 'bake-terrain'
  | 'cook-glb-chunks'
  | 'bake-terrain-collision'
  | 'validate-terrain-contract'
  | 'publish-level'

export type EditorTerrainPipelineCommandState = {
  id: EditorTerrainPipelineCommandId
  label: string
  enabled: boolean
  reason: string
}

export type EditorTerrainBakeStep =
  | 'collision'
  | 'source-glb-chunks'
  | 'validation'

export type EditorTerrainPipelineStatus = {
  label: string
  state: EditorTerrainPipelineStatusState
  detail: string
}

export type EditorTerrainSourceAssetStatus = {
  nodeId?: string
  sourceName?: string
  sourceType?: 'asset' | 'primitive' | 'scene-node' | string
  url?: string
  exists?: boolean
  path?: string
  detail?: string
}

export type EditorTerrainStatusSnapshot = {
  sourceAssets?: EditorTerrainSourceAssetStatus[]
  missingSourceAssets?: EditorTerrainSourceAssetStatus[]
}

export type EditorTerrainPipelineState = {
  mode: EditorTerrainPipelineMode
  modeLabel: string
  authoritySummary: string
  requiredAction: string
  authoritativeVisualSource: string
  visualSource: string
  collisionSource: string
  sourceGlbUrls: string[]
  sourceAssets: EditorTerrainSourceAssetStatus[]
  missingSourceAssets: EditorTerrainSourceAssetStatus[]
  sourceHash: string
  sourceProvenance: string
  manifestUrl: string
  renderChunkStatus: EditorTerrainPipelineStatus
  collisionStatus: EditorTerrainPipelineStatus
  sourceExistenceStatus: EditorTerrainPipelineStatus
  fallbackSurfaceStatus: EditorTerrainPipelineStatus
  dirtyStatus: EditorTerrainPipelineStatus
  publishStatus: EditorTerrainPipelineStatus
  blockers: string[]
  warnings: string[]
  commands: EditorTerrainPipelineCommandState[]
  chunksStale: boolean
  hasCollider: boolean
  hasChunks: boolean
  hasSource: boolean
}

type TerrainSettings = NonNullable<
  NonNullable<
    NonNullable<EditorSceneDocument['settings']>['level']
  >['collision']
>['terrain']

type TerrainBakeStepPlannerTerrain = {
  dirty?: boolean
  colliderUrl?: string
  metadataUrl?: string
  lastGeneratedAt?: string
  lastChunksGeneratedAt?: string
  chunksPath?: string
  chunkCount?: number
} | null

export function planEditorTerrainBakeSteps(input: {
  pipeline: Pick<
    EditorTerrainPipelineState,
    'mode' | 'hasCollider' | 'hasSource'
  >
  terrain?: TerrainBakeStepPlannerTerrain
  terrainSculptEnabled?: boolean
  groundMode?: string | null
  groundVisualSource?: string | null
  groundTerrainVisualSource?: string | null
  groundTerrainRuntimeMode?: string | null
  terrainRuntimeMode?: string | null
  terrainVisualSource?: string | null
  renderChunkType?: string | null
}): EditorTerrainBakeStep[] {
  const { pipeline, terrain } = input
  if (pipeline.mode === 'scene-authored') return ['validation']
  const steps: EditorTerrainBakeStep[] = []
  steps.push('source-glb-chunks')
  if (
    Boolean(terrain?.dirty) ||
    !pipeline.hasCollider ||
    !terrain?.colliderUrl ||
    !terrain?.metadataUrl
  ) {
    steps.push('collision')
  }
  steps.push('validation')
  return steps
}

function uniqueStrings(values: Array<string | undefined | null>) {
  return Array.from(
    new Set(values.map(value => String(value ?? '').trim()).filter(Boolean)),
  )
}

function isRuntimeGltfUrl(value: string) {
  const normalized = value.trim()
  return (
    normalized.startsWith('/') &&
    /\.(glb|gltf)$/i.test(normalized.split('?')[0] ?? '')
  )
}

function uniqueSourceStatuses(values: EditorTerrainSourceAssetStatus[]) {
  const seen = new Set<string>()
  return values.filter(source => {
    const key =
      source.url ??
      source.path ??
      source.nodeId ??
      source.sourceName ??
      JSON.stringify(source)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function isIsoDateBefore(left: string | undefined, right: string | undefined) {
  if (!left || !right) return false
  const leftTime = Date.parse(left)
  const rightTime = Date.parse(right)
  return Number.isFinite(leftTime) && Number.isFinite(rightTime)
    ? leftTime < rightTime
    : false
}

function getTerrainSettings(scene: EditorSceneDocument | null) {
  return scene?.settings?.level?.collision?.terrain ?? null
}

function getSourceHash(terrain: TerrainSettings | null) {
  const fingerprint =
    (terrain as any)?.sourceAssetFingerprint ??
    (terrain as any)?.provenance?.sourceAssetFingerprint ??
    null
  const value = String(fingerprint?.value ?? '').trim()
  if (!value) return ''
  const algorithm = String(fingerprint?.algorithm ?? 'hash').trim()
  return `${algorithm}:${value.slice(0, 12)}`
}

function getSourceProvenance(terrain: TerrainSettings | null) {
  const generatedAt =
    String((terrain as any)?.provenance?.generatedAt ?? '').trim() ||
    String((terrain as any)?.lastGeneratedAt ?? '').trim()
  if (generatedAt) return `generated ${generatedAt}`
  return 'provenance unavailable'
}

function getTerrainMode(
  scene: EditorSceneDocument | null,
): EditorTerrainPipelineMode {
  const authority = classifyTerrainAuthority({
    level: {
      id: scene?.levelId ?? '',
      settings: scene?.settings as Record<string, unknown> | undefined,
    },
  })
  if (
    authority.mode === 'scene-authored' ||
    authority.mode === 'glb-chunk-terrain'
  ) {
    return authority.mode === 'glb-chunk-terrain'
      ? 'glb-chunk-terrain'
      : 'scene-authored'
  }

  const terrain = getTerrainSettings(scene)
  const ground = scene?.settings?.level?.ground
  const runtimeMode = terrain?.runtimeMode ?? ground?.terrainRuntimeMode
  const terrainVisualSource =
    terrain?.visualSource ?? ground?.terrainVisualSource
  const renderChunks = terrain?.renderChunks ?? ground?.renderChunks
  if (
    isSourceGlbChunkTerrain({
      terrainRuntimeMode: runtimeMode,
      groundTerrainRuntimeMode: ground?.terrainRuntimeMode,
      terrainVisualSource: terrain?.visualSource,
      groundTerrainVisualSource: ground?.terrainVisualSource,
      groundVisualSource: ground?.visualSource,
      renderChunkType: renderChunks?.type,
      terrainSource: terrain?.source,
    })
  ) {
    return 'glb-chunk-terrain'
  }
  return 'scene-authored'
}

function getModeLabel(mode: EditorTerrainPipelineMode) {
  if (mode === 'glb-chunk-terrain') return 'GLB Chunk Terrain'
  return 'Scene-Authored Terrain'
}

function getAuthoritativeVisualSource(
  mode: EditorTerrainPipelineMode,
  visualSource: string,
) {
  if (mode === 'glb-chunk-terrain') return 'Cooked GLB chunks'
  if (visualSource === 'scene-actors') return 'Scene actors'
  return 'Scene-authored ground'
}

function getAuthoritySummary(input: {
  modeLabel: string
  visualSource: string
  collisionSource: string
}) {
  return `${input.modeLabel}: visual=${input.visualSource}, collision=${input.collisionSource}`
}

function getMissingSourceAssetMessage(source: EditorTerrainSourceAssetStatus) {
  const sourceUrl =
    source.url || source.path || source.sourceName || 'unknown source'
  return `Source asset missing: ${sourceUrl}. Place the exported source under apps/megameal/public or update the terrain source URL.`
}

export function describeEditorTerrainPipeline(input: {
  scene: EditorSceneDocument | null
  selectedTerrainSourceName?: string
  selectedTerrainSourceAssetUrl?: string
  terrainStatus?: EditorTerrainStatusSnapshot | null
}): EditorTerrainPipelineState {
  const scene = input.scene
  const terrain = getTerrainSettings(scene)
  const ground = scene?.settings?.level?.ground
  const mode = getTerrainMode(scene)
  const visualSource =
    ground?.terrainVisualSource ??
    terrain?.visualSource ??
    ground?.visualSource ??
    'scene-actors'
  const collisionSource = ground?.collisionSource ?? 'scene-colliders'
  const sourceGlbUrls = uniqueStrings([
    input.selectedTerrainSourceAssetUrl,
    terrain?.sourceAssetUrl,
    ...((terrain?.sourceAssetUrls ?? []) as string[]),
  ]).filter(isRuntimeGltfUrl)
  const sourceNodeCount = Number(terrain?.sourceNodeIds?.length ?? 0)
  const sourceAssets = input.terrainStatus?.sourceAssets ?? []
  const sourceAssetStatusesForRecordedUrls = sourceGlbUrls
    .map(url => sourceAssets.find(source => source.url === url))
    .filter((source): source is EditorTerrainSourceAssetStatus =>
      Boolean(source),
    )
  const statusMissingSourceAssets =
    input.terrainStatus?.missingSourceAssets ??
    sourceAssets.filter(source => source.exists === false)
  const missingSourceAssets = uniqueSourceStatuses(
    [
      ...statusMissingSourceAssets,
      ...sourceAssetStatusesForRecordedUrls.filter(
        source => source.exists === false,
      ),
    ].filter(source => source.sourceType === 'asset' || Boolean(source.url)),
  )
  const hasExternalSourceUrls = sourceGlbUrls.length > 0
  const hasSourceStatus = hasExternalSourceUrls
    ? sourceGlbUrls.every(url =>
        sourceAssets.some(source => source.url === url),
      )
    : sourceAssets.length > 0
  const sourceAssetMissing = missingSourceAssets.length > 0
  const missingSourceAssetMessage = sourceAssetMissing
    ? getMissingSourceAssetMessage(missingSourceAssets[0])
    : ''
  const hasSource =
    hasExternalSourceUrls ||
    Boolean(terrain?.sourceNodeId) ||
    sourceNodeCount > 0 ||
    Boolean(input.selectedTerrainSourceName || terrain?.sourceName)
  const manifestUrl = terrain?.manifestUrl ?? ground?.terrainManifestUrl ?? ''
  const terrainProductsRequired = mode !== 'scene-authored'
  const hasCollider =
    terrainProductsRequired &&
    Boolean(terrain?.colliderUrl && terrain?.metadataUrl)
  const hasChunks =
    terrainProductsRequired &&
    Boolean(terrain?.chunksPath && terrain?.chunkCount)
  const chunksStale =
    Boolean(terrain?.lastGeneratedAt) &&
    (!terrain?.lastChunksGeneratedAt ||
      isIsoDateBefore(terrain.lastChunksGeneratedAt, terrain.lastGeneratedAt))
  const collisionDirty = terrainProductsRequired && Boolean(terrain?.dirty)
  const blockers = [
    mode === 'scene-authored' && collisionSource !== 'scene-colliders'
      ? 'Scene-authored terrain must use authored scene colliders, not baked terrain collision.'
      : '',
    mode === 'glb-chunk-terrain' && !hasSource
      ? 'Source GLB chunk terrain needs a recorded GLB/GLTF source asset.'
      : '',
    mode === 'glb-chunk-terrain' && sourceAssetMissing
      ? missingSourceAssetMessage
      : '',
  ].filter(Boolean)
  const warnings = [
    mode === 'scene-authored' && Boolean(terrain?.chunksPath)
      ? 'Scene-authored mode has leftover terrain chunk metadata.'
      : '',
    mode === 'scene-authored' && Boolean(manifestUrl)
      ? 'Scene-authored terrain has a stale terrain manifest reference.'
      : '',
  ].filter(Boolean)

  const renderChunkStatus: EditorTerrainPipelineStatus =
    mode === 'glb-chunk-terrain'
        ? {
            label: 'Render chunks',
            state: hasChunks ? 'ready' : 'blocked',
            detail: hasChunks
              ? terrain?.chunksPath ?? 'chunks recorded'
              : 'Cook GLB Chunks is required',
          }
        : {
            label: 'Render chunks',
            state: 'inactive',
            detail: 'scene actors own visual terrain',
          }

  const collisionStatus: EditorTerrainPipelineStatus =
    mode === 'scene-authored'
      ? {
          label: 'Collision',
          state: collisionSource === 'scene-colliders' ? 'ready' : 'warning',
          detail:
            collisionSource === 'scene-colliders'
              ? 'scene colliders own terrain collision'
              : `configured as ${collisionSource}`,
        }
      : {
          label: 'Collision',
          state: hasCollider && !collisionDirty ? 'ready' : 'blocked',
          detail: collisionDirty
            ? 'dirty collision edits need Bake Terrain Collision'
            : hasCollider
              ? terrain?.colliderUrl ?? 'baked collision recorded'
              : 'baked collision artifact or metadata missing',
        }

  const sourceExistenceStatus: EditorTerrainPipelineStatus = sourceAssetMissing
    ? {
        label: 'Source asset',
        state: 'blocked',
        detail: missingSourceAssetMessage,
      }
    : sourceGlbUrls.length > 0
      ? {
          label: 'Source asset',
          state: hasSourceStatus ? 'ready' : 'warning',
          detail: hasSourceStatus
            ? `${sourceGlbUrls[0]} exists under apps/megameal/public`
            : `${sourceGlbUrls[0]} recorded; source existence has not been checked yet.`,
        }
      : hasSource
        ? {
            label: 'Source asset',
            state: 'ready',
            detail: 'scene primitive or grouped source recorded',
          }
        : mode === 'scene-authored'
          ? {
              label: 'Source asset',
              state: 'inactive',
              detail:
                'scene-authored terrain does not require a terrain source asset',
            }
          : {
              label: 'Source asset',
              state: 'blocked',
              detail: 'no terrain source asset or source node is recorded',
            }

  const fallbackSurfaceStatus: EditorTerrainPipelineStatus =
    {
          label: 'Fallback surface',
          state: 'inactive',
          detail:
            mode === 'glb-chunk-terrain'
              ? 'no fallback surface is defined for GLB chunks'
              : 'not used by scene-authored terrain',
        }

  const dirtyStatus: EditorTerrainPipelineStatus = collisionDirty
      ? {
          label: 'Dirty state',
          state: 'blocked',
          detail: 'terrain collision changed',
        }
      : chunksStale
        ? {
            label: 'Dirty state',
            state: 'warning',
            detail: 'render chunks stale',
          }
        : {
            label: 'Dirty state',
            state: 'ready',
            detail: 'terrain products current',
          }

  const publishStatus: EditorTerrainPipelineStatus =
    blockers.length > 0
      ? {
          label: 'Publish',
          state: 'blocked',
          detail: blockers[0],
        }
      : warnings.length > 0
        ? {
            label: 'Publish',
            state: 'warning',
            detail: warnings[0],
          }
        : {
            label: 'Publish',
            state: 'ready',
            detail:
              mode === 'scene-authored'
                ? 'scene-authored terrain can publish'
                : 'terrain products can publish',
          }

  const commands: EditorTerrainPipelineCommandState[] = [
    {
      id: 'bake-terrain',
      label: 'Bake Terrain',
      enabled:
        mode === 'scene-authored'
          ? true
          : hasSource && !sourceAssetMissing,
      reason: sourceAssetMissing
        ? missingSourceAssetMessage
        : mode === 'scene-authored'
          ? 'Validate scene-authored ground actors and collision products.'
          : hasSource
              ? 'Cook source GLB chunks, then validate the terrain contract.'
              : 'Record a source GLB/GLTF asset before cooking runtime terrain chunks.',
    },
    {
      id: 'cook-glb-chunks',
      label: 'Cook GLB Chunks',
      enabled: mode === 'glb-chunk-terrain' && hasSource && !sourceAssetMissing,
      reason: sourceAssetMissing
        ? missingSourceAssetMessage
        : mode === 'glb-chunk-terrain'
          ? hasSource
            ? 'Cook render chunks directly from the recorded source GLB/GLTF asset.'
            : 'Record a source GLB/GLTF asset before cooking chunks.'
          : 'Only GLB chunk terrain uses this command.',
    },
    {
      id: 'bake-terrain-collision',
      label: 'Bake Terrain Collision',
      enabled:
        mode === 'glb-chunk-terrain' && hasSource && !sourceAssetMissing,
      reason: sourceAssetMissing
        ? missingSourceAssetMessage
        : mode === 'glb-chunk-terrain'
            ? hasSource
              ? 'Bake source-linked terrain collision from the recorded GLB terrain contract.'
              : 'Record a source GLB/GLTF asset before baking source-linked terrain collision.'
            : 'Scene-authored terrain uses actor collision.',
    },
    {
      id: 'validate-terrain-contract',
      label: 'Validate Terrain Contract',
      enabled: true,
      reason:
        'Validate visual ownership, collision, chunks, and fallback state.',
    },
    {
      id: 'publish-level',
      label: 'Publish Level',
      enabled: blockers.length === 0,
      reason:
        blockers[0] ??
        (mode === 'glb-chunk-terrain'
          ? 'Run the full source GLB chunk terrain publish flow.'
          : 'Run the full save, bake, validate, and publish flow.'),
    },
  ]

  const modeLabel = getModeLabel(mode)
  const requiredAction =
    blockers[0] ??
    warnings[0] ??
    (mode === 'scene-authored'
      ? 'Validate scene colliders and publish.'
      : mode === 'glb-chunk-terrain'
        ? 'Cook GLB chunks, bake source-linked collision if stale, then validate.'
        : 'Validate terrain contract.')

  return {
    mode,
    modeLabel,
    authoritySummary: getAuthoritySummary({
      modeLabel,
      visualSource,
      collisionSource,
    }),
    requiredAction,
    authoritativeVisualSource: getAuthoritativeVisualSource(mode, visualSource),
    visualSource,
    collisionSource,
    sourceGlbUrls,
    sourceAssets,
    missingSourceAssets,
    sourceHash: getSourceHash(terrain),
    sourceProvenance: getSourceProvenance(terrain),
    manifestUrl,
    renderChunkStatus,
    collisionStatus,
    sourceExistenceStatus,
    fallbackSurfaceStatus,
    dirtyStatus,
    publishStatus,
    blockers,
    warnings,
    commands,
    chunksStale,
    hasCollider,
    hasChunks,
    hasSource,
  }
}
