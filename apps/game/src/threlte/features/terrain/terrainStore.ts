/**
 * Terrain Feature Store
 */

import { writable, derived } from 'svelte/store'
import type { TerrainState, TerrainStats } from './types'

const initialState: TerrainState = {
  isReady: false,
  heightData: null,
  resolution: 0,
  worldSize: 0,
  bounds: null,
  visibleChunks: [],
  manager: null,
  error: null
}

export const terrainStore = writable<TerrainState>(initialState)

// Derived store for terrain statistics
export const terrainStatsStore = derived(
  terrainStore,
  ($terrain): TerrainStats => ({
    memoryUsage: $terrain.heightData ? $terrain.heightData.length * 4 : 0,
    resolution: $terrain.resolution ? `${$terrain.resolution}x${$terrain.resolution}` : '0x0',
    sampleCount: $terrain.heightData ? $terrain.heightData.length : 0,
    chunksVisible: $terrain.visibleChunks.length
  })
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
  }
}