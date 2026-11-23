#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'

const CHECKED_ATTRIBUTES = new Set(['href', 'src', 'poster'])
const SKIPPED_PROTOCOLS = new Set([
  'blob:',
  'data:',
  'javascript:',
  'mailto:',
  'sms:',
  'tel:',
  'webcal:',
])
const DEFAULT_ORIGIN = 'https://megameal.local'

function getArgValue(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1) return null
  return process.argv[index + 1] ?? null
}

const distDir = path.resolve(getArgValue('--dist') || 'dist')
const origin = toOrigin(getArgValue('--origin') || process.env.SITE_URL || DEFAULT_ORIGIN)
const acceptedOrigins = new Set(
  [
    origin,
    toOrigin(DEFAULT_ORIGIN),
    toOrigin(process.env.SITE_URL),
    toOrigin('https://megameal.org'),
  ].filter(Boolean),
)
const maxReferencesPerTarget = parseMaxReferences(
  getArgValue('--max-references-per-target'),
)

function hasFlag(flag) {
  return process.argv.includes(flag)
}

function parseMaxReferences(value) {
  if (hasFlag('--verbose')) return Number.POSITIVE_INFINITY
  if (!value) return 8

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8
}

async function collectFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)))
      continue
    }

    if (entry.isFile()) {
      files.push(fullPath)
    }
  }

  return files
}

function toPosixRelative(file) {
  return path.relative(distDir, file).split(path.sep).join('/')
}

function htmlFileToRoute(file) {
  const relativePath = toPosixRelative(file)

  if (relativePath === 'index.html') return '/'
  if (relativePath.endsWith('/index.html')) {
    return `/${relativePath.slice(0, -'index.html'.length)}`
  }

  return `/${relativePath}`
}

function decodePathname(pathname) {
  try {
    return decodeURIComponent(pathname)
  } catch {
    return pathname
  }
}

function toOrigin(value) {
  if (!value) return null

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function candidatePathsForUrlPath(urlPath) {
  const decodedPath = decodePathname(urlPath)
  const normalizedPath = decodedPath.replace(/^\/+/, '')

  if (normalizedPath === '') {
    return [path.join(distDir, 'index.html')]
  }

  const basename = path.basename(normalizedPath)
  const hasExtension = path.extname(basename) !== ''

  if (decodedPath.endsWith('/')) {
    const htmlFilePath = normalizedPath.replace(/\/+$/, '')
    return [
      path.join(distDir, normalizedPath, 'index.html'),
      path.join(distDir, `${htmlFilePath}.html`),
    ]
  }

  if (hasExtension) {
    return [path.join(distDir, normalizedPath)]
  }

  return [
    path.join(distDir, normalizedPath),
    path.join(distDir, normalizedPath, 'index.html'),
    path.join(distDir, `${normalizedPath}.html`),
  ]
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function hasBuiltTarget(urlPath) {
  const candidates = candidatePathsForUrlPath(urlPath)

  for (const candidate of candidates) {
    if (await pathExists(candidate)) return true
  }

  return false
}

function getAttributeReferences(html) {
  const references = []
  const htmlWithoutScriptBodies = stripScriptBodies(html)
  const attributeRegex = /\b([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g
  let match

  while ((match = attributeRegex.exec(htmlWithoutScriptBodies)) !== null) {
    const name = match[1].toLowerCase()
    const rawValue = match[2] ?? match[3] ?? match[4] ?? ''

    if (CHECKED_ATTRIBUTES.has(name)) {
      references.push({ attribute: name, value: rawValue.trim() })
      continue
    }

    if (name === 'srcset') {
      for (const src of parseSrcset(rawValue)) {
        references.push({ attribute: name, value: src })
      }
    }
  }

  return references
}

function stripScriptBodies(html) {
  return html
    .replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, '<script$1></script>')
    .replace(/<style\b([^>]*)>[\s\S]*?<\/style>/gi, '<style$1></style>')
}

function parseSrcset(value) {
  return value
    .split(',')
    .map(candidate => candidate.trim().split(/\s+/)[0])
    .filter(Boolean)
}

function normalizeInternalReference(value, sourceRoute) {
  if (!value || value === '#') return null

  let parsed

  try {
    parsed = new URL(value, `${origin || DEFAULT_ORIGIN}${sourceRoute}`)
  } catch {
    return null
  }

  if (SKIPPED_PROTOCOLS.has(parsed.protocol)) return null

  if (!acceptedOrigins.has(parsed.origin)) return null

  if (parsed.pathname === sourceRoute && parsed.hash) return null

  return parsed.pathname
}

function addMissingReference(missingTargets, target, sourceFile, reference) {
  if (!missingTargets.has(target)) {
    missingTargets.set(target, new Map())
  }

  const references = missingTargets.get(target)
  const key = `${sourceFile}\0${reference.attribute}\0${reference.value}`

  if (references.has(key)) return

  references.set(key, {
    source: sourceFile,
    attribute: reference.attribute,
    value: reference.value,
  })
}

async function main() {
  const files = await collectFiles(distDir)
  const htmlFiles = files.filter(file => file.endsWith('.html'))
  const missingTargets = new Map()
  let checkedReferences = 0

  for (const file of htmlFiles) {
    const html = await fs.readFile(file, 'utf8')
    const sourceRoute = htmlFileToRoute(file)
    const sourceFile = toPosixRelative(file)

    for (const reference of getAttributeReferences(html)) {
      const targetPath = normalizeInternalReference(reference.value, sourceRoute)
      if (!targetPath) continue

      checkedReferences += 1

      if (!(await hasBuiltTarget(targetPath))) {
        addMissingReference(missingTargets, targetPath, sourceFile, reference)
      }
    }
  }

  if (missingTargets.size === 0) {
    console.log(
      `[link-audit] Checked ${checkedReferences} internal reference(s) across ${htmlFiles.length} HTML file(s).`,
    )
    console.log('[link-audit] No missing internal targets found.')
    return
  }

  const missingReferenceCount = [...missingTargets.values()].reduce(
    (total, references) => total + references.size,
    0,
  )

  console.error(
    `[link-audit] Found ${missingTargets.size} missing internal target(s) from ${missingReferenceCount} reference(s).`,
  )

  const sortedMissingTargets = [...missingTargets.entries()].sort(
    ([targetA, referencesA], [targetB, referencesB]) =>
      referencesB.size - referencesA.size || targetA.localeCompare(targetB),
  )

  console.error(
    `[link-audit] Showing up to ${maxReferencesPerTarget} reference(s) per target. Pass --verbose for the full list.`,
  )

  for (const [target, references] of sortedMissingTargets) {
    const referenceList = [...references.values()].sort((a, b) =>
      a.source.localeCompare(b.source),
    )
    console.error(`- ${target} (${referenceList.length} reference(s))`)
    for (const reference of referenceList.slice(0, maxReferencesPerTarget)) {
      console.error(
        `  - ${reference.source} ${reference.attribute}="${reference.value}"`,
      )
    }
    if (referenceList.length > maxReferencesPerTarget) {
      console.error(`  - ...and ${referenceList.length - maxReferencesPerTarget} more`)
    }
  }

  process.exit(1)
}

main().catch(error => {
  console.error(error?.stack || error?.message || error)
  process.exit(1)
})
