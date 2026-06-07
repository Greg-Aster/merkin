import { getCollisionPrefabCollider } from "../generated/observatoryCollisionRuntime.js";
import { playerPrefab } from "./defaultPrefabs.js";
import type { PrefabDefinition } from "./index.js";
import { lakeWaterSurfacePrefab } from "./waterPrefabs.js";

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

export const observatoryWalkableMeshPrefab = {
	id: "observatory_walkable_mesh",
	tags: ["world", "collision", "walkable", "mesh", "observatory"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: getCollisionPrefabCollider("observatory_walkable_mesh"),
	},
} satisfies PrefabDefinition;

export const observatoryBoundaryBlockerPrefab = {
	id: "observatory_boundary_blocker",
	tags: ["world", "collision", "blocker", "observatory"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: {
			intent: "solid",
			channel: "worldStatic",
			shape: {
				type: "box",
				halfExtents: [1, 1, 1],
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
	observatoryBoundaryBlockerPrefab,
	observatoryEnvironmentPrefab,
	observatoryWalkableMeshPrefab,
	lakeWaterSurfacePrefab,
	observatoryFireflyMarkerPrefab,
] as const;
