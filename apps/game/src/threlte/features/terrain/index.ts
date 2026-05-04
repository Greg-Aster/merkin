/**
 * Terrain Feature - Public API
 *
 * Unified terrain system that consolidates:
 * - Visual chunk rendering with LOD
 * - Physics collision from heightmap
 * - Height queries for gameplay
 */

export { default as TerrainRuntime } from './TerrainRuntime.svelte'

// Core terrain manager
export { TerrainManager } from './TerrainManager'

// Stores and state
export { terrainStore, terrainStatsStore, terrainActions } from './terrainStore'

// Manifest helpers
export {
  buildTerrainConfigFromManifest,
  createTerrainRuntimeComponentData,
  getHeightmapConfigUrl,
  loadHeightmapConfig,
  loadTerrainRuntimeComponentData,
  normalizeHeightmapConfig,
} from './terrainManifest'

export type {
  HeightmapConfig,
  TerrainManifest,
  TerrainRuntimeComponentData,
  TerrainRuntimeComponentSource,
} from './terrainManifest'

// Types
export type {
  TerrainConfig,
  TerrainChunk,
  TerrainState,
  TerrainStats,
  TerrainRuntimeReadyDetail,
} from './types'
