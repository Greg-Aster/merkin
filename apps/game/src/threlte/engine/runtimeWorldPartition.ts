export interface RuntimeWorldPartitionCell {
  key: string
  x: number
  z: number
  actorIds: string[]
  actorCount: number
  estimatedTriangles: number
}

export interface RuntimeWorldPartition {
  version: number
  levelId: string
  generatedAt?: string
  generatedBy?: string
  cellSize: number
  activeRadius: number
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

export async function loadRuntimeWorldPartition(
  levelId: string,
): Promise<RuntimeWorldPartition | null> {
  const response = await fetch(getRuntimeWorldPartitionUrl(levelId))
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(
      `${levelId}: failed to load runtime world partition (${response.status})`,
    )
  }

  const partition = (await response.json()) as RuntimeWorldPartition
  if (partition.version !== 1 || !Array.isArray(partition.cells)) {
    throw new Error(`${levelId}: invalid runtime world partition manifest.`)
  }
  return partition
}

export function getActiveWorldPartitionActorIds({
  partition,
  playerPosition,
}: {
  partition: RuntimeWorldPartition
  playerPosition: [number, number, number]
}) {
  const activeActorIds = new Set(partition.residentActorIds)
  const cellSize = Math.max(1, partition.cellSize)
  const radius = Math.max(0, partition.activeRadius)
  const playerCellX = Math.floor(playerPosition[0] / cellSize)
  const playerCellZ = Math.floor(playerPosition[2] / cellSize)

  for (const cell of partition.cells) {
    if (
      Math.abs(cell.x - playerCellX) <= radius &&
      Math.abs(cell.z - playerCellZ) <= radius
    ) {
      for (const actorId of cell.actorIds) {
        activeActorIds.add(actorId)
      }
    }
  }

  return activeActorIds
}
