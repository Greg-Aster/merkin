import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import {
  assertPortAvailable,
  createContextOptions,
  createFilterSet,
  installRuntimeProfileOverride,
  launchBrowser,
  normalizeBrowserName,
  parseArgValue,
  runGameBuild,
  shouldIgnoreConsoleMessage,
  spawnGameDev,
  spawnGamePreview,
  stopChildProcess,
  waitForPlayableLevel,
  waitForUrl,
} from './lib/browserHarness.mjs'

const appRoot = resolve(import.meta.dirname, '..')
const repoRoot = resolve(appRoot, '..', '..')
const baselinePath = resolve(appRoot, 'performance-baselines.json')
const gameDevPort = String(process.env.GAME_DEV_PORT || 4322)
const appOrigin = `http://127.0.0.1:${gameDevPort}`
const editorApiBase = String(
  process.env.PUBLIC_EDITOR_API_BASE ||
    process.env.EDITOR_API_BASE ||
    appOrigin,
).replace(/\/+$/, '')
const argv = process.argv.slice(2)
const args = new Set(argv)
const strict = args.has('--strict') || process.env.GAME_PERF_STRICT === '1'
const noServer = args.has('--no-server') || process.env.GAME_NO_SERVER === '1'
const certificationMode =
  args.has('--certification') || process.env.GAME_PERF_CERTIFICATION === '1'
const certificationCoverage = parseArgValue(
  argv,
  'coverage',
  process.env.GAME_PERF_COVERAGE || '',
)
const serverMode = noServer
  ? 'none'
  : parseArgValue(argv, 'server', process.env.GAME_PERF_SERVER || 'preview')
const skipBuild =
  args.has('--skip-build') || process.env.GAME_PERF_SKIP_BUILD === '1'
const browserFilter = parseArgValue(
  argv,
  'browser',
  process.env.GAME_BROWSER || '',
)
const levelFilter = parseArgValue(
  argv,
  'level',
  process.env.GAME_PERF_LEVEL || '',
)
const profileFilter = parseArgValue(
  argv,
  'profile',
  process.env.GAME_PERF_PROFILE || '',
)
const jsonReportPath = parseArgValue(
  argv,
  'write-json',
  process.env.GAME_PERF_JSON || '',
)

function readBaselines() {
  return JSON.parse(readFileSync(baselinePath, 'utf8'))
}

function getNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0MB'
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`
}

const runtimeTierOrder = ['ultra_low', 'low', 'medium', 'high']
const runtimeTierRank = new Map(
  runtimeTierOrder.map((tier, index) => [tier, index]),
)
const assetTierOrder = ['low', 'medium', 'high']
const assetTierRank = new Map(
  assetTierOrder.map((tier, index) => [tier, index]),
)

function normalizeRuntimeTier(value) {
  if (typeof value !== 'string') return null
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_')
  return normalized || null
}

function getRuntimeTierRank(value) {
  const tier = normalizeRuntimeTier(value)
  if (!tier) return null
  return runtimeTierRank.has(tier) ? runtimeTierRank.get(tier) : null
}

function normalizeAssetTier(value) {
  const tier = normalizeRuntimeTier(value)
  return tier && assetTierRank.has(tier) ? tier : null
}

function getEffectiveExpectedAssetTier(requestedTier, levelCap) {
  const requested = normalizeAssetTier(requestedTier)
  if (!requested) return null

  const cap = normalizeAssetTier(levelCap)
  if (!cap) return requested

  return assetTierRank.get(requested) > assetTierRank.get(cap) ? cap : requested
}

function getAssetTierSemantics(summary, profile = {}) {
  const requestedAssetTier = normalizeAssetTier(
    profile.runtimeAssetTier ??
      profile.expectedAssetTier ??
      summary.requestedAssetTier,
  )
  const levelAssetTierCap = normalizeAssetTier(summary.levelAssetTierCap)
  const effectiveExpectedAssetTier = getEffectiveExpectedAssetTier(
    requestedAssetTier,
    levelAssetTierCap,
  )

  return {
    requestedAssetTier,
    levelAssetTierCap,
    effectiveExpectedAssetTier,
    selectedAssetTier: normalizeAssetTier(summary.selectedAssetTier),
  }
}

function formatAssetTierExpectationFailure({
  selectedAssetTier,
  effectiveExpectedAssetTier,
  requestedAssetTier,
  levelAssetTierCap,
}) {
  const capDetail =
    levelAssetTierCap && requestedAssetTier !== effectiveExpectedAssetTier
      ? ` (profile requested ${requestedAssetTier}, level cap ${levelAssetTierCap})`
      : ''
  return `selectedAssetTier ${selectedAssetTier ?? 'unknown'} expected ${effectiveExpectedAssetTier}${capDetail}`
}

function normalizeAllowedRuntimeTiers(value) {
  if (!Array.isArray(value)) return null
  return new Set(
    value.map(normalizeRuntimeTier).filter(tier => typeof tier === 'string'),
  )
}

function summarizeSamples(samples) {
  const fps = samples.map(sample => getNumber(sample.fps))
  const frameTimes = samples.map(sample => getNumber(sample.frameTime))
  const renderInfo = samples.map(sample => sample.renderInfo ?? {})
  const longTasks = samples.map(sample => sample.longTasks ?? {})
  const systemTimings = samples.at(-1)?.systemTimings ?? {}
  const gltfCache = samples.map(sample => sample.gltfCache ?? {})
  const streaming = samples.map(sample => sample.streaming ?? {})

  return {
    averageFps:
      fps.length > 0
        ? Math.round(fps.reduce((sum, value) => sum + value, 0) / fps.length)
        : 0,
    lowestFps: fps.length > 0 ? Math.min(...fps) : 0,
    averageFrameTimeMs:
      frameTimes.length > 0
        ? Math.round(
            (frameTimes.reduce((sum, value) => sum + value, 0) /
              frameTimes.length) *
              10,
          ) / 10
        : 0,
    maxDrawCalls: Math.max(...renderInfo.map(info => getNumber(info.calls)), 0),
    maxTriangles: Math.max(
      ...renderInfo.map(info => getNumber(info.triangles)),
      0,
    ),
    maxTextures: Math.max(
      ...renderInfo.map(info => getNumber(info.textures)),
      0,
    ),
    maxLongTasks: Math.max(...longTasks.map(info => getNumber(info.count)), 0),
    maxLoadedGltfCacheBytes: Math.max(
      ...gltfCache.map(info => getNumber(info.loadedBytes)),
      0,
    ),
    maxUnreferencedGltfCacheBytes: Math.max(
      ...gltfCache.map(info => getNumber(info.unreferencedBytes)),
      0,
    ),
    maxActiveStreamingCells: Math.max(
      ...streaming.map(info => getNumber(info.activeCellCount)),
      0,
    ),
    maxActiveRenderableActors: Math.max(
      ...streaming.map(info => getNumber(info.activeRenderableActorCount)),
      0,
    ),
    slowestSystemTimings: Object.entries(systemTimings)
      .map(([name, timing]) => ({
        name,
        maxMs: getNumber(timing?.maxMs),
        avgMs: Math.round(getNumber(timing?.avgMs) * 10) / 10,
        samples: getNumber(timing?.samples),
      }))
      .sort((a, b) => b.maxMs - a.maxMs)
      .slice(0, 4),
    finalQuality: normalizeRuntimeTier(samples.at(-1)?.quality) ?? 'unknown',
    selectedPlatformProfile:
      samples.at(-1)?.streaming?.selectedPlatformProfile ?? null,
    requestedAssetTier: samples.at(-1)?.streaming?.requestedAssetTier ?? null,
    levelAssetTierCap: samples.at(-1)?.streaming?.levelAssetTierCap ?? null,
    selectedAssetTier: samples.at(-1)?.streaming?.selectedAssetTier ?? null,
    renderProfileTier: samples.at(-1)?.streaming?.renderProfileTier ?? null,
  }
}

function createEmptySummary() {
  return {
    averageFps: 0,
    lowestFps: 0,
    averageFrameTimeMs: 0,
    maxDrawCalls: 0,
    maxTriangles: 0,
    maxTextures: 0,
    maxLongTasks: 0,
    maxLoadedGltfCacheBytes: 0,
    maxUnreferencedGltfCacheBytes: 0,
    maxActiveStreamingCells: 0,
    maxActiveRenderableActors: 0,
    slowestSystemTimings: [],
    finalQuality: 'unknown',
    selectedPlatformProfile: null,
    requestedAssetTier: null,
    levelAssetTierCap: null,
    selectedAssetTier: null,
    renderProfileTier: null,
  }
}

function compareRuntimeTierExpectation(summary, profile = {}) {
  const failures = []
  const expectedTier = normalizeRuntimeTier(profile.expectedRuntimeTier)
  const finalTier = normalizeRuntimeTier(summary.finalQuality)
  const assetTierSemantics = getAssetTierSemantics(summary, profile)
  const allowedTiers = normalizeAllowedRuntimeTiers(profile.allowedRuntimeTiers)

  if (allowedTiers && (!finalTier || !allowedTiers.has(finalTier))) {
    failures.push(
      `finalQuality ${finalTier ?? 'unknown'} expected one of ${Array.from(
        allowedTiers,
      ).join(', ')}`,
    )
  }

  if (!expectedTier || (finalTier && allowedTiers?.has(finalTier))) {
    if (
      assetTierSemantics.effectiveExpectedAssetTier &&
      assetTierSemantics.selectedAssetTier !==
        assetTierSemantics.effectiveExpectedAssetTier
    ) {
      failures.push(formatAssetTierExpectationFailure(assetTierSemantics))
    }
    return failures
  }

  const expectedRank = getRuntimeTierRank(expectedTier)
  const finalRank = getRuntimeTierRank(finalTier)

  if (expectedRank === null) {
    failures.push(
      `expectedRuntimeTier ${expectedTier} is not in tier order ${runtimeTierOrder.join(' < ')}`,
    )
    return failures
  }

  if (finalRank === null || finalRank < expectedRank) {
    failures.push(
      `finalQuality >= ${expectedTier} expected, actual ${finalTier ?? 'unknown'}`,
    )
  }

  if (
    assetTierSemantics.effectiveExpectedAssetTier &&
    assetTierSemantics.selectedAssetTier !==
      assetTierSemantics.effectiveExpectedAssetTier
  ) {
    failures.push(formatAssetTierExpectationFailure(assetTierSemantics))
  }

  return failures
}

function compareAgainstBudgets(summary, budgets, timings = {}, profile = {}) {
  const failures = []
  const checks = [
    ['averageFps', '>=', budgets.minAverageFps, summary.averageFps],
    ['lowestFps', '>=', budgets.minLowestFps, summary.lowestFps],
    [
      'averageFrameTimeMs',
      '<=',
      budgets.maxAverageFrameTimeMs,
      summary.averageFrameTimeMs,
    ],
    ['maxDrawCalls', '<=', budgets.maxDrawCalls, summary.maxDrawCalls],
    ['maxTriangles', '<=', budgets.maxTriangles, summary.maxTriangles],
    ['maxTextures', '<=', budgets.maxTextures, summary.maxTextures],
    ['maxLongTasks', '<=', budgets.maxLongTasks, summary.maxLongTasks],
    [
      'maxLoadedGltfCacheBytes',
      '<=',
      budgets.maxLoadedGltfCacheBytes,
      summary.maxLoadedGltfCacheBytes,
    ],
    [
      'maxActiveStreamingCells',
      '<=',
      budgets.maxActiveStreamingCells,
      summary.maxActiveStreamingCells,
    ],
    [
      'domContentLoadedMs',
      '<=',
      budgets.maxDomContentLoadedMs,
      timings.domContentLoadedMs,
    ],
    [
      'timeToPlayableMs',
      '<=',
      budgets.maxTimeToPlayableMs,
      timings.timeToPlayableMs,
    ],
  ]

  for (const [metric, operator, expected, actual] of checks) {
    if (!Number.isFinite(expected)) continue
    const passed = operator === '>=' ? actual >= expected : actual <= expected
    if (!passed) {
      failures.push(`${metric} ${actual} expected ${operator} ${expected}`)
    }
  }

  failures.push(...compareRuntimeTierExpectation(summary, profile))

  return failures
}

function classifyPerformanceBottlenecks(result) {
  const bottlenecks = new Set()
  const failures = result.budgetFailures ?? []
  const messages = result.messages ?? []
  const summary = result.summary ?? {}
  const timings = result.timings ?? {}

  if (messages.some(message => message.startsWith('[profile-error]'))) {
    bottlenecks.add('spawn/readiness-timeout')
  }

  for (const failure of failures) {
    if (/averageFps|lowestFps|averageFrameTimeMs/.test(failure)) {
      bottlenecks.add('frame-rate/frame-time')
    }
    if (/maxDrawCalls/.test(failure)) bottlenecks.add('draw-calls')
    if (/maxTriangles/.test(failure)) bottlenecks.add('triangle-count')
    if (/maxTextures/.test(failure)) bottlenecks.add('texture-count')
    if (/maxLongTasks/.test(failure)) bottlenecks.add('main-thread-long-tasks')
    if (/maxLoadedGltfCacheBytes/.test(failure)) {
      bottlenecks.add('runtime-asset-payload/cache')
    }
    if (/maxActiveStreamingCells/.test(failure)) {
      bottlenecks.add('chunk-loading/streaming-cells')
    }
    if (/timeToPlayableMs|domContentLoadedMs/.test(failure)) {
      bottlenecks.add('spawn/readiness-delay')
    }
    if (/selectedAssetTier|finalQuality|expectedRuntimeTier/.test(failure)) {
      bottlenecks.add('device-tier-selection')
    }
  }

  const slowTimings = summary.slowestSystemTimings ?? []
  const hasSlowTiming = (pattern, thresholdMs) =>
    slowTimings.some(
      timing =>
        pattern.test(timing.name) && Number(timing.maxMs) >= thresholdMs,
    )

  if (hasSlowTiming(/asset\.gltf\.load|prefetchAssets\.load/, 1_000)) {
    bottlenecks.add('runtime-asset-payload/cache')
  }
  if (
    hasSlowTiming(/requiredAssets\.preload|requiredAssets\.manifest/, 1_000)
  ) {
    bottlenecks.add('spawn/readiness-delay')
  }
  if (Number(timings.timeToPlayableMs) > 30000) {
    bottlenecks.add('spawn/readiness-delay')
  }

  return [...bottlenecks]
}

function summarizeBottlenecks(results) {
  const counts = new Map()
  for (const result of results) {
    for (const bottleneck of result.bottlenecks ?? []) {
      counts.set(bottleneck, (counts.get(bottleneck) ?? 0) + 1)
    }
  }

  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]))
}

async function readBrowserTimings(page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    return {
      domContentLoadedMs: nav
        ? Math.round(nav.domContentLoadedEventEnd - nav.startTime)
        : null,
      loadEventMs:
        nav && nav.loadEventEnd > 0
          ? Math.round(nav.loadEventEnd - nav.startTime)
          : null,
      timeToPlayableMs: Math.round(performance.now()),
    }
  })
}

async function collectSamples(page, baseline) {
  const samples = []
  const sampleCount = Math.max(
    1,
    Math.ceil((baseline.sampleSeconds * 1000) / baseline.sampleIntervalMs),
  )

  for (let index = 0; index < sampleCount; ) {
    await delay(baseline.sampleIntervalMs)
    try {
      samples.push(
        await page.evaluate(() => window.__megamealDiagnostics.getSnapshot()),
      )
      index += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (
        !/Execution context was destroyed|Cannot find context/i.test(message)
      ) {
        throw error
      }
      await page.waitForFunction(
        () => Boolean(window.__megamealDiagnostics),
        null,
        {
          timeout: 15000,
        },
      )
    }
  }

  return samples
}

async function runProfileLevel(
  browser,
  baseline,
  profile,
  levelId,
  browserName,
) {
  const context = await browser.newContext(
    createContextOptions(profile, browserName),
  )
  const page = await context.newPage()
  const messages = []
  await installRuntimeProfileOverride(page, profile)

  page.on('console', msg => {
    const type = msg.type()
    if (type !== 'warning' && type !== 'error') return
    const text = msg.text()
    if (shouldIgnoreConsoleMessage(text)) return
    messages.push(`[${type}] ${text}`)
  })

  page.on('pageerror', error => {
    messages.push(`[pageerror] ${error.message}`)
  })

  const url = `${appOrigin}/?level=${levelId}`
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await waitForPlayableLevel(page, levelId, { requireDebugPanel: false })
    await page.evaluate(() => window.__megamealProductionTelemetry?.clear?.())
    const samples = await collectSamples(page, baseline)
    const summary = summarizeSamples(samples)
    const assetTierSemantics = getAssetTierSemantics(summary, profile)
    const browserTimings = await readBrowserTimings(page)
    const budgetFailures = compareAgainstBudgets(
      summary,
      profile.budgets ?? {},
      browserTimings,
      profile,
    )

    return {
      profile: profile.id,
      targetClass: profile.targetClass ?? null,
      platformProfile: profile.platformProfile ?? null,
      expectedRuntimeTier: profile.expectedRuntimeTier ?? null,
      expectedAssetTier: assetTierSemantics.requestedAssetTier,
      requestedAssetTier: assetTierSemantics.requestedAssetTier,
      levelAssetTierCap: assetTierSemantics.levelAssetTierCap,
      effectiveExpectedAssetTier: assetTierSemantics.effectiveExpectedAssetTier,
      allowedRuntimeTiers: profile.allowedRuntimeTiers ?? null,
      browser: browserName,
      levelId,
      url,
      timings: browserTimings,
      summary,
      messages,
      budgetFailures,
    }
  } finally {
    await context.close()
  }
}

function createProfileLevelErrorResult(profile, levelId, browserName, error) {
  const message = error instanceof Error ? error.message : String(error)
  const assetTierSemantics = getAssetTierSemantics(
    createEmptySummary(),
    profile,
  )

  return {
    profile: profile.id,
    targetClass: profile.targetClass ?? null,
    platformProfile: profile.platformProfile ?? null,
    expectedRuntimeTier: profile.expectedRuntimeTier ?? null,
    expectedAssetTier: assetTierSemantics.requestedAssetTier,
    requestedAssetTier: assetTierSemantics.requestedAssetTier,
    levelAssetTierCap: assetTierSemantics.levelAssetTierCap,
    effectiveExpectedAssetTier: assetTierSemantics.effectiveExpectedAssetTier,
    allowedRuntimeTiers: profile.allowedRuntimeTiers ?? null,
    browser: browserName,
    levelId,
    url: `${appOrigin}/?level=${levelId}`,
    timings: {
      timeToPlayableMs: null,
    },
    summary: createEmptySummary(),
    messages: [`[profile-error] ${message}`],
    budgetFailures: [],
  }
}

function printResult(result) {
  const { summary } = result
  const playableMs =
    typeof result.timings?.timeToPlayableMs === 'number'
      ? `${result.timings.timeToPlayableMs}ms`
      : 'n/a'
  const inferredStatus =
    result.messages.length === 0 && result.budgetFailures.length === 0
      ? 'ok'
      : strict
        ? 'fail'
        : 'warn'
  const status = result.gateStatus ?? inferredStatus
  console.log(
    [
      `[perf:${status}]`,
      result.profile,
      `browser=${result.browser}`,
      result.levelId,
      `avgFps=${summary.averageFps}`,
      `lowFps=${summary.lowestFps}`,
      `avgFrame=${summary.averageFrameTimeMs}ms`,
      `calls=${summary.maxDrawCalls}`,
      `tris=${summary.maxTriangles}`,
      `textures=${summary.maxTextures}`,
      `longTasks=${summary.maxLongTasks}`,
      `gltfCache=${formatBytes(summary.maxLoadedGltfCacheBytes)}`,
      `streamCells=${summary.maxActiveStreamingCells}`,
      `playable=${playableMs}`,
      `quality=${summary.finalQuality}`,
      `platform=${summary.selectedPlatformProfile ?? 'n/a'}`,
      `assetTierRequested=${result.requestedAssetTier ?? 'n/a'}`,
      `assetTierCap=${result.levelAssetTierCap ?? 'none'}`,
      `assetTierExpected=${result.effectiveExpectedAssetTier ?? 'n/a'}`,
      `assetTier=${summary.selectedAssetTier ?? 'n/a'}`,
      `renderProfile=${summary.renderProfileTier ?? 'n/a'}`,
      `bottlenecks=${result.bottlenecks?.length ? result.bottlenecks.join(',') : 'none'}`,
    ].join(' '),
  )

  for (const message of result.messages) {
    console.log(`  ${message}`)
  }
  for (const failure of result.budgetFailures) {
    console.log(`  budget: ${failure}`)
  }
  for (const timing of summary.slowestSystemTimings ?? []) {
    if (timing.maxMs <= 0) continue
    console.log(
      `  timing: ${timing.name} max=${timing.maxMs.toFixed(1)}ms avg=${timing.avgMs}ms samples=${timing.samples}`,
    )
  }
}

function getBaselineConfig(baseline) {
  if (!certificationMode) {
    return {
      mode: 'baseline',
      coverage: 'baseline',
      levels: baseline.levels ?? [],
      profiles: baseline.profiles ?? [],
      reportingOnly: false,
    }
  }

  const normalizedCoverage = certificationCoverage
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')

  if (
    normalizedCoverage === 'all-level-reporting' ||
    normalizedCoverage === 'all-levels' ||
    normalizedCoverage === 'reporting'
  ) {
    const reporting = baseline.certification?.allLevelReporting ?? {}
    const profileIds = new Set(reporting.profiles ?? [])
    const allProfiles = baseline.certification?.profiles ?? []

    return {
      mode: 'certification',
      coverage: 'all-level-reporting',
      levels: reporting.levels ?? baseline.certification?.levels ?? [],
      profiles:
        profileIds.size > 0
          ? allProfiles.filter(profile => profileIds.has(profile.id))
          : allProfiles,
      reportingOnly: true,
      policy: reporting.policy ?? null,
    }
  }

  const strictGate = baseline.certification?.strictGate ?? {}
  const strictProfileIds = new Set(strictGate.profiles ?? [])
  const certificationProfiles = baseline.certification?.profiles ?? []

  return {
    mode: 'certification',
    coverage: 'strict-gate',
    levels: strictGate.levels ?? baseline.certification?.levels ?? [],
    profiles:
      strictProfileIds.size > 0
        ? certificationProfiles.filter(profile =>
            strictProfileIds.has(profile.id),
          )
        : certificationProfiles,
    reportingOnly: false,
    policy: strictGate.policy ?? null,
  }
}

function validateCertificationBudgets(profiles) {
  const failures = []

  for (const profile of profiles) {
    const budgets = profile.budgets ?? {}
    const targetClass = profile.targetClass ?? profile.id

    if (
      targetClass === 'desktop-high' &&
      (budgets.minAverageFps < 24 ||
        budgets.minLowestFps < 16 ||
        budgets.maxAverageFrameTimeMs > 42)
    ) {
      failures.push(
        `${profile.id}: desktop-high certification budget must be at least avg>=24fps, lowest>=16fps, avgFrame<=42ms`,
      )
    }
    if (
      targetClass === 'mobile-low' &&
      (budgets.minAverageFps < 16 ||
        budgets.minLowestFps < 12 ||
        budgets.maxAverageFrameTimeMs > 63)
    ) {
      failures.push(
        `${profile.id}: mobile-low certification budget must be at least avg>=16fps, lowest>=12fps, avgFrame<=63ms`,
      )
    }
    if (
      targetClass === 'tv-medium' &&
      (budgets.minAverageFps < 24 ||
        budgets.minLowestFps < 16 ||
        budgets.maxAverageFrameTimeMs > 42)
    ) {
      failures.push(
        `${profile.id}: tv-medium certification budget must be at least avg>=24fps, lowest>=16fps, avgFrame<=42ms`,
      )
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Certified performance profiles use placeholder budgets:\n${failures
        .map(failure => `- ${failure}`)
        .join('\n')}`,
    )
  }
}

function writeJsonReport(results, baseline, baselineConfig) {
  if (!jsonReportPath) return

  const outputPath = resolve(appRoot, jsonReportPath)
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(
    outputPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        mode: baselineConfig.mode,
        coverage: baselineConfig.coverage,
        strict,
        serverMode,
        gatePolicy: baseline.certification?.gatePolicy ?? null,
        coveragePolicy: baselineConfig.policy ?? null,
        reportingOnly: baselineConfig.reportingOnly,
        strictGate: baseline.certification?.strictGate ?? null,
        allLevelReporting: baseline.certification?.allLevelReporting ?? null,
        nonCertifiedScopes: baseline.certification?.nonCertifiedScopes ?? [],
        certified:
          strict &&
          baselineConfig.mode === 'certification' &&
          !baselineConfig.reportingOnly
            ? results.every(
                result =>
                  result.messages.length === 0 &&
                  result.budgetFailures.length === 0,
              )
            : false,
        sampleSeconds: baseline.sampleSeconds,
        sampleIntervalMs: baseline.sampleIntervalMs,
        levels: baselineConfig.levels,
        bottleneckSummary: summarizeBottlenecks(results),
        profiles: baselineConfig.profiles.map(profile => ({
          id: profile.id,
          browser: profile.browser ?? 'chromium',
          targetClass: profile.targetClass ?? null,
          platformProfile: profile.platformProfile ?? null,
          expectedRuntimeTier: profile.expectedRuntimeTier ?? null,
          expectedAssetTier:
            profile.runtimeAssetTier ?? profile.expectedAssetTier ?? null,
          requestedAssetTier:
            profile.runtimeAssetTier ?? profile.expectedAssetTier ?? null,
          allowedRuntimeTiers: profile.allowedRuntimeTiers ?? null,
        })),
        results,
      },
      null,
      2,
    )}\n`,
  )
  console.log(`[perf] wrote ${outputPath}`)
}

async function run() {
  const baseline = readBaselines()
  const baselineConfig = getBaselineConfig(baseline)
  let serverProcess = null

  if (baselineConfig.mode === 'certification') {
    validateCertificationBudgets(baselineConfig.profiles)
  }

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
      `Unsupported performance server mode "${serverMode}". Expected dev, preview, or none.`,
    )
  }

  try {
    await waitForUrl(`${appOrigin}/`)
    if (serverMode !== 'preview') {
      await waitForUrl(`${editorApiBase}/api/level-registry`)
    }

    const results = []
    const levelFilters = createFilterSet(levelFilter)
    const profileFilters = createFilterSet(profileFilter)
    const profiles = baselineConfig.profiles.filter(
      profile => profileFilters.size === 0 || profileFilters.has(profile.id),
    )
    const levels = baselineConfig.levels.filter(
      levelId => levelFilters.size === 0 || levelFilters.has(levelId),
    )

    if (profiles.length === 0) {
      throw new Error(`No performance profiles matched "${profileFilter}".`)
    }
    if (levels.length === 0) {
      throw new Error(`No performance levels matched "${levelFilter}".`)
    }

    for (const profile of profiles) {
      const browserName = normalizeBrowserName(
        browserFilter || profile.browser || 'chromium',
      )
      const browser = await launchBrowser(browserName)

      try {
        for (const levelId of levels) {
          let result
          try {
            result = await runProfileLevel(
              browser,
              baseline,
              profile,
              levelId,
              browserName,
            )
          } catch (error) {
            if (strict) throw error
            result = createProfileLevelErrorResult(
              profile,
              levelId,
              browserName,
              error,
            )
          }
          const resultFailed =
            result.messages.length > 0 || result.budgetFailures.length > 0
          const resultErrored = result.messages.some(message =>
            message.startsWith('[profile-error]'),
          )
          result.reportingOnly = baselineConfig.reportingOnly
          result.bottlenecks = classifyPerformanceBottlenecks(result)
          result.gateStatus = baselineConfig.reportingOnly
            ? resultErrored
              ? 'reporting-error'
              : resultFailed
                ? 'reporting-warning'
                : 'reporting-ok'
            : resultErrored
              ? 'error'
              : resultFailed
                ? strict
                  ? 'fail'
                  : 'warn'
                : 'ok'
          results.push(result)
          printResult(result)
        }
      } finally {
        await browser.close()
      }
    }

    const failed = results.filter(
      result => result.messages.length > 0 || result.budgetFailures.length > 0,
    )
    writeJsonReport(results, baseline, baselineConfig)

    if (strict && failed.length > 0) {
      throw new Error(`${failed.length} performance baseline check(s) failed.`)
    }

    if (failed.length > 0) {
      console.log(
        `[perf] ${failed.length} baseline warning(s). Re-run with --strict to fail on budget drift.`,
      )
    } else {
      console.log(`[perf] all ${baselineConfig.mode} checks passed`)
    }
  } finally {
    await stopChildProcess(serverProcess)
  }
}

await run()
