import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import {
  createFilterSet,
  createContextOptions,
  launchBrowser,
  normalizeBrowserName,
  parseArgValue,
  shouldIgnoreConsoleMessage,
  spawnGameDev,
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
const noServer = args.has('--no-server')
const browserFilter = parseArgValue(argv, 'browser', process.env.GAME_BROWSER || '')
const levelFilter = parseArgValue(argv, 'level', process.env.GAME_PERF_LEVEL || '')
const profileFilter = parseArgValue(
  argv,
  'profile',
  process.env.GAME_PERF_PROFILE || '',
)

function readBaselines() {
  return JSON.parse(readFileSync(baselinePath, 'utf8'))
}

function getNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}

function summarizeSamples(samples) {
  const fps = samples.map(sample => getNumber(sample.fps))
  const frameTimes = samples.map(sample => getNumber(sample.frameTime))
  const renderInfo = samples.map(sample => sample.renderInfo ?? {})
  const longTasks = samples.map(sample => sample.longTasks ?? {})
  const systemTimings = samples.at(-1)?.systemTimings ?? {}

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
    maxLongTasks: Math.max(
      ...longTasks.map(info => getNumber(info.count)),
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
    finalQuality: samples.at(-1)?.quality ?? 'unknown',
  }
}

function compareAgainstBudgets(summary, budgets) {
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
  ]

  for (const [metric, operator, expected, actual] of checks) {
    if (!Number.isFinite(expected)) continue
    const passed = operator === '>=' ? actual >= expected : actual <= expected
    if (!passed) {
      failures.push(`${metric} ${actual} expected ${operator} ${expected}`)
    }
  }

  return failures
}

async function collectSamples(page, baseline) {
  const samples = []
  const sampleCount = Math.max(
    1,
    Math.ceil((baseline.sampleSeconds * 1000) / baseline.sampleIntervalMs),
  )

  for (let index = 0; index < sampleCount; index += 1) {
    await delay(baseline.sampleIntervalMs)
    samples.push(
      await page.evaluate(() => window.__megamealDiagnostics.getSnapshot()),
    )
  }

  return samples
}

async function runProfileLevel(browser, baseline, profile, levelId, browserName) {
  const context = await browser.newContext(
    createContextOptions(profile, browserName),
  )
  const page = await context.newPage()
  const messages = []

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

  const url = `${appOrigin}/?level=${levelId}&debug=1`
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await waitForPlayableLevel(page, levelId)
    const samples = await collectSamples(page, baseline)
    const summary = summarizeSamples(samples)
    const budgetFailures = compareAgainstBudgets(summary, profile.budgets ?? {})

    return {
      profile: profile.id,
      browser: browserName,
      levelId,
      url,
      summary,
      messages,
      budgetFailures,
    }
  } finally {
    await context.close()
  }
}

function printResult(result) {
  const { summary } = result
  const status =
    result.messages.length === 0 && result.budgetFailures.length === 0
      ? 'ok'
      : strict
        ? 'fail'
        : 'warn'
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
      `quality=${summary.finalQuality}`,
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

async function run() {
  const baseline = readBaselines()
  let devProcess = null

  if (!noServer) {
    devProcess = spawnGameDev(repoRoot)
  }

  try {
    await waitForUrl(`${appOrigin}/`)
    await waitForUrl(`${editorApiBase}/api/level-registry`)

    const results = []
    const levelFilters = createFilterSet(levelFilter)
    const profileFilters = createFilterSet(profileFilter)
    const profiles = baseline.profiles.filter(
      profile => profileFilters.size === 0 || profileFilters.has(profile.id),
    )
    const levels = baseline.levels.filter(
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
          const result = await runProfileLevel(
            browser,
            baseline,
            profile,
            levelId,
            browserName,
          )
          results.push(result)
          printResult(result)
        }
      } finally {
        await browser.close()
      }
    }

    const failed = results.filter(
      result =>
        result.messages.length > 0 || result.budgetFailures.length > 0,
    )

    if (strict && failed.length > 0) {
      throw new Error(`${failed.length} performance baseline check(s) failed.`)
    }

    if (failed.length > 0) {
      console.log(
        `[perf] ${failed.length} baseline warning(s). Re-run with --strict to fail on budget drift.`,
      )
    } else {
      console.log('[perf] all browser/mobile baselines passed')
    }
  } finally {
    await stopChildProcess(devProcess)
  }
}

await run()
