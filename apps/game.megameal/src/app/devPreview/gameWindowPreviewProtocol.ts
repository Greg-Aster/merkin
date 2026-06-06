import {
	COLLIDER_COMPONENT,
	type ColliderComponent,
	type CollisionCookPreviewPatch,
	type CollisionCookTransformData,
	type EngineRuntime,
	type Entity,
	type LevelEditorCollisionPreviewClearRequest,
	type LevelEditorDevPreviewMessage,
	type LevelEditorRuntimeReloadRequest,
	PHYSICS_TRANSFORM_COMPONENT,
	type PhysicsTransformComponent,
	parseCollisionCookPreviewPatch,
	parseLevelEditorDevPreviewMessage,
	quat,
	vec3,
} from "../../engine/index.js";
import { STABLE_ID_COMPONENT } from "../../game/prefabs/index.js";
import {
	type LevelEditorPreviewChannelPort,
	createBrowserLevelEditorPreviewChannel,
} from "./levelEditorPreviewChannel.js";

export type GameWindowPreviewPort = {
	applyPreview(patch: CollisionCookPreviewPatch): void;
	clearPreview?(request: LevelEditorCollisionPreviewClearRequest): void;
	reload(request: LevelEditorRuntimeReloadRequest): void;
};

export type GameWindowPreviewHandleResult =
	| {
			readonly ok: true;
			readonly requestId: string;
			readonly messageType: LevelEditorDevPreviewMessage["type"];
	  }
	| {
			readonly ok: false;
			readonly reason: "invalid-message";
			readonly errors: readonly string[];
	  };

export type GameWindowPreviewConnection = {
	readonly connected: boolean;
	dispose(): void;
};

export type CollisionPreviewApplyResult =
	| {
			readonly ok: true;
			readonly runtimeSceneId: string;
			readonly appliedStableIds: readonly string[];
	  }
	| {
			readonly ok: false;
			readonly runtimeSceneId: string;
			readonly appliedStableIds: readonly string[];
			readonly missingStableIds: readonly string[];
	  };

export type CollisionPreviewClearResult = {
	readonly ok: true;
	readonly runtimeSceneId: string;
	readonly clearedStableIds: readonly string[];
};

export type GameWindowPreviewConnectionOptions = GameWindowPreviewPort & {
	readonly channel?: LevelEditorPreviewChannelPort;
	readonly onRejected?: (
		result: Extract<GameWindowPreviewHandleResult, { ok: false }>,
	) => void;
};

export function handleGameWindowDevPreviewMessage(
	messageData: unknown,
	port: GameWindowPreviewPort,
): GameWindowPreviewHandleResult {
	const parsed = parsePreviewMessageResult(messageData);

	if (!parsed.ok) {
		return parsed;
	}

	switch (parsed.message.type) {
		case "collision-preview-patch":
			port.applyPreview(parsed.message.payload);
			return {
				ok: true,
				requestId: parsed.message.requestId,
				messageType: parsed.message.type,
			};
		case "clear-collision-preview":
			port.clearPreview?.(parsed.message.request);
			return {
				ok: true,
				requestId: parsed.message.requestId,
				messageType: parsed.message.type,
			};
		case "reload-runtime-scene":
			port.reload(parsed.message.request);
			return {
				ok: true,
				requestId: parsed.message.requestId,
				messageType: parsed.message.type,
			};
	}
}

export function applyCollisionPreviewPatchToRuntime(
	runtime: EngineRuntime,
	patch: CollisionCookPreviewPatch,
): CollisionPreviewApplyResult {
	const validatedPatch = parseCollisionCookPreviewPatch(patch);
	const entitiesByStableId = stableIdEntityMap(runtime);
	const appliedStableIds: string[] = [];
	const missingStableIds: string[] = [];

	for (const entry of validatedPatch.entries) {
		const entity = entitiesByStableId.get(entry.stableId);

		if (entity === undefined) {
			missingStableIds.push(entry.stableId);
			continue;
		}

		captureCollisionPreviewSnapshot(
			runtime,
			validatedPatch,
			entity,
			entry.stableId,
		);

		runtime.world.addComponent<ColliderComponent>(
			entity,
			COLLIDER_COMPONENT,
			toRuntimeColliderComponent(entry.colliderComponent),
		);

		if (entry.transform !== undefined) {
			const currentTransform =
				runtime.world.getComponent<PhysicsTransformComponent>(
					entity,
					PHYSICS_TRANSFORM_COMPONENT,
				) ?? toRuntimeTransformComponent({});

			runtime.world.addComponent<PhysicsTransformComponent>(
				entity,
				PHYSICS_TRANSFORM_COMPONENT,
				toRuntimeTransformComponent(entry.transform, currentTransform),
			);
		}

		appliedStableIds.push(entry.stableId);
	}

	if (missingStableIds.length > 0) {
		return {
			ok: false,
			runtimeSceneId: validatedPatch.runtimeSceneId,
			appliedStableIds,
			missingStableIds,
		};
	}

	return {
		ok: true,
		runtimeSceneId: validatedPatch.runtimeSceneId,
		appliedStableIds,
	};
}

export function clearCollisionPreviewPatchFromRuntime(
	runtime: EngineRuntime,
	request: LevelEditorCollisionPreviewClearRequest,
): CollisionPreviewClearResult {
	const snapshots = runtimePreviewSnapshots.get(runtime);
	const requestedStableIds =
		request.stableIds === undefined ? undefined : new Set(request.stableIds);
	const clearedStableIds: string[] = [];

	if (!snapshots) {
		return {
			ok: true,
			runtimeSceneId: request.runtimeSceneId,
			clearedStableIds,
		};
	}

	for (const [stableId, snapshot] of [...snapshots.entries()]) {
		if (snapshot.runtimeSceneId !== request.runtimeSceneId) {
			continue;
		}

		if (
			request.sourcePlanHash !== undefined &&
			!snapshot.sourcePlanHashes.has(request.sourcePlanHash)
		) {
			continue;
		}

		if (requestedStableIds !== undefined && !requestedStableIds.has(stableId)) {
			continue;
		}

		if (snapshot.hadCollider && snapshot.collider !== undefined) {
			runtime.world.addComponent(
				snapshot.entity,
				COLLIDER_COMPONENT,
				cloneColliderComponent(snapshot.collider),
			);
		} else {
			runtime.world.removeComponent(snapshot.entity, COLLIDER_COMPONENT);
		}

		if (snapshot.hadTransform && snapshot.transform !== undefined) {
			runtime.world.addComponent(
				snapshot.entity,
				PHYSICS_TRANSFORM_COMPONENT,
				cloneTransformComponent(snapshot.transform),
			);
		} else {
			runtime.world.removeComponent(
				snapshot.entity,
				PHYSICS_TRANSFORM_COMPONENT,
			);
		}

		snapshots.delete(stableId);
		clearedStableIds.push(stableId);
	}

	if (snapshots.size === 0) {
		runtimePreviewSnapshots.delete(runtime);
	}

	return {
		ok: true,
		runtimeSceneId: request.runtimeSceneId,
		clearedStableIds,
	};
}

export function connectGameWindowDevPreviewChannel(
	options: GameWindowPreviewConnectionOptions,
): GameWindowPreviewConnection {
	const channel = options.channel ?? createBrowserLevelEditorPreviewChannel();

	if (!channel) {
		return {
			connected: false,
			dispose() {},
		};
	}

	const unsubscribe = channel.subscribe((messageData) => {
		const result = handleGameWindowDevPreviewMessage(messageData, options);

		if (!result.ok) {
			options.onRejected?.(result);
		}
	});

	return {
		connected: true,
		dispose() {
			unsubscribe();
			channel.close();
		},
	};
}

function parsePreviewMessageResult(messageData: unknown):
	| {
			readonly ok: true;
			readonly message: LevelEditorDevPreviewMessage;
	  }
	| Extract<GameWindowPreviewHandleResult, { ok: false }> {
	try {
		return {
			ok: true,
			message: parseLevelEditorDevPreviewMessage(messageData),
		};
	} catch (error) {
		return {
			ok: false,
			reason: "invalid-message",
			errors: extractSchemaErrors(error),
		};
	}
}

function extractSchemaErrors(error: unknown): readonly string[] {
	if (error instanceof Error && "errors" in error) {
		const errors = (error as Error & { readonly errors?: readonly string[] })
			.errors;

		if (Array.isArray(errors)) {
			return errors;
		}
	}

	return [error instanceof Error ? error.message : "Invalid preview message."];
}

type CollisionPreviewSnapshot = {
	readonly runtimeSceneId: string;
	readonly sourcePlanHashes: Set<string>;
	readonly entity: Entity;
	readonly hadCollider: boolean;
	readonly collider?: ColliderComponent;
	readonly hadTransform: boolean;
	readonly transform?: PhysicsTransformComponent;
};

const runtimePreviewSnapshots = new WeakMap<
	EngineRuntime,
	Map<string, CollisionPreviewSnapshot>
>();

function captureCollisionPreviewSnapshot(
	runtime: EngineRuntime,
	patch: CollisionCookPreviewPatch,
	entity: Entity,
	stableId: string,
): void {
	let snapshots = runtimePreviewSnapshots.get(runtime);

	if (!snapshots) {
		snapshots = new Map();
		runtimePreviewSnapshots.set(runtime, snapshots);
	}

	const existing = snapshots.get(stableId);

	if (existing) {
		existing.sourcePlanHashes.add(patch.sourcePlanHash);
		return;
	}

	const collider = runtime.world.getComponent<ColliderComponent>(
		entity,
		COLLIDER_COMPONENT,
	);
	const transform = runtime.world.getComponent<PhysicsTransformComponent>(
		entity,
		PHYSICS_TRANSFORM_COMPONENT,
	);

	snapshots.set(stableId, {
		runtimeSceneId: patch.runtimeSceneId,
		sourcePlanHashes: new Set([patch.sourcePlanHash]),
		entity,
		hadCollider: collider !== undefined,
		...(collider === undefined
			? {}
			: { collider: cloneColliderComponent(collider) }),
		hadTransform: transform !== undefined,
		...(transform === undefined
			? {}
			: { transform: cloneTransformComponent(transform) }),
	});
}

function stableIdEntityMap(
	runtime: EngineRuntime,
): ReadonlyMap<string, Entity> {
	const entities = new Map<string, Entity>();

	for (const entity of runtime.world.query([STABLE_ID_COMPONENT])) {
		const stableId = runtime.world.getComponent<{ readonly id?: unknown }>(
			entity,
			STABLE_ID_COMPONENT,
		);

		if (typeof stableId?.id === "string") {
			entities.set(stableId.id, entity);
		}
	}

	return entities;
}

function toRuntimeColliderComponent(
	collider: CollisionCookPreviewPatch["entries"][number]["colliderComponent"],
): ColliderComponent {
	const base = {
		intent: collider.intent,
		channel: collider.channel,
		...(collider.sensor === undefined ? {} : { sensor: collider.sensor }),
	};
	const shape = collider.shape;

	switch (shape.type) {
		case "box":
			return {
				...base,
				shape: {
					type: "box",
					halfExtents: tupleToVec3(shape.halfExtents),
				},
			};
		case "sphere":
			return {
				...base,
				shape: {
					type: "sphere",
					radius: shape.radius,
				},
			};
		case "capsule":
			return {
				...base,
				shape: {
					type: "capsule",
					halfHeight: shape.halfHeight,
					radius: shape.radius,
				},
			};
		case "cylinder":
			return {
				...base,
				shape: {
					type: "cylinder",
					halfHeight: shape.halfHeight,
					radius: shape.radius,
				},
			};
		case "mesh":
			return {
				...base,
				shape: {
					type: "mesh",
					vertices: shape.vertices.map(tupleToVec3),
					indices: [...shape.indices],
				},
			};
	}
}

function toRuntimeTransformComponent(
	transform: CollisionCookTransformData,
	base: PhysicsTransformComponent = {
		position: vec3(),
		rotation: quat(),
		scale: vec3(1, 1, 1),
	},
): PhysicsTransformComponent {
	return {
		position: transform.position
			? tupleToVec3(transform.position)
			: cloneRuntimeVec3(base.position),
		rotation: transform.rotation
			? quat(
					transform.rotation[0],
					transform.rotation[1],
					transform.rotation[2],
					transform.rotation[3],
				)
			: cloneRuntimeQuat(base.rotation),
		scale: transform.scale
			? tupleToVec3(transform.scale)
			: base.scale
				? cloneRuntimeVec3(base.scale)
				: vec3(1, 1, 1),
	};
}

function tupleToVec3(value: readonly [number, number, number]) {
	return vec3(value[0], value[1], value[2]);
}

function cloneRuntimeVec3(value: PhysicsTransformComponent["position"]) {
	return vec3(value.x, value.y, value.z);
}

function cloneRuntimeQuat(value: PhysicsTransformComponent["rotation"]) {
	return quat(value.x, value.y, value.z, value.w);
}

function cloneTransformComponent(
	transform: PhysicsTransformComponent,
): PhysicsTransformComponent {
	return {
		position: cloneRuntimeVec3(transform.position),
		rotation: cloneRuntimeQuat(transform.rotation),
		...(transform.scale === undefined
			? {}
			: { scale: cloneRuntimeVec3(transform.scale) }),
	};
}

function cloneColliderComponent(
	collider: ColliderComponent,
): ColliderComponent {
	return {
		intent: collider.intent,
		channel: collider.channel,
		...(collider.offset === undefined
			? {}
			: { offset: cloneRuntimeVec3(collider.offset) }),
		...(collider.colliderHandle === undefined
			? {}
			: { colliderHandle: collider.colliderHandle }),
		...(collider.sensor === undefined ? {} : { sensor: collider.sensor }),
		shape: cloneColliderShape(collider.shape),
	};
}

function cloneColliderShape(
	shape: ColliderComponent["shape"],
): ColliderComponent["shape"] {
	switch (shape.type) {
		case "box":
			return {
				type: "box",
				halfExtents: cloneRuntimeVec3(shape.halfExtents),
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
				vertices: shape.vertices.map(cloneRuntimeVec3),
				indices: [...shape.indices],
			};
	}
}
