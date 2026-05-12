import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveGameManualChunk } from './lib/chunkOwnership.mjs'
import {
  parseModuleReferences,
  resolveModuleReference,
  toAppRelative,
} from './lib/dependencyGraph.mjs'

const appRoot = fileURLToPath(new URL('..', import.meta.url))
const srcRoot = path.join(appRoot, 'src')
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.svelte'])
const criticalChunkExpectations = [
  {
    file: 'src/threlte/features/conversation/conversationStores.ts',
    chunk: 'runtime-world',
  },
  {
    file: 'src/threlte/features/conversation/ConversationDialog.svelte',
    chunk: 'runtime-conversation',
  },
  {
    file: 'src/threlte/levels/RuntimeGameplayRenderer.svelte',
    chunk: 'runtime-world',
  },
  {
    file: 'src/threlte/levels/RuntimePrefabNode.svelte',
    chunk: 'runtime-world',
  },
  {
    file: 'src/threlte/engine/runtimePrefabCatalog.ts',
    chunk: 'runtime-engine',
  },
  {
    file: 'src/threlte/editor/editorBakeSource.ts',
    chunk: 'editor-document',
  },
]
const runtimeAuthoringBoundaryForbiddenImports = [
  '/scripts/lib/runtimePrefabBakeSources/',
  '/src/threlte/engine/runtimePrefabAnomalyMeshes.ts',
  '/src/threlte/engine/runtimePrefabCourtyardMeshes.ts',
  '/src/threlte/engine/runtimePrefabGrowthMeshes.ts',
  '/src/threlte/engine/runtimePrefabMeshFactory.ts',
  '/src/threlte/engine/runtimePrefabProceduralMeshes.ts',
  '/src/threlte/engine/runtimePrefabTechMeshes.ts',
  '/src/threlte/engine/runtimePrefabWastelandMeshes.ts',
]

function findSourceFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      files.push(...findSourceFiles(fullPath))
      continue
    }

    if (sourceExtensions.has(path.extname(fullPath))) {
      files.push(fullPath)
    }
  }
  return files.sort()
}

function addEdge(edges, fromChunk, toChunk, example) {
  if (!edges.has(fromChunk)) {
    edges.set(fromChunk, new Map())
  }

  const targets = edges.get(fromChunk)
  if (!targets.has(toChunk)) {
    targets.set(toChunk, {
      count: 0,
      examples: [],
    })
  }

  const edge = targets.get(toChunk)
  edge.count += 1
  if (edge.examples.length < 3) {
    edge.examples.push(example)
  }
}

function getStaticChunkEdges(sourceFiles) {
  const edges = new Map()

  for (const filePath of sourceFiles) {
    const fromChunk = resolveGameManualChunk(filePath)
    if (!fromChunk) continue

    const references = parseModuleReferences(filePath)
    for (const reference of references) {
      if (reference.typeOnly || reference.kind === 'dynamic') continue

      const resolvedPath = resolveModuleReference({
        appRoot,
        fromFile: filePath,
        specifier: reference.specifier,
      })
      if (!resolvedPath) continue

      const toChunk = resolveGameManualChunk(resolvedPath)
      if (!toChunk || toChunk === fromChunk) continue

      addEdge(edges, fromChunk, toChunk, {
        from: toAppRelative(appRoot, filePath),
        to: toAppRelative(appRoot, resolvedPath),
        specifier: reference.specifier,
      })
    }
  }

  return edges
}

function findChunkCycles(edges) {
  const cycles = []
  const visiting = new Set()
  const visited = new Set()
  const stack = []
  const seenCycleKeys = new Set()

  function normalizeCycle(cycle) {
    const rotations = cycle.map((_, index) => [
      ...cycle.slice(index),
      ...cycle.slice(0, index),
    ])
    return rotations
      .map(rotation => rotation.join(' -> '))
      .sort((a, b) => a.localeCompare(b))[0]
  }

  function visit(chunk) {
    if (visiting.has(chunk)) {
      const startIndex = stack.indexOf(chunk)
      if (startIndex < 0) return

      const cycle = [...stack.slice(startIndex), chunk]
      const key = normalizeCycle(cycle.slice(0, -1))
      if (!seenCycleKeys.has(key)) {
        seenCycleKeys.add(key)
        cycles.push(cycle)
      }
      return
    }

    if (visited.has(chunk)) return

    visiting.add(chunk)
    stack.push(chunk)

    for (const target of edges.get(chunk)?.keys() ?? []) {
      visit(target)
    }

    stack.pop()
    visiting.delete(chunk)
    visited.add(chunk)
  }

  for (const chunk of edges.keys()) {
    visit(chunk)
  }

  return cycles
}

function checkCriticalExpectations() {
  return criticalChunkExpectations
    .map(expectation => {
      const filePath = path.join(appRoot, expectation.file)
      const actual = existsSync(filePath)
        ? resolveGameManualChunk(filePath)
        : 'missing-file'

      return {
        ...expectation,
        actual,
        ok: actual === expectation.chunk,
      }
    })
    .filter(result => !result.ok)
}

function checkRuntimeAuthoringBoundary(sourceFiles) {
  const failures = []

  for (const filePath of sourceFiles) {
    const fromChunk = resolveGameManualChunk(filePath)
    if (!fromChunk?.startsWith('runtime-')) continue

    const references = parseModuleReferences(filePath)
    for (const reference of references) {
      if (reference.typeOnly || reference.kind === 'dynamic') continue

      const resolvedPath = resolveModuleReference({
        appRoot,
        fromFile: filePath,
        specifier: reference.specifier,
      })
      const normalizedResolvedPath = resolvedPath
        ? resolvedPath.replace(/\\/g, '/')
        : ''
      const violatesBoundary = runtimeAuthoringBoundaryForbiddenImports.some(
        pattern =>
          normalizedResolvedPath.includes(pattern) ||
          reference.specifier.includes(pattern),
      )
      if (!violatesBoundary) continue

      failures.push({
        from: toAppRelative(appRoot, filePath),
        specifier: reference.specifier,
        resolved: resolvedPath ? toAppRelative(appRoot, resolvedPath) : null,
      })
    }
  }

  return failures
}

function printEdgeSummary(edges) {
  for (const [fromChunk, targets] of [...edges.entries()].sort()) {
    for (const [toChunk, edge] of [...targets.entries()].sort()) {
      const example = edge.examples[0]
      console.log(
        `  ${fromChunk} -> ${toChunk}  count=${edge.count}  example=${example.from} imports ${example.specifier}`,
      )
    }
  }
}

const sourceFiles = findSourceFiles(srcRoot)
const edges = getStaticChunkEdges(sourceFiles)
const cycles = findChunkCycles(edges)
const failedExpectations = checkCriticalExpectations()
const boundaryFailures = checkRuntimeAuthoringBoundary(sourceFiles)

console.log('Chunk ownership audit')
console.log('=====================')
console.log(`sourceFiles=${sourceFiles.length}`)
console.log(
  `crossChunkEdges=${[...edges.values()].reduce((sum, targets) => sum + targets.size, 0)}`,
)

if (edges.size > 0) {
  printEdgeSummary(edges)
}

if (failedExpectations.length > 0) {
  console.error('\nFailed critical chunk expectations:')
  for (const expectation of failedExpectations) {
    console.error(
      `  ${expectation.file}: expected ${expectation.chunk}, got ${expectation.actual}`,
    )
  }
}

if (cycles.length > 0) {
  console.error('\nStatic manual chunk cycles:')
  for (const cycle of cycles) {
    console.error(`  ${cycle.join(' -> ')}`)
  }
}

if (boundaryFailures.length > 0) {
  console.error('\nRuntime authoring boundary violations:')
  for (const failure of boundaryFailures) {
    console.error(
      `  ${failure.from}: imports ${failure.specifier}${failure.resolved ? ` (${failure.resolved})` : ''}`,
    )
  }
}

if (
  failedExpectations.length > 0 ||
  cycles.length > 0 ||
  boundaryFailures.length > 0
) {
  process.exit(1)
}

console.log('status=ok')
