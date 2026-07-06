import type { RuntimeSnapshot } from "../../engine/client-api/index.js";
import type { BrowserGameClient } from "../browserGameClient";
import type { BrowserMultiplayerClient } from "../multiplayerClient";
import {
	type GameDevBridgeGameEndpoint,
	type GameDevBridgeSettings,
	createGameDevBridgeGameEndpoint,
} from "./gameDevBridge.js";

export type GameDevBridgeRuntimeEndpointOptions = {
	readonly settings?: Partial<GameDevBridgeSettings>;
	readonly client: BrowserGameClient;
	readonly multiplayer: BrowserMultiplayerClient;
	readonly runtimeSnapshot: () => RuntimeSnapshot;
};

export function createGameDevBridgeRuntimeEndpoint(
	options: GameDevBridgeRuntimeEndpointOptions,
): GameDevBridgeGameEndpoint {
	const { client, multiplayer, runtimeSnapshot } = options;

	return createGameDevBridgeGameEndpoint({
		...(options.settings ? { settings: options.settings } : {}),
		snapshot: (sessionId) => {
			const snapshot = runtimeSnapshot();
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
				gameState: { ...client.gameState() },
				multiplayer: multiplayer.snapshot(),
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
		sendChat: (text) => {
			const trimmedText = text.trim();
			if (!trimmedText) {
				return {
					accepted: false,
					message: "Chat message is empty.",
				};
			}

			if (multiplayer.snapshot().status !== "connected") {
				return {
					accepted: false,
					message: "Multiplayer chat is not connected.",
				};
			}

			multiplayer.sendChat(trimmedText);
			return {
				accepted: true,
				message: "Chat message sent.",
			};
		},
		setTouchActionValue: (touchId, value) => {
			const boundedValue = Math.max(0, Math.min(1, value));
			client.mobileControls.setTouchActionValue(touchId, boundedValue);

			return {
				accepted: true,
				message: `Touch action ${touchId} set to ${boundedValue}.`,
			};
		},
		clearTouchControls: () => {
			client.mobileControls.clearTouchControls();

			return {
				accepted: true,
				message: "Touch controls cleared.",
			};
		},
	});
}
