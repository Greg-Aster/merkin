import type { EditorSceneSettings } from './sceneDocumentTypes'
import type { CollisionIntent } from './types'

export type CollisionRole =
  | 'ground'
  | 'platform'
  | 'blocker'
  | 'sensor'
  | 'visualOnly'
  | 'detail'

export type TerrainCollisionSource = 'heightmap' | 'scene-authored' | 'none'
export type CollisionDefaultPolicy =
  | 'lightweight-auto'
  | 'authored-only'
  | 'none'
export type CollisionBudget = 'mobile' | 'balanced' | 'desktop'

export interface LevelCollisionWorkflow {
  levelId: string
  terrainCollision: TerrainCollisionSource
  terrainManifestUrl?: string
  terrainSculpting?: boolean
  autoBakeTerrain?: boolean
  defaultActorCollision: CollisionDefaultPolicy
  colliderBudget: CollisionBudget
  terrainVisualChunks?: 'auto' | 'manual' | 'off'
  visualOnlyActorIds?: string[]
  groundActorIds?: string[]
  platformActorIds?: string[]
  sensorActorIds?: string[]
  detailActorIds?: string[]
}

const DEFAULT_WORKFLOW: LevelCollisionWorkflow = {
  levelId: 'default',
  terrainCollision: 'scene-authored',
  defaultActorCollision: 'lightweight-auto',
  colliderBudget: 'mobile',
  autoBakeTerrain: true,
  terrainVisualChunks: 'auto',
}

export const LEVEL_COLLISION_WORKFLOWS: Record<string, LevelCollisionWorkflow> =
  {
    observatory: {
      levelId: 'observatory',
      terrainCollision: 'heightmap',
      terrainManifestUrl: '/terrain/observatory-environment.manifest.json',
      terrainSculpting: true,
      defaultActorCollision: 'lightweight-auto',
      colliderBudget: 'mobile',
    },
    solitude: {
      levelId: 'solitude',
      terrainCollision: 'heightmap',
      terrainManifestUrl: '/terrain/solitude.manifest.json',
      defaultActorCollision: 'lightweight-auto',
      colliderBudget: 'mobile',
      visualOnlyActorIds: ['solitude-ground-plateau', 'solitude-ground-dais'],
    },
    yggdrasil: {
      levelId: 'yggdrasil',
      terrainCollision: 'heightmap',
      terrainManifestUrl: '/terrain/yggdrasil.manifest.json',
      defaultActorCollision: 'lightweight-auto',
      colliderBudget: 'mobile',
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
      defaultActorCollision: 'lightweight-auto',
      colliderBudget: 'mobile',
    },
    'sci-fi-room': {
      levelId: 'sci-fi-room',
      terrainCollision: 'heightmap',
      terrainManifestUrl: '/terrain/sci-fi-room.manifest.json',
      defaultActorCollision: 'lightweight-auto',
      colliderBudget: 'mobile',
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

function uniqueActorIds(
  ...sources: Array<readonly string[] | null | undefined>
) {
  return Array.from(
    new Set(
      sources
        .flatMap(source => [...(source ?? [])])
        .map(actorId => actorId.trim())
        .filter(Boolean),
    ),
  )
}

function resolveTerrainCollisionSource(
  source: string | null | undefined,
  fallback: TerrainCollisionSource,
): TerrainCollisionSource {
  if (source === 'baked-heightmap') return 'heightmap'
  if (source === 'scene-authored' || source === 'none') return source
  return fallback
}

function resolveWorkflowFromSettings(
  levelId: string,
  fallback: LevelCollisionWorkflow,
  settings?: EditorSceneSettings | null,
): LevelCollisionWorkflow {
  const collisionSettings = settings?.level?.collision
  const terrainSettings = collisionSettings?.terrain
  const workflowSettings = collisionSettings?.workflow
  const roleSettings = collisionSettings?.roles
  const solidObjectsByDefault =
    collisionSettings?.defaults?.solidObjectsByDefault

  return {
    ...fallback,
    levelId,
    terrainCollision: resolveTerrainCollisionSource(
      terrainSettings?.source,
      fallback.terrainCollision,
    ),
    terrainManifestUrl: terrainSettings?.manifestUrl ?? fallback.terrainManifestUrl,
    terrainSculpting:
      workflowSettings?.terrainSculpting ??
      fallback.terrainSculpting ??
      Boolean(terrainSettings?.manifestUrl),
    autoBakeTerrain:
      workflowSettings?.autoBakeTerrain ??
      terrainSettings?.autoBakeOnTerrainChange ??
      fallback.autoBakeTerrain,
    defaultActorCollision:
      workflowSettings?.actorCollision ??
      (solidObjectsByDefault === false
        ? 'authored-only'
        : fallback.defaultActorCollision),
    colliderBudget: workflowSettings?.colliderBudget ?? fallback.colliderBudget,
    terrainVisualChunks:
      workflowSettings?.terrainVisualChunks ?? fallback.terrainVisualChunks,
    visualOnlyActorIds: uniqueActorIds(
      fallback.visualOnlyActorIds,
      roleSettings?.visualOnlyActorIds,
    ),
    groundActorIds: uniqueActorIds(
      fallback.groundActorIds,
      roleSettings?.groundActorIds,
    ),
    platformActorIds: uniqueActorIds(
      fallback.platformActorIds,
      roleSettings?.platformActorIds,
    ),
    sensorActorIds: uniqueActorIds(
      fallback.sensorActorIds,
      roleSettings?.sensorActorIds,
    ),
    detailActorIds: uniqueActorIds(
      fallback.detailActorIds,
      roleSettings?.detailActorIds,
    ),
  }
}

export function inferLevelIdFromActorId(actorId: string) {
  return LEVEL_ID_PREFIXES.find(levelId => actorId.startsWith(`${levelId}-`))
}

export function getLevelCollisionWorkflow(
  levelId?: string | null,
  settings?: EditorSceneSettings | null,
) {
  const resolvedLevelId = levelId || DEFAULT_WORKFLOW.levelId
  const fallback =
    LEVEL_COLLISION_WORKFLOWS[resolvedLevelId] ?? {
      ...DEFAULT_WORKFLOW,
      levelId: resolvedLevelId,
    }
  return resolveWorkflowFromSettings(resolvedLevelId, fallback, settings)
}

export function getActorCollisionRole(input: {
  actorId: string
  levelId?: string | null
  settings?: EditorSceneSettings | null
  sensor?: boolean
  shape?: string
}): CollisionRole {
  const levelId = input.levelId ?? inferLevelIdFromActorId(input.actorId)
  const workflow = getLevelCollisionWorkflow(levelId, input.settings)

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
