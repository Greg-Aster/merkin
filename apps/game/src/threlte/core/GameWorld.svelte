<script lang="ts">
import { createEventDispatcher } from 'svelte'
import { DEFAULT_LEVEL_ID } from '../levels/levelRegistry'
import { runtimeDebugLog } from '../utils/runtimeLog'
import type {
  PlayerLevelPositionDetail,
  StaticWorldReadyDetail,
} from './levelRuntimeEvents'

const dispatch = createEventDispatcher()

export let isMobile = false
export let editorEnabled = false
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
export let editorCollisionOverlayComponent: any = null
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
let worldSessionId = 0
let levelPlayerPosition: PlayerLevelPositionDetail['position'] | null = null
let levelPlayerRotation: PlayerLevelPositionDetail['rotation'] | null = null
let playerSettings: {
  moveSpeed?: number
  jumpForce?: number
  lightIntensityScale?: number
} = {}

function forward(type: string, detail: unknown) {
  dispatch(type, detail)
}

function handleStaticWorldReady(detail: StaticWorldReadyDetail) {
  const nextPlayerSettings = detail.metadata?.player
  playerSettings =
    nextPlayerSettings && typeof nextPlayerSettings === 'object'
      ? (nextPlayerSettings as typeof playerSettings)
      : {}
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

function resetWorldSession() {
  worldSessionId += 1
  activeLevelKey = currentLevel
  activeLevelComponent = currentLevelComponent
  staticWorldReady = false
  physicsReady = false
  playerReady = false
  gameplayEnabled = false
  playerComponentRef = null
  levelPlayerPosition = null
  levelPlayerRotation = null
  playerSettings = {}
}

$: playerMoveSpeed = playerSettings.moveSpeed ?? 5
$: playerJumpForce = playerSettings.jumpForce ?? 8
$: playerLightIntensityScale = playerSettings.lightIntensityScale ?? 60
$: if (!playerComponentRef) {
  playerReady = false
}
$: gameplayEnabled = Boolean(
  !editorEnabled && staticWorldReady && levelPlayerPosition,
)
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
          collisionDebugEnabled={editorEnabled && collisionOverlayEnabled}
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
        <svelte:component this={editorViewportControlsComponent} enabled={true} />
      {:else if levelPlayerPosition}
        <svelte:component
          this={playerComponentClass}
          bind:this={playerComponentRef}
          position={levelPlayerPosition}
          rotation={levelPlayerRotation ?? [0, 0, 0]}
          speed={playerMoveSpeed}
          jumpForce={playerJumpForce}
          lightIntensityScale={playerLightIntensityScale}
          {gameplayEnabled}
          on:playerReadyChange={(e) => {
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
