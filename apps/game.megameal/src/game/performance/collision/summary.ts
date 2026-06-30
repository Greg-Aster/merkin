import type {
	CollisionPerformanceBounds,
	CollisionPerformanceChunkInput,
	CollisionPerformanceChunkSummary,
	CollisionPerformanceMesh,
	CollisionPerformanceMeshSummary,
	CollisionPerformanceVector3,
} from "./types.js";

export function countCollisionMeshTriangles(
	mesh: Pick<CollisionPerformanceMesh, "indices">,
): number {
	return Math.floor(mesh.indices.length / 3);
}

export function countWalkableMeshTriangles(
	chunks: readonly CollisionPerformanceChunkInput[],
): number {
	return chunks.reduce((total, chunk) => {
		if (chunk.intent !== "walkable") {
			return total;
		}

		return total + countCollisionMeshTriangles(chunk.mesh);
	}, 0);
}

export function summarizeCollisionChunk(
	chunk: CollisionPerformanceChunkInput,
): CollisionPerformanceChunkSummary {
	const triangleCount = countCollisionMeshTriangles(chunk.mesh);

	return {
		id: chunk.id,
		...(chunk.stableId ? { stableId: chunk.stableId } : {}),
		...(chunk.chunkKey ? { chunkKey: chunk.chunkKey } : {}),
		...(chunk.intent ? { intent: chunk.intent } : {}),
		bounds:
			chunk.bounds ??
			computeCollisionMeshBounds(chunk.mesh) ??
			createPointBounds([0, 0, 0]),
		vertexCount: chunk.mesh.vertices.length,
		triangleCount,
		walkableTriangleCount: chunk.intent === "walkable" ? triangleCount : 0,
	};
}

export function summarizeCollisionChunks(
	chunks: readonly CollisionPerformanceChunkInput[],
): CollisionPerformanceMeshSummary {
	const summaries = chunks.map(summarizeCollisionChunk);
	const bounds = mergeCollisionBounds(
		summaries.map((summary) => summary.bounds),
	);

	return {
		chunks: summaries,
		chunkCount: summaries.length,
		walkableChunkCount: summaries.filter(
			(summary) => summary.intent === "walkable",
		).length,
		vertexCount: summaries.reduce(
			(total, summary) => total + summary.vertexCount,
			0,
		),
		triangleCount: summaries.reduce(
			(total, summary) => total + summary.triangleCount,
			0,
		),
		walkableTriangleCount: summaries.reduce(
			(total, summary) => total + summary.walkableTriangleCount,
			0,
		),
		...(bounds ? { bounds } : {}),
	};
}

export function computeCollisionMeshBounds(
	mesh: CollisionPerformanceMesh,
): CollisionPerformanceBounds | undefined {
	const first = mesh.vertices[0];
	if (!first) {
		return undefined;
	}

	let minX = first[0];
	let minY = first[1];
	let minZ = first[2];
	let maxX = first[0];
	let maxY = first[1];
	let maxZ = first[2];

	for (const vertex of mesh.vertices.slice(1)) {
		minX = Math.min(minX, vertex[0]);
		minY = Math.min(minY, vertex[1]);
		minZ = Math.min(minZ, vertex[2]);
		maxX = Math.max(maxX, vertex[0]);
		maxY = Math.max(maxY, vertex[1]);
		maxZ = Math.max(maxZ, vertex[2]);
	}

	return {
		min: [minX, minY, minZ],
		max: [maxX, maxY, maxZ],
	};
}

export function mergeCollisionBounds(
	bounds: readonly (CollisionPerformanceBounds | undefined)[],
): CollisionPerformanceBounds | undefined {
	const first = bounds.find(Boolean);
	if (!first) {
		return undefined;
	}

	let minX = first.min[0];
	let minY = first.min[1];
	let minZ = first.min[2];
	let maxX = first.max[0];
	let maxY = first.max[1];
	let maxZ = first.max[2];

	for (const item of bounds) {
		if (!item) {
			continue;
		}

		minX = Math.min(minX, item.min[0]);
		minY = Math.min(minY, item.min[1]);
		minZ = Math.min(minZ, item.min[2]);
		maxX = Math.max(maxX, item.max[0]);
		maxY = Math.max(maxY, item.max[1]);
		maxZ = Math.max(maxZ, item.max[2]);
	}

	return {
		min: [minX, minY, minZ],
		max: [maxX, maxY, maxZ],
	};
}

function createPointBounds(
	point: CollisionPerformanceVector3,
): CollisionPerformanceBounds {
	return {
		min: point,
		max: point,
	};
}
