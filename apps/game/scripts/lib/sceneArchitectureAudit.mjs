import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { getTerrainAuthorityDiagnostics } from '../../src/threlte/engine/groundContractCore.mjs'
import { findDeprecatedSceneFields } from './deprecatedSceneFields.mjs'

const requiredGraphicsBudgetKeys = [
  'maxRuntimeAssetBytes',
  'maxRuntimeAssetFileBytes',
  'maxGeometryActors',
  'maxPrimitiveActors',
  'maxNeverCullActors',
  'maxGameplayFireflies',
  'maxExplicitColliders',
  'maxLightActors',
  'maxEstimatedDrawCalls',
  'maxAuthoredMaterialSlots',
  'maxEstimatedTriangles',
  'maxAuthoredTextureBytes',
]
const materialTextureKeys = [
  'mapUrl',
  'emissiveMapUrl',
  'metalnessMapUrl',
  'roughnessMapUrl',
  'normalMapUrl',
  'alphaMapUrl',
]
const collisionIntents = new Set([
  'none',
  'walkable',
  'blocker',
  'trigger',
  'detailMesh',
])
const collisionChannels = new Set([
  'worldStatic',
  'worldDynamic',
  'player',
  'trigger',
  'detail',
])
const generatedColliderRoot = '/generated/runtime-game-assets/collision/'
const terrainColliderRoot = '/terrain/collision/'
const colliderUrlSuffix = '.collider.glb'
const parityCollisionIntents = new Set(['walkable', 'blocker'])
const renderProfilePlatformTiers = ['mobile', 'desktop', 'tv']
const reflectionModes = new Set([
  'none',
  'static-environment',
  'screen-space',
  'planar',
  'probe',
])
const reflectionSources = new Set([
  'none',
  'skybox',
  'generated-cubemap',
  'planar-water',
  'screen-space',
  'probe',
])
const postProcessingPasses = new Set([
  'tone-mapping',
  'ambient-occlusion',
  'bloom',
  'color-grading',
  'vignette',
  'anti-aliasing',
  'depth-fog',
])
export function formatBytes(bytes) {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`
}

function normalizePublicPath(path) {
  return path.replace(/^\//, '')
}

function getSceneFiles(sceneDir) {
  return readdirSync(sceneDir)
    .filter((file) => file.endsWith('.scene.json'))
    .sort()
}

function getNonRuntimeSceneJsonFiles(sceneDir) {
  return readdirSync(sceneDir)
    .filter((file) => file.endsWith('.json') && !file.endsWith('.scene.json'))
    .sort()
}

function isGeometryNode(node) {
  return ['asset', 'primitive', 'prefab'].includes(node.kind)
}

function isLightNode(node) {
  return node.kind === 'light' || !!node.light
}

function getGraphicsBudget(scene) {
  return scene.settings?.level?.graphicsBudget ?? null
}

function getRenderProfile(scene) {
  return scene.settings?.level?.renderProfile ?? null
}

function getMissingGraphicsBudgetKeys(graphicsBudget) {
  return requiredGraphicsBudgetKeys.filter(
    (key) => !Number.isFinite(graphicsBudget?.[key]),
  )
}

function getBudgetLimit(graphicsBudget, key) {
  const value = graphicsBudget?.[key]
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY
}

function estimatePrimitiveTriangles(node) {
  const geometry = node.primitive?.geometry
  const args = Array.isArray(node.primitive?.args) ? node.primitive.args : []

  if (geometry === 'box') return 12
  if (geometry === 'plane') return 2
  if (geometry === 'sphere') {
    const widthSegments = Number.isFinite(args[1]) ? args[1] : 32
    const heightSegments = Number.isFinite(args[2]) ? args[2] : 16
    return Math.max(8, Math.round(widthSegments * heightSegments * 2))
  }
  if (geometry === 'cylinder') {
    const radialSegments = Number.isFinite(args[2]) ? args[2] : 32
    return Math.max(12, Math.round(radialSegments * 4))
  }
  if (geometry === 'torus') {
    const radialSegments = Number.isFinite(args[2]) ? args[2] : 8
    const tubularSegments = Number.isFinite(args[3]) ? args[3] : 32
    return Math.max(32, Math.round(radialSegments * tubularSegments * 2))
  }

  return 12
}

function getMaterialTextureUrls(nodes) {
  return [
    ...new Set(
      nodes.flatMap((node) =>
        materialTextureKeys
          .map((key) => node.material?.[key])
          .filter((value) => typeof value === 'string' && value.length > 0),
      ),
    ),
  ].sort()
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0
}

function getColliderUrlConventionError(value) {
  const colliderUrl = String(value ?? '').trim()
  if (!colliderUrl) return 'missing colliderUrl'
  if (!colliderUrl.startsWith('/')) return 'colliderUrl must be absolute'
  if (
    !colliderUrl.startsWith(generatedColliderRoot) &&
    !colliderUrl.startsWith(terrainColliderRoot)
  ) {
    return `colliderUrl must live under ${generatedColliderRoot} or ${terrainColliderRoot}`
  }
  if (!colliderUrl.endsWith(colliderUrlSuffix)) {
    return `colliderUrl must end with ${colliderUrlSuffix}`
  }
  return ''
}

function getColliderMetadataUrl(colliderUrl) {
  return String(colliderUrl ?? '').replace(
    /\.collider\.glb$/i,
    '.collider.meta.json',
  )
}

function fingerprintFile(path) {
  return {
    algorithm: 'sha256',
    value: createHash('sha256').update(readFileSync(path)).digest('hex'),
  }
}

function fingerprintsMatch(left, right) {
  return (
    left?.algorithm === right?.algorithm &&
    typeof left?.value === 'string' &&
    left.value === right?.value
  )
}

function getColliderArtifactFailures({ publicDir, node }) {
  const failures = []
  const colliderUrl = node.collision?.colliderUrl
  const conventionError = getColliderUrlConventionError(colliderUrl)
  if (conventionError) return failures

  const colliderPath = resolvePublicAssetPath(publicDir, colliderUrl)
  if (!existsSync(colliderPath)) {
    failures.push(`${node.id}: collider asset is missing: ${colliderUrl}`)
    return failures
  }

  const metadataUrl =
    node.collision?.colliderMetadataUrl ?? getColliderMetadataUrl(colliderUrl)
  const metadataPath = resolvePublicAssetPath(publicDir, metadataUrl)
  if (!existsSync(metadataPath)) {
    failures.push(`${node.id}: collider metadata is missing: ${metadataUrl}`)
    return failures
  }

  try {
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'))
    if (metadata.colliderUrl !== colliderUrl) {
      failures.push(
        `${node.id}: collider metadata colliderUrl does not match scene collision.colliderUrl`,
      )
    }
    if (metadata.sourceActorId !== node.id) {
      failures.push(
        `${node.id}: collider metadata sourceActorId does not match scene node id`,
      )
    }
    if (node.asset?.url && metadata.sourceAssetUrl !== node.asset.url) {
      failures.push(
        `${node.id}: collider metadata sourceAssetUrl is stale for scene asset URL`,
      )
    }
    if (node.asset?.url && metadata.sourceAssetFingerprint) {
      const sourcePath = resolvePublicAssetPath(publicDir, node.asset.url)
      if (
        existsSync(sourcePath) &&
        !fingerprintsMatch(
          metadata.sourceAssetFingerprint,
          fingerprintFile(sourcePath),
        )
      ) {
        failures.push(
          `${node.id}: collider metadata sourceAssetFingerprint is stale for scene asset`,
        )
      }
    }
    if (
      !Number.isFinite(metadata.triangleCount) ||
      metadata.triangleCount <= 0
    ) {
      failures.push(
        `${node.id}: collider metadata triangleCount must be positive`,
      )
    }
    if (
      Number.isFinite(node.collision?.triangleBudget) &&
      Number.isFinite(metadata.triangleCount) &&
      metadata.triangleCount > node.collision.triangleBudget
    ) {
      failures.push(
        `${node.id}: collider metadata triangleCount exceeds scene triangleBudget`,
      )
    }
    if (
      !metadata.bounds?.min ||
      !metadata.bounds?.max ||
      !metadata.bounds?.size
    ) {
      failures.push(
        `${node.id}: collider metadata must include bounds min, max, and size`,
      )
    }
    if (metadata.schemaVersion >= 2) {
      if (
        !metadata.assetLocalTransform?.visualToPhysicsMatrix &&
        !metadata.assetLocalTransform?.visualToPhysicsLocalMatrix
      ) {
        failures.push(
          `${node.id}: collider metadata is missing assetLocalTransform`,
        )
      }
      if (!metadata.assetLocalTransform?.visualLocalBounds) {
        failures.push(
          `${node.id}: collider metadata must include visualLocalBounds in assetLocalTransform`,
        )
      }
      if (!metadata.assetLocalTransform?.colliderLocalBounds) {
        failures.push(
          `${node.id}: collider metadata must include colliderLocalBounds in assetLocalTransform`,
        )
      }
    }
  } catch (error) {
    failures.push(
      `${node.id}: collider metadata is invalid JSON: ${error.message}`,
    )
  }

  return failures
}

function hasLegacyColliderMetadata({ publicDir, node }) {
  const colliderUrl = node.collision?.colliderUrl
  if (getColliderUrlConventionError(colliderUrl)) return false

  const metadataUrl =
    node.collision?.colliderMetadataUrl ?? getColliderMetadataUrl(colliderUrl)
  const metadataPath = resolvePublicAssetPath(publicDir, metadataUrl)
  if (!existsSync(metadataPath)) return false

  try {
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'))
    return (
      !metadata.assetLocalTransform?.visualToPhysicsMatrix &&
      !metadata.assetLocalTransform?.visualToPhysicsLocalMatrix
    )
  } catch {
    return false
  }
}

function getVisualBookmarkFailures({ file, renderProfile }) {
  const failures = []
  const bookmarks = renderProfile.visualBookmarks
  if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
    return [
      `${file}: renderProfile.visualBookmarks must define at least one visual regression camera bookmark`,
    ]
  }

  const ids = new Set()
  for (const [index, bookmark] of bookmarks.entries()) {
    const path = `renderProfile.visualBookmarks[${index}]`
    if (typeof bookmark?.id !== 'string' || bookmark.id.length === 0) {
      failures.push(`${file}: ${path}.id must be a non-empty string`)
    } else if (ids.has(bookmark.id)) {
      failures.push(`${file}: ${path}.id must be unique`)
    } else {
      ids.add(bookmark.id)
    }
    if (!isFiniteVec3(bookmark?.cameraPosition)) {
      failures.push(`${file}: ${path}.cameraPosition must be a finite Vec3`)
    }
    if (!isFiniteVec3(bookmark?.cameraTarget)) {
      failures.push(`${file}: ${path}.cameraTarget must be a finite Vec3`)
    }
    if (
      bookmark?.playerPosition !== undefined &&
      !isFiniteVec3(bookmark.playerPosition)
    ) {
      failures.push(`${file}: ${path}.playerPosition must be a finite Vec3`)
    }
    const viewport = bookmark?.viewport
    if (
      viewport !== undefined &&
      (!isPositiveInteger(viewport.width) ||
        !isPositiveInteger(viewport.height))
    ) {
      failures.push(
        `${file}: ${path}.viewport must use positive integer width and height`,
      )
    }
    if (
      bookmark?.settleMs !== undefined &&
      !isNonNegativeInteger(bookmark.settleMs)
    ) {
      failures.push(`${file}: ${path}.settleMs must be a non-negative integer`)
    }
  }

  return failures
}

function getReflectionProfileFailures({ file, renderProfile, publicDir }) {
  const failures = []
  const reflections = renderProfile.reflections ?? {}
  const reflectionMode = reflections.mode
  const reflectionSource = reflections.source

  if (!reflectionModes.has(reflectionMode)) {
    failures.push(`${file}: renderProfile.reflections.mode is invalid`)
  }
  if (
    reflectionSource !== undefined &&
    !reflectionSources.has(reflectionSource)
  ) {
    failures.push(`${file}: renderProfile.reflections.source is invalid`)
  }
  if (
    reflections.intent !== undefined &&
    (typeof reflections.intent !== 'string' || reflections.intent.length === 0)
  ) {
    failures.push(
      `${file}: renderProfile.reflections.intent must be a non-empty string`,
    )
  }
  if (
    reflections.estimatedTextureBytes !== undefined &&
    !isNonNegativeInteger(reflections.estimatedTextureBytes)
  ) {
    failures.push(
      `${file}: renderProfile.reflections.estimatedTextureBytes must be a non-negative integer`,
    )
  }
  if (
    reflections.estimatedRenderPasses !== undefined &&
    !isNonNegativeInteger(reflections.estimatedRenderPasses)
  ) {
    failures.push(
      `${file}: renderProfile.reflections.estimatedRenderPasses must be a non-negative integer`,
    )
  }

  const requiredAssetUrls = reflections.requiredAssetUrls
  if (requiredAssetUrls !== undefined && !Array.isArray(requiredAssetUrls)) {
    failures.push(
      `${file}: renderProfile.reflections.requiredAssetUrls must be an array`,
    )
    return failures
  }
  for (const [index, url] of (requiredAssetUrls ?? []).entries()) {
    if (typeof url !== 'string' || url.length === 0) {
      failures.push(
        `${file}: renderProfile.reflections.requiredAssetUrls[${index}] must be a non-empty string`,
      )
      continue
    }
    if (!existsSync(resolvePublicAssetPath(publicDir, url))) {
      failures.push(
        `${file}: renderProfile reflection asset must resolve to a public file: ${url}`,
      )
    }
  }

  return failures
}

function getRenderProfileFailures({
  file,
  renderProfile,
  graphicsBudget,
  publicDir,
}) {
  const failures = []
  if (!renderProfile || typeof renderProfile !== 'object') {
    return [
      `${file}: settings.level.renderProfile must define an authored runtime render profile`,
    ]
  }

  if (typeof renderProfile.id !== 'string' || renderProfile.id.length === 0) {
    failures.push(`${file}: renderProfile.id must be a non-empty string`)
  }
  if (!renderProfilePlatformTiers.includes(renderProfile.defaultTier)) {
    failures.push(
      `${file}: renderProfile.defaultTier must be mobile, desktop, or tv`,
    )
  }
  const qualityTiers = renderProfile.qualityTiers ?? {}
  for (const tier of renderProfilePlatformTiers) {
    if (!qualityTiers[tier]) {
      failures.push(`${file}: renderProfile.qualityTiers.${tier} is required`)
    }
  }

  const baseShadows = renderProfile.shadows ?? {}
  if (!isNonNegativeInteger(baseShadows.maxCastingLights)) {
    failures.push(`${file}: renderProfile.shadows.maxCastingLights is required`)
  }
  if (baseShadows.enabled && !isPositiveInteger(baseShadows.mapSize)) {
    failures.push(
      `${file}: renderProfile.shadows.mapSize is required when shadows are enabled`,
    )
  }
  const lightBudget = graphicsBudget?.maxLightActors
  if (
    Number.isFinite(lightBudget) &&
    Number.isFinite(baseShadows.maxCastingLights) &&
    baseShadows.maxCastingLights > Math.max(1, lightBudget)
  ) {
    failures.push(
      `${file}: renderProfile shadow-casting lights exceed light budget ${baseShadows.maxCastingLights}/${Math.max(1, lightBudget)}`,
    )
  }

  failures.push(
    ...getReflectionProfileFailures({ file, renderProfile, publicDir }),
  )

  const basePost = renderProfile.postProcessing ?? {}
  if (!Array.isArray(basePost.passes)) {
    failures.push(`${file}: renderProfile.postProcessing.passes is required`)
  } else {
    const invalidPasses = basePost.passes.filter(
      (pass) => !postProcessingPasses.has(pass),
    )
    if (invalidPasses.length > 0) {
      failures.push(
        `${file}: renderProfile.postProcessing.passes has invalid entries: ${invalidPasses.join(', ')}`,
      )
    }
    if (
      Number.isFinite(basePost.maxEnabledPasses) &&
      basePost.passes.length > basePost.maxEnabledPasses
    ) {
      failures.push(
        `${file}: renderProfile post passes exceed base budget ${basePost.passes.length}/${basePost.maxEnabledPasses}`,
      )
    }
  }

  failures.push(...getVisualBookmarkFailures({ file, renderProfile }))

  for (const tier of renderProfilePlatformTiers) {
    const tierSettings = qualityTiers[tier] ?? {}
    const tierShadows = tierSettings.shadows ?? {}
    if (
      tierShadows.mapSize !== undefined &&
      !isPositiveInteger(tierShadows.mapSize)
    ) {
      failures.push(
        `${file}: renderProfile.qualityTiers.${tier}.shadows.mapSize must be positive`,
      )
    }
    if (
      Number.isFinite(tierShadows.mapSize) &&
      Number.isFinite(baseShadows.mapSize) &&
      tier !== 'tv' &&
      tierShadows.mapSize > baseShadows.mapSize
    ) {
      failures.push(
        `${file}: renderProfile.qualityTiers.${tier}.shadows.mapSize exceeds base shadow map size`,
      )
    }
    const tierReflectionMode = tierSettings.reflections?.mode
    if (
      tierReflectionMode !== undefined &&
      !reflectionModes.has(tierReflectionMode)
    ) {
      failures.push(
        `${file}: renderProfile.qualityTiers.${tier}.reflections.mode is invalid`,
      )
    }
    const tierReflectionSource = tierSettings.reflections?.source
    if (
      tierReflectionSource !== undefined &&
      !reflectionSources.has(tierReflectionSource)
    ) {
      failures.push(
        `${file}: renderProfile.qualityTiers.${tier}.reflections.source is invalid`,
      )
    }
    const tierRequiredReflectionAssetUrls =
      tierSettings.reflections?.requiredAssetUrls
    if (
      tierRequiredReflectionAssetUrls !== undefined &&
      !Array.isArray(tierRequiredReflectionAssetUrls)
    ) {
      failures.push(
        `${file}: renderProfile.qualityTiers.${tier}.reflections.requiredAssetUrls must be an array`,
      )
    } else {
      for (const [index, url] of (
        tierRequiredReflectionAssetUrls ?? []
      ).entries()) {
        if (typeof url !== 'string' || url.length === 0) {
          failures.push(
            `${file}: renderProfile.qualityTiers.${tier}.reflections.requiredAssetUrls[${index}] must be a non-empty string`,
          )
          continue
        }
        if (!existsSync(resolvePublicAssetPath(publicDir, url))) {
          failures.push(
            `${file}: renderProfile.qualityTiers.${tier} reflection asset must resolve to a public file: ${url}`,
          )
        }
      }
    }
    const tierEstimatedTextureBytes =
      tierSettings.reflections?.estimatedTextureBytes
    if (
      tierEstimatedTextureBytes !== undefined &&
      !isNonNegativeInteger(tierEstimatedTextureBytes)
    ) {
      failures.push(
        `${file}: renderProfile.qualityTiers.${tier}.reflections.estimatedTextureBytes must be a non-negative integer`,
      )
    }
    const tierEstimatedRenderPasses =
      tierSettings.reflections?.estimatedRenderPasses
    if (
      tierEstimatedRenderPasses !== undefined &&
      !isNonNegativeInteger(tierEstimatedRenderPasses)
    ) {
      failures.push(
        `${file}: renderProfile.qualityTiers.${tier}.reflections.estimatedRenderPasses must be a non-negative integer`,
      )
    }
    const tierPasses = tierSettings.postProcessing?.passes
    const tierMaxPasses = tierSettings.postProcessing?.maxEnabledPasses
    if (tierPasses !== undefined && !Array.isArray(tierPasses)) {
      failures.push(
        `${file}: renderProfile.qualityTiers.${tier}.postProcessing.passes must be an array`,
      )
    } else if (Array.isArray(tierPasses)) {
      const invalidPasses = tierPasses.filter(
        (pass) => !postProcessingPasses.has(pass),
      )
      if (invalidPasses.length > 0) {
        failures.push(
          `${file}: renderProfile.qualityTiers.${tier}.postProcessing.passes has invalid entries: ${invalidPasses.join(', ')}`,
        )
      }
      if (Number.isFinite(tierMaxPasses) && tierPasses.length > tierMaxPasses) {
        failures.push(
          `${file}: renderProfile.qualityTiers.${tier} post passes exceed budget ${tierPasses.length}/${tierMaxPasses}`,
        )
      }
    }
  }

  return failures
}

export function isFiniteVec3(value) {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((component) => Number.isFinite(component))
  )
}

function getAssetUrl(node) {
  return typeof node.asset?.url === 'string' ? node.asset.url : null
}

function getPrefabAssetUrl(node, runtimePrefabCatalog) {
  const type = node.prefab?.type
  const variant = node.prefab?.variant
  if (
    typeof type === 'string' &&
    typeof variant === 'string' &&
    typeof runtimePrefabCatalog.assetVariants[type]?.[variant] === 'string'
  ) {
    return runtimePrefabCatalog.assetVariants[type][variant]
  }
  return typeof type === 'string' &&
    typeof runtimePrefabCatalog.assetUrls[type] === 'string'
    ? runtimePrefabCatalog.assetUrls[type]
    : null
}

function resolvePublicAssetPath(publicDir, url) {
  return join(publicDir, normalizePublicPath(url))
}

function readPrefabCatalog(prefabCatalogPath) {
  const source = readFileSync(prefabCatalogPath, 'utf8')
  const catalog = JSON.parse(source)
  return {
    types: new Set(
      Array.isArray(catalog.types)
        ? catalog.types.filter((type) => typeof type === 'string')
        : [],
    ),
    assetUrls:
      catalog.assetUrls && typeof catalog.assetUrls === 'object'
        ? catalog.assetUrls
        : {},
    assetVariants:
      catalog.assetVariants && typeof catalog.assetVariants === 'object'
        ? catalog.assetVariants
        : {},
  }
}

function auditScene({ file, sceneDir, publicDir, runtimePrefabCatalog }) {
  const fullPath = join(sceneDir, file)
  const source = readFileSync(fullPath, 'utf8')
  const hasBom = source.startsWith('\uFEFF')
  const scene = JSON.parse(source.replace(/^\uFEFF/, ''))
  const nodes = Array.isArray(scene.nodes) ? scene.nodes : []
  const deprecatedFields = findDeprecatedSceneFields(scene)
  const terrainAuthorityDiagnostics = getTerrainAuthorityDiagnostics({
    level: {
      id: scene.levelId ?? file.replace(/\.scene\.json$/, ''),
      settings: scene.settings,
    },
  })
  const graphicsBudget = getGraphicsBudget(scene)
  const renderProfile = getRenderProfile(scene)
  const missingGraphicsBudgetKeys = getMissingGraphicsBudgetKeys(graphicsBudget)
  const visualOnlyActorIds = new Set(
    Array.isArray(scene.settings?.level?.collision?.roles?.visualOnlyActorIds)
      ? scene.settings.level.collision.roles.visualOnlyActorIds
      : [],
  )
  const spawnPosition = scene.settings?.level?.spawn?.position
  const geometryNodes = nodes.filter(isGeometryNode)
  const prefabNodes = nodes.filter(
    (node) => node.kind === 'prefab' || node.prefab,
  )
  const unknownPrefabNodes = prefabNodes.filter(
    (node) => !runtimePrefabCatalog.types.has(node.prefab?.type),
  )
  const primitiveNodes = nodes.filter((node) => node.kind === 'primitive')
  const lightNodes = nodes.filter(isLightNode)
  const neverCullNodes = nodes.filter(
    (node) => node.renderPolicy?.cullingPolicy === 'never',
  )
  const gameplayFireflies = nodes.filter(
    (node) => node.gameplay?.type === 'firefly',
  )
  const explicitCollision = geometryNodes.filter((node) => node.collision)
  const missingCollisionIntent = explicitCollision.filter(
    (node) => !collisionIntents.has(node.collision?.intent),
  )
  const missingCollisionChannel = explicitCollision.filter(
    (node) => !collisionChannels.has(node.collision?.channel),
  )
  const invalidCollisionChannel = explicitCollision.filter((node) => {
    const intent = node.collision?.intent
    const channel = node.collision?.channel
    if (!collisionChannels.has(channel)) return false
    if (intent === 'trigger') return channel !== 'trigger'
    if (intent === 'detailMesh') return channel !== 'detail'
    if (intent === 'none') return false
    return channel === 'trigger' || channel === 'detail'
  })
  const unmappedRuntimeCollision = explicitCollision.filter(
    (node) =>
      node.collision?.enabled !== false &&
      node.collision?.intent !== 'none' &&
      !collisionChannels.has(node.collision?.channel),
  )
  const triggerWithoutSensor = explicitCollision.filter(
    (node) =>
      node.collision?.enabled !== false &&
      node.collision?.intent === 'trigger' &&
      node.collision?.sensor !== true,
  )
  const detailMeshBlocking = explicitCollision.filter(
    (node) =>
      node.collision?.enabled !== false &&
      node.collision?.intent === 'detailMesh' &&
      node.collision?.sensor !== true,
  )
  const disabledCollision = explicitCollision.filter(
    (node) => node.collision?.enabled === false,
  )
  const collisionOnlyProxies = explicitCollision.filter(
    (node) =>
      node.collision?.enabled !== false &&
      parityCollisionIntents.has(node.collision?.intent) &&
      node.visible === false,
  )
  const collisionRenderParityFailures = []
  const authoredMaterialSlots = geometryNodes.filter(
    (node) => node.material || node.primitive,
  )
  const estimatedTriangles = primitiveNodes.reduce(
    (sum, node) => sum + estimatePrimitiveTriangles(node),
    0,
  )
  const materialTextureUrls = getMaterialTextureUrls(nodes)
  const materialTextureFiles = materialTextureUrls.map((url) => {
    const fullPath = resolvePublicAssetPath(publicDir, url)
    const exists = existsSync(fullPath)
    const sizeBytes = exists ? statSync(fullPath).size : 0

    return {
      url,
      exists,
      sizeBytes,
    }
  })
  const missingMaterialTextureFiles = materialTextureFiles.filter(
    (texture) => !texture.exists,
  )
  const authoredTextureBytes = materialTextureFiles.reduce(
    (sum, texture) => sum + texture.sizeBytes,
    0,
  )
  const detailMeshWithoutBudget = explicitCollision.filter(
    (node) =>
      node.collision?.enabled !== false &&
      node.collision?.intent === 'detailMesh' &&
      !Number.isFinite(node.collision?.triangleBudget),
  )
  const explicitTrimesh = explicitCollision.filter(
    (node) =>
      node.collision?.enabled !== false && node.collision?.shape === 'trimesh',
  )
  const assetPrimitiveCollision = explicitCollision.filter(
    (node) =>
      node.kind === 'asset' &&
      node.collision?.enabled !== false &&
      node.collision?.shape !== 'trimesh',
  )
  const assetTrimeshMissingCollider = explicitTrimesh.filter(
    (node) => node.kind === 'asset' && !node.collision?.colliderUrl,
  )
  const assetTrimeshColliderConventionFailures = explicitTrimesh.filter(
    (node) =>
      node.kind === 'asset' &&
      getColliderUrlConventionError(node.collision?.colliderUrl),
  )
  const assetTrimeshColliderArtifactFailures = explicitTrimesh
    .filter((node) => node.kind === 'asset')
    .flatMap((node) => getColliderArtifactFailures({ publicDir, node }))
  const assetTrimeshLegacyColliderMetadata = explicitTrimesh.filter(
    (node) =>
      node.kind === 'asset' && hasLegacyColliderMetadata({ publicDir, node }),
  )
  const missingDefaultCollision = geometryNodes.filter(
    (node) =>
      node.visible !== false &&
      !node.gameplay &&
      !node.collision &&
      !visualOnlyActorIds.has(node.id),
  )
  const assetUrls = [
    ...new Set(
      nodes
        .flatMap((node) => [
          getAssetUrl(node),
          getPrefabAssetUrl(node, runtimePrefabCatalog),
        ])
        .filter(Boolean),
    ),
  ].sort()
  const assetFiles = assetUrls.map((url) => {
    const fullPath = resolvePublicAssetPath(publicDir, url)
    const exists = existsSync(fullPath)
    const sizeBytes = exists ? statSync(fullPath).size : 0

    return {
      url,
      exists,
      sizeBytes,
    }
  })
  const missingAssetFiles = assetFiles.filter((asset) => !asset.exists)
  const oversizedAssetFiles = assetFiles.filter(
    (asset) =>
      asset.sizeBytes >
      getBudgetLimit(graphicsBudget, 'maxRuntimeAssetFileBytes'),
  )
  const totalRuntimeAssetBytes = assetFiles.reduce(
    (sum, asset) => sum + asset.sizeBytes,
    0,
  )
  const largestAsset = assetFiles.reduce(
    (largest, asset) =>
      !largest || asset.sizeBytes > largest.sizeBytes ? asset : largest,
    null,
  )

  return {
    file,
    publicDir,
    sizeKb: Math.round(statSync(fullPath).size / 1024),
    nodes: nodes.length,
    graphicsBudget,
    renderProfile,
    missingGraphicsBudgetKeys,
    geometryNodes: geometryNodes.length,
    prefabNodes: prefabNodes.length,
    unknownPrefabReferences: unknownPrefabNodes.length,
    primitiveNodes: primitiveNodes.length,
    lightNodes: lightNodes.length,
    neverCullNodes: neverCullNodes.length,
    gameplayFireflies: gameplayFireflies.length,
    explicitCollision: explicitCollision.length,
    estimatedDrawCalls: geometryNodes.length,
    authoredMaterialSlots: authoredMaterialSlots.length,
    estimatedTriangles,
    authoredTextureBytes,
    missingCollisionIntent: missingCollisionIntent.length,
    missingCollisionChannel: missingCollisionChannel.length,
    invalidCollisionChannel: invalidCollisionChannel.length,
    unmappedRuntimeCollision: unmappedRuntimeCollision.length,
    triggerWithoutSensor: triggerWithoutSensor.length,
    detailMeshBlocking: detailMeshBlocking.length,
    detailMeshWithoutBudget: detailMeshWithoutBudget.length,
    disabledCollision: disabledCollision.length,
    collisionOnlyProxies: collisionOnlyProxies.length,
    collisionRenderParityFailures: collisionRenderParityFailures.length,
    explicitTrimesh: explicitTrimesh.length,
    assetPrimitiveCollision: assetPrimitiveCollision.length,
    assetTrimeshMissingCollider: assetTrimeshMissingCollider.length,
    assetTrimeshColliderConventionFailures:
      assetTrimeshColliderConventionFailures.length,
    assetTrimeshColliderArtifactFailures:
      assetTrimeshColliderArtifactFailures.length,
    assetTrimeshLegacyColliderMetadata:
      assetTrimeshLegacyColliderMetadata.length,
    missingDefaultCollision: missingDefaultCollision.length,
    assetFiles: assetFiles.length,
    totalRuntimeAssetBytes,
    largestAsset,
    hasBom,
    spawnPosition,
    hasValidSpawn: isFiniteVec3(spawnPosition),
    explicitTrimeshIds: explicitTrimesh.map((node) => node.id),
    assetPrimitiveCollisionIds: assetPrimitiveCollision.map((node) => node.id),
    assetTrimeshMissingColliderIds: assetTrimeshMissingCollider.map(
      (node) => node.id,
    ),
    assetTrimeshColliderConventionFailureIds:
      assetTrimeshColliderConventionFailures.map(
        (node) =>
          `${node.id}: ${getColliderUrlConventionError(node.collision?.colliderUrl)}`,
      ),
    assetTrimeshColliderArtifactFailureIds:
      assetTrimeshColliderArtifactFailures,
    assetTrimeshLegacyColliderMetadataIds:
      assetTrimeshLegacyColliderMetadata.map((node) => node.id),
    missingCollisionIntentIds: missingCollisionIntent.map((node) => node.id),
    missingCollisionChannelIds: missingCollisionChannel.map((node) => node.id),
    invalidCollisionChannelIds: invalidCollisionChannel.map((node) => node.id),
    unmappedRuntimeCollisionIds: unmappedRuntimeCollision.map(
      (node) => node.id,
    ),
    triggerWithoutSensorIds: triggerWithoutSensor.map((node) => node.id),
    detailMeshBlockingIds: detailMeshBlocking.map((node) => node.id),
    detailMeshWithoutBudgetIds: detailMeshWithoutBudget.map((node) => node.id),
    collisionOnlyProxyIds: collisionOnlyProxies.map((node) => node.id),
    collisionRenderParityFailureIds: collisionRenderParityFailures.map(
      (node) => node.id,
    ),
    missingDefaultCollisionIds: missingDefaultCollision.map((node) => node.id),
    unknownPrefabReferenceIds: unknownPrefabNodes.map(
      (node) => `${node.id}:${node.prefab?.type ?? 'missing-type'}`,
    ),
    missingAssetFileUrls: missingAssetFiles.map((asset) => asset.url),
    missingMaterialTextureFileUrls: missingMaterialTextureFiles.map(
      (texture) => texture.url,
    ),
    terrainAuthorityErrors: terrainAuthorityDiagnostics.errors,
    terrainAuthorityWarnings: terrainAuthorityDiagnostics.warnings,
    deprecatedFields,
    oversizedAssetFiles,
  }
}

function pushBudgetFailure({
  failures,
  report,
  metricKey,
  budgetKey,
  label,
  guidance,
}) {
  const budget = report.graphicsBudget?.[budgetKey]
  if (!Number.isFinite(budget)) return
  if (report[metricKey] <= budget) return

  failures.push(
    `${report.file}: ${label} exceeds graphics budget ${report[metricKey]}/${budget}${guidance ? `; ${guidance}` : ''}`,
  )
}

function validateSceneReport(report) {
  const failures = []

  if (!report.hasValidSpawn) {
    failures.push(
      `${report.file}: level must define settings.level.spawn.position as a finite Vec3`,
    )
  }
  if (report.missingCollisionIntentIds.length > 0) {
    failures.push(
      `${report.file}: collision entries must declare intent: ${report.missingCollisionIntentIds.join(', ')}`,
    )
  }
  if (report.unknownPrefabReferenceIds.length > 0) {
    failures.push(
      `${report.file}: prefab nodes must reference registered runtime prefab types: ${report.unknownPrefabReferenceIds.join(', ')}`,
    )
  }
  if (report.missingCollisionChannelIds.length > 0) {
    failures.push(
      `${report.file}: collision entries must declare channel: ${report.missingCollisionChannelIds.join(', ')}`,
    )
  }
  if (report.invalidCollisionChannelIds.length > 0) {
    failures.push(
      `${report.file}: collision channel does not match intent: ${report.invalidCollisionChannelIds.join(', ')}`,
    )
  }
  if (report.unmappedRuntimeCollisionIds.length > 0) {
    failures.push(
      `${report.file}: collision channel cannot be mapped to runtime physics groups: ${report.unmappedRuntimeCollisionIds.join(', ')}`,
    )
  }
  if (report.triggerWithoutSensorIds.length > 0) {
    failures.push(
      `${report.file}: trigger collision must be authored as sensor: ${report.triggerWithoutSensorIds.join(', ')}`,
    )
  }
  if (report.detailMeshBlockingIds.length > 0) {
    failures.push(
      `${report.file}: detailMesh collision must be non-blocking/sensor: ${report.detailMeshBlockingIds.join(', ')}`,
    )
  }
  if (report.detailMeshWithoutBudgetIds.length > 0) {
    failures.push(
      `${report.file}: detailMesh collision requires triangleBudget: ${report.detailMeshWithoutBudgetIds.join(', ')}`,
    )
  }
  if (report.assetPrimitiveCollisionIds.length > 0) {
    failures.push(
      `${report.file}: asset collision must be baked trimesh collider assets, not primitive fallback shapes: ${report.assetPrimitiveCollisionIds.join(', ')}`,
    )
  }
  if (report.assetTrimeshMissingColliderIds.length > 0) {
    failures.push(
      `${report.file}: asset trimesh collision must use separate collision.colliderUrl, never the render mesh: ${report.assetTrimeshMissingColliderIds.join(', ')}`,
    )
  }
  if (report.assetTrimeshColliderConventionFailureIds.length > 0) {
    failures.push(
      `${report.file}: asset trimesh collider URLs must follow collider asset conventions: ${report.assetTrimeshColliderConventionFailureIds.join(', ')}`,
    )
  }
  if (report.assetTrimeshColliderArtifactFailureIds.length > 0) {
    failures.push(
      `${report.file}: asset trimesh collider artifacts are missing or invalid: ${report.assetTrimeshColliderArtifactFailureIds.join(', ')}`,
    )
  }
  if (report.hasBom) {
    failures.push(`${report.file}: scene file has a UTF-8 BOM`)
  }
  if (report.deprecatedFields.length > 0) {
    failures.push(
      `${report.file}: deprecated scene fields must be removed: ${report.deprecatedFields.join(', ')}`,
    )
  }
  if (report.missingGraphicsBudgetKeys.length > 0) {
    failures.push(
      `${report.file}: settings.level.graphicsBudget must define ${report.missingGraphicsBudgetKeys.join(', ')}`,
    )
  }
  failures.push(
    ...getRenderProfileFailures({
      file: report.file,
      renderProfile: report.renderProfile,
      graphicsBudget: report.graphicsBudget,
      publicDir: report.publicDir,
    }),
  )
  if (report.missingDefaultCollisionIds.length > 0) {
    failures.push(
      `${report.file}: visible geometry must explicitly author collision or disable it: ${report.missingDefaultCollisionIds.join(', ')}`,
    )
  }
  if (report.collisionRenderParityFailureIds.length > 0) {
    failures.push(
      `${report.file}: walkable/blocker collision must have visible render parity or move the collider to a visible proxy: ${report.collisionRenderParityFailureIds.join(', ')}`,
    )
  }
  if (report.missingAssetFileUrls.length > 0) {
    failures.push(
      `${report.file}: asset URLs must resolve to public files: ${report.missingAssetFileUrls.join(', ')}`,
    )
  }
  if (report.missingMaterialTextureFileUrls.length > 0) {
    failures.push(
      `${report.file}: material texture URLs must resolve to public files: ${report.missingMaterialTextureFileUrls.join(', ')}`,
    )
  }
  if (report.terrainAuthorityErrors.length > 0) {
    failures.push(
      `${report.file}: terrain authority contract is invalid: ${report.terrainAuthorityErrors.join('; ')}`,
    )
  }
  for (const asset of report.oversizedAssetFiles) {
    failures.push(
      `${report.file}: runtime asset exceeds ${formatBytes(report.graphicsBudget.maxRuntimeAssetFileBytes)} budget: ${asset.url} (${formatBytes(asset.sizeBytes)})`,
    )
  }
  if (
    Number.isFinite(report.graphicsBudget?.maxRuntimeAssetBytes) &&
    report.totalRuntimeAssetBytes > report.graphicsBudget.maxRuntimeAssetBytes
  ) {
    failures.push(
      `${report.file}: scene runtime assets exceed ${formatBytes(report.graphicsBudget.maxRuntimeAssetBytes)} budget: ${formatBytes(report.totalRuntimeAssetBytes)}`,
    )
  }

  pushBudgetFailure({
    failures,
    report,
    metricKey: 'geometryNodes',
    budgetKey: 'maxGeometryActors',
    label: 'geometry actors',
    guidance: 'chunk, merge, or stream repeated actors',
  })
  pushBudgetFailure({
    failures,
    report,
    metricKey: 'primitiveNodes',
    budgetKey: 'maxPrimitiveActors',
    label: 'primitive render actors',
    guidance: 'bake repeated primitives into runtime assets or chunks',
  })
  pushBudgetFailure({
    failures,
    report,
    metricKey: 'neverCullNodes',
    budgetKey: 'maxNeverCullActors',
    label: 'never-cull render actors',
  })
  pushBudgetFailure({
    failures,
    report,
    metricKey: 'gameplayFireflies',
    budgetKey: 'maxGameplayFireflies',
    label: 'firefly gameplay actors',
    guidance: 'use chunked or pooled marker presentation',
  })
  pushBudgetFailure({
    failures,
    report,
    metricKey: 'explicitCollision',
    budgetKey: 'maxExplicitColliders',
    label: 'explicit colliders',
    guidance:
      'merge collider proxies or move detail collision into baked artifacts',
  })
  pushBudgetFailure({
    failures,
    report,
    metricKey: 'lightNodes',
    budgetKey: 'maxLightActors',
    label: 'light actors',
    guidance: 'bake static lighting or reduce realtime lights',
  })
  pushBudgetFailure({
    failures,
    report,
    metricKey: 'estimatedDrawCalls',
    budgetKey: 'maxEstimatedDrawCalls',
    label: 'estimated draw calls',
    guidance:
      'merge materials, instance repeated meshes, or chunk by stream cell',
  })
  pushBudgetFailure({
    failures,
    report,
    metricKey: 'authoredMaterialSlots',
    budgetKey: 'maxAuthoredMaterialSlots',
    label: 'authored material slots',
    guidance: 'merge compatible materials or bake atlases',
  })
  pushBudgetFailure({
    failures,
    report,
    metricKey: 'estimatedTriangles',
    budgetKey: 'maxEstimatedTriangles',
    label: 'estimated primitive triangles',
    guidance: 'bake primitives into optimized meshes or author LODs',
  })
  pushBudgetFailure({
    failures,
    report,
    metricKey: 'authoredTextureBytes',
    budgetKey: 'maxAuthoredTextureBytes',
    label: 'authored texture bytes',
    guidance: 'resize or compress scene-authored texture maps',
  })

  return failures
}

export function summarizeSceneReports(reports) {
  return reports.reduce(
    (sum, report) => ({
      nodes: sum.nodes + report.nodes,
      geometryNodes: sum.geometryNodes + report.geometryNodes,
      prefabNodes: sum.prefabNodes + report.prefabNodes,
      unknownPrefabReferences:
        sum.unknownPrefabReferences + report.unknownPrefabReferences,
      primitiveNodes: sum.primitiveNodes + report.primitiveNodes,
      lightNodes: sum.lightNodes + report.lightNodes,
      neverCullNodes: sum.neverCullNodes + report.neverCullNodes,
      gameplayFireflies: sum.gameplayFireflies + report.gameplayFireflies,
      explicitCollision: sum.explicitCollision + report.explicitCollision,
      estimatedDrawCalls: sum.estimatedDrawCalls + report.estimatedDrawCalls,
      authoredMaterialSlots:
        sum.authoredMaterialSlots + report.authoredMaterialSlots,
      estimatedTriangles: sum.estimatedTriangles + report.estimatedTriangles,
      authoredTextureBytes:
        sum.authoredTextureBytes + report.authoredTextureBytes,
      missingGraphicsBudgetKeys:
        sum.missingGraphicsBudgetKeys + report.missingGraphicsBudgetKeys.length,
      missingCollisionIntent:
        sum.missingCollisionIntent + report.missingCollisionIntent,
      missingCollisionChannel:
        sum.missingCollisionChannel + report.missingCollisionChannel,
      invalidCollisionChannel:
        sum.invalidCollisionChannel + report.invalidCollisionChannel,
      unmappedRuntimeCollision:
        sum.unmappedRuntimeCollision + report.unmappedRuntimeCollision,
      triggerWithoutSensor:
        sum.triggerWithoutSensor + report.triggerWithoutSensor,
      detailMeshBlocking: sum.detailMeshBlocking + report.detailMeshBlocking,
      detailMeshWithoutBudget:
        sum.detailMeshWithoutBudget + report.detailMeshWithoutBudget,
      disabledCollision: sum.disabledCollision + report.disabledCollision,
      collisionOnlyProxies:
        sum.collisionOnlyProxies + report.collisionOnlyProxies,
      collisionRenderParityFailures:
        sum.collisionRenderParityFailures +
        report.collisionRenderParityFailures,
      explicitTrimesh: sum.explicitTrimesh + report.explicitTrimesh,
      assetPrimitiveCollision:
        sum.assetPrimitiveCollision + report.assetPrimitiveCollision,
      assetTrimeshMissingCollider:
        sum.assetTrimeshMissingCollider + report.assetTrimeshMissingCollider,
      assetTrimeshColliderConventionFailures:
        sum.assetTrimeshColliderConventionFailures +
        report.assetTrimeshColliderConventionFailures,
      assetTrimeshColliderArtifactFailures:
        sum.assetTrimeshColliderArtifactFailures +
        report.assetTrimeshColliderArtifactFailures,
      assetTrimeshLegacyColliderMetadata:
        sum.assetTrimeshLegacyColliderMetadata +
        report.assetTrimeshLegacyColliderMetadata,
      missingDefaultCollision:
        sum.missingDefaultCollision + report.missingDefaultCollision,
      terrainAuthorityWarnings:
        sum.terrainAuthorityWarnings + report.terrainAuthorityWarnings.length,
      terrainAuthorityErrors:
        sum.terrainAuthorityErrors + report.terrainAuthorityErrors.length,
      deprecatedFields: sum.deprecatedFields + report.deprecatedFields.length,
      assetFiles: sum.assetFiles + report.assetFiles,
      totalRuntimeAssetBytes:
        sum.totalRuntimeAssetBytes + report.totalRuntimeAssetBytes,
      bomFiles: sum.bomFiles + (report.hasBom ? 1 : 0),
    }),
    {
      nodes: 0,
      geometryNodes: 0,
      prefabNodes: 0,
      unknownPrefabReferences: 0,
      primitiveNodes: 0,
      lightNodes: 0,
      neverCullNodes: 0,
      gameplayFireflies: 0,
      explicitCollision: 0,
      estimatedDrawCalls: 0,
      authoredMaterialSlots: 0,
      estimatedTriangles: 0,
      authoredTextureBytes: 0,
      missingGraphicsBudgetKeys: 0,
      missingCollisionIntent: 0,
      missingCollisionChannel: 0,
      invalidCollisionChannel: 0,
      unmappedRuntimeCollision: 0,
      triggerWithoutSensor: 0,
      detailMeshBlocking: 0,
      detailMeshWithoutBudget: 0,
      disabledCollision: 0,
      collisionOnlyProxies: 0,
      collisionRenderParityFailures: 0,
      explicitTrimesh: 0,
      assetPrimitiveCollision: 0,
      assetTrimeshMissingCollider: 0,
      assetTrimeshColliderConventionFailures: 0,
      assetTrimeshColliderArtifactFailures: 0,
      assetTrimeshLegacyColliderMetadata: 0,
      missingDefaultCollision: 0,
      terrainAuthorityWarnings: 0,
      terrainAuthorityErrors: 0,
      deprecatedFields: 0,
      assetFiles: 0,
      totalRuntimeAssetBytes: 0,
      bomFiles: 0,
    },
  )
}

export function auditSceneArchitecture({
  sceneDir,
  publicDir,
  prefabCatalogPath,
}) {
  const runtimePrefabCatalog = readPrefabCatalog(prefabCatalogPath)
  const reports = getSceneFiles(sceneDir).map((file) =>
    auditScene({ file, sceneDir, publicDir, runtimePrefabCatalog }),
  )
  const nonRuntimeSceneJsonFiles = getNonRuntimeSceneJsonFiles(sceneDir)
  const failures = nonRuntimeSceneJsonFiles.map(
    (file) =>
      `${file}: editor/scenes must contain production *.scene.json files only; move backups to authoring/scene-backups`,
  )

  for (const report of reports) {
    failures.push(...validateSceneReport(report))
  }

  return {
    failures,
    nonRuntimeSceneJsonFiles,
    reports,
    totals: summarizeSceneReports(reports),
  }
}
