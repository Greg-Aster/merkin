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
  lastPointerX = event.clientX
  lastPointerY = event.clientY
  updatePointer(event.clientX, event.clientY)
}

function handlePointerMove(event: PointerEvent) {
  updatePointer(event.clientX, event.clientY)

  if (!input.active) return

  const width = Math.max(shell?.clientWidth ?? window.innerWidth, 1)
  const height = Math.max(shell?.clientHeight ?? window.innerHeight, 1)
  const deltaX = event.clientX - lastPointerX
  const deltaY = event.clientY - lastPointerY

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

function handlePointerUp() {
  input.active = false
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

<style>
  .home-intro-environment {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .home-intro-environment :global(canvas) {
    filter: saturate(1.22) contrast(1.08);
  }

  .home-intro-copy {
    position: absolute;
    z-index: 4;
    max-width: min(29rem, calc(100% - 2rem));
    color: rgb(248 250 252);
    text-shadow: 0 0.18rem 1rem rgb(0 0 0 / 0.82);
    pointer-events: auto;
  }

  .home-intro-copy::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    border: 1px solid rgb(255 255 255 / 0.13);
    background:
      linear-gradient(90deg, rgb(255 255 255 / 0.07), transparent 18%, transparent 82%, rgb(255 255 255 / 0.04)),
      linear-gradient(180deg, rgb(3 7 18 / 0.68), rgb(3 7 18 / 0.34));
    box-shadow:
      0 1.35rem 3rem rgb(0 0 0 / 0.28),
      inset 0 1px 0 rgb(255 255 255 / 0.08);
    backdrop-filter: blur(13px) saturate(1.14);
  }

  .home-intro-copy--status {
    top: clamp(1rem, 5vh, 3rem);
    right: clamp(1rem, 4vw, 3.25rem);
    display: grid;
    gap: 0.42rem;
    min-width: min(20rem, calc(100% - 2rem));
    padding: 0.78rem 0.92rem;
    text-align: right;
  }

  .home-intro-copy--status::before {
    border-radius: 0.35rem;
  }

  .home-intro-copy--feature {
    left: clamp(1rem, 4vw, 3.25rem);
    bottom: clamp(1.1rem, 5vh, 3.4rem);
    display: grid;
    gap: 0.72rem;
    padding: clamp(0.98rem, 2vw, 1.3rem);
  }

  .home-intro-copy--feature::before {
    border-radius: 0.45rem;
  }

  .home-intro-copy__label,
  .home-intro-copy__stat,
  .home-intro-copy__button {
    font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.16em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .home-intro-copy__label {
    color: rgb(103 232 249);
  }

  .home-intro-copy__stat {
    color: rgb(226 232 240 / 0.76);
  }

  .home-intro-copy h2 {
    max-width: 14ch;
    margin: 0;
    font-size: clamp(1.85rem, 4.2vw, 4.6rem);
    font-weight: 900;
    line-height: 0.95;
    text-transform: uppercase;
  }

  .home-intro-copy p {
    max-width: 31rem;
    margin: 0;
    color: rgb(226 232 240 / 0.86);
    font-size: clamp(0.92rem, 1.3vw, 1.05rem);
    line-height: 1.55;
  }

  .home-intro-copy__button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    justify-self: start;
    min-height: 2.55rem;
    padding: 0.72rem 1rem;
    border: 1px solid rgb(103 232 249 / 0.42);
    border-radius: 0.35rem;
    background: rgb(8 145 178 / 0.24);
    color: rgb(236 254 255);
    text-decoration: none;
    transition:
      background-color 160ms ease,
      border-color 160ms ease,
      transform 160ms ease;
  }

  .home-intro-copy__button:hover,
  .home-intro-copy__button:focus-visible {
    border-color: rgb(165 243 252 / 0.72);
    background: rgb(8 145 178 / 0.38);
    transform: translateY(-1px);
    outline: none;
  }

  .home-intro-copy__button:focus-visible {
    box-shadow: 0 0 0 3px rgb(103 232 249 / 0.24);
  }

  @media (max-width: 760px) {
    .home-intro-copy {
      max-width: calc(100% - 1.5rem);
    }

    .home-intro-copy--status {
      top: 0.75rem;
      right: 0.75rem;
      min-width: 0;
      width: min(18rem, calc(100% - 1.5rem));
      padding: 0.62rem 0.7rem;
    }

    .home-intro-copy--feature {
      right: 0.75rem;
      left: 0.75rem;
      bottom: 0.8rem;
      padding: 0.86rem;
      gap: 0.5rem;
    }

    .home-intro-copy h2 {
      max-width: 18ch;
      font-size: clamp(1.35rem, 8vw, 2.2rem);
      line-height: 1;
    }

    .home-intro-copy p {
      display: -webkit-box;
      overflow: hidden;
      font-size: 0.84rem;
      line-height: 1.42;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
    }

    .home-intro-copy__label,
    .home-intro-copy__stat,
    .home-intro-copy__button {
      font-size: 0.58rem;
      letter-spacing: 0.12em;
    }

    .home-intro-copy__button {
      min-height: 2.1rem;
      padding: 0.56rem 0.72rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .home-intro-environment {
      opacity: 0.7;
    }

    .home-intro-copy__button {
      transition: none;
    }
  }
</style>
