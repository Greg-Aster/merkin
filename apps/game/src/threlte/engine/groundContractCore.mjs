const GROUND_MODES = new Set([
  'terrain-chunks',
  'authored-ground',
  'hybrid',
  'scene-authored',
])
const GROUND_VISUAL_SOURCES = new Set([
  'terrain-chunks',
  'scene-actors',
  'none',
])
const GROUND_COLLISION_SOURCES = new Set([
  'baked-heightfield',
  'scene-colliders',
])

function isRecord(value) {
  return Boolean(value) && typeof value === 'object'
}

function getLevelSettings(settings) {
  return isRecord(settings?.level) ? settings.level : null
}

export function getLevelGroundContract(settings) {
  const levelSettings = getLevelSettings(settings)
  const ground = levelSettings?.ground
  return isRecord(ground) ? ground : null
}

export function getRuntimeGroundContract(levelDefinition) {
  return getLevelGroundContract(levelDefinition?.settings) ?? undefined
}

export function hasAuthoredGroundVisuals(settings) {
  return getLevelGroundContract(settings)?.visualSource === 'scene-actors'
}

export function shouldRenderTerrainVisualChunks(levelId, settings) {
  void levelId
  const ground = getLevelGroundContract(settings)
  return ground?.mode === 'hybrid' || ground?.visualSource === 'terrain-chunks'
}

function getTerrainCollisionSettings(level) {
  const levelSettings = getLevelSettings(level?.settings)
  const collision = isRecord(levelSettings?.collision)
    ? levelSettings.collision
    : null
  return isRecord(collision?.terrain) ? collision.terrain : null
}

function hasBakedTerrainRuntime(level) {
  const terrain = getTerrainCollisionSettings(level)
  return (
    terrain?.source === 'baked-heightmap' &&
    typeof terrain.manifestUrl === 'string'
  )
}

function getGroundActorIds(ground) {
  return Array.isArray(ground.groundActorIds)
    ? ground.groundActorIds.filter(
        actorId => typeof actorId === 'string' && actorId.trim().length > 0,
      )
    : []
}

export function validateLevelGroundContract(level, actorsById) {
  const errors = []
  const ground = getRuntimeGroundContract(level)
  const terrain = getTerrainCollisionSettings(level)
  const levelId = typeof level?.id === 'string' ? level.id : 'unknown-level'

  if (!ground) {
    errors.push(
      `${levelId}: settings.level.ground is required so visual ground and collision ownership are explicit.`,
    )
    return errors
  }

  const mode = ground.mode
  const visualSource = ground.visualSource
  const collisionSource = ground.collisionSource
  const groundActorIds = getGroundActorIds(ground)

  if (!GROUND_MODES.has(String(mode))) {
    errors.push(`${levelId}: ground.mode "${mode}" is invalid.`)
  }
  if (!GROUND_VISUAL_SOURCES.has(String(visualSource))) {
    errors.push(`${levelId}: ground.visualSource "${visualSource}" is invalid.`)
  }
  if (!GROUND_COLLISION_SOURCES.has(String(collisionSource))) {
    errors.push(
      `${levelId}: ground.collisionSource "${collisionSource}" is invalid.`,
    )
  }

  if (mode === 'terrain-chunks' && visualSource !== 'terrain-chunks') {
    errors.push(`${levelId}: terrain-chunks ground must render terrain chunks.`)
  }
  if (mode === 'authored-ground' && visualSource !== 'scene-actors') {
    errors.push(`${levelId}: authored-ground mode must render scene actors.`)
  }
  if (mode === 'scene-authored' && collisionSource !== 'scene-colliders') {
    errors.push(
      `${levelId}: scene-authored ground must use scene collider collision.`,
    )
  }
  if (
    mode !== 'hybrid' &&
    visualSource === 'terrain-chunks' &&
    groundActorIds.length > 0
  ) {
    errors.push(
      `${levelId}: groundActorIds cannot be combined with terrain chunk visuals unless ground.mode is hybrid.`,
    )
  }

  if (visualSource === 'scene-actors') {
    if (groundActorIds.length === 0) {
      errors.push(
        `${levelId}: scene-actor ground visuals require ground.groundActorIds.`,
      )
    }

    for (const actorId of groundActorIds) {
      const actor = actorsById.get(actorId)
      if (!actor) {
        errors.push(`${levelId}: ground actor "${actorId}" is missing.`)
      } else if (actor.render?.visible === false) {
        errors.push(`${levelId}: ground actor "${actorId}" is not visible.`)
      } else if (!actor.render && actor.kind !== 'empty') {
        errors.push(`${levelId}: ground actor "${actorId}" has no render.`)
      }
    }
  }

  if (collisionSource === 'baked-heightfield') {
    if (!hasBakedTerrainRuntime(level)) {
      errors.push(
        `${levelId}: baked-heightfield ground collision requires settings.level.collision.terrain.source=baked-heightmap and a manifestUrl.`,
      )
    }
    if (
      typeof ground.terrainManifestUrl === 'string' &&
      terrain?.manifestUrl &&
      ground.terrainManifestUrl !== terrain.manifestUrl
    ) {
      errors.push(
        `${levelId}: ground.terrainManifestUrl must match collision.terrain.manifestUrl.`,
      )
    }
  }

  return errors
}
