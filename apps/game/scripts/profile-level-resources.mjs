import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertPortAvailable,
  createContextOptions,
  createFilterSet,
  installRuntimeProfileOverride,
  launchBrowser,
  normalizeBrowserName,
  parseArgValue,
  readDeployedLevelIds,
  runGameBuild,
  spawnGameDev,
  spawnGamePreview,
  stopChildProcess,
  waitForPlayableLevel,
  waitForUrl,
} from './lib/browserHarness.mjs'

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))
const appRoot = resolve(repoRoot, 'apps/game')
const argv = process.argv.slice(2)
const strict =
  argv.includes('--strict') || process.env.GAME_PROFILE_STRICT === '1'
const noServer =
  argv.includes('--no-server') || process.env.GAME_NO_SERVER === '1'
const serverMode = noServer
  ? 'none'
  : parseArgValue(argv, 'server', process.env.GAME_PROFILE_SERVER || 'preview')
const skipBuild =
  argv.includes('--skip-build') || process.env.GAME_PROFILE_SKIP_BUILD === '1'
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
const jsonReportPath = parseArgValue(
  argv,
  'write-json',
  process.env.GAME_PROFILE_JSON || '',
)
const profileFilter = parseArgValue(
  argv,
  'profile',
  process.env.GAME_PROFILE_RUNTIME_PROFILE || process.env.GAME_PROFILE || '',
)
const baselineProfileMode =
  argv.includes('--certification') ||
  process.env.GAME_PROFILE_CERTIFICATION === '1'
const defaultProfile = {
  id: 'desktop-resource-chromium-1080p',
  targetClass: 'desktop-high',
  platformProfile: 'desktop',
  expectedRuntimeTier: 'high',
  runtimeAssetTier: 'high',
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
}
const baselinePath = resolve(appRoot, 'performance-baselines.json')

function readBaselines() {
  return JSON.parse(readFileSync(baselinePath, 'utf8'))
}

function getProfileCandidates() {
  const baseline = readBaselines()
  const candidates = baselineProfileMode
    ? baseline.certification?.profiles ?? []
    : baseline.certification?.profiles ?? baseline.profiles ?? []
  return candidates.length > 0 ? candidates : [defaultProfile]
}

function getRuntimeProfiles() {
  const profileFilters = createFilterSet(profileFilter)
  const profiles = getProfileCandidates().filter(
    candidate => profileFilters.size === 0 || profileFilters.has(candidate.id),
  )
  if (profiles.length === 0) {
    throw new Error(`No resource profiles matched "${profileFilter}".`)
  }
  return profiles
}

const runtimeProfiles = getRuntimeProfiles()

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
  maxEditorChunkLoads: parseNumberBudget(
    'max-editor-chunks',
    'GAME_PROFILE_MAX_EDITOR_CHUNKS',
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
  --profile=<ids>                   Runtime profile id(s) from performance-baselines.json.
  --certification                   Read profiles from certification.profiles only.
  --browser=<name>                  Playwright browser name.
  --server=<dev|preview|none>       Runtime server mode. Defaults to preview.
  --skip-build                      Reuse an existing static build for preview mode.
  --no-server                       Reuse an already-running server.
  --settle-ms=<ms>                  Time to wait after level readiness.
  --strict                          Exit non-zero on budget failures.
  --max-editor-scenes=<count>       Runtime editor scene load budget.
  --max-editor-chunks=<count>       Runtime editor JS/CSS chunk load budget.
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

const assetTierOrder = ['low', 'medium', 'high']
const assetTierRank = new Map(
  assetTierOrder.map((tier, index) => [tier, index]),
)

function normalizeAssetTier(value) {
  if (typeof value !== 'string') return null
  const tier = value
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_')
  return assetTierRank.has(tier) ? tier : null
}

function getEffectiveExpectedAssetTier(requestedTier, levelCap) {
  const requested = normalizeAssetTier(requestedTier)
  if (!requested) return null

  const cap = normalizeAssetTier(levelCap)
  if (!cap) return requested

  return assetTierRank.get(requested) > assetTierRank.get(cap) ? cap : requested
}

function getAssetTierSemantics({ profile, streaming }) {
  const requestedAssetTier = normalizeAssetTier(
    profile.runtimeAssetTier ??
      profile.expectedAssetTier ??
      streaming?.requestedAssetTier,
  )
  const levelAssetTierCap = normalizeAssetTier(streaming?.levelAssetTierCap)

  return {
    requestedAssetTier,
    levelAssetTierCap,
    effectiveExpectedAssetTier: getEffectiveExpectedAssetTier(
      requestedAssetTier,
      levelAssetTierCap,
    ),
    selectedAssetTier: normalizeAssetTier(streaming?.selectedAssetTier),
  }
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
    if (/three-examples-vendor|asset-vendor|effects-vendor/i.test(basename)) {
      continue
    }
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

function addBudgetViolation(
  violations,
  label,
  actual,
  limit,
  formatter = value => value,
) {
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

  violations.push(
    `${label} ${formatter(actual)} is below ${formatter(minimum)}`,
  )
}

function evaluateRuntimeBudgets(input) {
  const {
    result,
    summary,
    diagnostics,
    editorSceneLoads,
    editorChunkLoads,
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
    'editor chunk loads',
    editorChunkLoads,
    runtimeBudgets.maxEditorChunkLoads,
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
  addBudgetViolation(
    violations,
    'GLB loads',
    glbLoads,
    runtimeBudgets.maxGlbLoads,
  )
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

function getTopSystemTimings(systemTimings, limit = 10) {
  return Object.entries(systemTimings ?? {})
    .map(([name, timing]) => ({
      name,
      lastMs: timing?.lastMs ?? 0,
      avgMs: timing?.avgMs ?? 0,
      maxMs: timing?.maxMs ?? 0,
      samples: timing?.samples ?? 0,
    }))
    .sort((left, right) => right.maxMs - left.maxMs)
    .slice(0, limit)
}

async function profileLevel(browser, levelId, profile) {
  const context = await browser.newContext(createContextOptions(profile))
  const page = await context.newPage()
  await installRuntimeProfileOverride(page, profile)
  await page.addInitScript(() => {
    performance.setResourceTimingBufferSize?.(2000)
  })
  const url = `${appOrigin}/?level=${levelId}`

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await waitForPlayableLevel(page, levelId, {
      gameplayTimeoutMs: 60000,
      requireDebugPanel: false,
    })
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
        runtimeProfile: window.__gameRuntimeProfile ?? null,
        runtimeStreamingState: window.__gameRuntimeStreamingState ?? null,
        runtimeRenderState: window.__gameRuntimeRenderState ?? null,
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

function buildReportRecord({
  profile,
  result,
  summary,
  diagnostics,
  budgetViolations,
  editorSceneLoads,
  editorChunkLoads,
  terrainColliderLoads,
  glbLoads,
  threeEntrypoints,
}) {
  const streamingLevel =
    result.runtimeStreamingState?.levels?.[result.levelId] ?? null
  const renderProfile =
    result.runtimeRenderState?.renderProfiles?.[result.levelId] ?? null
  const assetTierSemantics = getAssetTierSemantics({
    profile,
    streaming: diagnostics?.streaming ?? streamingLevel,
  })
  return {
    profileId: profile.id ?? null,
    targetClass: profile.targetClass ?? null,
    platformProfile: profile.platformProfile ?? null,
    expectedRuntimeTier: profile.expectedRuntimeTier ?? null,
    expectedAssetTier: assetTierSemantics.requestedAssetTier,
    requestedAssetTier: assetTierSemantics.requestedAssetTier,
    levelAssetTierCap: assetTierSemantics.levelAssetTierCap,
    effectiveExpectedAssetTier: assetTierSemantics.effectiveExpectedAssetTier,
    selectedAssetTier: assetTierSemantics.selectedAssetTier,
    levelId: result.levelId,
    url: result.url,
    rafFps: result.rafFps,
    requestCount: result.resources.length,
    transferSize: summary.totals.transferSize,
    encodedBodySize: summary.totals.encodedBodySize,
    decodedBodySize: summary.totals.decodedBodySize,
    renderInfo: diagnostics?.renderInfo ?? {},
    sceneInfo: diagnostics?.scene ?? {},
    streaming: diagnostics?.streaming ?? {},
    runtimeStreaming: streamingLevel,
    runtimeRenderProfile: renderProfile,
    longTasks: diagnostics?.longTasks ?? {},
    gltfCache: diagnostics?.gltfCache ?? {},
    memory: result.memory ?? null,
    editorSceneLoads,
    editorChunkLoads,
    terrainColliderLoads,
    glbLoads,
    threeEntrypoints,
    budgetViolations,
    topResources: summary.top,
    byType: Object.fromEntries(summary.byType),
    byExtension: Object.fromEntries(summary.byExtension),
  }
}

function writeJsonReport(results) {
  if (!jsonReportPath) return

  const outputPath = resolve(appRoot, jsonReportPath)
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(
    outputPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        strict,
        browser: browserName,
        serverMode,
        budgets: runtimeBudgets,
        levels,
        profiles: runtimeProfiles.map(profile => ({
          id: profile.id,
          targetClass: profile.targetClass ?? null,
          platformProfile: profile.platformProfile ?? null,
          expectedRuntimeTier: profile.expectedRuntimeTier ?? null,
          expectedAssetTier:
            profile.runtimeAssetTier ?? profile.expectedAssetTier ?? null,
        })),
        results,
      },
      null,
      2,
    )}\n`,
  )
  console.log(`[resources] wrote ${outputPath}`)
}

let serverProcess = null

if (serverMode === 'preview') {
  await assertPortAvailable(gameDevPort)
  if (!skipBuild) {
    runGameBuild(repoRoot)
  }
  serverProcess = spawnGamePreview(repoRoot, gameDevPort)
} else if (serverMode === 'dev') {
  serverProcess = spawnGameDev(repoRoot)
} else if (serverMode !== 'none') {
  throw new Error(
    `Unsupported resource profile server mode "${serverMode}". Expected dev, preview, or none.`,
  )
}

await waitForUrl(`${appOrigin}/`)

const browser = await launchBrowser(browserName)

try {
  let hasBudgetFailures = false
  const reportResults = []

  for (const profile of runtimeProfiles) {
    for (const levelId of levels) {
      const result = await profileLevel(browser, levelId, profile)
      const summary = summarizeResources(result.resources)
      const diagnostics = result.diagnostics
      const renderInfo = diagnostics?.renderInfo ?? {}
      const sceneInfo = diagnostics?.scene ?? {}
      const streaming = diagnostics?.streaming ?? {}
      const assetTierSemantics = getAssetTierSemantics({
        profile,
        streaming,
      })
      const longTasks = diagnostics?.longTasks ?? {}
      const systemTimings = diagnostics?.systemTimings ?? {}
      const gltfCache = diagnostics?.gltfCache ?? {}
      const memory = result.memory ?? null
      const editorSceneLoads = countResourcesMatching(
        result.resources,
        /\/editor\/scenes\/.*\.scene\.json/i,
      )
      const editorChunkLoads = countResourcesMatching(
        result.resources,
        /\/_astro\/editor-(?:ai|core|document|panel|runtime)[^/]*\.(?:js|css)$/i,
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
        editorChunkLoads,
        terrainColliderLoads,
        glbLoads,
        threeEntrypoints,
      })
      reportResults.push(
        buildReportRecord({
          profile,
          result,
          summary,
          diagnostics,
          budgetViolations,
          editorSceneLoads,
          editorChunkLoads,
          terrainColliderLoads,
          glbLoads,
          threeEntrypoints,
        }),
      )

      console.log(
        [
          `[resources] ${profile.id ?? 'adhoc'} ${levelId}`,
          `platform=${streaming.selectedPlatformProfile ?? profile.platformProfile ?? 'n/a'}`,
          `assetTierRequested=${assetTierSemantics.requestedAssetTier ?? 'n/a'}`,
          `assetTierCap=${assetTierSemantics.levelAssetTierCap ?? 'none'}`,
          `assetTierExpected=${assetTierSemantics.effectiveExpectedAssetTier ?? 'n/a'}`,
          `assetTier=${streaming.selectedAssetTier ?? 'n/a'}`,
          `renderTier=${streaming.renderQualityTier ?? diagnostics?.quality ?? 'n/a'}`,
          `renderProfile=${streaming.renderProfileTier ?? 'n/a'}`,
          `activeCells=${streaming.activeCellCount ?? 'n/a'}`,
          `requiredAssets=${streaming.requiredAssetCount ?? 'n/a'}`,
          `deferredOptional=${streaming.deferredOptionalAssetCount ?? 'n/a'}`,
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
          `gltfBytes=${gltfCache.loadedBytes ? formatBytes(gltfCache.loadedBytes) : 'n/a'}`,
          `editorScenes=${editorSceneLoads}`,
          `editorChunks=${editorChunkLoads}`,
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

      for (const resource of summary.top) {
        const path = new URL(resource.name).pathname
        if (
          /\/_astro\/editor-(?:ai|core|document|panel|runtime)[^/]*\.(?:js|css)$/i.test(
            path,
          )
        ) {
          console.log(
            `  editor-chunk ${formatBytes(
              Math.max(resource.transferSize, resource.decodedBodySize),
            )} ${resource.initiatorType || 'unknown'} ${path}`,
          )
        }
      }

      for (const timing of getTopSystemTimings(systemTimings)) {
        console.log(
          `  timing ${timing.name}: max=${Math.round(timing.maxMs)}ms avg=${Math.round(
            timing.avgMs,
          )}ms last=${Math.round(timing.lastMs)}ms samples=${timing.samples}`,
        )
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
  }

  writeJsonReport(reportResults)

  if (strict && hasBudgetFailures) {
    process.exitCode = 1
  }
} finally {
  await browser.close()
  await stopChildProcess(serverProcess)
}
