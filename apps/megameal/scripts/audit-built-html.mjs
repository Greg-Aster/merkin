#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'

function getArgValue(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1) return null
  return process.argv[index + 1] ?? null
}

const distDir = path.resolve(getArgValue('--dist') || 'dist')

async function collectHtmlFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await collectHtmlFiles(fullPath)))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath)
    }
  }

  return files
}

function isAstroRedirectShell(html) {
  return (
    /<meta\b[^>]*http-equiv=(["']?)refresh\1/i.test(html) &&
    /<title>\s*Redirecting/i.test(html)
  )
}

async function main() {
  const htmlFiles = await collectHtmlFiles(distDir)
  const malformed = []
  const redirectShells = []

  for (const file of htmlFiles) {
    const html = await fs.readFile(file, 'utf8')
    if (/<html[\s>]/i.test(html)) continue

    const relativePath = path.relative(distDir, file).split(path.sep).join('/')

    if (isAstroRedirectShell(html)) {
      redirectShells.push(relativePath)
      continue
    }

    malformed.push(relativePath)
  }

  if (malformed.length > 0) {
    console.error('[html-audit] Found built HTML files without <html> that are not Astro redirect shells:')
    malformed.forEach(file => console.error(`- ${file}`))
    process.exit(1)
  }

  if (redirectShells.length > 0) {
    console.log(
      `[html-audit] Verified ${redirectShells.length} Astro redirect shell(s) without <html>.`,
    )
  } else {
    console.log('[html-audit] All built HTML files include <html>.')
  }
}

main().catch(error => {
  console.error(error?.message || error)
  process.exit(1)
})
