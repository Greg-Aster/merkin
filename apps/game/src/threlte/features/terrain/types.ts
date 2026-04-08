/**
 * Terrain Feature Types
 */

import type { TerrainManager, TerrainConfig, TerrainChunk } from './TerrainManager'

export type { TerrainConfig, TerrainChunk }

export interface TerrainState {
  isReady: boolean
  heightData: Float32Array | null
  resolution: number
  worldSize: number
  bounds: { min: [number, number, number], max: [number, number, number] } | null
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