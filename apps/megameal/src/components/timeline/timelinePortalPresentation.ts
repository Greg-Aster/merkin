import type {
  TimelineCarouselInput,
  TimelineCarouselScreen,
} from './timelinePortalCarouselModel'
import { clamp } from './timelinePortalCarouselModel'
import {
  ACESFilmicToneMapping,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'

export type TimelineConstellationLine = {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  eraKey: string
  isActive: boolean
  length: number
}

export type TimelineStarScreenPosition = {
  index: number
  x: number
  y: number
  size: number
  visible: boolean
  eraKey: string
  isKeyEvent: boolean
}

type TimelineStarControl = TimelineStarScreenPosition & {
  screen: TimelineCarouselScreen
}

export function createTimelineRenderer(canvas: HTMLCanvasElement) {
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  renderer.setClearColor(0x000000, 0)
  return renderer
}

export function getDesktopSelectedCardStyle(
  selectedPosition: TimelineStarScreenPosition | null,
  cardWidth: number,
  screenHeight: number,
) {
  const baseStyle = `width: ${cardWidth}px; max-width: calc(100% - 2rem)`
  if (!selectedPosition) return `${baseStyle}; --timeline-selected-bottom: 1rem`

  const safeX = clamp(selectedPosition.x, 5, 95)
  const safeY = clamp(selectedPosition.y, 10, 86)
  const offsetX = safeX > 58 ? 'calc(-100% - 1.25rem)' : '1.25rem'
  const offsetY = safeY < 28 ? '0rem' : safeY > 68 ? '-100%' : '-50%'
  const maxHeight = screenHeight < 720 ? 'min(32vh, 12rem)' : 'min(34vh, 15rem)'

  return [
    baseStyle,
    `max-height: ${maxHeight}`,
    '--timeline-selected-bottom: auto',
    `--timeline-selected-left: ${safeX}%`,
    `--timeline-selected-top: ${safeY}%`,
    `--timeline-selected-offset-x: ${offsetX}`,
    `--timeline-selected-offset-y: ${offsetY}`,
  ].join('; ')
}

export function getTimelineMaxCanvasDpr() {
  if (typeof window === 'undefined') return 1
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 1

  const compactViewport = window.innerWidth <= 760 || window.innerHeight <= 640
  const dprCap = compactViewport ? 1.5 : 2

  return Math.min(Math.max(1, window.devicePixelRatio || 1), dprCap)
}

export function getTimelineStarControlStyle(
  position: TimelineStarScreenPosition,
) {
  return [
    `left: ${position.x}%`,
    `top: ${position.y}%`,
    `width: ${position.size}px`,
    `height: ${position.size}px`,
    'transform: translate(-50%, -50%)',
  ].join(';')
}

export function isTimelineShellVisible(shell: HTMLElement | null) {
  if (!shell) return false
  const bounds = shell.getBoundingClientRect()
  return (
    bounds.bottom > 0 &&
    bounds.top < window.innerHeight &&
    bounds.right > 0 &&
    bounds.left < window.innerWidth
  )
}

export function isPointInsideTimelineShell(
  shell: HTMLElement | null,
  clientX: number,
  clientY: number,
) {
  if (!shell) return false
  const bounds = shell.getBoundingClientRect()
  return (
    clientX >= bounds.left &&
    clientX <= bounds.right &&
    clientY >= bounds.top &&
    clientY <= bounds.bottom
  )
}

export function updateTimelinePointer(
  input: TimelineCarouselInput,
  shell: HTMLElement | null,
  clientX: number,
  clientY: number,
) {
  if (!shell) return
  const bounds = shell.getBoundingClientRect()
  if (bounds.width <= 0 || bounds.height <= 0) return
  input.x = ((clientX - bounds.left) / bounds.width - 0.5) * 2
  input.y = ((clientY - bounds.top) / bounds.height - 0.5) * 2
}

export function setTimelineCameraPan(
  input: TimelineCarouselInput,
  panX: number,
  panY: number,
  limit: number,
) {
  input.panX = clamp(panX, -limit, limit)
  input.panY = clamp(panY, -limit, limit)
}

export function setTimelineMapZoom(
  input: TimelineCarouselInput,
  zoom: number,
  minimum: number,
  maximum: number,
) {
  input.mapZoom = clamp(zoom, minimum, maximum)
}

export function panTimelineCamera(
  input: TimelineCarouselInput,
  deltaX: number,
  deltaY: number,
  isMapMode: boolean,
  minimumMapZoom: number,
  panLimit: number,
) {
  const mapScale = isMapMode
    ? 0.72 / Math.max(input.mapZoom, minimumMapZoom)
    : 1
  setTimelineCameraPan(
    input,
    input.panX + deltaX * mapScale,
    input.panY + deltaY * mapScale,
    panLimit,
  )
}

export function applyTimelineCameraDrag(
  input: TimelineCarouselInput,
  shell: HTMLElement | null,
  deltaX: number,
  deltaY: number,
  isMapMode: boolean,
  panLimit: number,
  orbitLimit: number,
) {
  if (!shell) return
  const bounds = shell.getBoundingClientRect()
  if (isMapMode) {
    input.mapOrbitX = clamp(
      input.mapOrbitX + (deltaX / Math.max(bounds.width, 1)) * 4,
      -orbitLimit,
      orbitLimit,
    )
    input.mapOrbitY = clamp(
      input.mapOrbitY + (deltaY / Math.max(bounds.height, 1)) * 3.2,
      -orbitLimit,
      orbitLimit,
    )
    return
  }
  setTimelineCameraPan(
    input,
    input.panX - (deltaX / Math.max(bounds.width, 1)) * 3.1,
    input.panY + (deltaY / Math.max(bounds.height, 1)) * 2.7,
    panLimit,
  )
}

export function createTimelineCameraController({
  input,
  isMapMode,
  pause,
  panStep,
  getPanLimit,
  minimumMapZoom,
  maximumMapZoom,
  mapZoomStep,
  mapOrbitLimit,
  mapOrbitStep,
}: {
  input: TimelineCarouselInput
  isMapMode: () => boolean
  pause: () => void
  panStep: number
  getPanLimit: () => number
  minimumMapZoom: number
  maximumMapZoom: number
  mapZoomStep: number
  mapOrbitLimit: number
  mapOrbitStep: number
}) {
  const pan = (x: number, y: number) => {
    pause()
    panTimelineCamera(input, x, y, isMapMode(), minimumMapZoom, getPanLimit())
  }
  const zoom = (multiplier: number) => {
    if (!isMapMode()) return
    pause()
    setTimelineMapZoom(
      input,
      input.mapZoom * multiplier,
      minimumMapZoom,
      maximumMapZoom,
    )
  }
  const orbit = (x: number, y: number) => {
    if (!isMapMode()) return
    pause()
    input.mapOrbitX = clamp(input.mapOrbitX + x, -mapOrbitLimit, mapOrbitLimit)
    input.mapOrbitY = clamp(input.mapOrbitY + y, -mapOrbitLimit, mapOrbitLimit)
  }
  const reset = () => {
    pause()
    setTimelineCameraPan(input, 0, 0, getPanLimit())
    if (!isMapMode()) return
    input.mapZoom = 1
    input.mapOrbitX = 0
    input.mapOrbitY = 0
  }
  const handleKey = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    if (event.key === 'ArrowLeft') pan(-panStep, 0)
    else if (event.key === 'ArrowRight') pan(panStep, 0)
    else if (event.key === 'ArrowUp') pan(0, panStep)
    else if (event.key === 'ArrowDown') pan(0, -panStep)
    else if (key === '=' || key === '+') zoom(mapZoomStep)
    else if (key === '-' || key === '_') zoom(1 / mapZoomStep)
    else if (key === 'a') orbit(-mapOrbitStep, 0)
    else if (key === 'd') orbit(mapOrbitStep, 0)
    else if (key === 'w') orbit(0, -mapOrbitStep)
    else if (key === 's') orbit(0, mapOrbitStep)
    else if (key === '0') reset()
    else return false
    return true
  }

  return { handleKey, orbit, pan, reset, zoom }
}

export function getTimelineSelectedCardAnchor(
  shell: HTMLElement | null,
  selectedIndex: number,
  starPositions: TimelineStarScreenPosition[],
) {
  if (!shell || selectedIndex < 0) return null

  const card = shell.querySelector<HTMLElement>('[data-timeline-selected-card]')
  const selectedPosition = starPositions.find(
    position => position.index === selectedIndex,
  )
  if (!card || !selectedPosition) return null

  const shellRect = shell.getBoundingClientRect()
  const cardRect = card.getBoundingClientRect()
  if (
    shellRect.width <= 0 ||
    shellRect.height <= 0 ||
    cardRect.width <= 0 ||
    cardRect.height <= 0
  )
    return null

  const starX = shellRect.left + (selectedPosition.x / 100) * shellRect.width
  const starY = shellRect.top + (selectedPosition.y / 100) * shellRect.height
  const anchorX = clamp(starX, cardRect.left, cardRect.right)
  const anchorY = clamp(starY, cardRect.top, cardRect.bottom)

  return {
    x: ((anchorX - shellRect.left) / shellRect.width) * 100,
    y: ((anchorY - shellRect.top) / shellRect.height) * 100,
  }
}

export function getVisibleTimelineConstellationLines(
  controls: TimelineStarControl[],
  selectedIndex: number,
): TimelineConstellationLine[] {
  const groups = controls.reduce<Record<string, TimelineStarControl[]>>(
    (grouped, control) => {
      grouped[control.eraKey] ??= []
      grouped[control.eraKey].push(control)
      return grouped
    },
    {},
  )

  return Object.entries(groups).flatMap(([eraKey, eraControls]) => {
    const sortedControls = [...eraControls].sort((a, b) => a.index - b.index)

    return sortedControls.slice(0, -1).map((control, index) => {
      const nextControl = sortedControls[index + 1]
      return {
        id: `${eraKey}-${control.index}-${nextControl.index}`,
        x1: clampConstellationPoint(control.x),
        y1: clampConstellationPoint(control.y),
        x2: clampConstellationPoint(nextControl.x),
        y2: clampConstellationPoint(nextControl.y),
        eraKey,
        isActive:
          control.index === selectedIndex ||
          nextControl.index === selectedIndex,
        length: Math.hypot(
          nextControl.x - control.x,
          nextControl.y - control.y,
        ),
      }
    })
  })
}

export function getSelectedTimelineGuideLine(
  cardAnchor: { x: number; y: number } | null,
  selectedIndex: number,
  starPositions: TimelineStarScreenPosition[],
  screens: TimelineCarouselScreen[],
): TimelineConstellationLine | null {
  if (!cardAnchor || selectedIndex < 0) return null

  const selectedPosition = starPositions.find(
    position => position.index === selectedIndex && position.size > 0,
  )
  const selectedScreen = screens[selectedIndex]
  if (!selectedPosition || !selectedScreen) return null

  return {
    id: `selected-guide-${selectedIndex}`,
    x1: clampConstellationPoint(selectedPosition.x),
    y1: clampConstellationPoint(selectedPosition.y),
    x2: clampConstellationPoint(cardAnchor.x),
    y2: clampConstellationPoint(cardAnchor.y),
    eraKey: selectedScreen.eraKey,
    isActive: true,
    length: Math.hypot(
      cardAnchor.x - selectedPosition.x,
      cardAnchor.y - selectedPosition.y,
    ),
  }
}

export function isTimelineInteractiveTarget(eventTarget: EventTarget | null) {
  return (
    eventTarget instanceof Element &&
    !!eventTarget.closest(
      'a, button, input, textarea, select, [role="button"], [data-timeline-interactive]',
    )
  )
}

function clampConstellationPoint(value: number) {
  return clamp(value, -18, 118)
}
