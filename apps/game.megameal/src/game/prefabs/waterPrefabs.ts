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
	},
} satisfies PrefabDefinition;
