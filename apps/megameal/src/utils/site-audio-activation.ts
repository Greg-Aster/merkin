const keyboardActivationIgnoredKeys = new Set([
  'Alt',
  'Control',
  'Escape',
  'Meta',
  'Shift',
])

const documentActivationEvents = [
  'click',
  'touchstart',
  'touchend',
] as const

const wheelActivationThreshold = 4

export const siteAudioUnlockedEvent = 'megameal:audio-unlocked'

let siteAudioUnlocked = false

type NavigatorWithUserActivation = Navigator & {
  userActivation?: {
    hasBeenActive?: boolean
    isActive?: boolean
  }
}

export function hasSiteAudioUserActivation(): boolean {
  if (siteAudioUnlocked) return true
  if (typeof navigator === 'undefined') return false

  const userActivation = (navigator as NavigatorWithUserActivation)
    .userActivation
  return (
    userActivation?.hasBeenActive === true || userActivation?.isActive === true
  )
}

export function hasActiveSiteAudioGesture(): boolean {
  if (typeof navigator === 'undefined') return true

  const userActivation = (navigator as NavigatorWithUserActivation)
    .userActivation
  return userActivation?.isActive !== false
}

function isWheelActivationGesture(event: Event): event is WheelEvent {
  return (
    typeof WheelEvent !== 'undefined' &&
    event instanceof WheelEvent &&
    Math.max(
      Math.abs(event.deltaX),
      Math.abs(event.deltaY),
      Math.abs(event.deltaZ),
    ) >= wheelActivationThreshold
  )
}

export function markSiteAudioUnlocked(): void {
  if (siteAudioUnlocked || typeof window === 'undefined') {
    siteAudioUnlocked = true
    return
  }

  siteAudioUnlocked = true
  window.dispatchEvent(new CustomEvent(siteAudioUnlockedEvent))
}

export function isSiteAudioActivationGesture(event: Event): boolean {
  if (event instanceof KeyboardEvent) {
    return (
      !event.repeat &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !keyboardActivationIgnoredKeys.has(event.key)
    )
  }

  if (isWheelActivationGesture(event)) {
    return true
  }

  if (event instanceof MouseEvent) {
    return event.type === 'click' && event.button === 0
  }

  return event.type === 'touchstart' || event.type === 'touchend'
}

export function canAttemptSiteAudioUnlock(event?: Event): boolean {
  if (event && !isSiteAudioActivationGesture(event)) return false
  if (event && isWheelActivationGesture(event)) {
    return true
  }
  return hasActiveSiteAudioGesture()
}

export function addSiteAudioActivationListeners(
  handler: (event: Event) => void,
  options: AddEventListenerOptions = {},
): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return () => {}
  }

  const activationHandler = (event: Event) => {
    if (isSiteAudioActivationGesture(event)) {
      handler(event)
    }
  }

  const gestureOptions = {
    ...options,
    capture: options.capture ?? true,
    passive: options.passive ?? true,
  }
  const keyboardOptions = {
    ...options,
    capture: options.capture ?? true,
  }

  documentActivationEvents.forEach(eventName => {
    document.addEventListener(eventName, activationHandler, gestureOptions)
  })
  document.addEventListener('keydown', activationHandler, keyboardOptions)
  window.addEventListener('wheel', activationHandler, gestureOptions)

  return () => {
    documentActivationEvents.forEach(eventName => {
      document.removeEventListener(eventName, activationHandler, gestureOptions)
    })
    document.removeEventListener('keydown', activationHandler, keyboardOptions)
    window.removeEventListener('wheel', activationHandler, gestureOptions)
  }
}
