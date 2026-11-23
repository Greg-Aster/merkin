import {
	type ComponentName,
	type Entity,
	type ResourceName,
	World,
} from "../../core/index.js";

export type Serializer<TValue = unknown, TSerialized = unknown> = {
	serialize(value: TValue): TSerialized;
	deserialize(serialized: TSerialized): TValue;
};

export type SerializablePrimitive = string | number | boolean | null;
export type SerializableValue =
	| SerializablePrimitive
	| readonly SerializableValue[]
	| { readonly [key: string]: SerializableValue };

export type SerializedEntity = {
	readonly entity: Entity;
	readonly stableId?: string;
	readonly prefabId?: string;
	readonly components: Record<string, SerializableValue>;
};

export type WorldSnapshot = {
	readonly schemaVersion: 1;
	readonly sceneId?: string;
	readonly tick?: number;
	readonly entities: readonly SerializedEntity[];
	readonly resources?: Record<string, SerializableValue>;
};

export type WorldSerializeOptions = {
	readonly componentNames: readonly ComponentName[];
	readonly resourceNames?: readonly ResourceName[];
	readonly sceneId?: string;
	readonly tick?: number;
	readonly transientKeys?: ReadonlySet<string>;
};

export type WorldDeserializeOptions = {
	readonly world?: World;
	readonly clearWorld?: boolean;
};

export type WorldDeserializeResult = {
	readonly world: World;
	readonly entityMap: ReadonlyMap<Entity, Entity>;
	readonly stableIdMap: ReadonlyMap<string, Entity>;
};

const DEFAULT_TRANSIENT_KEYS = new Set<string>([
	"audioNode",
	"bodyHandle",
	"colliderHandle",
	"domNode",
	"gpuResource",
	"physicsBody",
	"rapierBody",
	"rapierCollider",
	"renderObject",
	"threeObject",
]);

export function serializeWorld(
	world: World,
	options: WorldSerializeOptions,
): WorldSnapshot {
	const entities: SerializedEntity[] = [];
	const transientKeys = options.transientKeys ?? DEFAULT_TRANSIENT_KEYS;

	for (const entity of world.entities()) {
		const components: Record<string, SerializableValue> = {};

		for (const componentName of [...options.componentNames].sort()) {
			const component = world.getComponent(entity, componentName);

			if (component === undefined) {
				continue;
			}

			components[componentName] = toSerializableValue(
				component,
				`entity.${entity}.${componentName}`,
				transientKeys,
			);
		}

		if (Object.keys(components).length === 0) {
			continue;
		}

		const stableId = extractStableId(components.StableId);
		const prefabId = extractPrefabId(components.Prefab);
		const serialized: SerializedEntity = {
			entity,
			components,
			...(stableId ? { stableId } : {}),
			...(prefabId ? { prefabId } : {}),
		};

		entities.push(serialized);
	}

	const resources = serializeResources(world, options, transientKeys);

	return {
		schemaVersion: 1,
		...(options.sceneId ? { sceneId: options.sceneId } : {}),
		...(options.tick !== undefined ? { tick: options.tick } : {}),
		entities,
		...(resources ? { resources } : {}),
	};
}

export function deserializeWorldSnapshot(
	snapshot: WorldSnapshot,
	options: WorldDeserializeOptions = {},
): WorldDeserializeResult {
	const world = options.world ?? createWorld();
	const shouldClearWorld = options.clearWorld ?? true;

	if (shouldClearWorld) {
		world.clear();
	}

	const entityMap = new Map<Entity, Entity>();
	const stableIdMap = new Map<string, Entity>();

	for (const serializedEntity of snapshot.entities) {
		const entity = world.createEntity();
		entityMap.set(serializedEntity.entity, entity);

		for (const [componentName, component] of Object.entries(
			serializedEntity.components,
		).sort(([left], [right]) => left.localeCompare(right))) {
			world.addComponent(
				entity,
				componentName,
				cloneSerializableValue(component),
			);
		}

		const stableId =
			serializedEntity.stableId ??
			extractStableId(serializedEntity.components.StableId);

		if (stableId) {
			stableIdMap.set(stableId, entity);
		}
	}

	if (snapshot.resources) {
		for (const [resourceName, resource] of Object.entries(snapshot.resources)) {
			world.setResource(resourceName, cloneSerializableValue(resource));
		}
	}

	return {
		world,
		entityMap,
		stableIdMap,
	};
}

export function toSerializableValue(
	value: unknown,
	path = "value",
	transientKeys: ReadonlySet<string> = DEFAULT_TRANSIENT_KEYS,
): SerializableValue {
	if (
		value === null ||
		typeof value === "string" ||
		typeof value === "boolean"
	) {
		return value;
	}

	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new Error(`${path} is not serializable because it is not finite.`);
		}

		return value;
	}

	if (Array.isArray(value)) {
		return value.map((item, index) =>
			toSerializableValue(item, `${path}.${index}`, transientKeys),
		);
	}

	if (isRecordLike(value)) {
		const serialized: Record<string, SerializableValue> = {};

		for (const [key, item] of Object.entries(value).sort(([left], [right]) =>
			left.localeCompare(right),
		)) {
			if (transientKeys.has(key)) {
				continue;
			}

			if (item === undefined) {
				continue;
			}

			serialized[key] = toSerializableValue(
				item,
				`${path}.${key}`,
				transientKeys,
			);
		}

		return serialized;
	}

	throw new Error(`${path} is not JSON-serializable engine state.`);
}

export function cloneSerializableValue<TValue extends SerializableValue>(
	value: TValue,
): TValue {
	return JSON.parse(JSON.stringify(value)) as TValue;
}

export function stableStringify(value: unknown): string {
	return JSON.stringify(sortSerializableValue(toSerializableValue(value)));
}

function serializeResources(
	world: World,
	options: WorldSerializeOptions,
	transientKeys: ReadonlySet<string>,
): Record<string, SerializableValue> | undefined {
	if (!options.resourceNames || options.resourceNames.length === 0) {
		return undefined;
	}

	const resources: Record<string, SerializableValue> = {};

	for (const resourceName of [...options.resourceNames].sort()) {
		const resource = world.getResource(resourceName);

		if (resource === undefined) {
			continue;
		}

		resources[resourceName] = toSerializableValue(
			resource,
			`resource.${resourceName}`,
			transientKeys,
		);
	}

	return Object.keys(resources).length > 0 ? resources : undefined;
}

function sortSerializableValue(value: SerializableValue): SerializableValue {
	if (Array.isArray(value)) {
		return value.map((item) => sortSerializableValue(item));
	}

	if (isSerializableObject(value)) {
		const sorted: Record<string, SerializableValue> = {};

		for (const key of Object.keys(value).sort()) {
			const item = value[key];

			if (item !== undefined) {
				sorted[key] = sortSerializableValue(item);
			}
		}

		return sorted;
	}

	return value;
}

function extractStableId(
	value: SerializableValue | undefined,
): string | undefined {
	if (typeof value === "string" && value.length > 0) {
		return value;
	}

	if (isSerializableObject(value) && typeof value.id === "string") {
		return value.id;
	}

	return undefined;
}

function extractPrefabId(
	value: SerializableValue | undefined,
): string | undefined {
	if (isSerializableObject(value) && typeof value.id === "string") {
		return value.id;
	}

	return undefined;
}

function isSerializableObject(
	value: SerializableValue | undefined,
): value is { readonly [key: string]: SerializableValue } {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function createWorld(): World {
	return new World();
}
