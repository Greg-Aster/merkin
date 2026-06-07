import type { PrefabDefinition } from "./index.js";

export const waterSurfacePlanePrefab = {
	id: "water_surface_plane",
	assetIds: ["mesh_water_plane", "material_water_surface"],
	tags: ["world", "water", "environment"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		},
		Renderable: {
			meshId: "mesh_water_plane",
			materialId: "material_water_surface",
			visible: true,
		},
		WaterSurface: {
			surfaceType: "plane",
			bodyType: "custom",
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

export const lakeWaterSurfacePrefab = {
	id: "lake_water_surface",
	assetIds: ["mesh_water_plane", "material_water_surface"],
	tags: ["world", "water", "environment", "lake"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		},
		Renderable: {
			meshId: "mesh_water_plane",
			materialId: "material_water_surface",
			visible: true,
		},
		WaterSurface: {
			surfaceType: "plane",
			bodyType: "lake",
			animation: {
				mode: "scrolling",
				speed: 0.035,
				direction: [0.62, 0.78],
				waveAmplitude: 0.08,
				waveLength: 48,
			},
			reflection: {
				mode: "environment",
				intensity: 0.32,
			},
			refraction: {
				enabled: false,
				intensity: 0,
			},
			gameplayVolume: {
				enabled: false,
			},
			renderOrder: 5,
			visible: true,
		},
	},
} satisfies PrefabDefinition;

export const oceanWaterSurfacePrefab = {
	id: "ocean_water_surface",
	assetIds: ["mesh_water_plane", "material_water_surface"],
	tags: ["world", "water", "environment", "ocean"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		},
		Renderable: {
			meshId: "mesh_water_plane",
			materialId: "material_water_surface",
			visible: true,
		},
		WaterSurface: {
			surfaceType: "plane",
			bodyType: "ocean",
			animation: {
				mode: "scrolling",
				speed: 0.022,
				direction: [0.42, 0.91],
				waveAmplitude: 0.045,
				waveLength: 64,
			},
			reflection: {
				mode: "environment",
				intensity: 0.26,
			},
			refraction: {
				enabled: true,
				intensity: 0.08,
			},
			gameplayVolume: {
				enabled: false,
			},
			renderOrder: 4,
			visible: true,
		},
	},
} satisfies PrefabDefinition;
