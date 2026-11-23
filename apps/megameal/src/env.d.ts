/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

declare module 'howler' {
  export class Howl {
    [key: string]: any
    constructor(options?: any)
  }

  export const Howler: any
}

declare module 'postcss-import' {
  import type { Plugin } from 'postcss'

  const postcssImport: (options?: Record<string, unknown>) => Plugin
  export default postcssImport
}

declare module '*.cjs' {
  const value: unknown
  export default value
}

interface Window {
  THREE?: unknown
}
