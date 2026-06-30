import {
	type AssetManifestData,
	type LevelData,
	type PrefabData,
	type RenderProfileData,
	type RenderProfileEnvironmentData,
	type RuntimeSceneManifestData,
	assetManifestValidator,
	levelDefinitionValidator,
	loadRuntimeSceneManifest,
	renderProfileValidator,
} from "../engine/data/index.js";
import {
	type AudioContentManifest,
	parseAudioContentManifest,
} from "../engine/modules/audio/index.js";
import {
	PERFORMANCE_CONFIG_RESOURCE,
	type PerformanceConfig,
	composePerformanceConfig,
} from "../game/performance/index.js";
import {
	audioAmbientDarkShadowsOfDelight,
	audioAmbientShadowWaltz,
	audioAmbientWhistlingDreams,
} from "./global/ambientAudioAssets.js";
import globalPerformance from "./global/performance.json";
import { audioPortalActivate, meshPortalGate } from "./global/portalAssets.js";
import { portalGatePrefab, waterSurfacePlanePrefab } from "./global/prefabs.js";
import {
	cubemapClassicSky,
	cubemapObservatorySky,
	sampleEquirectangularSky,
	sampleVideoSky,
} from "./global/skyboxAssets.js";
import {
	materialWaterDarkStill,
	meshWaterPlane,
} from "./global/waterAssets.js";
import {
	type LevelPlayerConfig,
	PLAYER_PREFAB_ID,
	PLAYER_REQUIRED_ASSET_IDS,
	PLAYER_STABLE_ID,
	createPlayerAudioEventMappings,
	createPlayerInstance,
	playerAssets,
	playerHasRequiredLight,
	playerPrefab,
} from "./player/index.js";
import {
	type ResolvedStaticEnvironmentCollisionPackage,
	type StaticEnvironmentCollisionPackage,
	resolveStaticEnvironmentCollisionPackage,
} from "./staticEnvironmentCollision.js";

export type LevelSkyboxData = {
	readonly schemaVersion: 1;
	readonly environment: RenderProfileEnvironmentData;
	readonly assets?: {
		readonly shared?: readonly string[];
		readonly local?: AssetManifestData["assets"];
		readonly preload?: readonly string[];
		readonly preloadGroups?: AssetManifestData["preloadGroups"];
	};
	readonly planned?: {
		readonly starmap?: PlannedSkyboxFeature;
		readonly chunkedSky?: PlannedSkyboxFeature & {
			readonly chunks?: readonly unknown[];
		};
		readonly motion?: PlannedSkyboxFeature & {
			readonly angularVelocity?: readonly [number, number, number];
		};
	};
};

type PlannedSkyboxFeature = {
	readonly enabled: false;
	readonly [key: string]: unknown;
};

type LevelPackageRenderProfileData = Omit<RenderProfileData, "environment"> & {
	readonly environment?: RenderProfileEnvironmentData;
};

export type LevelPackageData = {
	readonly id: string;
	readonly runtimeScene: {
		readonly schemaVersion: 1;
		readonly id: string;
		readonly generatedAt: string;
		readonly source: RuntimeSceneManifestData["source"];
		readonly readiness: RuntimeSceneManifestData["readiness"];
	};
	readonly level: LevelData;
	readonly assets: {
		readonly shared?: readonly string[];
		readonly local: AssetManifestData["assets"];
		readonly preloadGroups?: AssetManifestData["preloadGroups"];
	};
	readonly prefabs: {
		readonly shared?: readonly string[];
		readonly local: readonly PrefabData[];
	};
	readonly player?: LevelPlayerConfig;
	readonly audio: AudioContentManifest;
	readonly renderProfile: LevelPackageRenderProfileData;
};

export type LevelNpcArchetypeData = {
	readonly schemaVersion: 1;
	readonly id: string;
	readonly prefab: PrefabData;
	readonly visualParts?: readonly LevelNpcVisualPartData[];
	readonly assets?: {
		readonly local?: AssetManifestData["assets"];
		readonly preload?: readonly string[];
		readonly preloadGroups?: AssetManifestData["preloadGroups"];
	};
	readonly defaults: {
		readonly movement?: Record<string, unknown>;
		readonly light?: Record<string, unknown>;
		readonly lightModulation?: Record<string, unknown>;
		readonly interaction?: Record<string, unknown>;
	};
};

export type LevelNpcVisualPartData = {
	readonly idSuffix: string;
	readonly inheritLightColor?: boolean;
	readonly prefab: PrefabData;
	readonly transform?: NonNullable<LevelData["instances"][number]["transform"]>;
};

export type LevelNpcGroupData = {
	readonly schemaVersion: 1;
	readonly archetype: string;
	readonly defaults?: {
		readonly movement?: Record<string, unknown>;
		readonly light?: Record<string, unknown>;
		readonly lightModulation?: Record<string, unknown>;
		readonly interaction?: Record<string, unknown>;
	};
	readonly instances: readonly LevelNpcInstanceData[];
};

export type LevelNpcInstanceData = {
	readonly id: string;
	readonly stableId: string;
	readonly displayName: string;
	readonly transform: NonNullable<LevelData["instances"][number]["transform"]>;
	readonly movement?: Record<string, unknown>;
	readonly light?: Record<string, unknown>;
	readonly lightModulation?: Record<string, unknown>;
	readonly interaction?: Record<string, unknown>;
	readonly conversation: {
		readonly mode: "read-only";
		readonly title: string;
		readonly excerpt: string;
		readonly body: string;
		readonly durationMs?: number;
	};
};

export type LevelNpcPackageData = {
	readonly archetypes?: readonly unknown[];
	readonly groups?: readonly unknown[];
};

type ResolvedLevelNpcPackageData = {
	readonly assets: readonly AssetManifestData["assets"][number][];
	readonly preload: readonly string[];
	readonly preloadGroups: NonNullable<AssetManifestData["preloadGroups"]>;
	readonly prefabs: readonly PrefabData[];
	readonly instances: readonly LevelData["instances"][number][];
	readonly requiredAssetIds: readonly string[];
	readonly requiredLightStableIds: readonly string[];
};

export type ResolvedLevelPackage = {
	readonly data: LevelPackageData;
	readonly skybox: LevelSkyboxData;
	readonly performance: PerformanceConfig;
	readonly level: LevelData;
	readonly assetManifest: AssetManifestData;
	readonly audioContentManifest: AudioContentManifest;
	readonly prefabs: readonly PrefabData[];
	readonly renderProfile: RenderProfileData;
	readonly runtimeSceneManifest: RuntimeSceneManifestData;
};

const sharedAssetCatalog = catalogById([
	cubemapClassicSky,
	cubemapObservatorySky,
	sampleEquirectangularSky,
	sampleVideoSky,
	audioAmbientDarkShadowsOfDelight,
	audioAmbientShadowWaltz,
	audioAmbientWhistlingDreams,
	audioPortalActivate,
	meshPortalGate,
	meshWaterPlane,
	materialWaterDarkStill,
]);

const sharedPrefabCatalog = catalogById([
	playerPrefab,
	portalGatePrefab,
	waterSurfacePlanePrefab,
]);

export function defineLevelPackage(
	data: unknown,
	skybox: unknown,
	npcs: LevelNpcPackageData = {},
	collision: StaticEnvironmentCollisionPackage = {},
	performance: unknown = globalPerformance,
): ResolvedLevelPackage {
	const packageData = parseLevelPackageData(data);
	const skyboxData = parseLevelSkyboxData(skybox);
	const performanceData = composePerformanceConfig(
		globalPerformance,
		performance,
	);
	const npcData = parseLevelNpcPackageData(npcs);
	const collisionData = resolveStaticEnvironmentCollisionPackage(collision);
	const level = composeLevel(
		packageData,
		skyboxData,
		performanceData,
		npcData,
		collisionData,
	);
	const readiness = composeReadiness(
		packageData,
		skyboxData,
		npcData,
		collisionData,
	);
	const renderProfile = composeRenderProfile(packageData, skyboxData);
	const assetManifest = {
		assets: [
			...resolveRefs(
				packageData.assets.shared ?? [],
				sharedAssetCatalog,
				"shared asset",
			),
			...resolveRefs(
				skyboxData.assets?.shared ?? [],
				sharedAssetCatalog,
				"shared skybox asset",
			),
			...playerAssets,
			...packageData.assets.local,
			...npcData.assets,
			...(skyboxData.assets?.local ?? []),
		],
		...(packageData.assets.preloadGroups ||
		skyboxData.assets?.preloadGroups ||
		Object.keys(npcData.preloadGroups).length > 0
			? {
					preloadGroups: composePreloadGroups(packageData, skyboxData, npcData),
				}
			: {}),
	} satisfies AssetManifestData;
	const prefabs = [
		...resolveRefs(
			packageData.prefabs.shared ?? [],
			sharedPrefabCatalog,
			"shared prefab",
		),
		playerPrefab,
		...packageData.prefabs.local,
		...collisionData.prefabs,
		...npcData.prefabs,
	] satisfies readonly PrefabData[];
	const audio = {
		...(packageData.audio.sceneMusic
			? { sceneMusic: packageData.audio.sceneMusic }
			: {}),
		eventMappings: [
			...createPlayerAudioEventMappings({
				levelId: packageData.level.id,
				sceneId: packageData.level.sceneId ?? packageData.level.id,
				...(packageData.player ? { player: packageData.player } : {}),
			}),
			...packageData.audio.eventMappings,
		],
	} satisfies AudioContentManifest;

	assetManifestValidator.parse(assetManifest);
	levelDefinitionValidator.parse(level);
	renderProfileValidator.parse(renderProfile);

	const audioContentManifest = parseAudioContentManifest(audio, {
		assetManifest,
	});
	const runtimeSceneManifest = loadRuntimeSceneManifest({
		...packageData.runtimeScene,
		readiness,
		level,
		prefabs,
		assets: assetManifest,
		renderProfile,
	});

	return {
		data: packageData,
		skybox: skyboxData,
		performance: performanceData,
		level,
		assetManifest,
		audioContentManifest,
		prefabs,
		renderProfile,
		runtimeSceneManifest,
	};
}

function parseLevelPackageData(data: unknown): LevelPackageData {
	if (!isRecord(data)) {
		throw new Error("Level package data must be an object.");
	}

	if (typeof data.id !== "string" || data.id.length === 0) {
		throw new Error("Level package data requires a non-empty id.");
	}

	if (!isRecord(data.runtimeScene)) {
		throw new Error("Level package data requires runtimeScene.");
	}

	if (data.runtimeScene.schemaVersion !== 1) {
		throw new Error("Level package runtimeScene.schemaVersion must be 1.");
	}

	if (
		typeof data.runtimeScene.id !== "string" ||
		typeof data.runtimeScene.generatedAt !== "string" ||
		!isRecord(data.runtimeScene.source) ||
		!isRecord(data.runtimeScene.readiness)
	) {
		throw new Error("Level package runtimeScene is incomplete.");
	}

	if (!isRecord(data.assets) || !Array.isArray(data.assets.local)) {
		throw new Error("Level package data requires assets.local.");
	}

	if (!isRecord(data.prefabs) || !Array.isArray(data.prefabs.local)) {
		throw new Error("Level package data requires prefabs.local.");
	}

	return data as LevelPackageData;
}

function parseLevelSkyboxData(data: unknown): LevelSkyboxData {
	if (!isRecord(data)) {
		throw new Error("Level skybox data must be an object.");
	}

	if (data.schemaVersion !== 1) {
		throw new Error("Level skybox schemaVersion must be 1.");
	}

	if (!isRecord(data.environment)) {
		throw new Error("Level skybox data requires environment.");
	}

	if (data.assets !== undefined && !isRecord(data.assets)) {
		throw new Error("Level skybox assets must be an object.");
	}

	if (isRecord(data.planned)) {
		for (const [featureName, featureData] of Object.entries(data.planned)) {
			if (isRecord(featureData) && featureData.enabled !== false) {
				throw new Error(
					`Level skybox planned.${featureName}.enabled must remain false until runtime support is implemented.`,
				);
			}
		}
	}

	return data as LevelSkyboxData;
}

function parseLevelNpcPackageData(
	data: LevelNpcPackageData,
): ResolvedLevelNpcPackageData {
	const archetypes = (data.archetypes ?? []).map(parseNpcArchetype);
	const archetypesById = catalogById(archetypes);
	const groups = (data.groups ?? []).map(parseNpcGroup);
	const instances: LevelData["instances"][number][] = [];
	const requiredLightStableIds: string[] = [];

	for (const group of groups) {
		const archetype = archetypesById.get(group.archetype);

		if (!archetype) {
			throw new Error(
				`NPC group references unknown archetype "${group.archetype}".`,
			);
		}

		for (const instance of group.instances) {
			const position = instance.transform.position ?? [0, 0, 0];
			const groupDefaults = group.defaults ?? {};
			const light = {
				...archetype.defaults.light,
				...groupDefaults.light,
				...instance.light,
			};
			const lightModulation = {
				...archetype.defaults.lightModulation,
				...groupDefaults.lightModulation,
				...instance.lightModulation,
				baseIntensity: numericValue(
					instance.lightModulation?.baseIntensity,
					numericValue(
						instance.light?.intensity,
						numericValue(
							groupDefaults.lightModulation?.baseIntensity,
							numericValue(light.intensity, 0),
						),
					),
				),
				baseDistance: numericValue(
					instance.lightModulation?.baseDistance,
					numericValue(
						instance.light?.distance,
						numericValue(
							groupDefaults.lightModulation?.baseDistance,
							numericValue(light.distance, 0),
						),
					),
				),
			};
			const movement = {
				...archetype.defaults.movement,
				...groupDefaults.movement,
				...instance.movement,
				...(isRecord(archetype.defaults.movement) ||
				isRecord(groupDefaults.movement) ||
				isRecord(instance.movement)
					? { basePosition: position }
					: {}),
			};
			const interaction = {
				...archetype.defaults.interaction,
				...groupDefaults.interaction,
				...instance.interaction,
			};
			const inheritedLightColor =
				typeof light.color === "string" ? light.color : undefined;

			instances.push({
				id: instance.id,
				prefabId: archetype.prefab.id,
				stableId: instance.stableId,
				transform: instance.transform,
				components: {
					Npc: {
						id: instance.stableId,
						archetype: archetype.id,
						displayName: instance.displayName,
					},
					...(Object.keys(movement).length > 0
						? { MovementBehavior: movement }
						: {}),
					...(Object.keys(light).length > 0 ? { Light: light } : {}),
					...(Object.keys(lightModulation).length > 0
						? { LightModulation: lightModulation }
						: {}),
					InteractionTarget: {
						kind: "npc",
						prompt: "Listen",
						activationRadius: 3,
						...interaction,
					},
					Conversation: instance.conversation,
				},
			});

			for (const visualPart of archetype.visualParts ?? []) {
				instances.push({
					id: `${instance.id}-${visualPart.idSuffix}`,
					prefabId: visualPart.prefab.id,
					stableId: `${instance.stableId}:${visualPart.idSuffix}`,
					transform: composeNpcVisualPartTransform(
						instance.transform,
						visualPart.transform,
					),
					components: {
						...(visualPart.inheritLightColor && inheritedLightColor
							? {
									Renderable: npcVisualPartTintedRenderable(
										visualPart,
										inheritedLightColor,
									),
								}
							: {}),
						FollowTarget: {
							targetStableId: instance.stableId,
							offset: visualPart.transform?.position ?? [0, 0, 0],
							scale: visualPart.transform?.scale ?? [1, 1, 1],
							inheritRotation: false,
						},
					},
				});
			}

			requiredLightStableIds.push(instance.stableId);
		}
	}

	return {
		assets: archetypes.flatMap((archetype) => archetype.assets?.local ?? []),
		preload: unique(
			archetypes.flatMap((archetype) => archetype.assets?.preload ?? []),
		),
		preloadGroups: mergePreloadGroups(
			archetypes.map((archetype) => archetype.assets?.preloadGroups ?? {}),
		),
		prefabs: archetypes.flatMap((archetype) => [
			archetype.prefab,
			...(archetype.visualParts ?? []).map((part) => part.prefab),
		]),
		instances,
		requiredAssetIds: unique(
			archetypes.flatMap((archetype) => archetype.assets?.preload ?? []),
		),
		requiredLightStableIds: unique(requiredLightStableIds),
	};
}

function composeNpcVisualPartTransform(
	instanceTransform: NonNullable<LevelData["instances"][number]["transform"]>,
	partTransform:
		| NonNullable<LevelData["instances"][number]["transform"]>
		| undefined,
): NonNullable<LevelData["instances"][number]["transform"]> {
	const basePosition = instanceTransform.position ?? [0, 0, 0];
	const offset = partTransform?.position ?? [0, 0, 0];
	const baseScale = instanceTransform.scale ?? [1, 1, 1];
	const partScale = partTransform?.scale ?? [1, 1, 1];

	return {
		position: [
			basePosition[0] + offset[0] * baseScale[0],
			basePosition[1] + offset[1] * baseScale[1],
			basePosition[2] + offset[2] * baseScale[2],
		],
		...(partTransform?.rotation ?? instanceTransform.rotation
			? {
					rotation:
						partTransform?.rotation ??
						instanceTransform.rotation ??
						([0, 0, 0, 1] as const),
				}
			: {}),
		scale: [
			baseScale[0] * partScale[0],
			baseScale[1] * partScale[1],
			baseScale[2] * partScale[2],
		],
	};
}

function npcVisualPartTintedRenderable(
	visualPart: LevelNpcVisualPartData,
	color: string,
): Record<string, unknown> {
	const renderable = isRecord(visualPart.prefab.components)
		? visualPart.prefab.components.Renderable
		: undefined;

	if (!isRecord(renderable) || renderable.kind !== "sprite") {
		throw new Error(
			`NPC visual part "${visualPart.idSuffix}" cannot inherit light color without a sprite Renderable.`,
		);
	}

	return {
		...renderable,
		color,
	};
}

function parseNpcArchetype(data: unknown): LevelNpcArchetypeData {
	if (!isRecord(data) || data.schemaVersion !== 1) {
		throw new Error("NPC archetype must be a schemaVersion 1 object.");
	}

	if (typeof data.id !== "string" || data.id.length === 0) {
		throw new Error("NPC archetype requires a non-empty id.");
	}

	if (!isRecord(data.prefab)) {
		throw new Error(`NPC archetype "${data.id}" requires prefab.`);
	}

	if (!isRecord(data.defaults)) {
		throw new Error(`NPC archetype "${data.id}" requires defaults.`);
	}

	return data as unknown as LevelNpcArchetypeData;
}

function parseNpcGroup(data: unknown): LevelNpcGroupData {
	if (!isRecord(data) || data.schemaVersion !== 1) {
		throw new Error("NPC group must be a schemaVersion 1 object.");
	}

	if (typeof data.archetype !== "string" || data.archetype.length === 0) {
		throw new Error("NPC group requires a non-empty archetype.");
	}

	if (!Array.isArray(data.instances)) {
		throw new Error(`NPC group "${data.archetype}" requires instances.`);
	}

	return data as unknown as LevelNpcGroupData;
}

function composeLevel(
	packageData: LevelPackageData,
	skyboxData: LevelSkyboxData,
	performanceData: PerformanceConfig,
	npcData: ResolvedLevelNpcPackageData,
	collisionData: ResolvedStaticEnvironmentCollisionPackage,
): LevelData {
	if (
		packageData.level.resources?.[PERFORMANCE_CONFIG_RESOURCE] !== undefined
	) {
		throw new Error(
			`Level resources must not define ${PERFORMANCE_CONFIG_RESOURCE}; use performance.json instead.`,
		);
	}

	return {
		...packageData.level,
		resources: {
			...(packageData.level.resources ?? {}),
			[PERFORMANCE_CONFIG_RESOURCE]: performanceData,
		},
		preload: unique([
			...(packageData.level.preload ?? []),
			...npcData.preload,
			...skyboxPreloadAssetIds(skyboxData),
			...PLAYER_REQUIRED_ASSET_IDS,
		]),
		instances: [
			...packageData.level.instances,
			...collisionData.instances,
			...npcData.instances,
			createPlayerInstance(packageData.player),
		],
	};
}

function composeReadiness(
	packageData: LevelPackageData,
	skyboxData: LevelSkyboxData,
	npcData: ResolvedLevelNpcPackageData,
	collisionData: ResolvedStaticEnvironmentCollisionPackage,
): RuntimeSceneManifestData["readiness"] {
	const readiness = packageData.runtimeScene.readiness;

	return {
		...readiness,
		playerStableId: PLAYER_STABLE_ID,
		requiredAssetIds: unique([
			...(readiness.requiredAssetIds ?? []),
			...skyboxRequiredAssetIds(skyboxData),
			...npcData.requiredAssetIds,
			...PLAYER_REQUIRED_ASSET_IDS,
		]),
		requiredCollisionPrefabIds: unique([
			...(readiness.requiredCollisionPrefabIds ?? []),
			PLAYER_PREFAB_ID,
		]),
		...(readiness.requiredCollisionStableIds
			? {
					requiredCollisionStableIds: unique([
						...readiness.requiredCollisionStableIds,
						...collisionData.requiredCollisionStableIds,
						PLAYER_STABLE_ID,
					]),
				}
			: collisionData.requiredCollisionStableIds.length > 0
				? {
						requiredCollisionStableIds: unique([
							...collisionData.requiredCollisionStableIds,
							PLAYER_STABLE_ID,
						]),
					}
				: {}),
		...(readiness.requiredWalkableStableIds ||
		collisionData.requiredWalkableStableIds.length > 0
			? {
					requiredWalkableStableIds: unique([
						...(readiness.requiredWalkableStableIds ?? []),
						...collisionData.requiredWalkableStableIds,
					]),
				}
			: {}),
		...(readiness.requiredLightStableIds ||
		npcData.requiredLightStableIds.length > 0 ||
		playerHasRequiredLight(packageData.player)
			? {
					requiredLightStableIds: unique([
						...(readiness.requiredLightStableIds ?? []),
						...npcData.requiredLightStableIds,
						...(playerHasRequiredLight(packageData.player)
							? [PLAYER_STABLE_ID]
							: []),
					]),
				}
			: {}),
	};
}

function composeRenderProfile(
	packageData: LevelPackageData,
	skyboxData: LevelSkyboxData,
): RenderProfileData {
	return {
		...packageData.renderProfile,
		environment: skyboxData.environment,
	};
}

function composePreloadGroups(
	packageData: LevelPackageData,
	skyboxData: LevelSkyboxData,
	npcData: ResolvedLevelNpcPackageData,
): NonNullable<AssetManifestData["preloadGroups"]> {
	const preloadGroups = packageData.assets.preloadGroups ?? {};
	const skyboxPreloadGroups = skyboxData.assets?.preloadGroups ?? {};
	const npcPreloadGroups = npcData.preloadGroups;
	const composed: Record<string, readonly string[]> = {};

	for (const [groupId, assetIds] of Object.entries(preloadGroups)) {
		composed[groupId] = unique([
			...assetIds,
			...(skyboxPreloadGroups[groupId] ?? []),
			...PLAYER_REQUIRED_ASSET_IDS,
		]);
	}

	for (const [groupId, assetIds] of Object.entries(skyboxPreloadGroups)) {
		if (composed[groupId]) {
			continue;
		}
		composed[groupId] = unique([...assetIds, ...PLAYER_REQUIRED_ASSET_IDS]);
	}

	for (const [groupId, assetIds] of Object.entries(npcPreloadGroups)) {
		composed[groupId] = unique([
			...(composed[groupId] ?? []),
			...assetIds,
			...PLAYER_REQUIRED_ASSET_IDS,
		]);
	}

	return composed;
}

function skyboxPreloadAssetIds(skyboxData: LevelSkyboxData): readonly string[] {
	const environmentAssetId = skyboxEnvironmentAssetId(skyboxData.environment);

	return unique([
		...(skyboxData.assets?.preload ?? []),
		...(environmentAssetId ? [environmentAssetId] : []),
	]);
}

function skyboxRequiredAssetIds(
	skyboxData: LevelSkyboxData,
): readonly string[] {
	const environmentAssetId = skyboxEnvironmentAssetId(skyboxData.environment);

	return environmentAssetId &&
		"requiredForReadiness" in skyboxData.environment &&
		skyboxData.environment.requiredForReadiness
		? [environmentAssetId]
		: [];
}

function skyboxEnvironmentAssetId(
	environment: RenderProfileEnvironmentData,
): string | undefined {
	return "assetId" in environment ? environment.assetId : undefined;
}

function catalogById<TEntry extends { readonly id: string }>(
	entries: readonly TEntry[],
): ReadonlyMap<string, TEntry> {
	return new Map(entries.map((entry) => [entry.id, entry]));
}

function resolveRefs<TEntry extends { readonly id: string }>(
	ids: readonly string[],
	catalog: ReadonlyMap<string, TEntry>,
	label: string,
): readonly TEntry[] {
	return ids.map((id) => {
		const entry = catalog.get(id);

		if (!entry) {
			throw new Error(`Unknown ${label} "${id}".`);
		}

		return entry;
	});
}

function mergePreloadGroups(
	groups: readonly NonNullable<AssetManifestData["preloadGroups"]>[],
): NonNullable<AssetManifestData["preloadGroups"]> {
	const merged: Record<string, readonly string[]> = {};

	for (const group of groups) {
		for (const [groupId, assetIds] of Object.entries(group)) {
			merged[groupId] = unique([...(merged[groupId] ?? []), ...assetIds]);
		}
	}

	return merged;
}

function numericValue(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function unique<TValue>(values: readonly TValue[]): readonly TValue[] {
	return [...new Set(values)];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
