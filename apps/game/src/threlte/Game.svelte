<!-- Game application shell for UI state, route-level orchestration, and canvas mounting. -->
<script lang="ts">
import { createEventDispatcher, onDestroy, onMount } from 'svelte'

import GameCanvasStage from './GameCanvasStage.svelte'
import ThrelteMobileControls from './features/player/ThrelteMobileControls.svelte'

import {
  conversationActions,
  conversationUIState,
  isConversationActive,
} from './features/conversation/conversationStores'

import MobileEnhancements from './ui/MobileEnhancements.svelte'

import {
  createGameWorldLifecycleDiagnostics,
  createGameWorldLifecycleSnapshot,
  getGameWorldDiagnostic,
  isGameWorldPlayable,
} from './core/gameWorldLifecycle'
import { resetLevelRuntime } from './core/levelRuntimeReset'

import SettingsButton from './ui/SettingsButton.svelte'
import TimelineCard from './ui/TimelineCard.svelte'

import {
  getLevelRegistryEntry,
  levelRegistryStore,
  resolveLevelId as resolveRegistryLevelId,
} from './levels/levelRegistry'
import {
  type StarData,
  currentLevelStore,
  errorStore,
  gameActions,
  gameStatsStore,
  isMobileStore,
  loadGameState,
  selectedStarStore,
} from './stores/gameStateStore'

import {
  resetRuntimeDiagnostics,
  setRuntimeDiagnostic,
} from './stores/runtimeDiagnosticsStore'
import { runtimeDebugLog } from './utils/runtimeLog'
// Import UI state store
import { isSettingsMenuOpen } from './stores/uiStore'

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
let editorCollisionOverlayComponent: any = null
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
let collisionOverlayEnabled = false
let activeLevelNote: {
  title: string
  author: string
  location: string
  excerpt: string
  body: string
} | null = null
let levelRegistry = []

let physicsReady = false
let staticWorldReady = false
let worldUnloading = false
let lastRuntimeResetLevel = ''
let activeLevelLoadRequest = 0
let editorFeaturesPromise: Promise<void> | null = null
let sceneLayerComponentPromise: Promise<void> | null = null
let deferredAudioCleanup: (() => void) | null = null
let deferredGameplayCoreCleanup: (() => void) | null = null
let gameplayCorePromise: Promise<void> | null = null
let editorSessionCleanup: (() => void) | null = null
let pendingLevelReturn: {
  levelType: string
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
} | null = null

const levelComponentCache = new Map<string, any>()

function getModuleDefault<T>(module: T | undefined | null, label: string) {
  if (
    !module ||
    typeof module !== 'object' ||
    !('default' in module) ||
    !(module as any).default
  ) {
    throw new Error(`Failed to load ${label}.`)
  }

  return (module as any).default
}

function normalizeLevelId(levelId: string | null | undefined) {
  return resolveRegistryLevelId(levelId, levelRegistry)
}

function getUrlFlagValue(params: URLSearchParams | null, key: string) {
  return params?.get(key)?.trim().replace(/\/+$/, '') ?? ''
}

function isUrlFlagEnabled(params: URLSearchParams | null, key: string) {
  return getUrlFlagValue(params, key) === '1'
}

function getLevelRenderConfig(levelId: string) {
  const normalizedLevel = normalizeLevelId(levelId)
  const levelEntry = getLevelRegistryEntry(normalizedLevel, levelRegistry)

  if (levelEntry?.source.kind === 'scene') {
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
$: selectedStar = $selectedStarStore
$: gameStats = $gameStatsStore
$: isMobile = $isMobileStore
$: error = $errorStore
$: if (currentLevel && currentLevel !== lastRuntimeResetLevel) {
  resetRuntimeForLevelTransition(currentLevel)
}
$: playerReady = Boolean(playerComponent)
$: setRuntimeDiagnostic('mode', {
  level: 'ready',
  message: editorEnabled ? 'Editor mode active.' : 'Gameplay mode active.',
})
$: gameWorldLifecycle = createGameWorldLifecycleSnapshot({
  levelId: currentLevel,
  shellReady: isInitialized,
  levelComponentReady: Boolean(currentLevelComponent),
  staticWorldReady,
  physicsReady,
  playerComponentReady: editorEnabled || playerReady,
  gameplayEnabled: editorEnabled || gameplayEnabled,
  editorEnabled,
  unloading: worldUnloading,
  error,
})
$: gameWorldDiagnostic = getGameWorldDiagnostic(gameWorldLifecycle)
$: gameWorldLifecycleDiagnostics =
  createGameWorldLifecycleDiagnostics(gameWorldLifecycle)
$: setRuntimeDiagnostic('world', {
  label: 'Game World',
  level: gameWorldDiagnostic.level,
  message: gameWorldDiagnostic.message,
  meta: gameWorldLifecycle as unknown as Record<string, unknown>,
})
$: gameWorldLifecycleDiagnostics.forEach(entry => {
  setRuntimeDiagnostic(entry.key, {
    label: entry.label,
    level: entry.level,
    message: entry.message,
    meta: {
      active: entry.active,
      phase: gameWorldLifecycle.phase,
      levelId: gameWorldLifecycle.levelId,
    },
  })
})
$: setRuntimeDiagnostic('engine', {
  level: isGameWorldPlayable(gameWorldLifecycle) ? 'ready' : 'loading',
  message: isGameWorldPlayable(gameWorldLifecycle)
    ? `Engine ready on level ${currentLevel}.`
    : `Engine waiting for world phase: ${gameWorldLifecycle.phase}.`,
})
$: setRuntimeDiagnostic('staticWorld', {
  label: 'Static World',
  level: staticWorldReady ? 'ready' : 'loading',
  message: staticWorldReady
    ? 'Static render/collision world is ready.'
    : 'Waiting for active level static world readiness.',
})
$: setRuntimeDiagnostic('physics', {
  level: physicsReady ? 'ready' : 'loading',
  message: physicsReady
    ? 'Physics world is active.'
    : 'Waiting for physics world to initialize.',
})
$: setRuntimeDiagnostic('player', {
  level: editorEnabled ? 'idle' : playerReady ? 'ready' : 'loading',
  message: editorEnabled
    ? 'Player runtime disabled while editor mode is active.'
    : playerReady
      ? 'Player component is ready at the level position.'
      : 'Waiting for player component readiness.',
})
$: setRuntimeDiagnostic('editor', {
  level: editorEnabled ? 'ready' : 'idle',
  message: editorEnabled
    ? 'Editor subsystems active.'
    : 'Editor subsystems inactive.',
})

// Reactive level and star tracking - debug logs removed for performance
$: if (currentLevel) {
  debugLog('🎮 Current level:', currentLevel)
}

$: if (selectedStar) {
  debugLog('⭐ Star selected:', selectedStar.title)
}

// Modern dialog system now handled by ConversationDialog component

/**
 * Convert cardClass string to position type
 */
function getPositionFromCardClass(
  cardClass?: string,
): 'top' | 'bottom' | 'left' | 'right' | undefined {
  if (!cardClass) return undefined

  if (cardClass.includes('top')) return 'top'
  if (cardClass.includes('bottom')) return 'bottom'
  if (cardClass.includes('left')) return 'left'
  if (cardClass.includes('right')) return 'right'

  return undefined
}

function extractSelectedStar(detail: any): StarData | null {
  if (!detail) return null

  const baseStar = detail.star ?? detail.eventData ?? detail
  if (!baseStar) return null

  const mergedScreenPosition = {
    ...(baseStar.screenPosition ?? {}),
    ...(detail.screenPosition ?? {}),
  }

  return {
    ...baseStar,
    screenPosition:
      Object.keys(mergedScreenPosition).length > 0
        ? mergedScreenPosition
        : undefined,
  }
}

// Convert StarData to TimelineEvent for the TimelineCard
$: selectedEvent = selectedStar
  ? {
      id: selectedStar.uniqueId,
      title: selectedStar.title,
      description: selectedStar.description,
      slug: selectedStar.slug,
      year: selectedStar.timelineYear,
      era: selectedStar.timelineEra,
      location: selectedStar.timelineLocation,
      isKeyEvent: selectedStar.isKeyEvent,
      isLevel: selectedStar.isLevel,
      levelId: selectedStar.levelId,
      tags: selectedStar.tags,
      category: selectedStar.category,
      unlocked: true,
      screenPosition: selectedStar.screenPosition,
    }
  : null

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

$: if (
  editorEnabled &&
  currentLevel &&
  !editorSceneLayerComponent &&
  !sceneLayerComponentPromise
) {
  void ensureSceneLayerComponent()
}

$: if (editorEnabled && !editorFeaturesPromise) {
  void ensureEditorFeatures()
}

/**
 * Check URL parameters for room joining
 */
async function checkForRoomJoin() {
  if (typeof window === 'undefined') return

  const urlParams = new URLSearchParams(window.location.search)
  const roomParam = urlParams.get('room')
  const joinParam = urlParams.get('join') // Legacy support

  if (roomParam) {
    debugLog(`🎮 Found room parameter: ${roomParam}`)
    isJoiningRoom = true
    loadingMessage = `Joining room "${roomParam}"...`

    try {
      debugLog(`🎮 Joining room: ${roomParam}`)
      await ensureMultiplayerFeatures()
      initializeClientFn?.(roomParam)
      debugLog(`✅ Initiated join for room "${roomParam}"`)
    } catch (error) {
      roomJoinError = `Failed to join room "${roomParam}". Please try again.`
      console.error(`❌ Failed to join room "${roomParam}":`, error)
    } finally {
      isJoiningRoom = false
    }
  } else if (joinParam) {
    // Legacy support for direct host ID joining is deprecated
    roomJoinError =
      'Direct host ID joining is no longer supported. Please use room names instead.'
    console.warn(`⚠️ Legacy join parameter "${joinParam}" is deprecated`)
  }
}

async function ensureLevelComponent(levelId: string) {
  const normalizedLevel = normalizeLevelId(levelId)
  const levelEntry = getLevelRegistryEntry(normalizedLevel, levelRegistry)
  const levelSource = levelEntry?.source ?? {
    kind: 'scene',
    sceneId: 'observatory',
  }
  const cacheKey = `scene:${levelSource.sceneId}:${normalizedLevel}`
  const cached = levelComponentCache.get(cacheKey)
  if (cached) {
    currentLevelComponent = cached
    worldUnloading = false
    return
  }

  const requestId = ++activeLevelLoadRequest
  currentLevelComponent = null

  const module = await import('./levels/SceneDocumentLevel.svelte')

  levelComponentCache.set(cacheKey, module.default)

  if (requestId === activeLevelLoadRequest) {
    currentLevelComponent = module.default
    worldUnloading = false
  }
}

async function ensureSettingsPanelComponent() {
  if (settingsPanelComponent) return
  try {
    const module = await import('./ui/SettingsPanel.svelte')
    settingsPanelComponent = getModuleDefault(module, 'settings panel')
  } catch (error) {
    console.warn('Failed to load settings panel:', error)
  }
}

async function ensureConversationDialogComponent() {
  if (conversationDialogComponent) return
  try {
    const module = await import(
      './features/conversation/ConversationDialog.svelte'
    )
    conversationDialogComponent = getModuleDefault(
      module,
      'conversation dialog',
    )
  } catch (error) {
    console.warn('Failed to load conversation dialog:', error)
  }
}

async function ensureRuntimeDiagnosticsPanelComponent() {
  if (runtimeDiagnosticsPanelComponent) return
  try {
    const module = await import('./ui/RuntimeDiagnosticsPanel.svelte')
    runtimeDiagnosticsPanelComponent = getModuleDefault(
      module,
      'runtime diagnostics panel',
    )
  } catch (error) {
    console.warn('Failed to load runtime diagnostics panel:', error)
  }
}

async function ensureSceneLayerComponent() {
  if (editorSceneLayerComponent) return

  if (!sceneLayerComponentPromise) {
    sceneLayerComponentPromise = import('./editor/EditorSceneLayer.svelte')
      .then(module => {
        editorSceneLayerComponent = getModuleDefault(
          module,
          'editor scene layer',
        )
      })
      .catch(error => {
        console.warn('Failed to load scene layer:', error)
        sceneLayerComponentPromise = null
      })
  }

  await sceneLayerComponentPromise
}

async function ensureChatBoxComponent() {
  if (chatBoxComponentClass) return
  try {
    const module = await import('./features/multiplayer/ui/ChatBox.svelte')
    chatBoxComponentClass = getModuleDefault(module, 'chat box')
  } catch (error) {
    console.warn('Failed to load chat box:', error)
  }
}

async function ensureAudioSystemComponent() {
  if (audioSystemComponent) return
  try {
    const module = await import('./systems/Audio.svelte')
    audioSystemComponent = getModuleDefault(module, 'audio system')
  } catch (error) {
    console.warn('Failed to load audio system:', error)
  }
}

async function ensureEditorFeatures() {
  if (editorPanelComponent && editorViewportControlsComponent) return

  if (!editorFeaturesPromise) {
    editorFeaturesPromise = Promise.all([
      import('./editor/EditorPanel.svelte'),
      import('./editor/EditorControlsOverlay.svelte'),
      import('./editor/EditorCollisionOverlay.svelte'),
      import('./editor/EditorCircleSelectOverlay.svelte'),
      import('./editor/EditorMarqueeOverlay.svelte'),
      import('./editor/EditorSceneLayer.svelte'),
      import('./editor/EditorTerrainSculptLayer.svelte'),
      import('./editor/EditorViewportControls.svelte'),
      import('./editor/EditorWorkbenchLighting.svelte'),
    ])
      .then(
        ([
          editorPanelModule,
          editorControlsOverlayModule,
          editorCollisionOverlayModule,
          editorCircleSelectOverlayModule,
          editorMarqueeOverlayModule,
          editorSceneLayerModule,
          editorTerrainSculptLayerModule,
          editorViewportControlsModule,
          editorWorkbenchLightingModule,
        ]) => {
          editorPanelComponent = getModuleDefault(
            editorPanelModule,
            'editor panel',
          )
          editorControlsOverlayComponent = getModuleDefault(
            editorControlsOverlayModule,
            'editor controls overlay',
          )
          editorCollisionOverlayComponent = getModuleDefault(
            editorCollisionOverlayModule,
            'editor collision overlay',
          )
          editorCircleSelectOverlayComponent = getModuleDefault(
            editorCircleSelectOverlayModule,
            'editor circle select overlay',
          )
          editorMarqueeOverlayComponent = getModuleDefault(
            editorMarqueeOverlayModule,
            'editor marquee overlay',
          )
          editorSceneLayerComponent = getModuleDefault(
            editorSceneLayerModule,
            'editor scene layer',
          )
          editorTerrainSculptLayerComponent = getModuleDefault(
            editorTerrainSculptLayerModule,
            'editor terrain sculpt layer',
          )
          editorViewportControlsComponent = getModuleDefault(
            editorViewportControlsModule,
            'editor viewport controls',
          )
          editorWorkbenchLightingComponent = getModuleDefault(
            editorWorkbenchLightingModule,
            'editor workbench lighting',
          )
        },
      )
      .catch(error => {
        console.warn('Failed to load editor features:', error)
        editorFeaturesPromise = null
      })
  }

  await editorFeaturesPromise
}

async function enableEditorSession() {
  if (editorSessionCleanup) return

  const module = await import('./editor/editorSessionStore')
  const unsubscribe = module.editorStateStore.subscribe(state => {
    editorEnabled = state.enabled
    collisionOverlayEnabled = state.collisionOverlayEnabled
  })

  module.initializeEditor(true)
  editorSessionCleanup = () => {
    module.initializeEditor(false)
    unsubscribe()
    editorEnabled = false
    collisionOverlayEnabled = false
  }
}

async function ensureGameplayCore() {
  if (physicsSystemComponent && playerComponentClass) return

  if (!gameplayCorePromise) {
    gameplayCorePromise = Promise.all([
      import('./systems/Physics.svelte'),
      import('./features/player/Player.svelte'),
    ])
      .then(([physicsModule, playerModule]) => {
        physicsSystemComponent = getModuleDefault(
          physicsModule,
          'physics system',
        )
        playerComponentClass = getModuleDefault(
          playerModule,
          'player component',
        )
      })
      .catch(error => {
        console.warn('Failed to load gameplay core:', error)
        gameplayCorePromise = null
      })
  }

  await gameplayCorePromise
}

async function ensureMultiplayerFeatures() {
  if (multiplayerManagerComponent && initializeClientFn) return

  try {
    const [componentModule, serviceModule] = await Promise.all([
      import('./features/multiplayer/components/MultiplayerManager.svelte'),
      import('./features/multiplayer/services/MultiplayerService'),
    ])

    multiplayerManagerComponent = getModuleDefault(
      componentModule,
      'multiplayer manager',
    )
    initializeClientFn = serviceModule.initializeClient
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

    const urlParams =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : null
    const shouldEnableEditor = isUrlFlagEnabled(urlParams, 'editor')
    const shouldShowDebugPanel = isUrlFlagEnabled(urlParams, 'debug')
    const requestedLevel = normalizeLevelId(urlParams?.get('level'))
    editorEnabled = false
    collisionOverlayEnabled = false
    if (shouldEnableEditor) {
      await enableEditorSession()
    }
    showDebugPanel = shouldShowDebugPanel

    // Detect mobile and update store
    const isMobileDevice =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      )
    gameActions.setMobile(isMobileDevice)

    loadingMessage = 'Building world...'

    // Load saved game state
    loadGameState()

    if (requestedLevel !== 'observatory') {
      gameActions.transitionToLevel(requestedLevel)
    } else if (!$currentLevelStore || $currentLevelStore === '') {
      gameActions.transitionToLevel('observatory')
    }

    // Set up Threlte-based state management
    setupStateUpdates()

    if (shouldEnableEditor) {
      await ensureGameplayCore()
    }

    // Check for room joining after initialization
    await checkForRoomJoin()

    isInitialized = true
    setRuntimeDiagnostic('engine', {
      level: 'ready',
      message: 'Game shell initialized. Waiting for runtime subsystems.',
    })
    if (!shouldEnableEditor) {
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
  pendingLevelReturn = {
    levelType: detail.levelType || 'observatory',
    title: detail.title || 'Return to Observatory?',
    message:
      detail.message || 'Leave this level and travel back to the observatory?',
    confirmLabel: detail.confirmLabel || 'Return',
    cancelLabel: detail.cancelLabel || 'Cancel',
  }
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
    
    <!-- Threlte Canvas - Enable input for 3D scene -->
    {#if isInitialized && !error}
      <GameCanvasStage
        {isInitialized}
        {error}
        {isMobile}
        {editorEnabled}
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
        {editorCollisionOverlayComponent}
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
      />
    {/if}
  
    <!-- Legacy container removed - Player component now handles all input -->
  
    <!-- Room Join Screen -->
    {#if isJoiningRoom}
      <div class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50" style="pointer-events: auto;">
        <div class="text-center text-white">
          <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p class="mt-4 text-lg">{loadingMessage}</p>
          {#if currentLevel !== 'observatory'}
            <button
              class="mt-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              on:click={() => { transitionToLevel('observatory') }}
            >
              ← Return to Observatory
            </button>
          {/if}
        </div>
      </div>
    {/if}
  
    <!-- Modern Error Screen -->
    {#if error || roomJoinError}
      <div class="fixed inset-0 bg-red-900 bg-opacity-90 flex items-center justify-center z-50" style="pointer-events: auto;">
        <div class="text-center text-white p-8 rounded-lg bg-red-800">
          <h2 class="text-2xl font-bold mb-4">⚠️ {roomJoinError ? 'Room Join Error' : 'Error'}</h2>
          <p class="text-lg">{roomJoinError || error}</p>
          <button class="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 rounded" 
                  on:click={() => location.reload()}>
            Reload Game
          </button>
          {#if roomJoinError}
            <button class="mt-2 ml-4 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded" 
                    on:click={() => roomJoinError = ''}>
              Continue Without Joining
            </button>
          {/if}
        </div>
      </div>
    {/if}
  
    <!-- Modern Minimal Debug Panel -->
    {#if isInitialized && !error && showDebugPanel}
      <div class="fixed top-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded" style="pointer-events: auto;">
        <h3 class="font-bold">🔧 Debug Info</h3>
        <p>Game State: {isInitialized ? 'Ready' : 'Initializing'}</p>
        <p>Current Level: {currentLevel}</p>
        <p>Mobile: {isMobile ? 'Yes' : 'No'}</p>
        {#if runtimeDiagnosticsPanelComponent}
          <div class="mt-3">
            <svelte:component
              this={runtimeDiagnosticsPanelComponent}
              compact={true}
            />
          </div>
        {/if}
      </div>
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
          <div class="miranda-note-overlay">
            <div class="miranda-note-panel">
              <button
                class="miranda-note-close"
                aria-label="Close note"
                on:click={() => {
                  activeLevelNote = null
                }}
              >
                ×
              </button>
              <div class="miranda-note-kicker">{activeLevelNote.location}</div>
              <h3 class="miranda-note-title">{activeLevelNote.title}</h3>
              <div class="miranda-note-author">{activeLevelNote.author}</div>
              <p class="miranda-note-excerpt">{activeLevelNote.excerpt}</p>
              <div class="miranda-note-body">{activeLevelNote.body}</div>
            </div>
          </div>
        {/if}

        {#if pendingLevelReturn}
          <div class="level-return-overlay">
            <div class="level-return-dialog">
              <h3 class="level-return-title">{pendingLevelReturn.title}</h3>
              <p class="level-return-message">{pendingLevelReturn.message}</p>
              <div class="level-return-actions">
                <button class="level-return-button secondary" on:click={cancelPendingLevelReturn}>
                  {pendingLevelReturn.cancelLabel}
                </button>
                <button class="level-return-button primary" on:click={confirmPendingLevelReturn}>
                  {pendingLevelReturn.confirmLabel}
                </button>
              </div>
            </div>
          </div>
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
  
  <style>
    /* Minimal styles - most styling is handled by components */

    .miranda-note-overlay {
      position: fixed;
      inset: 0;
      pointer-events: none;
      display: flex;
      align-items: flex-end;
      justify-content: flex-start;
      padding: 1.25rem;
      z-index: 45;
    }

    .miranda-note-panel {
      position: relative;
      pointer-events: auto;
      width: min(30rem, calc(100vw - 2rem));
      max-height: min(32rem, 72vh);
      overflow: auto;
      padding: 1rem 1rem 1.1rem;
      border: 1px solid rgba(255, 214, 180, 0.28);
      border-radius: 1rem;
      background:
        linear-gradient(180deg, rgba(33, 20, 19, 0.96), rgba(10, 9, 13, 0.96)),
        rgba(0, 0, 0, 0.86);
      box-shadow:
        0 18px 48px rgba(0, 0, 0, 0.52),
        inset 0 1px 0 rgba(255, 255, 255, 0.06);
      color: rgba(255, 244, 232, 0.96);
      backdrop-filter: blur(14px);
    }

    .miranda-note-kicker {
      font-size: 0.7rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: rgba(255, 180, 138, 0.82);
      margin-bottom: 0.45rem;
    }

    .miranda-note-title {
      margin: 0;
      font-size: 1.15rem;
      line-height: 1.2;
    }

    .miranda-note-author {
      margin-top: 0.25rem;
      font-size: 0.8rem;
      color: rgba(196, 215, 255, 0.78);
    }

    .miranda-note-excerpt {
      margin: 0.8rem 0 0.65rem;
      font-size: 0.95rem;
      color: rgba(255, 219, 196, 0.88);
    }

    .miranda-note-body {
      white-space: pre-line;
      font-size: 0.9rem;
      line-height: 1.5;
      color: rgba(255, 244, 232, 0.92);
    }

    .miranda-note-close {
      position: absolute;
      top: 0.6rem;
      right: 0.7rem;
      width: 2rem;
      height: 2rem;
      border: 0;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 244, 232, 0.88);
      font-size: 1.2rem;
      cursor: pointer;
    }

    .miranda-note-close:hover {
      background: rgba(255, 255, 255, 0.16);
    }

    .level-return-overlay {
      position: fixed;
      inset: 0;
      z-index: 55;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      background: rgba(3, 6, 12, 0.7);
      backdrop-filter: blur(10px);
      pointer-events: auto;
    }

    .level-return-dialog {
      width: min(26rem, calc(100vw - 2rem));
      padding: 1.2rem 1.2rem 1rem;
      border: 1px solid rgba(143, 214, 255, 0.2);
      border-radius: 1rem;
      background: linear-gradient(180deg, rgba(10, 16, 28, 0.96), rgba(5, 9, 16, 0.94));
      box-shadow: 0 22px 70px rgba(0, 0, 0, 0.45);
      color: #eef6ff;
    }

    .level-return-title {
      margin: 0 0 0.5rem;
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: 0.01em;
    }

    .level-return-message {
      margin: 0;
      color: rgba(226, 237, 250, 0.78);
      line-height: 1.5;
      font-size: 0.95rem;
    }

    .level-return-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.1rem;
    }

    .level-return-button {
      border: none;
      border-radius: 999px;
      padding: 0.7rem 1rem;
      font: inherit;
      cursor: pointer;
      transition: transform 140ms ease, opacity 140ms ease, background 140ms ease;
    }

    .level-return-button:hover {
      transform: translateY(-1px);
    }

    .level-return-button.secondary {
      background: rgba(118, 136, 164, 0.18);
      color: #d6e4f5;
    }

    .level-return-button.primary {
      background: linear-gradient(135deg, #7fd3ff, #a4b6ff);
      color: #05121d;
      font-weight: 700;
    }

    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }

    @media (max-width: 768px) {
      .miranda-note-overlay {
        padding: 0.75rem;
      }

      .miranda-note-panel {
        width: min(100%, 28rem);
        max-height: 58vh;
        padding-bottom: 1rem;
      }

      .level-return-dialog {
        width: min(100%, 25rem);
      }
    }
  </style>
