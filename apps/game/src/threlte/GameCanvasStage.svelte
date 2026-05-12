<script lang="ts">
import { Canvas } from '@threlte/core'
import { createEventDispatcher } from 'svelte'
import GameWorld from './core/GameWorld.svelte'
import { qualitySettingsStore } from './features/performance/stores/performanceStore'
import PerformanceSystem from './features/performance/systems/Performance.svelte'
import {
  setRuntimePostProcessingDiagnostics,
  setRuntimeRenderLifecyclePhase,
} from './stores/runtimeRenderRegistry'
import { isSettingsMenuOpen } from './stores/uiStore'
import AssetLoader from './systems/AssetLoader.svelte'
import EventBus from './systems/EventBus.svelte'
import InteractionSystem from './systems/InteractionSystem.svelte'
import Renderer from './systems/Renderer.svelte'
import SimplePostProcessing from './systems/SimplePostProcessing.svelte'
import Time from './systems/Time.svelte'

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
} = {
  offset: [0, 0, 0],
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
export let playerComponentRef: any = null
export let physicsReady = false
export let staticWorldReady = false
export let playerReady = false
export let gameplayEnabled = false

export let normalizeLevelId: (levelId: string) => string = levelId => levelId

function forward(type: string, detail: unknown) {
  dispatch(type, detail)
}

$: postProcessingEligible =
  $qualitySettingsStore.enablePostProcessing &&
  staticWorldReady &&
  (editorEnabled || gameplayEnabled)
$: if (staticWorldReady && !postProcessingEligible) {
  setRuntimePostProcessingDiagnostics(currentLevel, {
    enabled: false,
    passes: [],
    reason: $qualitySettingsStore.enablePostProcessing
      ? 'waiting-for-gameplay-or-editor'
      : 'quality-disabled',
  })
  setRuntimeRenderLifecyclePhase({
    levelId: currentLevel,
    phase: 'post-processing-ready',
    message: `${currentLevel}: post-processing disabled for current quality or activation state.`,
    detail: {
      enablePostProcessing: $qualitySettingsStore.enablePostProcessing,
      editorEnabled,
      gameplayEnabled,
    },
  })
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

      <AssetLoader />
      <Renderer />

      {#if postProcessingEligible}
        <SimplePostProcessing
          levelId={currentLevel}
          toneMappingExposure={1.0}
        />
      {/if}

      {#if audioSystemComponent}
        <svelte:component this={audioSystemComponent} enabled={true} />
      {/if}

      <GameWorld
        {isMobile}
        {editorEnabled}
        {collisionOverlayEnabled}
        {currentLevel}
        {currentLevelComponent}
        {parsedTimelineEvents}
        {timelineEventsPayload}
        {currentLevelRenderConfig}
        {physicsSystemComponent}
        {playerComponentClass}
        {multiplayerManagerComponent}
        {editorCollisionOverlayComponent}
        {editorSceneLayerComponent}
        {editorTerrainSculptLayerComponent}
        {editorViewportControlsComponent}
        {editorWorkbenchLightingComponent}
        bind:interactionSystemRef
        bind:playerComponentRef
        bind:physicsReady
        bind:staticWorldReady
        bind:playerReady
        bind:gameplayEnabled
        {normalizeLevelId}
        on:staticWorldReady={(e) => forward('staticWorldReady', e.detail)}
        on:starSelected={(e) => forward('starSelected', e.detail)}
        on:telescopeInteraction={(e) => forward('telescopeInteraction', e.detail)}
        on:noteRead={(e) => forward('noteRead', e.detail)}
        on:portalTransition={(e) => forward('portalTransition', e.detail)}
        on:requestLevelReturn={(e) => forward('requestLevelReturn', e.detail)}
        on:playerInteraction={(e) => forward('playerInteraction', e.detail)}
        on:lightBurst={(e) => forward('lightBurst', e.detail)}
      />
    </Canvas>
  </div>
{/if}
