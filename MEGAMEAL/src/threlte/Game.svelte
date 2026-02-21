<!-- 
  Threlte-based Game.svelte - Phase 1 Foundation
  Replaces Three.js with Threlte declarative components
-->
<script lang="ts">
  import { onDestroy, onMount, createEventDispatcher } from 'svelte'
  import { Canvas } from '@threlte/core'
  import { Environment } from '@threlte/extras'
  import { World } from '@threlte/rapier'
  
  // Modern UI components only
  import { ThrelteMobileControls } from './features/player'

  // ==================================================================
  // === ADD THESE IMPORTS FOR THE CONVERSATION DIALOG ===
  // ==================================================================
  import { 
    ConversationDialog,
    isConversationActive, 
    conversationUIState, 
    conversationActions 
  } from './features/conversation';
  // ==================================================================
  
  // Import MobileEnhancements component
  import MobileEnhancements from './ui/MobileEnhancements.svelte'
  
  // Import reactive performance store for conditional rendering
  import { qualitySettingsStore } from './features/performance'
  
  // Import Threlte systems
  import { Player } from './features/player'
  import { MultiplayerManager } from './features/multiplayer'
  import Renderer from './systems/Renderer.svelte'
  import SimplePostProcessing from './systems/SimplePostProcessing.svelte'
  import Physics from './systems/Physics.svelte'
  import SpawnSystem from './systems/SpawnSystem.svelte'
  import Audio from './systems/Audio.svelte'
  import EventBus from './systems/EventBus.svelte'
  import Time from './systems/Time.svelte'
  import AssetLoader from './systems/AssetLoader.svelte'
  // Input and Interaction now handled by Player component
  // StateManager removed - was conflicting with Player component rotation control
  import { PerformanceSystem } from './features/performance'
  import { LODSystem } from './features/performance'
  import InteractionSystem from './systems/InteractionSystem.svelte'
  
  // Post-processing effects temporarily disabled due to library compatibility issues
  
  // Import stores for reactive configuration
  import { postProcessingStore } from './stores/postProcessingStore'
  
  // Import multiplayer service for room joining
  import { initializeClient } from './features/multiplayer'
  
  // Import level components - Modern Architecture Only
  import HybridObservatory from './levels/HybridObservatory.svelte'
  import SciFiRoom from './levels/SciFiRoom.svelte'
  
  // Import UI components
  import { PerformancePanel } from './features/performance'
  import TimelineCard from './ui/TimelineCard.svelte'
  import SettingsButton from './ui/SettingsButton.svelte'
  import SettingsPanel from './ui/SettingsPanel.svelte'
  import { ChatBox } from './features/multiplayer'
  
  // Import modern Threlte stores for reactive state management
  import { 
    currentLevelStore, 
    selectedStarStore, 
    gameStatsStore, 
    isMobileStore, 
    isLoadingStore, 
    errorStore,
    dialogueStore,
    gameActions,
    loadGameState,
    type StarData 
  } from './stores/gameStateStore'
  
  // Import UI state store
  import { isSettingsMenuOpen } from './stores/uiStore'
  
  const dispatch = createEventDispatcher()
  
  // Props
  export let timelineEvents = []
  
  // Parse timeline events if they come as JSON string from Astro
  $: parsedTimelineEvents = (() => {
    if (typeof timelineEvents === 'string') {
      try {
        const parsed = JSON.parse(timelineEvents)
        console.log(`🎮 Game.svelte: Parsed ${parsed.length} timeline events from JSON string`)
        return parsed
      } catch (error) {
        console.error('Failed to parse timeline events:', error)
        return []
      }
    }
    const events = Array.isArray(timelineEvents) ? timelineEvents : []
    console.log(`🎮 Game.svelte: Using ${events.length} timeline events directly`)
    return events
  })()
  // Game state - fully migrated to reactive Threlte stores
  
  // UI state (local)
  let loadingMessage = 'Initializing Threlte...'
  let isInitialized = false
  let showDebugPanel = false
  
  // Room joining state
  let isJoiningRoom = false
  let roomJoinError = ''
  
  let playerComponent: any = null
  let spawnSystem: any = null
  let interactionSystem: any = null // Reference to centralized InteractionSystem
  let chatBoxComponent: any = null // Reference to ChatBox component
  
  // Spawn system state
  let physicsReady = false
  
  // --- NEW: Robust Loading State ---
  // We now consider the game "loaded" only when the terrain's physics are ready.
  let terrainReady = false
  $: if (terrainReady) {
    console.log('✅ Terrain and physics are ready. Hiding loading screen.');
    gameActions.setLoading(false);
  }
  
  // Reactive store subscriptions (these are reactive by default)
  $: currentLevel = $currentLevelStore
  $: selectedStar = $selectedStarStore
  $: gameStats = $gameStatsStore
  $: isMobile = $isMobileStore
  $: isLoading = $isLoadingStore
  $: error = $errorStore
  $: dialogue = $dialogueStore
  
  // Reactive level and star tracking - debug logs removed for performance
  $: if (import.meta.env.DEV && currentLevel) {
    console.log('🎮 Current level:', currentLevel)
  }
  
  $: if (import.meta.env.DEV && selectedStar) {
    console.log('⭐ Star selected:', selectedStar.title)
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
  
  // Debug for selected events and star selection
  $: if (selectedStar) {
    console.log('⭐ Selected star:', selectedStar.title?.substring(0, 30) + '...')
  }
  $: if (selectedEvent) {
    console.log('🎯 Timeline card:', selectedEvent.title?.substring(0, 30) + '...')
  } else if (selectedStar) {
    console.log('⚠️ Selected star exists but no selectedEvent created:', selectedStar)
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
      console.log(`🎮 Found room parameter: ${roomParam}`);
      isJoiningRoom = true;
      loadingMessage = `Joining room "${roomParam}"...`;
      
      try {
        console.log(`🎮 Joining room: ${roomParam}`);
        initializeClient(roomParam);
        console.log(`✅ Initiated join for room "${roomParam}"`);
      } catch (error) {
        roomJoinError = `Failed to join room "${roomParam}". Please try again.`;
        console.error(`❌ Failed to join room "${roomParam}":`, error);
      } finally {
        isJoiningRoom = false;
      }
    } else if (joinParam) {
      // Legacy support for direct host ID joining is deprecated
      roomJoinError = 'Direct host ID joining is no longer supported. Please use room names instead.';
      console.warn(`⚠️ Legacy join parameter "${joinParam}" is deprecated`);
    }
  }

  /**
   * Initialize Threlte-based game
   */
  async function initializeThrelte() {
    try {
      loadingMessage = 'Initializing MEGAMEAL...'
      gameActions.setLoading(true)
      
      // Detect mobile and update store
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
      gameActions.setMobile(isMobileDevice)
  
      loadingMessage = 'Building world...'
  
      // Load saved game state
      loadGameState()
      
      // Set default level to observatory if none is set
      if (!$currentLevelStore || $currentLevelStore === '') {
        gameActions.transitionToLevel('observatory')
      }
      
      // Set up Threlte-based state management
      setupStateUpdates()
      
      // Check for room joining after initialization
      await checkForRoomJoin()
  
      // The loading screen will now be hidden by the `terrainReady` reactive block.
      isInitialized = true
  
      console.log('✅ Game systems initialized. Waiting for terrain...')
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
    console.log('🔄 Setting up reactive Threlte store-based state management')
    
    // All state is now managed by reactive stores
    // No need for manual initialization - stores handle their own state
    
    console.log('✅ Reactive store-based state management ready')
  }
  
  /**
   * Handle level transition requests - Pure Threlte store-based implementation
   */
  function handleLevelTransition(event: CustomEvent) {
    const { levelType } = event.detail
  
    // Map level types to level IDs
    const levelMap = {
      'miranda-ship-level': 'miranda',
      'restaurant-backroom-level': 'restaurant',
      'infinite-library-level': 'infinite_library',
      'sci-fi-room-level': 'sci-fi-room',
    }
  
    const levelId = levelMap[levelType as keyof typeof levelMap] || levelType
  
    // Update current level using store action (automatically reactive)
    gameActions.transitionToLevel(levelId)
    console.log(`🎮 Threlte store-based level transition: ${levelId}`)
  }
  
  /**
   * Handle return to observatory - Store-based implementation
   */
  function handleReturnToObservatory() {
    gameActions.transitionToLevel('observatory')
    console.log('🎮 Threlte store: Returned to observatory')
  }
  
  // Mobile controls now handled through reactive stores - no event forwarding needed
  
  /**
   * Reset view - Handled by Player component
   */
  function resetView() {
    // View reset is now handled by the Player component's camera controls
    console.log('🎮 View reset requested - handled by Player component')
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
    console.log('🎮 Starting MEGAMEAL Game with Threlte...')
    await initializeThrelte()

    // Make gameActions globally available for debugging
    if (import.meta.env.DEV) {
      window.gameActions = gameActions;
      console.log('🔧 gameActions available globally for debugging');
    }

    window.addEventListener('keydown', handleKeyDown);
  })
  
  onDestroy(() => {
    console.log('🧹 Cleaning up Threlte Game...')
    window.removeEventListener('keydown', handleKeyDown);
    // All cleanup is now handled by individual Threlte components
    console.log('✅ Threlte Game cleaned up')
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
          on:objectClick={(e) => console.log('🎯 Game: Object clicked:', e.detail)}
        />
        
        <Time on:timeUpdate={(e) => dispatch('timeUpdate', e.detail)} />
        
        <PerformanceSystem 
          enablePerformanceMonitoring={true}
          enableAutomaticOptimization={true}
          targetFPS={60}
          on:performanceUpdate={(e) => {
            dispatch('performanceUpdate', e.detail)
            // Automatically adjust post-processing quality based on performance
            if (e.detail.averageFPS) {
              import('./stores/postProcessingStore').then(({ adjustQualityForPerformance }) => {
                adjustQualityForPerformance(e.detail.averageFPS, 60)
              })
            }
          }}
          on:qualityChanged={(e) => dispatch('qualityChanged', e.detail)}
        />
        
        <LODSystem 
          enableLOD={true}
          maxDistance={100}
          updateFrequency={0.1}
          enableCulling={true}
          on:lodLevelChanged={(e) => dispatch('lodLevelChanged', e.detail)}
        />
        
        <!-- StateManager removed - was causing camera control conflicts with Player component -->
        
        <AssetLoader />
        
        <!-- Renderer Configuration -->
        <Renderer />
        
        <!-- Simple Post-Processing using Native Threlte - conditional rendering based on performance -->
        {#if $qualitySettingsStore.enablePostProcessing}
          <SimplePostProcessing 
            enableGlow={true}
            enableAmbientLight={true}
            toneMappingExposure={1.0}
          />
        {/if}
        
        <!-- Audio System -->
        <Audio enabled={false} />
        
        <!-- ECS Spawn System - Handles all entity spawning -->
        <SpawnSystem
          bind:this={spawnSystem}
          {playerComponent}
          {physicsReady}
          {terrainReady}
          on:entitySpawned={(e) => console.log('🎯 Entity spawned:', e.detail)}
        />

        <!-- Physics World -->
        <Physics
          ccd={true}
          integrationParameters={{
            dt: 1 / 60,
            minSolverIterations: isMobile ? 8 : 16
          }}
          on:physicsReady={() => physicsReady = true}
        >
          <!-- 
            Player Component - Handles input/movement, spawned by ECS SpawnSystem
          -->
          <Player
            bind:this={playerComponent}
            position={[0, 0, 0]}
            speed={5}
            jumpForce={8}

            on:interaction={(e) => { gameActions.recordInteraction('click', e.detail.type); dispatch('objectClick', e.detail) }}
          />
          
          <!-- Multiplayer System - Renders remote players -->
          <MultiplayerManager />
          
          
          <!-- Modern MEGAMEAL Architecture - Dynamic Level Loading -->
          {#if $currentLevelStore === 'sci-fi-room'}
            <SciFiRoom 
              timelineEvents={parsedTimelineEvents}
              timelineEventsJson={typeof timelineEvents === 'string' ? timelineEvents : JSON.stringify(parsedTimelineEvents)}
              {spawnSystem}
              {interactionSystem}
              position={[0, 0, 0]}
              playerSpawnPoint={[0, 1, 0]}
              on:starSelected={(e) => dispatch('starSelected', e.detail)}
              on:telescopeInteraction={(e) => dispatch('telescopeInteraction', e.detail)}
              on:terrainReady={() => terrainReady = true}
            />
          {:else}
            <HybridObservatory 
              timelineEvents={parsedTimelineEvents}
              timelineEventsJson={typeof timelineEvents === 'string' ? timelineEvents : JSON.stringify(parsedTimelineEvents)}
              {spawnSystem}
              {interactionSystem}
              position={[0, 15, 10]}
              playerSpawnPoint={[0, 18, -50]}
              on:starSelected={(e) => dispatch('starSelected', e.detail)}
              on:telescopeInteraction={(e) => dispatch('telescopeInteraction', e.detail)}
              on:terrainReady={() => terrainReady = true}
            />
          {/if}
          
          <!-- Optimization System -->
          <!-- OptimizationSystem removed - functionality now handled by OptimizationManager.ts -->
        </Physics>
        
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
        <!-- Modern Timeline Card (replaces deleted TimelineCard component) -->
        <TimelineCard
          isVisible={!!selectedEvent}
          event={selectedEvent}
          isMobile={isMobile}
          compact={false}
          position="bottom"
          on:levelTransition={(e) => {
            const { levelType } = e.detail;
            gameActions.transitionToLevel(levelType);
            console.log(`🎮 Timeline card level transition: ${levelType}`);
          }}
          on:close={() => gameActions.selectStar(null)}
        />
        
        <!-- Settings Button -->
        {#if isInitialized && !isLoading && !error}
          <SettingsButton />
        {/if}
        
        <!-- Settings Panel -->
        <SettingsPanel />
        
        <!-- Threlte-Native Mobile Controls -->
        {#if isMobile && isInitialized && !isLoading && !error}
          <ThrelteMobileControls />
        {/if}

        <!-- Mobile Enhancements (Pull-to-refresh prevention and fullscreen button) -->
        <MobileEnhancements />
        
        <!-- Chat Box -->
        <ChatBox bind:this={chatBoxComponent} />
      </div>

      <!--
      // ==================================================================
      // === ADD THE CONVERSATION DIALOG RENDERING BLOCK HERE ===
      // ==================================================================
      -->
      {#if $isConversationActive}
        <div style="pointer-events: auto;">
            <ConversationDialog
                visible={$conversationUIState.isVisible}
                position={$conversationUIState.position}
                on:close={() => conversationActions.endConversation()}
            />
        </div>
      {/if}
  </div>
  
  <style>
    /* Minimal styles - most styling is handled by components */
    
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  </style>
