import type { Entity, System, World } from "../../../engine/core/index.js";
import {
	COLLIDER_COMPONENT,
	type ColliderComponent,
} from "../../../engine/modules/physics/index.js";
import {
	type RenderTransform,
	TRANSFORM_COMPONENT,
} from "../../../engine/modules/rendering/index.js";
import { STABLE_ID_COMPONENT } from "../../prefabs/index.js";
import { buildCollisionSpatialBucketPlan } from "./spatial.js";
import { summarizeCollisionChunks } from "./summary.js";
import type {
	CollisionPerformanceChunkInput,
	CollisionPerformanceMeshSummary,
	CollisionSpatialBucketPlan,
} from "./types.js";

export const COLLISION_SPATIAL_INDEX_RESOURCE = "game:collisionSpatialIndex";

export type CollisionSpatialIndexResource = {
	readonly summary: CollisionPerformanceMeshSummary;
	readonly plan: CollisionSpatialBucketPlan;
	readonly updatedAtTick?: number;
};

export type CollisionSpatialIndexSystemOptions = {
	readonly bucketSizeMeters?: number;
};

export function createCollisionSpatialIndexSystem<
	TContext extends { readonly world: World; readonly tick?: number },
>(options: CollisionSpatialIndexSystemOptions = {}): System<TContext> {
	let cachedIndex:
		| {
				readonly bucketSizeMeters: number;
				readonly signature: string;
				readonly summary: CollisionPerformanceMeshSummary;
				readonly plan: CollisionSpatialBucketPlan;
		  }
		| undefined;
	const meshShapeIds = new WeakMap<object, number>();
	let nextMeshShapeId = 1;

	return {
		id: "collision-spatial-index",
		reads: [STABLE_ID_COMPONENT, TRANSFORM_COMPONENT, COLLIDER_COMPONENT],
		writes: [COLLISION_SPATIAL_INDEX_RESOURCE],
		update(context) {
			const bucketSizeMeters = options.bucketSizeMeters ?? 16;
			const signature = collisionSpatialIndexSignature(
				context.world,
				meshShapeIds,
				() => nextMeshShapeId++,
			);

			if (
				!cachedIndex ||
				cachedIndex.bucketSizeMeters !== bucketSizeMeters ||
				cachedIndex.signature !== signature
			) {
				const summary = summarizeCollisionChunks(
					collectRuntimeCollisionChunks(context.world),
				);
				const plan = buildCollisionSpatialBucketPlan({
					chunks: summary.chunks,
					bucketSizeMeters,
				});

				cachedIndex = {
					bucketSizeMeters,
					signature,
					summary,
					plan,
				};
			}

			context.world.setResource<CollisionSpatialIndexResource>(
				COLLISION_SPATIAL_INDEX_RESOURCE,
				{
					summary: cachedIndex.summary,
					plan: cachedIndex.plan,
					...(typeof context.tick === "number"
						? { updatedAtTick: context.tick }
						: {}),
				},
			);
		},
	};
}

function collisionSpatialIndexSignature(
	world: World,
	meshShapeIds: WeakMap<object, number>,
	nextShapeId: () => number,
): string {
	const parts = world.query([COLLIDER_COMPONENT]).flatMap((entity) => {
		const collider = world.requireComponent<ColliderComponent>(
			entity,
			COLLIDER_COMPONENT,
		);

		if (collider.shape.type !== "mesh") {
			return [];
		}

		const transform = world.getComponent<RenderTransform>(
			entity,
			TRANSFORM_COMPONENT,
		);
		const position = transform?.position ?? { x: 0, y: 0, z: 0 };
		const scale = transform?.scale ?? { x: 1, y: 1, z: 1 };
		const stableId = stableIdForEntity(world, entity);
		const meshShapeId = meshShapeIdentity(
			collider.shape,
			meshShapeIds,
			nextShapeId,
		);

		return [
			[
				stableId ?? `entity:${entity}`,
				collider.intent,
				meshShapeId,
				collider.shape.vertices.length,
				collider.shape.indices.length,
				position.x,
				position.y,
				position.z,
				scale.x,
				scale.y,
				scale.z,
			].join(":"),
		];
	});

	return parts.sort().join("|");
}

function meshShapeIdentity(
	shape: object,
	meshShapeIds: WeakMap<object, number>,
	nextShapeId: () => number,
): number {
	const existing = meshShapeIds.get(shape);
	if (existing !== undefined) {
		return existing;
	}

	const next = nextShapeId();
	meshShapeIds.set(shape, next);
	return next;
}

export function collectRuntimeCollisionChunks(
	world: World,
): readonly CollisionPerformanceChunkInput[] {
	return world.query([COLLIDER_COMPONENT]).flatMap((entity) => {
		const collider = world.requireComponent<ColliderComponent>(
			entity,
			COLLIDER_COMPONENT,
		);

		if (collider.shape.type !== "mesh") {
			return [];
		}

		const transform = world.getComponent<RenderTransform>(
			entity,
			TRANSFORM_COMPONENT,
		);
		const position = transform?.position ?? { x: 0, y: 0, z: 0 };
		const scale = transform?.scale ?? { x: 1, y: 1, z: 1 };
		const stableId = stableIdForEntity(world, entity);

		return [
			{
				id: stableId ?? `entity:${entity}`,
				...(stableId ? { stableId } : {}),
				intent: collider.intent,
				mesh: {
					vertices: collider.shape.vertices.map((vertex) => [
						vertex.x * scale.x + position.x,
						vertex.y * scale.y + position.y,
						vertex.z * scale.z + position.z,
					]),
					indices: collider.shape.indices,
				},
			},
		];
	});
}

function stableIdForEntity(world: World, entity: Entity): string | undefined {
	const stableId = world.getComponent<{ readonly id?: unknown }>(
		entity,
		STABLE_ID_COMPONENT,
	);

	return typeof stableId?.id === "string" ? stableId.id : undefined;
}
