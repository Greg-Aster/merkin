import type {
	CollisionCookDraftData,
	CollisionCookDraftEntryData,
} from "../../../engine/data/index.js";

const observatoryWalkableMeshGridSize = 17;
const observatoryWalkableMeshHalfExtent = 320;
const observatoryWalkableMeshChunkCellSpan = 4;
const observatoryWalkableMeshCellSize =
	(observatoryWalkableMeshHalfExtent * 2) /
	(observatoryWalkableMeshGridSize - 1);

const observatoryWalkableMeshHeightRows = [
	[
		1.43, 1.44, 1.46, 1.48, 1.5, 1.52, 1.53, 1.53, 1.54, 1.56, 1.59, 1.64, 1.7,
		1.77, 1.83, 1.88, 1.89,
	],
	[
		1.41, 1.45, 1.49, 1.54, 1.57, 1.6, 1.6, 1.6, 1.6, 1.61, 1.63, 1.67, 1.73,
		1.8, 1.87, 1.92, 1.94,
	],
	[
		1.4, 1.45, 1.51, 1.57, 1.62, 1.66, 1.68, 1.68, 1.68, 1.69, 1.71, 1.74, 1.79,
		1.85, 1.91, 1.95, 1.96,
	],
	[
		1.41, 1.45, 1.51, 1.58, 1.65, 1.7, 1.74, 1.77, 1.79, 1.8, 1.83, 1.86, 1.89,
		1.93, 1.96, 1.96, 1.95,
	],
	[
		1.42, 1.45, 1.5, 1.58, 1.67, 1.75, 1.81, 1.85, 1.9, 1.94, 1.97, 2, 2.02,
		2.02, 2, 1.97, 1.91,
	],
	[
		1.45, 1.45, 1.49, 1.59, 1.7, 1.8, 1.89, 1.96, 2.01, 2.08, 2.13, 2.15, 2.14,
		2.11, 2.04, 1.96, 1.87,
	],
	[
		1.5, 1.46, 1.5, 1.59, 1.71, 1.84, 1.95, 2.05, 2.13, 2.21, 2.27, 2.29, 2.26,
		2.19, 2.08, 1.95, 1.82,
	],
	[
		1.54, 1.48, 1.5, 1.58, 1.71, 1.88, 1.99, 2.1, 2.21, 2.3, 2.37, 2.39, 2.34,
		2.24, 2.1, 1.94, 1.79,
	],
	[
		1.59, 1.51, 1.51, 1.57, 1.69, 1.83, 1.98, 2.12, 2.25, 2.35, 2.43, 2.44,
		2.38, 2.27, 2.11, 1.94, 1.77,
	],
	[
		1.63, 1.55, 1.52, 1.57, 1.67, 1.8, 1.95, 2.1, 2.23, 2.35, 2.42, 2.43, 2.37,
		2.26, 2.11, 1.94, 1.79,
	],
	[
		1.67, 1.6, 1.57, 1.59, 1.67, 1.79, 1.92, 2.05, 2.18, 2.29, 2.35, 2.36, 2.31,
		2.22, 2.09, 1.96, 1.83,
	],
	[
		1.7, 1.65, 1.63, 1.65, 1.71, 1.79, 1.89, 2.01, 2.11, 2.19, 2.23, 2.24, 2.21,
		2.15, 2.07, 1.98, 1.88,
	],
	[
		1.71, 1.7, 1.7, 1.73, 1.77, 1.83, 1.89, 1.95, 2.01, 2.05, 2.08, 2.1, 2.09,
		2.08, 2.04, 2, 1.95,
	],
	[
		1.7, 1.73, 1.76, 1.79, 1.82, 1.85, 1.87, 1.88, 1.9, 1.91, 1.93, 1.95, 1.97,
		1.99, 2.01, 2.02, 2,
	],
	[
		1.68, 1.74, 1.79, 1.83, 1.85, 1.85, 1.83, 1.81, 1.79, 1.78, 1.78, 1.81,
		1.86, 1.92, 1.98, 2.02, 2.04,
	],
	[
		1.64, 1.72, 1.78, 1.82, 1.84, 1.82, 1.78, 1.74, 1.69, 1.67, 1.67, 1.71,
		1.77, 1.86, 1.94, 2, 2.04,
	],
	[
		1.59, 1.66, 1.73, 1.77, 1.78, 1.76, 1.72, 1.67, 1.63, 1.61, 1.62, 1.66,
		1.73, 1.82, 1.9, 1.97, 2,
	],
] as const;

const observatoryWalkableMeshChunkEntries =
	createObservatoryWalkableMeshChunkEntries();

function createObservatoryWalkableMeshChunkEntries(): readonly CollisionCookDraftEntryData[] {
	const chunksPerAxis =
		(observatoryWalkableMeshGridSize - 1) /
		observatoryWalkableMeshChunkCellSpan;

	if (!Number.isInteger(chunksPerAxis)) {
		throw new Error(
			"Observatory walkable mesh chunk size must evenly divide the authored height grid.",
		);
	}

	const entries: CollisionCookDraftEntryData[] = [];

	for (let zChunk = 0; zChunk < chunksPerAxis; zChunk += 1) {
		for (let xChunk = 0; xChunk < chunksPerAxis; xChunk += 1) {
			const chunkId = `x${xChunk}-z${zChunk}`;

			entries.push({
				id: `observatory-walkable-mesh-chunk-${chunkId}`,
				stableId: `observatory:walkable-mesh:chunk:${chunkId}`,
				prefabId: "observatory_walkable_mesh",
				colliderTarget:
					xChunk === 0 && zChunk === 0 ? "prefab" : "level-instance",
				collider: {
					intent: "walkable",
					channel: "worldStatic",
					shape: createObservatoryWalkableMeshChunkShape({
						startXIndex: xChunk * observatoryWalkableMeshChunkCellSpan,
						startZIndex: zChunk * observatoryWalkableMeshChunkCellSpan,
					}),
				},
				readiness: {
					requiredCollision: true,
					requiredWalkable: true,
				},
				notes:
					"Deterministic rolling-field walkable mesh chunk derived from the authored Observatory height grid.",
			});
		}
	}

	return entries;
}

function createObservatoryWalkableMeshChunkShape(options: {
	readonly startXIndex: number;
	readonly startZIndex: number;
}): CollisionCookDraftEntryData["collider"]["shape"] {
	const vertices: Array<[number, number, number]> = [];
	const localGridSize = observatoryWalkableMeshChunkCellSpan + 1;

	for (
		let zIndex = options.startZIndex;
		zIndex <= options.startZIndex + observatoryWalkableMeshChunkCellSpan;
		zIndex += 1
	) {
		const z = observatoryWalkableMeshCoordinate(zIndex);
		const row = observatoryWalkableMeshHeightRows[zIndex];

		if (!row) {
			throw new Error(
				`Observatory walkable mesh chunk references missing height row ${zIndex}.`,
			);
		}

		for (
			let xIndex = options.startXIndex;
			xIndex <= options.startXIndex + observatoryWalkableMeshChunkCellSpan;
			xIndex += 1
		) {
			const height = row[xIndex];

			if (height === undefined) {
				throw new Error(
					`Observatory walkable mesh chunk references missing height sample ${xIndex}, ${zIndex}.`,
				);
			}

			vertices.push([observatoryWalkableMeshCoordinate(xIndex), height, z]);
		}
	}

	return {
		type: "mesh",
		vertices,
		indices: createObservatoryWalkableMeshChunkIndices(localGridSize),
	};
}

function createObservatoryWalkableMeshChunkIndices(
	localGridSize: number,
): readonly number[] {
	const indices: number[] = [];

	for (let zIndex = 0; zIndex < localGridSize - 1; zIndex += 1) {
		for (let xIndex = 0; xIndex < localGridSize - 1; xIndex += 1) {
			const topLeft = zIndex * localGridSize + xIndex;
			const bottomLeft = topLeft + localGridSize;

			indices.push(
				topLeft,
				bottomLeft,
				topLeft + 1,
				topLeft + 1,
				bottomLeft,
				bottomLeft + 1,
			);
		}
	}

	return indices;
}

function observatoryWalkableMeshCoordinate(index: number): number {
	return (
		-observatoryWalkableMeshHalfExtent + index * observatoryWalkableMeshCellSize
	);
}

export const observatoryCollisionCookDraft = {
	schemaVersion: 1,
	id: "observatory_collision_draft_v1",
	runtimeSceneId: "observatory_runtime",
	levelId: "observatory",
	targetFiles: {
		prefabModule: "src/game/prefabs/observatoryPrefabs.ts",
		levelModule: "src/game/levels/observatoryLevel.ts",
		runtimeSceneManifestModule: "src/game/levels/runtimeSceneManifests.ts",
		generatedRuntimeCollisionModule:
			"src/game/generated/observatoryCollisionRuntime.ts",
	},
	entries: [
		...observatoryWalkableMeshChunkEntries,
		{
			id: "observatory-boundary-north",
			stableId: "observatory:collision:boundary:north",
			prefabId: "observatory_boundary_blocker",
			colliderTarget: "level-instance",
			transform: {
				position: [0, 5.8, -304],
			},
			collider: {
				intent: "solid",
				channel: "worldStatic",
				shape: {
					type: "box",
					halfExtents: [320, 4, 4],
				},
			},
			readiness: {
				requiredCollision: true,
			},
		},
		{
			id: "observatory-boundary-south",
			stableId: "observatory:collision:boundary:south",
			prefabId: "observatory_boundary_blocker",
			colliderTarget: "level-instance",
			transform: {
				position: [0, 5.8, 304],
			},
			collider: {
				intent: "solid",
				channel: "worldStatic",
				shape: {
					type: "box",
					halfExtents: [320, 4, 4],
				},
			},
			readiness: {
				requiredCollision: true,
			},
		},
		{
			id: "observatory-boundary-east",
			stableId: "observatory:collision:boundary:east",
			prefabId: "observatory_boundary_blocker",
			colliderTarget: "level-instance",
			transform: {
				position: [304, 5.8, 0],
			},
			collider: {
				intent: "solid",
				channel: "worldStatic",
				shape: {
					type: "box",
					halfExtents: [4, 4, 320],
				},
			},
			readiness: {
				requiredCollision: true,
			},
		},
		{
			id: "observatory-boundary-west",
			stableId: "observatory:collision:boundary:west",
			prefabId: "observatory_boundary_blocker",
			colliderTarget: "level-instance",
			transform: {
				position: [-304, 5.8, 0],
			},
			collider: {
				intent: "solid",
				channel: "worldStatic",
				shape: {
					type: "box",
					halfExtents: [4, 4, 320],
				},
			},
			readiness: {
				requiredCollision: true,
			},
		},
	],
} satisfies CollisionCookDraftData;
