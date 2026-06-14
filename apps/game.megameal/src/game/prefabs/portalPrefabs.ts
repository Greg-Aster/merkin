import { playerPrefab } from "./defaultPrefabs.js";
import type { PrefabDefinition } from "./index.js";
import { portalGatePrefab } from "./navigationPrefabs.js";
import { terrainChunkCellPrefab } from "./terrainPrefabs.js";

export const portalArenaFloorPrefab = {
	id: "portal_arena_floor",
	assetIds: ["mesh_portal_field"],
	tags: ["world", "terrain", "portal-arena"],
	components: {
		Transform: {
			position: [0, -0.05, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		},
		Renderable: {
			meshId: "mesh_portal_field",
			visible: true,
		},
	},
} satisfies PrefabDefinition;

export const portalArenaPrefabs = [
	playerPrefab,
	terrainChunkCellPrefab,
	portalArenaFloorPrefab,
	portalGatePrefab,
] as const;
