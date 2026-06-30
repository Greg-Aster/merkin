import type {
	CollisionBudgetDiagnostic,
	CollisionBudgetDiagnosticReport,
	CollisionPerformanceBudget,
	CollisionPerformanceMeshSummary,
	CollisionSpatialBucketPlan,
	CollisionSpatialQueryPlan,
} from "./types.js";

export type CollisionBudgetDiagnosticOptions = {
	readonly summary: CollisionPerformanceMeshSummary;
	readonly bucketPlan?: CollisionSpatialBucketPlan;
	readonly queryPlans?: readonly CollisionSpatialQueryPlan[];
	readonly budget?: CollisionPerformanceBudget;
};

export function collectCollisionBudgetDiagnostics(
	options: CollisionBudgetDiagnosticOptions,
): CollisionBudgetDiagnosticReport {
	const metrics: CollisionBudgetDiagnostic[] = [
		createMetric(
			"collision.chunkCount",
			options.summary.chunkCount,
			"Collision chunk count.",
		),
		createMetric(
			"collision.walkableChunkCount",
			options.summary.walkableChunkCount,
			"Walkable collision chunk count.",
		),
		createMetric(
			"collision.triangleCount",
			options.summary.triangleCount,
			"Total mesh collision triangle count.",
		),
		createMetric(
			"collision.walkableTriangleCount",
			options.summary.walkableTriangleCount,
			"Walkable mesh collision triangle count.",
		),
		createMetric(
			"collision.trianglesPerLargestChunk",
			maximum(options.summary.chunks.map((chunk) => chunk.triangleCount)),
			"Largest collision chunk triangle count.",
		),
	];

	if (options.bucketPlan) {
		metrics.push(
			createMetric(
				"collision.spatialBucketCount",
				options.bucketPlan.bucketCount,
				"Spatial collision bucket count.",
			),
			createMetric(
				"collision.chunksPerLargestBucket",
				maximum(options.bucketPlan.buckets.map((bucket) => bucket.chunkCount)),
				"Largest spatial bucket chunk count.",
			),
			createMetric(
				"collision.trianglesPerLargestBucket",
				maximum(
					options.bucketPlan.buckets.map((bucket) => bucket.triangleCount),
				),
				"Largest spatial bucket triangle count.",
			),
		);
	}

	for (const [index, queryPlan] of (options.queryPlans ?? []).entries()) {
		metrics.push(
			createMetric(
				`collision.query.${index}.candidateChunkCount`,
				queryPlan.candidateChunkCount,
				"Spatial query candidate chunk count.",
			),
			createMetric(
				`collision.query.${index}.candidateTriangleCount`,
				queryPlan.estimatedTriangleCount,
				"Spatial query candidate triangle count.",
			),
		);
	}

	const warnings = createBudgetWarnings(options);

	return {
		metrics,
		warnings,
		diagnostics: [...metrics, ...warnings],
	};
}

function createBudgetWarnings(
	options: CollisionBudgetDiagnosticOptions,
): CollisionBudgetDiagnostic[] {
	const budget = options.budget;
	if (!budget) {
		return [];
	}

	const warnings: CollisionBudgetDiagnostic[] = [];
	pushWarningIfAbove(
		warnings,
		"collision.budget.walkableTriangleTarget",
		options.summary.walkableTriangleCount,
		budget.walkableTriangleTarget,
		"Walkable mesh collision triangles exceed the configured diagnostic target.",
	);
	pushWarningIfAbove(
		warnings,
		"collision.budget.trianglesPerChunkTarget",
		maximum(options.summary.chunks.map((chunk) => chunk.triangleCount)),
		budget.trianglesPerChunkTarget,
		"A collision chunk exceeds the configured diagnostic triangle target.",
	);

	if (options.bucketPlan) {
		pushWarningIfAbove(
			warnings,
			"collision.budget.chunksPerBucketTarget",
			maximum(options.bucketPlan.buckets.map((bucket) => bucket.chunkCount)),
			budget.chunksPerBucketTarget,
			"A spatial bucket exceeds the configured diagnostic chunk target.",
		);
		pushWarningIfAbove(
			warnings,
			"collision.budget.trianglesPerBucketTarget",
			maximum(options.bucketPlan.buckets.map((bucket) => bucket.triangleCount)),
			budget.trianglesPerBucketTarget,
			"A spatial bucket exceeds the configured diagnostic triangle target.",
		);
	}

	for (const [index, queryPlan] of (options.queryPlans ?? []).entries()) {
		pushWarningIfAbove(
			warnings,
			`collision.budget.query.${index}.candidateChunkTarget`,
			queryPlan.candidateChunkCount,
			budget.queryCandidateChunkTarget,
			"A spatial query exceeds the configured diagnostic candidate chunk target.",
		);
		pushWarningIfAbove(
			warnings,
			`collision.budget.query.${index}.candidateTriangleTarget`,
			queryPlan.estimatedTriangleCount,
			budget.queryCandidateTriangleTarget,
			"A spatial query exceeds the configured diagnostic candidate triangle target.",
		);
	}

	return warnings;
}

function createMetric(
	code: string,
	value: number,
	message: string,
): CollisionBudgetDiagnostic {
	return {
		severity: "metric",
		code,
		message,
		value,
	};
}

function pushWarningIfAbove(
	warnings: CollisionBudgetDiagnostic[],
	code: string,
	value: number,
	target: number | undefined,
	message: string,
): void {
	if (target === undefined || value <= target) {
		return;
	}

	warnings.push({
		severity: "warning",
		code,
		message,
		value,
		target,
	});
}

function maximum(values: readonly number[]): number {
	return values.reduce((max, value) => Math.max(max, value), 0);
}
