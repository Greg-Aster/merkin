import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..', '..')

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

function resolveDeltaPath(deltaPath) {
  if (!deltaPath) throw new Error('Missing --delta=<path-to-merkin-scene-delta.json>.')
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

  const relativeToPackage = path.resolve(path.dirname(packagePath), sourceScenePath)
  if (fs.existsSync(relativeToPackage)) return relativeToPackage

  throw new Error(`Could not resolve source scene path: ${sourceScenePath}`)
}

function sanitizeVector(value, fallback) {
  if (!Array.isArray(value) || value.length !== 3) return fallback
  const next = value.map(Number)
  return next.every(Number.isFinite) ? next : fallback
}

function applyDelta(scene, delta) {
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
        return {
          ...node,
          position: sanitizeVector(change.position, node.position ?? [0, 0, 0]),
          rotation: sanitizeVector(change.rotation, node.rotation ?? [0, 0, 0]),
          scale: sanitizeVector(change.scale, node.scale ?? [1, 1, 1]),
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

function main() {
  const options = parseArgs(process.argv.slice(2))
  const deltaPath = resolveDeltaPath(options.delta)
  if (!fs.existsSync(deltaPath)) throw new Error(`Delta file not found: ${deltaPath}`)

  const delta = readJson(deltaPath)
  if (delta.schema !== 'merkin.sceneDelta.v1') {
    throw new Error(`Unsupported delta schema: ${delta.schema || 'missing'}`)
  }

  const packagePath = resolvePackagePath(delta, deltaPath)
  const packageData = readJson(packagePath)
  if (packageData.schema !== 'merkin.scenePackage.v1') {
    throw new Error(`Unsupported package schema: ${packageData.schema || 'missing'}`)
  }

  const sourceScenePath = resolveScenePath(packageData, packagePath)
  const sourceScene = readJson(sourceScenePath)
  const { scene, updatedCount, unknownNodeIds } = applyDelta(sourceScene, delta)
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

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
