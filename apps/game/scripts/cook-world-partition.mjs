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

function isRenderableNode(node) {
  return isStreamableRenderNode(node) || Boolean(node.light)
}

function isCollisionNode(node) {
  return Boolean(node.collision) && node.collision.enabled !== false
}

function getNodeIdsByPredicate(nodes, predicate) {
  return nodes
    .filter(predicate)
    .map(node => node.id)
    .sort()
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

function getCellBounds({ x, z, cellSize }) {
  return {
    min: [x * cellSize, z * cellSize],
    max: [(x + 1) * cellSize, (z + 1) * cellSize],
  }
}

function getActiveCellKeysForPosition(position, cellSize, activeRadius) {
  const centerX = Math.floor(position[0] / cellSize)
  const centerZ = Math.floor(position[2] / cellSize)
  const keys = []

  for (let x = centerX - activeRadius; x <= centerX + activeRadius; x += 1) {
    for (let z = centerZ - activeRadius; z <= centerZ + activeRadius; z += 1) {
      keys.push(`${x},${z}`)
    }
  }

  return new Set(keys)
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

function cookPartition(scene, { cellSize, activeRadius, maxActorsPerCell }) {
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
  const streamableCandidateById = new Map(
    streamableCandidates.map(candidate => [candidate.node.id, candidate]),
  )
  let selectedStreamables = streamableCandidates.filter(candidate => {
    let parentId = candidate.node.parentId
    while (parentId) {
      if (streamableCandidateIds.has(parentId)) return false
      parentId = nodeMap.get(parentId)?.parentId
    }
    return true
  })

  const hasDescendantStreamableCandidate = candidate =>
    candidate.subtree.some(
      node =>
        node.id !== candidate.node.id && streamableCandidateIds.has(node.id),
    )
  const getLeafStreamableCandidates = candidate =>
    candidate.subtree
      .map(node => streamableCandidateById.get(node.id))
      .filter(Boolean)
      .filter(candidate => !hasDescendantStreamableCandidate(candidate))
  const getCandidateCellKey = candidate =>
    getCellKey(
      getWorldPosition(candidate.node, nodeMap, positionCache),
      cellSize,
    )
  const getCellActorCounts = candidates => {
    const actorIdsByCell = new Map()
    for (const candidate of candidates) {
      const key = getCandidateCellKey(candidate)
      const actorIds = actorIdsByCell.get(key) ?? new Set()
      for (const node of candidate.subtree) {
        actorIds.add(node.id)
      }
      actorIdsByCell.set(key, actorIds)
    }
    return new Map(
      [...actorIdsByCell.entries()].map(([key, actorIds]) => [
        key,
        actorIds.size,
      ]),
    )
  }

  if (Number.isFinite(maxActorsPerCell) && maxActorsPerCell > 0) {
    for (;;) {
      const oversizedCellKeys = new Set(
        [...getCellActorCounts(selectedStreamables).entries()]
          .filter(([, actorCount]) => actorCount > maxActorsPerCell)
          .map(([key]) => key),
      )
      if (oversizedCellKeys.size === 0) break

      let changed = false
      const nextSelection = []
      for (const candidate of selectedStreamables) {
        if (
          oversizedCellKeys.has(getCandidateCellKey(candidate)) &&
          hasDescendantStreamableCandidate(candidate)
        ) {
          nextSelection.push(...getLeafStreamableCandidates(candidate))
          changed = true
        } else {
          nextSelection.push(candidate)
        }
      }
      if (!changed) break

      selectedStreamables = [
        ...new Map(
          nextSelection.map(candidate => [candidate.node.id, candidate]),
        ).values(),
      ]
    }
  }
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
  const residentNodes = nodes.filter(node => residentActorIds.includes(node.id))
  const residentRenderActorIds = getNodeIdsByPredicate(
    residentNodes,
    isRenderableNode,
  )
  const residentCollisionActorIds = getNodeIdsByPredicate(
    residentNodes,
    isCollisionNode,
  )
  const spawnPosition = scene.settings?.level?.spawn?.position ?? [0, 0, 0]
  const initialCellKeys = getActiveCellKeysForPosition(
    spawnPosition,
    cellSize,
    activeRadius,
  )

  for (const { node, subtree } of selectedStreamables) {
    const position = getWorldPosition(node, nodeMap, positionCache)
    const actorIds = subtree.map(node => node.id)
    const key = getCellKey(position, cellSize)
    const [cellX, cellZ] = parseCellKey(key)
    const cell = cells.get(key) ?? {
      key,
      x: cellX,
      z: cellZ,
      bounds: getCellBounds({
        x: cellX,
        z: cellZ,
        cellSize,
      }),
      actorIds: [],
      renderActorIds: [],
      collisionActorIds: [],
      actorCount: 0,
      estimatedTriangles: 0,
      streamingStage: initialCellKeys.has(key) ? 'initial' : 'stream',
      requiredForSpawn: initialCellKeys.has(key),
    }
    cell.actorIds.push(...actorIds)
    cell.renderActorIds.push(
      ...getNodeIdsByPredicate(subtree, isRenderableNode),
    )
    cell.collisionActorIds.push(
      ...getNodeIdsByPredicate(subtree, isCollisionNode),
    )
    cell.actorCount += actorIds.length
    cell.estimatedTriangles += subtree.reduce(
      (sum, node) => sum + estimateNodeTriangles(node),
      0,
    )
    cells.set(key, cell)
  }
  const sortedCells = [...cells.values()]
    .map(cell => ({
      ...cell,
      actorIds: [...new Set(cell.actorIds)].sort(),
      renderActorIds: [...new Set(cell.renderActorIds)].sort(),
      collisionActorIds: [...new Set(cell.collisionActorIds)].sort(),
    }))
    .sort((left, right) => left.key.localeCompare(right.key))
  const initialCells = sortedCells.filter(cell => cell.requiredForSpawn)
  const initialRenderActorIds = [
    ...new Set(initialCells.flatMap(cell => cell.renderActorIds)),
  ].sort()
  const initialCollisionActorIds = [
    ...new Set(initialCells.flatMap(cell => cell.collisionActorIds)),
  ].sort()

  return {
    version: 1,
    levelId: scene.levelId,
    generatedAt: new Date().toISOString(),
    generatedBy: 'cook-world-partition',
    cellSize,
    activeRadius,
    streaming: {
      mode: 'staged-render-collision',
      stages: ['resident', 'initial-cells', 'stream-cells'],
      readinessGates: [
        'partition-manifest',
        'resident-render',
        'resident-collision',
        'initial-cell-render',
        'initial-cell-collision',
      ],
    },
    readiness: {
      requiredResidentRenderActorIds: residentRenderActorIds,
      requiredResidentCollisionActorIds: residentCollisionActorIds,
      requiredInitialCellKeys: [...initialCellKeys]
        .filter(key => cells.has(key))
        .sort(),
      requiredInitialRenderActorIds: initialRenderActorIds,
      requiredInitialCollisionActorIds: initialCollisionActorIds,
    },
    residentActorIds: residentActorIds.sort(),
    streamableActorIds: streamableActorIds.sort(),
    cells: sortedCells,
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

function getPartitionLevels() {
  if (requestedLevel) {
    const level = resolveLevel(requestedLevel)
    if (!level) {
      throw new Error(
        `Expected --level to be one of: ${formatSceneLevelList()}`,
      )
    }
    return [level]
  }

  return readSceneLevels({ appRoot }).filter(level => {
    const scenePath = getScenePath(level)
    if (!existsSync(scenePath)) return false
    const scene = readJson(scenePath)
    return Boolean(getScenePartitionSettings(scene).partitionUrl)
  })
}

const results = getPartitionLevels().map(level => {
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
  const maxActorsPerCell = parseNonNegativeInteger(
    scenePartitionSettings.maxActorsPerCell,
    0,
  )
  const activeRadius = parseNonNegativeInteger(
    activeRadiusArg,
    scenePartitionSettings.activeRadius ?? 1,
  )
  const partition = cookPartition(scene, {
    cellSize,
    activeRadius,
    maxActorsPerCell,
  })
  const outputUrl = `/runtime-world-partitions/${level.id}.partition.json`
  const outputPath = join(publicRoot, outputUrl.replace(/^\//, ''))
  if (!dryRun) {
    writeJson(outputPath, partition)
  }

  return {
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
  }
})

if (results.length === 0) {
  throw new Error('No levels with worldPartition settings were found.')
}

console.log(
  JSON.stringify(
    {
      success: true,
      dryRun,
      cooked: results,
    },
    null,
    2,
  ),
)
