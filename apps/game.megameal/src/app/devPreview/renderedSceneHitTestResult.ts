import type { Entity } from "../../engine/core/index.js";
import {
	COLLIDER_COMPONENT,
	type EngineRuntime,
	LIGHT_COMPONENT,
	type LevelEditorRenderedSceneBoxSelectRequest,
	type LevelEditorRenderedSceneBoxSelectResultPayload,
	type LevelEditorRenderedSceneHitTestRequest,
	type LevelEditorRenderedSceneHitTestResultPayload,
	SOUND_EMITTER_COMPONENT,
} from "../../engine/index.js";
import {
	PREFAB_COMPONENT,
	STABLE_ID_COMPONENT,
} from "../../game/prefabs/index.js";
import { PORTAL_COMPONENT } from "../../game/systems/index.js";

export type RenderedSceneHitTestPort = {
	hitTestRenderedScene(request: {
		readonly viewport: LevelEditorRenderedSceneHitTestRequest["viewport"];
		readonly screenPoint: LevelEditorRenderedSceneHitTestRequest["screenPoint"];
		readonly entityFilter?: ReadonlySet<Entity>;
	}):
		| {
				readonly status: "hit";
				readonly entity: Entity;
				readonly distance: number;
				readonly worldPosition: readonly [number, number, number];
				readonly worldNormal?: readonly [number, number, number];
		  }
		| {
				readonly status: "miss";
		  }
		| {
				readonly status: "unavailable";
				readonly reason: "rendered-hit-test-unavailable";
		  };
};

export type RenderedSceneBoxSelectPort = {
	boxSelectRenderedScene(request: {
		readonly viewport: LevelEditorRenderedSceneBoxSelectRequest["viewport"];
		readonly rect: LevelEditorRenderedSceneBoxSelectRequest["rect"];
		readonly entityFilter?: ReadonlySet<Entity>;
	}):
		| {
				readonly status: "hit";
				readonly hits: readonly {
					readonly entity: Entity;
					readonly distance: number;
					readonly worldPosition: readonly [number, number, number];
				}[];
		  }
		| {
				readonly status: "miss";
		  }
		| {
				readonly status: "unavailable";
				readonly reason: "rendered-hit-test-unavailable";
		  };
};

export function buildRenderedSceneHitTestResultPayload(options: {
	readonly runtime: EngineRuntime;
	readonly hitTestPort: RenderedSceneHitTestPort | undefined;
	readonly request: LevelEditorRenderedSceneHitTestRequest;
	readonly activeRuntimeSceneId?: string;
}): LevelEditorRenderedSceneHitTestResultPayload {
	const { activeRuntimeSceneId, request } = options;

	if (activeRuntimeSceneId !== request.runtimeSceneId) {
		return ignoredResult(request.runtimeSceneId, activeRuntimeSceneId, {
			reason: "runtime-scene-not-active",
		});
	}

	if (!options.hitTestPort) {
		return ignoredResult(request.runtimeSceneId, activeRuntimeSceneId, {
			reason: "rendered-hit-test-unavailable",
		});
	}

	const stableIdToEntity = stableIdEntityMap(options.runtime);
	const entityToStableId = new Map<Entity, string>();

	for (const [stableId, entity] of stableIdToEntity) {
		entityToStableId.set(entity, stableId);
	}

	const entityFilter = entityFilterForRequest(request, stableIdToEntity);

	if (
		request.pickableStableIds !== undefined &&
		request.pickableStableIds.length > 0 &&
		entityFilter.size === 0
	) {
		return ignoredResult(request.runtimeSceneId, activeRuntimeSceneId, {
			reason: "stale-request",
		});
	}

	const hitTestResult = options.hitTestPort.hitTestRenderedScene({
		viewport: request.viewport,
		screenPoint: request.screenPoint,
		...(entityFilter.size === 0 ? {} : { entityFilter }),
	});

	if (hitTestResult.status === "unavailable") {
		return ignoredResult(request.runtimeSceneId, activeRuntimeSceneId, {
			reason: hitTestResult.reason,
		});
	}

	if (hitTestResult.status === "miss") {
		return {
			runtimeSceneId: request.runtimeSceneId,
			...(activeRuntimeSceneId === undefined ? {} : { activeRuntimeSceneId }),
			status: "miss",
			source: "runtime-rendered-scene-hit-test",
			writesRuntimeData: false,
			reason: "no-rendered-hit",
		};
	}

	const stableId = entityToStableId.get(hitTestResult.entity);

	if (stableId === undefined) {
		return ignoredResult(request.runtimeSceneId, activeRuntimeSceneId, {
			reason: "stale-request",
		});
	}

	const renderableId = renderableIdForEntity(
		options.runtime,
		hitTestResult.entity,
	);

	return {
		runtimeSceneId: request.runtimeSceneId,
		...(activeRuntimeSceneId === undefined ? {} : { activeRuntimeSceneId }),
		status: "hit",
		source: "runtime-rendered-scene-hit-test",
		writesRuntimeData: false,
		hit: {
			stableId,
			objectKind: objectKindForEntity(options.runtime, hitTestResult.entity),
			distance: hitTestResult.distance,
			worldPosition: hitTestResult.worldPosition,
			...(hitTestResult.worldNormal === undefined
				? {}
				: { worldNormal: hitTestResult.worldNormal }),
			...(renderableId === undefined ? {} : { renderableId }),
		},
	};
}

export function buildRenderedSceneBoxSelectResultPayload(options: {
	readonly runtime: EngineRuntime;
	readonly boxSelectPort: RenderedSceneBoxSelectPort | undefined;
	readonly request: LevelEditorRenderedSceneBoxSelectRequest;
	readonly activeRuntimeSceneId?: string;
}): LevelEditorRenderedSceneBoxSelectResultPayload {
	const { activeRuntimeSceneId, request } = options;

	if (activeRuntimeSceneId !== request.runtimeSceneId) {
		return ignoredBoxSelectResult(
			request.runtimeSceneId,
			activeRuntimeSceneId,
			{
				reason: "runtime-scene-not-active",
			},
		);
	}

	if (!options.boxSelectPort) {
		return ignoredBoxSelectResult(
			request.runtimeSceneId,
			activeRuntimeSceneId,
			{
				reason: "rendered-hit-test-unavailable",
			},
		);
	}

	const stableIdToEntity = stableIdEntityMap(options.runtime);
	const entityToStableId = new Map<Entity, string>();

	for (const [stableId, entity] of stableIdToEntity) {
		entityToStableId.set(entity, stableId);
	}

	const entityFilter = entityFilterForStableIds(
		request.pickableStableIds,
		stableIdToEntity,
	);

	if (
		request.pickableStableIds !== undefined &&
		request.pickableStableIds.length > 0 &&
		entityFilter.size === 0
	) {
		return ignoredBoxSelectResult(
			request.runtimeSceneId,
			activeRuntimeSceneId,
			{
				reason: "stale-request",
			},
		);
	}

	const boxSelectResult = options.boxSelectPort.boxSelectRenderedScene({
		viewport: request.viewport,
		rect: request.rect,
		...(entityFilter.size === 0 ? {} : { entityFilter }),
	});

	if (boxSelectResult.status === "unavailable") {
		return ignoredBoxSelectResult(
			request.runtimeSceneId,
			activeRuntimeSceneId,
			{
				reason: boxSelectResult.reason,
			},
		);
	}

	if (boxSelectResult.status === "miss") {
		return {
			runtimeSceneId: request.runtimeSceneId,
			...(activeRuntimeSceneId === undefined ? {} : { activeRuntimeSceneId }),
			status: "miss",
			source: "runtime-rendered-scene-box-select",
			writesRuntimeData: false,
			reason: "no-rendered-hit",
		};
	}

	const hits = boxSelectResult.hits
		.map((hit) => {
			const stableId = entityToStableId.get(hit.entity);

			if (stableId === undefined) {
				return undefined;
			}

			const renderableId = renderableIdForEntity(options.runtime, hit.entity);

			return {
				stableId,
				objectKind: objectKindForEntity(options.runtime, hit.entity),
				distance: hit.distance,
				worldPosition: hit.worldPosition,
				...(renderableId === undefined ? {} : { renderableId }),
			};
		})
		.filter((hit): hit is NonNullable<typeof hit> => hit !== undefined);

	if (hits.length === 0) {
		return ignoredBoxSelectResult(
			request.runtimeSceneId,
			activeRuntimeSceneId,
			{
				reason: "stale-request",
			},
		);
	}

	return {
		runtimeSceneId: request.runtimeSceneId,
		...(activeRuntimeSceneId === undefined ? {} : { activeRuntimeSceneId }),
		status: "hit",
		source: "runtime-rendered-scene-box-select",
		writesRuntimeData: false,
		hits,
	};
}

function entityFilterForRequest(
	request: LevelEditorRenderedSceneHitTestRequest,
	stableIdToEntity: ReadonlyMap<string, Entity>,
): ReadonlySet<Entity> {
	return entityFilterForStableIds(request.pickableStableIds, stableIdToEntity);
}

function entityFilterForStableIds(
	pickableStableIds: readonly string[] | undefined,
	stableIdToEntity: ReadonlyMap<string, Entity>,
): ReadonlySet<Entity> {
	if (pickableStableIds === undefined) {
		return new Set(stableIdToEntity.values());
	}

	const entities = new Set<Entity>();

	for (const stableId of pickableStableIds) {
		const entity = stableIdToEntity.get(stableId);

		if (entity !== undefined) {
			entities.add(entity);
		}
	}

	return entities;
}

function ignoredResult(
	runtimeSceneId: string,
	activeRuntimeSceneId: string | undefined,
	options: {
		readonly reason:
			| "rendered-hit-test-unavailable"
			| "runtime-scene-not-active"
			| "stale-request";
	},
): LevelEditorRenderedSceneHitTestResultPayload {
	return {
		runtimeSceneId,
		...(activeRuntimeSceneId === undefined ? {} : { activeRuntimeSceneId }),
		status: "ignored",
		source: "runtime-rendered-scene-hit-test",
		writesRuntimeData: false,
		reason: options.reason,
	};
}

function ignoredBoxSelectResult(
	runtimeSceneId: string,
	activeRuntimeSceneId: string | undefined,
	options: {
		readonly reason:
			| "rendered-hit-test-unavailable"
			| "runtime-scene-not-active"
			| "stale-request";
	},
): LevelEditorRenderedSceneBoxSelectResultPayload {
	return {
		runtimeSceneId,
		...(activeRuntimeSceneId === undefined ? {} : { activeRuntimeSceneId }),
		status: "ignored",
		source: "runtime-rendered-scene-box-select",
		writesRuntimeData: false,
		reason: options.reason,
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

function objectKindForEntity(
	runtime: EngineRuntime,
	entity: Entity,
): LevelEditorRenderedSceneHitTestResultPayload["hit"] extends
	| { readonly objectKind: infer TObjectKind }
	| undefined
	? TObjectKind
	: never {
	if (runtime.world.hasComponent(entity, PORTAL_COMPONENT)) {
		return "portal";
	}

	if (runtime.world.hasComponent(entity, LIGHT_COMPONENT)) {
		return "light";
	}

	if (runtime.world.hasComponent(entity, SOUND_EMITTER_COMPONENT)) {
		return "audio-emitter";
	}

	if (runtime.world.hasComponent(entity, COLLIDER_COMPONENT)) {
		return "collision-preview";
	}

	return runtime.world.hasComponent(entity, PREFAB_COMPONENT)
		? "level-instance"
		: "level-instance";
}

function renderableIdForEntity(
	runtime: EngineRuntime,
	entity: Entity,
): string | undefined {
	const prefab = runtime.world.getComponent<{ readonly prefabId?: unknown }>(
		entity,
		PREFAB_COMPONENT,
	);

	return typeof prefab?.prefabId === "string" ? prefab.prefabId : undefined;
}
