import http from 'node:http'
import httpProxy from 'http-proxy'
import { readRuntime } from './dev-runtime.mjs'

const PROXY_PORT = Number.parseInt(process.env.UNIFIED_PORT || '8787', 10)
const DEFAULT_SITE_TARGET = process.env.SITE_DEV_ORIGIN || 'http://127.0.0.1:4321'
const DEFAULT_GAME_TARGET = process.env.GAME_DEV_ORIGIN || 'http://127.0.0.1:4322'
const GAME_PREFIX = normalizePrefix(process.env.GAME_PREFIX || '/game')

const DEV_ASSET_PREFIXES = [
  '/_astro/',
  '/@fs/',
  '/@id/',
  '/@vite/',
  '/src/',
  '/node_modules/',
]

const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  ws: true,
  xfwd: true,
  secure: false,
})

proxy.on('error', (error, req, resOrSocket) => {
  const message = `Unified dev proxy failed for ${req?.url || '<unknown>'}: ${error.message}`

  if (resOrSocket && typeof resOrSocket.writeHead === 'function') {
    resOrSocket.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' })
    resOrSocket.end(message)
    return
  }

  if (resOrSocket && typeof resOrSocket.end === 'function') {
    resOrSocket.end(message)
  }
})

function normalizePrefix(prefix) {
  if (!prefix || prefix === '/') return '/game'
  const trimmed = prefix.replace(/^\/+|\/+$/g, '')
  return trimmed ? `/${trimmed}` : '/game'
}

function getPathname(req) {
  return new URL(req.url || '/', 'http://localhost').pathname
}

function getRefererPathname(req) {
  const referer = req.headers.referer
  if (!referer) return ''

  try {
    return new URL(referer).pathname
  } catch {
    return ''
  }
}

function isGamePath(pathname) {
  return pathname === GAME_PREFIX || pathname.startsWith(`${GAME_PREFIX}/`)
}

function isAmbiguousDevAssetPath(pathname) {
  return DEV_ASSET_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

function wantsGameTarget(req) {
  const pathname = getPathname(req)

  if (isGamePath(pathname)) return true

  if (!isAmbiguousDevAssetPath(pathname)) return false

  return isGamePath(getRefererPathname(req))
}

function rewritePathForTarget(req, isGameTarget) {
  if (!isGameTarget) return req.url || '/'

  const requestUrl = new URL(req.url || '/', 'http://localhost')

  if (requestUrl.pathname === GAME_PREFIX) {
    requestUrl.pathname = '/'
  } else if (requestUrl.pathname.startsWith(`${GAME_PREFIX}/`)) {
    requestUrl.pathname = requestUrl.pathname.slice(GAME_PREFIX.length) || '/'
  }

  return `${requestUrl.pathname}${requestUrl.search}`
}

function proxyRequest(req, res) {
  const useGameTarget = wantsGameTarget(req)
  const originalUrl = req.url

  req.url = rewritePathForTarget(req, useGameTarget)
  res.on('finish', () => {
    req.url = originalUrl
  })
  res.on('close', () => {
    req.url = originalUrl
  })

  void resolveTarget(useGameTarget).then((target) => {
    proxy.web(req, res, { target })
  })
}

function proxyUpgrade(req, socket, head) {
  const useGameTarget = wantsGameTarget(req)
  const originalUrl = req.url

  req.url = rewritePathForTarget(req, useGameTarget)
  socket.on('close', () => {
    req.url = originalUrl
  })

  void resolveTarget(useGameTarget).then((target) => {
    proxy.ws(req, socket, head, { target })
  })
}

async function resolveTarget(useGameTarget) {
  const runtime = await readRuntime(useGameTarget ? 'game' : 'megameal')
  if (runtime?.origin) {
    return runtime.origin
  }

  return useGameTarget ? DEFAULT_GAME_TARGET : DEFAULT_SITE_TARGET
}

const server = http.createServer(proxyRequest)
server.on('upgrade', proxyUpgrade)

server.listen(PROXY_PORT, () => {
  console.log(`Unified dev proxy listening on http://127.0.0.1:${PROXY_PORT}`)
  console.log(`  /        -> megameal runtime (fallback ${DEFAULT_SITE_TARGET})`)
  console.log(`  ${GAME_PREFIX}/* -> game runtime (fallback ${DEFAULT_GAME_TARGET})`)
})
