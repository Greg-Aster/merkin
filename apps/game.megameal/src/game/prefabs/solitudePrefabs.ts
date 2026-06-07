import { playerPrefab } from "./defaultPrefabs.js";
import type { PrefabDefinition } from "./index.js";
import { portalGatePrefab } from "./navigationPrefabs.js";

export const solitudePlateauPrefab = {
	id: "solitude_ground_plateau",
	assetIds: ["mesh_solitude_ground_plateau", "material_solitude_plateau"],
	tags: ["world", "collision", "walkable", "solitude", "plateau"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [240, 0.72, 240],
		},
		Renderable: {
			meshId: "mesh_solitude_ground_plateau",
			materialId: "material_solitude_plateau",
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
				halfExtents: [120, 0.36, 120],
			},
		},
	},
} satisfies PrefabDefinition;

export const solitudeDaisPrefab = {
	id: "solitude_ground_dais",
	assetIds: ["mesh_solitude_ground_dais", "material_solitude_dais"],
	tags: ["world", "collision", "walkable", "solitude", "dais"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [44, 0.8, 44],
		},
		Renderable: {
			meshId: "mesh_solitude_ground_dais",
			materialId: "material_solitude_dais",
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
				type: "cylinder",
				halfHeight: 0.4,
				radius: 22,
			},
		},
	},
} satisfies PrefabDefinition;

export const solitudePillarPrefab = {
	id: "solitude_pillar",
	assetIds: ["mesh_solitude_pillar", "material_solitude_pillar"],
	tags: ["world", "collision", "solitude", "pillar"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		},
		Renderable: {
			meshId: "mesh_solitude_pillar",
			materialId: "material_solitude_pillar",
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
				type: "cylinder",
				halfHeight: 2.6,
				radius: 0.86,
			},
		},
	},
} satisfies PrefabDefinition;

export const solitudeRingFragmentPrefab = {
	id: "solitude_ring_fragment",
	assetIds: ["mesh_solitude_ring_fragment", "material_solitude_ring_fragment"],
	tags: ["world", "collision", "solitude", "ring-fragment"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [7.2, 2.4, 1.4],
		},
		Renderable: {
			meshId: "mesh_solitude_ring_fragment",
			materialId: "material_solitude_ring_fragment",
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
				halfExtents: [3.6, 1.2, 0.7],
			},
		},
	},
} satisfies PrefabDefinition;

export const solitudeFireflyMarkerPrefab = {
	id: "solitude_firefly_marker",
	assetIds: ["mesh_solitude_firefly_marker", "material_solitude_firefly"],
	tags: ["world", "interaction", "story-note", "solitude", "firefly"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		},
		Renderable: {
			meshId: "mesh_solitude_firefly_marker",
			materialId: "material_solitude_firefly",
			visible: true,
		},
		Light: {
			kind: "point",
			color: "#ff4658",
			intensity: 5.2,
			distance: 8,
			decay: 1.4,
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
				type: "cylinder",
				halfHeight: 0.45,
				radius: 0.42,
			},
		},
	},
} satisfies PrefabDefinition;

export const solitudeWindEmitterPrefab = {
	id: "solitude_wind_emitter",
	assetIds: ["audio_ambient_wicked_shadows_whisper"],
	tags: ["world", "audio", "solitude", "ambient"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		},
		SoundEmitter: {
			soundId: "audio_ambient_wicked_shadows_whisper",
			volume: 0.28,
			busId: "spatial",
			loop: true,
			autoplay: true,
			refDistance: 12,
			maxDistance: 72,
			rolloffFactor: 1.1,
			distanceModel: "inverse",
		},
	},
} satisfies PrefabDefinition;

export const solitudePrefabs = [
	playerPrefab,
	portalGatePrefab,
	solitudePlateauPrefab,
	solitudeDaisPrefab,
	solitudePillarPrefab,
	solitudeRingFragmentPrefab,
	solitudeFireflyMarkerPrefab,
	solitudeWindEmitterPrefab,
] as const;
