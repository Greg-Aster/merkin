export type EditorNodeKind = 'asset' | 'primitive' | 'light' | 'prefab' | 'group'
export type EditorTransformMode = 'translate' | 'rotate' | 'scale'
export type EditorSpace = 'world' | 'local'
export type EditorTransformAxis = 'all' | 'x' | 'y' | 'z'
export type EditorStylePreset = 'site' | 'surreal-site' | 'ghibli' | 'alto' | 'monument' | 'retro'
export type EditorAtmospherePresetId =
  | 'lonely-wind'
  | 'ruin-haze'
  | 'heavy-ash'
  | 'silent-basin'
  | 'cold-starlight'
  | 'violet-dread'
  | 'signal-reef'
  | 'orchid-void'
  | 'sunlit-garden'
  | 'storm-glass'
  | 'moon-archive'
  | 'high-tide'
  | 'luminous-courtyard'
export type EditorAudioPresetId =
  | 'lonely-wind'
  | 'silent-basin'
  | 'cold-starlight'
  | 'shadow-waltz'
  | 'ruin-whispers'
  | 'courtyard-breeze'
  | 'glass-horizon'
  | 'quiet-tide'
  | 'signal-bloom'
  | 'cathedral-deck'
export type EditorInteractionMode = 'objects' | 'terrain'
export type EditorTerrainBrushMode = 'raise' | 'smooth' | 'flatten'
export type EditorViewportLightingMode = 'authored' | 'workbench'
export type PrimitiveGeometryKind = 'box' | 'cylinder' | 'octahedron' | 'tetrahedron' | 'icosahedron' | 'dodecahedron' | 'torus'
export type EditorPrefabType =
  | 'anomaly-cluster'
  | 'command-console'
  | 'command-fin'
  | 'hanging-light'
  | 'portal-apparatus'
  | 'courtyard-fountain'
  | 'observation-rig'
  | 'bench-growth'
  | 'growth-planter'
  | 'support-column'
  | 'interior-archway'
  | 'courtyard-pylon'
  | 'story-marker'
  | 'wasteland-archway'
  | 'wasteland-monolith'
  | 'broken-ring'

export interface EditorPrimitiveData {
  geometry: PrimitiveGeometryKind
  args: number[]
  color: string
  emissive?: string
  emissiveIntensity?: number
  metalness?: number
  roughness?: number
  transparent?: boolean
  opacity?: number
}

export interface EditorAssetData {
  url: string
}

export interface EditorLightData {
  color: string
  intensity: number
  distance: number
  decay: number
}

export interface EditorPrefabData {
  type: EditorPrefabType
  variant?: string
}

export interface EditorMaterialData {
  color?: string
  mapUrl?: string
  emissive?: string
  emissiveMapUrl?: string
  emissiveIntensity?: number
  metalness?: number
  metalnessMapUrl?: string
  roughness?: number
  roughnessMapUrl?: string
  normalMapUrl?: string
  alphaMapUrl?: string
  opacity?: number
  transparent?: boolean
  wireframe?: boolean
  doubleSided?: boolean
  flatShading?: boolean
  envMapIntensity?: number
  transmission?: number
  ior?: number
  clearcoat?: number
  clearcoatRoughness?: number
  thickness?: number
  reflectivity?: number
}

export type EditorRigidBodyType = 'fixed' | 'dynamic' | 'kinematicPosition'

export interface EditorNodePhysicsData {
  bodyType?: EditorRigidBodyType
  gravityScale?: number
  canSleep?: boolean
  ccd?: boolean
  linearDamping?: number
  angularDamping?: number
  lockRotations?: boolean
  lockTranslations?: boolean
}

export interface EditorNodeCollisionData {
  shape: 'cuboid'
  size?: [number, number, number]
  friction?: number
  restitution?: number
  sensor?: boolean
}

export interface EditorGameplayData {
  type: 'portal' | 'note' | 'firefly' | 'audio-region' | 'fog-volume' | 'mist-region'
  markerColor?: string
  markerSize?: number
  wanderEnabled?: boolean
  wanderRadius?: number
  wanderSpeed?: number
  hoverHeight?: number
  bobAmplitude?: number
  bobSpeed?: number
  twinkleSpeed?: number
  lightIntensity?: number
  lightDistance?: number
  lightDecay?: number
  spriteIntensity?: number
  targetLevelId?: string
  title?: string
  author?: string
  location?: string
  excerpt?: string
  body?: string
  audioTrack?: string
  audioVolume?: number
  regionFalloff?: number
  fogDensity?: number
  fogColor?: string
  mistColor?: string
  mistOpacity?: number
  mistLayers?: number
  mistSpacing?: number
  mistScale?: number
  mistDriftSpeed?: number
}

export interface EditorGenerationData {
  descriptor?: string
  family?: string
  sourceVisualSize?: [number, number, number]
  lastBakedAssetUrl?: string
  lastBakedAt?: string
}

export interface EditorSceneNode {
  id: string
  name: string
  kind: EditorNodeKind
  parentId?: string | null
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  visible: boolean
  locked?: boolean
  primitive?: EditorPrimitiveData
  asset?: EditorAssetData
  light?: EditorLightData
  prefab?: EditorPrefabData
  material?: EditorMaterialData
  physics?: EditorNodePhysicsData
  collision?: EditorNodeCollisionData
  gameplay?: EditorGameplayData
  generation?: EditorGenerationData
}

export interface SharedLevelSpawnSettings {
  spawn?: {
    position?: [number, number, number]
  }
}

export interface SharedLevelPlayerSettings {
  player?: {
    moveSpeed?: number
    jumpForce?: number
    lightIntensityScale?: number
  }
}

export interface SharedLevelFeatureSettings {
  features?: {
    ocean?: boolean
    vegetation?: boolean
    fireflies?: boolean
    starMap?: boolean
    conversations?: boolean
    styles?: boolean
    water?: boolean
    ambientParticles?: boolean
  }
}

export interface SharedLevelStyleSettings {
  style?: {
    preset?: EditorStylePreset
    enabled?: boolean
    fog?: {
      color?: string
      density?: number
    }
    haze?: {
      color?: string
      density?: number
      floor?: number
      ceiling?: number
      mistOpacity?: number
      mistLayers?: number
      mistHeight?: number
      mistSpacing?: number
      mistScale?: number
      mistDriftSpeed?: number
    }
    colorGrading?: {
      saturation?: number
      contrast?: number
      brightness?: number
      warmth?: number
    }
    bloom?: {
      intensity?: number
      threshold?: number
    }
  }
}

export interface SharedLevelLightingSettings {
  lighting?: {
    ambientIntensity?: number
    keyLightIntensity?: number
    sunIntensity?: number
    fillIntensity?: number
    fillLightIntensity?: number
    fallbackAmbientIntensity?: number
    fallbackMoonlightIntensity?: number
    fallbackFillLightIntensity?: number
  }
}

export interface SharedLevelWaterSettings {
  water?: {
    size?: {
      width?: number
      height?: number
    }
    enabled?: boolean
    enableRising?: boolean
    initialLevel?: number
    targetLevel?: number
    riseRate?: number
    level?: number
    color?: string
    opacity?: number
    enableAnimation?: boolean
    underwaterFogDensity?: number
    underwaterFogColor?: number
    surfaceFogDensity?: number
  }
}

export interface SharedLevelAmbientParticleSettings {
  ambientParticles?: {
    enabled?: boolean
    count?: number
    radius?: number
    minHeight?: number
    maxHeight?: number
    color?: string
    secondaryColor?: string
    size?: number
    opacity?: number
    driftSpeed?: number
    sway?: number
  }
}

export interface SharedLevelAmbientAudioSettings {
  ambientAudio?: {
    enabled?: boolean
    track?: string
    volume?: number
    falloff?: number
    position?: [number, number, number]
    scale?: [number, number, number]
  }
}

export interface SharedLevelPresetSettings {
  presets?: {
    atmosphere?: EditorAtmospherePresetId
    audio?: EditorAudioPresetId
  }
}

export interface SharedLevelSkyboxSettings {
  skyboxPreset?: 'observatory' | 'classic'
}

export interface SharedLevelEditorSettings
  extends SharedLevelSpawnSettings,
    SharedLevelPlayerSettings,
    SharedLevelFeatureSettings,
    SharedLevelStyleSettings,
    SharedLevelLightingSettings,
    SharedLevelWaterSettings,
    SharedLevelAmbientParticleSettings,
    SharedLevelAmbientAudioSettings,
    SharedLevelPresetSettings,
    SharedLevelSkyboxSettings {}

export interface ObservatoryEditorSettings extends SharedLevelEditorSettings {
  ocean?: SharedLevelWaterSettings['water']
  terrainSculpt?: {
    heightOverrides?: Record<string, number>
  }
}

export interface SolitudeEditorSettings extends SharedLevelEditorSettings {}

export interface EditorSceneSettings {
  level?: SharedLevelEditorSettings
  observatory?: ObservatoryEditorSettings
  solitude?: SolitudeEditorSettings
}

export interface EditorSceneDocument {
  levelId: string
  version: number
  updatedAt: string
  nodes: EditorSceneNode[]
  settings?: EditorSceneSettings
}

export interface EditorState {
  enabled: boolean
  panelOpen: boolean
  propertiesShelfOpen: boolean
  currentLevelId: string | null
  selectedNodeId: string | null
  selectedNodeIds: string[]
  isolatedNodeIds: string[]
  selectionAnchorId: string | null
  interactionMode: EditorInteractionMode
  viewportLightingMode: EditorViewportLightingMode
  transformMode: EditorTransformMode
  transformSpace: EditorSpace
  transformAxis: EditorTransformAxis
  modalTransformActive: boolean
  collisionOverlayEnabled: boolean
  terrainBrushMode: EditorTerrainBrushMode
  terrainBrushSize: number
  terrainBrushStrength: number
  terrainBrushFalloff: number
  orbitEnabled: boolean
  snappingEnabled: boolean
  translateSnap: number
  rotateSnap: number
  scaleSnap: number
  surfaceSnapEnabled: boolean
  surfaceSnapOffset: number
  dirty: boolean
  lastSavedAt: string | null
}

export interface EditorMarqueeState {
  active: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
}

export interface EditorCircleSelectState {
  active: boolean
  x: number
  y: number
  radius: number
  selecting: boolean
  subtracting: boolean
}
