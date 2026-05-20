import type { SceneSettings } from './sceneDocumentTypes'
import type { CollisionIntent } from './types'

export type CollisionRole =
  | 'ground'
  | 'platform'
  | 'blocker'
  | 'sensor'
  | 'visualOnly'
  | 'detail'

export type TerrainCollisionSource =
  | 'source-glb'
  | 'scene-authored'
  | 'none'
export type CollisionBudget = 'mobile' | 'balanced' | 'desktop'

export interface LevelCollisionWorkflow {
  levelId: string
  terrainCollision: TerrainCollisionSource
  terrainManifestUrl?: string
  colliderBudget: CollisionBudget
  visualOnlyActorIds?: string[]
  groundActorIds?: string[]
  platformActorIds?: string[]
  sensorActorIds?: string[]
  detailActorIds?: string[]
}

const DEFAULT_WORKFLOW: LevelCollisionWorkflow = {
  levelId: 'default',
  terrainCollision: 'scene-authored',
  colliderBudget: 'mobile',
}

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
  if (
    source === 'source-glb' ||
    source === 'scene-authored' ||
    source === 'none'
  ) {
    return source
  }
  return fallback
}

function resolveWorkflowFromSettings(
  levelId: string,
  fallback: LevelCollisionWorkflow,
  settings?: SceneSettings | null,
): LevelCollisionWorkflow {
  const collisionSettings = settings?.level?.collision
  const terrainSettings = collisionSettings?.terrain
  const workflowSettings = collisionSettings?.workflow
  const roleSettings = collisionSettings?.roles

  return {
    ...fallback,
    levelId,
    terrainCollision: resolveTerrainCollisionSource(
      terrainSettings?.source,
      fallback.terrainCollision,
    ),
    terrainManifestUrl:
      terrainSettings?.manifestUrl ?? fallback.terrainManifestUrl,
    colliderBudget: workflowSettings?.colliderBudget ?? fallback.colliderBudget,
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

export function getLevelCollisionWorkflow(
  levelId?: string | null,
  settings?: SceneSettings | null,
) {
  const resolvedLevelId = levelId || DEFAULT_WORKFLOW.levelId
  const fallback = {
    ...DEFAULT_WORKFLOW,
    levelId: resolvedLevelId,
  }
  return resolveWorkflowFromSettings(resolvedLevelId, fallback, settings)
}

export function getActorCollisionRole(input: {
  actorId: string
  levelId?: string | null
  settings?: SceneSettings | null
  sensor?: boolean
  shape?: string
}): CollisionRole {
  const workflow = getLevelCollisionWorkflow(input.levelId, input.settings)

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
