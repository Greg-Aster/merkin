import type {
	LevelPrefabInstanceData,
	LightBudgetProfileData,
	PrefabData,
	RuntimeSceneManifestData,
} from "../schemas/types.js";
import type {
	RuntimeSceneAudioContentGraphData,
	RuntimeSceneContentGraph,
	RuntimeSceneContentGraphInput,
	RuntimeSceneContentGraphValidationResult,
	RuntimeSceneLightBudgetCounts,
} from "./types.js";

type RuntimeSceneContentGraphBuildState = {
	readonly manifest: RuntimeSceneManifestData;
	readonly runtimeSceneIds: ReadonlySet<string>;
	readonly assetIds: Set<string>;
	readonly authoredAssetIds: Set<string>;
	readonly declaredPreloadAssetIds: Set<string>;
	readonly prefabIds: Set<string>;
	readonly referencedPrefabIds: Set<string>;
	readonly levelInstanceStableIds: Set<string>;
	readonly duplicateStableIds: Set<string>;
	readonly collisionPrefabIds: Set<string>;
	readonly collisionStableIds: Set<string>;
	readonly walkableStableIds: Set<string>;
	readonly terrainPackageIds: Set<string>;
	readonly terrainChunkStableIds: Set<string>;
	readonly lightStableIds: Set<string>;
	readonly lightBudgetCounts: MutableRuntimeSceneLightBudgetCounts;
	readonly portalTargetRuntimeSceneIds: Set<string>;
	readonly errors: string[];
};

type MutableRuntimeSceneLightBudgetCounts = {
	total: number;
	ambient: number;
	directional: number;
	point: number;
	spot: number;
	area: number;
	shadowCasting: number;
};

export function buildRuntimeSceneContentGraph(
	input: RuntimeSceneContentGraphInput,
): RuntimeSceneContentGraph {
	const state = createBuildState(input);

	collectPreloadAssetIds(state);
	collectLevelInstances(state);
	collectTerrainPackages(state);
	collectRenderProfileAssets(state);
	collectAudioAssets(state, input.audioContent);

	return graphFromState(state);
}

export function validateRuntimeSceneContentGraph(
	input: RuntimeSceneContentGraphInput,
): RuntimeSceneContentGraphValidationResult {
	const state = createBuildState(input);

	collectPreloadAssetIds(state);
	collectLevelInstances(state);
	collectTerrainPackages(state);
	collectRenderProfileAssets(state);
	collectAudioAssets(state, input.audioContent);
	validateContentGraphState(state);

	const graph = graphFromState(state);

	if (state.errors.length === 0) {
		return { ok: true, graph };
	}

	return {
		ok: false,
		graph,
		errors: state.errors,
	};
}

function createBuildState(
	input: RuntimeSceneContentGraphInput,
): RuntimeSceneContentGraphBuildState {
	return {
		manifest: input.manifest,
		runtimeSceneIds: new Set(input.runtimeSceneIds),
		assetIds: new Set(input.manifest.assets.assets.map((asset) => asset.id)),
		authoredAssetIds: new Set(),
		declaredPreloadAssetIds: new Set(),
		prefabIds: new Set(input.manifest.prefabs.map((prefab) => prefab.id)),
		referencedPrefabIds: new Set(),
		levelInstanceStableIds: new Set(),
		duplicateStableIds: new Set(),
		collisionPrefabIds: new Set(),
		collisionStableIds: new Set(),
		walkableStableIds: new Set(),
		terrainPackageIds: new Set(),
		terrainChunkStableIds: new Set(),
		lightStableIds: new Set(),
		lightBudgetCounts: emptyLightBudgetCounts(),
		portalTargetRuntimeSceneIds: new Set(),
		errors: [],
	};
}

function collectPreloadAssetIds(
	state: RuntimeSceneContentGraphBuildState,
): void {
	for (const assetId of state.manifest.level.preload ?? []) {
		state.declaredPreloadAssetIds.add(assetId);
	}

	for (const groupId of state.manifest.level.preloadGroups ?? []) {
		const groupAssetIds = state.manifest.assets.preloadGroups?.[groupId];

		if (!groupAssetIds) {
			continue;
		}

		for (const assetId of groupAssetIds) {
			state.declaredPreloadAssetIds.add(assetId);
		}
	}
}

function collectLevelInstances(
	state: RuntimeSceneContentGraphBuildState,
): void {
	const prefabs = prefabsById(state.manifest.prefabs);

	for (const instance of state.manifest.level.instances) {
		state.referencedPrefabIds.add(instance.prefabId);

		if (state.levelInstanceStableIds.has(instance.stableId)) {
			state.duplicateStableIds.add(instance.stableId);
		}

		state.levelInstanceStableIds.add(instance.stableId);

		const prefab = prefabs.get(instance.prefabId);

		if (!prefab) {
			continue;
		}

		for (const assetId of prefab.assetIds ?? []) {
			state.authoredAssetIds.add(assetId);
		}

		const components = mergeComponentMaps(
			prefab.components,
			instance.components ?? {},
		);

		collectRenderableAssetIds(state, components);
		collectSoundEmitterAssetIds(state, components);
		collectCollisionIds(state, prefab, instance, components);
		collectLightIds(state, instance, components);
		collectPortalTargets(state, components);
	}
}

function collectTerrainPackages(
	state: RuntimeSceneContentGraphBuildState,
): void {
	for (const terrainPackage of state.manifest.terrainPackages ?? []) {
		state.terrainPackageIds.add(terrainPackage.id);

		for (const stableId of terrainPackage.streamableChunkStableIds) {
			state.terrainChunkStableIds.add(stableId);
		}
	}
}

function collectRenderableAssetIds(
	state: RuntimeSceneContentGraphBuildState,
	components: Record<string, unknown>,
): void {
	const renderable = components.Renderable;

	if (!isRecord(renderable)) {
		return;
	}

	addString(renderable.meshId, state.authoredAssetIds);
	addString(renderable.materialId, state.authoredAssetIds);
}

function collectSoundEmitterAssetIds(
	state: RuntimeSceneContentGraphBuildState,
	components: Record<string, unknown>,
): void {
	const emitter = components.SoundEmitter;

	if (!isRecord(emitter)) {
		return;
	}

	addString(emitter.soundId, state.authoredAssetIds);
}

function collectCollisionIds(
	state: RuntimeSceneContentGraphBuildState,
	prefab: PrefabData,
	instance: LevelPrefabInstanceData,
	components: Record<string, unknown>,
): void {
	const collider = components.Collider;

	if (!isRecord(collider)) {
		return;
	}

	state.collisionPrefabIds.add(prefab.id);
	state.collisionStableIds.add(instance.stableId);

	if (collider.intent === "walkable") {
		state.walkableStableIds.add(instance.stableId);
	}
}

function collectLightIds(
	state: RuntimeSceneContentGraphBuildState,
	instance: LevelPrefabInstanceData,
	components: Record<string, unknown>,
): void {
	if (isRecord(components.Light)) {
		state.lightStableIds.add(instance.stableId);
		countLightForBudget(state.lightBudgetCounts, components.Light);
	}
}

function collectPortalTargets(
	state: RuntimeSceneContentGraphBuildState,
	components: Record<string, unknown>,
): void {
	const portal = components.Portal;

	if (!isRecord(portal)) {
		return;
	}

	addString(portal.targetRuntimeSceneId, state.portalTargetRuntimeSceneIds);
}

function collectRenderProfileAssets(
	state: RuntimeSceneContentGraphBuildState,
): void {
	const environment = state.manifest.renderProfile.environment;

	if ("assetId" in environment) {
		state.authoredAssetIds.add(environment.assetId);
	}

	for (const light of state.manifest.renderProfile.lighting.lights) {
		countLightForBudget(state.lightBudgetCounts, light);
	}
}

function collectAudioAssets(
	state: RuntimeSceneContentGraphBuildState,
	audioContent: RuntimeSceneAudioContentGraphData | undefined,
): void {
	if (!audioContent) {
		return;
	}

	for (const mapping of audioContent.eventMappings ?? []) {
		if (!isRecord(mapping)) {
			continue;
		}

		addString(mapping.soundId, state.authoredAssetIds);
	}

	if (!isRecord(audioContent.sceneMusic)) {
		return;
	}

	addString(audioContent.sceneMusic.trackId, state.authoredAssetIds);

	if (Array.isArray(audioContent.sceneMusic.trackIds)) {
		for (const trackId of audioContent.sceneMusic.trackIds) {
			addString(trackId, state.authoredAssetIds);
		}
	}
}

function validateContentGraphState(
	state: RuntimeSceneContentGraphBuildState,
): void {
	const manifest = state.manifest;
	const readiness = manifest.readiness;
	const readinessAssetIds = new Set(readiness.requiredAssetIds ?? []);
	const readinessCollisionPrefabIds = new Set(
		readiness.requiredCollisionPrefabIds ?? [],
	);
	const readinessCollisionStableIds = new Set(
		readiness.requiredCollisionStableIds ?? [],
	);
	const readinessWalkableStableIds = new Set(
		readiness.requiredWalkableStableIds ?? [],
	);
	const readinessLightStableIds = new Set(
		readiness.requiredLightStableIds ?? [],
	);
	const readinessTerrainPackageIds = new Set(
		readiness.requiredTerrainPackageIds ?? [],
	);

	validateKnownReferences(state);
	validateReadinessAssets(state, readinessAssetIds);
	validateReadinessCollisionPrefabs(state, readinessCollisionPrefabIds);
	validateReadinessCollisionStableIds(state, readinessCollisionStableIds);
	validateReadinessWalkableStableIds(
		state,
		readinessCollisionStableIds,
		readinessWalkableStableIds,
	);
	validateReadinessLightStableIds(state, readinessLightStableIds);
	validateReadinessTerrainPackages(
		state,
		readinessTerrainPackageIds,
		readinessCollisionStableIds,
		readinessWalkableStableIds,
	);
	validateLightBudget(state);
	validatePortalTargets(state);

	if (!state.levelInstanceStableIds.has(readiness.playerStableId)) {
		state.errors.push(
			`manifest "${manifest.id}" readiness.playerStableId "${readiness.playerStableId}" is not an authored level instance stable ID.`,
		);
	}

	for (const stableId of state.duplicateStableIds) {
		state.errors.push(
			`manifest "${manifest.id}" level instances contain duplicate stable ID "${stableId}".`,
		);
	}
}

function validateKnownReferences(
	state: RuntimeSceneContentGraphBuildState,
): void {
	for (const assetId of state.authoredAssetIds) {
		if (!state.assetIds.has(assetId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" references unknown asset "${assetId}".`,
			);
		}
	}

	for (const assetId of state.declaredPreloadAssetIds) {
		if (!state.assetIds.has(assetId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" preload references unknown asset "${assetId}".`,
			);
		}
	}

	for (const prefabId of state.referencedPrefabIds) {
		if (!state.prefabIds.has(prefabId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" level instances reference unknown prefab "${prefabId}".`,
			);
		}
	}
}

function validateReadinessAssets(
	state: RuntimeSceneContentGraphBuildState,
	readinessAssetIds: ReadonlySet<string>,
): void {
	for (const assetId of state.authoredAssetIds) {
		if (!state.declaredPreloadAssetIds.has(assetId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" authored asset "${assetId}" is missing from the level preload set.`,
			);
		}

		if (!readinessAssetIds.has(assetId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" authored asset "${assetId}" is missing from readiness.requiredAssetIds.`,
			);
		}
	}

	for (const assetId of readinessAssetIds) {
		if (!state.assetIds.has(assetId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" readiness.requiredAssetIds references unknown asset "${assetId}".`,
			);
			continue;
		}

		if (!state.authoredAssetIds.has(assetId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" readiness.requiredAssetIds "${assetId}" is not reachable from authored content.`,
			);
		}
	}
}

function validateReadinessCollisionPrefabs(
	state: RuntimeSceneContentGraphBuildState,
	readinessCollisionPrefabIds: ReadonlySet<string>,
): void {
	for (const prefabId of readinessCollisionPrefabIds) {
		if (!state.prefabIds.has(prefabId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" readiness.requiredCollisionPrefabIds references unknown prefab "${prefabId}".`,
			);
			continue;
		}

		if (!state.collisionPrefabIds.has(prefabId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" readiness.requiredCollisionPrefabIds "${prefabId}" is not an authored collision prefab in the level.`,
			);
		}
	}
}

function validateReadinessCollisionStableIds(
	state: RuntimeSceneContentGraphBuildState,
	readinessCollisionStableIds: ReadonlySet<string>,
): void {
	for (const stableId of readinessCollisionStableIds) {
		if (!state.collisionStableIds.has(stableId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" readiness.requiredCollisionStableIds "${stableId}" is not an authored collision stable ID.`,
			);
		}
	}
}

function validateReadinessWalkableStableIds(
	state: RuntimeSceneContentGraphBuildState,
	readinessCollisionStableIds: ReadonlySet<string>,
	readinessWalkableStableIds: ReadonlySet<string>,
): void {
	for (const stableId of state.walkableStableIds) {
		if (!readinessWalkableStableIds.has(stableId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" authored walkable stable ID "${stableId}" is missing from readiness.requiredWalkableStableIds.`,
			);
		}
	}

	for (const stableId of readinessWalkableStableIds) {
		if (!state.walkableStableIds.has(stableId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" readiness.requiredWalkableStableIds "${stableId}" is not an authored walkable stable ID.`,
			);
		}

		if (!readinessCollisionStableIds.has(stableId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" readiness.requiredWalkableStableIds "${stableId}" is missing from readiness.requiredCollisionStableIds.`,
			);
		}
	}
}

function validateReadinessLightStableIds(
	state: RuntimeSceneContentGraphBuildState,
	readinessLightStableIds: ReadonlySet<string>,
): void {
	for (const stableId of state.lightStableIds) {
		if (!readinessLightStableIds.has(stableId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" authored light stable ID "${stableId}" is missing from readiness.requiredLightStableIds.`,
			);
		}
	}

	for (const stableId of readinessLightStableIds) {
		if (!state.lightStableIds.has(stableId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" readiness.requiredLightStableIds "${stableId}" is not an authored light stable ID.`,
			);
		}
	}
}

function validateReadinessTerrainPackages(
	state: RuntimeSceneContentGraphBuildState,
	readinessTerrainPackageIds: ReadonlySet<string>,
	readinessCollisionStableIds: ReadonlySet<string>,
	readinessWalkableStableIds: ReadonlySet<string>,
): void {
	for (const packageId of state.terrainPackageIds) {
		if (!readinessTerrainPackageIds.has(packageId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" terrain package "${packageId}" is missing from readiness.requiredTerrainPackageIds.`,
			);
		}
	}

	for (const packageId of readinessTerrainPackageIds) {
		if (!state.terrainPackageIds.has(packageId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" readiness.requiredTerrainPackageIds references unknown terrain package "${packageId}".`,
			);
		}
	}

	for (const stableId of state.terrainChunkStableIds) {
		if (!state.levelInstanceStableIds.has(stableId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" terrain package chunk "${stableId}" is not an authored level instance stable ID.`,
			);
		}

		if (readinessCollisionStableIds.has(stableId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" terrain package chunk "${stableId}" must not be listed in readiness.requiredCollisionStableIds; terrain package readiness owns streamed chunks.`,
			);
		}

		if (readinessWalkableStableIds.has(stableId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" terrain package chunk "${stableId}" must not be listed in readiness.requiredWalkableStableIds; terrain package readiness owns streamed chunks.`,
			);
		}
	}
}

function validateLightBudget(state: RuntimeSceneContentGraphBuildState): void {
	const budget = state.manifest.renderProfile.lighting.budget;

	if (!budget) {
		return;
	}

	validateLightBudgetLimit(
		state,
		budget,
		"maxTotal",
		"total",
		"total authored/profile lights",
	);
	validateLightBudgetLimit(
		state,
		budget,
		"maxAmbient",
		"ambient",
		"ambient lights",
	);
	validateLightBudgetLimit(
		state,
		budget,
		"maxDirectional",
		"directional",
		"directional lights",
	);
	validateLightBudgetLimit(state, budget, "maxPoint", "point", "point lights");
	validateLightBudgetLimit(state, budget, "maxSpot", "spot", "spot lights");
	validateLightBudgetLimit(state, budget, "maxArea", "area", "area lights");
	validateLightBudgetLimit(
		state,
		budget,
		"maxShadowCasting",
		"shadowCasting",
		"shadow-casting lights",
	);
}

function validateLightBudgetLimit(
	state: RuntimeSceneContentGraphBuildState,
	budget: LightBudgetProfileData,
	budgetKey: keyof LightBudgetProfileData,
	countKey: keyof RuntimeSceneLightBudgetCounts,
	label: string,
): void {
	const limit = budget[budgetKey];

	if (limit === undefined) {
		return;
	}

	const count = state.lightBudgetCounts[countKey];

	if (count > limit) {
		state.errors.push(
			`manifest "${state.manifest.id}" exceeds renderProfile.lighting.budget.${budgetKey}: ${count} ${label} authored, limit is ${limit}.`,
		);
	}
}

function validatePortalTargets(
	state: RuntimeSceneContentGraphBuildState,
): void {
	for (const targetRuntimeSceneId of state.portalTargetRuntimeSceneIds) {
		if (!state.runtimeSceneIds.has(targetRuntimeSceneId)) {
			state.errors.push(
				`manifest "${state.manifest.id}" portal targetRuntimeSceneId "${targetRuntimeSceneId}" is not in the runtime scene catalog.`,
			);
		}
	}
}

function graphFromState(
	state: RuntimeSceneContentGraphBuildState,
): RuntimeSceneContentGraph {
	return {
		runtimeSceneId: state.manifest.id,
		levelId: state.manifest.level.id,
		assetIds: sortedValues(state.assetIds),
		authoredAssetIds: sortedValues(state.authoredAssetIds),
		declaredPreloadAssetIds: sortedValues(state.declaredPreloadAssetIds),
		prefabIds: sortedValues(state.prefabIds),
		referencedPrefabIds: sortedValues(state.referencedPrefabIds),
		levelInstanceStableIds: sortedValues(state.levelInstanceStableIds),
		duplicateStableIds: sortedValues(state.duplicateStableIds),
		collisionPrefabIds: sortedValues(state.collisionPrefabIds),
		collisionStableIds: sortedValues(state.collisionStableIds),
		walkableStableIds: sortedValues(state.walkableStableIds),
		terrainPackageIds: sortedValues(state.terrainPackageIds),
		terrainChunkStableIds: sortedValues(state.terrainChunkStableIds),
		lightStableIds: sortedValues(state.lightStableIds),
		lightBudgetCounts: { ...state.lightBudgetCounts },
		portalTargetRuntimeSceneIds: sortedValues(
			state.portalTargetRuntimeSceneIds,
		),
	};
}

function prefabsById(
	prefabs: readonly PrefabData[],
): ReadonlyMap<string, PrefabData> {
	return new Map(prefabs.map((prefab) => [prefab.id, prefab] as const));
}

function mergeComponentMaps(
	baseComponents: Record<string, unknown>,
	overrideComponents: Record<string, unknown>,
): Record<string, unknown> {
	const merged = cloneRecord(baseComponents);

	for (const [componentName, component] of Object.entries(overrideComponents)) {
		if (isRecord(merged[componentName]) && isRecord(component)) {
			merged[componentName] = {
				...merged[componentName],
				...component,
			};
		} else {
			merged[componentName] = cloneValue(component);
		}
	}

	return merged;
}

function addString(value: unknown, target: Set<string>): void {
	if (typeof value === "string" && value.length > 0) {
		target.add(value);
	}
}

function emptyLightBudgetCounts(): MutableRuntimeSceneLightBudgetCounts {
	return {
		total: 0,
		ambient: 0,
		directional: 0,
		point: 0,
		spot: 0,
		area: 0,
		shadowCasting: 0,
	};
}

function countLightForBudget(
	counts: MutableRuntimeSceneLightBudgetCounts,
	light: unknown,
): void {
	if (!isRecord(light)) {
		return;
	}

	if (
		light.kind !== "ambient" &&
		light.kind !== "directional" &&
		light.kind !== "point" &&
		light.kind !== "spot" &&
		light.kind !== "area"
	) {
		return;
	}

	counts.total += 1;
	counts[light.kind] += 1;

	if (isRecord(light.shadow) && light.shadow.enabled === true) {
		counts.shadowCasting += 1;
	}
}

function sortedValues(values: ReadonlySet<string>): readonly string[] {
	return [...values].sort();
}

function cloneRecord(value: Record<string, unknown>): Record<string, unknown> {
	return cloneValue(value) as Record<string, unknown>;
}

function cloneValue<TValue>(value: TValue): TValue {
	return JSON.parse(JSON.stringify(value)) as TValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
