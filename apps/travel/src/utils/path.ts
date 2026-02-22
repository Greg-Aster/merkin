export function withBase(path = ''): string {
  const base = import.meta.env.BASE_URL || '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const cleanedPath = path.replace(/^\/+/, '')
  return `${normalizedBase}${cleanedPath}`
}
