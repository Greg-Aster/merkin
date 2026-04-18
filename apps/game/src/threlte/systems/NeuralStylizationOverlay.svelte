<script lang="ts">
import { useTask, useThrelte } from "@threlte/core";
import type * as ort from "onnxruntime-web";
import { onDestroy } from "svelte";
import { get } from "svelte/store";
import * as THREE from "three";

import {
	defaultBundledNeuralStyleModelId,
	getBundledNeuralStyleModel,
} from "../../prototypes/neural-style/bundledModels";
import { qualitySettingsStore } from "../features/performance/stores/performanceStore";
import {
	type NeuralStylizationMode,
	type NeuralStylizationOnnxProvider,
	type NeuralStylizationOutputMode,
	type NeuralStylizationOutputRangeMode,
	type NeuralStylizationPreset,
	type NeuralStylizationRangeMode,
	type NeuralStylizationResolution,
	type NeuralStylizationSourceRenderProfile,
	isNeuralStylizationEnabled,
	neuralStylizationAutoQualityEnabled,
	neuralStylizationAutoQualityStatus,
	neuralStylizationBenchmarkInProgress,
	neuralStylizationBenchmarkRecommendedPreset,
	neuralStylizationBenchmarkRecommendedProvider,
	neuralStylizationBenchmarkStatus,
	neuralStylizationBenchmarkSummary,
	neuralStylizationBundledModelId,
	neuralStylizationCaptureMs,
	neuralStylizationComposeMs,
	neuralStylizationEffectiveProvider,
	neuralStylizationEffectiveSettingsSummary,
	neuralStylizationFrameStride,
	neuralStylizationInputHeight,
	neuralStylizationMode,
	neuralStylizationOnnxInputRange,
	neuralStylizationOnnxInputShape,
	neuralStylizationOnnxLastInferenceMs,
	neuralStylizationOnnxModelName,
	neuralStylizationOnnxOutputRange,
	neuralStylizationOnnxOutputShape,
	neuralStylizationOnnxProvider,
	neuralStylizationOnnxReady,
	neuralStylizationOnnxStatus,
	neuralStylizationOutputMode,
	neuralStylizationOutputScale,
	neuralStylizationResolution,
	neuralStylizationSceneShadowsSuppressed,
	neuralStylizationSourceBenchmarkRecommendedProfile,
	neuralStylizationSourceBenchmarkStatus,
	neuralStylizationSourceBenchmarkSummary,
	neuralStylizationSourceRenderProfile,
	neuralStylizationStrength,
} from "../stores/uiStore";

type OnnxRuntimeModule = typeof import("onnxruntime-web");
type SessionTensorConfig = {
	inputName: string;
	outputName: string;
	inputLayout: "nchw" | "nhwc";
	outputLayout: "nchw" | "nhwc";
	inputWidth: number;
	inputHeight: number;
	inputShape: readonly (number | string)[];
	outputShape: readonly (number | string)[];
};
type BenchmarkProviderResult = {
	provider: Exclude<NeuralStylizationOnnxProvider, "auto">;
	providerLabel: string;
	supported: boolean;
	loadMs: number;
	avgInferenceMs: number;
	error?: string;
};
type SourceBenchmarkResult = {
	profile: "shaded" | "flat";
	profileLabel: string;
	captureMs: number;
	avgInferenceMs: number;
	detailRetention: number;
	styleShift: number;
};

const { autoRender, autoRenderTask, camera, renderStage, renderer, scene } =
	useThrelte();

const softPaletteShadow = [35, 46, 82];
const softPaletteMidtone = [96, 130, 228];
const softPaletteHighlight = [255, 239, 214];
const glitchPaletteShadow = [7, 7, 14];
const glitchPaletteMidtone = [96, 58, 255];
const glitchPaletteHighlight = [246, 236, 255];
const autoQualityStepInputHeightPenalty = [0, 32, 64, 96, 128];
const autoQualityStepOutputScalePenalty = [0, 0.05, 0.1, 0.15, 0.2];
const autoQualityStepFrameStridePenalty = [0, 1, 2, 3, 4];
const resolutionOrder: NeuralStylizationResolution[] = [
	"low",
	"medium",
	"high",
];
const AUTO_QUALITY_WINDOW_SIZE = 8;
const AUTO_QUALITY_MIN_SAMPLES = 3;
const AUTO_QUALITY_STARTUP_GRACE_MS = 2500;
const AUTO_QUALITY_CHANGE_COOLDOWN_MS = 4000;
const AUTO_QUALITY_DEGRADE_THRESHOLD = 3;
const AUTO_QUALITY_RECOVER_THRESHOLD = 5;
const STYLIZED_ONLY_ONNX_SOURCE_SCALE = 0.82;

function getPublicAssetUrl(relativePath: string) {
	if (typeof window === "undefined") {
		return `${import.meta.env.BASE_URL}${relativePath}`;
	}

	return new URL(
		`${import.meta.env.BASE_URL}${relativePath}`,
		window.location.origin,
	).href;
}

const externalRuntimeModulePath = getPublicAssetUrl(
	"vendor/onnxruntime/ort.all.min.mjs",
);
const externalRuntimeWasmPrefix = getPublicAssetUrl("vendor/onnxruntime/");

let overlayCanvas: HTMLCanvasElement | null = null;
let overlayContext: CanvasRenderingContext2D | null = null;
let processingCanvas: HTMLCanvasElement | null = null;
let processingContext: CanvasRenderingContext2D | null = null;
let outputCanvas: HTMLCanvasElement | null = null;
let outputContext: CanvasRenderingContext2D | null = null;
let offscreenTarget: THREE.WebGLRenderTarget | null = null;
let offscreenPixelBuffer: Uint8Array | null = null;
let offscreenImageData: ImageData | null = null;
const flatCaptureMaterialCache = new Map<
	THREE.Material,
	THREE.MeshBasicMaterial
>();
const flatCaptureOriginalMaterials = new Map<
	THREE.Mesh,
	THREE.Material | THREE.Material[]
>();
let frameCounter = 0;
let lastSourceWidth = 0;
let lastSourceHeight = 0;

let currentMode: NeuralStylizationMode = "soft-shader";
let currentOutputMode: NeuralStylizationOutputMode = "blend";
let currentResolution: NeuralStylizationResolution = "medium";
let currentBundledModelId = defaultBundledNeuralStyleModelId;
let currentProvider: NeuralStylizationOnnxProvider = "auto";
let currentSourceRenderProfile: NeuralStylizationSourceRenderProfile = "auto";
let currentInputRange: NeuralStylizationRangeMode = "zeroTo255";
let currentOutputRange: NeuralStylizationOutputRangeMode = "auto";
let currentInputHeight = 224;
let currentOutputScale = 1;
let currentFrameStride = 3;
let currentOverlayOpacity = 0.42;
let isEnabled = false;
let isAutoQualityEnabled = true;
let autoQualityStep = 0;
let autoQualityStatusMessage = "Auto quality is idle.";
let recentCaptureDurationsMs: number[] = [];
let recentInferenceDurationsMs: number[] = [];
let autoQualityDegradeCount = 0;
let autoQualityRecoverCount = 0;
let autoQualityTrackingStartedAt = 0;
let lastAutoQualityChangeAt = 0;
let benchmarkInProgress = false;

let runtime: OnnxRuntimeModule | null = null;
let session: ort.InferenceSession | null = null;
let onnxModelBytes: Uint8Array | null = null;
let onnxInputName: string | null = null;
let onnxOutputName: string | null = null;
let onnxInputLayout: "nchw" | "nhwc" | null = null;
let onnxOutputLayout: "nchw" | "nhwc" | null = null;
let onnxInputWidth = 0;
let onnxInputHeight = 0;
let onnxRunning = false;
let lastOnnxInferenceDurationMs = 0;
let onnxImageData: ImageData | null = null;
let onnxInputTensorData: Float32Array | null = null;
let onnxInputSourceXLookup: Uint16Array | null = null;
let onnxInputSourceYLookup: Uint16Array | null = null;
let onnxInputCacheKey = "";
let onnxOutputImageData: ImageData | null = null;
let loadedModelSource: "bundled" | "upload" | null = null;
let loadedBundledModelId: string | null = null;

const unsubscribeEnabled = isNeuralStylizationEnabled.subscribe((value) => {
	isEnabled = value;
	syncPresentationMode();
	refreshAutoQualityState();
});

const unsubscribeMode = neuralStylizationMode.subscribe((value) => {
	currentMode = value;
	syncPresentationMode();
	refreshAutoQualityState();

	if (value === "onnx" && loadedModelSource !== "upload") {
		void ensureBundledModelLoaded();
	}
});

const unsubscribeOutputMode = neuralStylizationOutputMode.subscribe((value) => {
	currentOutputMode = value;
	syncPresentationMode();
	refreshAutoQualityState();
});

const unsubscribeResolution = neuralStylizationResolution.subscribe((value) => {
	currentResolution = value;
	syncCanvasSizes(true);
	refreshAutoQualityState();
});

const unsubscribeBundledModelId = neuralStylizationBundledModelId.subscribe(
	(value) => {
		currentBundledModelId = value || defaultBundledNeuralStyleModelId;
		refreshAutoQualityState();

		if (currentMode === "onnx") {
			void ensureBundledModelLoaded(true);
		}
	},
);

const unsubscribeProvider = neuralStylizationOnnxProvider.subscribe((value) => {
	currentProvider = value;
	refreshAutoQualityState();

	if (onnxModelBytes) {
		void reloadOnnxSession();
	}
});

const unsubscribeSourceRenderProfile =
	neuralStylizationSourceRenderProfile.subscribe((value) => {
		currentSourceRenderProfile = value;
		syncEffectiveSettingsSummary();
	});

const unsubscribeInputRange = neuralStylizationOnnxInputRange.subscribe(
	(value) => {
		currentInputRange = value;
	},
);

const unsubscribeOutputRange = neuralStylizationOnnxOutputRange.subscribe(
	(value) => {
		currentOutputRange = value;
	},
);

const unsubscribeInputHeight = neuralStylizationInputHeight.subscribe(
	(value) => {
		currentInputHeight = value;
		syncCanvasSizes(true);
		refreshAutoQualityState();
	},
);

const unsubscribeOutputScale = neuralStylizationOutputScale.subscribe(
	(value) => {
		currentOutputScale = value;
		syncCanvasSizes(true);
		syncPresentationMode();
		refreshAutoQualityState();
	},
);

const unsubscribeFrameStride = neuralStylizationFrameStride.subscribe(
	(value) => {
		currentFrameStride = value;
		refreshAutoQualityState();
	},
);

const unsubscribeStrength = neuralStylizationStrength.subscribe((value) => {
	currentOverlayOpacity = value;
	syncPresentationMode();
});

const unsubscribeAutoQualityEnabled =
	neuralStylizationAutoQualityEnabled.subscribe((value) => {
		isAutoQualityEnabled = value;
		refreshAutoQualityState();
	});

const handleModelSelected = (event: Event) => {
	const customEvent = event as CustomEvent<{ file?: File }>;
	const file = customEvent.detail?.file;

	if (file) {
		void loadUploadedModel(file);
	}
};

const handleModelReload = () => {
	void reloadOnnxSession();
};

const handleBenchmarkProviders = () => {
	void benchmarkOnnxProviders(false);
};

const handleBenchmarkCalibration = () => {
	void benchmarkOnnxProviders(true);
};

const handleBenchmarkSourceProfiles = () => {
	void benchmarkOnnxSourceProfiles(false);
};

const handleApplySourceRecommendation = () => {
	void benchmarkOnnxSourceProfiles(true);
};

if (typeof window !== "undefined") {
	window.addEventListener(
		"game:neural-style-model-selected",
		handleModelSelected,
	);
	window.addEventListener("game:neural-style-model-reload", handleModelReload);
	window.addEventListener(
		"game:neural-style-run-benchmark",
		handleBenchmarkProviders,
	);
	window.addEventListener(
		"game:neural-style-apply-calibration",
		handleBenchmarkCalibration,
	);
	window.addEventListener(
		"game:neural-style-run-source-benchmark",
		handleBenchmarkSourceProfiles,
	);
	window.addEventListener(
		"game:neural-style-apply-source-recommendation",
		handleApplySourceRecommendation,
	);
}

function clamp(value: number, minValue: number, maxValue: number) {
	return Math.max(minValue, Math.min(maxValue, value));
}

function clampByte(value: number) {
	return clamp(Math.round(value), 0, 255);
}

function pushRollingSample(samples: number[], value: number) {
	samples.push(value);

	if (samples.length > AUTO_QUALITY_WINDOW_SIZE) {
		samples.shift();
	}
}

function averageSamples(samples: number[]) {
	if (samples.length === 0) {
		return 0;
	}

	return samples.reduce((total, sample) => total + sample, 0) / samples.length;
}

async function waitForOnnxIdle(timeoutMs = 4000) {
	const startedAt = performance.now();

	while (onnxRunning) {
		if (performance.now() - startedAt > timeoutMs) {
			throw new Error("Previous ONNX inference did not finish in time.");
		}

		await new Promise((resolve) => {
			window.setTimeout(resolve, 16);
		});
	}
}

function getActiveAutoQualityStep() {
	if (!isEnabled || currentMode !== "onnx" || !isAutoQualityEnabled) {
		return 0;
	}

	return autoQualityStep;
}

function shouldUseStylizedOnlySceneProfile() {
	return (
		isEnabled && currentMode === "onnx" && currentOutputMode === "stylized-only"
	);
}

function getEffectiveSourceRenderProfile(
	outputMode: NeuralStylizationOutputMode = currentOutputMode,
) {
	if (currentMode !== "onnx") {
		return "shaded" as const;
	}

	if (currentSourceRenderProfile === "flat") {
		return "flat" as const;
	}

	if (currentSourceRenderProfile === "shaded") {
		return "shaded" as const;
	}

	return outputMode === "stylized-only" ? "flat" : "shaded";
}

function syncStylizedOnlySceneProfile() {
	neuralStylizationSceneShadowsSuppressed.set(
		shouldUseStylizedOnlySceneProfile(),
	);
}

function getEffectiveResolution() {
	const currentIndex = resolutionOrder.indexOf(currentResolution);
	const safeIndex = currentIndex >= 0 ? currentIndex : 1;
	const step = getActiveAutoQualityStep();
	const resolutionPenalty = step >= 4 ? 2 : step >= 2 ? 1 : 0;

	return (
		resolutionOrder[Math.max(0, safeIndex - resolutionPenalty)] ??
		currentResolution
	);
}

function getEffectiveInputHeight() {
	const step = getActiveAutoQualityStep();
	const penalty =
		autoQualityStepInputHeightPenalty[
			Math.min(step, autoQualityStepInputHeightPenalty.length - 1)
		] ?? 0;

	return Math.round(clamp(currentInputHeight - penalty, 128, 512));
}

function getEffectiveOutputScale() {
	const step = getActiveAutoQualityStep();
	const penalty =
		autoQualityStepOutputScalePenalty[
			Math.min(step, autoQualityStepOutputScalePenalty.length - 1)
		] ?? 0;

	return clamp(currentOutputScale - penalty, 0.5, 1);
}

function getConfiguredFrameStride() {
	const step = getActiveAutoQualityStep();
	const penalty =
		autoQualityStepFrameStridePenalty[
			Math.min(step, autoQualityStepFrameStridePenalty.length - 1)
		] ?? 0;

	return Math.max(1, Math.round(currentFrameStride + penalty));
}

function setAutoQualityStatus(message: string) {
	autoQualityStatusMessage = message;
	neuralStylizationAutoQualityStatus.set(message);
}

function resetBenchmarkStatus() {
	neuralStylizationBenchmarkInProgress.set(false);
	neuralStylizationBenchmarkStatus.set(
		"Run a provider benchmark on this device to compare WebGPU, WebGL, and WASM.",
	);
	neuralStylizationBenchmarkSummary.set("—");
	neuralStylizationBenchmarkRecommendedPreset.set("—");
	neuralStylizationBenchmarkRecommendedProvider.set("—");
}

function resetSourceBenchmarkStatus() {
	neuralStylizationSourceBenchmarkStatus.set(
		"Run a source benchmark to compare shaded and flat ONNX inputs.",
	);
	neuralStylizationSourceBenchmarkSummary.set("—");
	neuralStylizationSourceBenchmarkRecommendedProfile.set("—");
}

function syncEffectiveSettingsSummary() {
	const stylizedOnlyProfile = shouldUseStylizedOnlySceneProfile();
	const sourceProfile =
		currentMode === "onnx"
			? ` • source ${getEffectiveSourceRenderProfile()}`
			: "";

	neuralStylizationEffectiveSettingsSummary.set(
		`Resolution ${getEffectiveResolution()} • source ${getInternalHeight()} px • output ${Math.round(getEffectiveOutputScale() * 100)}% • every ${getConfiguredFrameStride()} frames${sourceProfile}${stylizedOnlyProfile ? " • scene shadows off" : ""}`,
	);
}

function resetAutoQualityTracking() {
	recentCaptureDurationsMs = [];
	recentInferenceDurationsMs = [];
	autoQualityDegradeCount = 0;
	autoQualityRecoverCount = 0;
	autoQualityTrackingStartedAt = performance.now();
	lastAutoQualityChangeAt = 0;
}

function setAutoQualityStep(nextStep: number, message: string) {
	const clampedStep = Math.max(0, Math.min(4, nextStep));
	const previousStep = autoQualityStep;

	autoQualityStep = clampedStep;
	autoQualityDegradeCount = 0;
	autoQualityRecoverCount = 0;
	lastAutoQualityChangeAt = performance.now();
	setAutoQualityStatus(message);
	syncEffectiveSettingsSummary();

	if (previousStep !== clampedStep) {
		syncCanvasSizes(true);
		syncPresentationMode();
	}
}

function refreshAutoQualityState() {
	const previousStep = autoQualityStep;

	autoQualityStep = 0;
	resetAutoQualityTracking();
	syncStylizedOnlySceneProfile();
	syncEffectiveSettingsSummary();

	if (!isEnabled) {
		setAutoQualityStatus(
			"Auto quality is idle until neural stylization is enabled.",
		);
	} else if (!isAutoQualityEnabled) {
		setAutoQualityStatus(
			"Auto quality disabled. Manual stylization settings are in effect.",
		);
	} else if (currentMode !== "onnx") {
		setAutoQualityStatus("Auto quality activates in ONNX mode.");
	} else if (!session) {
		setAutoQualityStatus(
			"Auto quality is waiting for the ONNX model to finish loading.",
		);
	} else {
		setAutoQualityStatus("Auto quality is profiling ONNX performance.");
	}

	if (previousStep !== autoQualityStep) {
		syncCanvasSizes(true);
		syncPresentationMode();
	}
}

function readSessionTensorConfig(
	nextSession: ort.InferenceSession,
): SessionTensorConfig {
	const inputMetadata = nextSession.inputMetadata[0];
	const outputMetadata = nextSession.outputMetadata[0];

	if (!inputMetadata?.isTensor || !outputMetadata?.isTensor) {
		throw new Error("Only tensor-based image models are supported.");
	}

	const nextInputLayout = detectLayout(inputMetadata.shape);
	const nextOutputLayout = detectLayout(outputMetadata.shape);

	if (!nextInputLayout || !nextOutputLayout) {
		throw new Error("Model must use 4D RGB NCHW or NHWC tensors.");
	}

	const inputName = nextSession.inputNames[0] ?? null;
	const outputName = nextSession.outputNames[0] ?? null;

	if (!inputName || !outputName) {
		throw new Error(
			"Model must expose at least one input and one output tensor.",
		);
	}

	const inputSize = getSpatialShape(inputMetadata.shape, nextInputLayout);

	return {
		inputName,
		outputName,
		inputLayout: nextInputLayout,
		outputLayout: nextOutputLayout,
		inputWidth: inputSize.width,
		inputHeight: inputSize.height,
		inputShape: inputMetadata.shape,
		outputShape: outputMetadata.shape,
	};
}

function createInputTensorFromImageData(
	sourceImageData: ImageData,
	config: SessionTensorConfig,
) {
	if (!runtime) {
		throw new Error("ONNX runtime is not ready.");
	}

	const cacheKey = [
		config.inputLayout,
		config.inputWidth,
		config.inputHeight,
		sourceImageData.width,
		sourceImageData.height,
	].join(":");

	if (
		onnxInputCacheKey !== cacheKey ||
		!onnxInputTensorData ||
		!onnxInputSourceXLookup ||
		!onnxInputSourceYLookup
	) {
		onnxInputCacheKey = cacheKey;
		onnxInputTensorData = new Float32Array(
			config.inputWidth * config.inputHeight * 3,
		);
		onnxInputSourceXLookup = new Uint16Array(config.inputWidth);
		onnxInputSourceYLookup = new Uint16Array(config.inputHeight);

		for (let y = 0; y < config.inputHeight; y += 1) {
			onnxInputSourceYLookup[y] = Math.min(
				sourceImageData.height - 1,
				Math.floor((y / config.inputHeight) * sourceImageData.height),
			);
		}

		for (let x = 0; x < config.inputWidth; x += 1) {
			onnxInputSourceXLookup[x] = Math.min(
				sourceImageData.width - 1,
				Math.floor((x / config.inputWidth) * sourceImageData.width),
			);
		}
	}

	const tensorData = onnxInputTensorData;
	const sourceXLookup = onnxInputSourceXLookup;
	const sourceYLookup = onnxInputSourceYLookup;
	const sourceWidth = sourceImageData.width;
	const sourcePixels = sourceImageData.data;
	const planeSize = config.inputWidth * config.inputHeight;
	const inputScale =
		currentInputRange === "zeroTo255"
			? 1
			: currentInputRange === "minusOneToOne"
				? 1 / 127.5
				: 1 / 255;
	const inputBias = currentInputRange === "minusOneToOne" ? -1 : 0;

	for (let y = 0; y < config.inputHeight; y += 1) {
		const sourceRowOffset = sourceYLookup[y] * sourceWidth;
		const rowOffset = y * config.inputWidth;

		for (let x = 0; x < config.inputWidth; x += 1) {
			const sourceIndex = (sourceRowOffset + sourceXLookup[x]) * 4;
			const red = sourcePixels[sourceIndex] * inputScale + inputBias;
			const green = sourcePixels[sourceIndex + 1] * inputScale + inputBias;
			const blue = sourcePixels[sourceIndex + 2] * inputScale + inputBias;

			if (config.inputLayout === "nchw") {
				const planeIndex = rowOffset + x;
				tensorData[planeIndex] = red;
				tensorData[planeSize + planeIndex] = green;
				tensorData[planeSize * 2 + planeIndex] = blue;
			} else {
				const tensorIndex = (rowOffset + x) * 3;
				tensorData[tensorIndex] = red;
				tensorData[tensorIndex + 1] = green;
				tensorData[tensorIndex + 2] = blue;
			}
		}
	}

	const tensorDims =
		config.inputLayout === "nchw"
			? [1, 3, config.inputHeight, config.inputWidth]
			: [1, config.inputHeight, config.inputWidth, 3];

	return new runtime.Tensor("float32", tensorData, tensorDims);
}

function applyStylizationPreset(preset: NeuralStylizationPreset) {
	isNeuralStylizationEnabled.set(true);
	neuralStylizationMode.set("onnx");

	if (preset === "speed") {
		neuralStylizationOutputMode.set("stylized-only");
		neuralStylizationSourceRenderProfile.set("auto");
		neuralStylizationResolution.set("low");
		neuralStylizationInputHeight.set(160);
		neuralStylizationOutputScale.set(0.9);
		neuralStylizationFrameStride.set(5);
		neuralStylizationStrength.set(1);
		return;
	}

	if (preset === "quality") {
		neuralStylizationOutputMode.set("blend");
		neuralStylizationSourceRenderProfile.set("shaded");
		neuralStylizationResolution.set("high");
		neuralStylizationInputHeight.set(320);
		neuralStylizationOutputScale.set(1);
		neuralStylizationFrameStride.set(2);
		neuralStylizationStrength.set(0.62);
		return;
	}

	neuralStylizationOutputMode.set("stylized-only");
	neuralStylizationSourceRenderProfile.set("auto");
	neuralStylizationResolution.set("medium");
	neuralStylizationInputHeight.set(224);
	neuralStylizationOutputScale.set(1);
	neuralStylizationFrameStride.set(3);
	neuralStylizationStrength.set(1);
}

function getCalibrationRecommendation(
	results: BenchmarkProviderResult[],
	captureMs: number,
) {
	const supportedResults = results.filter((result) => result.supported);

	if (supportedResults.length === 0) {
		return {
			preset: "speed" as NeuralStylizationPreset,
			provider: "auto" as NeuralStylizationOnnxProvider,
			totalMs: Number.POSITIVE_INFINITY,
		};
	}

	const bestResult = supportedResults.reduce((best, candidate) =>
		candidate.avgInferenceMs < best.avgInferenceMs ? candidate : best,
	);
	const totalMs = captureMs + bestResult.avgInferenceMs;
	const provider = bestResult.provider;

	let preset: NeuralStylizationPreset = "speed";

	if (bestResult.provider === "webgpu" && totalMs <= 55 && captureMs <= 18) {
		preset = "quality";
	} else if (
		(bestResult.provider === "webgpu" && totalMs <= 110) ||
		(bestResult.provider === "webgl" && totalMs <= 100) ||
		(bestResult.provider === "wasm" && totalMs <= 90)
	) {
		preset = "balanced";
	}

	return { preset, provider, totalMs };
}

async function benchmarkProvider(
	provider: Exclude<NeuralStylizationOnnxProvider, "auto">,
	sourceImageData: ImageData,
) {
	if (!onnxModelBytes) {
		throw new Error("Load an ONNX model before benchmarking providers.");
	}

	const providerLabel = provider.toUpperCase();

	try {
		const startedLoadingAt = performance.now();
		const benchmarkSession = await createSession(onnxModelBytes, provider);
		const loadMs = performance.now() - startedLoadingAt;
		const config = readSessionTensorConfig(benchmarkSession);
		const inputTensor = createInputTensorFromImageData(sourceImageData, config);
		const feeds = { [config.inputName]: inputTensor };

		await benchmarkSession.run(feeds);

		const sampleDurationsMs: number[] = [];

		for (let index = 0; index < 3; index += 1) {
			const startedAt = performance.now();
			await benchmarkSession.run(feeds);
			sampleDurationsMs.push(performance.now() - startedAt);
		}

		await benchmarkSession.release();

		return {
			provider,
			providerLabel,
			supported: true,
			loadMs,
			avgInferenceMs: averageSamples(sampleDurationsMs),
		} satisfies BenchmarkProviderResult;
	} catch (error) {
		return {
			provider,
			providerLabel,
			supported: false,
			loadMs: 0,
			avgInferenceMs: Number.POSITIVE_INFINITY,
			error: error instanceof Error ? error.message : "Unknown provider error.",
		} satisfies BenchmarkProviderResult;
	}
}

async function benchmarkCurrentSession(
	provider: Exclude<NeuralStylizationOnnxProvider, "auto">,
	sourceImageData: ImageData,
) {
	const providerLabel = provider.toUpperCase();

	if (!session) {
		throw new Error("No active ONNX session is available for benchmarking.");
	}

	await waitForOnnxIdle();
	await runSessionStylization(sourceImageData);

	const sampleDurationsMs: number[] = [];

	for (let index = 0; index < 3; index += 1) {
		const result = await runSessionStylization(sourceImageData);
		sampleDurationsMs.push(result.inferenceMs);
	}

	return {
		provider,
		providerLabel,
		supported: true,
		loadMs: 0,
		avgInferenceMs: averageSamples(sampleDurationsMs),
	} satisfies BenchmarkProviderResult;
}

function buildImageMetrics(reference: ImageData, stylized: ImageData) {
	const sampleWidth = Math.min(reference.width, stylized.width);
	const sampleHeight = Math.min(reference.height, stylized.height);
	let detailDifference = 0;
	let detailEnergy = 0;
	let styleDifference = 0;
	let sampleCount = 0;

	for (let y = 0; y < sampleHeight - 1; y += 2) {
		for (let x = 0; x < sampleWidth - 1; x += 2) {
			const index = (y * sampleWidth + x) * 4;
			const rightIndex = (y * sampleWidth + x + 1) * 4;
			const downIndex = ((y + 1) * sampleWidth + x) * 4;
			const referenceLuma =
				reference.data[index] * 0.2126 +
				reference.data[index + 1] * 0.7152 +
				reference.data[index + 2] * 0.0722;
			const stylizedLuma =
				stylized.data[index] * 0.2126 +
				stylized.data[index + 1] * 0.7152 +
				stylized.data[index + 2] * 0.0722;
			const referenceRightLuma =
				reference.data[rightIndex] * 0.2126 +
				reference.data[rightIndex + 1] * 0.7152 +
				reference.data[rightIndex + 2] * 0.0722;
			const stylizedRightLuma =
				stylized.data[rightIndex] * 0.2126 +
				stylized.data[rightIndex + 1] * 0.7152 +
				stylized.data[rightIndex + 2] * 0.0722;
			const referenceDownLuma =
				reference.data[downIndex] * 0.2126 +
				reference.data[downIndex + 1] * 0.7152 +
				reference.data[downIndex + 2] * 0.0722;
			const stylizedDownLuma =
				stylized.data[downIndex] * 0.2126 +
				stylized.data[downIndex + 1] * 0.7152 +
				stylized.data[downIndex + 2] * 0.0722;
			const referenceEdge =
				Math.abs(referenceLuma - referenceRightLuma) +
				Math.abs(referenceLuma - referenceDownLuma);
			const stylizedEdge =
				Math.abs(stylizedLuma - stylizedRightLuma) +
				Math.abs(stylizedLuma - stylizedDownLuma);

			detailDifference += Math.abs(referenceEdge - stylizedEdge);
			detailEnergy += referenceEdge + stylizedEdge + 1;
			styleDifference +=
				Math.abs(reference.data[index] - stylized.data[index]) +
				Math.abs(reference.data[index + 1] - stylized.data[index + 1]) +
				Math.abs(reference.data[index + 2] - stylized.data[index + 2]);
			sampleCount += 1;
		}
	}

	return {
		detailRetention: clamp(
			1 - detailDifference / Math.max(1, detailEnergy),
			0,
			1,
		),
		styleShift: clamp(
			styleDifference / Math.max(1, sampleCount * 255 * 3),
			0,
			1,
		),
	};
}

function getSourceBenchmarkRecommendation(results: SourceBenchmarkResult[]) {
	const shadedResult = results.find((result) => result.profile === "shaded");
	const flatResult = results.find((result) => result.profile === "flat");

	if (!shadedResult || !flatResult) {
		return {
			profile: "auto" as NeuralStylizationSourceRenderProfile,
			reason: "Not enough benchmark data to compare source profiles.",
		};
	}

	const shadedTotalMs = shadedResult.captureMs + shadedResult.avgInferenceMs;
	const flatTotalMs = flatResult.captureMs + flatResult.avgInferenceMs;
	const flatSavesMs = shadedTotalMs - flatTotalMs;
	const flatMeaningfullyFaster =
		flatSavesMs >= 6 || flatTotalMs <= shadedTotalMs * 0.92;
	const flatKeepsDetail =
		flatResult.detailRetention + 0.05 >= shadedResult.detailRetention;
	const flatKeepsStyle =
		flatResult.styleShift + 0.03 >= shadedResult.styleShift;

	if (flatMeaningfullyFaster && flatKeepsDetail && flatKeepsStyle) {
		return {
			profile: "flat" as NeuralStylizationSourceRenderProfile,
			reason: `Flat saved ${flatSavesMs.toFixed(1)} ms while holding ${(flatResult.detailRetention * 100).toFixed(0)}% structural retention against the shaded scene.`,
		};
	}

	return {
		profile: "auto" as NeuralStylizationSourceRenderProfile,
		reason: `Auto is safer for blend: flat changed detail too much or did not save enough time (${flatSavesMs.toFixed(1)} ms).`,
	};
}

async function benchmarkOnnxProviders(applyCalibration: boolean) {
	if (benchmarkInProgress) {
		return;
	}

	benchmarkInProgress = true;
	neuralStylizationBenchmarkInProgress.set(true);
	neuralStylizationBenchmarkStatus.set("Preparing ONNX benchmark…");
	neuralStylizationBenchmarkSummary.set("—");
	neuralStylizationBenchmarkRecommendedPreset.set("—");
	neuralStylizationBenchmarkRecommendedProvider.set("—");

	try {
		await ensureRuntime();

		if (!onnxModelBytes || !session) {
			await ensureBundledModelLoaded();
		}

		if (!onnxModelBytes) {
			throw new Error("No ONNX model bytes are loaded yet.");
		}

		ensureOverlayElements();
		syncCanvasSizes(true);
		syncPresentationMode();
		await waitForOnnxIdle();

		const captureStartedAt = performance.now();
		const sourceImageData = captureOnnxSourceFrame(currentOutputMode, {
			recordProfiling: false,
		});

		if (!sourceImageData) {
			throw new Error("Could not capture a frame for provider benchmarking.");
		}

		const captureMs = performance.now() - captureStartedAt;
		const activeProvider = get(
			neuralStylizationEffectiveProvider,
		).toLowerCase();
		neuralStylizationBenchmarkStatus.set("Benchmarking WebGPU…");
		const webgpuResult =
			activeProvider === "webgpu"
				? await benchmarkCurrentSession("webgpu", sourceImageData)
				: await benchmarkProvider("webgpu", sourceImageData);
		neuralStylizationBenchmarkStatus.set("Benchmarking WebGL…");
		const webglResult =
			activeProvider === "webgl"
				? await benchmarkCurrentSession("webgl", sourceImageData)
				: await benchmarkProvider("webgl", sourceImageData);
		neuralStylizationBenchmarkStatus.set("Benchmarking WASM…");
		const wasmResult =
			activeProvider === "wasm"
				? await benchmarkCurrentSession("wasm", sourceImageData)
				: await benchmarkProvider("wasm", sourceImageData);
		const results = [webgpuResult, webglResult, wasmResult];
		const recommendation = getCalibrationRecommendation(results, captureMs);

		neuralStylizationBenchmarkRecommendedPreset.set(
			recommendation.preset.toUpperCase(),
		);
		neuralStylizationBenchmarkRecommendedProvider.set(
			recommendation.provider.toUpperCase(),
		);
		neuralStylizationBenchmarkSummary.set(
			[
				`Capture ${captureMs.toFixed(1)} ms`,
				webgpuResult.supported
					? `WebGPU ${webgpuResult.avgInferenceMs.toFixed(1)} ms avg`
					: `WebGPU unavailable (${webgpuResult.error})`,
				webglResult.supported
					? `WebGL ${webglResult.avgInferenceMs.toFixed(1)} ms avg`
					: `WebGL unavailable (${webglResult.error})`,
				wasmResult.supported
					? `WASM ${wasmResult.avgInferenceMs.toFixed(1)} ms avg`
					: `WASM unavailable (${wasmResult.error})`,
			].join(" • "),
		);
		neuralStylizationBenchmarkStatus.set(
			`Recommended ${recommendation.preset.toUpperCase()} on ${recommendation.provider.toUpperCase()} for this device.`,
		);

		if (applyCalibration) {
			neuralStylizationOnnxProvider.set(recommendation.provider);
			applyStylizationPreset(recommendation.preset);
			neuralStylizationBenchmarkStatus.set(
				`Applied ${recommendation.preset.toUpperCase()} on ${recommendation.provider.toUpperCase()} after benchmarking this device.`,
			);
		}
	} catch (error) {
		neuralStylizationBenchmarkStatus.set(
			`Benchmark failed: ${error instanceof Error ? error.message : "Unknown error."}`,
		);
		neuralStylizationBenchmarkSummary.set("—");
		neuralStylizationBenchmarkRecommendedPreset.set("—");
		neuralStylizationBenchmarkRecommendedProvider.set("—");
	} finally {
		benchmarkInProgress = false;
		neuralStylizationBenchmarkInProgress.set(false);
	}
}

async function runSessionStylization(sourceImageData: ImageData) {
	if (!runtime || !session) {
		throw new Error("ONNX session is not ready.");
	}

	const config = readSessionTensorConfig(session);
	const inputTensor = createInputTensorFromImageData(sourceImageData, config);
	const startedAt = performance.now();
	const outputs = await session.run({ [config.inputName]: inputTensor });
	const inferenceMs = performance.now() - startedAt;
	const output = outputs[config.outputName] as ort.Tensor | undefined;

	if (!output) {
		throw new Error("Inference returned no output tensor.");
	}

	const data = output.location === "cpu" ? output.data : await output.getData();

	if (!(data instanceof Float32Array || data instanceof Uint8Array)) {
		throw new Error("Model output is not a supported numeric tensor.");
	}

	const outputSize = getSpatialShape(output.dims, config.outputLayout);
	if (
		!onnxOutputImageData ||
		onnxOutputImageData.width !== outputSize.width ||
		onnxOutputImageData.height !== outputSize.height
	) {
		onnxOutputImageData = new ImageData(outputSize.width, outputSize.height);
	}

	const imageData = onnxOutputImageData;
	const outputPixels = imageData.data;
	const outputMode = currentOutputRange;
	const outputScale =
		outputMode === "minusOneToOne"
			? 127.5
			: outputMode === "zeroToOne"
				? 255
				: 1;
	const outputBias = outputMode === "minusOneToOne" ? 127.5 : 0;

	for (let y = 0; y < outputSize.height; y += 1) {
		for (let x = 0; x < outputSize.width; x += 1) {
			let red = 0;
			let green = 0;
			let blue = 0;

			if (config.outputLayout === "nchw") {
				const planeIndex = y * outputSize.width + x;
				red = Number(data[planeIndex] ?? 0);
				green = Number(
					data[outputSize.width * outputSize.height + planeIndex] ?? red,
				);
				blue = Number(
					data[outputSize.width * outputSize.height * 2 + planeIndex] ?? red,
				);
			} else {
				const tensorIndex = (y * outputSize.width + x) * 3;
				red = Number(data[tensorIndex] ?? 0);
				green = Number(data[tensorIndex + 1] ?? red);
				blue = Number(data[tensorIndex + 2] ?? red);
			}

			const targetIndex = (y * outputSize.width + x) * 4;

			if (outputMode === "auto") {
				outputPixels[targetIndex] = denormalizeOutputValue(red);
				outputPixels[targetIndex + 1] = denormalizeOutputValue(green);
				outputPixels[targetIndex + 2] = denormalizeOutputValue(blue);
			} else {
				outputPixels[targetIndex] = clampByte(red * outputScale + outputBias);
				outputPixels[targetIndex + 1] = clampByte(
					green * outputScale + outputBias,
				);
				outputPixels[targetIndex + 2] = clampByte(
					blue * outputScale + outputBias,
				);
			}

			outputPixels[targetIndex + 3] = 255;
		}
	}

	return { imageData, inferenceMs };
}

async function benchmarkSourceProfile(
	profile: "shaded" | "flat",
	referenceImageData: ImageData,
) {
	const captureDurationsMs: number[] = [];
	const inferenceDurationsMs: number[] = [];
	let lastImageData: ImageData | null = null;

	for (let index = 0; index < 3; index += 1) {
		const captureStartedAt = performance.now();
		const refreshedSourceImageData = captureSceneToTarget({
			flatSource: profile === "flat",
			recordProfiling: false,
		});

		if (!refreshedSourceImageData) {
			throw new Error(`Could not refresh the ${profile} source profile.`);
		}

		captureDurationsMs.push(performance.now() - captureStartedAt);
		const result = await runSessionStylization(refreshedSourceImageData);
		inferenceDurationsMs.push(result.inferenceMs);
		lastImageData = result.imageData;
	}

	if (!lastImageData) {
		throw new Error(
			`No ONNX output returned for the ${profile} source profile.`,
		);
	}

	const metrics = buildImageMetrics(referenceImageData, lastImageData);

	return {
		profile,
		profileLabel: profile === "flat" ? "Flat" : "Shaded",
		captureMs: averageSamples(captureDurationsMs),
		avgInferenceMs: averageSamples(inferenceDurationsMs),
		detailRetention: metrics.detailRetention,
		styleShift: metrics.styleShift,
	} satisfies SourceBenchmarkResult;
}

async function benchmarkOnnxSourceProfiles(applyRecommendation: boolean) {
	if (benchmarkInProgress) {
		return;
	}

	benchmarkInProgress = true;
	neuralStylizationBenchmarkInProgress.set(true);
	neuralStylizationSourceBenchmarkStatus.set(
		"Preparing source render benchmark…",
	);
	neuralStylizationSourceBenchmarkSummary.set("—");
	neuralStylizationSourceBenchmarkRecommendedProfile.set("—");

	try {
		await ensureRuntime();

		if (!onnxModelBytes || !session) {
			await ensureBundledModelLoaded();
		}

		if (!session) {
			throw new Error(
				"Load an ONNX model before benchmarking source profiles.",
			);
		}

		ensureOverlayElements();
		syncCanvasSizes(true);
		syncPresentationMode();
		await waitForOnnxIdle();

		neuralStylizationSourceBenchmarkStatus.set("Benchmarking shaded source…");
		const referenceImageData = captureSceneToTarget({
			flatSource: false,
			recordProfiling: false,
		});

		if (!referenceImageData) {
			throw new Error("Could not capture the shaded source render.");
		}

		const referenceSnapshot = new ImageData(
			new Uint8ClampedArray(referenceImageData.data),
			referenceImageData.width,
			referenceImageData.height,
		);

		const shadedResult = await benchmarkSourceProfile(
			"shaded",
			referenceSnapshot,
		);
		neuralStylizationSourceBenchmarkStatus.set("Benchmarking flat source…");
		const flatResult = await benchmarkSourceProfile("flat", referenceSnapshot);
		const recommendation = getSourceBenchmarkRecommendation([
			shadedResult,
			flatResult,
		]);

		neuralStylizationSourceBenchmarkSummary.set(
			[
				`Shaded ${shadedResult.captureMs.toFixed(1)} + ${shadedResult.avgInferenceMs.toFixed(1)} ms`,
				`Flat ${flatResult.captureMs.toFixed(1)} + ${flatResult.avgInferenceMs.toFixed(1)} ms`,
				`Flat detail ${(flatResult.detailRetention * 100).toFixed(0)}%`,
				`Flat style ${(flatResult.styleShift * 100).toFixed(0)}%`,
			].join(" • "),
		);
		neuralStylizationSourceBenchmarkRecommendedProfile.set(
			recommendation.profile.toUpperCase(),
		);
		neuralStylizationSourceBenchmarkStatus.set(
			`${recommendation.reason} Recommendation targets ONNX blend mode.`,
		);

		if (applyRecommendation) {
			neuralStylizationSourceRenderProfile.set(recommendation.profile);
			neuralStylizationSourceBenchmarkStatus.set(
				`${recommendation.reason} Applied ${recommendation.profile.toUpperCase()} for ONNX source capture.`,
			);
		}
	} catch (error) {
		neuralStylizationSourceBenchmarkStatus.set(
			`Source benchmark failed: ${error instanceof Error ? error.message : "Unknown error."}`,
		);
		neuralStylizationSourceBenchmarkSummary.set("—");
		neuralStylizationSourceBenchmarkRecommendedProfile.set("—");
	} finally {
		benchmarkInProgress = false;
		neuralStylizationBenchmarkInProgress.set(false);
	}
}

function mixColor(a: number[], b: number[], amount: number) {
	return [
		a[0] + (b[0] - a[0]) * amount,
		a[1] + (b[1] - a[1]) * amount,
		a[2] + (b[2] - a[2]) * amount,
	];
}

function paletteRamp(luminance: number, mode: "soft-shader" | "glitch-shader") {
	const shadow =
		mode === "soft-shader" ? softPaletteShadow : glitchPaletteShadow;
	const midtone =
		mode === "soft-shader" ? softPaletteMidtone : glitchPaletteMidtone;
	const highlight =
		mode === "soft-shader" ? softPaletteHighlight : glitchPaletteHighlight;
	const lowerMix = clamp(luminance / 0.58, 0, 1);
	const upperMix = clamp((luminance - 0.42) / 0.58, 0, 1);
	const curveMix = clamp((luminance - 0.18) / 0.66, 0, 1);
	const lower = mixColor(shadow, midtone, lowerMix);
	const upper = mixColor(midtone, highlight, upperMix);

	return mixColor(lower, upper, curveMix);
}

function getInternalHeight() {
	const qualityScale = get(qualitySettingsStore).canvasScale;
	const effectiveResolution = getEffectiveResolution();
	const effectiveInputHeight = getEffectiveInputHeight();
	const stylizedOnlySourceMultiplier = shouldUseStylizedOnlySceneProfile()
		? STYLIZED_ONLY_ONNX_SOURCE_SCALE
		: 1;
	const maxInternalHeight = shouldUseStylizedOnlySceneProfile() ? 512 : 640;
	const qualityMultiplier =
		effectiveResolution === "low"
			? 0.85
			: effectiveResolution === "high"
				? 1.15
				: 1;

	return Math.round(
		clamp(
			effectiveInputHeight *
				qualityScale *
				qualityMultiplier *
				stylizedOnlySourceMultiplier,
			96,
			maxInternalHeight,
		),
	);
}

function getEffectiveFrameStride() {
	let stride = getConfiguredFrameStride();

	if (currentOutputMode === "stylized-only") {
		stride += 1;
	}

	if (
		currentMode === "onnx" &&
		get(neuralStylizationEffectiveProvider) === "WASM"
	) {
		stride += 2;
	}

	if (currentMode === "onnx") {
		if (lastOnnxInferenceDurationMs > 240) {
			stride += 4;
		} else if (lastOnnxInferenceDurationMs > 160) {
			stride += 2;
		} else if (lastOnnxInferenceDurationMs > 90) {
			stride += 1;
		}
	}

	return stride;
}

function ensureOverlayElements() {
	if (!renderer || overlayCanvas || !renderer.domElement.parentElement) {
		return;
	}

	overlayCanvas = document.createElement("canvas");
	overlayCanvas.style.position = "absolute";
	overlayCanvas.style.inset = "0";
	overlayCanvas.style.width = "100%";
	overlayCanvas.style.height = "100%";
	overlayCanvas.style.pointerEvents = "none";
	overlayCanvas.style.zIndex = "1";
	overlayCanvas.style.display = "none";

	overlayContext = overlayCanvas.getContext("2d");
	processingCanvas = document.createElement("canvas");
	processingContext = processingCanvas.getContext("2d", {
		willReadFrequently: true,
	});
	outputCanvas = document.createElement("canvas");
	outputContext = outputCanvas.getContext("2d");

	renderer.domElement.parentElement.appendChild(overlayCanvas);
	syncCanvasSizes(true);
	syncPresentationMode();
}

function syncPresentationMode() {
	if (!renderer || !overlayCanvas) {
		return;
	}

	const showOverlay = isEnabled && currentOutputMode !== "original";
	const stylizedOnly = showOverlay && currentOutputMode === "stylized-only";
	syncStylizedOnlySceneProfile();

	overlayCanvas.style.display = showOverlay ? "block" : "none";
	overlayCanvas.style.opacity = String(
		currentOutputMode === "blend" ? currentOverlayOpacity : 1,
	);
	overlayCanvas.style.mixBlendMode =
		currentOutputMode === "blend" ? "screen" : "normal";
	overlayCanvas.style.imageRendering =
		stylizedOnly && getEffectiveOutputScale() < 0.85 ? "pixelated" : "auto";

	renderer.domElement.style.opacity = stylizedOnly ? "0" : "1";
	autoRender.current = !stylizedOnly;

	if (!showOverlay && overlayContext && overlayCanvas.width > 0) {
		overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
	}
}

function syncCanvasSizes(force = false) {
	if (!renderer || !overlayCanvas || !processingCanvas || !outputCanvas) {
		return;
	}

	const sourceWidth = renderer.domElement.width;
	const sourceHeight = renderer.domElement.height;

	if (
		!force &&
		sourceWidth === lastSourceWidth &&
		sourceHeight === lastSourceHeight &&
		overlayCanvas.width > 0
	) {
		return;
	}

	lastSourceWidth = sourceWidth;
	lastSourceHeight = sourceHeight;

	overlayCanvas.width = Math.max(
		1,
		Math.round(sourceWidth * getEffectiveOutputScale()),
	);
	overlayCanvas.height = Math.max(
		1,
		Math.round(sourceHeight * getEffectiveOutputScale()),
	);

	const aspect = Math.max(sourceWidth, 1) / Math.max(sourceHeight, 1);
	const internalHeight = getInternalHeight();
	processingCanvas.width = Math.max(128, Math.round(internalHeight * aspect));
	processingCanvas.height = internalHeight;

	outputCanvas.width = processingCanvas.width;
	outputCanvas.height = processingCanvas.height;

	offscreenTarget?.dispose();
	offscreenTarget = new THREE.WebGLRenderTarget(
		processingCanvas.width,
		processingCanvas.height,
		{
			depthBuffer: true,
			stencilBuffer: false,
		},
	);
	offscreenTarget.texture.minFilter = THREE.LinearFilter;
	offscreenTarget.texture.magFilter = THREE.LinearFilter;
	offscreenPixelBuffer = new Uint8Array(
		processingCanvas.width * processingCanvas.height * 4,
	);
	offscreenImageData =
		processingContext?.createImageData(
			processingCanvas.width,
			processingCanvas.height,
		) ?? null;
}

function captureCanvasFrame(options?: { recordProfiling?: boolean }) {
	if (!renderer || !processingCanvas || !processingContext) {
		return null;
	}

	const startedAt = performance.now();
	processingContext.clearRect(
		0,
		0,
		processingCanvas.width,
		processingCanvas.height,
	);
	processingContext.drawImage(
		renderer.domElement,
		0,
		0,
		processingCanvas.width,
		processingCanvas.height,
	);
	const imageData = processingContext.getImageData(
		0,
		0,
		processingCanvas.width,
		processingCanvas.height,
	);
	const captureDurationMs = performance.now() - startedAt;

	if (options?.recordProfiling !== false) {
		neuralStylizationCaptureMs.set(`${captureDurationMs.toFixed(1)} ms`);

		if (currentMode === "onnx") {
			pushRollingSample(recentCaptureDurationsMs, captureDurationMs);
			evaluateAutoQuality();
		}
	}

	return imageData;
}

function captureSceneToTarget(options?: {
	flatSource?: boolean;
	recordProfiling?: boolean;
}) {
	if (
		!renderer ||
		!scene ||
		!camera.current ||
		!offscreenTarget ||
		!offscreenPixelBuffer ||
		!processingContext
	) {
		return null;
	}

	const startedAt = performance.now();
	renderSceneToOffscreenTarget(options?.flatSource ?? false);

	if (
		!offscreenImageData ||
		offscreenImageData.width !== offscreenTarget.width ||
		offscreenImageData.height !== offscreenTarget.height
	) {
		offscreenImageData = processingContext.createImageData(
			offscreenTarget.width,
			offscreenTarget.height,
		);
	}

	const imageData = offscreenImageData;
	const rowStride = offscreenTarget.width * 4;

	for (let y = 0; y < offscreenTarget.height; y += 1) {
		const flippedY = offscreenTarget.height - 1 - y;
		const sourceIndex = flippedY * rowStride;
		const targetIndex = y * rowStride;
		imageData.data.set(
			offscreenPixelBuffer.subarray(sourceIndex, sourceIndex + rowStride),
			targetIndex,
		);
	}

	const captureDurationMs = performance.now() - startedAt;

	if (options?.recordProfiling !== false) {
		neuralStylizationCaptureMs.set(`${captureDurationMs.toFixed(1)} ms`);

		if (currentMode === "onnx") {
			pushRollingSample(recentCaptureDurationsMs, captureDurationMs);
			evaluateAutoQuality();
		}
	}

	return imageData;
}

function getFlatCaptureMaterial(originalMaterial: THREE.Material) {
	let flatMaterial = flatCaptureMaterialCache.get(originalMaterial);

	if (!flatMaterial) {
		flatMaterial = new THREE.MeshBasicMaterial();
		flatCaptureMaterialCache.set(originalMaterial, flatMaterial);
	}

	const source = originalMaterial as THREE.Material & {
		alphaMap?: THREE.Texture | null;
		alphaTest?: number;
		color?: THREE.Color;
		map?: THREE.Texture | null;
		morphTargets?: boolean;
		name?: string;
		opacity?: number;
		side?: THREE.Side;
		skinning?: boolean;
		transparent?: boolean;
		vertexColors?: boolean;
	};
	const cached = flatMaterial as THREE.MeshBasicMaterial & {
		morphTargets?: boolean;
		skinning?: boolean;
	};
	const nextColor = source.color instanceof THREE.Color ? source.color : null;
	const nextMap = source.map ?? null;
	const nextAlphaMap = source.alphaMap ?? null;
	const nextTransparent = Boolean(source.transparent);
	const nextVertexColors = Boolean(source.vertexColors);
	const nextAlphaTest = source.alphaTest ?? 0;
	const nextSide = source.side ?? THREE.FrontSide;
	const needsUpdate =
		cached.map !== nextMap ||
		cached.alphaMap !== nextAlphaMap ||
		cached.transparent !== nextTransparent ||
		cached.vertexColors !== nextVertexColors ||
		cached.alphaTest !== nextAlphaTest ||
		cached.side !== nextSide ||
		cached.fog !== false ||
		cached.toneMapped !== false;

	cached.name = source.name ? `${source.name}-flat-capture` : "flat-capture";

	if (nextColor) {
		cached.color.copy(nextColor);
	} else {
		cached.color.setScalar(1);
	}

	cached.map = nextMap;
	cached.alphaMap = nextAlphaMap;
	cached.transparent = nextTransparent;
	cached.opacity = source.opacity ?? 1;
	cached.alphaTest = nextAlphaTest;
	cached.side = nextSide;
	cached.vertexColors = nextVertexColors;
	cached.visible = originalMaterial.visible;
	cached.depthWrite = originalMaterial.depthWrite;
	cached.depthTest = originalMaterial.depthTest;
	cached.blending = originalMaterial.blending;
	cached.blendSrc = originalMaterial.blendSrc;
	cached.blendDst = originalMaterial.blendDst;
	cached.blendEquation = originalMaterial.blendEquation;
	cached.premultipliedAlpha = originalMaterial.premultipliedAlpha;
	cached.dithering = originalMaterial.dithering;
	cached.fog = false;
	cached.toneMapped = false;
	cached.skinning = Boolean(source.skinning);
	cached.morphTargets = Boolean(source.morphTargets);
	cached.needsUpdate = needsUpdate;

	return cached;
}

function applyFlatCaptureMaterials() {
	flatCaptureOriginalMaterials.clear();

	scene.traverse((object) => {
		if (!object.isMesh) {
			return;
		}

		const mesh = object as THREE.Mesh;

		if (!mesh.material) {
			return;
		}

		flatCaptureOriginalMaterials.set(mesh, mesh.material);
		mesh.material = Array.isArray(mesh.material)
			? mesh.material.map(getFlatCaptureMaterial)
			: getFlatCaptureMaterial(mesh.material);
	});
}

function restoreFlatCaptureMaterials() {
	for (const [mesh, originalMaterial] of flatCaptureOriginalMaterials) {
		mesh.material = originalMaterial;
	}

	flatCaptureOriginalMaterials.clear();
}

function renderSceneToOffscreenTarget(flatSource: boolean) {
	if (
		!renderer ||
		!scene ||
		!camera.current ||
		!offscreenTarget ||
		!offscreenPixelBuffer
	) {
		return;
	}

	try {
		if (flatSource) {
			applyFlatCaptureMaterials();
		}

		renderer.setRenderTarget(offscreenTarget);
		renderer.render(scene, camera.current);
		renderer.readRenderTargetPixels(
			offscreenTarget,
			0,
			0,
			offscreenTarget.width,
			offscreenTarget.height,
			offscreenPixelBuffer,
		);
	} finally {
		renderer.setRenderTarget(null);

		if (flatSource) {
			restoreFlatCaptureMaterials();
		}
	}
}

function captureOnnxSourceFrame(
	outputMode: NeuralStylizationOutputMode = currentOutputMode,
	options?: { recordProfiling?: boolean },
) {
	const sourceProfile = getEffectiveSourceRenderProfile(outputMode);

	if (outputMode === "stylized-only" || sourceProfile === "flat") {
		return captureSceneToTarget({
			flatSource: sourceProfile === "flat",
			recordProfiling: options?.recordProfiling,
		});
	}

	return captureCanvasFrame(options);
}

function drawOverlayImageData(imageData: ImageData) {
	if (!overlayCanvas || !overlayContext || !outputCanvas || !outputContext) {
		return;
	}

	const startedAt = performance.now();

	if (
		outputCanvas.width !== imageData.width ||
		outputCanvas.height !== imageData.height
	) {
		outputCanvas.width = imageData.width;
		outputCanvas.height = imageData.height;
	}

	outputContext.putImageData(imageData, 0, 0);
	overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
	overlayContext.imageSmoothingEnabled = getEffectiveOutputScale() >= 0.85;
	overlayContext.drawImage(
		outputCanvas,
		0,
		0,
		overlayCanvas.width,
		overlayCanvas.height,
	);

	neuralStylizationComposeMs.set(
		`${(performance.now() - startedAt).toFixed(1)} ms`,
	);
}

function evaluateAutoQuality() {
	syncEffectiveSettingsSummary();

	if (!isEnabled || !isAutoQualityEnabled || currentMode !== "onnx") {
		return;
	}

	if (!session) {
		setAutoQualityStatus(
			"Auto quality is waiting for the ONNX model to finish loading.",
		);
		return;
	}

	if (
		recentInferenceDurationsMs.length < AUTO_QUALITY_MIN_SAMPLES ||
		recentCaptureDurationsMs.length < AUTO_QUALITY_MIN_SAMPLES
	) {
		setAutoQualityStatus("Auto quality is profiling ONNX performance.");
		return;
	}

	const now = performance.now();
	const averageInferenceMs = averageSamples(recentInferenceDurationsMs);
	const averageCaptureMs = averageSamples(recentCaptureDurationsMs);
	const totalAverageMs = averageInferenceMs + averageCaptureMs;
	const provider = get(neuralStylizationEffectiveProvider);
	const usingWasm = provider === "WASM";

	if (now - autoQualityTrackingStartedAt < AUTO_QUALITY_STARTUP_GRACE_MS) {
		setAutoQualityStatus(
			`Auto quality is profiling performance. Avg inference ${averageInferenceMs.toFixed(0)} ms, capture ${averageCaptureMs.toFixed(0)} ms.`,
		);
		return;
	}

	const severeDegrade =
		averageInferenceMs >= 180 ||
		averageCaptureMs >= 50 ||
		totalAverageMs >= 220;
	const shouldDegrade =
		severeDegrade ||
		averageInferenceMs >= (usingWasm ? 95 : 110) ||
		averageCaptureMs >= 30 ||
		totalAverageMs >= (usingWasm ? 130 : 150);
	const shouldRecover =
		autoQualityStep > 0 &&
		!usingWasm &&
		averageInferenceMs <= 50 &&
		averageCaptureMs <= 18 &&
		totalAverageMs <= 70;

	if (shouldDegrade) {
		autoQualityRecoverCount = 0;
		autoQualityDegradeCount += severeDegrade ? 2 : 1;
	} else if (shouldRecover) {
		autoQualityDegradeCount = 0;
		autoQualityRecoverCount += 1;
	} else {
		autoQualityDegradeCount = Math.max(0, autoQualityDegradeCount - 1);
		autoQualityRecoverCount = Math.max(0, autoQualityRecoverCount - 1);
	}

	if (now - lastAutoQualityChangeAt < AUTO_QUALITY_CHANGE_COOLDOWN_MS) {
		setAutoQualityStatus(
			`Auto quality is holding level ${autoQualityStep}/4 at ${averageInferenceMs.toFixed(0)} ms inference and ${averageCaptureMs.toFixed(0)} ms capture.`,
		);
		return;
	}

	if (
		autoQualityDegradeCount >= AUTO_QUALITY_DEGRADE_THRESHOLD &&
		autoQualityStep < 4
	) {
		const nextStep = autoQualityStep + 1;
		setAutoQualityStep(
			nextStep,
			`Auto quality reduced load to level ${nextStep}/4 after averaging ${averageInferenceMs.toFixed(0)} ms inference and ${averageCaptureMs.toFixed(0)} ms capture.`,
		);
		return;
	}

	if (
		autoQualityRecoverCount >= AUTO_QUALITY_RECOVER_THRESHOLD &&
		autoQualityStep > 0
	) {
		const nextStep = autoQualityStep - 1;
		setAutoQualityStep(
			nextStep,
			nextStep === 0
				? `Auto quality restored your baseline settings after recovering to ${averageInferenceMs.toFixed(0)} ms inference and ${averageCaptureMs.toFixed(0)} ms capture.`
				: `Auto quality restored one step to level ${nextStep}/4 after recovering to ${averageInferenceMs.toFixed(0)} ms inference and ${averageCaptureMs.toFixed(0)} ms capture.`,
		);
		return;
	}

	setAutoQualityStatus(
		autoQualityStep === 0
			? `Auto quality is holding your baseline settings at ${averageInferenceMs.toFixed(0)} ms inference and ${averageCaptureMs.toFixed(0)} ms capture.`
			: `Auto quality is holding reduced level ${autoQualityStep}/4 at ${averageInferenceMs.toFixed(0)} ms inference and ${averageCaptureMs.toFixed(0)} ms capture.`,
	);
}

function applyShaderStylization(
	source: ImageData,
	mode: "soft-shader" | "glitch-shader",
) {
	const output = new ImageData(
		new Uint8ClampedArray(source.data),
		source.width,
		source.height,
	);
	const { data, width, height } = output;
	const edgeThreshold = mode === "soft-shader" ? 0.14 : 0.2;
	const luminance = new Float32Array(width * height);

	for (let index = 0; index < width * height; index += 1) {
		const stride = index * 4;
		const red = data[stride] / 255;
		const green = data[stride + 1] / 255;
		const blue = data[stride + 2] / 255;
		luminance[index] = red * 0.2126 + green * 0.7152 + blue * 0.0722;
	}

	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const index = y * width + x;
			const stride = index * 4;
			const red = data[stride] / 255;
			const green = data[stride + 1] / 255;
			const blue = data[stride + 2] / 255;
			const levels = mode === "soft-shader" ? 7 : 5;
			const quantizedRed = Math.floor(red * levels) / Math.max(1, levels - 1);
			const quantizedGreen =
				Math.floor(green * levels) / Math.max(1, levels - 1);
			const quantizedBlue = Math.floor(blue * levels) / Math.max(1, levels - 1);
			const pixelLuminance =
				quantizedRed * 0.2126 +
				quantizedGreen * 0.7152 +
				quantizedBlue * 0.0722;

			const left = x > 0 ? luminance[index - 1] : pixelLuminance;
			const right = x < width - 1 ? luminance[index + 1] : pixelLuminance;
			const up = y > 0 ? luminance[index - width] : pixelLuminance;
			const down = y < height - 1 ? luminance[index + width] : pixelLuminance;
			const edge =
				Math.abs(pixelLuminance - left) +
				Math.abs(pixelLuminance - right) +
				Math.abs(pixelLuminance - up) +
				Math.abs(pixelLuminance - down);

			const mapped = paletteRamp(pixelLuminance, mode);
			const outlineMix =
				edge > edgeThreshold ? (mode === "soft-shader" ? 0.12 : 0.55) : 0;
			const brightnessBoost = mode === "soft-shader" ? 1.08 : 0.95;

			data[stride] = clampByte(mapped[0] * brightnessBoost * (1 - outlineMix));
			data[stride + 1] = clampByte(
				mapped[1] * brightnessBoost * (1 - outlineMix),
			);
			data[stride + 2] = clampByte(
				mapped[2] * brightnessBoost * (1 - outlineMix),
			);
			data[stride + 3] = 255;
		}
	}

	return output;
}

async function ensureRuntime() {
	if (runtime) {
		return runtime;
	}

	const nextRuntime = (await import(
		/* @vite-ignore */ externalRuntimeModulePath
	)) as OnnxRuntimeModule;
	nextRuntime.env.wasm.proxy = false;
	nextRuntime.env.wasm.wasmPaths = externalRuntimeWasmPrefix;
	runtime = nextRuntime;
	return runtime;
}

function formatShape(shape: readonly (number | string)[]) {
	return shape.length > 0 ? shape.join(" × ") : "—";
}

function detectLayout(shape: readonly (number | string)[]) {
	if (shape.length !== 4) {
		return null;
	}

	if (shape[1] === 3) return "nchw";
	if (shape[3] === 3) return "nhwc";
	return null;
}

function getSpatialShape(
	shape: readonly (number | string)[],
	layout: "nchw" | "nhwc",
) {
	const heightIndex = layout === "nchw" ? 2 : 1;
	const widthIndex = layout === "nchw" ? 3 : 2;

	return {
		width:
			typeof shape[widthIndex] === "number" && shape[widthIndex] > 0
				? shape[widthIndex]
				: 224,
		height:
			typeof shape[heightIndex] === "number" && shape[heightIndex] > 0
				? shape[heightIndex]
				: 224,
	};
}

async function createSession(
	modelBytes: Uint8Array,
	provider: NeuralStylizationOnnxProvider,
) {
	const ortRuntime = await ensureRuntime();
	const options: ort.InferenceSession.SessionOptions =
		provider === "webgpu"
			? {
					executionProviders: [{ name: "webgpu", preferredLayout: "NCHW" }],
					graphOptimizationLevel: "all",
				}
			: provider === "webgl"
				? {
						executionProviders: [{ name: "webgl" }],
						graphOptimizationLevel: "all",
					}
				: {
						executionProviders: [{ name: "wasm" }],
						graphOptimizationLevel: "all",
					};

	return ortRuntime.InferenceSession.create(modelBytes.slice(), options);
}

async function createSessionWithFallback(modelBytes: Uint8Array) {
	if (
		currentProvider === "webgpu" ||
		currentProvider === "webgl" ||
		currentProvider === "wasm"
	) {
		try {
			return {
				providerUsed: currentProvider,
				session: await createSession(modelBytes, currentProvider),
			};
		} catch (error) {
			if (currentProvider === "wasm") {
				throw error;
			}

			return {
				providerUsed: "wasm" as NeuralStylizationOnnxProvider,
				session: await createSession(modelBytes, "wasm"),
			};
		}
	}

	try {
		return {
			providerUsed: "webgpu" as NeuralStylizationOnnxProvider,
			session: await createSession(modelBytes, "webgpu"),
		};
	} catch {}

	try {
		return {
			providerUsed: "webgl" as NeuralStylizationOnnxProvider,
			session: await createSession(modelBytes, "webgl"),
		};
	} catch {}

	return {
		providerUsed: "wasm" as NeuralStylizationOnnxProvider,
		session: await createSession(modelBytes, "wasm"),
	};
}

async function finishSessionSetup(nextSession: ort.InferenceSession) {
	const config = readSessionTensorConfig(nextSession);

	onnxInputName = config.inputName;
	onnxOutputName = config.outputName;
	onnxInputLayout = config.inputLayout;
	onnxOutputLayout = config.outputLayout;
	onnxInputWidth = config.inputWidth;
	onnxInputHeight = config.inputHeight;
	session = nextSession;

	neuralStylizationOnnxInputShape.set(formatShape(config.inputShape));
	neuralStylizationOnnxOutputShape.set(formatShape(config.outputShape));
	neuralStylizationOnnxReady.set(true);
}

async function loadUploadedModel(file: File) {
	resetBenchmarkStatus();
	resetSourceBenchmarkStatus();
	neuralStylizationOnnxStatus.set(`Loading ${file.name}…`);
	neuralStylizationOnnxModelName.set(file.name);
	neuralStylizationOnnxReady.set(false);
	onnxImageData = null;

	try {
		const bytes = new Uint8Array(await file.arrayBuffer());
		onnxModelBytes = bytes;
		loadedModelSource = "upload";
		loadedBundledModelId = null;
		await session?.release();
		session = null;
		const { providerUsed, session: nextSession } =
			await createSessionWithFallback(bytes);
		await finishSessionSetup(nextSession);
		neuralStylizationEffectiveProvider.set(providerUsed.toUpperCase());
		neuralStylizationOnnxStatus.set(
			`Uploaded model ready via ${providerUsed.toUpperCase()}.`,
		);
		refreshAutoQualityState();
	} catch (error) {
		session = null;
		neuralStylizationOnnxReady.set(false);
		neuralStylizationOnnxStatus.set(
			`Model load failed: ${error instanceof Error ? error.message : "Unknown error."}`,
		);
		refreshAutoQualityState();
	}
}

async function loadBundledModel(modelId: string) {
	const model = getBundledNeuralStyleModel(modelId);

	resetBenchmarkStatus();
	resetSourceBenchmarkStatus();
	neuralStylizationOnnxStatus.set(`Loading bundled style: ${model.label}…`);
	neuralStylizationOnnxModelName.set(model.label);
	neuralStylizationOnnxReady.set(false);
	neuralStylizationOnnxInputRange.set(model.inputRangeMode);
	neuralStylizationOnnxOutputRange.set(model.outputRangeMode);
	onnxImageData = null;

	try {
		const response = await fetch(
			`${import.meta.env.BASE_URL}${model.modelPath}`,
		);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const bytes = new Uint8Array(await response.arrayBuffer());
		onnxModelBytes = bytes;
		loadedModelSource = "bundled";
		loadedBundledModelId = model.id;
		await session?.release();
		session = null;
		const { providerUsed, session: nextSession } =
			await createSessionWithFallback(bytes);
		await finishSessionSetup(nextSession);
		neuralStylizationEffectiveProvider.set(providerUsed.toUpperCase());
		neuralStylizationOnnxStatus.set(
			`Bundled style ready: ${model.label} via ${providerUsed.toUpperCase()}.`,
		);
		refreshAutoQualityState();
	} catch (error) {
		session = null;
		neuralStylizationOnnxReady.set(false);
		neuralStylizationOnnxStatus.set(
			`Bundled style failed to load: ${error instanceof Error ? error.message : "Unknown error."}`,
		);
		refreshAutoQualityState();
	}
}

async function ensureBundledModelLoaded(force = false) {
	const nextModelId = currentBundledModelId || defaultBundledNeuralStyleModelId;

	if (
		!force &&
		loadedModelSource === "bundled" &&
		loadedBundledModelId === nextModelId &&
		session
	) {
		return;
	}

	await loadBundledModel(nextModelId);
}

async function reloadOnnxSession() {
	resetBenchmarkStatus();
	resetSourceBenchmarkStatus();

	if (loadedModelSource === "bundled") {
		await ensureBundledModelLoaded(true);
		return;
	}

	if (!onnxModelBytes) {
		neuralStylizationOnnxStatus.set("Load an ONNX model before reloading it.");
		return;
	}

	try {
		neuralStylizationOnnxStatus.set("Reloading ONNX session…");
		neuralStylizationOnnxReady.set(false);
		await session?.release();
		session = null;
		onnxImageData = null;
		const { providerUsed, session: nextSession } =
			await createSessionWithFallback(onnxModelBytes);
		await finishSessionSetup(nextSession);
		neuralStylizationEffectiveProvider.set(providerUsed.toUpperCase());
		neuralStylizationOnnxStatus.set(
			`Model reloaded via ${providerUsed.toUpperCase()}.`,
		);
		refreshAutoQualityState();
	} catch (error) {
		session = null;
		neuralStylizationOnnxReady.set(false);
		neuralStylizationOnnxStatus.set(
			`Reload failed: ${error instanceof Error ? error.message : "Unknown error."}`,
		);
		refreshAutoQualityState();
	}
}

function denormalizeOutputValue(value: number) {
	const resolvedMode =
		currentOutputRange === "auto"
			? value < 0
				? "minusOneToOne"
				: value > 1.5
					? "zeroTo255"
					: "zeroToOne"
			: currentOutputRange;

	if (resolvedMode === "minusOneToOne") {
		return clampByte((value + 1) * 127.5);
	}

	if (resolvedMode === "zeroTo255") {
		return clampByte(value);
	}

	return clampByte(value * 255);
}

async function runOnnxInference(sourceImageData: ImageData) {
	if (
		!runtime ||
		!session ||
		!onnxInputName ||
		!onnxOutputName ||
		!onnxInputLayout ||
		!onnxOutputLayout ||
		onnxRunning
	) {
		return;
	}

	onnxRunning = true;
	neuralStylizationOnnxStatus.set(
		`Running ${get(neuralStylizationOnnxModelName)}…`,
	);

	try {
		const result = await runSessionStylization(sourceImageData);
		lastOnnxInferenceDurationMs = result.inferenceMs;
		pushRollingSample(recentInferenceDurationsMs, lastOnnxInferenceDurationMs);
		onnxImageData = result.imageData;
		neuralStylizationOnnxLastInferenceMs.set(
			`${lastOnnxInferenceDurationMs.toFixed(1)} ms`,
		);
		neuralStylizationOnnxStatus.set(
			"Model ready for live gameplay stylization.",
		);
		evaluateAutoQuality();
	} catch (error) {
		neuralStylizationOnnxStatus.set(
			`Inference failed: ${error instanceof Error ? error.message : "Unknown error."}`,
		);
	} finally {
		onnxRunning = false;
	}
}

function applyCurrentMode(sourceImageData: ImageData) {
	if (currentMode === "onnx") {
		if (!session && !onnxRunning) {
			void ensureBundledModelLoaded();
		}

		if (session && onnxImageData) {
			drawOverlayImageData(onnxImageData);
		} else {
			drawOverlayImageData(
				applyShaderStylization(sourceImageData, "soft-shader"),
			);
		}

		if (session && !onnxRunning) {
			void runOnnxInference(sourceImageData);
		}

		return;
	}

	drawOverlayImageData(applyShaderStylization(sourceImageData, currentMode));
}

const { stop } = useTask(
	"neural-stylization-overlay",
	() => {
		ensureOverlayElements();

		if (!renderer || !overlayCanvas) {
			return;
		}

		if (benchmarkInProgress) {
			return;
		}

		syncCanvasSizes();
		syncPresentationMode();

		if (!isEnabled || currentOutputMode === "original") {
			return;
		}

		frameCounter += 1;

		if (frameCounter % getEffectiveFrameStride() !== 0) {
			return;
		}

		const sourceImageData = captureOnnxSourceFrame(currentOutputMode);

		if (!sourceImageData) {
			return;
		}

		applyCurrentMode(sourceImageData);
	},
	{
		stage: renderStage,
		after: autoRenderTask,
	},
);

onDestroy(() => {
	stop();
	unsubscribeEnabled();
	unsubscribeMode();
	unsubscribeOutputMode();
	unsubscribeResolution();
	unsubscribeBundledModelId();
	unsubscribeProvider();
	unsubscribeInputRange();
	unsubscribeOutputRange();
	unsubscribeInputHeight();
	unsubscribeOutputScale();
	unsubscribeFrameStride();
	unsubscribeStrength();
	unsubscribeAutoQualityEnabled();
	unsubscribeSourceRenderProfile();

	if (typeof window !== "undefined") {
		window.removeEventListener(
			"game:neural-style-model-selected",
			handleModelSelected,
		);
		window.removeEventListener(
			"game:neural-style-model-reload",
			handleModelReload,
		);
		window.removeEventListener(
			"game:neural-style-run-benchmark",
			handleBenchmarkProviders,
		);
		window.removeEventListener(
			"game:neural-style-apply-calibration",
			handleBenchmarkCalibration,
		);
		window.removeEventListener(
			"game:neural-style-run-source-benchmark",
			handleBenchmarkSourceProfiles,
		);
		window.removeEventListener(
			"game:neural-style-apply-source-recommendation",
			handleApplySourceRecommendation,
		);
	}

	renderer.domElement.style.opacity = "1";
	autoRender.current = true;

	overlayCanvas?.remove();
	overlayCanvas = null;
	processingCanvas = null;
	outputCanvas = null;
	overlayContext = null;
	processingContext = null;
	outputContext = null;
	offscreenTarget?.dispose();
	offscreenTarget = null;
	offscreenPixelBuffer = null;
	for (const material of flatCaptureMaterialCache.values()) {
		material.dispose();
	}
	flatCaptureMaterialCache.clear();
	flatCaptureOriginalMaterials.clear();
	neuralStylizationEffectiveProvider.set("—");
	neuralStylizationAutoQualityStatus.set("Auto quality is idle.");
	neuralStylizationEffectiveSettingsSummary.set("—");
	neuralStylizationSceneShadowsSuppressed.set(false);
	resetBenchmarkStatus();
	resetSourceBenchmarkStatus();

	void session?.release();
});
</script>
