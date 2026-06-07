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
	solitudeExpectedRuntimeImports,
	solitudeRuntimeSceneManifest,
	yggdrasilExpectedRuntimeImports,
} from "../src/game/levels/index.js";

type MutableRuntimeSceneManifestData = {
	-readonly [Key in keyof RuntimeSceneManifestData]: RuntimeSceneManifestData[Key];
};

const runtimeSceneIds = defaultRuntimeSceneManifests.map(
	(manifest) => manifest.id,
);
const solitudeRuntimeSceneId = "solitude_runtime";
const solitudePortalStableId = "portal-arena:portal:solitude";
const solitudeExpectedWalkableStableIds = [
	"solitude:ground:plateau",
	"solitude:ground:dais",
] as const;
const solitudeExpectedCollisionStableIds =
	solitudeExpectedRuntimeImports.readiness.requiredCollisionStableIds;
const solitudeOldPathMarkers = [
	"/generated/runtime-game-assets/",
	"/runtime-world-partitions/",
	".collider.",
] as const;
const yggdrasilRuntimeSceneId = "yggdrasil_runtime";
const yggdrasilExpectedWalkableStableIds =
	yggdrasilExpectedRuntimeImports.readiness.requiredWalkableStableIds;
const yggdrasilOldPathMarkers = [
	"/generated/runtime-game-assets/",
	"/runtime-world-partitions/",
	".collider.",
] as const;

for (const manifest of defaultRuntimeSceneManifests) {
	if (manifest.id === yggdrasilRuntimeSceneId) {
		continue;
	}

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

{
	const requiredWalkableStableIds =
		solitudeRuntimeSceneManifest.readiness.requiredWalkableStableIds ?? [];
	const firstWalkableStableId = solitudeExpectedWalkableStableIds[0];
	const audioContent = parseAudioContentManifest(
		audioContentManifestForRuntimeScene(solitudeRuntimeSceneManifest.id),
		{ assetManifest: solitudeRuntimeSceneManifest.assets },
	);
	const result = validateRuntimeSceneContentGraph({
		manifest: solitudeRuntimeSceneManifest,
		runtimeSceneIds,
		audioContent,
	});

	if (!result.ok) {
		throw new Error(
			`Expected Solitude content graph to validate:\n${result.errors.join("\n")}`,
		);
	}

	if (!defaultRuntimeSceneManifests.includes(solitudeRuntimeSceneManifest)) {
		throw new Error("Expected Solitude runtime scene to be admitted.");
	}

	assertSameStringSet(
		result.graph.walkableStableIds,
		solitudeExpectedWalkableStableIds,
		"Solitude content graph must expose exactly the two authored walkable surfaces.",
	);
	assertSameStringSet(
		requiredWalkableStableIds,
		solitudeExpectedWalkableStableIds,
		"Solitude readiness.requiredWalkableStableIds must exactly match the two authored walkable surfaces.",
	);
	assertSameStringSet(
		solitudeRuntimeSceneManifest.readiness.requiredCollisionStableIds,
		solitudeExpectedCollisionStableIds,
		"Solitude readiness.requiredCollisionStableIds must exactly match the Solitude contract.",
	);
	assertSameStringSet(
		solitudeRuntimeSceneManifest.readiness.requiredCollisionStableIds,
		result.graph.collisionStableIds,
		"Solitude readiness.requiredCollisionStableIds must exactly match authored collision stable IDs.",
	);
	assertSameStringSet(
		solitudeRuntimeSceneManifest.readiness.requiredAssetIds,
		solitudeExpectedRuntimeImports.assetIds,
		"Solitude readiness.requiredAssetIds must exactly match the Solitude contract.",
	);
	assertSameStringSet(
		solitudeRuntimeSceneManifest.readiness.requiredAssetIds,
		result.graph.authoredAssetIds,
		"Solitude readiness.requiredAssetIds must exactly match authored content assets.",
	);

	for (const assetString of allAssetStrings(solitudeRuntimeSceneManifest)) {
		for (const marker of solitudeOldPathMarkers) {
			if (assetString.includes(marker)) {
				throw new Error(
					`Solitude target manifest must not reference old generated/provenance-only paths: ${assetString}`,
				);
			}
		}
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

	expectInvalid(
		{
			...cloneManifest(solitudeRuntimeSceneManifest),
			readiness: {
				...solitudeRuntimeSceneManifest.readiness,
				requiredCollisionStableIds: (
					solitudeRuntimeSceneManifest.readiness.requiredCollisionStableIds ??
					[]
				).filter((stableId) => stableId !== firstWalkableStableId),
			},
		},
		`readiness.requiredWalkableStableIds "${firstWalkableStableId}" is missing from readiness.requiredCollisionStableIds`,
	);
}

{
	const manifest = requiredYggdrasilRuntimeSceneManifest();
	const firstAssetId = firstRequired(
		manifest.readiness.requiredAssetIds?.filter((assetId) =>
			assetId.includes("yggdrasil"),
		),
		"Yggdrasil readiness.requiredAssetIds for Yggdrasil-owned assets",
	);
	const firstPrefabId = firstRequired(
		manifest.level.instances
			.map((instance) => instance.prefabId)
			.filter((prefabId) => prefabId !== "player"),
		"Yggdrasil authored non-player prefabs",
	);
	const firstCollisionStableId = firstRequired(
		manifest.readiness.requiredCollisionStableIds?.filter(
			(stableId) =>
				!(yggdrasilExpectedWalkableStableIds as readonly string[]).includes(
					stableId,
				),
		),
		"Yggdrasil non-walkable required collision stable IDs",
	);
	const firstWalkableStableId = yggdrasilExpectedWalkableStableIds[0];
	const firstLightStableId = firstRequired(
		manifest.readiness.requiredLightStableIds,
		"Yggdrasil readiness.requiredLightStableIds",
	);
	const portalStableId = firstRequired(
		manifest.level.instances
			.filter((instance) => {
				const portal = componentFromInstance(
					manifest,
					instance.stableId,
					"Portal",
				);

				return portal?.targetRuntimeSceneId === "portal_arena_runtime";
			})
			.map((instance) => instance.stableId),
		"Yggdrasil return portals",
	);

	assertYggdrasilLevelAuthoringContract(manifest);

	expectYggdrasilContractInvalid(
		{
			...cloneManifest(manifest),
			readiness: {
				...manifest.readiness,
				requiredAssetIds: (manifest.readiness.requiredAssetIds ?? []).filter(
					(assetId) => assetId !== firstAssetId,
				),
			},
		},
		`authored asset "${firstAssetId}" is missing from readiness.requiredAssetIds`,
	);

	expectYggdrasilContractInvalid(
		{
			...cloneManifest(manifest),
			prefabs: manifest.prefabs.filter((prefab) => prefab.id !== firstPrefabId),
		},
		`level instances reference unknown prefab "${firstPrefabId}"`,
	);

	expectYggdrasilContractInvalid(
		{
			...cloneManifest(manifest),
			readiness: {
				...manifest.readiness,
				requiredCollisionStableIds: (
					manifest.readiness.requiredCollisionStableIds ?? []
				).filter((stableId) => stableId !== firstCollisionStableId),
			},
		},
		"Yggdrasil readiness.requiredCollisionStableIds must exactly match authored collision stable IDs.",
	);

	expectYggdrasilContractInvalid(
		{
			...cloneManifest(manifest),
			readiness: {
				...manifest.readiness,
				requiredWalkableStableIds: (
					manifest.readiness.requiredWalkableStableIds ?? []
				).filter((stableId) => stableId !== firstWalkableStableId),
			},
		},
		`authored walkable stable ID "${firstWalkableStableId}" is missing from readiness.requiredWalkableStableIds`,
	);

	expectYggdrasilContractInvalid(
		{
			...cloneManifest(manifest),
			readiness: {
				...manifest.readiness,
				requiredLightStableIds: (
					manifest.readiness.requiredLightStableIds ?? []
				).filter((stableId) => stableId !== firstLightStableId),
			},
		},
		`authored light stable ID "${firstLightStableId}" is missing from readiness.requiredLightStableIds`,
	);

	expectYggdrasilContractInvalid(
		{
			...cloneManifest(manifest),
			level: {
				...manifest.level,
				instances: manifest.level.instances.map((instance) =>
					instance.stableId === portalStableId
						? {
								...instance,
								components: {
									...instance.components,
									Portal: {
										...asRecord(
											componentFromInstance(
												manifest,
												instance.stableId,
												"Portal",
											),
										),
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
		solitudePortalStableId,
	);

	if (solitudePortalTargetRuntimeSceneId !== solitudeRuntimeSceneId) {
		throw new Error(
			`Expected admitted Solitude portal to target ${JSON.stringify(solitudeRuntimeSceneId)}, received ${JSON.stringify(solitudePortalTargetRuntimeSceneId)}.`,
		);
	}

	const audioContent = parseAudioContentManifest(
		audioContentManifestForRuntimeScene(portalArenaRuntimeSceneManifest.id),
		{ assetManifest: portalArenaRuntimeSceneManifest.assets },
	);
	const result = validateRuntimeSceneContentGraph({
		manifest: portalArenaRuntimeSceneManifest,
		runtimeSceneIds: runtimeSceneIds.filter(
			(runtimeSceneId) => runtimeSceneId !== solitudePortalTargetRuntimeSceneId,
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

function expectYggdrasilContractInvalid(
	manifest: RuntimeSceneManifestData,
	expectedError: string,
): void {
	try {
		assertYggdrasilLevelAuthoringContract(manifest);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : JSON.stringify(error);

		if (!message.includes(expectedError)) {
			throw new Error(
				`Expected Yggdrasil contract error to include ${JSON.stringify(expectedError)}, received ${JSON.stringify(message)}.`,
			);
		}

		return;
	}

	throw new Error(
		`Expected Yggdrasil contract error including ${JSON.stringify(expectedError)}.`,
	);
}

function cloneManifest(
	manifest: RuntimeSceneManifestData,
): MutableRuntimeSceneManifestData {
	return JSON.parse(
		JSON.stringify(manifest),
	) as MutableRuntimeSceneManifestData;
}

function requiredYggdrasilRuntimeSceneManifest(): RuntimeSceneManifestData {
	const manifest = defaultRuntimeSceneManifests.find(
		(candidate) => candidate.id === yggdrasilRuntimeSceneId,
	);

	if (!manifest) {
		throw new Error(
			`Expected Yggdrasil runtime scene manifest "${yggdrasilRuntimeSceneId}" to be registered in defaultRuntimeSceneManifests.`,
		);
	}

	return manifest;
}

function assertYggdrasilLevelAuthoringContract(
	manifest: RuntimeSceneManifestData,
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

	if (!result.ok) {
		throw new Error(
			`Expected Yggdrasil content graph to validate:\n${result.errors.join("\n")}`,
		);
	}

	assertSameStringSet(
		manifest.readiness.requiredWalkableStableIds,
		yggdrasilExpectedWalkableStableIds,
		"Yggdrasil readiness.requiredWalkableStableIds must exactly match authored primitive walkables.",
	);
	assertSameStringSet(
		manifest.readiness.requiredAssetIds,
		result.graph.authoredAssetIds,
		"Yggdrasil readiness.requiredAssetIds must exactly match authored content assets.",
	);
	assertSameStringSet(
		manifest.readiness.requiredCollisionPrefabIds,
		result.graph.collisionPrefabIds,
		"Yggdrasil readiness.requiredCollisionPrefabIds must exactly match authored collision prefabs.",
	);
	assertSameStringSet(
		manifest.readiness.requiredCollisionStableIds,
		result.graph.collisionStableIds,
		"Yggdrasil readiness.requiredCollisionStableIds must exactly match authored collision stable IDs.",
	);
	assertSameStringSet(
		manifest.readiness.requiredLightStableIds,
		result.graph.lightStableIds,
		"Yggdrasil readiness.requiredLightStableIds must exactly match authored light stable IDs.",
	);
	assertIncludes(
		result.graph.portalTargetRuntimeSceneIds,
		"portal_arena_runtime",
		"Yggdrasil must include a return portal to the portal arena.",
	);
	assertIncludes(
		result.graph.authoredAssetIds,
		"mesh_water_plane",
		"Yggdrasil ocean must use the shared water mesh through authored manifest data.",
	);
	assertIncludes(
		result.graph.authoredAssetIds,
		"material_water_surface",
		"Yggdrasil ocean must use the shared water material through authored manifest data.",
	);

	if (
		!result.graph.prefabIds.some((prefabId) => prefabId.includes("yggdrasil"))
	) {
		throw new Error("Yggdrasil must include target-owned Yggdrasil prefabs.");
	}

	assertEqual(
		manifest.level.instances.filter((instance) =>
			instance.stableId.startsWith("yggdrasil:primitive:"),
		).length,
		yggdrasilExpectedRuntimeImports.primitiveParity.primitiveNodeCount,
		"Yggdrasil must instantiate every primitive node from the target-owned parity data.",
	);
	assertEqual(
		(manifest.readiness.requiredCollisionStableIds ?? []).filter((stableId) =>
			stableId.startsWith("yggdrasil:primitive:"),
		).length,
		yggdrasilExpectedRuntimeImports.primitiveParity.collisionNodeCount,
		"Yggdrasil readiness must include every primitive collision node.",
	);

	for (const assetString of allAssetStrings(manifest)) {
		for (const marker of yggdrasilOldPathMarkers) {
			if (assetString.includes(marker)) {
				throw new Error(
					`Yggdrasil target manifest must not reference old generated/provenance-only paths: ${assetString}`,
				);
			}
		}
	}

	for (const stableId of manifest.readiness.requiredCollisionStableIds ?? []) {
		if (!stableId.startsWith("yggdrasil:primitive:")) {
			continue;
		}

		const shape = asRecord(
			componentFromInstance(manifest, stableId, "Collider")?.shape,
		);

		if (shape.type !== "box") {
			throw new Error(
				`Yggdrasil primitive collision "${stableId}" must use explicit cuboid/box collision, received ${JSON.stringify(shape.type)}.`,
			);
		}
	}
}

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function assertSameStringSet(
	actual: readonly string[] | undefined,
	expected: readonly string[],
	message: string,
): void {
	const actualJson = JSON.stringify([...(actual ?? [])].sort());
	const expectedJson = JSON.stringify([...expected].sort());

	if (actualJson !== expectedJson) {
		throw new Error(
			`${message} Expected ${expectedJson}, received ${actualJson}.`,
		);
	}
}

function assertEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message: string,
): void {
	if (actual !== expected) {
		throw new Error(`${message} Expected ${expected}, received ${actual}.`);
	}
}

function assertIncludes(
	values: readonly string[],
	expected: string,
	message?: string,
): void {
	if (!values.includes(expected)) {
		throw new Error(
			message ??
				`Expected ${JSON.stringify(values)} to include ${JSON.stringify(expected)}.`,
		);
	}
}

function allAssetStrings(
	manifest: RuntimeSceneManifestData,
): readonly string[] {
	const strings: string[] = [];

	for (const asset of manifest.assets.assets) {
		if ("id" in asset && typeof asset.id === "string") {
			strings.push(asset.id);
		}

		if ("url" in asset && typeof asset.url === "string") {
			strings.push(asset.url);
		}

		if ("faces" in asset && isRecord(asset.faces)) {
			for (const faceUrl of Object.values(asset.faces)) {
				if (typeof faceUrl === "string") {
					strings.push(faceUrl);
				}
			}
		}
	}

	return strings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
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

function componentFromInstance(
	manifest: RuntimeSceneManifestData,
	stableId: string,
	componentName: string,
): Record<string, unknown> | undefined {
	const instance = manifest.level.instances.find(
		(candidate) => candidate.stableId === stableId,
	);
	const prefab = manifest.prefabs.find(
		(candidate) => candidate.id === instance?.prefabId,
	);
	const component = {
		...asRecord(prefab?.components?.[componentName]),
		...asRecord(instance?.components?.[componentName]),
	};

	return Object.keys(component).length > 0 ? component : undefined;
}

function firstRequired<TValue>(
	values: readonly TValue[] | undefined,
	label: string,
): TValue {
	const value = values?.[0];

	if (value === undefined) {
		throw new Error(`Expected ${label} to contain at least one entry.`);
	}

	return value;
}
