import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEV_RUNTIME_DIR = path.join(REPO_ROOT, '.dev-runtime')

function normalizeLoopbackHost(host) {
  if (!host || host === '::' || host === '::1' || host === '0.0.0.0') {
    return '127.0.0.1'
  }

  return host
}

export function getRuntimeFilePath(name) {
  return path.join(DEV_RUNTIME_DIR, `${name}.json`)
}

export async function ensureRuntimeDir() {
  await fsp.mkdir(DEV_RUNTIME_DIR, { recursive: true })
}

export async function readRuntime(name) {
  try {
    const payload = await fsp.readFile(getRuntimeFilePath(name), 'utf8')
    return JSON.parse(payload)
  } catch {
    return null
  }
}

export function readRuntimeSync(name) {
  try {
    const payload = fs.readFileSync(getRuntimeFilePath(name), 'utf8')
    return JSON.parse(payload)
  } catch {
    return null
  }
}

export async function writeRuntime(name, payload) {
  await ensureRuntimeDir()
  await fsp.writeFile(getRuntimeFilePath(name), JSON.stringify(payload, null, 2))
}

export async function clearRuntime(name, pid = null) {
  const existing = await readRuntime(name)
  if (!existing) return

  if (pid !== null && existing.pid && existing.pid !== pid) {
    return
  }

  try {
    await fsp.unlink(getRuntimeFilePath(name))
  } catch {}
}

export async function probeOrigin(origin, timeoutMs = 1500) {
  try {
    const response = await fetch(origin, {
      signal: AbortSignal.timeout(timeoutMs),
    })

    return response.ok || response.status < 500
  } catch {
    return false
  }
}

export async function getHealthyRuntimeOrigin(name, fallbackOrigin = '') {
  const runtime = await readRuntime(name)
  if (runtime?.origin && await probeOrigin(runtime.origin)) {
    return runtime.origin
  }

  if (runtime) {
    await clearRuntime(name, runtime.pid ?? null)
  }

  if (fallbackOrigin && await probeOrigin(fallbackOrigin)) {
    return fallbackOrigin
  }

  return ''
}

export function createDevRuntimePlugin(
  name,
  fallbackHost = '127.0.0.1',
  metadata = {},
) {
  return {
    name: `merkin-dev-runtime-${name}`,
    apply: 'serve',
    configureServer(server) {
      const persistRuntime = async () => {
        const address = server.httpServer?.address()
        if (!address || typeof address === 'string') return

        const host = normalizeLoopbackHost(address.address || fallbackHost)
        const port = address.port
        const origin = `http://${host}:${port}`

        await writeRuntime(name, {
          name,
          pid: process.pid,
          host,
          port,
          origin,
          ...metadata,
          updatedAt: new Date().toISOString(),
        })
      }

      const cleanup = () => {
        void clearRuntime(name, process.pid)
      }

      if (server.httpServer?.listening) {
        void persistRuntime()
      } else {
        server.httpServer?.once('listening', () => {
          void persistRuntime()
        })
      }

      server.httpServer?.once('close', cleanup)
      process.once('SIGINT', cleanup)
      process.once('SIGTERM', cleanup)
      process.once('exit', cleanup)
    },
  }
}
