import { playerPrefab } from "./defaultPrefabs.js";
import type { PrefabDefinition } from "./index.js";
import { portalGatePrefab } from "./navigationPrefabs.js";
import { terrainChunkCellPrefab } from "./terrainPrefabs.js";

export const sciFiRoomInteriorFloorPrefab = {
	id: "sci_fi_room_floor_interior",
	assetIds: [
		"mesh_sci_fi_room_floor_slab",
		"material_sci_fi_room_interior_floor",
	],
	tags: ["world", "collision", "walkable", "sci-fi-room"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [21.56, 0.48, 18.52],
		},
		Renderable: {
			meshId: "mesh_sci_fi_room_floor_slab",
			materialId: "material_sci_fi_room_interior_floor",
			visible: true,
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: {
			intent: "walkable",
			channel: "worldStatic",
			shape: {
				type: "box",
				halfExtents: [10.78, 0.24, 9.26],
			},
		},
	},
} satisfies PrefabDefinition;

export const sciFiRoomCourtyardFloorPrefab = {
	id: "sci_fi_room_floor_courtyard",
	assetIds: [
		"mesh_sci_fi_room_floor_slab",
		"material_sci_fi_room_courtyard_floor",
	],
	tags: ["world", "collision", "walkable", "sci-fi-room"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [25.872, 0.48, 25.872],
		},
		Renderable: {
			meshId: "mesh_sci_fi_room_floor_slab",
			materialId: "material_sci_fi_room_courtyard_floor",
			visible: true,
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: {
			intent: "walkable",
			channel: "worldStatic",
			shape: {
				type: "box",
				halfExtents: [12.936, 0.24, 12.936],
			},
		},
	},
} satisfies PrefabDefinition;

export const sciFiRoomWastelandFloorPrefab = {
	id: "sci_fi_room_floor_wasteland",
	assetIds: [
		"mesh_sci_fi_room_floor_slab",
		"material_sci_fi_room_wasteland_floor",
	],
	tags: ["world", "collision", "walkable", "sci-fi-room"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [201.995, 0.384, 204.535],
		},
		Renderable: {
			meshId: "mesh_sci_fi_room_floor_slab",
			materialId: "material_sci_fi_room_wasteland_floor",
			visible: true,
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: {
			intent: "walkable",
			channel: "worldStatic",
			shape: {
				type: "box",
				halfExtents: [100.9975, 0.192, 102.2675],
			},
		},
	},
} satisfies PrefabDefinition;

export const sciFiRoomConsolePrefab = {
	id: "sci_fi_room_console",
	assetIds: ["mesh_sci_fi_room_console", "material_sci_fi_room_console"],
	tags: ["world", "collision", "sci-fi-room", "console"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [2.4, 1.1, 1.2],
		},
		Renderable: {
			meshId: "mesh_sci_fi_room_console",
			materialId: "material_sci_fi_room_console",
			visible: true,
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
				halfExtents: [1.2, 0.55, 0.6],
			},
		},
	},
} satisfies PrefabDefinition;

export const sciFiRoomColumnPrefab = {
	id: "sci_fi_room_column",
	assetIds: ["mesh_sci_fi_room_column", "material_sci_fi_room_wall_panel"],
	tags: ["world", "collision", "sci-fi-room", "support"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		},
		Renderable: {
			meshId: "mesh_sci_fi_room_column",
			materialId: "material_sci_fi_room_wall_panel",
			visible: true,
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
				halfExtents: [0.65, 2, 0.65],
			},
		},
	},
} satisfies PrefabDefinition;

export const sciFiRoomAnomalyMarkerPrefab = {
	id: "sci_fi_room_anomaly_marker",
	assetIds: ["mesh_sci_fi_room_anomaly_marker", "material_sci_fi_room_anomaly"],
	tags: ["world", "sci-fi-room", "set-dressing"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		},
		Renderable: {
			meshId: "mesh_sci_fi_room_anomaly_marker",
			materialId: "material_sci_fi_room_anomaly",
			visible: true,
		},
	},
} satisfies PrefabDefinition;

export const sciFiRoomStoryMarkerPrefab = {
	id: "sci_fi_room_story_marker",
	assetIds: [
		"mesh_sci_fi_room_story_marker",
		"material_sci_fi_room_story_marker",
	],
	tags: ["interaction", "story-note", "sci-fi-room"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		},
		Renderable: {
			meshId: "mesh_sci_fi_room_story_marker",
			materialId: "material_sci_fi_room_story_marker",
			visible: true,
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: {
			intent: "trigger",
			channel: "interaction",
			sensor: true,
			shape: {
				type: "box",
				halfExtents: [0.45, 0.7, 0.45],
			},
		},
	},
} satisfies PrefabDefinition;

export const sciFiRoomPrefabs = [
	playerPrefab,
	portalGatePrefab,
	terrainChunkCellPrefab,
	sciFiRoomInteriorFloorPrefab,
	sciFiRoomCourtyardFloorPrefab,
	sciFiRoomWastelandFloorPrefab,
	sciFiRoomConsolePrefab,
	sciFiRoomColumnPrefab,
	sciFiRoomAnomalyMarkerPrefab,
	sciFiRoomStoryMarkerPrefab,
] as const;
