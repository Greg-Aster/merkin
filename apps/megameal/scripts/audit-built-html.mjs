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

function getHtmlAttribute(tag, name) {
  const match = tag.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'),
  )
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? ''
}

function collectStylesheetHrefs(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(match => match[0])
    .filter(tag => getHtmlAttribute(tag, 'rel').split(/\s+/).includes('stylesheet'))
    .map(tag => getHtmlAttribute(tag, 'href'))
    .filter(Boolean)
}

async function auditRepresentativeRouteAssets() {
  const postPath = path.join(
    distDir,
    'posts',
    'first-contact-manual-world-bible',
    'index.html',
  )
  const timelinePostPath = path.join(distDir, 'posts', 'timeline', 'index.html')
  const [postHtml, timelinePostHtml] = await Promise.all([
    fs.readFile(postPath, 'utf8'),
    fs.readFile(timelinePostPath, 'utf8'),
  ])
  const postStylesheets = collectStylesheetHrefs(postHtml)
  const routeOnlyStylePatterns = [
    /timeline/i,
    /first-contact/i,
    /review/i,
    /quiz/i,
    /featured-product/i,
    /product-customizer/i,
    /story-map/i,
    /portal/i,
    /storefront/i,
    /photoswipe/i,
    /overlayscrollbars/i,
    /katex/i,
  ]
  const leakedPostStyles = postStylesheets.filter(href =>
    routeOnlyStylePatterns.some(pattern => pattern.test(href)),
  )
  const timelinePortalIsland = timelinePostHtml.match(
    /<astro-island\b[^>]*\bcomponent-url=(?:"[^"]*TimelinePortalCarousel[^"]*"|'[^']*TimelinePortalCarousel[^']*'|[^\s>]*TimelinePortalCarousel[^\s>]*)(?=[\s>])[^>]*>/i,
  )?.[0]
  const timelineEventCount = (
    timelinePortalIsland?.match(/&quot;slug&quot;/g) ?? []
  ).length
  const routeFailures = []

  if (postStylesheets.length >= 15) {
    routeFailures.push(
      `representative post has ${postStylesheets.length} blocking stylesheets; expected fewer than 15`,
    )
  }
  if (leakedPostStyles.length > 0) {
    routeFailures.push(
      `representative post includes route-only styles: ${leakedPostStyles.join(', ')}`,
    )
  }
  if (/data-timeline-banner-wrapper=(?:["']true["']|true)(?=[\s>])/i.test(postHtml)) {
    routeFailures.push('representative post unexpectedly renders a timeline banner')
  }
  if (
    !/data-timeline-banner-wrapper=(?:["']true["']|true)(?=[\s>])/i.test(timelinePostHtml) ||
    !timelinePortalIsland ||
    timelineEventCount === 0
  ) {
    routeFailures.push(
      'posts/timeline must render a populated timeline banner in built HTML',
    )
  }
  if (
    !timelinePostHtml.includes('The Universe') ||
    !timelinePostHtml.includes('/posts/timeline/universe-avatar.png')
  ) {
    routeFailures.push(
      'posts/timeline must preserve its custom author and avatar in built HTML',
    )
  }
  if (
    !/<blockquote\b[^>]*\bdocs-editor-quote\b[^>]*>[\s\S]*?<p><!---->[\s\S]*?<!----><\/p>/i.test(
      timelinePostHtml,
    )
  ) {
    routeFailures.push(
      'posts/timeline must preserve Svelte raw-HTML hydration boundaries in the Docs Editor Bridge',
    )
  }

  if (routeFailures.length > 0) {
    console.error('[html-audit] Representative route asset contracts failed:')
    routeFailures.forEach(failure => console.error(`- ${failure}`))
    process.exitCode = 1
    return
  }

  console.log(
    `[html-audit] Representative post uses ${postStylesheets.length} blocking stylesheet(s); posts/timeline renders ${timelineEventCount} event(s) with its custom author.`,
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

  await auditRepresentativeRouteAssets()
}

main().catch(error => {
  console.error(error?.message || error)
  process.exit(1)
})
