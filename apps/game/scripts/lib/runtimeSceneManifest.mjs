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
  'water',
  'ambientParticles',
  'ambientAudio',
  'collision',
  'ground',
  'terrainSculpt',
  'worldPartition',
  'graphicsBudget',
  'presets',
  'skyboxPreset',
]

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
  const legacySettings =
    levelId === 'solitude' ? normalized.solitude : normalized.observatory

  normalized.level = mergeLevelSettings(
    pickSharedLevelSettings(legacySettings),
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

function getCollision(node) {
  if (!node.collision || node.collision.enabled === false) return null

  return {
    intent: node.collision.intent,
    channel: node.collision.channel,
    shape: node.collision.shape,
    size: node.collision.size,
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
    editor: {
      legacyKind: node.kind,
      locked: node.locked,
      generation: node.generation,
      collisionSource: collision ? 'authored' : 'none',
    },
  }
}

export function adaptSceneDocumentToLevelDefinition(scene) {
  const spawnPosition = scene.settings?.level?.spawn?.position
  if (!isFiniteVec3(spawnPosition)) {
    throw new Error(
      `${scene.levelId}: scene is missing a finite settings.level.spawn.position Vec3.`,
    )
  }

  return {
    id: scene.levelId,
    version: scene.version,
    updatedAt: scene.updatedAt,
    spawn: {
      player: spawnPosition,
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
  return (
    terrain?.source === 'baked-heightmap' &&
    typeof terrain.manifestUrl === 'string'
  )
}

function isSatisfiedByRuntimeSystem(level, actorId) {
  if (actorId === `${level.id}-terrain` && hasBakedTerrainRuntime(level)) {
    return true
  }
  if (actorId === `${level.id}-player-spawn` && isFiniteVec3(level.spawn.player)) {
    return true
  }
  return false
}

function isVisualOnlyActor(actor) {
  return actor.editor?.collisionSource === 'none' && !actor.physics
}

function isDefaultCollisionActor(actor) {
  return actor.editor?.collisionSource === 'default'
}

function isWalkableActor(actor) {
  return actor.physics?.collision.intent === 'walkable'
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

  if (!isFiniteVec3(level.spawn.player)) errors.push('Player spawn must be a finite Vec3.')

  for (const actor of level.actors) {
    if (actorIds.has(actor.id)) duplicateActorIds.add(actor.id)
    actorIds.add(actor.id)
    actorsById.set(actor.id, actor)

    if (actor.kind === 'asset') assetActorCount += 1
    if (actor.kind === 'primitive') primitiveActorCount += 1
    if (actor.render?.cullingPolicy === 'never') neverCullActorCount += 1
    if (actor.gameplay?.type === 'firefly') gameplayFireflyActorCount += 1
    if (actor.render?.asset?.url) runtimeAssetUrls.add(actor.render.asset.url)
    if (actor.kind === 'asset' && !actor.render?.asset?.url) {
      errors.push(`Asset actor "${actor.id}" is missing a runtime asset URL.`)
    }
    if (isDefaultCollisionActor(actor)) defaultCollisionActorCount += 1
    if (isVisualOnlyActor(actor)) visualOnlyActorCount += 1
    if (!actor.physics) continue

    physicsActorCount += 1
    if (!collisionChannels.has(actor.physics.collision.channel)) {
      errors.push(`Actor "${actor.id}" has an invalid collision channel.`)
    }
    if (actor.physics.collision.intent === 'detailMesh') {
      detailMeshActorCount += 1
      if (actor.physics.collision.triangleBudget === undefined) {
        errors.push(`Detail mesh actor "${actor.id}" has no explicit triangle budget.`)
      }
    }
    if (actor.physics.collision.shape === 'trimesh') {
      trimeshActorCount += 1
      if (actor.physics.collision.triangleBudget === undefined) {
        errors.push(`Trimesh actor "${actor.id}" has no explicit triangle budget.`)
      }
    }
  }

  errors.push(...validateLevelGroundContract(level, actorsById))

  for (const actorId of duplicateActorIds) {
    errors.push(`Duplicate actor id "${actorId}" found in level definition.`)
  }

  const missingRequiredActorIds = requiredActorIds.filter(
    actorId => !actorsById.has(actorId) && !isSatisfiedByRuntimeSystem(level, actorId),
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
    if (!actor.render?.asset?.url) {
      errors.push(`Required actor "${actorId}" has no runtime asset URL.`)
    } else {
      requiredAssetUrls.add(actor.render.asset.url)
    }
  }
  for (const actorId of contract.requiredWalkableActorIds) {
    const actor = actorsById.get(actorId)
    if (!actor && actorId === `${level.id}-terrain` && hasBakedTerrainRuntime(level)) {
      continue
    }
    if (!actor) continue
    if (!isWalkableActor(actor)) {
      errors.push(`Required actor "${actorId}" is not walkable collision.`)
    }
  }
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
    errors,
    warnings,
  }
}

function getTerrainManifestUrl(levelDefinition) {
  const terrain = levelDefinition.settings?.level?.collision?.terrain
  return typeof terrain?.manifestUrl === 'string' ? terrain.manifestUrl : undefined
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
      terrainManifestUrl: getTerrainManifestUrl(input.levelDefinition),
      ground: getRuntimeGroundContract(input.levelDefinition),
      worldPartitionUrl: input.worldPartitionUrl,
    },
  }
}
