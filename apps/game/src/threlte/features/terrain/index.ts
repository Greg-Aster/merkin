/**
 * Terrain Feature - Public API
 *
 * Unified terrain system that consolidates:
 * - Visual chunk rendering with LOD
 * - Physics collision from baked source-linked collider assets
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
  loadTerrainRuntimeComponentData,
} from './terrainManifest'

export type {
  TerrainManifest,
  TerrainRuntimeComponentData,
  TerrainRuntimeComponentSource,
  TerrainRuntimeVisualContract,
} from './terrainManifest'

// Types
export type {
  TerrainConfig,
  TerrainChunk,
  TerrainState,
  TerrainStats,
  TerrainRuntimeReadyDetail,
} from './types'
