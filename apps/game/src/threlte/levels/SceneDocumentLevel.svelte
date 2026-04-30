<script lang="ts">
import { T } from '@threlte/core'
import { createEventDispatcher, onDestroy, onMount } from 'svelte'
import { Color, Group, Quaternion, Vector3 } from 'three'
import AmbientAudioRegions from '../components/AmbientAudioRegions.svelte'
import AmbientParticleField from '../components/AmbientParticleField.svelte'
import SceneFogExp2 from '../components/SceneFogExp2.svelte'
import StarNavigationSystem from '../components/StarNavigationSystem.svelte'
import LevelManager from '../core/LevelManager.svelte'
import type { PlayerSpawnRequestedDetail } from '../core/levelRuntimeEvents'
import { upgradeLegacySceneDocument } from '../editor/defaultScenes'
import { ensureSceneGeneration } from '../editor/editorGeneration'
import { normalizeLevelSceneSettings } from '../editor/editorLevelSetup'
import { loadEditorSceneDocument } from '../editor/editorSceneDocumentLoader'
import type {
  EditorSceneDocument,
  EditorSceneSettings,
} from '../editor/editorTypes'
import {
  type ActorDefinition,
  type LevelDefinition,
  type RuntimeGameplayData,
  adaptEditorSceneToLevelDefinition,
  createActorWorldMatrixResolver,
  createLevelBuildReport,
} from '../engine'
import { withEditorSceneEngineData } from '../engine/sceneDocumentRuntime'
import { Ocean as OceanComponent, UnderwaterOverlay } from '../features/ocean'
import { underwaterStateStore } from '../features/ocean/stores/underwaterStore'
import { playerStateStore } from '../stores/gameStateStore'
import { setRuntimeDiagnostic } from '../stores/runtimeDiagnosticsStore'
import { buildRuntimeVisualStyleFromLevelSettings } from '../styles/GameplayStyleProfiles'
import {
  replaceRuntimeVisualStyle,
  resetRuntimeVisualStyle,
} from '../styles/runtimeVisualStyleStore'
import Skybox from '../systems/Skybox.svelte'
import StarMap from '../systems/StarMap.svelte'
import RuntimeActorBranch from './RuntimeActorBranch.svelte'

const dispatch = createEventDispatcher()

export let levelId: string
export let position: [number, number, number] = [0, 0, 0]
export let editorEnabled = false
export let interactionSystem: any = null
export let playerSpawnPoint: [number, number, number] = [0, 1, 0]
export let timelineEvents: any[] = []

let sceneDocument: EditorSceneDocument | null = null
let levelDefinition: LevelDefinition | null = null
let levelActors: ActorDefinition[] = []
let rootActors: ActorDefinition[] = []
let playerPosition: [number, number, number] = [0, 0, 0]
let starMapComponent: any = null
let starMapRef: Group
let loadToken = 0

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
  const position = definition.spawn?.player ?? playerSpawnPoint
  return [
    Number(position[0]) || 0,
    Number(position[1]) || 0,
    Number(position[2]) || 0,
  ]
}

function dispatchPlayerSpawnRequest(
  level: string,
  spawnPosition: [number, number, number],
) {
  const detail: PlayerSpawnRequestedDetail = {
    levelId: level,
    position: spawnPosition,
    reason: 'level_load',
    metadata: { levelName: level },
  }
  dispatch('playerSpawnRequested', detail)
}

async function loadSceneDocument(level: string, token: number) {
  const loadedScene = await loadEditorSceneDocument(level, {
    includeLocalStorage: false,
  })
  if (token !== loadToken) return

  const baseScene = loadedScene.scene
  const upgradedScene = upgradeLegacySceneDocument(baseScene)

  sceneDocument = withEditorSceneEngineData(
    ensureSceneGeneration({
      ...upgradedScene,
      settings: normalizeLevelSceneSettings(level, upgradedScene.settings),
    }),
  )
  levelDefinition =
    sceneDocument.engine?.levelDefinition ??
    adaptEditorSceneToLevelDefinition(sceneDocument)
  levelActors = levelDefinition.actors
  rootActors = levelActors.filter(actor => !actor.parentId)
  if (token !== loadToken) return

  const buildReport = createLevelBuildReport(levelDefinition)
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

  dispatch('staticWorldReady', {
    levelId: level,
    source: 'scene-document',
    metadata: { actorCount: buildReport.actorCount },
  })
  dispatchPlayerSpawnRequest(level, resolveSpawnPosition(levelDefinition))
}

$: levelSettings = (levelDefinition?.settings ?? {}) as EditorSceneSettings
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
$: if (sceneDocument) {
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
    <T.AmbientLight intensity={ambientIntensity} color="#cfe4ff" />
    <T.HemisphereLight skyColor="#dbe9ff" groundColor="#1b2130" intensity={0.38} />
    <T.DirectionalLight position={[14, 20, -10]} color="#d7e6ff" intensity={keyLightIntensity} />
    <T.DirectionalLight position={[-16, 10, 18]} color="#50688f" intensity={fillLightIntensity} />

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

    {#if !editorEnabled}
      {#each rootActors as actor (actor.id)}
        <RuntimeActorBranch
          {actor}
          actors={levelActors}
          {interactionSystem}
          interactiveEnabled={true}
          on:portalTransition={(event) => dispatch('portalTransition', event.detail)}
          on:noteRead={(event) => dispatch('noteRead', event.detail)}
        />
      {/each}
    {/if}
  </T.Group>
</LevelManager>
