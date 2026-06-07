import type {
	AssetManifestEntryData,
	TerrainChunkPackageData,
} from "../schemas/index.js";
import { parseTerrainCookManifest } from "./manifestValidation.js";
import {
	cloneValue,
	hashStableValue,
	roundNumber,
	sortedUnique,
} from "./stableValue.js";
import type {
	TerrainCookAssetEntryData,
	TerrainCookBoundsData,
	TerrainCookCollisionChunkPlanData,
	TerrainCookHeightfieldShapeData,
	TerrainCookInputShapeData,
	TerrainCookManifestData,
	TerrainCookOutputMeshShapeData,
	TerrainCookOutputShapeData,
	TerrainCookPlan,
	TerrainCookVector3Data,
	TerrainCookVisualBindingData,
} from "./types.js";

export function buildTerrainCookPlan(manifestInput: unknown): TerrainCookPlan {
	const manifest = parseTerrainCookManifest(manifestInput);
	const visualOutputs = manifest.visualOutputs.map((output) => ({
		...cloneValue(output),
		assetEntry: toAssetManifestEntry(output.asset),
	}));
	const collisionChunks = manifest.collisionChunks.map((chunk) => ({
		...cloneValue(chunk),
		colliderComponent: {
			intent: chunk.intent,
			channel: chunk.channel,
			...(chunk.sensor === undefined ? {} : { sensor: chunk.sensor }),
			shape: buildColliderShape(chunk.shape),
		},
	}));
	const visualBindings = (manifest.visualBindings ?? []).map((binding) =>
		cloneValue(binding),
	);
	const startupChunkStableIds = sortedUnique(
		manifest.startupChunkStableIds ?? [],
	);
	const streamableChunkStableIds = sortedUnique(
		manifest.streamableChunkStableIds ??
			collisionChunks.map((chunk) => chunk.stableId),
	);
	const terrainPackage =
		manifest.streamingPolicy === undefined
			? undefined
			: buildTerrainChunkPackage({
					manifest,
					collisionChunks,
					visualBindings,
					startupChunkStableIds,
					streamableChunkStableIds,
				});
	const requiredCollisionSource =
		terrainPackage === undefined
			? collisionChunks
			: collisionChunks.filter(
					(chunk) => !streamableChunkStableIds.includes(chunk.stableId),
				);

	return {
		manifestId: manifest.id,
		runtimeSceneId: manifest.runtimeSceneId,
		levelId: manifest.levelId,
		targetFiles: cloneValue(manifest.targetFiles),
		source: cloneValue(manifest.source),
		policy: cloneValue(manifest.policy),
		provenance: cloneValue(manifest.provenance),
		visualOutputs,
		visualBindings,
		collisionChunks,
		...(manifest.streamingPolicy === undefined
			? {}
			: { streamingPolicy: cloneValue(manifest.streamingPolicy) }),
		startupChunkStableIds,
		streamableChunkStableIds,
		...(terrainPackage === undefined ? {} : { terrainPackage }),
		requiredAssetIds: sortedUnique(
			visualOutputs
				.filter((output) => output.readiness.requiredAsset)
				.map((output) => output.asset.id),
		),
		requiredCollisionStableIds: sortedUnique(
			requiredCollisionSource
				.filter((chunk) => chunk.readiness.requiredCollision)
				.map((chunk) => chunk.stableId),
		),
		requiredWalkableStableIds: sortedUnique(
			requiredCollisionSource
				.filter((chunk) => chunk.readiness.requiredWalkable === true)
				.map((chunk) => chunk.stableId),
		),
		requiredTerrainPackageIds:
			terrainPackage === undefined ? [] : [terrainPackage.id],
	};
}

function buildTerrainChunkPackage(options: {
	readonly manifest: TerrainCookManifestData;
	readonly collisionChunks: readonly TerrainCookCollisionChunkPlanData[];
	readonly visualBindings: readonly TerrainCookVisualBindingData[];
	readonly startupChunkStableIds: readonly string[];
	readonly streamableChunkStableIds: readonly string[];
}): TerrainChunkPackageData {
	if (options.manifest.streamingPolicy === undefined) {
		throw new Error(
			`terrain cook manifest "${options.manifest.id}" cannot build a terrain chunk package without streamingPolicy.`,
		);
	}

	const chunks: TerrainChunkPackageData["chunks"] = options.collisionChunks
		.filter((chunk) =>
			options.streamableChunkStableIds.includes(chunk.stableId),
		)
		.map((chunk) => ({
			stableId: chunk.stableId,
			groupId: terrainChunkGroupId(chunk),
			chunkKey: chunk.chunkKey,
			bounds: cloneValue(chunk.bounds),
			center: boundsCenter(chunk.bounds),
			lod: {
				nearVisualStableIds: sortedUnique(
					chunk.lod?.nearVisualStableIds ??
						options.visualBindings
							.filter((binding) =>
								binding.sourceChunkStableIds.includes(chunk.stableId),
							)
							.map((binding) => binding.stableId),
				),
				farVisualStableIds: sortedUnique(
					chunk.lod?.farVisualStableIds ??
						options.visualBindings
							.filter((binding) =>
								binding.sourceChunkStableIds.includes(chunk.stableId),
							)
							.map((binding) => binding.stableId),
				),
			},
			rigidBodyComponent: {
				type: "fixed" as const,
				mass: 0 as const,
			},
			colliderComponent: cloneValue(chunk.colliderComponent),
		}));
	const packageWithoutHash = {
		schemaVersion: 1,
		id: `${options.manifest.id}:chunk-package`,
		runtimeSceneId: options.manifest.runtimeSceneId,
		sourceManifestId: options.manifest.id,
		policy: cloneValue(options.manifest.streamingPolicy),
		chunks,
		visualBindings: options.visualBindings.map((binding) => ({
			id: binding.id,
			stableId: binding.stableId,
			prefabId: binding.prefabId,
			bounds: cloneValue(binding.bounds),
			sourceChunkStableIds: [...binding.sourceChunkStableIds],
			lod: binding.lod,
		})),
		startupChunkStableIds: [...options.startupChunkStableIds],
		streamableChunkStableIds: [...options.streamableChunkStableIds],
	} satisfies Omit<TerrainChunkPackageData, "driftHash">;

	return {
		...packageWithoutHash,
		driftHash: hashStableValue(packageWithoutHash),
	};
}

function terrainChunkGroupId(chunk: TerrainCookCollisionChunkPlanData): string {
	const parts = chunk.stableId.split(":");

	if (parts.length >= 4) {
		return parts[3] ?? "default";
	}

	return "default";
}

export function boundsCenter(
	bounds: TerrainCookBoundsData,
): TerrainCookVector3Data {
	return [
		roundNumber((bounds.min[0] + bounds.max[0]) / 2),
		roundNumber((bounds.min[1] + bounds.max[1]) / 2),
		roundNumber((bounds.min[2] + bounds.max[2]) / 2),
	];
}

function buildColliderShape(
	shape: TerrainCookInputShapeData,
): TerrainCookOutputShapeData {
	if (shape.type === "mesh") {
		return cloneValue(shape);
	}

	if (shape.type === "box") {
		return cloneValue(shape);
	}

	return buildHeightfieldMeshShape(shape);
}

function buildHeightfieldMeshShape(
	shape: TerrainCookHeightfieldShapeData,
): TerrainCookOutputMeshShapeData {
	const vertices: TerrainCookVector3Data[] = [];
	const indices: number[] = [];

	for (let row = 0; row < shape.rows; row += 1) {
		for (let column = 0; column < shape.columns; column += 1) {
			const heightIndex = row * shape.columns + column;
			const height = shape.heights[heightIndex] ?? 0;

			vertices.push([
				shape.origin[0] + column * shape.cellSize[0],
				shape.origin[1] + height,
				shape.origin[2] + row * shape.cellSize[1],
			]);
		}
	}

	for (let row = 0; row < shape.rows - 1; row += 1) {
		for (let column = 0; column < shape.columns - 1; column += 1) {
			const topLeft = row * shape.columns + column;
			const topRight = topLeft + 1;
			const bottomLeft = topLeft + shape.columns;
			const bottomRight = bottomLeft + 1;

			indices.push(
				topLeft,
				topRight,
				bottomLeft,
				bottomLeft,
				topRight,
				bottomRight,
			);
		}
	}

	return {
		type: "mesh",
		vertices,
		indices,
	};
}

function toAssetManifestEntry(
	asset: TerrainCookAssetEntryData,
): AssetManifestEntryData {
	const { contentHash: _contentHash, ...assetEntry } = cloneValue(asset);

	return assetEntry as AssetManifestEntryData;
}
