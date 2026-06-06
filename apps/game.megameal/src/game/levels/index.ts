import { levelDefinitionValidator } from "../../engine/data/index.js";
import type { World } from "../../engine/index.js";
import type { AssetManagerPort } from "../../engine/modules/assets/index.js";
import type { SceneScope } from "../../engine/modules/scene/index.js";
import type {
	PrefabRegistry,
	PrefabSpawnResult,
	TransformOverride,
} from "../prefabs/index.js";

export {
	defaultLevels,
	mirandaDeckLevel,
	prototypeLevel,
} from "./defaultLevels.js";
export { observatoryLevel } from "./observatoryLevel.js";
export { portalArenaLevel } from "./portalArenaLevel.js";
export {
	defaultRuntimeSceneManifest,
	defaultRuntimeSceneManifests,
	getRuntimeSceneManifest,
	mirandaDeckRuntimeSceneManifest,
	observatoryRuntimeSceneManifest,
	portalArenaRuntimeSceneManifest,
	prototypeRuntimeSceneManifest,
} from "./runtimeSceneManifests.js";
export {
	mirandaDeckRenderProfile,
	observatoryRenderProfile,
	portalArenaRenderProfile,
	prototypeRenderProfile,
} from "./renderProfiles.js";

export type LevelDefinition = {
	readonly id: string;
	readonly sceneId?: string;
	readonly preload?: readonly string[];
	readonly preloadGroups?: readonly string[];
	readonly resources?: Record<string, unknown>;
	readonly instances: readonly LevelPrefabInstance[];
};

export type LevelPrefabInstance = {
	readonly id: string;
	readonly prefabId: string;
	readonly stableId: string;
	readonly components?: Record<string, unknown>;
	readonly transform?: TransformOverride;
};

export type LevelLoadOptions = {
	readonly scope?: SceneScope;
	readonly assets?: AssetManagerPort;
};

export type LevelLoadResult = {
	readonly levelId: string;
	readonly sceneId?: string;
	readonly spawned: readonly PrefabSpawnResult[];
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
	readonly prefabs: PrefabRegistry;
	readonly levels: LevelRegistry;
	readonly assets: AssetManagerPort | undefined;

	constructor(options: {
		readonly prefabs: PrefabRegistry;
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
