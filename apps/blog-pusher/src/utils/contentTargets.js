export const CONTENT_TYPES = [
  {
    id: 'posts',
    label: 'Posts',
    shortLabel: 'Post',
    description: 'Long-form published articles in the posts collection.',
    routeBase: '/posts',
  },
  {
    id: 'updates',
    label: 'Updates',
    shortLabel: 'Update',
    description: 'Journal feeds and shorter update streams in the updates collection.',
    routeBase: '/updates',
  },
]

export const CONTENT_TYPE_MAP = Object.fromEntries(
  CONTENT_TYPES.map(type => [type.id, type])
)

export function getContentTypeMeta(contentType = 'posts') {
  return CONTENT_TYPE_MAP[contentType] || CONTENT_TYPE_MAP.posts
}

export function getDefaultContentPaths(siteId) {
  switch (siteId) {
    case 'temporal':
      return {
        posts: 'Temporal-Flow/src/content/posts',
        updates: 'Temporal-Flow/src/content/updates',
      }
    case 'dndiy':
      return {
        posts: 'DNDIY.github.io/src/content/posts',
        updates: 'DNDIY.github.io/src/content/updates',
      }
    case 'travel':
      return {
        posts: 'apps/travel/src/content/posts',
        updates: 'apps/travel/src/content/updates',
      }
    case 'megameal':
      return {
        posts: 'apps/megameal/src/content/posts',
        updates: 'apps/megameal/src/content/updates',
      }
    default:
      return {
        posts: '',
        updates: '',
      }
  }
}

export function inferContentTypeFromPath(path = '') {
  const normalized = String(path || '').trim().replace(/^\/+|\/+$/g, '').toLowerCase()
  if (normalized.includes('/content/updates')) return 'updates'
  return 'posts'
}

export function inferContentPathFromLegacy(path = '', contentType = 'posts') {
  const normalized = String(path || '').trim().replace(/^\/+|\/+$/g, '')
  if (!normalized) return ''
  if (contentType === 'updates') {
    return normalized.replace(/\/content\/posts(?=\/|$)/, '/content/updates')
  }
  return normalized
}

export function normalizeSiteContentPaths(site = {}) {
  const defaults = getDefaultContentPaths(site.id)
  const savedPaths = site.contentPaths || {}
  const legacyPath = typeof site.path === 'string' ? site.path : ''
  const normalizedPosts = String(
    savedPaths.posts ||
      inferContentPathFromLegacy(legacyPath, 'posts') ||
      defaults.posts
  ).trim()
  const normalizedUpdates = String(
    savedPaths.updates ||
      inferContentPathFromLegacy(legacyPath, 'updates') ||
      defaults.updates
  ).trim()

  return {
    posts: normalizedPosts || defaults.posts,
    updates: normalizedUpdates || defaults.updates,
  }
}

export function getSiteContentPath(site = {}, contentType = 'posts') {
  const contentPaths = normalizeSiteContentPaths(site)
  return contentType === 'updates' ? contentPaths.updates : contentPaths.posts
}

export function getContentRoutePath(contentType = 'posts', slug = '') {
  const meta = getContentTypeMeta(contentType)
  const cleanSlug = String(slug || '').trim().replace(/^\/+|\/+$/g, '')
  if (!cleanSlug) return `${meta.routeBase}/`
  return `${meta.routeBase}/${cleanSlug}/`
}
