import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const GAME_ROOT = path.join(REPO_ROOT, 'apps', 'game')
const BLENDER_ROOT = path.join(REPO_ROOT, 'apps', 'blender')
const PUBLIC_ROOT = path.join(REPO_ROOT, 'apps', 'megameal', 'public')
const SCENE_ROOT = path.join(GAME_ROOT, 'src', 'threlte', 'editor', 'scenes')
const EXPORT_ROOT = path.join(BLENDER_ROOT, 'scene-packages')
const RUNTIME_SCENE_ROOT = path.join(
  PUBLIC_ROOT,
  'generated',
  'runtime-game-assets',
  'scenes',
)
const PACKAGE_SCHEMA = 'merkin.scenePackage.v1'

function parseArgs(argv) {
  const options = {
    level: '',
    scene: '',
    output: '',
    copyAssets: true,
  }

  for (const arg of argv) {
    if (arg === '--no-copy-assets') {
      options.copyAssets = false
    } else if (arg.startsWith('--level=')) {
      options.level = arg.slice('--level='.length)
    } else if (arg.startsWith('--scene=')) {
      options.scene = arg.slice('--scene='.length)
    } else if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length)
    }
  }

  return options
}

function timestampKey(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-')
}

function slugify(value = 'scene') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'scene'
}

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true })
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

function resolveScenePath(options) {
  if (options.scene) return path.resolve(REPO_ROOT, options.scene)
  if (!options.level) {
    throw new Error('Missing --level=<level-id> or --scene=<path>.')
  }
  return path.join(SCENE_ROOT, `${options.level}.scene.json`)
}

function resolveRuntimeScenePath(levelId) {
  if (!levelId) return ''
  const candidate = path.join(RUNTIME_SCENE_ROOT, `${levelId}.runtime-scene.json`)
  return fs.existsSync(candidate) ? candidate : ''
}

function getRuntimeActorsById(levelId) {
  const runtimeScenePath = resolveRuntimeScenePath(levelId)
  if (!runtimeScenePath) {
    return {
      runtimeScenePath: '',
      actorsById: new Map(),
      warning: `Runtime scene manifest not found for ${levelId}; Blender package uses editor-authored collision.`,
    }
  }

  const runtimeScene = readJson(runtimeScenePath)
  const actors = Array.isArray(runtimeScene.levelDefinition?.actors)
    ? runtimeScene.levelDefinition.actors
    : []
  return {
    runtimeScenePath,
    actorsById: new Map(actors.map(actor => [actor.id, actor])),
    warning: '',
  }
}

function resolvePublicAssetPath(assetUrl = '') {
  if (!assetUrl || /^https?:\/\//i.test(assetUrl)) return ''
  const normalized = assetUrl.replace(/^\/+/, '')
  const candidate = path.join(PUBLIC_ROOT, normalized)
  return fs.existsSync(candidate) ? candidate : ''
}

function copyPublicFileToPackage({
  url,
  packageRoot,
  copiedAssetByUrl,
  subdirectory,
  outputName,
}) {
  if (!url) return null

  const sourcePath = resolvePublicAssetPath(url)
  if (!sourcePath) {
    return {
      url,
      missing: true,
      reason: 'Asset URL could not be resolved under apps/megameal/public.',
    }
  }

  const cacheKey = `${subdirectory}:${url}`
  if (copiedAssetByUrl.has(cacheKey)) return copiedAssetByUrl.get(cacheKey)

  const extension = path.extname(sourcePath) || '.glb'
  const assetDirectory = path.join(packageRoot, subdirectory)
  ensureDirectory(assetDirectory)

  const outputPath = path.join(assetDirectory, `${outputName}${extension}`)
  fs.copyFileSync(sourcePath, outputPath)

  const asset = {
    url,
    sourcePath: repoRelative(sourcePath),
    packagePath: path.relative(packageRoot, outputPath).replace(/\\/g, '/'),
    sizeBytes: fs.statSync(outputPath).size,
  }
  copiedAssetByUrl.set(cacheKey, asset)
  return asset
}

function copyAssetToPackage(node, packageRoot, copiedAssetByUrl) {
  const assetUrl = node.asset?.url || ''
  return copyPublicFileToPackage({
    url: assetUrl,
    packageRoot,
    copiedAssetByUrl,
    subdirectory: 'assets',
    outputName: `${slugify(node.name || node.id)}-${slugify(node.id)}`,
  })
}

function copyCollisionFilesToPackage(node, collision, packageRoot, copiedAssetByUrl) {
  if (!collision || collision.shape !== 'trimesh') return { collision, warnings: [] }

  const warnings = []
  const collider = copyPublicFileToPackage({
    url: collision.colliderUrl || '',
    packageRoot,
    copiedAssetByUrl,
    subdirectory: 'collision',
    outputName: `${slugify(node.name || node.id)}-${slugify(node.id)}.collider`,
  })
  const metadata = copyPublicFileToPackage({
    url: collision.colliderMetadataUrl || '',
    packageRoot,
    copiedAssetByUrl,
    subdirectory: 'collision',
    outputName: `${slugify(node.name || node.id)}-${slugify(node.id)}.collider.meta`,
  })

  if (collider?.missing) warnings.push(`Collider asset: ${collider.reason}`)
  if (metadata?.missing) warnings.push(`Collider metadata: ${metadata.reason}`)

  return {
    collision: {
      ...collision,
      colliderPackagePath: collider?.packagePath || '',
      colliderMetadataPackagePath: metadata?.packagePath || '',
    },
    warnings,
  }
}

function getRuntimeActorNodeData(node, runtimeActor, runtimeAuthoritative) {
  const transform = runtimeActor?.transform ?? {}
  const render = runtimeActor?.render ?? {}
  return {
    position: transform.position ?? node.position ?? [0, 0, 0],
    rotation: transform.rotation ?? node.rotation ?? [0, 0, 0],
    scale: transform.scale ?? node.scale ?? [1, 1, 1],
    primitive: render.primitive ?? node.primitive ?? null,
    material: render.material ?? node.material ?? null,
    collision: runtimeAuthoritative
      ? runtimeActor?.physics?.collision ?? null
      : node.collision ?? null,
    physics: runtimeActor?.physics
      ? {
          bodyType: runtimeActor.physics.bodyType,
          gravityScale: runtimeActor.physics.gravityScale,
          canSleep: runtimeActor.physics.canSleep,
          ccd: runtimeActor.physics.ccd,
          linearDamping: runtimeActor.physics.linearDamping,
          angularDamping: runtimeActor.physics.angularDamping,
          lockRotations: runtimeActor.physics.lockRotations,
          lockTranslations: runtimeActor.physics.lockTranslations,
        }
      : node.physics,
  }
}

function getNodePackageData(
  node,
  packageRoot,
  options,
  copiedAssetByUrl,
  runtimeActor = null,
  runtimeAuthoritative = false,
) {
  const runtimeData = getRuntimeActorNodeData(
    node,
    runtimeActor,
    runtimeAuthoritative,
  )
  const asset = options.copyAssets && node.kind === 'asset'
    ? copyAssetToPackage(node, packageRoot, copiedAssetByUrl)
    : null
  const collisionPackage = options.copyAssets
    ? copyCollisionFilesToPackage(
        node,
        runtimeData.collision,
        packageRoot,
        copiedAssetByUrl,
      )
    : { collision: runtimeData.collision, warnings: [] }

  return {
    id: node.id,
    name: node.name,
    kind: node.kind,
    parentId: node.parentId ?? null,
    position: runtimeData.position,
    rotation: runtimeData.rotation,
    scale: runtimeData.scale,
    visible: node.visible !== false,
    locked: Boolean(node.locked),
    assetUrl: node.asset?.url || '',
    assetPackagePath: asset?.packagePath || '',
    primitive: runtimeData.primitive,
    light: node.light || null,
    prefab: node.prefab || null,
    material: runtimeData.material,
    physics: runtimeData.physics || null,
    collision: collisionPackage.collision,
    collisionSource: runtimeData.collision
      ? runtimeAuthoritative
        ? 'runtime-scene-rapier'
        : 'editor-authored'
      : 'none',
    gameplay: node.gameplay || null,
    generation: node.generation || null,
    warnings: [
      ...(asset?.missing ? [asset.reason] : []),
      ...collisionPackage.warnings,
    ],
  }
}

function buildPackage(scene, scenePath, packageRoot, options) {
  const copiedAssetByUrl = new Map()
  const levelId = scene.levelId || options.level || path.basename(scenePath, '.scene.json')
  const runtimeCollision = getRuntimeActorsById(levelId)
  const nodes = Array.isArray(scene.nodes)
    ? scene.nodes.map(node =>
        getNodePackageData(
          node,
          packageRoot,
          options,
          copiedAssetByUrl,
          runtimeCollision.actorsById.get(node.id) ?? null,
          Boolean(runtimeCollision.runtimeScenePath),
        ),
      )
    : []

  return {
    schema: PACKAGE_SCHEMA,
    createdAt: new Date().toISOString(),
    levelId,
    sceneVersion: scene.version ?? null,
    sourceScenePath: repoRelative(scenePath),
    runtimeScenePath: runtimeCollision.runtimeScenePath
      ? repoRelative(runtimeCollision.runtimeScenePath)
      : '',
    collisionSource: runtimeCollision.runtimeScenePath
      ? 'runtime-scene-rapier'
      : 'editor-authored',
    sourceSceneUpdatedAt: scene.updatedAt || '',
    packageRoot: repoRelative(packageRoot),
    axisConversion: 'game-y-up-to-blender-z-up',
    roundTripMode: 'transform-and-collision-delta-v2',
    nodes,
    assets: [...copiedAssetByUrl.values()],
    warnings: [
      ...(runtimeCollision.warning
        ? [{ nodeId: '', message: runtimeCollision.warning }]
        : []),
      ...nodes.flatMap(node =>
        node.warnings.map(message => ({ nodeId: node.id, message })),
      ),
    ],
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  const scenePath = resolveScenePath(options)
  if (!fs.existsSync(scenePath)) {
    throw new Error(`Scene file not found: ${scenePath}`)
  }

  const scene = readJson(scenePath)
  const levelId = scene.levelId || options.level || path.basename(scenePath, '.scene.json')
  const packageRoot = options.output
    ? path.resolve(REPO_ROOT, options.output)
    : path.join(EXPORT_ROOT, `${slugify(levelId)}-${timestampKey()}`)

  ensureDirectory(packageRoot)
  fs.copyFileSync(scenePath, path.join(packageRoot, 'source.scene.json'))

  const packageData = buildPackage(scene, scenePath, packageRoot, options)
  const packagePath = path.join(packageRoot, 'merkin-scene-package.json')
  writeJson(packagePath, packageData)

  console.log(`Merkin Blender scene package written: ${repoRelative(packagePath)}`)
  console.log(`Nodes: ${packageData.nodes.length}`)
  console.log(`Copied assets: ${packageData.assets.length}`)
  if (packageData.warnings.length > 0) {
    console.warn(`Warnings: ${packageData.warnings.length}`)
    for (const warning of packageData.warnings.slice(0, 20)) {
      console.warn(`- ${warning.nodeId}: ${warning.message}`)
    }
  }
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
