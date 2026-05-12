<script lang="ts">
import { T } from '@threlte/core'
import { createEventDispatcher, onDestroy, onMount } from 'svelte'
import { get } from 'svelte/store'
import { Color, Group, Quaternion, Vector3 } from 'three'
import AmbientAudioRegions from '../components/AmbientAudioRegions.svelte'
import AmbientParticleField from '../components/AmbientParticleField.svelte'
import SceneFogExp2 from '../components/SceneFogExp2.svelte'
import StarNavigationSystem from '../components/StarNavigationSystem.svelte'
import LevelManager from '../core/LevelManager.svelte'
import type { PlayerLevelPositionDetail } from '../core/levelRuntimeEvents'
import { createActorWorldMatrixResolver } from '../engine/actorHierarchy'
import {
  hasAuthoredGroundVisuals,
  shouldRenderTerrainVisualChunks,
} from '../engine/groundContract'
import {
  prefetchOptionalLevelRenderAssets,
  prepareRequiredLevelRenderAssets,
} from '../engine/levelAssetPreloader'
import { createLevelBuildReport } from '../engine/levelValidation'
import {
  endLevelRuntimeAssetScope,
  getLevelRuntimeAssetTier,
  getRuntimeProfileAssetTierForProfile,
} from '../engine/runtimeAssetManifest'
import { traceRuntimeCulling } from '../engine/runtimeCullingTrace'
import { usesLightweightRuntimeGameplayMarker } from '../engine/runtimeGameplayRenderPolicy'
import type { RuntimeGameplayData } from '../engine/runtimeGameplayTypes'
import { getRuntimePrefabAssetUrl } from '../engine/runtimePrefabRegistry'
import { loadRuntimeSceneDocument } from '../engine/runtimeSceneDocumentLoader'
import {
  type RuntimeWorldPartition,
  type RuntimeWorldPartitionCell,
  type RuntimeWorldPartitionCellRuntimeState,
  getWorldPartitionReadinessActorIds,
  loadRuntimeWorldPartition,
  resolveRuntimeWorldPartitionStreamingState,
} from '../engine/runtimeWorldPartition'
import type {
  RenderProfileVisualBookmark,
  SceneSettings,
} from '../engine/sceneDocumentTypes'
import type { ActorDefinition, LevelDefinition } from '../engine/types'
import { Ocean as OceanComponent, UnderwaterOverlay } from '../features/ocean'
import { underwaterStateStore } from '../features/ocean/stores/underwaterStore'
import {
  qualityLevelStore,
  recordSystemTiming,
} from '../features/performance/stores/performanceStore'
import TerrainRuntime from '../features/terrain/TerrainRuntime.svelte'
import {
  type TerrainRuntimeComponentData,
  type TerrainRuntimeComponentSource,
  loadTerrainRuntimeComponentData,
} from '../features/terrain/terrainManifest'
import { playerStateStore } from '../stores/gameStateStore'
import { setRuntimeDiagnostic } from '../stores/runtimeDiagnosticsStore'
import {
  replaceRuntimeRenderProfile,
  resetRuntimeRenderProfile,
  resolveRuntimeRenderProfile,
} from '../stores/runtimeRenderProfileStore'
import {
  clearRuntimeRenderedActors,
  setRequiredRuntimeRenderActors,
  setRuntimeActiveActors,
  setRuntimeLevelActors,
  setRuntimeRenderLifecyclePhase,
  setRuntimeRenderProfileDiagnostics,
} from '../stores/runtimeRenderRegistry'
import {
  clearRuntimeStreamingTelemetry,
  setRuntimeStreamingTelemetry,
} from '../stores/runtimeStreamingTelemetry'
import { buildRuntimeVisualStyleFromLevelSettings } from '../styles/GameplayStyleProfiles'
import {
  replaceRuntimeVisualStyle,
  resetRuntimeVisualStyle,
} from '../styles/runtimeVisualStyleStore'
import Skybox from '../systems/Skybox.svelte'
import StarMap from '../systems/StarMap.svelte'
import {
  evictUnusedGltfCacheEntries,
  getGltfCacheStats,
} from '../utils/gltfAssetCache'
import RuntimeActorBranch from './RuntimeActorBranch.svelte'
import SceneLighting from './SceneLighting.svelte'

type WorldPartitionSettings = {
  partitionUrl?: string
  cellSize?: number
  activeRadius?: number
}

const dispatch = createEventDispatcher()

export let levelId: string
export let position: [number, number, number] = [0, 0, 0]
export let editorEnabled = false
export let interactionSystem: any = null
export let timelineEvents: any[] = []

let levelDefinition: LevelDefinition | null = null
let levelActors: ActorDefinition[] = []
let rootActors: ActorDefinition[] = []
let renderActorsReady = false
let visibleActorIds = new Set<string>()
let actorRevealOrder: ActorDefinition[] = []
let actorRevealIndex = 0
let actorRevealFrame = 0
let actorRevealComplete: (() => void) | null = null
let playerPosition: [number, number, number] = [0, 0, 0]
let previousPlayerPosition: [number, number, number] | null = null
let starMapComponent: any = null
let starMapRef: Group
let loadToken = 0
let terrainRuntimeData: TerrainRuntimeComponentData | null = null
let terrainRuntimeReady = false
let worldPartition: RuntimeWorldPartition | null = null
let pendingSceneReady = false
let pendingSpawnPosition: [number, number, number] | null = null
let lastRuntimeAssetPrefetchKey = ''
let lastWorldPartitionPrefetchKey = ''
let lastWorldPartitionEvictionKey = ''
let selectedRuntimeAssetTier = 'medium'
let requiredRuntimeAssetCount = 0
let deferredOptionalRuntimeAssetCount = 0
let worldPartitionCellStates = new Map<
  string,
  RuntimeWorldPartitionCellRuntimeState
>()

const SKYBOX_PRESETS = {
  observatory: {
    path: '/assets/hdri/skywip4-cubemap/',
    files: [
      'px.webp',
      'nx.webp',
      'py.webp',
      'ny.webp',
      'pz.webp',
      'nz.webp',
    ] as [string, string, string, string, string, string],
  },
  classic: {
    path: '/assets/skyboxes/',
    files: [
      'px.webp',
      'nx.webp',
      'py.webp',
      'ny.webp',
      'pz.webp',
      'nz.webp',
    ] as [string, string, string, string, string, string],
  },
} as const

function getWorldPartitionSettings(
  settings: SceneSettings,
): WorldPartitionSettings | null {
  const levelSettings = settings.level as
    | (NonNullable<SceneSettings['level']> & {
        worldPartition?: WorldPartitionSettings
      })
    | undefined

  return levelSettings?.worldPartition ?? null
}

function getActorRevealBatchSize() {
  switch (get(qualityLevelStore)) {
    case 'ultra_low':
    case 'low':
      return 2
    case 'medium':
      return 4
    default:
      return 6
  }
}

function cancelActorReveal() {
  if (actorRevealFrame) {
    cancelAnimationFrame(actorRevealFrame)
    actorRevealFrame = 0
  }
  actorRevealComplete = null
}

function buildActorRevealOrder(actors: ActorDefinition[]) {
  const childrenByParent = new Map<string | null, ActorDefinition[]>()
  for (const actor of actors) {
    const parentId = actor.parentId ?? null
    const children = childrenByParent.get(parentId) ?? []
    children.push(actor)
    childrenByParent.set(parentId, children)
  }

  const orderedActors: ActorDefinition[] = []
  const visit = (actor: ActorDefinition) => {
    orderedActors.push(actor)
    const children = childrenByParent.get(actor.id) ?? []
    for (const child of children) {
      visit(child)
    }
  }

  for (const root of childrenByParent.get(null) ?? []) {
    visit(root)
  }

  return orderedActors
}

function revealNextActorBatch() {
  const startedAt = performance.now()
  const nextRevealIndex = Math.min(
    actorRevealOrder.length,
    actorRevealIndex + getActorRevealBatchSize(),
  )
  const nextVisibleActorIds = new Set(visibleActorIds)
  for (let index = actorRevealIndex; index < nextRevealIndex; index += 1) {
    const actor = actorRevealOrder[index]
    if (actor) nextVisibleActorIds.add(actor.id)
  }
  actorRevealIndex = nextRevealIndex
  visibleActorIds = nextVisibleActorIds
  recordSystemTiming('level.actorReveal', performance.now() - startedAt)

  if (actorRevealIndex < actorRevealOrder.length) {
    actorRevealFrame = requestAnimationFrame(revealNextActorBatch)
    return
  }

  actorRevealFrame = 0
  const complete = actorRevealComplete
  actorRevealComplete = null
  complete?.()
}

function startActorReveal(onComplete: () => void, actorIds?: Set<string>) {
  cancelActorReveal()
  actorRevealOrder = buildActorRevealOrder(levelActors).filter(
    actor => !actorIds || actorIds.has(actor.id),
  )
  actorRevealIndex = 0
  visibleActorIds = new Set<string>()
  actorRevealComplete = onComplete

  if (actorRevealOrder.length === 0) {
    actorRevealComplete = null
    onComplete()
    return
  }

  actorRevealFrame = requestAnimationFrame(revealNextActorBatch)
}

function collectRenderAssetUrlsForActorIds(
  actors: ActorDefinition[],
  actorIds: Set<string>,
) {
  return [
    ...new Set(
      actors
        .filter(actor => actorIds.has(actor.id))
        .flatMap(actor => {
          const urls = []
          const assetUrl = actor.render?.asset?.url
          if (assetUrl) urls.push(assetUrl)

          const prefab = actor.render?.prefab
          if (!usesLightweightRuntimeGameplayMarker(actor)) {
            const prefabAssetUrl = getRuntimePrefabAssetUrl(
              prefab?.type,
              prefab?.variant,
            )
            if (prefabAssetUrl) urls.push(prefabAssetUrl)
          }

          return urls
        })
        .filter((url): url is string => Boolean(url)),
    ),
  ]
}

function collectActorIdsForPartitionCells(
  cells: Array<{ actorIds: string[] }>,
) {
  return new Set(cells.flatMap(cell => cell.actorIds))
}

function setWorldPartitionCellState(
  cellKeys: string[],
  state: RuntimeWorldPartitionCellRuntimeState,
) {
  if (cellKeys.length === 0) return

  const nextStates = new Map(worldPartitionCellStates)
  for (const cellKey of cellKeys) {
    nextStates.set(cellKey, state)
  }
  worldPartitionCellStates = nextStates
}

function clearWorldPartitionCellStates(cellKeys: string[]) {
  if (cellKeys.length === 0) return

  const nextStates = new Map(worldPartitionCellStates)
  let changed = false
  for (const cellKey of cellKeys) {
    changed = nextStates.delete(cellKey) || changed
  }
  if (changed) worldPartitionCellStates = nextStates
}

function runWorldPartitionEviction(level: string, evictableCellKeys: string[]) {
  const evictionKey = `${level}|${evictableCellKeys.sort().join('|')}`
  if (evictionKey === lastWorldPartitionEvictionKey) return
  lastWorldPartitionEvictionKey = evictionKey

  setWorldPartitionCellState(evictableCellKeys, 'evicting')
  evictUnusedGltfCacheEntries({
    maxUnusedAgeMs: 2_000,
    maxUnreferencedEntries: 3,
    maxUnreferencedBytes: 64 * 1024 * 1024,
  })
  setWorldPartitionCellState(evictableCellKeys, 'evicted')
}

function queueRuntimeAssetPrefetch(
  level: string,
  sourceUrls: string[],
  reason: string,
) {
  const uniqueSourceUrls = [...new Set(sourceUrls)].filter(Boolean).sort()
  const prefetchKey = `${level}|${reason}|${uniqueSourceUrls.join('|')}`
  if (
    uniqueSourceUrls.length === 0 ||
    prefetchKey === lastRuntimeAssetPrefetchKey
  ) {
    return
  }
  lastRuntimeAssetPrefetchKey = prefetchKey

  void prefetchOptionalLevelRenderAssets(
    level,
    uniqueSourceUrls,
    get(qualityLevelStore),
    {
      maxTier: getRuntimeAssetTierCap(levelSettings),
      recordTiming: recordSystemTiming,
    },
  ).then(report => {
    setRuntimeDiagnostic('assetStreaming', {
      label: 'Asset Streaming',
      level: report.failures.length > 0 ? 'warning' : 'ready',
      message:
        report.failures.length > 0
          ? `${level}: ${report.failures.length} prefetched asset(s) failed for ${reason}.`
          : `${level}: prefetched ${report.resolvedUrls.length} active asset(s) for ${reason}.`,
      meta: {
        reason,
        prefetchBytes: report.prefetchBytes,
        sourceUrls: report.sourceUrls,
        resolvedUrls: report.resolvedUrls,
        failures: report.failures,
      },
    })
  })
}

function queueWorldPartitionCellPrefetch(
  level: string,
  cells: RuntimeWorldPartitionCell[],
) {
  const candidateCells = cells.filter(
    cell => worldPartitionCellStates.get(cell.key) !== 'ready',
  )
  const cellKeys = candidateCells.map(cell => cell.key).sort()
  const prefetchKey = `${level}|${cellKeys.join('|')}`
  if (
    candidateCells.length === 0 ||
    prefetchKey === lastWorldPartitionPrefetchKey
  ) {
    return
  }
  lastWorldPartitionPrefetchKey = prefetchKey
  setWorldPartitionCellState(cellKeys, 'requested')

  const sourceUrlsByCell = new Map(
    candidateCells.map(cell => [
      cell.key,
      collectRenderAssetUrlsForActorIds(
        levelActors,
        new Set(cell.actorIds),
      ).sort(),
    ]),
  )
  const sourceUrls = [
    ...new Set(Array.from(sourceUrlsByCell.values()).flat()),
  ].sort()

  if (sourceUrls.length === 0) {
    setWorldPartitionCellState(cellKeys, 'ready')
    return
  }

  setWorldPartitionCellState(cellKeys, 'loading')
  void prefetchOptionalLevelRenderAssets(
    level,
    sourceUrls,
    get(qualityLevelStore),
    {
      maxTier: getRuntimeAssetTierCap(levelSettings),
      recordTiming: recordSystemTiming,
    },
  ).then(report => {
    const failedSourceUrls = new Set(
      report.failures.map(failure => failure.sourceUrl),
    )
    const failedCellKeys = cellKeys.filter(cellKey =>
      sourceUrlsByCell
        .get(cellKey)
        ?.some(sourceUrl => failedSourceUrls.has(sourceUrl)),
    )
    const readyCellKeys = cellKeys.filter(
      cellKey => !failedCellKeys.includes(cellKey),
    )
    setWorldPartitionCellState(readyCellKeys, 'ready')
    setWorldPartitionCellState(failedCellKeys, 'failed')
    setRuntimeDiagnostic('assetStreaming', {
      label: 'Asset Streaming',
      level: report.failures.length > 0 ? 'warning' : 'ready',
      message:
        report.failures.length > 0
          ? `${level}: ${report.failures.length} prefetched asset(s) failed for ${cellKeys.length} partition cell(s).`
          : `${level}: prefetched ${report.resolvedUrls.length} asset(s) for ${cellKeys.length} partition cell(s).`,
      meta: {
        reason: 'prefetch-cells',
        cellKeys,
        readyCellKeys,
        failedCellKeys,
        prefetchBytes: report.prefetchBytes,
        sourceUrls: report.sourceUrls,
        resolvedUrls: report.resolvedUrls,
        failures: report.failures,
      },
    })
  })
}

function parseSceneColor(
  value: string | number | null | undefined,
  fallback: number,
) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return fallback

  const normalized = value.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return fallback

  return Number.parseInt(normalized, 16)
}

function resolveSpawnPosition(
  definition: LevelDefinition,
): [number, number, number] {
  const position = definition.spawn.player
  if (!position.every(component => Number.isFinite(component))) {
    throw new Error(
      `${definition.id}: level definition has an invalid player spawn.`,
    )
  }

  return [position[0], position[1], position[2]]
}

function resolveSpawnRotation(
  definition: LevelDefinition,
): [number, number, number] {
  const rotation = definition.spawn.rotation
  if (!rotation || !rotation.every(component => Number.isFinite(component))) {
    return [0, 0, 0]
  }

  return [rotation[0], rotation[1], rotation[2]]
}

function getRequestedVisualBookmarkId() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('visualBookmark')
}

function getVisualBookmarkSpawnPosition(
  definition: LevelDefinition,
  fallback: [number, number, number],
): [number, number, number] {
  const bookmarkId = getRequestedVisualBookmarkId()
  if (!bookmarkId) return fallback

  const settings = (definition.settings ?? {}) as SceneSettings
  const bookmarks = settings.level?.renderProfile?.visualBookmarks ?? []
  const bookmark = bookmarks.find(
    (entry: RenderProfileVisualBookmark) => entry.id === bookmarkId,
  )
  const position = bookmark?.playerPosition
  if (!position) return fallback

  return [position[0], position[1], position[2]]
}

function dispatchPlayerLevelPosition(
  level: string,
  spawnPosition: [number, number, number],
  spawnRotation: [number, number, number],
) {
  const detail: PlayerLevelPositionDetail = {
    levelId: level,
    position: spawnPosition,
    rotation: spawnRotation,
    reason: 'level_load',
    metadata: { levelName: level },
  }
  dispatch('playerLevelPosition', detail)
}

function getTerrainCollisionSettings(settings: SceneSettings) {
  return settings.level?.collision?.terrain as
    | {
        source?: string
        runtimeSource?: TerrainRuntimeComponentSource
        manifestUrl?: string
      }
    | undefined
}

async function loadSceneTerrainRuntimeData(
  level: string,
  settings: SceneSettings,
) {
  const terrainSettings = getTerrainCollisionSettings(settings)
  if (
    terrainSettings?.source !== 'baked-heightmap' ||
    !terrainSettings.manifestUrl
  ) {
    return null
  }

  const response = await fetch(terrainSettings.manifestUrl)
  if (!response.ok) {
    throw new Error(
      `${level}: failed to load terrain manifest ${terrainSettings.manifestUrl} (${response.status})`,
    )
  }

  const manifest = await response.json()
  return loadTerrainRuntimeComponentData({
    levelId: level,
    source: terrainSettings.runtimeSource ?? 'editor-manifest',
    manifest,
    manifestUrl: terrainSettings.manifestUrl,
    boundsFallback: manifest.physics?.bounds ?? null,
    showVisualSurface: !hasAuthoredGroundVisuals(settings),
    showVisualChunks: shouldRenderTerrainVisualChunks(level, settings),
  })
}

function activateSceneGameplay(
  level: string,
  spawnPosition: [number, number, number],
) {
  setRuntimeRenderLifecyclePhase({
    levelId: level,
    phase: 'player-activation-ready',
    message: `${level}: render lifecycle ready for player activation.`,
    detail: {
      spawnPosition,
      terrainRuntime: Boolean(terrainRuntimeData),
    },
  })
  dispatch('staticWorldReady', {
    levelId: level,
    source: terrainRuntimeData ? 'scene-document-terrain' : 'scene-document',
    metadata: {
      actorCount: levelActors.length,
      terrainRuntime: Boolean(terrainRuntimeData),
      player: sharedLevelSettings.player ?? null,
    },
  })
}

function requestSceneGameplayActivation(
  level: string,
  spawnPosition: [number, number, number],
) {
  pendingSceneReady = true
  pendingSpawnPosition = spawnPosition

  if (terrainRuntimeData && !terrainRuntimeReady) return

  pendingSceneReady = false
  pendingSpawnPosition = null
  activateSceneGameplay(level, spawnPosition)
}

function handleTerrainRuntimeReady() {
  terrainRuntimeReady = true
  if (!pendingSceneReady || !pendingSpawnPosition) return

  const spawnPosition = pendingSpawnPosition
  pendingSceneReady = false
  pendingSpawnPosition = null
  activateSceneGameplay(levelId, spawnPosition)
}

function getRuntimeAssetTierCap(settings: SceneSettings) {
  const levelSettings = settings.level as
    | {
        runtimeAssets?: { maxTier?: string }
        performance?: { assetTierCap?: string }
      }
    | undefined

  return (
    levelSettings?.runtimeAssets?.maxTier ??
    levelSettings?.performance?.assetTierCap
  )
}

function getRuntimeProfileOverride() {
  if (typeof window === 'undefined') return null
  return window.__gameRuntimeProfile ?? null
}

function getSelectedPlatformProfile() {
  const profile = getRuntimeProfileOverride()
  if (profile?.platformProfile) return profile.platformProfile
  const renderTier = resolvedRenderProfile?.tier
  return renderTier ?? null
}

async function loadSceneDocumentUnchecked(level: string, token: number) {
  setRuntimeRenderLifecyclePhase({
    levelId: level,
    phase: 'manifest-loading',
    message: `${level}: loading runtime scene manifest.`,
  })
  const loadedScene = await loadRuntimeSceneDocument(level)
  if (token !== loadToken) return

  terrainRuntimeData = null
  terrainRuntimeReady = false
  worldPartition = null
  clearRuntimeStreamingTelemetry(level)
  pendingSceneReady = false
  pendingSpawnPosition = null
  renderActorsReady = false
  visibleActorIds = new Set<string>()
  actorRevealOrder = []
  actorRevealIndex = 0
  previousPlayerPosition = null
  lastRuntimeAssetPrefetchKey = ''
  lastWorldPartitionPrefetchKey = ''
  lastWorldPartitionEvictionKey = ''
  selectedRuntimeAssetTier = 'medium'
  requiredRuntimeAssetCount = 0
  deferredOptionalRuntimeAssetCount = 0
  worldPartitionCellStates = new Map()
  cancelActorReveal()

  levelDefinition = loadedScene.levelDefinition
  const runtimeSceneSettings = (levelDefinition.settings ?? {}) as SceneSettings
  setRuntimeRenderLifecyclePhase({
    levelId: level,
    phase: 'manifest-ready',
    message: `${level}: runtime scene manifest loaded.`,
    detail: {
      actorCount: levelDefinition.actors.length,
      sceneVersion: levelDefinition.version,
    },
  })

  const defaultSpawnPosition = resolveSpawnPosition(levelDefinition)
  const spawnPosition = getVisualBookmarkSpawnPosition(
    levelDefinition,
    defaultSpawnPosition,
  )
  const spawnRotation = resolveSpawnRotation(levelDefinition)
  playerPosition = spawnPosition
  dispatchPlayerLevelPosition(level, spawnPosition, spawnRotation)

  terrainRuntimeData = await loadSceneTerrainRuntimeData(
    level,
    runtimeSceneSettings,
  )
  const worldPartitionSettings = getWorldPartitionSettings(runtimeSceneSettings)
  worldPartition = worldPartitionSettings
    ? await loadRuntimeWorldPartition(
        level,
        worldPartitionSettings.partitionUrl,
      )
    : null
  setRuntimeDiagnostic('worldPartition', {
    label: 'World Partition',
    level: worldPartition ? 'ready' : 'idle',
    message: worldPartition
      ? `${level}: ${worldPartition.cells.length} streamed cell(s), ${worldPartition.residentActorIds.length} resident actor(s), ${worldPartition.streamableActorIds.length} streamable actor(s).`
      : `${level}: world partition disabled.`,
    meta: worldPartition
      ? {
          levelId: level,
          cellSize: worldPartition.cellSize,
          activeRadius: worldPartition.activeRadius,
          cellCount: worldPartition.cells.length,
          residentActorCount: worldPartition.residentActorIds.length,
          streamableActorCount: worldPartition.streamableActorIds.length,
          readinessGates: worldPartition.streaming?.readinessGates ?? [],
          requiredInitialCellKeys:
            worldPartition.readiness?.requiredInitialCellKeys ?? [],
        }
      : { levelId: level },
  })
  if (token !== loadToken) return

  levelActors = levelDefinition.actors
  rootActors = levelActors.filter(actor => !actor.parentId)
  setRuntimeLevelActors(level, levelActors)
  if (token !== loadToken) return

  const buildReport = createLevelBuildReport(levelDefinition)
  clearRuntimeRenderedActors(level)
  setRequiredRuntimeRenderActors(level, buildReport.requiredRenderActorIds)
  traceRuntimeCulling({
    levelId: level,
    reason: 'level-render-gate',
    culled: true,
    detail: {
      status: 'contract',
      actorCount: buildReport.actorCount,
      requiredRenderActorIds: buildReport.requiredRenderActorIds,
      requiredAssetUrls: buildReport.requiredAssetUrls,
      buildErrors: buildReport.errors,
    },
  })
  const hasBuildErrors = buildReport.errors.length > 0
  const hasBuildWarnings = buildReport.warnings.length > 0
  setRuntimeDiagnostic('levelDefinition', {
    label: 'Level Definition',
    level: hasBuildErrors ? 'error' : hasBuildWarnings ? 'warning' : 'ready',
    message: hasBuildErrors
      ? `${buildReport.levelId}: level contract failed with ${buildReport.errors.length} errors.`
      : `${buildReport.levelId}: ${buildReport.actorCount} actors, ${buildReport.physicsActorCount} physics actors, ${buildReport.trimeshActorCount} trimesh actors, ${buildReport.detailMeshActorCount} detail mesh actors.`,
    meta: buildReport as unknown as Record<string, unknown>,
  })

  if (hasBuildErrors) {
    return
  }
  if (token !== loadToken) return

  const worldPartitionReadinessActorIds = worldPartition
    ? getWorldPartitionReadinessActorIds(worldPartition)
    : new Set(levelActors.map(actor => actor.id))
  const initialStreamingState = resolveRuntimeWorldPartitionStreamingState({
    partition: worldPartition,
    playerPosition: spawnPosition,
    allActorIds: levelActors.map(actor => actor.id),
  })
  if (
    worldPartition &&
    initialStreamingState.pendingRequiredCellKeys.length > 0
  ) {
    setRuntimeRenderLifecyclePhase({
      levelId: level,
      phase: 'error',
      message: `${level}: spawn is outside required initial streaming cells.`,
      detail: {
        spawnPosition,
        pendingRequiredCellKeys: initialStreamingState.pendingRequiredCellKeys,
        requiredCellKeys: initialStreamingState.requiredCellKeys,
        activeCellKeys: initialStreamingState.activeCellKeys,
      },
    })
    setRuntimeDiagnostic('worldPartitionStreaming', {
      label: 'Partition Streaming',
      level: 'error',
      message: `${level}: ${initialStreamingState.pendingRequiredCellKeys.length} required initial cell(s) are not active at spawn.`,
      meta: {
        spawnPosition,
        pendingRequiredCellKeys: initialStreamingState.pendingRequiredCellKeys,
        requiredCellKeys: initialStreamingState.requiredCellKeys,
        activeCellKeys: initialStreamingState.activeCellKeys,
      },
    })
    return
  }
  const initialActiveActorIds = initialStreamingState.activeActorIds
  const readinessAssetUrls = collectRenderAssetUrlsForActorIds(
    levelActors,
    worldPartitionReadinessActorIds,
  )
  const initialActiveAssetUrls = collectRenderAssetUrlsForActorIds(
    levelActors,
    initialActiveActorIds,
  )
  const requiredAssetUrls = [
    ...new Set([...buildReport.requiredAssetUrls, ...readinessAssetUrls]),
  ]
  setRuntimeRenderLifecyclePhase({
    levelId: level,
    phase: 'assets-preloading',
    message: `${level}: preloading ${requiredAssetUrls.length} required render asset(s).`,
    detail: {
      requiredAssetUrls,
      readinessActorCount: worldPartitionReadinessActorIds.size,
    },
  })
  const preloadReport = await prepareRequiredLevelRenderAssets(
    level,
    requiredAssetUrls,
    get(qualityLevelStore),
    {
      maxTier: getRuntimeAssetTierCap(runtimeSceneSettings),
      recordTiming: recordSystemTiming,
    },
  )
  if (token !== loadToken) return
  selectedRuntimeAssetTier = String(preloadReport.qualityTier)
  requiredRuntimeAssetCount = preloadReport.requiredSourceUrls.length
  deferredOptionalRuntimeAssetCount = Math.max(
    0,
    new Set(buildReport.runtimeAssetUrls).size - requiredRuntimeAssetCount,
  )
  traceRuntimeCulling({
    levelId: level,
    reason: 'level-render-gate',
    culled: preloadReport.failures.length > 0,
    detail: {
      status: 'preload-complete',
      worldPartitionReadinessActorIds: Array.from(
        worldPartitionReadinessActorIds,
      ),
      requiredResolvedUrls: preloadReport.requiredResolvedUrls,
      failureCount: preloadReport.failures.length,
      failures: preloadReport.failures,
    },
  })

  setRuntimeDiagnostic('levelAssets', {
    label: 'Level Assets',
    level: preloadReport.failures.length > 0 ? 'error' : 'ready',
    message:
      preloadReport.failures.length > 0
        ? `${level}: ${preloadReport.failures.length} required render asset(s) failed to preload.`
        : `${level}: ${preloadReport.requiredResolvedUrls.length} required render asset(s) resolved for ${preloadReport.qualityTier}.`,
    meta: preloadReport as unknown as Record<string, unknown>,
  })

  if (preloadReport.failures.length > 0) {
    setRuntimeRenderLifecyclePhase({
      levelId: level,
      phase: 'error',
      message: `${level}: required render asset preload failed.`,
      detail: {
        failures: preloadReport.failures,
      },
    })
    return
  }
  setRuntimeRenderLifecyclePhase({
    levelId: level,
    phase: 'assets-ready',
    message: `${level}: required render assets ready for ${preloadReport.qualityTier}.`,
    detail: {
      requiredResolvedUrls: preloadReport.requiredResolvedUrls,
      requiredBytes: preloadReport.requiredBytes,
    },
  })

  queueRuntimeAssetPrefetch(
    level,
    initialActiveAssetUrls.filter(url => !requiredAssetUrls.includes(url)),
    'initial-active-cells',
  )

  renderActorsReady = true
  setRuntimeRenderLifecyclePhase({
    levelId: level,
    phase: 'scene-graph-ready',
    message: `${level}: scene graph render gate opened.`,
    detail: {
      rootActorCount: rootActors.length,
      readinessActorCount: worldPartitionReadinessActorIds.size,
    },
  })
  const activeRenderProfile = resolveRuntimeRenderProfile(
    runtimeSceneSettings.level?.renderProfile,
    get(qualityLevelStore),
  )
  setRuntimeRenderProfileDiagnostics(level, {
    profileId: activeRenderProfile.id,
    tier: activeRenderProfile.tier,
    shadowsEnabled: activeRenderProfile.shadows.enabled,
    maxShadowCastingLights: activeRenderProfile.shadows.maxCastingLights,
    shadowMapSize: activeRenderProfile.shadows.mapSize,
    reflectionMode: activeRenderProfile.reflections.mode,
  })
  setRuntimeRenderLifecyclePhase({
    levelId: level,
    phase: 'lighting-profile-ready',
    message: `${level}: render profile ${activeRenderProfile.id} applied for ${activeRenderProfile.tier}.`,
    detail: {
      profileId: activeRenderProfile.id,
      tier: activeRenderProfile.tier,
      reflectionMode: activeRenderProfile.reflections.mode,
      shadowMapSize: activeRenderProfile.shadows.mapSize,
    },
  })
  traceRuntimeCulling({
    levelId: level,
    reason: 'level-render-gate',
    culled: false,
    detail: {
      status: 'render-actors-ready',
      rootActorCount: rootActors.length,
      worldPartition: worldPartition
        ? {
            activeRadius: worldPartition.activeRadius,
            cellSize: worldPartition.cellSize,
            residentActorCount: worldPartition.residentActorIds.length,
            streamableActorCount: worldPartition.streamableActorIds.length,
            readinessActorCount: worldPartitionReadinessActorIds.size,
            readinessGates: worldPartition.streaming?.readinessGates ?? [],
            initialCells:
              worldPartition.readiness?.requiredInitialCellKeys.length ?? 0,
          }
        : null,
    },
  })
  startActorReveal(() => {
    if (token !== loadToken) return
    setRuntimeRenderLifecyclePhase({
      levelId: level,
      phase: 'diagnostics-ready',
      message: `${level}: runtime render diagnostics are publishing actor readiness.`,
      detail: {
        visibleActorCount: visibleActorIds.size,
        requiredRenderActorCount: buildReport.requiredRenderActorIds.length,
      },
    })
    requestSceneGameplayActivation(level, spawnPosition)
  }, worldPartitionReadinessActorIds)
}

async function loadSceneDocument(level: string, token: number) {
  try {
    await loadSceneDocumentUnchecked(level, token)
  } catch (error) {
    if (token !== loadToken) return

    const message =
      error instanceof Error ? error.message : 'Unknown level load error.'
    console.error('Failed to load runtime scene document:', error)
    levelDefinition = null
    levelActors = []
    rootActors = []
    renderActorsReady = false
    visibleActorIds = new Set<string>()
    actorRevealOrder = []
    actorRevealIndex = 0
    terrainRuntimeData = null
    terrainRuntimeReady = false
    worldPartition = null
    previousPlayerPosition = null
    lastWorldPartitionPrefetchKey = ''
    lastWorldPartitionEvictionKey = ''
    worldPartitionCellStates = new Map()
    clearRuntimeStreamingTelemetry(level)
    pendingSceneReady = false
    pendingSpawnPosition = null
    clearRuntimeRenderedActors(level)
    setRuntimeRenderLifecyclePhase({
      levelId: level,
      phase: 'error',
      message,
    })
    setRuntimeDiagnostic('levelDefinition', {
      label: 'Level Definition',
      level: 'error',
      message,
      meta: { levelId: level },
    })
  }
}

$: levelSettings = (levelDefinition?.settings ?? {}) as SceneSettings
$: sharedLevelSettings = levelSettings.level ?? {}
$: observatorySettings = levelSettings.observatory ?? {}
$: activeSkyboxPreset =
  SKYBOX_PRESETS[
    sharedLevelSettings.skyboxPreset as keyof typeof SKYBOX_PRESETS
  ] ?? SKYBOX_PRESETS.observatory
$: authoredGameplayNodes = (() => {
  if (!levelDefinition) return []
  const getWorldMatrix = createActorWorldMatrixResolver(levelDefinition.actors)

  return levelDefinition.actors
    .filter(
      actor =>
        actor.gameplay?.type === 'audio-region' ||
        actor.gameplay?.type === 'fog-volume',
    )
    .map(actor => {
      const gameplay = actor.gameplay?.data as RuntimeGameplayData | undefined
      const worldMatrix = getWorldMatrix(actor.id)
      const position = new Vector3()
      const quaternion = new Quaternion()
      const scale = new Vector3()
      worldMatrix.decompose(position, quaternion, scale)
      return {
        actor,
        gameplay,
        position: [position.x, position.y, position.z] as [
          number,
          number,
          number,
        ],
        scale: [Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z)] as [
          number,
          number,
          number,
        ],
      }
    })
})()
$: authoredAudioRegions = authoredGameplayNodes
  .filter(
    entry =>
      entry.gameplay?.type === 'audio-region' && entry.gameplay?.audioTrack,
  )
  .map(entry => ({
    id: entry.actor.id,
    position: entry.position,
    scale: entry.scale,
    track: entry.gameplay?.audioTrack ?? '',
    volume: entry.gameplay?.audioVolume ?? 0.24,
    falloff: entry.gameplay?.regionFalloff ?? 12,
  }))
$: presetAmbientAudioRegions =
  sharedLevelSettings.ambientAudio?.enabled &&
  sharedLevelSettings.ambientAudio?.track
    ? [
        {
          id: `${levelId}-preset-ambient-audio`,
          position: sharedLevelSettings.ambientAudio.position ?? [0, 8, 0],
          scale: sharedLevelSettings.ambientAudio.scale ?? [1500, 120, 1500],
          track: sharedLevelSettings.ambientAudio.track,
          volume: sharedLevelSettings.ambientAudio.volume ?? 0.2,
          falloff: sharedLevelSettings.ambientAudio.falloff ?? 36,
        },
      ]
    : []
$: effectiveAudioRegions = [
  ...presetAmbientAudioRegions,
  ...authoredAudioRegions,
]
$: runtimeRequestedCellKeys = Array.from(worldPartitionCellStates.entries())
  .filter(([, state]) => state === 'requested')
  .map(([cellKey]) => cellKey)
$: runtimeLoadingCellKeys = Array.from(worldPartitionCellStates.entries())
  .filter(([, state]) => state === 'loading')
  .map(([cellKey]) => cellKey)
$: runtimeReadyCellKeys = Array.from(worldPartitionCellStates.entries())
  .filter(([, state]) => state === 'ready')
  .map(([cellKey]) => cellKey)
$: runtimeEvictingCellKeys = Array.from(worldPartitionCellStates.entries())
  .filter(([, state]) => state === 'evicting')
  .map(([cellKey]) => cellKey)
$: runtimeEvictedCellKeys = Array.from(worldPartitionCellStates.entries())
  .filter(([, state]) => state === 'evicted')
  .map(([cellKey]) => cellKey)
$: runtimeFailedCellKeys = Array.from(worldPartitionCellStates.entries())
  .filter(([, state]) => state === 'failed')
  .map(([cellKey]) => cellKey)
$: runtimeStreamingState = resolveRuntimeWorldPartitionStreamingState({
  partition: worldPartition,
  playerPosition,
  previousPlayerPosition,
  allActorIds: levelActors.map(actor => actor.id),
  requestedCellKeys: runtimeRequestedCellKeys,
  loadingCellKeys: runtimeLoadingCellKeys,
  readyCellKeys: runtimeReadyCellKeys,
  evictingCellKeys: runtimeEvictingCellKeys,
  evictedCellKeys: runtimeEvictedCellKeys,
  failedCellKeys: runtimeFailedCellKeys,
})
$: runtimeActiveActorIds = runtimeStreamingState.activeActorIds
$: runtimeActiveCells = runtimeStreamingState.activeCells
$: runtimeActiveCellKeys = runtimeStreamingState.activeCellKeys
$: runtimePrefetchCells = runtimeStreamingState.prefetchCells
$: runtimePrefetchCellKeys = runtimeStreamingState.prefetchCellKeys
$: runtimeCellStates = runtimeStreamingState.cellStates
$: runtimeCellStateCounts = runtimeStreamingState.cellStateCounts
$: evictableCellKeys = runtimeStreamingState.evictableCellKeys
$: if (renderActorsReady && worldPartition) {
  clearWorldPartitionCellStates(runtimeActiveCellKeys)
  const nextVisibleActorIds = new Set(visibleActorIds)
  let changed = false
  for (const actorId of runtimeActiveActorIds) {
    if (nextVisibleActorIds.has(actorId)) continue
    nextVisibleActorIds.add(actorId)
    changed = true
  }
  if (changed) visibleActorIds = nextVisibleActorIds
}
$: visibleActorIdsForRender = renderActorsReady
  ? new Set(
      Array.from(visibleActorIds).filter(actorId =>
        runtimeActiveActorIds.has(actorId),
      ),
    )
  : new Set<string>()
$: visibleRootActors = renderActorsReady
  ? rootActors.filter(actor => visibleActorIdsForRender.has(actor.id))
  : []
$: if (renderActorsReady) {
  setRuntimeActiveActors(levelId, Array.from(runtimeActiveActorIds))
}
$: if (renderActorsReady && levelDefinition) {
  queueRuntimeAssetPrefetch(
    levelId,
    collectRenderAssetUrlsForActorIds(levelActors, runtimeActiveActorIds),
    'active-cells',
  )
}
$: if (
  renderActorsReady &&
  levelDefinition &&
  runtimePrefetchCells.length > 0
) {
  queueWorldPartitionCellPrefetch(levelId, runtimePrefetchCells)
}
$: if (renderActorsReady && worldPartition) {
  runWorldPartitionEviction(levelId, evictableCellKeys)
}
$: if (renderActorsReady && worldPartition) {
  setRuntimeDiagnostic('worldPartitionStreaming', {
    label: 'Partition Streaming',
    level:
      runtimeStreamingState.failedRequiredCellKeys.length > 0
        ? 'error'
        : 'ready',
    message:
      runtimeStreamingState.failedRequiredCellKeys.length > 0
        ? `${levelId}: ${runtimeStreamingState.failedRequiredCellKeys.length} required streaming cell(s) failed.`
        : `${levelId}: ${runtimeActiveCellKeys.length} active, ${runtimeLoadingCellKeys.length} loading, ${runtimeReadyCellKeys.length} ready, ${evictableCellKeys.length} evictable cell(s).`,
    meta: {
      activeCellKeys: runtimeActiveCellKeys,
      prefetchCellKeys: runtimePrefetchCellKeys,
      requestedCellKeys: runtimeRequestedCellKeys,
      loadingCellKeys: runtimeLoadingCellKeys,
      readyCellKeys: runtimeReadyCellKeys,
      evictingCellKeys: runtimeEvictingCellKeys,
      failedCellKeys: runtimeFailedCellKeys,
      evictableCellKeys,
      pendingRequiredCellKeys: runtimeStreamingState.pendingRequiredCellKeys,
      failedRequiredCellKeys: runtimeStreamingState.failedRequiredCellKeys,
      cellStateCounts: runtimeCellStateCounts,
      cellStates: runtimeCellStates,
    },
  })
}
$: activeRenderableActorCount = levelActors.filter(
  actor =>
    runtimeActiveActorIds.has(actor.id) &&
    actor.render?.visible !== false &&
    Boolean(
      actor.render?.asset?.url ||
        actor.render?.prefab ||
        actor.render?.primitive ||
        actor.light,
    ),
).length
$: selectedRuntimeAssetTier = getLevelRuntimeAssetTier(
  levelId,
  $qualityLevelStore,
)
$: if (renderActorsReady) {
  const cacheStats = getGltfCacheStats()
  const runtimeProfile = getRuntimeProfileOverride()
  const levelAssetTierCap = getRuntimeAssetTierCap(levelSettings) ?? null
  setRuntimeStreamingTelemetry(levelId, {
    selectedRuntimeProfileId: runtimeProfile?.id ?? null,
    selectedPlatformProfile: getSelectedPlatformProfile(),
    requestedAssetTier: getRuntimeProfileAssetTierForProfile(runtimeProfile),
    levelAssetTierCap,
    selectedAssetTier: selectedRuntimeAssetTier,
    renderQualityTier: $qualityLevelStore,
    renderProfileId: resolvedRenderProfile.id,
    renderProfileTier: resolvedRenderProfile.tier,
    requiredAssetCount: requiredRuntimeAssetCount,
    deferredOptionalAssetCount: deferredOptionalRuntimeAssetCount,
    partitioned: Boolean(worldPartition),
    activeCellKeys: runtimeActiveCellKeys,
    prefetchCellKeys: runtimePrefetchCellKeys,
    evictableCellKeys,
    activeCellCount: runtimeActiveCells.length,
    prefetchCellCount: runtimePrefetchCells.length,
    evictableCellCount: evictableCellKeys.length,
    totalCellCount: worldPartition?.cells.length ?? 0,
    residentActorCount:
      worldPartition?.residentActorIds.length ?? levelActors.length,
    streamableActorCount: worldPartition?.streamableActorIds.length ?? 0,
    activeActorCount: runtimeActiveActorIds.size,
    activeRenderableActorCount,
    pendingRequiredCellKeys: runtimeStreamingState.pendingRequiredCellKeys,
    readinessGateCount: worldPartition?.streaming?.readinessGates.length ?? 0,
    initialCellCount:
      worldPartition?.readiness?.requiredInitialCellKeys.length ?? 0,
    loadedRenderAssetCount: cacheStats.loadedEntries,
    loadedCollisionAssetCount: 0,
    gltfCacheEntries: cacheStats.entries,
    gltfCacheLoadedEntries: cacheStats.loadedEntries,
    gltfCachePendingEntries: cacheStats.pendingEntries,
    gltfCacheReferencedEntries: cacheStats.referencedEntries,
    gltfCacheUnreferencedEntries: cacheStats.unreferencedEntries,
    gltfCacheLoadedBytes: cacheStats.loadedBytes,
    gltfCacheBytes: cacheStats.loadedBytes,
    gltfCachePendingBytes: cacheStats.pendingBytes,
    gltfCacheReferencedBytes: cacheStats.referencedBytes,
    gltfCacheUnreferencedBytes: cacheStats.unreferencedBytes,
    cellStateCounts: runtimeCellStateCounts,
  })
}
$: effectiveFog = (() => {
  const fogVolumes = authoredGameplayNodes.filter(
    entry => entry.gameplay?.type === 'fog-volume',
  )
  const baseColor = new Color(
    sharedLevelSettings.style?.fog?.color ?? '#5f76a8',
  )
  const baseDensity = sharedLevelSettings.style?.fog?.density ?? 0.0012

  let strongestInfluence = 0
  let targetColor = baseColor.clone()
  let targetDensity = baseDensity

  for (const entry of fogVolumes) {
    const [px, py, pz] = playerPosition
    const [cx, cy, cz] = entry.position
    const [sx, sy, sz] = entry.scale.map(value => Math.abs(value) / 2) as [
      number,
      number,
      number,
    ]
    const dx = Math.max(Math.abs(px - cx) - sx, 0)
    const dy = Math.max(Math.abs(py - cy) - sy, 0)
    const dz = Math.max(Math.abs(pz - cz) - sz, 0)
    const outsideDistance = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const falloff = entry.gameplay?.regionFalloff ?? 8
    const influence =
      outsideDistance <= 0.0001
        ? 1
        : outsideDistance >= falloff
          ? 0
          : 1 - outsideDistance / Math.max(0.001, falloff)

    if (influence <= strongestInfluence) continue

    strongestInfluence = influence
    targetColor = new Color(entry.gameplay?.fogColor ?? '#dbe4ef')
    targetDensity = entry.gameplay?.fogDensity ?? baseDensity
  }

  return {
    color: baseColor.lerp(targetColor, strongestInfluence).getStyle(),
    density: baseDensity + (targetDensity - baseDensity) * strongestInfluence,
  }
})()
$: fogColor = effectiveFog.color
$: fogDensity = effectiveFog.density
$: ambientIntensity = sharedLevelSettings.lighting?.ambientIntensity ?? 1.25
$: keyLightIntensity =
  sharedLevelSettings.lighting?.keyLightIntensity ??
  sharedLevelSettings.lighting?.sunIntensity ??
  0.65
$: fillLightIntensity =
  sharedLevelSettings.lighting?.fillLightIntensity ??
  sharedLevelSettings.lighting?.fillIntensity ??
  0.2
$: resolvedRenderProfile = resolveRuntimeRenderProfile(
  sharedLevelSettings.renderProfile,
  $qualityLevelStore,
)
$: waterSettings =
  observatorySettings?.ocean ?? sharedLevelSettings.water ?? null
$: waterEnabled =
  sharedLevelSettings.features?.water ??
  sharedLevelSettings.water?.enabled ??
  Boolean(waterSettings?.enabled)
$: ambientParticlesEnabled =
  sharedLevelSettings.features?.ambientParticles ??
  sharedLevelSettings.ambientParticles?.enabled ??
  false
$: sceneStarMapEnabled = sharedLevelSettings.features?.starMap ?? false
$: waterLevel = waterSettings?.level ?? waterSettings?.initialLevel ?? -0.16
$: waterColor = parseSceneColor(waterSettings?.color, 0x425d72)
$: underwaterFogColor = parseSceneColor(
  waterSettings?.underwaterFogColor,
  0x0a1922,
)
$: if (levelDefinition) {
  replaceRuntimeVisualStyle(
    buildRuntimeVisualStyleFromLevelSettings(sharedLevelSettings),
  )
  replaceRuntimeRenderProfile(resolvedRenderProfile)
}
$: if (levelDefinition && renderActorsReady) {
  setRuntimeRenderProfileDiagnostics(levelId, {
    profileId: resolvedRenderProfile.id,
    tier: resolvedRenderProfile.tier,
    shadowsEnabled: resolvedRenderProfile.shadows.enabled,
    maxShadowCastingLights: resolvedRenderProfile.shadows.maxCastingLights,
    shadowMapSize: resolvedRenderProfile.shadows.mapSize,
    reflectionMode: resolvedRenderProfile.reflections.mode,
  })
}
onMount(() => {
  const token = ++loadToken
  const unsubscribePlayer = playerStateStore.subscribe(state => {
    previousPlayerPosition = playerPosition
    playerPosition = state.position
  })

  void loadSceneDocument(levelId, token)

  return () => {
    loadToken += 1
    unsubscribePlayer()
  }
})

onDestroy(() => {
  cancelActorReveal()
  endLevelRuntimeAssetScope(levelId)
  clearRuntimeStreamingTelemetry(levelId)
  resetRuntimeRenderProfile()
  terrainRuntimeData = null
  terrainRuntimeReady = false
  pendingSceneReady = false
  pendingSpawnPosition = null
  resetRuntimeVisualStyle()
})
</script>

<LevelManager>
  <T.Group name={`${levelId}-scene-level`} position={position}>
    <Skybox
      path={activeSkyboxPreset.path}
      files={activeSkyboxPreset.files}
    />

    <SceneFogExp2 color={fogColor} density={fogDensity} />
    <SceneLighting
      {ambientIntensity}
      {keyLightIntensity}
      {fillLightIntensity}
      renderProfile={resolvedRenderProfile}
    />

    {#if terrainRuntimeData}
      <TerrainRuntime
        levelId={levelId}
        config={terrainRuntimeData.config}
        showVisualChunks={terrainRuntimeData.runtime.showVisualChunks}
        showVisualSurface={terrainRuntimeData.runtime.showVisualSurface}
        collisionStrategy={terrainRuntimeData.runtime.collisionStrategy}
        on:terrainRuntimeReady={handleTerrainRuntimeReady}
      />
    {/if}

    {#if waterEnabled && waterSettings}
      <OceanComponent
        size={{
          width: waterSettings.size?.width ?? 800,
          height: waterSettings.size?.height ?? 800,
        }}
        position={[0, waterLevel, 0]}
        initialLevel={waterLevel}
        color={waterColor}
        opacity={waterSettings.opacity ?? 0.86}
        enableAnimation={waterSettings.enableAnimation ?? true}
        enableUnderwaterEffects={true}
        waterCollisionSize={[
          (waterSettings.size?.width ?? 800) * 0.9,
          2,
          (waterSettings.size?.height ?? 800) * 0.9,
        ]}
        underwaterFogDensity={waterSettings.underwaterFogDensity ?? 0.08}
        underwaterFogColor={underwaterFogColor}
        surfaceFogDensity={waterSettings.surfaceFogDensity ?? 0.001}
        metalness={0.08}
        roughness={0.04}
        envMapIntensity={resolvedRenderProfile.reflections.environmentIntensity}
        enablePlanarReflections={resolvedRenderProfile.reflections.mode === 'planar'}
        reflectionTextureSize={resolvedRenderProfile.reflections.textureSize}
      />
      {#if $underwaterStateStore.isUnderwater || $underwaterStateStore.transitionProgress > 0}
        <UnderwaterOverlay />
      {/if}
    {/if}

    {#if ambientParticlesEnabled}
      <AmbientParticleField
        enabled={true}
        count={sharedLevelSettings.ambientParticles?.count ?? 180}
        radius={sharedLevelSettings.ambientParticles?.radius ?? 140}
        minHeight={sharedLevelSettings.ambientParticles?.minHeight ?? 0.8}
        maxHeight={sharedLevelSettings.ambientParticles?.maxHeight ?? 18}
        color={sharedLevelSettings.ambientParticles?.color ?? '#b8d9ff'}
        secondaryColor={sharedLevelSettings.ambientParticles?.secondaryColor ?? '#f3e8b2'}
        size={sharedLevelSettings.ambientParticles?.size ?? 1.15}
        opacity={sharedLevelSettings.ambientParticles?.opacity ?? 0.26}
        driftSpeed={sharedLevelSettings.ambientParticles?.driftSpeed ?? 0.22}
        sway={sharedLevelSettings.ambientParticles?.sway ?? 0.85}
        center={[0, 0, 0]}
      />
    {/if}

    {#if effectiveAudioRegions.length > 0}
      <AmbientAudioRegions regions={effectiveAudioRegions} enabled={true} />
    {/if}

    {#if sceneStarMapEnabled}
      <T.Group position={[0, 8, 0]}>
        <StarMap
          bind:this={starMapComponent}
          bind:starMapRef={starMapRef}
          {timelineEvents}
          {interactionSystem}
          on:starSelected={(event) => dispatch('starSelected', event.detail)}
        />
      </T.Group>

      <StarNavigationSystem
        {timelineEvents}
        starMapComponent={starMapRef}
        on:starSelected={(event) => dispatch('starSelected', event.detail)}
        on:starDeselected={(event) => dispatch('starDeselected', event.detail)}
        on:levelTransition={(event) => dispatch('levelTransition', event.detail)}
      />
    {/if}

    {#if !editorEnabled && renderActorsReady}
      {#each visibleRootActors as actor (actor.id)}
        <RuntimeActorBranch
          {actor}
          actors={levelActors}
          {levelId}
          {interactionSystem}
          interactiveEnabled={true}
          visibleActorIds={visibleActorIdsForRender}
          on:portalTransition={(event) => dispatch('portalTransition', event.detail)}
          on:noteRead={(event) => dispatch('noteRead', event.detail)}
        />
      {/each}
    {/if}
  </T.Group>
</LevelManager>
