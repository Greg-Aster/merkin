import type { PrefabDefinition } from "./index.js";

export const terrainChunkCellPrefab = {
	id: "terrain_chunk_cell",
	tags: ["world", "terrain", "streamable"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		},
	},
} satisfies PrefabDefinition;
