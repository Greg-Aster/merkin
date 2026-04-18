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
import type { EditorMaterialData } from '../editor/editorTypes'

type MaterialSet = THREE.Material | THREE.Material[]

export interface ObjectMaterialOverrideState {
  baseMaterials: Map<THREE.Mesh, MaterialSet>
  appliedMaterials: Map<THREE.Mesh, MaterialSet>
}

export function createObjectMaterialOverrideState(): ObjectMaterialOverrideState {
  return {
    baseMaterials: new Map(),
    appliedMaterials: new Map(),
  }
}

function cloneMaterialSet(materialSet: MaterialSet): MaterialSet {
  return Array.isArray(materialSet)
    ? materialSet.map((material) => material.clone())
    : materialSet.clone()
}

function disposeMaterialSet(materialSet: MaterialSet) {
  if (Array.isArray(materialSet)) {
    materialSet.forEach((material) => material.dispose())
    return
  }

  materialSet.dispose()
}

function isEditorMaterialDataEmpty(override: EditorMaterialData | null | undefined) {
  if (!override) return true
  return Object.values(override).every((value) => value === undefined)
}

function applyEditorMaterialOverride(material: THREE.Material, override: EditorMaterialData) {
  const target = material as THREE.Material & {
    color?: THREE.Color
    emissive?: THREE.Color
    emissiveIntensity?: number
    metalness?: number
    roughness?: number
    opacity?: number
    transparent?: boolean
    wireframe?: boolean
    side?: THREE.Side
    flatShading?: boolean
    envMapIntensity?: number
    transmission?: number
    ior?: number
    clearcoat?: number
    clearcoatRoughness?: number
    thickness?: number
    reflectivity?: number
  }

  if (override.color !== undefined && target.color) {
    target.color.set(override.color)
  }
  if (override.emissive !== undefined && target.emissive) {
    target.emissive.set(override.emissive)
  }
  if (override.emissiveIntensity !== undefined && 'emissiveIntensity' in target) {
    target.emissiveIntensity = override.emissiveIntensity
  }
  if (override.metalness !== undefined && 'metalness' in target) {
    target.metalness = override.metalness
  }
  if (override.roughness !== undefined && 'roughness' in target) {
    target.roughness = override.roughness
  }
  if (override.opacity !== undefined && 'opacity' in target) {
    target.opacity = override.opacity
  }
  if (override.transparent !== undefined && 'transparent' in target) {
    target.transparent = override.transparent
  } else if (override.opacity !== undefined && 'transparent' in target) {
    target.transparent = override.opacity < 0.999
  }
  if (override.wireframe !== undefined && 'wireframe' in target) {
    target.wireframe = override.wireframe
  }
  if (override.doubleSided !== undefined && 'side' in target) {
    target.side = override.doubleSided ? THREE.DoubleSide : THREE.FrontSide
  }
  if (override.flatShading !== undefined && 'flatShading' in target) {
    target.flatShading = override.flatShading
  }
  if (override.envMapIntensity !== undefined && 'envMapIntensity' in target) {
    target.envMapIntensity = override.envMapIntensity
  }
  if (override.transmission !== undefined && 'transmission' in target) {
    target.transmission = override.transmission
  }
  if (override.ior !== undefined && 'ior' in target) {
    target.ior = override.ior
  }
  if (override.clearcoat !== undefined && 'clearcoat' in target) {
    target.clearcoat = override.clearcoat
  }
  if (override.clearcoatRoughness !== undefined && 'clearcoatRoughness' in target) {
    target.clearcoatRoughness = override.clearcoatRoughness
  }
  if (override.thickness !== undefined && 'thickness' in target) {
    target.thickness = override.thickness
  }
  if (override.reflectivity !== undefined && 'reflectivity' in target) {
    target.reflectivity = override.reflectivity
  }

  target.needsUpdate = true
  return fixMaterialDepthIssues(target)
}

export function syncObjectMaterialOverride(
  object: THREE.Object3D,
  override: EditorMaterialData | null | undefined,
  state: ObjectMaterialOverrideState
) {
  const activeMeshes = new Set<THREE.Mesh>()
  const hasOverride = !isEditorMaterialDataEmpty(override)

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return
    activeMeshes.add(child)

    if (!state.baseMaterials.has(child)) {
      state.baseMaterials.set(child, child.material)
    }

    const previousApplied = state.appliedMaterials.get(child)
    if (previousApplied) {
      disposeMaterialSet(previousApplied)
      state.appliedMaterials.delete(child)
    }

    const baseMaterials = state.baseMaterials.get(child)
    if (!baseMaterials) return

    if (!hasOverride) {
      child.material = baseMaterials
      return
    }

    const nextMaterials = cloneMaterialSet(baseMaterials)
    if (Array.isArray(nextMaterials)) {
      nextMaterials.forEach((material) => applyEditorMaterialOverride(material, override!))
    } else {
      applyEditorMaterialOverride(nextMaterials, override!)
    }

    child.material = nextMaterials
    state.appliedMaterials.set(child, nextMaterials)
  })

  for (const mesh of state.baseMaterials.keys()) {
    if (activeMeshes.has(mesh)) continue

    const previousApplied = state.appliedMaterials.get(mesh)
    if (previousApplied) {
      disposeMaterialSet(previousApplied)
      state.appliedMaterials.delete(mesh)
    }
    state.baseMaterials.delete(mesh)
  }
}

export function disposeObjectMaterialOverrideState(state: ObjectMaterialOverrideState) {
  state.appliedMaterials.forEach((materialSet) => {
    disposeMaterialSet(materialSet)
  })
  state.appliedMaterials.clear()
  state.baseMaterials.clear()
}

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
