<!--
  LevelTransitionHandler.svelte
  
  ECS component for handling level transitions from timeline cards.
  Manages the transition logic and communicates with the game's level system.
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { currentLevelStore, gameActions, type StarData } from '../stores/gameStateStore'
  import { getLevelRegistry, isPlayableLevel, resolveLevelId } from '../levels/levelRegistry'

  const dispatch = createEventDispatcher()
  const isDev = import.meta.env.DEV

  // Props  
  export let transitionDelay = 500 // ms delay before transition

  // State
  let isTransitioning = false
  let currentTransition: any = null

  onMount(() => {
    if (isDev) console.log('🎮 LevelTransitionHandler initialized')
    
    return () => {
      // Cleanup any ongoing transitions
      if (currentTransition) {
        clearTimeout(currentTransition)
      }
    }
  })

  // Subscribe to level changes to track transitions
  $: if ($currentLevelStore) {
    if (isDev) console.log('🎮 Current level:', $currentLevelStore)
  }

  /**
   * Handle a level transition request
   */
  export function handleTransition(levelType: string, fromStar?: StarData | null) {
    if (isTransitioning) {
      console.warn('🎮 Transition already in progress, ignoring request')
      return false
    }

    if (isDev) console.log('🎮 Processing level transition:', levelType)
    
    // Map the level identifier
    const mappedLevelId = resolveLevelId(levelType)
    
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
    return isPlayableLevel(levelId)
  }

  function startTransition(levelId: string, fromStar?: StarData | null) {
    isTransitioning = true
    
    if (isDev) console.log('🎮 Starting transition to:', levelId)
    
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
      if (isDev) console.log('🎮 Executing transition to:', levelId)
      
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
      
      if (isDev) console.log('✅ Level transition completed:', levelId)
      
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
      if (isDev) console.log('📊 Transition triggered by star:', fromStar.title, '→', levelId)
    } else {
      if (isDev) console.log('📊 Direct transition to:', levelId)
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
    
    if (isDev) console.log('🎮 Transition cancelled')
    
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
    return Object.fromEntries(
      getLevelRegistry().flatMap((entry) => [
        [entry.id, entry.id],
        ...(entry.aliases ?? []).map((alias) => [alias, entry.id]),
      ])
    )
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
