import {
	ACTIVE_CAMERA_POSE_RESOURCE,
	CAMERA_TARGET_COMPONENT,
	COLLIDER_COMPONENT,
	type CameraPose,
	type CameraTargetComponent,
	type ColliderComponent,
	type CollisionCookPreviewPatch,
	type CollisionCookTransformData,
	type EngineRuntime,
	type Entity,
	LIGHT_COMPONENT,
	type LevelEditorCameraLiveEditModeRequest,
	type LevelEditorCollisionPreviewClearRequest,
	type LevelEditorCoreObjectPreviewClearRequest,
	type LevelEditorCoreObjectPreviewPatch,
	type LevelEditorCoreObjectPreviewPatchEntry,
	type LevelEditorDevPreviewMessage,
	type LevelEditorObjectEditPreviewClearRequest,
	type LevelEditorObjectEditPreviewOperation,
	type LevelEditorObjectEditPreviewPatch,
	type LevelEditorObjectEditPreviewPatchEntry,
	type LevelEditorRenderedSceneBoxSelectRequest,
	type LevelEditorRenderedSceneBoxSelectResultPayload,
	type LevelEditorRenderedSceneHitTestRequest,
	type LevelEditorRenderedSceneHitTestResultPayload,
	type LevelEditorRuntimeReloadAckPayload,
	type LevelEditorRuntimeReloadRequest,
	type LevelEditorRuntimeTelemetryPayload,
	type LightComponent,
	PHYSICS_TRANSFORM_COMPONENT,
	type PhysicsTransformComponent,
	SOUND_EMITTER_COMPONENT,
	type SoundEmitterComponent,
	parseCollisionCookPreviewPatch,
	parseLevelEditorCoreObjectPreviewPatch,
	parseLevelEditorDevPreviewMessage,
	parseLevelEditorObjectEditPreviewPatch,
	quat,
	vec3,
} from "../../engine/index.js";
import {
	PREFAB_COMPONENT,
	STABLE_ID_COMPONENT,
	normalizeRuntimeComponentMap,
} from "../../game/prefabs/index.js";
import {
	PLAYER_ENTITY_RESOURCE,
	PORTAL_COMPONENT,
	type PortalComponent,
} from "../../game/systems/index.js";
import {
	type LevelEditorPreviewChannelPort,
	createBrowserLevelEditorPreviewChannel,
} from "./levelEditorPreviewChannel.js";

export type GameWindowPreviewPort = {
	applyPreview(patch: CollisionCookPreviewPatch): void;
	clearPreview?(request: LevelEditorCollisionPreviewClearRequest): void;
	applyCoreObjectPreview?(patch: LevelEditorCoreObjectPreviewPatch): void;
	clearCoreObjectPreview?(
		request: LevelEditorCoreObjectPreviewClearRequest,
	): void;
	applyObjectEditPreview?(patch: LevelEditorObjectEditPreviewPatch): void;
	clearObjectEditPreview?(
		request: LevelEditorObjectEditPreviewClearRequest,
	): void;
	applyCameraLiveEditMode?(request: LevelEditorCameraLiveEditModeRequest): void;
	requestRenderedSceneHitTest?(
		request: LevelEditorRenderedSceneHitTestRequest,
		requestId: string,
	): void;
	receiveRenderedSceneHitTestResult?(
		payload: LevelEditorRenderedSceneHitTestResultPayload,
		requestId: string,
	): void;
	requestRenderedSceneBoxSelect?(
		request: LevelEditorRenderedSceneBoxSelectRequest,
		requestId: string,
	): void;
	receiveRenderedSceneBoxSelectResult?(
		payload: LevelEditorRenderedSceneBoxSelectResultPayload,
		requestId: string,
	): void;
	receiveRuntimeTelemetry?(payload: LevelEditorRuntimeTelemetryPayload): void;
	receiveRuntimeReloadAck?(payload: LevelEditorRuntimeReloadAckPayload): void;
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

export type CoreObjectPreviewApplyResult =
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

export type CoreObjectPreviewClearResult = {
	readonly ok: true;
	readonly runtimeSceneId: string;
	readonly clearedStableIds: readonly string[];
};

export type ObjectEditPreviewApplyResult =
	| {
			readonly ok: true;
			readonly runtimeSceneId: string;
			readonly appliedStableIds: readonly string[];
			readonly insertedStableIds: readonly string[];
	  }
	| {
			readonly ok: false;
			readonly runtimeSceneId: string;
			readonly appliedStableIds: readonly string[];
			readonly insertedStableIds: readonly string[];
			readonly missingStableIds: readonly string[];
			readonly conflictingStableIds: readonly string[];
	  };

export type ObjectEditPreviewClearResult = {
	readonly ok: true;
	readonly runtimeSceneId: string;
	readonly clearedStableIds: readonly string[];
};

export type CameraLiveEditModeApplyResult = {
	readonly ok: true;
	readonly runtimeSceneId: string;
	readonly mode: LevelEditorCameraLiveEditModeRequest["mode"];
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
		case "core-object-preview-patch":
			port.applyCoreObjectPreview?.(parsed.message.payload);
			return {
				ok: true,
				requestId: parsed.message.requestId,
				messageType: parsed.message.type,
			};
		case "object-edit-preview-patch":
			port.applyObjectEditPreview?.(parsed.message.payload);
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
		case "clear-core-object-preview":
			port.clearCoreObjectPreview?.(parsed.message.request);
			return {
				ok: true,
				requestId: parsed.message.requestId,
				messageType: parsed.message.type,
			};
		case "clear-object-edit-preview":
			port.clearObjectEditPreview?.(parsed.message.request);
			return {
				ok: true,
				requestId: parsed.message.requestId,
				messageType: parsed.message.type,
			};
		case "camera-live-edit-mode":
			port.applyCameraLiveEditMode?.(parsed.message.request);
			return {
				ok: true,
				requestId: parsed.message.requestId,
				messageType: parsed.message.type,
			};
		case "rendered-scene-hit-test-request":
			port.requestRenderedSceneHitTest?.(
				parsed.message.request,
				parsed.message.requestId,
			);
			return {
				ok: true,
				requestId: parsed.message.requestId,
				messageType: parsed.message.type,
			};
		case "rendered-scene-hit-test-result":
			port.receiveRenderedSceneHitTestResult?.(
				parsed.message.payload,
				parsed.message.requestId,
			);
			return {
				ok: true,
				requestId: parsed.message.requestId,
				messageType: parsed.message.type,
			};
		case "rendered-scene-box-select-request":
			port.requestRenderedSceneBoxSelect?.(
				parsed.message.request,
				parsed.message.requestId,
			);
			return {
				ok: true,
				requestId: parsed.message.requestId,
				messageType: parsed.message.type,
			};
		case "rendered-scene-box-select-result":
			port.receiveRenderedSceneBoxSelectResult?.(
				parsed.message.payload,
				parsed.message.requestId,
			);
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
		case "runtime-reload-ack":
			port.receiveRuntimeReloadAck?.(parsed.message.payload);
			return {
				ok: true,
				requestId: parsed.message.requestId,
				messageType: parsed.message.type,
			};
		case "runtime-telemetry":
			port.receiveRuntimeTelemetry?.(parsed.message.payload);
			return {
				ok: true,
				requestId: parsed.message.requestId,
				messageType: parsed.message.type,
			};
		default:
			return {
				ok: false,
				reason: "invalid-message",
				errors: ["Unsupported level editor preview message type."],
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

export function applyCoreObjectPreviewPatchToRuntime(
	runtime: EngineRuntime,
	patch: LevelEditorCoreObjectPreviewPatch,
): CoreObjectPreviewApplyResult {
	const validatedPatch = parseLevelEditorCoreObjectPreviewPatch(patch);
	const entitiesByStableId = stableIdEntityMap(runtime);
	const appliedStableIds: string[] = [];
	const missingStableIds: string[] = [];

	for (const entry of validatedPatch.entries) {
		const entity = entitiesByStableId.get(entry.stableId);

		if (entity === undefined) {
			missingStableIds.push(entry.stableId);
			continue;
		}

		captureCoreObjectPreviewSnapshot(runtime, validatedPatch, entity, entry);
		applyCoreObjectPreviewEntry(runtime, entity, entry);
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

export function clearCoreObjectPreviewPatchFromRuntime(
	runtime: EngineRuntime,
	request: LevelEditorCoreObjectPreviewClearRequest,
): CoreObjectPreviewClearResult {
	const snapshots = runtimeCoreObjectPreviewSnapshots.get(runtime);
	const requestedStableIds =
		request.stableIds === undefined ? undefined : new Set(request.stableIds);
	const requestedTargetKinds =
		request.targetKinds === undefined
			? undefined
			: new Set(request.targetKinds);
	const clearedStableIds: string[] = [];

	if (!snapshots) {
		return {
			ok: true,
			runtimeSceneId: request.runtimeSceneId,
			clearedStableIds,
		};
	}

	for (const [snapshotKey, snapshot] of [...snapshots.entries()]) {
		if (snapshot.runtimeSceneId !== request.runtimeSceneId) {
			continue;
		}

		if (
			request.sourcePlanHash !== undefined &&
			!snapshot.sourcePlanHashes.has(request.sourcePlanHash)
		) {
			continue;
		}

		if (
			requestedStableIds !== undefined &&
			!requestedStableIds.has(snapshot.stableId)
		) {
			continue;
		}

		if (
			requestedTargetKinds !== undefined &&
			!requestedTargetKinds.has(snapshot.targetKind)
		) {
			continue;
		}

		for (const component of snapshot.components) {
			restorePreviewComponent(runtime, snapshot.entity, component);
		}

		snapshots.delete(snapshotKey);
		clearedStableIds.push(snapshot.stableId);
	}

	if (snapshots.size === 0) {
		runtimeCoreObjectPreviewSnapshots.delete(runtime);
	}

	return {
		ok: true,
		runtimeSceneId: request.runtimeSceneId,
		clearedStableIds,
	};
}

export function applyObjectEditPreviewPatchToRuntime(
	runtime: EngineRuntime,
	patch: LevelEditorObjectEditPreviewPatch,
): ObjectEditPreviewApplyResult {
	const validatedPatch = parseLevelEditorObjectEditPreviewPatch(patch);
	const entitiesByStableId = new Map(stableIdEntityMap(runtime));
	const appliedStableIds: string[] = [];
	const insertedStableIds: string[] = [];
	const missingStableIds: string[] = [];
	const conflictingStableIds: string[] = [];

	for (const entry of validatedPatch.entries) {
		const entity = entitiesByStableId.get(entry.stableId);

		if (entry.operation === "insert") {
			if (entity !== undefined) {
				conflictingStableIds.push(entry.stableId);
				continue;
			}

			const insertedEntity = applyObjectEditInsertEntry(
				runtime,
				validatedPatch,
				entry,
			);
			entitiesByStableId.set(entry.stableId, insertedEntity);
			appliedStableIds.push(entry.stableId);
			insertedStableIds.push(entry.stableId);
			continue;
		}

		if (entity === undefined) {
			missingStableIds.push(entry.stableId);
			continue;
		}

		captureObjectEditPreviewSnapshot(runtime, validatedPatch, entity, entry);
		applyObjectEditPreviewEntry(runtime, entity, entry);
		appliedStableIds.push(entry.stableId);
	}

	if (missingStableIds.length > 0 || conflictingStableIds.length > 0) {
		return {
			ok: false,
			runtimeSceneId: validatedPatch.runtimeSceneId,
			appliedStableIds,
			insertedStableIds,
			missingStableIds,
			conflictingStableIds,
		};
	}

	return {
		ok: true,
		runtimeSceneId: validatedPatch.runtimeSceneId,
		appliedStableIds,
		insertedStableIds,
	};
}

export function clearObjectEditPreviewPatchFromRuntime(
	runtime: EngineRuntime,
	request: LevelEditorObjectEditPreviewClearRequest,
): ObjectEditPreviewClearResult {
	const snapshots = runtimeObjectEditPreviewSnapshots.get(runtime);
	const requestedStableIds =
		request.stableIds === undefined ? undefined : new Set(request.stableIds);
	const requestedOperations =
		request.operations === undefined ? undefined : new Set(request.operations);
	const clearedStableIds: string[] = [];

	if (!snapshots) {
		return {
			ok: true,
			runtimeSceneId: request.runtimeSceneId,
			clearedStableIds,
		};
	}

	for (const [snapshotKey, snapshot] of [...snapshots.entries()]) {
		if (snapshot.runtimeSceneId !== request.runtimeSceneId) {
			continue;
		}

		if (
			request.sourcePlanHash !== undefined &&
			!snapshot.sourcePlanHashes.has(request.sourcePlanHash)
		) {
			continue;
		}

		if (
			requestedStableIds !== undefined &&
			!requestedStableIds.has(snapshot.stableId)
		) {
			continue;
		}

		if (
			requestedOperations !== undefined &&
			!requestedOperations.has(snapshot.operation)
		) {
			continue;
		}

		restoreObjectEditPreviewSnapshot(runtime, snapshot);
		snapshots.delete(snapshotKey);
		clearedStableIds.push(snapshot.stableId);
	}

	if (snapshots.size === 0) {
		runtimeObjectEditPreviewSnapshots.delete(runtime);
	}

	return {
		ok: true,
		runtimeSceneId: request.runtimeSceneId,
		clearedStableIds,
	};
}

export function applyCameraLiveEditModeToRuntime(
	runtime: EngineRuntime,
	request: LevelEditorCameraLiveEditModeRequest,
): CameraLiveEditModeApplyResult {
	if (request.mode === "gameplay") {
		restoreCameraLiveEditSnapshot(runtime, request);

		return {
			ok: true,
			runtimeSceneId: request.runtimeSceneId,
			mode: request.mode,
		};
	}

	if (request.pose === undefined) {
		throw new Error("Camera edit mode requires a pose.");
	}

	captureCameraLiveEditSnapshot(runtime, request);
	runtime.world.setResource<CameraPose>(
		ACTIVE_CAMERA_POSE_RESOURCE,
		toRuntimeCameraPose(request.pose),
	);

	const player = runtime.world.getResource<Entity>(PLAYER_ENTITY_RESOURCE);

	if (player !== undefined && runtime.world.isAlive(player)) {
		const currentTarget =
			runtime.world.getComponent<CameraTargetComponent>(
				player,
				CAMERA_TARGET_COMPONENT,
			) ?? {};

		runtime.world.addComponent<CameraTargetComponent>(
			player,
			CAMERA_TARGET_COMPONENT,
			{
				...currentTarget,
				active: false,
			},
		);
	}

	return {
		ok: true,
		runtimeSceneId: request.runtimeSceneId,
		mode: request.mode,
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

type CoreObjectPreviewComponentSnapshot = {
	readonly componentName: string;
	readonly hadComponent: boolean;
	readonly component?: unknown;
};

type CoreObjectPreviewSnapshot = {
	readonly runtimeSceneId: string;
	readonly sourcePlanHashes: Set<string>;
	readonly entity: Entity;
	readonly stableId: string;
	readonly targetKind: LevelEditorCoreObjectPreviewPatchEntry["targetKind"];
	readonly components: readonly CoreObjectPreviewComponentSnapshot[];
};

type ObjectEditPreviewSnapshot = {
	readonly runtimeSceneId: string;
	readonly sourcePlanHashes: Set<string>;
	readonly entity: Entity;
	readonly stableId: string;
	readonly operation: LevelEditorObjectEditPreviewOperation;
	readonly inserted: boolean;
	readonly components: readonly CoreObjectPreviewComponentSnapshot[];
};

type CameraLiveEditSnapshot = {
	readonly runtimeSceneId: string;
	readonly sourcePlanHashes: Set<string>;
	readonly hadActivePose: boolean;
	readonly activePose?: CameraPose;
	readonly playerEntity?: Entity;
	readonly hadCameraTarget: boolean;
	readonly cameraTarget?: CameraTargetComponent;
};

const runtimePreviewSnapshots = new WeakMap<
	EngineRuntime,
	Map<string, CollisionPreviewSnapshot>
>();

const runtimeCoreObjectPreviewSnapshots = new WeakMap<
	EngineRuntime,
	Map<string, CoreObjectPreviewSnapshot>
>();

const runtimeObjectEditPreviewSnapshots = new WeakMap<
	EngineRuntime,
	Map<string, ObjectEditPreviewSnapshot>
>();

const runtimeCameraLiveEditSnapshots = new WeakMap<
	EngineRuntime,
	CameraLiveEditSnapshot
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

function applyCoreObjectPreviewEntry(
	runtime: EngineRuntime,
	entity: Entity,
	entry: LevelEditorCoreObjectPreviewPatchEntry,
): void {
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

	switch (entry.targetKind) {
		case "light":
			runtime.world.addComponent<LightComponent>(
				entity,
				LIGHT_COMPONENT,
				clonePlainComponent(entry.light),
			);
			return;
		case "spawn":
			return;
		case "portal":
			runtime.world.addComponent<PortalComponent>(
				entity,
				PORTAL_COMPONENT,
				clonePlainComponent(entry.portal),
			);
			return;
		case "audio-emitter":
			runtime.world.addComponent<SoundEmitterComponent>(
				entity,
				SOUND_EMITTER_COMPONENT,
				clonePlainComponent(entry.soundEmitter),
			);
			return;
	}
}

function captureCoreObjectPreviewSnapshot(
	runtime: EngineRuntime,
	patch: LevelEditorCoreObjectPreviewPatch,
	entity: Entity,
	entry: LevelEditorCoreObjectPreviewPatchEntry,
): void {
	let snapshots = runtimeCoreObjectPreviewSnapshots.get(runtime);

	if (!snapshots) {
		snapshots = new Map();
		runtimeCoreObjectPreviewSnapshots.set(runtime, snapshots);
	}

	const snapshotKey = coreObjectSnapshotKey(entry.targetKind, entry.stableId);
	const existing = snapshots.get(snapshotKey);

	if (existing) {
		existing.sourcePlanHashes.add(patch.sourcePlanHash);
		return;
	}

	snapshots.set(snapshotKey, {
		runtimeSceneId: patch.runtimeSceneId,
		sourcePlanHashes: new Set([patch.sourcePlanHash]),
		entity,
		stableId: entry.stableId,
		targetKind: entry.targetKind,
		components: componentNamesForCoreObjectPreviewEntry(entry).map(
			(componentName) =>
				capturePreviewComponent(runtime, entity, componentName),
		),
	});
}

function componentNamesForCoreObjectPreviewEntry(
	entry: LevelEditorCoreObjectPreviewPatchEntry,
): readonly string[] {
	const componentNames = new Set<string>();

	if (entry.transform !== undefined) {
		componentNames.add(PHYSICS_TRANSFORM_COMPONENT);
	}

	switch (entry.targetKind) {
		case "light":
			componentNames.add(LIGHT_COMPONENT);
			break;
		case "portal":
			componentNames.add(PORTAL_COMPONENT);
			break;
		case "audio-emitter":
			componentNames.add(SOUND_EMITTER_COMPONENT);
			break;
	}

	return [...componentNames];
}

function applyObjectEditInsertEntry(
	runtime: EngineRuntime,
	patch: LevelEditorObjectEditPreviewPatch,
	entry: Extract<
		LevelEditorObjectEditPreviewPatchEntry,
		{ operation: "insert" }
	>,
): Entity {
	const entity = runtime.world.createEntity();
	const components = normalizedPreviewComponentMap({
		...clonePlainComponent(entry.components),
		...(entry.transform === undefined
			? {}
			: {
					[PHYSICS_TRANSFORM_COMPONENT]: mergeTransformPreviewData(
						entry.components[PHYSICS_TRANSFORM_COMPONENT],
						entry.transform,
					),
				}),
		[STABLE_ID_COMPONENT]: { id: entry.stableId },
		...(entry.prefabId === undefined
			? {}
			: { [PREFAB_COMPONENT]: { id: entry.prefabId } }),
	});

	captureObjectEditInsertSnapshot(runtime, patch, entity, entry);

	for (const [componentName, component] of Object.entries(components).sort(
		([left], [right]) => left.localeCompare(right),
	)) {
		runtime.world.addComponent(entity, componentName, component);
	}

	return entity;
}

function applyObjectEditPreviewEntry(
	runtime: EngineRuntime,
	entity: Entity,
	entry: Exclude<
		LevelEditorObjectEditPreviewPatchEntry,
		{ operation: "insert" }
	>,
): void {
	switch (entry.operation) {
		case "transform": {
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
			return;
		}
		case "component-patch": {
			for (const componentName of entry.removeComponents ?? []) {
				runtime.world.removeComponent(entity, componentName);
			}

			const components = normalizedPreviewComponentMap(entry.components ?? {});

			for (const [componentName, component] of Object.entries(components)) {
				runtime.world.addComponent(
					entity,
					componentName,
					clonePreviewComponent(componentName, component),
				);
			}
			return;
		}
		case "remove":
			for (const componentName of entry.componentNames) {
				runtime.world.removeComponent(entity, componentName);
			}
			return;
	}
}

function captureObjectEditInsertSnapshot(
	runtime: EngineRuntime,
	patch: LevelEditorObjectEditPreviewPatch,
	entity: Entity,
	entry: Extract<
		LevelEditorObjectEditPreviewPatchEntry,
		{ operation: "insert" }
	>,
): void {
	let snapshots = runtimeObjectEditPreviewSnapshots.get(runtime);

	if (!snapshots) {
		snapshots = new Map();
		runtimeObjectEditPreviewSnapshots.set(runtime, snapshots);
	}

	snapshots.set(objectEditSnapshotKey(entry.operation, entry.stableId), {
		runtimeSceneId: patch.runtimeSceneId,
		sourcePlanHashes: new Set([patch.sourcePlanHash]),
		entity,
		stableId: entry.stableId,
		operation: entry.operation,
		inserted: true,
		components: [],
	});
}

function captureObjectEditPreviewSnapshot(
	runtime: EngineRuntime,
	patch: LevelEditorObjectEditPreviewPatch,
	entity: Entity,
	entry: Exclude<
		LevelEditorObjectEditPreviewPatchEntry,
		{ operation: "insert" }
	>,
): void {
	let snapshots = runtimeObjectEditPreviewSnapshots.get(runtime);

	if (!snapshots) {
		snapshots = new Map();
		runtimeObjectEditPreviewSnapshots.set(runtime, snapshots);
	}

	const snapshotKey = objectEditSnapshotKey(entry.operation, entry.stableId);
	const existing = snapshots.get(snapshotKey);

	if (existing) {
		existing.sourcePlanHashes.add(patch.sourcePlanHash);
		return;
	}

	snapshots.set(snapshotKey, {
		runtimeSceneId: patch.runtimeSceneId,
		sourcePlanHashes: new Set([patch.sourcePlanHash]),
		entity,
		stableId: entry.stableId,
		operation: entry.operation,
		inserted: false,
		components: componentNamesForObjectEditPreviewEntry(entry).map(
			(componentName) =>
				capturePreviewComponent(runtime, entity, componentName),
		),
	});
}

function restoreObjectEditPreviewSnapshot(
	runtime: EngineRuntime,
	snapshot: ObjectEditPreviewSnapshot,
): void {
	if (snapshot.inserted) {
		if (runtime.world.isAlive(snapshot.entity)) {
			runtime.world.destroyEntity(snapshot.entity);
		}
		return;
	}

	if (!runtime.world.isAlive(snapshot.entity)) {
		return;
	}

	for (const component of snapshot.components) {
		restorePreviewComponent(runtime, snapshot.entity, component);
	}
}

function componentNamesForObjectEditPreviewEntry(
	entry: Exclude<
		LevelEditorObjectEditPreviewPatchEntry,
		{ operation: "insert" }
	>,
): readonly string[] {
	const componentNames = new Set<string>();

	switch (entry.operation) {
		case "transform":
			componentNames.add(PHYSICS_TRANSFORM_COMPONENT);
			break;
		case "component-patch":
			for (const componentName of Object.keys(entry.components ?? {})) {
				componentNames.add(componentName);
			}

			for (const componentName of entry.removeComponents ?? []) {
				componentNames.add(componentName);
			}
			break;
		case "remove":
			for (const componentName of entry.componentNames) {
				componentNames.add(componentName);
			}
			break;
	}

	return [...componentNames];
}

function coreObjectSnapshotKey(
	targetKind: LevelEditorCoreObjectPreviewPatchEntry["targetKind"],
	stableId: string,
): string {
	return `${targetKind}:${stableId}`;
}

function objectEditSnapshotKey(
	operation: LevelEditorObjectEditPreviewOperation,
	stableId: string,
): string {
	return `${operation}:${stableId}`;
}

function capturePreviewComponent(
	runtime: EngineRuntime,
	entity: Entity,
	componentName: string,
): CoreObjectPreviewComponentSnapshot {
	const component = runtime.world.getComponent(entity, componentName);

	return {
		componentName,
		hadComponent: component !== undefined,
		...(component === undefined
			? {}
			: { component: clonePreviewComponent(componentName, component) }),
	};
}

function restorePreviewComponent(
	runtime: EngineRuntime,
	entity: Entity,
	snapshot: CoreObjectPreviewComponentSnapshot,
): void {
	if (!snapshot.hadComponent) {
		runtime.world.removeComponent(entity, snapshot.componentName);
		return;
	}

	runtime.world.addComponent(
		entity,
		snapshot.componentName,
		clonePreviewComponent(snapshot.componentName, snapshot.component),
	);
}

function captureCameraLiveEditSnapshot(
	runtime: EngineRuntime,
	request: LevelEditorCameraLiveEditModeRequest,
): void {
	const existing = runtimeCameraLiveEditSnapshots.get(runtime);

	if (existing) {
		if (request.sourcePlanHash !== undefined) {
			existing.sourcePlanHashes.add(request.sourcePlanHash);
		}
		return;
	}

	const activePose = runtime.world.getResource<CameraPose>(
		ACTIVE_CAMERA_POSE_RESOURCE,
	);
	const playerEntity = runtime.world.getResource<Entity>(
		PLAYER_ENTITY_RESOURCE,
	);
	const cameraTarget =
		playerEntity !== undefined && runtime.world.isAlive(playerEntity)
			? runtime.world.getComponent<CameraTargetComponent>(
					playerEntity,
					CAMERA_TARGET_COMPONENT,
				)
			: undefined;

	runtimeCameraLiveEditSnapshots.set(runtime, {
		runtimeSceneId: request.runtimeSceneId,
		sourcePlanHashes:
			request.sourcePlanHash === undefined
				? new Set()
				: new Set([request.sourcePlanHash]),
		hadActivePose: activePose !== undefined,
		...(activePose === undefined
			? {}
			: { activePose: cloneCameraPose(activePose) }),
		...(playerEntity === undefined ? {} : { playerEntity }),
		hadCameraTarget: cameraTarget !== undefined,
		...(cameraTarget === undefined
			? {}
			: { cameraTarget: clonePlainComponent(cameraTarget) }),
	});
}

function restoreCameraLiveEditSnapshot(
	runtime: EngineRuntime,
	request: LevelEditorCameraLiveEditModeRequest,
): void {
	const snapshot = runtimeCameraLiveEditSnapshots.get(runtime);

	if (!snapshot || snapshot.runtimeSceneId !== request.runtimeSceneId) {
		return;
	}

	if (
		request.sourcePlanHash !== undefined &&
		!snapshot.sourcePlanHashes.has(request.sourcePlanHash)
	) {
		return;
	}

	if (snapshot.hadActivePose && snapshot.activePose !== undefined) {
		runtime.world.setResource(
			ACTIVE_CAMERA_POSE_RESOURCE,
			cloneCameraPose(snapshot.activePose),
		);
	} else {
		runtime.world.removeResource(ACTIVE_CAMERA_POSE_RESOURCE);
	}

	if (
		snapshot.playerEntity !== undefined &&
		runtime.world.isAlive(snapshot.playerEntity)
	) {
		if (snapshot.hadCameraTarget && snapshot.cameraTarget !== undefined) {
			runtime.world.addComponent(
				snapshot.playerEntity,
				CAMERA_TARGET_COMPONENT,
				clonePlainComponent(snapshot.cameraTarget),
			);
		} else {
			runtime.world.removeComponent(
				snapshot.playerEntity,
				CAMERA_TARGET_COMPONENT,
			);
		}
	}

	runtimeCameraLiveEditSnapshots.delete(runtime);
}

function normalizedPreviewComponentMap(
	components: Record<string, unknown>,
): Record<string, unknown> {
	const normalized = clonePlainComponent(components);
	normalizeRuntimeComponentMap(normalized);
	return normalized;
}

function mergeTransformPreviewData(
	current: unknown,
	transform: CollisionCookTransformData,
): Record<string, unknown> {
	const next = isPlainRecord(current) ? clonePlainComponent(current) : {};

	if (transform.position !== undefined) {
		next.position = [...transform.position];
	}

	if (transform.rotation !== undefined) {
		next.rotation = [...transform.rotation];
	}

	if (transform.scale !== undefined) {
		next.scale = [...transform.scale];
	}

	return next;
}

function clonePreviewComponent(
	componentName: string,
	component: unknown,
): unknown {
	if (
		componentName === PHYSICS_TRANSFORM_COMPONENT &&
		isPhysicsTransformComponent(component)
	) {
		return cloneTransformComponent(component);
	}

	return clonePlainComponent(component);
}

function toRuntimeCameraPose(
	pose: LevelEditorCameraLiveEditModeRequest["pose"],
): CameraPose {
	if (pose === undefined) {
		throw new Error("Camera edit pose is required.");
	}

	return {
		position: tupleToVec3(pose.position),
		rotation: quat(
			pose.rotation[0],
			pose.rotation[1],
			pose.rotation[2],
			pose.rotation[3],
		),
		fovDegrees: pose.fovDegrees,
		near: pose.near,
		far: pose.far,
	};
}

function cloneCameraPose(pose: CameraPose): CameraPose {
	return {
		position: cloneRuntimeVec3(pose.position),
		rotation: cloneRuntimeQuat(pose.rotation),
		fovDegrees: pose.fovDegrees,
		near: pose.near,
		far: pose.far,
	};
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

function isPhysicsTransformComponent(
	component: unknown,
): component is PhysicsTransformComponent {
	return (
		isRuntimeVec3Record(
			(component as Partial<PhysicsTransformComponent> | undefined)?.position,
		) &&
		isRuntimeQuatRecord(
			(component as Partial<PhysicsTransformComponent> | undefined)?.rotation,
		)
	);
}

function isRuntimeVec3Record(
	value: unknown,
): value is { x: number; y: number; z: number } {
	return (
		typeof (value as { readonly x?: unknown } | undefined)?.x === "number" &&
		typeof (value as { readonly y?: unknown } | undefined)?.y === "number" &&
		typeof (value as { readonly z?: unknown } | undefined)?.z === "number"
	);
}

function isRuntimeQuatRecord(
	value: unknown,
): value is { x: number; y: number; z: number; w: number } {
	return (
		isRuntimeVec3Record(value) &&
		typeof (value as { readonly w?: unknown }).w === "number"
	);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		Object.getPrototypeOf(value) === Object.prototype
	);
}

function clonePlainComponent<TValue>(value: TValue): TValue {
	return JSON.parse(JSON.stringify(value)) as TValue;
}
