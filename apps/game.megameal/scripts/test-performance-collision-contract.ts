import assert from "node:assert/strict";
import {
	type CollisionPerformanceChunkInput,
	buildCollisionSpatialBucketPlan,
	collectCollisionBudgetDiagnostics,
	countCollisionMeshTriangles,
	countWalkableMeshTriangles,
	planCollisionSpatialQuery,
	resolveCollisionPerformancePolicy,
	spatialBucketKeyForPoint,
	summarizeCollisionChunks,
} from "../src/game/performance/collision/index.js";
import {
	type PerformanceConfig,
	defaultPerformanceConfig,
	parsePerformanceConfig,
} from "../src/game/performance/types.js";

const chunks: readonly CollisionPerformanceChunkInput[] = [
	{
		id: "walkable-a",
		stableId: "collision:walkable:a",
		chunkKey: [0, 0],
		intent: "walkable",
		mesh: {
			vertices: [
				[0, 0, 0],
				[4, 0, 0],
				[4, 0, 4],
				[0, 0, 4],
			],
			indices: [0, 1, 2, 0, 2, 3],
		},
	},
	{
		id: "walkable-b",
		stableId: "collision:walkable:b",
		chunkKey: [1, 0],
		intent: "walkable",
		mesh: {
			vertices: [
				[8, 0, 0],
				[12, 0, 0],
				[12, 0, 4],
				[8, 0, 4],
			],
			indices: [0, 1, 2, 0, 2, 3],
		},
	},
	{
		id: "solid-blocker",
		stableId: "collision:solid:blocker",
		intent: "solid",
		mesh: {
			vertices: [
				[2, 0, 8],
				[4, 0, 8],
				[4, 2, 8],
			],
			indices: [0, 1, 2],
		},
	},
];

const defaultPolicy = resolveCollisionPerformancePolicy(
	defaultPerformanceConfig,
);
assert.equal(defaultPolicy.mode, "diagnostic");
assert.equal(defaultPolicy.diagnosticsEnabled, true);
assert.equal(defaultPolicy.activeOptimizationEnabled, false);
assert.deepEqual(defaultPolicy.warnings, []);

const offConfig: PerformanceConfig = {
	...defaultPerformanceConfig,
	systems: {
		...defaultPerformanceConfig.systems,
		collision: { mode: "off" },
	},
};
const offPolicy = resolveCollisionPerformancePolicy(offConfig);
assert.equal(offPolicy.mode, "off");
assert.equal(offPolicy.diagnosticsEnabled, false);
assert.equal(offPolicy.activeOptimizationEnabled, false);

const unsupportedPolicy = resolveCollisionPerformancePolicy({
	mode: "active",
} as never);
assert.equal(unsupportedPolicy.mode, "off");
assert.equal(unsupportedPolicy.diagnosticsEnabled, false);
assert.equal(unsupportedPolicy.activeOptimizationEnabled, false);
assert.equal(unsupportedPolicy.unsupportedMode, "active");
assert.equal(unsupportedPolicy.warnings.length, 1);
assert.throws(
	() =>
		parsePerformanceConfig({
			...defaultPerformanceConfig,
			systems: {
				...defaultPerformanceConfig.systems,
				collision: { mode: "active" },
			},
		}),
	/performance config\.systems\.collision\.mode must be off or diagnostic/,
);

const firstInputChunk = chunks[0];
assert(firstInputChunk);
assert.equal(countCollisionMeshTriangles(firstInputChunk.mesh), 2);
assert.equal(countWalkableMeshTriangles(chunks), 4);

const summary = summarizeCollisionChunks(chunks);
const firstSummaryChunk = summary.chunks[0];
const thirdSummaryChunk = summary.chunks[2];
assert(firstSummaryChunk);
assert(thirdSummaryChunk);
assert.equal(summary.chunkCount, 3);
assert.equal(summary.walkableChunkCount, 2);
assert.equal(summary.triangleCount, 5);
assert.equal(summary.walkableTriangleCount, 4);
assert.deepEqual(summary.bounds, {
	min: [0, 0, 0],
	max: [12, 2, 8],
});
assert.equal(firstSummaryChunk.triangleCount, 2);
assert.equal(thirdSummaryChunk.walkableTriangleCount, 0);

const bucketPlan = buildCollisionSpatialBucketPlan({
	chunks: summary.chunks,
	bucketSizeMeters: 4,
});
assert.equal(bucketPlan.bucketSizeMeters, 4);
assert.equal(bucketPlan.bucketCount, 10);
assert.deepEqual(spatialBucketKeyForPoint([8.5, 0, 2], 4), [2, 0]);

const queryPlan = planCollisionSpatialQuery({
	plan: bucketPlan,
	origin: [1, 0, 1],
	radiusMeters: 2,
});
assert.deepEqual(queryPlan.candidateChunkIds, ["walkable-a"]);
assert.equal(queryPlan.candidateChunkCount, 1);
assert.equal(queryPlan.estimatedTriangleCount, 2);
assert.equal(queryPlan.estimatedWalkableTriangleCount, 2);

const crossBucketQueryPlan = planCollisionSpatialQuery({
	plan: bucketPlan,
	origin: [6, 0, 2],
	radiusMeters: 3,
});
assert.deepEqual(crossBucketQueryPlan.candidateChunkIds, [
	"walkable-a",
	"walkable-b",
]);
assert.equal(crossBucketQueryPlan.estimatedTriangleCount, 4);

const metricsOnly = collectCollisionBudgetDiagnostics({
	summary,
	bucketPlan,
	queryPlans: [queryPlan],
});
assert(metricsOnly.metrics.length > 0);
assert.equal(metricsOnly.warnings.length, 0);
assert.equal(
	metricsOnly.diagnostics.every(
		(diagnostic) => diagnostic.severity !== "warning",
	),
	true,
);

const warnings = collectCollisionBudgetDiagnostics({
	summary,
	bucketPlan,
	queryPlans: [queryPlan],
	budget: {
		walkableTriangleTarget: 3,
		trianglesPerChunkTarget: 1,
		chunksPerBucketTarget: 1,
		trianglesPerBucketTarget: 1,
		queryCandidateChunkTarget: 0,
		queryCandidateTriangleTarget: 1,
	},
});
assert(
	warnings.warnings.some(
		(diagnostic) =>
			diagnostic.code === "collision.budget.walkableTriangleTarget",
	),
);
assert(
	warnings.warnings.every((diagnostic) => diagnostic.severity === "warning"),
);
assert(
	warnings.diagnostics.every(
		(diagnostic) =>
			diagnostic.severity === "metric" || diagnostic.severity === "warning",
	),
);

console.log(
	`Performance collision contract passed for ${summary.chunkCount} chunks and ${summary.walkableTriangleCount} walkable triangles.`,
);
