import * as THREE from 'three'
import {
  ATMOSPHERE_SHADER_CACHE_KEY,
  type AtmosphereShaderParameters,
  injectAtmosphereShaderChunks,
  injectProjectiveAtmosphereShaderChunks,
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
  warningBypassedMaterialCount: number
  expectedBypassedMaterialCount: number
  renderPathCounts: Record<string, number>
  bypassedMaterials: Array<{
    uuid: string
    type: string
    name: string
    renderPath: string
    objectName: string
    reason: string
    severity: 'info' | 'warning'
  }>
}

type FogCapableMaterial = THREE.Material & {
  fog?: boolean
  userData: THREE.Material['userData'] & {
    atmosphereBypass?: boolean
    atmosphereBypassReason?: string
    atmosphereBypassSeverity?: 'info' | 'warning'
    merkinAtmospherePatched?: boolean
    merkinAtmosphereOriginalOnBeforeCompile?: THREE.Material['onBeforeCompile']
    merkinAtmosphereOriginalCustomProgramCacheKey?: THREE.Material['customProgramCacheKey']
    merkinAtmosphereShaderBypassReason?: string
    merkinAtmosphereShaderMode?: 'projective-world'
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
  scanMetadata: SceneAtmosphereMaterialMetadata
  explicitRegistrations: Map<symbol, SceneAtmosphereMaterialMetadata>
  lastScanGeneration: number
  fogCapable: boolean
  heightFogCapable: boolean
  distanceParticipant: boolean
  heightParticipant: boolean
  bypassReason: string | null
  bypassSeverity: 'info' | 'warning'
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

function hasShaderFogUniforms(material: THREE.Material) {
  return (
    material instanceof THREE.ShaderMaterial &&
    Boolean(material.uniforms?.fogColor && material.uniforms?.fogDensity)
  )
}

function isProjectiveAtmosphereShaderMaterial(material: THREE.Material) {
  return (
    material instanceof THREE.ShaderMaterial &&
    material.userData.merkinAtmosphereShaderMode === 'projective-world'
  )
}

function isDistanceFogCapableMaterial(material: THREE.Material) {
  return (
    isHeightFogPatchableMaterial(material) ||
    hasShaderFogUniforms(material) ||
    isProjectiveAtmosphereShaderMaterial(material)
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

    const injected = isProjectiveAtmosphereShaderMaterial(material)
      ? injectProjectiveAtmosphereShaderChunks(shader)
      : injectAtmosphereShaderChunks(shader)

    if (!injected) {
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
  const hasFogProperty = 'fog' in material
  const fogCapable = hasFogProperty && isDistanceFogCapableMaterial(material)
  const heightFogCapable =
    fogCapable &&
    (isHeightFogPatchableMaterial(material) ||
      isProjectiveAtmosphereShaderMaterial(material))
  const shaderBypass = material.userData.merkinAtmosphereShaderBypassReason

  entry.fogCapable = fogCapable
  entry.heightFogCapable = heightFogCapable
  entry.distanceParticipant = fogCapable && !explicitBypass
  entry.heightParticipant = heightFogCapable && !explicitBypass

  if (explicitBypass) {
    entry.bypassReason =
      material.userData.atmosphereBypassReason ?? 'explicit-atmosphere-bypass'
    entry.bypassSeverity =
      material.userData.atmosphereBypassSeverity === 'warning'
        ? 'warning'
        : 'info'
  } else if (hasFogProperty && !fogCapable) {
    entry.bypassReason = 'custom-shader-missing-native-fog-uniforms'
    entry.bypassSeverity = 'warning'
  } else if (!fogCapable) {
    entry.bypassReason = 'material-has-no-fog-property'
    entry.bypassSeverity = 'warning'
  } else if (!heightFogCapable) {
    entry.bypassReason =
      shaderBypass ?? 'height-fog-not-supported-for-material-type'
    entry.bypassSeverity = 'warning'
  } else {
    entry.bypassReason = null
    entry.bypassSeverity = 'info'
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
  metadata: SceneAtmosphereMaterialMetadata = {},
  scanGeneration = 0,
): RegistryEntry {
  const entry: RegistryEntry = {
    material,
    source: metadata.source ?? 'scene',
    renderPath: metadata.renderPath ?? 'unknown',
    objectName: metadata.objectName ?? '',
    levelId: metadata.levelId ?? null,
    reason: metadata.reason ?? '',
    explicit: false,
    scanMetadata: metadata,
    explicitRegistrations: new Map(),
    lastScanGeneration: scanGeneration,
    fogCapable: false,
    heightFogCapable: false,
    distanceParticipant: false,
    heightParticipant: false,
    bypassReason: null,
    bypassSeverity: 'info',
  }
  refreshRegistryEntryMetadata(entry)
  return entry
}

function getLatestExplicitRegistrationMetadata(entry: RegistryEntry) {
  let latestMetadata: SceneAtmosphereMaterialMetadata | null = null
  for (const metadata of entry.explicitRegistrations.values()) {
    latestMetadata = metadata
  }
  return latestMetadata
}

function refreshRegistryEntryMetadata(entry: RegistryEntry) {
  const metadata =
    getLatestExplicitRegistrationMetadata(entry) ?? entry.scanMetadata
  entry.explicit = entry.explicitRegistrations.size > 0
  entry.source = metadata.source ?? 'scene'
  entry.renderPath = metadata.renderPath ?? 'unknown'
  entry.objectName = metadata.objectName ?? ''
  entry.levelId = metadata.levelId ?? null
  entry.reason = metadata.reason ?? ''
}

function deleteRegistryEntryIfUnownedAndUnscanned(
  material: THREE.Material,
  entry: RegistryEntry,
) {
  if (entry.explicit) return
  if (
    entry.lastScanGeneration === 0 ||
    entry.lastScanGeneration !== sceneScanGeneration
  ) {
    materialRegistry.delete(material)
  }
}

export function registerSceneAtmosphereMaterial(
  material: THREE.Material,
  metadata: SceneAtmosphereMaterialMetadata = {},
) {
  const registrationToken = Symbol('scene-atmosphere-material')
  const existing = materialRegistry.get(material)
  const entry = existing ?? createRegistryEntry(material)
  entry.explicitRegistrations.set(registrationToken, metadata)
  refreshRegistryEntryMetadata(entry)
  materialRegistry.set(material, entry)
  applyAtmosphereToRegisteredMaterial(entry)

  let active = true
  return () => {
    if (!active) return
    active = false
    if (materialRegistry.get(material) === entry) {
      entry.explicitRegistrations.delete(registrationToken)
      refreshRegistryEntryMetadata(entry)
      deleteRegistryEntryIfUnownedAndUnscanned(material, entry)
    }
  }
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
  const entry = existing ?? createRegistryEntry(material)
  entry.scanMetadata = metadata
  entry.lastScanGeneration = generation
  refreshRegistryEntryMetadata(entry)
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
  let warningBypassedMaterialCount = 0
  let expectedBypassedMaterialCount = 0

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
    if (entry.bypassReason) {
      bypassedMaterialCount += 1
      if (entry.bypassSeverity === 'warning') {
        warningBypassedMaterialCount += 1
      } else {
        expectedBypassedMaterialCount += 1
      }
    }
  }

  return {
    registeredMaterialCount: entries.length,
    distanceParticipantCount,
    heightParticipantCount,
    fogCapableMaterialCount,
    heightFogCapableMaterialCount,
    distanceOnlyMaterialCount,
    bypassedMaterialCount,
    warningBypassedMaterialCount,
    expectedBypassedMaterialCount,
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
        severity: entry.bypassSeverity,
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
