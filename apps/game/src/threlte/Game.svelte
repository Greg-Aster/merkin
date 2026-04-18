<!-- 
  Threlte-based Game.svelte - Phase 1 Foundation
  Replaces Three.js with Threlte declarative components
-->
<script lang="ts">
  import { onDestroy, onMount, createEventDispatcher } from 'svelte'
  import { Canvas } from '@threlte/core'
  
  // Modern UI components only
  import ThrelteMobileControls from './features/player/ThrelteMobileControls.svelte'

  import { 
    isConversationActive, 
    conversationUIState, 
    conversationActions 
  } from './features/conversation/conversationStores'
  
  // Import MobileEnhancements component
  import MobileEnhancements from './ui/MobileEnhancements.svelte'
  
  // Import reactive performance store for conditional rendering
  import { qualitySettingsStore } from './features/performance/stores/performanceStore'
  
  // Import Threlte systems
  import Renderer from './systems/Renderer.svelte'
  import SimplePostProcessing from './systems/SimplePostProcessing.svelte'
  import SpawnSystem from './systems/SpawnSystem.svelte'
  import EventBus from './systems/EventBus.svelte'
  import Time from './systems/Time.svelte'
  import AssetLoader from './systems/AssetLoader.svelte'
  // Input and Interaction now handled by Player component
  // StateManager removed - was conflicting with Player component rotation control
  import PerformanceSystem from './features/performance/systems/Performance.svelte'
  import LODSystem from './features/performance/systems/LOD.svelte'
  import { resetLevelRuntime } from './core/levelRuntimeReset'
  import InteractionSystem from './systems/InteractionSystem.svelte'
  
  // Import UI components
  import TimelineCard from './ui/TimelineCard.svelte'
  import SettingsButton from './ui/SettingsButton.svelte'
  
  // Import modern Threlte stores for reactive state management
  import { 
    currentLevelStore, 
    selectedStarStore, 
    gameStatsStore, 
    isMobileStore, 
    isLoadingStore, 
    errorStore,
    gameActions,
    loadGameState,
    type StarData 
  } from './stores/gameStateStore'
  
  // Import UI state store
  import {
    isSettingsMenuOpen,
    isNeuralStylizationEnabled,
  } from './stores/uiStore'
  import { editorStateStore, initializeEditor } from './editor/editorStore'
  
  const dispatch = createEventDispatcher()
  const isDev = import.meta.env.DEV

  function debugLog(...args: any[]) {
    if (isDev) {
      console.log(...args)
    }
  }
  
  // Props
  export let timelineEvents = []
  
  // Parse timeline events if they come as JSON string from Astro
  $: parsedTimelineEvents = (() => {
    if (typeof timelineEvents === 'string') {
      try {
        const parsed = JSON.parse(timelineEvents)
        debugLog(`🎮 Game.svelte: Parsed ${parsed.length} timeline events from JSON string`)
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
    typeof timelineEvents === 'string' ? timelineEvents : JSON.stringify(parsedTimelineEvents)
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
  let chatBoxComponentClass: any = null
  let audioSystemComponent: any = null
  let multiplayerManagerComponent: any = null
  let physicsSystemComponent: any = null
  let playerComponentClass: any = null
  let neuralStylizationOverlayComponent: any = null
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
  let spawnSystem: any = null
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
  
  // Spawn system state
  let physicsReady = false
  let activeLevelLoadRequest = 0
  let neuralStylizationPromise: Promise<void> | null = null
  let editorFeaturesPromise: Promise<void> | null = null
  let deferredAudioCleanup: (() => void) | null = null
  let deferredGameplayCoreCleanup: (() => void) | null = null
  let gameplayCorePromise: Promise<void> | null = null
  let pendingLevelReturn: {
    levelType: string
    title: string
    message: string
    confirmLabel: string
    cancelLabel: string
  } | null = null

  const levelComponentCache = new Map<string, any>()
  const supportedLevelIds = new Set(['observatory', 'sci-fi-room', 'miranda', 'solitude'])

  function normalizeLevelId(levelId: string | null | undefined) {
    if (!levelId) return 'observatory'
    if (levelId === 'hybrid-observatory') return 'observatory'
    if (levelId === 'solitude-level') return 'solitude'
    return supportedLevelIds.has(levelId) ? levelId : 'observatory'
  }

  function getLevelRenderConfig(levelId: string) {
    const normalizedLevel = normalizeLevelId(levelId)

    if (normalizedLevel === 'sci-fi-room') {
      return {
        offset: [0, 0, 0] as [number, number, number],
        spawn: [0, 1, 0] as [number, number, number],
      }
    }

    if (normalizedLevel === 'miranda') {
      return {
        offset: [0, 0, 0] as [number, number, number],
        spawn: [0, 4.25, -13.8] as [number, number, number],
      }
    }

    if (normalizedLevel === 'solitude') {
      return {
        offset: [0, 0, 0] as [number, number, number],
        spawn: [0, 2.4, -24] as [number, number, number],
      }
    }

    return {
      offset: [0, 15, 10] as [number, number, number],
      spawn: [0, 18, -50] as [number, number, number],
    }
  }
  
  // --- NEW: Robust Loading State ---
  // We now consider the game "loaded" only when the terrain's physics are ready.
  let terrainReady = false
  $: if (terrainReady) {
    debugLog('✅ Terrain and physics are ready. Hiding loading screen.')
    gameActions.setLoading(false);
  }
  
  // Reactive store subscriptions (these are reactive by default)
  $: currentLevel = $currentLevelStore
  $: selectedStar = $selectedStarStore
  $: gameStats = $gameStatsStore
  $: isMobile = $isMobileStore
  $: isLoading = $isLoadingStore
  $: error = $errorStore
  $: editorEnabled = $editorStateStore.enabled
  $: collisionOverlayEnabled = $editorStateStore.collisionOverlayEnabled
  $: playerReady = Boolean(playerComponent && typeof playerComponent.spawnAt === 'function')
  
  // Reactive level and star tracking - debug logs removed for performance
  $: if (isDev && currentLevel) {
    debugLog('🎮 Current level:', currentLevel)
  }
  
  $: if (isDev && selectedStar) {
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

  $: if ($isNeuralStylizationEnabled && !neuralStylizationOverlayComponent) {
    void ensureNeuralStylizationOverlayComponent()
  }

  $: if ($isSettingsMenuOpen && !multiplayerManagerComponent) {
    void ensureMultiplayerFeatures()
  }

  $: if (($isConversationActive || $conversationUIState.isVisible) && !conversationDialogComponent) {
    void ensureConversationDialogComponent()
  }

  $: if (editorEnabled && !editorFeaturesPromise) {
    void ensureEditorFeatures()
  }

  /**
   * Check URL parameters for room joining
   */
  async function checkForRoomJoin() {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    const joinParam = urlParams.get('join'); // Legacy support
    
    if (roomParam) {
      debugLog(`🎮 Found room parameter: ${roomParam}`)
      isJoiningRoom = true;
      loadingMessage = `Joining room "${roomParam}"...`;
      
      try {
        debugLog(`🎮 Joining room: ${roomParam}`)
        await ensureMultiplayerFeatures()
        initializeClientFn?.(roomParam)
        debugLog(`✅ Initiated join for room "${roomParam}"`)
      } catch (error) {
        roomJoinError = `Failed to join room "${roomParam}". Please try again.`;
        console.error(`❌ Failed to join room "${roomParam}":`, error);
      } finally {
        isJoiningRoom = false;
      }
    } else if (joinParam) {
      // Legacy support for direct host ID joining is deprecated
      roomJoinError = 'Direct host ID joining is no longer supported. Please use room names instead.';
      console.warn(`⚠️ Legacy join parameter "${joinParam}" is deprecated`)
    }
  }

  async function ensureLevelComponent(levelId: string) {
    const normalizedLevel = normalizeLevelId(levelId)
    const cached = levelComponentCache.get(normalizedLevel)
    if (cached) {
      currentLevelComponent = cached
      return
    }

    const requestId = ++activeLevelLoadRequest
    currentLevelComponent = null

    const module =
      normalizedLevel === 'sci-fi-room'
        ? await import('./levels/SciFiRoom.svelte')
        : normalizedLevel === 'solitude'
          ? await import('./levels/Solitude.svelte')
        : normalizedLevel === 'miranda'
          ? await import('./levels/MirandaShip.svelte')
          : await import('./levels/HybridObservatory.svelte')

    levelComponentCache.set(normalizedLevel, module.default)

    if (requestId === activeLevelLoadRequest) {
      currentLevelComponent = module.default
    }
  }

  async function ensureSettingsPanelComponent() {
    if (settingsPanelComponent) return
    const module = await import('./ui/SettingsPanel.svelte')
    settingsPanelComponent = module.default
  }

  async function ensureConversationDialogComponent() {
    if (conversationDialogComponent) return
    const module = await import('./features/conversation/ConversationDialog.svelte')
    conversationDialogComponent = module.default
  }

  async function ensureChatBoxComponent() {
    if (chatBoxComponentClass) return
    const module = await import('./features/multiplayer/ui/ChatBox.svelte')
    chatBoxComponentClass = module.default
  }

  async function ensureAudioSystemComponent() {
    if (audioSystemComponent) return
    const module = await import('./systems/Audio.svelte')
    audioSystemComponent = module.default
  }

  async function ensureNeuralStylizationOverlayComponent() {
    if (neuralStylizationOverlayComponent) return

    if (!neuralStylizationPromise) {
      neuralStylizationPromise = import('./systems/NeuralStylizationOverlay.svelte').then((module) => {
        neuralStylizationOverlayComponent = module.default
      })
    }

    await neuralStylizationPromise
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
      ]).then(([
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
        editorPanelComponent = editorPanelModule.default
        editorControlsOverlayComponent = editorControlsOverlayModule.default
        editorCollisionOverlayComponent = editorCollisionOverlayModule.default
        editorCircleSelectOverlayComponent = editorCircleSelectOverlayModule.default
        editorMarqueeOverlayComponent = editorMarqueeOverlayModule.default
        editorSceneLayerComponent = editorSceneLayerModule.default
        editorTerrainSculptLayerComponent = editorTerrainSculptLayerModule.default
        editorViewportControlsComponent = editorViewportControlsModule.default
        editorWorkbenchLightingComponent = editorWorkbenchLightingModule.default
      })
    }

    await editorFeaturesPromise
  }

  async function ensureGameplayCore() {
    if (physicsSystemComponent && playerComponentClass) return

    if (!gameplayCorePromise) {
      gameplayCorePromise = Promise.all([
        import('./systems/Physics.svelte'),
        import('./features/player/Player.svelte'),
      ]).then(([physicsModule, playerModule]) => {
        physicsSystemComponent = physicsModule.default
        playerComponentClass = playerModule.default
      })
    }

    await gameplayCorePromise
  }

  async function ensureMultiplayerFeatures() {
    if (multiplayerManagerComponent && initializeClientFn) return

    const [componentModule, serviceModule] = await Promise.all([
      import('./features/multiplayer/components/MultiplayerManager.svelte'),
      import('./features/multiplayer/services/MultiplayerService'),
    ])

    multiplayerManagerComponent = componentModule.default
    initializeClientFn = serviceModule.initializeClient
    void ensureChatBoxComponent()
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

    window.addEventListener('pointerdown', handleFirstInteraction, { capture: true, once: true, passive: true })
    window.addEventListener('touchstart', handleFirstInteraction, { capture: true, once: true, passive: true })
    window.addEventListener('keydown', handleFirstInteraction, { capture: true, once: true })

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

      if (
        idleCallbackId !== null
        && 'cancelIdleCallback' in window
      ) {
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
        idleCallbackId = window.requestIdleCallback(() => {
          loadGameplayCore()
        }, { timeout: 400 })
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

    window.addEventListener('pointerdown', handleFirstInteraction, { capture: true, once: true, passive: true })
    window.addEventListener('touchstart', handleFirstInteraction, { capture: true, once: true, passive: true })
    window.addEventListener('keydown', handleFirstInteraction, { capture: true, once: true })

    return cleanup
  }

  /**
   * Initialize Threlte-based game
   */
  async function initializeThrelte() {
    try {
      loadingMessage = 'Initializing MEGAMEAL...'
      gameActions.setLoading(true)

      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      const shouldEnableEditor = urlParams?.get('editor') === '1'
      const requestedLevel = normalizeLevelId(urlParams?.get('level'))
      initializeEditor(shouldEnableEditor)
      
      // Detect mobile and update store
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
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
  
      // The loading screen will now be hidden by the `terrainReady` reactive block.
      isInitialized = true
      if (!shouldEnableEditor) {
        deferredAudioCleanup = setupDeferredAudioLoading()
        deferredGameplayCoreCleanup = setupDeferredGameplayCoreLoading()
      }
  
      debugLog('✅ Game systems initialized. Waiting for terrain...')
    } catch (err) {
      console.error('❌ Failed to initialize Threlte game:', err)
      gameActions.setError(err instanceof Error ? err.message : 'Unknown error')
      gameActions.setLoading(false)
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
      message: detail.message || 'Leave this level and travel back to the observatory?',
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
    const levelMap = {
      'miranda-ship-level': 'miranda',
      'restaurant-backroom-level': 'restaurant',
      'infinite-library-level': 'infinite_library',
      'sci-fi-room-level': 'sci-fi-room',
      'solitude-level': 'solitude',
      'observatory-level': 'observatory',
      'hybrid-observatory-level': 'observatory',
      'hybrid-observatory': 'observatory',
    }

    return levelMap[levelType as keyof typeof levelMap] || levelType
  }

  function transitionToLevel(levelType: string) {
    const levelId = resolveLevelId(levelType)
    resetLevelRuntime({
      interactionSystem,
      spawnSystem,
    })
    terrainReady = false
    activeLevelNote = null
    pendingLevelReturn = null
    currentLevelComponent = null
    gameActions.selectStar(null)
    gameActions.transitionToLevel(levelId)
    debugLog(`🎮 Threlte store-based level transition: ${levelId}`)
  }
  
  /**
   * Handle return to observatory - Store-based implementation
   */
  function handleReturnToObservatory() {
    transitionToLevel('observatory')
    debugLog('🎮 Threlte store: Returned to observatory')
  }
  
  // Mobile controls now handled through reactive stores - no event forwarding needed
  
  /**
   * Reset view - Handled by Player component
   */
  function resetView() {
    // View reset is now handled by the Player component's camera controls
    debugLog('🎮 View reset requested - handled by Player component')
  }
  
  /**
   * Toggle debug panel
   */
  function toggleDebugPanel() {
    showDebugPanel = !showDebugPanel
  }
  
  // CORRECTED VERSION
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'F1') {
      event.preventDefault();
      isSettingsMenuOpen.update(open => !open);
    }
  }

  // Player spawning is handled by ECS SpawnSystem
  
  // Lifecycle
  onMount(async () => {
    debugLog('🎮 Starting MEGAMEAL Game with Threlte...')
    await initializeThrelte()

    // Make gameActions globally available for debugging
    if (isDev) {
      window.gameActions = gameActions;
      debugLog('🔧 gameActions available globally for debugging')
    }

    window.addEventListener('keydown', handleKeyDown);
  })
  
  onDestroy(() => {
    debugLog('🧹 Cleaning up Threlte Game...')
    window.removeEventListener('keydown', handleKeyDown);
    deferredAudioCleanup?.()
    deferredAudioCleanup = null
    deferredGameplayCoreCleanup?.()
    deferredGameplayCoreCleanup = null
    // All cleanup is now handled by individual Threlte components
    debugLog('✅ Threlte Game cleaned up')
  })
  </script>
  
  <!-- Game Container - Allow input to pass through to Player component -->
  <div class="w-full h-full relative bg-black overflow-hidden" style="pointer-events: none;">
    
    <!-- Threlte Canvas - Enable input for 3D scene -->
    {#if isInitialized && !error}
      <div style="pointer-events: {$isSettingsMenuOpen ? 'none' : 'auto'}; width: 100%; height: 100%;">
        <Canvas>
        <!-- Core Systems -->
        <EventBus 
          on:levelTransition={handleLevelTransition}
          on:starSelected={(e) => { gameActions.selectStar(e.detail); dispatch('starSelected', e.detail) }}
          on:starDeselected={(e) => { gameActions.deselectStar(); dispatch('starDeselected', e.detail) }}
        />
        
        <!-- Centralized Interaction System for Stars and Fireflies -->
        <InteractionSystem
          bind:this={interactionSystem}
          on:objectClick={(e) => dispatch('objectClick', e.detail)}
        />
        
        <Time on:timeUpdate={(e) => dispatch('timeUpdate', e.detail)} />
        
        <PerformanceSystem
          enablePerformanceMonitoring={true}
          enableAutomaticOptimization={true}
          on:performanceUpdate={(e) => dispatch('performanceUpdate', e.detail)}
          on:qualityChanged={(e) => dispatch('qualityChanged', e.detail)}
        />
        
        <LODSystem 
          enableLOD={true}
          maxDistance={200}
          updateFrequency={0.1}
          enableCulling={true}
          on:lodLevelChanged={(e) => dispatch('lodLevelChanged', e.detail)}
        />
        
        <!-- StateManager removed - was causing camera control conflicts with Player component -->
        
        <AssetLoader />
        
        <!-- Renderer Configuration -->
        <Renderer />
        {#if neuralStylizationOverlayComponent}
          <svelte:component this={neuralStylizationOverlayComponent} />
        {/if}
        <!-- Simple Post-Processing using Native Threlte - conditional rendering based on performance -->
        {#if $qualitySettingsStore.enablePostProcessing}
          <SimplePostProcessing 
            enableGlow={true}
            enableAmbientLight={true}
            toneMappingExposure={1.0}
          />
        {/if}
        
        <!-- Audio System -->
        {#if audioSystemComponent}
          <svelte:component this={audioSystemComponent} enabled={true} />
        {/if}
        
        <!-- ECS Spawn System - Handles all entity spawning -->
        {#if !editorEnabled}
          <SpawnSystem
            bind:this={spawnSystem}
            {playerComponent}
            {playerReady}
            {physicsReady}
            {terrainReady}
            on:entitySpawned={(e) => dispatch('entitySpawned', e.detail)}
          />
        {/if}

        <!-- Physics World -->
        {#if physicsSystemComponent && playerComponentClass}
          <svelte:component
            this={physicsSystemComponent}
            ccd={true}
            integrationParameters={{
              dt: isMobile ? 1 / 30 : 1 / 60,
              minSolverIterations: isMobile ? 8 : 16
            }}
            on:physicsReady={() => physicsReady = true}
          >
            {#if editorEnabled && editorViewportControlsComponent}
              <svelte:component this={editorViewportControlsComponent} enabled={true} />
            {:else}
              <!--
                Player Component - Handles input/movement, spawned by ECS SpawnSystem
              -->
              <svelte:component
                this={playerComponentClass}
                bind:this={playerComponent}
                position={[0, 0, 0]}
                speed={5}
                jumpForce={8}
                on:interaction={(e) => {
                  gameActions.recordInteraction('click', e.detail.type)
                  const selected = interactionSystem?.selectAtScreenPosition?.(e.detail.x, e.detail.y)
                  if (!selected) {
                    dispatch('objectClick', e.detail)
                  }
                }}
                on:lightBurst={(e) => {
                  gameActions.recordInteraction('light_burst', 'player')
                  interactionSystem?.triggerLightBurst?.(e.detail)
                  dispatch('lightBurst', e.detail)
                }}
              />
            {/if}
            
            <!-- Multiplayer System - Renders remote players -->
            {#if multiplayerManagerComponent}
              <svelte:component this={multiplayerManagerComponent} />
            {/if}
            
            
            <!-- Modern MEGAMEAL Architecture - Dynamic Level Loading -->
            {#if currentLevelComponent}
              {#key `${$currentLevelStore}:${currentLevelComponent}`}
                {@const levelRenderConfig = getLevelRenderConfig($currentLevelStore)}
                <svelte:component
                  this={currentLevelComponent}
                  timelineEvents={parsedTimelineEvents}
                  timelineEventsJson={timelineEventsPayload}
                  spawnSystem={editorEnabled ? null : spawnSystem}
                  {interactionSystem}
                  position={levelRenderConfig.offset}
                  playerSpawnPoint={levelRenderConfig.spawn}
                  collisionDebugEnabled={editorEnabled && collisionOverlayEnabled}
                  on:starSelected={(e) => dispatch('starSelected', e.detail)}
                  on:telescopeInteraction={(e) => dispatch('telescopeInteraction', e.detail)}
                  on:noteRead={(e) => {
                    activeLevelNote = e.detail
                  }}
                  on:requestLevelReturn={(e) => {
                    handleLevelReturnRequest(e.detail)
                  }}
                  on:terrainReady={() => terrainReady = true}
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
                  editorEnabled={editorEnabled}
                  {interactionSystem}
                  on:portalTransition={(e) => {
                    transitionToLevel(e.detail.levelId)
                  }}
                  on:noteRead={(e) => {
                    activeLevelNote = e.detail
                  }}
                />
              {/if}
              {#if editorCollisionOverlayComponent}
                <svelte:component this={editorCollisionOverlayComponent} levelId={currentLevel} />
              {/if}
              {#if editorTerrainSculptLayerComponent}
                <svelte:component this={editorTerrainSculptLayerComponent} levelId={currentLevel} />
              {/if}
            {/if}
            
            <!-- Optimization System -->
            <!-- OptimizationSystem removed - functionality now handled by OptimizationManager.ts -->
          </svelte:component>
        {/if}
        
        </Canvas>
      </div>
    {/if}
  
    <!-- Legacy container removed - Player component now handles all input -->
  
    <!-- Modern Loading Screen -->
    {#if isLoading || isJoiningRoom}
      <div class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50" style="pointer-events: auto;">
        <div class="text-center text-white">
          <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
          <p class="mt-4 text-lg">{loadingMessage}</p>
          {#if currentLevel !== 'observatory'}
            <button
              class="mt-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              on:click={() => { gameActions.transitionToLevel('observatory'); terrainReady = false; }}
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
    {#if isInitialized && !isLoading && !error && showDebugPanel}
      <div class="fixed top-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded" style="pointer-events: auto;">
        <h3 class="font-bold">🔧 Debug Info</h3>
        <p>Game State: {isInitialized ? 'Ready' : 'Loading'}</p>
        <p>Current Level: {currentLevel}</p>
        <p>Mobile: {isMobile ? 'Yes' : 'No'}</p>
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
        <!-- Modern Timeline Card (replaces deleted TimelineCard component) -->
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
        {#if isInitialized && !isLoading && !error}
          <SettingsButton />
        {/if}
        
        <!-- Settings Panel -->
        {#if settingsPanelComponent}
          <svelte:component this={settingsPanelComponent} />
        {/if}
        
        <!-- Threlte-Native Mobile Controls -->
        {#if isMobile && isInitialized && !isLoading && !error}
          <ThrelteMobileControls />
        {/if}

        <!-- Mobile Enhancements (Pull-to-refresh prevention and fullscreen button) -->
        <MobileEnhancements />
        
        <!-- Chat Box -->
        {#if chatBoxComponentClass}
          <svelte:component this={chatBoxComponentClass} bind:this={chatBoxComponent} />
        {/if}
      </div>

      <!--
      // ==================================================================
      // === ADD THE CONVERSATION DIALOG RENDERING BLOCK HERE ===
      // ==================================================================
      -->
      {#if $isConversationActive && conversationDialogComponent}
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
