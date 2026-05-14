/**
 * Terrain Feature Types
 */

import type {
  TerrainChunk,
  TerrainConfig,
  TerrainManager,
  TerrainSourceContract,
} from './TerrainManager'

export type { TerrainConfig, TerrainChunk }

export interface TerrainState {
  isReady: boolean
  heightData: Float32Array | null
  resolution: number
  worldSize: number
  bounds: {
    min: [number, number, number]
    max: [number, number, number]
  } | null
  visibleChunks: TerrainChunk[]
  manager: TerrainManager | null
  error: string | null
}

export interface TerrainStats {
  memoryUsage: number
  resolution: string
  sampleCount: number
  chunksVisible: number
}

export interface TerrainRuntimeReadyDetail {
  source: 'baked-collider'
  heightmapUrl: string
  heightmapReady: boolean
  collisionReady: boolean
  visualReady?: boolean
  bounds: TerrainState['bounds']
  resolution: number
  worldSize: number
  worldSizeX?: number
  worldSizeZ?: number
  visual?: {
    authoritativeSource: string
    fallbackSurfacePolicy: string
    fallbackSurfaceActive: boolean
    activeChunkCount?: number
    loadedChunkCount?: number
    failedChunkCount?: number
  }
  collision?: {
    type: 'baked-terrain-mesh'
    authoredException: true
    url: string
    sourceResolution: number
    colliderResolution: number
    sampleStep: number
    triangleCount: number
    sourceContract?: TerrainSourceContract
  }
}
