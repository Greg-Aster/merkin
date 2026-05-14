import type { AssetLocalTransformMetadata } from './assetLocalTransform'

export type Vec3 = [number, number, number]
export type Euler3 = [number, number, number]

export type LevelLifecyclePhase =
  | 'idle'
  | 'loading'
  | 'building'
  | 'playable'
  | 'unloading'
  | 'error'

export type ActorKind =
  | 'empty'
  | 'primitive'
  | 'asset'
  | 'prefab'
  | 'terrain'
  | 'light'
  | 'playerSpawn'
  | 'volume'

export type PrimitiveGeometryKind =
  | 'box'
  | 'cylinder'
  | 'octahedron'
  | 'tetrahedron'
  | 'icosahedron'
  | 'dodecahedron'
  | 'torus'

export type PhysicsBodyType = 'fixed' | 'dynamic' | 'kinematicPosition'
export type CollisionShape = 'cuboid' | 'cylinder' | 'trimesh'
export type RenderCullingPolicy = 'runtime-budget' | 'never'
export type RenderPhysicsAttachmentPolicy =
  | 'inside-collider'
  | 'outside-collider'
export type CollisionIntent =
  | 'none'
  | 'walkable'
  | 'blocker'
  | 'trigger'
  | 'detailMesh'
export type CollisionChannel =
  | 'worldStatic'
  | 'worldDynamic'
  | 'player'
  | 'trigger'
  | 'detail'

export interface TransformComponent {
  position: Vec3
  rotation: Euler3
  scale: Vec3
}

export interface RenderComponent {
  visible: boolean
  cullingPolicy: RenderCullingPolicy
  physicsAttachment: RenderPhysicsAttachmentPolicy
  primitive?: {
    geometry: PrimitiveGeometryKind
    args: number[]
  }
  asset?: {
    url: string
    assetLocalTransform?: AssetLocalTransformMetadata | null
  }
  prefab?: {
    type: string
    variant?: string
  }
  material?: Record<string, unknown>
}

export interface PhysicsComponent {
  bodyType: PhysicsBodyType
  collision: CollisionComponent
  gravityScale?: number
  canSleep?: boolean
  ccd?: boolean
  linearDamping?: number
  angularDamping?: number
  lockRotations?: boolean
  lockTranslations?: boolean
}

export interface CollisionComponent {
  intent: CollisionIntent
  channel: CollisionChannel
  shape: CollisionShape
  size?: Vec3
  colliderUrl?: string
  colliderMetadataUrl?: string
  assetLocalTransform?: AssetLocalTransformMetadata | null
  sourceAssetUrl?: string
  friction?: number
  restitution?: number
  sensor?: boolean
  triangleBudget?: number
  triangleCount?: number
  vertexCount?: number
}

export interface InteractionComponent {
  kind: 'select' | 'portal' | 'note' | 'conversation' | 'custom'
  targetId?: string
  data?: Record<string, unknown>
}

export interface GameplayComponent {
  type: string
  data?: Record<string, unknown>
}

export interface LightComponent {
  color: string
  intensity: number
  distance?: number
  decay?: number
}

export interface AudioRegionComponent {
  track: string
  volume: number
  falloff?: number
}

export interface TerrainComponent {
  source:
    | { kind: 'heightmap'; url?: string; generated?: boolean }
    | { kind: 'mesh'; url: string }
  worldSize?: number
  worldSizeX?: number
  worldSizeZ?: number
  bounds?: {
    min: Vec3
    max: Vec3
  }
}

export interface SpawnPointComponent {
  entityType: 'player' | 'npc' | 'item'
  priority?: number
}

export interface CollisionDiagnosticsReport {
  authoredActorIds: string[]
  defaultActorIds: string[]
  visualOnlyActorIds: string[]
  legacyAssetLocalMetadataActorIds?: string[]
  missingColliderMetadataActorIds?: string[]
}

export interface ActorDefinition {
  id: string
  name: string
  kind: ActorKind
  parentId?: string | null
  transform: TransformComponent
  render?: RenderComponent
  physics?: PhysicsComponent
  interaction?: InteractionComponent
  gameplay?: GameplayComponent
  light?: LightComponent
  audioRegion?: AudioRegionComponent
  terrain?: TerrainComponent
  spawnPoint?: SpawnPointComponent
}

export interface LevelDefinition {
  id: string
  title?: string
  version: number
  updatedAt?: string
  spawn: {
    player: Vec3
    rotation?: Vec3
  }
  actors: ActorDefinition[]
  settings?: Record<string, unknown>
}

export interface LevelBuildReport {
  levelId: string
  actorCount: number
  assetActorCount: number
  primitiveActorCount: number
  neverCullActorCount: number
  gameplayFireflyActorCount: number
  physicsActorCount: number
  trimeshActorCount: number
  detailMeshActorCount: number
  defaultCollisionActorCount: number
  visualOnlyActorCount: number
  requiredActorCount: number
  requiredRenderActorIds: string[]
  missingRequiredActorIds: string[]
  requiredAssetUrls: string[]
  runtimeAssetUrls: string[]
  collisionDiagnostics: CollisionDiagnosticsReport
  errors: string[]
  warnings: string[]
}
