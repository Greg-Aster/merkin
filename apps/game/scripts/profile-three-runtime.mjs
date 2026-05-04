import fs from 'node:fs'
import path from 'node:path'
import {
  buildDependencyGraph,
  toAppRelative,
} from './lib/dependencyGraph.mjs'

const appRoot = path.resolve(import.meta.dirname, '..')
const threlteRoot = path.join(appRoot, 'src', 'threlte')

const staticRoots = [path.join(threlteRoot, 'Game.svelte')]

const gameplayBootRoots = [
  path.join(threlteRoot, 'systems', 'Physics.svelte'),
  path.join(threlteRoot, 'features', 'player', 'Player.svelte'),
  path.join(threlteRoot, 'levels', 'SceneDocumentLevel.svelte'),
]

function isThreeSpecifier(specifier) {
  return specifier === 'three' || specifier.startsWith('three/')
}

function isEditorPath(filePath) {
  return toAppRelative(appRoot, filePath).startsWith('src/threlte/editor/')
}

function isRuntimePath(filePath) {
  const relativePath = toAppRelative(appRoot, filePath)
  return (
    relativePath.startsWith('src/threlte/levels/') ||
    relativePath.startsWith('src/threlte/systems/') ||
    relativePath.startsWith('src/threlte/features/player/') ||
    relativePath.startsWith('src/threlte/core/') ||
    relativePath.startsWith('src/threlte/stores/')
  )
}

function isNeutralSharedPath(filePath) {
  const relativePath = toAppRelative(appRoot, filePath)
  return (
    relativePath.startsWith('src/threlte/engine/') ||
    relativePath.startsWith('src/threlte/features/performance/') ||
    relativePath.startsWith('src/threlte/features/terrain/') ||
    relativePath.startsWith('src/threlte/styles/runtime') ||
    relativePath.startsWith('src/threlte/utils/')
  )
}

function summarizeThreeUsers(graph) {
  const results = []

  for (const [filePath, info] of graph.entries()) {
    const threeDeps = info.references
      .filter(reference => isThreeSpecifier(reference.specifier))
      .map(reference => `${reference.specifier}:${reference.kind}`)

    if (threeDeps.length === 0) continue

    results.push({
      filePath,
      relativePath: toAppRelative(appRoot, filePath),
      size: fs.statSync(filePath).size,
      threeDeps,
    })
  }

  results.sort(
    (a, b) => b.size - a.size || a.relativePath.localeCompare(b.relativePath),
  )
  return results
}

function summarizePathUsers(graph, predicate) {
  return [...graph.keys()]
    .filter(predicate)
    .map(filePath => ({
      filePath,
      relativePath: toAppRelative(appRoot, filePath),
      size: fs.statSync(filePath).size,
    }))
    .sort(
      (a, b) => b.size - a.size || a.relativePath.localeCompare(b.relativePath),
    )
}

function summarizeResolvedRefs(graph, predicate) {
  const refs = []

  for (const [filePath, info] of graph.entries()) {
    for (const reference of info.references) {
      if (!reference.resolvedPath || !predicate(reference.resolvedPath)) continue
      refs.push({
        from: toAppRelative(appRoot, filePath),
        to: toAppRelative(appRoot, reference.resolvedPath),
        kind: reference.kind,
        typeOnly: reference.typeOnly,
        specifier: reference.specifier,
      })
    }
  }

  refs.sort(
    (a, b) =>
      a.kind.localeCompare(b.kind) ||
      a.from.localeCompare(b.from) ||
      a.to.localeCompare(b.to),
  )
  return refs
}

function summarizeSuspiciousEditorRefs(graph) {
  return summarizeResolvedRefs(graph, isEditorPath).filter(
    reference => reference.kind !== 'dynamic' && !reference.typeOnly,
  )
}

function printSection(title, users) {
  console.log(`\n[three-profile] ${title}`)
  if (users.length === 0) {
    console.log('  none')
    return
  }

  for (const user of users) {
    console.log(
      `  - ${user.relativePath} (${user.size} bytes) -> ${user.threeDeps.join(', ')}`,
    )
  }
}

function printBoundarySection(title, users) {
  console.log(`\n[three-profile] ${title}`)
  if (users.length === 0) {
    console.log('  none')
    return
  }

  for (const user of users.slice(0, 16)) {
    console.log(`  - ${user.relativePath} (${user.size} bytes)`)
  }
  if (users.length > 16) {
    console.log(`  ... ${users.length - 16} more`)
  }
}

function printReferenceSection(title, references) {
  console.log(`\n[three-profile] ${title}`)
  if (references.length === 0) {
    console.log('  none')
    return
  }

  for (const reference of references.slice(0, 20)) {
    const typeLabel = reference.typeOnly ? ', type-only' : ''
    console.log(
      `  - ${reference.from} -> ${reference.to} (${reference.kind}${typeLabel})`,
    )
  }
  if (references.length > 20) {
    console.log(`  ... ${references.length - 20} more`)
  }
}

const staticGraph = buildDependencyGraph({
  roots: staticRoots,
  appRoot,
  followDynamic: false,
  followTypeOnly: false,
})
const gameplayGraph = buildDependencyGraph({
  roots: gameplayBootRoots,
  appRoot,
  followDynamic: false,
  followTypeOnly: false,
})

const staticThreeUsers = summarizeThreeUsers(staticGraph)
const gameplayThreeUsers = summarizeThreeUsers(gameplayGraph)
const staticEditorUsers = summarizePathUsers(staticGraph, isEditorPath)
const gameplayEditorUsers = summarizePathUsers(gameplayGraph, isEditorPath)
const staticRuntimeUsers = summarizePathUsers(staticGraph, isRuntimePath)
const gameplaySharedUsers = summarizePathUsers(gameplayGraph, isNeutralSharedPath)
const staticEditorRefs = summarizeResolvedRefs(staticGraph, isEditorPath)
const gameplayEditorRefs = summarizeResolvedRefs(gameplayGraph, isEditorPath)
const suspiciousStaticEditorRefs = summarizeSuspiciousEditorRefs(staticGraph)
const suspiciousGameplayEditorRefs = summarizeSuspiciousEditorRefs(gameplayGraph)

printSection('static shell graph three users', staticThreeUsers)
printSection('initial gameplay boot graph three users', gameplayThreeUsers)
printBoundarySection('static shell editor boundary users', staticEditorUsers)
printBoundarySection(
  'initial gameplay boot editor boundary users',
  gameplayEditorUsers,
)
printBoundarySection('static shell runtime users', staticRuntimeUsers)
printBoundarySection(
  'initial gameplay boot neutral shared users',
  gameplaySharedUsers,
)
printReferenceSection('static shell editor references', staticEditorRefs)
printReferenceSection(
  'initial gameplay boot editor references',
  gameplayEditorRefs,
)
printReferenceSection(
  'suspicious static editor references',
  suspiciousStaticEditorRefs,
)
printReferenceSection(
  'suspicious gameplay editor references',
  suspiciousGameplayEditorRefs,
)

console.log('\n[three-profile] totals')
console.log(`  static shell files scanned: ${staticGraph.size}`)
console.log(`  static shell three users: ${staticThreeUsers.length}`)
console.log(`  static shell editor users: ${staticEditorUsers.length}`)
console.log(`  static shell editor references: ${staticEditorRefs.length}`)
console.log(
  `  static shell suspicious editor references: ${suspiciousStaticEditorRefs.length}`,
)
console.log(`  gameplay boot files scanned: ${gameplayGraph.size}`)
console.log(`  gameplay boot three users: ${gameplayThreeUsers.length}`)
console.log(`  gameplay boot editor users: ${gameplayEditorUsers.length}`)
console.log(`  gameplay boot editor references: ${gameplayEditorRefs.length}`)
console.log(
  `  gameplay boot suspicious editor references: ${suspiciousGameplayEditorRefs.length}`,
)
