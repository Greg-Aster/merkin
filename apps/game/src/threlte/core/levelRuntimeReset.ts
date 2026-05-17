import { resetRuntimeAtmosphere } from '../atmosphere/runtimeAtmosphereStore'
import { resetRuntimeNpcRegistry } from '../features/npc/runtimeNpcRegistry'
import { terrainActions } from '../features/terrain/terrainStore'
import { resetPostProcessingState } from '../stores/postProcessingStore'
import { resetRuntimeVisualStyle } from '../styles/runtimeVisualStyleStore'
import { clearGltfCache } from '../utils/gltfAssetCache'

export interface LevelRuntimeResetServices {
  interactionSystem?: {
    clearInteractiveObjects?: () => void
  } | null
}

export function resetLevelRuntime(services: LevelRuntimeResetServices = {}) {
  services.interactionSystem?.clearInteractiveObjects?.()
  resetRuntimeNpcRegistry()

  terrainActions.reset()
  resetPostProcessingState()
  resetRuntimeAtmosphere()
  resetRuntimeVisualStyle()
  clearGltfCache()
}
