import type { PerformanceSystemMode } from "../types.js";

export type CollisionPerformanceVector3 = readonly [number, number, number];

export type CollisionPerformanceBounds = {
	readonly min: CollisionPerformanceVector3;
	readonly max: CollisionPerformanceVector3;
};

export type CollisionPerformanceChunkKey = readonly [number, number];

export type CollisionPerformanceMesh = {
	readonly vertices: readonly CollisionPerformanceVector3[];
	readonly indices: readonly number[];
};

export type CollisionPerformanceChunkInput = {
	readonly id: string;
	readonly stableId?: string;
	readonly chunkKey?: CollisionPerformanceChunkKey;
	readonly intent?: string;
	readonly bounds?: CollisionPerformanceBounds;
	readonly mesh: CollisionPerformanceMesh;
};

export type CollisionPerformanceChunkSummary = {
	readonly id: string;
	readonly stableId?: string;
	readonly chunkKey?: CollisionPerformanceChunkKey;
	readonly intent?: string;
	readonly bounds: CollisionPerformanceBounds;
	readonly vertexCount: number;
	readonly triangleCount: number;
	readonly walkableTriangleCount: number;
};

export type CollisionPerformanceMeshSummary = {
	readonly chunks: readonly CollisionPerformanceChunkSummary[];
	readonly chunkCount: number;
	readonly walkableChunkCount: number;
	readonly vertexCount: number;
	readonly triangleCount: number;
	readonly walkableTriangleCount: number;
	readonly bounds?: CollisionPerformanceBounds;
};

export type CollisionPerformancePolicy = {
	readonly mode: PerformanceSystemMode;
	readonly diagnosticsEnabled: boolean;
	readonly activeOptimizationEnabled: false;
	readonly unsupportedMode?: string;
	readonly warnings: readonly string[];
};

export type CollisionSpatialBucketKey = readonly [number, number];

export type CollisionSpatialBucketSummary = {
	readonly key: CollisionSpatialBucketKey;
	readonly bounds: CollisionPerformanceBounds;
	readonly chunkIds: readonly string[];
	readonly chunkCount: number;
	readonly triangleCount: number;
	readonly walkableTriangleCount: number;
};

export type CollisionSpatialBucketPlan = {
	readonly bucketSizeMeters: number;
	readonly chunks: readonly CollisionPerformanceChunkSummary[];
	readonly buckets: readonly CollisionSpatialBucketSummary[];
	readonly bucketCount: number;
	readonly bounds?: CollisionPerformanceBounds;
};

export type CollisionSpatialQueryPlan = {
	readonly origin: CollisionPerformanceVector3;
	readonly radiusMeters: number;
	readonly bucketKeys: readonly CollisionSpatialBucketKey[];
	readonly candidateChunkIds: readonly string[];
	readonly candidateChunkCount: number;
	readonly estimatedTriangleCount: number;
	readonly estimatedWalkableTriangleCount: number;
};

export type CollisionPerformanceBudget = {
	readonly walkableTriangleTarget?: number;
	readonly trianglesPerChunkTarget?: number;
	readonly chunksPerBucketTarget?: number;
	readonly trianglesPerBucketTarget?: number;
	readonly queryCandidateChunkTarget?: number;
	readonly queryCandidateTriangleTarget?: number;
};

export type CollisionBudgetDiagnosticSeverity = "metric" | "warning";

export type CollisionBudgetDiagnostic = {
	readonly severity: CollisionBudgetDiagnosticSeverity;
	readonly code: string;
	readonly message: string;
	readonly value: number;
	readonly target?: number;
};

export type CollisionBudgetDiagnosticReport = {
	readonly metrics: readonly CollisionBudgetDiagnostic[];
	readonly warnings: readonly CollisionBudgetDiagnostic[];
	readonly diagnostics: readonly CollisionBudgetDiagnostic[];
};
