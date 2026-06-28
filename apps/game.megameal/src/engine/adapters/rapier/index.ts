import type { Entity } from "../../core/index.js";
import { type Quat, type Vec3, quat, vec3 } from "../../math/index.js";
import type {
	ColliderComponent,
	ColliderHandle,
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
};

type RapierRigidBody = {
	readonly handle: PhysicsBodyHandle;
	translation(): RapierVector;
	rotation(): RapierRotation;
	setTranslation(translation: Vec3, wakeUp: boolean): void;
	setRotation(rotation: Quat, wakeUp: boolean): void;
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
	readonly toi: number;
	normal?(): RapierVector;
};

type RapierWorld = {
	timestep?: number;
	createRigidBody(desc: RapierRigidBodyDesc): RapierRigidBody;
	removeRigidBody(body: RapierRigidBody): void;
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
	): RapierRayHit | undefined;
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

export class RapierPhysicsAdapter implements PhysicsAdapterPort {
	readonly kind = "rapier";

	#world: RapierWorld;
	#eventQueue?: RapierEventQueue;
	#bodies = new Map<PhysicsBodyHandle, RapierRigidBody>();
	#colliders = new Map<ColliderHandle, RapierCollider>();
	#bodyEntities = new Map<PhysicsBodyHandle, Entity>();
	#colliderEntities = new Map<ColliderHandle, Entity>();
	#colliderBodies = new Map<ColliderHandle, PhysicsBodyHandle>();
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
		return rawBody.handle;
	}

	createCollider(
		entity: Entity,
		bodyHandle: PhysicsBodyHandle,
		collider: ColliderComponent,
	): ColliderHandle {
		const body = this.requireBody(bodyHandle);
		const desc = this.createColliderDesc(collider);

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
		return rawCollider.handle;
	}

	destroyCollider(handle: ColliderHandle): void {
		const collider = this.#colliders.get(handle);

		if (!collider) {
			return;
		}

		this.#world.removeCollider(collider, true);
		this.#colliders.delete(handle);
		this.#colliderEntities.delete(handle);
		this.#colliderBodies.delete(handle);
	}

	destroyRigidBody(handle: PhysicsBodyHandle): void {
		const body = this.#bodies.get(handle);

		if (!body) {
			return;
		}

		for (const [colliderHandle, bodyHandle] of this.#colliderBodies) {
			if (bodyHandle === handle) {
				this.#colliderEntities.delete(colliderHandle);
				this.#colliders.delete(colliderHandle);
				this.#colliderBodies.delete(colliderHandle);
			}
		}

		this.#world.removeRigidBody(body);
		this.#bodies.delete(handle);
		this.#bodyEntities.delete(handle);
	}

	syncBodyFromTransform(
		handle: PhysicsBodyHandle,
		transform: PhysicsTransform,
	): void {
		const body = this.requireBody(handle);
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

	castRay(query: PhysicsRaycastQuery): PhysicsRaycastHit | undefined {
		if (!this.#world.castRay) {
			return undefined;
		}

		const ray = this.rapier.Ray
			? new this.rapier.Ray(query.origin, query.direction)
			: { origin: query.origin, dir: query.direction };
		const hit = this.#world.castRay(ray, query.maxDistance, true);

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

		const normal = hit.normal?.() ?? vec3();

		return {
			entity,
			point: vec3(
				query.origin.x + query.direction.x * hit.toi,
				query.origin.y + query.direction.y * hit.toi,
				query.origin.z + query.direction.z * hit.toi,
			),
			normal: vec3(normal.x, normal.y, normal.z),
			distance: hit.toi,
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
