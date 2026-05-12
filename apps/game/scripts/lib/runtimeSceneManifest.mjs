import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getRuntimeGroundContract,
  validateLevelGroundContract,
} from '../../src/threlte/engine/groundContractCore.mjs'

const collisionChannels = new Set([
  'worldStatic',
  'worldDynamic',
  'player',
  'trigger',
  'detail',
])
const moduleDir = dirname(fileURLToPath(import.meta.url))
const prefabCatalog = JSON.parse(
  readFileSync(
    join(moduleDir, '../../src/threlte/engine/runtimePrefabCatalog.json'),
    'utf8',
  ),
)
const prefabAssetUrls = prefabCatalog.assetUrls ?? {}
const prefabAssetVariants = prefabCatalog.assetVariants ?? {}

const defaultRuntimeContract = {
  levelId: '*',
  requiredActorIds: [],
  requiredAssetActorIds: [],
  requiredWalkableActorIds: [],
  maxDefaultCollisionActors: 0,
  maxTrimeshActors: 0,
  maxRuntimeAssetCount: 60,
  maxPrimitiveActorCount: 80,
  maxNeverCullActorCount: 4,
  maxGameplayFireflyCount: 40,
}

const levelRuntimeContracts = {
  observatory: {
    requiredActorIds: ['observatory-terrain', 'observatory-player-spawn'],
    requiredWalkableActorIds: ['observatory-terrain'],
    maxRuntimeAssetCount: 0,
    maxPrimitiveActorCount: 8,
    maxGameplayFireflyCount: 0,
  },
  solitude: {
    requiredActorIds: ['solitude-terrain', 'solitude-player-spawn'],
    requiredWalkableActorIds: ['solitude-terrain'],
    maxRuntimeAssetCount: 24,
    maxPrimitiveActorCount: 16,
    maxGameplayFireflyCount: 16,
  },
  yggdrasil: {
    requiredActorIds: [
      'yggdrasil-ground',
      'yggdrasil-spawn-pad',
      'yggdrasil-tree-merged',
    ],
    requiredAssetActorIds: ['yggdrasil-tree-merged'],
    requiredWalkableActorIds: ['yggdrasil-ground', 'yggdrasil-spawn-pad'],
    maxRuntimeAssetCount: 24,
  },
}

const levelCollisionWorkflows = {
  observatory: {
    terrainCollision: 'heightmap',
    terrainManifestUrl: '/terrain/observatory-environment.manifest.json',
  },
  solitude: {
    terrainCollision: 'heightmap',
    terrainManifestUrl: '/terrain/solitude.manifest.json',
  },
  yggdrasil: {
    terrainCollision: 'heightmap',
    terrainManifestUrl: '/terrain/yggdrasil.manifest.json',
  },
  'sci-fi-room': {
    terrainCollision: 'heightmap',
    terrainManifestUrl: '/terrain/sci-fi-room.manifest.json',
  },
}

const sharedLevelSettingKeys = [
  'spawn',
  'player',
  'features',
  'style',
  'lighting',
  'renderProfile',
  'water',
  'ambientParticles',
  'ambientAudio',
  'collision',
  'ground',
  'terrainSculpt',
  'worldPartition',
  'graphicsBudget',
  'editorPanels',
  'runtimeAssets',
  'presets',
  'skyboxPreset',
]
const legacySharedLevelSettingBuckets = ['observatory', 'solitude']
const minColliderSize = 0.05
const spawnSupportXzPadding = 0.15
const spawnSupportMaxDrop = 2
const spawnSupportMaxPenetration = 0.25
const defaultMaxWalkableSlopeDegrees = 50
const degToRad = Math.PI / 180
const generatedColliderRoot = '/generated/runtime-game-assets/collision/'
const terrainColliderRoot = '/terrain/collision/'
const colliderUrlSuffix = '.collider.glb'

function clone(value) {
  return value === undefined ? undefined : structuredClone(value)
}

function isFiniteVec3(value) {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(component => Number.isFinite(component))
  )
}

function clampColliderSize(value) {
  const size = Math.abs(Number(value ?? 1))
  return Number.isFinite(size) ? Math.max(minColliderSize, size) : 1
}

function getColliderUrlConventionError(value) {
  const colliderUrl = String(value ?? '').trim()
  if (!colliderUrl) return 'collision.colliderUrl is required.'
  if (!colliderUrl.startsWith('/')) {
    return 'collision.colliderUrl must be a public absolute URL.'
  }
  if (
    !colliderUrl.startsWith(generatedColliderRoot) &&
    !colliderUrl.startsWith(terrainColliderRoot)
  ) {
    return `collision.colliderUrl must live under ${generatedColliderRoot} or ${terrainColliderRoot}.`
  }
  if (!colliderUrl.endsWith(colliderUrlSuffix)) {
    return `collision.colliderUrl must end with ${colliderUrlSuffix}.`
  }
  return ''
}

function getPrimitiveVisualSize(actor) {
  const primitive = actor.render?.primitive
  const scale = actor.transform?.scale ?? [1, 1, 1]

  if (primitive?.geometry === 'box') {
    const [width = 1, height = 1, depth = 1] = primitive.args ?? []
    return [
      clampColliderSize(width * scale[0]),
      clampColliderSize(height * scale[1]),
      clampColliderSize(depth * scale[2]),
    ]
  }

  if (primitive?.geometry === 'cylinder') {
    const [radiusTop = 0.5, radiusBottom = 0.5, height = 1] =
      primitive.args ?? []
    const radius = Math.max(Math.abs(radiusTop), Math.abs(radiusBottom))
    return [
      clampColliderSize(radius * 2 * scale[0]),
      clampColliderSize(height * scale[1]),
      clampColliderSize(radius * 2 * scale[2]),
    ]
  }

  if (
    primitive &&
    ['octahedron', 'tetrahedron', 'icosahedron', 'dodecahedron'].includes(
      primitive.geometry,
    )
  ) {
    const [radius = 0.5] = primitive.args ?? []
    return [
      clampColliderSize(radius * 2 * scale[0]),
      clampColliderSize(radius * 2 * scale[1]),
      clampColliderSize(radius * 2 * scale[2]),
    ]
  }

  if (primitive?.geometry === 'torus') {
    const [radius = 0.5, tube = 0.2] = primitive.args ?? []
    const outerRadius = Math.abs(radius) + Math.abs(tube)
    return [
      clampColliderSize(outerRadius * 2 * scale[0]),
      clampColliderSize(Math.abs(tube) * 2 * scale[1]),
      clampColliderSize(outerRadius * 2 * scale[2]),
    ]
  }

  return [
    clampColliderSize(scale[0]),
    clampColliderSize(scale[1]),
    clampColliderSize(scale[2]),
  ]
}

function mergeDeepRecords(base, overrides) {
  const result = clone(base) ?? {}

  for (const [key, value] of Object.entries(overrides ?? {})) {
    const current = result[key]
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      current &&
      typeof current === 'object' &&
      !Array.isArray(current)
    ) {
      result[key] = mergeDeepRecords(current, value)
    } else {
      result[key] = clone(value)
    }
  }

  return result
}

function mergeLevelSettings(...sources) {
  return sources.reduce(
    (merged, source) => (source ? mergeDeepRecords(merged, source) : merged),
    {},
  )
}

function pickSharedLevelSettings(source) {
  const picked = {}
  for (const key of sharedLevelSettingKeys) {
    if (source?.[key] !== undefined) picked[key] = clone(source[key])
  }
  return picked
}

function removeSharedLevelSettings(source) {
  if (!source) return source
  const next = clone(source)
  for (const key of sharedLevelSettingKeys) {
    delete next[key]
  }
  return next
}

function collectLegacySharedLevelSettings(settings) {
  return mergeLevelSettings(
    ...legacySharedLevelSettingBuckets.map(bucket =>
      pickSharedLevelSettings(settings?.[bucket]),
    ),
  )
}

function getLevelCollisionWorkflow(levelId) {
  return {
    levelId,
    terrainCollision: 'scene-authored',
    defaultActorCollision: 'lightweight-auto',
    colliderBudget: 'mobile',
    ...(levelCollisionWorkflows[levelId] ?? {}),
  }
}

export function normalizeRuntimeLevelSceneSettings(levelId, settings = {}) {
  const normalized = clone(settings) ?? {}
  const workflow = getLevelCollisionWorkflow(levelId)

  normalized.level = mergeLevelSettings(
    collectLegacySharedLevelSettings(normalized),
    normalized.level ?? {},
  )
  normalized.level = mergeLevelSettings(
    {
      collision: {
        workflow: {
          actorCollision: workflow.defaultActorCollision,
          colliderBudget: workflow.colliderBudget,
        },
        terrain: {
          source:
            workflow.terrainCollision === 'heightmap'
              ? 'baked-heightmap'
              : workflow.terrainCollision,
          runtimeSource:
            workflow.terrainCollision === 'heightmap'
              ? 'built-in-manifest'
              : undefined,
          manifestUrl: workflow.terrainManifestUrl,
          dirty: false,
        },
        defaults: {
          solidObjectsByDefault: true,
          defaultFriction: 0.7,
          defaultRestitution: 0,
        },
      },
      terrainSculpt: {
        enabled: workflow.terrainCollision === 'heightmap',
        autoBakeCollision: true,
      },
    },
    normalized.level,
  )

  if (normalized.observatory) {
    normalized.observatory = removeSharedLevelSettings(normalized.observatory)
  }
  if (normalized.solitude) {
    normalized.solitude = removeSharedLevelSettings(normalized.solitude)
  }

  return normalized
}

function getActorKind(node) {
  if (node.light) return 'light'
  if (node.gameplay?.type === 'audio-region') return 'volume'
  return node.kind === 'group' ? 'empty' : node.kind
}

function getPhysicsBodyType(node) {
  return node.physics?.bodyType ?? 'fixed'
}

function getRenderCullingPolicy(node) {
  return node.renderPolicy?.cullingPolicy ?? 'runtime-budget'
}

function getRenderPhysicsAttachmentPolicy(node) {
  return (
    node.renderPolicy?.physicsAttachment ??
    (node.kind === 'asset' && getPhysicsBodyType(node) === 'fixed'
      ? 'outside-collider'
      : 'inside-collider')
  )
}

function getPrimitiveMaterial(node) {
  if (!node.primitive) return node.material

  return {
    color: node.material?.color ?? node.primitive.color,
    mapUrl: node.material?.mapUrl,
    emissive: node.material?.emissive ?? node.primitive.emissive,
    emissiveMapUrl: node.material?.emissiveMapUrl,
    emissiveIntensity:
      node.material?.emissiveIntensity ?? node.primitive.emissiveIntensity,
    metalness: node.material?.metalness ?? node.primitive.metalness,
    metalnessMapUrl: node.material?.metalnessMapUrl,
    roughness: node.material?.roughness ?? node.primitive.roughness,
    roughnessMapUrl: node.material?.roughnessMapUrl,
    normalMapUrl: node.material?.normalMapUrl,
    alphaMapUrl: node.material?.alphaMapUrl,
    opacity: node.material?.opacity ?? node.primitive.opacity,
    transparent: node.material?.transparent ?? node.primitive.transparent,
    wireframe: node.material?.wireframe,
    doubleSided: node.material?.doubleSided,
    flatShading: node.material?.flatShading,
    envMapIntensity: node.material?.envMapIntensity,
    transmission: node.material?.transmission,
    ior: node.material?.ior,
    clearcoat: node.material?.clearcoat,
    clearcoatRoughness: node.material?.clearcoatRoughness,
    thickness: node.material?.thickness,
    reflectivity: node.material?.reflectivity,
  }
}

export function getRuntimePrefabAssetUrl(type, variant = null) {
  if (
    typeof type === 'string' &&
    typeof variant === 'string' &&
    typeof prefabAssetVariants[type]?.[variant] === 'string'
  ) {
    return prefabAssetVariants[type][variant]
  }
  return typeof type === 'string' && typeof prefabAssetUrls[type] === 'string'
    ? prefabAssetUrls[type]
    : ''
}

function getActorRuntimeAssetUrl(actor) {
  const assetUrl = actor.render?.asset?.url
  if (assetUrl) return assetUrl

  return getRuntimePrefabAssetUrl(
    actor.render?.prefab?.type,
    actor.render?.prefab?.variant,
  )
}

function getCollision(node) {
  if (!node.collision || node.collision.enabled === false) return null

  return {
    intent: node.collision.intent,
    channel: node.collision.channel,
    shape: node.collision.shape,
    size: node.collision.size,
    colliderUrl: node.collision.colliderUrl,
    friction: node.collision.friction,
    restitution: node.collision.restitution,
    sensor: node.collision.sensor,
    triangleBudget: node.collision.triangleBudget,
  }
}

function toActor(node) {
  const collision = getCollision(node)

  return {
    id: node.id,
    name: node.name,
    kind: getActorKind(node),
    parentId: node.parentId,
    transform: {
      position: node.position,
      rotation: node.rotation,
      scale: node.scale,
    },
    render: ['primitive', 'asset', 'prefab'].includes(node.kind)
      ? {
          visible: node.visible,
          cullingPolicy: getRenderCullingPolicy(node),
          physicsAttachment: getRenderPhysicsAttachmentPolicy(node),
          primitive: node.primitive
            ? {
                geometry: node.primitive.geometry,
                args: node.primitive.args,
              }
            : undefined,
          asset: node.asset,
          prefab: node.prefab,
          material: getPrimitiveMaterial(node),
        }
      : undefined,
    physics: collision
      ? {
          bodyType: getPhysicsBodyType(node),
          collision,
          gravityScale: node.physics?.gravityScale,
          canSleep: node.physics?.canSleep,
          ccd: node.physics?.ccd,
          linearDamping: node.physics?.linearDamping,
          angularDamping: node.physics?.angularDamping,
          lockRotations: node.physics?.lockRotations,
          lockTranslations: node.physics?.lockTranslations,
        }
      : undefined,
    light: node.light
      ? {
          color: node.light.color,
          intensity: node.light.intensity,
          distance: node.light.distance,
          decay: node.light.decay,
        }
      : undefined,
    gameplay: node.gameplay
      ? {
          type: node.gameplay.type,
          data: node.gameplay,
        }
      : undefined,
    interaction: node.gameplay
      ? {
          kind:
            node.gameplay.type === 'portal'
              ? 'portal'
              : node.gameplay.type === 'note'
                ? 'note'
                : node.gameplay.type === 'firefly'
                  ? 'conversation'
                  : 'custom',
          targetId: node.gameplay.targetLevelId,
          data: node.gameplay,
        }
      : undefined,
    audioRegion:
      node.gameplay?.type === 'audio-region' && node.gameplay.audioTrack
        ? {
            track: node.gameplay.audioTrack,
            volume: node.gameplay.audioVolume ?? 1,
            falloff: node.gameplay.regionFalloff,
          }
        : undefined,
  }
}

export function adaptSceneDocumentToLevelDefinition(scene) {
  const spawnPosition = scene.settings?.level?.spawn?.position
  if (!isFiniteVec3(spawnPosition)) {
    throw new Error(
      `${scene.levelId}: scene is missing a finite settings.level.spawn.position Vec3.`,
    )
  }
  const spawnRotation = scene.settings?.level?.spawn?.rotation
  if (spawnRotation !== undefined && !isFiniteVec3(spawnRotation)) {
    throw new Error(
      `${scene.levelId}: settings.level.spawn.rotation must be a finite Vec3 when provided.`,
    )
  }

  return {
    id: scene.levelId,
    version: scene.version,
    updatedAt: scene.updatedAt,
    spawn: {
      player: spawnPosition,
      rotation: spawnRotation ?? [0, 0, 0],
    },
    settings: scene.settings,
    actors: (scene.nodes ?? []).map(toActor),
  }
}

function getLevelRuntimeContract(levelId) {
  const normalizedLevelId = levelId.trim().toLowerCase()
  return {
    ...defaultRuntimeContract,
    ...(levelRuntimeContracts[normalizedLevelId] ?? {}),
    levelId: normalizedLevelId || defaultRuntimeContract.levelId,
  }
}

function hasBakedTerrainRuntime(level) {
  const terrain = level.settings?.level?.collision?.terrain
  const ground = level.settings?.level?.ground
  return (
    (terrain?.source === 'baked-heightmap' &&
      typeof terrain.manifestUrl === 'string') ||
    (ground?.collisionSource === 'baked-heightfield' &&
      typeof ground.terrainManifestUrl === 'string')
  )
}

function isSatisfiedByRuntimeSystem(level, actorId) {
  if (actorId === `${level.id}-terrain` && hasBakedTerrainRuntime(level)) {
    return true
  }
  if (
    actorId === `${level.id}-player-spawn` &&
    isFiniteVec3(level.spawn.player)
  ) {
    return true
  }
  return false
}

function getCollisionDiagnostics(level) {
  const actorsById = new Map(level.actors.map(actor => [actor.id, actor]))
  const roleSettings = level.settings?.level?.collision?.roles
  const visualOnlyActorIds = new Set(
    Array.isArray(roleSettings?.visualOnlyActorIds)
      ? roleSettings.visualOnlyActorIds.filter(
          actorId => typeof actorId === 'string',
        )
      : [],
  )

  return {
    authoredActorIds: level.actors
      .filter(actor => Boolean(actor.physics))
      .filter(actor => !visualOnlyActorIds.has(actor.id))
      .map(actor => actor.id)
      .sort(),
    defaultActorIds: [],
    visualOnlyActorIds: [...visualOnlyActorIds]
      .filter(actorId => actorsById.has(actorId))
      .sort(),
  }
}

function isWalkableActor(actor) {
  return actor.physics?.collision.intent === 'walkable'
}

function getMaxWalkableSlopeRadians(level) {
  const degrees = Number(
    level.settings?.level?.collision?.walkability?.maxSlopeDegrees,
  )
  const resolvedDegrees = Number.isFinite(degrees)
    ? degrees
    : defaultMaxWalkableSlopeDegrees
  return Math.max(0, Math.min(89, resolvedDegrees)) * degToRad
}

function getWalkabilitySamples(level) {
  const samples = [
    {
      id: 'player-spawn',
      position: level.spawn.player,
    },
  ]
  const configuredSamples =
    level.settings?.level?.collision?.walkability?.samples

  if (Array.isArray(configuredSamples)) {
    for (const [index, sample] of configuredSamples.entries()) {
      if (!isFiniteVec3(sample?.position)) continue
      samples.push({
        id:
          typeof sample.id === 'string' && sample.id.trim()
            ? sample.id.trim()
            : `sample-${index}`,
        position: sample.position,
      })
    }
  }

  return samples
}

function getActorColliderWorldSize(actor) {
  return isFiniteVec3(actor.physics?.collision.size)
    ? actor.physics.collision.size
    : getPrimitiveVisualSize(actor)
}

function actorSupportsWalkabilitySample(actor, samplePosition) {
  const collision = actor.physics?.collision
  if (!collision || collision.sensor || collision.intent !== 'walkable') {
    return false
  }
  if (collision.shape === 'trimesh') return false

  const [x, y, z] = samplePosition
  const [width, height, depth] = getActorColliderWorldSize(actor)
  const [actorX, actorY, actorZ] = actor.transform.position
  const halfWidth = width / 2 + spawnSupportXzPadding
  const halfDepth = depth / 2 + spawnSupportXzPadding
  const topY = actorY + height / 2

  if (collision.shape === 'cylinder') {
    const normalizedX = (x - actorX) / halfWidth
    const normalizedZ = (z - actorZ) / halfDepth
    if (normalizedX * normalizedX + normalizedZ * normalizedZ > 1) {
      return false
    }
  } else if (
    Math.abs(x - actorX) > halfWidth ||
    Math.abs(z - actorZ) > halfDepth
  ) {
    return false
  }

  return (
    y >= topY - spawnSupportMaxPenetration && y <= topY + spawnSupportMaxDrop
  )
}

function getWalkabilityContractIssues(level, actors) {
  const errors = []
  const warnings = []
  const walkableActors = actors.filter(isWalkableActor)
  const maxSlopeRadians = getMaxWalkableSlopeRadians(level)

  for (const actor of walkableActors) {
    const [pitch = 0, , roll = 0] = actor.transform.rotation ?? []
    const steepestAxis = Math.max(Math.abs(pitch), Math.abs(roll))
    if (steepestAxis > maxSlopeRadians) {
      errors.push(
        `Walkable actor "${actor.id}" exceeds max slope ${Math.round(maxSlopeRadians / degToRad)}deg.`,
      )
    }
  }

  for (const sample of getWalkabilitySamples(level)) {
    if (!isFiniteVec3(sample.position)) continue
    const supportingActor = walkableActors.find(actor =>
      actorSupportsWalkabilitySample(actor, sample.position),
    )
    if (!supportingActor) {
      if (hasBakedTerrainRuntime(level)) {
        warnings.push(
          `Walkability sample "${sample.id}" is not supported by an authored primitive walkable collider; baked terrain collision must cover it at runtime.`,
        )
      } else {
        errors.push(
          `Walkability sample "${sample.id}" does not land on authored walkable collision.`,
        )
      }
    }
  }

  return { errors, warnings }
}

function getAuthoredRuntimeAssetContract(level) {
  const runtimeAssets = level.settings?.level?.runtimeAssets
  const toStringArray = value =>
    Array.isArray(value) ? value.filter(item => typeof item === 'string') : []

  return {
    requiredActorIds: toStringArray(runtimeAssets?.requiredActorIds),
    requiredAssetActorIds: [
      ...toStringArray(runtimeAssets?.requiredRenderActorIds),
      ...toStringArray(runtimeAssets?.requiredAssetActorIds),
    ],
  }
}

function uniqueStrings(values) {
  return [...new Set(values)]
}

export function createLevelBuildReport(level) {
  const contract = getLevelRuntimeContract(level.id)
  const authoredRuntimeContract = getAuthoredRuntimeAssetContract(level)
  const collisionDiagnostics = getCollisionDiagnostics(level)
  const defaultCollisionActorIds = new Set(collisionDiagnostics.defaultActorIds)
  const visualOnlyActorIds = new Set(collisionDiagnostics.visualOnlyActorIds)
  const requiredActorIds = uniqueStrings([
    ...contract.requiredActorIds,
    ...authoredRuntimeContract.requiredActorIds,
  ])
  const requiredAssetActorIds = uniqueStrings([
    ...contract.requiredAssetActorIds,
    ...authoredRuntimeContract.requiredAssetActorIds,
  ])
  const warnings = []
  const errors = []
  const actorIds = new Set()
  const duplicateActorIds = new Set()
  const actorsById = new Map()
  const runtimeAssetUrls = new Set()
  const requiredAssetUrls = new Set()
  let assetActorCount = 0
  let primitiveActorCount = 0
  let neverCullActorCount = 0
  let gameplayFireflyActorCount = 0
  let defaultCollisionActorCount = 0
  let physicsActorCount = 0
  let trimeshActorCount = 0
  let detailMeshActorCount = 0
  let visualOnlyActorCount = 0

  if (!isFiniteVec3(level.spawn.player))
    errors.push('Player spawn must be a finite Vec3.')

  for (const actor of level.actors) {
    if (actorIds.has(actor.id)) duplicateActorIds.add(actor.id)
    actorIds.add(actor.id)
    actorsById.set(actor.id, actor)

    if (actor.kind === 'asset') assetActorCount += 1
    if (actor.kind === 'primitive') primitiveActorCount += 1
    if (actor.render?.cullingPolicy === 'never') neverCullActorCount += 1
    if (actor.gameplay?.type === 'firefly') gameplayFireflyActorCount += 1
    const runtimeAssetUrl = getActorRuntimeAssetUrl(actor)
    if (runtimeAssetUrl) runtimeAssetUrls.add(runtimeAssetUrl)
    if (actor.kind === 'asset' && !actor.render?.asset?.url) {
      errors.push(`Asset actor "${actor.id}" is missing a runtime asset URL.`)
    }
    if (defaultCollisionActorIds.has(actor.id)) defaultCollisionActorCount += 1
    if (visualOnlyActorIds.has(actor.id) || (!actor.physics && actor.render)) {
      visualOnlyActorCount += 1
    }
    if (!actor.physics) continue

    physicsActorCount += 1
    if (!collisionChannels.has(actor.physics.collision.channel)) {
      errors.push(`Actor "${actor.id}" has an invalid collision channel.`)
    }
    if (actor.physics.collision.intent === 'detailMesh') {
      detailMeshActorCount += 1
      if (actor.physics.collision.triangleBudget === undefined) {
        errors.push(
          `Detail mesh actor "${actor.id}" has no explicit triangle budget.`,
        )
      }
    }
    if (actor.physics.collision.shape === 'trimesh') {
      trimeshActorCount += 1
      if (actor.physics.collision.triangleBudget === undefined) {
        errors.push(
          `Trimesh actor "${actor.id}" has no explicit triangle budget.`,
        )
      }
      if (actor.kind === 'asset') {
        const conventionError = getColliderUrlConventionError(
          actor.physics.collision.colliderUrl,
        )
        if (conventionError) {
          errors.push(`Trimesh asset actor "${actor.id}" ${conventionError}`)
        }
      }
    }
  }

  errors.push(...validateLevelGroundContract(level, actorsById))

  for (const actorId of duplicateActorIds) {
    errors.push(`Duplicate actor id "${actorId}" found in level definition.`)
  }

  const missingRequiredActorIds = requiredActorIds.filter(
    actorId =>
      !actorsById.has(actorId) && !isSatisfiedByRuntimeSystem(level, actorId),
  )
  for (const actorId of missingRequiredActorIds) {
    errors.push(`Required actor "${actorId}" is missing.`)
  }
  for (const actorId of requiredAssetActorIds) {
    const actor = actorsById.get(actorId)
    if (!actor) {
      errors.push(`Required actor "${actorId}" is missing.`)
      continue
    }
    if (actor.render?.visible === false) {
      errors.push(`Required actor "${actorId}" is not visible.`)
    }
    const runtimeAssetUrl = getActorRuntimeAssetUrl(actor)
    if (!runtimeAssetUrl) {
      errors.push(`Required actor "${actorId}" has no runtime asset URL.`)
    } else {
      requiredAssetUrls.add(runtimeAssetUrl)
    }
  }
  for (const actorId of contract.requiredWalkableActorIds) {
    const actor = actorsById.get(actorId)
    if (
      !actor &&
      actorId === `${level.id}-terrain` &&
      hasBakedTerrainRuntime(level)
    ) {
      continue
    }
    if (!actor) continue
    if (!isWalkableActor(actor)) {
      errors.push(`Required actor "${actorId}" is not walkable collision.`)
    }
  }
  const walkabilityIssues = getWalkabilityContractIssues(level, level.actors)
  errors.push(...walkabilityIssues.errors)
  warnings.push(...walkabilityIssues.warnings)
  if (defaultCollisionActorCount > contract.maxDefaultCollisionActors) {
    errors.push(
      `${defaultCollisionActorCount} actors are using implicit default collision; contract allows ${contract.maxDefaultCollisionActors}.`,
    )
  }
  if (trimeshActorCount > contract.maxTrimeshActors) {
    errors.push(
      `${trimeshActorCount} actors are using trimesh collision; contract allows ${contract.maxTrimeshActors}.`,
    )
  }
  if (runtimeAssetUrls.size > contract.maxRuntimeAssetCount) {
    errors.push(
      `${runtimeAssetUrls.size} runtime assets exceed contract budget of ${contract.maxRuntimeAssetCount}.`,
    )
  }
  if (primitiveActorCount > contract.maxPrimitiveActorCount) {
    errors.push(
      `${primitiveActorCount} primitive render actors exceed contract budget of ${contract.maxPrimitiveActorCount}. Bake repeated primitives into runtime assets or chunks.`,
    )
  }
  if (neverCullActorCount > contract.maxNeverCullActorCount) {
    errors.push(
      `${neverCullActorCount} never-cull render actors exceed contract budget of ${contract.maxNeverCullActorCount}.`,
    )
  }
  if (gameplayFireflyActorCount > contract.maxGameplayFireflyCount) {
    errors.push(
      `${gameplayFireflyActorCount} firefly gameplay actors exceed contract budget of ${contract.maxGameplayFireflyCount}. Use chunked/pooled marker presentation.`,
    )
  }

  return {
    levelId: level.id,
    actorCount: level.actors.length,
    assetActorCount,
    primitiveActorCount,
    neverCullActorCount,
    gameplayFireflyActorCount,
    physicsActorCount,
    trimeshActorCount,
    detailMeshActorCount,
    defaultCollisionActorCount,
    visualOnlyActorCount,
    requiredActorCount: requiredActorIds.length,
    requiredRenderActorIds: requiredAssetActorIds,
    missingRequiredActorIds,
    requiredAssetUrls: [...requiredAssetUrls].sort(),
    runtimeAssetUrls: [...runtimeAssetUrls].sort(),
    collisionDiagnostics,
    errors,
    warnings,
  }
}

function getTerrainManifestUrl(levelDefinition) {
  const terrain = levelDefinition.settings?.level?.collision?.terrain
  return typeof terrain?.manifestUrl === 'string'
    ? terrain.manifestUrl
    : undefined
}

function getRuntimeRenderProfile(levelDefinition) {
  return levelDefinition.settings?.level?.renderProfile ?? null
}

function getRuntimeAssetTierCap(levelDefinition) {
  const levelSettings = levelDefinition.settings?.level
  const tier =
    levelSettings?.runtimeAssets?.maxTier ??
    levelSettings?.performance?.assetTierCap
  return ['low', 'medium', 'high'].includes(tier) ? tier : undefined
}

export function createRuntimeSceneManifest(input) {
  return {
    schemaVersion: 1,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    levelId: input.levelDefinition.id,
    sceneId: input.sceneId,
    source: {
      kind: 'scene-document',
      path: input.sourcePath,
      version: input.scene.version,
      updatedAt: input.scene.updatedAt,
    },
    levelDefinition: input.levelDefinition,
    buildReport: input.buildReport,
    runtime: {
      requiredRenderActorIds: input.buildReport.requiredRenderActorIds,
      requiredAssetUrls: input.buildReport.requiredAssetUrls,
      runtimeAssetUrls: input.buildReport.runtimeAssetUrls,
      assetTierCap: getRuntimeAssetTierCap(input.levelDefinition),
      terrainManifestUrl: getTerrainManifestUrl(input.levelDefinition),
      ground: getRuntimeGroundContract(input.levelDefinition),
      renderProfile: getRuntimeRenderProfile(input.levelDefinition),
      worldPartitionUrl: input.worldPartitionUrl,
    },
  }
}
