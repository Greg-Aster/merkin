<script lang="ts">
import { Canvas } from '@threlte/core'
import { createEventDispatcher } from 'svelte'
import { runtimeAtmosphereStore } from './atmosphere/runtimeAtmosphereStore'
import type { RuntimeAtmosphereDefinition } from './atmosphere/runtimeAtmosphereTypes'
import GameWorld from './core/GameWorld.svelte'
import { qualitySettingsStore } from './features/performance/stores/performanceStore'
import PerformanceSystem from './features/performance/systems/Performance.svelte'
import { DEFAULT_LEVEL_ID } from './levels/levelRegistry'
import { setRuntimeDiagnostic } from './stores/runtimeDiagnosticsStore'
import {
  type ResolvedRuntimeRenderProfile,
  runtimeRenderProfileStore,
} from './stores/runtimeRenderProfileStore'
import {
  setRuntimePostProcessingDiagnostics,
  setRuntimeRenderLifecyclePhase,
} from './stores/runtimeRenderRegistry'
import { isSettingsMenuOpen } from './stores/uiStore'
import AssetLoader from './systems/AssetLoader.svelte'
import EventBus from './systems/EventBus.svelte'
import InteractionSystem from './systems/InteractionSystem.svelte'
import Renderer from './systems/Renderer.svelte'
import Time from './systems/Time.svelte'

const dispatch = createEventDispatcher()

export let isInitialized = false
export let error: string | null = null
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

export let audioSystemComponent: any = null
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

let postProcessingComponent: any = null
let postProcessingComponentPromise: Promise<any> | null = null

type RuntimePostProcessingPass =
  | 'bloom'
  | 'color-grading'
  | 'depth-fog'
  | 'kuwahara'

function forward(type: string, detail: unknown) {
  dispatch(type, detail)
}

function profileAllowsPostProcessingPass(
  profile: ResolvedRuntimeRenderProfile,
  pass: RuntimePostProcessingPass,
) {
  if (!profile.postProcessing.enabled) return false
  return (
    profile.postProcessing.passes.length === 0 ||
    profile.postProcessing.passes.includes(pass)
  )
}

function hasRuntimeFog(atmosphere: RuntimeAtmosphereDefinition) {
  return (
    atmosphere.enabled &&
    ((atmosphere.distanceFog.enabled && atmosphere.distanceFog.density > 0) ||
      (atmosphere.heightFog.enabled && atmosphere.heightFog.density > 0))
  )
}

function shouldMountDepthFogPostPass(
  profile: ResolvedRuntimeRenderProfile,
  atmosphere: RuntimeAtmosphereDefinition,
) {
  return (
    profileAllowsPostProcessingPass(profile, 'depth-fog') &&
    hasRuntimeFog(atmosphere)
  )
}

function getUnmountedPostProcessingReason(
  profile: ResolvedRuntimeRenderProfile,
  pass: RuntimePostProcessingPass,
  mountReason: string,
) {
  if (!profile.postProcessing.enabled) return 'profile disabled'
  if (!profileAllowsPostProcessingPass(profile, pass)) {
    return `disabled by ${profile.tier} profile pass list`
  }
  return mountReason
}

function publishUnmountedPostProcessingDiagnostics(
  levelId: string,
  mountReason: string,
  level: 'loading' | 'ready' | 'warning',
  profile: ResolvedRuntimeRenderProfile,
  atmosphereId: string,
) {
  const depthFogMountEligible = shouldMountDepthFogPostPass(
    profile,
    $runtimeAtmosphereStore,
  )
  const bloomReason = getUnmountedPostProcessingReason(
    profile,
    'bloom',
    mountReason,
  )
  const colorGradingReason = getUnmountedPostProcessingReason(
    profile,
    'color-grading',
    mountReason,
  )
  const depthFogReason = getUnmountedPostProcessingReason(
    profile,
    'depth-fog',
    mountReason,
  )
  const kuwaharaReason = getUnmountedPostProcessingReason(
    profile,
    'kuwahara',
    mountReason,
  )
  const passes = profile.postProcessing.enabled
    ? profile.postProcessing.passes
    : []

  setRuntimePostProcessingDiagnostics(levelId, {
    enabled: false,
    profileId: profile.id,
    passes,
    atmosphereId,
    depthFogEnabled: false,
    bloomEnabled: false,
    colorGradingEnabled: false,
    kuwaharaEnabled: false,
    depthFogReason,
    bloomReason,
    colorGradingReason,
    kuwaharaReason,
    reason: mountReason,
  })
  setRuntimeDiagnostic('postProcessing', {
    label: 'Post Processing',
    level,
    message: `${levelId}/${profile.id}/${profile.tier}: depth fog off (${depthFogReason}); bloom off (${bloomReason}); color grading off (${colorGradingReason}); kuwahara off (${kuwaharaReason}); passes ${profile.postProcessing.enabled ? profile.postProcessing.passes.join(', ') || 'all' : 'disabled'}; component not mounted (${mountReason}).`,
    meta: {
      levelId,
      profileId: profile.id,
      tier: profile.tier,
      passes,
      atmosphereId,
      reason: mountReason,
      enablePostProcessing: $qualitySettingsStore.enablePostProcessing,
      depthFogMountEligible,
      editorEnabled,
      gameplayEnabled,
      staticWorldReady,
      depthFogEnabled: false,
      depthFogReason,
      bloomEnabled: false,
      bloomReason,
      colorGradingEnabled: false,
      colorGradingReason,
      kuwaharaEnabled: false,
      kuwaharaReason,
    },
  })
}

async function ensurePostProcessingComponent() {
  if (postProcessingComponent) return postProcessingComponent

  if (!postProcessingComponentPromise) {
    postProcessingComponentPromise = import(
      './systems/SimplePostProcessing.svelte'
    )
      .then(module => {
        postProcessingComponent = module.default
        return postProcessingComponent
      })
      .catch(error => {
        postProcessingComponentPromise = null
        console.warn('Failed to load post-processing system:', error)
        return null
      })
  }

  return postProcessingComponentPromise
}

$: depthFogMountEligible = shouldMountDepthFogPostPass(
  $runtimeRenderProfileStore,
  $runtimeAtmosphereStore,
)
$: postProcessingEligible =
  (editorEnabled ||
    $qualitySettingsStore.enablePostProcessing ||
    depthFogMountEligible) &&
  staticWorldReady &&
  (editorEnabled || gameplayEnabled)
$: if (postProcessingEligible && !postProcessingComponent) {
  void ensurePostProcessingComponent()
}
$: if (isInitialized && (!postProcessingEligible || !postProcessingComponent)) {
  const mountReason = postProcessingEligible
    ? 'component-loading'
    : !$qualitySettingsStore.enablePostProcessing
      ? 'quality-disabled'
      : !staticWorldReady
        ? 'waiting-for-static-world'
        : 'waiting-for-gameplay-or-editor'
  const diagnosticLevel =
    mountReason === 'waiting-for-static-world' ||
    mountReason === 'component-loading'
      ? 'loading'
      : 'ready'
  const activeRenderProfile = $runtimeRenderProfileStore
  const activeAtmosphereId = $runtimeAtmosphereStore.id
  const activeLevelId = currentLevel

  publishUnmountedPostProcessingDiagnostics(
    activeLevelId,
    mountReason,
    diagnosticLevel,
    activeRenderProfile,
    activeAtmosphereId,
  )

  if (staticWorldReady) {
    setRuntimeRenderLifecyclePhase({
      levelId: currentLevel,
      phase: 'post-processing-ready',
      message: `${currentLevel}: post-processing disabled for current quality or activation state.`,
      detail: {
        enablePostProcessing: $qualitySettingsStore.enablePostProcessing,
        depthFogMountEligible,
        editorEnabled,
        gameplayEnabled,
        reason: mountReason,
      },
    })
  }
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

      {#if postProcessingEligible && postProcessingComponent}
        <svelte:component
          this={postProcessingComponent}
          levelId={currentLevel}
          optionalPostProcessingEnabled={editorEnabled || $qualitySettingsStore.enablePostProcessing}
          toneMappingExposure={1.0}
        />
      {/if}

      {#if audioSystemComponent}
        <svelte:component this={audioSystemComponent} enabled={true} />
      {/if}

      <GameWorld
        {isMobile}
        {editorEnabled}
        {editorPlaytestEnabled}
        {collisionOverlayEnabled}
        {currentLevel}
        {currentLevelComponent}
        {parsedTimelineEvents}
        {timelineEventsPayload}
        {currentLevelRenderConfig}
        {physicsSystemComponent}
        {playerComponentClass}
        {multiplayerManagerComponent}
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
        on:npcInteraction={(e) => forward('npcInteraction', e.detail)}
        on:playerInteraction={(e) => forward('playerInteraction', e.detail)}
        on:lightBurst={(e) => forward('lightBurst', e.detail)}
      />
    </Canvas>
  </div>
{/if}
