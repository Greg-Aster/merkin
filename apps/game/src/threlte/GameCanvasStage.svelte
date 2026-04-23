<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Canvas } from '@threlte/core'
  import EventBus from './systems/EventBus.svelte'
  import InteractionSystem from './systems/InteractionSystem.svelte'
  import Time from './systems/Time.svelte'
  import AssetLoader from './systems/AssetLoader.svelte'
  import Renderer from './systems/Renderer.svelte'
  import SimplePostProcessing from './systems/SimplePostProcessing.svelte'
  import SpawnSystem from './systems/SpawnSystem.svelte'
  import PerformanceSystem from './features/performance/systems/Performance.svelte'
  import LODSystem from './features/performance/systems/LOD.svelte'
  import { qualitySettingsStore } from './features/performance/stores/performanceStore'
  import { levelEditorSettingsStore } from './editor/editorStore'
  import { isSettingsMenuOpen } from './stores/uiStore'

  const dispatch = createEventDispatcher()

  export let isInitialized = false
  export let error: string | null = null
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

  export let audioSystemComponent: any = null
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
  export let terrainReady = false
  export let playerReady = false

  export let normalizeLevelId: (levelId: string) => string = (levelId) => levelId

  function forward(type: string, detail: unknown) {
    dispatch(type, detail)
  }

  $: playerMoveSpeed = $levelEditorSettingsStore?.player?.moveSpeed ?? 5
  $: playerJumpForce = $levelEditorSettingsStore?.player?.jumpForce ?? 8
  $: playerLightIntensityScale = $levelEditorSettingsStore?.player?.lightIntensityScale ?? 60
  $: if (!playerComponentRef) {
    playerReady = false
  }
</script>

{#if isInitialized && !error}
  <div style="pointer-events: {$isSettingsMenuOpen ? 'none' : 'auto'}; width: 100%; height: 100%;">
    <Canvas>
      <EventBus
        on:levelTransition={(e) => forward('levelTransition', e.detail)}
        on:starSelected={(e) => forward('starSelected', e.detail)}
        on:starDeselected={(e) => forward('starDeselected', e.detail)}
      />

      <InteractionSystem
        bind:this={interactionSystemRef}
        on:objectClick={(e) => forward('objectClick', e.detail)}
      />

      <Time on:timeUpdate={(e) => forward('timeUpdate', e.detail)} />

      <PerformanceSystem
        enablePerformanceMonitoring={true}
        enableAutomaticOptimization={true}
        on:performanceUpdate={(e) => forward('performanceUpdate', e.detail)}
        on:qualityChanged={(e) => forward('qualityChanged', e.detail)}
      />

      <LODSystem
        enableLOD={true}
        maxDistance={200}
        updateFrequency={0.1}
        enableCulling={true}
        on:lodLevelChanged={(e) => forward('lodLevelChanged', e.detail)}
      />

      <AssetLoader />
      <Renderer />

      {#if $qualitySettingsStore.enablePostProcessing && terrainReady && (editorEnabled || playerReady)}
        <SimplePostProcessing toneMappingExposure={1.0} />
      {/if}

      {#if audioSystemComponent}
        <svelte:component this={audioSystemComponent} enabled={true} />
      {/if}

      {#if !editorEnabled}
        <SpawnSystem
          bind:this={spawnSystemRef}
          playerComponent={playerComponentRef}
          {playerReady}
          {physicsReady}
          {terrainReady}
          on:entitySpawned={(e) => forward('entitySpawned', e.detail)}
        />
      {/if}

      {#if physicsSystemComponent && playerComponentClass}
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
          {#if editorEnabled && editorViewportControlsComponent}
            <svelte:component this={editorViewportControlsComponent} enabled={true} />
          {:else}
            <svelte:component
              this={playerComponentClass}
              bind:this={playerComponentRef}
              position={[0, 0, 0]}
              speed={playerMoveSpeed}
              jumpForce={playerJumpForce}
              lightIntensityScale={playerLightIntensityScale}
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

          {#if currentLevelComponent}
            {#key `${currentLevel}:${currentLevelComponent}`}
              <svelte:component
                this={currentLevelComponent}
                levelId={normalizeLevelId(currentLevel)}
                {editorEnabled}
                timelineEvents={parsedTimelineEvents}
                timelineEventsJson={timelineEventsPayload}
                spawnSystem={editorEnabled ? null : spawnSystemRef}
                interactionSystem={interactionSystemRef}
                position={currentLevelRenderConfig.offset}
                playerSpawnPoint={currentLevelRenderConfig.spawn}
                collisionDebugEnabled={editorEnabled && collisionOverlayEnabled}
                on:starSelected={(e) => forward('starSelected', e.detail)}
                on:telescopeInteraction={(e) => forward('telescopeInteraction', e.detail)}
                on:noteRead={(e) => forward('noteRead', e.detail)}
                on:portalTransition={(e) => forward('portalTransition', e.detail)}
                on:requestLevelReturn={(e) => forward('requestLevelReturn', e.detail)}
                on:terrainReady={() => {
                  terrainReady = true
                }}
              />
            {/key}
          {/if}

          {#if currentLevel}
            {#if editorWorkbenchLightingComponent}
              <svelte:component this={editorWorkbenchLightingComponent} />
            {/if}
            {#if editorSceneLayerComponent}
              <svelte:component
                this={editorSceneLayerComponent}
                levelId={currentLevel}
                {editorEnabled}
                interactionSystem={interactionSystemRef}
                on:portalTransition={(e) => forward('portalTransition', e.detail)}
                on:noteRead={(e) => forward('noteRead', e.detail)}
              />
            {/if}
            {#if editorCollisionOverlayComponent}
              <svelte:component this={editorCollisionOverlayComponent} levelId={currentLevel} />
            {/if}
            {#if editorTerrainSculptLayerComponent}
              <svelte:component this={editorTerrainSculptLayerComponent} levelId={currentLevel} />
            {/if}
          {/if}
        </svelte:component>
      {/if}
    </Canvas>
  </div>
{/if}
