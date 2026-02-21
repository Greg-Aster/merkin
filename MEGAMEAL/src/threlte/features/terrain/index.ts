/**
 * Terrain Feature - Public API
 * 
 * Unified terrain system that consolidates:
 * - Visual chunk rendering with LOD
 * - Physics collision from heightmap
 * - Height queries for gameplay
 */

// Main terrain component
export { default as Terrain } from './Terrain.svelte'

// Core terrain manager
export { TerrainManager } from './TerrainManager'

// Stores and state
export { terrainStore, terrainStatsStore, terrainActions } from './terrainStore'

// Types
export type { TerrainConfig, TerrainChunk, TerrainState, TerrainStats } from './types'