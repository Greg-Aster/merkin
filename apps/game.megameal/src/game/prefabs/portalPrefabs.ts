import { playerPrefab } from "./defaultPrefabs.js";
import type { PrefabDefinition } from "./index.js";
import { portalGatePrefab } from "./navigationPrefabs.js";

export const portalArenaFloorPrefab = {
	id: "portal_arena_floor",
	assetIds: ["mesh_portal_field"],
	tags: ["world", "collision", "portal-arena"],
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
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: {
			intent: "solid",
			channel: "world",
			shape: {
				type: "box",
				halfExtents: [2600, 0.05, 2600],
			},
		},
	},
} satisfies PrefabDefinition;

export const portalArenaPrefabs = [
	playerPrefab,
	portalArenaFloorPrefab,
	portalGatePrefab,
] as const;
