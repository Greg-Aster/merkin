import {
  createContextOptions,
  launchBrowser,
  normalizeBrowserName,
  parseArgValue,
  readDeployedLevelIds,
  waitForPlayableLevel,
} from './lib/browserHarness.mjs'

const argv = process.argv.slice(2)
const browserName = normalizeBrowserName(
  parseArgValue(argv, 'browser', process.env.GAME_BROWSER || 'chromium'),
)
const gameDevPort = String(process.env.GAME_DEV_PORT || 4322)
const appOrigin = `http://127.0.0.1:${gameDevPort}`
const levelsArg = parseArgValue(
  argv,
  'levels',
  process.env.GAME_PROFILE_LEVELS || '',
)
const levels = levelsArg
  ? levelsArg
      .split(',')
      .map(level => level.trim())
      .filter(Boolean)
  : readDeployedLevelIds()
const settleMs = Number(
  parseArgValue(
    argv,
    'settle-ms',
    process.env.GAME_PROFILE_SETTLE_MS || '1000',
  ),
)
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

  const byExtension = new Map()
  for (const resource of resources) {
    let extension = 'none'
    try {
      const pathname = new URL(resource.name).pathname.toLowerCase()
      const match = pathname.match(/\.([a-z0-9]+)$/)
      extension = match?.[1] ?? 'none'
    } catch {
      extension = 'unknown'
    }

    const current = byExtension.get(extension) ?? {
      count: 0,
      transferSize: 0,
      decodedBodySize: 0,
    }
    current.count += 1
    current.transferSize += resource.transferSize
    current.decodedBodySize += resource.decodedBodySize
    byExtension.set(extension, current)
  }

  const threeResources = resources
    .filter(resource => {
      try {
        return new URL(resource.name).pathname.includes('/three')
      } catch {
        return resource.name.includes('three')
      }
    })
    .sort(
      (a, b) =>
        Math.max(b.transferSize, b.decodedBodySize) -
        Math.max(a.transferSize, a.decodedBodySize),
    )

  return {
    totals,
    byType: [...byType.entries()].sort(
      (a, b) => b[1].transferSize - a[1].transferSize,
    ),
    byExtension: [...byExtension.entries()].sort(
      (a, b) => b[1].transferSize - a[1].transferSize,
    ),
    threeResources,
    top: [...resources]
      .sort(
        (a, b) =>
          Math.max(b.transferSize, b.decodedBodySize) -
          Math.max(a.transferSize, a.decodedBodySize),
      )
      .slice(0, 12),
  }
}

function getResourceCountByExtension(summary, extension) {
  return summary.byExtension.find(([key]) => key === extension)?.[1]?.count ?? 0
}

async function profileLevel(browser, levelId) {
  const context = await browser.newContext(createContextOptions(profile))
  const page = await context.newPage()
  await page.addInitScript(() => {
    performance.setResourceTimingBufferSize?.(2000)
  })
  const url = `${appOrigin}/?level=${levelId}&debug=1`

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await waitForPlayableLevel(page, levelId, { gameplayTimeoutMs: 60000 })
    await page.waitForTimeout(Number.isFinite(settleMs) ? settleMs : 1000)

    const rafFps = await page.evaluate(
      () =>
        new Promise(resolve => {
          let frames = 0
          const startedAt = performance.now()

          function tick() {
            frames += 1
            const elapsed = performance.now() - startedAt
            if (elapsed >= 1200) {
              resolve(Math.round((frames * 1000) / elapsed))
              return
            }
            requestAnimationFrame(tick)
          }

          requestAnimationFrame(tick)
        }),
    )

    const payload = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource').map(entry => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        transferSize: entry.transferSize || 0,
        encodedBodySize: entry.encodedBodySize || 0,
        decodedBodySize: entry.decodedBodySize || 0,
        duration: entry.duration || 0,
      }))

      return {
        resources,
        location: window.location.href,
        diagnostics: window.__megamealDiagnostics?.getSnapshot?.() ?? null,
        memory: performance.memory
          ? {
              usedJSHeapSize: performance.memory.usedJSHeapSize,
              totalJSHeapSize: performance.memory.totalJSHeapSize,
              jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
            }
          : null,
      }
    })

    return { levelId, url, rafFps, ...payload }
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
    const sceneInfo = diagnostics?.scene ?? {}
    const longTasks = diagnostics?.longTasks ?? {}
    const memory = result.memory ?? null

    console.log(
      [
        `[resources] ${levelId}`,
        `requests=${result.resources.length}`,
        `transfer=${formatBytes(summary.totals.transferSize)}`,
        `encoded=${formatBytes(summary.totals.encodedBodySize)}`,
        `decoded=${formatBytes(summary.totals.decodedBodySize)}`,
        `fps=${diagnostics?.fps ?? 'n/a'}`,
        `rafFps=${result.rafFps ?? 'n/a'}`,
        `calls=${renderInfo.calls ?? 'n/a'}`,
        `tris=${renderInfo.triangles ?? 'n/a'}`,
        `geometries=${renderInfo.geometries ?? 'n/a'}`,
        `textures=${renderInfo.textures ?? 'n/a'}`,
        `programs=${renderInfo.programs ?? 'n/a'}`,
        `meshes=${sceneInfo.meshes ?? 'n/a'}`,
        `visibleMeshes=${sceneInfo.visibleMeshes ?? 'n/a'}`,
        `lights=${sceneInfo.lights ?? 'n/a'}`,
        `visibleLights=${sceneInfo.visibleLights ?? 'n/a'}`,
        `pointLights=${sceneInfo.pointLights ?? 'n/a'}`,
        `visiblePointLights=${sceneInfo.visiblePointLights ?? 'n/a'}`,
        `glb=${getResourceCountByExtension(summary, 'glb')}`,
        `img=${getResourceCountByExtension(summary, 'png') + getResourceCountByExtension(summary, 'jpg') + getResourceCountByExtension(summary, 'jpeg') + getResourceCountByExtension(summary, 'webp')}`,
        `longTasks=${longTasks.count ?? 'n/a'}`,
        `longTaskMax=${longTasks.maxDuration ? `${Math.round(longTasks.maxDuration)}ms` : 'n/a'}`,
        `heap=${memory?.usedJSHeapSize ? formatBytes(memory.usedJSHeapSize) : 'n/a'}`,
      ].join(' '),
    )

    for (const [type, typeSummary] of summary.byType.slice(0, 6)) {
      console.log(
        `  type ${type}: count=${typeSummary.count} transfer=${formatBytes(
          typeSummary.transferSize,
        )} decoded=${formatBytes(typeSummary.decodedBodySize)}`,
      )
    }

    for (const [extension, extensionSummary] of summary.byExtension.slice(
      0,
      8,
    )) {
      console.log(
        `  ext .${extension}: count=${extensionSummary.count} transfer=${formatBytes(
          extensionSummary.transferSize,
        )} decoded=${formatBytes(extensionSummary.decodedBodySize)}`,
      )
    }

    for (const resource of summary.threeResources.slice(0, 8)) {
      const path = new URL(resource.name).pathname
      console.log(
        `  three ${formatBytes(
          Math.max(resource.transferSize, resource.decodedBodySize),
        )} ${resource.initiatorType || 'unknown'} ${path}`,
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
