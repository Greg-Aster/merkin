<script lang="ts">
import {
  type AdaptiveCanvasDprController,
  createAdaptiveCanvasDprController,
} from '@/utils/adaptiveCanvasDpr'
import { homePortalEvents, type PortalAdvanceDetail } from '@/contracts/homePortal'
import { navigateWithMegamealTransition } from '@/utils/megamealRouteTransitions'
import { getRichMediaCapabilities } from '@/utils/richMediaCapabilities'
import {
  type SiteSfxId,
  siteSfxManager,
} from '@/utils/site-sfx'
import { Canvas } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import * as THREE from 'three'
import HomeIntroEnvironmentScene from './HomeIntroEnvironmentScene.svelte'
import HomeIntroPostProcessing from './HomeIntroPostProcessing.svelte'
import {
  homeIntroFinalScreenGraceScreens,
  homeIntroIntroOffsetScreens,
  homeIntroMaxWheelForOffset,
  homeIntroMobileIntroOffsetScreens,
  homeIntroScreens,
  homeIntroStandardBannerPhaseScreens,
  homeIntroWheelToScreenRatio,
} from './homeIntroScreens'

type IntroInputState = {
  x: number
  y: number
  dragX: number
  dragY: number
  wheel: number
  reveal: number
  introOffsetScreens: number
  active: boolean
}

type SceneQuality = 'high' | 'balanced' | 'lean'

export let titleImageSrc = ''

let shell: HTMLDivElement | null = null
let lastPointerX = 0
let lastPointerY = 0
let pointerDownClientX = 0
let pointerDownClientY = 0
let pointerDownStartedOnScreen = false
let pointerDragDistance = 0
let activePointerId: number | null = null
let activeTouchId: number | null = null
let activeTouchListenersBound = false
let virtualWheel = 0
let wheelVelocity = 0
let scrollFrame = 0
let lastScrollFrameAt = 0
let activeScreenIndex = 0
let revealProgress = 0
let portraitMobile = false
let backgroundReady = false
let backgroundRevealTimeout = 0
let backgroundRevealFallbackTimeout = 0
let canvasDpr = 1
let adaptiveDprController: AdaptiveCanvasDprController | null = null
let sceneQuality: SceneQuality = 'high'
let portalHoverActive = false
let portalVisible = true
let portalEffectsVisible = true
let logoEffectsVisible = true
let lastScreenSfxIndex = activeScreenIndex
let lastPortalDragSfxAt = -Infinity
let portalRevealSfxPlayed = false
const backgroundRevealDelayMs = 1100
const backgroundRevealFallbackDelayMs = 2600
const portalDemoActiveClass = 'megameal-portal-demo-active'
const standardBannerPhaseClass = 'megameal-home-standard-banner-phase'
const logoEffectsRevealCutoff = 0.68
const wheelMomentumDecay = 2.4
const wheelMomentumMaxVelocity = 4.8
const mouseWheelSensitivity = 1.15
const mouseWheelMomentumImpulse = 3.6
const mouseWheelMomentumMaxVelocity = 2.8
const mobileTouchDragSensitivity = 0.36
const keyboardWheelStep = 0.82
const pageWheelStep = 1.64
const input: IntroInputState = {
  x: 0,
  y: 0,
  dragX: 0,
  dragY: 0,
  wheel: 0,
  reveal: 0,
  introOffsetScreens: homeIntroIntroOffsetScreens,
  active: false,
}
$: introOffsetScreens = portraitMobile
  ? homeIntroMobileIntroOffsetScreens
  : homeIntroIntroOffsetScreens
$: carouselRevealWheelSpan = introOffsetScreens / homeIntroWheelToScreenRatio
$: maxWheel =
  homeIntroMaxWheelForOffset(introOffsetScreens) +
  homeIntroStandardBannerPhaseScreens / homeIntroWheelToScreenRatio
$: activeScreen = homeIntroScreens[activeScreenIndex] ?? homeIntroScreens[0]
$: hoveredScreenIndex =
  portraitMobile && revealProgress > 0.08
    ? activeScreenIndex
    : portalHoverActive
      ? activeScreenIndex
      : -1

const createRenderer = (canvas: HTMLCanvasElement) => {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  })

  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.92
  renderer.setClearColor(0x000000, 0)

  return renderer
}

function updatePointer(clientX: number, clientY: number) {
  if (!shell) return

  const bounds = shell.getBoundingClientRect()
  if (bounds.width <= 0 || bounds.height <= 0) return

  input.x = ((clientX - bounds.left) / bounds.width - 0.5) * 2
  input.y = ((clientY - bounds.top) / bounds.height - 0.5) * 2
  syncPortalHoverActive(isPointerOverActiveScreen(clientX, clientY))
}

function isInsideShell(clientX: number, clientY: number) {
  if (!shell) return false

  const bounds = shell.getBoundingClientRect()
  return (
    clientX >= bounds.left &&
    clientX <= bounds.right &&
    clientY >= bounds.top &&
    clientY <= bounds.bottom
  )
}

function isPortalDemoActive() {
  return (
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains(portalDemoActiveClass)
  )
}

function isStandardBannerPhaseActive() {
  return (
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains(standardBannerPhaseClass)
  )
}

function canControlPortal() {
  return isShellVisible() || isPortalDemoActive() || isStandardBannerPhaseActive()
}

function isPointerOverActiveScreen(clientX: number, clientY: number) {
  if (!shell || !isInsideShell(clientX, clientY)) return false

  const bounds = shell.getBoundingClientRect()
  const normalizedX = ((clientX - bounds.left) / bounds.width - 0.5) * 2
  const normalizedY = ((clientY - bounds.top) / bounds.height - 0.5) * 2
  const horizontalLimit = portraitMobile ? 0.7 : 0.58
  const verticalLimit = portraitMobile ? 0.48 : 0.42
  const verticalCenter = portraitMobile ? -0.02 : -0.04

  return (
    Math.abs(normalizedX) <= horizontalLimit &&
    Math.abs(normalizedY - verticalCenter) <= verticalLimit
  )
}

function isShellInViewport() {
  if (!shell) return false

  const bounds = shell.getBoundingClientRect()
  return (
    bounds.bottom > 0 &&
    bounds.top < window.innerHeight &&
    bounds.right > 0 &&
    bounds.left < window.innerWidth
  )
}

function isShellVisible() {
  if (!shell || !isShellInViewport()) return false
  if (document.documentElement.classList.contains(standardBannerPhaseClass)) {
    return false
  }

  const style = window.getComputedStyle(shell)
  return style.display !== 'none' && style.visibility !== 'hidden'
}

function isLogoEffectRangeVisible() {
  return input.reveal < logoEffectsRevealCutoff
}

function syncPortalVisibility() {
  const nextInViewport = isShellInViewport()
  const nextEffectsVisible = isShellVisible()
  const nextLogoEffectsVisible =
    nextEffectsVisible && isLogoEffectRangeVisible()
  const visibilityChanged = portalVisible !== nextInViewport
  const effectsVisibilityChanged = portalEffectsVisible !== nextEffectsVisible
  const logoEffectsVisibilityChanged =
    logoEffectsVisible !== nextLogoEffectsVisible

  if (visibilityChanged) {
    portalVisible = nextInViewport
  }
  if (effectsVisibilityChanged) {
    portalEffectsVisible = nextEffectsVisible
  }
  if (logoEffectsVisibilityChanged) {
    logoEffectsVisible = nextLogoEffectsVisible
  }
  if (!nextEffectsVisible) {
    input.active = false
    activePointerId = null
    activeTouchId = null
    pointerDownStartedOnScreen = false
    syncPortalHoverActive(false)
  }
  if (!nextInViewport) {
    wheelVelocity = 0
    if (scrollFrame) {
      window.cancelAnimationFrame(scrollFrame)
      scrollFrame = 0
      lastScrollFrameAt = 0
    }
  }
}

function syncViewportMode() {
  if (typeof window === 'undefined') return
  portraitMobile = window.innerWidth <= 760 && window.innerHeight > window.innerWidth
}

function getHomeMaxCanvasDpr() {
  if (typeof window === 'undefined') return 1

  const { compactViewport, devicePixelRatio, lowMemoryDevice, reducedData } =
    getRichMediaCapabilities()
  const dprCap = lowMemoryDevice || reducedData ? 1 : compactViewport ? 1.5 : 2

  return Math.min(devicePixelRatio, dprCap)
}

function getHomeSceneQuality(nextDpr: number): SceneQuality {
  if (typeof window === 'undefined') return 'high'

  const { compactViewport, devicePixelRatio, lowMemoryDevice, reducedData } =
    getRichMediaCapabilities()

  if (reducedData || lowMemoryDevice || compactViewport) return 'lean'
  if (devicePixelRatio > 1.1 && nextDpr <= 1.01) return 'lean'
  if (devicePixelRatio > 1.5 || nextDpr < 1.45) return 'balanced'

  return 'high'
}

function setCanvasDpr(nextDpr: number) {
  canvasDpr = nextDpr
  sceneQuality = getHomeSceneQuality(nextDpr)
}

function syncCanvasDpr() {
  if (typeof window === 'undefined') return

  if (adaptiveDprController) {
    adaptiveDprController.sync()
    return
  }

  setCanvasDpr(getHomeMaxCanvasDpr())
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function clampScreenIndex(value: number) {
  return Math.min(
    homeIntroScreens.length - 1,
    Math.max(0, value),
  )
}

function playPortalSfx(
  id: SiteSfxId,
  options: { unlockFromGesture?: boolean } = {},
) {
  if (typeof window === 'undefined') return

  if (options.unlockFromGesture) {
    void siteSfxManager.unlockFromGesture().then((unlocked) => {
      if (unlocked) siteSfxManager.play(id)
    })
    return
  }

  siteSfxManager.playIfUnlocked(id)
}

function playPortalDragSfx(
  options: { unlockFromGesture?: boolean } = {},
) {
  if (typeof window === 'undefined') return

  const now = window.performance.now()
  if (now - lastPortalDragSfxAt < 420) return

  lastPortalDragSfxAt = now
  playPortalSfx('portal-drag', options)
}

function syncPortalHoverActive(nextActive: boolean) {
  if (portalHoverActive === nextActive) return

  portalHoverActive = nextActive
  if (nextActive) {
    playPortalSfx('portal-hover')
  }
}

function syncActiveScreenFromWheel(wheel: number) {
  const nextScreenIndex = clampScreenIndex(
    Math.round(wheel * homeIntroWheelToScreenRatio - introOffsetScreens),
  )

  if (nextScreenIndex === activeScreenIndex) return

  activeScreenIndex = nextScreenIndex
  if (activeScreenIndex !== lastScreenSfxIndex && input.reveal > 0.08) {
    lastScreenSfxIndex = activeScreenIndex
    playPortalSfx('portal-cycle')
  }
}

function syncRevealProgress() {
  input.reveal = clamp(input.wheel / carouselRevealWheelSpan, 0, 1)
  revealProgress = input.reveal
}

function syncStandardBannerPhaseClass() {
  if (typeof document === 'undefined') return

  const selectedIndex =
    input.wheel * homeIntroWheelToScreenRatio - introOffsetScreens
  const phaseProgress =
    (selectedIndex -
      (homeIntroScreens.length - 1 + homeIntroFinalScreenGraceScreens)) /
    homeIntroStandardBannerPhaseScreens

  document.documentElement.classList.toggle(
    standardBannerPhaseClass,
    phaseProgress > 0.18,
  )
}

function updateScrollDrivenWheel() {
  input.introOffsetScreens = introOffsetScreens
  input.wheel = clamp(virtualWheel, 0, maxWheel)
  syncRevealProgress()
  syncStandardBannerPhaseClass()
  syncPortalVisibility()
  syncActiveScreenFromWheel(input.wheel)
}

function runScrollDrivenWheelFrame(timestamp: number) {
  const delta = lastScrollFrameAt
    ? Math.min(0.05, (timestamp - lastScrollFrameAt) / 1000)
    : 1 / 60
  lastScrollFrameAt = timestamp

  if (Math.abs(wheelVelocity) > 0.001) {
    const nextWheel = clamp(virtualWheel + wheelVelocity * delta, 0, maxWheel)
    const hitScrollLimit =
      nextWheel === virtualWheel &&
      ((nextWheel <= 0 && wheelVelocity < 0) ||
        (nextWheel >= maxWheel && wheelVelocity > 0))

    virtualWheel = nextWheel
    wheelVelocity = hitScrollLimit
      ? 0
      : wheelVelocity * Math.exp(-wheelMomentumDecay * delta)
  }

  updateScrollDrivenWheel()

  if (Math.abs(wheelVelocity) > 0.001) {
    scrollFrame = window.requestAnimationFrame(runScrollDrivenWheelFrame)
  } else {
    scrollFrame = 0
    lastScrollFrameAt = 0
  }
}

function scheduleScrollDrivenWheel() {
  if (scrollFrame) return

  scrollFrame = window.requestAnimationFrame(runScrollDrivenWheelFrame)
}

function smoothWheelStep(
  delta: number,
  options: { unlockFromGesture?: boolean } = {},
) {
  const direction = Math.sign(delta)
  if (
    direction === 0 ||
    (direction > 0 && virtualWheel >= maxWheel) ||
    (direction < 0 && virtualWheel <= 0)
  ) {
    return false
  }

  wheelVelocity = clamp(
    wheelVelocity + delta * wheelMomentumDecay,
    -wheelMomentumMaxVelocity,
    wheelMomentumMaxVelocity,
  )
  playPortalDragSfx(options)
  scheduleScrollDrivenWheel()
  return true
}

function isInteractiveTarget(eventTarget: EventTarget | null) {
  return (
    eventTarget instanceof Element &&
    !!eventTarget.closest(
      'a, button, input, textarea, select, [role="button"], [data-portal-demo-player]',
    )
  )
}

function applyDragDelta(
  clientX: number,
  clientY: number,
  inputMultiplier: number,
  wheelDistance: number,
) {
  updatePointer(clientX, clientY)

  if (!input.active) return

  const width = Math.max(shell?.clientWidth ?? window.innerWidth, 1)
  const deltaX = (clientX - lastPointerX) * inputMultiplier
  const deltaY = (clientY - lastPointerY) * inputMultiplier

  input.dragX += deltaX / width
  input.dragY += deltaY / Math.max(wheelDistance, 1)
  wheelVelocity = 0
  virtualWheel = clamp(
    virtualWheel - (deltaY / Math.max(wheelDistance, 1)) * 4.2,
    0,
    maxWheel,
  )
  scheduleScrollDrivenWheel()
  lastPointerX = clientX
  lastPointerY = clientY
}

function handlePointerDown(event: PointerEvent) {
  if (isPortalDemoActive()) return
  if (event.pointerType === 'touch' || isInteractiveTarget(event.target)) return
  if (!isShellVisible()) return
  if (!isInsideShell(event.clientX, event.clientY)) return

  input.active = true
  wheelVelocity = 0
  activePointerId = event.pointerId
  lastPointerX = event.clientX
  lastPointerY = event.clientY
  pointerDownClientX = event.clientX
  pointerDownClientY = event.clientY
  pointerDragDistance = 0
  pointerDownStartedOnScreen = isPointerOverActiveScreen(event.clientX, event.clientY)
  updatePointer(event.clientX, event.clientY)
  playPortalDragSfx({ unlockFromGesture: true })

  try {
    shell?.setPointerCapture(event.pointerId)
  } catch {
    // Window-level listeners still keep drag input alive if capture is not available.
  }
}

function handlePointerMove(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  if (
    input.active &&
    activePointerId !== null &&
    event.pointerId !== activePointerId
  ) {
    return
  }

  const height = Math.max(shell?.clientHeight ?? window.innerHeight, 1)
  if (input.active) {
    pointerDragDistance = Math.max(
      pointerDragDistance,
      Math.hypot(
        event.clientX - pointerDownClientX,
        event.clientY - pointerDownClientY,
      ),
    )
  }
  applyDragDelta(event.clientX, event.clientY, 1, height)
}

function navigateActiveScreen() {
  if (isPortalDemoActive()) return
  if (typeof window === 'undefined' || !activeScreen.href) return

  playPortalSfx('portal-activate')
  navigateWithMegamealTransition({
    href: activeScreen.href,
    type: 'portal-zoom',
    sourceRect: getActiveScreenTransitionRect(),
    previewSrc: activeScreen.webglStillSrc ?? activeScreen.stillSrc,
  })
}

function getActiveScreenTransitionRect() {
  if (!shell) return null

  const bounds = shell.getBoundingClientRect()
  const horizontalLimit = portraitMobile ? 0.7 : 0.58
  const verticalLimit = portraitMobile ? 0.48 : 0.42
  const verticalCenter = portraitMobile ? -0.02 : -0.04
  const width = bounds.width * horizontalLimit
  const height = bounds.height * verticalLimit
  const centerX = bounds.left + bounds.width * 0.5
  const centerY = bounds.top + bounds.height * (0.5 + verticalCenter * 0.5)

  return new DOMRect(centerX - width / 2, centerY - height / 2, width, height)
}

function handlePointerUp(event?: PointerEvent) {
  if (
    event &&
    activePointerId !== null &&
    event.pointerId !== activePointerId
  ) {
    return
  }

  if (activePointerId !== null) {
    try {
      shell?.releasePointerCapture(activePointerId)
    } catch {
      // Capture may already be released after browser-driven pointer cancellation.
    }
  }

  const shouldNavigate =
    !isPortalDemoActive() &&
    !!event &&
    pointerDownStartedOnScreen &&
    pointerDragDistance <= 8 &&
    isPointerOverActiveScreen(event.clientX, event.clientY)

  input.active = false
  activePointerId = null
  pointerDownStartedOnScreen = false
  pointerDragDistance = 0

  if (shouldNavigate) {
    navigateActiveScreen()
  }
}

function getChangedTouch(event: TouchEvent) {
  return activeTouchId === null
    ? event.changedTouches[0]
    : Array.from(event.changedTouches).find(
        ({ identifier }) => identifier === activeTouchId,
      )
}

function bindActiveTouchListeners() {
  if (activeTouchListenersBound) return

  activeTouchListenersBound = true
  window.addEventListener('touchmove', handleTouchMove, { passive: false })
  window.addEventListener('touchend', handleTouchEnd, { passive: false })
  window.addEventListener('touchcancel', handleTouchEnd)
}

function unbindActiveTouchListeners() {
  if (!activeTouchListenersBound) return

  activeTouchListenersBound = false
  window.removeEventListener('touchmove', handleTouchMove)
  window.removeEventListener('touchend', handleTouchEnd)
  window.removeEventListener('touchcancel', handleTouchEnd)
}

function handleTouchStart(event: TouchEvent) {
  const isDemoOrStandardPhase =
    isPortalDemoActive() || isStandardBannerPhaseActive()
  if (!isDemoOrStandardPhase && isInteractiveTarget(event.target)) return
  if (!canControlPortal()) return

  const touch = event.changedTouches[0]
  if (!touch || !isInsideShell(touch.clientX, touch.clientY)) return

  activeTouchId = touch.identifier
  activePointerId = null
  input.active = true
  wheelVelocity = 0
  lastPointerX = touch.clientX
  lastPointerY = touch.clientY
  pointerDownClientX = touch.clientX
  pointerDownClientY = touch.clientY
  pointerDragDistance = 0
  pointerDownStartedOnScreen = isPointerOverActiveScreen(touch.clientX, touch.clientY)
  updatePointer(touch.clientX, touch.clientY)
  playPortalDragSfx({ unlockFromGesture: true })
  bindActiveTouchListeners()
}

function handleTouchMove(event: TouchEvent) {
  const touch = getChangedTouch(event)
  if (!touch || activeTouchId === null) return

  event.preventDefault()
  pointerDragDistance = Math.max(
    pointerDragDistance,
    Math.hypot(
      touch.clientX - pointerDownClientX,
      touch.clientY - pointerDownClientY,
    ),
  )
  applyDragDelta(
    touch.clientX,
    touch.clientY,
    mobileTouchDragSensitivity,
    Math.max(220, Math.min(window.innerHeight * 0.46, 360)),
  )
}

function handleTouchEnd(event: TouchEvent) {
  const touch = getChangedTouch(event)
  if (!touch) return

  const shouldNavigate =
    !isPortalDemoActive() &&
    event.type === 'touchend' &&
    activeTouchId !== null &&
    pointerDownStartedOnScreen &&
    pointerDragDistance <= 8 &&
    isPointerOverActiveScreen(touch.clientX, touch.clientY)

  input.active = false
  activeTouchId = null
  pointerDownStartedOnScreen = false
  pointerDragDistance = 0
  unbindActiveTouchListeners()

  if (shouldNavigate) {
    event.preventDefault()
    navigateActiveScreen()
  }
}

function handleWheel(event: WheelEvent) {
  const effectsVisible = isShellVisible()
  if (
    !shell ||
    !isShellInViewport() ||
    !isInsideShell(event.clientX, event.clientY)
  ) {
    return
  }
  event.preventDefault()
  const viewportHeight = Math.max(window.innerHeight, 1)
  const wheelDelta = (event.deltaY / viewportHeight) * mouseWheelSensitivity
  wheelVelocity = clamp(
    wheelVelocity + wheelDelta * mouseWheelMomentumImpulse,
    -mouseWheelMomentumMaxVelocity,
    mouseWheelMomentumMaxVelocity,
  )
  if (effectsVisible) {
    playPortalDragSfx()
  }
  scheduleScrollDrivenWheel()
}

function handleKeyboardScroll(event: KeyboardEvent) {
  if (
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    isInteractiveTarget(event.target) ||
    !canControlPortal()
  ) {
    return
  }

  const stepByKey: Record<string, number | undefined> = {
    ArrowDown: keyboardWheelStep,
    ArrowRight: keyboardWheelStep,
    PageDown: pageWheelStep,
    ' ': keyboardWheelStep,
    Spacebar: keyboardWheelStep,
    ArrowUp: -keyboardWheelStep,
    ArrowLeft: -keyboardWheelStep,
    PageUp: -pageWheelStep,
  }
  const step = stepByKey[event.key]
  if (step === undefined) return

  if (smoothWheelStep(step, { unlockFromGesture: true })) {
    event.preventDefault()
  }
}

function handlePortalAdvance(event: Event) {
  if (!canControlPortal()) return

  const detail =
    event instanceof CustomEvent
      ? (event.detail as PortalAdvanceDetail | null)
      : null
  const direction = detail?.direction && Number.isFinite(detail.direction)
    ? Math.sign(detail.direction)
    : 1
  const step = detail?.step && Number.isFinite(detail.step)
    ? Math.abs(detail.step)
    : keyboardWheelStep

  if (smoothWheelStep(step * direction)) {
    event.preventDefault()
  }
}

function handleResize() {
  syncViewportMode()
  syncPortalVisibility()
  syncCanvasDpr()
  syncPortalHoverActive(false)
  scheduleScrollDrivenWheel()
}

function clearBackgroundRevealTimers() {
  if (typeof window === 'undefined') return

  if (backgroundRevealTimeout) {
    window.clearTimeout(backgroundRevealTimeout)
    backgroundRevealTimeout = 0
  }

  if (backgroundRevealFallbackTimeout) {
    window.clearTimeout(backgroundRevealFallbackTimeout)
    backgroundRevealFallbackTimeout = 0
  }
}

function revealBackground() {
  if (backgroundReady) return

  backgroundReady = true
  if (!portalRevealSfxPlayed) {
    portalRevealSfxPlayed = true
    playPortalSfx('portal-reveal')
  }
  clearBackgroundRevealTimers()
}

function handleLogoReady() {
  if (typeof window === 'undefined' || backgroundReady) return

  if (backgroundRevealTimeout) {
    window.clearTimeout(backgroundRevealTimeout)
  }

  backgroundRevealTimeout = window.setTimeout(() => {
    revealBackground()
  }, backgroundRevealDelayMs)
}

onMount(() => {
  syncViewportMode()
  adaptiveDprController = createAdaptiveCanvasDprController({
    getMaxDpr: getHomeMaxCanvasDpr,
    initialDpr: 1.5,
    setDpr: setCanvasDpr,
  })
  adaptiveDprController.start()
  updateScrollDrivenWheel()
  syncPortalVisibility()
  backgroundRevealFallbackTimeout = window.setTimeout(() => {
    revealBackground()
  }, backgroundRevealFallbackDelayMs)

  const portalVisibilityObserver =
    'IntersectionObserver' in window && shell
      ? new IntersectionObserver(syncPortalVisibility)
      : null
  portalVisibilityObserver?.observe(shell)

  window.addEventListener('pointerdown', handlePointerDown)
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('pointercancel', handlePointerUp)
  window.addEventListener('touchstart', handleTouchStart, { passive: true })
  window.addEventListener('wheel', handleWheel, { passive: false })
  window.addEventListener('keydown', handleKeyboardScroll)
  window.addEventListener(homePortalEvents.portalAdvance, handlePortalAdvance)
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', syncPortalVisibility, { passive: true })

  return () => {
    portalVisibilityObserver?.disconnect()
    window.removeEventListener('pointerdown', handlePointerDown)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    window.removeEventListener('pointercancel', handlePointerUp)
    window.removeEventListener('touchstart', handleTouchStart)
    unbindActiveTouchListeners()
    window.removeEventListener('wheel', handleWheel)
    window.removeEventListener('keydown', handleKeyboardScroll)
    window.removeEventListener(homePortalEvents.portalAdvance, handlePortalAdvance)
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('scroll', syncPortalVisibility)
    if (scrollFrame) {
      window.cancelAnimationFrame(scrollFrame)
      scrollFrame = 0
      lastScrollFrameAt = 0
    }
    adaptiveDprController?.stop()
    adaptiveDprController = null
    document.documentElement.classList.remove(standardBannerPhaseClass)
    clearBackgroundRevealTimers()
  }
})

onDestroy(() => {
  input.active = false
  activeTouchId = null
  unbindActiveTouchListeners()
  if (scrollFrame) {
    window.cancelAnimationFrame(scrollFrame)
    scrollFrame = 0
    lastScrollFrameAt = 0
  }
  adaptiveDprController?.stop()
  adaptiveDprController = null
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove(standardBannerPhaseClass)
  }
  clearBackgroundRevealTimers()
})
</script>

<div
  bind:this={shell}
  class="home-intro-environment"
  class:home-intro-environment--background-ready={backgroundReady}
  class:home-intro-environment--screen-hover={portalHoverActive}
  style={`--portal-reveal-progress: ${revealProgress}`}
>
  <div class="home-intro-background-curtain" aria-hidden="true"></div>

	<Canvas {createRenderer} dpr={canvasDpr}>
		<HomeIntroEnvironmentScene
			{input}
			{titleImageSrc}
			{sceneQuality}
			{hoveredScreenIndex}
			{portalVisible}
			motionEnabled={portalEffectsVisible}
			logoEffectsEnabled={logoEffectsVisible}
			onLogoReady={handleLogoReady}
		/>
		<HomeIntroPostProcessing
			{input}
			{sceneQuality}
			{activeScreenIndex}
			{backgroundReady}
			portalVisible={logoEffectsVisible}
		/>
	</Canvas>

	<div class="home-intro-copy home-intro-copy--status" aria-live="polite">
		<div class="home-intro-copy__label">{activeScreen.kicker}</div>
		<div class="home-intro-copy__stat">{activeScreen.stat}</div>
	</div>

	<aside class="home-intro-copy home-intro-copy--feature" aria-label={`Portal destination: ${activeScreen.title}`}>
		<div class="home-intro-copy__label">{activeScreen.kicker}</div>
		<h2>{activeScreen.title}</h2>
		<p>{activeScreen.description}</p>
		{#if activeScreen.href && activeScreen.ctaLabel}
			<a
				href={activeScreen.href}
				class="home-intro-copy__button"
				data-sfx-hover="portal-hover"
				data-sfx-click="portal-activate"
			>
				{activeScreen.ctaLabel}
			</a>
		{/if}
	</aside>
</div>
