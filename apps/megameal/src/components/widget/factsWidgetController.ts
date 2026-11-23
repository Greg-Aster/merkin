import type { TimelineFact } from '../../config/timelineFacts'

export interface FactsWidgetPayload {
  facts: TimelineFact[]
  fallbackFact: TimelineFact
  hasFirstPrivacyNotice: boolean
}

const specialFactLinks: Record<string, string> = {
  Explainer: '/posts/explainer/',
  Timeline: '/timeline/',
  'Mega-Meal-3': '/videos/qarnivor-snuggloid-emergence/',
}

const overlayScrollIdleDelay = 7000
const overlayRestoreIdleDelay = 4200
const privacyNoticeAutoAdvanceDelay = 7200

function resolveHref(fact: TimelineFact): string {
  if (fact?.href) return fact.href
  if (!fact?.link) return '/posts/explainer/'
  if (fact.link.startsWith('/')) return fact.link
  if (specialFactLinks[fact.link]) return specialFactLinks[fact.link]
  return `/posts/${fact.link}/`
}

export function mountFactsWidget(
  widget: HTMLElement,
  payload: FactsWidgetPayload,
): void {
  if (widget.dataset.factsWidgetBound === 'true') return
  widget.dataset.factsWidgetBound = 'true'

  const { facts, fallbackFact, hasFirstPrivacyNotice } = payload

  const emitSfx = (id: string) => {
    document.dispatchEvent(new CustomEvent('megameal:sfx', { detail: { id } }))
  }

  const eyebrowEl = widget.querySelector<HTMLElement>('[data-fact-eyebrow]')
  const headlineEl = widget.querySelector<HTMLElement>('[data-fact-headline]')
  const textEl = widget.querySelector<HTMLElement>('[data-fact-text]')
  const ctaEl = widget.querySelector<HTMLAnchorElement>('[data-fact-cta]')
  const sponsorEl = widget.querySelector<HTMLElement>('[data-fact-sponsor]')
  const finePrintEl = widget.querySelector<HTMLElement>('[data-fact-fineprint]')
  const mediaEl = widget.querySelector<HTMLElement>('[data-fact-media]')
  let mediaVideoEl = widget.querySelector<HTMLVideoElement>(
    '[data-fact-media-video]',
  )
  let mediaImgEl = widget.querySelector<HTMLImageElement>(
    '[data-fact-media-img]',
  )
  const cookieActionsEl = widget.querySelector<HTMLElement>(
    '[data-fact-cookie-actions]',
  )
  const cookieChoiceEls = Array.from(
    widget.querySelectorAll<HTMLButtonElement>('[data-fact-cookie-choice]'),
  )
  const frameEl = widget.querySelector<HTMLElement>('.facts-widget-frame')
  const storageKey =
    widget.dataset.storageKey || 'megameal-sponsored-window-dismissed'
  const isDismissible = widget.dataset.dismissible === 'true'
  const isOverlay = widget.classList.contains('facts-widget-overlay')
  const prefersTouchUi = window.matchMedia(
    '(hover: none), (pointer: coarse)',
  ).matches
  const mobilePersistentQuery = window.matchMedia('(max-width: 640px)')
  const isMobilePersistentOverlay = () =>
    isOverlay &&
    widget.dataset.mobilePersistent === 'true' &&
    mobilePersistentQuery.matches

  let currentIndex = -1
  let intervalId: number | undefined
  let expandTimeoutId: number | undefined
  let collapseTimeoutId: number | undefined
  let scrollIdleTimeoutId: number | undefined
  let privacyAdvanceTimeoutId: number | undefined
  let privacyNoticeInteracted = false
  let cleanupOverlayActivityListeners = () => {}

  const ensureMediaVideo = () => {
    if (mediaVideoEl || !mediaEl) return mediaVideoEl

    mediaVideoEl = document.createElement('video')
    mediaVideoEl.className = 'facts-widget-media-video is-hidden'
    mediaVideoEl.dataset.factMediaVideo = ''
    mediaVideoEl.autoplay = true
    mediaVideoEl.loop = true
    mediaVideoEl.muted = true
    mediaVideoEl.defaultMuted = true
    mediaVideoEl.playsInline = true
    mediaVideoEl.preload = 'none'
    mediaEl.prepend(mediaVideoEl)

    return mediaVideoEl
  }

  const ensureMediaImage = () => {
    if (mediaImgEl || !mediaEl) return mediaImgEl

    mediaImgEl = document.createElement('img')
    mediaImgEl.className = 'facts-widget-media-img is-hidden'
    mediaImgEl.dataset.factMediaImg = ''
    mediaImgEl.loading = 'lazy'
    mediaImgEl.decoding = 'async'
    mediaEl.append(mediaImgEl)

    return mediaImgEl
  }

  const applyFact = (fact: TimelineFact) => {
    if (
      !eyebrowEl ||
      !headlineEl ||
      !textEl ||
      !ctaEl ||
      !sponsorEl ||
      !finePrintEl
    ) {
      return
    }

    eyebrowEl.textContent = fact.eyebrow || 'Sponsored Placement'
    headlineEl.textContent = fact.headline || 'Sponsored Message'
    textEl.textContent = fact.text || ''
    sponsorEl.textContent = fact.sponsor || 'Consumer Satisfaction Bureau'
    ctaEl.textContent = fact.ctaText || 'Comply'
    ctaEl.setAttribute('href', resolveHref(fact))
    widget.dataset.factTheme = fact.theme || 'default'
    widget.dataset.factRole = fact.cookieActions ? 'privacy-notice' : 'standard'

    if (fact.cookieActions?.length && cookieActionsEl) {
      ctaEl.hidden = true
      cookieActionsEl.hidden = false
      cookieChoiceEls.forEach((button, index) => {
        button.textContent =
          fact.cookieActions?.[index] || 'Reject All Cookies'
      })
    } else {
      ctaEl.hidden = false
      if (cookieActionsEl) cookieActionsEl.hidden = true
    }

    if (fact.finePrint) {
      finePrintEl.textContent = fact.finePrint
      finePrintEl.classList.remove('is-hidden')
    } else {
      finePrintEl.textContent = ''
      finePrintEl.classList.add('is-hidden')
    }

    if (mediaEl) {
      if (fact.video) {
        const videoEl = ensureMediaVideo()
        const imageEl = mediaImgEl
        if (!videoEl) return

        videoEl.setAttribute('src', fact.video)
        videoEl.classList.remove('is-hidden')
        imageEl?.classList.add('is-hidden')
        mediaEl.classList.remove('is-hidden')
        videoEl.defaultMuted = true
        videoEl.muted = true
        videoEl.playsInline = true
        videoEl.load()
        videoEl.play().catch(() => {})
      } else if (fact.image) {
        const imageEl = ensureMediaImage()
        if (!imageEl) return

        imageEl.setAttribute('src', fact.image)
        imageEl.setAttribute('alt', fact.headline || '')
        imageEl.classList.remove('is-hidden')
        mediaVideoEl?.classList.add('is-hidden')
        mediaVideoEl?.pause()
        mediaEl.classList.remove('is-hidden')
      } else {
        mediaVideoEl?.pause()
        mediaVideoEl?.removeAttribute('src')
        mediaVideoEl?.classList.add('is-hidden')
        mediaImgEl?.removeAttribute('src')
        mediaImgEl?.classList.add('is-hidden')
        mediaEl.classList.add('is-hidden')
      }
    }
  }

  const getRandomFactIndex = () => {
    const firstRandomIndex = hasFirstPrivacyNotice ? 1 : 0
    if (facts.length <= firstRandomIndex) return -1
    if (facts.length === firstRandomIndex + 1) return firstRandomIndex

    let nextIndex = currentIndex
    while (nextIndex === currentIndex || nextIndex < firstRandomIndex) {
      nextIndex =
        firstRandomIndex +
        Math.floor(Math.random() * (facts.length - firstRandomIndex))
    }

    return nextIndex
  }

  const showRandomFact = () => {
    if (!facts.length || widget.classList.contains('is-dismissed')) return
    if (isOverlay && widget.dataset.pinned === 'true') return
    if (hasFirstPrivacyNotice && currentIndex === 0 && privacyNoticeInteracted)
      return
    currentIndex = getRandomFactIndex()
    privacyNoticeInteracted = false
    applyFact(facts[currentIndex] || fallbackFact)
  }

  const clearPrivacyAdvanceTimer = () => {
    window.clearTimeout(privacyAdvanceTimeoutId)
  }

  const schedulePrivacyNoticeAdvance = () => {
    clearPrivacyAdvanceTimer()
    if (
      !hasFirstPrivacyNotice ||
      currentIndex !== 0 ||
      privacyNoticeInteracted ||
      facts.length < 2 ||
      widget.classList.contains('is-dismissed')
    ) {
      return
    }

    privacyAdvanceTimeoutId = window.setTimeout(() => {
      if (
        currentIndex !== 0 ||
        privacyNoticeInteracted ||
        widget.classList.contains('is-dismissed')
      ) {
        return
      }
      showRandomFact()
    }, privacyNoticeAutoAdvanceDelay)
  }

  const markPrivacyNoticeInteracted = () => {
    if (!hasFirstPrivacyNotice || currentIndex !== 0) return
    privacyNoticeInteracted = true
    clearPrivacyAdvanceTimer()
  }

  const setExpanded = (expanded: boolean) => {
    if (!isOverlay) return
    widget.dataset.expanded = expanded ? 'true' : 'false'
  }

  const setPinned = (pinned: boolean) => {
    if (!isOverlay) return
    widget.dataset.pinned = pinned ? 'true' : 'false'
  }

  const setScrollIdle = (idle: boolean) => {
    if (!isOverlay) return
    widget.dataset.scrollIdle = idle ? 'true' : 'false'
  }

  const syncMobilePersistentAdVisibility = () => {
    const root = document.documentElement
    if (widget.dataset.mobilePersistent !== 'true') return

    if (!isMobilePersistentOverlay()) {
      delete root.dataset.megamealMobileAdVisible
      root.style.removeProperty('--megameal-mobile-ad-clearance')
      return
    }

    if (widget.classList.contains('is-dismissed')) {
      root.dataset.megamealMobileAdVisible = 'false'
      root.style.removeProperty('--megameal-mobile-ad-clearance')
      return
    }

    root.dataset.megamealMobileAdVisible = 'true'
    window.requestAnimationFrame(() => {
      if (
        !isMobilePersistentOverlay() ||
        widget.classList.contains('is-dismissed')
      )
        return

      const bounds = widget.getBoundingClientRect()
      const clearance = Math.max(0, window.innerHeight - bounds.top) + 12
      root.style.setProperty(
        '--megameal-mobile-ad-clearance',
        `${Math.ceil(clearance)}px`,
      )
    })
  }

  const syncMobilePersistentOverlay = () => {
    if (!isMobilePersistentOverlay()) {
      syncMobilePersistentAdVisibility()
      return
    }
    setPinned(false)
    setExpanded(false)
    if (!widget.classList.contains('is-dismissed')) {
      setScrollIdle(true)
    }
    syncMobilePersistentAdVisibility()
  }

  const scheduleScrollIdle = (delay = overlayScrollIdleDelay) => {
    if (!isOverlay || widget.classList.contains('is-dismissed')) return
    if (isMobilePersistentOverlay()) {
      setScrollIdle(true)
      return
    }
    window.clearTimeout(scrollIdleTimeoutId)
    scrollIdleTimeoutId = window.setTimeout(() => setScrollIdle(true), delay)
  }

  const markUserIsNavigating = () => {
    if (!isOverlay) return
    if (isMobilePersistentOverlay()) {
      setScrollIdle(true)
      return
    }
    setScrollIdle(false)
    setPinned(false)
    setExpanded(false)
    scheduleScrollIdle()
  }

  const startRotation = () => {
    if (!facts.length) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    window.clearInterval(intervalId)
    intervalId = window.setInterval(showRandomFact, 18000)
  }

  const dismissWidget = () => {
    widget.classList.add('is-dismissed')
    if (isMobilePersistentOverlay()) {
      window.sessionStorage.removeItem(storageKey)
    } else {
      window.sessionStorage.setItem(storageKey, 'true')
    }
    window.clearInterval(intervalId)
    window.clearTimeout(expandTimeoutId)
    window.clearTimeout(collapseTimeoutId)
    window.clearTimeout(scrollIdleTimeoutId)
    clearPrivacyAdvanceTimer()
    cleanupOverlayActivityListeners()
    setPinned(false)
    setExpanded(false)
    setScrollIdle(false)
    syncMobilePersistentAdVisibility()
  }

  const restoreWidget = () => {
    widget.classList.remove('is-dismissed')
    window.sessionStorage.removeItem(storageKey)
    applyFact(facts[currentIndex] || fallbackFact)
    schedulePrivacyNoticeAdvance()
    setPinned(false)
    setExpanded(false)
    scheduleScrollIdle(overlayRestoreIdleDelay)
    startRotation()
  }

  const collapseOverlaySelection = () => {
    if (!isOverlay || widget.classList.contains('is-dismissed')) return
    if (widget.dataset.pinned !== 'true' && widget.dataset.expanded !== 'true')
      return

    window.clearTimeout(expandTimeoutId)
    window.clearTimeout(collapseTimeoutId)
    setPinned(false)
    setExpanded(false)
    startRotation()
    schedulePrivacyNoticeAdvance()
  }

  widget.addEventListener('click', event => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    const actionTarget = target.closest('[data-action]')
    if (!actionTarget) return

    const action = actionTarget.getAttribute('data-action')
    if (action === 'next') {
      event.preventDefault()
      privacyNoticeInteracted = false
      clearPrivacyAdvanceTimer()
      showRandomFact()
    }
    if (action === 'dismiss' && isDismissible) {
      event.preventDefault()
      dismissWidget()
    }
    if (action === 'restore' && isDismissible) {
      event.preventDefault()
      restoreWidget()
    }
  })

  if (facts.length) {
    currentIndex = hasFirstPrivacyNotice ? 0 : getRandomFactIndex()
    applyFact(facts[currentIndex] || fallbackFact)
    schedulePrivacyNoticeAdvance()
  } else {
    applyFact(fallbackFact)
  }

  syncMobilePersistentOverlay()
  if (isMobilePersistentOverlay()) {
    window.sessionStorage.removeItem(storageKey)
  }

  if (
    isDismissible &&
    window.sessionStorage.getItem(storageKey) === 'true' &&
    !isMobilePersistentOverlay()
  ) {
    widget.classList.add('is-dismissed')
  } else {
    setExpanded(isOverlay ? false : true)
    startRotation()
    scheduleScrollIdle()
  }
  syncMobilePersistentAdVisibility()

  mobilePersistentQuery.addEventListener?.(
    'change',
    syncMobilePersistentOverlay,
  )

  if (frameEl instanceof HTMLElement && isOverlay) {
    frameEl.addEventListener('click', event => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (target.closest('a, button, [data-action]')) return

      const nextPinned = widget.dataset.pinned !== 'true'
      setPinned(nextPinned)
      setExpanded(nextPinned || widget.matches(':hover'))
      if (nextPinned) {
        markPrivacyNoticeInteracted()
        window.clearInterval(intervalId)
      } else {
        startRotation()
        schedulePrivacyNoticeAdvance()
      }
      emitSfx(nextPinned ? 'panel-open' : 'panel-back')
    })
  }

  widget.addEventListener('pointerdown', markPrivacyNoticeInteracted, {
    passive: true,
  })
  widget.addEventListener('focusin', markPrivacyNoticeInteracted)

  widget.addEventListener('mouseenter', () => {
    window.clearInterval(intervalId)
    markPrivacyNoticeInteracted()
    window.clearTimeout(collapseTimeoutId)
    if (isOverlay && !prefersTouchUi && widget.dataset.pinned !== 'true') {
      expandTimeoutId = window.setTimeout(() => setExpanded(true), 210)
    }
  })
  widget.addEventListener('mouseleave', () => {
    window.clearTimeout(expandTimeoutId)
    if (isOverlay && !prefersTouchUi && widget.dataset.pinned !== 'true') {
      collapseTimeoutId = window.setTimeout(() => setExpanded(false), 260)
    }
    if (!widget.classList.contains('is-dismissed')) startRotation()
  })

  if (isOverlay) {
    const activityController = new AbortController()
    const activitySignal = activityController.signal
    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && widget.contains(target)) return
      collapseOverlaySelection()
    }
    const handleKeyNavigation = (event: KeyboardEvent) => {
      if (
        event.key === 'PageDown' ||
        event.key === 'PageUp' ||
        event.key === 'Home' ||
        event.key === 'End' ||
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === ' '
      ) {
        markUserIsNavigating()
      }
    }

    window.addEventListener('scroll', markUserIsNavigating, {
      passive: true,
      signal: activitySignal,
    })
    window.addEventListener('wheel', markUserIsNavigating, {
      passive: true,
      signal: activitySignal,
    })
    window.addEventListener('touchmove', markUserIsNavigating, {
      passive: true,
      signal: activitySignal,
    })
    window.addEventListener('keydown', handleKeyNavigation, {
      signal: activitySignal,
    })
    document.addEventListener('pointerdown', handleOutsidePointerDown, {
      passive: true,
      signal: activitySignal,
    })

    cleanupOverlayActivityListeners = () => {
      activityController.abort()
      window.clearTimeout(scrollIdleTimeoutId)
    }

    window.addEventListener('pagehide', cleanupOverlayActivityListeners, {
      once: true,
    })
    document.addEventListener(
      'astro:before-preparation',
      cleanupOverlayActivityListeners,
      { once: true },
    )
  }
}

export function mountAllFactsWidgets(): void {
  document
    .querySelectorAll<HTMLElement>('[data-facts-widget]')
    .forEach(widget => {
      const payloadEl = widget.querySelector<HTMLScriptElement>(
        'script[data-facts-payload]',
      )
      if (!payloadEl?.textContent) return
      try {
        const payload = JSON.parse(payloadEl.textContent) as FactsWidgetPayload
        mountFactsWidget(widget, payload)
      } catch {
        // Ignore malformed serialized payload.
      }
    })
}
