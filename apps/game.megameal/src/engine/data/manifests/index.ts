import {
	type RuntimeSceneManifestData,
	runtimeSceneManifestValidator,
} from "../schemas/index.js";

export type DataManifest<TEntry = unknown> = {
	readonly entries: readonly TEntry[];
};

export type ManifestIndexOptions<TEntry> = {
	readonly getId: (entry: TEntry) => string;
	readonly label?: string;
};

export function createManifestIndex<TEntry>(
	manifest: DataManifest<TEntry>,
	options: ManifestIndexOptions<TEntry>,
): ReadonlyMap<string, TEntry> {
	const index = new Map<string, TEntry>();
	const label = options.label ?? "manifest";

	for (const entry of manifest.entries) {
		const id = options.getId(entry);

		if (id.length === 0) {
			throw new Error(`${label} entries must have non-empty IDs.`);
		}

		if (index.has(id)) {
			throw new Error(`${label} contains duplicate entry "${id}".`);
		}

		index.set(id, entry);
	}

	return index;
}

export const RUNTIME_SCENE_MANIFEST_SCHEMA_VERSION = 1;

export type RuntimeSceneSpawnReport = {
	readonly prefabId: string;
	readonly stableId: string;
};

export type RuntimeSceneLoadReport = {
	readonly levelId: string;
	readonly sceneId?: string;
	readonly preloadedAssetIds: readonly string[];
	readonly spawned: readonly RuntimeSceneSpawnReport[];
	readonly physicsReady: boolean;
	readonly playerReady: boolean;
};

export type LevelReadinessChecks = {
	readonly manifestLoaded: boolean;
	readonly assetsLoaded: boolean;
	readonly spawnResolved: boolean;
	readonly collisionReady: boolean;
	readonly walkableReady: boolean;
	readonly lightsReady: boolean;
	readonly physicsReady: boolean;
	readonly playerReady: boolean;
};

export type RuntimeSceneReadinessResult =
	| {
			readonly ok: true;
			readonly manifestId: string;
			readonly levelId: string;
			readonly playerStableId: string;
			readonly requiredAssetIds: readonly string[];
			readonly requiredCollisionPrefabIds: readonly string[];
			readonly requiredCollisionStableIds: readonly string[];
			readonly requiredWalkableStableIds: readonly string[];
			readonly requiredLightStableIds: readonly string[];
			readonly checks: LevelReadinessChecks;
	  }
	| {
			readonly ok: false;
			readonly manifestId: string;
			readonly errors: readonly string[];
			readonly checks: LevelReadinessChecks;
	  };

export function loadRuntimeSceneManifest(
	data: unknown,
): RuntimeSceneManifestData {
	return cloneValue(runtimeSceneManifestValidator.parse(data));
}

export function evaluateRuntimeSceneReadiness(
	manifestData: unknown,
	report: RuntimeSceneLoadReport,
): RuntimeSceneReadinessResult {
	const manifest = loadRuntimeSceneManifest(manifestData);
	const errors: string[] = [];
	const requiredAssetIds = manifest.readiness.requiredAssetIds ?? [];
	const requiredCollisionPrefabIds =
		manifest.readiness.requiredCollisionPrefabIds ?? [];
	const requiredCollisionStableIds =
		manifest.readiness.requiredCollisionStableIds ?? [];
	const requiredWalkableStableIds =
		manifest.readiness.requiredWalkableStableIds ?? [];
	const requiredLightStableIds =
		manifest.readiness.requiredLightStableIds ?? [];
	const preloadedAssetIds = new Set(report.preloadedAssetIds);
	const spawnedStableIds = new Set(
		report.spawned.map((spawned) => spawned.stableId),
	);
	const spawnedPrefabIds = new Set(
		report.spawned.map((spawned) => spawned.prefabId),
	);
	const missingAssetIds = requiredAssetIds.filter(
		(assetId) => !preloadedAssetIds.has(assetId),
	);
	const missingCollisionPrefabIds = requiredCollisionPrefabIds.filter(
		(prefabId) => !spawnedPrefabIds.has(prefabId),
	);
	const missingCollisionStableIds = requiredCollisionStableIds.filter(
		(stableId) => !spawnedStableIds.has(stableId),
	);
	const missingWalkableStableIds = requiredWalkableStableIds.filter(
		(stableId) => !spawnedStableIds.has(stableId),
	);
	const missingLightStableIds = requiredLightStableIds.filter(
		(stableId) => !spawnedStableIds.has(stableId),
	);
	const checks: LevelReadinessChecks = {
		manifestLoaded: true,
		assetsLoaded: missingAssetIds.length === 0,
		spawnResolved: spawnedStableIds.has(manifest.readiness.playerStableId),
		collisionReady:
			missingCollisionPrefabIds.length === 0 &&
			missingCollisionStableIds.length === 0,
		walkableReady: missingWalkableStableIds.length === 0,
		lightsReady: missingLightStableIds.length === 0,
		physicsReady: report.physicsReady,
		playerReady: report.playerReady,
	};

	if (report.levelId !== manifest.level.id) {
		errors.push(
			`Loaded level "${report.levelId}" does not match runtime scene manifest level "${manifest.level.id}".`,
		);
	}

	if (
		manifest.level.sceneId !== undefined &&
		report.sceneId !== manifest.level.sceneId
	) {
		errors.push(
			`Loaded scene "${report.sceneId ?? "(none)"}" does not match runtime scene manifest scene "${manifest.level.sceneId}".`,
		);
	}

	for (const assetId of missingAssetIds) {
		errors.push(`Required asset "${assetId}" was not preloaded.`);
	}

	if (!checks.spawnResolved) {
		errors.push(
			`Required player spawn "${manifest.readiness.playerStableId}" was not spawned.`,
		);
	}

	for (const prefabId of missingCollisionPrefabIds) {
		errors.push(`Required collision prefab "${prefabId}" was not spawned.`);
	}

	for (const stableId of missingCollisionStableIds) {
		errors.push(`Required collision instance "${stableId}" was not spawned.`);
	}

	for (const stableId of missingWalkableStableIds) {
		errors.push(
			`Required walkable collision instance "${stableId}" was not spawned.`,
		);
	}

	for (const stableId of missingLightStableIds) {
		errors.push(`Required light instance "${stableId}" was not spawned.`);
	}

	if (!checks.physicsReady) {
		errors.push("Physics runtime was not ready for scene activation.");
	}

	if (!checks.playerReady) {
		errors.push("Player runtime was not ready for scene activation.");
	}

	if (errors.length > 0) {
		return {
			ok: false,
			manifestId: manifest.id,
			errors,
			checks,
		};
	}

	return {
		ok: true,
		manifestId: manifest.id,
		levelId: manifest.level.id,
		playerStableId: manifest.readiness.playerStableId,
		requiredAssetIds,
		requiredCollisionPrefabIds,
		requiredCollisionStableIds,
		requiredWalkableStableIds,
		requiredLightStableIds,
		checks,
	};
}

function cloneValue<TValue>(value: TValue): TValue {
	return JSON.parse(JSON.stringify(value)) as TValue;
}
