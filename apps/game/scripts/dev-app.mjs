import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  clearRuntime,
  probeOrigin,
  readRuntime,
  writeRuntime,
} from '../../../scripts/dev-runtime.mjs'

const host = '127.0.0.1'
const requestedPort = String(process.env.GAME_DEV_PORT || 4322)
const autoPort =
  process.env.GAME_DEV_AUTO_PORT === '1' ||
  requestedPort.toLowerCase() === 'auto'
let port =
  requestedPort.toLowerCase() === 'auto'
    ? String(process.env.GAME_DEV_PORT_BASE || 4322)
    : requestedPort
let appUrl = `http://${host}:${port}`
const appRoot = fileURLToPath(new URL('..', import.meta.url))
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))
const runtimeDir = path.join(repoRoot, '.dev-runtime')
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
const autoPortAttempts = Number.parseInt(
  process.env.GAME_DEV_AUTO_PORT_ATTEMPTS || '25',
  10,
)

function setAppPort(nextPort) {
  port = String(nextPort)
  appUrl = `http://${host}:${port}`
}

function getStartupLockDir() {
  const safePort = String(port).replace(/[^a-zA-Z0-9_.-]/g, '_')
  return path.join(runtimeDir, `game-startup-${safePort}.lock`)
}

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

async function writeStartupLockOwner(lockDir) {
  await fs.writeFile(
    path.join(lockDir, 'owner.json'),
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

async function readStartupLockOwner(lockDir) {
  try {
    return JSON.parse(
      await fs.readFile(path.join(lockDir, 'owner.json'), 'utf8'),
    )
  } catch {
    return null
  }
}

function isProcessAlive(pid) {
  const numericPid = Number(pid)
  if (!Number.isFinite(numericPid) || numericPid <= 0) {
    return false
  }

  try {
    process.kill(numericPid, 0)
    return true
  } catch (error) {
    return error?.code === 'EPERM'
  }
}

async function removeStaleStartupLock(lockDir) {
  const owner = await readStartupLockOwner(lockDir)
  if (owner?.pid && !isProcessAlive(owner.pid)) {
    await removeIfPresent(lockDir)
    console.warn(
      `⚠️ Removed stale game dev startup lock for ${owner.origin ?? lockDir}; owner process ${owner.pid} is gone.`,
    )
    return true
  }

  try {
    const stats = await fs.stat(lockDir)
    if (Date.now() - stats.mtimeMs < staleStartupLockMs) {
      return false
    }
  } catch {
    return false
  }

  await removeIfPresent(lockDir)
  console.warn(`⚠️ Removed stale game dev startup lock at ${lockDir}.`)
  return true
}

async function acquireStartupLock() {
  await fs.mkdir(runtimeDir, { recursive: true })
  const lockDir = getStartupLockDir()
  const startedAt = Date.now()
  let loggedWait = false

  while (true) {
    try {
      await fs.mkdir(lockDir)
      await writeStartupLockOwner(lockDir)
      return async () => {
        await removeIfPresent(lockDir)
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

    if (await removeStaleStartupLock(lockDir)) {
      loggedWait = false
      continue
    }

    if (!loggedWait) {
      console.log(
        `⏳ Waiting for another game dev server startup on ${appUrl} instead of starting a second server...`,
      )
      loggedWait = true
    }

    if (Date.now() - startedAt > startupLockTimeoutMs) {
      throw new Error(
        `Timed out waiting for the game dev startup lock at ${lockDir}. If no agent is starting the server, remove that directory and retry.`,
      )
    }

    await delay(startupLockPollMs)
  }
}

async function checkPortAvailable(candidatePort) {
  await new Promise((resolve, reject) => {
    const server = createServer()

    server.once('error', error => {
      reject(error)
    })
    server.listen(Number(candidatePort), host, () => {
      server.close(resolve)
    })
  })
}

async function isPortAvailable(candidatePort) {
  try {
    await checkPortAvailable(candidatePort)
    return true
  } catch (error) {
    if (error?.code === 'EADDRINUSE') {
      return false
    }

    throw error
  }
}

async function selectAutoPortIfNeeded() {
  if (!autoPort) return ''

  const firstPort = Number.parseInt(port, 10)
  if (!Number.isFinite(firstPort)) {
    throw new Error(
      `GAME_DEV_PORT must be numeric or "auto"; received ${JSON.stringify(port)}.`,
    )
  }

  for (let offset = 0; offset < autoPortAttempts; offset += 1) {
    const candidatePort = firstPort + offset
    setAppPort(candidatePort)

    const existingOrigin = await hasReusableAppServer()
    if (existingOrigin) {
      if (String(candidatePort) !== String(firstPort)) {
        console.log(
          `↪️ Game dev port ${firstPort} is occupied; reusing existing server at ${existingOrigin}.`,
        )
      }
      return existingOrigin
    }

    if (await isPortAvailable(candidatePort)) {
      if (String(candidatePort) !== String(firstPort)) {
        console.log(
          `↪️ Game dev port ${firstPort} is occupied; using next available port ${candidatePort}.`,
        )
      }
      return ''
    }
  }

  throw new Error(
    `No available game dev port found from ${firstPort} through ${
      firstPort + autoPortAttempts - 1
    }. Stop an existing server or set GAME_DEV_PORT to a known free port.`,
  )
}

async function assertRequestedPortAvailable() {
  try {
    await checkPortAvailable(port)
  } catch (error) {
    if (error?.code === 'EADDRINUSE') {
      throw new Error(
        `Requested game dev port ${port} is already in use, but no reusable healthy game server is available at ${appUrl}. Stop the existing process or inspect why it is unhealthy before using another GAME_DEV_PORT intentionally.`,
      )
    }

    throw error
  }
}

async function keepAliveForExistingApp(origin) {
  console.log(
    `🎮 Reusing existing ${devModeLabel} game dev server at: ${origin}`,
  )

  await new Promise(resolve => {
    const interval = setInterval(() => {}, 60_000)
    const shutdown = () => {
      clearInterval(interval)
      resolve()
    }

    process.once('SIGINT', shutdown)
    process.once('SIGTERM', shutdown)
  })
}

async function hasReusableAppServer({
  allowMissingRuntimeMetadata = false,
} = {}) {
  const runtime = await readRuntime('game')
  let origin = ''

  if (runtime?.origin === appUrl) {
    if (await probeOrigin(runtime.origin)) {
      origin = runtime.origin
    } else {
      await clearRuntime('game', runtime.pid ?? null)
    }
  } else if (runtime?.origin) {
    if (!(await probeOrigin(runtime.origin))) {
      await clearRuntime('game', runtime.pid ?? null)
    }
  }

  if (!origin && (await probeOrigin(appUrl))) {
    origin = appUrl
  }

  if (!origin) {
    return ''
  }

  if (runtime?.origin === origin) {
    const runtimeManualRefresh = runtime.manualRefresh === true
    if (runtimeManualRefresh !== manualRefresh) {
      console.warn(
        `⚠️ Existing game dev server at ${origin} is running in ${runtimeManualRefresh ? 'manual-refresh' : 'hmr'} mode; requested ${devModeLabel}.`,
      )
      return ''
    }
  } else if (manualRefresh && !allowMissingRuntimeMetadata) {
    console.warn(
      `⚠️ Existing game dev server at ${origin} has no runtime mode metadata; requested ${devModeLabel}.`,
    )
    return ''
  }

  try {
    const metadataResponse = await fetch(
      `${origin}/node_modules/.vite/deps/_metadata.json`,
      {
        signal: AbortSignal.timeout(1500),
      },
    )

    if (!metadataResponse.ok) {
      return ''
    }

    const metadata = await metadataResponse.json()
    const threlteCore = metadata?.optimized?.['@threlte/core']
    const threlteSvelte = metadata?.optimized?.['@threlte/core/svelte']

    if (!threlteCore && !threlteSvelte) {
      console.warn(
        '⚠️ Existing game dev server has an invalid Vite dependency cache. Restarting it.',
      )
      return ''
    }
  } catch {
    return ''
  }

  return origin
}

async function writeSpawnedRuntimeMetadata(pid) {
  await writeRuntime('game', {
    name: 'game',
    pid,
    host,
    port: Number(port),
    origin: appUrl,
    manualRefresh,
    hmr: !manualRefresh,
    updatedAt: new Date().toISOString(),
    source: 'dev-app',
  })
}

async function main() {
  if (autoPort) {
    const autoPortExistingOrigin = await selectAutoPortIfNeeded()
    if (autoPortExistingOrigin) {
      await keepAliveForExistingApp(autoPortExistingOrigin)
      return
    }
  } else {
    const existingOrigin = await hasReusableAppServer()
    if (existingOrigin) {
      await keepAliveForExistingApp(existingOrigin)
      return
    }
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

  const astroProcess = spawnCommand(
    'pnpm',
    ['astro', 'dev', '--host', host, '--port', port, '--strictPort'],
    {
      env: {
        ...process.env,
        GAME_DEV_PORT: port,
        GAME_DEV_MANUAL_REFRESH: manualRefresh ? '1' : '',
      },
    },
  )

  astroProcess.on('exit', (code, signal) => {
    void clearRuntime('game', astroProcess.pid ?? null)
    void releaseStartupLock?.()

    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    process.exit(code ?? 0)
  })

  astroProcess.on('error', error => {
    console.error('❌ Failed to start game dev server:', error)
    void releaseStartupLock?.()
    process.exit(1)
  })

  process.on('SIGINT', () => astroProcess.kill('SIGINT'))
  process.on('SIGTERM', () => astroProcess.kill('SIGTERM'))

  try {
    const startedAt = Date.now()
    while (Date.now() - startedAt <= startupLockTimeoutMs) {
      const origin = await hasReusableAppServer({
        allowMissingRuntimeMetadata: true,
      })
      if (origin) {
        await writeSpawnedRuntimeMetadata(astroProcess.pid ?? process.pid)
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

main().catch(error => {
  console.error('❌ Game dev bootstrap failed:', error)
  process.exit(1)
})
