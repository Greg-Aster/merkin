export interface RuntimeWorldPartitionCell {
  key: string
  x: number
  z: number
  bounds: {
    min: [number, number]
    max: [number, number]
  }
  actorIds: string[]
  renderActorIds: string[]
  collisionActorIds: string[]
  actorCount: number
  estimatedTriangles: number
  streamingStage: 'initial' | 'stream'
  requiredForSpawn?: boolean
}

export type RuntimeWorldPartitionReadinessGate =
  | 'partition-manifest'
  | 'resident-render'
  | 'resident-collision'
  | 'initial-cell-render'
  | 'initial-cell-collision'

export interface RuntimeWorldPartition {
  version: number
  levelId: string
  generatedAt?: string
  generatedBy?: string
  cellSize: number
  activeRadius: number
  streaming?: {
    mode: 'staged-render-collision'
    stages: string[]
    readinessGates: RuntimeWorldPartitionReadinessGate[]
  }
  readiness?: {
    requiredResidentRenderActorIds: string[]
    requiredResidentCollisionActorIds: string[]
    requiredInitialCellKeys: string[]
    requiredInitialRenderActorIds: string[]
    requiredInitialCollisionActorIds: string[]
  }
  residentActorIds: string[]
  streamableActorIds: string[]
  cells: RuntimeWorldPartitionCell[]
  budgets?: {
    maxActorsPerCell?: number
    maxEstimatedTrianglesPerCell?: number
  }
}

export type RuntimeWorldPartitionCellRuntimeState =
  | 'not-requested'
  | 'requested'
  | 'loading'
  | 'ready'
  | 'active'
  | 'evicting'
  | 'evicted'
  | 'failed'

export interface RuntimeWorldPartitionCellState {
  key: string
  state: RuntimeWorldPartitionCellRuntimeState
  streamingStage: RuntimeWorldPartitionCell['streamingStage']
  actorCount: number
  renderActorCount: number
  collisionActorCount: number
  requiredForSpawn: boolean
}

export interface RuntimeWorldPartitionAssetState {
  entries: number
  loadedEntries: number
  pendingEntries: number
  referencedEntries: number
  unreferencedEntries: number
  loadedBytes: number
  pendingBytes: number
  referencedBytes: number
  unreferencedBytes: number
}

export interface RuntimeWorldPartitionStreamingCachePolicy {
  maxPrefetchCells?: number
  optionalCellKeys?: string[]
}

export interface RuntimeWorldPartitionStreamingInput {
  partition: RuntimeWorldPartition | null
  playerPosition: [number, number, number]
  previousPlayerPosition?: [number, number, number] | null
  movementDirection?: [number, number] | null
  allActorIds?: string[]
  requiredCellKeys?: string[]
  optionalCellKeys?: string[]
  requestedCellKeys?: string[]
  loadingCellKeys?: string[]
  readyCellKeys?: string[]
  evictingCellKeys?: string[]
  evictedCellKeys?: string[]
  failedCellKeys?: string[]
  cachePolicy?: RuntimeWorldPartitionStreamingCachePolicy
  assetState?: RuntimeWorldPartitionAssetState
}

export interface RuntimeWorldPartitionStreamingState {
  partitioned: boolean
  activeActorIds: Set<string>
  activeCells: RuntimeWorldPartitionCell[]
  prefetchCells: RuntimeWorldPartitionCell[]
  evictableCells: RuntimeWorldPartitionCell[]
  activeCellKeys: string[]
  prefetchCellKeys: string[]
  evictableCellKeys: string[]
  requiredCellKeys: string[]
  pendingRequiredCellKeys: string[]
  failedRequiredCellKeys: string[]
  cellStates: RuntimeWorldPartitionCellState[]
  cellStateCounts: Record<RuntimeWorldPartitionCellRuntimeState, number>
  assetState?: RuntimeWorldPartitionAssetState
  telemetry: {
    totalCellCount: number
    activeCellCount: number
    prefetchCellCount: number
    evictableCellCount: number
    pendingRequiredCellCount: number
    failedRequiredCellCount: number
    activeActorCount: number
  }
}

export function getRuntimeWorldPartitionUrl(levelId: string) {
  return `/runtime-world-partitions/${levelId}.partition.json`
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function hasReadinessGate(
  value: unknown,
  gate: RuntimeWorldPartitionReadinessGate,
) {
  return Array.isArray(value) && value.includes(gate)
}

function isFiniteVec2(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(component => Number.isFinite(component))
  )
}

function isValidCellBounds(value: unknown) {
  const bounds = value as RuntimeWorldPartitionCell['bounds'] | undefined
  if (!bounds || typeof bounds !== 'object') return false
  if (!isFiniteVec2(bounds.min) || !isFiniteVec2(bounds.max)) return false
  return bounds.max[0] > bounds.min[0] && bounds.max[1] > bounds.min[1]
}

function assertRuntimeWorldPartition(
  levelId: string,
  value: unknown,
): asserts value is RuntimeWorldPartition {
  if (!value || typeof value !== 'object') {
    throw new Error(`${levelId}: invalid runtime world partition manifest.`)
  }

  const partition = value as Partial<RuntimeWorldPartition>
  if (partition.version !== 1) {
    throw new Error(`${levelId}: unsupported world partition version.`)
  }
  if (partition.levelId !== levelId) {
    throw new Error(`${levelId}: world partition levelId mismatch.`)
  }
  if (
    typeof partition.cellSize !== 'number' ||
    !Number.isFinite(partition.cellSize) ||
    partition.cellSize <= 0
  ) {
    throw new Error(`${levelId}: world partition cellSize must be positive.`)
  }
  if (
    typeof partition.activeRadius !== 'number' ||
    !Number.isFinite(partition.activeRadius) ||
    partition.activeRadius < 0
  ) {
    throw new Error(`${levelId}: world partition activeRadius must be >= 0.`)
  }
  if (!isStringArray(partition.residentActorIds)) {
    throw new Error(
      `${levelId}: world partition residentActorIds must be strings.`,
    )
  }
  if (!isStringArray(partition.streamableActorIds)) {
    throw new Error(
      `${levelId}: world partition streamableActorIds must be strings.`,
    )
  }
  if (!Array.isArray(partition.cells)) {
    throw new Error(`${levelId}: world partition cells must be an array.`)
  }
  if (partition.streaming?.mode !== 'staged-render-collision') {
    throw new Error(
      `${levelId}: world partition streaming.mode must be staged-render-collision.`,
    )
  }
  for (const gate of [
    'partition-manifest',
    'resident-render',
    'resident-collision',
    'initial-cell-render',
    'initial-cell-collision',
  ] as const) {
    if (!hasReadinessGate(partition.streaming?.readinessGates, gate)) {
      throw new Error(
        `${levelId}: world partition missing readiness gate ${gate}.`,
      )
    }
  }
  if (
    !isStringArray(partition.readiness?.requiredResidentRenderActorIds) ||
    !isStringArray(partition.readiness?.requiredResidentCollisionActorIds) ||
    !isStringArray(partition.readiness?.requiredInitialCellKeys) ||
    !isStringArray(partition.readiness?.requiredInitialRenderActorIds) ||
    !isStringArray(partition.readiness?.requiredInitialCollisionActorIds)
  ) {
    throw new Error(`${levelId}: world partition readiness arrays are invalid.`)
  }

  const residentActorIds = new Set(partition.residentActorIds)
  const streamableActorIds = new Set(partition.streamableActorIds)
  for (const actorId of partition.streamableActorIds) {
    if (residentActorIds.has(actorId)) {
      throw new Error(
        `${levelId}: world partition actor "${actorId}" is both resident and streamable.`,
      )
    }
  }

  for (const cell of partition.cells) {
    if (
      !cell ||
      typeof cell.key !== 'string' ||
      !Number.isFinite(cell.x) ||
      !Number.isFinite(cell.z) ||
      !isValidCellBounds(cell.bounds) ||
      !isStringArray(cell.actorIds) ||
      !isStringArray(cell.renderActorIds) ||
      !isStringArray(cell.collisionActorIds) ||
      !['initial', 'stream'].includes(cell.streamingStage)
    ) {
      throw new Error(`${levelId}: world partition contains an invalid cell.`)
    }
    for (const actorId of cell.actorIds) {
      if (!streamableActorIds.has(actorId)) {
        throw new Error(
          `${levelId}: world partition cell "${cell.key}" references non-streamable actor "${actorId}".`,
        )
      }
    }
    for (const actorId of [...cell.renderActorIds, ...cell.collisionActorIds]) {
      if (!cell.actorIds.includes(actorId)) {
        throw new Error(
          `${levelId}: world partition cell "${cell.key}" references actor "${actorId}" outside actorIds.`,
        )
      }
    }
  }

  const cellsByKey = new Map(partition.cells.map(cell => [cell.key, cell]))
  for (const cellKey of partition.readiness.requiredInitialCellKeys) {
    if (!cellsByKey.has(cellKey)) {
      throw new Error(
        `${levelId}: readiness requiredInitialCellKeys references missing cell "${cellKey}".`,
      )
    }
  }
  for (const actorId of [
    ...partition.readiness.requiredResidentRenderActorIds,
    ...partition.readiness.requiredResidentCollisionActorIds,
  ]) {
    if (!residentActorIds.has(actorId)) {
      throw new Error(
        `${levelId}: resident readiness actor "${actorId}" is not resident.`,
      )
    }
  }
  for (const actorId of [
    ...partition.readiness.requiredInitialRenderActorIds,
    ...partition.readiness.requiredInitialCollisionActorIds,
  ]) {
    if (!streamableActorIds.has(actorId)) {
      throw new Error(
        `${levelId}: initial readiness actor "${actorId}" is not streamable.`,
      )
    }
  }
}

export async function loadRuntimeWorldPartition(
  levelId: string,
  url = getRuntimeWorldPartitionUrl(levelId),
): Promise<RuntimeWorldPartition | null> {
  const response = await fetch(url)
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(
      `${levelId}: failed to load runtime world partition (${response.status})`,
    )
  }

  const partition = await response.json()
  assertRuntimeWorldPartition(levelId, partition)
  return partition
}

export function getWorldPartitionReadinessActorIds(
  partition: RuntimeWorldPartition,
) {
  return new Set([
    ...partition.residentActorIds,
    ...(partition.readiness?.requiredResidentRenderActorIds ?? []),
    ...(partition.readiness?.requiredResidentCollisionActorIds ?? []),
    ...(partition.readiness?.requiredInitialRenderActorIds ?? []),
    ...(partition.readiness?.requiredInitialCollisionActorIds ?? []),
  ])
}

export function getActiveWorldPartitionCells({
  partition,
  playerPosition,
}: {
  partition: RuntimeWorldPartition
  playerPosition: [number, number, number]
}) {
  const cellSize = Math.max(1, partition.cellSize)
  const radius = Math.max(0, partition.activeRadius)
  const playerCellX = Math.floor(playerPosition[0] / cellSize)
  const playerCellZ = Math.floor(playerPosition[2] / cellSize)

  return partition.cells.filter(
    cell =>
      Math.abs(cell.x - playerCellX) <= radius &&
      Math.abs(cell.z - playerCellZ) <= radius,
  )
}

function getCellCenter(cell: RuntimeWorldPartitionCell): [number, number] {
  return [
    (cell.bounds.min[0] + cell.bounds.max[0]) / 2,
    (cell.bounds.min[1] + cell.bounds.max[1]) / 2,
  ]
}

function getMovementDirection({
  playerPosition,
  previousPlayerPosition,
  movementDirection,
}: {
  playerPosition: [number, number, number]
  previousPlayerPosition?: [number, number, number] | null
  movementDirection?: [number, number] | null
}) {
  if (movementDirection) return movementDirection
  if (!previousPlayerPosition) return null

  const x = playerPosition[0] - previousPlayerPosition[0]
  const z = playerPosition[2] - previousPlayerPosition[2]
  const length = Math.hypot(x, z)
  if (length < 0.001) return null
  return [x / length, z / length] as [number, number]
}

export function getPrefetchWorldPartitionCells({
  partition,
  playerPosition,
  previousPlayerPosition,
  movementDirection: inputMovementDirection,
  maxCells = 6,
  optionalCellKeys,
}: {
  partition: RuntimeWorldPartition
  playerPosition: [number, number, number]
  previousPlayerPosition?: [number, number, number] | null
  movementDirection?: [number, number] | null
  maxCells?: number
  optionalCellKeys?: string[]
}) {
  const activeKeys = new Set(
    getActiveWorldPartitionCellKeys({ partition, playerPosition }),
  )
  const optionalKeys = optionalCellKeys?.length
    ? new Set(optionalCellKeys)
    : null
  const movementDirection = getMovementDirection({
    playerPosition,
    previousPlayerPosition,
    movementDirection: inputMovementDirection,
  })
  const playerX = playerPosition[0]
  const playerZ = playerPosition[2]

  return partition.cells
    .filter(
      cell =>
        !activeKeys.has(cell.key) &&
        (!optionalKeys || optionalKeys.has(cell.key)),
    )
    .map(cell => {
      const [cellX, cellZ] = getCellCenter(cell)
      const toCellX = cellX - playerX
      const toCellZ = cellZ - playerZ
      const distance = Math.hypot(toCellX, toCellZ)
      const directionScore =
        movementDirection && distance > 0.001
          ? (toCellX / distance) * movementDirection[0] +
            (toCellZ / distance) * movementDirection[1]
          : 0
      return {
        cell,
        priority: distance - Math.max(0, directionScore) * partition.cellSize,
      }
    })
    .sort(
      (left, right) =>
        left.priority - right.priority ||
        left.cell.key.localeCompare(right.cell.key),
    )
    .slice(0, Math.max(0, maxCells))
    .map(entry => entry.cell)
}

export function getActiveWorldPartitionCellKeys(input: {
  partition: RuntimeWorldPartition
  playerPosition: [number, number, number]
}) {
  return getActiveWorldPartitionCells(input)
    .map(cell => cell.key)
    .sort()
}

export function getActiveWorldPartitionActorIds(input: {
  partition: RuntimeWorldPartition
  playerPosition: [number, number, number]
}) {
  const activeActorIds = new Set(input.partition.residentActorIds)

  for (const cell of getActiveWorldPartitionCells(input)) {
    for (const actorId of cell.actorIds) {
      activeActorIds.add(actorId)
    }
  }

  return activeActorIds
}

export function getWorldPartitionCellStreamingStates({
  partition,
  activeCellKeys,
  prefetchCellKeys = [],
  requestedCellKeys = [],
  loadingCellKeys = [],
  readyCellKeys = [],
  evictingCellKeys = [],
  evictedCellKeys = [],
  failedCellKeys = [],
}: {
  partition: RuntimeWorldPartition
  activeCellKeys: string[]
  prefetchCellKeys?: string[]
  requestedCellKeys?: string[]
  loadingCellKeys?: string[]
  readyCellKeys?: string[]
  evictingCellKeys?: string[]
  evictedCellKeys?: string[]
  failedCellKeys?: string[]
}): RuntimeWorldPartitionCellState[] {
  const active = new Set(activeCellKeys)
  const prefetch = new Set(prefetchCellKeys)
  const requested = new Set(requestedCellKeys)
  const loading = new Set(loadingCellKeys)
  const ready = new Set(readyCellKeys)
  const evicting = new Set(evictingCellKeys)
  const evicted = new Set(evictedCellKeys)
  const failed = new Set(failedCellKeys)

  return partition.cells
    .map(cell => {
      const state: RuntimeWorldPartitionCellRuntimeState = failed.has(cell.key)
        ? 'failed'
        : active.has(cell.key)
          ? 'active'
          : loading.has(cell.key)
            ? 'loading'
            : ready.has(cell.key)
              ? 'ready'
              : requested.has(cell.key) || prefetch.has(cell.key)
                ? 'requested'
                : evicting.has(cell.key)
                  ? 'evicting'
                  : evicted.has(cell.key)
                    ? 'evicted'
                    : 'not-requested'

      return {
        key: cell.key,
        state,
        streamingStage: cell.streamingStage,
        actorCount: cell.actorIds.length,
        renderActorCount: cell.renderActorIds.length,
        collisionActorCount: cell.collisionActorIds.length,
        requiredForSpawn: Boolean(cell.requiredForSpawn),
      }
    })
    .sort((left, right) => left.key.localeCompare(right.key))
}

export function summarizeWorldPartitionCellStates(
  states: RuntimeWorldPartitionCellState[],
) {
  const summary: Record<RuntimeWorldPartitionCellRuntimeState, number> = {
    'not-requested': 0,
    requested: 0,
    loading: 0,
    ready: 0,
    active: 0,
    evicting: 0,
    evicted: 0,
    failed: 0,
  }

  for (const state of states) {
    summary[state.state] += 1
  }

  return summary
}

function uniqueSorted(values: string[] | undefined) {
  return [...new Set(values ?? [])].sort()
}

export function resolveRuntimeWorldPartitionStreamingState({
  partition,
  playerPosition,
  previousPlayerPosition = null,
  movementDirection = null,
  allActorIds = [],
  requiredCellKeys,
  optionalCellKeys,
  requestedCellKeys = [],
  loadingCellKeys = [],
  readyCellKeys = [],
  evictingCellKeys = [],
  evictedCellKeys = [],
  failedCellKeys = [],
  cachePolicy = {},
  assetState,
}: RuntimeWorldPartitionStreamingInput): RuntimeWorldPartitionStreamingState {
  if (!partition) {
    const activeActorIds = new Set(allActorIds)
    const cellStateCounts = summarizeWorldPartitionCellStates([])
    return {
      partitioned: false,
      activeActorIds,
      activeCells: [],
      prefetchCells: [],
      evictableCells: [],
      activeCellKeys: [],
      prefetchCellKeys: [],
      evictableCellKeys: [],
      requiredCellKeys: [],
      pendingRequiredCellKeys: [],
      failedRequiredCellKeys: [],
      cellStates: [],
      cellStateCounts,
      assetState,
      telemetry: {
        totalCellCount: 0,
        activeCellCount: 0,
        prefetchCellCount: 0,
        evictableCellCount: 0,
        pendingRequiredCellCount: 0,
        failedRequiredCellCount: 0,
        activeActorCount: activeActorIds.size,
      },
    }
  }

  const activeCells = getActiveWorldPartitionCells({
    partition,
    playerPosition,
  })
  const activeCellKeys = uniqueSorted(activeCells.map(cell => cell.key))
  const activeCellKeySet = new Set(activeCellKeys)
  const requiredKeys = uniqueSorted(
    requiredCellKeys ?? partition.readiness?.requiredInitialCellKeys ?? [],
  )
  const requiredKeySet = new Set(requiredKeys)
  const failedKeySet = new Set(failedCellKeys)
  const readyKeySet = new Set(readyCellKeys)
  const pendingRequiredCellKeys = requiredKeys.filter(
    cellKey =>
      !activeCellKeySet.has(cellKey) &&
      !readyKeySet.has(cellKey) &&
      !failedKeySet.has(cellKey),
  )
  const failedRequiredCellKeys = requiredKeys.filter(cellKey =>
    failedKeySet.has(cellKey),
  )
  const prefetchCells = getPrefetchWorldPartitionCells({
    partition,
    playerPosition,
    previousPlayerPosition,
    movementDirection,
    maxCells: cachePolicy.maxPrefetchCells ?? 6,
    optionalCellKeys: optionalCellKeys ?? cachePolicy.optionalCellKeys,
  }).filter(cell => !requiredKeySet.has(cell.key))
  const prefetchCellKeys = uniqueSorted(prefetchCells.map(cell => cell.key))
  const prefetchCellKeySet = new Set(prefetchCellKeys)
  const evictableCells = partition.cells.filter(
    cell =>
      !activeCellKeySet.has(cell.key) &&
      !prefetchCellKeySet.has(cell.key) &&
      !requiredKeySet.has(cell.key),
  )
  const evictableCellKeys = uniqueSorted(evictableCells.map(cell => cell.key))
  const activeActorIds = getActiveWorldPartitionActorIds({
    partition,
    playerPosition,
  })
  const cellStates = getWorldPartitionCellStreamingStates({
    partition,
    activeCellKeys,
    prefetchCellKeys,
    requestedCellKeys,
    loadingCellKeys,
    readyCellKeys,
    evictingCellKeys,
    evictedCellKeys,
    failedCellKeys,
  })
  const cellStateCounts = summarizeWorldPartitionCellStates(cellStates)

  return {
    partitioned: true,
    activeActorIds,
    activeCells,
    prefetchCells,
    evictableCells,
    activeCellKeys,
    prefetchCellKeys,
    evictableCellKeys,
    requiredCellKeys: requiredKeys,
    pendingRequiredCellKeys,
    failedRequiredCellKeys,
    cellStates,
    cellStateCounts,
    assetState,
    telemetry: {
      totalCellCount: partition.cells.length,
      activeCellCount: activeCells.length,
      prefetchCellCount: prefetchCells.length,
      evictableCellCount: evictableCells.length,
      pendingRequiredCellCount: pendingRequiredCellKeys.length,
      failedRequiredCellCount: failedRequiredCellKeys.length,
      activeActorCount: activeActorIds.size,
    },
  }
}
