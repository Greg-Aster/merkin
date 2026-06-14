import type { RuntimeSnapshot } from "../engine/client-api/index.js";
import {
	createRuntimeReloadAckMessage,
	createRuntimeTelemetryMessage,
} from "../engine/index.js";
import {
	type GameRuntimeUiState,
	RUNTIME_SCENE_TRANSITION_RESOURCE,
	type RuntimeSceneTransitionPort,
} from "../game/index.js";
import {
	applyCameraLiveEditModeToRuntime,
	applyCollisionPreviewPatchToRuntime,
	applyCoreObjectPreviewPatchToRuntime,
	applyObjectEditPreviewPatchToRuntime,
	clearCollisionPreviewPatchFromRuntime,
	clearCoreObjectPreviewPatchFromRuntime,
	clearObjectEditPreviewPatchFromRuntime,
	connectGameWindowDevPreviewChannel,
	createBrowserLevelEditorPreviewChannel,
	postLevelEditorDevPreviewMessage,
} from "./devPreview/index.js";
import type { GameClientMount } from "./mountGameClient";

export type BrowserGameDevPreviewBridgeOptions = {
	readonly client: GameClientMount;
	readonly fallbackRuntimeSceneId?: string;
};

export type BrowserGameDevPreviewBridge = {
	publishRuntimeTelemetry(
		snapshot: RuntimeSnapshot,
		timeMilliseconds: number,
	): void;
	dispose(): void;
};

export function connectBrowserGameDevPreviewBridge(
	options: BrowserGameDevPreviewBridgeOptions,
): BrowserGameDevPreviewBridge {
	const { client } = options;
	let lastTelemetryMilliseconds = Number.NEGATIVE_INFINITY;
	const devPreviewChannel = createBrowserLevelEditorPreviewChannel();
	const currentRuntimeSceneId = () => {
		const transition =
			client.runtime.world.getResource<RuntimeSceneTransitionPort>(
				RUNTIME_SCENE_TRANSITION_RESOURCE,
			);

		return transition?.currentRuntimeSceneId();
	};
	const clearRuntimePreviewState = (
		runtimeSceneId: string,
		sourcePlanHash: string | undefined,
	): void => {
		clearCollisionPreviewPatchFromRuntime(client.runtime, {
			runtimeSceneId,
			...(sourcePlanHash === undefined ? {} : { sourcePlanHash }),
		});
		clearCoreObjectPreviewPatchFromRuntime(client.runtime, {
			runtimeSceneId,
			...(sourcePlanHash === undefined ? {} : { sourcePlanHash }),
		});
		clearObjectEditPreviewPatchFromRuntime(client.runtime, {
			runtimeSceneId,
			...(sourcePlanHash === undefined ? {} : { sourcePlanHash }),
		});
		applyCameraLiveEditModeToRuntime(client.runtime, {
			runtimeSceneId,
			mode: "gameplay",
			...(sourcePlanHash === undefined ? {} : { sourcePlanHash }),
		});
	};
	const devPreviewConnection = devPreviewChannel
		? connectGameWindowDevPreviewChannel({
				channel: devPreviewChannel,
				applyPreview(patch) {
					if (currentRuntimeSceneId() !== patch.runtimeSceneId) {
						return;
					}

					applyCollisionPreviewPatchToRuntime(client.runtime, patch);
				},
				applyCoreObjectPreview(patch) {
					if (currentRuntimeSceneId() !== patch.runtimeSceneId) {
						return;
					}

					applyCoreObjectPreviewPatchToRuntime(client.runtime, patch);
				},
				applyObjectEditPreview(patch) {
					if (currentRuntimeSceneId() !== patch.runtimeSceneId) {
						return;
					}

					applyObjectEditPreviewPatchToRuntime(client.runtime, patch);
				},
				clearPreview(request) {
					if (currentRuntimeSceneId() !== request.runtimeSceneId) {
						return;
					}

					clearCollisionPreviewPatchFromRuntime(client.runtime, request);
				},
				clearCoreObjectPreview(request) {
					if (currentRuntimeSceneId() !== request.runtimeSceneId) {
						return;
					}

					clearCoreObjectPreviewPatchFromRuntime(client.runtime, request);
				},
				clearObjectEditPreview(request) {
					if (currentRuntimeSceneId() !== request.runtimeSceneId) {
						return;
					}

					clearObjectEditPreviewPatchFromRuntime(client.runtime, request);
				},
				applyCameraLiveEditMode(request) {
					if (currentRuntimeSceneId() !== request.runtimeSceneId) {
						return;
					}

					applyCameraLiveEditModeToRuntime(client.runtime, request);
				},
				reload(request) {
					const transition =
						client.runtime.world.getResource<RuntimeSceneTransitionPort>(
							RUNTIME_SCENE_TRANSITION_RESOURCE,
						);
					const activeRuntimeSceneId = transition?.currentRuntimeSceneId();

					if (!transition) {
						postLevelEditorDevPreviewMessage(
							devPreviewChannel,
							createRuntimeReloadAckMessage({
								requestId: `runtime-reload-ack:${request.runtimeSceneId}:missing-transition`,
								ack: {
									runtimeSceneId: request.runtimeSceneId,
									status: "ignored",
									reason: "transition-port-unavailable",
									...(request.sourcePlanHash === undefined
										? {}
										: { sourcePlanHash: request.sourcePlanHash }),
								},
							}),
						);
						return;
					}

					if (activeRuntimeSceneId !== request.runtimeSceneId) {
						postLevelEditorDevPreviewMessage(
							devPreviewChannel,
							createRuntimeReloadAckMessage({
								requestId: `runtime-reload-ack:${request.runtimeSceneId}:inactive`,
								ack: {
									runtimeSceneId: request.runtimeSceneId,
									...(activeRuntimeSceneId === undefined
										? {}
										: { activeRuntimeSceneId }),
									status: "ignored",
									reason: "runtime-scene-not-active",
									...(request.sourcePlanHash === undefined
										? {}
										: { sourcePlanHash: request.sourcePlanHash }),
								},
							}),
						);
						return;
					}

					clearRuntimePreviewState(
						request.runtimeSceneId,
						request.sourcePlanHash,
					);
					transition.reloadRuntimeScene(request.runtimeSceneId);
					postLevelEditorDevPreviewMessage(
						devPreviewChannel,
						createRuntimeReloadAckMessage({
							requestId: `runtime-reload-ack:${request.runtimeSceneId}:accepted`,
							ack: {
								runtimeSceneId: request.runtimeSceneId,
								activeRuntimeSceneId,
								status: "accepted",
								reason: "reload-requested",
								...(request.sourcePlanHash === undefined
									? {}
									: { sourcePlanHash: request.sourcePlanHash }),
							},
						}),
					);
				},
			})
		: undefined;

	return {
		publishRuntimeTelemetry(snapshot, timeMilliseconds) {
			if (
				!devPreviewChannel ||
				timeMilliseconds - lastTelemetryMilliseconds < 250
			) {
				return;
			}

			lastTelemetryMilliseconds = timeMilliseconds;
			const runtimeUiState = client.runtimeUiState();
			const transition =
				client.runtime.world.getResource<RuntimeSceneTransitionPort>(
					RUNTIME_SCENE_TRANSITION_RESOURCE,
				);
			const runtimeSceneId =
				transition?.currentRuntimeSceneId() ??
				options.fallbackRuntimeSceneId ??
				"unknown-runtime-scene";

			try {
				postLevelEditorDevPreviewMessage(
					devPreviewChannel,
					createRuntimeTelemetryMessage({
						requestId: `runtime-telemetry:${snapshot.tick}:${Math.round(timeMilliseconds)}`,
						telemetry: runtimeTelemetryPayload(
							runtimeSceneId,
							snapshot,
							runtimeUiState,
							timeMilliseconds,
						),
					}),
				);
			} catch (error) {
				console.warn("Runtime telemetry message was not posted.", error);
			}
		},
		dispose() {
			devPreviewConnection?.dispose();
		},
	};
}

function runtimeTelemetryPayload(
	runtimeSceneId: string,
	snapshot: RuntimeSnapshot,
	runtimeUiState: GameRuntimeUiState,
	timeMilliseconds: number,
) {
	return {
		runtimeSceneId,
		lifecycle: snapshot.lifecycle,
		tick: snapshot.tick,
		playerAlive: runtimeUiState.playerAlive,
		playerPosition: runtimeUiState.playerPosition,
		health: runtimeUiState.health,
		remainingCollectibles: runtimeUiState.remainingCollectibles,
		collectedCount: runtimeUiState.collectedCount,
		moving: runtimeUiState.moving,
		pointerLocked: runtimeUiState.pointerLocked,
		lookActive: runtimeUiState.lookActive,
		inputEnabled: runtimeUiState.inputEnabled,
		charging: runtimeUiState.charging,
		chargeAmount: runtimeUiState.chargeAmount,
		updatedAtMs: Math.round(timeMilliseconds),
	} as const;
}
