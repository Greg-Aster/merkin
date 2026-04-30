import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(appRoot, '..', '..')
const srcRoot = path.join(appRoot, 'src')

const args = new Set(process.argv.slice(2))
const scanAll = args.has('--all') || !args.has('--changed')
const scanChanged = args.has('--changed')
const strict = args.has('--strict')
const json = args.has('--json')
let changedScanUnavailable = false

const STYLE_BLOCK_WARN_LINES = 80
const STYLE_BLOCK_ERROR_LINES = 140
const COMPONENT_WARN_LINES = 450
const COMPONENT_ERROR_LINES = 750
const CSS_WARN_LINES = 500
const CSS_ERROR_LINES = 900

const sourceExtensions = new Set(['.astro', '.svelte', '.mdx', '.ts', '.js', '.mjs'])
const componentExtensions = new Set(['.astro', '.svelte'])
const styleBlockExtensions = new Set(['.astro', '.svelte', '.mdx'])
const cssExtensions = new Set(['.css', '.styl', '.pcss', '.postcss'])
const scannedExtensions = new Set([...sourceExtensions, ...cssExtensions])

const ignoredSegments = new Set([
  '.astro',
  'dist',
  'node_modules',
  '.svelte-kit',
  '.vercel',
])

function toPosix(filePath) {
  return filePath.split(path.sep).join('/')
}

function relativeToApp(filePath) {
  return toPosix(path.relative(appRoot, filePath))
}

function isIgnored(filePath) {
  return filePath
    .split(path.sep)
    .some(segment => ignoredSegments.has(segment))
}

function walk(dir, files = []) {
  if (!existsSync(dir) || isIgnored(dir)) return files
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry)
    if (isIgnored(fullPath)) continue
    const stats = statSync(fullPath)
    if (stats.isDirectory()) {
      walk(fullPath, files)
      continue
    }
    if (scannedExtensions.has(path.extname(fullPath))) files.push(fullPath)
  }
  return files
}

function getChangedFiles() {
  let output = ''
  try {
    output = execSync('git status --porcelain', {
      cwd: repoRoot,
      encoding: 'utf8',
      shell: true,
    })
  } catch (error) {
    changedScanUnavailable = true
    return []
  }

  return output
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter(Boolean)
    .map(line => line.slice(3).replace(/^"|"$/g, ''))
    .map(file => file.replace(/\//g, path.sep))
    .filter(file => file.startsWith(`apps${path.sep}megameal${path.sep}src${path.sep}`))
    .map(file => path.join(repoRoot, file))
    .filter(file => existsSync(file) && scannedExtensions.has(path.extname(file)))
}

function nonBlankLineCount(text) {
  return text.split(/\r?\n/).filter(line => line.trim().length > 0).length
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split(/\r?\n/).length
}

function addIssue(issues, severity, rule, file, message, line = 1) {
  issues.push({
    severity,
    rule,
    file: relativeToApp(file),
    line,
    message,
  })
}

function collectImports(files) {
  const imported = new Set()
  const importPatterns = [
    /import\s+['"]([^'"]+\.(?:css|styl|pcss|postcss))['"]/g,
    /@import\s+['"]([^'"]+\.(?:css|styl|pcss|postcss))['"]/g,
  ]

  for (const file of files) {
    const ext = path.extname(file)
    if (!sourceExtensions.has(ext) && !cssExtensions.has(ext)) continue
    const text = readFileSync(file, 'utf8')

    for (const pattern of importPatterns) {
      for (const match of text.matchAll(pattern)) {
        const specifier = match[1]
        let resolved
        if (specifier.startsWith('.')) {
          resolved = path.resolve(path.dirname(file), specifier)
        } else if (specifier.startsWith('@/')) {
          resolved = path.resolve(srcRoot, specifier.slice(2))
        } else {
          continue
        }
        imported.add(path.normalize(resolved))
      }
    }
  }

  return imported
}

function auditStyleBlocks(file, text, issues) {
  for (const match of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) {
    const lines = nonBlankLineCount(match[1])
    const line = lineNumberAt(text, match.index ?? 0)

    if (lines >= STYLE_BLOCK_ERROR_LINES) {
      addIssue(
        issues,
        'error',
        'large-style-block',
        file,
        `<style> block has ${lines} nonblank lines. Move shared CSS to src/styles or keep only tightly scoped component behavior.`,
        line,
      )
    } else if (lines >= STYLE_BLOCK_WARN_LINES) {
      addIssue(
        issues,
        'warn',
        'large-style-block',
        file,
        `<style> block has ${lines} nonblank lines. Consider extracting reusable styles.`,
        line,
      )
    }
  }
}

function auditComponentSize(file, text, issues) {
  if (!componentExtensions.has(path.extname(file))) return
  const lines = nonBlankLineCount(text)

  if (lines >= COMPONENT_ERROR_LINES) {
    addIssue(
      issues,
      'error',
      'oversized-component',
      file,
      `Component has ${lines} nonblank lines. Split structure, behavior, or styles before adding more.`,
    )
  } else if (lines >= COMPONENT_WARN_LINES) {
    addIssue(
      issues,
      'warn',
      'oversized-component',
      file,
      `Component has ${lines} nonblank lines. Treat new additions carefully.`,
    )
  }
}

function auditCssFile(file, text, importedCss, issues) {
  if (!cssExtensions.has(path.extname(file))) return

  const lines = nonBlankLineCount(text)
  const rel = relativeToApp(file)
  const inStyles = rel.startsWith('src/styles/')
  const imported = importedCss.has(path.normalize(file))

  if (!inStyles && imported) {
    addIssue(
      issues,
      'warn',
      'component-sidecar-css',
      file,
      'CSS file lives outside src/styles. Keep this only if it is truly component-local.',
    )
  }

  if (!inStyles && !imported) {
    addIssue(
      issues,
      'error',
      'unmanaged-css',
      file,
      'CSS file is outside src/styles and is not imported by any scanned source file.',
    )
  }

  if (inStyles && !imported && rel !== 'src/styles/main.css' && rel !== 'src/styles/variables.styl') {
    addIssue(
      issues,
      'warn',
      'unreferenced-style-file',
      file,
      'Style file is under src/styles but is not imported by any scanned source file.',
    )
  }

  if (lines >= CSS_ERROR_LINES) {
    addIssue(
      issues,
      'error',
      'oversized-css-file',
      file,
      `CSS file has ${lines} nonblank lines. Split by layout or feature before adding more.`,
    )
  } else if (lines >= CSS_WARN_LINES) {
    addIssue(
      issues,
      'warn',
      'oversized-css-file',
      file,
      `CSS file has ${lines} nonblank lines. Consider splitting by layout or feature.`,
    )
  }
}

function auditDuplicateCss(cssFiles, issues) {
  const byHash = new Map()

  for (const file of cssFiles) {
    const text = readFileSync(file, 'utf8')
    const normalized = text
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (normalized.length < 200) continue

    const hash = createHash('sha256').update(normalized).digest('hex')
    const matches = byHash.get(hash) ?? []
    matches.push(file)
    byHash.set(hash, matches)
  }

  for (const matches of byHash.values()) {
    if (matches.length < 2) continue
    for (const file of matches) {
      addIssue(
        issues,
        'warn',
        'duplicate-css-content',
        file,
        `CSS content duplicates: ${matches.map(relativeToApp).join(', ')}`,
      )
    }
  }
}

function formatIssues(issues, modeLabel) {
  if (issues.length === 0) {
    return `CSS architecture audit passed (${modeLabel}).`
  }

  const lines = [`CSS architecture audit found ${issues.length} item(s) (${modeLabel}):`]
  for (const issue of issues) {
    lines.push(
      `- ${issue.severity.toUpperCase()} ${issue.rule}: ${issue.file}:${issue.line} - ${issue.message}`,
    )
  }
  return lines.join('\n')
}

const allFiles = walk(srcRoot)
const changedFiles = scanChanged ? getChangedFiles() : []
const filesToAudit = scanChanged && !changedScanUnavailable ? changedFiles : allFiles
const importedCss = collectImports(allFiles)
const issues = []

for (const file of filesToAudit) {
  const ext = path.extname(file)
  const text = readFileSync(file, 'utf8')

  if (componentExtensions.has(ext)) {
    auditComponentSize(file, text, issues)
  }

  if (styleBlockExtensions.has(ext)) {
    auditStyleBlocks(file, text, issues)
  }

  if (cssExtensions.has(ext)) {
    auditCssFile(file, text, importedCss, issues)
  }
}

if (scanAll) {
  auditDuplicateCss(
    allFiles.filter(file => cssExtensions.has(path.extname(file))),
    issues,
  )
}

const modeLabel = scanChanged
  ? changedScanUnavailable
    ? 'changed files unavailable; all src styles/components fallback'
    : 'changed files'
  : 'all src styles/components'

if (json) {
  console.log(
    JSON.stringify(
      { mode: modeLabel, changedScanUnavailable, issues },
      null,
      2,
    ),
  )
} else {
  console.log(formatIssues(issues, modeLabel))
}

if (strict && issues.some(issue => issue.severity === 'error')) {
  process.exitCode = 1
}
