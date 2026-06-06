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
	sciFiRoomRuntimeSceneManifest,
} from "../src/game/levels/index.js";

type MutableRuntimeSceneManifestData = {
	-readonly [Key in keyof RuntimeSceneManifestData]: RuntimeSceneManifestData[Key];
};

const runtimeSceneIds = defaultRuntimeSceneManifests.map(
	(manifest) => manifest.id,
);
const solitudeRuntimeSceneManifest = defaultRuntimeSceneManifests.find(
	(manifest) => manifest.id === "solitude_runtime",
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
	'authored walkable stable ID "observatory:walkable-mesh:chunk:x0-z0" is missing from readiness.requiredWalkableStableIds',
);

expectInvalid(
	{
		...cloneManifest(sciFiRoomRuntimeSceneManifest),
		readiness: {
			...sciFiRoomRuntimeSceneManifest.readiness,
			requiredWalkableStableIds: (
				sciFiRoomRuntimeSceneManifest.readiness.requiredWalkableStableIds ?? []
			).filter((stableId) => stableId !== "sci-fi-room:floor:interior"),
		},
	},
	'authored walkable stable ID "sci-fi-room:floor:interior" is missing from readiness.requiredWalkableStableIds',
);

if (solitudeRuntimeSceneManifest) {
	const requiredWalkableStableIds =
		solitudeRuntimeSceneManifest.readiness.requiredWalkableStableIds ?? [];
	const firstWalkableStableId = requiredWalkableStableIds[0];

	if (requiredWalkableStableIds.length < 2 || !firstWalkableStableId) {
		throw new Error(
			"Solitude runtime scene must declare its two authored walkable surfaces in readiness.requiredWalkableStableIds.",
		);
	}

	expectInvalid(
		{
			...cloneManifest(solitudeRuntimeSceneManifest),
			readiness: {
				...solitudeRuntimeSceneManifest.readiness,
				requiredWalkableStableIds: requiredWalkableStableIds.filter(
					(stableId) => stableId !== firstWalkableStableId,
				),
			},
		},
		`authored walkable stable ID "${firstWalkableStableId}" is missing from readiness.requiredWalkableStableIds`,
	);
}

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
		...cloneManifest(sciFiRoomRuntimeSceneManifest),
		readiness: {
			...sciFiRoomRuntimeSceneManifest.readiness,
			requiredAssetIds: (
				sciFiRoomRuntimeSceneManifest.readiness.requiredAssetIds ?? []
			).filter((assetId) => assetId !== "audio_portal_activate"),
		},
	},
	'authored asset "audio_portal_activate" is missing from readiness.requiredAssetIds',
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

{
	const solitudePortalTargetRuntimeSceneId = portalTargetRuntimeSceneId(
		portalArenaRuntimeSceneManifest,
		"portal-arena:portal:solitude",
	);

	if (solitudePortalTargetRuntimeSceneId) {
		const audioContent = parseAudioContentManifest(
			audioContentManifestForRuntimeScene(portalArenaRuntimeSceneManifest.id),
			{ assetManifest: portalArenaRuntimeSceneManifest.assets },
		);
		const result = validateRuntimeSceneContentGraph({
			manifest: portalArenaRuntimeSceneManifest,
			runtimeSceneIds: runtimeSceneIds.filter(
				(runtimeSceneId) =>
					runtimeSceneId !== solitudePortalTargetRuntimeSceneId,
			),
			audioContent,
		});

		if (result.ok) {
			throw new Error(
				"Expected portal arena content graph to fail when the Solitude portal target is missing from the runtime scene catalog.",
			);
		}

		const expectedError = `portal targetRuntimeSceneId "${solitudePortalTargetRuntimeSceneId}" is not in the runtime scene catalog`;

		if (!result.errors.some((error) => error.includes(expectedError))) {
			throw new Error(
				`Expected portal arena content graph errors to include ${JSON.stringify(expectedError)}, received:\n${result.errors.join("\n")}`,
			);
		}
	}
}

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

function portalTargetRuntimeSceneId(
	manifest: RuntimeSceneManifestData,
	stableId: string,
): string | undefined {
	const instance = manifest.level.instances.find(
		(candidate) => candidate.stableId === stableId,
	);
	const prefab = manifest.prefabs.find(
		(candidate) => candidate.id === instance?.prefabId,
	);
	const portal = asRecord({
		...asRecord(prefab?.components?.Portal),
		...asRecord(instance?.components?.Portal),
	});
	const targetRuntimeSceneId = portal.targetRuntimeSceneId;

	return typeof targetRuntimeSceneId === "string"
		? targetRuntimeSceneId
		: undefined;
}
