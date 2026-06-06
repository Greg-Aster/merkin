import {
	type RuntimeSceneManifestData,
	parseAudioContentManifest,
	validateRuntimeSceneContentGraph,
} from "../src/engine/index.js";
import { audioContentManifestForRuntimeScene } from "../src/game/assets/index.js";
import {
	defaultRuntimeSceneManifests,
	observatoryRuntimeSceneManifest,
	portalArenaRuntimeSceneManifest,
} from "../src/game/levels/index.js";

type MutableRuntimeSceneManifestData = {
	-readonly [Key in keyof RuntimeSceneManifestData]: RuntimeSceneManifestData[Key];
};

const runtimeSceneIds = defaultRuntimeSceneManifests.map(
	(manifest) => manifest.id,
);

for (const manifest of defaultRuntimeSceneManifests) {
	const audioContent = parseAudioContentManifest(
		audioContentManifestForRuntimeScene(manifest.id),
		{ assetManifest: manifest.assets },
	);
	const result = validateRuntimeSceneContentGraph({
		manifest,
		runtimeSceneIds,
		audioContent,
	});

	if (!result.ok) {
		throw new Error(
			`Expected ${manifest.id} content graph to validate:\n${result.errors.join("\n")}`,
		);
	}
}

expectInvalid(
	{
		...cloneManifest(portalArenaRuntimeSceneManifest),
		assets: {
			...portalArenaRuntimeSceneManifest.assets,
			assets: portalArenaRuntimeSceneManifest.assets.assets.filter(
				(asset) => asset.id !== "mesh_player",
			),
		},
	},
	'references unknown asset "mesh_player"',
);

expectInvalid(
	{
		...cloneManifest(portalArenaRuntimeSceneManifest),
		readiness: {
			...portalArenaRuntimeSceneManifest.readiness,
			requiredAssetIds: (
				portalArenaRuntimeSceneManifest.readiness.requiredAssetIds ?? []
			).filter((assetId) => assetId !== "mesh_player"),
		},
	},
	'authored asset "mesh_player" is missing from readiness.requiredAssetIds',
);

expectInvalid(
	{
		...cloneManifest(portalArenaRuntimeSceneManifest),
		level: {
			...portalArenaRuntimeSceneManifest.level,
			instances: portalArenaRuntimeSceneManifest.level.instances.map(
				(instance) =>
					instance.stableId === "portal-arena:floor"
						? { ...instance, prefabId: "missing_prefab" }
						: instance,
			),
		},
	},
	'level instances reference unknown prefab "missing_prefab"',
);

expectInvalid(
	{
		...cloneManifest(portalArenaRuntimeSceneManifest),
		level: {
			...portalArenaRuntimeSceneManifest.level,
			instances: portalArenaRuntimeSceneManifest.level.instances.map(
				(instance) =>
					instance.stableId === "portal-arena:floor"
						? { ...instance, stableId: "player" }
						: instance,
			),
		},
	},
	'level instances contain duplicate stable ID "player"',
);

expectInvalid(
	{
		...cloneManifest(observatoryRuntimeSceneManifest),
		readiness: {
			...observatoryRuntimeSceneManifest.readiness,
			requiredWalkableStableIds: [],
		},
	},
	'authored walkable stable ID "observatory:walkable-mesh" is missing from readiness.requiredWalkableStableIds',
);

expectInvalid(
	{
		...cloneManifest(portalArenaRuntimeSceneManifest),
		readiness: {
			...portalArenaRuntimeSceneManifest.readiness,
			requiredLightStableIds: [],
		},
	},
	'authored light stable ID "player" is missing from readiness.requiredLightStableIds',
);

expectInvalid(
	{
		...cloneManifest(portalArenaRuntimeSceneManifest),
		readiness: {
			...portalArenaRuntimeSceneManifest.readiness,
			requiredCollisionStableIds: [
				...(portalArenaRuntimeSceneManifest.readiness
					.requiredCollisionStableIds ?? []),
				"portal-arena:missing-collider",
			],
		},
	},
	'readiness.requiredCollisionStableIds "portal-arena:missing-collider" is not an authored collision stable ID',
);

expectInvalid(
	{
		...cloneManifest(portalArenaRuntimeSceneManifest),
		level: {
			...portalArenaRuntimeSceneManifest.level,
			instances: portalArenaRuntimeSceneManifest.level.instances.map(
				(instance) =>
					instance.stableId === "portal-arena:portal:prototype-arena"
						? {
								...instance,
								components: {
									...instance.components,
									Portal: {
										...asRecord(instance.components?.Portal),
										targetRuntimeSceneId: "missing_runtime",
									},
								},
							}
						: instance,
			),
		},
	},
	'portal targetRuntimeSceneId "missing_runtime" is not in the runtime scene catalog',
);

console.log(
	`Level authoring contract passed for ${defaultRuntimeSceneManifests.length} runtime scene manifests.`,
);

function expectInvalid(
	manifest: RuntimeSceneManifestData,
	expectedError: string,
): void {
	const audioContent = parseAudioContentManifest(
		audioContentManifestForRuntimeScene(manifest.id),
		{ assetManifest: manifest.assets },
	);
	const result = validateRuntimeSceneContentGraph({
		manifest,
		runtimeSceneIds,
		audioContent,
	});

	if (result.ok) {
		throw new Error(
			`Expected ${manifest.id} content graph to fail with ${JSON.stringify(expectedError)}.`,
		);
	}

	if (!result.errors.some((error) => error.includes(expectedError))) {
		throw new Error(
			`Expected ${manifest.id} content graph errors to include ${JSON.stringify(expectedError)}, received:\n${result.errors.join("\n")}`,
		);
	}
}

function cloneManifest(
	manifest: RuntimeSceneManifestData,
): MutableRuntimeSceneManifestData {
	return JSON.parse(
		JSON.stringify(manifest),
	) as MutableRuntimeSceneManifestData;
}

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}
