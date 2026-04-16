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
  import { onMount, onDestroy, createEventDispatcher } from 'svelte'
  import { useThrelte } from '@threlte/core'
  import * as THREE from 'three'
  import { gameActions } from '../stores/gameStateStore'

  const dispatch = createEventDispatcher()
  const { camera } = useThrelte()
  const isDev = import.meta.env.DEV

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
  let interactiveSprites: THREE.Sprite[] = []
  const interactiveObjectById = new Map<string, InteractiveObject>()
  const interactiveObjectBySprite = new Map<THREE.Sprite, InteractiveObject>()
  let hoveredObjectId: string | null = null
  let canvasElement: HTMLCanvasElement | null = null
  let hoverCheckFrameId: number | null = null
  let clickSelectionTimeoutId: number | null = null

  const pointer = new THREE.Vector2()
  const raycaster = new THREE.Raycaster()
  const projectedScreenPosition = new THREE.Vector3()

  raycaster.params.Sprite = { threshold: 1000 }
  
  // Mouse tracking (from StarMap pattern)
  let lastMouseX = 0
  let lastMouseY = 0

  function syncInteractiveCollections() {
    interactiveObjects = Array.from(interactiveObjectById.values())
    interactiveSprites = interactiveObjects.map((object) => object.sprite)
  }

  function getCanvasElement() {
    if (canvasElement?.isConnected) {
      return canvasElement
    }

    canvasElement = document.querySelector('canvas')
    return canvasElement
  }

  function removeInteractiveObject(id: string) {
    const existingObject = interactiveObjectById.get(id)
    if (!existingObject) return

    interactiveObjectById.delete(id)
    interactiveObjectBySprite.delete(existingObject.sprite)

    if (hoveredObjectId === id) {
      hoveredObjectId = null
    }

    syncInteractiveCollections()
  }

  function removeInteractiveObjectsByType(type: InteractiveObject['type']) {
    let removed = false

    for (const [id, interactiveObject] of interactiveObjectById.entries()) {
      if (interactiveObject.type !== type) continue
      interactiveObjectById.delete(id)
      interactiveObjectBySprite.delete(interactiveObject.sprite)
      removed = true
    }

    if (removed) {
      if (hoveredObjectId && !interactiveObjectById.has(hoveredObjectId)) {
        hoveredObjectId = null
      }

      syncInteractiveCollections()
    }
  }

  // --- PUBLIC API FOR REGISTERING INTERACTIVE OBJECTS ---

  export function registerInteractiveObject(object: InteractiveObject) {
    const existingObject = interactiveObjectById.get(object.id)
    if (existingObject) {
      interactiveObjectBySprite.delete(existingObject.sprite)
    }

    interactiveObjectById.set(object.id, object)
    interactiveObjectBySprite.set(object.sprite, object)
    syncInteractiveCollections()
  }

  export function unregisterInteractiveObject(id: string) {
    removeInteractiveObject(id)
  }

  export function registerStarSprites(sprites: THREE.Sprite[], stars: any[], handlers: any) {
    removeInteractiveObjectsByType('star')

    sprites.forEach((sprite, index) => {
      const star = stars[index]
      if (star) {
        const object: InteractiveObject = {
          id: `star_${star.uniqueId || index}`,
          sprite,
          type: 'star',
          data: star,
          index,
          handlers
        }
        interactiveObjectById.set(object.id, object)
        interactiveObjectBySprite.set(sprite, object)
      }
    })

    syncInteractiveCollections()

    if (isDev) {
      console.log(`🌟 InteractionSystem: Registered ${sprites.length} star sprites`)
    }
  }

  export function registerFireflySprites(sprites: THREE.Sprite[], fireflies: any[], handlers: any) {
    removeInteractiveObjectsByType('firefly')

    sprites.forEach((sprite, index) => {
      const firefly = fireflies[index]
      if (firefly) {
        const object: InteractiveObject = {
          id: `firefly_${firefly.id || index}`,
          sprite,
          type: 'firefly', 
          data: firefly,
          index,
          handlers
        }
        interactiveObjectById.set(object.id, object)
        interactiveObjectBySprite.set(sprite, object)
      }
    })

    syncInteractiveCollections()
  }

  // --- UNIFIED INTERACTION LOGIC ---

  function handleCanvasClick(event: MouseEvent) {
    if (event.button !== 0) return // Left click only
    
    lastMouseX = event.clientX
    lastMouseY = event.clientY
    
    // Small delay to ensure camera movement is done (from StarMap pattern)
    if (clickSelectionTimeoutId !== null) {
      window.clearTimeout(clickSelectionTimeoutId)
    }

    clickSelectionTimeoutId = window.setTimeout(() => {
      clickSelectionTimeoutId = null
      selectObjectInCrosshair()
    }, 50)
  }

  function handleCanvasMouseMove(event: MouseEvent) {
    lastMouseX = event.clientX
    lastMouseY = event.clientY
    queueHoverCheck()
  }

  function queueHoverCheck() {
    if (hoverCheckFrameId !== null) return

    hoverCheckFrameId = window.requestAnimationFrame(() => {
      hoverCheckFrameId = null
      checkObjectHover()
    })
  }

  export function selectAtScreenPosition(x: number, y: number) {
    lastMouseX = x
    lastMouseY = y
    return selectObjectInCrosshair()
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

  function checkObjectHover() {
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

    const canvas = getCanvasElement()
    if (!canvas) return null
    
    const rect = canvas.getBoundingClientRect()
    pointer.x = ((lastMouseX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((lastMouseY - rect.top) / rect.height) * 2 + 1
    
    // Cast ray from mouse position
    raycaster.setFromCamera(pointer, $camera)
    
    // Check all registered sprites
    const intersects = raycaster.intersectObjects(interactiveSprites)
    
    if (intersects.length > 0) {
      const intersectedSprite = intersects[0].object as THREE.Sprite
      const object = interactiveObjectBySprite.get(intersectedSprite)
      
      if (object) {
        return { object, sprite: intersectedSprite }
      }
    }
    
    return null
  }

  // --- LIFECYCLE ---

  onMount(() => {
    if (isDev) {
      console.log('🎯 InteractionSystem: Initializing centralized interaction system')
    }
    
    // Get canvas and add unified event listeners
    const canvas = getCanvasElement()
    if (canvas) {
      canvas.addEventListener('click', handleCanvasClick)
      canvas.addEventListener('mousemove', handleCanvasMouseMove)
      if (isDev) {
        console.log('🎯 InteractionSystem: Canvas event listeners attached')
      }
    } else {
      console.warn('⚠️ InteractionSystem: No canvas found for event listeners')
    }
  })

  onDestroy(() => {
    if (canvasElement) {
      canvasElement.removeEventListener('click', handleCanvasClick)
      canvasElement.removeEventListener('mousemove', handleCanvasMouseMove)
    }

    if (hoverCheckFrameId !== null) {
      window.cancelAnimationFrame(hoverCheckFrameId)
    }

    if (clickSelectionTimeoutId !== null) {
      window.clearTimeout(clickSelectionTimeoutId)
    }

    if (isDev) {
      console.log('🎯 InteractionSystem: Event listeners cleaned up')
    }
  })

  // --- HELPER FUNCTIONS FOR COMMON TASKS ---

  export function getScreenPosition(worldPosition: THREE.Vector3): { x: number, y: number } {
    if (!$camera) return { x: 0, y: 0 }
    
    projectedScreenPosition.copy(worldPosition)
    projectedScreenPosition.project($camera)
    
    // Get canvas dimensions
    const canvas = getCanvasElement()
    const width = canvas?.clientWidth || window.innerWidth
    const height = canvas?.clientHeight || window.innerHeight
    
    const widthHalf = width / 2
    const heightHalf = height / 2
    
    return {
      x: (projectedScreenPosition.x * widthHalf) + widthHalf,
      y: -(projectedScreenPosition.y * heightHalf) + heightHalf
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
