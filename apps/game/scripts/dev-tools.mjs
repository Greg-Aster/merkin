import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const DEFAULT_EDITOR_API_BASE = 'http://127.0.0.1:3001'
const toolsEntry = fileURLToPath(new URL('../../../tools/legacy-megameal-tools/app.cjs', import.meta.url))

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_EDITOR_API_BASE).replace(/\/+$/, '')
}

function resolveEditorApiBase() {
  return normalizeBaseUrl(process.env.PUBLIC_EDITOR_API_BASE || process.env.EDITOR_API_BASE)
}

function resolveToolsPort(baseUrl) {
  const explicitPort = process.env.MEGAMEAL_TOOLS_PORT || process.env.EDITOR_API_PORT || process.env.PORT
  if (explicitPort) return explicitPort

  try {
    const parsed = new URL(baseUrl)
    if (parsed.port) return parsed.port
    return parsed.protocol === 'https:' ? '443' : '80'
  } catch {
    return '3001'
  }
}

async function hasReusableBridge(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/level-registry`, {
      signal: AbortSignal.timeout(1500),
    })
    if (response.ok) {
      const payload = await response.json().catch(() => null)
      if (payload && typeof payload === 'object' && 'success' in payload) {
        return true
      }
    }
  } catch {}

  try {
    const response = await fetch(`${baseUrl}/favicon.ico`, {
      signal: AbortSignal.timeout(1500),
    })
    return response.status === 204
  } catch {
    return false
  }
}

async function keepAliveForExistingBridge(baseUrl) {
  console.log(`🛠️  Reusing existing tools bridge at: ${baseUrl}`)

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
  const editorApiBase = resolveEditorApiBase()

  if (await hasReusableBridge(editorApiBase)) {
    await keepAliveForExistingBridge(editorApiBase)
    return
  }

  const child = spawn('node', [toolsEntry], {
    stdio: 'inherit',
    env: {
      ...process.env,
      MEGAMEAL_TOOLS_PORT: resolveToolsPort(editorApiBase),
    },
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    process.exit(code ?? 0)
  })

  child.on('error', (error) => {
    console.error('❌ Failed to start tools bridge:', error)
    process.exit(1)
  })

  process.on('SIGINT', () => child.kill('SIGINT'))
  process.on('SIGTERM', () => child.kill('SIGTERM'))
}

main().catch((error) => {
  console.error('❌ Tools bridge bootstrap failed:', error)
  process.exit(1)
})
