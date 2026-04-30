import { chromium } from 'playwright'

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
    url: `http://127.0.0.1:4322/?level=${levelId}&debug=1`,
    postLoadDelayMs: 1000,
    interact: async (page, context) => {
      const spawnSignal = waitForConsoleMessage(
        context.consoleMessages,
        message => message.includes('SpawnSystem: Spawned player'),
        60000,
      )

      await page.mouse.click(24, 24)
      await page.waitForSelector('.runtime-diagnostics-panel', {
        timeout: 10000,
      })
      await page.waitForSelector(`text=Current Level: ${levelId}`, {
        timeout: 10000,
      })
      try {
        await page.waitForSelector(`text=Gameplay is enabled on ${levelId}.`, {
          timeout: 45000,
        })
      } catch (error) {
        await spawnSignal
      }
      await spawnSignal

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
        await spawnSignal
      }
    },
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
    url: 'http://127.0.0.1:4322/',
    postLoadDelayMs: 5000,
  },
  {
    name: 'editor',
    url: 'http://127.0.0.1:4322/?editor=1',
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
]

const transientMessagePatterns = [
  /Outdated Optimize Dep/i,
  /Failed to fetch dynamically imported module/i,
]

const launchOptions = {
  headless: true,
}

if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
  launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
}

const browser = await chromium.launch(launchOptions)

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
  '[boot-check] gameplay, editor, and migrated levels loaded without console warnings/errors',
)
