import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveGameManualChunk } from './lib/chunkOwnership.mjs'
import {
  parseModuleReferences,
  resolveModuleReference,
  toAppRelative,
} from './lib/dependencyGraph.mjs'

const appRoot = fileURLToPath(new URL('..', import.meta.url))
const repoRoot = path.resolve(appRoot, '..', '..')
const srcRoot = path.join(appRoot, 'src')
const runtimeAssetRoot = path.join(
  repoRoot,
  'apps/megameal/public/generated/runtime-game-assets',
)
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.svelte'])
const runtimePayloadExtensions = new Set(['.json'])
const forbiddenRuntimeSourcePathFragments = [
  '/src/threlte/editor/',
  '/scripts/',
]
const forbiddenRuntimePayloadKeys = new Set([
  'editor',
  'editorState',
  'editorSession',
  'editorSelection',
  'selectedNodeIds',
  'selection',
  'history',
  'undoStack',
  'redoStack',
  'outliner',
  'inspector',
  'gizmo',
])

function findFiles(dir, extensions) {
  if (!existsSync(dir)) return []

  const files = []
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      files.push(...findFiles(fullPath, extensions))
      continue
    }

    if (extensions.has(path.extname(fullPath))) {
      files.push(fullPath)
    }
  }
  return files.sort()
}

function normalizePath(value) {
  return value.replace(/\\/g, '/')
}

function isRuntimeSourceFile(filePath) {
  return resolveGameManualChunk(filePath)?.startsWith('runtime-') ?? false
}

function auditRuntimeImports(sourceFiles) {
  const failures = []

  for (const filePath of sourceFiles.filter(isRuntimeSourceFile)) {
    for (const reference of parseModuleReferences(filePath)) {
      if (reference.typeOnly || reference.kind === 'dynamic') continue

      const resolvedPath = resolveModuleReference({
        appRoot,
        fromFile: filePath,
        specifier: reference.specifier,
      })
      const normalizedResolvedPath = resolvedPath
        ? normalizePath(resolvedPath)
        : ''
      const normalizedSpecifier = normalizePath(reference.specifier)
      const violatesBoundary = forbiddenRuntimeSourcePathFragments.some(
        fragment =>
          normalizedResolvedPath.includes(fragment) ||
          normalizedSpecifier.includes(fragment),
      )
      if (!violatesBoundary) continue

      failures.push({
        file: toAppRelative(appRoot, filePath),
        specifier: reference.specifier,
        kind: reference.kind,
        resolved: resolvedPath ? toAppRelative(appRoot, resolvedPath) : null,
      })
    }
  }

  return failures
}

function collectForbiddenPayloadKeys(
  value,
  filePath,
  jsonPath = '$',
  matches = [],
) {
  if (!value || typeof value !== 'object') return matches

  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      collectForbiddenPayloadKeys(
        entry,
        filePath,
        `${jsonPath}[${index}]`,
        matches,
      ),
    )
    return matches
  }

  for (const [key, entry] of Object.entries(value)) {
    const childPath = `${jsonPath}.${key}`
    if (forbiddenRuntimePayloadKeys.has(key)) {
      matches.push({
        file: path.relative(repoRoot, filePath),
        path: childPath,
        key,
      })
    }
    collectForbiddenPayloadKeys(entry, filePath, childPath, matches)
  }

  return matches
}

function auditRuntimePayloads(payloadFiles) {
  const failures = []

  for (const filePath of payloadFiles) {
    let payload
    try {
      payload = JSON.parse(
        readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''),
      )
    } catch (error) {
      failures.push({
        file: path.relative(repoRoot, filePath),
        path: '$',
        key: 'json-parse',
        message: error instanceof Error ? error.message : String(error),
      })
      continue
    }

    failures.push(...collectForbiddenPayloadKeys(payload, filePath))
  }

  return failures
}

const sourceFiles = findFiles(srcRoot, sourceExtensions)
const runtimePayloadFiles = findFiles(
  runtimeAssetRoot,
  runtimePayloadExtensions,
)
const runtimeSourceFileCount = sourceFiles.filter(isRuntimeSourceFile).length
const importFailures = auditRuntimeImports(sourceFiles)
const payloadFailures = auditRuntimePayloads(runtimePayloadFiles)

console.log('Runtime purity audit')
console.log('====================')
console.log(`runtimeSourceFiles=${runtimeSourceFileCount}`)
console.log(`runtimePayloadFiles=${runtimePayloadFiles.length}`)
console.log(`importFailures=${importFailures.length}`)
console.log(`payloadFailures=${payloadFailures.length}`)

if (importFailures.length > 0) {
  console.error('\nRuntime source imported editor/authoring code:')
  for (const failure of importFailures) {
    console.error(
      `  ${failure.file}: ${failure.kind} import ${failure.specifier}${failure.resolved ? ` (${failure.resolved})` : ''}`,
    )
  }
}

if (payloadFailures.length > 0) {
  console.error('\nRuntime payload contains editor-only metadata:')
  for (const failure of payloadFailures.slice(0, 80)) {
    console.error(`  ${failure.file}: ${failure.path}`)
    if (failure.message) console.error(`    ${failure.message}`)
  }
  if (payloadFailures.length > 80) {
    console.error(
      `  ... ${payloadFailures.length - 80} more payload failure(s)`,
    )
  }
}

if (importFailures.length > 0 || payloadFailures.length > 0) {
  process.exit(1)
}

console.log('status=ok')
