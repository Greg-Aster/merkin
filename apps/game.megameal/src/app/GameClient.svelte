<script lang="ts">
import { onDestroy, onMount } from "svelte";
import type { RuntimeSnapshot } from "../engine/client-api/index.js";
import type { Command, MobileInputControlsPort } from "../engine/index.js";
import { type GameHudState, MOBILE_TOUCH_ACTION_IDS } from "../game/index.js";
import MobileControls from "../ui/MobileControls.svelte";
import RuntimeHud from "../ui/RuntimeHud.svelte";
import { createBrowserGameClient } from "./browserGameClient";
import type { GameDevBridgeGameEndpoint } from "./gameDevBridge.js";
import { runtimeSettings } from "./levelPackageDiscovery.js";

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
let devBridge: GameDevBridgeGameEndpoint | undefined;
let destroyed = false;

onMount(() => {
	void initializeClient();
});

onDestroy(() => {
	destroyed = true;
	devBridge?.dispose();
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

		if (import.meta.env.DEV) {
			const { createGameDevBridgeGameEndpoint } = await import(
				"./gameDevBridge.js"
			);

			if (destroyed) {
				client.dispose();
				return;
			}

			devBridge = createGameDevBridgeGameEndpoint({
				snapshot: (sessionId) => {
					const sceneState = client.runtimeSceneState();

					return {
						sessionId,
						timestamp: Date.now(),
						runtime: {
							lifecycle: snapshot.lifecycle,
							tick: snapshot.tick,
							interpolation: snapshot.interpolation,
						},
						...(sceneState.activeRuntimeSceneId
							? {
									activeRuntimeSceneId: sceneState.activeRuntimeSceneId,
								}
							: {}),
						...(sceneState.loadingRuntimeSceneId
							? {
									loadingRuntimeSceneId: sceneState.loadingRuntimeSceneId,
								}
							: {}),
						availableRuntimeScenes: runtimeSettings.runtimeSceneManifests.map(
							(manifest) => ({
								id: manifest.id,
								levelId: manifest.level.id,
								label: manifest.level.id,
								sourceId: manifest.source.id,
							}),
						),
						gameState: { ...client.gameState() },
						diagnostics: client.runtimeDiagnostics(),
					};
				},
				loadRuntimeScene: (runtimeSceneId) => {
					const result = client.requestRuntimeScene(runtimeSceneId);

					return {
						accepted: result.accepted,
						message: result.message,
					};
				},
				setCollisionOverlay: (enabled) => {
					const result = client.setCollisionOverlayEnabled(enabled);

					return {
						accepted: result.accepted,
						enabled: result.enabled,
						message: result.message,
						diagnostics: result.diagnostics,
					};
				},
			});
		}

		let lastBridgeRuntimeSceneKey = "";
		const unsubscribe = client.api.observeRuntime((value) => {
			snapshot = value;
			const nextGameState = client.gameState();
			gameState = nextGameState;
			client.setUiCapturingInput(nextGameState.openStoryNote !== undefined);

			const sceneState = client.runtimeSceneState();
			const bridgeRuntimeSceneKey = [
				sceneState.activeRuntimeSceneId ?? "",
				sceneState.loadingRuntimeSceneId ?? "",
			].join(":");

			if (bridgeRuntimeSceneKey !== lastBridgeRuntimeSceneKey) {
				lastBridgeRuntimeSceneKey = bridgeRuntimeSceneKey;
				devBridge?.publishSnapshot();
			}
		});

		client.startLoop();
		mobileControls = client.mobileControls;
		dispatchCommand = client.api.dispatch;
		mounted = true;
		disposeClient = () => {
			unsubscribe();
			devBridge?.dispose();
			client.setUiCapturingInput(false);
			client.dispose();
			mobileControls = undefined;
			dispatchCommand = undefined;
			devBridge = undefined;
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

	const manifest = runtimeSettings.getRuntimeSceneManifest(manifestId);

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
