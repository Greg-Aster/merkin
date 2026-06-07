import {
	type AssetManifestEntryData,
	type RenderProfileEnvironmentData,
	type RuntimeSceneManifestData,
	loadRuntimeSceneManifest,
} from "../src/engine/index.js";
import {
	portalArenaEquirectangularSky,
	sampleEquirectangularSky,
	sampleVideoSky,
} from "../src/game/assets/index.js";
import {
	defaultRuntimeSceneManifests,
	portalArenaRuntimeSceneManifest,
} from "../src/game/levels/index.js";

const yggdrasilRuntimeSceneId = "yggdrasil_runtime";

function assertErrorIncludes(action: () => void, expected: string): void {
	try {
		action();
	} catch (error) {
		const message =
			error instanceof Error ? error.message : JSON.stringify(error);

		if (!message.includes(expected)) {
			throw new Error(
				`Expected error to include ${JSON.stringify(expected)}, received ${JSON.stringify(message)}.`,
			);
		}

		return;
	}

	throw new Error(`Expected error including ${JSON.stringify(expected)}.`);
}

function cloneValue<TValue>(value: TValue): TValue {
	return JSON.parse(JSON.stringify(value)) as TValue;
}

function withEnvironment(
	environment: RenderProfileEnvironmentData,
	asset?: AssetManifestEntryData,
): RuntimeSceneManifestData {
	const manifest = cloneValue(portalArenaRuntimeSceneManifest);
	const preload = new Set(manifest.level.preload ?? []);
	const requiredAssetIds = new Set(manifest.readiness.requiredAssetIds ?? []);
	const assets = asset
		? [...manifest.assets.assets, asset]
		: manifest.assets.assets;

	if ("assetId" in environment) {
		preload.add(environment.assetId);

		if (environment.requiredForReadiness) {
			requiredAssetIds.add(environment.assetId);
		}
	}

	return {
		...manifest,
		assets: {
			...manifest.assets,
			assets,
		},
		level: {
			...manifest.level,
			preload: [...preload],
		},
		renderProfile: {
			...manifest.renderProfile,
			environment,
		},
		readiness: {
			...manifest.readiness,
			requiredAssetIds: [...requiredAssetIds],
		},
	};
}

const solidColorManifest = withEnvironment({
	kind: "solid-color",
	color: "#101722",
	backgroundIntensity: 1,
});
loadRuntimeSceneManifest(solidColorManifest);

const productionPortalArenaManifest = loadRuntimeSceneManifest(
	portalArenaRuntimeSceneManifest,
);
const productionPortalArenaEnvironment =
	productionPortalArenaManifest.renderProfile.environment;

if (productionPortalArenaEnvironment.kind !== "equirectangular-environment") {
	throw new Error(
		"Portal arena render profile must use an equirectangular environment.",
	);
}

if (
	productionPortalArenaEnvironment.assetId !== portalArenaEquirectangularSky.id
) {
	throw new Error(
		`Portal arena render profile must reference ${portalArenaEquirectangularSky.id}.`,
	);
}

const productionPortalArenaEnvironmentAsset =
	productionPortalArenaManifest.assets.assets.find(
		(asset) => asset.id === productionPortalArenaEnvironment.assetId,
	);

if (productionPortalArenaEnvironmentAsset?.projection !== "equirectangular") {
	throw new Error(
		"Portal arena environment asset must declare equirectangular projection.",
	);
}

const productionYggdrasilManifest = loadRuntimeSceneManifest(
	requiredYggdrasilRuntimeSceneManifest(),
);
const productionYggdrasilEnvironment =
	productionYggdrasilManifest.renderProfile.environment;

if (productionYggdrasilEnvironment.kind !== "cubemap-skybox") {
	throw new Error("Yggdrasil render profile must use the observatory cubemap.");
}

if (productionYggdrasilEnvironment.assetId !== "cubemap_observatory_sky") {
	throw new Error(
		'Yggdrasil render profile must reference "cubemap_observatory_sky".',
	);
}

if (productionYggdrasilEnvironment.requiredForReadiness !== true) {
	throw new Error(
		"Yggdrasil environment must be required for runtime scene readiness.",
	);
}

if (
	!productionYggdrasilManifest.readiness.requiredAssetIds?.includes(
		productionYggdrasilEnvironment.assetId,
	)
) {
	throw new Error(
		`Yggdrasil environment asset "${productionYggdrasilEnvironment.assetId}" must be listed in readiness.requiredAssetIds.`,
	);
}

const productionYggdrasilEnvironmentAsset =
	productionYggdrasilManifest.assets.assets.find(
		(asset) => asset.id === productionYggdrasilEnvironment.assetId,
	);

if (productionYggdrasilEnvironmentAsset?.kind !== "cubemap") {
	throw new Error("Yggdrasil environment asset must declare cubemap kind.");
}

assertErrorIncludes(
	() =>
		loadRuntimeSceneManifest({
			...productionYggdrasilManifest,
			readiness: {
				...productionYggdrasilManifest.readiness,
				requiredAssetIds: (
					productionYggdrasilManifest.readiness.requiredAssetIds ?? []
				).filter(
					(assetId) => assetId !== productionYggdrasilEnvironment.assetId,
				),
			},
		}),
	`runtimeSceneManifest.renderProfile.environment.assetId "${productionYggdrasilEnvironment.assetId}" is required for readiness but is missing from runtimeSceneManifest.readiness.requiredAssetIds.`,
);

const equirectangularManifest = withEnvironment(
	{
		kind: "equirectangular-environment",
		assetId: sampleEquirectangularSky.id,
		backgroundIntensity: 1,
		backgroundBlurriness: 0.05,
		environmentIntensity: 0.7,
		requiredForReadiness: true,
	},
	sampleEquirectangularSky,
);
loadRuntimeSceneManifest(equirectangularManifest);

const brokenTexture = {
	...sampleEquirectangularSky,
	projection: "uv",
} satisfies AssetManifestEntryData;
assertErrorIncludes(
	() =>
		loadRuntimeSceneManifest(
			withEnvironment(
				{
					kind: "equirectangular-environment",
					assetId: brokenTexture.id,
					backgroundIntensity: 1,
					backgroundBlurriness: 0,
					environmentIntensity: 0.8,
					requiredForReadiness: true,
				},
				brokenTexture,
			),
		),
	'must reference a texture asset with projection "equirectangular"',
);

const videoManifest = withEnvironment(
	{
		kind: "video-skybox",
		assetId: sampleVideoSky.id,
		mapping: "equirectangular-360",
		backgroundIntensity: 1,
		backgroundBlurriness: 0,
		environmentIntensity: 0.4,
		dynamicCapture: {
			mode: "on-load",
			resolution: 128,
		},
		requiredForReadiness: true,
	},
	sampleVideoSky,
);
loadRuntimeSceneManifest(videoManifest);

const brokenVideo = {
	...sampleVideoSky,
	video: {
		...sampleVideoSky.video,
		muted: false,
	},
};
assertErrorIncludes(
	() =>
		loadRuntimeSceneManifest(
			withEnvironment(
				{
					kind: "video-skybox",
					assetId: brokenVideo.id,
					mapping: "equirectangular-360",
					backgroundIntensity: 1,
					backgroundBlurriness: 0,
					environmentIntensity: 0,
					requiredForReadiness: true,
				},
				brokenVideo as unknown as AssetManifestEntryData,
			),
		),
	"video.muted must be true",
);

const unsupportedVideoMapping = {
	kind: "video-skybox",
	assetId: sampleVideoSky.id,
	mapping: "cubemap-strip",
	backgroundIntensity: 1,
	backgroundBlurriness: 0,
	environmentIntensity: 0,
	requiredForReadiness: true,
} as unknown as RenderProfileEnvironmentData;
assertErrorIncludes(
	() =>
		loadRuntimeSceneManifest(
			withEnvironment(unsupportedVideoMapping, sampleVideoSky),
		),
	"mapping must be equirectangular-360",
);

const invalidCaptureResolution = {
	kind: "video-skybox",
	assetId: sampleVideoSky.id,
	mapping: "equirectangular-360",
	backgroundIntensity: 1,
	backgroundBlurriness: 0,
	environmentIntensity: 0.4,
	dynamicCapture: {
		mode: "on-load",
		resolution: 512,
	},
	requiredForReadiness: true,
} as unknown as RenderProfileEnvironmentData;
assertErrorIncludes(
	() =>
		loadRuntimeSceneManifest(
			withEnvironment(invalidCaptureResolution, sampleVideoSky),
		),
	"dynamicCapture.resolution must be 64, 128, or 256",
);

const proceduralManifest = withEnvironment({
	kind: "procedural-atmosphere",
	skyColor: "#6aa6ff",
	horizonColor: "#f4d9aa",
	groundColor: "#17202c",
	sunDirection: [0.35, 0.82, 0.18],
	sunColor: "#fff1d0",
	sunIntensity: 1.4,
	turbidity: 2,
	exposure: 1,
	backgroundIntensity: 1,
	environmentIntensity: 0.3,
	dynamicCapture: {
		mode: "on-load",
		resolution: 64,
	},
});
loadRuntimeSceneManifest(proceduralManifest);

const proceduralWithoutCapture = {
	kind: "procedural-atmosphere",
	skyColor: "#6aa6ff",
	horizonColor: "#f4d9aa",
	groundColor: "#17202c",
	sunDirection: [0.35, 0.82, 0.18],
	sunColor: "#fff1d0",
	sunIntensity: 1.4,
	turbidity: 2,
	exposure: 1,
	backgroundIntensity: 1,
	environmentIntensity: 0.3,
} satisfies RenderProfileEnvironmentData;
assertErrorIncludes(
	() => loadRuntimeSceneManifest(withEnvironment(proceduralWithoutCapture)),
	"dynamicCapture is required when procedural atmosphere contributes environment lighting",
);

const reflectionProbeManifest = cloneValue(portalArenaRuntimeSceneManifest);
loadRuntimeSceneManifest({
	...reflectionProbeManifest,
	prefabs: [
		...reflectionProbeManifest.prefabs,
		{
			id: "sample_reflection_probe",
			components: {
				Transform: {
					position: [0, 2, 0],
				},
				ReflectionProbe: {
					shape: {
						type: "sphere",
						radius: 6,
					},
					mode: "static",
					resolution: 128,
					priority: 1,
				},
			},
		},
	],
});

const brokenProbeManifest = cloneValue(portalArenaRuntimeSceneManifest);
assertErrorIncludes(
	() =>
		loadRuntimeSceneManifest({
			...brokenProbeManifest,
			prefabs: [
				...brokenProbeManifest.prefabs,
				{
					id: "broken_reflection_probe",
					components: {
						Transform: {
							position: [0, 2, 0],
						},
						ReflectionProbe: {
							shape: {
								type: "box",
								halfExtents: [2, 0, 2],
							},
							mode: "dynamic",
							resolution: 512,
							updateIntervalSeconds: 2,
						},
					},
				},
			],
		}),
	"ReflectionProbe.resolution must be 64, 128, or 256",
);

console.log("Scene environment contract validation passed.");

function requiredYggdrasilRuntimeSceneManifest(): RuntimeSceneManifestData {
	const manifest = defaultRuntimeSceneManifests.find(
		(candidate) => candidate.id === yggdrasilRuntimeSceneId,
	);

	if (!manifest) {
		throw new Error(
			`Expected Yggdrasil runtime scene manifest "${yggdrasilRuntimeSceneId}" to be registered before environment validation.`,
		);
	}

	return manifest;
}
