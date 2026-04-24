<script lang="ts">
import { Canvas } from "@threlte/core";
import { onDestroy, onMount } from "svelte";
import * as THREE from "three";
import HomeIntroEnvironmentScene from "./HomeIntroEnvironmentScene.svelte";

type IntroInputState = {
	x: number;
	y: number;
	dragX: number;
	dragY: number;
	active: boolean;
};

// biome-ignore lint/style/useConst: Svelte bind:this assigns this ref at runtime.
let shell: HTMLDivElement | null = null;
let lastPointerX = 0;
let lastPointerY = 0;
const input: IntroInputState = {
	x: 0,
	y: 0,
	dragX: 0,
	dragY: 0,
	active: false,
};

const createRenderer = (canvas: HTMLCanvasElement) => {
	const renderer = new THREE.WebGLRenderer({
		canvas,
		alpha: true,
		antialias: true,
		powerPreference: "high-performance",
	});

	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.25;
	renderer.setClearColor(0x000000, 0);

	return renderer;
};

function updatePointer(clientX: number, clientY: number) {
	if (!shell) return;

	const bounds = shell.getBoundingClientRect();
	if (bounds.width <= 0 || bounds.height <= 0) return;

	input.x = ((clientX - bounds.left) / bounds.width - 0.5) * 2;
	input.y = ((clientY - bounds.top) / bounds.height - 0.5) * 2;
}

function isInsideShell(clientX: number, clientY: number) {
	if (!shell) return false;

	const bounds = shell.getBoundingClientRect();
	return (
		clientX >= bounds.left &&
		clientX <= bounds.right &&
		clientY >= bounds.top &&
		clientY <= bounds.bottom
	);
}

function handlePointerDown(event: PointerEvent) {
	if (!isInsideShell(event.clientX, event.clientY)) return;

	input.active = true;
	lastPointerX = event.clientX;
	lastPointerY = event.clientY;
	updatePointer(event.clientX, event.clientY);
}

function handlePointerMove(event: PointerEvent) {
	updatePointer(event.clientX, event.clientY);

	if (!input.active) return;

	const width = Math.max(shell?.clientWidth ?? window.innerWidth, 1);
	const height = Math.max(shell?.clientHeight ?? window.innerHeight, 1);
	input.dragX += (event.clientX - lastPointerX) / width;
	input.dragY += (event.clientY - lastPointerY) / height;
	lastPointerX = event.clientX;
	lastPointerY = event.clientY;
}

function handlePointerUp() {
	input.active = false;
}

onMount(() => {
	window.addEventListener("pointerdown", handlePointerDown);
	window.addEventListener("pointermove", handlePointerMove);
	window.addEventListener("pointerup", handlePointerUp);
	window.addEventListener("pointercancel", handlePointerUp);

	return () => {
		window.removeEventListener("pointerdown", handlePointerDown);
		window.removeEventListener("pointermove", handlePointerMove);
		window.removeEventListener("pointerup", handlePointerUp);
		window.removeEventListener("pointercancel", handlePointerUp);
	};
});

onDestroy(() => {
	input.active = false;
});
</script>

<div bind:this={shell} class="home-intro-environment">
	<Canvas {createRenderer} dpr={1.5}>
		<HomeIntroEnvironmentScene {input} />
	</Canvas>
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

  @media (prefers-reduced-motion: reduce) {
    .home-intro-environment {
      opacity: 0.7;
    }
  }
</style>
