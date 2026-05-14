import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const GAME_ROOT = path.join(REPO_ROOT, 'apps', 'game')
const BLENDER_ROOT = path.join(REPO_ROOT, 'apps', 'blender')
const PUBLIC_ROOT = path.join(REPO_ROOT, 'apps', 'megameal', 'public')
const SCENE_ROOT = path.join(GAME_ROOT, 'src', 'threlte', 'editor', 'scenes')
const EXPORT_ROOT = path.join(BLENDER_ROOT, 'scene-packages')
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

function resolvePublicAssetPath(assetUrl = '') {
  if (!assetUrl || /^https?:\/\//i.test(assetUrl)) return ''
  const normalized = assetUrl.replace(/^\/+/, '')
  const candidate = path.join(PUBLIC_ROOT, normalized)
  return fs.existsSync(candidate) ? candidate : ''
}

function copyAssetToPackage(node, packageRoot, copiedAssetByUrl) {
  const assetUrl = node.asset?.url || ''
  if (!assetUrl) return null

  const sourcePath = resolvePublicAssetPath(assetUrl)
  if (!sourcePath) {
    return {
      url: assetUrl,
      missing: true,
      reason: 'Asset URL could not be resolved under apps/megameal/public.',
    }
  }

  if (copiedAssetByUrl.has(assetUrl)) return copiedAssetByUrl.get(assetUrl)

  const extension = path.extname(sourcePath) || '.glb'
  const assetDirectory = path.join(packageRoot, 'assets')
  ensureDirectory(assetDirectory)

  const outputName = `${slugify(node.name || node.id)}-${slugify(node.id)}${extension}`
  const outputPath = path.join(assetDirectory, outputName)
  fs.copyFileSync(sourcePath, outputPath)

  const asset = {
    url: assetUrl,
    sourcePath: repoRelative(sourcePath),
    packagePath: path.relative(packageRoot, outputPath).replace(/\\/g, '/'),
    sizeBytes: fs.statSync(outputPath).size,
  }
  copiedAssetByUrl.set(assetUrl, asset)
  return asset
}

function getNodePackageData(node, packageRoot, options, copiedAssetByUrl) {
  const asset = options.copyAssets && node.kind === 'asset'
    ? copyAssetToPackage(node, packageRoot, copiedAssetByUrl)
    : null

  return {
    id: node.id,
    name: node.name,
    kind: node.kind,
    parentId: node.parentId ?? null,
    position: node.position ?? [0, 0, 0],
    rotation: node.rotation ?? [0, 0, 0],
    scale: node.scale ?? [1, 1, 1],
    visible: node.visible !== false,
    locked: Boolean(node.locked),
    assetUrl: node.asset?.url || '',
    assetPackagePath: asset?.packagePath || '',
    primitive: node.primitive || null,
    light: node.light || null,
    prefab: node.prefab || null,
    material: node.material || null,
    collision: node.collision || null,
    gameplay: node.gameplay || null,
    generation: node.generation || null,
    warnings: asset?.missing ? [asset.reason] : [],
  }
}

function buildPackage(scene, scenePath, packageRoot, options) {
  const copiedAssetByUrl = new Map()
  const nodes = Array.isArray(scene.nodes)
    ? scene.nodes.map(node =>
        getNodePackageData(node, packageRoot, options, copiedAssetByUrl),
      )
    : []

  return {
    schema: PACKAGE_SCHEMA,
    createdAt: new Date().toISOString(),
    levelId: scene.levelId || options.level || path.basename(scenePath, '.scene.json'),
    sceneVersion: scene.version ?? null,
    sourceScenePath: repoRelative(scenePath),
    sourceSceneUpdatedAt: scene.updatedAt || '',
    packageRoot: repoRelative(packageRoot),
    axisConversion: 'game-y-up-to-blender-z-up',
    roundTripMode: 'transform-delta-v1',
    nodes,
    assets: [...copiedAssetByUrl.values()],
    warnings: nodes
      .flatMap(node => node.warnings.map(message => ({ nodeId: node.id, message }))),
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
