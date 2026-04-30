import { terrainActions } from '../features/terrain'
import { resetPostProcessingState } from '../stores/postProcessingStore'
import { resetRuntimeVisualStyle } from '../styles/runtimeVisualStyleStore'
import { clearGltfCache } from '../utils/gltfAssetCache'

export interface LevelRuntimeResetServices {
  interactionSystem?: {
    clearInteractiveObjects?: () => void
  } | null
  spawnSystem?: {
    resetSpawnState?: () => void
  } | null
}

export function resetLevelRuntime(services: LevelRuntimeResetServices = {}) {
  services.interactionSystem?.clearInteractiveObjects?.()
  services.spawnSystem?.resetSpawnState?.()

  terrainActions.reset()
  resetPostProcessingState()
  resetRuntimeVisualStyle()
  clearGltfCache()
}
