import type { Entity, World } from "../../engine/core/index.js";
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
				type: "mesh",
				vertices: shape.vertices,
				indices: shape.indices,
			};
	}
}
