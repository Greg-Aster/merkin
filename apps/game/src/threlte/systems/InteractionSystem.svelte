<!--
  Centralized ECS-Based Interaction System
  
  This system provides unified click/hover detection for all interactive elements:
  - Stars (from StarMap)
  - Fireflies (from HybridFireflyComponent) 
  - Future interactive objects
  
  Follows ECS architecture with centralized canvas event handling
  to avoid code duplication and ensure consistent behavior.
-->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import { useThrelte } from '@threlte/core'
  import * as THREE from 'three'
  import { gameActions } from '../stores/gameStateStore'

  const dispatch = createEventDispatcher()
  const { camera } = useThrelte()

  // Centralized registry of all interactive objects
  interface InteractiveObject {
    id: string
    sprite: THREE.Sprite
    type: 'star' | 'firefly' | 'object'
    data: any // Star data, firefly data, etc.
    index: number
    handlers: {
      onClick?: (data: any) => void
      onHover?: (data: any, hovered: boolean) => void
    }
  }

  let interactiveObjects: InteractiveObject[] = []
  let hoveredObjectId: string | null = null
  
  // Mouse tracking (from StarMap pattern)
  let lastMouseX = 0
  let lastMouseY = 0

  // --- PUBLIC API FOR REGISTERING INTERACTIVE OBJECTS ---

  export function registerInteractiveObject(object: InteractiveObject) {
    // Remove existing object with same ID
    interactiveObjects = interactiveObjects.filter(obj => obj.id !== object.id)
    // Add new object
    interactiveObjects.push(object)
    //console.log(`🎯 InteractionSystem: Registered ${object.type} ${object.id} (total: ${interactiveObjects.length})`)
  }

  export function unregisterInteractiveObject(id: string) {
    interactiveObjects = interactiveObjects.filter(obj => obj.id !== id)
    //console.log(`🎯 InteractionSystem: Unregistered ${id}`)
  }

  export function registerStarSprites(sprites: THREE.Sprite[], stars: any[], handlers: any) {
    // Bulk register star sprites (for StarMap)
    sprites.forEach((sprite, index) => {
      const star = stars[index]
      if (star) {
        registerInteractiveObject({
          id: `star_${star.uniqueId || index}`,
          sprite,
          type: 'star',
          data: star,
          index,
          handlers
        })
      }
    })
    console.log(`🌟 InteractionSystem: Registered ${sprites.length} star sprites`)
  }

  export function registerFireflySprites(sprites: THREE.Sprite[], fireflies: any[], handlers: any) {
    // Bulk register firefly sprites (for HybridFireflyComponent)
    sprites.forEach((sprite, index) => {
      const firefly = fireflies[index]
      if (firefly) {
        registerInteractiveObject({
          id: `firefly_${firefly.id || index}`,
          sprite,
          type: 'firefly', 
          data: firefly,
          index,
          handlers
        })
      }
    })
    // console.log(`✨ InteractionSystem: Registered ${sprites.length} firefly sprites`)
  }

  // --- UNIFIED INTERACTION LOGIC ---

  function handleCanvasClick(event: MouseEvent) {
    if (event.button !== 0) return // Left click only
    
    lastMouseX = event.clientX
    lastMouseY = event.clientY
    
    // Small delay to ensure camera movement is done (from StarMap pattern)
    setTimeout(() => selectObjectInCrosshair(), 50)
  }

  function handleCanvasMouseMove(event: MouseEvent) {
    lastMouseX = event.clientX
    lastMouseY = event.clientY
    checkObjectHover(event)
  }

  function selectObjectInCrosshair() {
    if (!$camera || interactiveObjects.length === 0) return

    const intersected = getIntersectedObject()
    if (intersected) {
      const { object, sprite } = intersected
      
      // Call type-specific click handler
      if (object.handlers.onClick) {
        object.handlers.onClick({
          ...object.data,
          sprite,
          index: object.index,
          timestamp: Date.now()
        })
      }
      
      // Dispatch generic event
      dispatch('objectClick', {
        type: object.type,
        data: object.data,
        sprite,
        index: object.index
      })
      
      return true
    } else {
      // Handle empty space clicks (deselect star, etc.)
      gameActions.selectStar(null) // Always deselect star when clicking empty space
      
      // Dispatch empty space click event
      dispatch('emptySpaceClick', {
        timestamp: Date.now()
      })
      
      return false
    }
  }

  function checkObjectHover(event: MouseEvent) {
    if (!$camera || interactiveObjects.length === 0) return
    
    const intersected = getIntersectedObject()
    const newHoveredId = intersected?.object.id || null
    
    // Handle hover change
    if (newHoveredId !== hoveredObjectId) {
      // Call unhover on previous object
      if (hoveredObjectId) {
        const prevObject = interactiveObjects.find(obj => obj.id === hoveredObjectId)
        if (prevObject?.handlers.onHover) {
          prevObject.handlers.onHover(prevObject.data, false)
        }
      }
      
      // Call hover on new object  
      if (newHoveredId && intersected) {
        const { object } = intersected
        if (object.handlers.onHover) {
          object.handlers.onHover(object.data, true)
        }
      }
      
      hoveredObjectId = newHoveredId
    }
  }

  function getIntersectedObject(): { object: InteractiveObject, sprite: THREE.Sprite } | null {
    if (!$camera) return null

    // Get mouse position from last known position (StarMap pattern)
    const canvas = document.querySelector('canvas')
    if (!canvas) return null
    
    const rect = canvas.getBoundingClientRect()
    const mouse = new THREE.Vector2()
    mouse.x = ((lastMouseX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((lastMouseY - rect.top) / rect.height) * 2 + 1
    
    // Cast ray from mouse position
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, $camera)
    
    // Use large threshold for sprites at distance (StarMap pattern)
    raycaster.params.Sprite = { threshold: 1000 }
    
    // Check all registered sprites
    const sprites = interactiveObjects.map(obj => obj.sprite)
    const intersects = raycaster.intersectObjects(sprites)
    
    if (intersects.length > 0) {
      const intersectedSprite = intersects[0].object as THREE.Sprite
      const object = interactiveObjects.find(obj => obj.sprite === intersectedSprite)
      
      if (object) {
        return { object, sprite: intersectedSprite }
      }
    }
    
    return null
  }

  // --- LIFECYCLE ---

  onMount(() => {
    console.log('🎯 InteractionSystem: Initializing centralized interaction system')
    
    // Get canvas and add unified event listeners
    const canvas = document.querySelector('canvas')
    if (canvas) {
      canvas.addEventListener('click', handleCanvasClick)
      canvas.addEventListener('mousemove', handleCanvasMouseMove)
      console.log('🎯 InteractionSystem: Canvas event listeners attached')
    } else {
      console.warn('⚠️ InteractionSystem: No canvas found for event listeners')
    }
    
    return () => {
      if (canvas) {
        canvas.removeEventListener('click', handleCanvasClick)
        canvas.removeEventListener('mousemove', handleCanvasMouseMove)
        console.log('🎯 InteractionSystem: Event listeners cleaned up')
      }
    }
  })

  // --- HELPER FUNCTIONS FOR COMMON TASKS ---

  export function getScreenPosition(worldPosition: THREE.Vector3): { x: number, y: number } {
    if (!$camera) return { x: 0, y: 0 }
    
    const vector = worldPosition.clone()
    vector.project($camera)
    
    // Get canvas dimensions
    const canvas = document.querySelector('canvas')
    const width = canvas?.clientWidth || window.innerWidth
    const height = canvas?.clientHeight || window.innerHeight
    
    const widthHalf = width / 2
    const heightHalf = height / 2
    
    return {
      x: (vector.x * widthHalf) + widthHalf,
      y: -(vector.y * heightHalf) + heightHalf
    }
  }

  // Expose API for external use
  export const interactionAPI = {
    registerInteractiveObject,
    unregisterInteractiveObject,
    registerStarSprites,
    registerFireflySprites,
    getScreenPosition
  }
</script>

<!-- No visual elements - this is a pure system component -->