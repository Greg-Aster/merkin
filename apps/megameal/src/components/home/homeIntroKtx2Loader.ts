import type { WebGLRenderer } from 'three'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'

let sharedLoader: KTX2Loader | null = null
let sharedRenderer: WebGLRenderer | null = null
let references = 0

export function retainHomeIntroKtx2Loader() {
  references += 1
}

export function releaseHomeIntroKtx2Loader() {
  references = Math.max(0, references - 1)

  if (references > 0) return

  sharedLoader?.dispose()
  sharedLoader = null
  sharedRenderer = null
}

export function getHomeIntroKtx2Loader(renderer: WebGLRenderer | null | undefined) {
  if (typeof window === 'undefined' || !renderer) return null

  sharedLoader ??= new KTX2Loader()
    .setTranscoderPath('/assets/vendor/basis/')
    .setWorkerLimit(1)

  if (sharedRenderer !== renderer) {
    sharedLoader.detectSupport(renderer)
    sharedRenderer = renderer
  }

  return sharedLoader
}
