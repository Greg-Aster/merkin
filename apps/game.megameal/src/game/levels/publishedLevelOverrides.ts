import {
	publishedLevelInstanceComponentOverrides,
	publishedLevelInstanceComponentRemovals,
	publishedLevelInstanceInsertions,
	publishedLevelInstancePrefabOverrides,
	publishedLevelInstanceRemovals,
	publishedLevelInstanceTransformOverrides,
} from "../generated/publishedLevelTransforms.js";
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

export type PublishedLevelInstanceInsertion = {
	readonly schemaVersion: 1;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly instance: LevelPrefabInstance;
	readonly sourceTransactionId: string;
	readonly contentHash: string;
};

export type PublishedLevelInstancePrefabOverride = {
	readonly schemaVersion: 1;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly stableId: string;
	readonly prefabId: string;
	readonly sourceTransactionId: string;
	readonly contentHash: string;
};

export type PublishedLevelInstanceComponentOverride = {
	readonly schemaVersion: 1;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly stableId: string;
	readonly componentName: string;
	readonly value: Record<string, unknown>;
	readonly sourceTransactionId: string;
	readonly contentHash: string;
};

export type PublishedLevelInstanceComponentRemoval = {
	readonly schemaVersion: 1;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly stableId: string;
	readonly componentName: string;
	readonly sourceTransactionId: string;
	readonly contentHash: string;
};

export type PublishedLevelInstanceRemoval = {
	readonly schemaVersion: 1;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly stableId: string;
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

	const levelWithComponentOverrides =
		applyPublishedLevelInstanceComponentRemovals({
			runtimeSceneId: options.runtimeSceneId,
			level: applyPublishedLevelInstanceComponentOverrides({
				runtimeSceneId: options.runtimeSceneId,
				level: applyPublishedLevelInstancePrefabOverrides({
					runtimeSceneId: options.runtimeSceneId,
					level: applyPublishedLevelInstanceInsertions(options),
				}),
			}),
		});

	if (overrides.length === 0) {
		return applyPublishedLevelInstanceRemovals({
			runtimeSceneId: options.runtimeSceneId,
			level: levelWithComponentOverrides,
		});
	}

	const overridesByStableId = new Map(
		overrides.map((override) => [override.stableId, override] as const),
	);
	const overriddenStableIds = new Set<string>();
	const instances = levelWithComponentOverrides.instances.map((instance) => {
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

	const levelWithTransformOverrides = {
		...levelWithComponentOverrides,
		instances,
	};

	return applyPublishedLevelInstanceRemovals({
		runtimeSceneId: options.runtimeSceneId,
		level: levelWithTransformOverrides,
	});
}

function applyPublishedLevelInstanceInsertions(options: {
	readonly runtimeSceneId: string;
	readonly level: LevelDefinition;
}): LevelDefinition {
	const insertions = publishedLevelInstanceInsertions.filter(
		(insertion) =>
			insertion.runtimeSceneId === options.runtimeSceneId &&
			insertion.levelId === options.level.id,
	);

	if (insertions.length === 0) {
		return options.level;
	}

	const existingStableIds = new Set(
		options.level.instances.map((instance) => instance.stableId),
	);
	const insertedStableIds = new Set<string>();
	const insertedInstances = insertions.map((insertion) => {
		if (existingStableIds.has(insertion.instance.stableId)) {
			throw new Error(
				`Published level instance insertion for "${options.runtimeSceneId}" duplicates existing stable ID "${insertion.instance.stableId}".`,
			);
		}

		if (insertedStableIds.has(insertion.instance.stableId)) {
			throw new Error(
				`Published level instance insertions for "${options.runtimeSceneId}" duplicate stable ID "${insertion.instance.stableId}".`,
			);
		}

		insertedStableIds.add(insertion.instance.stableId);
		return cloneInstance(insertion.instance);
	});

	return {
		...options.level,
		instances: [...options.level.instances, ...insertedInstances],
	};
}

function applyPublishedLevelInstancePrefabOverrides(options: {
	readonly runtimeSceneId: string;
	readonly level: LevelDefinition;
}): LevelDefinition {
	const overrides = publishedLevelInstancePrefabOverrides.filter(
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
		return {
			...instance,
			prefabId: override.prefabId,
		};
	});
	const missingStableIds = [...overridesByStableId.keys()].filter(
		(stableId) => !overriddenStableIds.has(stableId),
	);

	if (missingStableIds.length > 0) {
		throw new Error(
			`Published level prefab overrides for "${options.runtimeSceneId}" reference missing stable IDs: ${missingStableIds.join(", ")}`,
		);
	}

	return {
		...options.level,
		instances,
	};
}

function applyPublishedLevelInstanceComponentOverrides(options: {
	readonly runtimeSceneId: string;
	readonly level: LevelDefinition;
}): LevelDefinition {
	const overrides = publishedLevelInstanceComponentOverrides.filter(
		(override) =>
			override.runtimeSceneId === options.runtimeSceneId &&
			override.levelId === options.level.id,
	);

	if (overrides.length === 0) {
		return options.level;
	}

	const overridesByStableId = new Map<
		string,
		PublishedLevelInstanceComponentOverride[]
	>();

	for (const override of overrides) {
		overridesByStableId.set(override.stableId, [
			...(overridesByStableId.get(override.stableId) ?? []),
			override,
		]);
	}

	const overriddenStableIds = new Set<string>();
	const instances = options.level.instances.map((instance) => {
		const instanceOverrides = overridesByStableId.get(instance.stableId);

		if (!instanceOverrides) {
			return instance;
		}

		overriddenStableIds.add(instance.stableId);
		return applyComponentOverrides(instance, instanceOverrides);
	});
	const missingStableIds = [...overridesByStableId.keys()].filter(
		(stableId) => !overriddenStableIds.has(stableId),
	);

	if (missingStableIds.length > 0) {
		throw new Error(
			`Published level component overrides for "${options.runtimeSceneId}" reference missing stable IDs: ${missingStableIds.join(", ")}`,
		);
	}

	return {
		...options.level,
		instances,
	};
}

function applyPublishedLevelInstanceComponentRemovals(options: {
	readonly runtimeSceneId: string;
	readonly level: LevelDefinition;
}): LevelDefinition {
	const removals = publishedLevelInstanceComponentRemovals.filter(
		(removal) =>
			removal.runtimeSceneId === options.runtimeSceneId &&
			removal.levelId === options.level.id,
	);

	if (removals.length === 0) {
		return options.level;
	}

	const removalsByStableId = new Map<
		string,
		PublishedLevelInstanceComponentRemoval[]
	>();

	for (const removal of removals) {
		removalsByStableId.set(removal.stableId, [
			...(removalsByStableId.get(removal.stableId) ?? []),
			removal,
		]);
	}

	const removedStableIds = new Set<string>();
	const instances = options.level.instances.map((instance) => {
		const instanceRemovals = removalsByStableId.get(instance.stableId);

		if (!instanceRemovals) {
			return instance;
		}

		removedStableIds.add(instance.stableId);
		return applyComponentRemovals(instance, instanceRemovals);
	});
	const missingStableIds = [...removalsByStableId.keys()].filter(
		(stableId) => !removedStableIds.has(stableId),
	);

	if (missingStableIds.length > 0) {
		throw new Error(
			`Published level component removals for "${options.runtimeSceneId}" reference missing stable IDs: ${missingStableIds.join(", ")}`,
		);
	}

	return {
		...options.level,
		instances,
	};
}

function applyPublishedLevelInstanceRemovals(options: {
	readonly runtimeSceneId: string;
	readonly level: LevelDefinition;
}): LevelDefinition {
	const removals = publishedLevelInstanceRemovals.filter(
		(removal) =>
			removal.runtimeSceneId === options.runtimeSceneId &&
			removal.levelId === options.level.id,
	);

	if (removals.length === 0) {
		return options.level;
	}

	const removalsByStableId = new Map(
		removals.map((removal) => [removal.stableId, removal] as const),
	);
	const removedStableIds = new Set<string>();
	const instances = options.level.instances.filter((instance) => {
		if (!removalsByStableId.has(instance.stableId)) {
			return true;
		}

		removedStableIds.add(instance.stableId);
		return false;
	});
	const missingStableIds = [...removalsByStableId.keys()].filter(
		(stableId) => !removedStableIds.has(stableId),
	);

	if (missingStableIds.length > 0) {
		throw new Error(
			`Published level instance removals for "${options.runtimeSceneId}" reference missing stable IDs: ${missingStableIds.join(", ")}`,
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

function applyComponentOverrides(
	instance: LevelPrefabInstance,
	overrides: readonly PublishedLevelInstanceComponentOverride[],
): LevelPrefabInstance {
	const components = cloneRecord(instance.components ?? {});

	for (const override of overrides) {
		components[override.componentName] = cloneRecord(override.value);
	}

	return {
		...instance,
		components,
	};
}

function applyComponentRemovals(
	instance: LevelPrefabInstance,
	removals: readonly PublishedLevelInstanceComponentRemoval[],
): LevelPrefabInstance {
	const components = cloneRecord(instance.components ?? {});

	for (const removal of removals) {
		delete components[removal.componentName];
	}

	return {
		...instance,
		components,
	};
}

function cloneInstance(instance: LevelPrefabInstance): LevelPrefabInstance {
	return {
		...instance,
		...(instance.components === undefined
			? {}
			: { components: cloneRecord(instance.components) }),
		...(instance.transform === undefined
			? {}
			: {
					transform: {
						...(instance.transform.position === undefined
							? {}
							: { position: [...instance.transform.position] }),
						...(instance.transform.rotation === undefined
							? {}
							: { rotation: [...instance.transform.rotation] }),
						...(instance.transform.scale === undefined
							? {}
							: { scale: [...instance.transform.scale] }),
					},
				}),
	};
}

function cloneRecord(value: Record<string, unknown>): Record<string, unknown> {
	return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}
