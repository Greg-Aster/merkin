import fs from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { readGltfAssetMetadata } from './lib/gltfAssetMetadata.mjs'

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const PUBLIC_ROOT = path.join(REPO_ROOT, 'apps', 'megameal', 'public')
const ASSET_LOCAL_IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]

function parseArgs(argv) {
  const options = {
    delta: '',
    output: '',
    write: false,
  }

  for (const arg of argv) {
    if (arg === '--write') {
      options.write = true
    } else if (arg.startsWith('--delta=')) {
      options.delta = arg.slice('--delta='.length)
    } else if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length)
    }
  }

  return options
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function repoRelative(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, '/')
}

function slugify(value = 'asset') {
  return (
    String(value || 'asset')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'asset'
  )
}

function fingerprintFile(filePath) {
  return {
    algorithm: 'sha256',
    value: createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'),
  }
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

function createIdentityAssetLocalTransformMetadata({
  sourceAssetUrl,
  sourceNodeName,
  colliderLocalBounds,
}) {
  return {
    schemaVersion: 1,
    coordinateSpaceVersion: 1,
    sourceAssetUrl,
    sourceNodeName: sourceNodeName ?? null,
    sourceMeshName: null,
    visualLocalBounds: null,
    colliderLocalBounds: toAssetLocalBounds(colliderLocalBounds),
    visualToPhysicsMatrix: ASSET_LOCAL_IDENTITY_MATRIX,
    visualToPhysicsLocalMatrix: ASSET_LOCAL_IDENTITY_MATRIX,
  }
}

function getPublicCollisionPaths({ levelId, nodeId }) {
  const directory = path.join(
    PUBLIC_ROOT,
    'generated/runtime-game-assets/collision',
    slugify(levelId),
  )
  const stem = slugify(nodeId)
  return {
    directory,
    colliderPath: path.join(directory, `${stem}.collider.glb`),
    metadataPath: path.join(directory, `${stem}.collider.meta.json`),
  }
}

function toPublicUrl(filePath) {
  return `/${path
    .resolve(filePath)
    .slice(path.resolve(PUBLIC_ROOT).length)
    .replace(/^[\\/]+/, '')
    .replace(/\\/g, '/')}`
}

function resolveDeltaPath(deltaPath) {
  if (!deltaPath) {
    throw new Error('Missing --delta=<path-to-merkin-scene-delta.json>.')
  }
  return path.resolve(REPO_ROOT, deltaPath)
}

function resolvePackagePath(delta, deltaPath) {
  const rawPackagePath = delta.sourcePackagePath || ''
  if (!rawPackagePath) {
    throw new Error('Delta is missing sourcePackagePath.')
  }

  if (path.isAbsolute(rawPackagePath) && fs.existsSync(rawPackagePath)) {
    return rawPackagePath
  }

  const relativeToRepo = path.resolve(REPO_ROOT, rawPackagePath)
  if (fs.existsSync(relativeToRepo)) return relativeToRepo

  const relativeToDelta = path.resolve(path.dirname(deltaPath), rawPackagePath)
  if (fs.existsSync(relativeToDelta)) return relativeToDelta

  throw new Error(`Could not resolve source package path: ${rawPackagePath}`)
}

function resolveScenePath(packageData, packagePath) {
  const sourceScenePath = packageData.sourceScenePath || ''
  if (!sourceScenePath) {
    const fallback = path.join(path.dirname(packagePath), 'source.scene.json')
    if (fs.existsSync(fallback)) return fallback
    throw new Error('Package is missing sourceScenePath.')
  }

  const relativeToRepo = path.resolve(REPO_ROOT, sourceScenePath)
  if (fs.existsSync(relativeToRepo)) return relativeToRepo

  const relativeToPackage = path.resolve(
    path.dirname(packagePath),
    sourceScenePath,
  )
  if (fs.existsSync(relativeToPackage)) return relativeToPackage

  throw new Error(`Could not resolve source scene path: ${sourceScenePath}`)
}

function materializePackagedTrimeshColliders({
  delta,
  packagePath,
  sourceScene,
  levelId,
}) {
  const packageDirectory = path.dirname(packagePath)
  const nodesById = new Map(
    Array.isArray(sourceScene.nodes)
      ? sourceScene.nodes.map(node => [node.id, node])
      : [],
  )
  const changes = Array.isArray(delta.changes) ? delta.changes : []

  return {
    ...delta,
    changes: changes.map(change => {
      const collision = change?.collision
      if (
        !change?.nodeId ||
        !collision ||
        collision.shape !== 'trimesh' ||
        typeof collision.colliderPackagePath !== 'string' ||
        !collision.colliderPackagePath.trim()
      ) {
        return change
      }

      const sourcePath = path.resolve(packageDirectory, collision.colliderPackagePath)
      if (!fs.existsSync(sourcePath)) return change

      const node = nodesById.get(change.nodeId)
      const { directory, colliderPath, metadataPath } = getPublicCollisionPaths({
        levelId,
        nodeId: change.nodeId,
      })
      fs.mkdirSync(directory, { recursive: true })
      fs.copyFileSync(sourcePath, colliderPath)

      const colliderMetadata = readGltfAssetMetadata(colliderPath)
      if (!colliderMetadata.valid) {
        throw new Error(
          `Packaged trimesh collider is invalid for ${change.nodeId}: ${colliderMetadata.errors.join(' ')}`,
        )
      }
      if (colliderMetadata.triangleCount <= 0) {
        throw new Error(
          `Packaged trimesh collider has no triangles for ${change.nodeId}.`,
        )
      }
      const triangleBudget = Number(
        collision.triangleBudget ?? node?.collision?.triangleBudget,
      )
      if (
        Number.isFinite(triangleBudget) &&
        triangleBudget > 0 &&
        colliderMetadata.triangleCount > triangleBudget
      ) {
        throw new Error(
          `Packaged trimesh collider for ${change.nodeId} has ${colliderMetadata.triangleCount} triangles, exceeding budget ${triangleBudget}.`,
        )
      }

      const colliderUrl = toPublicUrl(colliderPath)
      const colliderMetadataUrl = toPublicUrl(metadataPath)
      const sourceAssetUrl =
        collision.sourceAssetUrl ||
        node?.asset?.url ||
        node?.collision?.sourceAssetUrl ||
        ''
      const assetLocalTransform = createIdentityAssetLocalTransformMetadata({
        sourceAssetUrl,
        sourceNodeName: node?.name || change.name || change.nodeId,
        colliderLocalBounds: colliderMetadata.bounds,
      })
      const metadata = {
        schemaVersion: 2,
        generatedBy: 'import-blender-scene-delta',
        generatedAt: new Date().toISOString(),
        sourceLevelId: levelId,
        sourceActorId: change.nodeId,
        sourceActorName: node?.name || change.name || null,
        sourceAssetUrl,
        colliderUrl,
        colliderPath: repoRelative(colliderPath),
        metadataUrl: colliderMetadataUrl,
        triangleCount: colliderMetadata.triangleCount,
        vertexCount: colliderMetadata.vertexCount,
        bounds: colliderMetadata.bounds,
        visualLocalBounds: null,
        colliderLocalBounds: colliderMetadata.bounds,
        assetLocalTransform,
        sourceColliderFingerprint: fingerprintFile(colliderPath),
        provenance: {
          sourceActorId: change.nodeId,
          sourceActorName: node?.name || change.name || null,
          sourceAssetUrl,
          sourceColliderPackagePath: repoRelative(sourcePath),
          sourceColliderFingerprint: fingerprintFile(colliderPath),
          generatedAt: new Date().toISOString(),
        },
        collision: {
          shape: 'trimesh',
          intent: collision.intent ?? node?.collision?.intent,
          channel: collision.channel ?? node?.collision?.channel,
          triangleBudget: Number.isFinite(triangleBudget)
            ? triangleBudget
            : undefined,
        },
      }
      writeJson(metadataPath, metadata)

      return {
        ...change,
        collision: {
          mode: collision.intent === 'trigger' ? 'trigger' : 'auto',
          intent: collision.intent ?? node?.collision?.intent ?? 'blocker',
          channel: collision.channel ?? node?.collision?.channel,
          quality: 'trimesh',
          maxTriangles: Number.isFinite(triangleBudget)
            ? triangleBudget
            : undefined,
        },
      }
    }),
  }
}

function sanitizeVector(value, fallback) {
  if (!Array.isArray(value) || value.length !== 3) return fallback
  const next = value.map(Number)
  return next.every(Number.isFinite) ? next : fallback
}

const COLLISION_SHAPES = new Set(['cuboid', 'cylinder', 'trimesh'])
const COLLISION_MODES = new Set(['auto', 'none', 'trigger'])
const COLLISION_QUALITIES = new Set([
  'primitive',
  'convexHull',
  'simplifiedMesh',
  'trimesh',
])
const COLLISION_INTENTS = new Set([
  'none',
  'walkable',
  'blocker',
  'trigger',
  'detailMesh',
])
const COLLISION_CHANNELS = new Set([
  'worldStatic',
  'worldDynamic',
  'player',
  'trigger',
  'detail',
])

function sanitizeBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback
}

function sanitizeFiniteNumber(value, fallback) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function sanitizePositiveInteger(value, fallback) {
  const next = Number(value)
  return Number.isFinite(next) && next > 0 ? Math.round(next) : fallback
}

function sanitizeEnum(value, allowedValues, fallback) {
  return typeof value === 'string' && allowedValues.has(value) ? value : fallback
}

function sanitizeCollisionPatch(value, currentCollision = undefined) {
  if (!value || typeof value !== 'object') return undefined

  const current =
    currentCollision && typeof currentCollision === 'object'
      ? currentCollision
      : {}
  const shape = sanitizeEnum(value.shape, COLLISION_SHAPES, current.shape)
  const mode =
    sanitizeEnum(value.mode, COLLISION_MODES, current.mode) ??
    (value.enabled === false || value.intent === 'none'
      ? 'none'
      : value.sensor || value.intent === 'trigger'
        ? 'trigger'
        : current.mode ?? 'auto')
  const quality =
    sanitizeEnum(value.quality, COLLISION_QUALITIES, undefined) ??
    (value.shape && shape
      ? shape === 'trimesh'
        ? 'simplifiedMesh'
        : 'primitive'
      : current.quality) ??
    (shape === 'trimesh' ? 'simplifiedMesh' : 'primitive')

  const collision = {
    mode,
    ...(current.intent ? { intent: current.intent } : {}),
    ...(current.channel ? { channel: current.channel } : {}),
    ...(current.quality ? { quality: current.quality } : {}),
    ...(Number.isFinite(current.friction)
      ? { friction: current.friction }
      : {}),
    ...(Number.isFinite(current.restitution)
      ? { restitution: current.restitution }
      : {}),
    ...(current.sensor !== undefined ? { sensor: Boolean(current.sensor) } : {}),
    ...(Number.isFinite(current.maxTriangles ?? current.triangleBudget)
      ? { maxTriangles: current.maxTriangles ?? current.triangleBudget }
      : {}),
  }

  if ('intent' in value) {
    collision.intent = sanitizeEnum(
      value.intent,
      COLLISION_INTENTS,
      current.intent,
    )
  }
  if ('channel' in value) {
    collision.channel = sanitizeEnum(
      value.channel,
      COLLISION_CHANNELS,
      current.channel,
    )
  }
  if (mode === 'none') collision.intent = 'none'
  if (mode === 'trigger') collision.intent = 'trigger'
  if (mode !== 'none') collision.quality = quality
  if ('sensor' in value) {
    collision.sensor =
      mode === 'trigger'
        ? true
        : sanitizeBoolean(value.sensor, current.sensor ?? false)
  }
  if ('friction' in value) {
    collision.friction = sanitizeFiniteNumber(
      value.friction,
      current.friction ?? 0.7,
    )
  }
  if ('restitution' in value) {
    collision.restitution = sanitizeFiniteNumber(
      value.restitution,
      current.restitution ?? 0,
    )
  }
  if ('triangleBudget' in value || 'maxTriangles' in value) {
    collision.maxTriangles = sanitizePositiveInteger(
      value.maxTriangles ?? value.triangleBudget,
      current.maxTriangles ?? current.triangleBudget,
    )
  }
  if (collision.quality === 'primitive') {
    delete collision.maxTriangles
  }

  return collision
}

export function applyDelta(scene, delta) {
  const changesByNodeId = new Map(
    (Array.isArray(delta.changes) ? delta.changes : [])
      .filter(change => change?.nodeId)
      .map(change => [change.nodeId, change]),
  )

  let updatedCount = 0
  const nodes = Array.isArray(scene.nodes)
    ? scene.nodes.map(node => {
        const change = changesByNodeId.get(node.id)
        if (!change) return node

        updatedCount += 1
        const collision = sanitizeCollisionPatch(change.collision, node.collision)
        return {
          ...node,
          position: sanitizeVector(change.position, node.position ?? [0, 0, 0]),
          rotation: sanitizeVector(change.rotation, node.rotation ?? [0, 0, 0]),
          scale: sanitizeVector(change.scale, node.scale ?? [1, 1, 1]),
          ...(collision ? { collision } : {}),
        }
      })
    : []

  return {
    scene: {
      ...scene,
      nodes,
      updatedAt: new Date().toISOString(),
    },
    updatedCount,
    unknownNodeIds: [...changesByNodeId.keys()].filter(
      nodeId => !nodes.some(node => node.id === nodeId),
    ),
  }
}

export function main() {
  const options = parseArgs(process.argv.slice(2))
  const deltaPath = resolveDeltaPath(options.delta)
  if (!fs.existsSync(deltaPath)) {
    throw new Error(`Delta file not found: ${deltaPath}`)
  }

  const delta = readJson(deltaPath)
  if (delta.schema !== 'merkin.sceneDelta.v1') {
    throw new Error(`Unsupported delta schema: ${delta.schema || 'missing'}`)
  }

  const packagePath = resolvePackagePath(delta, deltaPath)
  const packageData = readJson(packagePath)
  if (packageData.schema !== 'merkin.scenePackage.v1') {
    throw new Error(
      `Unsupported package schema: ${packageData.schema || 'missing'}`,
    )
  }

  const sourceScenePath = resolveScenePath(packageData, packagePath)
  const sourceScene = readJson(sourceScenePath)
  const materializedDelta = materializePackagedTrimeshColliders({
    delta,
    packagePath,
    sourceScene,
    levelId: packageData.levelId || delta.levelId || sourceScene.levelId || '',
  })
  const { scene, updatedCount, unknownNodeIds } = applyDelta(
    sourceScene,
    materializedDelta,
  )
  const outputPath = options.write
    ? sourceScenePath
    : options.output
      ? path.resolve(REPO_ROOT, options.output)
      : path.join(path.dirname(deltaPath), 'scene.delta-applied.json')

  writeJson(outputPath, scene)

  console.log(`Applied Merkin Blender scene delta: ${repoRelative(deltaPath)}`)
  console.log(`Source scene: ${repoRelative(sourceScenePath)}`)
  console.log(`Output scene: ${repoRelative(outputPath)}`)
  console.log(`Updated nodes: ${updatedCount}`)
  if (unknownNodeIds.length > 0) {
    console.warn(`Unknown node ids ignored: ${unknownNodeIds.join(', ')}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
