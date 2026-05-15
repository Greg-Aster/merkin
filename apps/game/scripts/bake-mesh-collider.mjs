import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readGltfAssetMetadata } from './lib/gltfAssetMetadata.mjs'
import {
  createGeneratedCollisionProduct,
  meshCollisionGeneratorVersion,
} from './lib/meshCollisionProducts.mjs'
import {
  createRuntimeAssetCookContext,
  getCookedPublicUrl,
  tierConfigs,
} from './lib/runtimeAssetCookManifest.mjs'
import { cookRuntimeAssetVariant } from './lib/runtimeAssetVariantCooker.mjs'

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))
const appRoot = resolve(repoRoot, 'apps/game')
const defaultPublicRoot = resolve(repoRoot, 'apps/megameal/public')
const defaultSceneRoot = resolve(appRoot, 'src/threlte/editor/scenes')
const generatedColliderPublicRoot =
  '/generated/runtime-game-assets/collision/'
const colliderSuffix = '.collider.glb'
const metadataSuffix = '.collider.meta.json'
const defaultTriangleBudget = 5000
const detailMeshTriangleBudget = 20000
const hardColliderTriangleBudget = 20000
const defaultSimplifyError = 0.05
const defaultCollisionLodSourceTier = 'low'
const assetLocalCoordinateSpaceVersion = 1
const assetLocalIdentityMatrix = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]
const collisionIntents = new Set([
  'walkable',
  'blocker',
  'trigger',
  'detailMesh',
])
const collisionChannels = new Set([
  'worldStatic',
  'worldDynamic',
  'trigger',
  'detail',
])

function parseArgs(argv) {
  const parsed = {
    simplify: true,
    writeScene: true,
  }

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      parsed.help = true
      continue
    }
    if (arg === '--no-simplify') {
      parsed.simplify = false
      continue
    }
    if (arg === '--no-cook-lod-source') {
      parsed.cookLodSource = false
      continue
    }
    if (arg === '--force-lod-source') {
      parsed.forceLodSource = true
      continue
    }
    if (arg === '--dry-run') {
      parsed.writeScene = false
      parsed.dryRun = true
      continue
    }
    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (match) {
      parsed[match[1]] = match[2]
    }
  }

  return parsed
}

function printHelp() {
  console.log(`Bake a scene asset node into an authored trimesh collider.

Usage:
  pnpm --dir apps/game bake:mesh-collider -- --level=<level-id> --node=<node-id>

Options:
  --scene-path=<path>        Scene document path. Defaults to the level scene.
  --public-root=<path>       Public asset root. Defaults to apps/megameal/public.
  --asset-url=<url>          Override the node asset URL.
  --intent=<intent>          walkable, blocker, trigger, or detailMesh.
  --channel=<channel>        worldStatic, worldDynamic, trigger, or detail.
  --triangle-budget=<count>  Maximum collider triangles.
  --simplify-error=<value>   gltf-transform simplify error threshold.
  --lod-source-tier=<tier>   source, low, medium, or high. Defaults to low.
  --no-cook-lod-source       Require the selected LOD source to already exist.
  --force-lod-source         Rebuild the selected LOD source before collider bake.
  --no-simplify             Fail instead of simplifying over-budget assets.
  --dry-run                 Write artifacts but do not update the scene file.
  --help                    Show this help.
`)
}

function slugify(value = 'asset') {
  return (
    String(value || 'asset')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'asset'
  )
}

function assertSafeLevelId(levelId) {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(levelId)) {
    throw new Error(`Unsafe level id: ${levelId}`)
  }
}

function assertSafeNodeId(nodeId) {
  if (!/^[a-z0-9][a-z0-9_.:-]*$/i.test(nodeId)) {
    throw new Error(`Unsafe node id: ${nodeId}`)
  }
}

function normalizePublicUrl(url) {
  const normalized = String(url || '').trim()
  if (!normalized.startsWith('/')) {
    throw new Error('source asset URL must be a public absolute URL.')
  }
  if (!/\.(glb|gltf)$/i.test(normalized.split('?')[0])) {
    throw new Error('source asset URL must reference a .glb or .gltf file.')
  }
  return normalized
}

function normalizeLodSourceTier(value) {
  const normalized = String(value || defaultCollisionLodSourceTier)
  if (normalized === 'source') return normalized
  if (tierConfigs.some(tier => tier.id === normalized)) return normalized
  throw new Error('lod source tier must be source, low, medium, or high.')
}

function getRequestedLodSourceTier(args, node) {
  if (args['lod-source-tier']) return args['lod-source-tier']

  const authoredTier = node.collision?.lodSourceTier ?? node.collision?.lodTier
  return authoredTier === 'source' ? defaultCollisionLodSourceTier : authoredTier
}

function stripCookedLodTier(url) {
  return normalizePublicUrl(url).replace(
    /\.(low|medium|high)(?=\.(glb|gltf)$)/i,
    '',
  )
}

function isCookedLodTierUrl(url, tier) {
  return new RegExp(`\\.${tier}\\.(glb|gltf)$`, 'i').test(
    normalizePublicUrl(url).split('?')[0],
  )
}

function resolvePublicAssetPath(publicRoot, url) {
  const normalized = decodeURIComponent(url.split('?')[0]).replace(/^\/+/, '')
  const fullPath = resolve(publicRoot, normalized)
  const resolvedRoot = resolve(publicRoot)
  if (
    fullPath !== resolvedRoot &&
    !fullPath.startsWith(`${resolvedRoot}${process.platform === 'win32' ? '\\' : '/'}`)
  ) {
    throw new Error('Asset path resolves outside the public directory.')
  }
  return fullPath
}

function prepareCollisionSourceAsset({
  publicRoot,
  visualSourceAssetUrl,
  lodSourceTier,
  cookLodSource,
  forceLodSource,
}) {
  if (lodSourceTier === 'source') {
    return {
      colliderSourceAssetUrl: visualSourceAssetUrl,
      colliderSourceTier: 'source',
      cooked: false,
    }
  }
  if (isCookedLodTierUrl(visualSourceAssetUrl, lodSourceTier)) {
    return {
      colliderSourceAssetUrl: visualSourceAssetUrl,
      colliderSourceTier: lodSourceTier,
      cooked: false,
    }
  }

  const sourceAssetUrl = stripCookedLodTier(visualSourceAssetUrl)
  const colliderSourceAssetUrl = getCookedPublicUrl(
    sourceAssetUrl,
    lodSourceTier,
  )
  const colliderSourcePath = resolvePublicAssetPath(
    publicRoot,
    colliderSourceAssetUrl,
  )
  const shouldCook =
    cookLodSource !== false &&
    (forceLodSource || !existsSync(colliderSourcePath))

  if (shouldCook) {
    const context = createRuntimeAssetCookContext({
      appRoot,
      repoRoot,
      publicRoot,
    })
    const tier = tierConfigs.find(candidate => candidate.id === lodSourceTier)
    cookRuntimeAssetVariant({
      context,
      sourceUrl: sourceAssetUrl,
      tier,
      force: Boolean(forceLodSource),
    })
  }

  if (!existsSync(colliderSourcePath)) {
    throw new Error(
      `Collision LOD source ${colliderSourceAssetUrl} is missing; run runtime asset cooking or pass --lod-source-tier=source.`,
    )
  }

  return {
    colliderSourceAssetUrl,
    colliderSourceTier: lodSourceTier,
    cooked: shouldCook,
  }
}

function toPublicUrl(publicRoot, path) {
  return `/${resolve(path)
    .slice(resolve(publicRoot).length)
    .replace(/^[\\/]+/, '')
    .replace(/\\/g, '/')}`
}

function toRepoRelative(path) {
  return resolve(path).slice(resolve(repoRoot).length).replace(/^[\\/]+/, '')
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function fingerprintFile(path) {
  return {
    algorithm: 'sha256',
    value: createHash('sha256').update(readFileSync(path)).digest('hex'),
  }
}

function getFingerprintValue(fingerprint) {
  return typeof fingerprint === 'string' ? fingerprint : fingerprint?.value ?? ''
}

function createColliderCacheKey(product) {
  return [
    product.generatorVersion,
    getFingerprintValue(product.sourceMeshFingerprint),
    getFingerprintValue(product.transformFingerprint),
    getFingerprintValue(product.policyFingerprint),
  ]
    .filter(Boolean)
    .join(':')
}

function toAssetLocalBounds(bounds) {
  if (!bounds?.min || !bounds?.max) return null
  return {
    min: bounds.min.slice(0, 3),
    max: bounds.max.slice(0, 3),
    size: bounds.size?.slice(0, 3),
    center: bounds.center?.slice(0, 3),
  }
}

function isUsableLocalBounds(bounds) {
  if (
    !bounds ||
    !Array.isArray(bounds.size) ||
    bounds.size.length !== 3 ||
    !bounds.size.every(component => Number.isFinite(component))
  ) {
    return false
  }

  const largestExtent = Math.max(
    ...bounds.size.map(component => Math.abs(component)),
  )
  return largestExtent > 0 && largestExtent < 1024
}

function getColliderLocalBounds({
  colliderBounds,
  colliderSourceBounds,
  visualSourceBounds,
}) {
  return (
    [colliderBounds, colliderSourceBounds, visualSourceBounds].find(
      isUsableLocalBounds,
    ) ?? colliderBounds
  )
}

function createIdentityAssetLocalTransformMetadata({
  sourceAssetUrl,
  sourceNodeName,
  visualLocalBounds,
  colliderLocalBounds,
}) {
  const visualToPhysicsMatrix = [...assetLocalIdentityMatrix]
  return {
    schemaVersion: 1,
    coordinateSpaceVersion: assetLocalCoordinateSpaceVersion,
    sourceAssetUrl,
    ...(sourceNodeName ? { sourceNodeName } : {}),
    visualLocalBounds: toAssetLocalBounds(visualLocalBounds),
    colliderLocalBounds: toAssetLocalBounds(colliderLocalBounds),
    visualToPhysicsMatrix,
    visualToPhysicsLocalMatrix: visualToPhysicsMatrix,
  }
}

function getScenePath({ levelId, scenePath }) {
  if (scenePath) return resolve(scenePath)
  return join(defaultSceneRoot, `${levelId}.scene.json`)
}

function runGltfTransform(args) {
  const result = spawnSync('pnpm', ['exec', 'gltf-transform', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
  if (result.error || result.status !== 0) {
    throw new Error(
      result.error?.message ||
      result.stderr ||
        result.stdout ||
        `gltf-transform failed with exit code ${result.status}`,
    )
  }
  return result
}

function chooseBudget({ requestedBudget, intent }) {
  const parsedBudget = Number(requestedBudget)
  const fallback =
    intent === 'detailMesh' ? detailMeshTriangleBudget : defaultTriangleBudget
  const budget = Number.isFinite(parsedBudget)
    ? Math.floor(parsedBudget)
    : fallback
  if (budget <= 0) throw new Error('triangle budget must be positive.')
  if (budget > hardColliderTriangleBudget) {
    throw new Error(
      `Triangle budget ${budget} exceeds hard collider limit ${hardColliderTriangleBudget}.`,
    )
  }
  return budget
}

function normalizeCollisionPolicy({ intent, channel }) {
  const normalizedIntent = String(intent || 'blocker')
  if (!collisionIntents.has(normalizedIntent)) {
    throw new Error(
      `collision intent must be one of ${[...collisionIntents].join(', ')}.`,
    )
  }

  const defaultChannel =
    normalizedIntent === 'trigger'
      ? 'trigger'
      : normalizedIntent === 'detailMesh'
        ? 'detail'
        : 'worldStatic'
  const normalizedChannel = String(channel || defaultChannel)
  if (!collisionChannels.has(normalizedChannel)) {
    throw new Error(
      `collision channel must be one of ${[...collisionChannels].join(', ')}.`,
    )
  }
  if (normalizedIntent === 'trigger' && normalizedChannel !== 'trigger') {
    throw new Error('trigger collider bakes must use the trigger channel.')
  }
  if (normalizedIntent === 'detailMesh' && normalizedChannel !== 'detail') {
    throw new Error('detailMesh collider bakes must use the detail channel.')
  }

  return {
    intent: normalizedIntent,
    channel: normalizedChannel,
  }
}

function buildOutputPaths({ publicRoot, levelId, nodeId }) {
  const directory = resolve(
    publicRoot,
    'generated/runtime-game-assets/collision',
    slugify(levelId),
  )
  const fileStem = slugify(nodeId)
  return {
    directory,
    colliderPath: join(directory, `${fileStem}${colliderSuffix}`),
    metadataPath: join(directory, `${fileStem}${metadataSuffix}`),
  }
}

function bakeColliderAsset({
  sourcePath,
  outputPath,
  sourceTriangleCount,
  triangleBudget,
  simplify,
  simplifyError = defaultSimplifyError,
}) {
  mkdirSync(dirname(outputPath), { recursive: true })
  const simplification = {
    requested: Boolean(simplify && sourceTriangleCount > triangleBudget),
    applied: false,
    sourceTriangleCount,
    targetTriangleBudget: triangleBudget,
    ratio: 1,
    tool: 'gltf-transform',
    prepass: 'none',
    error: simplifyError,
  }

  if (simplification.requested) {
    const tempRoot = mkdtempSync(join(tmpdir(), 'mesh-collider-bake-'))
    const weldedPath = join(tempRoot, 'welded.glb')
    simplification.ratio = Math.max(
      0.01,
      Math.min(1, (triangleBudget / sourceTriangleCount) * 0.95),
    )
    try {
      runGltfTransform(['weld', sourcePath, weldedPath])
      simplification.prepass = 'weld'
      runGltfTransform([
        'simplify',
        weldedPath,
        outputPath,
        '--ratio',
        String(simplification.ratio),
        '--error',
        String(simplifyError),
        '--lock-border',
        'false',
      ])
      simplification.applied = true
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  } else {
    runGltfTransform(['copy', sourcePath, outputPath])
  }

  return simplification
}

function assertColliderMetadata({ metadata, outputPath, triangleBudget }) {
  if (!metadata.valid) {
    throw new Error(`Generated collider is invalid: ${metadata.errors.join(' ')}`)
  }
  if (metadata.triangleCount <= 0) {
    throw new Error('Generated collider has no triangles.')
  }
  if (metadata.triangleCount > triangleBudget) {
    rmSync(outputPath, { force: true })
    throw new Error(
      `Generated collider has ${metadata.triangleCount} triangles, exceeding budget ${triangleBudget}.`,
    )
  }
  if (!metadata.bounds) {
    throw new Error('Generated collider metadata is missing bounds.')
  }
}

function updateSceneNode({
  scene,
  node,
  colliderUrl,
  metadataUrl,
  sourceAssetUrl,
  colliderSourceAssetUrl,
  lodSourceTier,
  assetLocalTransform,
  triangleCount,
  colliderCacheKey,
  triangleBudget,
  intent,
  channel,
}) {
  node.collision = {
    ...(node.collision ?? {}),
    shape: 'trimesh',
    colliderUrl,
    colliderMetadataUrl: metadataUrl,
    colliderCacheKey,
    sourceAssetUrl,
    colliderSourceAssetUrl,
    assetLocalTransform,
    lodTier: lodSourceTier,
    lodSourceTier: undefined,
    maxTriangles: triangleBudget,
    intent,
    channel,
    mode: intent === 'trigger' ? 'trigger' : 'auto',
    triangleCount,
    sensor: intent === 'trigger' || intent === 'detailMesh',
    friction: node.collision?.friction ?? 0.7,
    restitution: node.collision?.restitution ?? 0,
    generationStatus: 'ready',
    generationLastError: undefined,
  }
  scene.updatedAt = new Date().toISOString()
  return {
    shape: node.collision.shape,
    colliderUrl: node.collision.colliderUrl,
    colliderMetadataUrl: node.collision.colliderMetadataUrl,
    colliderCacheKey: node.collision.colliderCacheKey,
    sourceAssetUrl: node.collision.sourceAssetUrl,
    colliderSourceAssetUrl: node.collision.colliderSourceAssetUrl,
    lodTier: node.collision.lodTier,
    assetLocalTransform: node.collision.assetLocalTransform,
    maxTriangles: triangleBudget,
    triangleCount,
    intent,
    channel,
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }
  const levelId = String(args.level || args.levelId || '')
  const nodeId = String(args.node || args.nodeId || '')
  const publicRoot = resolve(String(args['public-root'] || defaultPublicRoot))
  const scenePath = getScenePath({ levelId, scenePath: args['scene-path'] })

  assertSafeLevelId(levelId)
  assertSafeNodeId(nodeId)

  const scene = readJson(scenePath)
  const node = (scene.nodes ?? []).find(candidate => candidate.id === nodeId)
  if (!node) {
    throw new Error(`Scene node not found: ${nodeId}`)
  }
  if (node.kind !== 'asset' && node.kind !== 'prefab') {
    throw new Error(
      'Mesh collider baking requires an asset or prefab node.',
    )
  }
  if (node.kind === 'asset' && !node.asset?.url) {
    throw new Error('Asset node is missing a source URL.')
  }
  if (node.kind === 'prefab' && !args['asset-url']) {
    throw new Error(
      'Prefab mesh collider baking requires --asset-url=<resolved variant URL>.',
    )
  }

  const sourceAssetUrl = normalizePublicUrl(
    args['asset-url'] || node.asset?.url,
  )
  const sourcePath = resolvePublicAssetPath(publicRoot, sourceAssetUrl)
  if (!existsSync(sourcePath)) {
    throw new Error(`Source asset file not found: ${sourceAssetUrl}`)
  }
  const lodSourceTier = normalizeLodSourceTier(
    getRequestedLodSourceTier(args, node),
  )
  const collisionSource = prepareCollisionSourceAsset({
    publicRoot,
    visualSourceAssetUrl: sourceAssetUrl,
    lodSourceTier,
    cookLodSource: args.cookLodSource,
    forceLodSource: args.forceLodSource,
  })
  const colliderSourcePath = resolvePublicAssetPath(
    publicRoot,
    collisionSource.colliderSourceAssetUrl,
  )

  const { intent, channel } = normalizeCollisionPolicy({
    intent: args.intent || node.collision?.intent,
    channel: args.channel || node.collision?.channel,
  })
  const triangleBudget = chooseBudget({
    requestedBudget:
      args['triangle-budget'] ??
      args['max-triangles'] ??
      node.collision?.maxTriangles ??
      node.collision?.triangleBudget,
    intent,
  })
  const visualSourceMetadata = readGltfAssetMetadata(sourcePath)
  if (!visualSourceMetadata.valid) {
    throw new Error(
      `Source asset metadata is invalid: ${visualSourceMetadata.errors.join(' ')}`,
    )
  }
  const colliderSourceMetadata = readGltfAssetMetadata(colliderSourcePath)
  if (!colliderSourceMetadata.valid) {
    throw new Error(
      `Collision source asset metadata is invalid: ${colliderSourceMetadata.errors.join(' ')}`,
    )
  }
  if (colliderSourceMetadata.triangleCount > triangleBudget && !args.simplify) {
    throw new Error(
      `Collision source asset has ${colliderSourceMetadata.triangleCount} triangles, exceeding budget ${triangleBudget}; enable simplification or author a simpler collision mesh.`,
    )
  }

  const { directory, colliderPath, metadataPath } = buildOutputPaths({
    publicRoot,
    levelId,
    nodeId,
  })
  mkdirSync(directory, { recursive: true })

  const simplification = bakeColliderAsset({
    sourcePath: colliderSourcePath,
    outputPath: colliderPath,
    sourceTriangleCount: colliderSourceMetadata.triangleCount,
    triangleBudget,
    simplify: args.simplify,
    simplifyError: Number(args['simplify-error'] ?? defaultSimplifyError),
  })
  const colliderMetadata = readGltfAssetMetadata(colliderPath)
  assertColliderMetadata({
    metadata: colliderMetadata,
    outputPath: colliderPath,
    triangleBudget,
  })

  const colliderUrl = toPublicUrl(publicRoot, colliderPath)
  const metadataUrl = toPublicUrl(publicRoot, metadataPath)
  const generatedAt = new Date().toISOString()
  const sourceAssetFingerprint = fingerprintFile(sourcePath)
  const colliderSourceAssetFingerprint = fingerprintFile(colliderSourcePath)
  const bakeConfig = {
    command: 'pnpm --dir apps/game bake:mesh-collider',
    levelId,
    nodeId,
    sourceAssetUrl,
    colliderSourceAssetUrl: collisionSource.colliderSourceAssetUrl,
    lodSourceTier,
    intent,
    channel,
    triangleBudget,
    simplify: Boolean(args.simplify),
    simplifyError: Number(args['simplify-error'] ?? defaultSimplifyError),
  }
  const colliderLocalBounds = getColliderLocalBounds({
    colliderBounds: colliderMetadata.bounds,
    colliderSourceBounds: colliderSourceMetadata.bounds,
    visualSourceBounds: visualSourceMetadata.bounds,
  })
  const assetLocalTransform = createIdentityAssetLocalTransformMetadata({
    sourceAssetUrl,
    sourceNodeName: node.name || node.id,
    visualLocalBounds: visualSourceMetadata.bounds,
    colliderLocalBounds,
  })
  const productNode = {
    ...node,
    collision: {
      ...(node.collision ?? {}),
      shape: 'trimesh',
      colliderUrl,
      colliderMetadataUrl: metadataUrl,
      sourceAssetUrl,
      colliderSourceAssetUrl: collisionSource.colliderSourceAssetUrl,
      lodTier: lodSourceTier,
      maxTriangles: triangleBudget,
      intent,
      channel,
      mode: intent === 'trigger' ? 'trigger' : 'auto',
      triangleCount: colliderMetadata.triangleCount,
      vertexCount: colliderMetadata.vertexCount,
      sensor: intent === 'trigger' || intent === 'detailMesh',
    },
  }
  const collisionProduct = createGeneratedCollisionProduct({
    levelId,
    node: productNode,
    publicRoot,
    metadata: {
      generatedAt,
      triangleCount: colliderMetadata.triangleCount,
      vertexCount: colliderMetadata.vertexCount,
      bounds: colliderLocalBounds,
      colliderLocalBounds,
    },
    generatorVersion: meshCollisionGeneratorVersion,
  })
  const colliderCacheKey = createColliderCacheKey(collisionProduct)
  const artifactMetadata = {
    schemaVersion: 3,
    generatedBy: 'mesh-collision-manager',
    generatedAt,
    generatorVersion: meshCollisionGeneratorVersion,
    sourceLevelId: levelId,
    sourceActorId: nodeId,
    sourceAssetUrl,
    sourceAssetPath: toRepoRelative(sourcePath),
    sourceAssetFingerprint,
    colliderSourceAssetUrl: collisionSource.colliderSourceAssetUrl,
    colliderSourceAssetPath: toRepoRelative(colliderSourcePath),
    colliderSourceAssetFingerprint,
    lodSourceTier,
    colliderUrl,
    colliderPath: toRepoRelative(colliderPath),
    metadataUrl,
    colliderCacheKey,
    triangleCount: colliderMetadata.triangleCount,
    vertexCount: colliderMetadata.vertexCount,
    bounds: colliderLocalBounds,
    rawColliderBounds: colliderMetadata.bounds,
    visualLocalBounds: visualSourceMetadata.bounds,
    colliderLocalBounds,
    assetLocalTransform,
    provenance: {
      sourceActorId: nodeId,
      sourceActorName: node.name || null,
      sourceAssetUrl,
      sourceAssetPath: toRepoRelative(sourcePath),
      sourceAssetFingerprint,
      colliderSourceAssetUrl: collisionSource.colliderSourceAssetUrl,
      colliderSourceAssetPath: toRepoRelative(colliderSourcePath),
      colliderSourceAssetFingerprint,
      lodSourceTier,
      bakeConfig,
      generatedAt,
    },
    collision: {
      shape: 'trimesh',
      intent,
      channel,
      triangleBudget,
      lodSourceTier,
    },
    collisionProduct,
    simplification,
  }
  writeJson(metadataPath, artifactMetadata)

  const collision = updateSceneNode({
    scene,
    node,
    colliderUrl,
    metadataUrl,
    sourceAssetUrl,
    colliderSourceAssetUrl: collisionSource.colliderSourceAssetUrl,
    lodSourceTier,
    assetLocalTransform,
    triangleCount: colliderMetadata.triangleCount,
    colliderCacheKey,
    triangleBudget,
    intent,
    channel,
  })

  if (args.writeScene) {
    writeJson(scenePath, scene)
  }

  const payload = {
    success: true,
    levelId,
    nodeId,
    sourceAssetUrl,
    colliderSourceAssetUrl: collisionSource.colliderSourceAssetUrl,
    lodSourceTier,
    colliderUrl,
    metadataUrl,
    colliderPath: toRepoRelative(colliderPath),
    metadataPath: toRepoRelative(metadataPath),
    scenePath: toRepoRelative(scenePath),
    sceneUpdated: Boolean(args.writeScene),
    collision,
    colliderCacheKey,
    triangleCount: colliderMetadata.triangleCount,
    sourceAssetFingerprint,
    colliderSourceAssetFingerprint,
    assetLocalTransform,
    bounds: colliderLocalBounds,
    simplification,
    message: `Baked collider for ${nodeId}: ${colliderMetadata.triangleCount} triangles.`,
  }

  console.log(JSON.stringify(payload))
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
