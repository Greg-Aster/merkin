import { World } from "../src/engine/core/index.js";
import { quat, vec3 } from "../src/engine/math/index.js";
import {
	CHARACTER_CONTROLLER_COMPONENT,
	CHARACTER_MOTOR_COMPONENT,
	COLLIDER_COMPONENT,
	type CharacterControllerComponent,
	type CharacterMotorComponent,
	type ColliderComponent,
	type KinematicCharacterMovementQuery,
	PHYSICS_TRANSFORM_COMPONENT,
	type PhysicsTransformComponent,
	createKinematicCharacterControllerSystem,
} from "../src/engine/modules/physics/index.js";

function assertEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message?: string,
) {
	if (actual !== expected) {
		throw new Error(
			message ?? `Expected ${String(expected)}, received ${String(actual)}.`,
		);
	}
}

function assertClose(actual: number, expected: number, message?: string) {
	if (Math.abs(actual - expected) > 0.000001) {
		throw new Error(message ?? `Expected ${expected}, received ${actual}.`);
	}
}

function createCharacterHarness(
	options: {
		readonly colliderHandle?: number;
		readonly grounded?: boolean;
		readonly groundY?: number;
		readonly jumpRequested?: boolean;
		readonly kinematicEnabled?: boolean;
		readonly omitKinematicCollision?: boolean;
		readonly positionY?: number;
		readonly verticalVelocity?: number;
	} = {},
) {
	const world = new World();
	const player = world.createEntity();
	const characterControllerBase = {
		speed: 2,
		jumpForce: 6,
		gravity: -18,
		verticalVelocity: options.verticalVelocity ?? 0,
		groundY: options.groundY ?? 1.8,
		grounded: options.grounded ?? true,
	};
	const characterController = options.omitKinematicCollision
		? characterControllerBase
		: {
				...characterControllerBase,
				kinematicCollision: {
					enabled: options.kinematicEnabled ?? true,
					offset: 0.04,
					slide: true,
					obstacleChannels: ["worldStatic"],
					snapToGroundDistance: 4,
					maxSlopeClimbAngle: 0.7853981633974483,
					minSlopeSlideAngle: 0.8726646259971648,
					autostep: {
						maxHeight: 0.75,
						minWidth: 0.25,
						includeDynamicBodies: false,
					},
					up: vec3(0, 1, 0),
				},
			};

	world.addComponent<PhysicsTransformComponent>(
		player,
		PHYSICS_TRANSFORM_COMPONENT,
		{
			position: vec3(0, options.positionY ?? 1.8, 0),
			rotation: quat(),
			scale: vec3(1, 1, 1),
		},
	);
	world.addComponent<CharacterControllerComponent>(
		player,
		CHARACTER_CONTROLLER_COMPONENT,
		characterController,
	);
	world.addComponent<CharacterMotorComponent>(
		player,
		CHARACTER_MOTOR_COMPONENT,
		{
			direction: vec3(1, 0, 0),
			sprinting: false,
			jumpRequested: options.jumpRequested ?? false,
		},
	);
	world.addComponent<ColliderComponent>(player, COLLIDER_COMPONENT, {
		intent: "solid",
		channel: "player",
		offset: vec3(0, 0.9, 0),
		shape: {
			type: "capsule",
			halfHeight: 0.55,
			radius: 0.35,
		},
		...(options.colliderHandle !== undefined
			? { colliderHandle: options.colliderHandle }
			: {}),
	});

	return { player, world };
}

{
	const harness = createCharacterHarness({ colliderHandle: 123 });
	let query: KinematicCharacterMovementQuery | undefined;

	createKinematicCharacterControllerSystem({
		physics: {
			computeKinematicCharacterMovement(nextQuery) {
				query = nextQuery;
				return {
					translation: vec3(1.25, -0.2, 0),
					grounded: true,
					collisionCount: 1,
				};
			},
		},
	}).update({
		deltaSeconds: 1,
		events: { emit() {} },
		world: harness.world,
	});

	const transform = harness.world.requireComponent<PhysicsTransformComponent>(
		harness.player,
		PHYSICS_TRANSFORM_COMPONENT,
	);
	const controller =
		harness.world.requireComponent<CharacterControllerComponent>(
			harness.player,
			CHARACTER_CONTROLLER_COMPONENT,
		);

	assertClose(transform.position.x, 1.25);
	assertClose(transform.position.y, 1.6);
	assertEqual(controller.grounded, true);
	assertEqual(controller.verticalVelocity, 0);
	assertEqual(query?.entity, harness.player);
	assertEqual(query?.colliderHandle, 123);
	assertClose(query?.desiredTranslation.x ?? Number.NaN, 2);
	assertClose(query?.desiredTranslation.y ?? Number.NaN, -18);
	assertEqual(query?.settings.snapToGroundDistance, 4);
	assertEqual(query?.settings.obstacleChannels?.[0], "worldStatic");
	assertEqual(query?.excludeEntities?.[0], harness.player);
}

{
	const harness = createCharacterHarness({ colliderHandle: 123 });

	createKinematicCharacterControllerSystem({
		physics: {
			computeKinematicCharacterMovement(nextQuery) {
				return {
					translation: vec3(nextQuery.desiredTranslation.x, 0, 0),
					grounded: false,
					collisionCount: 0,
				};
			},
		},
	}).update({
		deltaSeconds: 1,
		events: { emit() {} },
		world: harness.world,
	});

	const transform = harness.world.requireComponent<PhysicsTransformComponent>(
		harness.player,
		PHYSICS_TRANSFORM_COMPONENT,
	);
	const controller =
		harness.world.requireComponent<CharacterControllerComponent>(
			harness.player,
			CHARACTER_CONTROLLER_COMPONENT,
		);

	assertClose(transform.position.x, 2);
	assertClose(
		transform.position.y,
		1.8,
		"Kinematic fallback ground must remain the player's feet plane.",
	);
	assertEqual(controller.grounded, true);
	assertEqual(controller.verticalVelocity, 0);
}

{
	const harness = createCharacterHarness({ colliderHandle: 123 });

	createKinematicCharacterControllerSystem({
		physics: {
			computeKinematicCharacterMovement(nextQuery) {
				return {
					translation: vec3(nextQuery.desiredTranslation.x, -0.015, 0),
					grounded: false,
					collisionCount: 0,
				};
			},
		},
	}).update({
		deltaSeconds: 1,
		events: { emit() {} },
		world: harness.world,
	});

	const transform = harness.world.requireComponent<PhysicsTransformComponent>(
		harness.player,
		PHYSICS_TRANSFORM_COMPONENT,
	);
	const controller =
		harness.world.requireComponent<CharacterControllerComponent>(
			harness.player,
			CHARACTER_CONTROLLER_COMPONENT,
		);

	assertClose(transform.position.x, 2);
	assertClose(
		transform.position.y,
		1.8,
		"Kinematic fallback ground must clamp downward adapter drift.",
	);
	assertEqual(controller.grounded, true);
	assertEqual(controller.verticalVelocity, 0);
}

{
	const harness = createCharacterHarness({
		colliderHandle: 123,
		jumpRequested: true,
	});

	createKinematicCharacterControllerSystem({
		physics: {
			computeKinematicCharacterMovement(nextQuery) {
				return {
					translation: nextQuery.desiredTranslation,
					grounded: false,
					collisionCount: 0,
				};
			},
		},
	}).update({
		deltaSeconds: 0.1,
		events: { emit() {} },
		world: harness.world,
	});

	const transform = harness.world.requireComponent<PhysicsTransformComponent>(
		harness.player,
		PHYSICS_TRANSFORM_COMPONENT,
	);
	const controller =
		harness.world.requireComponent<CharacterControllerComponent>(
			harness.player,
			CHARACTER_CONTROLLER_COMPONENT,
		);

	assertClose(transform.position.x, 0.2);
	assertClose(
		transform.position.y,
		2.22,
		"Kinematic fallback ground must not clamp a valid jump lift-off.",
	);
	assertEqual(controller.grounded, false);
	assertClose(controller.verticalVelocity ?? Number.NaN, 4.2);
}

{
	const harness = createCharacterHarness({ colliderHandle: 123 });
	let preservedThis = false;
	const physics = {
		marker: "physics-port",
		computeKinematicCharacterMovement(
			this: { readonly marker: string },
			nextQuery: KinematicCharacterMovementQuery,
		) {
			preservedThis = this.marker === "physics-port";
			return {
				translation: nextQuery.desiredTranslation,
				grounded: true,
				collisionCount: 0,
			};
		},
	};

	createKinematicCharacterControllerSystem({ physics }).update({
		deltaSeconds: 1,
		events: { emit() {} },
		world: harness.world,
	});

	assertEqual(
		preservedThis,
		true,
		"Physics adapter movement query must be called as a bound method.",
	);
}

{
	const harness = createCharacterHarness({ colliderHandle: 123 });
	let called = false;
	const emitted: Array<{ readonly type: string; readonly reason?: unknown }> =
		[];

	createKinematicCharacterControllerSystem({
		physics: {
			computeKinematicCharacterMovement() {
				called = true;
				return undefined;
			},
		},
	}).update({
		deltaSeconds: 1,
		events: {
			emit(event) {
				emitted.push(event);
			},
		},
		world: harness.world,
	});

	const transform = harness.world.requireComponent<PhysicsTransformComponent>(
		harness.player,
		PHYSICS_TRANSFORM_COMPONENT,
	);
	const controller =
		harness.world.requireComponent<CharacterControllerComponent>(
			harness.player,
			CHARACTER_CONTROLLER_COMPONENT,
		);

	assertEqual(called, true);
	assertClose(transform.position.x, 2);
	assertClose(transform.position.y, 1.8);
	assertEqual(controller.grounded, true);
	assertEqual(controller.verticalVelocity, 0);
	assertEqual(
		emitted.some(
			(event) =>
				event.type === "KinematicCharacterCollisionUnavailable" &&
				event.reason === "movement-query-failed",
		),
		true,
	);
}

{
	const harness = createCharacterHarness({
		colliderHandle: 123,
		grounded: false,
		positionY: 1.8,
		verticalVelocity: -0.5,
	});

	createKinematicCharacterControllerSystem({
		physics: {
			computeKinematicCharacterMovement() {
				return {
					translation: vec3(0, -0.15, 0),
					grounded: false,
					collisionCount: 0,
				};
			},
		},
	}).update({
		deltaSeconds: 1 / 60,
		events: { emit() {} },
		world: harness.world,
	});

	const transform = harness.world.requireComponent<PhysicsTransformComponent>(
		harness.player,
		PHYSICS_TRANSFORM_COMPONENT,
	);
	const controller =
		harness.world.requireComponent<CharacterControllerComponent>(
			harness.player,
			CHARACTER_CONTROLLER_COMPONENT,
		);

	assertClose(transform.position.y, 1.8);
	assertEqual(controller.grounded, true);
	assertEqual(controller.verticalVelocity, 0);
}

{
	const harness = createCharacterHarness({
		colliderHandle: 123,
		kinematicEnabled: false,
	});
	let called = false;

	createKinematicCharacterControllerSystem({
		physics: {
			computeKinematicCharacterMovement() {
				called = true;
				return {
					translation: vec3(4, 0, 0),
					grounded: true,
					collisionCount: 1,
				};
			},
		},
	}).update({
		deltaSeconds: 1,
		events: { emit() {} },
		world: harness.world,
	});

	const transform = harness.world.requireComponent<PhysicsTransformComponent>(
		harness.player,
		PHYSICS_TRANSFORM_COMPONENT,
	);

	assertEqual(called, false);
	assertClose(transform.position.x, 2);
	assertClose(transform.position.y, 1.8);
}

{
	const harness = createCharacterHarness({
		colliderHandle: 123,
		omitKinematicCollision: true,
	});
	let called = false;

	createKinematicCharacterControllerSystem({
		physics: {
			computeKinematicCharacterMovement() {
				called = true;
				return {
					translation: vec3(4, 0, 0),
					grounded: true,
					collisionCount: 1,
				};
			},
		},
	}).update({
		deltaSeconds: 1,
		events: { emit() {} },
		world: harness.world,
	});

	const transform = harness.world.requireComponent<PhysicsTransformComponent>(
		harness.player,
		PHYSICS_TRANSFORM_COMPONENT,
	);

	assertEqual(called, false);
	assertClose(transform.position.x, 2);
	assertClose(transform.position.y, 1.8);
}

{
	const harness = createCharacterHarness();
	let called = false;
	const emitted: Array<{ readonly type: string; readonly reason?: unknown }> =
		[];

	createKinematicCharacterControllerSystem({
		physics: {
			computeKinematicCharacterMovement() {
				called = true;
				return {
					translation: vec3(4, 0, 0),
					grounded: true,
					collisionCount: 1,
				};
			},
		},
	}).update({
		deltaSeconds: 1,
		events: {
			emit(event) {
				emitted.push(event);
			},
		},
		world: harness.world,
	});

	assertEqual(called, false);
	assertEqual(
		emitted.some(
			(event) =>
				event.type === "KinematicCharacterCollisionUnavailable" &&
				event.reason === "missing-collider-handle",
		),
		true,
	);
}

console.log("Kinematic character contract validation passed.");
