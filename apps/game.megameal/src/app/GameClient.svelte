<script lang="ts">
import { onDestroy, onMount } from "svelte";
import type { RuntimeSnapshot } from "../engine/client-api/index.js";
import type { Command, MobileInputControlsPort } from "../engine/index.js";
import { type GameHudState, MOBILE_TOUCH_ACTION_IDS } from "../game/index.js";
import type { MultiplayerSnapshot } from "../multiplayer/index.js";
import MobileControls from "../ui/MobileControls.svelte";
import RuntimeHud from "../ui/RuntimeHud.svelte";
import MultiplayerPanel from "../ui/multiplayer/MultiplayerPanel.svelte";
import { createBrowserGameClient } from "./browserGameClient";
import { runtimeSettings } from "./levelPackageDiscovery.js";
import {
	type BrowserMultiplayerClient,
	createBrowserMultiplayerClient,
} from "./multiplayerClient";

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

type RuntimeBridgeEndpoint = {
	publishSnapshot(reason?: "scene" | "multiplayer"): void;
	dispose(): void;
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
let multiplayerClient: BrowserMultiplayerClient | undefined = $state();
let multiplayerSnapshot: MultiplayerSnapshot | undefined = $state();
let disposeClient: (() => void) | undefined;
let devBridge: RuntimeBridgeEndpoint | undefined;
// biome-ignore lint/style/useConst: Svelte event callbacks mutate this focus flag.
let uiCapturingInput = false;
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
		const multiplayer = createBrowserMultiplayerClient();
		const unsubscribeMultiplayer = multiplayer.subscribe((value) => {
			multiplayerSnapshot = value;
			devBridge?.publishSnapshot("multiplayer");
		});
		const client = await createBrowserGameClient({
			canvas,
			...(runtimeManifest ? { runtimeManifest } : {}),
			multiplayer,
		});

		if (destroyed) {
			unsubscribeMultiplayer();
			multiplayer.disconnect();
			client.dispose();
			return;
		}

		if (import.meta.env.DEV) {
			const { createGameDevBridgeRuntimeEndpoint } = await import(
				"./dev-bridge/gameDevBridgeRuntime.js"
			);

			if (destroyed) {
				unsubscribeMultiplayer();
				multiplayer.disconnect();
				client.dispose();
				return;
			}

			devBridge = createGameDevBridgeRuntimeEndpoint({
				settings: runtimeSettings.devBridge,
				client,
				multiplayer,
				runtimeSnapshot: () => snapshot,
			});
		}

		let lastBridgeRuntimeSceneKey = "";
		const unsubscribe = client.api.observeRuntime((value) => {
			snapshot = value;
			const nextGameState = client.gameState();
			gameState = nextGameState;
			client.setUiCapturingInput(
				uiCapturingInput ||
					nextGameState.openStoryNote !== undefined ||
					nextGameState.openNpcDialog !== undefined,
			);

			const sceneState = client.runtimeSceneState();
			const bridgeRuntimeSceneKey = [
				sceneState.activeRuntimeSceneId ?? "",
				sceneState.loadingRuntimeSceneId ?? "",
			].join(":");

			if (bridgeRuntimeSceneKey !== lastBridgeRuntimeSceneKey) {
				lastBridgeRuntimeSceneKey = bridgeRuntimeSceneKey;
				devBridge?.publishSnapshot("scene");
			}
		});

		client.startLoop();
		mobileControls = client.mobileControls;
		dispatchCommand = client.api.dispatch;
		multiplayerClient = multiplayer;
		mounted = true;
		const roomName = selectedRoomName();

		if (roomName) {
			void multiplayer.joinRoom(roomName);
		}
		disposeClient = () => {
			unsubscribe();
			unsubscribeMultiplayer();
			devBridge?.dispose();
			client.setUiCapturingInput(false);
			client.dispose();
			multiplayer.disconnect();
			mobileControls = undefined;
			dispatchCommand = undefined;
			multiplayerClient = undefined;
			multiplayerSnapshot = undefined;
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

function selectedRoomName() {
	const url = new URL(window.location.href);

	return url.searchParams.get("room")?.trim() ?? "";
}
</script>

<div class="game-client" data-game-client>
	<canvas bind:this={canvas} class="game-canvas" data-game-canvas></canvas>
	<RuntimeHud
		visible={runtimeSettings.hudVisible}
		{mounted}
		{snapshot}
		{gameState}
		{startupError}
		dispatch={dispatchCommand}
	/>
	<MultiplayerPanel
		client={multiplayerClient}
		snapshot={multiplayerSnapshot}
		onInputFocusChange={(focused) => {
			uiCapturingInput = focused;
		}}
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
