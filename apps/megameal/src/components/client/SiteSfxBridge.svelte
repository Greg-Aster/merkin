<script lang="ts">
import { onMount } from 'svelte'
import { type SiteSfxId, siteSfxManager } from '../../utils/site-sfx'

const INTERACTIVE_SELECTOR =
  'a[href], button, [role="button"], summary, .btn-card, .btn-plain, .btn-primary'

const isNativeInteractive = (element: HTMLElement | null) =>
  !!element?.closest(INTERACTIVE_SELECTOR)

const readExplicitSfx = (
  element: HTMLElement | null,
  trigger: 'click' | 'hover' | 'focus' | 'key',
): SiteSfxId | null => {
  if (!element) return null

  const explicitElement = element.closest<HTMLElement>(`[data-sfx-${trigger}]`)
  if (!explicitElement) return null

  const explicit =
    trigger === 'click'
      ? explicitElement.dataset.sfxClick
      : trigger === 'hover'
        ? explicitElement.dataset.sfxHover
        : trigger === 'focus'
          ? explicitElement.dataset.sfxFocus
          : explicitElement.dataset.sfxKey

  return (explicit as SiteSfxId | undefined) ?? null
}

function isMutedSurface(element: HTMLElement): boolean {
  return !!element.closest(
    'audio, video, textarea, select, [contenteditable="true"]',
  )
}

function isPointerMutedSurface(element: HTMLElement): boolean {
  return (
    isMutedSurface(element) ||
    !!element.closest(
      'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"])',
    )
  )
}

function isTypingField(element: HTMLElement): boolean {
  return !!element.closest(
    'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable="true"]',
  )
}

function resolvePointerSfx(target: EventTarget | null): SiteSfxId | null {
  const element = target instanceof HTMLElement ? target : null
  if (!element) return null

  const explicit = readExplicitSfx(element, 'click')
  if (explicit) return explicit

  if (isPointerMutedSurface(element)) {
    return null
  }

  if (element.closest('.product-card')) {
    return null
  }

  if (element.closest('#nav-menu-switch, #display-settings-switch')) {
    return 'panel-open'
  }

  if (element.closest('.site-audio-button')) {
    return 'panel-open'
  }

  if (element.closest('.site-audio-panel')) {
    return 'soft'
  }

  if (
    element.closest(
      '.btn-quiz-option, .hero-cta-primary, .hero-cta-secondary, .hero-cta-ghost',
    )
  ) {
    return 'select'
  }

  if (element.closest('.banner-link[data-has-link="true"]')) {
    return 'sweep'
  }

  if (isNativeInteractive(element)) {
    return 'soft'
  }

  return 'soft'
}

function getHoverAnchor(target: EventTarget | null): HTMLElement | null {
  const element = target instanceof HTMLElement ? target : null
  if (!element || isMutedSurface(element)) return null

  return (
    element.closest<HTMLElement>(
      [
        '[data-sfx-hover]',
        '.site-audio-panel',
        '.mobile-menu-tools__button',
        '.world-runway__route',
        '.world-runway__bulletin',
        '.category-filter',
        '.detail-tab',
        '.gallery-nav',
        '.discord-join-button',
        '.contact-send-button',
        '.newsletter-subscribe-button',
        '.event-calendar-button',
        '.author-card',
        '.team-member-card',
        '.engagement-option',
      ].join(', '),
    ) ?? null
  )
}

function resolveHoverSfx(anchor: HTMLElement | null): SiteSfxId | null {
  if (!anchor) return null

  const explicit = readExplicitSfx(anchor, 'hover')
  if (explicit) return explicit

  if (
    anchor.matches(
      '.world-runway__route, .world-runway__bulletin, .discord-join-button, .contact-send-button, .newsletter-subscribe-button, .event-calendar-button, .author-card, .team-member-card, .engagement-option',
    )
  ) {
    return 'hover-emphasis'
  }

  if (
    anchor.matches(
      '.site-audio-panel, .mobile-menu-tools__button, .category-filter, .detail-tab, .gallery-nav',
    )
  ) {
    return 'hover-soft'
  }

  return null
}

function resolveFocusSfx(target: EventTarget | null): SiteSfxId | null {
  const element = target instanceof HTMLElement ? target : null
  if (!element || isMutedSurface(element)) return null

  const explicit = readExplicitSfx(element, 'focus')
  if (explicit) return explicit

  if (element.matches('input, textarea, select, button, a[href]')) {
    return 'focus-soft'
  }

  return null
}

function resolveKeySfx(target: EventTarget | null): SiteSfxId | null {
  const element = target instanceof HTMLElement ? target : null
  if (!element || isTypingField(element) || isMutedSurface(element)) return null

  const explicitKey = readExplicitSfx(element, 'key')
  if (explicitKey) return explicitKey

  const explicitClick = readExplicitSfx(element, 'click')
  if (explicitClick) return explicitClick

  return resolvePointerSfx(element)
}

onMount(() => {
  siteSfxManager.initialize()
  let lastScrollSfxAt = 0
  let lastHoverAnchor: HTMLElement | null = null
  let lastFocusTarget: HTMLElement | null = null
  let lastPointerAt = -Infinity

  const handleClick = async (event: MouseEvent) => {
    if (event.button !== 0) return

    lastPointerAt = window.performance.now()
    const sfxId = resolvePointerSfx(event.target)
    if (sfxId) {
      if (await siteSfxManager.unlockFromGesture(event)) {
        siteSfxManager.play(sfxId)
      }
    }
  }

  const handleMouseOver = (event: MouseEvent) => {
    const anchor = getHoverAnchor(event.target)
    if (!anchor || anchor === lastHoverAnchor) return

    const related = event.relatedTarget
    if (related instanceof Node && anchor.contains(related)) return

    lastHoverAnchor = anchor
    const sfxId = resolveHoverSfx(anchor)
    if (sfxId) {
      siteSfxManager.playIfUnlocked(sfxId)
    }
  }

  const handleMouseOut = (event: MouseEvent) => {
    if (!lastHoverAnchor) return

    const target = event.target
    const related = event.relatedTarget
    if (!(target instanceof Node) || !lastHoverAnchor.contains(target)) return
    if (related instanceof Node && lastHoverAnchor.contains(related)) return

    lastHoverAnchor = null
  }

  const handleFocusIn = (event: FocusEvent) => {
    const target = event.target instanceof HTMLElement ? event.target : null
    if (!target || target === lastFocusTarget) return
    if (window.performance.now() - lastPointerAt < 140) return

    lastFocusTarget = target
    const sfxId = resolveFocusSfx(target)
    if (sfxId) {
      siteSfxManager.playIfUnlocked(sfxId)
    }
  }

  const handleFocusOut = (event: FocusEvent) => {
    if (event.target === lastFocusTarget) {
      lastFocusTarget = null
    }
  }

  const handleKeyDown = async (event: KeyboardEvent) => {
    if (event.repeat) return
    if (event.key !== 'Enter' && event.key !== ' ') return

    const sfxId = resolveKeySfx(event.target)
    if (sfxId) {
      if (await siteSfxManager.unlockFromGesture(event)) {
        siteSfxManager.play(sfxId)
      }
    }
  }

  const handleWheel = async (event: WheelEvent) => {
    const target = event.target instanceof HTMLElement ? event.target : null
    if (target?.closest('input, textarea, select, [contenteditable="true"]'))
      return
    if (Math.abs(event.deltaY) < 14 && Math.abs(event.deltaX) < 14) return

    const now = window.performance.now()
    if (now - lastScrollSfxAt < 650) return

    lastScrollSfxAt = now
    if (await siteSfxManager.unlockFromGesture(event)) {
      siteSfxManager.play('scroll')
    }
  }

  const handleCustomSfx = (event: Event) => {
    const customEvent = event as CustomEvent<{ id?: SiteSfxId }>
    const sfxId = customEvent.detail?.id
    if (sfxId) {
      siteSfxManager.playIfUnlocked(sfxId)
    }
  }

  document.addEventListener('click', handleClick, true)
  document.addEventListener('mouseover', handleMouseOver, true)
  document.addEventListener('mouseout', handleMouseOut, true)
  document.addEventListener('focusin', handleFocusIn, true)
  document.addEventListener('focusout', handleFocusOut, true)
  document.addEventListener('keydown', handleKeyDown, true)
  document.addEventListener('wheel', handleWheel, { passive: true })
  document.addEventListener('megameal:sfx', handleCustomSfx)

  return () => {
    document.removeEventListener('click', handleClick, true)
    document.removeEventListener('mouseover', handleMouseOver, true)
    document.removeEventListener('mouseout', handleMouseOut, true)
    document.removeEventListener('focusin', handleFocusIn, true)
    document.removeEventListener('focusout', handleFocusOut, true)
    document.removeEventListener('keydown', handleKeyDown, true)
    document.removeEventListener('wheel', handleWheel)
    document.removeEventListener('megameal:sfx', handleCustomSfx)
  }
})
</script>
