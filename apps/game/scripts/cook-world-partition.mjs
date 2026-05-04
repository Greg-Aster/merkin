import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { readSceneLevels } from './lib/levelRegistry.mjs'

const repoRoot = new URL('../../..', import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  '$1',
)
const appRoot = join(repoRoot, 'apps/game')
const publicRoot = join(repoRoot, 'apps/megameal/public')
const sceneRoot = join(appRoot, 'src/threlte/editor/scenes')

function getArg(name, fallback = '') {
  const prefix = `--${name}=`
  return (
    process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length) ??
    fallback
  )
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

function parsePositiveNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

function parseNonNegativeInteger(value, fallback) {
  const number = Number.parseInt(value, 10)
  return Number.isFinite(number) && number >= 0 ? number : fallback
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  const tempPath = `${path}.tmp`
  writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`)
  renameSync(tempPath, path)
}

function resolveLevel(requestedLevel) {
  const levels = readSceneLevels({ appRoot })
  return (
    levels.find(
      level =>
        level.id === requestedLevel ||
        level.source?.sceneId === requestedLevel ||
        level.aliases?.includes(requestedLevel),
    ) ?? null
  )
}

function formatSceneLevelList() {
  return readSceneLevels({ appRoot })
    .map(level => {
      const sceneId = level.source?.sceneId ?? level.id
      return sceneId === level.id ? level.id : `${level.id} (${sceneId})`
    })
    .join(', ')
}

function getScenePath(level) {
  const sceneId = level.source?.sceneId ?? level.id
  return join(sceneRoot, `${sceneId}.scene.json`)
}

function isCriticalNode(node) {
  const collisionIntent =
    node.collision?.enabled === false ? 'none' : node.collision?.intent
  const collisionIsRuntimeCritical =
    collisionIntent === 'walkable' || collisionIntent === 'trigger'
  const gameplayType = node.gameplay?.type
  const gameplayIsRuntimeCritical =
    Boolean(gameplayType) && !['firefly', 'note'].includes(gameplayType)

  return (
    collisionIsRuntimeCritical ||
    gameplayIsRuntimeCritical ||
    Boolean(node.light) ||
    Boolean(node.audioRegion) ||
    node.kind === 'playerSpawn' ||
    node.renderPolicy?.cullingPolicy === 'never'
  )
}

function isStreamableRenderNode(node) {
  return ['asset', 'primitive', 'prefab'].includes(node.kind)
}

function getNodeMap(nodes) {
  return new Map(nodes.map(node => [node.id, node]))
}

function getChildrenByParent(nodes) {
  const childrenByParent = new Map()
  for (const node of nodes) {
    const parentId = node.parentId ?? null
    const children = childrenByParent.get(parentId) ?? []
    children.push(node)
    childrenByParent.set(parentId, children)
  }
  return childrenByParent
}

function getSubtree(root, childrenByParent) {
  const nodes = [root]
  for (const child of childrenByParent.get(root.id) ?? []) {
    nodes.push(...getSubtree(child, childrenByParent))
  }
  return nodes
}

function getWorldPosition(node, nodeMap, cache) {
  if (cache.has(node.id)) return cache.get(node.id)
  const own = Array.isArray(node.position)
    ? node.position.map(Number)
    : [0, 0, 0]
  const parent = node.parentId ? nodeMap.get(node.parentId) : null
  if (!parent) {
    cache.set(node.id, own)
    return own
  }

  const parentPosition = getWorldPosition(parent, nodeMap, cache)
  const worldPosition = [
    parentPosition[0] + own[0],
    parentPosition[1] + own[1],
    parentPosition[2] + own[2],
  ]
  cache.set(node.id, worldPosition)
  return worldPosition
}

function getCellKey(position, cellSize) {
  return `${Math.floor(position[0] / cellSize)},${Math.floor(position[2] / cellSize)}`
}

function parseCellKey(key) {
  return key.split(',').map(Number)
}

function estimateNodeTriangles(node) {
  if (node.asset?.url) return 2500
  const geometry = node.primitive?.geometry
  if (!geometry) return 0
  if (geometry === 'box') return 12
  if (geometry === 'cylinder') return 96
  if (geometry === 'torus') return 384
  return 80
}

function getScenePartitionSettings(scene) {
  return scene.settings?.level?.worldPartition ?? {}
}

function cookPartition(scene, { cellSize, activeRadius }) {
  const nodes = scene.nodes ?? []
  const nodeMap = getNodeMap(nodes)
  const childrenByParent = getChildrenByParent(nodes)
  const positionCache = new Map()
  const cells = new Map()
  const streamableCandidates = []

  for (const node of nodes) {
    const subtree = getSubtree(node, childrenByParent)
    const streamable =
      subtree.some(candidate => isStreamableRenderNode(candidate)) &&
      subtree.every(node => !isCriticalNode(node))

    if (streamable) streamableCandidates.push({ node, subtree })
  }

  const streamableCandidateIds = new Set(
    streamableCandidates.map(candidate => candidate.node.id),
  )
  const selectedStreamables = streamableCandidates.filter(candidate => {
    let parentId = candidate.node.parentId
    while (parentId) {
      if (streamableCandidateIds.has(parentId)) return false
      parentId = nodeMap.get(parentId)?.parentId
    }
    return true
  })
  const streamableActorIds = [
    ...new Set(
      selectedStreamables.flatMap(candidate =>
        candidate.subtree.map(node => node.id),
      ),
    ),
  ]
  const streamableActorIdSet = new Set(streamableActorIds)
  const residentActorIds = nodes
    .map(node => node.id)
    .filter(id => !streamableActorIdSet.has(id))

  for (const { node, subtree } of selectedStreamables) {
    const position = getWorldPosition(node, nodeMap, positionCache)
    const actorIds = subtree.map(node => node.id)
    const key = getCellKey(position, cellSize)
    const cell = cells.get(key) ?? {
      key,
      x: parseCellKey(key)[0],
      z: parseCellKey(key)[1],
      actorIds: [],
      actorCount: 0,
      estimatedTriangles: 0,
    }
    cell.actorIds.push(...actorIds)
    cell.actorCount += actorIds.length
    cell.estimatedTriangles += subtree.reduce(
      (sum, node) => sum + estimateNodeTriangles(node),
      0,
    )
    cells.set(key, cell)
  }

  return {
    version: 1,
    levelId: scene.levelId,
    generatedAt: new Date().toISOString(),
    generatedBy: 'cook-world-partition',
    cellSize,
    activeRadius,
    residentActorIds: residentActorIds.sort(),
    streamableActorIds: streamableActorIds.sort(),
    cells: [...cells.values()].sort((left, right) =>
      left.key.localeCompare(right.key),
    ),
    budgets: {
      maxActorsPerCell: Math.max(
        0,
        ...[...cells.values()].map(cell => cell.actorCount),
      ),
      maxEstimatedTrianglesPerCell: Math.max(
        0,
        ...[...cells.values()].map(cell => cell.estimatedTriangles),
      ),
    },
  }
}

const requestedLevel = getArg('level') || process.argv[2]
const cellSizeArg = getArg('cell-size')
const activeRadiusArg = getArg('active-radius')
const dryRun = hasFlag('dry-run')
const level = resolveLevel(requestedLevel)

if (!requestedLevel || !level) {
  throw new Error(`Expected --level to be one of: ${formatSceneLevelList()}`)
}

const scenePath = getScenePath(level)
if (!existsSync(scenePath)) {
  throw new Error(`Scene file not found: ${scenePath}`)
}

const scene = readJson(scenePath)
const scenePartitionSettings = getScenePartitionSettings(scene)
const cellSize = Math.max(
  20,
  parsePositiveNumber(cellSizeArg, scenePartitionSettings.cellSize ?? 120),
)
const activeRadius = parseNonNegativeInteger(
  activeRadiusArg,
  scenePartitionSettings.activeRadius ?? 1,
)
const partition = cookPartition(scene, { cellSize, activeRadius })
const outputUrl = `/runtime-world-partitions/${level.id}.partition.json`
const outputPath = join(publicRoot, outputUrl.replace(/^\//, ''))
if (!dryRun) {
  writeJson(outputPath, partition)
}

console.log(
  JSON.stringify({
    success: true,
    dryRun,
    levelId: level.id,
    partitionUrl: outputUrl,
    cellSize,
    activeRadius,
    cells: partition.cells.length,
    residentActors: partition.residentActorIds.length,
    streamableActors: partition.streamableActorIds.length,
    budgets: partition.budgets,
  }),
)
