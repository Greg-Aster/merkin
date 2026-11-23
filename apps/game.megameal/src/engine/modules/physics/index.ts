import type {
	EngineEvent,
	Entity,
	EventBus,
	System,
	World,
} from "../../core/index.js";
import {
	type Quat,
	type Vec3,
	addVec3,
	lengthSquaredVec3,
	quat,
	scaleVec3,
	vec3,
} from "../../math/index.js";

export const PHYSICS_TRANSFORM_COMPONENT = "Transform";
export const RIGID_BODY_COMPONENT = "RigidBody";
export const COLLIDER_COMPONENT = "Collider";
export const PHYSICS_JOINT_COMPONENT = "PhysicsJoint";
export const CHARACTER_CONTROLLER_COMPONENT = "CharacterController";
export const CHARACTER_MOTOR_COMPONENT = "CharacterMotor";

export type PhysicsBodyHandle = number;
export type ColliderHandle = number;
export type PhysicsJointHandle = number;

export type RigidBodyComponent = {
	readonly type: "dynamic" | "fixed" | "kinematic";
	readonly mass: number;
	readonly bodyHandle?: PhysicsBodyHandle;
};

export type BoxColliderShape = {
	readonly type: "box";
	readonly halfExtents: Vec3;
};

export type SphereColliderShape = {
	readonly type: "sphere";
	readonly radius: number;
};

export type CapsuleColliderShape = {
	readonly type: "capsule";
	readonly halfHeight: number;
	readonly radius: number;
};

export type CylinderColliderShape = {
	readonly type: "cylinder";
	readonly halfHeight: number;
	readonly radius: number;
};

export type MeshColliderShape = {
	readonly type: "mesh";
	readonly vertices: readonly Vec3[];
	readonly indices: readonly number[];
};

export type PhysicsColliderShape =
	| BoxColliderShape
	| SphereColliderShape
	| CapsuleColliderShape
	| CylinderColliderShape
	| MeshColliderShape;

export type CollisionIntent = "solid" | "trigger" | "walkable";
export type CollisionChannel = string;

export type ColliderComponent = {
	readonly shape: PhysicsColliderShape;
	readonly intent: CollisionIntent;
	readonly channel: CollisionChannel;
	readonly colliderHandle?: ColliderHandle;
	readonly sensor?: boolean;
	readonly friction?: number;
	readonly restitution?: number;
	readonly density?: number;
};

export type RevoluteJointLimits = {
	readonly minRadians: number;
	readonly maxRadians: number;
};

export type RevoluteJointMotor = {
	readonly targetRadians: number;
	readonly stiffness: number;
	readonly damping: number;
};

export type RevoluteJointComponent = {
	readonly type: "revolute";
	readonly parentEntity: Entity;
	readonly childEntity: Entity;
	readonly anchorParent: Vec3;
	readonly anchorChild: Vec3;
	readonly axis: Vec3;
	readonly limits?: RevoluteJointLimits;
	readonly motor?: RevoluteJointMotor;
	readonly jointHandle?: PhysicsJointHandle;
};

export type PhysicsJointComponent = RevoluteJointComponent;

export type SensorComponent = {
	readonly colliderHandle?: ColliderHandle;
	readonly events: readonly ("enter" | "exit")[];
};

export type CharacterControllerComponent = {
	readonly speed: number;
	readonly jumpForce: number;
	readonly grounded: boolean;
	readonly sprintMultiplier?: number;
	readonly gravity?: number;
	readonly verticalVelocity?: number;
	readonly groundY?: number;
};

export type CharacterBounds = {
	readonly minX: number;
	readonly maxX: number;
	readonly minZ: number;
	readonly maxZ: number;
};

export type CharacterMotorComponent = {
	readonly direction: Vec3;
	readonly sprinting: boolean;
	readonly jumpRequested: boolean;
	readonly bounds?: CharacterBounds;
};

export type PhysicsTransform = {
	readonly position: Vec3;
	readonly rotation: Quat;
};

export type PhysicsTransformComponent = PhysicsTransform & {
	readonly scale?: Vec3;
};

export type PhysicsCollisionEventType =
	| "PhysicsCollisionStarted"
	| "PhysicsCollisionStopped";

export type PhysicsCollisionEvent = EngineEvent<PhysicsCollisionEventType> & {
	readonly entityA: Entity;
	readonly entityB: Entity;
	readonly colliderA: ColliderHandle;
	readonly colliderB: ColliderHandle;
};

export type PhysicsAdapterPort = {
	createRigidBody(
		entity: Entity,
		body: RigidBodyComponent,
		transform: PhysicsTransform,
	): PhysicsBodyHandle;
	createCollider(
		entity: Entity,
		bodyHandle: PhysicsBodyHandle,
		collider: ColliderComponent,
	): ColliderHandle;
	destroyCollider(handle: ColliderHandle): void;
	destroyRigidBody(handle: PhysicsBodyHandle): void;
	createJoint(
		joint: PhysicsJointComponent,
		parentBodyHandle: PhysicsBodyHandle,
		childBodyHandle: PhysicsBodyHandle,
	): PhysicsJointHandle;
	destroyJoint(handle: PhysicsJointHandle): void;
	configureJointMotor(
		handle: PhysicsJointHandle,
		motor: RevoluteJointMotor,
	): void;
	syncBodyFromTransform(
		handle: PhysicsBodyHandle,
		transform: PhysicsTransform,
	): void;
	syncTransformFromBody(handle: PhysicsBodyHandle): PhysicsTransform;
	applyImpulse(handle: PhysicsBodyHandle, impulse: Vec3): void;
	step(deltaSeconds: number): void;
	drainEvents(): readonly PhysicsCollisionEvent[];
	castRay?(query: PhysicsRaycastQuery): PhysicsRaycastHit | undefined;
	bodyCount?(): number;
	colliderCount?(): number;
	dispose(): void;
};

export type PhysicsRaycastQuery = {
	readonly origin: Vec3;
	readonly direction: Vec3;
	readonly maxDistance: number;
};

export type PhysicsRaycastHit = {
	readonly entity: Entity;
	readonly point: Vec3;
	readonly normal: Vec3;
	readonly distance: number;
};

export function emitPhysicsEvents(
	adapter: Pick<PhysicsAdapterPort, "drainEvents">,
	events: Pick<EventBus, "emit">,
): readonly PhysicsCollisionEvent[] {
	const drained = adapter.drainEvents();

	for (const event of drained) {
		events.emit(event);
	}

	return drained;
}

export type PhysicsSyncContext = {
	readonly world: World;
};

export type KinematicCharacterControllerContext = {
	readonly deltaSeconds: number;
	readonly world: World;
	readonly events: Pick<EventBus, "emit">;
};

export type PhysicsStepContext = {
	readonly deltaSeconds: number;
	readonly events: EventBus;
};

export type PhysicsSyncSystemOptions = {
	readonly adapter: PhysicsAdapterPort;
	readonly transformComponent?: string;
	readonly rigidBodyComponent?: string;
	readonly colliderComponent?: string;
};

export class PhysicsSyncSystem {
	readonly adapter: PhysicsAdapterPort;
	readonly transformComponent: string;
	readonly rigidBodyComponent: string;
	readonly colliderComponent: string;

	readonly #bodyRecords = new Map<
		Entity,
		{ readonly handle: PhysicsBodyHandle; readonly signature: string }
	>();
	readonly #colliderRecords = new Map<
		Entity,
		{
			readonly handle: ColliderHandle;
			readonly bodyHandle: PhysicsBodyHandle;
			readonly signature: string;
		}
	>();
	readonly #jointRecords = new Map<
		Entity,
		{ readonly handle: PhysicsJointHandle; readonly signature: string }
	>();

	constructor(options: PhysicsSyncSystemOptions) {
		this.adapter = options.adapter;
		this.transformComponent =
			options.transformComponent ?? PHYSICS_TRANSFORM_COMPONENT;
		this.rigidBodyComponent =
			options.rigidBodyComponent ?? RIGID_BODY_COMPONENT;
		this.colliderComponent = options.colliderComponent ?? COLLIDER_COMPONENT;
	}

	preSync(context: PhysicsSyncContext): void {
		const activeBodies = new Set(
			context.world.query([this.transformComponent, this.rigidBodyComponent]),
		);

		for (const entity of activeBodies) {
			const transform = normalizeRuntimeTransform(
				context.world.requireComponent(entity, this.transformComponent),
			);
			const body = context.world.requireComponent<RigidBodyComponent>(
				entity,
				this.rigidBodyComponent,
			);
			const physicsTransform = toPhysicsTransform(transform);
			const bodyRecord = this.ensureBody(
				context.world,
				entity,
				body,
				physicsTransform,
			);

			if (body.type !== "dynamic") {
				this.adapter.syncBodyFromTransform(bodyRecord.handle, physicsTransform);
			}

			const collider = context.world.getComponent<ColliderComponent>(
				entity,
				this.colliderComponent,
			);

			if (collider) {
				this.ensureCollider(context.world, entity, bodyRecord.handle, collider);
			} else {
				this.destroyCollider(context.world, entity);
			}
		}

		for (const entity of [...this.#bodyRecords.keys()]) {
			if (!activeBodies.has(entity)) {
				this.destroyBody(context.world, entity);
			}
		}

		for (const entity of [...this.#colliderRecords.keys()]) {
			if (
				!activeBodies.has(entity) ||
				!context.world.hasComponent(entity, this.colliderComponent)
			) {
				this.destroyCollider(context.world, entity);
			}
		}

		this.syncJoints(context.world);
	}

	postSync(context: PhysicsSyncContext): void {
		for (const entity of context.world.query([
			this.transformComponent,
			this.rigidBodyComponent,
		])) {
			const body = context.world.requireComponent<RigidBodyComponent>(
				entity,
				this.rigidBodyComponent,
			);
			const bodyHandle =
				this.#bodyRecords.get(entity)?.handle ?? body.bodyHandle;

			if (bodyHandle === undefined) {
				continue;
			}

			const transform = normalizeRuntimeTransform(
				context.world.requireComponent(entity, this.transformComponent),
			);
			const nextTransform = this.adapter.syncTransformFromBody(bodyHandle);

			context.world.addComponent(entity, this.transformComponent, {
				...transform,
				position: nextTransform.position,
				rotation: nextTransform.rotation,
			});
		}
	}

	dispose(): void {
		for (const entity of [...this.#jointRecords.keys()]) {
			this.destroyJoint(undefined, entity);
		}

		for (const entity of [...this.#colliderRecords.keys()]) {
			this.destroyCollider(undefined, entity);
		}

		for (const entity of [...this.#bodyRecords.keys()]) {
			this.destroyBody(undefined, entity);
		}
	}

	hasBody(entity: Entity): boolean {
		return this.#bodyRecords.has(entity);
	}

	hasCollider(entity: Entity): boolean {
		return this.#colliderRecords.has(entity);
	}

	bodyCount(): number {
		return this.#bodyRecords.size;
	}

	colliderCount(): number {
		return this.#colliderRecords.size;
	}

	jointCount(): number {
		return this.#jointRecords.size;
	}

	private ensureBody(
		world: World,
		entity: Entity,
		body: RigidBodyComponent,
		transform: PhysicsTransform,
	): { readonly handle: PhysicsBodyHandle; readonly signature: string } {
		const bodyWithoutHandle = withoutBodyHandle(body);
		const signature = stableComponentSignature(bodyWithoutHandle);
		const existing = this.#bodyRecords.get(entity);

		if (existing && existing.signature === signature) {
			if (body.bodyHandle !== existing.handle) {
				world.addComponent(entity, this.rigidBodyComponent, {
					...bodyWithoutHandle,
					bodyHandle: existing.handle,
				} satisfies RigidBodyComponent);
			}

			return existing;
		}

		if (existing) {
			this.destroyBody(world, entity);
		}

		const handle = this.adapter.createRigidBody(entity, body, transform);
		const record = {
			handle,
			signature,
		};

		this.#bodyRecords.set(entity, record);
		world.addComponent(entity, this.rigidBodyComponent, {
			...bodyWithoutHandle,
			bodyHandle: handle,
		} satisfies RigidBodyComponent);

		return record;
	}

	private ensureCollider(
		world: World,
		entity: Entity,
		bodyHandle: PhysicsBodyHandle,
		collider: ColliderComponent,
	): {
		readonly handle: ColliderHandle;
		readonly bodyHandle: PhysicsBodyHandle;
		readonly signature: string;
	} {
		const colliderWithoutHandle = withoutColliderHandle(collider);
		const signature = stableComponentSignature(colliderWithoutHandle);
		const existing = this.#colliderRecords.get(entity);

		if (
			existing &&
			existing.signature === signature &&
			existing.bodyHandle === bodyHandle
		) {
			if (collider.colliderHandle !== existing.handle) {
				world.addComponent(entity, this.colliderComponent, {
					...colliderWithoutHandle,
					colliderHandle: existing.handle,
				} satisfies ColliderComponent);
			}

			return existing;
		}

		if (existing) {
			this.destroyCollider(world, entity);
		}

		const handle = this.adapter.createCollider(entity, bodyHandle, collider);
		const record = {
			handle,
			bodyHandle,
			signature,
		};

		this.#colliderRecords.set(entity, record);
		world.addComponent(entity, this.colliderComponent, {
			...colliderWithoutHandle,
			colliderHandle: handle,
		} satisfies ColliderComponent);

		return record;
	}

	private destroyCollider(world: World | undefined, entity: Entity): void {
		const colliderRecord = this.#colliderRecords.get(entity);

		if (colliderRecord === undefined) {
			return;
		}

		this.adapter.destroyCollider(colliderRecord.handle);
		this.#colliderRecords.delete(entity);

		if (
			world?.isAlive(entity) &&
			world.hasComponent(entity, this.colliderComponent)
		) {
			world.addComponent(
				entity,
				this.colliderComponent,
				withoutColliderHandle(
					world.requireComponent<ColliderComponent>(
						entity,
						this.colliderComponent,
					),
				),
			);
		}
	}

	private destroyBody(world: World | undefined, entity: Entity): void {
		for (const [jointEntity, joint] of this.activeJointComponents(world)) {
			if (joint.parentEntity === entity || joint.childEntity === entity) {
				this.destroyJoint(world, jointEntity);
			}
		}

		this.destroyCollider(world, entity);

		const bodyRecord = this.#bodyRecords.get(entity);

		if (bodyRecord === undefined) {
			return;
		}

		this.adapter.destroyRigidBody(bodyRecord.handle);
		this.#bodyRecords.delete(entity);

		if (
			world?.isAlive(entity) &&
			world.hasComponent(entity, this.rigidBodyComponent)
		) {
			world.addComponent(
				entity,
				this.rigidBodyComponent,
				withoutBodyHandle(
					world.requireComponent<RigidBodyComponent>(
						entity,
						this.rigidBodyComponent,
					),
				),
			);
		}
	}

	private syncJoints(world: World): void {
		const activeJoints = new Set(world.query([PHYSICS_JOINT_COMPONENT]));

		for (const entity of activeJoints) {
			const joint = world.requireComponent<PhysicsJointComponent>(
				entity,
				PHYSICS_JOINT_COMPONENT,
			);
			const parentBody = this.bodyHandleFor(world, joint.parentEntity);
			const childBody = this.bodyHandleFor(world, joint.childEntity);

			if (parentBody === undefined || childBody === undefined) {
				this.destroyJoint(world, entity);
				continue;
			}

			this.ensureJoint(world, entity, joint, parentBody, childBody);
		}

		for (const entity of [...this.#jointRecords.keys()]) {
			if (!activeJoints.has(entity)) {
				this.destroyJoint(world, entity);
			}
		}
	}

	private ensureJoint(
		world: World,
		entity: Entity,
		joint: PhysicsJointComponent,
		parentBodyHandle: PhysicsBodyHandle,
		childBodyHandle: PhysicsBodyHandle,
	): { readonly handle: PhysicsJointHandle; readonly signature: string } {
		const jointWithoutHandle = withoutJointHandle(joint);
		const signature = stableComponentSignature({
			...jointWithoutHandle,
			motor: undefined,
			parentBodyHandle,
			childBodyHandle,
		});
		const existing = this.#jointRecords.get(entity);

		if (existing && existing.signature === signature) {
			if (joint.jointHandle !== existing.handle) {
				world.addComponent(entity, PHYSICS_JOINT_COMPONENT, {
					...jointWithoutHandle,
					jointHandle: existing.handle,
				} satisfies PhysicsJointComponent);
			}

			if (joint.motor) {
				this.adapter.configureJointMotor(existing.handle, joint.motor);
			}

			return existing;
		}

		if (existing) {
			this.destroyJoint(world, entity);
		}

		const handle = this.adapter.createJoint(
			jointWithoutHandle,
			parentBodyHandle,
			childBodyHandle,
		);
		const record = {
			handle,
			signature,
		};

		this.#jointRecords.set(entity, record);
		world.addComponent(entity, PHYSICS_JOINT_COMPONENT, {
			...jointWithoutHandle,
			jointHandle: handle,
		} satisfies PhysicsJointComponent);

		if (joint.motor) {
			this.adapter.configureJointMotor(handle, joint.motor);
		}

		return record;
	}

	private destroyJoint(world: World | undefined, entity: Entity): void {
		const jointRecord = this.#jointRecords.get(entity);

		if (jointRecord === undefined) {
			return;
		}

		this.adapter.destroyJoint(jointRecord.handle);
		this.#jointRecords.delete(entity);

		if (
			world?.isAlive(entity) &&
			world.hasComponent(entity, PHYSICS_JOINT_COMPONENT)
		) {
			world.addComponent(
				entity,
				PHYSICS_JOINT_COMPONENT,
				withoutJointHandle(
					world.requireComponent<PhysicsJointComponent>(
						entity,
						PHYSICS_JOINT_COMPONENT,
					),
				),
			);
		}
	}

	private bodyHandleFor(
		world: World,
		entity: Entity,
	): PhysicsBodyHandle | undefined {
		return (
			this.#bodyRecords.get(entity)?.handle ??
			world.getComponent<RigidBodyComponent>(entity, this.rigidBodyComponent)
				?.bodyHandle
		);
	}

	private activeJointComponents(
		world: World | undefined,
	): readonly (readonly [Entity, PhysicsJointComponent])[] {
		if (!world) {
			return [];
		}

		return world
			.query([PHYSICS_JOINT_COMPONENT])
			.map(
				(entity) =>
					[
						entity,
						world.requireComponent<PhysicsJointComponent>(
							entity,
							PHYSICS_JOINT_COMPONENT,
						),
					] as const,
			);
	}
}

export function createPhysicsSyncSystems<
	TContext extends PhysicsSyncContext & PhysicsStepContext,
>(options: PhysicsSyncSystemOptions): readonly System<TContext>[] {
	const sync = new PhysicsSyncSystem(options);

	return [
		createPhysicsPreSyncSystem(sync),
		createPhysicsStepSystem(options.adapter),
		createPhysicsPostSyncSystem(sync),
	];
}

export type KinematicCharacterControllerSystemOptions = {
	readonly transformComponent?: string;
	readonly characterControllerComponent?: string;
	readonly characterMotorComponent?: string;
};

export function createKinematicCharacterControllerSystem<
	TContext extends KinematicCharacterControllerContext,
>(options: KinematicCharacterControllerSystemOptions = {}): System<TContext> {
	const transformComponent =
		options.transformComponent ?? PHYSICS_TRANSFORM_COMPONENT;
	const characterControllerComponent =
		options.characterControllerComponent ?? CHARACTER_CONTROLLER_COMPONENT;
	const characterMotorComponent =
		options.characterMotorComponent ?? CHARACTER_MOTOR_COMPONENT;

	return {
		id: "kinematic-character-controller",
		reads: [
			transformComponent,
			characterControllerComponent,
			characterMotorComponent,
		],
		writes: [transformComponent, characterControllerComponent],
		update(context) {
			for (const entity of context.world.query([
				transformComponent,
				characterControllerComponent,
			])) {
				const motor = context.world.getComponent<CharacterMotorComponent>(
					entity,
					characterMotorComponent,
				) ?? { direction: vec3(), sprinting: false, jumpRequested: false };
				const transform = normalizeRuntimeTransform(
					context.world.requireComponent(entity, transformComponent),
				);
				const controller =
					context.world.requireComponent<CharacterControllerComponent>(
						entity,
						characterControllerComponent,
					);
				const speed =
					controller.speed *
					(motor.sprinting ? controller.sprintMultiplier ?? 1 : 1);
				const horizontalDirection =
					lengthSquaredVec3(motor.direction) === 0 ? vec3() : motor.direction;
				const horizontalDelta = scaleVec3(
					vec3(horizontalDirection.x, 0, horizontalDirection.z),
					speed * context.deltaSeconds,
				);
				const gravity = controller.gravity ?? -18;
				const groundY = controller.groundY ?? transform.position.y;
				const wasGrounded =
					controller.grounded || transform.position.y <= groundY + 0.001;
				let verticalVelocity = controller.verticalVelocity ?? 0;

				if (motor.jumpRequested && wasGrounded) {
					verticalVelocity = controller.jumpForce;
				} else if (wasGrounded && verticalVelocity < 0) {
					verticalVelocity = 0;
				}

				verticalVelocity += gravity * context.deltaSeconds;

				const verticalDelta = verticalVelocity * context.deltaSeconds;
				const unclampedPosition = addVec3(
					transform.position,
					addVec3(horizontalDelta, vec3(0, verticalDelta, 0)),
				);
				const grounded = unclampedPosition.y <= groundY;
				const nextPosition = clampPosition(
					{
						...unclampedPosition,
						y: grounded ? groundY : unclampedPosition.y,
					},
					motor.bounds,
				);
				const nextVerticalVelocity = grounded
					? Math.max(0, verticalVelocity)
					: verticalVelocity;

				context.world.addComponent(entity, transformComponent, {
					...transform,
					position: nextPosition,
				});
				context.world.addComponent<CharacterControllerComponent>(
					entity,
					characterControllerComponent,
					{
						...controller,
						grounded,
						verticalVelocity: nextVerticalVelocity,
					},
				);

				if (
					lengthSquaredVec3(horizontalDelta) === 0 &&
					Math.abs(verticalDelta) === 0
				) {
					continue;
				}

				context.events.emit({
					type: "EntityMoved",
					entity,
					position: nextPosition,
				});
			}
		},
	};
}

export function createPhysicsPreSyncSystem<TContext extends PhysicsSyncContext>(
	sync: PhysicsSyncSystem,
): System<TContext> {
	return {
		id: "physics-pre-sync",
		reads: [
			sync.transformComponent,
			sync.rigidBodyComponent,
			PHYSICS_JOINT_COMPONENT,
		],
		writes: [
			sync.transformComponent,
			sync.rigidBodyComponent,
			sync.colliderComponent,
			PHYSICS_JOINT_COMPONENT,
		],
		update(context) {
			sync.preSync(context);
		},
	};
}

export function createPhysicsStepSystem<TContext extends PhysicsStepContext>(
	adapter: PhysicsAdapterPort,
): System<TContext> {
	return {
		id: "physics-step",
		update(context) {
			adapter.step(context.deltaSeconds);
			emitPhysicsEvents(adapter, context.events);
		},
	};
}

export function createPhysicsPostSyncSystem<
	TContext extends PhysicsSyncContext,
>(sync: PhysicsSyncSystem): System<TContext> {
	return {
		id: "physics-post-sync",
		reads: [sync.rigidBodyComponent],
		writes: [sync.transformComponent],
		update(context) {
			sync.postSync(context);
		},
	};
}

function toPhysicsTransform(
	transform: PhysicsTransformComponent,
): PhysicsTransform {
	return {
		position: transform.position,
		rotation: transform.rotation,
	};
}

function normalizeRuntimeTransform(value: unknown): PhysicsTransformComponent {
	if (!isRecord(value)) {
		return {
			position: vec3(),
			rotation: quat(),
			scale: vec3(1, 1, 1),
		};
	}

	return {
		...value,
		position: vec3FromUnknown(value.position, vec3()),
		rotation: quatFromUnknown(value.rotation, quat()),
		scale: vec3FromUnknown(value.scale, vec3(1, 1, 1)),
	};
}

function clampPosition(
	position: Vec3,
	bounds: CharacterBounds | undefined,
): Vec3 {
	if (!bounds) {
		return position;
	}

	return vec3(
		Math.max(bounds.minX, Math.min(bounds.maxX, position.x)),
		position.y,
		Math.max(bounds.minZ, Math.min(bounds.maxZ, position.z)),
	);
}

function vec3FromUnknown(value: unknown, fallback: Vec3): Vec3 {
	if (Array.isArray(value)) {
		return vec3(
			numberOrFallback(value[0], fallback.x),
			numberOrFallback(value[1], fallback.y),
			numberOrFallback(value[2], fallback.z),
		);
	}

	if (isRecord(value)) {
		return vec3(
			numberOrFallback(value.x, fallback.x),
			numberOrFallback(value.y, fallback.y),
			numberOrFallback(value.z, fallback.z),
		);
	}

	return fallback;
}

function quatFromUnknown(value: unknown, fallback: Quat): Quat {
	if (Array.isArray(value)) {
		return quat(
			numberOrFallback(value[0], fallback.x),
			numberOrFallback(value[1], fallback.y),
			numberOrFallback(value[2], fallback.z),
			numberOrFallback(value[3], fallback.w),
		);
	}

	if (isRecord(value)) {
		return quat(
			numberOrFallback(value.x, fallback.x),
			numberOrFallback(value.y, fallback.y),
			numberOrFallback(value.z, fallback.z),
			numberOrFallback(value.w, fallback.w),
		);
	}

	return fallback;
}

function withoutBodyHandle(body: RigidBodyComponent): RigidBodyComponent {
	return {
		type: body.type,
		mass: body.mass,
	};
}

function withoutColliderHandle(collider: ColliderComponent): ColliderComponent {
	return {
		shape: collider.shape,
		intent: collider.intent,
		channel: collider.channel,
		...(collider.sensor !== undefined ? { sensor: collider.sensor } : {}),
		...(collider.friction !== undefined ? { friction: collider.friction } : {}),
		...(collider.restitution !== undefined
			? { restitution: collider.restitution }
			: {}),
		...(collider.density !== undefined ? { density: collider.density } : {}),
	};
}

function withoutJointHandle(
	joint: PhysicsJointComponent,
): PhysicsJointComponent {
	return {
		type: joint.type,
		parentEntity: joint.parentEntity,
		childEntity: joint.childEntity,
		anchorParent: joint.anchorParent,
		anchorChild: joint.anchorChild,
		axis: joint.axis,
		...(joint.limits ? { limits: joint.limits } : {}),
		...(joint.motor ? { motor: joint.motor } : {}),
	};
}

function stableComponentSignature(value: unknown): string {
	return JSON.stringify(sortRecord(value));
}

function sortRecord(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => sortRecord(item));
	}

	if (isRecord(value)) {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, item]) => [key, sortRecord(item)]),
		);
	}

	return value;
}

function numberOrFallback(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
