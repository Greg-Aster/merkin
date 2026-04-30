import type { ActorDefinition, LevelDefinition, Vec3 } from './types'

export interface ComponentTerrainDefinitionInput {
  id?: string
  name?: string
  manifestUrl?: string
  heightmapUrl?: string
  worldSize?: number
  worldSizeX?: number
  worldSizeZ?: number
  bounds?: {
    min: Vec3
    max: Vec3
  }
}

export interface ComponentLevelDefinitionInput {
  levelId: string
  title?: string
  version?: number
  updatedAt?: string
  spawn: Vec3
  settings?: Record<string, unknown>
  terrain?: ComponentTerrainDefinitionInput | null
  systemActorIds?: string[]
}

function getTerrainSize(terrain: ComponentTerrainDefinitionInput): Vec3 {
  if (terrain.bounds) {
    return [
      Math.max(0.05, terrain.bounds.max[0] - terrain.bounds.min[0]),
      Math.max(0.05, terrain.bounds.max[1] - terrain.bounds.min[1]),
      Math.max(0.05, terrain.bounds.max[2] - terrain.bounds.min[2]),
    ]
  }

  const worldSize = terrain.worldSize ?? 1
  return [
    Math.max(0.05, terrain.worldSizeX ?? worldSize),
    1,
    Math.max(0.05, terrain.worldSizeZ ?? worldSize),
  ]
}

function createTerrainActor(
  levelId: string,
  terrain: ComponentTerrainDefinitionInput,
): ActorDefinition {
  return {
    id: terrain.id ?? `${levelId}-terrain`,
    name: terrain.name ?? `${levelId} Terrain`,
    kind: 'terrain',
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    terrain: {
      source: {
        kind: 'heightmap',
        url: terrain.heightmapUrl,
        generated: false,
      },
      worldSize: terrain.worldSize,
      worldSizeX: terrain.worldSizeX,
      worldSizeZ: terrain.worldSizeZ,
      bounds: terrain.bounds,
    },
    physics: {
      bodyType: 'fixed',
      collision: {
        intent: 'walkable',
        channel: 'worldStatic',
        shape: 'cuboid',
        size: getTerrainSize(terrain),
        friction: 0.9,
        restitution: 0,
        sensor: false,
      },
    },
    editor: {
      collisionSource: 'authored',
      runtimeSource: 'component-level',
      manifestUrl: terrain.manifestUrl,
    },
  }
}

export function createComponentLevelDefinition(
  input: ComponentLevelDefinitionInput,
): LevelDefinition {
  const terrainActor = input.terrain
    ? [createTerrainActor(input.levelId, input.terrain)]
    : []
  const spawnActor: ActorDefinition = {
    id: `${input.levelId}-player-spawn`,
    name: `${input.title ?? input.levelId} Player Spawn`,
    kind: 'playerSpawn',
    transform: {
      position: input.spawn,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    spawnPoint: {
      entityType: 'player',
      priority: 0,
    },
  }
  const systemActors: ActorDefinition[] = (input.systemActorIds ?? []).map(
    actorId => ({
      id: actorId,
      name: actorId,
      kind: 'empty',
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      editor: {
        runtimeSource: 'component-system',
      },
    }),
  )

  return {
    id: input.levelId,
    title: input.title,
    version: input.version ?? 1,
    updatedAt: input.updatedAt,
    spawn: {
      player: input.spawn,
    },
    settings: input.settings,
    actors: [...terrainActor, spawnActor, ...systemActors],
  }
}
