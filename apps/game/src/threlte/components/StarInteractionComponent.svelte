<!--
  StarInteractionComponent.svelte
  
  ECS-based component for handling star interactions and timeline card display.
  Integrates with StarMap to provide the missing star→timeline card functionality.
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { useThrelte } from '@threlte/core'
  import * as THREE from 'three'
  import { selectedStarStore, gameActions, type StarData } from '../stores/gameStateStore'
  // TimelineCard functionality moved to Game.svelte with modern implementation

  const dispatch = createEventDispatcher()
  const { camera, renderer } = useThrelte()
  
  // Extract non-reactive references
  let cameraRef: THREE.Camera | null = null
  let rendererRef: THREE.WebGLRenderer | null = null

  // Props
  export let starMapRef: any = null
  export let timelineEvents: any[] = []

  // State
  let selectedStar: StarData | null = null
  let timelineCardVisible = false
  let cardPosition = { x: 0, y: 0 }
  let cardData: any = null
  let isMobile = false

  // Raycaster for mouse interactions
  let raycaster: THREE.Raycaster
  let mousePosition = new THREE.Vector2()

  onMount(() => {
    raycaster = new THREE.Raycaster()
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    // Get references to Threlte objects
    cameraRef = camera.current
    rendererRef = renderer.current
    
    // Set up event listeners
    setupEventListeners()
    
    return () => {
      cleanupEventListeners()
    }
  })

  // Subscribe to selected star changes
  $: if ($selectedStarStore) {
    handleStarSelection($selectedStarStore)
  }

  function setupEventListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('click', handleClick)
      window.addEventListener('mousemove', handleMouseMove)
    }
  }

  function cleanupEventListeners() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('click', handleClick)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }

  function handleMouseMove(event: MouseEvent) {
    if (!rendererRef || !cameraRef) return
    
    const rect = rendererRef.domElement.getBoundingClientRect()
    mousePosition.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mousePosition.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  function handleClick(event: MouseEvent) {
    if (!rendererRef || !cameraRef || !starMapRef) return
    
    // Update mouse position for click
    const rect = rendererRef.domElement.getBoundingClientRect()
    mousePosition.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mousePosition.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    
    // Perform raycast
    raycaster.setFromCamera(mousePosition, cameraRef)
    
    // Check for star intersection
    const starIntersection = findStarIntersection()
    
    if (starIntersection) {
      // Star was clicked
      handleStarClick(starIntersection, event)
    } else {
      // Background was clicked - clear selection
      clearSelection()
    }
  }

  function findStarIntersection() {
    if (!starMapRef || !raycaster) return null
    
    // Get the instanced mesh from StarMap
    const instancedMesh = starMapRef.querySelector('t-instanced-mesh')?.object
    if (!instancedMesh) return null
    
    const intersects = raycaster.intersectObject(instancedMesh)
    
    if (intersects.length > 0) {
      const intersection = intersects[0]
      const instanceId = intersection.instanceId
      
      if (instanceId !== undefined) {
        return {
          instanceId,
          point: intersection.point,
          distance: intersection.distance
        }
      }
    }
    
    return null
  }

  function handleStarClick(intersection: any, mouseEvent: MouseEvent) {
    const { instanceId, point } = intersection
    
    // Find the corresponding star data
    const starData = findStarDataByIndex(instanceId)
    if (!starData) return
    
    // Calculate screen position for timeline card
    const screenPos = getScreenPosition(point)
    
    // Update selected star
    gameActions.selectStar(starData)
    gameActions.recordInteraction('star_click', starData.uniqueId)
    
    // Show timeline card
    showTimelineCard(starData, screenPos, mouseEvent)
    
    // Dispatch events for other systems
    dispatch('starSelected', {
      star: starData,
      eventData: starData,
      screenPosition: screenPos,
      worldPosition: point
    })
    
    console.log('⭐ Star clicked:', starData.title)
  }

  function findStarDataByIndex(instanceId: number): StarData | null {
    // This should match the star generation logic in StarMap.svelte
    if (instanceId < timelineEvents.length) {
      return createStarFromTimelineEvent(timelineEvents[instanceId], instanceId)
    } else {
      // Procedural star
      const proceduralIndex = instanceId - timelineEvents.length
      return createProceduralStar(proceduralIndex)
    }
  }

  function createStarFromTimelineEvent(event: any, index: number): StarData {
    // Match the logic from StarMap.svelte
    return {
      uniqueId: event.id || `timeline_star_${index}`,
      title: event.title || `Star ${index + 1}`,
      description: event.description || 'A distant star',
      timelineYear: event.year,
      timelineEra: event.era,
      timelineLocation: event.location,
      isKeyEvent: event.isKeyEvent || false,
      isLevel: event.isLevel || false,
      levelId: event.levelId,
      tags: event.tags || [],
      category: event.category || 'unknown',
      slug: event.slug,
      clickable: true,
      hoverable: true,
      unlocked: true,
      // Additional properties from original event
      ...event
    } as StarData
  }

  function createProceduralStar(index: number): StarData {
    // Match the logic from StarMap.svelte
    return {
      uniqueId: `procedural_star_${index}`,
      title: `Star ${index + 1}`,
      description: 'A distant star',
      timelineYear: 2000 + Math.floor(Math.random() * 1000),
      timelineEra: 'Unknown Era',
      timelineLocation: 'Deep Space',
      isKeyEvent: false,
      isLevel: false,
      levelId: null,
      tags: ['procedural'],
      category: 'background',
      slug: `star-${index}`,
      clickable: true,
      hoverable: true,
      unlocked: true
    } as StarData
  }

  function getScreenPosition(worldPosition: THREE.Vector3): { x: number, y: number } {
    if (!cameraRef || !rendererRef) return { x: 0, y: 0 }
    
    const vector = worldPosition.clone()
    vector.project(cameraRef)
    
    const widthHalf = rendererRef.domElement.clientWidth / 2
    const heightHalf = rendererRef.domElement.clientHeight / 2
    
    return {
      x: (vector.x * widthHalf) + widthHalf,
      y: -(vector.y * heightHalf) + heightHalf
    }
  }

  function showTimelineCard(starData: StarData, screenPos: { x: number, y: number }, mouseEvent: MouseEvent) {
    cardData = starData
    cardPosition = screenPos
    timelineCardVisible = true
    
    // Add slight offset to avoid covering the star
    cardPosition.y -= 20
    
    console.log('📋 Showing timeline card at:', cardPosition)
  }

  function handleStarSelection(star: StarData | null) {
    selectedStar = star
    if (!star) {
      clearSelection()
    }
  }

  function clearSelection() {
    timelineCardVisible = false
    cardData = null
    selectedStar = null
    gameActions.selectStar(null)
    
    dispatch('starDeselected')
    console.log('⭐ Star selection cleared')
  }

  function handleLevelTransition(event: CustomEvent) {
    const { levelType } = event.detail
    
    console.log('🎮 Level transition requested:', levelType)
    
    // Map levelId to actual level names used by the game
    const levelMap: Record<string, string> = {
      'miranda-ship-level': 'miranda',
      'restaurant-backroom-level': 'restaurant', 
      'infinite-library-level': 'infinite_library',
      'jerrys-room-level': 'jerrys_room'
    }
    
    const mappedLevelId = levelMap[levelType] || levelType
    
    // Dispatch level transition event
    dispatch('levelTransition', { 
      levelType: mappedLevelId,
      fromStar: cardData 
    })
    
    // Clear the timeline card after navigation
    clearSelection()
  }

  // Handle clicking outside the timeline card
  function handleBackgroundClick(event: MouseEvent) {
    if (timelineCardVisible) {
      const target = event.target as HTMLElement
      const isTimelineCard = target.closest('.timeline-card')
      
      if (!isTimelineCard) {
        clearSelection()
      }
    }
  }
</script>

<!-- Timeline Card functionality moved to Game.svelte with modern implementation -->
<!-- Star information now handled by Game.svelte's modern star info panel -->

<!-- Background click handler -->
<svelte:window on:click={handleBackgroundClick} />

<style>
  .timeline-card-overlay {
    pointer-events: none;
  }
  
  .timeline-card-overlay > :global(*) {
    pointer-events: auto;
  }
</style>