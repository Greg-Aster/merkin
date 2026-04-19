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
      onLightBurst?: (data: any, burst: LightBurstHit) => void
    }
  }

  interface LightBurstHit {
    origin: [number, number, number]
    strength: number
    radius: number
    progress: number
    distance: number
  }

  interface ActiveLightBurst {
    id: number
    origin: THREE.Vector3
    radius: number
    previousRadius: number
    maxRadius: number
    speed: number
    strength: number
    hitObjectIds: Set<string>
  }

  let interactiveObjects: InteractiveObject[] = []
  let interactiveSprites: THREE.Sprite[] = []
  const interactiveObjectById = new Map<string, InteractiveObject>()
  const interactiveObjectBySprite = new Map<THREE.Sprite, InteractiveObject>()
  let hoveredObjectId: string | null = null
  let canvasElement: HTMLCanvasElement | null = null
  let hoverCheckFrameId: number | null = null
  let clickSelectionTimeoutId: number | null = null
  let activeLightBursts: ActiveLightBurst[] = []
  let lightBurstAnimationFrameId: number | null = null
  let lastLightBurstFrameTime = 0
  let lightBurstIdCounter = 0

  const pointer = new THREE.Vector2()
  const raycaster = new THREE.Raycaster()
  const projectedScreenPosition = new THREE.Vector3()
  const burstTempPosition = new THREE.Vector3()

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

  export function triggerLightBurst(detail: {
    origin: [number, number, number]
    maxRadius?: number
    radius?: number
    speed?: number
    strength?: number
  }) {
    const maxRadius = Math.max(0.1, detail.maxRadius ?? detail.radius ?? 0)
    const speed = Math.max(0.1, detail.speed ?? Math.max(12, maxRadius * 2.4))
    const strength = Math.max(0, detail.strength ?? 0)

    if (maxRadius <= 0 || strength <= 0) return 0

    activeLightBursts = [
      ...activeLightBursts,
      {
        id: ++lightBurstIdCounter,
        origin: new THREE.Vector3(...detail.origin),
        radius: 0,
        previousRadius: 0,
        maxRadius,
        speed,
        strength,
        hitObjectIds: new Set<string>(),
      }
    ]

    if (lightBurstAnimationFrameId === null) {
      lastLightBurstFrameTime = performance.now()
      lightBurstAnimationFrameId = window.requestAnimationFrame(updateLightBursts)
    }

    return activeLightBursts.length
  }

  function updateLightBursts(timestamp: number) {
    const deltaSeconds = Math.min(0.05, Math.max(0.001, (timestamp - lastLightBurstFrameTime) / 1000))
    lastLightBurstFrameTime = timestamp

    activeLightBursts = activeLightBursts.filter((burst) => {
      burst.previousRadius = burst.radius
      burst.radius = Math.min(burst.maxRadius, burst.radius + burst.speed * deltaSeconds)

      for (const object of interactiveObjects) {
        if (!object.handlers.onLightBurst || burst.hitObjectIds.has(object.id)) continue

        object.sprite.getWorldPosition(burstTempPosition)
        const distance = burstTempPosition.distanceTo(burst.origin)
        if (distance > burst.radius || distance <= burst.previousRadius) continue

        burst.hitObjectIds.add(object.id)
        object.handlers.onLightBurst(object.data, {
          origin: [burst.origin.x, burst.origin.y, burst.origin.z],
          strength: burst.strength,
          radius: burst.radius,
          progress: burst.maxRadius > 0 ? burst.radius / burst.maxRadius : 1,
          distance,
        })

        dispatch('lightBurstHit', {
          type: object.type,
          data: object.data,
          index: object.index,
          distance,
          strength: burst.strength,
        })
      }

      return burst.radius < burst.maxRadius
    })

    if (activeLightBursts.length > 0) {
      lightBurstAnimationFrameId = window.requestAnimationFrame(updateLightBursts)
      return
    }

    lightBurstAnimationFrameId = null
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

    const attachCanvasListeners = () => {
      const canvas = getCanvasElement()
      if (!canvas) {
        return false
      }

      canvas.addEventListener('click', handleCanvasClick)
      canvas.addEventListener('mousemove', handleCanvasMouseMove)
      if (isDev) {
        console.log('🎯 InteractionSystem: Canvas event listeners attached')
      }
      return true
    }

    if (!attachCanvasListeners()) {
      requestAnimationFrame(() => {
        attachCanvasListeners()
      })
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

    if (lightBurstAnimationFrameId !== null) {
      window.cancelAnimationFrame(lightBurstAnimationFrameId)
      lightBurstAnimationFrameId = null
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
    triggerLightBurst,
    getScreenPosition
  }
</script>

<!-- No visual elements - this is a pure system component -->
