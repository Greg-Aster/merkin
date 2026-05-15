import {
  assertRequiredRenderActors,
  assertRuntimeRenderLifecycle,
  isTransientConsoleMessage,
  launchBrowser,
  normalizeBrowserName,
  parseArgValue,
  readDeployedLevelIds,
  shouldIgnoreConsoleMessage,
  shouldIgnoreRequestFailure,
  waitForPlayableLevel,
} from './lib/browserHarness.mjs'

const args = process.argv.slice(2)
const browserName = normalizeBrowserName(
  parseArgValue(args, 'browser', process.env.GAME_BROWSER || 'chromium'),
)
const appOrigin = `http://127.0.0.1:${process.env.GAME_DEV_PORT || 4322}`
const deployedLevelIds = readDeployedLevelIds()

function createEditorSmokeCheck(name, url) {
  return {
    name,
    url,
    postLoadDelayMs: 7000,
    interact: async page => {
      await page.locator('.editor-shell').first().waitFor({
        state: 'visible',
        timeout: 10000,
      })
      await page
        .locator('.editor-tab-rail')
        .locator('button')
        .filter({ hasText: /(?:Save \/ Publish|Build)/ })
        .click()
      await page.getByText('Publish Readiness', { exact: true }).waitFor({
        state: 'visible',
        timeout: 10000,
      })
      await page.getByText('Publish Build Plan').waitFor({
        state: 'visible',
        timeout: 15000,
      })
      await page.getByText('Production Flow').waitFor({
        state: 'visible',
        timeout: 15000,
      })
      await page.getByText(/Validation (Gates|Failures|Sections)/).waitFor({
        state: 'visible',
        timeout: 15000,
      })
      await page.locator('select.text-input').first().waitFor({
        state: 'visible',
        timeout: 10000,
      })
      await page
        .locator('.editor-tab-rail')
        .getByRole('button', { name: 'Inspect', exact: true })
        .click()
      await page
        .locator('.editor-tools-panel .editor-tab-content')
        .getByText(
          'Select an object in the viewport or outliner, then use the right-side Details shelf for properties.',
        )
        .first()
        .waitFor({
          state: 'visible',
          timeout: 10000,
        })
    },
  }
}

function createLevelSmokeCheck(levelId) {
  return {
    name: `level:${levelId}`,
    url: `${appOrigin}/?level=${levelId}&debug=1&debugLogs=1`,
    postLoadDelayMs: 1000,
    interact: async (page, context) => {
      await page.mouse.click(24, 24)
      await waitForPlayableLevel(page, levelId, {
        consoleMessages: context.consoleMessages,
        diagnosticsTimeoutMs: 10000,
        currentLevelTimeoutMs: 10000,
        gameplayTimeoutMs: 45000,
      })
      await assertRequiredRenderActors(page, levelId)
      await assertRuntimeRenderLifecycle(page, levelId)

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
      } catch {}
    },
  }
}

const checks = [
  {
    name: 'game',
    url: `${appOrigin}/`,
    postLoadDelayMs: 5000,
  },
  createEditorSmokeCheck('editor', `${appOrigin}/?editor=1`),
  createEditorSmokeCheck('editor-trailing-slash', `${appOrigin}/?editor=1/`),
  ...deployedLevelIds.map(createLevelSmokeCheck),
]

const failures = []

for (const check of checks) {
  const browser = await launchBrowser(browserName)
  let page = null
  let messages = []
  const consoleMessages = []

  try {
    page = await browser.newPage()
    await page.addInitScript(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
    })

    page.on('console', msg => {
      const type = msg.type()
      consoleMessages.push(`[${type}] ${msg.text()}`)
      if (type === 'warning' || type === 'error') {
        const text = msg.text()
        if (shouldIgnoreConsoleMessage(text)) {
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
      if (shouldIgnoreRequestFailure(url, errorText)) {
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
      isTransientConsoleMessage(message),
    )

    if (hasTransientFailure) {
      messages = []
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(check.postLoadDelayMs)
    }
  } catch (error) {
    messages.push(
      `[check-error] ${error instanceof Error ? error.message : String(error)}`,
    )
  } finally {
    if (page) {
      await page.close().catch(() => {})
    }
    await browser.close().catch(() => {})
  }

  if (messages.length > 0) {
    failures.push({
      name: check.name,
      url: check.url,
      messages,
    })
  }
}

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
