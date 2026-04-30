import {
  createContextOptions,
  launchBrowser,
  normalizeBrowserName,
  parseArgValue,
} from './lib/browserHarness.mjs'

const argv = process.argv.slice(2)
const browserName = normalizeBrowserName(
  parseArgValue(argv, 'browser', process.env.GAME_BROWSER || 'chromium'),
)
const gameDevPort = String(process.env.GAME_DEV_PORT || 4322)
const appOrigin = `http://127.0.0.1:${gameDevPort}`
const levelsArg = parseArgValue(argv, 'levels', process.env.GAME_PROFILE_LEVELS || '')
const levels = levelsArg
  ? levelsArg.split(',').map(level => level.trim()).filter(Boolean)
  : ['observatory', 'solitude', 'sci-fi-room', 'miranda', 'yggdrasil']
const profile = {
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
}

function formatBytes(value) {
  if (!Number.isFinite(value) || value <= 0) return '0 B'
  const units = ['B', 'KiB', 'MiB', 'GiB']
  let size = value
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`
}

async function waitForPlayable(page, levelId) {
  await page
    .locator('.runtime-diagnostics-panel')
    .first()
    .waitFor({ state: 'attached', timeout: 15000 })
  await page.waitForSelector(`text=Current Level: ${levelId}`, {
    timeout: 15000,
  })
  await page.waitForSelector(`text=Gameplay is enabled on ${levelId}.`, {
    timeout: 60000,
  })
  await page.waitForFunction(() => Boolean(window.__megamealDiagnostics), null, {
    timeout: 15000,
  })
}

function summarizeResources(resources) {
  const totals = resources.reduce(
    (summary, resource) => {
      summary.transferSize += resource.transferSize
      summary.encodedBodySize += resource.encodedBodySize
      summary.decodedBodySize += resource.decodedBodySize
      return summary
    },
    { transferSize: 0, encodedBodySize: 0, decodedBodySize: 0 },
  )

  const byType = new Map()
  for (const resource of resources) {
    const key = resource.initiatorType || 'unknown'
    const current = byType.get(key) ?? {
      count: 0,
      transferSize: 0,
      decodedBodySize: 0,
    }
    current.count += 1
    current.transferSize += resource.transferSize
    current.decodedBodySize += resource.decodedBodySize
    byType.set(key, current)
  }

  return {
    totals,
    byType: [...byType.entries()].sort(
      (a, b) => b[1].transferSize - a[1].transferSize,
    ),
    top: [...resources]
      .sort(
        (a, b) =>
          Math.max(b.transferSize, b.decodedBodySize) -
          Math.max(a.transferSize, a.decodedBodySize),
      )
      .slice(0, 12),
  }
}

async function profileLevel(browser, levelId) {
  const context = await browser.newContext(createContextOptions(profile))
  const page = await context.newPage()
  const url = `${appOrigin}/?level=${levelId}&debug=1`

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await waitForPlayable(page, levelId)
    await page.waitForTimeout(1000)

    const payload = await page.evaluate(() => {
      const resources = performance
        .getEntriesByType('resource')
        .map(entry => ({
          name: entry.name,
          initiatorType: entry.initiatorType,
          transferSize: entry.transferSize || 0,
          encodedBodySize: entry.encodedBodySize || 0,
          decodedBodySize: entry.decodedBodySize || 0,
          duration: entry.duration || 0,
        }))

      return {
        resources,
        diagnostics: window.__megamealDiagnostics?.getSnapshot?.() ?? null,
      }
    })

    return { levelId, url, ...payload }
  } finally {
    await context.close()
  }
}

const browser = await launchBrowser(browserName)

try {
  for (const levelId of levels) {
    const result = await profileLevel(browser, levelId)
    const summary = summarizeResources(result.resources)
    const diagnostics = result.diagnostics
    const renderInfo = diagnostics?.renderInfo ?? {}

    console.log(
      [
        `[resources] ${levelId}`,
        `requests=${result.resources.length}`,
        `transfer=${formatBytes(summary.totals.transferSize)}`,
        `encoded=${formatBytes(summary.totals.encodedBodySize)}`,
        `decoded=${formatBytes(summary.totals.decodedBodySize)}`,
        `fps=${diagnostics?.fps ?? 'n/a'}`,
        `calls=${renderInfo.calls ?? 'n/a'}`,
        `tris=${renderInfo.triangles ?? 'n/a'}`,
        `textures=${renderInfo.textures ?? 'n/a'}`,
      ].join(' '),
    )

    for (const [type, typeSummary] of summary.byType.slice(0, 6)) {
      console.log(
        `  type ${type}: count=${typeSummary.count} transfer=${formatBytes(
          typeSummary.transferSize,
        )} decoded=${formatBytes(typeSummary.decodedBodySize)}`,
      )
    }

    for (const resource of summary.top) {
      const path = new URL(resource.name).pathname
      console.log(
        `  top ${formatBytes(
          Math.max(resource.transferSize, resource.decodedBodySize),
        )} ${resource.initiatorType || 'unknown'} ${path}`,
      )
    }
  }
} finally {
  await browser.close()
}
