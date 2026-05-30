const keyboardActivationIgnoredKeys = new Set([
  'Alt',
  'Control',
  'Escape',
  'Meta',
  'Shift',
])

const documentActivationEvents = [
  'pointerdown',
  'pointerup',
  'mousedown',
  'touchstart',
  'touchend',
  'contextmenu',
] as const

const wheelActivationThreshold = 4

// Wheel can wake ambience only after the browser has recorded a real user
// activation. Calling WebAudio resume from wheel alone creates autoplay warnings.

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

  if (event instanceof WheelEvent) {
    return (
      Math.max(
        Math.abs(event.deltaX),
        Math.abs(event.deltaY),
        Math.abs(event.deltaZ),
      ) >= wheelActivationThreshold && hasSiteAudioUserActivation()
    )
  }

  return true
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
