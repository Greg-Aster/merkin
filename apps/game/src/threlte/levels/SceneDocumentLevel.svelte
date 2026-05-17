<script lang="ts">
import { T } from '@threlte/core'
import { createEventDispatcher, onDestroy, onMount } from 'svelte'
import { get } from 'svelte/store'
import { Group, Quaternion, Vector3 } from 'three'
import SceneAtmosphereSystem from '../atmosphere/SceneAtmosphereSystem.svelte'
import {
  type RuntimeAtmosphereFogVolume,
  withRuntimeAtmosphereFogVolumes,
} from '../atmosphere/buildRuntimeAtmosphere'
import {
  replaceRuntimeAtmosphere,
  resetRuntimeAtmosphere,
} from '../atmosphere/runtimeAtmosphereStore'
import AmbientAudioRegions from '../components/AmbientAudioRegions.svelte'
import AmbientParticleField from '../components/AmbientParticleField.svelte'
import GroundMistLayer from '../components/GroundMistLayer.svelte'
import StarNavigationSystem from '../components/StarNavigationSystem.svelte'
import LevelManager from '../core/LevelManager.svelte'
import type { PlayerLevelPositionDetail } from '../core/levelRuntimeEvents'
import { createActorWorldMatrixResolver } from '../engine/actorHierarchy'
import { getLevelGroundContract } from '../engine/groundContract'
import {
  prefetchOptionalLevelRenderAssets,
  prepareRequiredLevelRenderAssets,
} from '../engine/levelAssetPreloader'
import { createLevelRuntimeReadinessContract } from '../engine/levelRuntimeReadinessContract'
import { createLevelBuildReport } from '../engine/levelValidation'
import {
  endLevelRuntimeAssetScope,
  getLevelRuntimeAssetTier,
  getRuntimeProfileAssetTierForProfile,
} from '../engine/runtimeAssetManifest'
import { traceRuntimeCulling } from '../engine/runtimeCullingTrace'
import { usesLightweightRuntimeGameplayMarker } from '../engine/runtimeGameplayRenderPolicy'
import type { RuntimeGameplayData } from '../engine/runtimeGameplayTypes'
import { resolveRuntimePlayerSettings } from '../engine/runtimePlayerSettings'
import { getRuntimePrefabAssetUrl } from '../engine/runtimePrefabRegistry'
import { loadRuntimeSceneDocument } from '../engine/runtimeSceneDocumentLoader'
import {
  getBuildReportRequiredAssetUrls,
  getBuildReportRequiredRenderActorIds,
  getBuildReportRuntimeAssetUrls,
} from '../engine/runtimeSceneManifest'
import {
  type RuntimeWorldPartition,
  type RuntimeWorldPartitionCell,
  type RuntimeWorldPartitionCellRuntimeState,
  getWorldPartitionReadinessActorIds,
  loadRuntimeWorldPartition,
  resolveRuntimeWorldPartitionStreamingState,
} from '../engine/runtimeWorldPartition'
import type {
  RenderProfilePostPass,
  RenderProfileVisualBookmark,
  SceneSettings,
} from '../engine/sceneDocumentTypes'
import { resolveSceneFireflyFieldQuality } from '../engine/sceneFireflyField'
import type { LevelRuntimeReadinessContract } from '../engine/types'
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
  loadTerrainRuntimeComponentData,
} from '../features/terrain/terrainManifest'
import { terrainStore } from '../features/terrain/terrainStore'
import { playerStateStore } from '../stores/gameStateStore'
import { clearRuntimeColliderUrls } from '../stores/runtimeCollisionRegistry'
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
import {
  buildRuntimeAtmosphereFromGameplayStyleSettings,
  buildRuntimeVisualStyleFromLevelSettings,
} from '../styles/GameplayStyleProfiles'
import {
  replaceRuntimeVisualStyle,
  resetRuntimeVisualStyle,
} from '../styles/runtimeVisualStyleStore'
import Skybox from '../systems/Skybox.svelte'
import StarMap from '../systems/StarMap.svelte'
import {
  evictUnusedGltfCacheEntries,
  getGltfCacheStats,
  loadCachedGltf,
} from '../utils/gltfAssetCache'
import RuntimeActorBranch from './RuntimeActorBranch.svelte'
import SceneFireflyField from './SceneFireflyField.svelte'
import SceneLightingProfile from './SceneLightingProfile.svelte'
import { getSceneTerrainRuntimeRequest } from './sceneTerrainRuntime'
import { resolveSkyboxPreset } from './skyboxPresets'

type WorldPartitionSettings = {
  partitionUrl?: string
  cellSize?: number
  activeRadius?: number
}

const dispatch = createEventDispatcher()

export let levelId: string
export let position: [number, number, number] = [0, 0, 0]
export let editorEnabled = false
export let editorSceneSettingsOverride: SceneSettings | null = null
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
let activeRuntimeReadinessContract: LevelRuntimeReadinessContract | null = null
let worldPartition: RuntimeWorldPartition | null = null
let pendingSceneReady = false
let pendingSpawnPosition: [number, number, number] | null = null
let lastRuntimeAssetPrefetchKey = ''
let lastWorldPartitionPrefetchKey = ''
let lastWorldPartitionEvictionKey = ''
let selectedRuntimeAssetTier = 'medium'
let requiredRuntimeAssetCount = 0
let deferredOptionalRuntimeAssetCount = 0
let lastAtmosphereDiagnosticKey = ''
let worldPartitionCellStates = new Map<
  string,
  RuntimeWorldPartitionCellRuntimeState
>()

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
      loadGltfAsset: loadCachedGltf,
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
      loadGltfAsset: loadCachedGltf,
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

function finiteNumberOrDefault(
  value: number | null | undefined,
  fallback: number,
) {
  return Number.isFinite(value) ? value : fallback
}

function clampNumber(
  value: number | null | undefined,
  min: number,
  max: number,
  fallback: number,
) {
  return Math.min(max, Math.max(min, finiteNumberOrDefault(value, fallback)))
}

function formatAtmosphereDiagnosticNumber(
  value: number | null | undefined,
  digits = 3,
) {
  return finiteNumberOrDefault(value, 0).toFixed(digits)
}

function renderProfileAllowsPostPass(
  profile: ReturnType<typeof resolveRuntimeRenderProfile>,
  pass: RenderProfilePostPass,
) {
  if (!profile.postProcessing.enabled) return false
  return (
    profile.postProcessing.passes.length === 0 ||
    profile.postProcessing.passes.includes(pass)
  )
}

function getRenderProfilePostPassStatus(
  profile: ReturnType<typeof resolveRuntimeRenderProfile>,
  pass: RenderProfilePostPass,
) {
  if (!profile.postProcessing.enabled) return 'disabled by profile'
  if (!renderProfileAllowsPostPass(profile, pass)) {
    return `disabled by ${profile.tier} profile pass list`
  }
  return 'allowed'
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

function getRequestedVisualBookmark(definition: LevelDefinition) {
  const bookmarkId = getRequestedVisualBookmarkId()
  if (!bookmarkId) return null

  const settings = (definition.settings ?? {}) as SceneSettings
  const bookmarks = settings.level?.renderProfile?.visualBookmarks ?? []
  return (
    bookmarks.find(
      (entry: RenderProfileVisualBookmark) => entry.id === bookmarkId,
    ) ?? null
  )
}

function isFiniteVec3(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(component => Number.isFinite(component))
  )
}

function getVisualBookmarkSpawnPosition(
  definition: LevelDefinition,
  fallback: [number, number, number],
): [number, number, number] {
  const bookmark = getRequestedVisualBookmark(definition)
  const position = bookmark?.playerPosition
  if (!isFiniteVec3(position)) return fallback

  return [position[0], position[1], position[2]]
}

function getVisualBookmarkSpawnRotation(
  definition: LevelDefinition,
  fallback: [number, number, number],
  spawnPosition: [number, number, number],
): [number, number, number] {
  const bookmark = getRequestedVisualBookmark(definition)
  if (!bookmark) return fallback

  const cameraPosition = isFiniteVec3(bookmark.cameraPosition)
    ? bookmark.cameraPosition
    : ([spawnPosition[0], spawnPosition[1] + 1.6, spawnPosition[2]] as [
        number,
        number,
        number,
      ])
  const cameraTarget = bookmark.cameraTarget
  if (!isFiniteVec3(cameraTarget)) return fallback

  const deltaX = cameraTarget[0] - cameraPosition[0]
  const deltaY = cameraTarget[1] - cameraPosition[1]
  const deltaZ = cameraTarget[2] - cameraPosition[2]
  const horizontalDistance = Math.hypot(deltaX, deltaZ)
  if (horizontalDistance <= 0.0001 && Math.abs(deltaY) <= 0.0001) {
    return fallback
  }

  return [
    clampNumber(
      Math.atan2(deltaY, horizontalDistance),
      -Math.PI / 2,
      Math.PI / 2,
      fallback[0],
    ),
    Math.atan2(-deltaX, -deltaZ),
    fallback[2],
  ]
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

async function loadSceneTerrainRuntimeData(
  level: string,
  settings: SceneSettings,
) {
  const runtimeRequest = getSceneTerrainRuntimeRequest(settings)
  if (!runtimeRequest) {
    return null
  }

  const response = await fetch(runtimeRequest.manifestUrl)
  if (!response.ok) {
    throw new Error(
      `${level}: failed to load terrain manifest ${runtimeRequest.manifestUrl} (${response.status})`,
    )
  }

  const manifest = await response.json()
  return loadTerrainRuntimeComponentData({
    levelId: level,
    source: runtimeRequest.source,
    manifest,
    manifestUrl: runtimeRequest.manifestUrl,
    boundsFallback: manifest.physics?.bounds ?? null,
    groundContract: getLevelGroundContract(settings),
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
      runtimeReadinessContract: activeRuntimeReadinessContract,
      worldPartitionReadiness: {
        requiredInitialCellKeys: runtimeStreamingState.requiredCellKeys,
        activeInitialCellKeys: runtimeStreamingState.activeCellKeys,
        readyInitialCellKeys: runtimeReadyCellKeys,
        failedInitialCellKeys: runtimeStreamingState.failedRequiredCellKeys,
        requiredInitialCellsActive:
          runtimeStreamingState.pendingRequiredCellKeys.length === 0 &&
          runtimeStreamingState.failedRequiredCellKeys.length === 0,
      },
      player: resolveRuntimePlayerSettings(sharedLevelSettings.player),
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

function getSceneTerrainHeightAt(x: number, z: number) {
  if (!terrainRuntimeReady) return null

  const terrainManager = get(terrainStore).manager
  if (!terrainManager) return null

  const height = terrainManager.getHeightAt(x, z)
  return Number.isFinite(height) ? height : null
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
  activeRuntimeReadinessContract = null
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
  const defaultSpawnRotation = resolveSpawnRotation(levelDefinition)
  const spawnRotation = getVisualBookmarkSpawnRotation(
    levelDefinition,
    defaultSpawnRotation,
    spawnPosition,
  )
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
  activeRuntimeReadinessContract = createLevelRuntimeReadinessContract(
    levelDefinition,
    {
      worldPartitionReadiness: worldPartition?.readiness ?? null,
    },
  )
  const requiredRenderActorIds =
    getBuildReportRequiredRenderActorIds(buildReport)
  const buildRequiredAssetUrls = getBuildReportRequiredAssetUrls(buildReport)
  const buildRuntimeAssetUrls = getBuildReportRuntimeAssetUrls(buildReport)
  clearRuntimeRenderedActors(level)
  clearRuntimeColliderUrls(level)
  setRequiredRuntimeRenderActors(level, requiredRenderActorIds)
  traceRuntimeCulling({
    levelId: level,
    reason: 'level-render-gate',
    culled: true,
    detail: {
      status: 'contract',
      actorCount: buildReport.actorCount,
      requiredRenderActorIds,
      requiredAssetUrls: buildRequiredAssetUrls,
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
    ...new Set([...buildRequiredAssetUrls, ...readinessAssetUrls]),
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
      loadGltfAsset: loadCachedGltf,
      maxTier: getRuntimeAssetTierCap(runtimeSceneSettings),
      recordTiming: recordSystemTiming,
    },
  )
  if (token !== loadToken) return
  selectedRuntimeAssetTier = String(preloadReport.qualityTier)
  requiredRuntimeAssetCount = preloadReport.requiredSourceUrls.length
  deferredOptionalRuntimeAssetCount = Math.max(
    0,
    new Set(buildRuntimeAssetUrls).size - requiredRuntimeAssetCount,
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
        requiredRenderActorCount: requiredRenderActorIds.length,
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
    activeRuntimeReadinessContract = null
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

$: levelSettings = (
  editorEnabled && editorSceneSettingsOverride
    ? editorSceneSettingsOverride
    : levelDefinition?.settings ?? {}
) as SceneSettings
$: sharedLevelSettings = levelSettings.level ?? {}
$: activeSkyboxPreset = resolveSkyboxPreset(sharedLevelSettings.skyboxPreset)
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
$: baseRuntimeAtmosphere = buildRuntimeAtmosphereFromGameplayStyleSettings(
  sharedLevelSettings,
  {
    levelId,
    source: editorEnabled ? 'editor-preview' : 'scene-settings',
  },
)
$: fogStackEnabled = sharedLevelSettings.style?.fogEnabled ?? true
$: fogVolumeColorsEnabled =
  sharedLevelSettings.style?.haze?.fogVolumeColors ?? true
$: authoredFogVolumes = authoredGameplayNodes
  .filter(entry => entry.gameplay?.type === 'fog-volume')
  .map(
    (entry): RuntimeAtmosphereFogVolume => ({
      position: entry.position,
      scale: entry.scale,
      color: fogVolumeColorsEnabled ? entry.gameplay?.fogColor : undefined,
      density: entry.gameplay?.fogDensity,
      falloff: entry.gameplay?.regionFalloff,
    }),
  )
$: runtimeAtmosphere = withRuntimeAtmosphereFogVolumes(baseRuntimeAtmosphere, {
  fogVolumes: fogStackEnabled ? authoredFogVolumes : [],
  playerPosition,
})
$: runtimeDistanceFog = runtimeAtmosphere.distanceFog
$: runtimeHeightFog = runtimeAtmosphere.heightFog
$: runtimeMist = runtimeAtmosphere.mist
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
$: fogColor = runtimeDistanceFog.color
$: fogDensity =
  runtimeAtmosphere.enabled && runtimeDistanceFog.enabled
    ? runtimeDistanceFog.density
    : 0
$: heightFogFloor = finiteNumberOrDefault(runtimeHeightFog.floor, 0.6)
$: heightFogCeiling = Math.max(
  heightFogFloor + 0.001,
  finiteNumberOrDefault(runtimeHeightFog.ceiling, heightFogFloor + 6),
)
$: heightFogDensity = runtimeHeightFog.enabled
  ? Math.max(0, finiteNumberOrDefault(runtimeHeightFog.density, 0))
  : 0
$: heightFogEnabled =
  runtimeHeightFog.enabled &&
  heightFogDensity > 0 &&
  heightFogCeiling > heightFogFloor
$: globalMistOpacity = clampNumber(runtimeMist.opacity, 0, 1, 0)
$: globalMistScale = Math.max(1, finiteNumberOrDefault(runtimeMist.scale, 320))
$: globalMistFloor = heightFogFloor
$: globalMistBaseHeight =
  globalMistFloor + Math.max(0, finiteNumberOrDefault(runtimeMist.height, 0))
$: globalMistCeiling = Math.max(
  globalMistBaseHeight,
  finiteNumberOrDefault(runtimeHeightFog.ceiling, globalMistBaseHeight),
)
$: globalMistSpacing = Math.max(
  0.02,
  finiteNumberOrDefault(runtimeMist.spacing, 0.44),
)
$: globalMistRequestedLayers = Math.max(
  0,
  Math.round(finiteNumberOrDefault(runtimeMist.layers, 0)),
)
$: globalMistLayerCap =
  globalMistCeiling > globalMistBaseHeight
    ? Math.max(
        1,
        Math.floor(
          (globalMistCeiling - globalMistBaseHeight) / globalMistSpacing,
        ) + 1,
      )
    : 1
$: globalMistLayers = Math.min(globalMistRequestedLayers, globalMistLayerCap)
$: globalMistEnabled =
  runtimeMist.enabled &&
  globalMistLayers > 0 &&
  globalMistOpacity > 0.001 &&
  globalMistScale > 1
$: aerialPerspectiveEnabled =
  runtimeAtmosphere.enabled && runtimeAtmosphere.aerialPerspective.enabled
$: skyAerialParticipation = aerialPerspectiveEnabled
  ? clampNumber(runtimeAtmosphere.aerialPerspective.skyParticipation, 0, 1, 0)
  : 0
$: skyboxAerialPerspectiveBoost = aerialPerspectiveEnabled
  ? clampNumber(
      runtimeAtmosphere.aerialPerspective.horizonBoost * skyAerialParticipation,
      0,
      1,
      0,
    )
  : 0
$: sceneAtmosphereRefreshKey = [
  levelId,
  levelDefinition?.actors.length ?? 0,
  activeRenderableActorCount,
  runtimeActiveCellKeys.join(','),
  runtimeReadyCellKeys.join(','),
  terrainRuntimeReady ? 1 : 0,
].join('|')
$: ambientIntensity = sharedLevelSettings.lighting?.ambientIntensity ?? 1.25
$: keyLightIntensity = sharedLevelSettings.lighting?.keyLightIntensity ?? 0.65
$: fillLightIntensity = sharedLevelSettings.lighting?.fillLightIntensity ?? 0.2
$: resolvedRenderProfile = resolveRuntimeRenderProfile(
  sharedLevelSettings.renderProfile,
  $qualityLevelStore,
)
$: waterSettings = sharedLevelSettings.water ?? null
$: waterEnabled =
  sharedLevelSettings.features?.water ??
  sharedLevelSettings.water?.enabled ??
  Boolean(waterSettings?.enabled)
$: ambientParticlesEnabled =
  sharedLevelSettings.features?.ambientParticles ??
  sharedLevelSettings.ambientParticles?.enabled ??
  false
$: authoredFireflyActorCount = levelActors.filter(
  actor =>
    actor.npc?.archetype === 'firefly' ||
    actor.npc?.presentation.type === 'firefly',
).length
$: sceneFireflyFieldEnabled =
  (sharedLevelSettings.features?.fireflies ??
    sharedLevelSettings.fireflies?.enabled ??
    false) &&
  (authoredFireflyActorCount === 0 ||
    sharedLevelSettings.fireflies?.allowWithAuthored === true)
$: sceneFireflyFieldQuality = resolveSceneFireflyFieldQuality({
  settings: sharedLevelSettings.fireflies,
  qualityTier: $qualityLevelStore,
  defaultCount: 36,
  defaultLightCount: 8,
  defaultSize: 0.58,
  defaultSpriteIntensity: 1.45,
})
$: sceneStarMapEnabled = sharedLevelSettings.features?.starMap ?? false
$: waterLevel = waterSettings?.level ?? waterSettings?.initialLevel ?? -0.16
$: waterColor = parseSceneColor(waterSettings?.color, 0x050b14)
$: underwaterFogColor = parseSceneColor(
  waterSettings?.underwaterFogColor,
  0x0a1922,
)
$: atmosphereSourceKind = runtimeAtmosphere.source.kind
$: atmosphereSourceProfile =
  runtimeAtmosphere.source.profileId ||
  runtimeAtmosphere.id ||
  'authored-settings'
$: distanceFogEnabled = runtimeDistanceFog.enabled && fogDensity > 0
$: skyBackgroundIntensity = Math.max(
  0,
  finiteNumberOrDefault(sharedLevelSettings.skybox?.backgroundIntensity, 1),
)
$: skyEnvironmentIntensity = Math.max(
  0,
  finiteNumberOrDefault(
    resolvedRenderProfile.reflections.environmentIntensity,
    1,
  ),
)
$: skyFogEnabled = aerialPerspectiveEnabled
$: skyFogParticipation = skyAerialParticipation
$: skyFogFalloff = runtimeAtmosphere.aerialPerspective.skyFogFalloff
$: skyAtmosphereParticipates =
  skyBackgroundIntensity > 0 && skyFogEnabled && skyFogParticipation > 0.001
$: oceanPlanarReflectorActive =
  Boolean(waterEnabled && waterSettings) &&
  resolvedRenderProfile.reflections.mode === 'planar'
$: oceanAtmosphereStatus =
  !waterEnabled || !waterSettings
    ? 'ocean disabled'
    : 'ocean material fog disabled'
$: bloomProfileParticipates = renderProfileAllowsPostPass(
  resolvedRenderProfile,
  'bloom',
)
$: colorGradingProfileParticipates = renderProfileAllowsPostPass(
  resolvedRenderProfile,
  'color-grading',
)
$: depthFogProfileParticipates = renderProfileAllowsPostPass(
  resolvedRenderProfile,
  'depth-fog',
)
$: kuwaharaProfileParticipates = renderProfileAllowsPostPass(
  resolvedRenderProfile,
  'kuwahara',
)
$: bloomProfileStatus = getRenderProfilePostPassStatus(
  resolvedRenderProfile,
  'bloom',
)
$: colorGradingProfileStatus = getRenderProfilePostPassStatus(
  resolvedRenderProfile,
  'color-grading',
)
$: depthFogProfileStatus = getRenderProfilePostPassStatus(
  resolvedRenderProfile,
  'depth-fog',
)
$: kuwaharaProfileStatus = getRenderProfilePostPassStatus(
  resolvedRenderProfile,
  'kuwahara',
)
$: atmosphereDiagnosticKey = [
  levelId,
  atmosphereSourceKind,
  atmosphereSourceProfile,
  fogColor,
  formatAtmosphereDiagnosticNumber(fogDensity, 6),
  Number(heightFogEnabled),
  formatAtmosphereDiagnosticNumber(heightFogFloor),
  formatAtmosphereDiagnosticNumber(heightFogCeiling),
  formatAtmosphereDiagnosticNumber(heightFogDensity, 6),
  sharedLevelSettings.skyboxPreset ?? 'observatory',
  formatAtmosphereDiagnosticNumber(skyBackgroundIntensity),
  formatAtmosphereDiagnosticNumber(skyEnvironmentIntensity),
  Number(fogStackEnabled),
  Number(skyFogEnabled),
  formatAtmosphereDiagnosticNumber(skyFogParticipation),
  formatAtmosphereDiagnosticNumber(skyFogFalloff),
  Number(fogVolumeColorsEnabled),
  formatAtmosphereDiagnosticNumber(skyboxAerialPerspectiveBoost),
  oceanAtmosphereStatus,
  resolvedRenderProfile.id,
  resolvedRenderProfile.tier,
  Number(depthFogProfileParticipates),
  Number(bloomProfileParticipates),
  Number(colorGradingProfileParticipates),
  Number(kuwaharaProfileParticipates),
  depthFogProfileStatus,
  bloomProfileStatus,
  colorGradingProfileStatus,
  kuwaharaProfileStatus,
].join('|')
$: if (
  levelDefinition &&
  atmosphereDiagnosticKey !== lastAtmosphereDiagnosticKey
) {
  lastAtmosphereDiagnosticKey = atmosphereDiagnosticKey
  setRuntimeDiagnostic('atmosphere', {
    label: 'Atmosphere',
    level: !fogStackEnabled || runtimeAtmosphere.enabled ? 'ready' : 'warning',
    message: `${levelId}/${atmosphereSourceKind}/${atmosphereSourceProfile}: fog stack ${fogStackEnabled ? 'on' : 'off'}; distance fog ${distanceFogEnabled ? 'on' : 'off'} density ${formatAtmosphereDiagnosticNumber(fogDensity, 5)}; height fog ${heightFogEnabled ? 'on' : 'off'} floor ${formatAtmosphereDiagnosticNumber(heightFogFloor, 2)} ceiling ${formatAtmosphereDiagnosticNumber(heightFogCeiling, 2)} density ${formatAtmosphereDiagnosticNumber(heightFogDensity, 5)}; sky fog ${skyFogEnabled ? 'on' : 'off'} amount ${formatAtmosphereDiagnosticNumber(skyFogParticipation, 2)} falloff ${formatAtmosphereDiagnosticNumber(skyFogFalloff, 2)} aerial ${formatAtmosphereDiagnosticNumber(skyboxAerialPerspectiveBoost, 2)}; full-scene depth fog ${depthFogProfileStatus}; material fog ${depthFogProfileParticipates ? 'delegated' : 'fallback'}; skybox native preset ${sharedLevelSettings.skyboxPreset ?? 'observatory'} env ${formatAtmosphereDiagnosticNumber(skyEnvironmentIntensity, 2)}; mist ${runtimeMist.enabled ? 'participating' : 'disabled'}; ${oceanAtmosphereStatus}; post profile ${resolvedRenderProfile.id}/${resolvedRenderProfile.tier} bloom ${bloomProfileStatus} color grading ${colorGradingProfileStatus} kuwahara ${kuwaharaProfileStatus}.`,
    meta: {
      levelId,
      sourceKind: atmosphereSourceKind,
      sourceProfile: atmosphereSourceProfile,
      fogStackEnabled,
      distanceFogEnabled,
      distanceFogDensity: fogDensity,
      heightFogEnabled,
      heightFogFloor,
      heightFogCeiling,
      heightFogDensity,
      skyParticipates: skyFogEnabled,
      skyFogParticipation,
      skyFogFalloff,
      fogVolumeColorsEnabled,
      skyboxPreset: sharedLevelSettings.skyboxPreset ?? 'observatory',
      skyBackgroundIntensity,
      skyEnvironmentIntensity,
      skyAtmosphereStatus:
        skyFogEnabled && depthFogProfileParticipates
          ? 'skybox horizon haze participates in depth-fog post pass'
          : 'skybox horizon haze disabled',
      oceanParticipates: false,
      oceanPlanarReflector: oceanPlanarReflectorActive,
      oceanStatus: oceanAtmosphereStatus,
      depthFogProfileParticipates,
      depthFogProfileStatus,
      materialFogEnabled: !depthFogProfileParticipates,
      renderProfileId: resolvedRenderProfile.id,
      renderProfileTier: resolvedRenderProfile.tier,
      bloomProfileParticipates,
      colorGradingProfileParticipates,
      kuwaharaProfileParticipates,
      bloomProfileStatus,
      colorGradingProfileStatus,
      kuwaharaProfileStatus,
    },
  })
}
$: if (levelDefinition) {
  replaceRuntimeAtmosphere(runtimeAtmosphere)
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
  activeRuntimeReadinessContract = null
  pendingSceneReady = false
  pendingSpawnPosition = null
  resetRuntimeAtmosphere()
  resetRuntimeVisualStyle()
})
</script>

<LevelManager>
  <T.Group name={`${levelId}-scene-level`} position={position}>
    <Skybox
      path={activeSkyboxPreset.path}
      files={activeSkyboxPreset.files}
      backgroundIntensity={sharedLevelSettings.skybox?.backgroundIntensity ?? 1}
      backgroundBlurriness={sharedLevelSettings.skybox?.backgroundBlurriness ?? 0}
      environmentIntensity={resolvedRenderProfile.reflections.environmentIntensity}
    />

    <SceneAtmosphereSystem
      levelId={levelId}
      atmosphere={runtimeAtmosphere}
      refreshKey={sceneAtmosphereRefreshKey}
      materialFogEnabled={!depthFogProfileParticipates}
    />
    <GroundMistLayer
      atmosphere={runtimeAtmosphere}
      enabled={globalMistEnabled}
      color={runtimeMist.color}
      opacity={globalMistOpacity}
      layers={globalMistLayers}
      baseHeight={globalMistBaseHeight}
      heightStep={globalMistSpacing}
      scale={globalMistScale}
      driftSpeed={finiteNumberOrDefault(runtimeMist.driftSpeed, 0.035)}
    />
    <SceneLightingProfile
      {ambientIntensity}
      {keyLightIntensity}
      {fillLightIntensity}
      renderProfile={resolvedRenderProfile}
    />

    {#if terrainRuntimeData}
      <TerrainRuntime
        levelId={levelId}
        config={terrainRuntimeData.config}
        visualContract={terrainRuntimeData.runtime.visualContract}
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
        enableRising={waterSettings.enableRising ?? false}
        targetLevel={waterSettings.targetLevel ?? waterLevel}
        riseRate={waterSettings.riseRate ?? 0.01}
        color={waterColor}
        opacity={waterSettings.opacity ?? 0.92}
        enableAnimation={waterSettings.enableAnimation ?? true}
        enableUnderwaterEffects={true}
        waterCollisionSize={[
          (waterSettings.size?.width ?? 800) * 0.9,
          2,
          (waterSettings.size?.height ?? 800) * 0.9,
        ]}
        underwaterFogDensity={waterSettings.underwaterFogDensity ?? 0.08}
        underwaterFogColor={underwaterFogColor}
        surfaceFogDensity={0}
        metalness={0.02}
        roughness={0.025}
        envMapIntensity={resolvedRenderProfile.reflections.environmentIntensity}
        reflectionStrength={1.35}
        fresnelPower={7.0}
        enablePlanarReflections={resolvedRenderProfile.reflections.mode === 'planar'}
        reflectionTextureSize={resolvedRenderProfile.reflections.textureSize}
      />
      {#if $underwaterStateStore.isUnderwater || $underwaterStateStore.transitionProgress > 0}
        <UnderwaterOverlay
          {underwaterFogColor}
        />
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

    {#if sceneFireflyFieldEnabled}
      <SceneFireflyField
        enabled={true}
        fieldId={`${levelId}-scene-fireflies`}
        count={sceneFireflyFieldQuality.count}
        lightCount={sceneFireflyFieldQuality.lightCount}
        radius={sharedLevelSettings.fireflies?.radius ?? 120}
        minHeight={sharedLevelSettings.fireflies?.minHeight ?? 2}
        maxHeight={sharedLevelSettings.fireflies?.maxHeight ?? 5}
        center={sharedLevelSettings.fireflies?.center ?? sharedLevelSettings.spawn?.position ?? [0, 0, 0]}
        terrainFollow={sharedLevelSettings.fireflies?.terrainFollow ?? false}
        terrainReady={terrainRuntimeReady}
        getHeightAt={getSceneTerrainHeightAt}
        distribution={sharedLevelSettings.fireflies?.distribution ?? 'uniform'}
        densityExponent={sharedLevelSettings.fireflies?.densityExponent ?? 0.5}
        palette={sharedLevelSettings.fireflies?.palette ?? []}
        interactive={sharedLevelSettings.fireflies?.interactive}
        color={sharedLevelSettings.fireflies?.color ?? '#f4ffb8'}
        secondaryColor={sharedLevelSettings.fireflies?.secondaryColor ?? '#8defff'}
        size={sceneFireflyFieldQuality.size}
        spriteIntensity={sceneFireflyFieldQuality.spriteIntensity}
        lightIntensity={sharedLevelSettings.fireflies?.lightIntensity ?? 44}
        lightDistance={sharedLevelSettings.fireflies?.lightDistance ?? 28}
        lightDecay={sharedLevelSettings.fireflies?.lightDecay ?? 1.35}
        lightBudgeted={sharedLevelSettings.fireflies?.lightBudgeted ?? true}
        twinkleSpeed={sharedLevelSettings.fireflies?.twinkleSpeed ?? 0.82}
        driftSpeed={sharedLevelSettings.fireflies?.driftSpeed ?? 0.28}
        sway={sharedLevelSettings.fireflies?.sway ?? 1.5}
        {levelId}
        {interactionSystem}
        interactiveEnabled={!editorEnabled}
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
          on:npcInteraction={(event) => dispatch('npcInteraction', event.detail)}
        />
      {/each}
    {/if}
  </T.Group>
</LevelManager>
