/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_EDITOR_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Performance {
  memory?: {
    usedJSHeapSize: number
  }
}

interface Window {
  THREE?: unknown
}

declare module '*.glsl?raw' {
  const source: string
  export default source
}
