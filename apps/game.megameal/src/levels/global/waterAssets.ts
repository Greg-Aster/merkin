import type { AssetManifestEntry } from "../../engine/modules/assets/index.js";

export const meshWaterPlane = {
	id: "mesh_water_plane",
	kind: "mesh",
	url: "builtin://box",
	tags: ["water", "environment"],
} satisfies AssetManifestEntry;

export const materialWaterDarkStill = {
	id: "material_water_dark_still",
	kind: "material",
	url: "builtin://water-dark-still",
	material: {
		color: "#050b14",
		emissive: "#020711",
		emissiveIntensity: 0.03,
		metalness: 0.12,
		roughness: 0.28,
		opacity: 0.92,
		transparent: true,
	},
	tags: ["water", "environment", "dark", "still"],
} satisfies AssetManifestEntry;
