import { validateColliderComponent } from "./colliderSchema.js";
import {
	isRecord,
	requireString,
	requireUniqueString,
	validateOptionalNumberTuple,
	validateRequiredNumberTuple,
	validateRequiredPositiveInteger,
	validateRequiredPositiveNumber,
	validateRequiredStringArray,
} from "./helpers.js";

export function validateTerrainPackages(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!Array.isArray(data)) {
		errors.push(`${path} must be an array when provided.`);
		return;
	}

	const packageIds = new Set<string>();

	for (const [index, item] of data.entries()) {
		validateTerrainPackage(item, `${path}.${index}`, packageIds, errors);
	}
}

export function validateTerrainPackage(
	data: unknown,
	path: string,
	packageIds: Set<string>,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (data.schemaVersion !== 1) {
		errors.push(`${path}.schemaVersion must be 1.`);
	}

	requireUniqueString(data.id, `${path}.id`, packageIds, errors);
	requireString(data, "runtimeSceneId", `${path}.runtimeSceneId`, errors);
	requireString(data, "sourceManifestId", `${path}.sourceManifestId`, errors);
	requireString(data, "driftHash", `${path}.driftHash`, errors);
	validateTerrainStreamingPolicy(data.policy, `${path}.policy`, errors);

	const chunkStableIds = new Set<string>();
	const visualStableIds = new Set<string>();
	const materialSetLayerIds = new Map<string, Set<string>>();

	if (!Array.isArray(data.materialSets) || data.materialSets.length === 0) {
		errors.push(`${path}.materialSets must contain at least one material set.`);
	} else {
		const materialSetIds = new Set<string>();

		for (const [index, materialSet] of data.materialSets.entries()) {
			validateTerrainMaterialSet(
				materialSet,
				`${path}.materialSets.${index}`,
				materialSetIds,
				materialSetLayerIds,
				errors,
			);
		}
	}

	if (!Array.isArray(data.chunks) || data.chunks.length === 0) {
		errors.push(`${path}.chunks must contain at least one chunk.`);
	} else {
		for (const [index, chunk] of data.chunks.entries()) {
			validateTerrainPackageChunk(
				chunk,
				`${path}.chunks.${index}`,
				chunkStableIds,
				materialSetLayerIds,
				errors,
			);
		}
	}

	if (!Array.isArray(data.visualBindings)) {
		errors.push(`${path}.visualBindings must be an array.`);
	} else {
		for (const [index, binding] of data.visualBindings.entries()) {
			validateTerrainVisualBinding(
				binding,
				`${path}.visualBindings.${index}`,
				visualStableIds,
				chunkStableIds,
				errors,
			);
		}
	}

	validateRequiredStringArray(
		data.startupChunkStableIds,
		`${path}.startupChunkStableIds`,
		errors,
	);
	validateRequiredStringArray(
		data.streamableChunkStableIds,
		`${path}.streamableChunkStableIds`,
		errors,
	);

	if (Array.isArray(data.startupChunkStableIds)) {
		if (data.startupChunkStableIds.length === 0) {
			errors.push(`${path}.startupChunkStableIds must not be empty.`);
		}

		const seen = new Set<string>();
		for (const stableId of data.startupChunkStableIds) {
			if (typeof stableId === "string" && seen.has(stableId)) {
				errors.push(
					`${path}.startupChunkStableIds contains duplicate chunk "${stableId}".`,
				);
			}
			if (typeof stableId === "string") {
				seen.add(stableId);
			}
			if (typeof stableId === "string" && !chunkStableIds.has(stableId)) {
				errors.push(
					`${path}.startupChunkStableIds references unknown chunk "${stableId}".`,
				);
			}
		}
	}

	if (Array.isArray(data.streamableChunkStableIds)) {
		const seen = new Set<string>();
		for (const stableId of data.streamableChunkStableIds) {
			if (typeof stableId === "string" && seen.has(stableId)) {
				errors.push(
					`${path}.streamableChunkStableIds contains duplicate chunk "${stableId}".`,
				);
			}
			if (typeof stableId === "string") {
				seen.add(stableId);
			}
			if (typeof stableId === "string" && !chunkStableIds.has(stableId)) {
				errors.push(
					`${path}.streamableChunkStableIds references unknown chunk "${stableId}".`,
				);
			}
		}

		for (const stableId of chunkStableIds) {
			if (!seen.has(stableId)) {
				errors.push(
					`${path}.streamableChunkStableIds is missing chunk "${stableId}".`,
				);
			}
		}
	}
}

function validateTerrainMaterialSet(
	data: unknown,
	path: string,
	materialSetIds: Set<string>,
	materialSetLayerIds: Map<string, Set<string>>,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireUniqueString(data.id, `${path}.id`, materialSetIds, errors);
	requireString(
		data,
		"fallbackMaterialAssetId",
		`${path}.fallbackMaterialAssetId`,
		errors,
	);

	if (
		data.blendMode !== "single" &&
		data.blendMode !== "weighted" &&
		data.blendMode !== "splat-map"
	) {
		errors.push(`${path}.blendMode must be single, weighted, or splat-map.`);
	}

	if (!Array.isArray(data.layers) || data.layers.length === 0) {
		errors.push(`${path}.layers must contain at least one layer.`);
		return;
	}

	const layerIds = new Set<string>();

	for (const [index, layer] of data.layers.entries()) {
		validateTerrainMaterialLayer(
			layer,
			`${path}.layers.${index}`,
			layerIds,
			errors,
		);
	}

	if (typeof data.id === "string") {
		materialSetLayerIds.set(data.id, layerIds);
	}
}

function validateTerrainMaterialLayer(
	data: unknown,
	path: string,
	layerIds: Set<string>,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireUniqueString(data.id, `${path}.id`, layerIds, errors);
	requireString(data, "materialAssetId", `${path}.materialAssetId`, errors);

	if (data.textureAssetIds !== undefined) {
		validateRequiredStringArray(
			data.textureAssetIds,
			`${path}.textureAssetIds`,
			errors,
		);
	}

	validateOptionalNumberTuple(data.uvScale, 2, `${path}.uvScale`, errors);
}

function validateTerrainStreamingPolicy(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	validateRequiredPositiveNumber(
		data.startupRadiusMeters,
		`${path}.startupRadiusMeters`,
		errors,
	);
	validateRequiredPositiveNumber(
		data.activeCollisionRadiusMeters,
		`${path}.activeCollisionRadiusMeters`,
		errors,
	);
	validateRequiredPositiveNumber(
		data.nearVisualRadiusMeters,
		`${path}.nearVisualRadiusMeters`,
		errors,
	);
	validateRequiredPositiveNumber(
		data.farVisualRadiusMeters,
		`${path}.farVisualRadiusMeters`,
		errors,
	);
	validateRequiredPositiveNumber(
		data.unloadRadiusMeters,
		`${path}.unloadRadiusMeters`,
		errors,
	);
	validateRequiredPositiveNumber(
		data.hysteresisMeters,
		`${path}.hysteresisMeters`,
		errors,
	);
	validateRequiredPositiveInteger(
		data.maxChunkOperationsPerTick,
		`${path}.maxChunkOperationsPerTick`,
		errors,
	);

	if (
		typeof data.startupRadiusMeters === "number" &&
		typeof data.activeCollisionRadiusMeters === "number" &&
		data.startupRadiusMeters > data.activeCollisionRadiusMeters
	) {
		errors.push(
			`${path}.startupRadiusMeters must be less than or equal to activeCollisionRadiusMeters.`,
		);
	}

	if (
		typeof data.activeCollisionRadiusMeters === "number" &&
		typeof data.nearVisualRadiusMeters === "number" &&
		data.nearVisualRadiusMeters < data.activeCollisionRadiusMeters
	) {
		errors.push(
			`${path}.nearVisualRadiusMeters must be greater than or equal to activeCollisionRadiusMeters.`,
		);
	}

	if (
		typeof data.nearVisualRadiusMeters === "number" &&
		typeof data.farVisualRadiusMeters === "number" &&
		data.farVisualRadiusMeters < data.nearVisualRadiusMeters
	) {
		errors.push(
			`${path}.farVisualRadiusMeters must be greater than or equal to nearVisualRadiusMeters.`,
		);
	}

	if (
		typeof data.farVisualRadiusMeters === "number" &&
		typeof data.unloadRadiusMeters === "number" &&
		data.unloadRadiusMeters < data.farVisualRadiusMeters
	) {
		errors.push(
			`${path}.unloadRadiusMeters must be greater than or equal to farVisualRadiusMeters.`,
		);
	}
}

function validateTerrainPackageChunk(
	data: unknown,
	path: string,
	chunkStableIds: Set<string>,
	materialSetLayerIds: ReadonlyMap<string, ReadonlySet<string>>,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireUniqueString(
		data.stableId,
		`${path}.stableId`,
		chunkStableIds,
		errors,
	);
	requireString(data, "groupId", `${path}.groupId`, errors);
	validateRequiredNumberTuple(data.chunkKey, 2, `${path}.chunkKey`, errors);
	validateTerrainBounds(data.bounds, `${path}.bounds`, errors);
	validateRequiredNumberTuple(data.center, 3, `${path}.center`, errors);
	validateTerrainChunkLod(data.lod, `${path}.lod`, errors);
	validateTerrainChunkMaterialBinding(
		data.materialBinding,
		`${path}.materialBinding`,
		materialSetLayerIds,
		errors,
	);
	validateTerrainChunkRigidBody(
		data.rigidBodyComponent,
		`${path}.rigidBodyComponent`,
		errors,
	);
	validateColliderComponent(
		data.colliderComponent,
		`${path}.colliderComponent`,
		errors,
	);
}

function validateTerrainChunkMaterialBinding(
	data: unknown,
	path: string,
	materialSetLayerIds: ReadonlyMap<string, ReadonlySet<string>>,
	errors: string[],
): void {
	if (data === undefined) {
		return;
	}

	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(data, "materialSetId", `${path}.materialSetId`, errors);
	validateRequiredStringArray(data.layerIds, `${path}.layerIds`, errors);
	validateOptionalNumberTuple(data.uvScale, 2, `${path}.uvScale`, errors);

	const materialSetId =
		typeof data.materialSetId === "string" ? data.materialSetId : undefined;
	const layerIds =
		materialSetId === undefined
			? undefined
			: materialSetLayerIds.get(materialSetId);

	if (materialSetId !== undefined && layerIds === undefined) {
		errors.push(
			`${path}.materialSetId references unknown material set "${materialSetId}".`,
		);
	}

	if (Array.isArray(data.layerIds) && layerIds !== undefined) {
		for (const layerId of data.layerIds) {
			if (typeof layerId === "string" && !layerIds.has(layerId)) {
				errors.push(
					`${path}.layerIds references unknown material layer "${layerId}".`,
				);
			}
		}
	}
}

function validateTerrainVisualBinding(
	data: unknown,
	path: string,
	visualStableIds: Set<string>,
	chunkStableIds: ReadonlySet<string>,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(data, "id", `${path}.id`, errors);
	requireUniqueString(
		data.stableId,
		`${path}.stableId`,
		visualStableIds,
		errors,
	);
	requireString(data, "prefabId", `${path}.prefabId`, errors);
	validateTerrainBounds(data.bounds, `${path}.bounds`, errors);
	validateRequiredStringArray(
		data.sourceChunkStableIds,
		`${path}.sourceChunkStableIds`,
		errors,
	);

	if (Array.isArray(data.sourceChunkStableIds)) {
		for (const stableId of data.sourceChunkStableIds) {
			if (typeof stableId === "string" && !chunkStableIds.has(stableId)) {
				errors.push(
					`${path}.sourceChunkStableIds references unknown chunk "${stableId}".`,
				);
			}
		}
	}

	if (
		data.lod !== "near" &&
		data.lod !== "far" &&
		data.lod !== "merged-floor"
	) {
		errors.push(`${path}.lod must be near, far, or merged-floor.`);
	}
}

function validateTerrainChunkLod(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	validateRequiredStringArray(
		data.nearVisualStableIds,
		`${path}.nearVisualStableIds`,
		errors,
	);
	validateRequiredStringArray(
		data.farVisualStableIds,
		`${path}.farVisualStableIds`,
		errors,
	);
}

function validateTerrainBounds(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	validateRequiredNumberTuple(data.min, 3, `${path}.min`, errors);
	validateRequiredNumberTuple(data.max, 3, `${path}.max`, errors);

	if (
		Array.isArray(data.min) &&
		Array.isArray(data.max) &&
		data.min.length === 3 &&
		data.max.length === 3
	) {
		for (const axis of [0, 1, 2] as const) {
			const min = data.min[axis];
			const max = data.max[axis];

			if (
				typeof min === "number" &&
				typeof max === "number" &&
				Number.isFinite(min) &&
				Number.isFinite(max) &&
				min > max
			) {
				errors.push(`${path}.min.${axis} must be <= ${path}.max.${axis}.`);
			}
		}
	}
}

function validateTerrainChunkRigidBody(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (data.type !== "fixed") {
		errors.push(`${path}.type must be fixed.`);
	}

	if (data.mass !== 0) {
		errors.push(`${path}.mass must be 0.`);
	}
}
