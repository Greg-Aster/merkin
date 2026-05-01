import type { TerrainConfig } from './TerrainManager'

export type TerrainRuntimeComponentSource =
  | 'built-in-manifest'
  | 'editor-manifest'
  | 'generated-heightmap'

export type TerrainManifest = {
  assets?: {
    heightmap?: string
    chunksPath?: string
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
    terrain?: TerrainConfig['collision']
  }
  visualChunks?: {
    lods?: Array<{ level: number; distance: number; resolution?: number }>
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
    showVisualChunks: boolean
    showVisualSurface: boolean
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

  return {
    heightmapUrl: manifest.assets?.heightmap ?? '',
    worldSize,
    worldSizeX,
    worldSizeZ,
    minHeight,
    maxHeight,
    bounds,
    collision: manifest.collision?.terrain,
    chunkPathTemplate: chunksPath
      ? `${chunksPath}chunk_{x}_{z}_LOD{lod}.glb`
      : undefined,
    chunkSize: physics.chunkSize ?? worldSize / gridX,
    gridSize: [gridX, gridY],
    lods: manifest.visualChunks?.lods?.length
      ? manifest.visualChunks.lods.map(lod => ({
          level: lod.level,
          distance: lod.distance,
        }))
      : [{ level: 0, distance: worldSize * 2 }],
    chunkActivation: manifest.visualChunks?.activation,
  }
}

export function createTerrainRuntimeComponentData(input: {
  levelId: string
  source: TerrainRuntimeComponentSource
  manifest: TerrainManifest
  manifestUrl?: string
  heightmapConfig?: HeightmapConfig | null
  boundsFallback?: TerrainConfig['bounds'] | null
  showVisualChunks?: boolean
  showVisualSurface?: boolean
}): TerrainRuntimeComponentData {
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
    manifest: input.manifest,
    heightmapConfig,
    config: buildTerrainConfigFromManifest(input.manifest, heightmapConfig),
    runtime: {
      collisionStrategy: 'baked-terrain-mesh',
      showVisualChunks: input.showVisualChunks ?? true,
      showVisualSurface: input.showVisualSurface ?? true,
    },
  }
}

export async function loadTerrainRuntimeComponentData(input: {
  levelId: string
  source: TerrainRuntimeComponentSource
  manifest: TerrainManifest
  manifestUrl?: string
  boundsFallback?: TerrainConfig['bounds'] | null
  showVisualChunks?: boolean
  showVisualSurface?: boolean
}): Promise<TerrainRuntimeComponentData> {
  const heightmapConfig = await loadHeightmapConfig(input.manifest)

  return createTerrainRuntimeComponentData({
    ...input,
    heightmapConfig,
  })
}
