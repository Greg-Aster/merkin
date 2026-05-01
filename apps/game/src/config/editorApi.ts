const DEFAULT_EDITOR_API_BASE = ''

export const EDITOR_API_BASE = String(
  import.meta.env?.PUBLIC_EDITOR_API_BASE || DEFAULT_EDITOR_API_BASE,
).replace(/\/+$/, '')
