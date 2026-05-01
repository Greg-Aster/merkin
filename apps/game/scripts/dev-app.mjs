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

  await cleanupViteCache()

  const astroProcess = spawnCommand('pnpm', ['astro', 'dev', '--host', host, '--port', port], {
    env: {
      ...process.env,
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
}

main().catch((error) => {
  console.error('❌ Game dev bootstrap failed:', error)
  process.exit(1)
})
