import type { AssetLocalTransformMetadata } from './assetLocalTransform'
import type { RuntimePrefabType } from './runtimePrefabCatalog'
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
export type EditorPrefabType = RuntimePrefabType

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
  assetLocalTransform?: AssetLocalTransformMetadata | null
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
  runtimeStyle?: 'inherit' | 'skip'
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
  colliderUrl?: string
  colliderMetadataUrl?: string
  assetLocalTransform?: AssetLocalTransformMetadata | null
  proxy?: boolean
  bakeStatus?: 'ready' | 'needsBake' | 'stale' | 'notRequired'
  sourceAssetUrl?: string
  friction?: number
  restitution?: number
  sensor?: boolean
  triangleBudget?: number
  triangleCount?: number
  vertexCount?: number
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
  styleBatch?: 'include' | 'exclude'
  originalAssetUrl?: string
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
    rotation?: [number, number, number]
  }
}

export interface SharedLevelPlayerSettings {
  player?: {
    moveSpeed?: number
    sprintMultiplier?: number
    jumpForce?: number
    lightIntensityScale?: number
  }
}

export interface SharedLevelFeatureSettings {
  features?: {
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
    editorBatch?: {
      presetId?: string
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

export type RenderProfilePlatformTier = 'mobile' | 'desktop' | 'tv'
export type RenderProfileReflectionMode =
  | 'none'
  | 'static-environment'
  | 'screen-space'
  | 'planar'
  | 'probe'
export type RenderProfileReflectionSource =
  | 'none'
  | 'skybox'
  | 'generated-cubemap'
  | 'planar-water'
  | 'screen-space'
  | 'probe'
export type RenderProfilePostPass =
  | 'tone-mapping'
  | 'ambient-occlusion'
  | 'bloom'
  | 'color-grading'
  | 'vignette'
  | 'anti-aliasing'
  | 'depth-fog'

export interface RenderProfileShadowSettings {
  enabled?: boolean
  maxCastingLights?: number
  mapSize?: number
  cameraSize?: number
  cameraFar?: number
}

export interface RenderProfileReflectionSettings {
  mode?: RenderProfileReflectionMode
  source?: RenderProfileReflectionSource
  intent?: string
  textureSize?: number
  maxPlanarSurfaces?: number
  environmentIntensity?: number
  requiredAssetUrls?: string[]
  estimatedTextureBytes?: number
  estimatedRenderPasses?: number
}

export interface RenderProfilePostProcessingSettings {
  enabled?: boolean
  passes?: RenderProfilePostPass[]
  maxEnabledPasses?: number
  bloom?: {
    intensity?: number
    threshold?: number
  }
  ambientOcclusion?: {
    enabled?: boolean
    intensity?: number
    radius?: number
    minDistance?: number
    maxDistance?: number
  }
  toneMappingExposure?: number
  vignetteStrength?: number
}

export interface RenderProfileLightingSettings {
  ambientColor?: string
  skyColor?: string
  groundColor?: string
  keyLightColor?: string
  fillLightColor?: string
  keyLightPosition?: [number, number, number]
  fillLightPosition?: [number, number, number]
}

export interface RenderProfileVisualBookmark {
  id: string
  label?: string
  playerPosition?: [number, number, number]
  cameraPosition: [number, number, number]
  cameraTarget: [number, number, number]
  viewport?: {
    width?: number
    height?: number
  }
  settleMs?: number
}

export interface RenderProfileTierSettings {
  shadows?: RenderProfileShadowSettings
  reflections?: RenderProfileReflectionSettings
  postProcessing?: RenderProfilePostProcessingSettings
}

export interface SharedLevelRenderProfileSettings {
  renderProfile?: {
    id?: string
    defaultTier?: RenderProfilePlatformTier
    lighting?: RenderProfileLightingSettings
    shadows?: RenderProfileShadowSettings
    reflections?: RenderProfileReflectionSettings
    postProcessing?: RenderProfilePostProcessingSettings
    visualBookmarks?: RenderProfileVisualBookmark[]
    qualityTiers?: Partial<
      Record<RenderProfilePlatformTier, RenderProfileTierSettings>
    >
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
export type LevelCollisionBudget = 'mobile' | 'balanced' | 'desktop'
export type LevelGroundMode =
  | 'terrain-chunks'
  | 'hybrid'
  | 'scene-authored'
export type TerrainRuntimeMode =
  | 'scene-authored'
  | 'heightfield-terrain'
  | 'glb-chunk-terrain'
export type TerrainVisualSource =
  | 'scene-actors'
  | 'heightmap-surface'
  | 'generated-heightmap-chunks'
  | 'source-glb-chunks'
  | 'none'
export type TerrainFallbackSurfacePolicy =
  | 'disabled'
  | 'debug-only'
  | 'until-required-chunks-ready'
  | 'always'
export type LevelGroundVisualSource = TerrainVisualSource | 'terrain-chunks'
export type LevelGroundCollisionSource =
  | 'baked-heightfield'
  | 'scene-colliders'
  | 'source-linked-terrain-collision'
export type TerrainMigrationStatus = 'complete' | 'transitional' | 'planned'
export type TerrainMigrationCollisionSource = LevelGroundCollisionSource

export interface TerrainSourceAssetFingerprint {
  algorithm?: 'sha256' | string
  value?: string
}

export interface TerrainRenderChunkProductMetadata {
  type?: 'heightfield-terrain' | 'glb-chunk-terrain'
  visualSource?: TerrainVisualSource
  url?: string
  chunksPath?: string
  manifestUrl?: string
  chunkCount?: number
  lods?: number[]
  generatedAt?: string
  generatedBy?: string
  sourceAssetUrl?: string
  sourceHash?: string
  textureReferenceCount?: number
  preservesSourceUvs?: boolean
  preservesSourceMaterialSlots?: boolean
  preservesSourceNormals?: boolean
  preservesSourceTangents?: boolean
  preservesSourceMeshGroups?: boolean
  textureReferencesPreserved?: boolean
}

export interface TerrainCollisionProductMetadata {
  url?: string
  metadataUrl?: string
  manifestUrl?: string
  triangleCount?: number
  vertexCount?: number
  colliderResolution?: number
  generatedAt?: string
  generatedBy?: string
}

export interface TerrainMigrationSettings {
  currentMode?: TerrainRuntimeMode
  authoritativeVisualSource?: TerrainVisualSource
  collisionSource?: TerrainMigrationCollisionSource
  renderChunks?: {
    present?: boolean
    authoritative?: boolean
    source?: 'none' | 'generated-heightmap' | 'source-glb'
  }
  fallbackSurfacePolicy?: TerrainFallbackSurfacePolicy
  targetMode?: TerrainRuntimeMode
  status?: TerrainMigrationStatus
  blockers?: string[]
  warningsBecomeBlockersAfterMigration?: string[]
}

export interface LevelCollisionWorkflowSettings {
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
      source?: 'baked-heightmap' | 'source-glb' | 'scene-authored' | 'none'
      runtimeSource?: TerrainRuntimeComponentSource
      runtimeMode?: TerrainRuntimeMode
      visualSource?: TerrainVisualSource
      fallbackSurfacePolicy?: TerrainFallbackSurfacePolicy
      manifestUrl?: string
      heightmapUrl?: string
      heightmapResolution?: number
      sourceAssetUrl?: string
      sourceAssetUrls?: string[]
      sourceAssetHash?: string
      sourceAssetFingerprint?: TerrainSourceAssetFingerprint
      sourceNodeId?: string
      sourceNodeIds?: string[]
      sourceName?: string
      sourceTriangleCount?: number
      sourceBounds?: {
        min: [number, number, number]
        max: [number, number, number]
      }
      colliderUrl?: string
      metadataUrl?: string
      colliderResolution?: number
      triangleCount?: number
      vertexCount?: number
      dirty?: boolean
      heightmapDirty?: boolean
      lastGeneratedAt?: string
      heightOverrideCount?: number
      chunksPath?: string
      chunkGrid?: number
      chunkCount?: number
      chunkLods?: number[]
      lastChunksGeneratedAt?: string
      renderChunks?: TerrainRenderChunkProductMetadata
      collisionProduct?: TerrainCollisionProductMetadata
      approvedHeightfieldException?: boolean
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
    terrainRuntimeMode?: TerrainRuntimeMode
    terrainVisualSource?: TerrainVisualSource
    fallbackSurfacePolicy?: TerrainFallbackSurfacePolicy
    preserveSourceUvs?: boolean
    preserveSourceMaterialSlots?: boolean
    sourceAssetUrl?: string
    sourceAssetHash?: string
    sourceAssetFingerprint?: TerrainSourceAssetFingerprint
    renderChunks?: TerrainRenderChunkProductMetadata
    collisionProduct?: TerrainCollisionProductMetadata
    approvedHeightfieldException?: boolean
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

export interface SharedLevelTerrainMigrationSettings {
  terrainMigration?: TerrainMigrationSettings
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
    dirty?: boolean
    assetUrlsDirty?: boolean
  }
}

export interface SharedLevelWorldPartitionSettings {
  worldPartition?: {
    partitionUrl?: string
    cellSize?: number
    activeRadius?: number
    maxResidentActors?: number
    minStreamableActors?: number
    maxActorsPerCell?: number
    cells?: number
    residentActors?: number
    streamableActors?: number
    lastGeneratedAt?: string
    dirty?: boolean
    actorTransformsDirty?: boolean
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

export interface SharedLevelEditorPanelSettings {
  editorPanels?: {
    environment?:
      | 'shared'
      | 'observatory'
      | 'solitude'
      | 'sci-fi-room'
      | 'miranda'
  }
}

export interface SharedLevelEditorSettings
  extends SharedLevelSpawnSettings,
    SharedLevelPlayerSettings,
    SharedLevelFeatureSettings,
    SharedLevelStyleSettings,
    SharedLevelLightingSettings,
    SharedLevelRenderProfileSettings,
    SharedLevelWaterSettings,
    SharedLevelAmbientParticleSettings,
    SharedLevelAmbientAudioSettings,
    SharedLevelCollisionSettings,
    SharedLevelGroundSettings,
    SharedLevelTerrainSculptSettings,
    SharedLevelTerrainMigrationSettings,
    SharedLevelPresetSettings,
    SharedLevelSkyboxSettings,
    SharedLevelRuntimeAssetSettings,
    SharedLevelWorldPartitionSettings,
    SharedLevelGraphicsBudgetSettings,
    SharedLevelEditorPanelSettings {}

export interface ObservatoryEditorSettings extends SharedLevelEditorSettings {}

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
