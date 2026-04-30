<script lang="ts">
import { T } from '@threlte/core'
import { createEventDispatcher, onDestroy, onMount } from 'svelte'
import { Group } from 'three'
import AmbientAudioRegions from '../components/AmbientAudioRegions.svelte'
import NaturePackVegetation from '../components/NaturePackVegetation.svelte'
import SceneFogExp2 from '../components/SceneFogExp2.svelte'
import LevelManager from '../core/LevelManager.svelte'
import type { PlayerSpawnRequestedDetail } from '../core/levelRuntimeEvents'
import { resolveObservatoryPresetSettings } from '../editor/editorLevelPresets'
import {
  mergeLevelSettings,
  mergeObservatoryEditorSettings,
  normalizeLevelSceneSettings,
} from '../editor/editorLevelSetup'
import {
  loadEditorSceneDocument,
  loadImmediateEditorSceneDocument,
} from '../editor/editorSceneDocumentLoader'
import { observatoryEditorSettingsStore } from '../editor/editorSelectors'
import { editorStateStore } from '../editor/editorSessionStore'
import type {
  EditorSceneSettings,
  ObservatoryEditorSettings,
} from '../editor/editorTypes'
import {
  type LevelBuildReport,
  type LevelDefinition,
  createComponentLevelDefinition,
  createLevelBuildReport,
} from '../engine'
import { Ocean as OceanComponent, UnderwaterOverlay } from '../features/ocean'
import { underwaterStateStore } from '../features/ocean/stores/underwaterStore'
import { OptimizationLevel, optimizationManager } from '../features/performance'
import {
  qualityLevelStore,
  qualitySettingsStore,
} from '../features/performance/stores/performanceStore'
import {
  type HeightmapConfig,
  TerrainRuntime,
  type TerrainRuntimeComponentData,
  loadTerrainRuntimeComponentData,
  terrainStore,
} from '../features/terrain'
import { setRuntimeDiagnostic } from '../stores/runtimeDiagnosticsStore'
import { buildRuntimeVisualStyleFromLevelSettings } from '../styles/GameplayStyleProfiles'
import {
  replaceRuntimeVisualStyle,
  resetRuntimeVisualStyle,
} from '../styles/runtimeVisualStyleStore'

const dispatch = createEventDispatcher()
const isDev = import.meta.env.DEV
const isMobileDevice =
  typeof navigator !== 'undefined' &&
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  )

// --- Props ---
// The manifest URL is now the primary input for configuring the level
export let manifestUrl: string =
  '/terrain/observatory-environment.manifest.json' // Generated manifest path
export let levelId = 'observatory'
export let timelineEvents: any[] = []
export let timelineEventsJson: string = '[]'
export let interactionSystem: any = null

// --- State ---
let manifest: any = null // Will hold the loaded level manifest data
let terrainRuntimeData: TerrainRuntimeComponentData | null = null

// Component references
let hybridFireflyComponent: any = null
let starMapComponent: any = null
let naturePackVegetation: any = null
let skyboxComponent: any = null
let hybridFireflyComponentType: any = null
let starMapComponentType: any = null
let terrainRuntimeReady = false
let starMapRef: Group
let deferredEnvironmentBootStarted = false
let showOcean = false
let showFireflies = false
let showVegetation = false
let showStarSystems = false
const deferredSceneBootCleanups: Array<() => void> = []
// Timeline data state
let realTimelineEvents: any[] = []
let timelineLoadError: string | null = null
let appliedTerrainOverrideSignature = ''
let loadToken = 0
let authoredObservatorySettings: ObservatoryEditorSettings | null = null
let authoredObservatorySettingsReady = false
let lastPlayerSpawnRequestKey = ''
let componentLevelDefinition: LevelDefinition | null = null
let componentLevelBuildReport: LevelBuildReport | null = null

function mergeDeep<T>(base: T, overrides: Partial<T> | null | undefined): T {
  if (!overrides) return structuredClone(base)

  if (Array.isArray(base) || Array.isArray(overrides)) {
    return structuredClone(overrides as T)
  }

  const result: Record<string, unknown> = {
    ...(structuredClone(base) as Record<string, unknown>),
  }
  for (const [key, value] of Object.entries(overrides)) {
    const current = result[key]
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      current &&
      typeof current === 'object' &&
      !Array.isArray(current)
    ) {
      result[key] = mergeDeep(
        current as Record<string, unknown>,
        value as Record<string, unknown>,
      )
    } else {
      result[key] = structuredClone(value)
    }
  }

  return result as T
}

function applyObservatoryEditorSettings(
  baseManifest: any,
  editorSettings: any,
) {
  if (!baseManifest) return null
  if (!editorSettings) return structuredClone(baseManifest)

  const merged = mergeDeep(baseManifest, {
    spawn: editorSettings.spawn,
    features: editorSettings.features,
    style: editorSettings.style,
    ocean: editorSettings.ocean,
    ambientAudio: editorSettings.ambientAudio,
  })

  return {
    ...merged,
    editorLighting: {
      ambientIntensity: editorSettings.lighting?.ambientIntensity,
      sunIntensity: editorSettings.lighting?.sunIntensity,
      fillIntensity: editorSettings.lighting?.fillIntensity,
      fallbackAmbientIntensity:
        editorSettings.lighting?.fallbackAmbientIntensity,
      fallbackMoonlightIntensity:
        editorSettings.lighting?.fallbackMoonlightIntensity,
      fallbackFillLightIntensity:
        editorSettings.lighting?.fallbackFillLightIntensity,
    },
  }
}

function resolvePackagedObservatorySettings() {
  const { scene } = loadImmediateEditorSceneDocument('observatory', {
    includeDisk: false,
    includeLocalStorage: false,
  })
  return normalizeLevelSceneSettings('observatory', scene.settings)
}

async function loadAuthoredObservatorySettings(token: number) {
  const loadedScene = await loadEditorSceneDocument('observatory', {
    includeLocalStorage: false,
  })
  if (token !== loadToken) return

  const packagedSettings = resolvePackagedObservatorySettings()
  const loadedSettings =
    loadedScene.source === 'disk'
      ? normalizeLevelSceneSettings('observatory', loadedScene.scene.settings)
      : {}
  authoredObservatorySettings = mergeObservatoryEditorSettings(
    mergeLevelSettings<EditorSceneSettings>(packagedSettings, loadedSettings),
  )
  authoredObservatorySettingsReady = true
}

function resolvePlayerSpawnPosition(): [number, number, number] | null {
  const position =
    componentLevelDefinition?.spawn.player ?? activeManifest?.spawn?.position
  if (!position) return null

  return [
    Number(position[0]) || 0,
    Number(position[1]) || 0,
    Number(position[2]) || 0,
  ]
}

function requestPlayerSpawn() {
  if (!terrainRuntimeReady || !authoredObservatorySettingsReady) return
  if (!activeManifest) return
  if (componentLevelBuildReport?.errors.length) return

  const requestedSpawn = resolvePlayerSpawnPosition()
  if (!requestedSpawn) return

  const spawnHeight = getHeightAt(requestedSpawn[0], requestedSpawn[2])
  const spawnPosition: [number, number, number] = [
    requestedSpawn[0],
    Math.max(requestedSpawn[1], spawnHeight + 2),
    requestedSpawn[2],
  ]
  const requestKey = `${activeManifest.id}:${spawnPosition.join(',')}`
  if (lastPlayerSpawnRequestKey === requestKey) return

  const detail: PlayerSpawnRequestedDetail = {
    levelId: activeManifest.id,
    position: spawnPosition,
    reason: 'level_load',
    metadata: {
      levelName: activeManifest.name,
      levelDefinitionId: componentLevelDefinition?.id,
    },
  }
  dispatch('playerSpawnRequested', detail)
  lastPlayerSpawnRequestKey = requestKey
}

// --- Lifecycle & Data Loading ---
onMount(() => {
  const token = ++loadToken
  terrainRuntimeReady = false
  authoredObservatorySettingsReady = false
  lastPlayerSpawnRequestKey = ''
  void ensureSkyboxComponent()
  void loadLevelFromManifest(token)
  void loadAuthoredObservatorySettings(token)
  void loadTimelineData(token)
})

onDestroy(() => {
  resetRuntimeVisualStyle()
  deferredSceneBootCleanups.forEach(cleanup => cleanup())
  deferredSceneBootCleanups.length = 0
})

async function loadLevelFromManifest(token: number) {
  setRuntimeDiagnostic('levelBoot', {
    level: 'loading',
    message: 'Loading level manifest and terrain configuration.',
  })

  try {
    const response = await fetch(manifestUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch level manifest: ${response.statusText}`)
    }
    const data = await response.json()
    if (token !== loadToken) return
    manifest = data

    const terrainBounds = manifest.physics?.bounds ?? null
    let heightmapConfig: HeightmapConfig | null = null

    terrainRuntimeData = await loadTerrainRuntimeComponentData({
      levelId,
      source: 'built-in-manifest',
      manifest,
      manifestUrl,
      boundsFallback: manifest.physics?.bounds ?? terrainBounds,
    })
    heightmapConfig = terrainRuntimeData.heightmapConfig

    // Validate height parameters match between manifest and config
    if (
      heightmapConfig?.minHeight !== undefined &&
      heightmapConfig.maxHeight !== undefined &&
      (Math.abs(heightmapConfig.minHeight - manifest.physics.minHeight) >
        0.01 ||
        Math.abs(heightmapConfig.maxHeight - manifest.physics.maxHeight) > 0.01)
    ) {
      if (isDev)
        console.warn('⚠️ Height parameter mismatch detected:', {
          configMinHeight: heightmapConfig.minHeight,
          manifestMinHeight: manifest.physics.minHeight,
          configMaxHeight: heightmapConfig.maxHeight,
          manifestMaxHeight: manifest.physics.maxHeight,
          usingConfigValues: true,
        })
    }

    // Register optimization settings from the manifest
    optimizationManager.registerComponent(manifest.id, {
      componentId: manifest.id,
      optimizationSettings: {
        [OptimizationLevel.ULTRA_LOW]: {
          oceanSegments: manifest.optimization.oceanSegments.ultra_low,
          terrainSegments: manifest.optimization.terrainSegments.ultra_low,
        },
        [OptimizationLevel.LOW]: {
          oceanSegments: manifest.optimization.oceanSegments.low,
          terrainSegments: manifest.optimization.terrainSegments.low,
        },
        [OptimizationLevel.MEDIUM]: {
          oceanSegments: manifest.optimization.oceanSegments.medium,
          terrainSegments: manifest.optimization.terrainSegments.medium,
        },
        [OptimizationLevel.HIGH]: {
          oceanSegments: manifest.optimization.oceanSegments.high,
          terrainSegments: manifest.optimization.terrainSegments.high,
        },
        [OptimizationLevel.ULTRA]: {
          oceanSegments: manifest.optimization.oceanSegments.ultra,
          terrainSegments: manifest.optimization.terrainSegments.ultra,
        },
      },
    })

    if (token !== loadToken) return

    if (isDev)
      console.log(
        `✅ Level "${manifest.name}" loaded successfully from manifest.`,
      )
    setRuntimeDiagnostic('levelBoot', {
      level: 'ready',
      message: `Loaded ${manifest.name} manifest and terrain configuration.`,
      meta: {
        manifestId: manifest.id,
        manifestUrl,
      },
    })
  } catch (error) {
    if (token !== loadToken) return
    console.error(`❌ Failed to load level from ${manifestUrl}:`, error)
    setRuntimeDiagnostic('levelBoot', {
      level: 'error',
      message:
        error instanceof Error ? error.message : 'Unknown level load failure.',
      meta: { manifestUrl },
    })
  }
}

// Fast height function for other components (uses unified terrain system)
function getHeightAt(x: number, z: number): number {
  if ($terrainStore.manager) {
    return $terrainStore.manager.getHeightAt(x, z)
  }
  return -1000
}

// --- Timeline Data Handling ---
async function loadTimelineData(token: number) {
  setRuntimeDiagnostic('timeline', {
    level: 'loading',
    message: 'Loading timeline data for star systems.',
  })

  try {
    timelineLoadError = null
    if (timelineEventsJson && timelineEventsJson !== '[]') {
      realTimelineEvents = JSON.parse(timelineEventsJson)
    } else if (timelineEvents.length > 0) {
      realTimelineEvents = timelineEvents
    } else {
      realTimelineEvents = []
    }
    if (token !== loadToken) return
    setRuntimeDiagnostic('timeline', {
      level: 'ready',
      message: `Loaded ${realTimelineEvents.length} timeline events.`,
      meta: {
        eventCount: realTimelineEvents.length,
      },
    })
  } catch (error) {
    if (token !== loadToken) return
    console.error('❌ Failed to process timeline data:', error)
    timelineLoadError = error instanceof Error ? error.message : 'Unknown error'
    setRuntimeDiagnostic('timeline', {
      level: 'error',
      message: timelineLoadError,
    })
  }
}

// --- Event Handlers ---
function handleStarSelected(event: CustomEvent) {
  dispatch('starSelected', event.detail)
}
function handleStarDeselected(event: CustomEvent) {
  dispatch('starDeselected', event.detail)
}
function handleLevelTransition(event: CustomEvent) {
  dispatch('levelTransition', event.detail)
}
// Get current optimization settings reactively
$: resolvedObservatorySettings = resolveObservatoryPresetSettings(
  mergeLevelSettings<ObservatoryEditorSettings>(
    authoredObservatorySettings ?? {},
    $observatoryEditorSettingsStore ?? {},
  ),
)
$: activeManifest = manifest
  ? applyObservatoryEditorSettings(manifest, resolvedObservatorySettings)
  : null
$: componentLevelDefinition =
  activeManifest && terrainRuntimeData
    ? createComponentLevelDefinition({
        levelId,
        title: activeManifest.name ?? 'Observatory',
        spawn: activeManifest.spawn?.position ?? [-137.2, 20, -49.5],
        settings: activeManifest,
        terrain: {
          id: `${levelId}-terrain`,
          name: activeManifest.name ?? 'Observatory Terrain',
          manifestUrl,
          heightmapUrl: terrainRuntimeData.manifest.assets?.heightmap,
          worldSize: terrainRuntimeData.config.worldSize,
          worldSizeX: terrainRuntimeData.config.worldSizeX,
          worldSizeZ: terrainRuntimeData.config.worldSizeZ,
          bounds: terrainRuntimeData.config.bounds,
        },
        systemActorIds: [
          `${levelId}-ocean-system`,
          `${levelId}-vegetation-system`,
          `${levelId}-star-map-system`,
        ],
      })
    : null
$: componentLevelBuildReport = componentLevelDefinition
  ? createLevelBuildReport(componentLevelDefinition)
  : null
$: if (componentLevelBuildReport) {
  setRuntimeDiagnostic('levelDefinition', {
    label: 'Level Definition',
    level: componentLevelBuildReport.errors.length
      ? 'error'
      : componentLevelBuildReport.warnings.length
        ? 'warning'
        : 'ready',
    message: componentLevelBuildReport.errors.length
      ? `${componentLevelBuildReport.levelId}: component level contract failed with ${componentLevelBuildReport.errors.length} errors.`
      : `${componentLevelBuildReport.levelId}: ${componentLevelBuildReport.actorCount} component actors, ${componentLevelBuildReport.physicsActorCount} physics actors.`,
    meta: componentLevelBuildReport as unknown as Record<string, unknown>,
  })
}
$: terrainAuthoringActive =
  $editorStateStore.enabled && $editorStateStore.interactionMode === 'terrain'
$: workbenchViewport =
  $editorStateStore.enabled &&
  $editorStateStore.viewportLightingMode === 'workbench'
$: if (activeManifest) {
  replaceRuntimeVisualStyle(
    buildRuntimeVisualStyleFromLevelSettings(activeManifest),
  )
}
$: {
  terrainRuntimeReady
  authoredObservatorySettingsReady
  activeManifest
  requestPlayerSpawn()
}
$: levelOptimizationSettings = activeManifest
  ? optimizationManager.getComponentSettings(activeManifest.id)
  : null
$: fallbackMoodLightingEnabled = !!activeManifest?.features.styles
$: observatoryToneMappingExposure = (() => {
  if (!isMobileDevice) return 1.2
  switch ($qualityLevelStore) {
    case OptimizationLevel.ULTRA_LOW:
    case OptimizationLevel.LOW:
      return 1.26
    case OptimizationLevel.MEDIUM:
      return 1.24
    default:
      return 1.22
  }
})()
$: observatoryAmbientIntensity =
  activeManifest?.editorLighting?.ambientIntensity ??
  (() => {
    if (!isMobileDevice) return 10.4
    switch ($qualityLevelStore) {
      case OptimizationLevel.ULTRA_LOW:
      case OptimizationLevel.LOW:
        return 12.4
      case OptimizationLevel.MEDIUM:
        return 11.8
      default:
        return 11.0
    }
  })()
$: observatorySunIntensity =
  activeManifest?.editorLighting?.sunIntensity ?? (isMobileDevice ? 0.92 : 0.8)
$: observatoryFillIntensity =
  activeManifest?.editorLighting?.fillIntensity ?? (isMobileDevice ? 0.38 : 0.3)
$: fallbackAmbientIntensity =
  activeManifest?.editorLighting?.fallbackAmbientIntensity ??
  (isMobileDevice ? 6.2 : 4.8)
$: fallbackMoonlightIntensity =
  activeManifest?.editorLighting?.fallbackMoonlightIntensity ??
  (isMobileDevice ? 0.62 : 0.45)
$: fallbackFillLightIntensity =
  activeManifest?.editorLighting?.fallbackFillLightIntensity ??
  (isMobileDevice ? 0.3 : 0.2)
$: presetAmbientAudioRegions =
  activeManifest?.ambientAudio?.enabled && activeManifest?.ambientAudio?.track
    ? [
        {
          id: 'observatory-preset-ambient-audio',
          position: activeManifest.ambientAudio.position ?? [0, 18, 0],
          scale: activeManifest.ambientAudio.scale ?? [520, 140, 520],
          track: activeManifest.ambientAudio.track,
          volume: activeManifest.ambientAudio.volume ?? 0.16,
          falloff: activeManifest.ambientAudio.falloff ?? 28,
        },
      ]
    : []
$: vegetationInstanceCount = (() => {
  switch ($qualityLevelStore) {
    case OptimizationLevel.ULTRA_LOW:
      return 0
    case OptimizationLevel.LOW:
      return 12
    case OptimizationLevel.MEDIUM:
      return 28
    case OptimizationLevel.HIGH:
      return 60
    case OptimizationLevel.ULTRA:
      return 96
    default:
      return 28
  }
})()
$: oceanAnimationEnabled =
  activeManifest?.ocean?.enableAnimation !== false &&
  $qualityLevelStore !== OptimizationLevel.ULTRA_LOW

$: if (
  terrainRuntimeReady &&
  activeManifest &&
  !deferredEnvironmentBootStarted
) {
  startDeferredSceneBoot()
}
$: if (deferredEnvironmentBootStarted && activeManifest) {
  if (!activeManifest.features.ocean) showOcean = false
  if (!activeManifest.features.vegetation) showVegetation = false
  if (!activeManifest.features.fireflies) showFireflies = false
  if (!activeManifest.features.starMap || !!timelineLoadError)
    showStarSystems = false
}
$: terrainOverrideSignature = JSON.stringify(
  $observatoryEditorSettingsStore?.terrainSculpt?.heightOverrides ?? {},
)
$: if (
  $terrainStore.manager &&
  terrainOverrideSignature !== appliedTerrainOverrideSignature
) {
  $terrainStore.manager.applyHeightOverrides(
    $observatoryEditorSettingsStore?.terrainSculpt?.heightOverrides ?? {},
  )
  terrainStore.update(state => ({
    ...state,
    heightData: $terrainStore.manager?.getHeightDataCopy() ?? state.heightData,
  }))
  appliedTerrainOverrideSignature = terrainOverrideSignature
}

async function ensureSkyboxComponent() {
  if (skyboxComponent) return
  const module = await import('../systems/Skybox.svelte')
  skyboxComponent = module.default
}

async function ensureHybridFireflyComponent() {
  if (hybridFireflyComponentType) return
  const module = await import('../components/HybridFireflyComponent.svelte')
  hybridFireflyComponentType = module.default
}

async function ensureStarMapComponent() {
  if (starMapComponentType) return
  const module = await import('../systems/StarMap.svelte')
  starMapComponentType = module.default
}

function scheduleDeferredSceneTask(
  task: () => void | Promise<void>,
  delay = 0,
) {
  if (typeof window === 'undefined') return () => {}

  let cancelled = false
  let delayTimeoutId: number | null = null
  let idleCallbackId: number | null = null
  let fallbackTimeoutId: number | null = null

  const cleanup = () => {
    cancelled = true

    if (delayTimeoutId !== null) {
      window.clearTimeout(delayTimeoutId)
    }

    if (idleCallbackId !== null && 'cancelIdleCallback' in window) {
      window.cancelIdleCallback(idleCallbackId)
    }

    if (fallbackTimeoutId !== null) {
      window.clearTimeout(fallbackTimeoutId)
    }
  }

  const runTask = () => {
    if (cancelled) return
    void task()
  }

  const queueTask = () => {
    if (cancelled) return

    if ('requestIdleCallback' in window) {
      idleCallbackId = window.requestIdleCallback(
        () => {
          runTask()
        },
        { timeout: 300 },
      )
      return
    }

    fallbackTimeoutId = window.setTimeout(() => {
      runTask()
    }, 16)
  }

  delayTimeoutId = window.setTimeout(() => {
    queueTask()
  }, delay)

  return cleanup
}

function startDeferredSceneBoot() {
  if (deferredEnvironmentBootStarted) return
  deferredEnvironmentBootStarted = true

  if (activeManifest?.features.ocean) {
    deferredSceneBootCleanups.push(
      scheduleDeferredSceneTask(() => {
        showOcean = true
      }, 0),
    )
  }

  if (activeManifest?.features.starMap && !timelineLoadError) {
    deferredSceneBootCleanups.push(
      scheduleDeferredSceneTask(async () => {
        await ensureStarMapComponent()
        showStarSystems = true
      }, 60),
    )
  }

  if (activeManifest?.features.fireflies) {
    deferredSceneBootCleanups.push(
      scheduleDeferredSceneTask(async () => {
        await ensureHybridFireflyComponent()
        showFireflies = true
      }, 180),
    )
  }

  if (activeManifest?.features.vegetation) {
    deferredSceneBootCleanups.push(
      scheduleDeferredSceneTask(() => {
        showVegetation = true
      }, 320),
    )
  }
}
</script>

{#if activeManifest}
  <LevelManager let:registry let:lighting let:ecsWorld>
    
    <!-- Render style can be swapped independently of level content. -->
    {#if fallbackMoodLightingEnabled}
      <T.AmbientLight color="#1a2238" intensity={fallbackAmbientIntensity} />
      <T.DirectionalLight
        position={[40, 70, 20]}
        color="#b8c7ff"
        intensity={fallbackMoonlightIntensity}
        castShadow={false}
      />
      <T.DirectionalLight
        position={[-30, 35, -24]}
        color="#23324d"
        intensity={fallbackFillLightIntensity}
        castShadow={false}
      />
    {/if}
    
    <!-- Dynamic fog based on manifest style configuration -->
    <SceneFogExp2
      color={$underwaterStateStore.isUnderwater 
        ? (activeManifest.style?.fog?.color || '#006994')
        : (activeManifest.style?.fog?.color || '#6a7db3')}
      density={$underwaterStateStore.isUnderwater 
        ? (activeManifest.style?.fog?.density * 50 || 0.1)
        : (activeManifest.style?.fog?.density || 0.002)}
    />
    
    <T.Group name={activeManifest.id}>
      {#if skyboxComponent}
        <svelte:component
          this={skyboxComponent}
          path="/assets/hdri/skywip4-cubemap/"
          files={['px.webp', 'nx.webp', 'py.webp', 'ny.webp', 'pz.webp','nz.webp']}
        />
      {/if}
      
      {#if terrainRuntimeData}
        <TerrainRuntime 
          levelId={terrainRuntimeData.levelId}
          config={terrainRuntimeData.config}
          collisionStrategy={terrainRuntimeData.runtime.collisionStrategy}
          showVisualChunks={!terrainAuthoringActive}
          showVisualSurface={terrainRuntimeData.runtime.showVisualSurface}
          on:staticWorldReady
          on:terrainRuntimeReady={(e) => {
            terrainRuntimeReady = true
          }}
        />
      {/if}
      
      <!-- Ocean Component - configured from manifest -->
      {#if activeManifest.features.ocean && showOcean}
        <OceanComponent
          size={{ 
            width: activeManifest.ocean?.size?.width || 1000, 
            height: activeManifest.ocean?.size?.height || 1000 
          }}
          color={activeManifest.ocean?.underwaterFogColor || 0x006994}
          opacity={0.9}
          segments={levelOptimizationSettings?.oceanSegments || { width: 24, height: 24 }}
          enableAnimation={oceanAnimationEnabled}
          animationSpeed={0.1}
          enableRising={activeManifest.ocean?.enableRising || false}
          initialLevel={activeManifest.ocean?.initialLevel || 0}
          targetLevel={activeManifest.ocean?.targetLevel || 0}
          riseRate={activeManifest.ocean?.riseRate || 0.01}
          enableUnderwaterEffects={true}
          waterCollisionSize={[
            800, 
            3.0, 
            800
          ]}
          underwaterFogDensity={activeManifest.ocean?.underwaterFogDensity || 0.1}
          underwaterFogColor={activeManifest.ocean?.underwaterFogColor || 0x006994}
          surfaceFogDensity={activeManifest.ocean?.surfaceFogDensity || 0.001}
          on:waterEnter={(e) => {
            if (isDev) console.log('🌊 Player entered water at depth:', e.detail.depth)
          }}
          on:waterExit={() => {
            if (isDev) console.log('🏖️ Player exited water')
          }}
          metalness={0.1}
          roughness={0.03}
          envMapIntensity={2.0}
        />
        {#if $underwaterStateStore.isUnderwater || $underwaterStateStore.transitionProgress > 0}
          <UnderwaterOverlay />
        {/if}
      {/if}

      {#if presetAmbientAudioRegions.length > 0}
        <AmbientAudioRegions regions={presetAmbientAudioRegions} enabled={true} />
      {/if}

      <!-- Nature Pack Vegetation System - configured from manifest -->
      {#if activeManifest.features.vegetation && showVegetation && terrainRuntimeReady && vegetationInstanceCount > 0}
        <NaturePackVegetation
          bind:this={naturePackVegetation}
          {getHeightAt}
          count={vegetationInstanceCount}
          radius={160}
          density={0.9}
          enableLOD={true}
          on:vegetationReady={(e) => {
            if (isDev) console.log('🌱 Vegetation ready:', e.detail)
          }}
        />
      {/if}

      <!-- Hybrid Firefly Component - configured from manifest -->
      {#if activeManifest.features.fireflies && showFireflies && hybridFireflyComponentType}
        <svelte:component
          this={hybridFireflyComponentType}
          bind:this={hybridFireflyComponent}
          {getHeightAt}
          {interactionSystem}
          count={100}
          lightIntensity={50.0}
          lightRange={500}
          cycleDuration={24.0}
          fadeSpeed={4.0}
          heightRange={{ min: 2.0, max: 5.0 }}
          radius={180}
          pointSize={25.0}
          movement={{
            speed: 0.01,
            wanderSpeed: 0.002,
            wanderRadius: 4,
            floatAmplitude: { x: .5, y: 0.5, z: 1.5 },
            lerpFactor: 1.0
          }}
          colors={[0x87ceeb, 0x98fb98, 0xffffe0, 0xdda0dd, 0xf0e68c, 0xffa07a, 0x20b2aa, 0x9370db]}
          enableAIConversations={activeManifest.features.conversations}
          conversationChance={.15}
        />
      {/if}
      
      <!-- Star Map and Navigation System - configured from manifest -->
      {#if activeManifest.features.starMap}
        {#if timelineLoadError}
          <T.Group position={[0, 5, 0]} name="error-indicator">
            <T.Mesh>
              <T.SphereGeometry args={[2]} />
            <T.MeshBasicMaterial color="#ff0044" transparent opacity={0.6} />
          </T.Mesh>
        </T.Group>
        {:else if showStarSystems && starMapComponentType}
          <svelte:component
            this={starMapComponentType}
            bind:this={starMapComponent}
            bind:starMapRef={starMapRef}
            timelineEvents={realTimelineEvents}
            {interactionSystem}
            on:starSelected={handleStarSelected}
          />
        {/if}
      {/if}
      
    </T.Group>
  </LevelManager>
{:else}
  <!-- Loading state while manifest loads -->
  <T.Group position={[0, 10, 0]}>
    <T.Mesh>
      <T.SphereGeometry args={[1]} />
      <T.MeshBasicMaterial color="#ffaa00" transparent opacity={0.8} />
    </T.Mesh>
  </T.Group>
{/if}
