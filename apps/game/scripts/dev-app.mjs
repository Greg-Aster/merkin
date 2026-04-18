import { spawn } from 'node:child_process'

const host = '127.0.0.1'
const port = String(process.env.GAME_DEV_PORT || 4322)
const appUrl = `http://${host}:${port}`

function spawnCommand(command, args, options = {}) {
  return spawn(command, args, {
    stdio: 'inherit',
    ...options,
  })
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', (code, signal) => resolve({ code, signal }))
  })
}

async function hasReusableAppServer() {
  try {
    const response = await fetch(appUrl, {
      signal: AbortSignal.timeout(1500),
    })
    return response.ok
  } catch {
    return false
  }
}

async function keepAliveForExistingApp() {
  console.log(`🎮 Reusing existing game dev server at: ${appUrl}`)

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

async function main() {
  const syncProcess = spawnCommand('pnpm', ['sync:onnx-runtime'], {
    env: process.env,
  })
  const syncResult = await waitForExit(syncProcess)

  if (syncResult.signal) {
    process.kill(process.pid, syncResult.signal)
    return
  }

  if ((syncResult.code ?? 0) !== 0) {
    process.exit(syncResult.code ?? 1)
  }

  if (await hasReusableAppServer()) {
    await keepAliveForExistingApp()
    return
  }

  const astroProcess = spawnCommand('pnpm', ['astro', 'dev', '--host', host, '--port', port], {
    env: process.env,
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
