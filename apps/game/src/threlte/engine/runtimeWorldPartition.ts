export interface RuntimeWorldPartitionCell {
  key: string
  x: number
  z: number
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
    throw new Error(`${levelId}: world partition residentActorIds must be strings.`)
  }
  if (!isStringArray(partition.streamableActorIds)) {
    throw new Error(`${levelId}: world partition streamableActorIds must be strings.`)
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
      throw new Error(`${levelId}: world partition missing readiness gate ${gate}.`)
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
      !isStringArray(cell.actorIds) ||
      !isStringArray(cell.renderActorIds) ||
      !isStringArray(cell.collisionActorIds) ||
      !['initial', 'stream'].includes(cell.streamingStage)
    ) {
      throw new Error(`${levelId}: world partition contains an invalid cell.`)
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
