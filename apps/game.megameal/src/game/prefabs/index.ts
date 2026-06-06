import type { Entity, World } from "../../engine/core/index.js";
import { prefabDefinitionValidator } from "../../engine/data/index.js";
import { quat, vec3 } from "../../engine/math/index.js";
import type { SceneScope } from "../../engine/modules/scene/index.js";

export {
	arenaFloorPrefab,
	ingredientPrefab,
	mirandaArchiveLightPrefab,
	mirandaBrigCellPrefab,
	mirandaBrigDeskPrefab,
	mirandaCaptainsChairPrefab,
	mirandaCaptainsDeskPrefab,
	mirandaCargoHoldFloorPrefab,
	mirandaCargoStackAPrefab,
	mirandaCargoStackBPrefab,
	mirandaCargoStackCPrefab,
	mirandaCargoStackDPrefab,
	mirandaChapelAltarPrefab,
	mirandaChapelMonolithPrefab,
	mirandaCockpitConsolePrefab,
	mirandaCockpitPanelCenterPrefab,
	mirandaCockpitPanelSidePrefab,
	mirandaCommandGalleryBeaconLightPrefab,
	mirandaCrewBunkPrefab,
	mirandaDeckPrefabs,
	mirandaEngineColumnPrefab,
	mirandaEngineCorePrefab,
	mirandaFloorMainPrefab,
	mirandaFloorUpperPrefab,
	mirandaLockerBankPrefab,
	mirandaMedPodPrefab,
	mirandaMessCounterPrefab,
	mirandaMessTableLargePrefab,
	mirandaMessTableSmallPrefab,
	mirandaObservationLightPrefab,
	mirandaRecipeSafePrefab,
	mirandaServerBankTallPrefab,
	mirandaServerBankWidePrefab,
	mirandaStoryMarkerAmberPrefab,
	mirandaStoryMarkerCyanPrefab,
	mirandaStoryMarkerMagentaPrefab,
	mirandaStoryMarkerRedPrefab,
	playerPrefab,
	prototypePrefabs,
} from "./defaultPrefabs.js";
export {
	observatoryBoundaryBlockerPrefab,
	observatoryEnvironmentPrefab,
	observatoryFireflyMarkerPrefab,
	observatoryWalkableMeshPrefab,
	observatoryPrefabs,
} from "./observatoryPrefabs.js";
export { portalGatePrefab } from "./navigationPrefabs.js";
export {
	portalArenaFloorPrefab,
	portalArenaPrefabs,
} from "./portalPrefabs.js";
export {
	sciFiRoomAnomalyMarkerPrefab,
	sciFiRoomColumnPrefab,
	sciFiRoomConsolePrefab,
	sciFiRoomCourtyardFloorPrefab,
	sciFiRoomInteriorFloorPrefab,
	sciFiRoomPrefabs,
	sciFiRoomStoryMarkerPrefab,
	sciFiRoomWastelandFloorPrefab,
} from "./sciFiRoomPrefabs.js";
export {
	solitudeDaisPrefab,
	solitudeFireflyMarkerPrefab,
	solitudePillarPrefab,
	solitudePlateauPrefab,
	solitudePrefabs,
	solitudeRingFragmentPrefab,
	solitudeWindEmitterPrefab,
} from "./solitudePrefabs.js";
export { waterSurfacePlanePrefab } from "./waterPrefabs.js";

export type PrefabId = string;
export type StableEntityId = string;

export type PrefabDefinition = {
	readonly id: PrefabId;
	readonly assetIds?: readonly string[];
	readonly tags?: readonly string[];
	readonly components: Record<string, unknown>;
};

export type TransformOverride = {
	readonly position?: readonly [number, number, number];
	readonly rotation?: readonly [number, number, number, number];
	readonly scale?: readonly [number, number, number];
};

export type PrefabSpawnOptions = {
	readonly stableId?: StableEntityId;
	readonly components?: Record<string, unknown>;
	readonly transform?: TransformOverride;
	readonly scope?: SceneScope;
};

export type PrefabSpawnResult = {
	readonly entity: Entity;
	readonly prefabId: PrefabId;
	readonly stableId: StableEntityId;
};

export const STABLE_ID_COMPONENT = "StableId";
export const PREFAB_COMPONENT = "Prefab";

export class PrefabRegistry {
	#prefabs = new Map<PrefabId, PrefabDefinition>();

	constructor(prefabs: readonly PrefabDefinition[] = []) {
		for (const prefab of prefabs) {
			this.register(prefab);
		}
	}

	register(prefab: PrefabDefinition): void {
		prefabDefinitionValidator.parse(prefab);

		if (this.#prefabs.has(prefab.id)) {
			throw new Error(`Prefab "${prefab.id}" is already registered.`);
		}

		this.#prefabs.set(prefab.id, cloneValue(prefab));
	}

	has(prefabId: PrefabId): boolean {
		return this.#prefabs.has(prefabId);
	}

	get(prefabId: PrefabId): PrefabDefinition {
		const prefab = this.#prefabs.get(prefabId);

		if (!prefab) {
			throw new Error(`Prefab "${prefabId}" is not registered.`);
		}

		return cloneValue(prefab);
	}

	list(): readonly PrefabDefinition[] {
		return [...this.#prefabs.values()]
			.sort((left, right) => left.id.localeCompare(right.id))
			.map((prefab) => cloneValue(prefab));
	}

	spawnPrefab(
		world: World,
		prefabId: PrefabId,
		options: PrefabSpawnOptions = {},
	): PrefabSpawnResult {
		const prefab = this.get(prefabId);
		const components = mergeComponentMaps(
			prefab.components,
			options.components ?? {},
		);

		applyTransformOverride(components, options.transform);
		prefabDefinitionValidator.parse({
			id: prefab.id,
			...(prefab.assetIds ? { assetIds: prefab.assetIds } : {}),
			...(prefab.tags ? { tags: prefab.tags } : {}),
			components,
		});
		normalizeKnownRuntimeComponents(components);

		const entity = world.createEntity();
		const stableId = options.stableId ?? createStableEntityId(prefabId, entity);

		components[STABLE_ID_COMPONENT] = { id: stableId };
		components[PREFAB_COMPONENT] = { id: prefabId };

		for (const [componentName, component] of Object.entries(components).sort(
			([left], [right]) => left.localeCompare(right),
		)) {
			world.addComponent(entity, componentName, cloneValue(component));
		}

		options.scope?.registerEntity(entity, (ownedEntity) => {
			world.destroyEntity(ownedEntity);
		});

		return {
			entity,
			prefabId,
			stableId,
		};
	}
}

export function spawnPrefab(
	world: World,
	registry: PrefabRegistry,
	prefabId: PrefabId,
	options: PrefabSpawnOptions = {},
): PrefabSpawnResult {
	return registry.spawnPrefab(world, prefabId, options);
}

export function createStableEntityId(
	prefabId: PrefabId,
	entity: Entity,
): StableEntityId {
	return `${prefabId}:${entity}`;
}

function mergeComponentMaps(
	baseComponents: Record<string, unknown>,
	overrideComponents: Record<string, unknown>,
): Record<string, unknown> {
	const merged = cloneRecord(baseComponents);

	for (const [componentName, component] of Object.entries(overrideComponents)) {
		if (isRecord(merged[componentName]) && isRecord(component)) {
			merged[componentName] = {
				...merged[componentName],
				...component,
			};
		} else {
			merged[componentName] = cloneValue(component);
		}
	}

	return merged;
}

function applyTransformOverride(
	components: Record<string, unknown>,
	transform: TransformOverride | undefined,
): void {
	if (!transform) {
		return;
	}

	const currentTransform = isRecord(components.Transform)
		? components.Transform
		: {};
	const nextTransform: Record<string, unknown> = { ...currentTransform };

	if (transform.position) {
		nextTransform.position = [...transform.position];
	}

	if (transform.rotation) {
		nextTransform.rotation = [...transform.rotation];
	}

	if (transform.scale) {
		nextTransform.scale = [...transform.scale];
	}

	components.Transform = nextTransform;
}

function normalizeKnownRuntimeComponents(
	components: Record<string, unknown>,
): void {
	normalizeTransformComponent(components);
	normalizeColliderComponent(components);
}

function normalizeTransformComponent(
	components: Record<string, unknown>,
): void {
	const transform = components.Transform;

	if (!isRecord(transform)) {
		return;
	}

	const normalized: Record<string, unknown> = {
		...transform,
	};

	normalized.position = tupleToVec3(transform.position, vec3());
	normalized.rotation = tupleToQuat(transform.rotation, quat());
	normalized.scale = tupleToVec3(transform.scale, vec3(1, 1, 1));
	components.Transform = normalized;
}

function normalizeColliderComponent(components: Record<string, unknown>): void {
	const collider = components.Collider;

	if (!isRecord(collider) || !isRecord(collider.shape)) {
		return;
	}

	const normalizedCollider: Record<string, unknown> = {
		...collider,
		...(collider.offset !== undefined
			? { offset: tupleToVec3(collider.offset, vec3()) }
			: {}),
	};

	if (collider.shape.type === "box") {
		components.Collider = {
			...normalizedCollider,
			shape: {
				...collider.shape,
				halfExtents: tupleToVec3(
					collider.shape.halfExtents,
					vec3(0.5, 0.5, 0.5),
				),
			},
		};
		return;
	}

	if (
		collider.shape.type === "mesh" &&
		Array.isArray(collider.shape.vertices)
	) {
		components.Collider = {
			...normalizedCollider,
			shape: {
				...collider.shape,
				vertices: collider.shape.vertices.map((vertex) =>
					tupleToVec3(vertex, vec3()),
				),
			},
		};
		return;
	}

	components.Collider = normalizedCollider;
}

function tupleToVec3(value: unknown, fallback: ReturnType<typeof vec3>) {
	if (Array.isArray(value)) {
		return vec3(
			numberOrFallback(value[0], fallback.x),
			numberOrFallback(value[1], fallback.y),
			numberOrFallback(value[2], fallback.z),
		);
	}

	if (isVec3Like(value)) {
		return vec3(value.x, value.y, value.z);
	}

	return fallback;
}

function tupleToQuat(value: unknown, fallback: ReturnType<typeof quat>) {
	if (Array.isArray(value)) {
		return quat(
			numberOrFallback(value[0], fallback.x),
			numberOrFallback(value[1], fallback.y),
			numberOrFallback(value[2], fallback.z),
			numberOrFallback(value[3], fallback.w),
		);
	}

	if (isQuatLike(value)) {
		return quat(value.x, value.y, value.z, value.w);
	}

	return fallback;
}

function isVec3Like(value: unknown): value is ReturnType<typeof vec3> {
	return (
		isRecord(value) &&
		typeof value.x === "number" &&
		typeof value.y === "number" &&
		typeof value.z === "number"
	);
}

function isQuatLike(value: unknown): value is ReturnType<typeof quat> {
	return (
		isRecord(value) &&
		typeof value.x === "number" &&
		typeof value.y === "number" &&
		typeof value.z === "number" &&
		typeof value.w === "number"
	);
}

function numberOrFallback(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function cloneRecord(value: Record<string, unknown>): Record<string, unknown> {
	return cloneValue(value) as Record<string, unknown>;
}

function cloneValue<TValue>(value: TValue): TValue {
	return JSON.parse(JSON.stringify(value)) as TValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		Object.getPrototypeOf(value) === Object.prototype
	);
}
