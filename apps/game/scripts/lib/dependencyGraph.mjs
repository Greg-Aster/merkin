import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const scriptBlockPattern = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function fileExists(candidate) {
  return fs.existsSync(candidate) && fs.statSync(candidate).isFile()
}

function extractSvelteScripts(source) {
  const scripts = []
  let match
  while ((match = scriptBlockPattern.exec(source)) !== null) {
    scripts.push(match[1])
  }
  return scripts.length > 0 ? scripts.join('\n') : ''
}

function getParseSource(filePath) {
  const source = readFile(filePath)
  return filePath.endsWith('.svelte') ? extractSvelteScripts(source) : source
}

function getScriptKind(filePath) {
  if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX
  if (filePath.endsWith('.jsx')) return ts.ScriptKind.JSX
  if (filePath.endsWith('.js')) return ts.ScriptKind.JS
  if (filePath.endsWith('.svelte')) return ts.ScriptKind.TSX
  return ts.ScriptKind.TS
}

function createSourceFile(filePath) {
  return ts.createSourceFile(
    filePath,
    getParseSource(filePath),
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(filePath),
  )
}

function stringLiteralText(node) {
  return node && ts.isStringLiteralLike(node) ? node.text : null
}

export function parseModuleReferences(filePath) {
  const sourceFile = createSourceFile(filePath)
  const references = []

  function addReference(specifier, kind, typeOnly = false) {
    if (!specifier) return
    references.push({ specifier, kind, typeOnly })
  }

  function visit(node) {
    if (ts.isImportDeclaration(node)) {
      addReference(
        stringLiteralText(node.moduleSpecifier),
        'static',
        Boolean(node.importClause?.isTypeOnly),
      )
    } else if (ts.isExportDeclaration(node)) {
      addReference(
        stringLiteralText(node.moduleSpecifier),
        'reexport',
        Boolean(node.isTypeOnly),
      )
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      addReference(stringLiteralText(node.arguments[0]), 'dynamic', false)
    } else if (
      ts.isImportTypeNode(node) &&
      node.argument &&
      ts.isLiteralTypeNode(node.argument)
    ) {
      addReference(stringLiteralText(node.argument.literal), 'type', true)
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return references
}

function createAliasResolver(appRoot) {
  const aliases = [
    ['@components/', path.join(appRoot, 'src/components')],
    ['@utils/', path.join(appRoot, 'src/utils')],
    ['@layouts/', path.join(appRoot, 'src/layouts')],
    ['@config/', path.join(appRoot, 'src/config')],
    ['@services/', path.join(appRoot, 'src/services')],
    ['@/', path.join(appRoot, 'src')],
  ]

  return specifier => {
    for (const [prefix, targetRoot] of aliases) {
      if (specifier.startsWith(prefix)) {
        return path.join(targetRoot, specifier.slice(prefix.length))
      }
    }
    return null
  }
}

function resolveFileCandidate(base) {
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.svelte`,
    `${base}.json`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
    path.join(base, 'index.jsx'),
    path.join(base, 'index.svelte'),
  ]

  return candidates.find(fileExists) ?? null
}

export function resolveModuleReference({ appRoot, fromFile, specifier }) {
  if (specifier.startsWith('.')) {
    return resolveFileCandidate(path.resolve(path.dirname(fromFile), specifier))
  }

  const aliasBase = createAliasResolver(appRoot)(specifier)
  if (aliasBase) {
    return resolveFileCandidate(aliasBase)
  }

  return null
}

export function buildDependencyGraph({
  roots,
  appRoot,
  followDynamic = false,
  followTypeOnly = false,
}) {
  const queue = roots.map(root => path.resolve(root))
  const visited = new Set()
  const graph = new Map()

  while (queue.length > 0) {
    const filePath = queue.shift()
    if (!filePath || visited.has(filePath) || !fileExists(filePath)) continue
    visited.add(filePath)

    const references = parseModuleReferences(filePath).map(reference => ({
      ...reference,
      resolvedPath: resolveModuleReference({
        appRoot,
        fromFile: filePath,
        specifier: reference.specifier,
      }),
    }))

    for (const reference of references) {
      if (!reference.resolvedPath) continue
      if (reference.typeOnly && !followTypeOnly) continue
      if (reference.kind === 'dynamic' && !followDynamic) continue
      queue.push(reference.resolvedPath)
    }

    graph.set(filePath, {
      references,
    })
  }

  return graph
}

export function toAppRelative(appRoot, filePath) {
  return path.relative(appRoot, filePath).replace(/\\/g, '/')
}
