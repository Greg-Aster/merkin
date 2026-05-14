import type { LevelDefinition } from './types'

function hasString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function hasTerrainRuntimeCollision(
  level: LevelDefinition,
  options: {
    runtimeTerrainManifestUrl?: string | null
  } = {},
) {
  const terrain = (level.settings as any)?.level?.collision?.terrain
  const ground = (level.settings as any)?.level?.ground

  return Boolean(
    hasString(options.runtimeTerrainManifestUrl) ||
      ((terrain?.source === 'baked-heightmap' ||
        terrain?.source === 'source-glb') &&
        hasString(terrain.manifestUrl)) ||
      ((ground?.collisionSource === 'baked-heightfield' ||
        ground?.collisionSource === 'source-linked-terrain-collision') &&
        hasString(ground.terrainManifestUrl)),
  )
}
