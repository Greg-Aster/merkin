type NavigatorWithMediaHints = Navigator & {
  connection?: {
    effectiveType?: string
    saveData?: boolean
  }
  deviceMemory?: number
}

export type RichMediaCapabilities = {
  compactViewport: boolean
  deviceMemory: number | undefined
  devicePixelRatio: number
  lowMemoryDevice: boolean
  reducedData: boolean
  shouldAutoload: boolean
}

type IdleWindow = Window & {
  cancelIdleCallback?: (handle: number) => void
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number
}

type RichMediaActivationOptions = {
  fallbackDelayMs?: number
  idleTimeoutMs?: number
}

export function getRichMediaCapabilities(): RichMediaCapabilities {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      compactViewport: false,
      deviceMemory: undefined,
      devicePixelRatio: 1,
      lowMemoryDevice: false,
      reducedData: false,
      shouldAutoload: false,
    }
  }

  const nav = navigator as NavigatorWithMediaHints
  const effectiveType = nav.connection?.effectiveType ?? ''
  const deviceMemory = nav.deviceMemory
  const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1)
  const compactViewport = window.innerWidth <= 760 || window.innerHeight <= 640
  const reducedData =
    nav.connection?.saveData === true || /(^|-)2g$/.test(effectiveType)
  const lowMemoryDevice = typeof deviceMemory === 'number' && deviceMemory <= 4
  const shouldAutoload =
    !compactViewport &&
    !reducedData &&
    effectiveType !== '3g' &&
    (typeof deviceMemory !== 'number' || deviceMemory > 2)

  return {
    compactViewport,
    deviceMemory,
    devicePixelRatio,
    lowMemoryDevice,
    reducedData,
    shouldAutoload,
  }
}

export function scheduleRichMediaActivation(
  activate: () => void,
  {
    fallbackDelayMs = 2800,
    idleTimeoutMs = 3200,
  }: RichMediaActivationOptions = {},
): () => void {
  if (typeof window === 'undefined') return () => {}

  const idleWindow = window as IdleWindow
  let cancelled = false
  let firstFrame = 0
  let secondFrame = 0
  let fallbackTimeout = 0
  let idleHandle = 0

  const clearHandles = () => {
    if (firstFrame) window.cancelAnimationFrame(firstFrame)
    if (secondFrame) window.cancelAnimationFrame(secondFrame)
    if (fallbackTimeout) window.clearTimeout(fallbackTimeout)
    if (idleHandle) idleWindow.cancelIdleCallback?.(idleHandle)
    firstFrame = 0
    secondFrame = 0
    fallbackTimeout = 0
    idleHandle = 0
  }

  const run = () => {
    if (cancelled) return
    clearHandles()
    activate()
  }

  firstFrame = window.requestAnimationFrame(() => {
    firstFrame = 0
    secondFrame = window.requestAnimationFrame(() => {
      secondFrame = 0
      if (cancelled) return

      fallbackTimeout = window.setTimeout(run, fallbackDelayMs)
      idleHandle =
        idleWindow.requestIdleCallback?.(run, { timeout: idleTimeoutMs }) ?? 0
    })
  })

  return () => {
    cancelled = true
    clearHandles()
  }
}
