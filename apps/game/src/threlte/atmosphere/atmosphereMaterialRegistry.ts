import * as THREE from 'three'
import {
  ATMOSPHERE_SHADER_CACHE_KEY,
  type AtmosphereShaderParameters,
  injectAtmosphereShaderChunks,
  setAtmosphereShaderUniforms,
} from './atmosphereShaderChunks'
import type { RuntimeAtmosphereDefinition } from './runtimeAtmosphereTypes'

export type SceneAtmosphereDefinition = {
  enabled: boolean
  distanceFog: {
    enabled: boolean
    color: THREE.Color
    density: number
  }
  heightFog: {
    enabled: boolean
    color: THREE.Color
    density: number
    floor: number
    ceiling: number
  }
  source: {
    levelId?: string
    refreshKey?: string
  }
}

export type SceneAtmosphereDefinitionInput = {
  color: string
  density: number
  heightFogEnabled: boolean
  heightFogColor: string
  heightFogDensity: number
  heightFogFloor: number
  heightFogCeiling: number
  levelId?: string
  refreshKey?: string
}

export type SceneAtmosphereMaterialMetadata = {
  source?: string
  renderPath?: string
  objectName?: string
  levelId?: string | null
  reason?: string
}

export type SceneAtmosphereMaterialDiagnostics = {
  registeredMaterialCount: number
  distanceParticipantCount: number
  heightParticipantCount: number
  fogCapableMaterialCount: number
  heightFogCapableMaterialCount: number
  distanceOnlyMaterialCount: number
  bypassedMaterialCount: number
  renderPathCounts: Record<string, number>
  bypassedMaterials: Array<{
    uuid: string
    type: string
    name: string
    renderPath: string
    objectName: string
    reason: string
  }>
}

type FogCapableMaterial = THREE.Material & {
  fog?: boolean
  userData: THREE.Material['userData'] & {
    merkinAtmospherePatched?: boolean
    merkinAtmosphereOriginalOnBeforeCompile?: THREE.Material['onBeforeCompile']
    merkinAtmosphereOriginalCustomProgramCacheKey?: THREE.Material['customProgramCacheKey']
    merkinAtmosphereShaderBypassReason?: string
  }
}

type RegistryEntry = {
  material: THREE.Material
  source: string
  renderPath: string
  objectName: string
  levelId: string | null
  reason: string
  explicit: boolean
  lastScanGeneration: number
  fogCapable: boolean
  heightFogCapable: boolean
  distanceParticipant: boolean
  heightParticipant: boolean
  bypassReason: string | null
}

const DEFAULT_DISTANCE_FOG_COLOR = '#7b8797'
const DEFAULT_HEIGHT_FOG_COLOR = '#7b8797'

let currentAtmosphere = createDisabledSceneAtmosphereDefinition()
let sceneScanGeneration = 0
let atmosphereShaders = new WeakMap<
  THREE.Material,
  AtmosphereShaderParameters
>()
const materialRegistry = new Map<THREE.Material, RegistryEntry>()

function finiteNumberOrDefault(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback
}

function colorOrDefault(value: string, fallback: string) {
  try {
    return new THREE.Color(value)
  } catch {
    return new THREE.Color(fallback)
  }
}

function cloneSceneAtmosphereDefinition(
  atmosphere: SceneAtmosphereDefinition,
): SceneAtmosphereDefinition {
  return {
    enabled: atmosphere.enabled,
    distanceFog: {
      enabled: atmosphere.distanceFog.enabled,
      color: atmosphere.distanceFog.color.clone(),
      density: atmosphere.distanceFog.density,
    },
    heightFog: {
      enabled: atmosphere.heightFog.enabled,
      color: atmosphere.heightFog.color.clone(),
      density: atmosphere.heightFog.density,
      floor: atmosphere.heightFog.floor,
      ceiling: atmosphere.heightFog.ceiling,
    },
    source: {
      levelId: atmosphere.source.levelId,
      refreshKey: atmosphere.source.refreshKey,
    },
  }
}

export function createDisabledSceneAtmosphereDefinition(): SceneAtmosphereDefinition {
  return {
    enabled: false,
    distanceFog: {
      enabled: false,
      color: new THREE.Color(DEFAULT_DISTANCE_FOG_COLOR),
      density: 0,
    },
    heightFog: {
      enabled: false,
      color: new THREE.Color(DEFAULT_HEIGHT_FOG_COLOR),
      density: 0,
      floor: 0,
      ceiling: 0.001,
    },
    source: {},
  }
}

export function resolveSceneAtmosphereDefinition(
  input: SceneAtmosphereDefinitionInput,
): SceneAtmosphereDefinition {
  const distanceDensity = Math.max(0, finiteNumberOrDefault(input.density, 0))
  const heightFogFloor = finiteNumberOrDefault(input.heightFogFloor, 0)
  const heightFogCeiling = Math.max(
    heightFogFloor + 0.001,
    finiteNumberOrDefault(input.heightFogCeiling, heightFogFloor + 0.001),
  )
  const heightFogDensity = Math.max(
    0,
    finiteNumberOrDefault(input.heightFogDensity, 0),
  )
  const distanceFogEnabled = distanceDensity > 0
  const heightFogEnabled =
    input.heightFogEnabled &&
    heightFogDensity > 0 &&
    heightFogCeiling > heightFogFloor

  return {
    enabled: distanceFogEnabled || heightFogEnabled,
    distanceFog: {
      enabled: distanceFogEnabled,
      color: colorOrDefault(input.color, DEFAULT_DISTANCE_FOG_COLOR),
      density: distanceDensity,
    },
    heightFog: {
      enabled: heightFogEnabled,
      color: colorOrDefault(input.heightFogColor, DEFAULT_HEIGHT_FOG_COLOR),
      density: heightFogDensity,
      floor: heightFogFloor,
      ceiling: heightFogCeiling,
    },
    source: {
      levelId: input.levelId,
      refreshKey: input.refreshKey,
    },
  }
}

export function runtimeAtmosphereToSceneAtmosphereDefinition(
  atmosphere: RuntimeAtmosphereDefinition,
  options: {
    levelId?: string
    refreshKey?: string
  } = {},
): SceneAtmosphereDefinition {
  return resolveSceneAtmosphereDefinition({
    color: atmosphere.distanceFog.color,
    density:
      atmosphere.enabled && atmosphere.distanceFog.enabled
        ? atmosphere.distanceFog.density
        : 0,
    heightFogEnabled: atmosphere.enabled && atmosphere.heightFog.enabled,
    heightFogColor: atmosphere.heightFog.color,
    heightFogDensity: atmosphere.heightFog.density,
    heightFogFloor: atmosphere.heightFog.floor,
    heightFogCeiling: atmosphere.heightFog.ceiling,
    levelId: options.levelId ?? atmosphere.source.levelId,
    refreshKey: options.refreshKey ?? atmosphere.source.refreshKey,
  })
}

export function getCurrentSceneAtmosphereDefinition() {
  return cloneSceneAtmosphereDefinition(currentAtmosphere)
}

export function setSceneAtmosphereDefinition(
  atmosphere: SceneAtmosphereDefinition,
) {
  currentAtmosphere = cloneSceneAtmosphereDefinition(atmosphere)
  for (const entry of materialRegistry.values()) {
    applyAtmosphereToRegisteredMaterial(entry)
  }
}

function isHeightFogPatchableMaterial(material: THREE.Material) {
  return (
    material instanceof THREE.MeshBasicMaterial ||
    material instanceof THREE.MeshLambertMaterial ||
    material instanceof THREE.MeshMatcapMaterial ||
    material instanceof THREE.MeshPhongMaterial ||
    material instanceof THREE.MeshPhysicalMaterial ||
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshToonMaterial
  )
}

function updateAtmosphereShader(material: THREE.Material) {
  const shader = atmosphereShaders.get(material)
  if (!shader) return

  setAtmosphereShaderUniforms(shader, currentAtmosphere)
}

function installAtmosphereShaderPatch(material: FogCapableMaterial) {
  if (material.userData.merkinAtmospherePatched) {
    updateAtmosphereShader(material)
    return
  }

  const originalOnBeforeCompile = material.onBeforeCompile
  const originalCustomProgramCacheKey = material.customProgramCacheKey

  material.userData.merkinAtmospherePatched = true
  material.userData.merkinAtmosphereOriginalOnBeforeCompile =
    originalOnBeforeCompile
  material.userData.merkinAtmosphereOriginalCustomProgramCacheKey =
    originalCustomProgramCacheKey

  material.onBeforeCompile = (shader, renderer) => {
    originalOnBeforeCompile.call(material, shader, renderer)

    if (!injectAtmosphereShaderChunks(shader)) {
      material.userData.merkinAtmosphereShaderBypassReason =
        'missing-fog-shader-chunks'
      return
    }

    material.userData.merkinAtmosphereShaderBypassReason = undefined
    atmosphereShaders.set(material, shader)
    setAtmosphereShaderUniforms(shader, currentAtmosphere)
  }

  material.customProgramCacheKey = () =>
    `${originalCustomProgramCacheKey.call(material)}|${ATMOSPHERE_SHADER_CACHE_KEY}`
  material.needsUpdate = true
}

function refreshEntryCapability(entry: RegistryEntry) {
  const material = entry.material as FogCapableMaterial
  const explicitBypass = Boolean(material.userData.atmosphereBypass)
  const fogCapable = 'fog' in material
  const heightFogCapable = fogCapable && isHeightFogPatchableMaterial(material)
  const shaderBypass = material.userData.merkinAtmosphereShaderBypassReason

  entry.fogCapable = fogCapable
  entry.heightFogCapable = heightFogCapable
  entry.distanceParticipant = fogCapable && !explicitBypass
  entry.heightParticipant = heightFogCapable && !explicitBypass

  if (explicitBypass) {
    entry.bypassReason = 'explicit-atmosphere-bypass'
  } else if (!fogCapable) {
    entry.bypassReason = 'material-has-no-fog-property'
  } else if (!heightFogCapable) {
    entry.bypassReason =
      shaderBypass ?? 'height-fog-not-supported-for-material-type'
  } else {
    entry.bypassReason = null
  }
}

function applyAtmosphereToRegisteredMaterial(entry: RegistryEntry) {
  refreshEntryCapability(entry)

  if (!entry.distanceParticipant) return

  const material = entry.material as FogCapableMaterial
  if (material.fog !== true) {
    material.fog = true
    material.needsUpdate = true
  }

  if (entry.heightParticipant) {
    installAtmosphereShaderPatch(material)
  }
  updateAtmosphereShader(material)
  refreshEntryCapability(entry)
}

function createRegistryEntry(
  material: THREE.Material,
  metadata: SceneAtmosphereMaterialMetadata,
  explicit: boolean,
  scanGeneration = 0,
): RegistryEntry {
  return {
    material,
    source: metadata.source ?? 'scene',
    renderPath: metadata.renderPath ?? 'unknown',
    objectName: metadata.objectName ?? '',
    levelId: metadata.levelId ?? null,
    reason: metadata.reason ?? '',
    explicit,
    lastScanGeneration: scanGeneration,
    fogCapable: false,
    heightFogCapable: false,
    distanceParticipant: false,
    heightParticipant: false,
    bypassReason: null,
  }
}

function updateRegistryEntry(
  entry: RegistryEntry,
  metadata: SceneAtmosphereMaterialMetadata,
  explicit: boolean,
  scanGeneration = 0,
) {
  entry.source = metadata.source ?? entry.source
  entry.renderPath = metadata.renderPath ?? entry.renderPath
  entry.objectName = metadata.objectName ?? entry.objectName
  entry.levelId = metadata.levelId ?? entry.levelId
  entry.reason = metadata.reason ?? entry.reason
  entry.explicit = entry.explicit || explicit
  if (scanGeneration > 0) {
    entry.lastScanGeneration = scanGeneration
  }
}

export function registerSceneAtmosphereMaterial(
  material: THREE.Material,
  metadata: SceneAtmosphereMaterialMetadata = {},
) {
  const existing = materialRegistry.get(material)
  const entry =
    existing ??
    createRegistryEntry(material, metadata, true, sceneScanGeneration)
  updateRegistryEntry(entry, metadata, true, sceneScanGeneration)
  materialRegistry.set(material, entry)
  applyAtmosphereToRegisteredMaterial(entry)

  return () => {
    if (materialRegistry.get(material) === entry) {
      materialRegistry.delete(material)
    }
  }
}

export function applySceneAtmosphereMaterial(
  material: THREE.Material,
  atmosphereOrMetadata:
    | RuntimeAtmosphereDefinition
    | SceneAtmosphereMaterialMetadata = {},
  metadata: SceneAtmosphereMaterialMetadata = {},
) {
  if ('distanceFog' in atmosphereOrMetadata) {
    setSceneAtmosphereDefinition(
      runtimeAtmosphereToSceneAtmosphereDefinition(atmosphereOrMetadata, {
        levelId: metadata.levelId ?? undefined,
      }),
    )
    return registerSceneAtmosphereMaterial(material, {
      source: 'manual',
      ...metadata,
    })
  }

  return registerSceneAtmosphereMaterial(material, {
    source: 'manual',
    ...atmosphereOrMetadata,
  })
}

export function registerSceneAtmosphereObject(
  root: THREE.Object3D,
  metadata: SceneAtmosphereMaterialMetadata = {},
) {
  const registeredMaterials = new Set<THREE.Material>()
  const unregisterCallbacks: Array<() => void> = []

  root.traverse(object => {
    if (!(object instanceof THREE.Mesh) || !object.material) return

    const registerMaterial = (material: THREE.Material) => {
      if (registeredMaterials.has(material)) return
      registeredMaterials.add(material)
      unregisterCallbacks.push(
        registerSceneAtmosphereMaterial(material, {
          ...metadata,
          objectName: metadata.objectName ?? object.name,
        }),
      )
    }

    if (Array.isArray(object.material)) {
      object.material.forEach(registerMaterial)
    } else {
      registerMaterial(object.material)
    }
  })

  return () => {
    unregisterCallbacks.forEach(unregister => unregister())
  }
}

function scanSceneAtmosphereMaterial(
  material: THREE.Material,
  metadata: SceneAtmosphereMaterialMetadata,
  generation: number,
) {
  const existing = materialRegistry.get(material)
  const entry =
    existing ?? createRegistryEntry(material, metadata, false, generation)
  updateRegistryEntry(entry, metadata, false, generation)
  materialRegistry.set(material, entry)
  applyAtmosphereToRegisteredMaterial(entry)
}

export function refreshSceneAtmosphereParticipants(
  root: THREE.Object3D,
  metadata: SceneAtmosphereMaterialMetadata = {},
) {
  const generation = ++sceneScanGeneration
  const scannedMaterials = new Set<THREE.Material>()

  root.traverse(object => {
    if (!(object instanceof THREE.Mesh) || !object.material) return

    const scanMaterial = (material: THREE.Material) => {
      if (scannedMaterials.has(material)) return
      scannedMaterials.add(material)
      scanSceneAtmosphereMaterial(
        material,
        {
          ...metadata,
          objectName: object.name,
        },
        generation,
      )
    }

    if (Array.isArray(object.material)) {
      object.material.forEach(scanMaterial)
    } else {
      scanMaterial(object.material)
    }
  })

  for (const [material, entry] of materialRegistry.entries()) {
    if (entry.explicit) continue
    if (entry.lastScanGeneration === generation) continue
    materialRegistry.delete(material)
  }
}

export function getSceneAtmosphereMaterialDiagnostics(): SceneAtmosphereMaterialDiagnostics {
  const entries = Array.from(materialRegistry.values())
  const renderPathCounts: Record<string, number> = {}
  let distanceParticipantCount = 0
  let heightParticipantCount = 0
  let fogCapableMaterialCount = 0
  let heightFogCapableMaterialCount = 0
  let distanceOnlyMaterialCount = 0
  let bypassedMaterialCount = 0

  for (const entry of entries) {
    refreshEntryCapability(entry)
    renderPathCounts[entry.renderPath] =
      (renderPathCounts[entry.renderPath] ?? 0) + 1
    if (entry.distanceParticipant) distanceParticipantCount += 1
    if (entry.heightParticipant) heightParticipantCount += 1
    if (entry.fogCapable) fogCapableMaterialCount += 1
    if (entry.heightFogCapable) heightFogCapableMaterialCount += 1
    if (entry.distanceParticipant && !entry.heightParticipant) {
      distanceOnlyMaterialCount += 1
    }
    if (entry.bypassReason) bypassedMaterialCount += 1
  }

  return {
    registeredMaterialCount: entries.length,
    distanceParticipantCount,
    heightParticipantCount,
    fogCapableMaterialCount,
    heightFogCapableMaterialCount,
    distanceOnlyMaterialCount,
    bypassedMaterialCount,
    renderPathCounts,
    bypassedMaterials: entries
      .filter(entry => entry.bypassReason)
      .slice(0, 16)
      .map(entry => ({
        uuid: entry.material.uuid,
        type: entry.material.type,
        name: entry.material.name,
        renderPath: entry.renderPath,
        objectName: entry.objectName,
        reason: entry.bypassReason ?? 'unknown',
      })),
  }
}

export function clearSceneAtmosphereMaterialRegistry() {
  materialRegistry.clear()
}

export function resetSceneAtmosphereShaderRegistryForTests() {
  atmosphereShaders = new WeakMap<THREE.Material, AtmosphereShaderParameters>()
  clearSceneAtmosphereMaterialRegistry()
}
