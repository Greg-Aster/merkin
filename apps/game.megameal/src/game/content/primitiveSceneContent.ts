import type { AssetManifestEntry } from "../../engine/modules/assets/index.js";
import type { LevelPrefabInstance } from "../levels/index.js";
import type { PrefabDefinition } from "../prefabs/index.js";

export type PrimitiveGeometry =
	| "box"
	| "cylinder"
	| "torus"
	| "icosahedron"
	| "dodecahedron";

const primitiveGeometries = new Set<string>([
	"box",
	"cylinder",
	"torus",
	"icosahedron",
	"dodecahedron",
]);

export type PrimitiveMaterial = {
	readonly color: string;
	readonly emissive: string;
	readonly emissiveIntensity: number;
	readonly metalness: number;
	readonly roughness: number;
	readonly transparent?: boolean;
	readonly opacity?: number;
};

export type PrimitiveSceneNode = {
	readonly sourceId: string;
	readonly name: string;
	readonly parentId?: string;
	readonly position: readonly [number, number, number];
	readonly rotationEuler?: readonly [number, number, number];
	readonly rotation: readonly [number, number, number, number];
	readonly scale: readonly [number, number, number];
	readonly visible: boolean;
	readonly geometry: PrimitiveGeometry;
	readonly args: readonly number[];
	readonly material: PrimitiveMaterial;
	readonly collision?: {
		readonly shape: "cuboid";
		readonly friction?: number;
		readonly size?: readonly [number, number, number];
	};
};

export type PrimitiveSceneContentSource = {
	readonly legacyPath: string;
	readonly levelId: string;
	readonly version: number;
	readonly updatedAt: string;
	readonly primitiveNodeCount: number;
	readonly spawnPosition: readonly [number, number, number];
	readonly transformSpace: "world";
};

export type PrimitiveSceneContentData = {
	readonly source: PrimitiveSceneContentSource;
	readonly nodes: readonly PrimitiveSceneNode[];
	readonly collisionSourceIds: readonly string[];
	readonly walkableSourceIds: readonly string[];
};

export type PrimitiveSceneContentIds = {
	readonly meshAssetId: (sourceId: string) => string;
	readonly materialAssetId: (sourceId: string) => string;
	readonly prefabId: (sourceId: string) => string;
	readonly stableId: (sourceId: string) => string;
};

export type PrimitiveSceneContentOptions = {
	readonly tag: string;
	readonly ids: PrimitiveSceneContentIds;
	readonly walkableSourceIds?: readonly string[];
	readonly terrainOwnedSourceIds?: readonly string[];
};

export function createPrimitiveSceneContentIds(options: {
	readonly meshPrefix: string;
	readonly materialPrefix: string;
	readonly prefabPrefix: string;
	readonly stablePrefix: string;
	readonly stripSourcePrefix?: string;
}): PrimitiveSceneContentIds {
	return {
		meshAssetId: (sourceId) =>
			`${options.meshPrefix}_${primitiveKeyForOptions(sourceId, options)}`,
		materialAssetId: (sourceId) =>
			`${options.materialPrefix}_${primitiveKeyForOptions(sourceId, options)}`,
		prefabId: (sourceId) =>
			`${options.prefabPrefix}_${primitiveKeyForOptions(sourceId, options)}`,
		stableId: (sourceId) => `${options.stablePrefix}:${sourceId}`,
	};
}

export function validatePrimitiveSceneContentData(
	data: unknown,
	label: string,
): PrimitiveSceneContentData {
	const root = requireRecord(data, label);
	const source = requireRecord(root.source, `${label}.source`);
	const nodes = requireArray(root.nodes, `${label}.nodes`);
	const collisionSourceIds = requireStringArray(
		root.collisionSourceIds,
		`${label}.collisionSourceIds`,
	);
	const walkableSourceIds = requireStringArray(
		root.walkableSourceIds,
		`${label}.walkableSourceIds`,
	);

	const primitiveNodeCount = requireFiniteNumber(
		source.primitiveNodeCount,
		`${label}.source.primitiveNodeCount`,
	);

	requireString(source.legacyPath, `${label}.source.legacyPath`);
	requireString(source.levelId, `${label}.source.levelId`);
	requireFiniteNumber(source.version, `${label}.source.version`);
	requireString(source.updatedAt, `${label}.source.updatedAt`);
	requireTuple3(source.spawnPosition, `${label}.source.spawnPosition`);

	if (source.transformSpace !== "world") {
		throw new Error(`${label}.source.transformSpace must be "world".`);
	}

	if (primitiveNodeCount !== nodes.length) {
		throw new Error(
			`${label}.source.primitiveNodeCount declares ${primitiveNodeCount}, but ${nodes.length} primitive node(s) were loaded.`,
		);
	}

	const nodeIds = new Set<string>();
	const collisionNodeIds = new Set<string>();

	for (const [index, value] of nodes.entries()) {
		const nodeLabel = `${label}.nodes[${index}]`;
		const node = requireRecord(value, nodeLabel);
		const sourceId = requireString(node.sourceId, `${nodeLabel}.sourceId`);

		if (nodeIds.has(sourceId)) {
			throw new Error(
				`${label} contains duplicate primitive sourceId "${sourceId}".`,
			);
		}

		nodeIds.add(sourceId);
		requireString(node.name, `${nodeLabel}.name`);

		if (node.parentId !== undefined) {
			requireString(node.parentId, `${nodeLabel}.parentId`);
		}

		requireTuple3(node.position, `${nodeLabel}.position`);
		requireTuple3(node.scale, `${nodeLabel}.scale`);

		if (node.rotationEuler !== undefined) {
			requireTuple3(node.rotationEuler, `${nodeLabel}.rotationEuler`);
		}

		const rotation = requireTuple4(node.rotation, `${nodeLabel}.rotation`);
		const rotationLength = Math.hypot(...rotation);

		if (Math.abs(rotationLength - 1) > 0.0001) {
			throw new Error(
				`${nodeLabel}.rotation must be a normalized quaternion; got length ${rotationLength}.`,
			);
		}

		requireBoolean(node.visible, `${nodeLabel}.visible`);
		const geometry = requireString(node.geometry, `${nodeLabel}.geometry`);

		if (!primitiveGeometries.has(geometry)) {
			throw new Error(`${nodeLabel}.geometry "${geometry}" is not supported.`);
		}

		requireNumberArray(node.args, `${nodeLabel}.args`);
		validatePrimitiveMaterial(node.material, `${nodeLabel}.material`);

		if (node.collision !== undefined) {
			validatePrimitiveCollision(node.collision, `${nodeLabel}.collision`);
			collisionNodeIds.add(sourceId);
		}
	}

	const collisionIds = uniqueStringSet(
		collisionSourceIds,
		`${label}.collisionSourceIds`,
	);
	const walkableIds = uniqueStringSet(
		walkableSourceIds,
		`${label}.walkableSourceIds`,
	);

	for (const sourceId of collisionIds) {
		if (!nodeIds.has(sourceId)) {
			throw new Error(
				`${label}.collisionSourceIds references missing primitive sourceId "${sourceId}".`,
			);
		}

		if (!collisionNodeIds.has(sourceId)) {
			throw new Error(
				`${label}.collisionSourceIds references "${sourceId}", but that primitive has no collision data.`,
			);
		}
	}

	for (const sourceId of collisionNodeIds) {
		if (!collisionIds.has(sourceId)) {
			throw new Error(
				`${label} primitive "${sourceId}" declares collision but is missing from collisionSourceIds.`,
			);
		}
	}

	for (const sourceId of walkableIds) {
		if (!collisionIds.has(sourceId)) {
			throw new Error(
				`${label}.walkableSourceIds references "${sourceId}", but walkable primitives must also be collision primitives.`,
			);
		}
	}

	return data as PrimitiveSceneContentData;
}

export function createPrimitiveMeshAssets(
	nodes: readonly PrimitiveSceneNode[],
	options: PrimitiveSceneContentOptions,
): readonly AssetManifestEntry[] {
	return nodes.map((node) => ({
		id: options.ids.meshAssetId(node.sourceId),
		kind: "mesh",
		url: primitiveMeshUrl(node),
		tags: [
			options.tag,
			"primitive",
			node.geometry,
			...(node.collision ? ["collision"] : []),
			...(isPrimitiveWalkable(node.sourceId, options) ? ["walkable"] : []),
		],
	}));
}

export function createPrimitiveMaterialAssets(
	nodes: readonly PrimitiveSceneNode[],
	options: PrimitiveSceneContentOptions,
): readonly AssetManifestEntry[] {
	return nodes.map((node) => ({
		id: options.ids.materialAssetId(node.sourceId),
		kind: "material",
		url: `builtin://primitive-material/${primitiveKey(node.sourceId)}`,
		material: node.material,
		tags: [options.tag, "primitive", "material"],
	}));
}

export function createPrimitivePrefabs(
	nodes: readonly PrimitiveSceneNode[],
	options: PrimitiveSceneContentOptions,
): readonly PrefabDefinition[] {
	return nodes.map((node) => {
		const components: Record<string, unknown> = {
			Transform: {
				position: [0, 0, 0],
				rotation: [0, 0, 0, 1],
				scale: primitiveRenderScale(node),
			},
			Renderable: {
				meshId: options.ids.meshAssetId(node.sourceId),
				materialId: options.ids.materialAssetId(node.sourceId),
				visible: node.visible,
			},
		};

		const terrainOwned = isPrimitiveTerrainOwned(node.sourceId, options);

		if (node.collision && !terrainOwned) {
			components.RigidBody = {
				type: "fixed",
				mass: 0,
			};
			components.Collider = {
				intent: isPrimitiveWalkable(node.sourceId, options)
					? "walkable"
					: "solid",
				channel: "worldStatic",
				shape: primitiveColliderShape(node),
			};
		}

		return {
			id: options.ids.prefabId(node.sourceId),
			assetIds: [
				options.ids.meshAssetId(node.sourceId),
				options.ids.materialAssetId(node.sourceId),
			],
			tags: [
				"world",
				options.tag,
				"primitive",
				node.geometry,
				...(node.collision ? ["collision"] : []),
				...(isPrimitiveWalkable(node.sourceId, options) ? ["walkable"] : []),
				...(terrainOwned ? ["terrain"] : []),
			],
			components,
		};
	});
}

export function createPrimitiveInstances(
	nodes: readonly PrimitiveSceneNode[],
	options: PrimitiveSceneContentOptions,
): readonly LevelPrefabInstance[] {
	return nodes.map((node) => ({
		id: node.sourceId,
		prefabId: options.ids.prefabId(node.sourceId),
		stableId: options.ids.stableId(node.sourceId),
		transform: {
			position: node.position,
			rotation: node.rotation,
		},
	}));
}

export function primitiveKey(sourceId: string): string {
	return sourceId.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function primitiveKeyForOptions(
	sourceId: string,
	options: {
		readonly stripSourcePrefix?: string;
	},
): string {
	const stripped = options.stripSourcePrefix
		? sourceId.replace(
				new RegExp(`^${escapeRegExp(options.stripSourcePrefix)}`),
				"",
			)
		: sourceId;

	return primitiveKey(stripped);
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function primitiveMeshUrl(node: PrimitiveSceneNode): string {
	const [a = 1, b = 1, c = 1, d = 16] = node.args;

	if (node.geometry === "box") {
		return "builtin://box";
	}

	if (node.geometry === "cylinder") {
		return `builtin://cylinder?radiusTop=${a}&radiusBottom=${b}&height=${c}&radialSegments=${Math.max(3, Math.round(d))}`;
	}

	if (node.geometry === "torus") {
		return `builtin://torus?radius=${a}&tube=${b}&radialSegments=${Math.max(3, Math.round(c))}&tubularSegments=${Math.max(3, Math.round(d))}`;
	}

	if (node.geometry === "icosahedron") {
		return `builtin://icosahedron?radius=${a}&detail=${Math.max(0, Math.round(b))}`;
	}

	return `builtin://dodecahedron?radius=${a}&detail=${Math.max(0, Math.round(b))}`;
}

function primitiveRenderScale(
	node: PrimitiveSceneNode,
): readonly [number, number, number] {
	if (node.geometry === "box") {
		return [
			positiveArg(node.args[0]) * node.scale[0],
			positiveArg(node.args[1]) * node.scale[1],
			positiveArg(node.args[2]) * node.scale[2],
		];
	}

	return node.scale;
}

function primitiveColliderShape(
	node: PrimitiveSceneNode,
): Record<string, unknown> {
	const [scaleX, scaleY, scaleZ] = node.scale;
	const [width, height, depth] = primitiveCuboidCollisionSize(node);

	// Primitive scene migrations currently admit only explicit cuboid collision.
	// Render geometry may vary, but it must not select gameplay collider type.
	return {
		type: "box",
		halfExtents: [
			(width * scaleX) / 2,
			(height * scaleY) / 2,
			(depth * scaleZ) / 2,
		],
	};
}

function primitiveCuboidCollisionSize(
	node: PrimitiveSceneNode,
): readonly [number, number, number] {
	if (node.collision?.size) {
		return [
			positiveArg(node.collision.size[0]),
			positiveArg(node.collision.size[1]),
			positiveArg(node.collision.size[2]),
		];
	}

	const [a = 1, b = 1, c = 1] = node.args;

	if (node.geometry === "box") {
		return [positiveArg(a), positiveArg(b), positiveArg(c)];
	}

	if (node.geometry === "cylinder") {
		const diameter = Math.max(positiveArg(a), positiveArg(b)) * 2;
		return [diameter, positiveArg(c), diameter];
	}

	if (node.geometry === "torus") {
		const diameter = (positiveArg(a) + positiveArg(b)) * 2;
		return [diameter, positiveArg(b) * 2, diameter];
	}

	const diameter = positiveArg(a) * 2;
	return [diameter, diameter, diameter];
}

function isPrimitiveWalkable(
	sourceId: string,
	options: PrimitiveSceneContentOptions,
): boolean {
	return (options.walkableSourceIds ?? []).includes(sourceId);
}

function isPrimitiveTerrainOwned(
	sourceId: string,
	options: PrimitiveSceneContentOptions,
): boolean {
	return (options.terrainOwnedSourceIds ?? []).includes(sourceId);
}

function positiveArg(value: number | undefined): number {
	return Number.isFinite(value) && value !== undefined && value > 0 ? value : 1;
}

function validatePrimitiveMaterial(value: unknown, label: string): void {
	const material = requireRecord(value, label);

	requireString(material.color, `${label}.color`);
	requireString(material.emissive, `${label}.emissive`);
	requireFiniteNumber(material.emissiveIntensity, `${label}.emissiveIntensity`);
	requireFiniteNumber(material.metalness, `${label}.metalness`);
	requireFiniteNumber(material.roughness, `${label}.roughness`);

	if (material.transparent !== undefined) {
		requireBoolean(material.transparent, `${label}.transparent`);
	}

	if (material.opacity !== undefined) {
		requireFiniteNumber(material.opacity, `${label}.opacity`);
	}
}

function validatePrimitiveCollision(value: unknown, label: string): void {
	const collision = requireRecord(value, label);

	if (collision.shape !== "cuboid") {
		throw new Error(`${label}.shape must be "cuboid".`);
	}

	if (collision.friction !== undefined) {
		requireFiniteNumber(collision.friction, `${label}.friction`);
	}

	if (collision.size !== undefined) {
		requireTuple3(collision.size, `${label}.size`);
	}
}

function uniqueStringSet(
	values: readonly string[],
	label: string,
): Set<string> {
	const set = new Set<string>();

	for (const value of values) {
		if (set.has(value)) {
			throw new Error(`${label} contains duplicate sourceId "${value}".`);
		}

		set.add(value);
	}

	return set;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`${label} must be an object.`);
	}

	return value as Record<string, unknown>;
}

function requireArray(value: unknown, label: string): readonly unknown[] {
	if (!Array.isArray(value)) {
		throw new Error(`${label} must be an array.`);
	}

	return value;
}

function requireString(value: unknown, label: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`${label} must be a non-empty string.`);
	}

	return value;
}

function requireBoolean(value: unknown, label: string): boolean {
	if (typeof value !== "boolean") {
		throw new Error(`${label} must be a boolean.`);
	}

	return value;
}

function requireFiniteNumber(value: unknown, label: string): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new Error(`${label} must be a finite number.`);
	}

	return value;
}

function requireStringArray(value: unknown, label: string): readonly string[] {
	const array = requireArray(value, label);

	for (const [index, item] of array.entries()) {
		requireString(item, `${label}[${index}]`);
	}

	return array as readonly string[];
}

function requireNumberArray(value: unknown, label: string): readonly number[] {
	const array = requireArray(value, label);

	for (const [index, item] of array.entries()) {
		requireFiniteNumber(item, `${label}[${index}]`);
	}

	return array as readonly number[];
}

function requireTuple3(
	value: unknown,
	label: string,
): readonly [number, number, number] {
	return requireNumberTuple(value, label, 3) as readonly [
		number,
		number,
		number,
	];
}

function requireTuple4(
	value: unknown,
	label: string,
): readonly [number, number, number, number] {
	return requireNumberTuple(value, label, 4) as readonly [
		number,
		number,
		number,
		number,
	];
}

function requireNumberTuple(
	value: unknown,
	label: string,
	length: number,
): readonly number[] {
	const array = requireNumberArray(value, label);

	if (array.length !== length) {
		throw new Error(`${label} must contain exactly ${length} number(s).`);
	}

	return array;
}
