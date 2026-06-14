<script lang="ts">
import { onDestroy, onMount } from "svelte";
import type { Command, MobileInputControlsPort } from "../engine/index.js";
import {
	type GameRuntimeUiState,
	MOBILE_TOUCH_ACTION_IDS,
	getRuntimeSceneManifest,
} from "../game/index.js";
import MobileControls from "../ui/MobileControls.svelte";
import RuntimeInteractionOverlay from "../ui/RuntimeInteractionOverlay.svelte";
import { createBrowserGameClient } from "./browserGameClient";

const defaultRuntimeUiState: GameRuntimeUiState = {
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
let runtimeUiState: GameRuntimeUiState = $state(defaultRuntimeUiState);
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

		const unsubscribe = client.api.observeRuntime(() => {
			const nextRuntimeUiState = client.runtimeUiState();
			runtimeUiState = nextRuntimeUiState;
			client.setUiCapturingInput(
				nextRuntimeUiState.openStoryNote !== undefined,
			);
		});

		client.startLoop();
		mobileControls = client.mobileControls;
		dispatchCommand = client.api.dispatch;
		disposeClient = () => {
			unsubscribe();
			client.setUiCapturingInput(false);
			client.dispose();
			mobileControls = undefined;
			dispatchCommand = undefined;
		};
	} catch (error) {
		console.error("Game runtime failed to start.", error);
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
	<RuntimeInteractionOverlay {runtimeUiState} dispatch={dispatchCommand} />
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
