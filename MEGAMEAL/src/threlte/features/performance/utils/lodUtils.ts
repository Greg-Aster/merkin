/**
 * LOD (Level of Detail) Utilities
 * Core LOD functionality extracted from LOD.svelte
 */

import { writable } from 'svelte/store'
import * as THREE from 'three'

// LOD configuration stores
export const lodEnabledStore = writable<boolean>(true)
export const lodDistancesStore = writable<number[]>([10, 25, 50, 100])
export const lodQualityStore = writable<'low' | 'medium' | 'high'>('medium')

// Types
export interface LODLevel {
  distance: number
  geometry?: THREE.BufferGeometry
  material?: THREE.Material
  visible: boolean
  quality: 'ultra_low' | 'low' | 'medium' | 'high' | 'ultra'
}

export interface LODObject {
  id: string
  mesh: THREE.Mesh
  levels: LODLevel[]
  currentLevel: number
  lastDistance: number
  originalGeometry: THREE.BufferGeometry
  originalMaterial: THREE.Material
}

// Global LOD object store
let lodObjects: Map<string, LODObject> = new Map()

/**
 * Register object for LOD management
 */
export function registerLODObject(id: string, mesh: THREE.Mesh, customLevels?: LODLevel[]) {
  if (!mesh || !mesh.geometry) {
    console.warn(`Cannot register LOD object ${id}: invalid mesh`)
    return
  }
  
  // Generate default LOD levels if not provided
  const levels = customLevels || generateDefaultLODLevels(mesh)
  
  const lodObject: LODObject = {
    id,
    mesh,
    levels,
    currentLevel: 0,
    lastDistance: 0,
    originalGeometry: mesh.geometry.clone(),
    originalMaterial: Array.isArray(mesh.material) ? mesh.material[0].clone() : mesh.material.clone()
  }
  
  lodObjects.set(id, lodObject)
  
  console.log(`🎯 Registered LOD object: ${id} with ${levels.length} levels`)
}

/**
 * Unregister LOD object
 */
export function unregisterLODObject(id: string) {
  const lodObject = lodObjects.get(id)
  if (lodObject) {
    // Restore original geometry/material
    lodObject.mesh.geometry = lodObject.originalGeometry
    lodObject.mesh.material = lodObject.originalMaterial
    
    lodObjects.delete(id)
    console.log(`🎯 Unregistered LOD object: ${id}`)
  }
}

/**
 * Generate default LOD levels for a mesh
 */
function generateDefaultLODLevels(mesh: THREE.Mesh): LODLevel[] {
  const distances = [10, 25, 50, 100]
  const levels: LODLevel[] = []
  
  // Original quality (closest)
  levels.push({
    distance: 0,
    geometry: mesh.geometry,
    material: Array.isArray(mesh.material) ? mesh.material[0] : mesh.material,
    visible: true,
    quality: 'ultra'
  })
  
  // Generate simplified versions
  for (let i = 0; i < distances.length; i++) {
    const distance = distances[i]
    const quality = ['high', 'medium', 'low', 'ultra_low'][i] as any
    
    levels.push({
      distance,
      geometry: simplifyGeometry(mesh.geometry, 0.8 - i * 0.15), // Reduce detail progressively
      material: Array.isArray(mesh.material) ? mesh.material[0] : mesh.material, // Could also simplify materials
      visible: i < 3, // Hide at furthest distances
      quality
    })
  }
  
  return levels
}

/**
 * Simplify geometry (basic implementation)
 */
function simplifyGeometry(geometry: THREE.BufferGeometry, factor: number): THREE.BufferGeometry {
  // This is a basic implementation - in production you'd want a proper mesh simplification algorithm
  const simplified = geometry.clone()
  
  // Simple vertex reduction by skipping vertices
  if (simplified.attributes.position) {
    const positions = simplified.attributes.position.array
    const newPositions = []
    
    const skip = Math.max(1, Math.floor(1 / factor))
    for (let i = 0; i < positions.length; i += skip * 3) {
      newPositions.push(positions[i], positions[i + 1], positions[i + 2])
    }
    
    simplified.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3))
  }
  
  return simplified
}

/**
 * Apply LOD level to mesh
 */
export function applyLODLevel(lodObject: LODObject, level: number) {
  const lodLevel = lodObject.levels[level]
  const mesh = lodObject.mesh
  
  // Update geometry
  if (lodLevel.geometry && lodLevel.geometry !== mesh.geometry) {
    mesh.geometry = lodLevel.geometry
  }
  
  // Update material
  if (lodLevel.material && lodLevel.material !== mesh.material) {
    mesh.material = lodLevel.material
  }
  
  // Update visibility
  mesh.visible = lodLevel.visible
}

/**
 * Performance-based LOD adjustment
 */
export function adjustLODForPerformance(targetFPS: number, currentFPS: number) {
  if (currentFPS < targetFPS * 0.8) {
    // Performance is poor, increase LOD aggressiveness
    const newDistances = [5, 15, 30, 60] // Closer LOD switching
    lodDistancesStore.set(newDistances)
    
    // Reduce quality
    lodQualityStore.set('low')
    
    console.log('🎯 LOD adjusted for poor performance:', newDistances)
  } else if (currentFPS > targetFPS * 1.1) {
    // Performance is good, allow higher quality
    const newDistances = [15, 35, 70, 120] // Further LOD switching
    lodDistancesStore.set(newDistances)
    
    // Increase quality
    lodQualityStore.set('high')
    
    console.log('🎯 LOD adjusted for good performance:', newDistances)
  }
}

/**
 * Get LOD statistics
 */
export function getLODStats() {
  const stats = {
    registeredObjects: lodObjects.size,
    levels: {} as Record<number, number>,
    averageDistance: 0,
    culledObjects: 0
  }
  
  let totalDistance = 0
  lodObjects.forEach((lodObject) => {
    const level = lodObject.currentLevel
    stats.levels[level] = (stats.levels[level] || 0) + 1
    totalDistance += lodObject.lastDistance
    
    if (!lodObject.mesh.visible) {
      stats.culledObjects++
    }
  })
  
  stats.averageDistance = totalDistance / lodObjects.size || 0
  
  return stats
}

/**
 * Enable/disable LOD system
 */
export function setLODEnabled(enabled: boolean) {
  lodEnabledStore.set(enabled)
  
  if (!enabled) {
    // Restore all objects to highest quality
    lodObjects.forEach((lodObject) => {
      applyLODLevel(lodObject, 0)
    })
  }
}

/**
 * Update LOD distances
 */
export function setLODDistances(distances: number[]) {
  lodDistancesStore.set(distances)
  
  // Update all LOD objects with new distances
  lodObjects.forEach((lodObject) => {
    for (let i = 0; i < Math.min(distances.length, lodObject.levels.length); i++) {
      lodObject.levels[i].distance = distances[i]
    }
  })
}

/**
 * Get all LOD objects (for use by LOD.svelte)
 */
export function getLODObjects() {
  return lodObjects
}

/**
 * Clear all LOD objects
 */
export function clearLODObjects() {
  lodObjects.clear()
}

// Export lodUtils object for backward compatibility
export const lodUtils = {
  registerLODObject,
  unregisterLODObject,
  adjustLODForPerformance,
  getLODStats,
  setLODEnabled,
  setLODDistances,
  applyLODLevel,
  getLODObjects,
  clearLODObjects
}