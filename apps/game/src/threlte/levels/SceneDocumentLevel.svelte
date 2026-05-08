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
import { getLevelCollisionWorkflow } from '../engine/levelCollisionWorkflow'
import { createLevelBuildReport } from '../engine/levelValidation'
import type { RuntimeGameplayData } from '../engine/runtimeGameplayTypes'
import { traceRuntimeCulling } from '../engine/runtimeCullingTrace'
import { adaptSceneDocumentToLevelDefinition } from '../engine/sceneAdapter'
import type { ActorDefinition, LevelDefinition } from '../engine/types'
import { prepareRequiredLevelRenderAssets } from '../engine/levelAssetPreloader'
import { endLevelRuntimeAssetScope } from '../engine/runtimeAssetManifest'
import { normalizeRuntimeLevelSceneSettings } from '../engine/runtimeLevelSettings'
import { loadRuntimeSceneDocument } from '../engine/runtimeSceneDocumentLoader'
import {
  type RuntimeWorldPartition,
  loadRuntimeWorldPartition,
} from '../engine/runtimeWorldPartition'
import { withSceneEngineData } from '../engine/sceneDocumentRuntime'
import type {
  SceneDocument,
  SceneSettings,
} from '../engine/sceneDocumentTypes'
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
  clearRuntimeRenderedActors,
  setRuntimeActiveActors,
  setRuntimeLevelActors,
  setRequiredRuntimeRenderActors,
} from '../stores/runtimeRenderRegistry'
import { buildRuntimeVisualStyleFromLevelSettings } from '../styles/GameplayStyleProfiles'
import {
  replaceRuntimeVisualStyle,
  resetRuntimeVisualStyle,
} from '../styles/runtimeVisualStyleStore'
import Skybox from '../systems/Skybox.svelte'
import StarMap from '../systems/StarMap.svelte'
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

let sceneDocument: SceneDocument | null = null
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
let starMapComponent: any = null
let starMapRef: Group
let loadToken = 0
let terrainRuntimeData: TerrainRuntimeComponentData | null = null
let terrainRuntimeReady = false
let worldPartition: RuntimeWorldPartition | null = null
let pendingSceneReady = false
let pendingSpawnPosition: [number, number, number] | null = null

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
  const legacySettings = settings as SceneSettings & {
    worldPartition?: WorldPartitionSettings
  }

  return levelSettings?.worldPartition ?? legacySettings.worldPartition ?? null
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

function startActorReveal(onComplete: () => void) {
  cancelActorReveal()
  actorRevealOrder = buildActorRevealOrder(levelActors)
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

function dispatchPlayerLevelPosition(
  level: string,
  spawnPosition: [number, number, number],
) {
  const detail: PlayerLevelPositionDetail = {
    levelId: level,
    position: spawnPosition,
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

function shouldShowTerrainVisualChunks(level: string, settings: SceneSettings) {
  const groundContract = settings.level?.ground
  const visualSource = groundContract?.visualSource

  if (groundContract?.mode === 'hybrid' || visualSource === 'terrain-chunks') {
    return true
  }

  if (visualSource === 'scene-actors' || visualSource === 'none') {
    return false
  }

  const workflow = getLevelCollisionWorkflow(level, settings)
  if (workflow.terrainVisualChunks === 'off') return false
  return true
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
  const groundContract = settings.level?.ground
  const hasAuthoredGroundVisuals = groundContract?.visualSource === 'scene-actors'
  return loadTerrainRuntimeComponentData({
    levelId: level,
    source: terrainSettings.runtimeSource ?? 'editor-manifest',
    manifest,
    manifestUrl: terrainSettings.manifestUrl,
    boundsFallback: manifest.physics?.bounds ?? null,
    showVisualSurface: !hasAuthoredGroundVisuals,
    showVisualChunks: shouldShowTerrainVisualChunks(level, settings),
  })
}

function activateSceneGameplay(
  level: string,
  spawnPosition: [number, number, number],
) {
  dispatchPlayerLevelPosition(level, spawnPosition)
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

async function loadSceneDocumentUnchecked(level: string, token: number) {
  const loadedScene = await loadRuntimeSceneDocument(level)
  if (token !== loadToken) return

  terrainRuntimeData = null
  terrainRuntimeReady = false
  worldPartition = null
  pendingSceneReady = false
  pendingSpawnPosition = null
  renderActorsReady = false
  visibleActorIds = new Set<string>()
  actorRevealOrder = []
  actorRevealIndex = 0
  cancelActorReveal()

  let normalizedSceneSettings: SceneSettings

  if (loadedScene.source === 'runtime-manifest') {
    levelDefinition = loadedScene.levelDefinition
    normalizedSceneSettings = (levelDefinition.settings ?? {}) as SceneSettings
    sceneDocument = null
  } else {
    const baseScene = loadedScene.scene
    normalizedSceneSettings = normalizeRuntimeLevelSceneSettings(
      level,
      baseScene.settings,
    )
    sceneDocument = withSceneEngineData({
      ...baseScene,
      settings: normalizedSceneSettings,
    })
    levelDefinition =
      sceneDocument.engine?.levelDefinition ??
      adaptSceneDocumentToLevelDefinition(sceneDocument)
  }

  terrainRuntimeData = await loadSceneTerrainRuntimeData(
    level,
    normalizedSceneSettings,
  )
  worldPartition = getWorldPartitionSettings(normalizedSceneSettings)
    ? await loadRuntimeWorldPartition(level)
    : null
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

  const preloadReport = await prepareRequiredLevelRenderAssets(
    level,
    buildReport.requiredAssetUrls,
    get(qualityLevelStore),
    {
      maxTier: getRuntimeAssetTierCap(normalizedSceneSettings),
      recordTiming: recordSystemTiming,
    },
  )
  if (token !== loadToken) return
  traceRuntimeCulling({
    levelId: level,
    reason: 'level-render-gate',
    culled: preloadReport.failures.length > 0,
    detail: {
      status: 'preload-complete',
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
    return
  }

  renderActorsReady = true
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
          }
        : null,
    },
  })
  const spawnPosition = resolveSpawnPosition(levelDefinition)
  startActorReveal(() => {
    if (token !== loadToken) return
    requestSceneGameplayActivation(level, spawnPosition)
  })
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
    sceneDocument = null
    levelActors = []
    rootActors = []
    renderActorsReady = false
    visibleActorIds = new Set<string>()
    actorRevealOrder = []
    actorRevealIndex = 0
    terrainRuntimeData = null
    terrainRuntimeReady = false
    worldPartition = null
    pendingSceneReady = false
    pendingSpawnPosition = null
    clearRuntimeRenderedActors(level)
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
$: visibleRootActors = renderActorsReady
  ? rootActors.filter(actor => visibleActorIds.has(actor.id))
  : []
$: runtimeActiveActorIds = new Set(levelActors.map(actor => actor.id))
$: if (renderActorsReady) {
  setRuntimeActiveActors(levelId, Array.from(runtimeActiveActorIds))
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
$: fillLightIntensity = sharedLevelSettings.lighting?.fillLightIntensity ?? 0.2
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
}
onMount(() => {
  const token = ++loadToken
  const unsubscribePlayer = playerStateStore.subscribe(state => {
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
        envMapIntensity={1.8}
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
          {visibleActorIds}
          on:portalTransition={(event) => dispatch('portalTransition', event.detail)}
          on:noteRead={(event) => dispatch('noteRead', event.detail)}
        />
      {/each}
    {/if}
  </T.Group>
</LevelManager>
