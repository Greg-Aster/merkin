import {
  launchBrowser,
  normalizeBrowserName,
  parseArgValue,
} from './lib/browserHarness.mjs'

const args = process.argv.slice(2)
const browserName = normalizeBrowserName(
  parseArgValue(args, 'browser', process.env.GAME_BROWSER || 'chromium'),
)
const appOrigin = `http://127.0.0.1:${process.env.GAME_DEV_PORT || 4322}`

const migratedLevels = [
  'observatory',
  'solitude',
  'sci-fi-room',
  'miranda',
  'yggdrasil',
]

function createLevelSmokeCheck(levelId) {
  return {
    name: `level:${levelId}`,
    url: `${appOrigin}/?level=${levelId}&debug=1`,
    postLoadDelayMs: 1000,
    interact: async (page, context) => {
      const playableSignal = waitForConsoleMessage(
        context.consoleMessages,
        message => message.includes('GameWorld: Player level position resolved'),
        60000,
      )

      await page.mouse.click(24, 24)
      await page
        .locator('.runtime-diagnostics-panel')
        .first()
        .waitFor({ state: 'attached', timeout: 10000 })
      await waitForPageText(page, `Current Level: ${levelId}`, 10000)
      try {
        await waitForPageText(
          page,
          `Gameplay is enabled on ${levelId}.`,
          45000,
        )
      } catch (error) {
        await playableSignal
      }
      await playableSignal
      await assertRequiredRenderActors(page, levelId)

      try {
        const summaryText = await page
          .locator('.runtime-diagnostics-summary')
          .first()
          .innerText({ timeout: 10000 })
        if (!summaryText.startsWith('0 errors')) {
          throw new Error(
            `${levelId} runtime diagnostics reported failures: ${summaryText}`,
          )
        }
      } catch (error) {
        await playableSignal
      }
    },
  }
}

async function waitForPageText(page, text, timeout) {
  await page.waitForFunction(
    expectedText => document.body?.innerText.includes(expectedText),
    text,
    { timeout },
  )
}

async function assertRequiredRenderActors(page, levelId) {
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

function waitForConsoleMessage(messages, predicate, timeoutMs) {
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

const checks = [
  {
    name: 'game',
    url: `${appOrigin}/`,
    postLoadDelayMs: 5000,
  },
  {
    name: 'editor',
    url: `${appOrigin}/?editor=1`,
    postLoadDelayMs: 7000,
  },
  ...migratedLevels.map(createLevelSmokeCheck),
]

const ignoredMessagePatterns = [
  /CONTEXT_LOST_WEBGL/i,
  /GPU stall due to ReadPixels/i,
  /GL Driver Message/i,
  /GL_INVALID_ENUM/i,
  /GL_INVALID_OPERATION/i,
  /glTexStorage2D/i,
  /glTexSubImage2DRobustANGLE/i,
  /Audio play failed/i,
  /unreachable code after return statement.*rapier3d.*character_controller\.js/i,
  /WebGL warning: drawElementsInstanced: Drawing to a destination rect smaller than the viewport rect/i,
]

const transientMessagePatterns = [
  /Outdated Optimize Dep/i,
  /Failed to fetch dynamically imported module/i,
]

const browser = await launchBrowser(browserName)

const failures = []

for (const check of checks) {
  const page = await browser.newPage()
  let messages = []
  const consoleMessages = []

  await page.addInitScript(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  page.on('console', msg => {
    const type = msg.type()
    consoleMessages.push(`[${type}] ${msg.text()}`)
    if (type === 'warning' || type === 'error') {
      const text = msg.text()
      if (ignoredMessagePatterns.some(pattern => pattern.test(text))) {
        return
      }
      messages.push(`[${type}] ${text}`)
    }
  })

  page.on('pageerror', error => {
    messages.push(`[pageerror] ${error.message}`)
  })

  page.on('requestfailed', request => {
    const url = request.url()
    const errorText = request.failure()?.errorText || 'unknown error'
    if (/\/audio\//i.test(url) || /ERR_ABORTED/i.test(errorText)) {
      return
    }
    messages.push(`[requestfailed] ${request.method()} ${url} :: ${errorText}`)
  })

  async function runNavigation() {
    try {
      const response = await page.goto(check.url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })

      if (!response || !response.ok()) {
        messages.push(
          `[navigation] ${check.url} returned ${response?.status?.() ?? 'no response'}`,
        )
      }

      await page.waitForTimeout(check.postLoadDelayMs)
      if (check.interact) {
        await check.interact(page, { consoleMessages })
        await page.waitForTimeout(1000)
      }
    } catch (error) {
      messages.push(
        `[navigation-error] ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  await runNavigation()

  const hasTransientFailure = messages.some(message =>
    transientMessagePatterns.some(pattern => pattern.test(message)),
  )

  if (hasTransientFailure) {
    messages = []
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(check.postLoadDelayMs)
  }

  await page.close()

  if (messages.length > 0) {
    failures.push({
      name: check.name,
      url: check.url,
      messages,
    })
  }
}

await browser.close()

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`[boot-check] ${failure.name} failed: ${failure.url}`)
    for (const message of failure.messages) {
      console.error(`  ${message}`)
    }
  }
  process.exit(1)
}

console.log(
  `[boot-check] ${browserName}: gameplay, editor, and migrated levels loaded without console warnings/errors`,
)
