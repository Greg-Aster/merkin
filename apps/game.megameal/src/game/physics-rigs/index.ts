import type { Entity, System, World } from "../../engine/core/index.js";
import { type Quat, type Vec3, quat, vec3 } from "../../engine/math/index.js";
import {
	CHARACTER_CONTROLLER_COMPONENT,
	CHARACTER_MOTOR_COMPONENT,
	COLLIDER_COMPONENT,
	type ColliderComponent,
	PHYSICS_JOINT_COMPONENT,
	type PhysicsJointComponent,
	RIGID_BODY_COMPONENT,
	type RigidBodyComponent,
} from "../../engine/modules/physics/index.js";
import {
	RENDERABLE_COMPONENT,
	type RenderTransform,
	type RenderableComponent,
	TRANSFORM_COMPONENT,
} from "../../engine/modules/rendering/index.js";
import { STABLE_ID_COMPONENT } from "../prefabs/index.js";
import { PLAYER_ENTITY_RESOURCE } from "../systems/index.js";

export const PHYSICS_RIG_MOTION_QUEUE_RESOURCE = "game:physicsRigMotionQueue";

export type PhysicsRigVector3 = readonly [number, number, number];
export type PhysicsRigQuaternion = readonly [number, number, number, number];

export type PhysicsRigTransformData = {
	readonly position: PhysicsRigVector3;
	readonly rotation?: PhysicsRigQuaternion;
	readonly scale?: PhysicsRigVector3;
};

export type PhysicsRigColliderShape =
	| {
			readonly type: "box";
			readonly halfExtents: PhysicsRigVector3;
	  }
	| {
			readonly type: "sphere";
			readonly radius: number;
	  }
	| {
			readonly type: "capsule";
			readonly halfHeight: number;
			readonly radius: number;
	  }
	| {
			readonly type: "cylinder";
			readonly halfHeight: number;
			readonly radius: number;
	  };

export type PhysicsRigColliderDefinition = Omit<ColliderComponent, "shape"> & {
	readonly shape: PhysicsRigColliderShape;
};

export type PhysicsRigBodyDefinition = {
	readonly id: string;
	readonly stableId?: string;
	readonly role?: "root" | "limb" | "foot" | "body";
	readonly transform: PhysicsRigTransformData;
	readonly rigidBody: RigidBodyComponent;
	readonly collider: PhysicsRigColliderDefinition;
	readonly renderable?: RenderableComponent;
};

export type PhysicsRigJointDefinition = {
	readonly id: string;
	readonly stableId?: string;
	readonly type: "revolute";
	readonly parentBodyId: string;
	readonly childBodyId: string;
	readonly anchorParent: PhysicsRigVector3;
	readonly anchorChild: PhysicsRigVector3;
	readonly axis: PhysicsRigVector3;
	readonly limitsDeg?: {
		readonly min: number;
		readonly max: number;
	};
	readonly servoId?: string;
	readonly motor: {
		readonly stiffness: number;
		readonly damping: number;
	};
};

export type PhysicsRigServoChannel = {
	readonly servoId: string;
	readonly jointId: string;
	readonly restAngleDeg: number;
	readonly minAngleDeg: number;
	readonly maxAngleDeg: number;
	readonly direction?: 1 | -1;
};

export type ArticulatedPhysicsRigDefinition = {
	readonly schemaVersion: 1;
	readonly id: string;
	readonly name: string;
	readonly rootBodyId: string;
	readonly source?: {
		readonly label: string;
		readonly url?: string;
		readonly license?: string;
		readonly notes?: string;
	};
	readonly motionSource?: {
		readonly adapter: string;
		readonly protocol: "servo-target-json-v1";
	};
	readonly bodies: readonly PhysicsRigBodyDefinition[];
	readonly joints: readonly PhysicsRigJointDefinition[];
	readonly servoChannels: readonly PhysicsRigServoChannel[];
	readonly simulation: {
		readonly staleTelemetryMs: number;
		readonly idlePoseServoAnglesDeg: Record<string, number>;
	};
};

export type PhysicsRigServoFrame = {
	readonly servo: string;
	readonly angleDeg: number;
	readonly atMs: number;
};

export type PhysicsRigServoTargetEvent = {
	readonly schemaVersion: 1;
	readonly robot: string;
	readonly sequence: string;
	readonly command: string;
	readonly issuedAtMs: number;
	readonly ttlMs: number;
	readonly frames: readonly PhysicsRigServoFrame[];
};

export type PhysicsRigMotionQueue = {
	push(event: PhysicsRigServoTargetEvent): void;
	drain(): readonly PhysicsRigServoTargetEvent[];
	size(): number;
	clear(): void;
};

export function createPhysicsRigMotionQueue(): PhysicsRigMotionQueue {
	const events: PhysicsRigServoTargetEvent[] = [];

	return {
		push(event) {
			events.push(event);
		},
		drain() {
			return events.splice(0);
		},
		size() {
			return events.length;
		},
		clear() {
			events.length = 0;
		},
	};
}

export type ArticulatedPhysicsRigSystemOptions = {
	readonly rig: ArticulatedPhysicsRigDefinition;
	readonly playerStableId?: string;
};

type RuntimeServoTarget = {
	readonly angleDeg: number;
	readonly expiresAtMs: number;
};

type PendingServoFrame = {
	readonly servo: string;
	readonly angleDeg: number;
	readonly applyAtMs: number;
	readonly expiresAtMs: number;
};

type SpawnedRigState = {
	readonly playerEntity: Entity;
	readonly rootEntity: Entity;
	readonly bodyEntitiesById: ReadonlyMap<string, Entity>;
	readonly jointEntitiesById: ReadonlyMap<string, Entity>;
	readonly spawnedEntities: readonly Entity[];
	readonly servoTargetsById: Map<string, RuntimeServoTarget>;
	readonly pendingFrames: PendingServoFrame[];
	elapsedMs: number;
};

type ArticulatedPhysicsRigContext = {
	readonly deltaSeconds: number;
	readonly world: World;
};

export function createArticulatedPhysicsRigSystem<
	TContext extends ArticulatedPhysicsRigContext,
>(options: ArticulatedPhysicsRigSystemOptions): System<TContext> {
	let state: SpawnedRigState | undefined;

	return {
		id: `articulated-physics-rig:${options.rig.id}`,
		reads: [PLAYER_ENTITY_RESOURCE, PHYSICS_RIG_MOTION_QUEUE_RESOURCE],
		writes: [
			TRANSFORM_COMPONENT,
			RENDERABLE_COMPONENT,
			RIGID_BODY_COMPONENT,
			COLLIDER_COMPONENT,
			PHYSICS_JOINT_COMPONENT,
			CHARACTER_CONTROLLER_COMPONENT,
			CHARACTER_MOTOR_COMPONENT,
			STABLE_ID_COMPONENT,
		],
		update(context) {
			const playerEntity = context.world.getResource<Entity>(
				PLAYER_ENTITY_RESOURCE,
			);

			if (playerEntity === undefined || !context.world.isAlive(playerEntity)) {
				if (state) {
					destroyRigEntities(context.world, state);
					state = undefined;
				}
				return;
			}

			if (!state || state.playerEntity !== playerEntity) {
				if (state) {
					destroyRigEntities(context.world, state);
				}

				state = spawnRig(context.world, options.rig, playerEntity);
			}

			state.elapsedMs += context.deltaSeconds * 1000;
			consumeMotionQueue(context.world, state, options.rig);
			applyServoTargets(context.world, state, options.rig);
			followRootBody(context.world, state);
		},
	};
}

function spawnRig(
	world: World,
	rig: ArticulatedPhysicsRigDefinition,
	playerEntity: Entity,
): SpawnedRigState {
	const playerTransform = world.getComponent<RenderTransform>(
		playerEntity,
		TRANSFORM_COMPONENT,
	) ?? {
		position: vec3(),
		rotation: quat(),
		scale: vec3(1, 1, 1),
	};
	const bodyEntitiesById = new Map<string, Entity>();
	const jointEntitiesById = new Map<string, Entity>();
	const spawnedEntities: Entity[] = [];

	for (const body of rig.bodies) {
		const entity = world.createEntity();
		bodyEntitiesById.set(body.id, entity);
		spawnedEntities.push(entity);
		world.addComponent(entity, STABLE_ID_COMPONENT, {
			id: body.stableId ?? `${rig.id}:${body.id}`,
		});
		world.addComponent<RenderTransform>(entity, TRANSFORM_COMPONENT, {
			position: addVectors(
				playerTransform.position,
				vec3FromTuple(body.transform.position),
			),
			rotation: quatFromTuple(body.transform.rotation),
			scale: vec3FromTuple(body.transform.scale ?? [1, 1, 1]),
		});
		world.addComponent<RigidBodyComponent>(
			entity,
			RIGID_BODY_COMPONENT,
			body.rigidBody,
		);
		world.addComponent<ColliderComponent>(
			entity,
			COLLIDER_COMPONENT,
			colliderFromDefinition(body.collider),
		);

		if (body.renderable) {
			world.addComponent<RenderableComponent>(
				entity,
				RENDERABLE_COMPONENT,
				body.renderable,
			);
		}
	}

	for (const joint of rig.joints) {
		const parentEntity = bodyEntitiesById.get(joint.parentBodyId);
		const childEntity = bodyEntitiesById.get(joint.childBodyId);

		if (parentEntity === undefined || childEntity === undefined) {
			throw new Error(
				`Physics rig "${rig.id}" joint "${joint.id}" references an unknown body.`,
			);
		}

		const entity = world.createEntity();
		jointEntitiesById.set(joint.id, entity);
		spawnedEntities.push(entity);
		world.addComponent(entity, STABLE_ID_COMPONENT, {
			id: joint.stableId ?? `${rig.id}:joint:${joint.id}`,
		});
		world.addComponent<PhysicsJointComponent>(entity, PHYSICS_JOINT_COMPONENT, {
			type: joint.type,
			parentEntity,
			childEntity,
			anchorParent: vec3FromTuple(joint.anchorParent),
			anchorChild: vec3FromTuple(joint.anchorChild),
			axis: vec3FromTuple(joint.axis),
			...(joint.limitsDeg
				? {
						limits: {
							minRadians: degToRad(joint.limitsDeg.min),
							maxRadians: degToRad(joint.limitsDeg.max),
						},
					}
				: {}),
			motor: {
				targetRadians: degToRad(servoRestAngleForJoint(rig, joint.id)),
				stiffness: joint.motor.stiffness,
				damping: joint.motor.damping,
			},
		});
	}

	disableKinematicPlayerMovement(world, playerEntity);

	const rootEntity = bodyEntitiesById.get(rig.rootBodyId);
	if (rootEntity === undefined) {
		throw new Error(`Physics rig "${rig.id}" root body is missing.`);
	}

	return {
		playerEntity,
		rootEntity,
		bodyEntitiesById,
		jointEntitiesById,
		spawnedEntities,
		servoTargetsById: new Map(
			Object.entries(rig.simulation.idlePoseServoAnglesDeg).map(
				([servoId, angleDeg]) => [
					servoId,
					{ angleDeg, expiresAtMs: Number.POSITIVE_INFINITY },
				],
			),
		),
		pendingFrames: [],
		elapsedMs: 0,
	};
}

function consumeMotionQueue(
	world: World,
	state: SpawnedRigState,
	rig: ArticulatedPhysicsRigDefinition,
): void {
	const queue = world.getResource<PhysicsRigMotionQueue>(
		PHYSICS_RIG_MOTION_QUEUE_RESOURCE,
	);

	if (!queue) {
		return;
	}

	for (const event of queue.drain()) {
		if (event.schemaVersion !== 1 || event.robot !== rig.id) {
			continue;
		}

		const eventExpiresAt = state.elapsedMs + event.ttlMs;
		if (eventExpiresAt <= state.elapsedMs) {
			continue;
		}

		for (const frame of event.frames) {
			if (frame.atMs > event.ttlMs) {
				continue;
			}

			state.pendingFrames.push({
				servo: frame.servo,
				angleDeg: frame.angleDeg,
				applyAtMs: state.elapsedMs + Math.max(0, frame.atMs),
				expiresAtMs: eventExpiresAt,
			});
		}
	}

	for (let index = state.pendingFrames.length - 1; index >= 0; index -= 1) {
		const frame = state.pendingFrames[index];

		if (!frame || frame.expiresAtMs < state.elapsedMs) {
			state.pendingFrames.splice(index, 1);
			continue;
		}

		if (frame.applyAtMs <= state.elapsedMs) {
			state.servoTargetsById.set(frame.servo, {
				angleDeg: frame.angleDeg,
				expiresAtMs: frame.expiresAtMs,
			});
			state.pendingFrames.splice(index, 1);
		}
	}
}

function applyServoTargets(
	world: World,
	state: SpawnedRigState,
	rig: ArticulatedPhysicsRigDefinition,
): void {
	for (const channel of rig.servoChannels) {
		const jointDefinition = rig.joints.find(
			(joint) => joint.id === channel.jointId,
		);
		const jointEntity = state.jointEntitiesById.get(channel.jointId);

		if (!jointDefinition || jointEntity === undefined) {
			continue;
		}

		const target = state.servoTargetsById.get(channel.servoId);
		const targetAngle =
			target && target.expiresAtMs >= state.elapsedMs
				? target.angleDeg
				: rig.simulation.idlePoseServoAnglesDeg[channel.servoId] ??
					channel.restAngleDeg;
		const clampedAngle = clamp(
			targetAngle,
			channel.minAngleDeg,
			channel.maxAngleDeg,
		);
		const signedAngle =
			channel.restAngleDeg +
			(clampedAngle - channel.restAngleDeg) * (channel.direction ?? 1);
		const joint = world.requireComponent<PhysicsJointComponent>(
			jointEntity,
			PHYSICS_JOINT_COMPONENT,
		);

		world.addComponent<PhysicsJointComponent>(
			jointEntity,
			PHYSICS_JOINT_COMPONENT,
			{
				...joint,
				motor: {
					targetRadians: degToRad(signedAngle),
					stiffness: jointDefinition.motor.stiffness,
					damping: jointDefinition.motor.damping,
				},
			},
		);
	}
}

function followRootBody(world: World, state: SpawnedRigState): void {
	const rootTransform = world.getComponent<RenderTransform>(
		state.rootEntity,
		TRANSFORM_COMPONENT,
	);

	if (!rootTransform || !world.isAlive(state.playerEntity)) {
		return;
	}

	const playerTransform = world.getComponent<RenderTransform>(
		state.playerEntity,
		TRANSFORM_COMPONENT,
	) ?? {
		position: vec3(),
		rotation: quat(),
		scale: vec3(1, 1, 1),
	};

	world.addComponent<RenderTransform>(state.playerEntity, TRANSFORM_COMPONENT, {
		...playerTransform,
		position: rootTransform.position,
		rotation: rootTransform.rotation,
	});
}

function disableKinematicPlayerMovement(
	world: World,
	playerEntity: Entity,
): void {
	world.removeComponent(playerEntity, CHARACTER_CONTROLLER_COMPONENT);
	world.removeComponent(playerEntity, CHARACTER_MOTOR_COMPONENT);
	world.removeComponent(playerEntity, RIGID_BODY_COMPONENT);
	world.removeComponent(playerEntity, COLLIDER_COMPONENT);
	world.removeComponent(playerEntity, RENDERABLE_COMPONENT);
}

function destroyRigEntities(world: World, state: SpawnedRigState): void {
	for (const entity of [...state.spawnedEntities].reverse()) {
		if (world.isAlive(entity)) {
			world.destroyEntity(entity);
		}
	}
}

function servoRestAngleForJoint(
	rig: ArticulatedPhysicsRigDefinition,
	jointId: string,
): number {
	const channel = rig.servoChannels.find(
		(candidate) => candidate.jointId === jointId,
	);

	return channel?.restAngleDeg ?? 0;
}

function vec3FromTuple(tuple: PhysicsRigVector3): Vec3 {
	return vec3(tuple[0], tuple[1], tuple[2]);
}

function colliderFromDefinition(
	collider: PhysicsRigColliderDefinition,
): ColliderComponent {
	const { shape } = collider;

	if (shape.type === "box") {
		return {
			...collider,
			shape: {
				type: "box",
				halfExtents: vec3FromTuple(shape.halfExtents),
			},
		};
	}

	if (shape.type === "sphere") {
		return {
			...collider,
			shape,
		};
	}

	if (shape.type === "capsule") {
		return {
			...collider,
			shape,
		};
	}

	return {
		...collider,
		shape,
	};
}

function quatFromTuple(tuple: PhysicsRigQuaternion | undefined): Quat {
	return tuple ? quat(tuple[0], tuple[1], tuple[2], tuple[3]) : quat();
}

function addVectors(left: Vec3, right: Vec3): Vec3 {
	return vec3(left.x + right.x, left.y + right.y, left.z + right.z);
}

function degToRad(value: number): number {
	return (value * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
