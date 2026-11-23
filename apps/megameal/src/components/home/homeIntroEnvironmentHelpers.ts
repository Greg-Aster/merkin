import { getRichMediaCapabilities } from '@/utils/richMediaCapabilities'
import * as THREE from 'three'
import { homeIntroScreens } from './homeIntroScreens'

export type HomeSceneQuality = 'high' | 'balanced' | 'lean'

export interface IntroInputState {
  x: number
  y: number
  dragX: number
  dragY: number
  wheel: number
  reveal: number
  introOffsetScreens: number
  active: boolean
}

export function createHomeIntroRenderer(
  canvas: HTMLCanvasElement,
): THREE.WebGLRenderer {
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

export function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function clampHomeScreenIndex(value: number): number {
  return Math.min(homeIntroScreens.length - 1, Math.max(0, value))
}

export function getHomeMaxCanvasDpr(): number {
  if (typeof window === 'undefined') return 1

  const { compactViewport, devicePixelRatio, lowMemoryDevice, reducedData } =
    getRichMediaCapabilities()
  const dprCap = lowMemoryDevice || reducedData ? 1 : compactViewport ? 1.5 : 2

  return Math.min(devicePixelRatio, dprCap)
}

export function getHomeSceneQuality(nextDpr: number): HomeSceneQuality {
  if (typeof window === 'undefined') return 'high'

  const { compactViewport, devicePixelRatio, lowMemoryDevice, reducedData } =
    getRichMediaCapabilities()

  if (reducedData || lowMemoryDevice || compactViewport) return 'lean'
  if (devicePixelRatio > 1.1 && nextDpr <= 1.01) return 'lean'
  if (devicePixelRatio > 1.5 || nextDpr < 1.45) return 'balanced'

  return 'high'
}

export function isPointInsideElement(
  element: HTMLElement | null,
  clientX: number,
  clientY: number,
): boolean {
  if (!element) return false
  const bounds = element.getBoundingClientRect()
  return (
    clientX >= bounds.left &&
    clientX <= bounds.right &&
    clientY >= bounds.top &&
    clientY <= bounds.bottom
  )
}

export function isPointerOverPortalScreen(
  shell: HTMLElement | null,
  portraitMobile: boolean,
  clientX: number,
  clientY: number,
): boolean {
  if (!shell || !isPointInsideElement(shell, clientX, clientY)) return false

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

export function getPortalScreenTransitionRect(
  shell: HTMLElement | null,
  portraitMobile: boolean,
): DOMRect | null {
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

export function isElementInViewport(element: HTMLElement | null): boolean {
  if (!element) return false
  const bounds = element.getBoundingClientRect()
  return (
    bounds.bottom > 0 &&
    bounds.top < window.innerHeight &&
    bounds.right > 0 &&
    bounds.left < window.innerWidth
  )
}

export function isPortalInteractiveTarget(
  eventTarget: EventTarget | null,
): boolean {
  return (
    eventTarget instanceof Element &&
    !!eventTarget.closest(
      'a, button, input, textarea, select, [role="button"], [data-portal-demo-player]',
    )
  )
}
