import type {
  CollisionChannel,
  CollisionIntent,
  LevelDefinition,
  PrimitiveGeometryKind,
  RenderCullingPolicy,
  RenderPhysicsAttachmentPolicy,
} from './types'

export type SceneNodeKind = 'asset' | 'primitive' | 'light' | 'prefab' | 'group'
export type EditorNodeKind = SceneNodeKind

export type EditorStylePreset =
  | 'site'
  | 'surreal-site'
  | 'ghibli'
  | 'alto'
  | 'monument'
  | 'retro'
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
  | 'wind-signals'
  | 'archive-pulse'
  | 'shadow-waltz'
  | 'ruin-whispers'
  | 'courtyard-breeze'
  | 'glass-horizon'
  | 'quiet-tide'
  | 'glass-signal'
  | 'signal-bloom'
  | 'control-room'
  | 'cathedral-deck'
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

export interface EditorRenderPolicyData {
  cullingPolicy?: RenderCullingPolicy
  physicsAttachment?: RenderPhysicsAttachmentPolicy
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
  shape: 'cuboid' | 'cylinder' | 'trimesh'
  intent?: CollisionIntent
  channel?: CollisionChannel
  enabled?: boolean
  size?: [number, number, number]
  friction?: number
  restitution?: number
  sensor?: boolean
  triangleBudget?: number
}

export interface EditorGameplayData {
  type:
    | 'portal'
    | 'note'
    | 'firefly'
    | 'audio-region'
    | 'fog-volume'
    | 'mist-region'
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
  lightBurstBoost?: number
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
  renderPolicy?: EditorRenderPolicyData
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

export type TerrainRuntimeComponentSource =
  | 'built-in-manifest'
  | 'editor-manifest'
  | 'generated-heightmap'
export type LevelCollisionDefaultPolicy =
  | 'lightweight-auto'
  | 'authored-only'
  | 'none'
export type LevelCollisionBudget = 'mobile' | 'balanced' | 'desktop'
export type LevelGroundMode =
  | 'terrain-chunks'
  | 'authored-ground'
  | 'hybrid'
  | 'scene-authored'
export type LevelGroundVisualSource =
  | 'terrain-chunks'
  | 'scene-actors'
  | 'none'
export type LevelGroundCollisionSource =
  | 'baked-heightfield'
  | 'scene-colliders'

export interface LevelCollisionWorkflowSettings {
  actorCollision?: LevelCollisionDefaultPolicy
  colliderBudget?: LevelCollisionBudget
}

export interface LevelCollisionRoleSettings {
  visualOnlyActorIds?: string[]
  groundActorIds?: string[]
  platformActorIds?: string[]
  sensorActorIds?: string[]
  detailActorIds?: string[]
}

export interface SharedLevelCollisionSettings {
  collision?: {
    terrain?: {
      source?: 'baked-heightmap' | 'scene-authored' | 'none'
      runtimeSource?: TerrainRuntimeComponentSource
      manifestUrl?: string
      heightmapUrl?: string
      heightmapResolution?: number
      sourceAssetUrl?: string
      sourceNodeId?: string
      sourceName?: string
      sourceTriangleCount?: number
      colliderUrl?: string
      metadataUrl?: string
      colliderResolution?: number
      triangleCount?: number
      vertexCount?: number
      dirty?: boolean
      lastGeneratedAt?: string
      heightOverrideCount?: number
      chunksPath?: string
      chunkGrid?: number
      chunkCount?: number
      chunkLods?: number[]
      lastChunksGeneratedAt?: string
    }
    workflow?: LevelCollisionWorkflowSettings
    roles?: LevelCollisionRoleSettings
    defaults?: {
      solidObjectsByDefault?: boolean
      defaultFriction?: number
      defaultRestitution?: number
    }
  }
}

export interface SharedLevelGroundSettings {
  ground?: {
    mode?: LevelGroundMode
    visualSource?: LevelGroundVisualSource
    collisionSource?: LevelGroundCollisionSource
    groundActorIds?: string[]
    terrainManifestUrl?: string
    requiredWalkableSurfaceId?: string
  }
}

export interface SharedLevelTerrainSculptSettings {
  terrainSculpt?: {
    enabled?: boolean
    autoBakeCollision?: boolean
    heightOverrides?: Record<string, number>
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

export interface SharedLevelRuntimeAssetSettings {
  runtimeAssets?: {
    maxTier?: 'low' | 'medium' | 'high'
    requiredActorIds?: string[]
    requiredAssetActorIds?: string[]
    requiredRenderActorIds?: string[]
  }
}

export interface SharedLevelWorldPartitionSettings {
  worldPartition?: {
    partitionUrl?: string
    cellSize?: number
    activeRadius?: number
    cells?: number
    residentActors?: number
    streamableActors?: number
    lastGeneratedAt?: string
  }
}

export interface SharedLevelGraphicsBudgetSettings {
  graphicsBudget?: {
    maxRuntimeAssetBytes?: number
    maxRuntimeAssetFileBytes?: number
    maxGeometryActors?: number
    maxPrimitiveActors?: number
    maxNeverCullActors?: number
    maxGameplayFireflies?: number
    maxExplicitColliders?: number
    maxLightActors?: number
    maxEstimatedDrawCalls?: number
    maxAuthoredMaterialSlots?: number
    maxEstimatedTriangles?: number
    maxAuthoredTextureBytes?: number
  }
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
    SharedLevelCollisionSettings,
    SharedLevelGroundSettings,
    SharedLevelTerrainSculptSettings,
    SharedLevelPresetSettings,
    SharedLevelSkyboxSettings,
    SharedLevelRuntimeAssetSettings,
    SharedLevelWorldPartitionSettings,
    SharedLevelGraphicsBudgetSettings {}

export interface ObservatoryEditorSettings extends SharedLevelEditorSettings {
  ocean?: SharedLevelWaterSettings['water']
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
  engine?: {
    levelDefinition: LevelDefinition
  }
}

export type ScenePrimitiveData = EditorPrimitiveData
export type SceneAssetData = EditorAssetData
export type SceneLightData = EditorLightData
export type ScenePrefabData = EditorPrefabData
export type SceneMaterialData = EditorMaterialData
export type SceneRenderPolicyData = EditorRenderPolicyData
export type SceneRigidBodyType = EditorRigidBodyType
export type SceneNodePhysicsData = EditorNodePhysicsData
export type SceneNodeCollisionData = EditorNodeCollisionData
export type SceneGameplayData = EditorGameplayData
export type SceneGenerationData = EditorGenerationData
export type SceneNode = EditorSceneNode
export type SharedLevelSettings = SharedLevelEditorSettings
export type ObservatorySceneSettings = ObservatoryEditorSettings
export type SolitudeSceneSettings = SolitudeEditorSettings
export type SceneSettings = EditorSceneSettings
export type SceneDocument = EditorSceneDocument
