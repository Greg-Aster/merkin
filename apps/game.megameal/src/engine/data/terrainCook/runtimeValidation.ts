import type {
	AssetManifestEntryData,
	LevelPrefabInstanceData,
	PrefabData,
	TerrainChunkPackageData,
} from "../schemas/index.js";
import type { RuntimeSceneManifestData } from "../schemas/types.js";
import { isRecord, sameValue } from "./stableValue.js";
import type {
	TerrainCookCollisionChunkPlanData,
	TerrainCookPlan,
	TerrainCookRuntimeValidationResult,
	TerrainCookVisualBindingData,
	TerrainCookVisualOutputPlanData,
} from "./types.js";

export function validateTerrainCookPlanAgainstRuntimeScene(options: {
	readonly plan: TerrainCookPlan;
	readonly manifest: RuntimeSceneManifestData;
}): TerrainCookRuntimeValidationResult {
	const { plan, manifest } = options;
	const errors: string[] = [];
	const assets = new Map(
		manifest.assets.assets.map((asset) => [asset.id, asset] as const),
	);
	const prefabs = mapPrefabsById(manifest.prefabs);
	const instances = mapInstancesByStableId(manifest.level.instances);
	const requiredAssetIds = new Set(manifest.readiness.requiredAssetIds ?? []);
	const requiredCollisionStableIds = new Set(
		manifest.readiness.requiredCollisionStableIds ?? [],
	);
	const requiredWalkableStableIds = new Set(
		manifest.readiness.requiredWalkableStableIds ?? [],
	);
	const requiredTerrainPackageIds = new Set(
		manifest.readiness.requiredTerrainPackageIds ?? [],
	);
	const terrainPackages = new Map(
		(manifest.terrainPackages ?? []).map(
			(terrainPackage) => [terrainPackage.id, terrainPackage] as const,
		),
	);

	if (manifest.id !== plan.runtimeSceneId) {
		errors.push(
			`terrain cook plan "${plan.manifestId}" targets runtime scene "${plan.runtimeSceneId}", but manifest is "${manifest.id}".`,
		);
	}

	if (manifest.level.id !== plan.levelId) {
		errors.push(
			`terrain cook plan "${plan.manifestId}" targets level "${plan.levelId}", but manifest level is "${manifest.level.id}".`,
		);
	}

	for (const assetId of plan.requiredAssetIds) {
		if (!requiredAssetIds.has(assetId)) {
			errors.push(
				`terrain cook plan "${plan.manifestId}" required asset "${assetId}" is missing from readiness.requiredAssetIds.`,
			);
		}
	}

	for (const output of plan.visualOutputs) {
		validateRuntimeVisualOutput(output, {
			assets,
			instances,
			prefabs,
			errors,
		});
	}

	for (const binding of plan.visualBindings) {
		validateRuntimeVisualBinding(binding, {
			instances,
			prefabs,
			errors,
		});
	}

	const streamableChunkStableIds = new Set(plan.streamableChunkStableIds);

	for (const chunk of plan.collisionChunks) {
		if (
			plan.terrainPackage !== undefined &&
			streamableChunkStableIds.has(chunk.stableId)
		) {
			continue;
		}

		validateRuntimeCollisionChunk(chunk, {
			instances,
			prefabs,
			requiredCollisionStableIds,
			requiredWalkableStableIds,
			errors,
		});
	}

	if (plan.terrainPackage !== undefined) {
		validateRuntimeTerrainPackage(plan.terrainPackage, {
			instances,
			prefabs,
			requiredTerrainPackageIds,
			terrainPackages,
			errors,
		});
	}

	if (errors.length === 0) {
		return { ok: true, plan };
	}

	return { ok: false, plan, errors };
}

function validateRuntimeVisualOutput(
	output: TerrainCookVisualOutputPlanData,
	state: {
		readonly assets: ReadonlyMap<string, AssetManifestEntryData>;
		readonly instances: ReadonlyMap<string, LevelPrefabInstanceData>;
		readonly prefabs: ReadonlyMap<string, PrefabData>;
		readonly errors: string[];
	},
): void {
	const asset = state.assets.get(output.asset.id);
	const instance = state.instances.get(output.stableId);
	const prefab = state.prefabs.get(output.prefabId);

	if (!asset) {
		state.errors.push(
			`terrain visual output "${output.id}" asset "${output.asset.id}" is missing from runtime manifest assets.`,
		);
	} else if (asset.url !== output.asset.url) {
		state.errors.push(
			`terrain visual output "${output.id}" asset URL does not match cooked output.`,
		);
	}

	if (!instance) {
		state.errors.push(
			`terrain visual output "${output.id}" stableId "${output.stableId}" is missing from runtime level instances.`,
		);
	} else if (instance.prefabId !== output.prefabId) {
		state.errors.push(
			`terrain visual output "${output.id}" stableId "${output.stableId}" expects prefab "${output.prefabId}", but runtime instance uses "${instance.prefabId}".`,
		);
	}

	if (!prefab) {
		state.errors.push(
			`terrain visual output "${output.id}" references missing prefab "${output.prefabId}".`,
		);
	}
}

function validateRuntimeCollisionChunk(
	chunk: TerrainCookCollisionChunkPlanData,
	state: {
		readonly instances: ReadonlyMap<string, LevelPrefabInstanceData>;
		readonly prefabs: ReadonlyMap<string, PrefabData>;
		readonly requiredCollisionStableIds: ReadonlySet<string>;
		readonly requiredWalkableStableIds: ReadonlySet<string>;
		readonly errors: string[];
	},
): void {
	const instance = state.instances.get(chunk.stableId);
	const prefab = state.prefabs.get(chunk.prefabId);

	if (!instance) {
		state.errors.push(
			`terrain collision chunk "${chunk.id}" stableId "${chunk.stableId}" is missing from runtime level instances.`,
		);
		return;
	}

	if (instance.prefabId !== chunk.prefabId) {
		state.errors.push(
			`terrain collision chunk "${chunk.id}" stableId "${chunk.stableId}" expects prefab "${chunk.prefabId}", but runtime instance uses "${instance.prefabId}".`,
		);
	}

	if (!prefab) {
		state.errors.push(
			`terrain collision chunk "${chunk.id}" references missing prefab "${chunk.prefabId}".`,
		);
		return;
	}

	const runtimeCollider = effectiveCollider(prefab, instance);

	if (!isRecord(runtimeCollider)) {
		state.errors.push(
			`terrain collision chunk "${chunk.id}" stableId "${chunk.stableId}" has no effective runtime Collider.`,
		);
	} else if (!sameValue(runtimeCollider, chunk.colliderComponent)) {
		state.errors.push(
			`terrain collision chunk "${chunk.id}" effective runtime Collider does not match cooked terrain chunk data.`,
		);
	}

	if (chunk.readiness.requiredCollision) {
		if (!state.requiredCollisionStableIds.has(chunk.stableId)) {
			state.errors.push(
				`terrain collision chunk "${chunk.id}" stableId "${chunk.stableId}" is missing from readiness.requiredCollisionStableIds.`,
			);
		}
	}

	if (
		chunk.readiness.requiredWalkable === true &&
		!state.requiredWalkableStableIds.has(chunk.stableId)
	) {
		state.errors.push(
			`terrain collision chunk "${chunk.id}" stableId "${chunk.stableId}" is missing from readiness.requiredWalkableStableIds.`,
		);
	}
}

function validateRuntimeVisualBinding(
	binding: TerrainCookVisualBindingData,
	state: {
		readonly instances: ReadonlyMap<string, LevelPrefabInstanceData>;
		readonly prefabs: ReadonlyMap<string, PrefabData>;
		readonly errors: string[];
	},
): void {
	const instance = state.instances.get(binding.stableId);
	const prefab = state.prefabs.get(binding.prefabId);

	if (!instance) {
		state.errors.push(
			`terrain visual binding "${binding.id}" stableId "${binding.stableId}" is missing from runtime level instances.`,
		);
		return;
	}

	if (instance.prefabId !== binding.prefabId) {
		state.errors.push(
			`terrain visual binding "${binding.id}" stableId "${binding.stableId}" expects prefab "${binding.prefabId}", but runtime instance uses "${instance.prefabId}".`,
		);
	}

	if (!prefab) {
		state.errors.push(
			`terrain visual binding "${binding.id}" references missing prefab "${binding.prefabId}".`,
		);
	}
}

function validateRuntimeTerrainPackage(
	terrainPackage: TerrainChunkPackageData,
	state: {
		readonly instances: ReadonlyMap<string, LevelPrefabInstanceData>;
		readonly prefabs: ReadonlyMap<string, PrefabData>;
		readonly requiredTerrainPackageIds: ReadonlySet<string>;
		readonly terrainPackages: ReadonlyMap<string, TerrainChunkPackageData>;
		readonly errors: string[];
	},
): void {
	const runtimePackage = state.terrainPackages.get(terrainPackage.id);

	if (!state.requiredTerrainPackageIds.has(terrainPackage.id)) {
		state.errors.push(
			`terrain package "${terrainPackage.id}" is missing from readiness.requiredTerrainPackageIds.`,
		);
	}

	if (!runtimePackage) {
		state.errors.push(
			`terrain package "${terrainPackage.id}" is missing from runtime manifest terrainPackages.`,
		);
	} else if (!sameValue(runtimePackage, terrainPackage)) {
		state.errors.push(
			`terrain package "${terrainPackage.id}" does not match cooked terrain package data.`,
		);
	}

	for (const chunk of terrainPackage.chunks) {
		const instance = state.instances.get(chunk.stableId);

		if (!instance) {
			state.errors.push(
				`terrain package "${terrainPackage.id}" chunk "${chunk.stableId}" is missing from runtime level instances.`,
			);
			continue;
		}

		if (isRecord(instance.components?.Collider)) {
			state.errors.push(
				`terrain package "${terrainPackage.id}" chunk "${chunk.stableId}" must not ship an active Collider component.`,
			);
		}

		if (isRecord(instance.components?.RigidBody)) {
			state.errors.push(
				`terrain package "${terrainPackage.id}" chunk "${chunk.stableId}" must not ship an active RigidBody component.`,
			);
		}

		const prefab = state.prefabs.get(instance.prefabId);
		const cell = isRecord(instance.components?.TerrainChunkCell)
			? instance.components.TerrainChunkCell
			: prefab?.components.TerrainChunkCell;

		if (!isRecord(cell)) {
			state.errors.push(
				`terrain package "${terrainPackage.id}" chunk "${chunk.stableId}" must resolve to TerrainChunkCell metadata.`,
			);
		} else if (cell.packageId !== terrainPackage.id) {
			state.errors.push(
				`terrain package "${terrainPackage.id}" chunk "${chunk.stableId}" TerrainChunkCell.packageId must be "${terrainPackage.id}".`,
			);
		}
	}
}

function effectiveCollider(
	prefab: PrefabData,
	instance: LevelPrefabInstanceData,
): unknown {
	return isRecord(instance.components?.Collider)
		? instance.components.Collider
		: prefab.components.Collider;
}

function mapPrefabsById(
	prefabs: readonly PrefabData[],
): ReadonlyMap<string, PrefabData> {
	return new Map(prefabs.map((prefab) => [prefab.id, prefab] as const));
}

function mapInstancesByStableId(
	instances: readonly LevelPrefabInstanceData[],
): ReadonlyMap<string, LevelPrefabInstanceData> {
	return new Map(
		instances.map((instance) => [instance.stableId, instance] as const),
	);
}
