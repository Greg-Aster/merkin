import { BrowserPlatform } from "../engine/adapters/browser/index.js";
import {
	type EngineClientApi,
	createEngineClientApi,
} from "../engine/client-api/index.js";
import type { RuntimeSceneManifestData } from "../engine/index.js";
import {
	RUNTIME_SCENE_TRANSITION_RESOURCE,
	type RuntimeSceneTransitionPort,
} from "../game/index.js";
import {
	applyCollisionPreviewPatchToRuntime,
	clearCollisionPreviewPatchFromRuntime,
	connectGameWindowDevPreviewChannel,
} from "./devPreview/index.js";
import { type GameClientMount, mountGameClient } from "./mountGameClient";

export type BrowserGameClientOptions = {
	readonly canvas: HTMLCanvasElement;
	readonly runtimeManifest?: RuntimeSceneManifestData;
};

export type BrowserGameClient = Omit<GameClientMount, "runtime"> & {
	readonly api: EngineClientApi;
	startLoop(): void;
	stopLoop(): void;
};

export async function createBrowserGameClient(
	options: BrowserGameClientOptions,
): Promise<BrowserGameClient> {
	const platform = new BrowserPlatform();
	const isDevelopment =
		(import.meta as ImportMeta & { readonly env?: { readonly DEV?: boolean } })
			.env?.DEV === true;
	let client: GameClientMount;

	try {
		client = await mountGameClient({
			canvas: options.canvas,
			platform,
			...(options.runtimeManifest
				? { runtimeManifest: options.runtimeManifest }
				: {}),
		});
	} catch (error) {
		platform.dispose();
		throw error;
	}

	let frame: number | undefined;
	let lastTimeMilliseconds = platform.now();
	let disposed = false;
	const devPreviewConnection = isDevelopment
		? connectGameWindowDevPreviewChannel({
				applyPreview(patch) {
					const transition =
						client.runtime.world.getResource<RuntimeSceneTransitionPort>(
							RUNTIME_SCENE_TRANSITION_RESOURCE,
						);

					if (transition?.currentRuntimeSceneId() !== patch.runtimeSceneId) {
						return;
					}

					applyCollisionPreviewPatchToRuntime(client.runtime, patch);
				},
				clearPreview(request) {
					const transition =
						client.runtime.world.getResource<RuntimeSceneTransitionPort>(
							RUNTIME_SCENE_TRANSITION_RESOURCE,
						);

					if (transition?.currentRuntimeSceneId() !== request.runtimeSceneId) {
						return;
					}

					clearCollisionPreviewPatchFromRuntime(client.runtime, request);
				},
				reload(request) {
					const transition =
						client.runtime.world.getResource<RuntimeSceneTransitionPort>(
							RUNTIME_SCENE_TRANSITION_RESOURCE,
						);

					if (transition?.currentRuntimeSceneId() === request.runtimeSceneId) {
						clearCollisionPreviewPatchFromRuntime(client.runtime, {
							runtimeSceneId: request.runtimeSceneId,
							...(request.sourcePlanHash === undefined
								? {}
								: { sourcePlanHash: request.sourcePlanHash }),
						});
					}

					transition?.reloadRuntimeScene(request.runtimeSceneId);
				},
			})
		: undefined;

	const schedule = () => {
		if (disposed) {
			return;
		}

		frame = platform.requestFrame(tick);
	};

	const tick = (timeMilliseconds: number) => {
		if (disposed) {
			return;
		}

		if (!platform.isVisible()) {
			lastTimeMilliseconds = timeMilliseconds;
			schedule();
			return;
		}

		const deltaSeconds = Math.max(
			0,
			(timeMilliseconds - lastTimeMilliseconds) / 1000,
		);
		lastTimeMilliseconds = timeMilliseconds;
		client.runtime.update(deltaSeconds);
		schedule();
	};

	const stopLoop = () => {
		if (frame !== undefined) {
			platform.cancelFrame(frame);
			frame = undefined;
		}
	};

	const dispose = () => {
		if (disposed) {
			return;
		}

		disposed = true;
		stopLoop();
		devPreviewConnection?.dispose();
		client.dispose();
		platform.dispose();
	};

	platform.onPageHide(dispose);

	return {
		api: createEngineClientApi(client.runtime),
		gameState: client.gameState,
		mobileControls: client.mobileControls,
		setUiCapturingInput: client.setUiCapturingInput,
		startLoop() {
			if (!disposed && frame === undefined) {
				lastTimeMilliseconds = platform.now();
				schedule();
			}
		},
		stopLoop,
		dispose,
	};
}
