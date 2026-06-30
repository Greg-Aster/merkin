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
	PERFORMANCE_CONFIG_RESOURCE,
	type PerformanceConfig,
	defaultPerformanceConfig,
} from "../types.js";

type MeshColliderComponent = ColliderComponent & {
	readonly shape: Extract<ColliderComponent["shape"], { readonly type: "mesh" }>;
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

	return {
		...(options.activeRuntimeSceneId
			? { activeRuntimeSceneId: options.activeRuntimeSceneId }
			: {}),
		config:
			options.world.getResource<PerformanceConfig>(
				PERFORMANCE_CONFIG_RESOURCE,
			) ?? defaultPerformanceConfig,
		counts: {
			entities: options.world.entities().length,
			renderables: options.world.query([RENDERABLE_COMPONENT]).length,
			lights: options.world.query([LIGHT_COMPONENT]).length,
			colliders: colliders.length,
			walkableMeshColliders: walkableMeshColliders.length,
			meshCollisionTriangles: meshColliders.reduce((count, collider) => {
				return count + collider.shape.indices.length / 3;
			}, 0),
			loadedAssets: options.assets?.listLoaded().length ?? 0,
		},
	};
}
