import type {
	LevelPrefabInstanceData,
	TerrainBoundsData,
	TerrainChunkPackageData,
	TerrainChunkStreamingPolicyData,
	TerrainMaterialSetData,
	TerrainVisualBindingData,
} from "../../engine/data/index.js";
import type { PrimitiveSceneNode } from "../content/primitiveSceneContent.js";
import {
	yggdrasilPrimitiveContentOptions,
	yggdrasilPrimitiveNodes,
	yggdrasilPrimitiveWalkableSourceIds,
} from "../content/yggdrasilPrimitiveParity.js";
import { collisionRuntimeModule } from "../generated/observatoryCollisionRuntime.js";
import {
	type ExistingTerrainChunkSource,
	type TerrainRuntimeSceneData,
	createTerrainRuntimeSceneData,
} from "./index.js";

export const terrainRuntimeSceneIds = [
	"portal_arena_runtime",
	"prototype_arena_runtime",
	"miranda_deck_runtime",
	"observatory_runtime",
	"sci_fi_room_runtime",
	"solitude_runtime",
	"yggdrasil_runtime",
] as const;

export type TerrainRuntimeSceneId = (typeof terrainRuntimeSceneIds)[number];

export const yggdrasilTerrainPackageId =
	"yggdrasil_runtime:terrain-package" as const;

const defaultStreamingPolicy = {
	startupRadiusMeters: 36,
	activeCollisionRadiusMeters: 48,
	nearVisualRadiusMeters: 96,
	farVisualRadiusMeters: 192,
	unloadRadiusMeters: 240,
	hysteresisMeters: 16,
	maxChunkOperationsPerTick: 4,
} as const satisfies TerrainChunkStreamingPolicyData;

export const terrainRuntimeScenes = {
	portal_arena_runtime: createTerrainRuntimeSceneData({
		runtimeSceneId: "portal_arena_runtime",
		sourceManifestId: "portal_arena_terrain_v1",
		packageId: "portal_arena_runtime:terrain-package",
		policy: defaultStreamingPolicy,
		materialSets: [
			materialSet("portal-arena-field", "material_portal_arena_field"),
		],
		boxSurfaces: [
			{
				id: "portal-arena-field",
				stableId: "portal-arena:terrain:field",
				groupId: "field",
				bounds: bounds([-360, -0.1, -360], [360, 0, 360]),
				meshId: "mesh_portal_field",
				materialSetId: "portal-arena-field",
				materialLayerIds: ["base"],
				chunkSizeMeters: 120,
				visualMode: "merged-binding",
				visualBinding: {
					id: "portal-arena-field-visual",
					stableId: "portal-arena:floor",
					prefabId: "portal_arena_floor",
				},
			},
		],
	}),
	prototype_arena_runtime: createTerrainRuntimeSceneData({
		runtimeSceneId: "prototype_arena_runtime",
		sourceManifestId: "prototype_arena_terrain_v1",
		packageId: "prototype_arena_runtime:terrain-package",
		policy: defaultStreamingPolicy,
		materialSets: [
			materialSet("prototype-arena-floor", "material_arena_floor"),
		],
		boxSurfaces: [
			{
				id: "prototype-arena-floor",
				stableId: "arena:floor",
				groupId: "floor",
				bounds: bounds([-7, -0.1, -5], [7, 0, 5]),
				meshId: "mesh_arena_floor",
				materialId: "material_arena_floor",
				materialSetId: "prototype-arena-floor",
				materialLayerIds: ["base"],
				chunkSizeMeters: 12,
				visualMode: "chunked",
			},
		],
	}),
	miranda_deck_runtime: createTerrainRuntimeSceneData({
		runtimeSceneId: "miranda_deck_runtime",
		sourceManifestId: "miranda_deck_terrain_v1",
		packageId: "miranda_deck_runtime:terrain-package",
		policy: defaultStreamingPolicy,
		startupCenter: [0, 4.25, -13.8],
		materialSets: [
			materialSet("miranda-main-floor", "material_miranda_floor_main"),
			materialSet("miranda-upper-floor", "material_miranda_floor_upper"),
		],
		boxSurfaces: [
			{
				id: "miranda-main-floor",
				stableId: "miranda:terrain:main",
				groupId: "main",
				bounds: bounds([-20, 2.75, -50], [20, 3.95, 42]),
				meshId: "mesh_box",
				materialId: "material_miranda_floor_main",
				materialSetId: "miranda-main-floor",
				materialLayerIds: ["base"],
				chunkSizeMeters: 12,
				visualMode: "chunked",
			},
			{
				id: "miranda-upper-floor",
				stableId: "miranda:terrain:upper",
				groupId: "upper",
				bounds: bounds([-9, 4.25, -36.5], [9, 5.15, -18.5]),
				meshId: "mesh_box",
				materialId: "material_miranda_floor_upper",
				materialSetId: "miranda-upper-floor",
				materialLayerIds: ["base"],
				chunkSizeMeters: 12,
				visualMode: "chunked",
			},
			{
				id: "miranda-cargo-hold-floor",
				stableId: "miranda:terrain:cargo-hold",
				groupId: "cargo-hold",
				bounds: bounds([-20, 2.75, 42], [20, 3.95, 48]),
				meshId: "mesh_box",
				materialId: "material_miranda_floor_main",
				materialSetId: "miranda-main-floor",
				materialLayerIds: ["base"],
				chunkSizeMeters: 12,
				visualMode: "chunked",
			},
		],
	}),
	observatory_runtime: createTerrainRuntimeSceneData({
		runtimeSceneId: "observatory_runtime",
		sourceManifestId: "observatory_terrain_v1",
		packageId: "observatory_runtime:terrain-package",
		policy: defaultStreamingPolicy,
		startupCenter: [-137.2, 0.43, -49.5],
		materialSets: [
			materialSet("observatory-terrain", "material_observatory_terrain"),
		],
		existingChunks: observatoryTerrainChunks(),
		existingVisualBindings: [
			{
				id: "observatory-terrain-visual",
				stableId: "observatory:terrain",
				prefabId: "observatory_environment",
				bounds: bounds([-190, -8, -190], [190, 24, 190]),
				sourceChunkStableIds: observatoryWalkableStableIds(),
				lod: "merged-floor",
			},
		],
	}),
	sci_fi_room_runtime: createTerrainRuntimeSceneData({
		runtimeSceneId: "sci_fi_room_runtime",
		sourceManifestId: "sci_fi_room_terrain_v1",
		packageId: "sci_fi_room_runtime:terrain-package",
		policy: defaultStreamingPolicy,
		materialSets: [
			materialSet(
				"sci-fi-room-interior",
				"material_sci_fi_room_interior_floor",
			),
			materialSet(
				"sci-fi-room-courtyard",
				"material_sci_fi_room_courtyard_floor",
			),
			materialSet(
				"sci-fi-room-wasteland",
				"material_sci_fi_room_wasteland_floor",
			),
		],
		boxSurfaces: [
			{
				id: "sci-fi-room-interior",
				stableId: "sci-fi-room:terrain:interior",
				groupId: "interior",
				bounds: bounds([-10.78, -0.8, -9.26], [10.78, -0.32, 9.26]),
				meshId: "mesh_sci_fi_room_floor_slab",
				materialId: "material_sci_fi_room_interior_floor",
				materialSetId: "sci-fi-room-interior",
				materialLayerIds: ["base"],
				chunkSizeMeters: 12,
				visualMode: "chunked",
			},
			{
				id: "sci-fi-room-courtyard",
				stableId: "sci-fi-room:terrain:courtyard",
				groupId: "courtyard",
				bounds: bounds([-12.936, -0.8, 8.584], [12.936, -0.32, 34.456]),
				meshId: "mesh_sci_fi_room_floor_slab",
				materialId: "material_sci_fi_room_courtyard_floor",
				materialSetId: "sci-fi-room-courtyard",
				materialLayerIds: ["base"],
				chunkSizeMeters: 12,
				visualMode: "chunked",
			},
			{
				id: "sci-fi-room-wasteland",
				stableId: "sci-fi-room:terrain:wasteland",
				groupId: "wasteland",
				bounds: bounds(
					[-100.9345, -0.998, -100.5315],
					[101.0605, -0.614, 104.0035],
				),
				meshId: "mesh_sci_fi_room_floor_slab",
				materialId: "material_sci_fi_room_wasteland_floor",
				materialSetId: "sci-fi-room-wasteland",
				materialLayerIds: ["base"],
				chunkSizeMeters: 24,
				visualMode: "chunked",
			},
		],
	}),
	solitude_runtime: createTerrainRuntimeSceneData({
		runtimeSceneId: "solitude_runtime",
		sourceManifestId: "solitude_terrain_v1",
		packageId: "solitude_runtime:terrain-package",
		policy: defaultStreamingPolicy,
		materialSets: [
			materialSet("solitude-plateau", "material_solitude_plateau"),
			materialSet("solitude-dais", "material_solitude_dais"),
		],
		boxSurfaces: [
			{
				id: "solitude-plateau",
				stableId: "solitude:terrain:plateau",
				groupId: "plateau",
				bounds: bounds(
					[-64.22745081247726, -0.72, -66.22078008078935],
					[64.22745081247726, 0, 66.22078008078935],
				),
				meshId: "mesh_solitude_ground_plateau",
				materialId: "material_solitude_plateau",
				materialSetId: "solitude-plateau",
				materialLayerIds: ["base"],
				chunkSizeMeters: 24,
				visualMode: "chunked",
			},
			{
				id: "solitude-dais",
				stableId: "solitude:terrain:dais",
				groupId: "dais",
				bounds: bounds(
					[-11.624957727426446, 0, -10.969129441473253],
					[11.624957727426446, 0.32, 11.43025152168249],
				),
				meshId: "mesh_solitude_ground_dais",
				materialId: "material_solitude_dais",
				materialSetId: "solitude-dais",
				materialLayerIds: ["base"],
				chunkSizeMeters: 12,
				visualMode: "chunked",
			},
		],
	}),
	yggdrasil_runtime: createTerrainRuntimeSceneData({
		runtimeSceneId: "yggdrasil_runtime",
		sourceManifestId: "yggdrasil_terrain_v1",
		packageId: yggdrasilTerrainPackageId,
		policy: defaultStreamingPolicy,
		startupCenter: [0, 3.2, -104],
		materialSets: [
			materialSet("yggdrasil-primitive-terrain", "material_water_surface"),
		],
		existingChunks: yggdrasilTerrainChunks(),
		existingVisualBindings: yggdrasilTerrainVisualBindings(),
	}),
} as const satisfies Record<TerrainRuntimeSceneId, TerrainRuntimeSceneData>;

export function getTerrainRuntimeSceneData(
	runtimeSceneId: string,
): TerrainRuntimeSceneData | undefined {
	return terrainRuntimeScenes[runtimeSceneId as TerrainRuntimeSceneId];
}

export function terrainLevelInstancesForRuntimeScene(
	runtimeSceneId: string,
): readonly LevelPrefabInstanceData[] {
	return getTerrainRuntimeSceneData(runtimeSceneId)?.levelInstances ?? [];
}

export function terrainPackagesForRuntimeScene(
	runtimeSceneId: string,
): readonly TerrainChunkPackageData[] {
	return getTerrainRuntimeSceneData(runtimeSceneId)?.terrainPackages ?? [];
}

export function terrainReadinessForRuntimeScene(runtimeSceneId: string): {
	readonly requiredTerrainPackageIds?: readonly string[];
} {
	return getTerrainRuntimeSceneData(runtimeSceneId)?.readiness ?? {};
}

function observatoryTerrainChunks(): readonly ExistingTerrainChunkSource[] {
	return collisionRuntimeModule.levelInstances
		.filter((entry) =>
			entry.stableId.startsWith("observatory:walkable-mesh:chunk:"),
		)
		.map((entry) => {
			const colliderComponent =
				entry.colliderComponent ??
				collisionRuntimeModule.prefabColliders.find(
					(prefab) => prefab.prefabId === entry.prefabId,
				)?.colliderComponent;

			if (!colliderComponent) {
				throw new Error(
					`Observatory terrain chunk "${entry.stableId}" is missing collider data.`,
				);
			}

			return {
				id: entry.id,
				stableId: entry.stableId,
				groupId: "walkable-mesh",
				chunkKey: observatoryChunkKey(entry.stableId),
				bounds: colliderBounds(colliderComponent),
				transformPosition: [0, 0, 0],
				colliderComponent,
				materialSetId: "observatory-terrain",
				materialLayerIds: ["base"],
			};
		});
}

function observatoryWalkableStableIds(): readonly string[] {
	return collisionRuntimeModule.levelInstances
		.map((entry) => entry.stableId)
		.filter((stableId) =>
			stableId.startsWith("observatory:walkable-mesh:chunk:"),
		)
		.sort();
}

function observatoryChunkKey(stableId: string): readonly [number, number] {
	const match = /:x(\d+)-z(\d+)$/.exec(stableId);

	if (!match) {
		throw new Error(
			`Invalid Observatory terrain chunk stable ID "${stableId}".`,
		);
	}

	return [Number(match[1]), Number(match[2])];
}

function yggdrasilTerrainChunks(): readonly ExistingTerrainChunkSource[] {
	const walkableIds = new Set(yggdrasilPrimitiveWalkableSourceIds);

	return yggdrasilPrimitiveNodes
		.filter((node) => walkableIds.has(node.sourceId))
		.map((node, index) => {
			const stableId = yggdrasilPrimitiveContentOptions.ids.stableId(
				node.sourceId,
			);

			return {
				id: `${node.sourceId}-terrain-chunk`,
				stableId,
				groupId: "primitive-terrain",
				chunkKey: [index, 0],
				bounds: primitiveBounds(node),
				colliderComponent: {
					intent: "walkable",
					channel: "worldStatic",
					shape: {
						type: "box",
						halfExtents: primitiveHalfExtents(node),
					},
				},
				materialSetId: "yggdrasil-primitive-terrain",
				materialLayerIds: ["base"],
			};
		});
}

function yggdrasilTerrainVisualBindings(): readonly TerrainVisualBindingData[] {
	const walkableIds = new Set(yggdrasilPrimitiveWalkableSourceIds);

	return yggdrasilPrimitiveNodes
		.filter((node) => walkableIds.has(node.sourceId))
		.map((node) => ({
			id: `${node.sourceId}-terrain-visual`,
			stableId: yggdrasilPrimitiveContentOptions.ids.stableId(node.sourceId),
			prefabId: yggdrasilPrimitiveContentOptions.ids.prefabId(node.sourceId),
			bounds: primitiveBounds(node),
			sourceChunkStableIds: [
				yggdrasilPrimitiveContentOptions.ids.stableId(node.sourceId),
			],
			lod: "near",
		}));
}

function materialSet(
	id: string,
	fallbackMaterialAssetId: string,
): TerrainMaterialSetData {
	return {
		id,
		blendMode: "single",
		fallbackMaterialAssetId,
		layers: [
			{
				id: "base",
				materialAssetId: fallbackMaterialAssetId,
				uvScale: [1, 1],
			},
		],
	};
}

function bounds(
	min: readonly [number, number, number],
	max: readonly [number, number, number],
): TerrainBoundsData {
	return { min, max };
}

function colliderBounds(collider: Record<string, unknown>): TerrainBoundsData {
	const shape = collider.shape as
		| {
				readonly type: "mesh";
				readonly vertices: readonly (readonly [number, number, number])[];
		  }
		| {
				readonly type: "box";
				readonly halfExtents: readonly [number, number, number];
		  };

	if (shape.type === "mesh") {
		const xs = shape.vertices.map((vertex) => vertex[0]);
		const ys = shape.vertices.map((vertex) => vertex[1]);
		const zs = shape.vertices.map((vertex) => vertex[2]);

		return bounds(
			[Math.min(...xs), Math.min(...ys), Math.min(...zs)],
			[Math.max(...xs), Math.max(...ys), Math.max(...zs)],
		);
	}

	if (shape.type === "box") {
		const [x, y, z] = shape.halfExtents;
		return bounds([-x, -y, -z], [x, y, z]);
	}

	throw new Error("Unsupported terrain collider shape.");
}

function primitiveBounds(node: PrimitiveSceneNode): TerrainBoundsData {
	const [halfX, halfY, halfZ] = primitiveHalfExtents(node);
	const [x, y, z] = node.position;

	return bounds(
		[x - halfX, y - halfY, z - halfZ],
		[x + halfX, y + halfY, z + halfZ],
	);
}

function primitiveHalfExtents(
	node: PrimitiveSceneNode,
): readonly [number, number, number] {
	const [width, height, depth] = primitiveCollisionSize(node);
	const [scaleX, scaleY, scaleZ] = node.scale;

	return [(width * scaleX) / 2, (height * scaleY) / 2, (depth * scaleZ) / 2];
}

function primitiveCollisionSize(
	node: PrimitiveSceneNode,
): readonly [number, number, number] {
	if (node.collision?.size) {
		return node.collision.size;
	}

	const [a = 1, b = 1, c = 1] = node.args;

	if (node.geometry === "box") {
		return [positive(a), positive(b), positive(c)];
	}

	if (node.geometry === "cylinder") {
		const diameter = Math.max(positive(a), positive(b)) * 2;
		return [diameter, positive(c), diameter];
	}

	if (node.geometry === "torus") {
		const diameter = (positive(a) + positive(b)) * 2;
		return [diameter, positive(b) * 2, diameter];
	}

	const diameter = positive(a) * 2;
	return [diameter, diameter, diameter];
}

function positive(value: number | undefined): number {
	return Number.isFinite(value) && value !== undefined && value > 0 ? value : 1;
}
