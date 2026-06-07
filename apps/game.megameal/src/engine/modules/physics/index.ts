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
	scaleVec3,
	vec3,
} from "../../math/index.js";

export const PHYSICS_TRANSFORM_COMPONENT = "Transform";
export const RIGID_BODY_COMPONENT = "RigidBody";
export const COLLIDER_COMPONENT = "Collider";
export const CHARACTER_CONTROLLER_COMPONENT = "CharacterController";
export const CHARACTER_MOTOR_COMPONENT = "CharacterMotor";

export type PhysicsBodyHandle = number;
export type ColliderHandle = number;

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
	readonly offset?: Vec3;
	readonly colliderHandle?: ColliderHandle;
	readonly sensor?: boolean;
};

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
	readonly kinematicCollision?: KinematicCharacterCollisionSettings;
};

export type KinematicCharacterCollisionSettings = {
	readonly enabled?: boolean;
	readonly offset?: number;
	readonly slide?: boolean;
	readonly obstacleChannels?: readonly CollisionChannel[];
	readonly snapToGroundDistance?: number;
	readonly maxSlopeClimbAngle?: number;
	readonly minSlopeSlideAngle?: number;
	readonly autostep?: KinematicCharacterAutostepSettings;
	readonly up?: Vec3;
};

export type KinematicCharacterAutostepSettings = {
	readonly maxHeight: number;
	readonly minWidth: number;
	readonly includeDynamicBodies?: boolean;
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
	syncBodyFromTransform(
		handle: PhysicsBodyHandle,
		transform: PhysicsTransform,
	): void;
	syncTransformFromBody(handle: PhysicsBodyHandle): PhysicsTransform;
	applyImpulse(handle: PhysicsBodyHandle, impulse: Vec3): void;
	step(deltaSeconds: number): void;
	drainEvents(): readonly PhysicsCollisionEvent[];
	castRay?(query: PhysicsRaycastQuery): PhysicsRaycastHit | undefined;
	computeKinematicCharacterMovement?(
		query: KinematicCharacterMovementQuery,
	): KinematicCharacterMovementResult | undefined;
	bodyCount?(): number;
	colliderCount?(): number;
	dispose(): void;
};

export type PhysicsRaycastQuery = {
	readonly origin: Vec3;
	readonly direction: Vec3;
	readonly maxDistance: number;
	readonly excludeEntities?: readonly Entity[];
};

export type PhysicsRaycastHit = {
	readonly entity: Entity;
	readonly point: Vec3;
	readonly normal: Vec3;
	readonly distance: number;
};

export type KinematicCharacterMovementQuery = {
	readonly entity: Entity;
	readonly colliderHandle: ColliderHandle;
	readonly desiredTranslation: Vec3;
	readonly settings: KinematicCharacterCollisionSettings;
	readonly excludeEntities?: readonly Entity[];
};

export type KinematicCharacterMovementResult = {
	readonly translation: Vec3;
	readonly grounded: boolean;
	readonly collisionCount: number;
};

export type KinematicCharacterCollisionUnavailableReason =
	| "missing-collider-handle"
	| "missing-physics-adapter"
	| "movement-query-failed";

export type KinematicCharacterCollisionUnavailableEvent =
	EngineEvent<"KinematicCharacterCollisionUnavailable"> & {
		readonly entity: Entity;
		readonly reason: KinematicCharacterCollisionUnavailableReason;
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
			const transform = requireRuntimeTransform(
				context.world.requireComponent(entity, this.transformComponent),
				entity,
				this.transformComponent,
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

			const transform = requireRuntimeTransform(
				context.world.requireComponent(entity, this.transformComponent),
				entity,
				this.transformComponent,
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
	readonly colliderComponent?: string;
	readonly physics?: Pick<
		PhysicsAdapterPort,
		"computeKinematicCharacterMovement"
	>;
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
	const colliderComponent = options.colliderComponent ?? COLLIDER_COMPONENT;
	const physics = options.physics;

	return {
		id: "kinematic-character-controller",
		reads: [
			transformComponent,
			characterControllerComponent,
			characterMotorComponent,
			colliderComponent,
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
				const transform = requireRuntimeTransform(
					context.world.requireComponent(entity, transformComponent),
					entity,
					transformComponent,
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
				const fallbackGroundY = controller.groundY ?? transform.position.y;
				const wasGrounded =
					controller.grounded ||
					transform.position.y <= fallbackGroundY + 0.001;
				let verticalVelocity = controller.verticalVelocity ?? 0;

				if (motor.jumpRequested && wasGrounded) {
					verticalVelocity = controller.jumpForce;
				} else if (wasGrounded && verticalVelocity < 0) {
					verticalVelocity = 0;
				}

				verticalVelocity += gravity * context.deltaSeconds;

				const verticalDelta = verticalVelocity * context.deltaSeconds;
				const desiredTranslation = addVec3(
					horizontalDelta,
					vec3(0, verticalDelta, 0),
				);
				const collider = context.world.getComponent<ColliderComponent>(
					entity,
					colliderComponent,
				);
				const kinematicCollision = controller.kinematicCollision;
				const physicsAdapter = physics;
				const kinematicCollisionRequested =
					kinematicCollision !== undefined &&
					kinematicCollision.enabled !== false;
				const kinematicUnavailableReason =
					kinematicCollisionRequested && collider?.colliderHandle === undefined
						? "missing-collider-handle"
						: kinematicCollisionRequested &&
								physicsAdapter?.computeKinematicCharacterMovement === undefined
							? "missing-physics-adapter"
							: undefined;
				const kinematicMovement =
					kinematicCollisionRequested &&
					kinematicUnavailableReason === undefined &&
					collider?.colliderHandle !== undefined &&
					kinematicCollision !== undefined &&
					physicsAdapter?.computeKinematicCharacterMovement !== undefined
						? physicsAdapter.computeKinematicCharacterMovement({
								entity,
								colliderHandle: collider.colliderHandle,
								desiredTranslation,
								settings: kinematicCollision,
								excludeEntities: [entity],
							})
						: undefined;

				if (
					kinematicCollisionRequested &&
					(kinematicUnavailableReason !== undefined ||
						kinematicMovement === undefined)
				) {
					context.events.emit({
						type: "KinematicCharacterCollisionUnavailable",
						entity,
						reason: kinematicUnavailableReason ?? "movement-query-failed",
					});
				}

				const unclampedPosition = addVec3(
					transform.position,
					kinematicMovement?.translation ?? desiredTranslation,
				);
				const adapterGrounded = kinematicMovement?.grounded === true;
				const fallbackGrounded =
					!adapterGrounded && unclampedPosition.y <= fallbackGroundY;
				const grounded = adapterGrounded || fallbackGrounded;
				const nextPosition = clampPosition(
					{
						...unclampedPosition,
						y:
							(kinematicMovement === undefined || fallbackGrounded) && grounded
								? fallbackGroundY
								: unclampedPosition.y,
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
		reads: [sync.transformComponent, sync.rigidBodyComponent],
		writes: [
			sync.transformComponent,
			sync.rigidBodyComponent,
			sync.colliderComponent,
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

function requireRuntimeTransform(
	value: unknown,
	entity: Entity,
	componentName: string,
): PhysicsTransformComponent {
	if (!isRecord(value)) {
		throw new Error(
			`Invalid ${componentName} component on entity ${entity}: expected an object.`,
		);
	}

	if (!isFiniteVec3(value.position)) {
		throw new Error(
			`Invalid ${componentName} component on entity ${entity}: position must be a finite Vec3.`,
		);
	}

	if (!isFiniteQuat(value.rotation)) {
		throw new Error(
			`Invalid ${componentName} component on entity ${entity}: rotation must be a finite Quat.`,
		);
	}

	if (value.scale !== undefined && !isFiniteVec3(value.scale)) {
		throw new Error(
			`Invalid ${componentName} component on entity ${entity}: scale must be a finite Vec3 when provided.`,
		);
	}

	return value as PhysicsTransformComponent;
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

function isFiniteVec3(value: unknown): value is Vec3 {
	return (
		isRecord(value) &&
		isFiniteNumber(value.x) &&
		isFiniteNumber(value.y) &&
		isFiniteNumber(value.z)
	);
}

function isFiniteQuat(value: unknown): value is Quat {
	return (
		isRecord(value) &&
		isFiniteNumber(value.x) &&
		isFiniteNumber(value.y) &&
		isFiniteNumber(value.z) &&
		isFiniteNumber(value.w)
	);
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
		...(collider.offset !== undefined ? { offset: collider.offset } : {}),
		...(collider.sensor !== undefined ? { sensor: collider.sensor } : {}),
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

function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
