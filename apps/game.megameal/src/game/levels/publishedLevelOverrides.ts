import { publishedLevelInstanceTransformOverrides } from "../generated/publishedLevelTransforms.js";
import type { TransformOverride } from "../prefabs/index.js";
import type { LevelDefinition, LevelPrefabInstance } from "./index.js";

export type PublishedLevelInstanceTransformOverride = {
	readonly schemaVersion: 1;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly stableId: string;
	readonly transform: TransformOverride;
	readonly sourceTransactionId: string;
	readonly contentHash: string;
};

export function applyPublishedLevelInstanceTransformOverrides(options: {
	readonly runtimeSceneId: string;
	readonly level: LevelDefinition;
}): LevelDefinition {
	const overrides = publishedLevelInstanceTransformOverrides.filter(
		(override) =>
			override.runtimeSceneId === options.runtimeSceneId &&
			override.levelId === options.level.id,
	);

	if (overrides.length === 0) {
		return options.level;
	}

	const overridesByStableId = new Map(
		overrides.map((override) => [override.stableId, override] as const),
	);
	const overriddenStableIds = new Set<string>();
	const instances = options.level.instances.map((instance) => {
		const override = overridesByStableId.get(instance.stableId);

		if (!override) {
			return instance;
		}

		overriddenStableIds.add(instance.stableId);
		return applyTransformOverride(instance, override.transform);
	});
	const missingStableIds = [...overridesByStableId.keys()].filter(
		(stableId) => !overriddenStableIds.has(stableId),
	);

	if (missingStableIds.length > 0) {
		throw new Error(
			`Published level transform overrides for "${options.runtimeSceneId}" reference missing stable IDs: ${missingStableIds.join(", ")}`,
		);
	}

	return {
		...options.level,
		instances,
	};
}

function applyTransformOverride(
	instance: LevelPrefabInstance,
	transform: TransformOverride,
): LevelPrefabInstance {
	return {
		...instance,
		transform: {
			...(instance.transform ?? {}),
			...(transform.position === undefined
				? {}
				: { position: [...transform.position] }),
			...(transform.rotation === undefined
				? {}
				: { rotation: [...transform.rotation] }),
			...(transform.scale === undefined ? {} : { scale: [...transform.scale] }),
		},
	};
}
