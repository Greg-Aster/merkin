import { validateAssetManifest } from "./assetSchema.js";
import {
	isRecord,
	requireString,
	validateOptionalStringArray,
} from "./helpers.js";
import {
	validateLevelDefinition,
	validatePrefabDefinition,
} from "./levelSchema.js";
import { validateRenderProfile } from "./renderProfileSchema.js";
import { validateTerrainPackages } from "./terrainPackageSchema.js";
import type {
	AssetManifestEntryData,
	CubemapEnvironmentData,
	EquirectangularEnvironmentData,
	LevelPrefabInstanceData,
	PrefabData,
	RenderProfileEnvironmentData,
	RuntimeSceneManifestData,
	VideoSkyboxEnvironmentData,
} from "./types.js";
import { createSchemaValidator } from "./validation.js";

export const runtimeSceneManifestValidator =
	createSchemaValidator<RuntimeSceneManifestData>(
		"RuntimeSceneManifest",
		validateRuntimeSceneManifest,
	);

export function validateRuntimeSceneManifest(data: unknown): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(data)) {
		return ["Runtime scene manifest must be an object."];
	}

	if (data.schemaVersion !== 1) {
		errors.push("runtimeSceneManifest.schemaVersion must be 1.");
	}

	requireString(data, "id", "runtimeSceneManifest.id", errors);
	requireString(
		data,
		"generatedAt",
		"runtimeSceneManifest.generatedAt",
		errors,
	);

	if (!isRecord(data.source)) {
		errors.push("runtimeSceneManifest.source must be an object.");
	} else {
		if (
			data.source.kind !== "prototype" &&
			data.source.kind !== "authored" &&
			data.source.kind !== "cook"
		) {
			errors.push(
				"runtimeSceneManifest.source.kind must be prototype, authored, or cook.",
			);
		}

		requireString(data.source, "id", "runtimeSceneManifest.source.id", errors);
	}

	const levelErrors = validateLevelDefinition(data.level);
	for (const error of levelErrors) {
		errors.push(`runtimeSceneManifest.level: ${error}`);
	}

	const assetErrors = validateAssetManifest(data.assets);
	for (const error of assetErrors) {
		errors.push(`runtimeSceneManifest.assets: ${error}`);
	}

	const renderProfileErrors = validateRenderProfile(data.renderProfile);
	for (const error of renderProfileErrors) {
		errors.push(`runtimeSceneManifest.renderProfile: ${error}`);
	}

	if (data.terrainPackages !== undefined) {
		validateTerrainPackages(
			data.terrainPackages,
			"runtimeSceneManifest.terrainPackages",
			errors,
		);
	}

	if (!Array.isArray(data.prefabs)) {
		errors.push("runtimeSceneManifest.prefabs must be an array.");
	} else {
		for (const [index, prefab] of data.prefabs.entries()) {
			const prefabErrors = validatePrefabDefinition(prefab);

			for (const error of prefabErrors) {
				errors.push(`runtimeSceneManifest.prefabs.${index}: ${error}`);
			}
		}
	}

	if (!isRecord(data.readiness)) {
		errors.push("runtimeSceneManifest.readiness must be an object.");
	} else {
		requireString(
			data.readiness,
			"playerStableId",
			"runtimeSceneManifest.readiness.playerStableId",
			errors,
		);
		validateOptionalStringArray(
			data.readiness.requiredAssetIds,
			"runtimeSceneManifest.readiness.requiredAssetIds",
			errors,
		);
		validateOptionalStringArray(
			data.readiness.requiredCollisionPrefabIds,
			"runtimeSceneManifest.readiness.requiredCollisionPrefabIds",
			errors,
		);
		validateOptionalStringArray(
			data.readiness.requiredCollisionStableIds,
			"runtimeSceneManifest.readiness.requiredCollisionStableIds",
			errors,
		);
		validateOptionalStringArray(
			data.readiness.requiredWalkableStableIds,
			"runtimeSceneManifest.readiness.requiredWalkableStableIds",
			errors,
		);
		validateOptionalStringArray(
			data.readiness.requiredLightStableIds,
			"runtimeSceneManifest.readiness.requiredLightStableIds",
			errors,
		);
		validateOptionalStringArray(
			data.readiness.requiredTerrainPackageIds,
			"runtimeSceneManifest.readiness.requiredTerrainPackageIds",
			errors,
		);
	}

	if (
		levelErrors.length > 0 ||
		assetErrors.length > 0 ||
		renderProfileErrors.length > 0 ||
		!Array.isArray(data.prefabs) ||
		!isRecord(data.level) ||
		!isRecord(data.assets) ||
		!isRecord(data.renderProfile) ||
		!isRecord(data.readiness)
	) {
		return errors;
	}

	validateRuntimeSceneReferences(data as RuntimeSceneManifestData, errors);

	return errors;
}

function validateRuntimeSceneReferences(
	manifest: RuntimeSceneManifestData,
	errors: string[],
): void {
	const assetKinds = new Map(
		manifest.assets.assets.map((entry) => [entry.id, entry.kind] as const),
	);
	const assetsById = new Map(
		manifest.assets.assets.map((entry) => [entry.id, entry] as const),
	);
	const assetIds = new Set(assetKinds.keys());
	const preloadGroups = new Set(
		Object.keys(manifest.assets.preloadGroups ?? {}),
	);
	const scenePreloadAssetIds = new Set(manifest.level.preload ?? []);
	const readinessRequiredAssetIds = new Set(
		manifest.readiness.requiredAssetIds ?? [],
	);
	const terrainPackagesById = new Map(
		(manifest.terrainPackages ?? []).map(
			(terrainPackage) => [terrainPackage.id, terrainPackage] as const,
		),
	);
	const prefabs = new Map<string, PrefabData>();
	const instances = new Map<string, LevelPrefabInstanceData>();

	for (const groupId of manifest.level.preloadGroups ?? []) {
		for (const assetId of manifest.assets.preloadGroups?.[groupId] ?? []) {
			scenePreloadAssetIds.add(assetId);
		}
	}

	for (const prefab of manifest.prefabs) {
		if (prefabs.has(prefab.id)) {
			errors.push(
				`runtimeSceneManifest.prefabs contains duplicate prefab "${prefab.id}".`,
			);
		}

		prefabs.set(prefab.id, prefab);

		for (const assetId of prefab.assetIds ?? []) {
			if (!assetIds.has(assetId)) {
				errors.push(
					`runtimeSceneManifest.prefabs.${prefab.id}.assetIds references unknown asset "${assetId}".`,
				);
			}
		}

		validateRenderableAssetReferences(
			prefab.components,
			`runtimeSceneManifest.prefabs.${prefab.id}.components`,
			{
				assetKinds,
				prefabAssetIds: new Set(prefab.assetIds ?? []),
				scenePreloadAssetIds,
			},
			errors,
		);
	}

	validateRenderProfileEnvironmentReferences(
		manifest.renderProfile.environment,
		{
			assetsById,
			assetKinds,
			scenePreloadAssetIds,
			readinessRequiredAssetIds,
		},
		errors,
	);

	for (const assetId of manifest.level.preload ?? []) {
		if (!assetIds.has(assetId)) {
			errors.push(
				`runtimeSceneManifest.level.preload references unknown asset "${assetId}".`,
			);
		}
	}

	for (const groupId of manifest.level.preloadGroups ?? []) {
		if (!preloadGroups.has(groupId)) {
			errors.push(
				`runtimeSceneManifest.level.preloadGroups references unknown group "${groupId}".`,
			);
		}
	}

	for (const instance of manifest.level.instances) {
		if (instances.has(instance.stableId)) {
			errors.push(
				`runtimeSceneManifest.level.instances contains duplicate stable ID "${instance.stableId}".`,
			);
		}

		instances.set(instance.stableId, instance);

		if (!prefabs.has(instance.prefabId)) {
			errors.push(
				`runtimeSceneManifest.level.instances references unknown prefab "${instance.prefabId}".`,
			);
		}

		if (instance.components) {
			validateRenderableAssetReferences(
				instance.components,
				`runtimeSceneManifest.level.instances.${instance.stableId}.components`,
				{
					assetKinds,
					scenePreloadAssetIds,
				},
				errors,
			);
		}
	}

	for (const assetId of manifest.readiness.requiredAssetIds ?? []) {
		if (!assetIds.has(assetId)) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredAssetIds references unknown asset "${assetId}".`,
			);
		}
	}

	const playerStableId = manifest.readiness.playerStableId;
	const playerInstance = instances.get(playerStableId);

	if (!playerInstance) {
		errors.push(
			`runtimeSceneManifest.readiness.playerStableId "${playerStableId}" does not match a level instance stable ID.`,
		);
	}

	for (const prefabId of manifest.readiness.requiredCollisionPrefabIds ?? []) {
		const prefab = prefabs.get(prefabId);

		if (!prefab) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredCollisionPrefabIds references unknown prefab "${prefabId}".`,
			);
			continue;
		}

		if (
			!manifest.level.instances.some(
				(instance) => instance.prefabId === prefabId,
			)
		) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredCollisionPrefabIds "${prefabId}" is not spawned by the level.`,
			);
		}

		if (!isRecord(prefab.components.Collider)) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredCollisionPrefabIds "${prefabId}" has no Collider component.`,
			);
		}
	}

	for (const stableId of manifest.readiness.requiredCollisionStableIds ?? []) {
		const instance = instances.get(stableId);

		if (!instance) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredCollisionStableIds references unknown level instance stable ID "${stableId}".`,
			);
			continue;
		}

		const prefab = prefabs.get(instance.prefabId);

		if (!prefab) {
			continue;
		}

		if (
			!isRecord(prefab.components.Collider) &&
			!isRecord(instance.components?.Collider)
		) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredCollisionStableIds "${stableId}" resolves to prefab "${instance.prefabId}" with no Collider component.`,
			);
		}
	}

	for (const stableId of manifest.readiness.requiredWalkableStableIds ?? []) {
		const instance = instances.get(stableId);

		if (!instance) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredWalkableStableIds references unknown level instance stable ID "${stableId}".`,
			);
			continue;
		}

		const prefab = prefabs.get(instance.prefabId);

		if (!prefab) {
			continue;
		}

		const collider = isRecord(instance.components?.Collider)
			? instance.components.Collider
			: prefab.components.Collider;

		if (!isRecord(collider)) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredWalkableStableIds "${stableId}" resolves to prefab "${instance.prefabId}" with no Collider component.`,
			);
			continue;
		}

		if (collider.intent !== "walkable") {
			errors.push(
				`runtimeSceneManifest.readiness.requiredWalkableStableIds "${stableId}" resolves to Collider.intent "${String(collider.intent)}" instead of walkable.`,
			);
		}
	}

	for (const stableId of manifest.readiness.requiredLightStableIds ?? []) {
		const instance = instances.get(stableId);

		if (!instance) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredLightStableIds references unknown level instance stable ID "${stableId}".`,
			);
			continue;
		}

		const prefab = prefabs.get(instance.prefabId);

		if (!prefab) {
			continue;
		}

		if (
			!isRecord(prefab.components.Light) &&
			!isRecord(instance.components?.Light)
		) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredLightStableIds "${stableId}" resolves to prefab "${instance.prefabId}" with no Light component.`,
			);
		}
	}

	for (const packageId of manifest.readiness.requiredTerrainPackageIds ?? []) {
		const terrainPackage = terrainPackagesById.get(packageId);

		if (!terrainPackage) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredTerrainPackageIds references unknown terrain package "${packageId}".`,
			);
			continue;
		}

		if (terrainPackage.runtimeSceneId !== manifest.id) {
			errors.push(
				`runtimeSceneManifest.terrainPackages.${packageId}.runtimeSceneId "${terrainPackage.runtimeSceneId}" does not match manifest "${manifest.id}".`,
			);
		}

		for (const chunk of terrainPackage.chunks) {
			const instance = instances.get(chunk.stableId);

			if (!instance) {
				errors.push(
					`runtimeSceneManifest.terrainPackages.${packageId}.chunks.${chunk.stableId} references unknown level instance stable ID.`,
				);
				continue;
			}

			const prefab = prefabs.get(instance.prefabId);
			const cell = isRecord(instance.components?.TerrainChunkCell)
				? instance.components.TerrainChunkCell
				: prefab?.components.TerrainChunkCell;

			if (!isRecord(cell)) {
				errors.push(
					`runtimeSceneManifest.terrainPackages.${packageId}.chunks.${chunk.stableId} must resolve to a TerrainChunkCell component.`,
				);
			} else if (cell.packageId !== packageId) {
				errors.push(
					`runtimeSceneManifest.terrainPackages.${packageId}.chunks.${chunk.stableId} TerrainChunkCell.packageId must be "${packageId}".`,
				);
			}

			if (
				isRecord(instance.components?.Collider) ||
				isRecord(prefab?.components.Collider) ||
				isRecord(instance.components?.RigidBody) ||
				isRecord(prefab?.components.RigidBody)
			) {
				errors.push(
					`runtimeSceneManifest.terrainPackages.${packageId}.chunks.${chunk.stableId} must not ship active Collider or RigidBody components; terrain streaming activates them from package data.`,
				);
			}
		}

		for (const stableId of terrainPackage.startupChunkStableIds) {
			if (!instances.has(stableId)) {
				errors.push(
					`runtimeSceneManifest.terrainPackages.${packageId}.startupChunkStableIds references unknown level instance stable ID "${stableId}".`,
				);
			}
		}

		for (const stableId of terrainPackage.streamableChunkStableIds) {
			if (!instances.has(stableId)) {
				errors.push(
					`runtimeSceneManifest.terrainPackages.${packageId}.streamableChunkStableIds references unknown level instance stable ID "${stableId}".`,
				);
			}
		}

		for (const binding of terrainPackage.visualBindings) {
			const instance = instances.get(binding.stableId);

			if (!instance) {
				errors.push(
					`runtimeSceneManifest.terrainPackages.${packageId}.visualBindings.${binding.stableId} references unknown level instance stable ID.`,
				);
				continue;
			}

			if (instance.prefabId !== binding.prefabId) {
				errors.push(
					`runtimeSceneManifest.terrainPackages.${packageId}.visualBindings.${binding.stableId} expects prefab "${binding.prefabId}", but level instance uses "${instance.prefabId}".`,
				);
			}
		}
	}
}

function validateRenderProfileEnvironmentReferences(
	environment: RenderProfileEnvironmentData,
	options: {
		readonly assetsById: ReadonlyMap<string, AssetManifestEntryData>;
		readonly assetKinds: ReadonlyMap<string, string>;
		readonly scenePreloadAssetIds: ReadonlySet<string>;
		readonly readinessRequiredAssetIds: ReadonlySet<string>;
	},
	errors: string[],
): void {
	if (!isAssetBackedEnvironmentData(environment)) {
		return;
	}

	const actualKind = options.assetKinds.get(environment.assetId);

	if (actualKind === undefined) {
		errors.push(
			`runtimeSceneManifest.renderProfile.environment.assetId references unknown asset "${environment.assetId}".`,
		);
		return;
	}

	const expectedKind = environmentAssetKind(environment);

	if (expectedKind !== undefined && actualKind !== expectedKind) {
		errors.push(
			`runtimeSceneManifest.renderProfile.environment.assetId references ${actualKind} asset "${environment.assetId}", expected ${expectedKind}.`,
		);
	}

	const asset = options.assetsById.get(environment.assetId);

	if (
		environment.kind === "equirectangular-environment" &&
		asset?.projection !== "equirectangular"
	) {
		errors.push(
			`runtimeSceneManifest.renderProfile.environment.assetId "${environment.assetId}" must reference a texture asset with projection "equirectangular".`,
		);
	}

	if (!options.scenePreloadAssetIds.has(environment.assetId)) {
		errors.push(
			`runtimeSceneManifest.renderProfile.environment.assetId references asset "${environment.assetId}" that is not declared in the level preload set.`,
		);
	}

	if (
		environment.requiredForReadiness &&
		!options.readinessRequiredAssetIds.has(environment.assetId)
	) {
		errors.push(
			`runtimeSceneManifest.renderProfile.environment.assetId "${environment.assetId}" is required for readiness but is missing from runtimeSceneManifest.readiness.requiredAssetIds.`,
		);
	}
}

function environmentAssetKind(
	environment: RenderProfileEnvironmentData,
): "cubemap" | "texture" | "video" | undefined {
	switch (environment.kind) {
		case "cubemap-skybox":
			return "cubemap";
		case "equirectangular-environment":
			return "texture";
		case "video-skybox":
			return "video";
		case "solid-color":
		case "procedural-atmosphere":
			return undefined;
	}
}

function isAssetBackedEnvironmentData(
	environment: RenderProfileEnvironmentData,
): environment is
	| CubemapEnvironmentData
	| EquirectangularEnvironmentData
	| VideoSkyboxEnvironmentData {
	return (
		environment.kind === "cubemap-skybox" ||
		environment.kind === "equirectangular-environment" ||
		environment.kind === "video-skybox"
	);
}

function validateRenderableAssetReferences(
	components: Record<string, unknown>,
	path: string,
	options: {
		readonly assetKinds: ReadonlyMap<string, string>;
		readonly prefabAssetIds?: ReadonlySet<string>;
		readonly scenePreloadAssetIds: ReadonlySet<string>;
	},
	errors: string[],
): void {
	const renderable = components.Renderable;

	if (renderable === undefined) {
		return;
	}

	if (!isRecord(renderable)) {
		return;
	}

	validateRenderableAssetReference(
		renderable.meshId,
		"mesh",
		`${path}.Renderable.meshId`,
		options,
		errors,
	);

	if (renderable.materialId !== undefined) {
		validateRenderableAssetReference(
			renderable.materialId,
			"material",
			`${path}.Renderable.materialId`,
			options,
			errors,
		);
	}
}

function validateRenderableAssetReference(
	assetId: unknown,
	expectedKind: "mesh" | "material",
	path: string,
	options: {
		readonly assetKinds: ReadonlyMap<string, string>;
		readonly prefabAssetIds?: ReadonlySet<string>;
		readonly scenePreloadAssetIds: ReadonlySet<string>;
	},
	errors: string[],
): void {
	if (typeof assetId !== "string") {
		return;
	}

	const actualKind = options.assetKinds.get(assetId);

	if (actualKind === undefined) {
		errors.push(`${path} references unknown asset "${assetId}".`);
		return;
	}

	if (actualKind !== expectedKind) {
		errors.push(
			`${path} references ${actualKind} asset "${assetId}", expected ${expectedKind}.`,
		);
	}

	if (
		options.prefabAssetIds !== undefined &&
		!options.prefabAssetIds.has(assetId)
	) {
		errors.push(
			`${path} references asset "${assetId}" that is missing from the prefab assetIds list.`,
		);
	}

	if (!options.scenePreloadAssetIds.has(assetId)) {
		errors.push(
			`${path} references asset "${assetId}" that is not declared in the level preload set.`,
		);
	}
}
