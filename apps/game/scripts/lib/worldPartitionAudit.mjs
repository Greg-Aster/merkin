import { existsSync } from 'node:fs'
import { join } from 'node:path'

function isFiniteVec2(value) {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(component => Number.isFinite(component))
  )
}

function hasValidBounds(cell) {
  return (
    cell?.bounds &&
    typeof cell.bounds === 'object' &&
    isFiniteVec2(cell.bounds.min) &&
    isFiniteVec2(cell.bounds.max) &&
    cell.bounds.max[0] > cell.bounds.min[0] &&
    cell.bounds.max[1] > cell.bounds.min[1]
  )
}

export function auditWorldPartitions({
  worldPartitionDir,
  requiredLevels,
  budgetByLevel,
  readJsonFile,
}) {
  const failures = []
  const reports = requiredLevels.map(levelId => {
    const file = `${levelId}.partition.json`
    const fullPath = join(worldPartitionDir, file)
    const report = {
      file,
      cells: 0,
      residentActors: 0,
      streamableActors: 0,
      maxActorsPerCell: 0,
      readinessGates: 0,
      initialCells: 0,
      residentRenderActors: 0,
      residentCollisionActors: 0,
      initialRenderActors: 0,
      initialCollisionActors: 0,
    }

    if (!existsSync(fullPath)) {
      failures.push(`${file}: missing runtime world partition manifest`)
      return report
    }

    const partition = readJsonFile(fullPath)
    report.cells = partition.cells?.length ?? 0
    report.residentActors = partition.residentActorIds?.length ?? 0
    report.streamableActors = partition.streamableActorIds?.length ?? 0
    report.maxActorsPerCell = partition.budgets?.maxActorsPerCell ?? 0
    report.readinessGates = partition.streaming?.readinessGates?.length ?? 0
    report.initialCells =
      partition.readiness?.requiredInitialCellKeys?.length ?? 0
    report.residentRenderActors =
      partition.readiness?.requiredResidentRenderActorIds?.length ?? 0
    report.residentCollisionActors =
      partition.readiness?.requiredResidentCollisionActorIds?.length ?? 0
    report.initialRenderActors =
      partition.readiness?.requiredInitialRenderActorIds?.length ?? 0
    report.initialCollisionActors =
      partition.readiness?.requiredInitialCollisionActorIds?.length ?? 0
    const partitionBudget = budgetByLevel[levelId] ?? {}

    if (partition.version !== 1) {
      failures.push(
        `${file}: unsupported partition version ${partition.version}`,
      )
    }
    if (partition.levelId !== levelId) {
      failures.push(`${file}: levelId mismatch ${partition.levelId}`)
    }
    if (!Array.isArray(partition.cells)) {
      failures.push(`${file}: cells must be an array`)
    }
    if (report.streamableActors < 1) {
      failures.push(`${file}: expected at least one streamable actor`)
    }
    if (report.streamableActors > 0 && report.initialCells < 1) {
      failures.push(`${file}: expected at least one initial streaming cell`)
    }
    if (partition.streaming?.mode !== 'staged-render-collision') {
      failures.push(`${file}: streaming.mode must be staged-render-collision`)
    }
    for (const gate of [
      'partition-manifest',
      'resident-render',
      'resident-collision',
      'initial-cell-render',
      'initial-cell-collision',
    ]) {
      if (!partition.streaming?.readinessGates?.includes(gate)) {
        failures.push(`${file}: missing world-partition readiness gate ${gate}`)
      }
    }
    if (!Array.isArray(partition.readiness?.requiredInitialCellKeys)) {
      failures.push(
        `${file}: readiness.requiredInitialCellKeys must be an array`,
      )
    }
    if (!Array.isArray(partition.readiness?.requiredInitialRenderActorIds)) {
      failures.push(
        `${file}: readiness.requiredInitialRenderActorIds must be an array`,
      )
    }
    if (!Array.isArray(partition.readiness?.requiredInitialCollisionActorIds)) {
      failures.push(
        `${file}: readiness.requiredInitialCollisionActorIds must be an array`,
      )
    }
    if (
      Number.isFinite(partitionBudget.maxResidentActors) &&
      report.residentActors > partitionBudget.maxResidentActors
    ) {
      failures.push(
        `${file}: resident actors exceed world-partition budget ${report.residentActors}/${partitionBudget.maxResidentActors}`,
      )
    }
    if (
      Number.isFinite(partitionBudget.minStreamableActors) &&
      report.streamableActors < partitionBudget.minStreamableActors
    ) {
      failures.push(
        `${file}: streamable actors below world-partition budget ${report.streamableActors}/${partitionBudget.minStreamableActors}`,
      )
    }
    if (
      Number.isFinite(partitionBudget.maxActorsPerCell) &&
      report.maxActorsPerCell > partitionBudget.maxActorsPerCell
    ) {
      failures.push(
        `${file}: max actors per cell exceeds world-partition budget ${report.maxActorsPerCell}/${partitionBudget.maxActorsPerCell}`,
      )
    }

    const residentActorIds = new Set(partition.residentActorIds ?? [])
    const streamableActorIds = new Set(partition.streamableActorIds ?? [])
    for (const actorId of streamableActorIds) {
      if (residentActorIds.has(actorId)) {
        failures.push(
          `${file}: actor "${actorId}" is both resident and streamable`,
        )
      }
    }
    const cellsByKey = new Map(
      (partition.cells ?? []).map(cell => [cell.key, cell]),
    )
    for (const cellKey of partition.readiness?.requiredInitialCellKeys ?? []) {
      if (!cellsByKey.has(cellKey)) {
        failures.push(
          `${file}: readiness.requiredInitialCellKeys references missing cell "${cellKey}"`,
        )
      }
    }
    for (const actorId of [
      ...(partition.readiness?.requiredResidentRenderActorIds ?? []),
      ...(partition.readiness?.requiredResidentCollisionActorIds ?? []),
    ]) {
      if (!residentActorIds.has(actorId)) {
        failures.push(
          `${file}: resident readiness actor "${actorId}" is not resident`,
        )
      }
    }
    for (const actorId of [
      ...(partition.readiness?.requiredInitialRenderActorIds ?? []),
      ...(partition.readiness?.requiredInitialCollisionActorIds ?? []),
    ]) {
      if (!streamableActorIds.has(actorId)) {
        failures.push(
          `${file}: initial readiness actor "${actorId}" is not streamable`,
        )
      }
    }
    for (const cell of partition.cells ?? []) {
      if (!hasValidBounds(cell)) {
        failures.push(`${file}: cell "${cell.key}" must include finite bounds`)
      }
      if (!Array.isArray(cell.actorIds) || cell.actorIds.length === 0) {
        failures.push(`${file}: cell "${cell.key}" must contain actorIds`)
        continue
      }
      if (!Array.isArray(cell.renderActorIds)) {
        failures.push(`${file}: cell "${cell.key}" must contain renderActorIds`)
      }
      if (!Array.isArray(cell.collisionActorIds)) {
        failures.push(
          `${file}: cell "${cell.key}" must contain collisionActorIds`,
        )
      }
      if (!['initial', 'stream'].includes(cell.streamingStage)) {
        failures.push(`${file}: cell "${cell.key}" has invalid streamingStage`)
      }
      for (const actorId of cell.actorIds) {
        if (!streamableActorIds.has(actorId)) {
          failures.push(
            `${file}: cell "${cell.key}" references non-streamable actor "${actorId}"`,
          )
        }
      }
      for (const actorId of [
        ...(cell.renderActorIds ?? []),
        ...(cell.collisionActorIds ?? []),
      ]) {
        if (!cell.actorIds.includes(actorId)) {
          failures.push(
            `${file}: cell "${cell.key}" references actor "${actorId}" outside actorIds`,
          )
        }
      }
    }

    return report
  })

  return { failures, reports }
}
