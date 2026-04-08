<!-- 
  Threlte Interaction System Component
  Replaces InteractionSystem.ts with reactive interaction handling
-->
<script lang="ts">
import { useTask, useThrelte } from '@threlte/core'
import { onMount, onDestroy, createEventDispatcher } from 'svelte'
import { writable } from 'svelte/store'
import * as THREE from 'three'

const dispatch = createEventDispatcher()

// Reactive stores for interaction state
export const hoveredObjectStore = writable(null)
export const selectedObjectStore = writable(null)
export const interactableObjectsStore = writable([])

let isInitialized = false

// Get Threlte context
const { camera, renderer } = useThrelte()

// Export interaction state
export let hoveredObject = null
export let selectedObject = null
export let interactableObjects = []

// Props
export let container: HTMLElement | null = null
export let enableRaycasting = true
export let maxInteractionDistance = 10

onMount(async () => {
  console.log('🖱️ Initializing Threlte Interaction System...')
  
  // Wait for camera and container to be available
  if (!camera || !container) {
    console.warn('Camera or container not available for interaction system')
    return
  }
  
  try {
    // Set up interaction tracking
    setupInteractionTracking()
    
    isInitialized = true
    console.log('✅ Threlte Interaction System initialized')
  } catch (error) {
    console.error('❌ Failed to initialize Interaction System:', error)
  }
})

/**
 * Set up interaction tracking
 */
function setupInteractionTracking() {
  if (!container) return
  
  // Mouse events
  container.addEventListener('mousemove', handleMouseMove)
  container.addEventListener('click', handleClick)
  container.addEventListener('contextmenu', handleRightClick)
  
  // Touch events for mobile
  container.addEventListener('touchstart', handleTouchStart)
  container.addEventListener('touchend', handleTouchEnd)
}

/**
 * Handle mouse move for raycasting
 */
function handleMouseMove(event: MouseEvent) {
  if (!enableRaycasting) return
  
  const rect = container!.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  
  // Perform raycast
  const intersections = performRaycast(x, y)
  
  // Update hovered object
  const newHovered = intersections.length > 0 ? intersections[0].object : null
  if (newHovered !== hoveredObject) {
    if (hoveredObject) {
      dispatch('objectHoverEnd', { object: hoveredObject })
    }
    
    hoveredObject = newHovered
    hoveredObjectStore.set(hoveredObject)
    
    if (hoveredObject) {
      dispatch('objectHoverStart', { object: hoveredObject, intersection: intersections[0] })
    }
  }
}

/**
 * Handle click for selection/interaction
 */
function handleClick(event: MouseEvent) {
  if (!enableRaycasting) return
  
  const rect = container!.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  
  // Perform raycast
  const intersections = performRaycast(x, y)
  
  if (intersections.length > 0) {
    const clickedObject = intersections[0].object
    const intersection = intersections[0]
    
    // Update selected object
    selectedObject = clickedObject
    selectedObjectStore.set(selectedObject)
    
    // Dispatch interaction events
    dispatch('objectClick', { 
      object: clickedObject, 
      intersection,
      button: event.button,
      position: intersection.point
    })
    
    // Check if object is interactable
    if (isObjectInteractable(clickedObject)) {
      dispatch('interaction.performed', {
        interactionType: 'click',
        objectId: clickedObject.userData?.id || clickedObject.uuid,
        position: intersection.point,
        object: clickedObject
      })
    }
  } else {
    // Clicked on empty space - deselect
    selectedObject = null
    selectedObjectStore.set(null)
    dispatch('objectDeselect')
  }
}

/**
 * Handle right click for context actions
 */
function handleRightClick(event: MouseEvent) {
  event.preventDefault()
  
  if (!enableRaycasting) return
  
  const rect = container!.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  
  const intersections = performRaycast(x, y)
  
  if (intersections.length > 0) {
    const clickedObject = intersections[0].object
    const intersection = intersections[0]
    
    dispatch('objectRightClick', { 
      object: clickedObject, 
      intersection,
      position: intersection.point
    })
  }
}

/**
 * Handle touch start (mobile)
 */
function handleTouchStart(event: TouchEvent) {
  if (event.touches.length === 1) {
    const touch = event.touches[0]
    const rect = container!.getBoundingClientRect()
    const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1
    
    const intersections = performRaycast(x, y)
    
    if (intersections.length > 0) {
      dispatch('objectTouch', { 
        object: intersections[0].object, 
        intersection: intersections[0],
        touch: touch
      })
    }
  }
}

/**
 * Handle touch end (mobile)
 */
function handleTouchEnd(event: TouchEvent) {
  // Treat touch end as click for interaction
  if (event.changedTouches.length === 1) {
    const touch = event.changedTouches[0]
    const rect = container!.getBoundingClientRect()
    const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1
    
    const intersections = performRaycast(x, y)
    
    if (intersections.length > 0) {
      const touchedObject = intersections[0].object
      
      selectedObject = touchedObject
      selectedObjectStore.set(selectedObject)
      
      if (isObjectInteractable(touchedObject)) {
        dispatch('interaction.performed', {
          interactionType: 'touch',
          objectId: touchedObject.userData?.id || touchedObject.uuid,
          position: intersections[0].point,
          object: touchedObject
        })
      }
    }
  }
}

/**
 * Perform raycast from screen coordinates
 */
function performRaycast(x: number, y: number): THREE.Intersection[] {
  if (!camera) return []
  
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2(x, y)
  
  raycaster.setFromCamera(pointer, camera)
  
  // Get all objects in the scene for raycasting
  const scene = camera.parent
  if (!scene) return []
  
  // Filter for interactable objects only
  const objects = []
  scene.traverse((child) => {
    if (child.userData?.interactable || isObjectInteractable(child)) {
      objects.push(child)
    }
  })
  
  const intersections = raycaster.intersectObjects(objects, false)
  
  // Filter by distance
  return intersections.filter(intersection => 
    intersection.distance <= maxInteractionDistance
  )
}

/**
 * Check if object is interactable
 */
function isObjectInteractable(object: THREE.Object3D): boolean {
  return !!(
    object.userData?.interactable ||
    object.userData?.id ||
    object.name.startsWith('interactable_') ||
    object.userData?.type === 'star' ||
    object.userData?.clickable
  )
}

/**
 * Handle interaction events
 */
function handleInteractionEvent(event: string, data: any) {
  switch (event) {
    case 'interaction.performed':
      // Update interaction state
      dispatch('interactionPerformed', data)
      break
    case 'object.hovered':
      hoveredObject = data.object
      hoveredObjectStore.set(hoveredObject)
      break
    case 'object.unhovered':
      hoveredObject = null
      hoveredObjectStore.set(null)
      break
    default:
      // Forward other events
      dispatch(event, data)
  }
}

// Update interaction system each frame
useTask((delta) => {
  if (isInitialized) {
    // Interaction system is event-driven, no frame updates needed
  }
})

/**
 * Add interactable object
 */
export function addInteractable(object: THREE.Object3D, config?: any) {
  object.userData = { ...object.userData, interactable: true, ...config }
  
  if (!interactableObjects.includes(object)) {
    interactableObjects.push(object)
    interactableObjectsStore.set([...interactableObjects])
  }
}

/**
 * Remove interactable object
 */
export function removeInteractable(object: THREE.Object3D) {
  const index = interactableObjects.indexOf(object)
  if (index > -1) {
    interactableObjects.splice(index, 1)
    interactableObjectsStore.set([...interactableObjects])
  }
  
  if (object.userData) {
    delete object.userData.interactable
  }
}

onDestroy(() => {
  if (container) {
    container.removeEventListener('mousemove', handleMouseMove)
    container.removeEventListener('click', handleClick)
    container.removeEventListener('contextmenu', handleRightClick)
    container.removeEventListener('touchstart', handleTouchStart)
    container.removeEventListener('touchend', handleTouchEnd)
  }
  
  console.log('🧹 Threlte Interaction System disposed')
})

</script>

<!-- No visual output - this is a system component -->

{#if isInitialized}
  <slot />
{/if}