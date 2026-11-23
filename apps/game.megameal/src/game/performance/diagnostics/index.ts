import type { World } from "../../../engine/core/index.js";
import type { AssetManagerPort } from "../../../engine/modules/assets/index.js";
import {
	COLLIDER_COMPONENT,
	type ColliderComponent,
} from "../../../engine/modules/physics/index.js";
import {
	LIGHT_COMPONENT,
	RENDERABLE_COMPONENT,
} from "../../../engine/modules/rendering/index.js";
import {
	PERFORMANCE_RUNTIME_STATE_RESOURCE,
	type PerformanceRuntimeState,
	type PerformanceRuntimeStatus,
} from "../runtime.js";
import {
	PERFORMANCE_CONFIG_RESOURCE,
	PERFORMANCE_SYSTEM_IDS,
	type PerformanceConfig,
	type PerformanceSystemId,
	type PerformanceSystemMode,
	defaultPerformanceConfig,
} from "../types.js";

type MeshColliderComponent = ColliderComponent & {
	readonly shape: Extract<
		ColliderComponent["shape"],
		{ readonly type: "mesh" }
	>;
};

export type PerformanceDiagnosticsState = {
	readonly activeRuntimeSceneId?: string;
	readonly config: PerformanceConfig;
	readonly counts: {
		readonly entities: number;
		readonly renderables: number;
		readonly lights: number;
		readonly colliders: number;
		readonly walkableMeshColliders: number;
		readonly meshCollisionTriangles: number;
		readonly loadedAssets: number;
	};
	readonly domains: Record<
		PerformanceSystemId,
		PerformanceDiagnosticsDomainSummary
	>;
};

export type PerformanceDiagnosticsDomainSummary = {
	readonly mode: PerformanceSystemMode;
	readonly runtimeStatus: PerformanceDiagnosticsRuntimeStatus;
	readonly subjects: readonly PerformanceDiagnosticsSubjectSummary[];
	readonly plannedOperations: readonly PerformanceDiagnosticsPlannedOperation[];
};

export type PerformanceDiagnosticsRuntimeStatus =
	| "disabled"
	| "diagnostic-only"
	| "active";

export type PerformanceDiagnosticsSubjectSummary = {
	readonly id: string;
	readonly label: string;
	readonly count: number;
};

export type PerformanceDiagnosticsPlannedOperation = {
	readonly id: string;
	readonly label: string;
	readonly status: PerformanceDiagnosticsRuntimeStatus;
	readonly candidateCount: number;
};

export type PerformanceDiagnosticsOptions = {
	readonly world: World;
	readonly assets?: Pick<AssetManagerPort, "listLoaded">;
	readonly activeRuntimeSceneId?: string;
};

export function collectPerformanceDiagnostics(
	options: PerformanceDiagnosticsOptions,
): PerformanceDiagnosticsState {
	const colliders = options.world
		.query([COLLIDER_COMPONENT])
		.map((entity) =>
			options.world.requireComponent<ColliderComponent>(
				entity,
				COLLIDER_COMPONENT,
			),
		);
	const meshColliders = colliders.filter(
		(collider): collider is MeshColliderComponent =>
			collider.shape.type === "mesh",
	);
	const walkableMeshColliders = meshColliders.filter(
		(collider) => collider.intent === "walkable",
	);
	const config = clonePerformanceConfig(
		options.world.getResource<PerformanceConfig>(PERFORMANCE_CONFIG_RESOURCE) ??
			defaultPerformanceConfig,
	);
	const runtimeState = options.world.getResource<PerformanceRuntimeState>(
		PERFORMANCE_RUNTIME_STATE_RESOURCE,
	);
	const counts = {
		entities: options.world.entities().length,
		renderables: options.world.query([RENDERABLE_COMPONENT]).length,
		lights: options.world.query([LIGHT_COMPONENT]).length,
		colliders: colliders.length,
		walkableMeshColliders: walkableMeshColliders.length,
		meshCollisionTriangles: meshColliders.reduce((count, collider) => {
			return count + collider.shape.indices.length / 3;
		}, 0),
		loadedAssets: options.assets?.listLoaded().length ?? 0,
	};

	return {
		...(options.activeRuntimeSceneId
			? { activeRuntimeSceneId: options.activeRuntimeSceneId }
			: {}),
		config,
		counts,
		domains: collectPerformanceDomainSummaries(config, counts, runtimeState),
	};
}

function collectPerformanceDomainSummaries(
	config: PerformanceConfig,
	counts: PerformanceDiagnosticsState["counts"],
	runtimeState: PerformanceRuntimeState | undefined,
): PerformanceDiagnosticsState["domains"] {
	return {
		lod: createDomainSummary({
			mode: config.systems.lod.mode,
			runtimeState: runtimeState?.domains.lod,
			subjects: [
				{
					id: "renderables",
					label: "Renderable candidates",
					count: counts.renderables,
				},
			],
			plannedOperation: {
				id: "lod:evaluate-renderable-candidates",
				label: "Evaluate renderable LOD candidates",
				candidateCount: counts.renderables,
			},
		}),
		culling: createDomainSummary({
			mode: config.systems.culling.mode,
			runtimeState: runtimeState?.domains.culling,
			subjects: [
				{
					id: "renderables",
					label: "Renderable visibility candidates",
					count: counts.renderables,
				},
			],
			plannedOperation: {
				id: "culling:evaluate-visibility-candidates",
				label: "Evaluate visibility candidates",
				candidateCount: counts.renderables,
			},
		}),
		streaming: createDomainSummary({
			mode: config.systems.streaming.mode,
			runtimeState: runtimeState?.domains.streaming,
			subjects: streamingDiagnosticSubjects(
				counts,
				runtimeState?.domains.streaming,
			),
			plannedOperation: {
				id: "streaming:evaluate-asset-residency",
				label: "Evaluate asset residency candidates",
				candidateCount: counts.loadedAssets,
			},
		}),
		collision: createDomainSummary({
			mode: config.systems.collision.mode,
			runtimeState: runtimeState?.domains.collision,
			subjects: [
				{
					id: "colliders",
					label: "Collider candidates",
					count: counts.colliders,
				},
				{
					id: "walkable-mesh-colliders",
					label: "Walkable mesh collider candidates",
					count: counts.walkableMeshColliders,
				},
				{
					id: "mesh-collision-triangles",
					label: "Mesh collision triangle candidates",
					count: counts.meshCollisionTriangles,
				},
			],
			plannedOperation: {
				id: "collision:evaluate-collision-workload",
				label: "Evaluate collision workload candidates",
				candidateCount: counts.colliders,
			},
		}),
	};
}

function streamingDiagnosticSubjects(
	counts: PerformanceDiagnosticsState["counts"],
	runtimeState: PerformanceRuntimeState["domains"]["streaming"] | undefined,
): readonly PerformanceDiagnosticsSubjectSummary[] {
	const subjects: PerformanceDiagnosticsSubjectSummary[] = [
		{
			id: "loaded-assets",
			label: "Loaded asset candidates",
			count: counts.loadedAssets,
		},
	];

	if (!runtimeState) {
		return subjects;
	}

	subjects.push(
		{
			id: "streaming-chunks",
			label: "Streaming chunks",
			count: runtimeState.candidateCount,
		},
		{
			id: "loaded-streaming-chunks",
			label: "Loaded streaming chunks",
			count: runtimeState.assetResidency.loadedChunkIds.length,
		},
		{
			id: "loading-streaming-chunks",
			label: "Loading streaming chunks",
			count: runtimeState.assetResidency.loadingChunkIds.length,
		},
		{
			id: "retained-streaming-assets",
			label: "Retained streaming assets",
			count: runtimeState.assetResidency.retainedAssetIds.length,
		},
		{
			id: "removed-streaming-colliders",
			label: "Removed streaming colliders",
			count: runtimeState.removedColliders.length,
		},
	);

	return subjects;
}

function createDomainSummary(options: {
	readonly mode: PerformanceSystemMode;
	readonly runtimeState:
		| Pick<
				PerformanceRuntimeState["domains"][PerformanceSystemId],
				"candidateCount" | "runtimeStatus"
		  >
		| undefined;
	readonly subjects: readonly PerformanceDiagnosticsSubjectSummary[];
	readonly plannedOperation: Omit<
		PerformanceDiagnosticsPlannedOperation,
		"status"
	>;
}): PerformanceDiagnosticsDomainSummary {
	const runtimeStatus: PerformanceDiagnosticsRuntimeStatus =
		options.runtimeState?.runtimeStatus ?? runtimeStatusForMode(options.mode);
	const candidateCount =
		options.runtimeState?.candidateCount ??
		options.plannedOperation.candidateCount;

	return {
		mode: options.mode,
		runtimeStatus,
		subjects: options.subjects.map((subject) => ({ ...subject })),
		plannedOperations: [
			{
				...options.plannedOperation,
				status: runtimeStatus,
				candidateCount,
			},
		],
	};
}

function runtimeStatusForMode(
	mode: PerformanceSystemMode,
): PerformanceRuntimeStatus {
	if (mode === "off") {
		return "disabled";
	}

	if (mode === "diagnostic") {
		return "diagnostic-only";
	}

	return "active";
}

function clonePerformanceConfig(config: PerformanceConfig): PerformanceConfig {
	return {
		schemaVersion: config.schemaVersion,
		systems: Object.fromEntries(
			PERFORMANCE_SYSTEM_IDS.map((systemId) => [
				systemId,
				{ ...config.systems[systemId] },
			]),
		) as PerformanceConfig["systems"],
	};
}
