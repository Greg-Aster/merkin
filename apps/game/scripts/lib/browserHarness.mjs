import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium, firefox, webkit } from 'playwright'
export { readDeployedLevelIds } from './levelRegistry.mjs'

const BROWSER_TYPES = {
  chromium,
  firefox,
  webkit,
}

const pnpmBin = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const useShell = process.platform === 'win32'
const playerReadyConsoleSignal = 'GameWorld: Player level position resolved'

const ignoredConsolePatterns = [
  /CONTEXT_LOST_WEBGL/i,
  /GPU stall due to ReadPixels/i,
  /GL Driver Message/i,
  /GL_INVALID/i,
  /GL_INVALID_ENUM/i,
  /GL_INVALID_OPERATION/i,
  /glTexStorage2D/i,
  /glTexSubImage2DRobustANGLE/i,
  /Audio play failed/i,
  /unreachable code after return statement.*rapier3d.*character_controller\.js/i,
  /WebGL warning: drawElementsInstanced: Drawing to a destination rect smaller than the viewport rect/i,
]

const transientConsolePatterns = [
  /Outdated Optimize Dep/i,
  /Failed to fetch dynamically imported module/i,
]

export function parseArgValue(args, name, fallback = '') {
  const prefix = `--${name}=`
  const inline = args.find(arg => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)

  const index = args.indexOf(`--${name}`)
  if (index >= 0 && args[index + 1]) return args[index + 1]

  return fallback
}

export function createFilterSet(value) {
  return new Set(
    String(value)
      .split(',')
      .map(item => item.trim())
      .filter(Boolean),
  )
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

export function createRuntimeProfileOverride(profile = {}) {
  if (!profile || typeof profile !== 'object') return null

  const profileId = typeof profile.id === 'string' ? profile.id : null
  const platformProfile =
    typeof profile.platformProfile === 'string' ? profile.platformProfile : null
  const expectedRuntimeTier =
    typeof profile.expectedRuntimeTier === 'string'
      ? profile.expectedRuntimeTier
      : null
  const runtimeAssetTier =
    typeof profile.runtimeAssetTier === 'string'
      ? profile.runtimeAssetTier
      : typeof profile.expectedAssetTier === 'string'
        ? profile.expectedAssetTier
        : null

  if (
    !profileId &&
    !platformProfile &&
    !expectedRuntimeTier &&
    !runtimeAssetTier
  ) {
    return null
  }

  return {
    id: profileId ?? 'adhoc-runtime-profile',
    targetClass:
      typeof profile.targetClass === 'string' ? profile.targetClass : null,
    platformProfile,
    expectedRuntimeTier,
    runtimeAssetTier,
  }
}

export async function installRuntimeProfileOverride(page, profile = {}) {
  const runtimeProfile = createRuntimeProfileOverride(profile)
  if (!runtimeProfile) return

  await page.addInitScript(profileOverride => {
    window.__gameRuntimeProfile = profileOverride
  }, runtimeProfile)
}

export function shouldIgnoreConsoleMessage(text) {
  return ignoredConsolePatterns.some(pattern => pattern.test(text))
}

export function isTransientConsoleMessage(text) {
  return transientConsolePatterns.some(pattern => pattern.test(text))
}

export function shouldIgnoreRequestFailure(url, errorText = '') {
  return /\/audio\//i.test(url) || /ERR_ABORTED/i.test(errorText)
}

export function spawnGameDev(repoRoot) {
  return spawn(pnpmBin, ['--dir', 'apps/game', 'dev'], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: useShell,
    env: process.env,
  })
}

export function runGameBuild(repoRoot) {
  const result = spawnSync(pnpmBin, ['--dir', 'apps/game', 'build'], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: useShell,
    env: process.env,
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`Game build failed with exit code ${result.status}`)
  }
}

export function spawnGamePreview(
  repoRoot,
  port = process.env.GAME_DEV_PORT || 4322,
) {
  return spawn(
    pnpmBin,
    [
      '--dir',
      'apps/game',
      'exec',
      'astro',
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: useShell,
      env: process.env,
    },
  )
}

export async function assertPortAvailable(port, host = '127.0.0.1') {
  await new Promise((resolve, reject) => {
    const server = createServer()

    server.once('error', error => {
      reject(error)
    })
    server.listen(Number(port), host, () => {
      server.close(resolve)
    })
  }).catch(error => {
    if (error?.code === 'EADDRINUSE') {
      throw new Error(
        `Requested game performance port ${port} is already in use. Stop the existing server, set GAME_DEV_PORT to a free port, or pass --no-server intentionally.`,
      )
    }

    throw error
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

export async function waitForPageText(page, text, timeout) {
  await page.waitForFunction(
    expectedText => document.body?.innerText.includes(expectedText),
    text,
    { timeout },
  )
}

export function waitForConsoleMessage(messages, predicate, timeoutMs) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const interval = setInterval(() => {
      if (messages.some(predicate)) {
        clearInterval(interval)
        resolve()
        return
      }

      if (Date.now() - startedAt > timeoutMs) {
        clearInterval(interval)
        reject(new Error('Timed out waiting for runtime console signal.'))
      }
    }, 100)
  })
}

export async function waitForPlayableLevel(page, levelId, options = {}) {
  const {
    consoleMessages = null,
    diagnosticsTimeoutMs = 15000,
    currentLevelTimeoutMs = 15000,
    gameplayTimeoutMs = 90000,
    playerConsoleTimeoutMs = 60000,
    requireDebugPanel = true,
  } = options
  const playableConsoleSignal = consoleMessages
    ? waitForConsoleMessage(
        consoleMessages,
        message => message.includes(playerReadyConsoleSignal),
        playerConsoleTimeoutMs,
      ).then(
        () => true,
        () => false,
      )
    : null

  if (requireDebugPanel) {
    await page
      .locator('.runtime-diagnostics-panel')
      .first()
      .waitFor({ state: 'attached', timeout: diagnosticsTimeoutMs })
    await waitForPageText(
      page,
      `Current Level: ${levelId}`,
      currentLevelTimeoutMs,
    )

    try {
      await waitForPageText(
        page,
        `Gameplay is enabled on ${levelId}.`,
        gameplayTimeoutMs,
      )
    } catch (error) {
      if (!playableConsoleSignal) throw error
      if (!(await playableConsoleSignal)) throw error
    }
  } else {
    await page.waitForFunction(
      level => {
        const state = window.__gameRuntimeRenderState
        const summary = state?.summaries?.[level]
        const lifecycle = state?.lifecycle?.[level]
        const phase = lifecycle?.phase ?? summary?.lifecyclePhase
        const readyPhases = new Set([
          'diagnostics-ready',
          'player-activation-ready',
        ])

        return Boolean(
          window.__megamealDiagnostics &&
            summary &&
            readyPhases.has(phase) &&
            summary.requiredRenderedActorCount === summary.requiredActorCount,
        )
      },
      levelId,
      { timeout: gameplayTimeoutMs },
    )
  }

  if (playableConsoleSignal) {
    await playableConsoleSignal
  }

  await page.waitForFunction(
    () => Boolean(window.__megamealDiagnostics),
    null,
    {
      timeout: diagnosticsTimeoutMs,
    },
  )
}

export async function assertRequiredRenderActors(page, levelId) {
  await page.waitForFunction(
    level => {
      const state = window.__gameRuntimeRenderState
      const required = state?.required?.[level] ?? []
      const rendered = new Set(state?.rendered?.[level] ?? [])
      const missingActors = required.filter(actorId => !rendered.has(actorId))

      return required.length === 0 || missingActors.length === 0
    },
    levelId,
    { timeout: 30000 },
  )

  const missingActorIds = await page.evaluate(level => {
    const state = window.__gameRuntimeRenderState
    const required = state?.required?.[level] ?? []
    const rendered = new Set(state?.rendered?.[level] ?? [])
    return required.filter(actorId => !rendered.has(actorId))
  }, levelId)

  if (missingActorIds.length > 0) {
    throw new Error(
      `${levelId} missing required rendered actors: ${missingActorIds.join(', ')}`,
    )
  }
}

export async function assertRuntimeRenderLifecycle(page, levelId) {
  await page.waitForFunction(
    level => {
      const state = window.__gameRuntimeRenderState
      const summary = state?.summaries?.[level]
      const lifecycle = state?.lifecycle?.[level]
      const renderProfile = state?.renderProfiles?.[level]
      const postProcessing = state?.postProcessing?.[level]
      const readyPhases = new Set([
        'diagnostics-ready',
        'player-activation-ready',
      ])

      return Boolean(
        summary &&
          lifecycle &&
          readyPhases.has(summary.lifecyclePhase) &&
          readyPhases.has(lifecycle.phase) &&
          renderProfile?.profileId &&
          postProcessing &&
          summary.requiredRenderedActorCount === summary.requiredActorCount,
      )
    },
    levelId,
    { timeout: 30000 },
  )

  const lifecycleReport = await page.evaluate(level => {
    const state = window.__gameRuntimeRenderState
    const summary = state?.summaries?.[level]
    const lifecycle = state?.lifecycle?.[level]
    const renderProfile = state?.renderProfiles?.[level]
    const postProcessing = state?.postProcessing?.[level]

    return {
      summary,
      lifecycle,
      renderProfile,
      postProcessing,
    }
  }, levelId)

  const { summary, lifecycle, renderProfile, postProcessing } = lifecycleReport
  const failures = []
  if (!summary) failures.push('missing render summary')
  if (!lifecycle) failures.push('missing render lifecycle')
  if (!renderProfile?.profileId) failures.push('missing active render profile')
  if (!postProcessing) failures.push('missing post-processing diagnostics')
  if (
    summary &&
    summary.requiredRenderedActorCount !== summary.requiredActorCount
  ) {
    failures.push(
      `required rendered actors ${summary.requiredRenderedActorCount}/${summary.requiredActorCount}`,
    )
  }

  if (failures.length > 0) {
    throw new Error(
      `${levelId} runtime render lifecycle failed: ${failures.join('; ')}`,
    )
  }
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
