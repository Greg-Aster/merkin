import type { AssetManifestEntry } from "../../engine/modules/assets/index.js";

export const meshWaterPlane = {
	id: "mesh_water_plane",
	kind: "mesh",
	url: "builtin://plane?width=1&height=1&widthSegments=128&heightSegments=128",
	tags: ["water", "environment"],
} satisfies AssetManifestEntry;

export const materialWaterSurface = {
	id: "material_water_surface",
	kind: "material",
	url: "builtin://water-surface",
	material: {
		color: "#06324a",
		emissive: "#01111c",
		emissiveIntensity: 0.05,
		metalness: 0,
		roughness: 0.18,
		opacity: 0.88,
		transparent: true,
	},
	tags: ["water", "environment", "shader"],
} satisfies AssetManifestEntry;
