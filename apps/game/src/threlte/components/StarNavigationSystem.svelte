<!--
  StarNavigationSystem.svelte
  
  ECS-based star navigation system that coordinates between StarMap and timeline functionality.
  Provides the missing bridge between star interactions and timeline card display.
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { selectedStarStore, gameActions, type StarData } from '../stores/gameStateStore'
  import StarInteractionComponent from './StarInteractionComponent.svelte'
  import LevelTransitionHandler from './LevelTransitionHandler.svelte'

  const dispatch = createEventDispatcher()

  // Props
  export let timelineEvents: any[] = []
  export let starMapComponent: any = null
  
  // Component references
  let starInteractionComponent: StarInteractionComponent
  let levelTransitionHandler: LevelTransitionHandler

  // State
  let currentSelectedStar: StarData | null = null
  let isSystemActive = true

  onMount(() => {
    console.log('🌟 StarNavigationSystem initialized')
    setupStarNavigationBridge()
    
    return () => {
      cleanup()
    }
  })

  // Subscribe to star selection changes
  $: if ($selectedStarStore !== currentSelectedStar) {
    currentSelectedStar = $selectedStarStore
    handleStarSelectionChange(currentSelectedStar)
  }

  function setupStarNavigationBridge() {
    // Set up communication bridge between StarMap and interaction system
    console.log('🔗 Setting up star navigation bridge')
    
    // Listen for external star selection events (from other systems)
    if (typeof window !== 'undefined') {
      window.addEventListener('starmap.star.selected', handleExternalStarSelection)
      window.addEventListener('starmap.star.deselected', handleExternalStarDeselection)
    }
  }

  function cleanup() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('starmap.star.selected', handleExternalStarSelection)
      window.removeEventListener('starmap.star.deselected', handleExternalStarDeselection)
    }
  }

  function handleExternalStarSelection(event: any) {
    const { eventData, screenPosition } = event.detail
    if (eventData && isSystemActive) {
      // Include screen position in the star data
      const starWithPosition = { ...eventData, screenPosition }
      gameActions.selectStar(starWithPosition)
      console.log('🌟 External star selection processed:', eventData.title)
    }
  }

  function handleExternalStarDeselection(event: any) {
    if (isSystemActive) {
      gameActions.selectStar(null)
      console.log('🌟 External star deselection processed')
    }
  }

  function handleStarSelectionChange(star: StarData | null) {
    if (star) {
      console.log('⭐ Star navigation system processing selection:', star.title)
      
      // Record analytics/metrics
      recordStarInteraction(star)
      
      // Dispatch to parent components
      dispatch('starSelected', {
        star,
        timestamp: Date.now(),
        source: 'navigation_system'
      })
    } else {
      console.log('⭐ Star navigation system processing deselection')
      
      dispatch('starDeselected', {
        timestamp: Date.now(),
        source: 'navigation_system'
      })
    }
  }

  function recordStarInteraction(star: StarData) {
    // Record interaction for analytics/progression tracking
    gameActions.recordInteraction('star_navigation', star.uniqueId)
    
    // Update game stats if this is a new star discovery
    if (star.isKeyEvent) {
      console.log('🔑 Key event star selected:', star.title)
    }
    
    if (star.isLevel) {
      console.log('🏛️ Level star selected:', star.title, 'levelId:', star.levelId)
    }
  }

  function handleStarInteraction(event: CustomEvent) {
    const { star, eventData, screenPosition, worldPosition } = event.detail
    
    console.log('🎯 Star interaction processed:', star?.title)
    
    // Forward to parent with enhanced data
    dispatch('starInteraction', {
      star,
      eventData,
      screenPosition,
      worldPosition,
      timestamp: Date.now(),
      interactionType: 'click'
    })
  }

  function handleStarDeselection(event: CustomEvent) {
    console.log('🔄 Star deselection processed')
    
    dispatch('starDeselection', {
      timestamp: Date.now(),
      source: 'interaction_component'
    })
  }

  function handleLevelTransition(event: CustomEvent) {
    const { levelType, fromStar } = event.detail
    
    console.log('🎮 Level transition initiated:', levelType, 'from star:', fromStar?.title)
    
    // Forward to level transition handler
    if (levelTransitionHandler) {
      levelTransitionHandler.handleTransition(levelType, fromStar)
    }
    
    // Dispatch to parent level manager
    dispatch('levelTransition', {
      levelType,
      fromStar,
      timestamp: Date.now(),
      source: 'star_navigation'
    })
  }

  // Public API for external control
  export function selectStarById(starId: string) {
    const star = findStarById(starId)
    if (star) {
      gameActions.selectStar(star)
      return true
    }
    return false
  }

  export function clearSelection() {
    gameActions.selectStar(null)
  }

  export function getSelectedStar(): StarData | null {
    return currentSelectedStar
  }

  export function setSystemActive(active: boolean) {
    isSystemActive = active
    console.log('🌟 Star navigation system', active ? 'activated' : 'deactivated')
  }

  function findStarById(starId: string): StarData | null {
    // Search in timeline events
    const timelineEvent = timelineEvents.find(event => 
      event.id === starId || event.uniqueId === starId || event.slug === starId
    )
    
    if (timelineEvent) {
      return {
        uniqueId: timelineEvent.id || timelineEvent.uniqueId || starId,
        title: timelineEvent.title || 'Unknown Star',
        description: timelineEvent.description || 'A timeline event',
        isKeyEvent: timelineEvent.isKeyEvent || false,
        isLevel: timelineEvent.isLevel || false,
        levelId: timelineEvent.levelId,
        ...timelineEvent
      } as StarData
    }
    
    return null
  }

  // Analytics and debugging helpers
  export function getNavigationStats() {
    return {
      selectedStar: currentSelectedStar,
      totalTimelineEvents: timelineEvents.length,
      isActive: isSystemActive,
      timestamp: Date.now()
    }
  }
</script>

<!-- 
  Star Interaction Component - handles clicks and timeline card display
-->
<StarInteractionComponent 
  bind:this={starInteractionComponent}
  {timelineEvents}
  starMapRef={starMapComponent}
  on:starSelected={handleStarInteraction}
  on:starDeselected={handleStarDeselection}
  on:levelTransition={handleLevelTransition}
/>

<!--
  Level Transition Handler - manages navigation between levels
-->
<LevelTransitionHandler 
  bind:this={levelTransitionHandler}
  on:transitionStarted={(e) => dispatch('transitionStarted', e.detail)}
  on:transitionCompleted={(e) => dispatch('transitionCompleted', e.detail)}
  on:transitionFailed={(e) => dispatch('transitionFailed', e.detail)}
/>

<!--
  Development/Debug Info (remove in production)
-->
{#if import.meta.env.DEV && currentSelectedStar}
  <div class="debug-star-info">
    <strong>Selected Star:</strong> {currentSelectedStar.title}<br>
    <strong>Type:</strong> {currentSelectedStar.isKeyEvent ? 'Key Event' : 'Regular'}<br>
    {#if currentSelectedStar.isLevel}
      <strong>Level:</strong> {currentSelectedStar.levelId}<br>
    {/if}
    <strong>Era:</strong> {currentSelectedStar.timelineEra || 'Unknown'}<br>
  </div>
{/if}

<style>
  .debug-star-info {
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-size: 12px;
    z-index: 9999;
    pointer-events: none;
  }
</style>