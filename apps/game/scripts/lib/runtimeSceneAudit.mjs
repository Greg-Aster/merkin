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

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function sortJsonValue(value) {
  if (Array.isArray(value)) return value.map(sortJsonValue)
  if (!isRecord(value)) return value

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map(key => [key, sortJsonValue(value[key])]),
  )
}

function stableStringify(value) {
  return JSON.stringify(sortJsonValue(value ?? null))
}

function getFireflyFeature(settings) {
  return settings?.level?.features?.fireflies ?? null
}

function getLightingSnapshot(settings) {
  const level = settings?.level
  return {
    features: {
      fireflies: getFireflyFeature(settings),
    },
    fireflies: level?.fireflies ?? null,
    lighting: level?.lighting ?? null,
  }
}

function finiteCountOrDefault(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback
}

function isFireflyNpcActor(actor) {
  return (
    actor?.npc?.archetype === 'firefly' ||
    actor?.npc?.presentation?.type === 'firefly'
  )
}

function isGeneratedFireflyFieldActor(actor, levelId) {
  return (
    isFireflyNpcActor(actor) &&
    typeof actor?.id === 'string' &&
    actor.id.startsWith(`${levelId}-scene-fireflies-`)
  )
}

function collectRuntimeFireflyPopulationFailures({ file, manifest }) {
  const failures = []
  const levelDefinition = manifest.levelDefinition
  const levelSettings = levelDefinition?.settings?.level
  const fireflies = levelSettings?.fireflies
  const fireflyFeatureEnabled = levelSettings?.features?.fireflies === true
  const fieldEnabled = fireflyFeatureEnabled && fireflies?.enabled === true

  if (!fieldEnabled) return failures

  const actors = Array.isArray(levelDefinition?.actors)
    ? levelDefinition.actors
    : []
  const generatedFireflyActors = actors.filter(actor =>
    isGeneratedFireflyFieldActor(actor, levelDefinition.id),
  )
  const expectedGeneratedFireflyActors = finiteCountOrDefault(
    fireflies.count,
    0,
  )

  if (expectedGeneratedFireflyActors <= 0) {
    failures.push(
      `${file}: enabled firefly field must author a positive settings.level.fireflies.count for generated manifest population`,
    )
  } else if (generatedFireflyActors.length !== expectedGeneratedFireflyActors) {
    failures.push(
      `${file}: enabled firefly field must cook ${expectedGeneratedFireflyActors} generated firefly NPC actor(s); found ${generatedFireflyActors.length}`,
    )
  }

  if (!Object.prototype.hasOwnProperty.call(fireflies, 'activeLightPercent')) {
    failures.push(
      `${file}: enabled firefly field must carry activeLightPercent into the cooked runtime scene settings`,
    )
  }

  return failures
}

function collectRuntimeLightingContractFailures({
  file,
  manifest,
  sourceScene,
}) {
  const failures = []
  const runtimeLighting = manifest.levelDefinition?.settings?.level?.lighting

  if (
    !runtimeLighting ||
    !Object.prototype.hasOwnProperty.call(
      runtimeLighting,
      'hemisphereIntensity',
    )
  ) {
    failures.push(
      `${file}: cooked runtime scene settings.level.lighting.hemisphereIntensity must be explicit`,
    )
  }

  if (sourceScene) {
    const sourceSnapshot = getLightingSnapshot(sourceScene.settings)
    const runtimeSnapshot = getLightingSnapshot(
      manifest.levelDefinition?.settings,
    )
    if (stableStringify(sourceSnapshot) !== stableStringify(runtimeSnapshot)) {
      failures.push(
        `${file}: source/runtime lighting and firefly settings drift; recook the runtime scene from the source scene`,
      )
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
    const sourceScenePath = join(
      appRoot,
      'src/threlte/editor/scenes',
      `${level.id}.scene.json`,
    )
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
    const sourceScene = existsSync(sourceScenePath)
      ? readJsonFile(sourceScenePath)
      : null
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
      failures.push(
        `${file}: levelDefinition spawn.player must be a finite Vec3`,
      )
    }
    if (
      levelDefinition?.spawn?.rotation !== undefined &&
      !isFiniteVec3(levelDefinition.spawn.rotation)
    ) {
      failures.push(
        `${file}: levelDefinition spawn.rotation must be a finite Vec3 when provided`,
      )
    }
    if (!Array.isArray(levelDefinition?.actors)) {
      failures.push(`${file}: levelDefinition actors must be an array`)
    }
    if (!buildReport || buildReport.levelId !== level.id) {
      failures.push(`${file}: buildReport levelId mismatch`)
    }

    report.actorCount = levelDefinition?.actors?.length ?? 0
    report.requiredRenderActorCount =
      buildReport?.runtimeReadinessContract?.runtime?.requiredRenderActorIds
        ?.length ?? 0
    report.requiredAssetCount =
      buildReport?.runtimeReadinessContract?.runtime?.requiredAssetUrls
        ?.length ?? 0
    report.runtimeAssetCount =
      buildReport?.runtimeReadinessContract?.runtimeAssetUrls?.length ?? 0
    report.buildErrors = buildReport?.errors?.length ?? 0
    report.hasGraphicsBudget =
      !!levelDefinition?.settings?.level?.graphicsBudget
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
    failures.push(
      ...collectRuntimeLightingContractFailures({
        file,
        manifest,
        sourceScene,
      }),
    )
    failures.push(
      ...collectRuntimeFireflyPopulationFailures({
        file,
        manifest,
      }),
    )

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
