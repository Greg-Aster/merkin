/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

declare module 'howler' {
  export class Howl {
    [key: string]: any
    constructor(options?: any)
  }

  export const Howler: any
}

interface Window {
  THREE?: unknown
}
