type Env = {
  MAIN_SITE_ORIGIN: string
  GAME_SITE_ORIGIN: string
  GAME_STRIP_PREFIX?: string
  GAME_PREFIX?: string
}

const DEFAULT_GAME_PREFIX = '/game'
const STATIC_ASSET_PATTERN =
  /\.(?:avif|css|gif|ico|jpg|jpeg|js|json|map|mp3|mp4|ogg|png|svg|txt|wav|webm|webp|woff|woff2|xml)$/i
const HTML_CONTENT_TYPE_PATTERN = /\btext\/html\b/i

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, '')
}

function getGamePrefix(env: Env): string {
  const prefix = env.GAME_PREFIX?.trim() || DEFAULT_GAME_PREFIX
  return prefix.startsWith('/') ? prefix.replace(/\/+$/, '') || DEFAULT_GAME_PREFIX : `/${prefix.replace(/\/+$/, '')}`
}

function shouldStripGamePrefix(env: Env): boolean {
  return (env.GAME_STRIP_PREFIX || 'false').toLowerCase() === 'true'
}

function isGameRequest(pathname: string, gamePrefix: string): boolean {
  return pathname === gamePrefix || pathname.startsWith(`${gamePrefix}/`)
}

function buildUpstreamUrl(
  requestUrl: URL,
  upstreamOrigin: string,
  options: {
    gamePrefix?: string
    stripGamePrefix?: boolean
  } = {},
): URL {
  const targetUrl = new URL(requestUrl.toString())
  const originUrl = new URL(normalizeOrigin(upstreamOrigin))

  targetUrl.protocol = originUrl.protocol
  targetUrl.username = originUrl.username
  targetUrl.password = originUrl.password
  targetUrl.host = originUrl.host

  if (options.gamePrefix && options.stripGamePrefix) {
    const strippedPath = targetUrl.pathname.slice(options.gamePrefix.length) || '/'
    targetUrl.pathname = strippedPath.startsWith('/') ? strippedPath : `/${strippedPath}`
  }

  return targetUrl
}

function cloneRequestForProxy(request: Request, upstreamUrl: URL): Request {
  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.set('x-forwarded-host', new URL(request.url).host)
  headers.set('x-forwarded-proto', new URL(request.url).protocol.replace(':', ''))

  return new Request(upstreamUrl.toString(), {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
  })
}

function applyCachePolicy(
  responseHeaders: Headers,
  request: Request,
  upstreamUrl: URL,
): void {
  if (request.method !== 'GET') return

  const contentType = responseHeaders.get('content-type') ?? ''
  const isHtmlResponse = HTML_CONTENT_TYPE_PATTERN.test(contentType)
  const isStaticAssetRequest = STATIC_ASSET_PATTERN.test(upstreamUrl.pathname)

  if (isHtmlResponse) {
    responseHeaders.set('cache-control', 'no-cache, no-store, must-revalidate')
    responseHeaders.set('pragma', 'no-cache')
    responseHeaders.set('expires', '0')
    return
  }

  if (!responseHeaders.has('cache-control')) {
    responseHeaders.set(
      'cache-control',
      isStaticAssetRequest
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=300',
    )
  }
}

async function proxyRequest(
  request: Request,
  upstreamUrl: URL,
): Promise<Response> {
  const upstreamRequest = cloneRequestForProxy(request, upstreamUrl)
  const upstreamResponse = await fetch(upstreamRequest)
  const responseHeaders = new Headers(upstreamResponse.headers)

  applyCachePolicy(responseHeaders, request, upstreamUrl)

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  })
}

function validateEnv(env: Env): string | null {
  if (!env.MAIN_SITE_ORIGIN) return 'MAIN_SITE_ORIGIN is not configured.'
  if (!env.GAME_SITE_ORIGIN) return 'GAME_SITE_ORIGIN is not configured.'
  return null
}

export default {
  async fetch(request, env): Promise<Response> {
    const configError = validateEnv(env)
    if (configError) {
      return new Response(configError, { status: 500 })
    }

    const requestUrl = new URL(request.url)
    const gamePrefix = getGamePrefix(env)
    const isGamePath = isGameRequest(requestUrl.pathname, gamePrefix)

    const upstreamUrl = isGamePath
      ? buildUpstreamUrl(requestUrl, env.GAME_SITE_ORIGIN, {
          gamePrefix,
          stripGamePrefix: shouldStripGamePrefix(env),
        })
      : buildUpstreamUrl(requestUrl, env.MAIN_SITE_ORIGIN)

    return proxyRequest(request, upstreamUrl)
  },
} satisfies ExportedHandler<Env>
