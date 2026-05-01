<script lang="ts">
import { Canvas } from '@threlte/core'
import { onDestroy, onMount } from 'svelte'
import * as THREE from 'three'
import HomeIntroEnvironmentScene from './HomeIntroEnvironmentScene.svelte'
import {
  homeIntroMaxWheel,
  homeIntroMinWheel,
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
  active: boolean
}

export let titleImageSrc = ''

let shell: HTMLDivElement | null = null
let lastPointerX = 0
let lastPointerY = 0
let activePointerId: number | null = null
let manualWheelOffset = 0
let scrollFrame = 0
let activeScreenIndex = 0
const input: IntroInputState = {
  x: 0,
  y: 0,
  dragX: 0,
  dragY: 0,
  wheel: 0,
  active: false,
}
const touchDragMultiplier = 1.55

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
  renderer.toneMappingExposure = 1.25
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

function wrappedScreenIndex(value: number) {
  return ((value % homeIntroScreens.length) + homeIntroScreens.length) % homeIntroScreens.length
}

function syncActiveScreenFromWheel(wheel: number) {
  activeScreenIndex = wrappedScreenIndex(
    Math.round(wheel * homeIntroWheelToScreenRatio),
  )
}

function updateScrollDrivenWheel() {
  if (!shell) {
    input.wheel = manualWheelOffset
    syncActiveScreenFromWheel(input.wheel)
    return
  }

  const bounds = shell.getBoundingClientRect()
  const viewportHeight = Math.max(window.innerHeight, 1)
  const scrollableDistance = Math.max(bounds.height - viewportHeight, viewportHeight)
  const scrollProgress = clamp(-bounds.top / scrollableDistance, 0, 1)
  const scrollWheel = scrollProgress * homeIntroMaxWheel

  input.wheel = clamp(
    scrollWheel + manualWheelOffset,
    homeIntroMinWheel,
    homeIntroMaxWheel,
  )
  syncActiveScreenFromWheel(input.wheel)
}

function scheduleScrollDrivenWheel() {
  if (scrollFrame) return

  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = 0
    updateScrollDrivenWheel()
  })
}

function handlePointerDown(event: PointerEvent) {
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
  if (
    input.active &&
    activePointerId !== null &&
    event.pointerId !== activePointerId
  ) {
    return
  }

  updatePointer(event.clientX, event.clientY)

  if (!input.active) return

  const width = Math.max(shell?.clientWidth ?? window.innerWidth, 1)
  const height = Math.max(shell?.clientHeight ?? window.innerHeight, 1)
  const inputMultiplier = event.pointerType === 'touch' ? touchDragMultiplier : 1
  const deltaX = (event.clientX - lastPointerX) * inputMultiplier
  const deltaY = (event.clientY - lastPointerY) * inputMultiplier

  input.dragX += deltaX / width
  input.dragY += deltaY / height
  manualWheelOffset = clamp(
    manualWheelOffset - (deltaY / height) * 4.2,
    homeIntroMinWheel,
    homeIntroMaxWheel,
  )
  scheduleScrollDrivenWheel()
  lastPointerX = event.clientX
  lastPointerY = event.clientY
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

function handleWheel(event: WheelEvent) {
  if (!shell || (!isInsideShell(event.clientX, event.clientY) && !isShellVisible())) {
    return
  }

  const viewportHeight = Math.max(window.innerHeight, 1)
  manualWheelOffset = clamp(
    manualWheelOffset + (event.deltaY / viewportHeight) * 2.4,
    homeIntroMinWheel,
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
  window.addEventListener('wheel', handleWheel, { passive: true })
  window.addEventListener('scroll', scheduleScrollDrivenWheel, { passive: true })
  window.addEventListener('resize', scheduleScrollDrivenWheel)

  return () => {
    window.removeEventListener('pointerdown', handlePointerDown)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    window.removeEventListener('pointercancel', handlePointerUp)
    window.removeEventListener('wheel', handleWheel)
    window.removeEventListener('scroll', scheduleScrollDrivenWheel)
    window.removeEventListener('resize', scheduleScrollDrivenWheel)
    if (scrollFrame) {
      window.cancelAnimationFrame(scrollFrame)
      scrollFrame = 0
    }
  }
})

onDestroy(() => {
  input.active = false
  if (scrollFrame) {
    window.cancelAnimationFrame(scrollFrame)
    scrollFrame = 0
  }
})
</script>

<div bind:this={shell} class="home-intro-environment">
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
