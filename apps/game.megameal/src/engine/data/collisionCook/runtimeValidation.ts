import type {
	LevelPrefabInstanceData,
	PrefabData,
	RuntimeSceneManifestData,
} from "../schemas/types.js";
import type {
	CollisionCookPlan,
	CollisionCookPlanEntry,
	CollisionCookRuntimeValidationResult,
} from "./types.js";
import { isRecord, sameValue } from "./utils.js";

export function validateCollisionCookPlanAgainstRuntimeScene(options: {
	readonly plan: CollisionCookPlan;
	readonly manifest: RuntimeSceneManifestData;
}): CollisionCookRuntimeValidationResult {
	const { plan, manifest } = options;
	const errors: string[] = [];
	const prefabs = mapPrefabsById(manifest.prefabs);
	const instances = mapInstancesByStableId(manifest.level.instances);
	const requiredCollisionPrefabIds = new Set(
		manifest.readiness.requiredCollisionPrefabIds ?? [],
	);
	const requiredCollisionStableIds = new Set(
		manifest.readiness.requiredCollisionStableIds ?? [],
	);
	const requiredWalkableStableIds = new Set(
		manifest.readiness.requiredWalkableStableIds ?? [],
	);

	if (manifest.id !== plan.runtimeSceneId) {
		errors.push(
			`collision cook plan "${plan.draftId}" targets runtime scene "${plan.runtimeSceneId}", but manifest is "${manifest.id}".`,
		);
	}

	if (manifest.level.id !== plan.levelId) {
		errors.push(
			`collision cook plan "${plan.draftId}" targets level "${plan.levelId}", but manifest level is "${manifest.level.id}".`,
		);
	}

	for (const entry of plan.entries) {
		const instance = instances.get(entry.stableId);
		const prefab = prefabs.get(entry.prefabId);

		if (!instance) {
			errors.push(
				`collision cook entry "${entry.id}" stableId "${entry.stableId}" is not present in manifest "${manifest.id}".`,
			);
			continue;
		}

		if (instance.prefabId !== entry.prefabId) {
			errors.push(
				`collision cook entry "${entry.id}" stableId "${entry.stableId}" expects prefab "${entry.prefabId}", but runtime instance uses "${instance.prefabId}".`,
			);
		}

		if (!prefab) {
			errors.push(
				`collision cook entry "${entry.id}" references missing prefab "${entry.prefabId}" in manifest "${manifest.id}".`,
			);
			continue;
		}

		validateCookTarget(entry, prefab, instance, errors);
		validateCookedRuntimeCollider(entry, prefab, instance, errors);
		validateCookedRuntimeTransform(entry, instance, errors);
		validateCookedRuntimeReadiness(entry, {
			requiredCollisionPrefabIds,
			requiredCollisionStableIds,
			requiredWalkableStableIds,
			errors,
		});
	}

	for (const prefabId of plan.requiredCollisionPrefabIds) {
		if (!requiredCollisionPrefabIds.has(prefabId)) {
			errors.push(
				`collision cook plan "${plan.draftId}" required collision prefab "${prefabId}" is missing from runtime readiness.`,
			);
		}
	}

	if (errors.length === 0) {
		return { ok: true, plan };
	}

	return { ok: false, plan, errors };
}

function validateCookTarget(
	entry: CollisionCookPlanEntry,
	prefab: PrefabData,
	instance: LevelPrefabInstanceData,
	errors: string[],
): void {
	const targetCollider =
		entry.colliderTarget === "prefab"
			? prefab.components.Collider
			: instance.components?.Collider;

	if (!isRecord(targetCollider)) {
		errors.push(
			`collision cook entry "${entry.id}" targets ${entry.colliderTarget} collider output, but that target has no Collider component.`,
		);
		return;
	}

	if (!sameValue(targetCollider, entry.colliderComponent)) {
		errors.push(
			`collision cook entry "${entry.id}" target ${entry.colliderTarget} Collider does not match the authored draft.`,
		);
	}
}

function validateCookedRuntimeCollider(
	entry: CollisionCookPlanEntry,
	prefab: PrefabData,
	instance: LevelPrefabInstanceData,
	errors: string[],
): void {
	const runtimeCollider = effectiveCollider(prefab, instance);

	if (!isRecord(runtimeCollider)) {
		errors.push(
			`collision cook entry "${entry.id}" stableId "${entry.stableId}" has no effective runtime Collider.`,
		);
		return;
	}

	if (!sameValue(runtimeCollider, entry.colliderComponent)) {
		errors.push(
			`collision cook entry "${entry.id}" effective runtime Collider does not match the authored draft.`,
		);
	}
}

function validateCookedRuntimeTransform(
	entry: CollisionCookPlanEntry,
	instance: LevelPrefabInstanceData,
	errors: string[],
): void {
	if (entry.transform === undefined) {
		return;
	}

	if (!sameValue(instance.transform, entry.transform)) {
		errors.push(
			`collision cook entry "${entry.id}" runtime transform does not match the authored draft.`,
		);
	}
}

function validateCookedRuntimeReadiness(
	entry: CollisionCookPlanEntry,
	state: {
		readonly requiredCollisionPrefabIds: ReadonlySet<string>;
		readonly requiredCollisionStableIds: ReadonlySet<string>;
		readonly requiredWalkableStableIds: ReadonlySet<string>;
		readonly errors: string[];
	},
): void {
	if (!entry.readiness.requiredCollision) {
		return;
	}

	if (!state.requiredCollisionPrefabIds.has(entry.prefabId)) {
		state.errors.push(
			`collision cook entry "${entry.id}" prefab "${entry.prefabId}" is missing from readiness.requiredCollisionPrefabIds.`,
		);
	}

	if (!state.requiredCollisionStableIds.has(entry.stableId)) {
		state.errors.push(
			`collision cook entry "${entry.id}" stableId "${entry.stableId}" is missing from readiness.requiredCollisionStableIds.`,
		);
	}

	if (
		entry.readiness.requiredWalkable === true &&
		!state.requiredWalkableStableIds.has(entry.stableId)
	) {
		state.errors.push(
			`collision cook entry "${entry.id}" stableId "${entry.stableId}" is missing from readiness.requiredWalkableStableIds.`,
		);
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
