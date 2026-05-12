import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { findDeprecatedSceneFields } from './deprecatedSceneFields.mjs'
import { readDeployedSceneLevels } from './levelRegistry.mjs'

const forbiddenRuntimeActorFields = new Set([
  'editor',
  'legacyKind',
  'locked',
  'generation',
])

function collectRuntimeActorPurityFailures(file, actors) {
  const failures = []
  if (!Array.isArray(actors)) return failures

  for (const actor of actors) {
    if (!actor || typeof actor !== 'object') continue
    for (const field of forbiddenRuntimeActorFields) {
      if (Object.hasOwn(actor, field)) {
        failures.push(
          `${file}: actor "${actor.id ?? '<unknown>'}" contains forbidden runtime field "${field}"`,
        )
      }
    }
  }

  return failures
}

export function auditRuntimeScenes({
  appRoot,
  runtimeSceneDir,
  isFiniteVec3,
  readJsonFile,
}) {
  const failures = []
  const reports = readDeployedSceneLevels({ appRoot }).map(level => {
    const file = `${level.id}.runtime-scene.json`
    const fullPath = join(runtimeSceneDir, file)
    const report = {
      file,
      levelId: level.id,
      exists: existsSync(fullPath),
      actorCount: 0,
      requiredRenderActorCount: 0,
      requiredAssetCount: 0,
      runtimeAssetCount: 0,
      buildErrors: 0,
      deprecatedFields: 0,
      hasGraphicsBudget: false,
      hasRenderProfile: false,
    }

    if (!report.exists) {
      failures.push(`${file}: missing cooked runtime scene manifest`)
      return report
    }

    const manifest = readJsonFile(fullPath)
    const levelDefinition = manifest.levelDefinition
    const buildReport = manifest.buildReport

    if (manifest.schemaVersion !== 1) {
      failures.push(`${file}: unsupported runtime scene schemaVersion`)
    }
    if (manifest.levelId !== level.id) {
      failures.push(`${file}: levelId mismatch ${manifest.levelId}`)
    }
    if (!levelDefinition || levelDefinition.id !== level.id) {
      failures.push(`${file}: levelDefinition id mismatch`)
    }
    if (!isFiniteVec3(levelDefinition?.spawn?.player)) {
      failures.push(`${file}: levelDefinition spawn.player must be a finite Vec3`)
    }
    if (
      levelDefinition?.spawn?.rotation !== undefined &&
      !isFiniteVec3(levelDefinition.spawn.rotation)
    ) {
      failures.push(`${file}: levelDefinition spawn.rotation must be a finite Vec3 when provided`)
    }
    if (!Array.isArray(levelDefinition?.actors)) {
      failures.push(`${file}: levelDefinition actors must be an array`)
    }
    if (!buildReport || buildReport.levelId !== level.id) {
      failures.push(`${file}: buildReport levelId mismatch`)
    }

    report.actorCount = levelDefinition?.actors?.length ?? 0
    report.requiredRenderActorCount =
      buildReport?.requiredRenderActorIds?.length ?? 0
    report.requiredAssetCount = buildReport?.requiredAssetUrls?.length ?? 0
    report.runtimeAssetCount = buildReport?.runtimeAssetUrls?.length ?? 0
    report.buildErrors = buildReport?.errors?.length ?? 0
    report.hasGraphicsBudget = !!levelDefinition?.settings?.level?.graphicsBudget
    report.hasRenderProfile =
      !!levelDefinition?.settings?.level?.renderProfile &&
      !!manifest.runtime?.renderProfile
    const deprecatedFields = findDeprecatedSceneFields(levelDefinition ?? {})
    const actorPurityFailures = collectRuntimeActorPurityFailures(
      file,
      levelDefinition?.actors,
    )
    report.deprecatedFields = deprecatedFields.length

    failures.push(...actorPurityFailures)

    if (report.buildErrors > 0) {
      failures.push(`${file}: cooked runtime scene has build errors`)
    }
    if (deprecatedFields.length > 0) {
      failures.push(
        `${file}: cooked runtime scene contains deprecated fields: ${deprecatedFields.join(', ')}`,
      )
    }
    if (!report.hasGraphicsBudget) {
      failures.push(`${file}: cooked runtime scene is missing graphicsBudget`)
    }
    if (!report.hasRenderProfile) {
      failures.push(`${file}: cooked runtime scene is missing renderProfile`)
    }

    return report
  })

  return { failures, reports }
}
