export const retiredPublicRouteRedirects = {
  '/configs/': '/',
  '/friends/': '/community/',
  '/login/': '/',
  '/store-placeholder/': '/store/',
  '/test-portal/': '/',
} as const

export type RetiredPublicRoute = keyof typeof retiredPublicRouteRedirects

export function normalizeRoutePath(pathname: string) {
  const [pathOnly = '/'] = pathname.split(/[?#]/)
  if (pathOnly === '/') return '/'
  return pathOnly.endsWith('/') ? pathOnly : `${pathOnly}/`
}

export function getRetiredPublicRouteTarget(pathname: RetiredPublicRoute) {
  return retiredPublicRouteRedirects[pathname]
}
