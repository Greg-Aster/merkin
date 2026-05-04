import { existsSync } from 'node:fs'
import { join } from 'node:path'

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
    const partitionBudget = budgetByLevel[levelId] ?? {}

    if (partition.version !== 1) {
      failures.push(`${file}: unsupported partition version ${partition.version}`)
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
        failures.push(`${file}: actor "${actorId}" is both resident and streamable`)
      }
    }
    for (const cell of partition.cells ?? []) {
      if (!Array.isArray(cell.actorIds) || cell.actorIds.length === 0) {
        failures.push(`${file}: cell "${cell.key}" must contain actorIds`)
        continue
      }
      for (const actorId of cell.actorIds) {
        if (!streamableActorIds.has(actorId)) {
          failures.push(
            `${file}: cell "${cell.key}" references non-streamable actor "${actorId}"`,
          )
        }
      }
    }

    return report
  })

  return { failures, reports }
}
