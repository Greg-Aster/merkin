import type { PrefabDefinition } from "./index.js";

export const waterSurfacePlanePrefab = {
	id: "water_surface_plane",
	assetIds: ["mesh_water_plane", "material_water_dark_still"],
	tags: ["world", "water", "environment"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		},
		Renderable: {
			meshId: "mesh_water_plane",
			materialId: "material_water_dark_still",
			visible: true,
		},
		WaterSurface: {
			surfaceType: "plane",
			animation: {
				mode: "static",
				speed: 0,
				direction: [1, 0],
				waveAmplitude: 0,
				waveLength: 1,
			},
			reflection: {
				mode: "none",
				intensity: 0,
			},
			refraction: {
				enabled: false,
				intensity: 0,
			},
			gameplayVolume: {
				enabled: false,
			},
			renderOrder: 0,
			visible: true,
		},
	},
} satisfies PrefabDefinition;
