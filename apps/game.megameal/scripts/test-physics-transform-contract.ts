import { EventBus, World } from "../src/engine/core/index.js";
import { quat, vec3 } from "../src/engine/math/index.js";
import {
	CHARACTER_CONTROLLER_COMPONENT,
	COLLIDER_COMPONENT,
	type CharacterControllerComponent,
	type ColliderComponent,
	PHYSICS_TRANSFORM_COMPONENT,
	type PhysicsAdapterPort,
	type PhysicsCollisionEvent,
	PhysicsSyncSystem,
	type PhysicsTransform,
	type PhysicsTransformComponent,
	RIGID_BODY_COMPONENT,
	type RigidBodyComponent,
	createKinematicCharacterControllerSystem,
} from "../src/engine/modules/physics/index.js";
import { assertEqual, assertErrorIncludes } from "./contractTestHelpers.js";

class RecordingPhysicsAdapter implements PhysicsAdapterPort {
	createdBodies = 0;

	createRigidBody(): number {
		this.createdBodies += 1;
		return this.createdBodies;
	}

	createCollider(): number {
		return 1;
	}

	destroyCollider(): void {}

	destroyRigidBody(): void {}

	syncBodyFromTransform(): void {}

	syncTransformFromBody(): PhysicsTransform {
		return {
			position: vec3(),
			rotation: quat(),
		};
	}

	applyImpulse(): void {}

	step(): void {}

	drainEvents(): readonly PhysicsCollisionEvent[] {
		return [];
	}

	dispose(): void {}
}

function addRigidBody(world: World, entity: number): void {
	world.addComponent<RigidBodyComponent>(entity, RIGID_BODY_COMPONENT, {
		type: "kinematic",
		mass: 1,
	});
}

function addCapsuleCollider(world: World, entity: number): void {
	world.addComponent<ColliderComponent>(entity, COLLIDER_COMPONENT, {
		intent: "solid",
		channel: "player",
		shape: {
			type: "capsule",
			halfHeight: 0.5,
			radius: 0.25,
		},
	});
}

{
	const world = new World();
	const entity = world.createEntity();
	const adapter = new RecordingPhysicsAdapter();
	const sync = new PhysicsSyncSystem({ adapter });

	world.addComponent<PhysicsTransformComponent>(
		entity,
		PHYSICS_TRANSFORM_COMPONENT,
		{
			position: vec3(1, 2, 3),
			rotation: quat(),
			scale: vec3(1, 1, 1),
		},
	);
	addRigidBody(world, entity);

	sync.preSync({ world });

	assertEqual(adapter.createdBodies, 1);
	assertEqual(sync.hasBody(entity), true);
}

{
	const world = new World();
	const entity = world.createEntity();
	const adapter = new RecordingPhysicsAdapter();
	const sync = new PhysicsSyncSystem({ adapter });

	world.addComponent(entity, PHYSICS_TRANSFORM_COMPONENT, {
		position: { x: 1, y: Number.NaN, z: 3 },
		rotation: quat(),
	});
	addRigidBody(world, entity);

	assertErrorIncludes(
		() => sync.preSync({ world }),
		"position must be a finite Vec3",
	);
	assertEqual(
		adapter.createdBodies,
		0,
		"Invalid Transform data must not create physics adapter state.",
	);
	assertEqual(sync.hasBody(entity), false);
}

{
	const world = new World();
	const events = new EventBus();
	const entity = world.createEntity();

	world.addComponent(entity, PHYSICS_TRANSFORM_COMPONENT, {
		position: vec3(),
		rotation: { x: 0, y: 0, z: 0, w: Number.POSITIVE_INFINITY },
		scale: vec3(1, 1, 1),
	});
	world.addComponent<CharacterControllerComponent>(
		entity,
		CHARACTER_CONTROLLER_COMPONENT,
		{
			speed: 1,
			jumpForce: 4,
			grounded: true,
		},
	);
	addCapsuleCollider(world, entity);

	assertErrorIncludes(
		() =>
			createKinematicCharacterControllerSystem().update({
				deltaSeconds: 1 / 60,
				events,
				world,
			}),
		"rotation must be a finite Quat",
	);
}

console.log("Physics transform contract checks passed.");
