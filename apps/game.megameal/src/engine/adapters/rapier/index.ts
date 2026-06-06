import type { Entity } from "../../core/index.js";
import { type Quat, type Vec3, quat, vec3 } from "../../math/index.js";
import type {
	ColliderComponent,
	ColliderHandle,
	KinematicCharacterCollisionSettings,
	KinematicCharacterMovementQuery,
	KinematicCharacterMovementResult,
	PhysicsAdapterPort,
	PhysicsBodyHandle,
	PhysicsCollisionEvent,
	PhysicsRaycastHit,
	PhysicsRaycastQuery,
	PhysicsTransform,
	RigidBodyComponent,
} from "../../modules/physics/index.js";

type RapierVector = {
	readonly x: number;
	readonly y: number;
	readonly z: number;
};

type RapierRotation = {
	readonly x: number;
	readonly y: number;
	readonly z: number;
	readonly w: number;
};

type RapierRigidBodyDesc = {
	setTranslation?(x: number, y: number, z: number): RapierRigidBodyDesc;
	setRotation?(rotation: Quat): RapierRigidBodyDesc;
	setAdditionalMass?(mass: number): RapierRigidBodyDesc;
};

type RapierColliderDesc = {
	setSensor?(sensor: boolean): RapierColliderDesc;
	setActiveEvents?(events: number): RapierColliderDesc;
	setTranslation?(x: number, y: number, z: number): RapierColliderDesc;
};

type RapierRigidBody = {
	readonly handle: PhysicsBodyHandle;
	translation(): RapierVector;
	rotation(): RapierRotation;
	setTranslation(translation: Vec3, wakeUp: boolean): void;
	setRotation(rotation: Quat, wakeUp: boolean): void;
	setNextKinematicTranslation?(translation: Vec3): void;
	setNextKinematicRotation?(rotation: Quat): void;
	applyImpulse?(impulse: Vec3, wakeUp: boolean): void;
};

type RapierCollider = {
	readonly handle: ColliderHandle;
};

type RapierRay = {
	readonly origin: Vec3;
	readonly dir: Vec3;
};

type RapierRayHit = {
	readonly collider?: RapierCollider;
	readonly colliderHandle?: ColliderHandle;
	readonly timeOfImpact?: number;
	readonly toi?: number;
	readonly normal?: RapierVector | (() => RapierVector);
};

type RapierWorld = {
	timestep?: number;
	createRigidBody(desc: RapierRigidBodyDesc): RapierRigidBody;
	removeRigidBody(body: RapierRigidBody): void;
	createCharacterController?(
		offset: number,
	): RapierKinematicCharacterController;
	removeCharacterController?(
		controller: RapierKinematicCharacterController,
	): void;
	createCollider(
		desc: RapierColliderDesc,
		body?: RapierRigidBody,
	): RapierCollider;
	removeCollider(collider: RapierCollider, wakeUp?: boolean): void;
	step(eventQueue?: RapierEventQueue): void;
	castRay?(
		ray: RapierRay,
		maxDistance: number,
		solid: boolean,
		filterFlags?: unknown,
		filterGroups?: unknown,
		filterExcludeCollider?: RapierCollider,
		filterExcludeRigidBody?: RapierRigidBody,
		filterPredicate?: (collider: RapierCollider) => boolean,
	): RapierRayHit | undefined;
	castRayAndGetNormal?(
		ray: RapierRay,
		maxDistance: number,
		solid: boolean,
		filterFlags?: unknown,
		filterGroups?: unknown,
		filterExcludeCollider?: RapierCollider,
		filterExcludeRigidBody?: RapierRigidBody,
		filterPredicate?: (collider: RapierCollider) => boolean,
	): RapierRayHit | undefined;
};

type RapierKinematicCharacterController = {
	free?(): void;
	setUp?(vector: Vec3): void;
	setOffset?(value: number): void;
	setSlideEnabled?(enabled: boolean): void;
	enableAutostep?(
		maxHeight: number,
		minWidth: number,
		includeDynamicBodies: boolean,
	): void;
	disableAutostep?(): void;
	setMaxSlopeClimbAngle?(angle: number): void;
	setMinSlopeSlideAngle?(angle: number): void;
	enableSnapToGround?(distance: number): void;
	disableSnapToGround?(): void;
	computeColliderMovement(
		collider: RapierCollider,
		desiredTranslationDelta: Vec3,
		filterFlags?: unknown,
		filterGroups?: unknown,
		filterPredicate?: (collider: RapierCollider) => boolean,
	): void;
	computedMovement(): RapierVector;
	computedGrounded?(): boolean;
	numComputedCollisions?(): number;
};

type RapierEventQueue = {
	drainCollisionEvents(
		callback: (
			colliderA: ColliderHandle,
			colliderB: ColliderHandle,
			started: boolean,
		) => void,
	): void;
};

type RapierModule = {
	init?: (parameters?: unknown) => Promise<void> | void;
	World: new (gravity: Vec3) => RapierWorld;
	EventQueue?: new (autoDrain: boolean) => RapierEventQueue;
	Ray?: new (origin: Vec3, direction: Vec3) => RapierRay;
	ActiveEvents?: {
		readonly COLLISION_EVENTS?: number;
	};
	RigidBodyDesc: {
		dynamic(): RapierRigidBodyDesc;
		fixed(): RapierRigidBodyDesc;
		kinematicPositionBased?(): RapierRigidBodyDesc;
		kinematicVelocityBased?(): RapierRigidBodyDesc;
	};
	ColliderDesc: {
		cuboid(x: number, y: number, z: number): RapierColliderDesc;
		ball(radius: number): RapierColliderDesc;
		capsule(halfHeight: number, radius: number): RapierColliderDesc;
		cylinder?(halfHeight: number, radius: number): RapierColliderDesc;
		trimesh?(vertices: Float32Array, indices: Uint32Array): RapierColliderDesc;
	};
};

export type RapierPhysicsAdapterOptions = {
	readonly gravity?: Vec3;
	readonly rapierModule?: RapierModule;
};

const RAPIER_COMPAT_PACKAGE = "@dimforge/rapier3d-compat/rapier.es.js";

export async function createRapierPhysicsAdapter(
	options: RapierPhysicsAdapterOptions = {},
): Promise<RapierPhysicsAdapter> {
	const rapierModule =
		options.rapierModule ?? (await loadDefaultRapierModule());

	await rapierModule.init?.({});

	return new RapierPhysicsAdapter(rapierModule, options);
}

async function loadDefaultRapierModule(): Promise<RapierModule> {
	try {
		const loaded = (await import(
			"@dimforge/rapier3d-compat/rapier.es.js"
		)) as unknown;
		return normalizeRapierModule(loaded);
	} catch (error) {
		throw new Error(
			`Unable to load ${RAPIER_COMPAT_PACKAGE}. Install it in apps/game.megameal before constructing the default Rapier adapter, or pass rapierModule to createRapierPhysicsAdapter when dependency injection is required.`,
			{ cause: error },
		);
	}
}

function normalizeRapierModule(loaded: unknown): RapierModule {
	const moduleRecord = asRecord(loaded);
	const candidates = [loaded, moduleRecord?.default];

	for (const candidate of candidates) {
		if (isRapierModule(candidate)) {
			return candidate;
		}
	}

	throw new Error(
		`Loaded ${RAPIER_COMPAT_PACKAGE} did not expose a compatible Rapier module.`,
	);
}

function isRapierModule(value: unknown): value is RapierModule {
	const record = asRecord(value);

	return (
		record !== undefined &&
		typeof record.World === "function" &&
		asRecord(record.RigidBodyDesc) !== undefined &&
		typeof asRecord(record.RigidBodyDesc)?.dynamic === "function" &&
		typeof asRecord(record.RigidBodyDesc)?.fixed === "function" &&
		asRecord(record.ColliderDesc) !== undefined &&
		typeof asRecord(record.ColliderDesc)?.cuboid === "function" &&
		typeof asRecord(record.ColliderDesc)?.ball === "function" &&
		typeof asRecord(record.ColliderDesc)?.capsule === "function"
	);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	if (
		(typeof value !== "object" && typeof value !== "function") ||
		value === null
	) {
		return undefined;
	}

	return value as Record<string, unknown>;
}

function rayHitTimeOfImpact(hit: RapierRayHit): number | undefined {
	const timeOfImpact = hit.timeOfImpact ?? hit.toi;

	if (typeof timeOfImpact !== "number" || !Number.isFinite(timeOfImpact)) {
		return undefined;
	}

	return timeOfImpact;
}

function rayHitNormal(hit: RapierRayHit): RapierVector {
	const normal =
		typeof hit.normal === "function" ? hit.normal() : hit.normal ?? vec3();

	return normal;
}

export class RapierPhysicsAdapter implements PhysicsAdapterPort {
	readonly kind = "rapier";

	#world: RapierWorld;
	#eventQueue?: RapierEventQueue;
	#bodies = new Map<PhysicsBodyHandle, RapierRigidBody>();
	#colliders = new Map<ColliderHandle, RapierCollider>();
	#characterControllers = new Map<
		ColliderHandle,
		RapierKinematicCharacterController
	>();
	#bodyEntities = new Map<PhysicsBodyHandle, Entity>();
	#bodyTypes = new Map<PhysicsBodyHandle, RigidBodyComponent["type"]>();
	#colliderEntities = new Map<ColliderHandle, Entity>();
	#colliderBodies = new Map<ColliderHandle, PhysicsBodyHandle>();
	#colliderPolicies = new Map<
		ColliderHandle,
		{
			readonly intent: ColliderComponent["intent"];
			readonly channel: ColliderComponent["channel"];
			readonly sensor?: boolean;
		}
	>();
	#collisionEvents: PhysicsCollisionEvent[] = [];

	constructor(
		private readonly rapier: RapierModule,
		options: RapierPhysicsAdapterOptions = {},
	) {
		this.#world = new rapier.World(options.gravity ?? vec3(0, -9.81, 0));

		if (rapier.EventQueue) {
			this.#eventQueue = new rapier.EventQueue(true);
		}
	}

	createRigidBody(
		entity: Entity,
		body: RigidBodyComponent,
		transform: PhysicsTransform,
	): PhysicsBodyHandle {
		const desc = this.createBodyDesc(body);
		desc.setTranslation?.(
			transform.position.x,
			transform.position.y,
			transform.position.z,
		);
		desc.setRotation?.(transform.rotation);

		if (body.type === "dynamic" && body.mass > 0) {
			desc.setAdditionalMass?.(body.mass);
		}

		const rawBody = this.#world.createRigidBody(desc);
		this.#bodies.set(rawBody.handle, rawBody);
		this.#bodyEntities.set(rawBody.handle, entity);
		this.#bodyTypes.set(rawBody.handle, body.type);
		return rawBody.handle;
	}

	createCollider(
		entity: Entity,
		bodyHandle: PhysicsBodyHandle,
		collider: ColliderComponent,
	): ColliderHandle {
		const body = this.requireBody(bodyHandle);
		const desc = this.createColliderDesc(collider);

		if (collider.offset !== undefined) {
			desc.setTranslation?.(
				collider.offset.x,
				collider.offset.y,
				collider.offset.z,
			);
		}

		if (collider.sensor !== undefined) {
			desc.setSensor?.(collider.sensor);
		}

		const collisionEvents = this.rapier.ActiveEvents?.COLLISION_EVENTS;

		if (collisionEvents !== undefined) {
			desc.setActiveEvents?.(collisionEvents);
		}

		const rawCollider = this.#world.createCollider(desc, body);
		this.#colliders.set(rawCollider.handle, rawCollider);
		this.#colliderEntities.set(rawCollider.handle, entity);
		this.#colliderBodies.set(rawCollider.handle, bodyHandle);
		this.#colliderPolicies.set(rawCollider.handle, {
			intent: collider.intent,
			channel: collider.channel,
			...(collider.sensor !== undefined ? { sensor: collider.sensor } : {}),
		});
		return rawCollider.handle;
	}

	destroyCollider(handle: ColliderHandle): void {
		const collider = this.#colliders.get(handle);

		if (!collider) {
			return;
		}

		this.destroyCharacterController(handle);
		this.#world.removeCollider(collider, true);
		this.#colliders.delete(handle);
		this.#colliderEntities.delete(handle);
		this.#colliderBodies.delete(handle);
		this.#colliderPolicies.delete(handle);
	}

	destroyRigidBody(handle: PhysicsBodyHandle): void {
		const body = this.#bodies.get(handle);

		if (!body) {
			return;
		}

		for (const [colliderHandle, bodyHandle] of this.#colliderBodies) {
			if (bodyHandle === handle) {
				this.destroyCharacterController(colliderHandle);
				this.#colliderEntities.delete(colliderHandle);
				this.#colliders.delete(colliderHandle);
				this.#colliderBodies.delete(colliderHandle);
				this.#colliderPolicies.delete(colliderHandle);
			}
		}

		this.#world.removeRigidBody(body);
		this.#bodies.delete(handle);
		this.#bodyEntities.delete(handle);
		this.#bodyTypes.delete(handle);
	}

	syncBodyFromTransform(
		handle: PhysicsBodyHandle,
		transform: PhysicsTransform,
	): void {
		const body = this.requireBody(handle);
		if (this.#bodyTypes.get(handle) === "kinematic") {
			if (body.setNextKinematicTranslation) {
				body.setNextKinematicTranslation(transform.position);
			} else {
				body.setTranslation(transform.position, true);
			}

			if (body.setNextKinematicRotation) {
				body.setNextKinematicRotation(transform.rotation);
			} else {
				body.setRotation(transform.rotation, true);
			}
			return;
		}

		body.setTranslation(transform.position, true);
		body.setRotation(transform.rotation, true);
	}

	syncTransformFromBody(handle: PhysicsBodyHandle): PhysicsTransform {
		const body = this.requireBody(handle);
		const position = body.translation();
		const rotation = body.rotation();

		return {
			position: vec3(position.x, position.y, position.z),
			rotation: quat(rotation.x, rotation.y, rotation.z, rotation.w),
		};
	}

	applyImpulse(handle: PhysicsBodyHandle, impulse: Vec3): void {
		const body = this.requireBody(handle);

		if (!body.applyImpulse) {
			throw new Error("The loaded Rapier body does not support applyImpulse.");
		}

		body.applyImpulse(impulse, true);
	}

	step(deltaSeconds: number): void {
		if (deltaSeconds <= 0) {
			return;
		}

		this.#world.timestep = deltaSeconds;
		this.#world.step(this.#eventQueue);
		this.drainRapierCollisionEvents();
	}

	drainEvents(): readonly PhysicsCollisionEvent[] {
		const events = this.#collisionEvents;
		this.#collisionEvents = [];
		return events;
	}

	computeKinematicCharacterMovement(
		query: KinematicCharacterMovementQuery,
	): KinematicCharacterMovementResult | undefined {
		const collider = this.#colliders.get(query.colliderHandle);

		if (!collider || !this.#world.createCharacterController) {
			return undefined;
		}

		const controller = this.ensureCharacterController(
			query.colliderHandle,
			query.settings,
		);
		const excludedEntities = new Set(query.excludeEntities ?? []);
		excludedEntities.add(query.entity);

		controller.computeColliderMovement(
			collider,
			query.desiredTranslation,
			undefined,
			undefined,
			(obstacle) =>
				this.shouldIncludeCharacterObstacle(
					obstacle,
					excludedEntities,
					query.settings.obstacleChannels,
				),
		);

		const movement = controller.computedMovement();

		return {
			translation: vec3(movement.x, movement.y, movement.z),
			grounded: controller.computedGrounded?.() ?? false,
			collisionCount: controller.numComputedCollisions?.() ?? 0,
		};
	}

	castRay(query: PhysicsRaycastQuery): PhysicsRaycastHit | undefined {
		if (!this.#world.castRay) {
			return undefined;
		}

		const ray = this.rapier.Ray
			? new this.rapier.Ray(query.origin, query.direction)
			: { origin: query.origin, dir: query.direction };
		const excludedEntities = new Set(query.excludeEntities ?? []);
		const filterPredicate =
			excludedEntities.size > 0
				? (collider: RapierCollider) => {
						const entity = this.#colliderEntities.get(collider.handle);
						return entity === undefined || !excludedEntities.has(entity);
					}
				: undefined;
		const hit =
			this.#world.castRayAndGetNormal?.(
				ray,
				query.maxDistance,
				true,
				undefined,
				undefined,
				undefined,
				undefined,
				filterPredicate,
			) ??
			this.#world.castRay(
				ray,
				query.maxDistance,
				true,
				undefined,
				undefined,
				undefined,
				undefined,
				filterPredicate,
			);

		if (!hit) {
			return undefined;
		}

		const colliderHandle = hit.collider?.handle ?? hit.colliderHandle;

		if (colliderHandle === undefined) {
			return undefined;
		}

		const entity = this.#colliderEntities.get(colliderHandle);

		if (entity === undefined) {
			return undefined;
		}

		const timeOfImpact = rayHitTimeOfImpact(hit);

		if (timeOfImpact === undefined) {
			return undefined;
		}

		const normal = rayHitNormal(hit);

		return {
			entity,
			point: vec3(
				query.origin.x + query.direction.x * timeOfImpact,
				query.origin.y + query.direction.y * timeOfImpact,
				query.origin.z + query.direction.z * timeOfImpact,
			),
			normal: vec3(normal.x, normal.y, normal.z),
			distance: timeOfImpact,
		};
	}

	bodyCount(): number {
		return this.#bodies.size;
	}

	colliderCount(): number {
		return this.#colliders.size;
	}

	dispose(): void {
		for (const handle of [...this.#colliders.keys()]) {
			this.destroyCollider(handle);
		}

		for (const handle of [...this.#bodies.keys()]) {
			this.destroyRigidBody(handle);
		}

		this.#collisionEvents = [];
	}

	private createBodyDesc(body: RigidBodyComponent): RapierRigidBodyDesc {
		if (body.type === "dynamic") {
			return this.rapier.RigidBodyDesc.dynamic();
		}

		if (body.type === "fixed") {
			return this.rapier.RigidBodyDesc.fixed();
		}

		const kinematicDesc =
			this.rapier.RigidBodyDesc.kinematicPositionBased ??
			this.rapier.RigidBodyDesc.kinematicVelocityBased;

		if (!kinematicDesc) {
			throw new Error(
				"The loaded Rapier module does not support kinematic bodies.",
			);
		}

		return kinematicDesc();
	}

	private createColliderDesc(collider: ColliderComponent): RapierColliderDesc {
		const { shape } = collider;

		if (shape.type === "box") {
			return this.rapier.ColliderDesc.cuboid(
				shape.halfExtents.x,
				shape.halfExtents.y,
				shape.halfExtents.z,
			);
		}

		if (shape.type === "sphere") {
			return this.rapier.ColliderDesc.ball(shape.radius);
		}

		if (shape.type === "capsule") {
			return this.rapier.ColliderDesc.capsule(shape.halfHeight, shape.radius);
		}

		if (shape.type === "cylinder") {
			if (!this.rapier.ColliderDesc.cylinder) {
				throw new Error(
					"The loaded Rapier module does not support cylinder colliders.",
				);
			}

			return this.rapier.ColliderDesc.cylinder(shape.halfHeight, shape.radius);
		}

		if (!this.rapier.ColliderDesc.trimesh) {
			throw new Error(
				"The loaded Rapier module does not support mesh colliders.",
			);
		}

		return this.rapier.ColliderDesc.trimesh(
			new Float32Array(
				shape.vertices.flatMap((vertex) => [vertex.x, vertex.y, vertex.z]),
			),
			new Uint32Array(shape.indices),
		);
	}

	private ensureCharacterController(
		colliderHandle: ColliderHandle,
		settings: KinematicCharacterMovementQuery["settings"],
	): RapierKinematicCharacterController {
		let controller = this.#characterControllers.get(colliderHandle);

		if (!controller) {
			if (!this.#world.createCharacterController) {
				throw new Error(
					"The loaded Rapier module does not support character controllers.",
				);
			}

			controller = this.#world.createCharacterController(
				settings.offset ?? 0.04,
			);
			this.#characterControllers.set(colliderHandle, controller);
		}

		applyCharacterControllerSettings(controller, settings);
		return controller;
	}

	private destroyCharacterController(colliderHandle: ColliderHandle): void {
		const controller = this.#characterControllers.get(colliderHandle);

		if (!controller) {
			return;
		}

		if (this.#world.removeCharacterController) {
			this.#world.removeCharacterController(controller);
		} else {
			controller.free?.();
		}

		this.#characterControllers.delete(colliderHandle);
	}

	private shouldIncludeCharacterObstacle(
		collider: RapierCollider,
		excludedEntities: ReadonlySet<Entity>,
		obstacleChannels: readonly string[] | undefined,
	): boolean {
		const entity = this.#colliderEntities.get(collider.handle);

		if (entity !== undefined && excludedEntities.has(entity)) {
			return false;
		}

		const policy = this.#colliderPolicies.get(collider.handle);

		if (
			policy === undefined ||
			policy.intent === "trigger" ||
			policy.sensor === true
		) {
			return false;
		}

		if (obstacleChannels !== undefined) {
			return obstacleChannels.includes(policy.channel);
		}

		return true;
	}

	private requireBody(handle: PhysicsBodyHandle): RapierRigidBody {
		const body = this.#bodies.get(handle);

		if (!body) {
			throw new Error(`Unknown Rapier rigid body handle ${handle}.`);
		}

		return body;
	}

	private drainRapierCollisionEvents(): void {
		this.#eventQueue?.drainCollisionEvents((colliderA, colliderB, started) => {
			const entityA = this.#colliderEntities.get(colliderA);
			const entityB = this.#colliderEntities.get(colliderB);

			if (entityA === undefined || entityB === undefined) {
				return;
			}

			this.#collisionEvents.push({
				type: started ? "PhysicsCollisionStarted" : "PhysicsCollisionStopped",
				entityA,
				entityB,
				colliderA,
				colliderB,
			});
		});
	}
}

function applyCharacterControllerSettings(
	controller: RapierKinematicCharacterController,
	settings: KinematicCharacterCollisionSettings,
): void {
	controller.setOffset?.(settings.offset ?? 0.04);
	controller.setUp?.(settings.up ?? vec3(0, 1, 0));
	controller.setSlideEnabled?.(settings.slide ?? true);

	if (settings.autostep) {
		controller.enableAutostep?.(
			settings.autostep.maxHeight,
			settings.autostep.minWidth,
			settings.autostep.includeDynamicBodies ?? false,
		);
	} else {
		controller.disableAutostep?.();
	}

	if (settings.snapToGroundDistance !== undefined) {
		controller.enableSnapToGround?.(settings.snapToGroundDistance);
	} else {
		controller.disableSnapToGround?.();
	}

	if (settings.maxSlopeClimbAngle !== undefined) {
		controller.setMaxSlopeClimbAngle?.(settings.maxSlopeClimbAngle);
	}

	if (settings.minSlopeSlideAngle !== undefined) {
		controller.setMinSlopeSlideAngle?.(settings.minSlopeSlideAngle);
	}
}
