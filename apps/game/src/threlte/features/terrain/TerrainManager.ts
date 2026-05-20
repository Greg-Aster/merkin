import * as THREE from 'three'
import { OptimizationLevel, optimizationManager } from '../performance'

export type TerrainSourceContract = {
  schemaVersion?: number
  terrainSourceType?: 'glb-chunk-terrain' | 'scene-authored-collision'
  sourceAssetUrl?: string
  sourceAssetUrls?: string[]
  authoredSourceAssetUrls?: string[]
  sourceAssetFingerprint?: {
    algorithm?: string
    value?: string
  }
  sourceAssetFingerprints?: Array<{
    url?: string
    fingerprint?: {
      algorithm?: string
      value?: string
    }
  }>
  sourceCoordinateSystem?: string
  sourceBounds?: {
    min: [number, number, number]
    max: [number, number, number]
  }
  renderBakeMode?: 'source-glb-chunk-mesh'
  collisionBakeMode?:
    | 'source-glb-collision-mesh'
    | 'dedicated-collision-glb'
    | 'simplified-source-glb'
    | 'selected-terrain-walkable-mesh'
    | 'scene-authored-collision'
  collisionMeshSource?: {
    type?: 'dedicated-glb' | 'source-glb' | 'scene-actors'
    url?: string
    fingerprint?: {
      algorithm?: string
      value?: string
    }
  }
  collisionCoverageBounds?: {
    min: [number, number, number]
    max: [number, number, number]
  }
  role?: 'walkable' | 'blocker' | 'detail'
  vertexCount?: number
  triangleCount?: number
}

export interface TerrainConfig {
  worldSize: number
  worldSizeX?: number
  worldSizeZ?: number
  minHeight: number
  maxHeight: number
  bounds?: { min: [number, number, number]; max: [number, number, number] }
  collision?: {
    type: 'baked-terrain-mesh'
    sourceLinked?: true
    url: string
    metadataUrl?: string
    triangleCount?: number
    vertexCount?: number
    colliderResolution?: number
    sampleStep?: number
    bounds?: { min: [number, number, number]; max: [number, number, number] }
    center?: [number, number, number]
    sourceContract?: TerrainSourceContract
  }
  chunkPathTemplate?: string
  chunkSize?: number
  gridSize?: [number, number]
  lods?: Array<{ level: number; distance: number }>
  visualChunkMaterial?: {
    color?: string
    roughness?: number
    metalness?: number
    opacity?: number
    transparent?: boolean
  }
  chunkActivation?: {
    maxActiveChunks?: number
    maxActiveChunksByTier?: Partial<Record<OptimizationLevel, number>>
  }
}

export interface TerrainChunk {
  id: string
  x: number
  z: number
  position: THREE.Vector3
  currentLod: number
}

export interface PerformanceStats {
  lastGenerationTime: number
  memoryUsage: number
  resolution: string
  sampleCount: number
}

export class TerrainManager {
  private config: TerrainConfig | null = null
  private chunks: TerrainChunk[] = []
  private isReady = false

  public async initialize(config: TerrainConfig): Promise<void> {
    this.config = config
    this.validateCoordinateSystem(config)
    this.initializeChunks()
    this.isReady = true
  }

  private validateCoordinateSystem(config: TerrainConfig): void {
    const issues: string[] = []

    if (!config.bounds) {
      issues.push(
        'No terrain bounds data; falling back to centered chunk coordinates.',
      )
    } else {
      const boundsWorldSizeX = config.bounds.max[0] - config.bounds.min[0]
      const boundsWorldSizeZ = config.bounds.max[2] - config.bounds.min[2]
      const maxDimension = Math.max(boundsWorldSizeX, boundsWorldSizeZ)

      if (Math.abs(config.worldSize - maxDimension) > 0.1) {
        issues.push(
          `WorldSize mismatch: config.worldSize=${config.worldSize.toFixed(2)} but bounds suggest ${maxDimension.toFixed(2)}`,
        )
      }

      const hasExplicitRectangularSize =
        config.worldSizeX !== undefined || config.worldSizeZ !== undefined
      const aspectRatio = boundsWorldSizeX / boundsWorldSizeZ
      if (Math.abs(aspectRatio - 1.0) > 0.05 && !hasExplicitRectangularSize) {
        issues.push(
          `Rectangular terrain detected: ${boundsWorldSizeX.toFixed(1)}x${boundsWorldSizeZ.toFixed(1)} (aspect ratio: ${aspectRatio.toFixed(2)})`,
        )
      }
    }

    if (issues.length > 0) {
      console.warn('Terrain coordinate validation issues:', issues)
    }
  }

  private initializeChunks(): void {
    if (!this.config?.gridSize || !this.config.chunkSize) return

    const [gridX, gridZ] = this.config.gridSize
    const bounds = this.config.bounds
    const chunkSizeX = bounds
      ? (bounds.max[0] - bounds.min[0]) / gridX
      : this.config.chunkSize
    const chunkSizeZ = bounds
      ? (bounds.max[2] - bounds.min[2]) / gridZ
      : this.config.chunkSize
    if (!chunkSizeX || !chunkSizeZ) return

    this.chunks = []
    for (let x = 0; x < gridX; x++) {
      for (let z = 0; z < gridZ; z++) {
        const centerX = bounds
          ? bounds.min[0] + (x + 0.5) * chunkSizeX
          : (x - gridX / 2 + 0.5) * chunkSizeX
        const centerZ = bounds
          ? bounds.min[2] + (z + 0.5) * chunkSizeZ
          : (z - gridZ / 2 + 0.5) * chunkSizeZ

        this.chunks.push({
          id: `chunk_${x}_${z}`,
          x,
          z,
          position: new THREE.Vector3(centerX, 0, centerZ),
          currentLod: -1,
        })
      }
    }
  }

  public getVisibleChunks(playerPosition: THREE.Vector3): TerrainChunk[] {
    if (!this.config?.lods || this.chunks.length === 0) return []

    const candidates: Array<{ chunk: TerrainChunk; distance: number }> = []

    for (const chunk of this.chunks) {
      const distance = Math.hypot(
        playerPosition.x - chunk.position.x,
        playerPosition.z - chunk.position.z,
      )
      let nextLod = -1

      for (let index = this.config.lods.length - 1; index >= 0; index -= 1) {
        if (distance < this.config.lods[index].distance) {
          nextLod = this.config.lods[index].level
        }
      }

      chunk.currentLod = nextLod
      if (nextLod !== -1) candidates.push({ chunk, distance })
    }

    const maxActiveChunks = this.getMaxActiveChunks()
    if (maxActiveChunks && candidates.length > maxActiveChunks) {
      const activeChunks = new Set(
        candidates
          .sort((left, right) => left.distance - right.distance)
          .slice(0, maxActiveChunks)
          .map(candidate => candidate.chunk.id),
      )

      for (const chunk of this.chunks) {
        if (!activeChunks.has(chunk.id)) chunk.currentLod = -1
      }
    }

    return candidates
      .filter(candidate => candidate.chunk.currentLod !== -1)
      .sort((left, right) => left.distance - right.distance)
      .map(candidate => candidate.chunk)
  }

  private getMaxActiveChunks(): number | null {
    if (!this.config?.chunkActivation) return null
    if (this.chunks.length <= 16) return null

    const currentLevel = optimizationManager.getOptimizationLevel()
    const tierLimit =
      this.config.chunkActivation.maxActiveChunksByTier?.[currentLevel]
    const configuredLimit =
      tierLimit ?? this.config.chunkActivation.maxActiveChunks

    if (!Number.isFinite(configuredLimit) || configuredLimit! <= 0) {
      return null
    }

    return Math.floor(configuredLimit!)
  }

  public getHeightAt(worldX: number, worldZ: number): number {
    const bounds = this.config?.bounds
    if (
      bounds &&
      worldX >= bounds.min[0] &&
      worldX <= bounds.max[0] &&
      worldZ >= bounds.min[2] &&
      worldZ <= bounds.max[2]
    ) {
      return bounds.min[1]
    }
    return this.config?.minHeight ?? 0
  }

  public getOptimalResolution(): number {
    return 0
  }

  public getIsReady(): boolean {
    return this.isReady
  }

  public getResolution(): number {
    return 0
  }

  public getWorldSize(): number {
    return this.config?.worldSize || 0
  }

  public getWorldSizeX(): number {
    if (this.config?.worldSizeX) return this.config.worldSizeX
    if (this.config?.bounds) {
      return this.config.bounds.max[0] - this.config.bounds.min[0]
    }
    return this.config?.worldSize || 0
  }

  public getWorldSizeZ(): number {
    if (this.config?.worldSizeZ) return this.config.worldSizeZ
    if (this.config?.bounds) {
      return this.config.bounds.max[2] - this.config.bounds.min[2]
    }
    return this.config?.worldSize || 0
  }

  public getBounds(): {
    min: [number, number, number]
    max: [number, number, number]
  } | null {
    return this.config?.bounds || null
  }

  public getMinHeight(): number {
    return this.config?.minHeight ?? 0
  }

  public getMaxHeight(): number {
    return this.config?.maxHeight ?? 0
  }

  public getStats(): PerformanceStats {
    return {
      lastGenerationTime: 0,
      memoryUsage: 0,
      resolution: 'source-bounds',
      sampleCount: this.chunks.length,
    }
  }

  public clear(): void {
    this.config = null
    this.chunks = []
    this.isReady = false
  }
}
