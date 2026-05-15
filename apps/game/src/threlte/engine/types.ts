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

export interface CollisionProductFingerprint {
  algorithm: 'sha256'
  value: string
}

export type CollisionPolicyMode = 'auto' | 'none' | 'trigger'
export type CollisionGenerationQuality =
  | 'primitive'
  | 'convexHull'
  | 'simplifiedMesh'
  | 'trimesh'
export type GeneratedCollisionShape =
  | 'cuboid'
  | 'cylinder'
  | 'ball'
  | 'capsule'
  | 'convexHull'
  | 'trimesh'

export interface GeneratedCollisionProduct {
  actorId: string
  cacheKey?: string
  mode?: CollisionPolicyMode
  productId?: string
  sourceDescriptor?: string
  sourceKind?: 'asset' | 'prefab' | 'primitive' | 'terrain' | 'none'
  sourceMeshUrl?: string
  visualSourceMeshUrl?: string
  sourceMeshFingerprint: CollisionProductFingerprint | string
  transformFingerprint: CollisionProductFingerprint | string
  policyFingerprint: CollisionProductFingerprint | string
  shape: GeneratedCollisionShape
  artifactUrl?: string
  metadataUrl?: string
  localBounds: {
    min: Vec3
    max: Vec3
    size: Vec3
    center: Vec3
  }
  triangleCount?: number
  vertexCount?: number
  triangleBudget?: number
  generatedAt?: string
  generatorVersion: string
}

export interface CollisionProductFingerprintInput {
  sourceMeshFingerprint: CollisionProductFingerprint | string
  transformFingerprint: CollisionProductFingerprint | string
  policyFingerprint: CollisionProductFingerprint | string
}

function getCollisionProductFingerprintValue(
  fingerprint: CollisionProductFingerprint | string,
) {
  return typeof fingerprint === 'string' ? fingerprint : fingerprint.value
}

export function isGeneratedCollisionProductStale(
  product: GeneratedCollisionProduct,
  expected: CollisionProductFingerprintInput,
) {
  return (
    getCollisionProductFingerprintValue(product.sourceMeshFingerprint) !==
      getCollisionProductFingerprintValue(expected.sourceMeshFingerprint) ||
    getCollisionProductFingerprintValue(product.transformFingerprint) !==
      getCollisionProductFingerprintValue(expected.transformFingerprint) ||
    getCollisionProductFingerprintValue(product.policyFingerprint) !==
      getCollisionProductFingerprintValue(expected.policyFingerprint)
  )
}

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
  quality?: 'primitive' | 'convexHull' | 'simplifiedMesh' | 'trimesh'
  lodSourceTier?: 'source' | 'low' | 'medium' | 'high'
  generationStatus?: 'ready' | 'dirty' | 'generating' | 'failed'
  generationLastError?: string
  size?: Vec3
  colliderUrl?: string
  colliderMetadataUrl?: string
  colliderCacheKey?: string
  assetLocalTransform?: AssetLocalTransformMetadata | null
  sourceAssetUrl?: string
  colliderSourceAssetUrl?: string
  lockToObject?: boolean
  friction?: number
  restitution?: number
  sensor?: boolean
  triangleBudget?: number
  triangleCount?: number
  vertexCount?: number
  generatedProduct?: GeneratedCollisionProduct
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
  disabledActorIds: string[]
  missingCollisionActorIds: string[]
  collisionOnlyProxyActorIds: string[]
  legacyAssetLocalMetadataActorIds?: string[]
  missingColliderMetadataActorIds?: string[]
}

export type CollisionClassification =
  | 'collidable'
  | 'visual-only'
  | 'disabled'
  | 'missing-collision'
  | 'collision-only-proxy'

export interface ActorDefinition {
  id: string
  name: string
  kind: ActorKind
  parentId?: string | null
  transform: TransformComponent
  render?: RenderComponent
  physics?: PhysicsComponent
  collisionClassification?: CollisionClassification
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

export interface LevelRuntimeReadinessGate {
  id: string
  label: string
  required: boolean
  satisfied: boolean
  evidence: Record<string, unknown>
  blockers: string[]
}

export interface LevelRuntimeActivationState {
  manifestLoaded?: boolean
  requiredRenderAssetsLoaded?: boolean
  loadedAssetUrls?: string[]
  requiredRenderActorsMounted?: boolean
  mountedRenderActorIds?: string[]
  requiredCollisionMounted?: boolean
  mountedCollisionActorIds?: string[]
  requiredColliderUrlsLoaded?: boolean
  loadedColliderUrls?: string[]
  terrainCollisionMounted?: boolean
  requiredInitialCellsActive?: boolean
  activeInitialCellKeys?: string[]
  readyInitialCellKeys?: string[]
  failedInitialCellKeys?: string[]
  spawnResolved?: boolean
  physicsWorldReady?: boolean
  playerBodyReady?: boolean
  gameplayEnabled?: boolean
}

export interface LevelRuntimeActivationStatus {
  levelId: string
  ready: boolean
  gates: LevelRuntimeReadinessGate[]
  blockers: string[]
}

export interface LevelRuntimeReadinessContract {
  schemaVersion: 2
  levelId: string
  publish: {
    ready: boolean
    gates: LevelRuntimeReadinessGate[]
    blockers: string[]
  }
  runtime: {
    activationRequired: boolean
    requiredGateIds: string[]
    requiredRenderActorIds: string[]
    requiredCollisionActorIds: string[]
    requiredAssetUrls: string[]
    requiredColliderUrls: string[]
    requiredInitialCellKeys: string[]
    requiredTerrain: boolean
    terrainManifestUrl: string
  }
  spawn: {
    player: Vec3
    valid: boolean
    runtimeActorId: string
    satisfiedByRuntimeSystem: boolean
  }
  terrain: {
    runtimeActorId: string
    runtimeCollision: boolean
    satisfiedByRuntimeSystem: boolean
  }
  requiredActorIds: string[]
  requiredWalkableActorIds: string[]
  runtimeAssetUrls: string[]
  missingRequiredActorIds: string[]
  missingRequiredRenderActorIds: string[]
  missingRequiredCollisionActorIds: string[]
  missingRequiredWalkableActorIds: string[]
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
  missingRequiredActorIds: string[]
  runtimeReadinessContract: LevelRuntimeReadinessContract
  collisionDiagnostics: CollisionDiagnosticsReport
  errors: string[]
  warnings: string[]
}
