import type { LevelPrefabInstanceData, PrefabData } from "../schemas/index.js";
import { runtimeSceneManifestValidator } from "../schemas/index.js";
import { cloneValue, hashStableValue } from "./stableValue.js";
import type {
	LevelEditorAuthoringDocument,
	LevelEditorAuthoringProjectionOptions,
	LevelEditorAuthoringRecord,
} from "./types.js";

export function projectRuntimeSceneManifestToAuthoringDocument(
	manifestInput: unknown,
	options: LevelEditorAuthoringProjectionOptions,
): LevelEditorAuthoringDocument {
	const manifest = runtimeSceneManifestValidator.parse(manifestInput);
	const sourceManifestHash = hashStableValue(manifest);
	const prefabsById = new Map(
		manifest.prefabs.map((prefab) => [prefab.id, prefab] as const),
	);
	const records = manifest.level.instances.map((instance) =>
		projectLevelInstanceRecord({
			instance,
			prefab: prefabsById.get(instance.prefabId),
			levelOwnerId: options.provenance.level.ownerId,
			prefabsOwnerId: options.provenance.prefabs.ownerId,
		}),
	);
	const documentWithoutHash = {
		schemaVersion: 1 as const,
		runtimeSceneId: manifest.id,
		levelId: manifest.level.id,
		sourceManifest: {
			id: manifest.id,
			generatedAt: manifest.generatedAt,
			source: cloneValue(manifest.source),
			contentHash: sourceManifestHash,
		},
		provenance: cloneValue(options.provenance),
		runtimeSceneCatalogIds: [...options.runtimeSceneCatalogIds],
		level:
			manifest.level.sceneId === undefined
				? { id: manifest.level.id }
				: { id: manifest.level.id, sceneId: manifest.level.sceneId },
		prefabIds: manifest.prefabs.map((prefab) => prefab.id),
		assetIds: manifest.assets.assets.map((asset) => asset.id),
		renderProfileId: manifest.renderProfile.id,
		terrainPackageIds: (manifest.terrainPackages ?? []).map(
			(terrainPackage) => terrainPackage.id,
		),
		records,
	};

	return {
		...documentWithoutHash,
		contentHash: hashStableValue(documentWithoutHash),
	};
}

function projectLevelInstanceRecord(options: {
	readonly instance: LevelPrefabInstanceData;
	readonly prefab: PrefabData | undefined;
	readonly levelOwnerId: string;
	readonly prefabsOwnerId: string;
}): LevelEditorAuthoringRecord {
	const prefabComponents = cloneValue(options.prefab?.components ?? {});
	const instanceComponents =
		options.instance.components === undefined
			? undefined
			: cloneValue(options.instance.components);
	const components = {
		...prefabComponents,
		...(instanceComponents ?? {}),
	};
	const componentOwnerIds: Record<string, string> = {};

	for (const componentName of Object.keys(prefabComponents)) {
		componentOwnerIds[componentName] = options.prefabsOwnerId;
	}

	for (const componentName of Object.keys(instanceComponents ?? {})) {
		componentOwnerIds[componentName] = options.levelOwnerId;
	}

	const record = {
		stableId: options.instance.stableId,
		instanceId: options.instance.id,
		prefabId: options.instance.prefabId,
		ownerIds: {
			level: options.levelOwnerId,
			prefabs: options.prefabsOwnerId,
		},
		components,
		prefabComponents,
		componentOwnerIds,
	};

	return {
		...record,
		...(options.instance.transform === undefined
			? {}
			: { transform: cloneValue(options.instance.transform) }),
		...(instanceComponents === undefined ? {} : { instanceComponents }),
	};
}
