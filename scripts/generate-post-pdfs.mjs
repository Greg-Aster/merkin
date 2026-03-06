#!/usr/bin/env node
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'

function getArgValue(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1) return null
  return process.argv[index + 1] ?? null
}

const appArg = getArgValue('--app')
const appRoot = path.resolve(appArg || process.cwd())
const distDir = path.join(appRoot, 'dist')
const pdfHtmlRoot = path.join(distDir, 'pdf', 'posts')
const downloadsRoot = path.join(distDir, 'downloads', 'posts')
const publicDownloadsRoot = path.join(appRoot, 'public', 'downloads', 'posts')

async function collectPdfPages(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true })
  const pages = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      pages.push(...(await collectPdfPages(fullPath)))
      continue
    }

    if (!entry.isFile()) continue
    if (entry.name !== 'index.html') continue

    pages.push(fullPath)
  }

  return pages
}

function deriveSlugFromPdfIndex(pdfIndexPath) {
  const rel = path.relative(pdfHtmlRoot, pdfIndexPath)
  return rel.replace(/\/index\.html$/, '').split(path.sep).join('/')
}

function encodeSlugForUrl(slug) {
  return slug
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')
}

function findChromePath() {
  const envPath = process.env.PDF_CHROME_PATH
  if (envPath && fs.existsSync(envPath)) return envPath

  const candidates = ['google-chrome', 'chromium', 'chromium-browser']
  for (const bin of candidates) {
    const result = spawnSync('bash', ['-lc', `command -v ${bin}`], {
      encoding: 'utf8',
    })
    if (result.status === 0) {
      const resolved = result.stdout.trim()
      if (resolved) return resolved
    }
  }

  return null
}

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port =
        typeof address === 'object' && address ? Number(address.port) : null
      server.close(() => {
        if (!port) {
          reject(new Error('[pdf] Could not allocate a local port.'))
          return
        }
        resolve(port)
      })
    })
    server.on('error', reject)
  })
}

async function main() {
  if (!fs.existsSync(distDir)) {
    throw new Error(`[pdf] Dist directory missing: ${distDir}. Run astro build first.`)
  }

  if (!fs.existsSync(pdfHtmlRoot)) {
    console.log('[pdf] No /pdf/posts routes found in dist. Skipping PDF generation.')
    return
  }

  const pdfPages = await collectPdfPages(pdfHtmlRoot)
  const slugs = pdfPages.map(deriveSlugFromPdfIndex)

  if (slugs.length === 0) {
    console.log('[pdf] No downloadable post PDF pages found. Skipping.')
    return
  }

  const chromePath = findChromePath()
  if (!chromePath) {
    throw new Error(
      '[pdf] Could not find Chrome/Chromium. Set PDF_CHROME_PATH or install google-chrome/chromium.',
    )
  }

  await fsp.mkdir(downloadsRoot, { recursive: true })
  await fsp.mkdir(publicDownloadsRoot, { recursive: true })

  const pythonCheck = spawnSync('bash', ['-lc', 'command -v python3'], {
    encoding: 'utf8',
  })
  if (pythonCheck.status !== 0) {
    throw new Error(
      '[pdf] python3 is required for temporary static hosting during PDF generation.',
    )
  }

  const port = await findAvailablePort()
  const serverProcess = spawn(
    'python3',
    ['-m', 'http.server', String(port), '--bind', '127.0.0.1'],
    {
      cwd: distDir,
      stdio: ['ignore', 'ignore', 'pipe'],
    },
  )

  serverProcess.stderr.on('data', chunk => {
    const message = String(chunk).trim()
    if (message) {
      console.error(`[pdf:server] ${message}`)
    }
  })

  await new Promise(resolve => setTimeout(resolve, 800))
  if (serverProcess.exitCode !== null) {
    throw new Error('[pdf] Temporary static server failed to start.')
  }

  console.log(`[pdf] Generating ${slugs.length} PDF(s) for ${path.basename(appRoot)}...`)

  try {
    for (const slug of slugs) {
      const encodedSlug = encodeSlugForUrl(slug)
      const pdfUrl = `http://127.0.0.1:${port}/pdf/posts/${encodedSlug}/`
      const outputPath = path.join(downloadsRoot, `${slug}.pdf`)
      const publicOutputPath = path.join(publicDownloadsRoot, `${slug}.pdf`)

      await fsp.mkdir(path.dirname(outputPath), { recursive: true })

      const result = spawnSync(
        chromePath,
        [
          '--headless=new',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-javascript',
          '--no-pdf-header-footer',
          '--print-to-pdf-no-header',
          `--print-to-pdf=${outputPath}`,
          '--window-size=1280,1800',
          pdfUrl,
        ],
        {
          encoding: 'utf8',
          timeout: 300000,
        },
      )

      if (result.error && result.error.code === 'ETIMEDOUT') {
        throw new Error(`[pdf] Timed out generating PDF for slug "${slug}".`)
      }

      if (result.status !== 0) {
        const stderr = (result.stderr || '').trim()
        throw new Error(
          `[pdf] Failed for slug "${slug}" (${pdfUrl}). ${stderr || 'Unknown Chrome error.'}`,
        )
      }

      await fsp.mkdir(path.dirname(publicOutputPath), { recursive: true })
      await fsp.copyFile(outputPath, publicOutputPath)
      console.log(`[pdf] Wrote ${path.relative(appRoot, outputPath)}`)
      console.log(`[pdf] Synced ${path.relative(appRoot, publicOutputPath)}`)
    }
  } finally {
    serverProcess.kill('SIGTERM')
  }

  console.log('[pdf] PDF generation complete.')
}

main().catch(err => {
  console.error(err.message || err)
  process.exit(1)
})
