import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import {
  getHealthyRuntimeOrigin,
  readRuntime,
} from '../../../scripts/dev-runtime.mjs'

const host = '127.0.0.1'
const port = String(process.env.GAME_DEV_PORT || 4322)
const appUrl = `http://${host}:${port}`
const appRoot = fileURLToPath(new URL('..', import.meta.url))
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))
const runtimeDir = path.join(repoRoot, '.dev-runtime')
const startupLockDir = path.join(runtimeDir, 'game-startup.lock')
const viteCacheDir = path.join(appRoot, 'node_modules', '.vite')
const manualRefresh =
  process.env.GAME_DEV_MANUAL_REFRESH === '1' ||
  process.env.GAME_DEV_HMR === '0' ||
  process.env.GAME_DEV_NO_HMR === '1'
const devModeLabel = manualRefresh ? 'manual-refresh' : 'hmr'
const startupLockPollMs = 500
const startupLockTimeoutMs = Number.parseInt(
  process.env.GAME_DEV_STARTUP_LOCK_TIMEOUT_MS || '90000',
  10,
)
const staleStartupLockMs = Number.parseInt(
  process.env.GAME_DEV_STALE_STARTUP_LOCK_MS || '120000',
  10,
)

function spawnCommand(command, args, options = {}) {
  const resolvedCommand =
    process.platform === 'win32' && command === 'pnpm' ? 'pnpm.cmd' : command

  return spawn(resolvedCommand, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32' && command === 'pnpm',
    ...options,
  })
}

async function removeIfPresent(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true })
}

async function cleanupViteCache() {
  await removeIfPresent(viteCacheDir)
}

async function delay(ms) {
  await new Promise(resolve => setTimeout(resolve, ms))
}

async function writeStartupLockOwner() {
  await fs.writeFile(
    path.join(startupLockDir, 'owner.json'),
    JSON.stringify(
      {
        pid: process.pid,
        origin: appUrl,
        mode: devModeLabel,
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  )
}

async function removeStaleStartupLock() {
  try {
    const stats = await fs.stat(startupLockDir)
    if (Date.now() - stats.mtimeMs < staleStartupLockMs) {
      return false
    }
  } catch {
    return false
  }

  await removeIfPresent(startupLockDir)
  console.warn('⚠️ Removed stale game dev startup lock.')
  return true
}

async function acquireStartupLock() {
  await fs.mkdir(runtimeDir, { recursive: true })
  const startedAt = Date.now()
  let loggedWait = false

  while (true) {
    try {
      await fs.mkdir(startupLockDir)
      await writeStartupLockOwner()
      return async () => {
        await removeIfPresent(startupLockDir)
      }
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        throw error
      }
    }

    const existingOrigin = await hasReusableAppServer()
    if (existingOrigin) {
      return null
    }

    await removeStaleStartupLock()

    if (!loggedWait) {
      console.log(
        `⏳ Waiting for another game dev server startup on ${appUrl} instead of starting a second server...`,
      )
      loggedWait = true
    }

    if (Date.now() - startedAt > startupLockTimeoutMs) {
      throw new Error(
        `Timed out waiting for the game dev startup lock at ${startupLockDir}. If no agent is starting the server, remove that directory and retry.`,
      )
    }

    await delay(startupLockPollMs)
  }
}

async function assertRequestedPortAvailable() {
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
        `Requested game dev port ${port} is already in use, but no reusable healthy game server is available at ${appUrl}. Stop the existing process or inspect why it is unhealthy before using another GAME_DEV_PORT intentionally.`,
      )
    }

    throw error
  })
}

async function keepAliveForExistingApp(origin) {
  console.log(
    `🎮 Reusing existing ${devModeLabel} game dev server at: ${origin}`,
  )

  await new Promise((resolve) => {
    const interval = setInterval(() => {}, 60_000)
    const shutdown = () => {
      clearInterval(interval)
      resolve()
    }

    process.once('SIGINT', shutdown)
    process.once('SIGTERM', shutdown)
  })
}

async function hasReusableAppServer() {
  const origin = await getHealthyRuntimeOrigin('game', appUrl)
  if (!origin) {
    return ''
  }
  if (origin !== appUrl) {
    console.warn(
      `⚠️ Ignoring existing game dev server at ${origin}; requested ${appUrl}.`,
    )
    return ''
  }

  const runtime = await readRuntime('game')
  if (runtime?.origin === origin) {
    const runtimeManualRefresh = runtime.manualRefresh === true
    if (runtimeManualRefresh !== manualRefresh) {
      console.warn(
        `⚠️ Existing game dev server at ${origin} is running in ${runtimeManualRefresh ? 'manual-refresh' : 'hmr'} mode; requested ${devModeLabel}.`,
      )
      return ''
    }
  } else if (manualRefresh) {
    console.warn(
      `⚠️ Existing game dev server at ${origin} has no runtime mode metadata; requested ${devModeLabel}.`,
    )
    return ''
  }

  try {
    const metadataResponse = await fetch(`${origin}/node_modules/.vite/deps/_metadata.json`, {
      signal: AbortSignal.timeout(1500),
    })

    if (!metadataResponse.ok) {
      return ''
    }

    const metadata = await metadataResponse.json()
    const threlteCore = metadata?.optimized?.['@threlte/core']
    const threlteSvelte = metadata?.optimized?.['@threlte/core/svelte']

    if (!threlteCore && !threlteSvelte) {
      console.warn('⚠️ Existing game dev server has an invalid Vite dependency cache. Restarting it.')
      return ''
    }
  } catch {
    return ''
  }

  return origin
}

async function main() {
  const existingOrigin = await hasReusableAppServer()
  if (existingOrigin) {
    await keepAliveForExistingApp(existingOrigin)
    return
  }

  const releaseStartupLock = await acquireStartupLock()
  if (!releaseStartupLock) {
    const lockedOrigin = await hasReusableAppServer()
    if (lockedOrigin) {
      await keepAliveForExistingApp(lockedOrigin)
      return
    }

    throw new Error(
      `Another game dev startup finished without leaving a reusable server at ${appUrl}. Retry after checking the existing process on port ${port}.`,
    )
  }

  try {
    const lockedOrigin = await hasReusableAppServer()
    if (lockedOrigin) {
      await releaseStartupLock()
      await keepAliveForExistingApp(lockedOrigin)
      return
    }

    await cleanupViteCache()
    await assertRequestedPortAvailable()
  } catch (error) {
    await releaseStartupLock?.()
    throw error
  }

  const astroProcess = spawnCommand('pnpm', ['astro', 'dev', '--host', host, '--port', port], {
    env: {
      ...process.env,
      GAME_DEV_MANUAL_REFRESH: manualRefresh ? '1' : '',
    },
  })

  astroProcess.on('exit', (code, signal) => {
    void releaseStartupLock?.()

    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    process.exit(code ?? 0)
  })

  astroProcess.on('error', (error) => {
    console.error('❌ Failed to start game dev server:', error)
    void releaseStartupLock?.()
    process.exit(1)
  })

  process.on('SIGINT', () => astroProcess.kill('SIGINT'))
  process.on('SIGTERM', () => astroProcess.kill('SIGTERM'))

  try {
    const startedAt = Date.now()
    while (Date.now() - startedAt <= startupLockTimeoutMs) {
      const origin = await hasReusableAppServer()
      if (origin) {
        await releaseStartupLock?.()
        return
      }

      if (astroProcess.exitCode !== null) {
        await releaseStartupLock?.()
        return
      }

      await delay(startupLockPollMs)
    }

    console.warn(
      `⚠️ Game dev server did not become reusable within ${startupLockTimeoutMs}ms; releasing startup lock.`,
    )
    await releaseStartupLock?.()
  } catch (error) {
    await releaseStartupLock?.()
    throw error
  }
}

main().catch((error) => {
  console.error('❌ Game dev bootstrap failed:', error)
  process.exit(1)
})
