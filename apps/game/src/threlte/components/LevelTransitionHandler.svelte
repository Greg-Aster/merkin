<!--
  LevelTransitionHandler.svelte
  
  ECS component for handling level transitions from timeline cards.
  Manages the transition logic and communicates with the game's level system.
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { currentLevelStore, gameActions, type StarData } from '../stores/gameStateStore'

  const dispatch = createEventDispatcher()

  // Props  
  export let transitionDelay = 500 // ms delay before transition
  export let fadeOutDuration = 300 // ms fade out duration

  // State
  let isTransitioning = false
  let currentTransition: any = null

  // Level mapping from timeline card levelIds to actual game level identifiers
  const levelMappings: Record<string, string> = {
    // Timeline card levelIds → Game level identifiers
    'miranda-ship-level': 'miranda',
    'restaurant-backroom-level': 'restaurant', 
    'infinite-library-level': 'infinite_library',
    'jerrys-room-level': 'jerrys_room',
    'observatory-level': 'observatory',
    'sci-fi-room-level': 'sci-fi-room',
    
    // Direct mappings (in case some use the direct names)
    'miranda': 'miranda',
    'restaurant': 'restaurant',
    'infinite_library': 'infinite_library',
    'jerrys_room': 'jerrys_room',
    'observatory': 'observatory',
    'sci-fi-room': 'sci-fi-room'
  }

  onMount(() => {
    console.log('🎮 LevelTransitionHandler initialized')
    
    return () => {
      // Cleanup any ongoing transitions
      if (currentTransition) {
        clearTimeout(currentTransition)
      }
    }
  })

  // Subscribe to level changes to track transitions
  $: if ($currentLevelStore) {
    console.log('🎮 Current level:', $currentLevelStore)
  }

  /**
   * Handle a level transition request
   */
  export function handleTransition(levelType: string, fromStar?: StarData | null) {
    if (isTransitioning) {
      console.warn('🎮 Transition already in progress, ignoring request')
      return false
    }

    console.log('🎮 Processing level transition:', levelType)
    
    // Map the level identifier
    const mappedLevelId = levelMappings[levelType] || levelType
    
    if (!isValidLevel(mappedLevelId)) {
      console.error('🎮 Invalid level identifier:', levelType, '→', mappedLevelId)
      dispatch('transitionFailed', {
        reason: 'invalid_level',
        requestedLevel: levelType,
        mappedLevel: mappedLevelId,
        fromStar
      })
      return false
    }

    // Start transition process
    startTransition(mappedLevelId, fromStar)
    return true
  }

  function isValidLevel(levelId: string): boolean {
    const validLevels = ['observatory', 'miranda', 'restaurant', 'infinite_library', 'jerrys_room', 'sci-fi-room']
    return validLevels.includes(levelId)
  }

  function startTransition(levelId: string, fromStar?: StarData | null) {
    isTransitioning = true
    
    console.log('🎮 Starting transition to:', levelId)
    
    // Dispatch transition started event
    dispatch('transitionStarted', {
      targetLevel: levelId,
      fromStar,
      timestamp: Date.now()
    })

    // Record the transition for analytics
    recordTransition(levelId, fromStar)

    // Add transition delay for smooth UX
    currentTransition = setTimeout(() => {
      executeTransition(levelId, fromStar)
    }, transitionDelay)
  }

  function executeTransition(levelId: string, fromStar?: StarData | null) {
    try {
      console.log('🎮 Executing transition to:', levelId)
      
      // Update the game state
      gameActions.transitionToLevel(levelId)
      
      // Record successful transition
      if (fromStar) {
        gameActions.recordInteraction('level_transition_from_star', fromStar.uniqueId)
      }
      
      // Dispatch completion event
      dispatch('transitionCompleted', {
        targetLevel: levelId,
        fromStar,
        timestamp: Date.now(),
        success: true
      })
      
      console.log('✅ Level transition completed:', levelId)
      
    } catch (error) {
      console.error('❌ Level transition failed:', error)
      
      dispatch('transitionFailed', {
        targetLevel: levelId,
        fromStar,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      })
    } finally {
      isTransitioning = false
      currentTransition = null
    }
  }

  function recordTransition(levelId: string, fromStar?: StarData | null) {
    // Record transition analytics
    gameActions.recordInteraction('level_transition', levelId)
    
    if (fromStar) {
      console.log('📊 Transition triggered by star:', fromStar.title, '→', levelId)
    } else {
      console.log('📊 Direct transition to:', levelId)
    }
  }

  /**
   * Cancel an ongoing transition (if possible)
   */
  export function cancelTransition(): boolean {
    if (!isTransitioning) {
      return false
    }

    if (currentTransition) {
      clearTimeout(currentTransition)
      currentTransition = null
    }

    isTransitioning = false
    
    console.log('🎮 Transition cancelled')
    
    dispatch('transitionCancelled', {
      timestamp: Date.now()
    })
    
    return true
  }

  /**
   * Get current transition status
   */
  export function getTransitionStatus() {
    return {
      isTransitioning,
      hasActiveTransition: currentTransition !== null,
      currentLevel: $currentLevelStore
    }
  }

  /**
   * Get available level mappings (for debugging)
   */
  export function getLevelMappings() {
    return { ...levelMappings }
  }

  /**
   * Programmatic transition (for external API)
   */
  export function transitionToLevel(levelId: string, fromStar?: StarData | null): boolean {
    return handleTransition(levelId, fromStar)
  }
</script>

<!-- Transition UI feedback (optional visual indicator) -->
{#if isTransitioning}
  <div class="transition-overlay">
    <div class="transition-spinner">
      <div class="spinner"></div>
      <p>Transitioning...</p>
    </div>
  </div>
{/if}

<!-- Debug information in development -->
{#if import.meta.env.DEV && isTransitioning}
  <div class="debug-transition">
    <strong>Transition Status:</strong><br>
    <strong>Active:</strong> {isTransitioning}<br>
    <strong>Current Level:</strong> {$currentLevelStore}<br>
  </div>
{/if}

<style>
  .transition-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    pointer-events: auto;
  }

  .transition-spinner {
    text-align: center;
    color: white;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top: 4px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 10px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .debug-transition {
    position: fixed;
    top: 50px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-size: 12px;
    z-index: 9999;
    pointer-events: none;
  }

  .transition-overlay p {
    margin: 0;
    font-size: 16px;
  }
</style>