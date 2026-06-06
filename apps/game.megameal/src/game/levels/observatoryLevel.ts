import type { LevelDefinition } from "./index.js";

export const observatoryLevel = {
	id: "observatory",
	sceneId: "observatory_game",
	preloadGroups: ["observatory"],
	resources: {
		"game:collectedCount": 0,
		"game:totalCollectibles": 0,
		"game:characterBounds": {
			minX: -300,
			maxX: 300,
			minZ: -300,
			maxZ: 300,
		},
	},
	preload: [
		"mesh_player",
		"mesh_observatory_environment",
		"mesh_water_plane",
		"mesh_observatory_firefly_marker",
		"cubemap_observatory_sky",
		"material_player",
		"material_water_dark_still",
		"material_observatory_firefly",
		"audio_player_jump",
		"audio_player_charge_release",
	],
	instances: [
		{
			id: "observatory-terrain",
			prefabId: "observatory_environment",
			stableId: "observatory:terrain",
		},
		{
			id: "observatory-walkable-proxy",
			prefabId: "observatory_walkable_proxy",
			stableId: "observatory:walkable-proxy",
		},
		{
			id: "observatory-water",
			prefabId: "water_surface_plane",
			stableId: "observatory:water",
			transform: {
				position: [0, -2, 0],
				scale: [4000, 0.02, 4000],
			},
		},
		{
			id: "observatory-archive-firefly",
			prefabId: "observatory_firefly_marker",
			stableId: "observatory:firefly:archive",
			transform: {
				position: [-108.5, 4.4, 68],
				scale: [1.25, 1.25, 1.25],
			},
		},
		{
			id: "observatory-lantern-firefly",
			prefabId: "observatory_firefly_marker",
			stableId: "observatory:firefly:lantern",
			transform: {
				position: [72, 5.2, -92],
				scale: [1.1, 1.1, 1.1],
			},
		},
		{
			id: "observatory-tide-firefly",
			prefabId: "observatory_firefly_marker",
			stableId: "observatory:firefly:tide",
			transform: {
				position: [132, 3.6, 104],
			},
		},
		{
			id: "player",
			prefabId: "player",
			stableId: "player",
			transform: {
				position: [-137.2, 1.8, -49.5],
			},
			components: {
				CharacterController: {
					groundY: 1.8,
				},
				Light: {
					kind: "point",
					color: "#ffd6a3",
					intensity: 5.5,
					distance: 16,
					decay: 2,
					visible: true,
				},
			},
		},
	],
} satisfies LevelDefinition;
