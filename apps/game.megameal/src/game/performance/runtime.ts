import type { Entity, System, World } from "../../engine/core/index.js";
import type { RuntimeSceneManifestData } from "../../engine/data/index.js";
import type { Vec3 } from "../../engine/math/index.js";
import type { AssetManagerPort } from "../../engine/modules/assets/index.js";
import {
	COLLIDER_COMPONENT,
	type ColliderComponent,
} from "../../engine/modules/physics/index.js";
import {
	LIGHT_COMPONENT,
	type LightComponent,
	RENDERABLE_COMPONENT,
	type RenderTransform,
	type RenderableComponent,
	TRANSFORM_COMPONENT,
} from "../../engine/modules/rendering/index.js";
import type { RuntimeUpdateContext } from "../../engine/runtime/index.js";
import { STABLE_ID_COMPONENT } from "../prefabs/index.js";
import { PLAYER_ENTITY_RESOURCE } from "../systems/components.js";
import {
	COLLISION_SPATIAL_INDEX_RESOURCE,
	type CollisionBudgetDiagnosticReport,
	type CollisionPerformanceMeshSummary,
	type CollisionSpatialBucketPlan,
	type CollisionSpatialIndexResource,
	type CollisionSpatialQueryPlan,
	buildCollisionSpatialBucketPlan,
	collectCollisionBudgetDiagnostics,
	collectRuntimeCollisionChunks,
	planCollisionSpatialQuery,
	resolveCollisionPerformancePolicy,
	summarizeCollisionChunks,
} from "./collision/index.js";
import {
	PERFORMANCE_LOD_COMPONENT,
	type PerformanceLodComponent,
	STREAMING_CHUNK_COMPONENT,
	type StreamingChunkComponent,
} from "./components.js";
import {
	type CullingSubjectDecision,
	type PreviousCullingDecision,
	evaluateCullingBatch,
} from "./culling/index.js";
import {
	type LodEvaluationResult,
	type LodGroupDefinition,
	createLodPolicyConfigFromPerformanceConfig,
	evaluateLodTier,
} from "./lod/index.js";
import {
	type StreamingChunkContent,
	type StreamingChunkDefinition,
	type StreamingPlan,
	createStreamingPlan,
} from "./streaming/index.js";
import {
	PERFORMANCE_CONFIG_RESOURCE,
	type PerformanceConfig,
	type PerformanceSystemMode,
	defaultPerformanceConfig,
} from "./types.js";

export const PERFORMANCE_RUNTIME_STATE_RESOURCE =
	"game:performanceRuntimeState";

export type PerformanceRuntimeStatus =
	| "disabled"
	| "diagnostic-only"
	| "active";

export type PerformanceRuntimeState = {
	readonly tick: number;
	readonly config: PerformanceConfig;
	readonly observer: {
		readonly entity?: Entity;
		readonly position: readonly [number, number, number];
	};
	readonly domains: {
		readonly lod: PerformanceLodRuntimeState;
		readonly culling: PerformanceCullingRuntimeState;
		readonly streaming: PerformanceStreamingRuntimeState;
		readonly collision: PerformanceCollisionRuntimeState;
	};
};

export type PerformanceDomainRuntimeState = {
	readonly mode: PerformanceSystemMode;
	readonly runtimeStatus: PerformanceRuntimeStatus;
	readonly candidateCount: number;
	readonly warnings: readonly string[];
};

export type PerformanceLodRuntimeState = PerformanceDomainRuntimeState & {
	readonly appliedRenderableCount: number;
	readonly swappedRenderables: readonly string[];
	readonly evaluations: readonly PerformanceLodEvaluationSummary[];
};

export type PerformanceLodEvaluationSummary = {
	readonly entity: Entity;
	readonly stableId?: string;
	readonly selectedTierId?: string;
	readonly recommendedTierId?: string;
	readonly active: boolean;
	readonly reason: LodEvaluationResult["reason"];
};

export type PerformanceCullingRuntimeState = PerformanceDomainRuntimeState & {
	readonly renderedCount: number;
	readonly hiddenRenderables: readonly string[];
	readonly hiddenLights: readonly string[];
	readonly decisions: readonly PerformanceCullingDecisionSummary[];
};

export type PerformanceCullingDecisionSummary = {
	readonly entity: Entity;
	readonly stableId?: string;
	readonly kind: "renderable" | "light";
	readonly renderIncluded: boolean;
	readonly updateIncluded: boolean;
	readonly distanceToObserver: number;
	readonly reasons: readonly string[];
};

export type PerformanceStreamingRuntimeState = PerformanceDomainRuntimeState & {
	readonly chunks: readonly StreamingChunkDefinition[];
	readonly plan: StreamingPlan;
	readonly appliedVisualCount: number;
	readonly appliedColliderCount: number;
	readonly hiddenRenderables: readonly string[];
	readonly hiddenLights: readonly string[];
	readonly removedColliders: readonly string[];
	readonly retainedRequiredColliders: readonly string[];
	readonly assetResidency: PerformanceStreamingAssetResidencyState;
};

export type PerformanceStreamingAssetResidencyState = {
	readonly loadedChunkIds: readonly string[];
	readonly loadingChunkIds: readonly string[];
	readonly retainedAssetIds: readonly string[];
	readonly failedAssetIds: readonly string[];
};

export type PerformanceCollisionRuntimeState = PerformanceDomainRuntimeState & {
	readonly summary: CollisionPerformanceMeshSummary;
	readonly spatialBucketPlan?: CollisionSpatialBucketPlan;
	readonly spatialQueryPlans: readonly CollisionSpatialQueryPlan[];
	readonly diagnostics: CollisionBudgetDiagnosticReport;
};

export type PerformanceRuntimeSystemOptions = {
	readonly assets?: Pick<
		AssetManagerPort,
		"has" | "load" | "retain" | "release" | "listLoaded"
	>;
	readonly runtimeSceneManifest?: () => RuntimeSceneManifestData | undefined;
};

type RuntimeSubject = {
	readonly entity: Entity;
	readonly stableId?: string;
	readonly transform: RenderTransform;
};

type VisibilityBaseline = boolean | undefined;
type RenderableBaseline = RenderableComponent;
type ColliderBaseline = ColliderComponent;
type StreamingAssetResidencyStore = {
	readonly loadedChunkIds: Set<string>;
	readonly requests: Map<string, StreamingAssetRequest>;
	readonly failedAssetIds: Map<string, string>;
};
type StreamingAssetRequest = {
	readonly chunkId: string;
	readonly assetIds: readonly string[];
	readonly retainedAssetIds: readonly string[];
	status: "loading" | "loaded";
	releaseAfterSettled: boolean;
};

export function createPerformanceRuntimeSystem(
	options: PerformanceRuntimeSystemOptions = {},
): System<RuntimeUpdateContext> {
	const previousCullingDecisions = new Map<string, PreviousCullingDecision>();
	const lodRenderableBaselines = new Map<Entity, RenderableBaseline>();
	const renderableBaselines = new Map<Entity, VisibilityBaseline>();
	const lightBaselines = new Map<Entity, VisibilityBaseline>();
	const colliderBaselines = new Map<Entity, ColliderBaseline>();
	const streamingAssetResidency: StreamingAssetResidencyStore = {
		loadedChunkIds: new Set<string>(),
		requests: new Map<string, StreamingAssetRequest>(),
		failedAssetIds: new Map<string, string>(),
	};

	return {
		id: "performance-runtime",
		reads: [
			PERFORMANCE_CONFIG_RESOURCE,
			PLAYER_ENTITY_RESOURCE,
			STABLE_ID_COMPONENT,
			TRANSFORM_COMPONENT,
			RENDERABLE_COMPONENT,
			PERFORMANCE_LOD_COMPONENT,
			STREAMING_CHUNK_COMPONENT,
			LIGHT_COMPONENT,
			COLLIDER_COMPONENT,
		],
		writes: [
			PERFORMANCE_RUNTIME_STATE_RESOURCE,
			RENDERABLE_COMPONENT,
			LIGHT_COMPONENT,
		],
		update(context) {
			const config = clonePerformanceConfig(
				context.world.getResource<PerformanceConfig>(
					PERFORMANCE_CONFIG_RESOURCE,
				) ?? defaultPerformanceConfig,
			);
			const observer = resolvePerformanceObserver(context.world);
			const renderables = collectRuntimeSubjects(
				context.world,
				RENDERABLE_COMPONENT,
			);
			const lights = collectRuntimeSubjects(context.world, LIGHT_COMPONENT);
			const lod = evaluateRuntimeLod({
				config,
				world: context.world,
				observerPosition: observer.position,
				renderables,
				lodRenderableBaselines,
				renderableVisibilityBaselines: renderableBaselines,
			});
			const culling = evaluateRuntimeCulling({
				config,
				observerPosition: observer.position,
				renderables,
				lights,
				previousDecisions: previousCullingDecisions,
			});
			const streaming = evaluateRuntimeStreaming({
				config,
				world: context.world,
				observerPosition: observer.position,
				assets: options.assets,
				runtimeSceneManifest: options.runtimeSceneManifest?.(),
				streamingAssetResidency,
				colliderBaselines,
			});
			applyRuntimeVisibility({
				world: context.world,
				renderables,
				lights,
				culling,
				streaming,
				renderableBaselines,
				lightBaselines,
			});
			const collision = evaluateRuntimeCollision({
				config,
				world: context.world,
				observerPosition: observer.position,
			});

			context.world.setResource<PerformanceRuntimeState>(
				PERFORMANCE_RUNTIME_STATE_RESOURCE,
				{
					tick: context.tick,
					config,
					observer,
					domains: {
						lod,
						culling,
						streaming,
						collision,
					},
				},
			);
		},
	};
}

function evaluateRuntimeLod(options: {
	readonly config: PerformanceConfig;
	readonly world: World;
	readonly observerPosition: readonly [number, number, number];
	readonly renderables: readonly RuntimeSubject[];
	readonly lodRenderableBaselines: Map<Entity, RenderableBaseline>;
	readonly renderableVisibilityBaselines: Map<Entity, VisibilityBaseline>;
}): PerformanceLodRuntimeState {
	const active = options.config.systems.lod.mode === "distance";
	const groups = lodGroupsFromConfig(options.config);
	const policy = createLodPolicyConfigFromPerformanceConfig(
		options.config,
		groups,
	);
	const authoredLodByEntity = collectRuntimeLodComponents(options.world);
	const swappedRenderables: string[] = [];
	const evaluations = options.renderables.map((subject) => {
		const authoredLod = authoredLodByEntity.get(subject.entity);
		const result = evaluateLodTier(policy, {
			groupId: authoredLod?.groupId ?? "renderable",
			distance: distanceBetween(
				options.observerPosition,
				subject.transform.position,
			),
			significance: 1,
		});

		const summary: PerformanceLodEvaluationSummary = {
			entity: subject.entity,
			...(subject.stableId ? { stableId: subject.stableId } : {}),
			...(result.selectedTierId
				? { selectedTierId: result.selectedTierId }
				: {}),
			...(result.recommendedTierId
				? { recommendedTierId: result.recommendedTierId }
				: {}),
			active: result.active,
			reason: result.reason,
		};

		if (
			active &&
			authoredLod &&
			result.active &&
			result.selectedTierId &&
			applyLodRenderable({
				world: options.world,
				entity: subject.entity,
				selectedTierId: result.selectedTierId,
				lod: authoredLod,
				lodRenderableBaselines: options.lodRenderableBaselines,
				renderableVisibilityBaselines: options.renderableVisibilityBaselines,
			})
		) {
			swappedRenderables.push(cullingSubjectId(subject));
		}

		if (active && authoredLod && (!result.active || !result.selectedTierId)) {
			restoreLodRenderable(
				options.world,
				subject.entity,
				options.lodRenderableBaselines,
			);
		}

		return summary;
	});

	if (!active) {
		restoreAllLodRenderables(options.world, options.lodRenderableBaselines);
	}

	const warnings =
		options.config.systems.lod.mode === "distance" && groups.length === 0
			? ["LOD distance mode needs at least one configured tier."]
			: [];

	return {
		mode: options.config.systems.lod.mode,
		runtimeStatus: runtimeStatusForMode(options.config.systems.lod.mode),
		candidateCount: options.renderables.length,
		warnings,
		appliedRenderableCount: swappedRenderables.length,
		swappedRenderables,
		evaluations,
	};
}

function evaluateRuntimeCulling(options: {
	readonly config: PerformanceConfig;
	readonly observerPosition: readonly [number, number, number];
	readonly renderables: readonly RuntimeSubject[];
	readonly lights: readonly RuntimeSubject[];
	readonly previousDecisions: Map<string, PreviousCullingDecision>;
}): PerformanceCullingRuntimeState {
	const mode = options.config.systems.culling.mode;
	const active = mode === "distance";
	const distanceConfig = options.config.systems.culling.visibility?.distance;
	const candidateSubjects = [
		...options.renderables.map((subject) => ({
			...subject,
			kind: "renderable" as const,
		})),
		...options.lights.map((subject) => ({
			...subject,
			kind: "light" as const,
		})),
	];
	const decisions = evaluateCullingBatch(
		{
			mode,
			observerPosition: vectorToObject(options.observerPosition),
			...(distanceConfig?.maxDistance !== undefined
				? {
						defaultRenderRelevanceRadius: distanceConfig.maxDistance,
						defaultUpdateRelevanceRadius: distanceConfig.maxDistance,
					}
				: {}),
			...(distanceConfig?.hysteresis !== undefined
				? {
						hysteresis: {
							distance: distanceConfig.hysteresis,
						},
					}
				: {}),
		},
		candidateSubjects.map((subject) => ({
			id: cullingSubjectId(subject),
			position: vectorToObject(vec3ToTuple(subject.transform.position)),
		})),
		options.previousDecisions,
	);
	const summaries = decisions.flatMap((decision, index) => {
		const subject = candidateSubjects[index];
		return subject ? [summarizeCullingDecision(subject, decision)] : [];
	});

	options.previousDecisions.clear();
	for (const decision of decisions) {
		options.previousDecisions.set(decision.id, {
			updateIncluded: decision.updateIncluded,
			renderIncluded: decision.renderIncluded,
		});
	}

	const hiddenRenderables = summaries
		.filter(
			(summary) => summary.kind === "renderable" && !summary.renderIncluded,
		)
		.map(cullingSummaryId);
	const hiddenLights = summaries
		.filter((summary) => summary.kind === "light" && !summary.renderIncluded)
		.map(cullingSummaryId);
	const renderedCount = summaries.filter(
		(summary) => summary.kind === "renderable" && summary.renderIncluded,
	).length;
	const warnings =
		active && distanceConfig?.maxDistance === undefined
			? ["Culling distance mode needs visibility.distance.maxDistance."]
			: [];

	return {
		mode,
		runtimeStatus: runtimeStatusForMode(mode),
		candidateCount: candidateSubjects.length,
		renderedCount,
		hiddenRenderables,
		hiddenLights,
		decisions: summaries,
		warnings,
	};
}

function evaluateRuntimeStreaming(options: {
	readonly config: PerformanceConfig;
	readonly world: World;
	readonly observerPosition: readonly [number, number, number];
	readonly assets:
		| Pick<
				AssetManagerPort,
				"has" | "load" | "retain" | "release" | "listLoaded"
		  >
		| undefined;
	readonly runtimeSceneManifest: RuntimeSceneManifestData | undefined;
	readonly streamingAssetResidency: StreamingAssetResidencyStore;
	readonly colliderBaselines: Map<Entity, ColliderBaseline>;
}): PerformanceStreamingRuntimeState {
	const chunks = streamingChunksForRuntime({
		world: options.world,
		runtimeSceneManifest: options.runtimeSceneManifest,
	});
	const loadedAssetIds = options.assets?.listLoaded() ?? [];
	const residencyConfig = options.config.systems.streaming.residency;
	const renderableWindow =
		residencyConfig?.renderables ??
		residencyConfig?.assets ??
		residencyConfig?.collision;
	reconcileMissingStreamingChunks({
		chunks,
		state: options.streamingAssetResidency,
		assets: options.assets,
	});
	const initialPlan = createStreamingPlan({
		performanceConfig: options.config,
		chunks,
		residency: {
			loadedChunkIds: streamingLoadedChunkIdsForPlan({
				chunks,
				state: options.streamingAssetResidency,
				loadedAssetIds,
			}),
			loadingChunkIds: streamingLoadingChunkIdsForPlan(
				options.streamingAssetResidency,
			),
		},
		focus: {
			playerPosition: options.observerPosition,
		},
		...(renderableWindow?.loadDistance !== undefined
			? { defaultLoadRadius: renderableWindow.loadDistance }
			: {}),
		...(renderableWindow?.unloadDistance !== undefined
			? { defaultUnloadRadius: renderableWindow.unloadDistance }
			: {}),
	});
	const streamingWarnings = reconcileStreamingAssetResidency({
		plan: initialPlan,
		assets: options.assets,
		state: options.streamingAssetResidency,
	});
	const finalPlan = createStreamingPlan({
		performanceConfig: options.config,
		chunks,
		residency: {
			loadedChunkIds: streamingLoadedChunkIdsForPlan({
				chunks,
				state: options.streamingAssetResidency,
				loadedAssetIds: options.assets?.listLoaded() ?? loadedAssetIds,
			}),
			loadingChunkIds: streamingLoadingChunkIdsForPlan(
				options.streamingAssetResidency,
			),
		},
		focus: {
			playerPosition: options.observerPosition,
		},
		...(renderableWindow?.loadDistance !== undefined
			? { defaultLoadRadius: renderableWindow.loadDistance }
			: {}),
		...(renderableWindow?.unloadDistance !== undefined
			? { defaultUnloadRadius: renderableWindow.unloadDistance }
			: {}),
	});
	const contentResidency = streamingContentResidency(finalPlan, chunks);
	const colliderResidency = applyRuntimeColliderResidency({
		world: options.world,
		plan: finalPlan,
		chunks,
		runtimeSceneManifest: options.runtimeSceneManifest,
		colliderBaselines: options.colliderBaselines,
	});
	const assetResidency = summarizeStreamingAssetResidency(
		options.streamingAssetResidency,
		finalPlan,
	);

	return {
		mode: options.config.systems.streaming.mode,
		runtimeStatus: runtimeStatusForMode(options.config.systems.streaming.mode),
		candidateCount: chunks.length,
		warnings: [
			...finalPlan.warnings,
			...streamingWarnings,
			...streamingAssetFailureWarnings(options.streamingAssetResidency),
		],
		chunks,
		plan: finalPlan,
		appliedVisualCount:
			contentResidency.visibleRenderables.size +
			contentResidency.visibleLights.size,
		appliedColliderCount: colliderResidency.appliedColliderCount,
		hiddenRenderables: [...contentResidency.hiddenRenderables],
		hiddenLights: [...contentResidency.hiddenLights],
		removedColliders: colliderResidency.removedColliders,
		retainedRequiredColliders: colliderResidency.retainedRequiredColliders,
		assetResidency,
	};
}

function evaluateRuntimeCollision(options: {
	readonly config: PerformanceConfig;
	readonly world: World;
	readonly observerPosition: readonly [number, number, number];
}): PerformanceCollisionRuntimeState {
	const policy = resolveCollisionPerformancePolicy(options.config);
	const index = options.world.getResource<CollisionSpatialIndexResource>(
		COLLISION_SPATIAL_INDEX_RESOURCE,
	);
	const summary =
		index?.summary ??
		summarizeCollisionChunks(collectRuntimeCollisionChunks(options.world));
	const spatialBucketPlan =
		index?.plan ??
		(policy.diagnosticsEnabled || policy.activeOptimizationEnabled
			? buildCollisionSpatialBucketPlan({
					chunks: summary.chunks,
					bucketSizeMeters: 16,
				})
			: undefined);
	const spatialQueryPlans: CollisionSpatialQueryPlan[] = [];

	if (spatialBucketPlan) {
		spatialQueryPlans.push(
			planCollisionSpatialQuery({
				plan: spatialBucketPlan,
				origin: options.observerPosition,
				radiusMeters: 12,
			}),
		);
	}

	return {
		mode: options.config.systems.collision.mode,
		runtimeStatus: runtimeStatusForMode(options.config.systems.collision.mode),
		candidateCount: summary.chunks.length,
		warnings: policy.warnings,
		summary,
		...(spatialBucketPlan ? { spatialBucketPlan } : {}),
		spatialQueryPlans,
		diagnostics: collectCollisionBudgetDiagnostics({
			summary,
			...(spatialBucketPlan ? { bucketPlan: spatialBucketPlan } : {}),
			queryPlans: spatialQueryPlans,
		}),
	};
}

function resolvePerformanceObserver(world: World): {
	readonly entity?: Entity;
	readonly position: readonly [number, number, number];
} {
	const player = world.getResource<Entity>(PLAYER_ENTITY_RESOURCE);
	const transform =
		player === undefined
			? undefined
			: world.getComponent<RenderTransform>(player, TRANSFORM_COMPONENT);

	if (player !== undefined && transform) {
		return {
			entity: player,
			position: vec3ToTuple(transform.position),
		};
	}

	return {
		position: [0, 0, 0],
	};
}

function collectRuntimeSubjects(
	world: World,
	componentName: typeof RENDERABLE_COMPONENT | typeof LIGHT_COMPONENT,
): readonly RuntimeSubject[] {
	return world.query([TRANSFORM_COMPONENT, componentName]).map((entity) => {
		const transform = world.requireComponent<RenderTransform>(
			entity,
			TRANSFORM_COMPONENT,
		);
		const stableId = stableIdForEntity(world, entity);

		return {
			entity,
			...(stableId ? { stableId } : {}),
			transform,
		};
	});
}

function collectRuntimeLodComponents(
	world: World,
): ReadonlyMap<Entity, PerformanceLodComponent> {
	const components = new Map<Entity, PerformanceLodComponent>();

	for (const entity of world.query([PERFORMANCE_LOD_COMPONENT])) {
		const component = world.getComponent<PerformanceLodComponent>(
			entity,
			PERFORMANCE_LOD_COMPONENT,
		);

		if (component) {
			components.set(entity, component);
		}
	}

	return components;
}

function applyLodRenderable(options: {
	readonly world: World;
	readonly entity: Entity;
	readonly selectedTierId: string;
	readonly lod: PerformanceLodComponent;
	readonly lodRenderableBaselines: Map<Entity, RenderableBaseline>;
	readonly renderableVisibilityBaselines: Map<Entity, VisibilityBaseline>;
}): boolean {
	const tier = options.lod.tiers.find(
		(candidate) => candidate.id === options.selectedTierId,
	);

	if (!tier?.renderable) {
		return restoreLodRenderable(
			options.world,
			options.entity,
			options.lodRenderableBaselines,
		);
	}

	const renderable = options.world.getComponent<RenderableComponent>(
		options.entity,
		RENDERABLE_COMPONENT,
	);

	if (!renderable) {
		options.lodRenderableBaselines.delete(options.entity);
		return false;
	}

	if (!options.lodRenderableBaselines.has(options.entity)) {
		options.lodRenderableBaselines.set(options.entity, renderable);
	}

	const visibilityBaseline = options.renderableVisibilityBaselines.get(
		options.entity,
	);
	const visible =
		renderable.visible === false
			? false
			: visibilityBaseline === undefined
				? tier.renderable.visible
				: visibilityBaseline;
	options.world.addComponent<RenderableComponent>(
		options.entity,
		RENDERABLE_COMPONENT,
		withOptionalVisible(tier.renderable, visible),
	);
	return true;
}

function restoreLodRenderable(
	world: World,
	entity: Entity,
	baselines: Map<Entity, RenderableBaseline>,
): boolean {
	const baseline = baselines.get(entity);

	if (!baseline) {
		return false;
	}

	if (!world.isAlive(entity)) {
		baselines.delete(entity);
		return false;
	}

	const current = world.getComponent<RenderableComponent>(
		entity,
		RENDERABLE_COMPONENT,
	);
	const visible = current?.visible;
	world.addComponent<RenderableComponent>(
		entity,
		RENDERABLE_COMPONENT,
		withOptionalVisible(baseline, visible),
	);
	baselines.delete(entity);
	return true;
}

function restoreAllLodRenderables(
	world: World,
	baselines: Map<Entity, RenderableBaseline>,
): void {
	for (const entity of [...baselines.keys()]) {
		restoreLodRenderable(world, entity, baselines);
	}
}

function lodGroupsFromConfig(
	config: PerformanceConfig,
): readonly LodGroupDefinition[] {
	const tiers = config.systems.lod.tiers ?? [];

	if (tiers.length === 0) {
		return [];
	}

	return [
		{
			id: "renderable",
			...(tiers[0]?.id !== undefined ? { defaultTierId: tiers[0].id } : {}),
			tiers: tiers.map((tier) => ({
				id: tier.id,
				...(tier.maxDistance !== undefined
					? { maxDistance: tier.maxDistance }
					: {}),
			})),
		},
	];
}

function streamingChunksForRuntime(options: {
	readonly world: World;
	readonly runtimeSceneManifest: RuntimeSceneManifestData | undefined;
}): readonly StreamingChunkDefinition[] {
	return [
		...startupStreamingChunksForRuntimeManifest(options.runtimeSceneManifest),
		...streamingChunksFromWorld(options.world),
	];
}

function startupStreamingChunksForRuntimeManifest(
	manifest: RuntimeSceneManifestData | undefined,
): readonly StreamingChunkDefinition[] {
	if (!manifest) {
		return [];
	}

	const preloadAssetIds = new Set(manifest.level.preload ?? []);

	for (const preloadGroup of manifest.level.preloadGroups ?? []) {
		for (const assetId of manifest.assets.preloadGroups?.[preloadGroup] ?? []) {
			preloadAssetIds.add(assetId);
		}
	}

	const startupAssetIds = [...preloadAssetIds].sort();

	if (startupAssetIds.length === 0) {
		return [];
	}

	return [
		{
			id: `startup:${manifest.id}:preload`,
			role: "startup",
			content: {
				assetIds: startupAssetIds,
			},
		},
	];
}

function streamingChunksFromWorld(
	world: World,
): readonly StreamingChunkDefinition[] {
	return world.query([STREAMING_CHUNK_COMPONENT]).flatMap((entity) => {
		const component = world.getComponent<StreamingChunkComponent>(
			entity,
			STREAMING_CHUNK_COMPONENT,
		);

		if (!component) {
			return [];
		}

		const stableId = stableIdForEntity(world, entity);
		const chunkId = component.id ?? stableId ?? `entity:${entity}`;
		const transform = world.getComponent<RenderTransform>(
			entity,
			TRANSFORM_COMPONENT,
		);
		const center =
			component.center ??
			(transform ? vec3ToTuple(transform.position) : undefined);
		const content = streamingChunkContentForEntity(world, entity, component);

		return [
			{
				id: chunkId,
				role: component.role,
				...(center ? { center } : {}),
				...(component.loadRadius !== undefined
					? { loadRadius: component.loadRadius }
					: {}),
				...(component.unloadRadius !== undefined
					? { unloadRadius: component.unloadRadius }
					: {}),
				...(component.priority !== undefined
					? { priority: component.priority }
					: {}),
				content,
			},
		];
	});
}

function streamingChunkContentForEntity(
	world: World,
	entity: Entity,
	component: StreamingChunkComponent,
): StreamingChunkContent {
	const stableId = stableIdForEntity(world, entity) ?? `entity:${entity}`;
	const assetIds = component.assetIds ?? [];
	const renderStableIds =
		component.includeRenderable !== false &&
		world.hasComponent(entity, RENDERABLE_COMPONENT)
			? [stableId]
			: [];
	const lightStableIds =
		component.includeLight !== false &&
		world.hasComponent(entity, LIGHT_COMPONENT)
			? [stableId]
			: [];
	const colliderStableIds =
		component.includeCollider === true ? [stableId] : [];

	return {
		...(assetIds.length > 0 ? { assetIds } : {}),
		...(renderStableIds.length > 0 ? { renderStableIds } : {}),
		...(lightStableIds.length > 0 ? { lightStableIds } : {}),
		...(colliderStableIds.length > 0 ? { colliderStableIds } : {}),
	};
}

function reconcileMissingStreamingChunks(options: {
	readonly chunks: readonly StreamingChunkDefinition[];
	readonly state: StreamingAssetResidencyStore;
	readonly assets: Pick<AssetManagerPort, "release"> | undefined;
}): void {
	const liveChunkIds = new Set(options.chunks.map((chunk) => chunk.id));

	for (const chunkId of [...options.state.loadedChunkIds]) {
		if (!liveChunkIds.has(chunkId)) {
			options.state.loadedChunkIds.delete(chunkId);
		}
	}

	for (const chunkId of [...options.state.requests.keys()]) {
		if (!liveChunkIds.has(chunkId)) {
			unloadStreamingAssetChunk({
				chunkId,
				assets: options.assets,
				state: options.state,
				warnings: [],
			});
		}
	}
}

function streamingLoadedChunkIdsForPlan(options: {
	readonly chunks: readonly StreamingChunkDefinition[];
	readonly state: StreamingAssetResidencyStore;
	readonly loadedAssetIds: readonly string[];
}): readonly string[] {
	const loaded = new Set(options.state.loadedChunkIds);
	const loadedAssetIds = new Set(options.loadedAssetIds);

	for (const [chunkId, request] of options.state.requests.entries()) {
		if (request.status === "loaded") {
			loaded.add(chunkId);
		}
	}

	for (const chunk of options.chunks) {
		if (
			chunk.role === "startup" &&
			streamingChunkAssetsLoaded(chunk, loadedAssetIds)
		) {
			loaded.add(chunk.id);
		}
	}

	return [...loaded].sort();
}

function streamingLoadingChunkIdsForPlan(
	state: StreamingAssetResidencyStore,
): readonly string[] {
	return [...state.requests.values()]
		.filter(
			(request) => request.status === "loading" && !request.releaseAfterSettled,
		)
		.map((request) => request.chunkId)
		.sort();
}

function streamingChunkAssetsLoaded(
	chunk: StreamingChunkDefinition,
	loadedAssetIds: ReadonlySet<string>,
): boolean {
	const assetIds = chunk.content?.assetIds ?? [];
	return (
		assetIds.length === 0 || assetIds.every((id) => loadedAssetIds.has(id))
	);
}

function reconcileStreamingAssetResidency(options: {
	readonly plan: StreamingPlan;
	readonly assets:
		| Pick<AssetManagerPort, "has" | "load" | "retain" | "release">
		| undefined;
	readonly state: StreamingAssetResidencyStore;
}): readonly string[] {
	const warnings: string[] = [];

	if (!options.plan.active) {
		releaseAllStreamingAssetRequests({
			assets: options.assets,
			state: options.state,
			warnings,
		});
		options.state.loadedChunkIds.clear();
		return warnings;
	}

	for (const operation of options.plan.operations) {
		if (operation.kind === "load-chunk") {
			loadStreamingAssetChunk({
				chunkId: operation.chunkId,
				assetIds: operation.content.assetIds,
				assets: options.assets,
				state: options.state,
				warnings,
			});
		} else {
			unloadStreamingAssetChunk({
				chunkId: operation.chunkId,
				assets: options.assets,
				state: options.state,
				warnings,
			});
		}
	}

	return warnings;
}

function loadStreamingAssetChunk(options: {
	readonly chunkId: string;
	readonly assetIds: readonly string[];
	readonly assets:
		| Pick<AssetManagerPort, "has" | "load" | "retain" | "release">
		| undefined;
	readonly state: StreamingAssetResidencyStore;
	readonly warnings: string[];
}): void {
	if (
		options.state.loadedChunkIds.has(options.chunkId) ||
		options.state.requests.has(options.chunkId)
	) {
		return;
	}

	const assetIds = uniqueSorted(options.assetIds);

	for (const assetId of assetIds) {
		options.state.failedAssetIds.delete(assetId);
	}

	if (assetIds.length === 0) {
		options.state.loadedChunkIds.add(options.chunkId);
		return;
	}

	if (!options.assets) {
		options.warnings.push(
			`Streaming chunk "${options.chunkId}" needs asset residency, but no asset manager port is available.`,
		);
		return;
	}

	const missingAssetIds = assetIds.filter(
		(assetId) => !options.assets?.has(assetId),
	);
	if (missingAssetIds.length > 0) {
		for (const assetId of missingAssetIds) {
			options.state.failedAssetIds.set(assetId, "asset is not registered");
		}
		options.warnings.push(
			`Streaming chunk "${options.chunkId}" references unregistered assets: ${missingAssetIds.join(", ")}.`,
		);
		return;
	}

	const retainedAssetIds: string[] = [];
	try {
		for (const assetId of assetIds) {
			options.assets.retain(assetId);
			retainedAssetIds.push(assetId);
		}
	} catch (error) {
		releaseRetainedStreamingAssets({
			assets: options.assets,
			assetIds: retainedAssetIds,
			warnings: options.warnings,
		});
		options.warnings.push(
			`Streaming chunk "${options.chunkId}" could not retain assets: ${errorMessage(error)}.`,
		);
		return;
	}

	const request: StreamingAssetRequest = {
		chunkId: options.chunkId,
		assetIds,
		retainedAssetIds,
		status: "loading",
		releaseAfterSettled: false,
	};
	options.state.requests.set(options.chunkId, request);

	void Promise.all(
		assetIds.map(async (assetId) => {
			try {
				await options.assets?.load(assetId);
				return { assetId };
			} catch (error) {
				return { assetId, error: errorMessage(error) };
			}
		}),
	).then((results) => {
		const current = options.state.requests.get(options.chunkId);
		if (current !== request) {
			return;
		}

		const failedResults = results.filter(
			(
				result,
			): result is { readonly assetId: string; readonly error: string } =>
				"error" in result,
		);

		if (failedResults.length > 0) {
			for (const result of failedResults) {
				options.state.failedAssetIds.set(result.assetId, result.error);
			}
			releaseStreamingAssetRequest({
				request,
				assets: options.assets,
				state: options.state,
				warnings: [],
			});
			return;
		}

		if (request.releaseAfterSettled) {
			releaseStreamingAssetRequest({
				request,
				assets: options.assets,
				state: options.state,
				warnings: [],
			});
			return;
		}

		request.status = "loaded";
		options.state.loadedChunkIds.add(options.chunkId);
	});
}

function unloadStreamingAssetChunk(options: {
	readonly chunkId: string;
	readonly assets: Pick<AssetManagerPort, "release"> | undefined;
	readonly state: StreamingAssetResidencyStore;
	readonly warnings: string[];
}): void {
	options.state.loadedChunkIds.delete(options.chunkId);

	const request = options.state.requests.get(options.chunkId);
	if (!request) {
		return;
	}

	if (request.status === "loading") {
		request.releaseAfterSettled = true;
		return;
	}

	releaseStreamingAssetRequest({
		request,
		assets: options.assets,
		state: options.state,
		warnings: options.warnings,
	});
}

function releaseAllStreamingAssetRequests(options: {
	readonly assets: Pick<AssetManagerPort, "release"> | undefined;
	readonly state: StreamingAssetResidencyStore;
	readonly warnings: string[];
}): void {
	for (const request of [...options.state.requests.values()]) {
		if (request.status === "loading") {
			request.releaseAfterSettled = true;
			continue;
		}

		releaseStreamingAssetRequest({
			request,
			assets: options.assets,
			state: options.state,
			warnings: options.warnings,
		});
	}
}

function releaseStreamingAssetRequest(options: {
	readonly request: StreamingAssetRequest;
	readonly assets: Pick<AssetManagerPort, "release"> | undefined;
	readonly state: StreamingAssetResidencyStore;
	readonly warnings: string[];
}): void {
	releaseRetainedStreamingAssets({
		assets: options.assets,
		assetIds: options.request.retainedAssetIds,
		warnings: options.warnings,
	});
	options.state.loadedChunkIds.delete(options.request.chunkId);
	options.state.requests.delete(options.request.chunkId);
}

function releaseRetainedStreamingAssets(options: {
	readonly assets: Pick<AssetManagerPort, "release"> | undefined;
	readonly assetIds: readonly string[];
	readonly warnings: string[];
}): void {
	if (!options.assets) {
		return;
	}

	for (const assetId of options.assetIds) {
		try {
			options.assets.release(assetId);
		} catch (error) {
			options.warnings.push(
				`Streaming asset "${assetId}" could not be released: ${errorMessage(error)}.`,
			);
		}
	}
}

function summarizeStreamingAssetResidency(
	state: StreamingAssetResidencyStore,
	plan: StreamingPlan,
): PerformanceStreamingAssetResidencyState {
	return {
		loadedChunkIds: uniqueSorted([
			...state.loadedChunkIds,
			...plan.decisions
				.filter((decision) => decision.loaded)
				.map((decision) => decision.chunkId),
		]),
		loadingChunkIds: streamingLoadingChunkIdsForPlan(state),
		retainedAssetIds: uniqueSorted(
			[...state.requests.values()].flatMap(
				(request) => request.retainedAssetIds,
			),
		),
		failedAssetIds: [...state.failedAssetIds.keys()].sort(),
	};
}

function streamingAssetFailureWarnings(
	state: StreamingAssetResidencyStore,
): readonly string[] {
	return [...state.failedAssetIds.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(
			([assetId, message]) =>
				`Streaming asset "${assetId}" failed residency: ${message}.`,
		);
}

function applyRuntimeVisibility(options: {
	readonly world: World;
	readonly renderables: readonly RuntimeSubject[];
	readonly lights: readonly RuntimeSubject[];
	readonly culling: PerformanceCullingRuntimeState;
	readonly streaming: PerformanceStreamingRuntimeState;
	readonly renderableBaselines: Map<Entity, VisibilityBaseline>;
	readonly lightBaselines: Map<Entity, VisibilityBaseline>;
}): void {
	const cullingActive = options.culling.runtimeStatus === "active";
	const streamingActive = options.streaming.plan.active;

	if (!cullingActive && !streamingActive) {
		restoreComponentVisibility(
			options.world,
			RENDERABLE_COMPONENT,
			options.renderableBaselines,
		);
		restoreComponentVisibility(
			options.world,
			LIGHT_COMPONENT,
			options.lightBaselines,
		);
		return;
	}

	const cullingDecisions = new Map(
		options.culling.decisions.map((decision) => [
			cullingSummaryId(decision),
			decision,
		]),
	);
	const streamingResidency = streamingContentResidency(
		options.streaming.plan,
		options.streaming.chunks,
	);

	for (const subject of options.renderables) {
		const id = cullingSubjectId(subject);
		const cullingIncluded = cullingActive
			? cullingDecisions.get(id)?.renderIncluded ?? true
			: true;
		const streamingIncluded = streamingActive
			? streamingResidency.renderableIncluded(id)
			: true;

		applyComponentVisibility<RenderableComponent>(
			options.world,
			subject.entity,
			RENDERABLE_COMPONENT,
			cullingIncluded && streamingIncluded,
			options.renderableBaselines,
		);
	}

	for (const subject of options.lights) {
		const id = cullingSubjectId(subject);
		const cullingIncluded = cullingActive
			? cullingDecisions.get(id)?.renderIncluded ?? true
			: true;
		const streamingIncluded = streamingActive
			? streamingResidency.lightIncluded(id)
			: true;

		applyComponentVisibility<LightComponent>(
			options.world,
			subject.entity,
			LIGHT_COMPONENT,
			cullingIncluded && streamingIncluded,
			options.lightBaselines,
		);
	}
}

function streamingContentResidency(
	plan: StreamingPlan,
	chunks?: readonly StreamingChunkDefinition[],
): {
	readonly visibleRenderables: ReadonlySet<string>;
	readonly hiddenRenderables: readonly string[];
	readonly visibleLights: ReadonlySet<string>;
	readonly hiddenLights: readonly string[];
	readonly activeColliders: ReadonlySet<string>;
	readonly removedColliders: readonly string[];
	readonly renderableIncluded: (stableId: string) => boolean;
	readonly lightIncluded: (stableId: string) => boolean;
	readonly colliderIncluded: (stableId: string) => boolean;
	readonly controlledColliderIds: readonly string[];
} {
	const controlledRenderables = new Set<string>();
	const visibleRenderables = new Set<string>();
	const controlledLights = new Set<string>();
	const visibleLights = new Set<string>();
	const controlledColliders = new Set<string>();
	const activeColliders = new Set<string>();
	const decisionsByChunkId = new Map(
		plan.decisions.map((decision) => [decision.chunkId, decision]),
	);
	const chunkContents =
		chunks?.map((chunk) => ({
			chunkId: chunk.id,
			content: {
				assetIds: chunk.content?.assetIds ?? [],
				renderStableIds: chunk.content?.renderStableIds ?? [],
				lightStableIds: chunk.content?.lightStableIds ?? [],
				colliderStableIds: chunk.content?.colliderStableIds ?? [],
			},
		})) ??
		plan.operations.map((operation) => ({
			chunkId: operation.chunkId,
			content: operation.content,
		}));

	for (const chunk of chunkContents) {
		const decision = decisionsByChunkId.get(chunk.chunkId);
		const applied = decision?.desired === true && decision.loaded === true;

		for (const stableId of chunk.content.renderStableIds) {
			controlledRenderables.add(stableId);
			if (applied) {
				visibleRenderables.add(stableId);
			}
		}

		for (const stableId of chunk.content.lightStableIds) {
			controlledLights.add(stableId);
			if (applied) {
				visibleLights.add(stableId);
			}
		}

		for (const stableId of chunk.content.colliderStableIds) {
			controlledColliders.add(stableId);
			if (applied) {
				activeColliders.add(stableId);
			}
		}
	}

	const hiddenRenderables = [...controlledRenderables]
		.filter((stableId) => !visibleRenderables.has(stableId))
		.sort();
	const hiddenLights = [...controlledLights]
		.filter((stableId) => !visibleLights.has(stableId))
		.sort();
	const removedColliders = [...controlledColliders]
		.filter((stableId) => !activeColliders.has(stableId))
		.sort();

	return {
		visibleRenderables,
		hiddenRenderables,
		visibleLights,
		hiddenLights,
		activeColliders,
		removedColliders,
		renderableIncluded(stableId) {
			return (
				!controlledRenderables.has(stableId) || visibleRenderables.has(stableId)
			);
		},
		lightIncluded(stableId) {
			return !controlledLights.has(stableId) || visibleLights.has(stableId);
		},
		colliderIncluded(stableId) {
			return (
				!controlledColliders.has(stableId) || activeColliders.has(stableId)
			);
		},
		controlledColliderIds: [...controlledColliders].sort(),
	};
}

function applyRuntimeColliderResidency(options: {
	readonly world: World;
	readonly plan: StreamingPlan;
	readonly chunks: readonly StreamingChunkDefinition[];
	readonly runtimeSceneManifest: RuntimeSceneManifestData | undefined;
	readonly colliderBaselines: Map<Entity, ColliderBaseline>;
}): {
	readonly appliedColliderCount: number;
	readonly removedColliders: readonly string[];
	readonly retainedRequiredColliders: readonly string[];
} {
	if (!options.plan.active) {
		restoreAllStreamingColliders(options.world, options.colliderBaselines);
		return {
			appliedColliderCount: 0,
			removedColliders: [],
			retainedRequiredColliders: [],
		};
	}

	const residency = streamingContentResidency(options.plan, options.chunks);
	const requiredStableIds = requiredCollisionStableIds(
		options.runtimeSceneManifest,
	);
	const entitiesByStableId = stableIdEntityMap(options.world);
	const removedColliders: string[] = [];
	const retainedRequiredColliders: string[] = [];

	for (const stableId of residency.controlledColliderIds) {
		const entity = entitiesByStableId.get(stableId);
		if (entity === undefined) {
			continue;
		}

		if (requiredStableIds.has(stableId)) {
			restoreStreamingCollider(
				options.world,
				entity,
				options.colliderBaselines,
			);
			if (!residency.colliderIncluded(stableId)) {
				retainedRequiredColliders.push(stableId);
			}
			continue;
		}

		if (residency.colliderIncluded(stableId)) {
			restoreStreamingCollider(
				options.world,
				entity,
				options.colliderBaselines,
			);
			continue;
		}

		const collider = options.world.getComponent<ColliderBaseline>(
			entity,
			COLLIDER_COMPONENT,
		);
		if (collider && !options.colliderBaselines.has(entity)) {
			options.colliderBaselines.set(entity, collider);
		}

		if (collider) {
			options.world.removeComponent(entity, COLLIDER_COMPONENT);
		}

		if (collider || options.colliderBaselines.has(entity)) {
			removedColliders.push(stableId);
		}
	}

	const controlledColliderIds = new Set(residency.controlledColliderIds);
	for (const [entity] of [...options.colliderBaselines.entries()]) {
		const stableId = stableIdForEntity(options.world, entity);
		if (!stableId || !controlledColliderIds.has(stableId)) {
			restoreStreamingCollider(
				options.world,
				entity,
				options.colliderBaselines,
			);
		}
	}

	return {
		appliedColliderCount: residency.activeColliders.size,
		removedColliders: uniqueSorted(removedColliders),
		retainedRequiredColliders: uniqueSorted(retainedRequiredColliders),
	};
}

function restoreStreamingCollider(
	world: World,
	entity: Entity,
	baselines: Map<Entity, ColliderBaseline>,
): void {
	const baseline = baselines.get(entity);
	if (!baseline) {
		return;
	}

	if (!world.isAlive(entity)) {
		baselines.delete(entity);
		return;
	}

	world.addComponent(entity, COLLIDER_COMPONENT, baseline);
	baselines.delete(entity);
}

function restoreAllStreamingColliders(
	world: World,
	baselines: Map<Entity, ColliderBaseline>,
): void {
	for (const entity of [...baselines.keys()]) {
		restoreStreamingCollider(world, entity, baselines);
	}
}

function requiredCollisionStableIds(
	manifest: RuntimeSceneManifestData | undefined,
): ReadonlySet<string> {
	return new Set([
		...(manifest?.readiness.requiredCollisionStableIds ?? []),
		...(manifest?.readiness.requiredWalkableStableIds ?? []),
	]);
}

function stableIdEntityMap(world: World): ReadonlyMap<string, Entity> {
	const entities = new Map<string, Entity>();

	for (const entity of world.query([STABLE_ID_COMPONENT])) {
		const stableId = stableIdForEntity(world, entity);
		if (stableId) {
			entities.set(stableId, entity);
		}
	}

	return entities;
}

function applyComponentVisibility<
	TComponent extends { readonly visible?: boolean },
>(
	world: World,
	entity: Entity,
	componentName: string,
	included: boolean,
	baselines: Map<Entity, VisibilityBaseline>,
): void {
	const component = world.getComponent<TComponent>(entity, componentName);

	if (!component) {
		baselines.delete(entity);
		return;
	}

	if (!baselines.has(entity)) {
		baselines.set(entity, component.visible);
	}

	const baseline = baselines.get(entity);
	const nextVisible = baseline === false ? false : included ? baseline : false;
	world.addComponent(
		entity,
		componentName,
		withOptionalVisible(component, nextVisible),
	);
}

function restoreComponentVisibility<
	TComponent extends { readonly visible?: boolean },
>(
	world: World,
	componentName: string,
	baselines: Map<Entity, VisibilityBaseline>,
): void {
	for (const [entity, baseline] of [...baselines.entries()]) {
		const component = world.getComponent<TComponent>(entity, componentName);

		if (!world.isAlive(entity) || !component) {
			baselines.delete(entity);
			continue;
		}

		world.addComponent(
			entity,
			componentName,
			withOptionalVisible(component, baseline),
		);
		baselines.delete(entity);
	}
}

function withOptionalVisible<TComponent extends { readonly visible?: boolean }>(
	component: TComponent,
	visible: boolean | undefined,
): TComponent {
	if (visible === undefined) {
		return {
			...component,
			visible: undefined,
		} as TComponent;
	}

	return {
		...component,
		visible,
	};
}

function summarizeCullingDecision(
	subject: RuntimeSubject & { readonly kind: "renderable" | "light" },
	decision: CullingSubjectDecision,
): PerformanceCullingDecisionSummary {
	return {
		entity: subject.entity,
		...(subject.stableId ? { stableId: subject.stableId } : {}),
		kind: subject.kind,
		renderIncluded: decision.renderIncluded,
		updateIncluded: decision.updateIncluded,
		distanceToObserver: decision.distanceToObserver,
		reasons: decision.reasons,
	};
}

function cullingSubjectId(subject: RuntimeSubject): string {
	return subject.stableId ?? `entity:${subject.entity}`;
}

function cullingSummaryId(summary: PerformanceCullingDecisionSummary): string {
	return summary.stableId ?? `entity:${summary.entity}`;
}

function stableIdForEntity(world: World, entity: Entity): string | undefined {
	const stableId = world.getComponent<{ readonly id?: unknown }>(
		entity,
		STABLE_ID_COMPONENT,
	);

	return typeof stableId?.id === "string" ? stableId.id : undefined;
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

function distanceBetween(
	a: readonly [number, number, number],
	b: Vec3,
): number {
	const dx = a[0] - b.x;
	const dy = a[1] - b.y;
	const dz = a[2] - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function vec3ToTuple(value: Vec3): readonly [number, number, number] {
	return [value.x, value.y, value.z];
}

function vectorToObject(value: readonly [number, number, number]): {
	readonly x: number;
	readonly y: number;
	readonly z: number;
} {
	return {
		x: value[0],
		y: value[1],
		z: value[2],
	};
}

function uniqueSorted(values: readonly string[]): readonly string[] {
	return Array.from(new Set(values)).sort((left, right) =>
		left.localeCompare(right),
	);
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function clonePerformanceConfig(config: PerformanceConfig): PerformanceConfig {
	return JSON.parse(JSON.stringify(config)) as PerformanceConfig;
}
