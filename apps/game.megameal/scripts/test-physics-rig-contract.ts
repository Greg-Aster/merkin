import { World } from "../src/engine/core/index.js";
import { quat, vec3 } from "../src/engine/math/index.js";
import {
	CHARACTER_CONTROLLER_COMPONENT,
	type ColliderComponent,
	PHYSICS_JOINT_COMPONENT,
	type PhysicsAdapterPort,
	type PhysicsBodyHandle,
	type PhysicsCollisionEvent,
	type PhysicsJointComponent,
	type PhysicsJointHandle,
	PhysicsSyncSystem,
	type PhysicsTransform,
	type RevoluteJointMotor,
	type RigidBodyComponent,
} from "../src/engine/modules/physics/index.js";
import {
	RENDERABLE_COMPONENT,
	type RenderableComponent,
	TRANSFORM_COMPONENT,
} from "../src/engine/modules/rendering/index.js";
import {
	PHYSICS_RIG_MOTION_QUEUE_RESOURCE,
	createArticulatedPhysicsRigSystem,
	createPhysicsRigMotionQueue,
} from "../src/game/physics-rigs/index.js";
import { STABLE_ID_COMPONENT } from "../src/game/prefabs/index.js";
import {
	type FirstPersonControllerComponent,
	PLAYER_ENTITY_RESOURCE,
} from "../src/game/systems/index.js";
import { ainekioSesamePhysicsRig } from "../src/levels/player/avatars/ainekio-sesame/rig.js";
import {
	createAinekioSesameMotionEvent,
	playerAvatarPhysicsRigs,
	playerAvatars,
	selectedPlayerAvatar,
	selectedPlayerAvatarPhysicsRig,
} from "../src/levels/player/index.js";

const expectedServoOrder = ["R1", "R2", "L1", "L2", "R4", "R3", "L3", "L4"];

function assertEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message?: string,
): void {
	if (actual !== expected) {
		throw new Error(
			message ?? `Expected ${String(expected)}, received ${String(actual)}.`,
		);
	}
}

function assertDeepEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message?: string,
): void {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(
			message ??
				`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
		);
	}
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

class RecordingPhysicsAdapter implements PhysicsAdapterPort {
	#nextBody = 1;
	#nextCollider = 100;
	#nextJoint = 1000;
	#bodies = new Map<PhysicsBodyHandle, PhysicsTransform>();
	#colliders = new Set<number>();
	#joints = new Map<PhysicsJointHandle, RevoluteJointMotor | undefined>();

	createRigidBody(
		_entity: number,
		_body: RigidBodyComponent,
		transform: PhysicsTransform,
	): PhysicsBodyHandle {
		const handle = this.#nextBody;
		this.#nextBody += 1;
		this.#bodies.set(handle, transform);
		return handle;
	}

	createCollider(
		_entity: number,
		_bodyHandle: PhysicsBodyHandle,
		_collider: ColliderComponent,
	): number {
		const handle = this.#nextCollider;
		this.#nextCollider += 1;
		this.#colliders.add(handle);
		return handle;
	}

	destroyCollider(handle: number): void {
		this.#colliders.delete(handle);
	}

	destroyRigidBody(handle: PhysicsBodyHandle): void {
		this.#bodies.delete(handle);
	}

	createJoint(): PhysicsJointHandle {
		const handle = this.#nextJoint;
		this.#nextJoint += 1;
		this.#joints.set(handle, undefined);
		return handle;
	}

	destroyJoint(handle: PhysicsJointHandle): void {
		this.#joints.delete(handle);
	}

	configureJointMotor(
		handle: PhysicsJointHandle,
		motor: RevoluteJointMotor,
	): void {
		this.#joints.set(handle, motor);
	}

	syncBodyFromTransform(
		handle: PhysicsBodyHandle,
		transform: PhysicsTransform,
	): void {
		this.#bodies.set(handle, transform);
	}

	syncTransformFromBody(handle: PhysicsBodyHandle): PhysicsTransform {
		return this.#bodies.get(handle) ?? { position: vec3(), rotation: quat() };
	}

	applyImpulse(_handle: PhysicsBodyHandle): void {}

	step(_deltaSeconds: number): void {}

	drainEvents(): readonly PhysicsCollisionEvent[] {
		return [];
	}

	bodyCount(): number {
		return this.#bodies.size;
	}

	colliderCount(): number {
		return this.#colliders.size;
	}

	jointCount(): number {
		return this.#joints.size;
	}

	dispose(): void {
		this.#bodies.clear();
		this.#colliders.clear();
		this.#joints.clear();
	}
}

assertEqual(
	selectedPlayerAvatar.id,
	"player_avatar_ainekio_sesame",
	"The selected avatar must be the visible Ainekio/Sesame simulator bot.",
);
assertEqual(
	selectedPlayerAvatarPhysicsRig?.id,
	ainekioSesamePhysicsRig.id,
	"The selected Ainekio/Sesame avatar must activate the physical rig path.",
);
assertEqual(
	playerAvatars.some((avatar) => avatar.id === "player_avatar_ainekio_sesame"),
	true,
	"The Ainekio/Sesame avatar must be present in the player avatar catalog.",
);
assertEqual(
	playerAvatarPhysicsRigs.some((rig) => rig.id === ainekioSesamePhysicsRig.id),
	true,
	"The Ainekio/Sesame physics rig must be exported beside avatar data.",
);
assertDeepEqual(
	ainekioSesamePhysicsRig.servoChannels.map((channel) => channel.servoId),
	expectedServoOrder,
	"Sesame rig servo channels must preserve the target firmware servo order.",
);
assertEqual(
	ainekioSesamePhysicsRig.joints.length,
	8,
	"The Sesame physics rig must expose one revolute joint per servo.",
);
assertEqual(
	ainekioSesamePhysicsRig.bodies.length,
	9,
	"The Sesame physics rig must model one chassis plus eight limb/foot bodies.",
);
for (const body of ainekioSesamePhysicsRig.bodies) {
	assert(
		body.renderable?.kind === "mesh" || body.renderable?.kind === undefined,
		`Sesame rig body "${body.id}" must use a mesh renderable.`,
	);
	assert(
		body.renderable?.meshId !== undefined,
		`Sesame rig body "${body.id}" must have a visible robot mesh.`,
	);
	assert(
		body.renderable.meshId !== "mesh_player",
		`Sesame rig body "${body.id}" must not use the generic player mesh.`,
	);
	assertEqual(
		body.collider.sensor === true,
		body.role !== "foot",
		`Sesame rig body "${body.id}" must only use solid collision for standing feet.`,
	);
}
const footBottoms = ainekioSesamePhysicsRig.bodies
	.filter((body) => body.role === "foot")
	.map((body) => {
		assert(
			body.collider.shape.type === "box",
			"Ainekio/Sesame foot bodies must use box colliders.",
		);
		return body.transform.position[1] - body.collider.shape.halfExtents[1];
	});
assert(
	footBottoms.every((bottom) => Math.abs(bottom + 0.65) < 0.01),
	"Ainekio/Sesame foot colliders must spawn at floor height relative to the player spawn origin.",
);
for (const joint of ainekioSesamePhysicsRig.joints) {
	const parentBody = ainekioSesamePhysicsRig.bodies.find(
		(body) => body.id === joint.parentBodyId,
	);
	const childBody = ainekioSesamePhysicsRig.bodies.find(
		(body) => body.id === joint.childBodyId,
	);

	assert(parentBody !== undefined, `${joint.id} parent body must exist.`);
	assert(childBody !== undefined, `${joint.id} child body must exist.`);
	assertDeepEqual(
		parentBody.transform.rotation,
		undefined,
		`${joint.id} parent body must stay in the neutral solver frame.`,
	);
	assertDeepEqual(
		childBody.transform.rotation,
		undefined,
		`${joint.id} child body must stay in the neutral solver frame.`,
	);
	assert(
		lengthOf(joint.axis) > 0.99 && lengthOf(joint.axis) < 1.01,
		`${joint.id} axis must be normalized for Rapier.`,
	);
}

const world = new World();
const player = world.createEntity();
world.setResource(PLAYER_ENTITY_RESOURCE, player);
world.setResource(
	PHYSICS_RIG_MOTION_QUEUE_RESOURCE,
	createPhysicsRigMotionQueue(),
);
world.addComponent(player, STABLE_ID_COMPONENT, { id: "player" });
world.addComponent(player, TRANSFORM_COMPONENT, {
	position: vec3(1, 0, 2),
	rotation: quat(),
	scale: vec3(1, 1, 1),
});
world.addComponent(player, CHARACTER_CONTROLLER_COMPONENT, {
	speed: 4,
	jumpForce: 5,
	grounded: true,
});
world.addComponent<FirstPersonControllerComponent>(
	player,
	"FirstPersonController",
	{
		yawRadians: 0,
		pitchRadians: 0,
		mouseSensitivity: 0.002,
		minPitchRadians: -1,
		maxPitchRadians: 1,
		eyeHeight: 1.2,
		fovDegrees: 70,
		near: 0.1,
		far: 1000,
	},
);

const rigSystem = createArticulatedPhysicsRigSystem({
	rig: ainekioSesamePhysicsRig,
});
const adapter = new RecordingPhysicsAdapter();
const sync = new PhysicsSyncSystem({ adapter });

rigSystem.update({
	deltaSeconds: 0.016,
	world,
});
sync.preSync({ world });

assertEqual(
	world.hasComponent(player, CHARACTER_CONTROLLER_COMPONENT),
	false,
	"Activating a physics rig must disable the default kinematic player controller.",
);
assertEqual(
	adapter.bodyCount(),
	9,
	"Physics rig sync must create all rig bodies.",
);
assertEqual(
	adapter.jointCount(),
	8,
	"Physics rig sync must create all eight revolute joints.",
);
const spawnedRigRenderables = world
	.query([STABLE_ID_COMPONENT, RENDERABLE_COMPONENT])
	.filter((entity) => {
		const stableId = world.getComponent<{ readonly id?: string }>(
			entity,
			STABLE_ID_COMPONENT,
		);
		return stableId?.id?.startsWith("ainekio-sesame:") === true;
	});
assertEqual(
	spawnedRigRenderables.length,
	9,
	"Physics rig sync must spawn visible renderable entities for every robot body.",
);
for (const entity of spawnedRigRenderables) {
	const renderable = world.requireComponent<RenderableComponent>(
		entity,
		RENDERABLE_COMPONENT,
	);
	assert(
		(renderable.kind ?? "mesh") === "mesh",
		"Spawned Sesame rig renderables must use mesh assets.",
	);
	assert(
		"meshId" in renderable && renderable.meshId !== "mesh_player",
		"Spawned Sesame rig renderables must not use the generic player mesh.",
	);
}

const r1JointEntity = world
	.query([STABLE_ID_COMPONENT, PHYSICS_JOINT_COMPONENT])
	.find((entity) => {
		const stableId = world.getComponent<{ readonly id?: string }>(
			entity,
			STABLE_ID_COMPONENT,
		);
		return stableId?.id === "ainekio-sesame:joint:R1";
	});

assert(r1JointEntity !== undefined, "R1 joint entity must be spawned.");

world
	.requireResource<ReturnType<typeof createPhysicsRigMotionQueue>>(
		PHYSICS_RIG_MOTION_QUEUE_RESOURCE,
	)
	.push(
		createAinekioSesameMotionEvent({
			sequence: "test-walk",
			command: "walk",
			issuedAtMs: 0,
			ttlMs: 120,
			frames: [{ servo: "R1", angleDeg: 30, atMs: 50 }],
		}),
	);

rigSystem.update({
	deltaSeconds: 0.016,
	world,
});
assertEqual(
	degrees(
		world.requireComponent<PhysicsJointComponent>(
			r1JointEntity,
			PHYSICS_JOINT_COMPONENT,
		).motor?.targetRadians ?? 0,
	),
	0,
	"Future servo frames must not apply before their atMs time.",
);

rigSystem.update({
	deltaSeconds: 0.05,
	world,
});
assertEqual(
	Math.round(
		degrees(
			world.requireComponent<PhysicsJointComponent>(
				r1JointEntity,
				PHYSICS_JOINT_COMPONENT,
			).motor?.targetRadians ?? 0,
		),
	),
	30,
	"Servo frames must apply through the joint motor after their atMs time.",
);

function degrees(radians: number): number {
	return (radians * 180) / Math.PI;
}

function lengthOf(vector: readonly [number, number, number]): number {
	return Math.hypot(vector[0], vector[1], vector[2]);
}
