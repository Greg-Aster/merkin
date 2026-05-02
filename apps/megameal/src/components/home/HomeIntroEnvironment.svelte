<script lang="ts">
import { Canvas } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import * as THREE from 'three'
import HomeIntroEnvironmentScene from './HomeIntroEnvironmentScene.svelte'
import {
  homeIntroIntroOffsetScreens,
  homeIntroMaxWheel,
  homeIntroScreens,
  homeIntroWheelToScreenRatio,
} from './homeIntroScreens'

import '../../styles/features/extracted/home-intro-environment.css'
type IntroInputState = {
  x: number
  y: number
  dragX: number
  dragY: number
  wheel: number
  reveal: number
  active: boolean
}

export let titleImageSrc = ''

let shell: HTMLDivElement | null = null
let lastPointerX = 0
let lastPointerY = 0
let activePointerId: number | null = null
let activeTouchId: number | null = null
let virtualWheel = 0
let scrollFrame = 0
let activeScreenIndex = 0
let revealProgress = 0
const input: IntroInputState = {
  x: 0,
  y: 0,
  dragX: 0,
  dragY: 0,
  wheel: 0,
  reveal: 0,
  active: false,
}
const carouselRevealWheelSpan =
  homeIntroIntroOffsetScreens / homeIntroWheelToScreenRatio
$: activeScreen = homeIntroScreens[activeScreenIndex] ?? homeIntroScreens[0]

const createRenderer = (canvas: HTMLCanvasElement) => {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  })

  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  renderer.setClearColor(0x000000, 0)

  return renderer
}

function updatePointer(clientX: number, clientY: number) {
  if (!shell) return

  const bounds = shell.getBoundingClientRect()
  if (bounds.width <= 0 || bounds.height <= 0) return

  input.x = ((clientX - bounds.left) / bounds.width - 0.5) * 2
  input.y = ((clientY - bounds.top) / bounds.height - 0.5) * 2
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

function isShellVisible() {
  if (!shell) return false

  const bounds = shell.getBoundingClientRect()
  return (
    bounds.bottom > 0 &&
    bounds.top < window.innerHeight &&
    bounds.right > 0 &&
    bounds.left < window.innerWidth
  )
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

function syncActiveScreenFromWheel(wheel: number) {
  activeScreenIndex = clampScreenIndex(
    Math.round(wheel * homeIntroWheelToScreenRatio - homeIntroIntroOffsetScreens),
  )
}

function syncRevealProgress() {
  input.reveal = clamp(input.wheel / carouselRevealWheelSpan, 0, 1)
  revealProgress = input.reveal
}

function updateScrollDrivenWheel() {
  input.wheel = clamp(virtualWheel, 0, homeIntroMaxWheel)
  syncRevealProgress()
  syncActiveScreenFromWheel(input.wheel)
}

function scheduleScrollDrivenWheel() {
  if (scrollFrame) return

  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = 0
    updateScrollDrivenWheel()
  })
}

function isInteractiveTarget(eventTarget: EventTarget | null) {
  return (
    eventTarget instanceof Element &&
    !!eventTarget.closest('a, button, input, textarea, select, [role="button"]')
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
  virtualWheel = clamp(
    virtualWheel - (deltaY / Math.max(wheelDistance, 1)) * 4.2,
    0,
    homeIntroMaxWheel,
  )
  scheduleScrollDrivenWheel()
  lastPointerX = clientX
  lastPointerY = clientY
}

function handlePointerDown(event: PointerEvent) {
  if (event.pointerType === 'touch' || isInteractiveTarget(event.target)) return
  if (!isInsideShell(event.clientX, event.clientY)) return

  input.active = true
  activePointerId = event.pointerId
  lastPointerX = event.clientX
  lastPointerY = event.clientY
  updatePointer(event.clientX, event.clientY)

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
  applyDragDelta(event.clientX, event.clientY, 1, height)
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

  input.active = false
  activePointerId = null
}

function getChangedTouch(event: TouchEvent) {
  return activeTouchId === null
    ? event.changedTouches[0]
    : Array.from(event.changedTouches).find(
        ({ identifier }) => identifier === activeTouchId,
      )
}

function handleTouchStart(event: TouchEvent) {
  if (isInteractiveTarget(event.target)) return

  const touch = event.changedTouches[0]
  if (!touch || !isInsideShell(touch.clientX, touch.clientY)) return

  activeTouchId = touch.identifier
  activePointerId = null
  input.active = true
  lastPointerX = touch.clientX
  lastPointerY = touch.clientY
  updatePointer(touch.clientX, touch.clientY)
}

function handleTouchMove(event: TouchEvent) {
  const touch = getChangedTouch(event)
  if (!touch || activeTouchId === null) return

  event.preventDefault()
  const touchWheelDistance = Math.max(
    220,
    Math.min(window.innerHeight * 0.46, 360),
  )
  applyDragDelta(touch.clientX, touch.clientY, 2.15, touchWheelDistance)
}

function handleTouchEnd(event: TouchEvent) {
  const touch = getChangedTouch(event)
  if (!touch) return

  input.active = false
  activeTouchId = null
}

function handleWheel(event: WheelEvent) {
  if (!shell || (!isInsideShell(event.clientX, event.clientY) && !isShellVisible())) {
    return
  }

  event.preventDefault()
  const viewportHeight = Math.max(window.innerHeight, 1)
  virtualWheel = clamp(
    virtualWheel + (event.deltaY / viewportHeight) * 2.4,
    0,
    homeIntroMaxWheel,
  )
  scheduleScrollDrivenWheel()
}

onMount(() => {
  updateScrollDrivenWheel()

  window.addEventListener('pointerdown', handlePointerDown)
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('pointercancel', handlePointerUp)
  window.addEventListener('touchstart', handleTouchStart, { passive: false })
  window.addEventListener('touchmove', handleTouchMove, { passive: false })
  window.addEventListener('touchend', handleTouchEnd)
  window.addEventListener('touchcancel', handleTouchEnd)
  window.addEventListener('wheel', handleWheel, { passive: false })
  window.addEventListener('resize', scheduleScrollDrivenWheel)

  return () => {
    window.removeEventListener('pointerdown', handlePointerDown)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    window.removeEventListener('pointercancel', handlePointerUp)
    window.removeEventListener('touchstart', handleTouchStart)
    window.removeEventListener('touchmove', handleTouchMove)
    window.removeEventListener('touchend', handleTouchEnd)
    window.removeEventListener('touchcancel', handleTouchEnd)
    window.removeEventListener('wheel', handleWheel)
    window.removeEventListener('resize', scheduleScrollDrivenWheel)
    if (scrollFrame) {
      window.cancelAnimationFrame(scrollFrame)
      scrollFrame = 0
    }
  }
})

onDestroy(() => {
  input.active = false
  activeTouchId = null
  if (scrollFrame) {
    window.cancelAnimationFrame(scrollFrame)
    scrollFrame = 0
  }
})
</script>

<div
  bind:this={shell}
  class="home-intro-environment"
  style={`--portal-reveal-progress: ${revealProgress}`}
>
	<Canvas {createRenderer} dpr={1.5}>
		<HomeIntroEnvironmentScene {input} {titleImageSrc} />
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
			<a href={activeScreen.href} class="home-intro-copy__button">
				{activeScreen.ctaLabel}
			</a>
		{/if}
	</aside>
</div>
