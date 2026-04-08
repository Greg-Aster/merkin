/**
 * Global Material Utilities for MEGAMEAL
 * 
 * Provides centralized material processing to fix common issues like:
 * - Depth sorting problems with transparent materials
 * - Alpha blending artifacts 
 * - Dark edges/outlines around objects
 * - Inconsistent transparency handling
 */

import * as THREE from 'three'

/**
 * Conservative material fix that only addresses specific dark outline issues
 * without breaking depth sorting for overlapping objects
 */
export function fixMaterialDepthIssues(material: THREE.Material): THREE.Material {
  const mat = material as any
  
  // Only apply minimal fixes that don't break depth sorting
  
  // 1. Fix only truly transparent materials (not just based on detection)
  if (mat.transparent === true || mat.opacity < 0.99) {
    // For genuinely transparent materials, improve alpha testing
    mat.alphaTest = Math.max(mat.alphaTest || 0, 0.1)
    mat.premultipliedAlpha = false // Prevent color bleeding
  }
  
  // 2. Ensure proper depth testing for all materials
  mat.depthTest = true
  
  // 3. Reduce color banding
  mat.dithering = true
  
  // 4. NEVER disable depthWrite - this breaks depth sorting
  // 5. NEVER force transparency - this causes disappearing objects
  
  mat.needsUpdate = true
  return material
}

/**
 * Fix materials in a loaded 3D object/scene
 * Recursively processes all materials in the object hierarchy
 */
export function fixObjectMaterials(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      if (Array.isArray(child.material)) {
        // Handle multi-material objects
        child.material = child.material.map(fixMaterialDepthIssues)
      } else {
        // Handle single material objects
        child.material = fixMaterialDepthIssues(child.material)
      }
    }
  })
}

/**
 * Create a material with proper depth handling from the start
 * Use this when creating new materials instead of THREE.Material constructors
 */
export function createFixedMaterial(
  materialType: typeof THREE.MeshStandardMaterial | typeof THREE.MeshBasicMaterial | typeof THREE.MeshToonMaterial,
  parameters: any = {}
): THREE.Material {
  const material = new materialType(parameters)
  return fixMaterialDepthIssues(material)
}

/**
 * Specific fix for vegetation materials (most common source of issues)
 * Conservative approach that only fixes dark outline issues
 */
export function fixVegetationMaterial(material: THREE.Material): THREE.Material {
  const mat = material as any
  
  // Only apply fixes that address the dark outline issue specifically
  if (mat.map && mat.map.format === THREE.RGBAFormat) {
    // This material has actual transparency - improve alpha testing
    mat.alphaTest = Math.max(mat.alphaTest || 0, 0.1)
    mat.transparent = true
    mat.side = THREE.DoubleSide
  }
  
  // Apply minimal general fixes
  return fixMaterialDepthIssues(material)
}

/**
 * Debug function to log material properties
 */
export function debugMaterial(material: THREE.Material, name?: string): void {
  const mat = material as any
  console.log(`🔍 Material Debug ${name ? `(${name})` : ''}:`, {
    transparent: mat.transparent,
    opacity: mat.opacity,
    alphaTest: mat.alphaTest,
    depthWrite: mat.depthWrite,
    depthTest: mat.depthTest,
    side: mat.side,
    type: material.constructor.name
  })
}

/**
 * Batch fix materials from a GLTF scene
 * Call this after loading any GLTF model
 */
export function fixGLTFMaterials(gltf: any): void {
  if (gltf.scene) {
    fixObjectMaterials(gltf.scene)
    // console.log('🔧 Applied global material fixes to GLTF scene')
  }
  
  // Also fix materials in the materials array if available
  if (gltf.materials) {
    gltf.materials.forEach((material: THREE.Material, index: number) => {
      fixMaterialDepthIssues(material)
    })
  }
}