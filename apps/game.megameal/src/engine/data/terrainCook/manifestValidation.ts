import {
	SchemaValidationError,
	createSchemaValidator,
} from "../schemas/index.js";
import {
	validateBounds,
	validateInputShape,
	validateReadiness,
} from "./shapeValidation.js";
import { isRecord } from "./stableValue.js";
import type { TerrainCookManifestData } from "./types.js";
import {
	requireString,
	requireUniqueString,
	validateChunkStableIdList,
	validateCollisionIntent,
	validateRequiredInteger,
	validateRequiredNumberTuple,
	validateRequiredPositiveNumber,
	validateStringArray,
} from "./validationPrimitives.js";

export const terrainCookManifestValidator =
	createSchemaValidator<TerrainCookManifestData>(
		"TerrainCookManifest",
		validateTerrainCookManifest,
	);

export function parseTerrainCookManifest(
	data: unknown,
): TerrainCookManifestData {
	return terrainCookManifestValidator.parse(data);
}

export function validateTerrainCookManifest(data: unknown): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(data)) {
		return ["terrain cook manifest must be an object."];
	}

	if (data.schemaVersion !== 1) {
		errors.push("terrainCookManifest.schemaVersion must be 1.");
	}

	requireString(data.id, "terrainCookManifest.id", errors);
	requireString(
		data.runtimeSceneId,
		"terrainCookManifest.runtimeSceneId",
		errors,
	);
	requireString(data.levelId, "terrainCookManifest.levelId", errors);
	validateTargetFiles(
		data.targetFiles,
		"terrainCookManifest.targetFiles",
		errors,
	);
	validateSource(data.source, "terrainCookManifest.source", errors);
	validatePolicy(data.policy, "terrainCookManifest.policy", errors);
	validateProvenance(
		data.provenance,
		"terrainCookManifest.provenance",
		data.source,
		errors,
	);

	const stableIds = new Set<string>();

	if (!Array.isArray(data.visualOutputs)) {
		errors.push("terrainCookManifest.visualOutputs must be an array.");
	} else if (
		data.visualOutputs.length === 0 &&
		(!Array.isArray(data.visualBindings) || data.visualBindings.length === 0)
	) {
		errors.push(
			"terrainCookManifest.visualOutputs or visualBindings must contain at least one visual terrain owner.",
		);
	} else {
		const outputIds = new Set<string>();
		const prefabIds = new Set<string>();
		const assetIds = new Set<string>();

		for (const [index, output] of data.visualOutputs.entries()) {
			validateVisualOutput(
				output,
				`terrainCookManifest.visualOutputs.${index}`,
				{ outputIds, stableIds, prefabIds, assetIds },
				errors,
			);
		}
	}

	if (data.visualBindings !== undefined) {
		if (!Array.isArray(data.visualBindings)) {
			errors.push("terrainCookManifest.visualBindings must be an array.");
		} else {
			const bindingIds = new Set<string>();
			const bindingPrefabIds = new Set<string>();

			for (const [index, binding] of data.visualBindings.entries()) {
				validateVisualBinding(
					binding,
					`terrainCookManifest.visualBindings.${index}`,
					{ bindingIds, stableIds, prefabIds: bindingPrefabIds },
					errors,
				);
			}
		}
	}

	if (
		!Array.isArray(data.collisionChunks) ||
		data.collisionChunks.length === 0
	) {
		errors.push(
			"terrainCookManifest.collisionChunks must contain at least one chunk.",
		);
	} else {
		const chunkIds = new Set<string>();
		const chunkStableIds = new Set<string>();

		for (const [index, chunk] of data.collisionChunks.entries()) {
			validateCollisionChunk(
				chunk,
				`terrainCookManifest.collisionChunks.${index}`,
				{ chunkIds, stableIds, chunkStableIds },
				errors,
			);
		}

		if (data.streamingPolicy !== undefined) {
			validateStreamingPolicy(
				data.streamingPolicy,
				"terrainCookManifest.streamingPolicy",
				errors,
			);
			validateChunkStableIdList(
				data.startupChunkStableIds,
				"terrainCookManifest.startupChunkStableIds",
				chunkStableIds,
				{ required: true, requireNonEmpty: true },
				errors,
			);
			validateChunkStableIdList(
				data.streamableChunkStableIds,
				"terrainCookManifest.streamableChunkStableIds",
				chunkStableIds,
				{ required: true, requireAllChunks: true },
				errors,
			);
		} else {
			if (data.startupChunkStableIds !== undefined) {
				errors.push(
					"terrainCookManifest.startupChunkStableIds requires streamingPolicy.",
				);
			}
			if (data.streamableChunkStableIds !== undefined) {
				errors.push(
					"terrainCookManifest.streamableChunkStableIds requires streamingPolicy.",
				);
			}
		}
	}

	return errors;
}

function validateTargetFiles(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(
		data.assetManifestModule,
		`${path}.assetManifestModule`,
		errors,
	);
	requireString(data.prefabModule, `${path}.prefabModule`, errors);
	requireString(data.levelModule, `${path}.levelModule`, errors);
	requireString(
		data.runtimeSceneManifestModule,
		`${path}.runtimeSceneManifestModule`,
		errors,
	);

	if (
		data.generatedTerrainRuntimeModule !== undefined &&
		typeof data.generatedTerrainRuntimeModule !== "string"
	) {
		errors.push(`${path}.generatedTerrainRuntimeModule must be a string.`);
	}

	if (
		data.generatedTerrainMetadata !== undefined &&
		typeof data.generatedTerrainMetadata !== "string"
	) {
		errors.push(`${path}.generatedTerrainMetadata must be a string.`);
	}
}

function validateSource(data: unknown, path: string, errors: string[]): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(data.id, `${path}.id`, errors);
	requireString(data.contentHash, `${path}.contentHash`, errors);

	switch (data.kind) {
		case "glb":
			requireString(data.uri, `${path}.uri`, errors);
			validateRequiredPositiveNumber(
				data.unitsPerMeter,
				`${path}.unitsPerMeter`,
				errors,
			);

			if (data.upAxis !== "y") {
				errors.push(`${path}.upAxis must be y.`);
			}
			break;
		case "authored-collision-draft":
			requireString(data.draftId, `${path}.draftId`, errors);
			break;
		default:
			errors.push(`${path}.kind must be glb or authored-collision-draft.`);
			break;
	}

	if (data.coordinateSpace !== "engine-world") {
		errors.push(`${path}.coordinateSpace must be engine-world.`);
	}

	validateBounds(data.bounds, `${path}.bounds`, errors);
}

function validatePolicy(data: unknown, path: string, errors: string[]): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (data.sourceScaleBakedIntoOutputs !== true) {
		errors.push(`${path}.sourceScaleBakedIntoOutputs must be true.`);
	}

	if (
		data.collisionSource !== "heightfield" &&
		data.collisionSource !== "mesh" &&
		data.collisionSource !== "mixed"
	) {
		errors.push(`${path}.collisionSource must be heightfield, mesh, or mixed.`);
	}

	if (!isRecord(data.chunking)) {
		errors.push(`${path}.chunking must be an object.`);
		return;
	}

	if (data.chunking.strategy !== "grid") {
		errors.push(`${path}.chunking.strategy must be grid.`);
	}

	validateRequiredPositiveNumber(
		data.chunking.chunkSizeMeters,
		`${path}.chunking.chunkSizeMeters`,
		errors,
	);
}

function validateStreamingPolicy(
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
	validateRequiredInteger(
		data.maxChunkOperationsPerTick,
		`${path}.maxChunkOperationsPerTick`,
		errors,
		1,
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
		data.activeCollisionRadiusMeters > data.nearVisualRadiusMeters
	) {
		errors.push(
			`${path}.activeCollisionRadiusMeters must be less than or equal to nearVisualRadiusMeters.`,
		);
	}

	if (
		typeof data.nearVisualRadiusMeters === "number" &&
		typeof data.farVisualRadiusMeters === "number" &&
		data.nearVisualRadiusMeters > data.farVisualRadiusMeters
	) {
		errors.push(
			`${path}.nearVisualRadiusMeters must be less than or equal to farVisualRadiusMeters.`,
		);
	}

	if (
		typeof data.farVisualRadiusMeters === "number" &&
		typeof data.unloadRadiusMeters === "number" &&
		data.farVisualRadiusMeters > data.unloadRadiusMeters
	) {
		errors.push(
			`${path}.farVisualRadiusMeters must be less than or equal to unloadRadiusMeters.`,
		);
	}
}

function validateProvenance(
	data: unknown,
	path: string,
	source: unknown,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (data.contract !== "TerrainImportCookContract") {
		errors.push(`${path}.contract must be TerrainImportCookContract.`);
	}

	requireString(data.generator, `${path}.generator`, errors);
	requireString(data.sourceContentHash, `${path}.sourceContentHash`, errors);

	if (
		isRecord(source) &&
		typeof source.contentHash === "string" &&
		data.sourceContentHash !== source.contentHash
	) {
		errors.push(`${path}.sourceContentHash must match source.contentHash.`);
	}

	if (data.hashAlgorithm !== "fnv1a32") {
		errors.push(`${path}.hashAlgorithm must be fnv1a32.`);
	}

	requireString(data.generatedAt, `${path}.generatedAt`, errors);
	validateStringArray(data.evidence, `${path}.evidence`, errors);
}

function validateVisualOutput(
	data: unknown,
	path: string,
	seen: {
		readonly outputIds: Set<string>;
		readonly stableIds: Set<string>;
		readonly prefabIds: Set<string>;
		readonly assetIds: Set<string>;
	},
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireUniqueString(data.id, `${path}.id`, seen.outputIds, errors);
	requireUniqueString(
		data.stableId,
		`${path}.stableId`,
		seen.stableIds,
		errors,
	);
	requireUniqueString(
		data.prefabId,
		`${path}.prefabId`,
		seen.prefabIds,
		errors,
	);
	validateAssetEntry(data.asset, `${path}.asset`, seen.assetIds, errors);
	validateStringArray(
		data.materialAssetIds,
		`${path}.materialAssetIds`,
		errors,
	);
	validateBounds(data.bounds, `${path}.bounds`, errors);
	validateStringArray(data.sourceChunkIds, `${path}.sourceChunkIds`, errors);

	if (!isRecord(data.readiness)) {
		errors.push(`${path}.readiness must be an object.`);
	} else if (typeof data.readiness.requiredAsset !== "boolean") {
		errors.push(`${path}.readiness.requiredAsset must be a boolean.`);
	}
}

function validateVisualBinding(
	data: unknown,
	path: string,
	seen: {
		readonly bindingIds: Set<string>;
		readonly stableIds: Set<string>;
		readonly prefabIds: Set<string>;
	},
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireUniqueString(data.id, `${path}.id`, seen.bindingIds, errors);
	requireUniqueString(
		data.stableId,
		`${path}.stableId`,
		seen.stableIds,
		errors,
	);
	requireString(data.prefabId, `${path}.prefabId`, errors);

	if (typeof data.prefabId === "string") {
		seen.prefabIds.add(data.prefabId);
	}

	validateBounds(data.bounds, `${path}.bounds`, errors);
	validateStringArray(data.sourceChunkIds, `${path}.sourceChunkIds`, errors);
	validateStringArray(
		data.sourceChunkStableIds,
		`${path}.sourceChunkStableIds`,
		errors,
	);

	if (
		data.lod !== "near" &&
		data.lod !== "far" &&
		data.lod !== "merged-floor"
	) {
		errors.push(`${path}.lod must be near, far, or merged-floor.`);
	}
}

function validateCollisionChunk(
	data: unknown,
	path: string,
	seen: {
		readonly chunkIds: Set<string>;
		readonly stableIds: Set<string>;
		readonly chunkStableIds: Set<string>;
	},
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireUniqueString(data.id, `${path}.id`, seen.chunkIds, errors);
	requireUniqueString(
		data.stableId,
		`${path}.stableId`,
		seen.stableIds,
		errors,
	);
	if (typeof data.stableId === "string" && data.stableId.length > 0) {
		if (seen.chunkStableIds.has(data.stableId)) {
			errors.push(`${path}.stableId contains duplicate chunk stable ID.`);
		}

		seen.chunkStableIds.add(data.stableId);
	}
	requireString(data.prefabId, `${path}.prefabId`, errors);

	if (
		data.colliderTarget !== "prefab" &&
		data.colliderTarget !== "level-instance"
	) {
		errors.push(`${path}.colliderTarget must be prefab or level-instance.`);
	}

	validateRequiredNumberTuple(data.chunkKey, 2, `${path}.chunkKey`, errors);
	validateBounds(data.bounds, `${path}.bounds`, errors);
	validateCollisionIntent(data.intent, `${path}.intent`, errors);
	requireString(data.channel, `${path}.channel`, errors);

	if (data.sensor !== undefined && typeof data.sensor !== "boolean") {
		errors.push(`${path}.sensor must be a boolean when provided.`);
	}

	if (data.intent === "trigger" && data.sensor !== true) {
		errors.push(`${path}.sensor must be true for trigger collision.`);
	}

	if (
		(data.intent === "solid" || data.intent === "walkable") &&
		data.sensor === true
	) {
		errors.push(
			`${path}.sensor cannot be true for solid or walkable collision.`,
		);
	}

	validateInputShape(data.shape, `${path}.shape`, errors);
	validateReadiness(data.readiness, `${path}.readiness`, data.intent, errors);
	validateCollisionChunkLod(data.lod, `${path}.lod`, errors);

	if (data.materialId !== undefined && typeof data.materialId !== "string") {
		errors.push(`${path}.materialId must be a string when provided.`);
	}
}

function validateCollisionChunkLod(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (data === undefined) {
		return;
	}

	if (!isRecord(data)) {
		errors.push(`${path} must be an object when provided.`);
		return;
	}

	validateStringArray(
		data.nearVisualStableIds,
		`${path}.nearVisualStableIds`,
		errors,
	);
	validateStringArray(
		data.farVisualStableIds,
		`${path}.farVisualStableIds`,
		errors,
	);
}

function validateAssetEntry(
	data: unknown,
	path: string,
	seenAssetIds: Set<string>,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireUniqueString(data.id, `${path}.id`, seenAssetIds, errors);
	requireString(data.kind, `${path}.kind`, errors);
	requireString(data.url, `${path}.url`, errors);

	if (data.kind !== "mesh") {
		errors.push(`${path}.kind must be mesh.`);
	}

	if (data.tags !== undefined) {
		validateStringArray(data.tags, `${path}.tags`, errors);
	}
}

export { SchemaValidationError as TerrainCookManifestValidationError };
