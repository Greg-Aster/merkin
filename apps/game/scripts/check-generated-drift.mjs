import { existsSync, readFileSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import {
  buildRuntimeAssetManifest,
  createRuntimeAssetCookContext,
  resolvePublicPath,
} from './lib/runtimeAssetCookManifest.mjs'
import { auditRuntimeAssetManifestObject } from './lib/runtimeAssetManifestAudit.mjs'
import { auditTerrainContracts } from './lib/terrainContractAudit.mjs'

const appRoot = join(import.meta.dirname, '..')
const context = createRuntimeAssetCookContext({ appRoot })
const maxDiffs = 30

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
}

function stableStringify(value) {
  return JSON.stringify(sortJson(value), null, 2)
}

function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortJson)
  }
  if (!value || typeof value !== 'object') {
    return value
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortJson(entry)]),
  )
}

function normalizeVolatileFields(value) {
  const normalized = JSON.parse(JSON.stringify(value))
  normalized.generatedAt = '<generated-at>'

  if (normalized.contentBuild) {
    normalized.contentBuild.generatedAt = '<generated-at>'
    normalized.contentBuild.buildId = '<content-build-id>'
    normalized.contentBuild.git = '<git-metadata>'
  }

  if (normalized.impostorAtlas) {
    normalized.impostorAtlas.generatedAt = '<generated-at>'
  }

  return normalized
}

function normalizeRuntimeScene(value) {
  const normalized = JSON.parse(JSON.stringify(value))
  normalized.generatedAt = '<generated-at>'
  return normalized
}

function normalizeImpostorAtlas(value) {
  const normalized = JSON.parse(JSON.stringify(value))
  normalized.generatedAt = '<generated-at>'
  return normalized
}

function describeValue(value) {
  if (value === undefined) return '<missing>'
  if (value === null) return 'null'
  if (Array.isArray(value)) return `array(${value.length})`
  if (typeof value === 'object') return `object(${Object.keys(value).length})`
  return JSON.stringify(value)
}

function collectDiffs(actual, expected, path = '$', diffs = []) {
  if (diffs.length >= maxDiffs) return diffs
  if (stableStringify(actual) === stableStringify(expected)) return diffs

  if (
    !actual ||
    !expected ||
    typeof actual !== 'object' ||
    typeof expected !== 'object' ||
    Array.isArray(actual) !== Array.isArray(expected)
  ) {
    diffs.push(
      `${path}: actual ${describeValue(actual)} expected ${describeValue(expected)}`,
    )
    return diffs
  }

  if (Array.isArray(actual)) {
    const length = Math.max(actual.length, expected.length)
    for (let index = 0; index < length; index += 1) {
      collectDiffs(actual[index], expected[index], `${path}[${index}]`, diffs)
      if (diffs.length >= maxDiffs) break
    }
    return diffs
  }

  const keys = new Set([...Object.keys(actual), ...Object.keys(expected)])
  for (const key of [...keys].sort()) {
    collectDiffs(actual[key], expected[key], `${path}.${key}`, diffs)
    if (diffs.length >= maxDiffs) break
  }

  return diffs
}

function compareJsonArtifact({ label, path, actual, expected, normalize }) {
  if (!existsSync(path)) {
    return [`${label} is missing: ${relative(context.repoRoot, path)}`]
  }

  const normalizedActual = normalize(actual)
  const normalizedExpected = normalize(expected)
  if (stableStringify(normalizedActual) === stableStringify(normalizedExpected)) {
    return []
  }

  const diffs = collectDiffs(normalizedActual, normalizedExpected)
  return [
    `${label} drifted: ${relative(context.repoRoot, path)}`,
    ...diffs.map(diff => `  - ${diff}`),
  ]
}

function validateReleaseManifests({ currentManifest, expectedManifest }) {
  const failures = []
  const currentRollback = currentManifest.contentBuild?.rollback
  const previousManifestUrl = currentRollback?.previousManifestUrl
  const currentManifestUrl = currentRollback?.currentManifestUrl

  if (
    currentManifest.contentBuild?.fingerprint !==
    expectedManifest.contentBuild?.fingerprint
  ) {
    failures.push(
      `runtime asset manifest fingerprint drifted: actual ${currentManifest.contentBuild?.fingerprint ?? '<missing>'} expected ${expectedManifest.contentBuild?.fingerprint ?? '<missing>'}`,
    )
  }

  if (currentManifestUrl !== '/generated/runtime-game-assets/manifest.json') {
    failures.push('runtime asset manifest rollback.currentManifestUrl is invalid')
  }

  if (previousManifestUrl !== '/generated/runtime-game-assets/manifest.previous.json') {
    failures.push('runtime asset manifest rollback.previousManifestUrl is invalid')
  }

  if (previousManifestUrl) {
    const previousPath = resolvePublicPath(context, previousManifestUrl)
    if (!existsSync(previousPath)) {
      failures.push(
        `runtime asset rollback manifest is missing: ${relative(context.repoRoot, previousPath)}`,
      )
    } else {
      const previousManifest = readJson(previousPath)
      if (previousManifest.schemaVersion !== 1) {
        failures.push('runtime asset rollback manifest schemaVersion must be 1')
      }
      if (!previousManifest.contentBuild?.fingerprint) {
        failures.push('runtime asset rollback manifest must include a contentBuild fingerprint')
      }
      if (!previousManifest.assets || typeof previousManifest.assets !== 'object') {
        failures.push('runtime asset rollback manifest must include assets')
      }
    }
  }

  return failures
}

const generatedManifest = await buildRuntimeAssetManifest(context)
const { runtimeSceneManifests, ...expectedAssetManifest } = generatedManifest
const currentAssetManifest = existsSync(context.manifestPath)
  ? readJson(context.manifestPath)
  : null

const failures = []

const terrainContractAudit = auditTerrainContracts({
  sceneDir: context.sceneDir,
  publicDir: context.publicRoot,
  runtimeSceneDir: context.runtimeSceneRoot,
})
failures.push(...terrainContractAudit.failures)

if (currentAssetManifest) {
  const audit = auditRuntimeAssetManifestObject({
    manifest: currentAssetManifest,
    runtimeSceneManifests: runtimeSceneManifests
      .map(entry => {
        const path = join(context.runtimeSceneRoot, basename(entry.outputPath))
        return existsSync(path) ? readJson(path) : null
      })
      .filter(Boolean),
  })
  failures.push(...audit.failures)
  failures.push(
    ...validateReleaseManifests({
      currentManifest: currentAssetManifest,
      expectedManifest: expectedAssetManifest,
    }),
  )
}

failures.push(
  ...compareJsonArtifact({
    label: 'runtime asset manifest',
    path: context.manifestPath,
    actual: currentAssetManifest,
    expected: expectedAssetManifest,
    normalize: normalizeVolatileFields,
  }),
)

for (const entry of runtimeSceneManifests) {
  const outputPath = entry.outputPath
  failures.push(
    ...compareJsonArtifact({
      label: `runtime scene manifest ${entry.manifest.levelId}`,
      path: outputPath,
      actual: existsSync(outputPath) ? readJson(outputPath) : null,
      expected: entry.manifest,
      normalize: normalizeRuntimeScene,
    }),
  )
}

if (generatedManifest.impostorAtlas) {
  const atlasPath = resolvePublicPath(
    context,
    generatedManifest.impostorAtlas.manifestUrl,
  )
  failures.push(
    ...compareJsonArtifact({
      label: 'runtime impostor atlas manifest',
      path: atlasPath,
      actual: existsSync(atlasPath) ? readJson(atlasPath) : null,
      expected: generatedManifest.impostorAtlas,
      normalize: normalizeImpostorAtlas,
    }),
  )
}

if (failures.length > 0) {
  console.error('Generated runtime asset drift check failed')
  console.error('========================================')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  console.error('')
  console.error('Regenerate reviewed artifacts with:')
  console.error('  pnpm --dir apps/game cook:runtime-assets')
  process.exit(1)
}

console.log('Generated runtime asset drift check passed')
