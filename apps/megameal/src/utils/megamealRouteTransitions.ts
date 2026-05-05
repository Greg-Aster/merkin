type MegamealRouteTransitionKind = 'default' | 'portal-zoom'

export interface MegamealRouteTransitionOptions {
  href: string
  type?: MegamealRouteTransitionKind
  sourceRect?: DOMRect | null
  previewSrc?: string
  event?: MouseEvent | PointerEvent
}

interface MegamealRouteTransitionApi {
  navigate: (options: MegamealRouteTransitionOptions) => void
}

declare global {
  interface Window {
    megamealRouteTransitions?: MegamealRouteTransitionApi
    __megamealRouteTransitionsInitialized?: boolean
  }
}

const arrivalStorageKey = 'megameal:route-transition-arrival'
const revealDurationMs = 680
const arrivalSettleDelayMs = 260
const hardNavigationDelayMs = 300
const routeReadyTimeoutMs = 3000
const visualReadyTimeoutMs = 1600
const visibleImageDecodeTimeoutMs = 1200

let active = false

function getReducedMotionPreference() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getInternalUrl(href: string) {
  try {
    const url = new URL(href, window.location.href)
    return url.origin === window.location.origin ? url : null
  } catch {
    return null
  }
}

function isSamePageHash(url: URL) {
  return (
    url.pathname === window.location.pathname &&
    url.search === window.location.search &&
    !!url.hash
  )
}

function shouldSkipEvent(event?: MouseEvent | PointerEvent) {
  return (
    !!event &&
    (event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0)
  )
}

function toRelativeHref(url: URL) {
  return `${url.pathname}${url.search}${url.hash}`
}

function isTimelineRoute(url: URL) {
  return url.pathname.replace(/\/$/, '') === '/timeline'
}

function getRouteReadyContainers() {
  return [
    document.querySelector<HTMLElement>('#banner-container'),
    document.querySelector<HTMLElement>('#main-grid'),
  ].filter((container): container is HTMLElement => !!container)
}

function nextPaint() {
  return new Promise<void>(resolve => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve())
    })
  })
}

function wait(duration: number) {
  return new Promise<void>(resolve => {
    window.setTimeout(resolve, duration)
  })
}

function directNavigate(url: URL) {
  const href = toRelativeHref(url)

  window.location.assign(href)
}

function getFallbackRect() {
  const width = Math.min(window.innerWidth * 0.58, 760)
  const height = width * 0.56
  return new DOMRect(
    (window.innerWidth - width) / 2,
    window.innerHeight * 0.42 - height / 2,
    width,
    height,
  )
}

function ensureOverlay() {
  const existing = document.querySelector<HTMLElement>('.megameal-route-transition')
  if (existing) return existing

  const overlay = document.createElement('div')
  overlay.className = 'megameal-route-transition'
  overlay.setAttribute('aria-hidden', 'true')
  overlay.innerHTML = `
    <div class="megameal-route-transition__frame"></div>
    <div class="megameal-route-transition__shade"></div>
  `
  document.body.append(overlay)
  return overlay
}

function setOverlayStart(overlay: HTMLElement, rect: DOMRect, previewSrc?: string) {
  overlay.style.setProperty('--megameal-route-left', `${rect.left}px`)
  overlay.style.setProperty('--megameal-route-top', `${rect.top}px`)
  overlay.style.setProperty('--megameal-route-width', `${rect.width}px`)
  overlay.style.setProperty('--megameal-route-height', `${rect.height}px`)

  const frame = overlay.querySelector<HTMLElement>('.megameal-route-transition__frame')
  if (!frame) return

  if (previewSrc) {
    frame.style.backgroundImage = `url("${previewSrc}")`
  } else {
    frame.style.removeProperty('background-image')
  }
}

function revealOverlay(overlay: HTMLElement) {
  if (overlay.dataset.state === 'revealing') return

  overlay.dataset.state = 'revealing'

  window.setTimeout(() => {
    overlay.remove()
    document.documentElement.classList.remove(
      'megameal-route-transition-active',
      'megameal-route-transition--portal-zoom',
      'megameal-route-transition--default',
    )
    active = false
  }, revealDurationMs)
}

function waitForRouteReady(url: URL) {
  return new Promise<void>(resolve => {
    const startedAt = performance.now()

    const checkTimelineReady = () => {
      if (!isTimelineRoute(url)) return true

      const timelineShell = document.querySelector<HTMLElement>(
        '[data-timeline-shell="true"]',
      )
      const timelineBannerWrapper = document.querySelector<HTMLElement>(
        '[data-timeline-banner-wrapper="true"]',
      )
      const timelineShellReady = timelineShell?.dataset.timelineInitialized === 'true'
      const timelineBannerReady =
        !timelineBannerWrapper ||
        timelineBannerWrapper.dataset.timelineBannerInitialized === 'true'

      return timelineShellReady && timelineBannerReady
    }

    const checkVisualReady = () => {
      const containers = getRouteReadyContainers()
      const pendingAnimation = containers.some(container =>
        !!container.querySelector('.onload-animation:not(.loaded)'),
      )

      return containers.length > 0 && !pendingAnimation
    }

    const checkReady = () => {
      const elapsed = performance.now() - startedAt
      const routeTimedOut = elapsed > routeReadyTimeoutMs
      const visualTimedOut = elapsed > visualReadyTimeoutMs

      if (
        (checkTimelineReady() || routeTimedOut) &&
        (checkVisualReady() || visualTimedOut)
      ) {
        void waitForVisibleImages().then(() => {
          void nextPaint().then(() => {
            void wait(arrivalSettleDelayMs).then(resolve)
          })
        })
        return
      }

      window.setTimeout(checkReady, 50)
    }

    checkReady()
  })
}

function getVisibleImages() {
  return getRouteReadyContainers()
    .flatMap(container => Array.from(container.querySelectorAll('img')))
    .filter(image => {
      const bounds = image.getBoundingClientRect()
      return (
        bounds.width > 8 &&
        bounds.height > 8 &&
        bounds.bottom > 0 &&
        bounds.right > 0 &&
        bounds.top < window.innerHeight &&
        bounds.left < window.innerWidth
      )
    })
}

function waitForVisibleImages() {
  const images = getVisibleImages().filter(image => !image.complete)

  if (images.length === 0) return Promise.resolve()

  return Promise.race([
    Promise.all(
      images.map(image =>
        typeof image.decode === 'function'
          ? image.decode().catch(() => undefined)
          : new Promise(resolve => {
              image.addEventListener('load', resolve, { once: true })
              image.addEventListener('error', resolve, { once: true })
            }),
      ),
    ).then(() => undefined),
    wait(visibleImageDecodeTimeoutMs),
  ])
}

function storeHardNavigationArrival(url: URL) {
  try {
    window.sessionStorage.setItem(
      arrivalStorageKey,
      JSON.stringify({ pathname: url.pathname, search: url.search }),
    )
  } catch {
    // The navigation still works if session storage is unavailable.
  }
}

function consumeHardNavigationArrival() {
  let stored: { pathname?: string; search?: string } | null = null

  try {
    const rawValue = window.sessionStorage.getItem(arrivalStorageKey)
    window.sessionStorage.removeItem(arrivalStorageKey)
    stored = rawValue ? JSON.parse(rawValue) : null
  } catch {
    stored = null
  }

  if (
    !stored ||
    stored.pathname !== window.location.pathname ||
    (stored.search ?? '') !== window.location.search
  ) {
    return
  }

  active = true
  const overlay = ensureOverlay()
  overlay.dataset.state = 'arrived'
  document.documentElement.classList.add(
    'megameal-route-transition-active',
    'megameal-route-transition--default',
  )
  const currentUrl = new URL(window.location.href)
  void waitForRouteReady(currentUrl).then(() => {
    if (active) revealOverlay(overlay)
  })
}

export function navigateWithMegamealTransition(options: MegamealRouteTransitionOptions) {
  if (typeof window === 'undefined') return

  const url = getInternalUrl(options.href)
  if (shouldSkipEvent(options.event)) return

  if (!url) {
    if (!options.event) window.location.assign(options.href)
    return
  }

  options.event?.preventDefault()

  if (isSamePageHash(url)) {
    directNavigate(url)
    return
  }

  if (getReducedMotionPreference()) {
    directNavigate(url)
    return
  }

  if (active) return

  active = true

  const overlay = ensureOverlay()
  const type = options.type ?? 'default'
  const sourceRect = options.sourceRect ?? getFallbackRect()

  setOverlayStart(overlay, sourceRect, options.previewSrc)
  overlay.dataset.state = 'ready'
  document.documentElement.classList.add(
    'megameal-route-transition-active',
    `megameal-route-transition--${type}`,
  )

  window.requestAnimationFrame(() => {
    overlay.dataset.state = 'entering'
  })

  window.setTimeout(() => {
    storeHardNavigationArrival(url)
    directNavigate(url)
  }, hardNavigationDelayMs)
}

function handleDocumentClick(event: MouseEvent) {
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(
    'a[data-megameal-transition]',
  )
  if (!link) return

  const target = link.getAttribute('target')
  if (target && target !== '_self') return
  if (link.hasAttribute('download')) return

  navigateWithMegamealTransition({
    href: link.href,
    type: (link.dataset.megamealTransition as MegamealRouteTransitionKind) || 'default',
    previewSrc: link.dataset.megamealTransitionPreview,
    sourceRect: link.getBoundingClientRect(),
    event,
  })
}

export function initMegamealRouteTransitions() {
  if (typeof window === 'undefined' || window.__megamealRouteTransitionsInitialized) {
    return
  }

  window.__megamealRouteTransitionsInitialized = true
  window.megamealRouteTransitions = {
    navigate: navigateWithMegamealTransition,
  }
  document.addEventListener('click', handleDocumentClick, { capture: true })
  consumeHardNavigationArrival()
}
