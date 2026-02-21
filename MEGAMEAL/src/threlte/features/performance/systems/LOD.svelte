<!-- 
  Threlte Level of Detail (LOD) System
  Automatic geometry optimization based on distance and performance
-->
<script lang="ts">
import { T, useTask, useThrelte } from '@threlte/core'
import { onMount, onDestroy, createEventDispatcher } from 'svelte'
import * as THREE from 'three'
import {
  registerLODObject,
  unregisterLODObject,
  adjustLODForPerformance,
  getLODStats,
  setLODEnabled,
  setLODDistances,
  applyLODLevel,
  getLODObjects,
  clearLODObjects,
  lodEnabledStore,
  lodDistancesStore,
  lodQualityStore,
  type LODLevel,
  type LODObject
} from '../utils/lodUtils'

const dispatch = createEventDispatcher()

let isInitialized = false

// Get Threlte context
const { camera, scene } = useThrelte()

// Props
export let enableLOD = true
export let maxDistance = 100
export let updateFrequency = 0.1 // Update every 100ms
export let enableCulling = true

// Types are now imported from lodUtils

let lastUpdateTime = 0

onMount(() => {
  console.log('🎯 Initializing Threlte LOD System...')
  
  if (enableLOD) {
    setupLODSystem()
  }
  
  isInitialized = true
  console.log('✅ Threlte LOD System initialized')
})

/**
 * Setup LOD system
 */
function setupLODSystem() {
  // Listen for LOD registration requests
  if (typeof window !== 'undefined') {
    window.addEventListener('threlte:registerLOD', handleLODRegistration)
    window.addEventListener('threlte:unregisterLOD', handleLODUnregistration)
  }
  
  console.log('🎯 LOD system configured with distances:', [10, 25, 50, 100])
}

/**
 * Handle LOD registration
 */
function handleLODRegistration(event: CustomEvent) {
  const { id, mesh, levels } = event.detail
  handleRegisterLODObject(id, mesh, levels)
}

/**
 * Handle LOD unregistration
 */
function handleLODUnregistration(event: CustomEvent) {
  const { id } = event.detail
  handleUnregisterLODObject(id)
}

// Component-specific functions that need to dispatch events
function handleRegisterLODObject(id: string, mesh: THREE.Mesh, customLevels?: LODLevel[]) {
  registerLODObject(id, mesh, customLevels)
  dispatch('lodObjectRegistered', { id, levels: customLevels?.length || 0 })
}

function handleUnregisterLODObject(id: string) {
  unregisterLODObject(id)
  dispatch('lodObjectUnregistered', { id })
}

/**
 * Update LOD levels based on camera distance
 */
function updateLODLevels() {
  if (!camera || !enableLOD) return
  
  const lodObjects = getLODObjects()
  const cameraPosition = camera.position
  
  lodObjects.forEach((lodObject, id) => {
    const mesh = lodObject.mesh
    const distance = cameraPosition.distanceTo(mesh.position)
    
    // Skip if distance hasn't changed significantly
    if (Math.abs(distance - lodObject.lastDistance) < 1) {
      return
    }
    
    lodObject.lastDistance = distance
    
    // Find appropriate LOD level
    let newLevel = 0
    for (let i = lodObject.levels.length - 1; i >= 0; i--) {
      if (distance >= lodObject.levels[i].distance) {
        newLevel = i
        break
      }
    }
    
    // Apply LOD level if changed
    if (newLevel !== lodObject.currentLevel) {
      applyLODLevel(lodObject, newLevel)
      lodObject.currentLevel = newLevel
      
      dispatch('lodLevelChanged', { 
        id, 
        level: newLevel, 
        distance,
        quality: lodObject.levels[newLevel].quality
      })
    }
    
    // Frustum culling
    if (enableCulling && distance > maxDistance) {
      mesh.visible = false
    } else {
      mesh.visible = lodObject.levels[lodObject.currentLevel].visible
    }
  })
}

// applyLODLevel is now imported from lodUtils

// Performance adjustment function - wrap the imported function with component-specific logic
function handlePerformanceAdjustment(targetFPS: number, currentFPS: number) {
  adjustLODForPerformance(targetFPS, currentFPS)
  dispatch('performanceUpdate', { targetFPS, currentFPS })
}

/**
 * Batch LOD updates for better performance
 */
function batchUpdateLOD() {
  const lodObjects = getLODObjects()
  if (!isInitialized || lodObjects.size === 0) return
  
  // Update in batches to spread load
  const batchSize = Math.min(10, lodObjects.size)
  const objectArray = Array.from(lodObjects.values())
  
  for (let i = 0; i < batchSize; i++) {
    const index = (performance.now() / 100 + i) % objectArray.length
    const lodObject = objectArray[Math.floor(index)]
    
    if (lodObject && camera) {
      const distance = camera.position.distanceTo(lodObject.mesh.position)
      
      // Update LOD level
      let newLevel = 0
      for (let j = lodObject.levels.length - 1; j >= 0; j--) {
        if (distance >= lodObject.levels[j].distance) {
          newLevel = j
          break
        }
      }
      
      if (newLevel !== lodObject.currentLevel) {
        applyLODLevel(lodObject, newLevel)
        lodObject.currentLevel = newLevel
      }
    }
  }
}

// Update LOD system
useTask((delta) => {
  if (!enableLOD || !isInitialized) return
  
  // Throttle updates
  lastUpdateTime += delta
  if (lastUpdateTime >= updateFrequency) {
    batchUpdateLOD()
    lastUpdateTime = 0
  }
})

// getLODStats is now imported from lodUtils

// Component wrapper functions that dispatch events
function handleSetLODEnabled(enabled: boolean) {
  enableLOD = enabled
  setLODEnabled(enabled)
  dispatch('lodEnabledChanged', { enabled })
}

function handleSetLODDistances(distances: number[]) {
  setLODDistances(distances)
  dispatch('lodDistancesChanged', { distances })
}

onDestroy(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('threlte:registerLOD', handleLODRegistration)
    window.removeEventListener('threlte:unregisterLOD', handleLODUnregistration)
  }
  
  clearLODObjects()
  console.log('🧹 Threlte LOD System disposed')
})

// Export component functions that include event dispatching
export { registerLODObject, unregisterLODObject, adjustLODForPerformance, getLODStats, setLODEnabled, setLODDistances }
export const lodUtils = { registerLODObject, unregisterLODObject, adjustLODForPerformance, getLODStats, setLODEnabled, setLODDistances }
</script>

<!-- No visual output - this is a system component -->

{#if isInitialized}
  <slot />
{/if}