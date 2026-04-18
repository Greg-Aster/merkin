import { writable } from "svelte/store";

export type NeuralStylizationMode = "soft-shader" | "glitch-shader" | "onnx";
export type NeuralStylizationResolution = "low" | "medium" | "high";
export type NeuralStylizationOutputMode =
	| "original"
	| "blend"
	| "stylized-only";
export type NeuralStylizationOnnxProvider =
	| "auto"
	| "webgpu"
	| "webgl"
	| "wasm";
export type NeuralStylizationPreset = "speed" | "balanced" | "quality";
export type NeuralStylizationSourceRenderProfile = "auto" | "shaded" | "flat";
export type NeuralStylizationRangeMode =
	| "zeroToOne"
	| "minusOneToOne"
	| "zeroTo255";
export type NeuralStylizationOutputRangeMode =
	| "auto"
	| "zeroToOne"
	| "minusOneToOne"
	| "zeroTo255";

const createUiStore = () => {
	const { subscribe, update } = writable({
		isInputFocused: false,
	});

	return {
		subscribe,
		setInputFocus: (isFocused: boolean) => {
			update((s) => ({ ...s, isInputFocused: isFocused }));
		},
	};
};

export const uiStore = createUiStore();
export const setInputFocus = uiStore.setInputFocus;
// Settings menu visibility
export const isSettingsMenuOpen = writable<boolean>(false);

function createPersistentBooleanStore(key: string, initialValue: boolean) {
	const store = writable(initialValue);

	if (typeof window !== "undefined") {
		const stored = window.localStorage.getItem(key);
		if (stored !== null) {
			store.set(stored === "true");
		}

		store.subscribe((value) => {
			window.localStorage.setItem(key, String(value));
		});
	}

	return store;
}

function createPersistentNumberStore(
	key: string,
	initialValue: number,
	options?: {
		min?: number;
		max?: number;
	},
) {
	const store = writable(initialValue);
	const minValue = options?.min ?? Number.NEGATIVE_INFINITY;
	const maxValue = options?.max ?? Number.POSITIVE_INFINITY;

	if (typeof window !== "undefined") {
		const stored = window.localStorage.getItem(key);
		if (stored !== null) {
			const parsed = Number(stored);
			if (Number.isFinite(parsed)) {
				store.set(Math.min(maxValue, Math.max(minValue, parsed)));
			}
		}

		store.subscribe((value) => {
			window.localStorage.setItem(key, String(value));
		});
	}

	return store;
}

function createPersistentStringStore<T extends string>(
	key: string,
	initialValue: T,
	allowedValues?: readonly T[],
) {
	const store = writable<T>(initialValue);

	if (typeof window !== "undefined") {
		const stored = window.localStorage.getItem(key);
		if (stored !== null) {
			const nextValue = stored as T;
			if (!allowedValues || allowedValues.includes(nextValue)) {
				store.set(nextValue);
			}
		}

		store.subscribe((value) => {
			window.localStorage.setItem(key, value);
		});
	}

	return store;
}

// Audio settings
export const isSoundEnabled = createPersistentBooleanStore(
	"megameal-game-audio-enabled",
	true,
);
export const masterVolumeSetting = createPersistentNumberStore(
	"megameal-game-master-volume",
	0.7,
	{ min: 0, max: 1 },
);
export const ambienceVolumeSetting = createPersistentNumberStore(
	"megameal-game-ambience-volume",
	0.42,
	{ min: 0, max: 1 },
);
export const sfxVolumeSetting = createPersistentNumberStore(
	"megameal-game-sfx-volume",
	0.48,
	{ min: 0, max: 1 },
);

// Experimental rendering settings
export const isNeuralStylizationEnabled = createPersistentBooleanStore(
	"megameal-game-neural-stylization-enabled",
	false,
);
export const neuralStylizationMode =
	createPersistentStringStore<NeuralStylizationMode>(
		"megameal-game-neural-stylization-mode",
		"soft-shader",
		["soft-shader", "glitch-shader", "onnx"],
	);
export const neuralStylizationBundledModelId =
	createPersistentStringStore<string>(
		"megameal-game-neural-stylization-bundled-model-id",
		"candy-9",
	);
export const neuralStylizationStrength = createPersistentNumberStore(
	"megameal-game-neural-stylization-strength",
	0.72,
	{ min: 0, max: 1 },
);
export const neuralStylizationOutputMode =
	createPersistentStringStore<NeuralStylizationOutputMode>(
		"megameal-game-neural-stylization-output-mode",
		"blend",
		["original", "blend", "stylized-only"],
	);
export const neuralStylizationResolution =
	createPersistentStringStore<NeuralStylizationResolution>(
		"megameal-game-neural-stylization-resolution",
		"medium",
		["low", "medium", "high"],
	);
export const neuralStylizationInputHeight = createPersistentNumberStore(
	"megameal-game-neural-stylization-input-height",
	224,
	{ min: 128, max: 512 },
);
export const neuralStylizationOutputScale = createPersistentNumberStore(
	"megameal-game-neural-stylization-output-scale",
	1,
	{ min: 0.5, max: 1 },
);
export const neuralStylizationFrameStride = createPersistentNumberStore(
	"megameal-game-neural-stylization-frame-stride",
	3,
	{ min: 1, max: 8 },
);
export const neuralStylizationAutoQualityEnabled = createPersistentBooleanStore(
	"megameal-game-neural-stylization-auto-quality-enabled",
	true,
);
export const neuralStylizationSourceRenderProfile =
	createPersistentStringStore<NeuralStylizationSourceRenderProfile>(
		"megameal-game-neural-stylization-source-render-profile",
		"auto",
		["auto", "shaded", "flat"],
	);
export const neuralStylizationOnnxProvider =
	createPersistentStringStore<NeuralStylizationOnnxProvider>(
		"megameal-game-neural-stylization-onnx-provider",
		"auto",
		["auto", "webgpu", "webgl", "wasm"],
	);
export const neuralStylizationOnnxInputRange =
	createPersistentStringStore<NeuralStylizationRangeMode>(
		"megameal-game-neural-stylization-onnx-input-range",
		"zeroTo255",
		["zeroToOne", "minusOneToOne", "zeroTo255"],
	);
export const neuralStylizationOnnxOutputRange =
	createPersistentStringStore<NeuralStylizationOutputRangeMode>(
		"megameal-game-neural-stylization-onnx-output-range",
		"auto",
		["auto", "zeroToOne", "minusOneToOne", "zeroTo255"],
	);

export const neuralStylizationOnnxStatus = writable<string>(
	"Load a style model to enable ONNX mode.",
);
export const neuralStylizationOnnxModelName =
	writable<string>("No model loaded");
export const neuralStylizationOnnxInputShape = writable<string>("—");
export const neuralStylizationOnnxOutputShape = writable<string>("—");
export const neuralStylizationOnnxLastInferenceMs = writable<string>("—");
export const neuralStylizationOnnxReady = writable<boolean>(false);
export const neuralStylizationCaptureMs = writable<string>("—");
export const neuralStylizationComposeMs = writable<string>("—");
export const neuralStylizationEffectiveProvider = writable<string>("—");
export const neuralStylizationAutoQualityStatus = writable<string>(
	"Auto quality is idle.",
);
export const neuralStylizationEffectiveSettingsSummary = writable<string>("—");
export const neuralStylizationSceneShadowsSuppressed = writable<boolean>(false);
export const neuralStylizationBenchmarkInProgress = writable<boolean>(false);
export const neuralStylizationBenchmarkStatus = writable<string>(
	"Run a provider benchmark on this device to compare WebGPU, WebGL, and WASM.",
);
export const neuralStylizationBenchmarkSummary = writable<string>("—");
export const neuralStylizationBenchmarkRecommendedPreset =
	writable<string>("—");
export const neuralStylizationBenchmarkRecommendedProvider =
	writable<string>("—");
export const neuralStylizationSourceBenchmarkStatus = writable<string>(
	"Run a source benchmark to compare shaded and flat ONNX inputs.",
);
export const neuralStylizationSourceBenchmarkSummary = writable<string>("—");
export const neuralStylizationSourceBenchmarkRecommendedProfile =
	writable<string>("—");

if (typeof window !== "undefined") {
	if (
		window.localStorage.getItem("megameal-game-neural-stylization-mode") ===
		"oil-paint"
	) {
		neuralStylizationMode.set("soft-shader");
		window.localStorage.setItem(
			"megameal-game-neural-stylization-mode",
			"soft-shader",
		);
	}

	neuralStylizationEffectiveSettingsSummary.set(
		"Neural stylization is available. Enable it from Settings.",
	);
}
