import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const appRoot = new URL('..', import.meta.url)
const repoRoot = new URL('../../..', import.meta.url)
const editorApiBase = String(process.env.PUBLIC_EDITOR_API_BASE || 'http://127.0.0.1:3001').replace(/\/+$/, '')
const gameDevPort = String(process.env.GAME_DEV_PORT || 4322)

function spawnDev() {
  return spawn('pnpm', ['--dir', 'apps/game', 'dev'], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  })
}

async function waitForUrl(url, attempts = 60, intervalMs = 500) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url)
      if (response.ok || response.status === 204) {
        return
      }
    } catch {}

    await delay(intervalMs)
  }

  throw new Error(`Timed out waiting for ${url}`)
}

async function runBootCheck() {
  const devProcess = spawnDev()

  const shutdown = () => {
    if (!devProcess.killed) {
      devProcess.kill('SIGTERM')
    }
  }

  try {
    await waitForUrl(`${editorApiBase}/favicon.ico`)
    await waitForUrl(`http://127.0.0.1:${gameDevPort}/`)

    const browserProcess = spawn(
      'npx',
      ['-y', '-p', 'playwright', 'node', './scripts/boot-check-browser.mjs'],
      {
        cwd: appRoot,
        stdio: 'inherit',
        shell: false,
        env: process.env,
      }
    )

    const exitCode = await new Promise((resolve, reject) => {
      browserProcess.on('error', reject)
      browserProcess.on('exit', resolve)
    })

    if (exitCode !== 0) {
      throw new Error(`Browser boot check failed with exit code ${exitCode}`)
    }
  } finally {
    shutdown()
  }
}

await runBootCheck()
