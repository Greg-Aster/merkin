import {
  createContextOptions,
  launchBrowser,
  normalizeBrowserName,
  parseArgValue,
  readDeployedLevelIds,
  waitForPlayableLevel,
} from './lib/browserHarness.mjs'

const argv = process.argv.slice(2)
const strict = argv.includes('--strict') || process.env.GAME_PROFILE_STRICT === '1'
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

function parseNumberBudget(name, envName, fallback) {
  const value = Number(
    parseArgValue(argv, name, process.env[envName] ?? fallback),
  )
  return Number.isFinite(value) ? value : Number(fallback)
}

const runtimeBudgets = {
  maxEditorSceneLoads: parseNumberBudget(
    'max-editor-scenes',
    'GAME_PROFILE_MAX_EDITOR_SCENES',
    0,
  ),
  maxTerrainColliderLoads: parseNumberBudget(
    'max-terrain-colliders',
    'GAME_PROFILE_MAX_TERRAIN_COLLIDERS',
    1,
  ),
  maxThreeEntrypoints: parseNumberBudget(
    'max-three-entrypoints',
    'GAME_PROFILE_MAX_THREE_ENTRYPOINTS',
    1,
  ),
  maxRequests: parseNumberBudget(
    'max-requests',
    'GAME_PROFILE_MAX_REQUESTS',
    350,
  ),
  maxTransferBytes: parseNumberBudget(
    'max-transfer-bytes',
    'GAME_PROFILE_MAX_TRANSFER_BYTES',
    60 * 1024 * 1024,
  ),
  maxDecodedBytes: parseNumberBudget(
    'max-decoded-bytes',
    'GAME_PROFILE_MAX_DECODED_BYTES',
    140 * 1024 * 1024,
  ),
  maxGlbLoads: parseNumberBudget(
    'max-glb-loads',
    'GAME_PROFILE_MAX_GLB_LOADS',
    40,
  ),
  maxGltfPending: parseNumberBudget(
    'max-gltf-pending',
    'GAME_PROFILE_MAX_GLTF_PENDING',
    0,
  ),
  maxDrawCalls: parseNumberBudget(
    'max-draw-calls',
    'GAME_PROFILE_MAX_DRAW_CALLS',
    120,
  ),
  maxTriangles: parseNumberBudget(
    'max-triangles',
    'GAME_PROFILE_MAX_TRIANGLES',
    250_000,
  ),
  maxTextures: parseNumberBudget(
    'max-textures',
    'GAME_PROFILE_MAX_TEXTURES',
    80,
  ),
  maxVisiblePointLights: parseNumberBudget(
    'max-visible-point-lights',
    'GAME_PROFILE_MAX_VISIBLE_POINT_LIGHTS',
    8,
  ),
  maxLongTaskMs: parseNumberBudget(
    'max-long-task-ms',
    'GAME_PROFILE_MAX_LONG_TASK_MS',
    500,
  ),
  minRafFps: parseNumberBudget('min-raf-fps', 'GAME_PROFILE_MIN_RAF_FPS', 20),
}

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`Usage: pnpm --dir apps/game profile:resources -- [options]

Options:
  --levels=<ids>                    Comma-separated level ids to profile.
  --browser=<name>                  Playwright browser name.
  --settle-ms=<ms>                  Time to wait after level readiness.
  --strict                          Exit non-zero on budget failures.
  --max-editor-scenes=<count>       Runtime editor scene load budget.
  --max-terrain-colliders=<count>   Terrain collider request budget.
  --max-three-entrypoints=<count>   Three runtime entrypoint budget.
  --max-requests=<count>            Total request budget.
  --max-transfer-bytes=<bytes>      Transfer-size budget.
  --max-decoded-bytes=<bytes>       Decoded resource-size budget.
  --max-glb-loads=<count>           GLB request budget.
  --max-gltf-pending=<count>        Pending GLTF cache entry budget.
  --max-draw-calls=<count>          Render draw-call budget.
  --max-triangles=<count>           Render triangle budget.
  --max-textures=<count>            Renderer texture budget.
  --max-visible-point-lights=<n>    Visible point-light budget.
  --max-long-task-ms=<ms>           Long-task duration budget.
  --min-raf-fps=<fps>               RAF frame-rate floor.
`)
  process.exit(0)
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

function countResourcesMatching(resources, pattern) {
  return resources.filter(resource => {
    try {
      return pattern.test(new URL(resource.name).pathname)
    } catch {
      return pattern.test(resource.name)
    }
  }).length
}

function getThreeRuntimeEntrypoints(resources) {
  const entrypoints = new Map()
  const candidates = []

  for (const resource of resources) {
    let pathname = resource.name
    try {
      pathname = new URL(resource.name).pathname
    } catch {
      // Keep the original name for non-URL resource entries.
    }

    const basename = pathname.split('/').pop() ?? pathname
    if (!/three(?:\.module|\.core|[-.])|three-vendor/i.test(basename)) {
      continue
    }

    candidates.push({ basename, pathname })
  }

  const hasThreeModule = candidates.some(
    candidate => candidate.basename === 'three.module.js',
  )

  for (const { basename, pathname } of candidates) {
    if (hasThreeModule && basename === 'three.core.js') {
      continue
    }

    entrypoints.set(basename, pathname)
  }

  return [...entrypoints.values()].sort()
}

function addBudgetViolation(violations, label, actual, limit, formatter = value => value) {
  if (!Number.isFinite(limit) || limit < 0) return
  if (!Number.isFinite(actual)) return
  if (actual <= limit) return

  violations.push(`${label} ${formatter(actual)} exceeds ${formatter(limit)}`)
}

function addMinimumBudgetViolation(
  violations,
  label,
  actual,
  minimum,
  formatter = value => value,
) {
  if (!Number.isFinite(minimum) || minimum <= 0) return
  if (!Number.isFinite(actual)) return
  if (actual >= minimum) return

  violations.push(`${label} ${formatter(actual)} is below ${formatter(minimum)}`)
}

function evaluateRuntimeBudgets(input) {
  const {
    result,
    summary,
    diagnostics,
    editorSceneLoads,
    terrainColliderLoads,
    glbLoads,
    threeEntrypoints,
  } = input
  const renderInfo = diagnostics?.renderInfo ?? {}
  const sceneInfo = diagnostics?.scene ?? {}
  const longTasks = diagnostics?.longTasks ?? {}
  const gltfCache = diagnostics?.gltfCache ?? {}
  const violations = []

  addBudgetViolation(
    violations,
    'editor scene loads',
    editorSceneLoads,
    runtimeBudgets.maxEditorSceneLoads,
  )
  addBudgetViolation(
    violations,
    'terrain collider loads',
    terrainColliderLoads,
    runtimeBudgets.maxTerrainColliderLoads,
  )
  addBudgetViolation(
    violations,
    'Three runtime entrypoints',
    threeEntrypoints.length,
    runtimeBudgets.maxThreeEntrypoints,
  )
  addBudgetViolation(
    violations,
    'requests',
    result.resources.length,
    runtimeBudgets.maxRequests,
  )
  addBudgetViolation(
    violations,
    'transfer',
    summary.totals.transferSize,
    runtimeBudgets.maxTransferBytes,
    formatBytes,
  )
  addBudgetViolation(
    violations,
    'decoded',
    summary.totals.decodedBodySize,
    runtimeBudgets.maxDecodedBytes,
    formatBytes,
  )
  addBudgetViolation(violations, 'GLB loads', glbLoads, runtimeBudgets.maxGlbLoads)
  addBudgetViolation(
    violations,
    'pending GLTF cache entries',
    gltfCache.pendingEntries,
    runtimeBudgets.maxGltfPending,
  )
  addBudgetViolation(
    violations,
    'draw calls',
    renderInfo.calls,
    runtimeBudgets.maxDrawCalls,
  )
  addBudgetViolation(
    violations,
    'triangles',
    renderInfo.triangles,
    runtimeBudgets.maxTriangles,
  )
  addBudgetViolation(
    violations,
    'textures',
    renderInfo.textures,
    runtimeBudgets.maxTextures,
  )
  addBudgetViolation(
    violations,
    'visible point lights',
    sceneInfo.visiblePointLights,
    runtimeBudgets.maxVisiblePointLights,
  )
  addBudgetViolation(
    violations,
    'long task max',
    longTasks.maxDuration,
    runtimeBudgets.maxLongTaskMs,
    value => `${Math.round(value)}ms`,
  )
  addMinimumBudgetViolation(
    violations,
    'RAF FPS',
    result.rafFps,
    runtimeBudgets.minRafFps,
  )

  return violations
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
  let hasBudgetFailures = false

  for (const levelId of levels) {
    const result = await profileLevel(browser, levelId)
    const summary = summarizeResources(result.resources)
    const diagnostics = result.diagnostics
    const renderInfo = diagnostics?.renderInfo ?? {}
    const sceneInfo = diagnostics?.scene ?? {}
    const longTasks = diagnostics?.longTasks ?? {}
    const gltfCache = diagnostics?.gltfCache ?? {}
    const memory = result.memory ?? null
    const editorSceneLoads = countResourcesMatching(
      result.resources,
      /\/editor\/scenes\/.*\.scene\.json/i,
    )
    const terrainColliderLoads = countResourcesMatching(
      result.resources,
      /\/terrain\/collision\/.*\.collider\.bin/i,
    )
    const glbLoads = getResourceCountByExtension(summary, 'glb')
    const threeEntrypoints = getThreeRuntimeEntrypoints(result.resources)
    const budgetViolations = evaluateRuntimeBudgets({
      result,
      summary,
      diagnostics,
      editorSceneLoads,
      terrainColliderLoads,
      glbLoads,
      threeEntrypoints,
    })

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
        `glb=${glbLoads}`,
        `gltfCache=${gltfCache.entries ?? 'n/a'}`,
        `gltfLoaded=${gltfCache.loadedEntries ?? 'n/a'}`,
        `gltfPending=${gltfCache.pendingEntries ?? 'n/a'}`,
        `gltfReferenced=${gltfCache.referencedEntries ?? 'n/a'}`,
        `gltfUnreferenced=${gltfCache.unreferencedEntries ?? 'n/a'}`,
        `editorScenes=${editorSceneLoads}`,
        `terrainColliders=${terrainColliderLoads}`,
        `img=${getResourceCountByExtension(summary, 'png') + getResourceCountByExtension(summary, 'jpg') + getResourceCountByExtension(summary, 'jpeg') + getResourceCountByExtension(summary, 'webp')}`,
        `longTasks=${longTasks.count ?? 'n/a'}`,
        `longTaskMax=${longTasks.maxDuration ? `${Math.round(longTasks.maxDuration)}ms` : 'n/a'}`,
        `heap=${memory?.usedJSHeapSize ? formatBytes(memory.usedJSHeapSize) : 'n/a'}`,
      ].join(' '),
    )

    if (budgetViolations.length > 0) {
      hasBudgetFailures = true
      for (const violation of budgetViolations) {
        console.log(`  budget ${strict ? 'fail' : 'warn'}: ${violation}`)
      }
    }

    for (const entrypoint of threeEntrypoints) {
      console.log(`  three-entry ${entrypoint}`)
    }

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

  if (strict && hasBudgetFailures) {
    process.exitCode = 1
  }
} finally {
  await browser.close()
}
