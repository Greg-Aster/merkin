import {
	BrowserAudioManager,
	BrowserInputAdapter,
	type BrowserPlatform,
	createBrowserAudioAssetDisposer,
	createBrowserAudioAssetLoader,
} from "../engine/adapters/browser/index.js";
import { createRapierPhysicsAdapter } from "../engine/adapters/rapier/index.js";
import {
	ThreeRendererAdapter,
	createThreeAssetObjectResolver,
	loadDefaultThreeRuntime,
	registerThreeAssetLoaders,
} from "../engine/adapters/three/index.js";
import {
	type AssetLoader,
	AssetManager,
	type EngineRuntime,
	type MobileInputControlsPort,
	type RendererPort,
	type RuntimeSceneManifestData,
} from "../engine/index.js";
import {
	type GameHudState,
	createMegamealGameRuntime,
	defaultRuntimeSceneManifest,
} from "../game/index.js";

export type GameClientMountOptions = {
	readonly canvas: HTMLCanvasElement;
	readonly platform: BrowserPlatform;
	readonly runtimeManifest?: RuntimeSceneManifestData;
};

export type GameClientMount = {
	readonly runtime: EngineRuntime;
	readonly mobileControls: MobileInputControlsPort;
	gameState(): GameHudState;
	setUiCapturingInput(capturing: boolean): void;
	dispose(): void;
};

type ResizableRenderer = RendererPort & {
	setSize?(width: number, height: number, pixelRatio?: number): void;
};

export async function mountGameClient(
	options: GameClientMountOptions,
): Promise<GameClientMount> {
	const three = await loadDefaultThreeRuntime();
	const audio = createOptionalAudioManager(options.canvas);
	const assets = createAssetManager(three, audio);
	const size = options.platform.displaySize(options.canvas);
	const runtimeManifest =
		options.runtimeManifest ?? defaultRuntimeSceneManifest;
	const renderProfile = runtimeManifest.renderProfile;
	const renderer = new ThreeRendererAdapter({
		three,
		canvas: options.canvas,
		width: size.width,
		height: size.height,
		pixelRatio: size.pixelRatio,
		renderProfile,
		resolveObject: createThreeAssetObjectResolver({
			assets,
			three,
			fallbackColor: renderProfile.renderer.fallbackMaterialColor,
		}),
	});
	const resize = createRendererResizeHandler(
		options.canvas,
		options.platform,
		renderer,
	);
	const removeResize = options.platform.onResize(resize);
	const input = new BrowserInputAdapter({ target: options.canvas });
	const physics = await createRapierPhysicsAdapter();
	const game = await createMegamealGameRuntime({
		assets,
		renderer,
		input,
		physics,
		...(audio ? { audio } : {}),
		runtimeManifest,
	});

	resize();

	let disposed = false;

	return {
		runtime: game.runtime,
		mobileControls: input,
		gameState: game.gameState,
		setUiCapturingInput(capturing) {
			input.setFocusState({ uiCapturingInput: capturing });
		},
		dispose() {
			if (disposed) {
				return;
			}

			disposed = true;
			removeResize();
			input.dispose();
			void (async () => {
				await game.dispose();
				physics.dispose();
				audio?.dispose();
				renderer.dispose();
			})();
		},
	};
}

function createRendererResizeHandler(
	canvas: HTMLCanvasElement,
	platform: BrowserPlatform,
	renderer: ResizableRenderer,
): () => void {
	return () => {
		const nextSize = platform.displaySize(canvas);
		renderer.setSize?.(nextSize.width, nextSize.height, nextSize.pixelRatio);
	};
}

function createAssetManager(
	three: Awaited<ReturnType<typeof loadDefaultThreeRuntime>>,
	audio?: BrowserAudioManager,
): AssetManager {
	const assets = new AssetManager();
	registerThreeAssetLoaders(assets, {
		three,
		createVideoElement: () => document.createElement("video"),
	});

	if (audio) {
		assets.registerLoader("audio", createBrowserAudioAssetLoader(audio));
		assets.registerDisposer("audio", createBrowserAudioAssetDisposer(audio));
	} else {
		assets.registerLoader("audio", unavailableAudioAssetLoader);
	}

	return assets;
}

const unavailableAudioAssetLoader: AssetLoader = async (entry) => ({
	kind: "browser:audio-unavailable",
	entry,
});

function createOptionalAudioManager(
	canvas: HTMLCanvasElement,
): BrowserAudioManager | undefined {
	try {
		const audio = new BrowserAudioManager({ masterVolume: 0.6 });
		audio.registerUnlockGestures(canvas);
		return audio;
	} catch {
		return undefined;
	}
}
