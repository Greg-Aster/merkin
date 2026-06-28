import { BrowserPlatform } from "../engine/adapters/browser/index.js";
import {
	type EngineClientApi,
	createEngineClientApi,
} from "../engine/client-api/index.js";
import type { RuntimeSceneManifestData } from "../engine/index.js";
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
		client.dispose();
		platform.dispose();
	};

	platform.onPageHide(dispose);

	return {
		api: createEngineClientApi(client.runtime),
		gameState: client.gameState,
		runtimeSceneState: client.runtimeSceneState,
		requestRuntimeScene: client.requestRuntimeScene,
		setCollisionOverlayEnabled: client.setCollisionOverlayEnabled,
		runtimeDiagnostics: client.runtimeDiagnostics,
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
