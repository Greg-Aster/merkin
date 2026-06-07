import {
	type RuntimeSceneManifestData,
	type WaterSurfaceComponent,
	World,
	loadRuntimeSceneManifest,
	waterSurfaceRendererStateFromComponent,
} from "../src/engine/index.js";
import {
	LevelLoader,
	observatoryRuntimeSceneManifest,
} from "../src/game/levels/index.js";
import {
	createFireflyFlickerPreviewTracks,
	createFireflyPopulationInstances,
	observatoryFireflyPopulation,
	validateFireflyPopulationDefinition,
} from "../src/game/populations/index.js";
import { PrefabRegistry } from "../src/game/prefabs/index.js";
import {
	assertDeepEqual,
	assertEqual,
	assertErrorIncludes,
	assertRecord,
} from "./contractTestHelpers.js";

function componentsForStableId(
	manifest: RuntimeSceneManifestData,
	stableId: string,
): Record<string, unknown> {
	const instance = manifest.level.instances.find(
		(candidate) => candidate.stableId === stableId,
	);

	if (!instance) {
		throw new Error(`Expected stable ID "${stableId}" in manifest.`);
	}

	const prefab = manifest.prefabs.find(
		(candidate) => candidate.id === instance.prefabId,
	);

	if (!prefab) {
		throw new Error(`Expected prefab "${instance.prefabId}" in manifest.`);
	}

	return {
		...prefab.components,
		...(instance.components ?? {}),
	};
}

function componentForStableId(
	manifest: RuntimeSceneManifestData,
	stableId: string,
	componentName: string,
): Record<string, unknown> {
	return assertRecord(
		componentsForStableId(manifest, stableId)[componentName],
		`${stableId}.${componentName}`,
	);
}

const manifest = loadRuntimeSceneManifest(observatoryRuntimeSceneManifest);
const waterSurface = componentForStableId(
	manifest,
	"observatory:water",
	"WaterSurface",
);

assertEqual(waterSurface.surfaceType, "plane");
assertEqual(waterSurface.bodyType, "lake");
assertDeepEqual(waterSurface.animation, {
	mode: "scrolling",
	speed: 0.035,
	direction: [0.62, 0.78],
	waveAmplitude: 0.08,
	waveLength: 48,
});
assertDeepEqual(waterSurface.reflection, {
	mode: "environment",
	intensity: 0.32,
});
assertDeepEqual(waterSurface.refraction, {
	enabled: false,
	intensity: 0,
});
assertDeepEqual(waterSurface.gameplayVolume, {
	enabled: false,
});

const rendererState = waterSurfaceRendererStateFromComponent(
	waterSurface as unknown as WaterSurfaceComponent,
);
assertEqual(
	Object.hasOwn(rendererState, "gameplayVolume"),
	false,
	"Water renderer projection must not carry gameplay volume policy.",
);
assertEqual(rendererState.visible, true);
assertEqual(rendererState.renderOrder, 5);
assertEqual(rendererState.bodyType, "lake");
assertDeepEqual(rendererState.reflection, {
	mode: "environment",
	intensity: 0.32,
});

assertDeepEqual(manifest.renderProfile.postProcessing, {
	enabled: false,
	quality: "off",
	effects: [],
});

const generatedFireflyInstances = createFireflyPopulationInstances(
	observatoryFireflyPopulation,
);
assertDeepEqual(
	generatedFireflyInstances.map((instance) => instance.stableId),
	[
		"observatory:firefly:archive",
		"observatory:firefly:lantern",
		"observatory:firefly:tide",
	],
);
assertDeepEqual(
	manifest.level.instances
		.filter((instance) => instance.stableId.startsWith("observatory:firefly:"))
		.map((instance) => instance.stableId),
	generatedFireflyInstances.map((instance) => instance.stableId),
	"Observatory fireflies must be authored through the population generator.",
);

const flickerPreviewTracks = createFireflyFlickerPreviewTracks(
	observatoryFireflyPopulation,
	{
		durationSeconds: 1,
		sampleRateHz: 2,
	},
);
const archiveFlickerTrack = flickerPreviewTracks.find(
	(track) => track.stableId === "observatory:firefly:archive",
);

if (!archiveFlickerTrack) {
	throw new Error("Expected archive firefly flicker preview track.");
}

assertDeepEqual(archiveFlickerTrack, {
	stableId: "observatory:firefly:archive",
	populationId: "observatory_firefly_population",
	memberId: "archive",
	seed: 4107,
	phase: 0.18,
	frequencyHz: 0.72,
	amplitude: 0.22,
	samples: [
		{
			timeSeconds: 0,
			intensityScale: 1.1991,
		},
		{
			timeSeconds: 0.5,
			intensityScale: 0.9453,
		},
		{
			timeSeconds: 1,
			intensityScale: 0.8707,
		},
	],
});

const world = new World();
const loader = new LevelLoader({
	prefabs: new PrefabRegistry(manifest.prefabs),
});
const loadResult = await loader.loadDefinition(world, manifest.level);
const archiveFirefly = loadResult.spawned.find(
	(spawned) => spawned.stableId === "observatory:firefly:archive",
);

if (!archiveFirefly) {
	throw new Error("Expected archive firefly to spawn.");
}

const archiveFireflyMember = world.requireComponent<Record<string, unknown>>(
	archiveFirefly.entity,
	"FireflyPopulationMember",
);
assertDeepEqual(archiveFireflyMember, {
	populationId: "observatory_firefly_population",
	memberId: "archive",
	seed: 4107,
	phase: 0.18,
	flicker: {
		frequencyHz: 0.72,
		amplitude: 0.22,
	},
});

const invalidWaterManifest = {
	...manifest,
	level: {
		...manifest.level,
		instances: manifest.level.instances.map((instance) =>
			instance.stableId === "observatory:water"
				? {
						...instance,
						components: {
							...(instance.components ?? {}),
							WaterSurface: {
								...waterSurface,
								animation: {
									...assertRecord(
										waterSurface.animation,
										"invalid water animation",
									),
									waveAmplitude: -0.1,
								},
							},
						},
					}
				: instance,
		),
	},
} satisfies RuntimeSceneManifestData;
assertErrorIncludes(
	() => loadRuntimeSceneManifest(invalidWaterManifest),
	"WaterSurface.animation.waveAmplitude must be a non-negative finite number",
);

const invalidWaterVolumeManifest = {
	...manifest,
	level: {
		...manifest.level,
		instances: manifest.level.instances.map((instance) =>
			instance.stableId === "observatory:water"
				? {
						...instance,
						components: {
							...(instance.components ?? {}),
							WaterSurface: {
								...waterSurface,
								gameplayVolume: {
									enabled: true,
								},
							},
						},
					}
				: instance,
		),
	},
} satisfies RuntimeSceneManifestData;
assertErrorIncludes(
	() => loadRuntimeSceneManifest(invalidWaterVolumeManifest),
	"WaterSurface.gameplayVolume.enabled must be false",
);

const invalidPostProcessingManifest = {
	...manifest,
	renderProfile: {
		...manifest.renderProfile,
		postProcessing: {
			enabled: true,
			quality: "off",
			effects: [],
		},
	},
} satisfies RuntimeSceneManifestData;
assertErrorIncludes(
	() => loadRuntimeSceneManifest(invalidPostProcessingManifest),
	"renderProfile.postProcessing.quality cannot be off",
);

const invalidFireflyManifest = {
	...manifest,
	level: {
		...manifest.level,
		instances: manifest.level.instances.map((instance) =>
			instance.stableId === "observatory:firefly:archive"
				? {
						...instance,
						components: {
							...(instance.components ?? {}),
							FireflyPopulationMember: {
								populationId: "observatory_firefly_population",
								memberId: "archive",
								seed: -1,
							},
						},
					}
				: instance,
		),
	},
} satisfies RuntimeSceneManifestData;
assertErrorIncludes(
	() => loadRuntimeSceneManifest(invalidFireflyManifest),
	"FireflyPopulationMember.seed must be a non-negative integer",
);

assertErrorIncludes(
	() =>
		createFireflyFlickerPreviewTracks(observatoryFireflyPopulation, {
			durationSeconds: 100,
			sampleRateHz: 10,
		}),
	"maximum is 256",
);

const invalidPopulationErrors = validateFireflyPopulationDefinition({
	id: "invalid_fireflies",
	prefabId: "observatory_firefly_marker",
	stableIdPrefix: "invalid:firefly",
	members: [
		{
			id: "duplicate",
			position: [0, 1, 0],
			flicker: {
				frequencyHz: -1,
				amplitude: 0.1,
			},
		},
		{
			id: "duplicate",
			position: [1, 1, 0],
		},
	],
});

if (
	!invalidPopulationErrors.some((error) =>
		error.includes("frequencyHz must be a positive finite number"),
	) ||
	!invalidPopulationErrors.some((error) =>
		error.includes('duplicates member "duplicate"'),
	)
) {
	throw new Error(
		`Expected invalid population errors, received ${invalidPopulationErrors.join("; ")}`,
	);
}

console.log("Water and firefly contract validation passed.");
