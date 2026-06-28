import type { Entity, World } from "../../engine/core/index.js";
import type { Vec3 } from "../../engine/math/index.js";
import {
	COLLIDER_COMPONENT,
	type ColliderComponent,
	PHYSICS_TRANSFORM_COMPONENT,
	type PhysicsColliderShape,
	type PhysicsTransformComponent,
	RIGID_BODY_COMPONENT,
	type RigidBodyComponent,
} from "../../engine/modules/physics/index.js";
import type {
	CollisionOverlayItem,
	CollisionOverlayShape,
	RenderTransform,
} from "../../engine/modules/rendering/index.js";
import { STABLE_ID_COMPONENT } from "../prefabs/index.js";

export type CollisionOverlayDiagnosticsState = {
	readonly enabled: boolean;
	readonly shapeCount: number;
	readonly syncedShapeCount: number;
	readonly unsyncedShapeCount: number;
};

export function collectCollisionOverlayItems(
	world: World,
): readonly CollisionOverlayItem[] {
	return world
		.query([PHYSICS_TRANSFORM_COMPONENT, COLLIDER_COMPONENT])
		.map((entity) => collisionOverlayItemForEntity(world, entity))
		.filter((item): item is CollisionOverlayItem => item !== undefined)
		.sort((left, right) => left.entity - right.entity);
}

export function summarizeCollisionOverlay(
	enabled: boolean,
	items: readonly CollisionOverlayItem[],
): CollisionOverlayDiagnosticsState {
	const syncedShapeCount = items.filter((item) => item.synced).length;

	return {
		enabled,
		shapeCount: items.length,
		syncedShapeCount,
		unsyncedShapeCount: items.length - syncedShapeCount,
	};
}

function collisionOverlayItemForEntity(
	world: World,
	entity: Entity,
): CollisionOverlayItem | undefined {
	const transform = world.getComponent<PhysicsTransformComponent>(
		entity,
		PHYSICS_TRANSFORM_COMPONENT,
	);
	const collider = world.getComponent<ColliderComponent>(
		entity,
		COLLIDER_COMPONENT,
	);

	if (!transform || !collider) {
		return undefined;
	}

	const rigidBody = world.getComponent<RigidBodyComponent>(
		entity,
		RIGID_BODY_COMPONENT,
	);
	const stableId = world.getComponent<{ readonly id?: unknown }>(
		entity,
		STABLE_ID_COMPONENT,
	);

	return {
		entity,
		...(typeof stableId?.id === "string" ? { stableId: stableId.id } : {}),
		intent: collider.intent,
		channel: collider.channel,
		sensor: collider.sensor === true,
		synced:
			collider.colliderHandle !== undefined &&
			rigidBody?.bodyHandle !== undefined,
		transform: renderTransformFromPhysicsTransform(transform),
		shape: overlayShapeFromCollider(collider.shape),
	};
}

function renderTransformFromPhysicsTransform(
	transform: PhysicsTransformComponent,
): RenderTransform {
	return {
		position: transform.position,
		rotation: transform.rotation,
		scale: transform.scale ?? { x: 1, y: 1, z: 1 },
	};
}

function overlayShapeFromCollider(
	shape: PhysicsColliderShape,
): CollisionOverlayShape {
	switch (shape.type) {
		case "box":
			return {
				type: "box",
				halfExtents: shape.halfExtents,
			};
		case "sphere":
			return {
				type: "sphere",
				radius: shape.radius,
			};
		case "capsule":
			return {
				type: "capsule",
				halfHeight: shape.halfHeight,
				radius: shape.radius,
			};
		case "cylinder":
			return {
				type: "cylinder",
				halfHeight: shape.halfHeight,
				radius: shape.radius,
			};
		case "mesh":
			return {
				type: "mesh-bounds",
				...boundsFromVertices(shape.vertices),
			};
	}
}

function boundsFromVertices(vertices: readonly Vec3[]): {
	readonly halfExtents: Vec3;
	readonly center: Vec3;
} {
	if (vertices.length === 0) {
		return {
			halfExtents: { x: 0.5, y: 0.5, z: 0.5 },
			center: { x: 0, y: 0, z: 0 },
		};
	}

	const bounds = vertices.reduce(
		(accumulator, vertex) => ({
			minX: Math.min(accumulator.minX, vertex.x),
			minY: Math.min(accumulator.minY, vertex.y),
			minZ: Math.min(accumulator.minZ, vertex.z),
			maxX: Math.max(accumulator.maxX, vertex.x),
			maxY: Math.max(accumulator.maxY, vertex.y),
			maxZ: Math.max(accumulator.maxZ, vertex.z),
		}),
		{
			minX: Number.POSITIVE_INFINITY,
			minY: Number.POSITIVE_INFINITY,
			minZ: Number.POSITIVE_INFINITY,
			maxX: Number.NEGATIVE_INFINITY,
			maxY: Number.NEGATIVE_INFINITY,
			maxZ: Number.NEGATIVE_INFINITY,
		},
	);

	return {
		halfExtents: {
			x: Math.max((bounds.maxX - bounds.minX) / 2, 0.05),
			y: Math.max((bounds.maxY - bounds.minY) / 2, 0.05),
			z: Math.max((bounds.maxZ - bounds.minZ) / 2, 0.05),
		},
		center: {
			x: (bounds.minX + bounds.maxX) / 2,
			y: (bounds.minY + bounds.maxY) / 2,
			z: (bounds.minZ + bounds.maxZ) / 2,
		},
	};
}
