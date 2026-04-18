import { chromium } from 'playwright'

const checks = [
  {
    name: 'game',
    url: 'http://127.0.0.1:4322/',
    postLoadDelayMs: 5000,
    interact: async (page) => {
      await page.click('button[aria-label="Open settings"]')
      await page.waitForSelector('.settings-panel[role="dialog"]', { timeout: 10000 })
      await page.click('.close-button[aria-label="Close settings"]')
    },
  },
  {
    name: 'editor',
    url: 'http://127.0.0.1:4322/?editor=1',
    postLoadDelayMs: 7000,
    interact: async (page) => {
      await page.click('button[aria-label="AI Mesh"]')
      await page.waitForSelector('text=AI Mesh Studio', { timeout: 10000 })
    },
  },
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

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/google-chrome',
})

const failures = []

for (const check of checks) {
  const page = await browser.newPage()
  let messages = []

  page.on('console', (msg) => {
    const type = msg.type()
    if (type === 'warning' || type === 'error') {
      const text = msg.text()
      if (ignoredMessagePatterns.some((pattern) => pattern.test(text))) {
        return
      }
      messages.push(`[${type}] ${text}`)
    }
  })

  page.on('pageerror', (error) => {
    messages.push(`[pageerror] ${error.message}`)
  })

  page.on('requestfailed', (request) => {
    const url = request.url()
    const errorText = request.failure()?.errorText || 'unknown error'
    if (
      /\/audio\//i.test(url)
      || /ERR_ABORTED/i.test(errorText)
    ) {
      return
    }
    messages.push(
      `[requestfailed] ${request.method()} ${url} :: ${errorText}`
    )
  })

  async function runNavigation() {
    try {
      const response = await page.goto(check.url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      })

      if (!response || !response.ok()) {
        messages.push(`[navigation] ${check.url} returned ${response?.status?.() ?? 'no response'}`)
      }

      await page.waitForTimeout(check.postLoadDelayMs)
      if (check.interact) {
        await check.interact(page)
        await page.waitForTimeout(1000)
      }
    } catch (error) {
      messages.push(`[navigation-error] ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  await runNavigation()

  const hasTransientFailure = messages.some((message) =>
    transientMessagePatterns.some((pattern) => pattern.test(message))
  )

  if (hasTransientFailure) {
    messages = []
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 })
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

console.log('[boot-check] gameplay and editor pages loaded without console warnings/errors')
