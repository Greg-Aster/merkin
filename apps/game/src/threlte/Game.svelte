<!-- Game application shell for UI state, route-level orchestration, and canvas mounting. -->
<script lang="ts">
import { createEventDispatcher, onDestroy, onMount } from 'svelte'

import GameCanvasStage from './GameCanvasStage.svelte'
import GameRuntimeDiagnostics from './core/GameRuntimeDiagnostics.svelte'
import { createGameRuntimeFeatureLoader } from './core/gameRuntimeFeatureLoader'
import {
  type GameShellBootstrapState,
  createDeprecatedJoinErrorMessage,
  createGameShellBootstrapState,
  createRoomJoinErrorMessage,
  createRoomJoinLoadingMessage,
} from './core/gameShellBootstrap'
import {
  type ActiveLevelNote,
  type PendingLevelReturn,
  createPendingLevelReturn,
  createTimelineEventFromStar,
  extractSelectedStar,
} from './core/gameShellUiState'
import ThrelteMobileControls from './features/player/ThrelteMobileControls.svelte'

import {
  conversationActions,
  conversationUIState,
  isConversationActive,
} from './features/conversation/runtime'
import {
  type RuntimeNpcInteractionEvent,
  startNpcConversationFromComponent,
} from './features/npc'

import MobileEnhancements from './ui/MobileEnhancements.svelte'

import { resetLevelRuntime } from './core/levelRuntimeReset'

import GameDebugPanel from './ui/GameDebugPanel.svelte'
import GameErrorOverlay from './ui/GameErrorOverlay.svelte'
import LevelNoteOverlay from './ui/LevelNoteOverlay.svelte'
import LevelReturnDialog from './ui/LevelReturnDialog.svelte'
import RoomJoinOverlay from './ui/RoomJoinOverlay.svelte'
import SettingsButton from './ui/SettingsButton.svelte'
import TimelineCard from './ui/TimelineCard.svelte'

import {
  DEFAULT_LEVEL_ID,
  getLevelRegistryEntry,
  levelRegistryStore,
  resolveLevelId as resolveRegistryLevelId,
} from './levels/levelRegistry'
import {
  currentLevelStore,
  errorStore,
  gameActions,
  isMobileStore,
  loadGameState,
  selectedStarStore,
} from './stores/gameStateStore'

import {
  resetRuntimeDiagnostics,
  setRuntimeDiagnostic,
} from './stores/runtimeDiagnosticsStore'
// Import UI state store
import { isSettingsMenuOpen } from './stores/uiStore'
import { runtimeDebugLog } from './utils/runtimeLog'

const dispatch = createEventDispatcher()

function debugLog(...args: any[]) {
  runtimeDebugLog(...args)
}

// Props
export let timelineEvents = []

// Parse timeline events if they come as JSON string from Astro
$: parsedTimelineEvents = (() => {
  if (typeof timelineEvents === 'string') {
    try {
      const parsed = JSON.parse(timelineEvents)
      debugLog(
        `🎮 Game.svelte: Parsed ${parsed.length} timeline events from JSON string`,
      )
      return parsed
    } catch (error) {
      console.error('Failed to parse timeline events:', error)
      return []
    }
  }
  const events = Array.isArray(timelineEvents) ? timelineEvents : []
  debugLog(`🎮 Game.svelte: Using ${events.length} timeline events directly`)
  return events
})()
$: timelineEventsPayload =
  typeof timelineEvents === 'string'
    ? timelineEvents
    : JSON.stringify(parsedTimelineEvents)
// Game state - fully migrated to reactive Threlte stores

// UI state (local)
let loadingMessage = 'Initializing Threlte...'
let isInitialized = false
let showDebugPanel = false

// Room joining state
let isJoiningRoom = false
let roomJoinError = ''
let shellBootstrapState: GameShellBootstrapState | null = null

let currentLevelComponent: any = null
let settingsPanelComponent: any = null
let conversationDialogComponent: any = null
let runtimeDiagnosticsPanelComponent: any = null
let chatBoxComponentClass: any = null
let audioSystemComponent: any = null
let multiplayerManagerComponent: any = null
let physicsSystemComponent: any = null
let playerComponentClass: any = null
let editorPanelComponent: any = null
let editorControlsOverlayComponent: any = null
let editorCircleSelectOverlayComponent: any = null
let editorMarqueeOverlayComponent: any = null
let editorSceneLayerComponent: any = null
let editorTerrainSculptLayerComponent: any = null
let editorViewportControlsComponent: any = null
let editorWorkbenchLightingComponent: any = null
let initializeClientFn: ((roomName: string) => void) | null = null

let playerComponent: any = null
let playerReady = false
let gameplayEnabled = false
let interactionSystem: any = null // Reference to centralized InteractionSystem
let chatBoxComponent: any = null // Reference to ChatBox component instance
let editorEnabled = false
let editorPlaytestEnabled = false
let collisionOverlayEnabled = false
let activeLevelNote: ActiveLevelNote | null = null
let levelRegistry = []

let physicsReady = false
let staticWorldReady = false
let worldUnloading = false
let lastRuntimeResetLevel = ''
let activeLevelLoadRequest = 0
let deferredAudioCleanup: (() => void) | null = null
let deferredGameplayCoreCleanup: (() => void) | null = null
let editorSessionCleanup: (() => void) | null = null
let pendingLevelReturn: PendingLevelReturn | null = null

const runtimeFeatureLoader = createGameRuntimeFeatureLoader()
let editorFeatureLoader: any = null
let editorFeatureLoaderPromise: Promise<any> | null = null

function normalizeLevelId(levelId: string | null | undefined) {
  return resolveRegistryLevelId(levelId, levelRegistry)
}

function getLevelRenderConfig(levelId: string) {
  const normalizedLevel = normalizeLevelId(levelId)
  const levelEntry = getLevelRegistryEntry(normalizedLevel, levelRegistry)

  if (levelEntry?.source?.kind === 'scene') {
    return {
      offset: [0, 0, 0] as [number, number, number],
    }
  }

  return {
    offset: [0, 0, 0] as [number, number, number],
  }
}

$: currentLevelRenderConfig = getLevelRenderConfig(currentLevel)

// Reactive store subscriptions (these are reactive by default)
$: currentLevel = $currentLevelStore
$: levelRegistry = $levelRegistryStore
$: homeLevelEntry = getLevelRegistryEntry(DEFAULT_LEVEL_ID, levelRegistry)
$: homeLevelTitle = homeLevelEntry?.title ?? 'Home'
$: selectedStar = $selectedStarStore
$: isMobile = $isMobileStore
$: error = $errorStore
$: if (currentLevel && currentLevel !== lastRuntimeResetLevel) {
  resetRuntimeForLevelTransition(currentLevel)
}
$: playerReady = Boolean(playerComponent)

// Reactive level and star tracking - debug logs removed for performance
$: if (currentLevel) {
  debugLog('🎮 Current level:', currentLevel)
}

$: if (selectedStar) {
  debugLog('⭐ Star selected:', selectedStar.title)
}

$: selectedEvent = createTimelineEventFromStar(selectedStar)

$: if (typeof window !== 'undefined' && isInitialized && currentLevel) {
  void ensureLevelComponent(currentLevel)
}

$: if (currentLevel) {
  activeLevelNote = null
}

$: if ($isSettingsMenuOpen && !settingsPanelComponent) {
  void ensureSettingsPanelComponent()
}

$: if (showDebugPanel && !runtimeDiagnosticsPanelComponent) {
  void ensureRuntimeDiagnosticsPanelComponent()
}

$: if (
  ($isConversationActive || $conversationUIState.isVisible) &&
  !conversationDialogComponent
) {
  void ensureConversationDialogComponent()
}

$: if (editorEnabled && currentLevel && !editorSceneLayerComponent) {
  void ensureSceneLayerComponent()
}

$: if (editorEnabled && !editorPanelComponent) {
  void ensureEditorFeatures()
}

/**
 * Check URL parameters for room joining
 */
async function checkForRoomJoin() {
  if (!shellBootstrapState) return
  const { roomName, deprecatedJoinParam } = shellBootstrapState

  if (roomName) {
    debugLog(`🎮 Found room parameter: ${roomName}`)
    isJoiningRoom = true
    loadingMessage = createRoomJoinLoadingMessage(roomName)

    try {
      debugLog(`🎮 Joining room: ${roomName}`)
      await ensureMultiplayerFeatures()
      initializeClientFn?.(roomName)
      debugLog(`✅ Initiated join for room "${roomName}"`)
    } catch (error) {
      roomJoinError = createRoomJoinErrorMessage(roomName)
      console.error(`❌ Failed to join room "${roomName}":`, error)
    } finally {
      isJoiningRoom = false
    }
  } else if (deprecatedJoinParam) {
    // Legacy support for direct host ID joining is deprecated
    roomJoinError = createDeprecatedJoinErrorMessage()
    console.warn(
      `⚠️ Legacy join parameter "${deprecatedJoinParam}" is deprecated`,
    )
  }
}

async function ensureLevelComponent(levelId: string) {
  const normalizedLevel = normalizeLevelId(levelId)
  const levelEntry = getLevelRegistryEntry(normalizedLevel, levelRegistry)
  const levelSource = levelEntry?.source ??
    homeLevelEntry?.source ?? {
      kind: 'scene',
      sceneId: DEFAULT_LEVEL_ID,
    }
  const cacheKey = `scene:${levelSource.sceneId}:${normalizedLevel}`
  const requestId = ++activeLevelLoadRequest
  currentLevelComponent = null

  const levelComponent = await runtimeFeatureLoader.loadLevelComponent(cacheKey)
  if (requestId === activeLevelLoadRequest) {
    currentLevelComponent = levelComponent
    worldUnloading = false
  }
}

async function ensureSettingsPanelComponent() {
  if (settingsPanelComponent) return
  try {
    settingsPanelComponent =
      await runtimeFeatureLoader.loadSettingsPanelComponent()
  } catch (error) {
    console.warn('Failed to load settings panel:', error)
  }
}

async function ensureConversationDialogComponent() {
  if (conversationDialogComponent) return
  try {
    conversationDialogComponent =
      await runtimeFeatureLoader.loadConversationDialogComponent()
  } catch (error) {
    console.warn('Failed to load conversation dialog:', error)
  }
}

async function ensureRuntimeDiagnosticsPanelComponent() {
  if (runtimeDiagnosticsPanelComponent) return
  try {
    runtimeDiagnosticsPanelComponent =
      await runtimeFeatureLoader.loadRuntimeDiagnosticsPanelComponent()
  } catch (error) {
    console.warn('Failed to load runtime diagnostics panel:', error)
  }
}

async function ensureEditorFeatureLoader() {
  if (editorFeatureLoader) return editorFeatureLoader

  if (!editorFeatureLoaderPromise) {
    editorFeatureLoaderPromise = import('./editor/gameEditorFeatureLoader')
      .then(module => {
        editorFeatureLoader = module.createGameEditorFeatureLoader()
        return editorFeatureLoader
      })
      .catch(error => {
        editorFeatureLoaderPromise = null
        throw error
      })
  }

  return editorFeatureLoaderPromise
}

async function ensureSceneLayerComponent() {
  if (editorSceneLayerComponent) return

  try {
    const editorLoader = await ensureEditorFeatureLoader()
    editorSceneLayerComponent = await editorLoader.loadSceneLayerComponent()
  } catch (error) {
    console.warn('Failed to load scene layer:', error)
  }
}

async function ensureChatBoxComponent() {
  if (chatBoxComponentClass) return
  try {
    chatBoxComponentClass = await runtimeFeatureLoader.loadChatBoxComponent()
  } catch (error) {
    console.warn('Failed to load chat box:', error)
  }
}

async function ensureAudioSystemComponent() {
  if (audioSystemComponent) return
  try {
    audioSystemComponent = await runtimeFeatureLoader.loadAudioSystemComponent()
  } catch (error) {
    console.warn('Failed to load audio system:', error)
  }
}

async function ensureEditorFeatures() {
  if (editorPanelComponent && editorViewportControlsComponent) return

  try {
    const editorLoader = await ensureEditorFeatureLoader()
    const editorFeatures = await editorLoader.loadEditorFeatures()
    editorPanelComponent = editorFeatures.editorPanelComponent
    editorControlsOverlayComponent =
      editorFeatures.editorControlsOverlayComponent
    editorCircleSelectOverlayComponent =
      editorFeatures.editorCircleSelectOverlayComponent
    editorMarqueeOverlayComponent = editorFeatures.editorMarqueeOverlayComponent
    editorSceneLayerComponent = editorFeatures.editorSceneLayerComponent
    editorTerrainSculptLayerComponent =
      editorFeatures.editorTerrainSculptLayerComponent
    editorViewportControlsComponent =
      editorFeatures.editorViewportControlsComponent
    editorWorkbenchLightingComponent =
      editorFeatures.editorWorkbenchLightingComponent
  } catch (error) {
    console.warn('Failed to load editor features:', error)
  }
}

async function enableEditorSession() {
  if (editorSessionCleanup) return

  const editorLoader = await ensureEditorFeatureLoader()
  editorSessionCleanup = await editorLoader.enableEditorSession(
    (state: {
      enabled: boolean
      collisionOverlayEnabled: boolean
      viewportMode?: 'edit' | 'playtest'
    }) => {
      editorEnabled = state.enabled
      editorPlaytestEnabled = state.enabled && state.viewportMode === 'playtest'
      collisionOverlayEnabled = state.collisionOverlayEnabled
    },
  )
  const cleanup = editorSessionCleanup
  editorSessionCleanup = () => {
    cleanup()
    editorEnabled = false
    editorPlaytestEnabled = false
    collisionOverlayEnabled = false
  }
}

async function ensureGameplayCore() {
  if (physicsSystemComponent && playerComponentClass) return

  try {
    const gameplayCore = await runtimeFeatureLoader.loadGameplayCore()
    physicsSystemComponent = gameplayCore.physicsSystemComponent
    playerComponentClass = gameplayCore.playerComponentClass
  } catch (error) {
    console.warn('Failed to load gameplay core:', error)
  }
}

async function ensureMultiplayerFeatures() {
  if (multiplayerManagerComponent && initializeClientFn) return

  try {
    const multiplayerFeatures =
      await runtimeFeatureLoader.loadMultiplayerFeatures()
    multiplayerManagerComponent =
      multiplayerFeatures.multiplayerManagerComponent
    initializeClientFn = multiplayerFeatures.initializeClientFn
    void ensureChatBoxComponent()
  } catch (error) {
    console.warn('Failed to load multiplayer features:', error)
  }
}

function setupDeferredAudioLoading() {
  if (typeof window === 'undefined') return () => {}

  let scheduled = false

  const loadAudio = () => {
    if (scheduled) return
    scheduled = true
    void ensureAudioSystemComponent()
  }

  const handleFirstInteraction = () => {
    loadAudio()
    removeListeners()
  }

  const removeListeners = () => {
    window.removeEventListener('pointerdown', handleFirstInteraction, true)
    window.removeEventListener('touchstart', handleFirstInteraction, true)
    window.removeEventListener('keydown', handleFirstInteraction, true)
  }

  window.addEventListener('pointerdown', handleFirstInteraction, {
    capture: true,
    once: true,
    passive: true,
  })
  window.addEventListener('touchstart', handleFirstInteraction, {
    capture: true,
    once: true,
    passive: true,
  })
  window.addEventListener('keydown', handleFirstInteraction, {
    capture: true,
    once: true,
  })

  return removeListeners
}

function setupDeferredGameplayCoreLoading() {
  if (typeof window === 'undefined') return () => {}
  if (physicsSystemComponent && playerComponentClass) return () => {}

  let scheduled = false
  let animationFrameId: number | null = null
  let timeoutId: number | null = null
  let idleCallbackId: number | null = null

  const removeListeners = () => {
    window.removeEventListener('pointerdown', handleFirstInteraction, true)
    window.removeEventListener('touchstart', handleFirstInteraction, true)
    window.removeEventListener('keydown', handleFirstInteraction, true)
  }

  const cleanup = () => {
    removeListeners()

    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId)
    }

    if (timeoutId !== null) {
      window.clearTimeout(timeoutId)
    }

    if (idleCallbackId !== null && 'cancelIdleCallback' in window) {
      window.cancelIdleCallback(idleCallbackId)
    }
  }

  const loadGameplayCore = () => {
    if (scheduled) return
    scheduled = true
    cleanup()
    void ensureGameplayCore()
  }

  const scheduleIdleLoad = () => {
    if ('requestIdleCallback' in window) {
      idleCallbackId = window.requestIdleCallback(
        () => {
          loadGameplayCore()
        },
        { timeout: 400 },
      )
      return
    }

    timeoutId = window.setTimeout(() => {
      loadGameplayCore()
    }, 48)
  }

  const handleFirstInteraction = () => {
    loadGameplayCore()
  }

  animationFrameId = window.requestAnimationFrame(() => {
    scheduleIdleLoad()
  })

  window.addEventListener('pointerdown', handleFirstInteraction, {
    capture: true,
    once: true,
    passive: true,
  })
  window.addEventListener('touchstart', handleFirstInteraction, {
    capture: true,
    once: true,
    passive: true,
  })
  window.addEventListener('keydown', handleFirstInteraction, {
    capture: true,
    once: true,
  })

  return cleanup
}

/**
 * Initialize Threlte-based game
 */
async function initializeThrelte() {
  try {
    resetRuntimeDiagnostics()
    setRuntimeDiagnostic('engine', {
      level: 'loading',
      message: 'Initializing Threlte game shell…',
    })
    loadingMessage = 'Initializing MEGAMEAL...'

    const bootstrap = createGameShellBootstrapState({
      currentLevel: $currentLevelStore,
      normalizeLevelId,
      search: typeof window !== 'undefined' ? window.location.search : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    })
    shellBootstrapState = bootstrap
    editorEnabled = false
    editorPlaytestEnabled = false
    collisionOverlayEnabled = false
    if (bootstrap.shouldEnableEditor) {
      await enableEditorSession()
    }
    showDebugPanel = bootstrap.shouldShowDebugPanel

    // Detect mobile and update store
    gameActions.setMobile(bootstrap.isMobileDevice)

    loadingMessage = 'Building world...'

    // Load saved game state
    loadGameState()

    if (bootstrap.initialLevelId) {
      gameActions.transitionToLevel(bootstrap.initialLevelId)
    }

    // Set up Threlte-based state management
    setupStateUpdates()

    if (bootstrap.shouldEnableEditor) {
      await ensureGameplayCore()
    }

    // Check for room joining after initialization
    await checkForRoomJoin()

    isInitialized = true
    setRuntimeDiagnostic('engine', {
      level: 'ready',
      message: 'Game shell initialized. Waiting for runtime subsystems.',
    })
    if (!bootstrap.shouldEnableEditor) {
      deferredAudioCleanup = setupDeferredAudioLoading()
      deferredGameplayCoreCleanup = setupDeferredGameplayCoreLoading()
    }

    debugLog('✅ Game systems initialized.')
  } catch (err) {
    console.error('❌ Failed to initialize Threlte game:', err)
    setRuntimeDiagnostic('engine', {
      level: 'error',
      message:
        err instanceof Error
          ? err.message
          : 'Unknown engine initialization error.',
    })
    gameActions.setError(err instanceof Error ? err.message : 'Unknown error')
  }
}

/**
 * Set up reactive state updates using modern stores
 */
function setupStateUpdates() {
  debugLog('🔄 Setting up reactive Threlte store-based state management')

  // All state is now managed by reactive stores
  // No need for manual initialization - stores handle their own state

  debugLog('✅ Reactive store-based state management ready')
}

/**
 * Handle level transition requests - Pure Threlte store-based implementation
 */
function handleLevelTransition(event: CustomEvent) {
  const { levelType } = event.detail
  transitionToLevel(levelType)
}

function handleLevelReturnRequest(detail: {
  levelType?: string
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
}) {
  pendingLevelReturn = createPendingLevelReturn(detail)
}

function cancelPendingLevelReturn() {
  pendingLevelReturn = null
}

function confirmPendingLevelReturn() {
  if (!pendingLevelReturn) return
  const { levelType } = pendingLevelReturn
  pendingLevelReturn = null
  transitionToLevel(levelType)
}

function resolveLevelId(levelType: string) {
  return getLevelRegistryEntry(levelType, levelRegistry)?.id ?? levelType
}

function resetRuntimeForLevelTransition(levelId: string) {
  resetLevelRuntime({
    interactionSystem,
  })
  lastRuntimeResetLevel = levelId
  worldUnloading = true
  staticWorldReady = false
  gameplayEnabled = false
  activeLevelNote = null
  pendingLevelReturn = null
  currentLevelComponent = null
  gameActions.selectStar(null)
}

function transitionToLevel(levelType: string) {
  const levelId = resolveLevelId(levelType)
  setRuntimeDiagnostic('engine', {
    level: 'loading',
    message: `Transitioning to ${levelId}…`,
  })
  resetRuntimeForLevelTransition(levelId)
  gameActions.transitionToLevel(levelId)
  debugLog(`🎮 Threlte store-based level transition: ${levelId}`)
}

// Mobile controls now handled through reactive stores - no event forwarding needed

/**
 * Toggle debug panel
 */
function toggleDebugPanel() {
  showDebugPanel = !showDebugPanel
}

// CORRECTED VERSION
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'F1') {
    event.preventDefault()
    isSettingsMenuOpen.update(open => !open)
    return
  }

  if (event.key === 'F2') {
    event.preventDefault()
    toggleDebugPanel()
  }
}

function handlePlayerInteraction(detail: any) {
  gameActions.recordInteraction('click', detail.type)
  const selected = interactionSystem?.selectAtScreenPosition?.(
    detail.x,
    detail.y,
  )
  if (!selected) {
    dispatch('objectClick', detail)
  }
}

function handlePlayerLightBurst(detail: any) {
  gameActions.recordInteraction('light_burst', 'player')
  interactionSystem?.triggerLightBurst?.(detail)
  dispatch('lightBurst', detail)
}

function handleNpcInteraction(detail: RuntimeNpcInteractionEvent) {
  void startNpcConversationFromComponent({
    npc: detail.npc,
    actorId: detail.actorId,
    levelId: detail.levelId,
  })
  dispatch('npcInteraction', detail)
}

// Lifecycle
onMount(async () => {
  debugLog('🎮 Starting MEGAMEAL Game with Threlte...')
  await initializeThrelte()

  // Make gameActions globally available for debugging
  if (import.meta.env.DEV) {
    window.gameActions = gameActions
    debugLog('🔧 gameActions available globally for debugging')
  }

  window.addEventListener('keydown', handleKeyDown)
})

onDestroy(() => {
  debugLog('🧹 Cleaning up Threlte Game...')
  window.removeEventListener('keydown', handleKeyDown)
  deferredAudioCleanup?.()
  deferredAudioCleanup = null
  deferredGameplayCoreCleanup?.()
  deferredGameplayCoreCleanup = null
  editorSessionCleanup?.()
  editorSessionCleanup = null
  // All cleanup is now handled by individual Threlte components
  debugLog('✅ Threlte Game cleaned up')
})
</script>
  
  <!-- Game Container - Allow input to pass through to Player component -->
  <div class="w-full h-full relative bg-black overflow-hidden" style="pointer-events: none;">
    <GameRuntimeDiagnostics
      {currentLevel}
      shellReady={isInitialized}
      levelComponentReady={Boolean(currentLevelComponent)}
      {staticWorldReady}
      {physicsReady}
      {playerReady}
      {gameplayEnabled}
      {editorEnabled}
      unloading={worldUnloading}
      {error}
    />
    
    <!-- Threlte Canvas - Enable input for 3D scene -->
    {#if isInitialized && !error}
      <GameCanvasStage
        {isInitialized}
        {error}
        {isMobile}
        {editorEnabled}
        {editorPlaytestEnabled}
        {collisionOverlayEnabled}
        currentLevel={$currentLevelStore}
        {currentLevelComponent}
        {parsedTimelineEvents}
        {timelineEventsPayload}
        currentLevelRenderConfig={currentLevelRenderConfig}
        {audioSystemComponent}
        {physicsSystemComponent}
        {playerComponentClass}
        {multiplayerManagerComponent}
        {editorSceneLayerComponent}
        {editorTerrainSculptLayerComponent}
        {editorViewportControlsComponent}
        {editorWorkbenchLightingComponent}
        bind:interactionSystemRef={interactionSystem}
        bind:playerComponentRef={playerComponent}
        bind:physicsReady
        bind:staticWorldReady
        bind:playerReady
        bind:gameplayEnabled
        {normalizeLevelId}
        on:levelTransition={handleLevelTransition}
        on:starSelected={(e) => {
          const star = extractSelectedStar(e.detail)
          gameActions.selectStar(star)
          dispatch('starSelected', star)
        }}
        on:starDeselected={(e) => { gameActions.deselectStar(); dispatch('starDeselected', e.detail) }}
        on:objectClick={(e) => dispatch('objectClick', e.detail)}
        on:timeUpdate={(e) => dispatch('timeUpdate', e.detail)}
        on:performanceUpdate={(e) => dispatch('performanceUpdate', e.detail)}
        on:qualityChanged={(e) => dispatch('qualityChanged', e.detail)}
        on:playerInteraction={(e) => handlePlayerInteraction(e.detail)}
        on:lightBurst={(e) => handlePlayerLightBurst(e.detail)}
        on:telescopeInteraction={(e) => dispatch('telescopeInteraction', e.detail)}
        on:noteRead={(e) => { activeLevelNote = e.detail }}
        on:portalTransition={(e) => { transitionToLevel(e.detail.levelId) }}
        on:requestLevelReturn={(e) => { handleLevelReturnRequest(e.detail) }}
        on:npcInteraction={(e) => handleNpcInteraction(e.detail)}
      />
    {/if}
  
    <!-- Legacy container removed - Player component now handles all input -->
  
    <!-- Room Join Screen -->
    {#if isJoiningRoom}
      <RoomJoinOverlay
        {loadingMessage}
        {currentLevel}
        homeLevelId={DEFAULT_LEVEL_ID}
        {homeLevelTitle}
        on:returnHome={() => {
          transitionToLevel(DEFAULT_LEVEL_ID)
        }}
      />
    {/if}
  
    <!-- Modern Error Screen -->
    {#if error || roomJoinError}
      <GameErrorOverlay
        errorMessage={error}
        {roomJoinError}
        on:reload={() => location.reload()}
        on:clearRoomError={() => {
          roomJoinError = ''
        }}
      />
    {/if}
  
    <!-- Modern Minimal Debug Panel -->
    {#if isInitialized && !error && showDebugPanel}
      <GameDebugPanel
        {isInitialized}
        {currentLevel}
        {isMobile}
        {runtimeDiagnosticsPanelComponent}
      />
    {/if}
      
  
      <!-- UI Layer - Explicitly enable pointer events -->
      <div style="pointer-events: auto;">
        {#if editorEnabled && currentLevel}
          {#if editorMarqueeOverlayComponent}
            <svelte:component this={editorMarqueeOverlayComponent} />
          {/if}
          {#if editorCircleSelectOverlayComponent}
            <svelte:component this={editorCircleSelectOverlayComponent} />
          {/if}
          {#if editorControlsOverlayComponent}
            <svelte:component this={editorControlsOverlayComponent} />
          {/if}
          {#if editorPanelComponent}
            <svelte:component this={editorPanelComponent} levelId={currentLevel} />
          {/if}
        {/if}
        <!-- Timeline card -->
        <TimelineCard
          isVisible={!!selectedEvent}
          event={selectedEvent}
          isMobile={isMobile}
          compact={false}
          position="bottom"
          on:levelTransition={handleLevelTransition}
          on:close={() => gameActions.selectStar(null)}
        />

        {#if activeLevelNote}
          <LevelNoteOverlay
            note={activeLevelNote}
            on:close={() => {
              activeLevelNote = null
            }}
          />
        {/if}

        {#if pendingLevelReturn}
          <LevelReturnDialog
            pendingReturn={pendingLevelReturn}
            on:cancel={cancelPendingLevelReturn}
            on:confirm={confirmPendingLevelReturn}
          />
        {/if}

        <!-- Settings Button -->
        {#if isInitialized && !error}
          <SettingsButton />
        {/if}
        
        <!-- Settings Panel -->
        {#if settingsPanelComponent}
          <svelte:component this={settingsPanelComponent} />
        {/if}
        
        <!-- Threlte-Native Mobile Controls -->
        {#if isMobile && isInitialized && !error}
          <ThrelteMobileControls />
        {/if}

        <!-- Mobile Enhancements (Pull-to-refresh prevention and fullscreen button) -->
        <MobileEnhancements />
        
        <!-- Chat Box -->
        {#if chatBoxComponentClass}
          <svelte:component this={chatBoxComponentClass} bind:this={chatBoxComponent} />
        {/if}
      </div>

      {#if ($isConversationActive || $conversationUIState.isVisible) && conversationDialogComponent}
        <div style="pointer-events: auto;">
            <svelte:component
                this={conversationDialogComponent}
                visible={$conversationUIState.isVisible}
                position={$conversationUIState.position}
                on:close={() => conversationActions.endConversation()}
            />
        </div>
      {/if}
  </div>
