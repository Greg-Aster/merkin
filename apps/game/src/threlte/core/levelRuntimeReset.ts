import { resetRuntimeAtmosphere } from '../atmosphere/runtimeAtmosphereStore'
import { resetRuntimeNpcRegistry } from '../features/npc/runtimeNpcRegistry'
import { terrainActions } from '../features/terrain/terrainStore'
import { resetPostProcessingState } from '../stores/postProcessingStore'
import { resetRuntimeVisualStyle } from '../styles/runtimeVisualStyleStore'
import { evictUnusedGltfCacheEntries } from '../utils/gltfAssetCache'

export interface LevelRuntimeResetServices {
  interactionSystem?: {
    clearInteractiveObjects?: () => void
  } | null
}

export function clearLevelRuntimeInteractionState(
  services: LevelRuntimeResetServices = {},
) {
  services.interactionSystem?.clearInteractiveObjects?.()
  resetRuntimeNpcRegistry()
}

export function resetLevelRuntimeResources() {
  terrainActions.reset()
  resetPostProcessingState()
  resetRuntimeAtmosphere()
  resetRuntimeVisualStyle()
  evictUnusedGltfCacheEntries({
    maxUnreferencedEntries: 0,
    maxUnusedAgeMs: 0,
    maxUnreferencedBytes: 0,
    memoryPressure: 'high',
  })
}

export function resetLevelRuntime(services: LevelRuntimeResetServices = {}) {
  clearLevelRuntimeInteractionState(services)
  resetLevelRuntimeResources()
}
