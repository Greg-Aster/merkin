import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { getHealthyRuntimeOrigin } from '../../../scripts/dev-runtime.mjs'

const host = '127.0.0.1'
const port = String(process.env.GAME_DEV_PORT || 4322)
const appUrl = `http://${host}:${port}`
const appRoot = fileURLToPath(new URL('..', import.meta.url))
const viteCacheDir = path.join(appRoot, 'node_modules', '.vite')
const toolsUrl = String(process.env.PUBLIC_EDITOR_API_BASE || process.env.EDITOR_API_BASE || 'http://127.0.0.1:3001').replace(/\/+$/, '')

function spawnCommand(command, args, options = {}) {
  return spawn(command, args, {
    stdio: 'inherit',
    ...options,
  })
}

async function removeIfPresent(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true })
}

async function cleanupViteCache() {
  await removeIfPresent(viteCacheDir)
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function ensureToolsBridge() {
  const existingOrigin = await getHealthyRuntimeOrigin('tools', toolsUrl)
  if (existingOrigin) {
    return null
  }

  const toolsProcess = spawnCommand('pnpm', ['dev:tools'], {
    cwd: appRoot,
    env: {
      ...process.env,
    },
  })

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const healthyOrigin = await getHealthyRuntimeOrigin('tools', toolsUrl)
    if (healthyOrigin) {
      console.log(`🛠️ Tools bridge ready at: ${healthyOrigin}`)
      return toolsProcess
    }

    if (toolsProcess.exitCode !== null) {
      throw new Error(`Tools bridge exited before becoming healthy (code ${toolsProcess.exitCode}).`)
    }

    await sleep(250)
  }

  toolsProcess.kill('SIGTERM')
  throw new Error(`Tools bridge did not become healthy at ${toolsUrl}.`)
}

async function keepAliveForExistingApp(origin) {
  console.log(`🎮 Reusing existing game dev server at: ${origin}`)

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

  const toolsProcess = await ensureToolsBridge()
  await cleanupViteCache()

  const astroProcess = spawnCommand('pnpm', ['astro', 'dev', '--host', host, '--port', port], {
    env: {
      ...process.env,
      GAME_EDITOR_AUTOSTART_TOOLS: '0',
    },
  })

  astroProcess.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    process.exit(code ?? 0)
  })

  astroProcess.on('error', (error) => {
    console.error('❌ Failed to start game dev server:', error)
    process.exit(1)
  })

  process.on('SIGINT', () => astroProcess.kill('SIGINT'))
  process.on('SIGTERM', () => astroProcess.kill('SIGTERM'))
  astroProcess.on('exit', () => {
    if (toolsProcess && toolsProcess.exitCode === null) {
      toolsProcess.kill('SIGTERM')
    }
  })
}

main().catch((error) => {
  console.error('❌ Game dev bootstrap failed:', error)
  process.exit(1)
})
