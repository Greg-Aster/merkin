import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium, firefox, webkit } from 'playwright'

const BROWSER_TYPES = {
  chromium,
  firefox,
  webkit,
}

const pnpmBin = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const useShell = process.platform === 'win32'

export function parseArgValue(args, name, fallback = '') {
  const prefix = `--${name}=`
  const inline = args.find(arg => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)

  const index = args.indexOf(`--${name}`)
  if (index >= 0 && args[index + 1]) return args[index + 1]

  return fallback
}

export function normalizeBrowserName(value) {
  const browserName = String(value || 'chromium').toLowerCase()
  if (browserName === 'chrome' || browserName === 'edge') return 'chromium'
  if (browserName in BROWSER_TYPES) return browserName

  throw new Error(
    `Unsupported browser "${value}". Expected chromium, firefox, or webkit.`,
  )
}

export async function launchBrowser(browserName, options = {}) {
  const normalized = normalizeBrowserName(browserName)
  const launchOptions = { headless: true, ...options }
  const executableEnvName = `PLAYWRIGHT_${normalized.toUpperCase()}_EXECUTABLE_PATH`
  const executablePath = process.env[executableEnvName]

  if (executablePath) {
    launchOptions.executablePath = executablePath
  }

  try {
    return await BROWSER_TYPES[normalized].launch(launchOptions)
  } catch (error) {
    const installHint = `pnpm --dir apps/game exec playwright install ${normalized}`
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Failed to launch Playwright ${normalized}. Install/check it with: ${installHint}\n${detail}`,
    )
  }
}

export function createContextOptions(profile, browserName = 'chromium') {
  const options = {
    viewport: profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor ?? 1,
    hasTouch: Boolean(profile.hasTouch),
    userAgent: profile.userAgent,
  }

  if (normalizeBrowserName(browserName) !== 'firefox') {
    options.isMobile = Boolean(profile.isMobile)
  }

  return options
}

export function spawnGameDev(repoRoot) {
  return spawn(pnpmBin, ['--dir', 'apps/game', 'dev'], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: useShell,
    env: process.env,
  })
}

export async function waitForUrl(url, attempts = 80, intervalMs = 500) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) })
      if (response.ok || response.status === 204) return
    } catch {}

    await delay(intervalMs)
  }

  throw new Error(`Timed out waiting for ${url}`)
}

export async function stopChildProcess(childProcess, timeoutMs = 8000) {
  if (!childProcess || childProcess.exitCode !== null) {
    return
  }

  const exited = new Promise(resolve => {
    childProcess.once('exit', resolve)
  })

  childProcess.kill('SIGTERM')

  const timedOut = await Promise.race([
    exited.then(() => false),
    delay(timeoutMs).then(() => true),
  ])

  if (timedOut && childProcess.exitCode === null) {
    childProcess.kill('SIGKILL')
    await exited
  }
}
