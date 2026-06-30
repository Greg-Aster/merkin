import type {
	CollisionPerformanceBounds,
	CollisionPerformanceChunkSummary,
	CollisionPerformanceVector3,
	CollisionSpatialBucketKey,
	CollisionSpatialBucketPlan,
	CollisionSpatialBucketSummary,
	CollisionSpatialQueryPlan,
} from "./types.js";
import { mergeCollisionBounds } from "./summary.js";

export type CollisionSpatialBucketPlanOptions = {
	readonly chunks: readonly CollisionPerformanceChunkSummary[];
	readonly bucketSizeMeters: number;
};

export type CollisionSpatialQueryPlanOptions = {
	readonly plan: CollisionSpatialBucketPlan;
	readonly origin: CollisionPerformanceVector3;
	readonly radiusMeters: number;
};

type MutableBucket = {
	readonly key: CollisionSpatialBucketKey;
	readonly chunkIds: string[];
	readonly chunkBounds: CollisionPerformanceBounds[];
	triangleCount: number;
	walkableTriangleCount: number;
};

export function buildCollisionSpatialBucketPlan(
	options: CollisionSpatialBucketPlanOptions,
): CollisionSpatialBucketPlan {
	assertPositiveFinite(options.bucketSizeMeters, "bucketSizeMeters");

	const bucketsByKey = new Map<string, MutableBucket>();

	for (const chunk of options.chunks) {
		const minKey = spatialBucketKeyForPoint(
			chunk.bounds.min,
			options.bucketSizeMeters,
		);
		const maxKey = spatialBucketKeyForPoint(
			chunk.bounds.max,
			options.bucketSizeMeters,
		);

		for (let x = minKey[0]; x <= maxKey[0]; x += 1) {
			for (let z = minKey[1]; z <= maxKey[1]; z += 1) {
				const key: CollisionSpatialBucketKey = [x, z];
				const mapKey = spatialBucketKeyToString(key);
				const bucket =
					bucketsByKey.get(mapKey) ??
					createMutableBucket(key);

				bucket.chunkIds.push(chunk.id);
				bucket.chunkBounds.push(chunk.bounds);
				bucket.triangleCount += chunk.triangleCount;
				bucket.walkableTriangleCount += chunk.walkableTriangleCount;
				bucketsByKey.set(mapKey, bucket);
			}
		}
	}

	const buckets = [...bucketsByKey.values()]
		.sort(compareMutableBuckets)
		.map(finalizeBucket);
	const bounds = mergeCollisionBounds(options.chunks.map((chunk) => chunk.bounds));

	return {
		bucketSizeMeters: options.bucketSizeMeters,
		chunks: options.chunks,
		buckets,
		bucketCount: buckets.length,
		...(bounds ? { bounds } : {}),
	};
}

export function planCollisionSpatialQuery(
	options: CollisionSpatialQueryPlanOptions,
): CollisionSpatialQueryPlan {
	assertPositiveFinite(options.plan.bucketSizeMeters, "bucketSizeMeters");

	if (!Number.isFinite(options.radiusMeters) || options.radiusMeters < 0) {
		throw new Error("radiusMeters must be a finite non-negative number.");
	}

	const minPoint: CollisionPerformanceVector3 = [
		options.origin[0] - options.radiusMeters,
		options.origin[1],
		options.origin[2] - options.radiusMeters,
	];
	const maxPoint: CollisionPerformanceVector3 = [
		options.origin[0] + options.radiusMeters,
		options.origin[1],
		options.origin[2] + options.radiusMeters,
	];
	const minKey = spatialBucketKeyForPoint(
		minPoint,
		options.plan.bucketSizeMeters,
	);
	const maxKey = spatialBucketKeyForPoint(
		maxPoint,
		options.plan.bucketSizeMeters,
	);
	const bucketKeys: CollisionSpatialBucketKey[] = [];
	const bucketMap = new Map(
		options.plan.buckets.map((bucket) => [
			spatialBucketKeyToString(bucket.key),
			bucket,
		]),
	);
	const candidateChunkIds = new Set<string>();

	for (let x = minKey[0]; x <= maxKey[0]; x += 1) {
		for (let z = minKey[1]; z <= maxKey[1]; z += 1) {
			const key: CollisionSpatialBucketKey = [x, z];
			bucketKeys.push(key);

			const bucket = bucketMap.get(spatialBucketKeyToString(key));
			if (!bucket) {
				continue;
			}

			for (const chunkId of bucket.chunkIds) {
				candidateChunkIds.add(chunkId);
			}
		}
	}

	const orderedCandidateIds = options.plan.chunks
		.filter((chunk) => candidateChunkIds.has(chunk.id))
		.map((chunk) => chunk.id);
	const candidates = options.plan.chunks.filter((chunk) =>
		candidateChunkIds.has(chunk.id),
	);

	return {
		origin: options.origin,
		radiusMeters: options.radiusMeters,
		bucketKeys,
		candidateChunkIds: orderedCandidateIds,
		candidateChunkCount: orderedCandidateIds.length,
		estimatedTriangleCount: candidates.reduce(
			(total, chunk) => total + chunk.triangleCount,
			0,
		),
		estimatedWalkableTriangleCount: candidates.reduce(
			(total, chunk) => total + chunk.walkableTriangleCount,
			0,
		),
	};
}

export function spatialBucketKeyForPoint(
	point: CollisionPerformanceVector3,
	bucketSizeMeters: number,
): CollisionSpatialBucketKey {
	assertPositiveFinite(bucketSizeMeters, "bucketSizeMeters");

	return [
		Math.floor(point[0] / bucketSizeMeters),
		Math.floor(point[2] / bucketSizeMeters),
	];
}

export function spatialBucketKeyToString(
	key: CollisionSpatialBucketKey,
): string {
	return `${key[0]}:${key[1]}`;
}

function createMutableBucket(
	key: CollisionSpatialBucketKey,
): MutableBucket {
	return {
		key,
		chunkIds: [],
		chunkBounds: [],
		triangleCount: 0,
		walkableTriangleCount: 0,
	};
}

function finalizeBucket(bucket: MutableBucket): CollisionSpatialBucketSummary {
	return {
		key: bucket.key,
		bounds:
			mergeCollisionBounds(bucket.chunkBounds) ??
			({
				min: [0, 0, 0],
				max: [0, 0, 0],
			} satisfies CollisionPerformanceBounds),
		chunkIds: bucket.chunkIds,
		chunkCount: bucket.chunkIds.length,
		triangleCount: bucket.triangleCount,
		walkableTriangleCount: bucket.walkableTriangleCount,
	};
}

function compareMutableBuckets(a: MutableBucket, b: MutableBucket): number {
	return a.key[0] - b.key[0] || a.key[1] - b.key[1];
}

function assertPositiveFinite(value: number, label: string): void {
	if (!Number.isFinite(value) || value <= 0) {
		throw new Error(`${label} must be a finite positive number.`);
	}
}
