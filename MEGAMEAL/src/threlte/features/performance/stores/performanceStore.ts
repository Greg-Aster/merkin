import { writable } from 'svelte/store'
import type { Writable } from 'svelte/store'

// Import the manager and its types
import { optimizationManager, type QualitySettings } from '../OptimizationManager'

// --- Part 1: Performance Monitoring (For UI/Debug Panels) ---

export interface MemoryInfo {
  geometries: number;
  textures: number;
  programs: number;
}

export const fpsStore: Writable<number> = writable(60)
export const frameTimeStore: Writable<number> = writable(16.67) // 60fps = 16.67ms
export const memoryStore: Writable<MemoryInfo> = writable({
  geometries: 0,
  textures: 0,
  programs: 0,
})
export const renderInfoStore: Writable<{calls: number, triangles: number}> = writable({
  calls: 0,
  triangles: 0
})
export const performanceGradeStore: Writable<string> = writable('A')
export const performanceScoreStore: Writable<number> = writable(100)
export const optimizationRecommendationsStore: Writable<string[]> = writable([])

// --- Part 2: Performance Configuration (For Driving Component Logic) ---

/**
 * This store holds the detailed object with all quality settings.
 * Components will subscribe to this to configure themselves reactively.
 */
export const qualitySettingsStore: Writable<QualitySettings> = writable(
  optimizationManager.getQualitySettings()
)

/**
 * This store holds the name of the current level (e.g., "medium").
 * Useful for displaying the current level in the UI.
 */
export const qualityLevelStore: Writable<string> = writable(
  optimizationManager.getOptimizationLevel()
)

// --- Part 3: Connect the Manager to the Stores ---

// This listener automatically updates our stores whenever the OptimizationManager
// changes the quality level. This is the bridge between the two systems.
if (typeof window !== 'undefined') {
  window.addEventListener('optimizationLevelChanged', (event: any) => {
    const { qualitySettings, level } = event.detail
    
    // Update both the detailed settings store and the level name store
    qualitySettingsStore.set(qualitySettings)
    qualityLevelStore.set(level)
  })
}
