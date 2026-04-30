<script lang="ts">
import { createEventDispatcher } from 'svelte'
import { levelEditorSettingsStore } from '../editor/editorSelectors'
import SpawnSystem from '../systems/SpawnSystem.svelte'
import type {
  PlayerSpawnRequestedDetail,
  StaticWorldReadyDetail,
} from './levelRuntimeEvents'

const dispatch = createEventDispatcher()

export let isMobile = false
export let editorEnabled = false
export let collisionOverlayEnabled = false
export let currentLevel = 'observatory'
export let currentLevelComponent: any = null
export let parsedTimelineEvents: any[] = []
export let timelineEventsPayload = '[]'
export let currentLevelRenderConfig: {
  offset: [number, number, number]
  spawn: [number, number, number]
} = {
  offset: [0, 0, 0],
  spawn: [0, 1, 0],
}

export let physicsSystemComponent: any = null
export let playerComponentClass: any = null
export let multiplayerManagerComponent: any = null
export let editorCollisionOverlayComponent: any = null
export let editorSceneLayerComponent: any = null
export let editorTerrainSculptLayerComponent: any = null
export let editorViewportControlsComponent: any = null
export let editorWorkbenchLightingComponent: any = null

export let interactionSystemRef: any = null
export let spawnSystemRef: any = null
export let playerComponentRef: any = null
export let physicsReady = false
export let staticWorldReady = false
export let playerReady = false
export let gameplayEnabled = false

export let normalizeLevelId: (levelId: string) => string = levelId => levelId

let activeLevelKey = currentLevel
let activeLevelComponent = currentLevelComponent
let worldSessionId = 0
let pendingPlayerSpawnRequest: PlayerSpawnRequestedDetail | null = null
let lastPlayerSpawnRequestKey = ''
let playerSpawnInFlight = false

function forward(type: string, detail: unknown) {
  dispatch(type, detail)
}

function handleStaticWorldReady(detail: StaticWorldReadyDetail) {
  staticWorldReady = true
  forward('staticWorldReady', detail)
}

function handlePlayerSpawnRequested(detail: PlayerSpawnRequestedDetail) {
  pendingPlayerSpawnRequest = detail
  processPlayerSpawnRequest()
}

async function processPlayerSpawnRequest() {
  if (editorEnabled) return
  if (!staticWorldReady) return
  if (!physicsReady) return
  if (!playerReady) return
  if (playerSpawnInFlight) return
  if (!pendingPlayerSpawnRequest || !spawnSystemRef?.requestSpawn) return

  const requestKey = [
    pendingPlayerSpawnRequest.levelId,
    pendingPlayerSpawnRequest.position.join(','),
    pendingPlayerSpawnRequest.reason,
  ].join(':')
  if (lastPlayerSpawnRequestKey === requestKey) return

  playerSpawnInFlight = true

  try {
    const result = await spawnSystemRef.requestSpawn({
      entityType: 'player',
      position: pendingPlayerSpawnRequest.position,
      metadata: {
        ...pendingPlayerSpawnRequest.metadata,
        levelName: pendingPlayerSpawnRequest.levelId,
        spawnReason: pendingPlayerSpawnRequest.reason,
      },
    })

    if (result?.success) {
      lastPlayerSpawnRequestKey = requestKey
      pendingPlayerSpawnRequest = null
      gameplayEnabled = true
      return
    }

    console.error(
      `GameWorld: Player spawn failed during lifecycle phase. Reason: ${result?.reason ?? 'unknown'}`,
    )
  } catch (error) {
    console.error(
      'GameWorld: Player spawn command threw during lifecycle phase.',
      error,
    )
  } finally {
    playerSpawnInFlight = false
  }
}

function resetWorldSession() {
  worldSessionId += 1
  activeLevelKey = currentLevel
  activeLevelComponent = currentLevelComponent
  staticWorldReady = false
  physicsReady = false
  playerReady = false
  gameplayEnabled = false
  playerComponentRef = null
  pendingPlayerSpawnRequest = null
  lastPlayerSpawnRequestKey = ''
  playerSpawnInFlight = false
  spawnSystemRef?.resetSpawnState?.()
}

$: playerMoveSpeed = $levelEditorSettingsStore?.player?.moveSpeed ?? 5
$: playerJumpForce = $levelEditorSettingsStore?.player?.jumpForce ?? 8
$: playerLightIntensityScale =
  $levelEditorSettingsStore?.player?.lightIntensityScale ?? 60
$: if (!playerComponentRef) {
  playerReady = false
}
$: if (
  currentLevel !== activeLevelKey ||
  currentLevelComponent !== activeLevelComponent
) {
  resetWorldSession()
}
$: {
  staticWorldReady
  physicsReady
  playerReady
  editorEnabled
  spawnSystemRef
  pendingPlayerSpawnRequest
  processPlayerSpawnRequest()
}
</script>

{#if !editorEnabled}
  <SpawnSystem
    bind:this={spawnSystemRef}
    playerComponent={playerComponentRef}
    {playerReady}
    {physicsReady}
    {staticWorldReady}
    on:entitySpawned={(e) => forward('entitySpawned', e.detail)}
  />
{/if}

{#if physicsSystemComponent && playerComponentClass}
  {#key worldSessionId}
    <svelte:component
      this={physicsSystemComponent}
      ccd={true}
      integrationParameters={{
        dt: isMobile ? 1 / 30 : 1 / 60,
        minSolverIterations: isMobile ? 8 : 16
      }}
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
          position={currentLevelRenderConfig.offset}
          playerSpawnPoint={currentLevelRenderConfig.spawn}
          collisionDebugEnabled={editorEnabled && collisionOverlayEnabled}
          on:starSelected={(e) => forward('starSelected', e.detail)}
          on:telescopeInteraction={(e) => forward('telescopeInteraction', e.detail)}
          on:noteRead={(e) => forward('noteRead', e.detail)}
          on:portalTransition={(e) => forward('portalTransition', e.detail)}
          on:requestLevelReturn={(e) => forward('requestLevelReturn', e.detail)}
          on:staticWorldReady={(e) => handleStaticWorldReady(e.detail)}
          on:playerSpawnRequested={(e) => handlePlayerSpawnRequested(e.detail)}
        />
      {/if}

      {#if editorEnabled && editorViewportControlsComponent}
        <svelte:component this={editorViewportControlsComponent} enabled={true} />
      {:else if staticWorldReady}
        <svelte:component
          this={playerComponentClass}
          bind:this={playerComponentRef}
          position={[0, 0, 0]}
          speed={playerMoveSpeed}
          jumpForce={playerJumpForce}
          lightIntensityScale={playerLightIntensityScale}
          {gameplayEnabled}
          on:spawnReadyChange={(e) => {
            playerReady = Boolean(e.detail?.ready)
          }}
          on:interaction={(e) => forward('playerInteraction', e.detail)}
          on:lightBurst={(e) => forward('lightBurst', e.detail)}
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
            interactionSystem={interactionSystemRef}
            on:portalTransition={(e) => forward('portalTransition', e.detail)}
            on:noteRead={(e) => forward('noteRead', e.detail)}
          />
        {/if}
        {#if editorEnabled && editorCollisionOverlayComponent}
          <svelte:component this={editorCollisionOverlayComponent} levelId={currentLevel} />
        {/if}
        {#if editorEnabled && editorTerrainSculptLayerComponent}
          <svelte:component this={editorTerrainSculptLayerComponent} levelId={currentLevel} />
        {/if}
      {/if}
    </svelte:component>
  {/key}
{/if}
