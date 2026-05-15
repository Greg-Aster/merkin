const GROUND_MODES = new Set(['terrain-chunks', 'hybrid', 'scene-authored'])
const GROUND_VISUAL_SOURCES = new Set([
  'scene-actors',
  'heightmap-surface',
  'generated-heightmap-chunks',
  'source-glb-chunks',
  'none',
])
const GROUND_COLLISION_SOURCES = new Set([
  'baked-heightfield',
  'scene-colliders',
  'source-linked-terrain-collision',
])
const TERRAIN_RUNTIME_MODES = new Set([
  'scene-authored',
  'heightfield-terrain',
  'glb-chunk-terrain',
])
const TERRAIN_VISUAL_SOURCES = new Set([
  'scene-actors',
  'heightmap-surface',
  'generated-heightmap-chunks',
  'source-glb-chunks',
  'none',
])
const TERRAIN_FALLBACK_SURFACE_POLICIES = new Set([
  'disabled',
  'debug-only',
  'until-required-chunks-ready',
  'always',
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
  const visualSource = canonicalTerrainVisualSource(
    ground?.terrainVisualSource ?? ground?.visualSource,
  )
  return (
    ground?.mode === 'hybrid' ||
    visualSource === 'generated-heightmap-chunks' ||
    visualSource === 'source-glb-chunks'
  )
}

function getTerrainCollisionSettings(level) {
  const levelSettings = getLevelSettings(level?.settings)
  const collision = isRecord(levelSettings?.collision)
    ? levelSettings.collision
    : null
  return isRecord(collision?.terrain) ? collision.terrain : null
}

function canonicalTerrainVisualSource(value) {
  if (value === 'terrain-chunks') return 'generated-heightmap-chunks'
  return value
}

function isTerrainChunkVisualSource(value) {
  const source = canonicalTerrainVisualSource(value)
  return (
    source === 'generated-heightmap-chunks' || source === 'source-glb-chunks'
  )
}

function getManifestRuntime(manifest) {
  return isRecord(manifest?.runtime) ? manifest.runtime : null
}

function getManifestAssets(manifest) {
  return isRecord(manifest?.assets) ? manifest.assets : null
}

function getManifestSource(manifest) {
  return isRecord(manifest?.source) ? manifest.source : null
}

function getManifestVisualChunks(manifest) {
  return isRecord(manifest?.visualChunks) ? manifest.visualChunks : null
}

function hasString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function hasFingerprint(value) {
  return isRecord(value) && (hasString(value.value) || hasString(value.hash))
}

function getTerrainRuntimeMode({ ground, terrain, manifest }) {
  const manifestRuntime = getManifestRuntime(manifest)
  if (TERRAIN_RUNTIME_MODES.has(String(manifestRuntime?.mode))) {
    return manifestRuntime.mode
  }
  if (TERRAIN_RUNTIME_MODES.has(String(ground?.terrainRuntimeMode))) {
    return ground.terrainRuntimeMode
  }
  if (TERRAIN_RUNTIME_MODES.has(String(terrain?.runtimeMode))) {
    return terrain.runtimeMode
  }
  if (ground?.mode === 'scene-authored') {
    return 'scene-authored'
  }
  if (
    terrain?.source === 'baked-heightmap' ||
    ground?.collisionSource === 'baked-heightfield' ||
    ground?.collisionSource === 'source-linked-terrain-collision' ||
    manifest?.collision?.terrain
  ) {
    return 'heightfield-terrain'
  }
  return 'scene-authored'
}

function getTerrainVisualSource({ ground, terrain, manifest }) {
  const manifestRuntime = getManifestRuntime(manifest)
  const explicitSources = [
    manifestRuntime?.visualSource,
    ground?.terrainVisualSource,
    terrain?.visualSource,
    canonicalTerrainVisualSource(ground?.visualSource),
  ]
  for (const source of explicitSources) {
    if (TERRAIN_VISUAL_SOURCES.has(String(source))) return source
  }
  if (ground?.mode === 'scene-authored') {
    return 'scene-actors'
  }
  if (ground?.mode === 'terrain-chunks' || ground?.mode === 'hybrid') {
    return 'generated-heightmap-chunks'
  }
  return 'none'
}

function getTerrainFallbackSurfacePolicy({
  ground,
  terrain,
  manifest,
  visualSource,
}) {
  const manifestRuntime = getManifestRuntime(manifest)
  const policy =
    manifestRuntime?.fallbackSurfacePolicy ??
    ground?.fallbackSurfacePolicy ??
    terrain?.fallbackSurfacePolicy ??
    undefined
  if (TERRAIN_FALLBACK_SURFACE_POLICIES.has(String(policy))) return policy
  return visualSource === 'source-glb-chunks' ? 'disabled' : 'always'
}

function getConfiguredTerrainVisualSources({ ground, terrain, manifest }) {
  const manifestRuntime = getManifestRuntime(manifest)
  const groundVisualSource = ground?.terrainVisualSource
    ? undefined
    : canonicalTerrainVisualSource(ground?.visualSource)
  return [
    groundVisualSource,
    ground?.terrainVisualSource,
    terrain?.visualSource,
    manifestRuntime?.visualSource,
  ]
    .filter(source => TERRAIN_VISUAL_SOURCES.has(String(source)))
    .filter(source => source !== 'none')
}

function hasSourceGlbMetadata({ ground, terrain, manifest }) {
  const assets = getManifestAssets(manifest)
  const source = getManifestSource(manifest)
  return (
    hasString(ground?.sourceAssetUrl) ||
    hasString(ground?.sourceAssetHash) ||
    hasFingerprint(ground?.sourceAssetFingerprint) ||
    hasString(terrain?.sourceAssetUrl) ||
    hasString(terrain?.sourceAssetHash) ||
    hasFingerprint(terrain?.sourceAssetFingerprint) ||
    hasString(assets?.sourceGlb) ||
    hasString(assets?.sourceAssetUrl) ||
    hasString(assets?.sourceAssetHash) ||
    hasFingerprint(assets?.sourceAssetFingerprint) ||
    hasString(source?.assetUrl) ||
    hasString(source?.assetHash) ||
    hasFingerprint(source?.assetFingerprint)
  )
}

function preservesSourceAuthoring({ ground, manifest }) {
  const visualChunks = getManifestVisualChunks(manifest)
  return Boolean(
    ground?.preserveSourceUvs ||
      ground?.preserveSourceMaterialSlots ||
      visualChunks?.preservesSourceUvs ||
      visualChunks?.preservesSourceMaterialSlots ||
      visualChunks?.product?.preservesSourceUvs ||
      visualChunks?.product?.preservesSourceMaterialSlots,
  )
}

function getTerrainManifestUrlMismatch({ ground, terrain, manifestUrl }) {
  const urls = [
    ground?.terrainManifestUrl,
    terrain?.manifestUrl,
    manifestUrl,
  ].filter(hasString)
  const uniqueUrls = [...new Set(urls)]
  return uniqueUrls.length > 1 ? uniqueUrls : []
}

function getTerrainCollisionAuthority({ ground, terrain }) {
  if (GROUND_COLLISION_SOURCES.has(String(ground?.collisionSource))) {
    return ground.collisionSource
  }
  if (terrain?.source === 'baked-heightmap') return 'baked-heightfield'
  if (terrain?.source === 'source-glb') return 'source-linked-terrain-collision'
  return undefined
}

export function classifyTerrainAuthority(input) {
  const level = input?.level ?? input
  const ground = getRuntimeGroundContract(level) ?? null
  const terrain = getTerrainCollisionSettings(level)
  const manifest = input?.manifest
  const manifestUrl = input?.manifestUrl
  const levelId = typeof level?.id === 'string' ? level.id : 'unknown-level'

  if (!ground) {
    return {
      levelId,
      hasGroundContract: false,
      mode: 'missing',
      visualSource: 'missing',
      collisionSource: 'missing',
      fallbackSurfacePolicy: 'missing',
      configuredVisualSources: [],
      manifestUrlMismatch: [],
      mixedAuthority: false,
    }
  }

  const mode = getTerrainRuntimeMode({ ground, terrain, manifest })
  const visualSource = getTerrainVisualSource({ ground, terrain, manifest })
  const collisionSource = getTerrainCollisionAuthority({ ground, terrain })
  const fallbackSurfacePolicy = getTerrainFallbackSurfacePolicy({
    ground,
    terrain,
    manifest,
    visualSource,
  })
  const configuredVisualSources = [
    ...new Set(
      getConfiguredTerrainVisualSources({ ground, terrain, manifest }),
    ),
  ]
  const manifestUrlMismatch = getTerrainManifestUrlMismatch({
    ground,
    terrain,
    manifestUrl,
  })

  return {
    levelId,
    hasGroundContract: true,
    mode,
    visualSource,
    collisionSource,
    fallbackSurfacePolicy,
    configuredVisualSources,
    manifestUrlMismatch,
    mixedAuthority:
      mode === 'scene-authored' &&
      visualSource === 'scene-actors' &&
      collisionSource === 'baked-heightfield',
  }
}

export function getTerrainAuthorityDiagnostics(input) {
  const level = input?.level ?? input
  const ground = getRuntimeGroundContract(level) ?? null
  const terrain = getTerrainCollisionSettings(level)
  const manifest = input?.manifest
  const levelId = typeof level?.id === 'string' ? level.id : 'unknown-level'
  const errors = []
  const warnings = []

  if (!ground) return { errors, warnings }

  const authority = classifyTerrainAuthority(input)
  const runtimeMode = authority.mode
  const visualSource = authority.visualSource
  const fallbackSurfacePolicy = authority.fallbackSurfacePolicy
  const configuredSources = authority.configuredVisualSources
  const manifestUrlMismatch = authority.manifestUrlMismatch

  if (!TERRAIN_RUNTIME_MODES.has(String(runtimeMode))) {
    errors.push(`${levelId}: terrain runtime mode "${runtimeMode}" is invalid.`)
  }
  if (!TERRAIN_VISUAL_SOURCES.has(String(visualSource))) {
    errors.push(
      `${levelId}: terrain visual source "${visualSource}" is invalid.`,
    )
  }
  if (!TERRAIN_FALLBACK_SURFACE_POLICIES.has(String(fallbackSurfacePolicy))) {
    errors.push(
      `${levelId}: terrain fallback surface policy "${fallbackSurfacePolicy}" is invalid.`,
    )
  }
  if (configuredSources.length > 1) {
    errors.push(
      `${levelId}: multiple terrain visual authorities are configured (${configuredSources.join(', ')}).`,
    )
  }
  if (
    runtimeMode === 'glb-chunk-terrain' &&
    !hasSourceGlbMetadata({ ground, terrain, manifest })
  ) {
    errors.push(
      `${levelId}: glb-chunk-terrain requires source GLB URL/hash metadata.`,
    )
  }
  if (
    runtimeMode === 'glb-chunk-terrain' &&
    visualSource === 'generated-heightmap-chunks'
  ) {
    errors.push(
      `${levelId}: glb-chunk-terrain cannot use generated heightmap chunks as the authoritative visual path.`,
    )
  }
  if (
    runtimeMode === 'heightfield-terrain' &&
    preservesSourceAuthoring({ ground, manifest })
  ) {
    errors.push(
      `${levelId}: heightfield-terrain cannot preserve source GLB UVs or material slots.`,
    )
  }
  if (
    visualSource === 'source-glb-chunks' &&
    fallbackSurfacePolicy !== 'disabled' &&
    fallbackSurfacePolicy !== 'debug-only'
  ) {
    warnings.push(
      `${levelId}: source GLB chunks are authoritative while the fallback heightmap surface policy is "${fallbackSurfacePolicy}"; only debug-only is allowed during migration.`,
    )
  }
  if (
    (visualSource === 'generated-heightmap-chunks' ||
      visualSource === 'source-glb-chunks') &&
    fallbackSurfacePolicy === 'always'
  ) {
    warnings.push(
      `${levelId}: chunk terrain visuals are authoritative while fallbackSurfacePolicy=always; production runtime ignores this fallback policy.`,
    )
  }
  if (manifestUrlMismatch.length > 0) {
    errors.push(
      `${levelId}: terrain manifest URL mismatch across scene settings (${manifestUrlMismatch.join(' vs ')}).`,
    )
  }
  if (authority.mixedAuthority) {
    const message = `${levelId}: scene-authored terrain uses baked-heightfield collision; migrate to scene-colliders, true heightfield-terrain, or glb-chunk-terrain before final terrain authority gate.`
    errors.push(message)
  }

  return { errors, warnings }
}

function hasBakedTerrainRuntime(level) {
  const terrain = getTerrainCollisionSettings(level)
  return (
    (terrain?.source === 'baked-heightmap' ||
      terrain?.source === 'source-glb') &&
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
  const runtimeMode = getTerrainRuntimeMode({ ground, terrain })
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

  if (
    mode === 'terrain-chunks' &&
    !isTerrainChunkVisualSource(
      ground?.terrainVisualSource ?? ground?.visualSource,
    )
  ) {
    errors.push(
      `${levelId}: terrain-chunks ground must render generated-heightmap-chunks or source-glb-chunks.`,
    )
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

  if (
    collisionSource === 'baked-heightfield' ||
    collisionSource === 'source-linked-terrain-collision'
  ) {
    if (
      runtimeMode === 'glb-chunk-terrain' &&
      collisionSource === 'baked-heightfield'
    ) {
      errors.push(
        `${levelId}: glb-chunk-terrain must use source-linked terrain collision.`,
      )
    }
    if (!hasBakedTerrainRuntime(level)) {
      errors.push(
        `${levelId}: ${collisionSource} ground collision requires settings.level.collision.terrain.source=baked-heightmap or source-glb and a manifestUrl.`,
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

  errors.push(...getTerrainAuthorityDiagnostics({ level }).errors)

  return errors
}
