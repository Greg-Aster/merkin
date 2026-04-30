import type { CollisionIntent } from './types'

export type CollisionRole =
  | 'ground'
  | 'platform'
  | 'blocker'
  | 'sensor'
  | 'visualOnly'
  | 'detail'

export type TerrainCollisionSource = 'heightmap' | 'scene-authored' | 'none'

export interface LevelCollisionWorkflow {
  levelId: string
  terrainCollision: TerrainCollisionSource
  terrainManifestUrl?: string
  terrainSculpting?: boolean
  visualOnlyActorIds?: string[]
  groundActorIds?: string[]
  platformActorIds?: string[]
  sensorActorIds?: string[]
  detailActorIds?: string[]
}

const DEFAULT_WORKFLOW: LevelCollisionWorkflow = {
  levelId: 'default',
  terrainCollision: 'scene-authored',
}

export const LEVEL_COLLISION_WORKFLOWS: Record<string, LevelCollisionWorkflow> =
  {
    observatory: {
      levelId: 'observatory',
      terrainCollision: 'heightmap',
      terrainManifestUrl: '/terrain/observatory-environment.manifest.json',
      terrainSculpting: true,
    },
    solitude: {
      levelId: 'solitude',
      terrainCollision: 'heightmap',
      terrainManifestUrl: '/terrain/solitude.manifest.json',
      visualOnlyActorIds: ['solitude-ground-plateau', 'solitude-ground-dais'],
    },
    yggdrasil: {
      levelId: 'yggdrasil',
      terrainCollision: 'heightmap',
      terrainManifestUrl: '/terrain/yggdrasil.manifest.json',
      visualOnlyActorIds: [
        'yggdrasil-mound',
        'yggdrasil-bifrost-ribbon-merged',
      ],
      groundActorIds: [
        'yggdrasil-ground',
        'yggdrasil-island-shelf',
        'yggdrasil-dais',
        'yggdrasil-bifrost-path',
        'yggdrasil-spawn-pad',
      ],
    },
    miranda: {
      levelId: 'miranda',
      terrainCollision: 'scene-authored',
    },
    'sci-fi-room': {
      levelId: 'sci-fi-room',
      terrainCollision: 'heightmap',
      terrainManifestUrl: '/terrain/sci-fi-room.manifest.json',
    },
  }

const LEVEL_ID_PREFIXES = Object.keys(LEVEL_COLLISION_WORKFLOWS).sort(
  (a, b) => b.length - a.length,
)

function hasActorId(
  workflow: LevelCollisionWorkflow,
  key: keyof LevelCollisionWorkflow,
  actorId: string,
) {
  const actorIds = workflow[key]
  return Array.isArray(actorIds) && actorIds.includes(actorId)
}

export function inferLevelIdFromActorId(actorId: string) {
  return LEVEL_ID_PREFIXES.find(levelId => actorId.startsWith(`${levelId}-`))
}

export function getLevelCollisionWorkflow(levelId?: string | null) {
  if (!levelId) return DEFAULT_WORKFLOW
  return (
    LEVEL_COLLISION_WORKFLOWS[levelId] ?? {
      ...DEFAULT_WORKFLOW,
      levelId,
    }
  )
}

export function getActorCollisionRole(input: {
  actorId: string
  levelId?: string | null
  sensor?: boolean
  shape?: string
}): CollisionRole {
  const levelId = input.levelId ?? inferLevelIdFromActorId(input.actorId)
  const workflow = getLevelCollisionWorkflow(levelId)

  if (hasActorId(workflow, 'visualOnlyActorIds', input.actorId)) {
    return 'visualOnly'
  }
  if (input.sensor || hasActorId(workflow, 'sensorActorIds', input.actorId)) {
    return 'sensor'
  }
  if (hasActorId(workflow, 'groundActorIds', input.actorId)) {
    return 'ground'
  }
  if (hasActorId(workflow, 'platformActorIds', input.actorId)) {
    return 'platform'
  }
  if (
    input.shape === 'trimesh' ||
    hasActorId(workflow, 'detailActorIds', input.actorId)
  ) {
    return 'detail'
  }
  return 'blocker'
}

export function getCollisionIntentForRole(
  role: CollisionRole,
): CollisionIntent {
  switch (role) {
    case 'ground':
    case 'platform':
      return 'walkable'
    case 'sensor':
      return 'trigger'
    case 'detail':
      return 'detailMesh'
    case 'visualOnly':
      return 'none'
    default:
      return 'blocker'
  }
}
