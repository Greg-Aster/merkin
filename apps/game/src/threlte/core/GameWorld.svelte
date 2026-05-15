<script lang="ts">
import { createEventDispatcher } from 'svelte'
import {
  type RuntimePlayerSettings,
  resolveRuntimePlayerSettings,
} from '../engine/runtimePlayerSettings'
import { evaluateLevelRuntimeActivation } from '../engine/levelRuntimeReadinessContract'
import type {
  LevelRuntimeActivationState,
  LevelRuntimeActivationStatus,
  LevelRuntimeReadinessContract,
} from '../engine/types'
import { DEFAULT_LEVEL_ID } from '../levels/levelRegistry'
import { runtimeDebugLog } from '../utils/runtimeLog'
import type {
  PlayerLevelPositionDetail,
  StaticWorldReadyDetail,
} from './levelRuntimeEvents'
import {
  runtimeLoadedColliderUrlsStore,
} from '../stores/runtimeCollisionRegistry'
import { setRuntimeDiagnostic } from '../stores/runtimeDiagnosticsStore'
import type { SceneSettings } from '../engine/sceneDocumentTypes'

const dispatch = createEventDispatcher()

export let isMobile = false
export let editorEnabled = false
export let editorPlaytestEnabled = false
export let collisionOverlayEnabled = false
export let currentLevel = DEFAULT_LEVEL_ID
export let currentLevelComponent: any = null
export let parsedTimelineEvents: any[] = []
export let timelineEventsPayload = '[]'
export let currentLevelRenderConfig: {
  offset: [number, number, number]
} = {
  offset: [0, 0, 0],
}

export let physicsSystemComponent: any = null
export let playerComponentClass: any = null
export let multiplayerManagerComponent: any = null
export let editorSceneLayerComponent: any = null
export let editorTerrainSculptLayerComponent: any = null
export let editorViewportControlsComponent: any = null
export let editorWorkbenchLightingComponent: any = null

export let interactionSystemRef: any = null
export let playerComponentRef: any = null
export let physicsReady = false
export let staticWorldReady = false
export let playerReady = false
export let gameplayEnabled = false

export let normalizeLevelId: (levelId: string) => string = levelId => levelId

let activeLevelKey = currentLevel
let activeLevelComponent = currentLevelComponent
let activeEditorPlaytestMode = editorPlaytestEnabled
let previousEditorPlaytestEnabled = editorPlaytestEnabled
let editorPlaytestRuntimeReady = false
let worldSessionId = 0
let levelPlayerPosition: PlayerLevelPositionDetail['position'] | null = null
let levelPlayerRotation: PlayerLevelPositionDetail['rotation'] | null = null
let runtimePlayerSettings: RuntimePlayerSettings =
  resolveRuntimePlayerSettings(null)
let levelRuntimeReadinessContract: LevelRuntimeReadinessContract | null = null
let staticWorldRuntimeState: LevelRuntimeActivationState = {
  manifestLoaded: false,
  requiredRenderAssetsLoaded: false,
  requiredRenderActorsMounted: false,
  requiredCollisionMounted: false,
  terrainCollisionMounted: false,
  activeInitialCellKeys: [],
  readyInitialCellKeys: [],
  failedInitialCellKeys: [],
  spawnResolved: false,
}
let runtimeActivationStatus: LevelRuntimeActivationStatus | null = null
let lastRuntimeActivationDiagnosticKey = ''
let editorPlaytestSpawnPosition: PlayerLevelPositionDetail['position'] | null =
  null
let editorPlaytestSpawnRotation: PlayerLevelPositionDetail['rotation'] | null =
  null
let editorPlaytestResumePosition: PlayerLevelPositionDetail['position'] | null =
  null
let editorPlaytestResumeRotation: PlayerLevelPositionDetail['rotation'] | null =
  null
let editorPlaytestStartPosition: PlayerLevelPositionDetail['position'] | null =
  null
let editorPlaytestStartRotation: PlayerLevelPositionDetail['rotation'] | null =
  null
let editorPlaytestPlayerSettings: RuntimePlayerSettings =
  resolveRuntimePlayerSettings(null)
let editorSceneSettingsOverride: SceneSettings | null = null

function forward(type: string, detail: unknown) {
  dispatch(type, detail)
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(item => typeof item === 'string')
    : []
}

function handleStaticWorldReady(detail: StaticWorldReadyDetail) {
  if (editorEnabled && activeEditorPlaytestMode) return

  const runtimeReadinessContract = detail.metadata?.runtimeReadinessContract
  levelRuntimeReadinessContract =
    runtimeReadinessContract &&
    typeof runtimeReadinessContract === 'object' &&
    'schemaVersion' in runtimeReadinessContract
      ? (runtimeReadinessContract as LevelRuntimeReadinessContract)
      : null
  const worldPartitionReadiness = detail.metadata?.worldPartitionReadiness as
    | {
        requiredInitialCellsActive?: unknown
        activeInitialCellKeys?: unknown
        readyInitialCellKeys?: unknown
        failedInitialCellKeys?: unknown
      }
    | undefined
  staticWorldRuntimeState = {
    manifestLoaded: true,
    requiredRenderAssetsLoaded: true,
    requiredRenderActorsMounted: true,
    requiredCollisionMounted: true,
    terrainCollisionMounted:
      !levelRuntimeReadinessContract?.runtime.requiredTerrain ||
      Boolean(detail.metadata?.terrainRuntime),
    requiredInitialCellsActive:
      typeof worldPartitionReadiness?.requiredInitialCellsActive === 'boolean'
        ? worldPartitionReadiness.requiredInitialCellsActive
        : undefined,
    activeInitialCellKeys: getStringArray(
      worldPartitionReadiness?.activeInitialCellKeys,
    ),
    readyInitialCellKeys: getStringArray(
      worldPartitionReadiness?.readyInitialCellKeys,
    ),
    failedInitialCellKeys: getStringArray(
      worldPartitionReadiness?.failedInitialCellKeys,
    ),
    spawnResolved: Boolean(levelPlayerPosition),
  }
  runtimePlayerSettings = resolveRuntimePlayerSettings(detail.metadata?.player)
  staticWorldReady = true
  forward('staticWorldReady', detail)
}

function handlePlayerLevelPosition(detail: PlayerLevelPositionDetail) {
  levelPlayerPosition = detail.position
  levelPlayerRotation = detail.rotation ?? [0, 0, 0]
  runtimeDebugLog('GameWorld: Player level position resolved', {
    levelId: detail.levelId,
    position: detail.position,
    rotation: detail.rotation,
    reason: detail.reason,
  })
}

function handleEditorPlaytestSpawn(detail: PlayerLevelPositionDetail) {
  editorPlaytestSpawnPosition = detail.position
  editorPlaytestSpawnRotation = detail.rotation ?? [0, 0, 0]
  editorPlaytestPlayerSettings = resolveRuntimePlayerSettings(
    detail.metadata?.player,
  )
  runtimeDebugLog('GameWorld: Editor playtest spawn resolved', {
    levelId: detail.levelId,
    position: detail.position,
    rotation: detail.rotation,
  })
}

function handleEditorPlaytestReady(detail: StaticWorldReadyDetail) {
  if (!editorEnabled || !activeEditorPlaytestMode) return

  editorPlaytestPlayerSettings = resolveRuntimePlayerSettings(
    detail.metadata?.player,
  )
  editorPlaytestRuntimeReady = true
  staticWorldReady = true
  forward('staticWorldReady', detail)
}

function publishRuntimeActivationDiagnostic(
  status: LevelRuntimeActivationStatus,
) {
  const diagnosticKey = `${status.levelId}:${status.ready}:${status.gates
    .map(gate => `${gate.id}:${gate.required}:${gate.satisfied}`)
    .join('|')}:${status.blockers.join('|')}`
  if (diagnosticKey === lastRuntimeActivationDiagnosticKey) return
  lastRuntimeActivationDiagnosticKey = diagnosticKey

  setRuntimeDiagnostic('runtimeActivation', {
    label: 'Runtime Activation',
    level: status.ready ? 'ready' : 'loading',
    message: status.ready
      ? `${status.levelId}: runtime activation gates are satisfied; gameplay is enabled.`
      : `${status.levelId}: ${status.blockers.length} runtime activation gate(s) are blocking gameplay.`,
    meta: {
      levelId: status.levelId,
      ready: status.ready,
      gates: status.gates,
      blockers: status.blockers,
      observedState: {
        ...staticWorldRuntimeState,
        loadedColliderUrls:
          $runtimeLoadedColliderUrlsStore[activeLevelKey] ?? [],
        physicsWorldReady: physicsReady,
        playerBodyReady: playerReady,
        gameplayEnabled: gameplayActivationRequested,
      },
    },
  })
}

function handlePlayerPoseChange(detail: {
  position?: [number, number, number]
  rotation?: [number, number, number]
}) {
  if (!editorEnabled || !detail.position) return
  editorPlaytestResumePosition = detail.position
  editorPlaytestResumeRotation = detail.rotation ?? editorPlaytestResumeRotation
}

function handleEditorSceneSettingsChange(detail: {
  levelId?: string
  settings?: SceneSettings
}) {
  if (!editorEnabled || detail.levelId !== activeLevelKey) return
  editorSceneSettingsOverride = detail.settings ?? null
}

function resetPhysicsReadiness() {
  staticWorldReady = false
  physicsReady = false
  playerReady = false
  gameplayEnabled = false
  playerComponentRef = null
  editorPlaytestRuntimeReady = false
}

function resetWorldSession() {
  worldSessionId += 1
  activeLevelKey = currentLevel
  activeLevelComponent = currentLevelComponent
  activeEditorPlaytestMode = editorPlaytestEnabled
  previousEditorPlaytestEnabled = editorPlaytestEnabled
  resetPhysicsReadiness()
  levelPlayerPosition = null
  levelPlayerRotation = null
  runtimePlayerSettings = resolveRuntimePlayerSettings(null)
  levelRuntimeReadinessContract = null
  staticWorldRuntimeState = {
    manifestLoaded: false,
    requiredRenderAssetsLoaded: false,
    requiredRenderActorsMounted: false,
    requiredCollisionMounted: false,
    terrainCollisionMounted: false,
    activeInitialCellKeys: [],
    readyInitialCellKeys: [],
    failedInitialCellKeys: [],
    spawnResolved: false,
  }
  runtimeActivationStatus = null
  lastRuntimeActivationDiagnosticKey = ''
  editorPlaytestSpawnPosition = null
  editorPlaytestSpawnRotation = null
  editorPlaytestResumePosition = null
  editorPlaytestResumeRotation = null
  editorPlaytestStartPosition = null
  editorPlaytestStartRotation = null
  editorPlaytestPlayerSettings = resolveRuntimePlayerSettings(null)
  editorSceneSettingsOverride = null
}

$: editorEditPlayerPosition =
  editorPlaytestResumePosition ??
  editorPlaytestSpawnPosition ??
  levelPlayerPosition
$: editorEditPlayerRotation =
  editorPlaytestResumeRotation ??
  editorPlaytestSpawnRotation ??
  levelPlayerRotation
$: editorRuntimePlayerPosition =
  editorPlaytestStartPosition ??
  editorPlaytestSpawnPosition ??
  levelPlayerPosition
$: editorRuntimePlayerRotation =
  editorPlaytestStartRotation ??
  editorPlaytestSpawnRotation ??
  levelPlayerRotation
$: activePlayerPosition = editorEnabled
  ? activeEditorPlaytestMode
    ? editorRuntimePlayerPosition
    : editorEditPlayerPosition
  : levelPlayerPosition
$: activePlayerRotation = editorEnabled
  ? activeEditorPlaytestMode
    ? editorRuntimePlayerRotation
    : editorEditPlayerRotation
  : levelPlayerRotation
$: activePlayerSettings = editorEnabled
  ? editorPlaytestPlayerSettings
  : runtimePlayerSettings
$: playerMoveSpeed = activePlayerSettings.moveSpeed
$: playerSprintMultiplier = activePlayerSettings.sprintMultiplier
$: playerJumpForce = activePlayerSettings.jumpForce
$: playerLightIntensityScale = activePlayerSettings.lightIntensityScale
$: if (!playerComponentRef) {
  playerReady = false
}
$: if (editorPlaytestEnabled !== previousEditorPlaytestEnabled) {
  activeEditorPlaytestMode = editorPlaytestEnabled
  if (activeEditorPlaytestMode) {
    editorPlaytestStartPosition =
      editorPlaytestResumePosition ?? editorPlaytestSpawnPosition
    editorPlaytestStartRotation =
      editorPlaytestResumeRotation ?? editorPlaytestSpawnRotation
    editorPlaytestRuntimeReady = false
  } else {
    editorPlaytestStartPosition = null
    editorPlaytestStartRotation = null
  }
  previousEditorPlaytestEnabled = editorPlaytestEnabled
}
$: playerLevelReady =
  editorEnabled && activeEditorPlaytestMode
    ? editorPlaytestRuntimeReady
    : staticWorldReady
$: gameplayActivationRequested = Boolean(
  (!editorEnabled || activeEditorPlaytestMode) &&
    playerLevelReady &&
    activePlayerPosition &&
    physicsReady &&
    playerReady,
)
$: runtimeActivationStatus = levelRuntimeReadinessContract
  ? evaluateLevelRuntimeActivation(levelRuntimeReadinessContract, {
      ...staticWorldRuntimeState,
      loadedColliderUrls:
        $runtimeLoadedColliderUrlsStore[activeLevelKey] ?? [],
      physicsWorldReady: physicsReady,
      playerBodyReady: playerReady,
      gameplayEnabled: gameplayActivationRequested,
    })
  : null
$: gameplayEnabled = runtimeActivationStatus
  ? runtimeActivationStatus.ready
  : gameplayActivationRequested
$: if (runtimeActivationStatus) {
  publishRuntimeActivationDiagnostic(runtimeActivationStatus)
}
$: if (
  currentLevel !== activeLevelKey ||
  currentLevelComponent !== activeLevelComponent
) {
  resetWorldSession()
}
</script>

{#if physicsSystemComponent && playerComponentClass}
  {#key worldSessionId}
    <svelte:component
      this={physicsSystemComponent}
      ccd={true}
      integrationParameters={{
        dt: isMobile ? 1 / 30 : 1 / 60,
        minSolverIterations: isMobile ? 8 : 16
      }}
      collisionDebugEnabled={collisionOverlayEnabled}
      on:physicsReady={() => {
        physicsReady = true
      }}
    >
      {#if currentLevelComponent}
        <svelte:component
          this={currentLevelComponent}
          levelId={normalizeLevelId(currentLevel)}
          {editorEnabled}
          timelineEvents={parsedTimelineEvents}
          timelineEventsJson={timelineEventsPayload}
          interactionSystem={interactionSystemRef}
          editorSceneSettingsOverride={editorEnabled ? editorSceneSettingsOverride : null}
          position={currentLevelRenderConfig.offset}
          on:starSelected={(e) => forward('starSelected', e.detail)}
          on:telescopeInteraction={(e) => forward('telescopeInteraction', e.detail)}
          on:noteRead={(e) => forward('noteRead', e.detail)}
          on:portalTransition={(e) => forward('portalTransition', e.detail)}
          on:requestLevelReturn={(e) => forward('requestLevelReturn', e.detail)}
          on:staticWorldReady={(e) => handleStaticWorldReady(e.detail)}
          on:playerLevelPosition={(e) => handlePlayerLevelPosition(e.detail)}
        />
      {/if}

      {#if editorEnabled && editorViewportControlsComponent}
        <svelte:component
          this={editorViewportControlsComponent}
          enabled={editorEnabled}
          useActiveCamera={activeEditorPlaytestMode}
        />
      {/if}

      {#if staticWorldReady && activePlayerPosition}
        <svelte:component
          this={playerComponentClass}
          bind:this={playerComponentRef}
          position={activePlayerPosition}
          rotation={activePlayerRotation ?? [0, 0, 0]}
          speed={playerMoveSpeed}
          sprintMultiplier={playerSprintMultiplier}
          jumpForce={playerJumpForce}
          lightIntensityScale={playerLightIntensityScale}
          {gameplayEnabled}
          cameraEnabled={!editorEnabled || activeEditorPlaytestMode}
          on:playerReadyChange={(e) => {
            playerReady = Boolean(e.detail?.ready)
          }}
          on:interaction={(e) => forward('playerInteraction', e.detail)}
          on:lightBurst={(e) => forward('lightBurst', e.detail)}
          on:playerPoseChange={(e) => handlePlayerPoseChange(e.detail)}
        />
      {/if}

      {#if multiplayerManagerComponent}
        <svelte:component this={multiplayerManagerComponent} />
      {/if}

      {#if currentLevel}
        {#if editorWorkbenchLightingComponent}
          <svelte:component this={editorWorkbenchLightingComponent} />
        {/if}
        {#if editorEnabled && editorSceneLayerComponent}
          <svelte:component
            this={editorSceneLayerComponent}
            levelId={currentLevel}
            {editorEnabled}
            playtestEnabled={activeEditorPlaytestMode}
            playtestPlayerPosition={editorPlaytestResumePosition}
            playtestPlayerRotation={editorPlaytestResumeRotation}
            interactionSystem={interactionSystemRef}
            on:portalTransition={(e) => forward('portalTransition', e.detail)}
            on:noteRead={(e) => forward('noteRead', e.detail)}
            on:editorPlaytestSpawn={(e) => handleEditorPlaytestSpawn(e.detail)}
            on:editorPlaytestReady={(e) => handleEditorPlaytestReady(e.detail)}
            on:editorSceneSettingsChange={(e) => handleEditorSceneSettingsChange(e.detail)}
          />
        {/if}
        {#if editorEnabled && editorTerrainSculptLayerComponent}
          <svelte:component this={editorTerrainSculptLayerComponent} levelId={currentLevel} />
        {/if}
      {/if}
    </svelte:component>
  {/key}
{/if}
