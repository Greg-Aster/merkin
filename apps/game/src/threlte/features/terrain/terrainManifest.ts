import type {
  TerrainCollisionProductMetadata,
  TerrainFallbackSurfacePolicy,
  TerrainRenderChunkProductMetadata,
  TerrainRuntimeMode,
  TerrainSourceAssetFingerprint,
  TerrainVisualSource,
} from '../../engine/sceneDocumentTypes'
import type { TerrainConfig, TerrainSourceContract } from './TerrainManager'

type TerrainBounds = NonNullable<TerrainConfig['bounds']>
type TerrainManifestCollisionTerrain = Partial<
  NonNullable<TerrainConfig['collision']>
> & {
  url?: string
  metadataUrl?: string
  triangleCount?: number
  vertexCount?: number
  colliderResolution?: number
  sourceContract?: TerrainSourceContract
}

export type TerrainRuntimeComponentSource =
  | 'built-in-manifest'
  | 'editor-manifest'
  | 'generated-heightmap'

export type TerrainManifest = {
  id?: string
  runtime?: {
    mode?: TerrainRuntimeMode
    visualSource?: TerrainVisualSource
    fallbackSurfacePolicy?: TerrainFallbackSurfacePolicy
  }
  assets?: {
    heightmap?: string
    chunksPath?: string
    sourceGlb?: string
    sourceGltf?: string
    terrainSource?: string
    sourceAssetUrl?: string
    sourceAssetHash?: string
    sourceAssetFingerprint?: TerrainSourceAssetFingerprint
  }
  source?: {
    assetUrl?: string
    assetHash?: string
    assetFingerprint?: TerrainSourceAssetFingerprint
    nodeId?: string
    nodeIds?: string[]
    name?: string
    triangleCount?: number
  }
  physics?: {
    worldSize?: number
    worldSizeX?: number
    worldSizeZ?: number
    minHeight?: number
    maxHeight?: number
    bounds?: TerrainConfig['bounds']
    chunkSize?: number
    gridX?: number
    gridY?: number
  }
  collision?: {
    terrain?: TerrainManifestCollisionTerrain
    product?: TerrainCollisionProductMetadata
  }
  visualChunks?: {
    sourceContract?: TerrainSourceContract
    lods?: Array<{ level?: number; distance?: number; resolution?: number }>
    material?: {
      name: string
      baseColorFactor: [number, number, number, number]
      roughnessFactor: number
      metallicFactor: number
    }
    activation?: {
      maxActiveChunks?: number
      maxActiveChunksByTier?: Partial<
        Record<'ultra_low' | 'low' | 'medium' | 'high' | 'ultra', number>
      >
    }
    generatedAt?: string
    generatedBy?: string
    chunkCount?: number
    source?: 'generated-heightmap' | 'source-glb'
    preservesSourceUvs?: boolean
    preservesSourceMaterialSlots?: boolean
    preservesSourceNormals?: boolean
    preservesSourceTangents?: boolean
    preservesSourceMeshGroups?: boolean
    preservesTextureReferences?: boolean
    warnings?: string[]
    product?: TerrainRenderChunkProductMetadata
    chunks?: Array<{
      x: number
      z: number
      lod: number
      url: string
      bounds?: TerrainConfig['bounds']
      byteSize?: number
      triangleCount?: number
      materialSlots?: Array<{ index: number; name: string }>
    }>
  }
}

export type HeightmapConfig = {
  bounds?: TerrainConfig['bounds']
  heightOffset?: number
  heightScale?: number
  minHeight?: number
  maxHeight?: number
  worldSizeX?: number
  worldSizeZ?: number
}

export interface TerrainRuntimeComponentData {
  levelId: string
  source: TerrainRuntimeComponentSource
  manifestUrl?: string
  manifest: TerrainManifest
  heightmapConfig: HeightmapConfig | null
  config: TerrainConfig
  runtime: {
    collisionStrategy: 'baked-terrain-mesh'
    visualContract: TerrainRuntimeVisualContract
  }
}

type TerrainRuntimeGroundContractInput = {
  mode?: string
  terrainRuntimeMode?: TerrainRuntimeMode
  terrainVisualSource?: TerrainVisualSource
  visualSource?: TerrainVisualSource | 'terrain-chunks'
  fallbackSurfacePolicy?: TerrainFallbackSurfacePolicy
}

const GLB_TERRAIN_COLLISION_BAKE_MODES = new Set([
  'source-glb-heightfield-projection',
  'dedicated-collision-glb',
  'simplified-source-glb',
  'selected-terrain-walkable-mesh',
])

export type TerrainRuntimeVisualContract = {
  mode: TerrainRuntimeMode
  visualSource: TerrainVisualSource
  fallbackSurfacePolicy: TerrainFallbackSurfacePolicy
  requiredChunkCount?: number
  diagnostics: string[]
}

function getManifestRuntimeMode(manifest: TerrainManifest): TerrainRuntimeMode {
  if (manifest.runtime?.mode) return manifest.runtime.mode
  if (
    manifest.runtime?.visualSource === 'source-glb-chunks' ||
    manifest.visualChunks?.source === 'source-glb' ||
    manifest.assets?.sourceGlb
  ) {
    return 'glb-chunk-terrain'
  }
  if (
    manifest.assets?.heightmap ||
    manifest.collision?.terrain ||
    manifest.visualChunks?.chunkCount ||
    manifest.assets?.chunksPath
  ) {
    return 'heightfield-terrain'
  }
  return 'scene-authored'
}

function getManifestVisualSource(
  manifest: TerrainManifest,
): TerrainVisualSource {
  if (manifest.runtime?.visualSource) return manifest.runtime.visualSource
  if (
    manifest.visualChunks?.source === 'source-glb' ||
    manifest.assets?.sourceGlb
  ) {
    return 'source-glb-chunks'
  }
  if (manifest.assets?.chunksPath || manifest.visualChunks?.chunkCount) {
    return 'generated-heightmap-chunks'
  }
  if (manifest.assets?.heightmap) return 'heightmap-surface'
  return 'none'
}

function canonicalRuntimeVisualSource(
  value: TerrainRuntimeGroundContractInput['visualSource'],
): TerrainVisualSource | null {
  if (value === 'terrain-chunks') return 'generated-heightmap-chunks'
  if (value) return value
  return null
}

export function normalizeTerrainManifest(
  manifest: TerrainManifest,
): TerrainManifest {
  const runtimeMode = getManifestRuntimeMode(manifest)
  const visualSource = getManifestVisualSource(manifest)
  const collision = manifest.collision
  const terrainCollision = collision?.terrain

  return {
    ...manifest,
    runtime: {
      mode: runtimeMode,
      visualSource,
      fallbackSurfacePolicy:
        manifest.runtime?.fallbackSurfacePolicy ??
        (visualSource === 'heightmap-surface' ? 'always' : 'disabled'),
    },
    assets: {
      ...manifest.assets,
      sourceAssetUrl:
        manifest.assets?.sourceAssetUrl ??
        manifest.assets?.sourceGlb ??
        manifest.source?.assetUrl,
      sourceAssetHash:
        manifest.assets?.sourceAssetHash ?? manifest.source?.assetHash,
      sourceAssetFingerprint:
        manifest.assets?.sourceAssetFingerprint ??
        manifest.source?.assetFingerprint,
    },
    visualChunks: manifest.visualChunks
      ? {
          ...manifest.visualChunks,
          source:
            manifest.visualChunks.source ??
            (visualSource === 'source-glb-chunks'
              ? 'source-glb'
              : 'generated-heightmap'),
          product: {
            chunksPath: manifest.assets?.chunksPath,
            chunkCount: manifest.visualChunks.chunkCount,
            generatedAt: manifest.visualChunks.generatedAt,
            generatedBy: manifest.visualChunks.generatedBy,
            preservesSourceUvs: manifest.visualChunks.preservesSourceUvs,
            preservesSourceMaterialSlots:
              manifest.visualChunks.preservesSourceMaterialSlots,
            ...manifest.visualChunks.product,
          },
        }
      : manifest.visualChunks,
    collision: collision
      ? {
          ...collision,
          product: {
            url: terrainCollision?.url,
            metadataUrl: terrainCollision?.metadataUrl,
            triangleCount: terrainCollision?.triangleCount,
            vertexCount: terrainCollision?.vertexCount,
            colliderResolution: terrainCollision?.colliderResolution,
            ...collision.product,
          },
        }
      : collision,
  }
}

function isFiniteBounds(value: unknown): value is TerrainBounds {
  const bounds = value as TerrainBounds | undefined
  return (
    Boolean(bounds) &&
    Array.isArray(bounds?.min) &&
    Array.isArray(bounds?.max) &&
    bounds.min.length === 3 &&
    bounds.max.length === 3 &&
    bounds.min.every(component => Number.isFinite(component)) &&
    bounds.max.every(component => Number.isFinite(component))
  )
}

function fingerprintsMatch(
  left: TerrainSourceContract['sourceAssetFingerprint'] | undefined,
  right: TerrainSourceContract['sourceAssetFingerprint'] | undefined,
) {
  if (!left?.value || !right?.value) return true
  return left.algorithm === right.algorithm && left.value === right.value
}

function contractReferencesSourceAsset(
  contract: TerrainSourceContract,
  sourceAssetUrl: string | undefined,
) {
  if (!sourceAssetUrl) return true
  return [
    contract.sourceAssetUrl,
    ...(contract.sourceAssetUrls ?? []),
    ...(contract.authoredSourceAssetUrls ?? []),
  ].includes(sourceAssetUrl)
}

function getContractFingerprintForSourceAsset(
  contract: TerrainSourceContract,
  sourceAssetUrl: string | undefined,
) {
  if (!sourceAssetUrl) return contract.sourceAssetFingerprint
  if (contract.sourceAssetUrl === sourceAssetUrl) {
    return contract.sourceAssetFingerprint
  }
  return contract.sourceAssetFingerprints?.find(
    entry => entry.url === sourceAssetUrl,
  )?.fingerprint
}

function boundsOverlap(
  left: TerrainConfig['bounds'] | undefined,
  right: TerrainConfig['bounds'] | undefined,
) {
  if (!isFiniteBounds(left) || !isFiniteBounds(right)) return true
  const leftBounds = left
  const rightBounds = right
  return (
    leftBounds.min[0] <= rightBounds.max[0] &&
    leftBounds.max[0] >= rightBounds.min[0] &&
    leftBounds.min[1] <= rightBounds.max[1] &&
    leftBounds.max[1] >= rightBounds.min[1] &&
    leftBounds.min[2] <= rightBounds.max[2] &&
    leftBounds.max[2] >= rightBounds.min[2]
  )
}

function boundsContainPointXZ(
  bounds: TerrainConfig['bounds'] | undefined,
  point: [number, number, number] | undefined,
) {
  if (!isFiniteBounds(bounds) || !point) return true
  const finiteBounds = bounds
  return (
    point[0] >= finiteBounds.min[0] &&
    point[0] <= finiteBounds.max[0] &&
    point[2] >= finiteBounds.min[2] &&
    point[2] <= finiteBounds.max[2]
  )
}

export function validateTerrainManifestCollisionContract(input: {
  manifest: TerrainManifest
  levelId?: string
  spawnPoint?: [number, number, number]
}) {
  const manifest = normalizeTerrainManifest(input.manifest)
  const levelId = input.levelId ?? manifest.id ?? 'terrain'
  const errors: string[] = []
  const warnings: string[] = []
  const collision = manifest.collision?.terrain
  const collisionContract = collision?.sourceContract
  const visualContract = manifest.visualChunks?.sourceContract

  if (!collision?.url) {
    errors.push(`${levelId}: terrain collision artifact is missing.`)
    return { errors, warnings }
  }
  if (!collisionContract) {
    errors.push(
      `${levelId}: terrain collision is missing sourceContract metadata.`,
    )
    return { errors, warnings }
  }

  if (!collisionContract.sourceAssetUrl) {
    errors.push(
      `${levelId}: terrain collision sourceContract.sourceAssetUrl is missing.`,
    )
  }
  if (
    !collisionContract.sourceAssetFingerprint?.value &&
    !collisionContract.heightmapFingerprint?.value
  ) {
    errors.push(
      `${levelId}: terrain collision sourceContract has no source hash.`,
    )
  }
  if (!isFiniteBounds(collisionContract.sourceBounds)) {
    errors.push(
      `${levelId}: terrain collision sourceContract.sourceBounds is missing or invalid.`,
    )
  }
  if (!isFiniteBounds(collisionContract.collisionCoverageBounds)) {
    errors.push(
      `${levelId}: terrain collision sourceContract.collisionCoverageBounds is missing or invalid.`,
    )
  }
  if (!collisionContract.sourceCoordinateSystem) {
    errors.push(
      `${levelId}: terrain collision source coordinate system is missing.`,
    )
  }
  if (!collisionContract.collisionBakeMode) {
    errors.push(`${levelId}: terrain collision bake mode is missing.`)
  }
  if (!collisionContract.role) {
    errors.push(`${levelId}: terrain collision role is missing.`)
  }
  if (!Number.isFinite(collisionContract.vertexCount)) {
    errors.push(`${levelId}: terrain collision vertex count is missing.`)
  }
  if (!Number.isFinite(collisionContract.triangleCount)) {
    errors.push(`${levelId}: terrain collision triangle count is missing.`)
  }

  const requiredVisualBounds =
    visualContract?.sourceBounds ?? collisionContract.sourceBounds
  if (
    !boundsOverlap(
      collisionContract.collisionCoverageBounds,
      requiredVisualBounds,
    )
  ) {
    errors.push(
      `${levelId}: terrain collision coverage does not overlap visual terrain bounds.`,
    )
  }
  if (
    !boundsContainPointXZ(
      collisionContract.collisionCoverageBounds,
      input.spawnPoint,
    )
  ) {
    errors.push(
      `${levelId}: player spawn is outside terrain collision coverage.`,
    )
  }

  if (visualContract) {
    if (
      visualContract.sourceAssetUrl &&
      collisionContract.sourceAssetUrl &&
      visualContract.sourceAssetUrl !== collisionContract.sourceAssetUrl
    ) {
      errors.push(
        `${levelId}: terrain render chunks and collision use different source assets.`,
      )
    }
    if (
      !fingerprintsMatch(
        visualContract.sourceAssetFingerprint,
        collisionContract.sourceAssetFingerprint,
      )
    ) {
      errors.push(
        `${levelId}: terrain render chunk source hash does not match collision source hash.`,
      )
    }
    if (
      visualContract.heightmapFingerprint?.value &&
      collisionContract.heightmapFingerprint?.value &&
      !fingerprintsMatch(
        visualContract.heightmapFingerprint,
        collisionContract.heightmapFingerprint,
      )
    ) {
      errors.push(
        `${levelId}: terrain render chunk heightmap hash does not match collision heightmap hash.`,
      )
    }
    if (visualContract.terrainSourceType === 'glb-chunk-terrain') {
      if (
        !GLB_TERRAIN_COLLISION_BAKE_MODES.has(
          String(collisionContract.collisionBakeMode),
        )
      ) {
        errors.push(
          `${levelId}: glb-chunk-terrain collision bake mode must be source-linked.`,
        )
      }
      if (
        !contractReferencesSourceAsset(
          collisionContract,
          visualContract.sourceAssetUrl,
        )
      ) {
        errors.push(
          `${levelId}: glb-chunk-terrain collision must reference the render chunk source asset.`,
        )
      }
      const visualSourceFingerprint =
        getContractFingerprintForSourceAsset(
          visualContract,
          visualContract.sourceAssetUrl,
        ) ?? visualContract.sourceAssetFingerprint
      const collisionSourceFingerprint = getContractFingerprintForSourceAsset(
        collisionContract,
        visualContract.sourceAssetUrl,
      )
      if (
        visualSourceFingerprint?.value &&
        !collisionSourceFingerprint?.value
      ) {
        errors.push(
          `${levelId}: glb-chunk-terrain collision must record the render chunk source hash.`,
        )
      } else if (
        visualSourceFingerprint?.value &&
        collisionSourceFingerprint?.value &&
        !fingerprintsMatch(visualSourceFingerprint, collisionSourceFingerprint)
      ) {
        errors.push(
          `${levelId}: glb-chunk-terrain collision source hash does not match render chunk source hash.`,
        )
      }
    }
    if (
      visualContract.terrainSourceType === 'glb-chunk-terrain' &&
      collisionContract.collisionBakeMode === 'heightfield-projection'
    ) {
      errors.push(
        `${levelId}: glb-chunk-terrain must use source-linked collision, not generic heightfield projection.`,
      )
    }
  } else {
    warnings.push(
      `${levelId}: terrain visual chunks have no sourceContract metadata to compare against collision.`,
    )
  }

  return { errors, warnings }
}

export function resolveTerrainRuntimeVisualContract(input: {
  manifest: TerrainManifest
  groundContract?: TerrainRuntimeGroundContractInput | null
}): TerrainRuntimeVisualContract {
  const explicitManifestRuntime = input.manifest.runtime
  const manifest = normalizeTerrainManifest(input.manifest)
  const groundContract = input.groundContract
  const diagnostics: string[] = []
  const manifestMode =
    manifest.runtime?.mode ?? getManifestRuntimeMode(manifest)
  const manifestVisualSource =
    manifest.runtime?.visualSource ?? getManifestVisualSource(manifest)
  const sceneVisualSource =
    groundContract?.terrainVisualSource ??
    canonicalRuntimeVisualSource(groundContract?.visualSource)
  const mode =
    explicitManifestRuntime?.mode ??
    groundContract?.terrainRuntimeMode ??
    manifestMode
  const visualSource =
    explicitManifestRuntime?.visualSource ??
    sceneVisualSource ??
    manifestVisualSource
  const fallbackSurfacePolicy =
    explicitManifestRuntime?.fallbackSurfacePolicy ??
    groundContract?.fallbackSurfacePolicy ??
    manifest.runtime?.fallbackSurfacePolicy ??
    (visualSource === 'heightmap-surface' ? 'always' : 'disabled')

  if (
    groundContract?.terrainRuntimeMode &&
    explicitManifestRuntime?.mode &&
    groundContract.terrainRuntimeMode !== explicitManifestRuntime.mode
  ) {
    diagnostics.push(
      `Terrain manifest runtime mode ${explicitManifestRuntime.mode} overrides scene runtime mode ${groundContract.terrainRuntimeMode}.`,
    )
  }

  if (
    sceneVisualSource &&
    explicitManifestRuntime?.visualSource &&
    sceneVisualSource !== explicitManifestRuntime.visualSource
  ) {
    diagnostics.push(
      `Terrain manifest visual source ${explicitManifestRuntime.visualSource} overrides scene ground visual source ${sceneVisualSource}.`,
    )
  }

  if (
    groundContract?.fallbackSurfacePolicy &&
    explicitManifestRuntime?.fallbackSurfacePolicy &&
    groundContract.fallbackSurfacePolicy !==
      explicitManifestRuntime.fallbackSurfacePolicy
  ) {
    diagnostics.push(
      `Terrain manifest fallback surface policy ${explicitManifestRuntime.fallbackSurfacePolicy} overrides scene fallback surface policy ${groundContract.fallbackSurfacePolicy}.`,
    )
  }

  if (
    (visualSource === 'generated-heightmap-chunks' ||
      visualSource === 'source-glb-chunks') &&
    !manifest.assets?.chunksPath
  ) {
    diagnostics.push(
      `Terrain visual source ${visualSource} requires assets.chunksPath.`,
    )
  }

  if (
    (visualSource === 'heightmap-surface' ||
      fallbackSurfacePolicy === 'until-required-chunks-ready' ||
      fallbackSurfacePolicy === 'always' ||
      fallbackSurfacePolicy === 'debug-only') &&
    !manifest.assets?.heightmap
  ) {
    diagnostics.push(
      'Terrain heightmap surface visuals are enabled, but assets.heightmap is missing.',
    )
  }
  if (
    (visualSource === 'generated-heightmap-chunks' ||
      visualSource === 'source-glb-chunks') &&
    fallbackSurfacePolicy === 'always'
  ) {
    diagnostics.push(
      'Chunk-based terrain visuals cannot use fallbackSurfacePolicy=always in production runtime.',
    )
  }

  return {
    mode,
    visualSource,
    fallbackSurfacePolicy,
    requiredChunkCount: manifest.visualChunks?.chunkCount,
    diagnostics,
  }
}

function getWorldSizeFromBounds(
  bounds: TerrainConfig['bounds'] | undefined,
  axis: 'x' | 'z',
) {
  if (!bounds) return undefined
  const index = axis === 'x' ? 0 : 2
  return bounds.max[index] - bounds.min[index]
}

function colorFactorToHex(factor: [number, number, number, number]) {
  const toHex = (component: number) =>
    Math.round(Math.max(0, Math.min(1, component)) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(factor[0])}${toHex(factor[1])}${toHex(factor[2])}`
}

function getVisualChunkMaterial(
  manifest: TerrainManifest,
): TerrainConfig['visualChunkMaterial'] {
  const material = manifest.visualChunks?.material
  if (!material) return undefined

  const opacity = material.baseColorFactor[3]
  return {
    color: colorFactorToHex(material.baseColorFactor),
    roughness: material.roughnessFactor,
    metalness: material.metallicFactor,
    opacity,
    transparent: opacity < 0.999,
  }
}

export function getHeightmapConfigUrl(manifest: TerrainManifest) {
  return manifest.assets?.heightmap?.replace('_heightmap.png', '_config.json')
}

export async function loadHeightmapConfig(manifest: TerrainManifest) {
  const heightmapConfigUrl = getHeightmapConfigUrl(manifest)
  if (!heightmapConfigUrl) return null

  const response = await fetch(heightmapConfigUrl)
  if (!response.ok) return null
  return normalizeHeightmapConfig((await response.json()) as HeightmapConfig)
}

export function normalizeHeightmapConfig(
  heightmapConfig: HeightmapConfig | null | undefined,
): HeightmapConfig | null {
  if (!heightmapConfig) return null

  const minHeight =
    heightmapConfig.minHeight ?? heightmapConfig.heightOffset ?? undefined
  const maxHeight =
    heightmapConfig.maxHeight ??
    (heightmapConfig.heightOffset !== undefined &&
    heightmapConfig.heightScale !== undefined
      ? heightmapConfig.heightOffset + heightmapConfig.heightScale
      : undefined)
  const worldSizeX =
    heightmapConfig.worldSizeX ??
    getWorldSizeFromBounds(heightmapConfig.bounds, 'x')
  const worldSizeZ =
    heightmapConfig.worldSizeZ ??
    getWorldSizeFromBounds(heightmapConfig.bounds, 'z')

  return {
    ...heightmapConfig,
    minHeight,
    maxHeight,
    worldSizeX,
    worldSizeZ,
  }
}

export function buildTerrainConfigFromManifest(
  manifest: TerrainManifest,
  heightmapConfig: HeightmapConfig | null = null,
): TerrainConfig {
  manifest = normalizeTerrainManifest(manifest)
  const normalizedHeightmapConfig = normalizeHeightmapConfig(heightmapConfig)
  const physics = manifest.physics ?? {}
  const bounds = normalizedHeightmapConfig?.bounds ?? physics.bounds
  const worldSize = physics.worldSize ?? 1
  const worldSizeX =
    normalizedHeightmapConfig?.worldSizeX ??
    physics.worldSizeX ??
    getWorldSizeFromBounds(bounds ?? undefined, 'x')
  const worldSizeZ =
    normalizedHeightmapConfig?.worldSizeZ ??
    physics.worldSizeZ ??
    getWorldSizeFromBounds(bounds ?? undefined, 'z')
  const minHeight =
    normalizedHeightmapConfig?.minHeight ?? physics.minHeight ?? 0
  const maxHeight =
    normalizedHeightmapConfig?.maxHeight ?? physics.maxHeight ?? minHeight
  const gridX = physics.gridX || 1
  const gridY = physics.gridY || 1
  const chunksPath = manifest.assets?.chunksPath
  const visualChunkLods = manifest.visualChunks?.lods ?? []
  const hasExplicitVisualChunkLods = visualChunkLods.length > 0

  return {
    heightmapUrl: manifest.assets?.heightmap ?? '',
    worldSize,
    worldSizeX,
    worldSizeZ,
    minHeight,
    maxHeight,
    bounds,
    collision: manifest.collision
      ?.terrain as unknown as TerrainConfig['collision'],
    chunkPathTemplate: chunksPath
      ? `${chunksPath}chunk_{x}_{z}_LOD{lod}.glb`
      : undefined,
    chunkSize: physics.chunkSize ?? worldSize / gridX,
    gridSize: [gridX, gridY],
    lods: hasExplicitVisualChunkLods
      ? visualChunkLods.map(lod => ({
          level: lod.level ?? 0,
          distance: lod.distance ?? worldSize * 2,
        }))
      : [{ level: 0, distance: worldSize * 2 }],
    visualChunkMaterial: getVisualChunkMaterial(manifest),
    chunkActivation: hasExplicitVisualChunkLods
      ? manifest.visualChunks?.activation
      : undefined,
  }
}

export function createTerrainRuntimeComponentData(input: {
  levelId: string
  source: TerrainRuntimeComponentSource
  manifest: TerrainManifest
  manifestUrl?: string
  heightmapConfig?: HeightmapConfig | null
  boundsFallback?: TerrainConfig['bounds'] | null
  groundContract?: TerrainRuntimeGroundContractInput | null
}): TerrainRuntimeComponentData {
  const manifest = normalizeTerrainManifest(input.manifest)
  const heightmapConfig = normalizeHeightmapConfig(
    input.heightmapConfig
      ? {
          ...input.heightmapConfig,
          bounds:
            input.heightmapConfig.bounds ?? input.boundsFallback ?? undefined,
        }
      : input.boundsFallback
        ? { bounds: input.boundsFallback }
        : null,
  )

  return {
    levelId: input.levelId,
    source: input.source,
    manifestUrl: input.manifestUrl,
    manifest,
    heightmapConfig,
    config: buildTerrainConfigFromManifest(manifest, heightmapConfig),
    runtime: {
      collisionStrategy: 'baked-terrain-mesh',
      visualContract: resolveTerrainRuntimeVisualContract({
        manifest,
        groundContract: input.groundContract,
      }),
    },
  }
}

export async function loadTerrainRuntimeComponentData(input: {
  levelId: string
  source: TerrainRuntimeComponentSource
  manifest: TerrainManifest
  manifestUrl?: string
  boundsFallback?: TerrainConfig['bounds'] | null
  groundContract?: TerrainRuntimeGroundContractInput | null
}): Promise<TerrainRuntimeComponentData> {
  const heightmapConfig = await loadHeightmapConfig(input.manifest)

  return createTerrainRuntimeComponentData({
    ...input,
    heightmapConfig,
  })
}
