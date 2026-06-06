import { playerPrefab } from "./defaultPrefabs.js";
import type { PrefabDefinition } from "./index.js";
import { waterSurfacePlanePrefab } from "./waterPrefabs.js";

export const observatoryEnvironmentPrefab = {
	id: "observatory_environment",
	assetIds: ["mesh_observatory_environment"],
	tags: ["world", "terrain", "observatory"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		},
		Renderable: {
			meshId: "mesh_observatory_environment",
			visible: true,
		},
	},
} satisfies PrefabDefinition;

export const observatoryWalkableProxyPrefab = {
	id: "observatory_walkable_proxy",
	tags: ["world", "collision", "observatory"],
	components: {
		Transform: {
			position: [0, 1.75, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
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
				halfExtents: [320, 0.05, 320],
			},
		},
	},
} satisfies PrefabDefinition;

export const observatoryFireflyMarkerPrefab = {
	id: "observatory_firefly_marker",
	assetIds: ["mesh_observatory_firefly_marker", "material_observatory_firefly"],
	tags: ["world", "light", "firefly", "observatory"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		},
		Renderable: {
			meshId: "mesh_observatory_firefly_marker",
			materialId: "material_observatory_firefly",
			visible: true,
		},
		Light: {
			kind: "point",
			color: "#f4ffb8",
			intensity: 8,
			distance: 34,
			decay: 1.6,
			visible: true,
		},
	},
} satisfies PrefabDefinition;

export const observatoryPrefabs = [
	playerPrefab,
	observatoryEnvironmentPrefab,
	observatoryWalkableProxyPrefab,
	waterSurfacePlanePrefab,
	observatoryFireflyMarkerPrefab,
] as const;
