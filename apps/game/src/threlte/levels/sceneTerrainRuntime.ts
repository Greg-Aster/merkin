import type { SceneSettings } from '../engine/sceneDocumentTypes'
import type { TerrainRuntimeComponentSource } from '../features/terrain/terrainManifest'

type SceneTerrainRuntimeSource = 'source-glb'

type SceneTerrainCollisionSettings = {
  source?: string
  runtimeSource?: TerrainRuntimeComponentSource
  manifestUrl?: string
}

const TERRAIN_RUNTIME_SOURCES = new Set<string>([
  'source-glb',
] satisfies SceneTerrainRuntimeSource[])

function getTerrainCollisionSettings(
  settings: SceneSettings,
): SceneTerrainCollisionSettings | undefined {
  return settings.level?.collision?.terrain as
    | SceneTerrainCollisionSettings
    | undefined
}

export function getSceneTerrainRuntimeRequest(settings: SceneSettings) {
  const terrainSettings = getTerrainCollisionSettings(settings)
  const manifestUrl = terrainSettings?.manifestUrl?.trim()
  if (
    !manifestUrl ||
    !TERRAIN_RUNTIME_SOURCES.has(String(terrainSettings?.source))
  ) {
    return null
  }

  return {
    manifestUrl,
    source: terrainSettings?.runtimeSource ?? 'editor-manifest',
  }
}
