import fs from 'node:fs'
import path from 'node:path'

const appRoot = path.resolve(import.meta.dirname, '..')
const threlteRoot = path.join(appRoot, 'src', 'threlte')

const staticRoots = [path.join(threlteRoot, 'Game.svelte')]

const gameplayBootRoots = [
  path.join(threlteRoot, 'systems', 'Physics.svelte'),
  path.join(threlteRoot, 'features', 'player', 'Player.svelte'),
  path.join(threlteRoot, 'levels', 'SceneDocumentLevel.svelte'),
]

const importPattern = /import\s+(?:[^'"]+?\s+from\s+)?["']([^"']+)["']/g

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function fileExists(candidate) {
  return fs.existsSync(candidate) && fs.statSync(candidate).isFile()
}

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null

  const base = path.resolve(path.dirname(fromFile), specifier)
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.js`,
    `${base}.svelte`,
    `${base}.json`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.js'),
    path.join(base, 'index.svelte'),
  ]

  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      return candidate
    }
  }

  return null
}

function parseImports(filePath) {
  const source = readFile(filePath).replace(/import\s+type\s+[^;]+;?/g, '')
  const imports = []
  let match

  while ((match = importPattern.exec(source)) !== null) {
    imports.push(match[1])
  }

  return imports
}

function buildGraph(roots) {
  const queue = [...roots]
  const visited = new Set()
  const graph = new Map()

  while (queue.length > 0) {
    const filePath = queue.shift()
    if (!filePath || visited.has(filePath) || !fileExists(filePath)) continue
    visited.add(filePath)

    const imports = parseImports(filePath)
    const relativeDeps = []
    const externalDeps = []

    for (const specifier of imports) {
      if (specifier.startsWith('.')) {
        const resolved = resolveImport(filePath, specifier)
        if (resolved) {
          relativeDeps.push(resolved)
          queue.push(resolved)
        }
      } else {
        externalDeps.push(specifier)
      }
    }

    graph.set(filePath, {
      relativeDeps,
      externalDeps,
    })
  }

  return graph
}

function summarizeThreeUsers(graph) {
  const results = []

  for (const [filePath, info] of graph.entries()) {
    const threeDeps = info.externalDeps.filter(
      specifier => specifier === 'three' || specifier.startsWith('three/'),
    )

    if (threeDeps.length === 0) continue

    const size = fs.statSync(filePath).size
    results.push({
      filePath,
      relativePath: path.relative(appRoot, filePath),
      size,
      threeDeps,
    })
  }

  results.sort(
    (a, b) => b.size - a.size || a.relativePath.localeCompare(b.relativePath),
  )
  return results
}

function summarizeEditorUsers(graph) {
  return [...graph.keys()]
    .map(filePath => ({
      filePath,
      relativePath: path.relative(appRoot, filePath),
      size: fs.statSync(filePath).size,
    }))
    .filter(entry => entry.relativePath.startsWith('src/threlte/editor/'))
    .sort(
      (a, b) => b.size - a.size || a.relativePath.localeCompare(b.relativePath),
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

const staticGraph = buildGraph(staticRoots)
const gameplayGraph = buildGraph(gameplayBootRoots)

const staticThreeUsers = summarizeThreeUsers(staticGraph)
const gameplayThreeUsers = summarizeThreeUsers(gameplayGraph)
const staticEditorUsers = summarizeEditorUsers(staticGraph)
const gameplayEditorUsers = summarizeEditorUsers(gameplayGraph)

printSection('static shell graph three users', staticThreeUsers)
printSection('initial gameplay boot graph three users', gameplayThreeUsers)
printBoundarySection('static shell editor boundary users', staticEditorUsers)
printBoundarySection(
  'initial gameplay boot editor boundary users',
  gameplayEditorUsers,
)

console.log('\n[three-profile] totals')
console.log(`  static shell files scanned: ${staticGraph.size}`)
console.log(`  static shell three users: ${staticThreeUsers.length}`)
console.log(`  static shell editor users: ${staticEditorUsers.length}`)
console.log(`  gameplay boot files scanned: ${gameplayGraph.size}`)
console.log(`  gameplay boot three users: ${gameplayThreeUsers.length}`)
console.log(`  gameplay boot editor users: ${gameplayEditorUsers.length}`)
