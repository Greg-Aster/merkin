export const routeStyleBundleNames = [
  'about',
  'archive',
  'banner',
  'community',
  'facts-widget',
  'featured-product-lab',
  'home',
  'listing',
  'post',
  'privacy',
  'quiz',
  'reader',
  'site',
  'snuggaloids',
  'store',
  'store-product',
  'timeline',
  'video',
  'videos-index',
] as const

export type RouteStyleBundleName = (typeof routeStyleBundleNames)[number]

export function routeStyleHref(bundle: RouteStyleBundleName): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`

  return `${base}styles/routes/${bundle}.css`
}
