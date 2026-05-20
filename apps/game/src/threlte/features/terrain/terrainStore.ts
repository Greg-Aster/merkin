/**
 * Terrain Feature Store
 */

import { derived, writable } from 'svelte/store'
import type { TerrainState, TerrainStats } from './types'

const initialState: TerrainState = {
  isReady: false,
  resolution: 0,
  worldSize: 0,
  bounds: null,
  visibleChunks: [],
  manager: null,
  error: null,
}

export const terrainStore = writable<TerrainState>(initialState)

// Derived store for terrain statistics
export const terrainStatsStore = derived(
  terrainStore,
  ($terrain): TerrainStats => ({
    memoryUsage: 0,
    resolution: $terrain.resolution
      ? `${$terrain.resolution}x${$terrain.resolution}`
      : '0x0',
    sampleCount: 0,
    chunksVisible: $terrain.visibleChunks.length,
  }),
)

// Terrain actions
export const terrainActions = {
  reset: () => {
    terrainStore.set(initialState)
  },

  setError: (error: string) => {
    terrainStore.update(state => ({ ...state, error }))
  },

  clearError: () => {
    terrainStore.update(state => ({ ...state, error: null }))
  },
}
