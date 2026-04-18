const DEFAULT_EDITOR_API_BASE = 'http://localhost:3001'

export const EDITOR_API_BASE = String(import.meta.env.PUBLIC_EDITOR_API_BASE || DEFAULT_EDITOR_API_BASE).replace(/\/+$/, '')
