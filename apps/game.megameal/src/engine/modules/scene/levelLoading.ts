import type { Entity, World } from "../../core/index.js";
import { type LevelData, levelDefinitionValidator } from "../../data/index.js";
import type { AssetManagerPort } from "../assets/index.js";
import type { SceneScope } from "./index.js";

export type LevelDefinition = LevelData;

export type LevelPrefabInstance = LevelData["instances"][number];

export type LevelPrefabSpawnOptions = {
	readonly stableId?: string;
	readonly components?: Record<string, unknown>;
	readonly transform?: LevelPrefabInstance["transform"];
	readonly scope?: SceneScope;
};

export type LevelPrefabSpawnResult = {
	readonly entity: Entity;
	readonly prefabId: string;
	readonly stableId: string;
};

export type LevelPrefabSpawner = {
	spawnPrefab(
		world: World,
		prefabId: string,
		options?: LevelPrefabSpawnOptions,
	): LevelPrefabSpawnResult;
};

export type LevelLoadOptions = {
	readonly scope?: SceneScope;
	readonly assets?: AssetManagerPort;
};

export type LevelLoadResult = {
	readonly levelId: string;
	readonly sceneId?: string;
	readonly spawned: readonly LevelPrefabSpawnResult[];
	readonly preloadedAssets: readonly string[];
	readonly preloadedGroups: readonly string[];
};

export class LevelRegistry {
	#levels = new Map<string, LevelDefinition>();

	constructor(levels: readonly LevelDefinition[] = []) {
		for (const level of levels) {
			this.register(level);
		}
	}

	register(level: LevelDefinition): void {
		levelDefinitionValidator.parse(level);

		if (this.#levels.has(level.id)) {
			throw new Error(`Level "${level.id}" is already registered.`);
		}

		this.#levels.set(level.id, cloneValue(level));
	}

	has(levelId: string): boolean {
		return this.#levels.has(levelId);
	}

	get(levelId: string): LevelDefinition {
		const level = this.#levels.get(levelId);

		if (!level) {
			throw new Error(`Level "${levelId}" is not registered.`);
		}

		return cloneValue(level);
	}

	list(): readonly LevelDefinition[] {
		return [...this.#levels.values()]
			.sort((left, right) => left.id.localeCompare(right.id))
			.map((level) => cloneValue(level));
	}
}

export class LevelLoader {
	readonly prefabs: LevelPrefabSpawner;
	readonly levels: LevelRegistry;
	readonly assets: AssetManagerPort | undefined;

	constructor(options: {
		readonly prefabs: LevelPrefabSpawner;
		readonly levels?: LevelRegistry;
		readonly assets?: AssetManagerPort;
	}) {
		this.prefabs = options.prefabs;
		this.levels = options.levels ?? new LevelRegistry();
		this.assets = options.assets;
	}

	async loadLevel(
		world: World,
		levelId: string,
		options: LevelLoadOptions = {},
	): Promise<LevelLoadResult> {
		return this.loadDefinition(world, this.levels.get(levelId), options);
	}

	async loadDefinition(
		world: World,
		level: LevelDefinition,
		options: LevelLoadOptions = {},
	): Promise<LevelLoadResult> {
		levelDefinitionValidator.parse(level);

		const assets = options.assets ?? this.assets;
		const preloadedGroups = [...(level.preloadGroups ?? [])].sort();
		const preloadedAssetSet = new Set(level.preload ?? []);

		if (assets) {
			for (const groupId of preloadedGroups) {
				for (const assetId of assets.getPreloadGroup(groupId)) {
					preloadedAssetSet.add(assetId);
				}
			}
		}

		const preloadedAssets = [...preloadedAssetSet].sort();

		if (assets && preloadedAssets.length > 0) {
			for (const assetId of preloadedAssets) {
				assets.retain(assetId);
				options.scope?.registerAsset(assetId, (ownedAssetId) => {
					assets.release(ownedAssetId);
				});
			}

			await assets.preload(preloadedAssets);
		}

		if (level.resources) {
			for (const [resourceName, resource] of Object.entries(level.resources)) {
				world.setResource(resourceName, cloneValue(resource));
			}
		}

		const spawned = level.instances.map((instance) =>
			this.prefabs.spawnPrefab(world, instance.prefabId, {
				stableId: instance.stableId,
				...(instance.components ? { components: instance.components } : {}),
				...(instance.transform ? { transform: instance.transform } : {}),
				...(options.scope ? { scope: options.scope } : {}),
			}),
		);

		return {
			levelId: level.id,
			...(level.sceneId ? { sceneId: level.sceneId } : {}),
			spawned,
			preloadedAssets,
			preloadedGroups,
		};
	}
}

function cloneValue<TValue>(value: TValue): TValue {
	return JSON.parse(JSON.stringify(value)) as TValue;
}
