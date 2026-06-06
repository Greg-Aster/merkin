<script lang="ts">
import { onDestroy, onMount } from "svelte";
import type { RuntimeSnapshot } from "../engine/client-api/index.js";
import type { Command, MobileInputControlsPort } from "../engine/index.js";
import {
	type GameHudState,
	MOBILE_TOUCH_ACTION_IDS,
	getRuntimeSceneManifest,
} from "../game/index.js";
import MobileControls from "../ui/MobileControls.svelte";
import RuntimeHud from "../ui/RuntimeHud.svelte";
import { createBrowserGameClient } from "./browserGameClient";

const defaultGameState: GameHudState = {
	playerAlive: false,
	playerPosition: [0, 0, 0],
	health: [0, 0],
	remainingCollectibles: 0,
	collectedCount: 0,
	moving: false,
	pointerLocked: false,
	lookActive: false,
	inputEnabled: false,
	charging: false,
	chargeAmount: 0,
};

let canvas: HTMLCanvasElement;
let snapshot: RuntimeSnapshot = $state({
	lifecycle: "created",
	tick: 0,
	interpolation: 0,
});
let gameState: GameHudState = $state(defaultGameState);
let mounted = $state(false);
let startupError: string | undefined = $state();
let mobileControls: MobileInputControlsPort | undefined = $state();
let dispatchCommand: ((command: Command) => void) | undefined = $state();
let disposeClient: (() => void) | undefined;
let destroyed = false;

onMount(() => {
	void initializeClient();
});

onDestroy(() => {
	destroyed = true;
	disposeClient?.();
});

async function initializeClient(): Promise<void> {
	try {
		const runtimeManifest = selectedRuntimeSceneManifest();
		const client = await createBrowserGameClient({
			canvas,
			...(runtimeManifest ? { runtimeManifest } : {}),
		});

		if (destroyed) {
			client.dispose();
			return;
		}

		const unsubscribe = client.api.observeRuntime((value) => {
			snapshot = value;
			const nextGameState = client.gameState();
			gameState = nextGameState;
			client.setUiCapturingInput(nextGameState.openStoryNote !== undefined);
		});

		client.startLoop();
		mobileControls = client.mobileControls;
		dispatchCommand = client.api.dispatch;
		mounted = true;
		disposeClient = () => {
			unsubscribe();
			client.setUiCapturingInput(false);
			client.dispose();
			mobileControls = undefined;
			dispatchCommand = undefined;
		};
	} catch (error) {
		startupError =
			error instanceof Error ? error.message : "Game runtime failed to start.";
	}
}

function selectedRuntimeSceneManifest() {
	const url = new URL(window.location.href);
	const manifestId =
		url.searchParams.get("runtimeScene") ?? url.searchParams.get("scene");

	if (!manifestId) {
		return undefined;
	}

	const manifest = getRuntimeSceneManifest(manifestId);

	if (!manifest) {
		throw new Error(`Unknown runtime scene manifest "${manifestId}".`);
	}

	return manifest;
}
</script>

<div class="game-client" data-game-client>
	<canvas bind:this={canvas} class="game-canvas" data-game-canvas></canvas>
	<RuntimeHud
		{mounted}
		{snapshot}
		{gameState}
		{startupError}
		dispatch={dispatchCommand}
	/>
	{#if mobileControls}
		<MobileControls
			input={mobileControls}
			touchActions={MOBILE_TOUCH_ACTION_IDS}
		/>
	{/if}
</div>

<style>
	.game-client {
		position: relative;
		min-width: 320px;
		min-height: 100vh;
		background: #101417;
		overflow: hidden;
	}

	.game-canvas {
		position: fixed;
		inset: 0;
		display: block;
		width: 100vw;
		height: 100vh;
	}
</style>
