const DEFAULT_EDITOR_API_BASE = import.meta.env?.DEV ? 'http://127.0.0.1:3001' : '/api/tools'

export const EDITOR_API_BASE = String(import.meta.env?.PUBLIC_EDITOR_API_BASE || DEFAULT_EDITOR_API_BASE).replace(/\/+$/, '')
