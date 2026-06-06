import { collisionLevelInstances as observatoryCollisionLevelInstances } from "../generated/observatoryCollisionRuntime.js";
import { observatoryFireflyInstances } from "../populations/index.js";
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
		"mesh_observatory_field_micro_displacement",
		"mesh_water_plane",
		"mesh_observatory_firefly_marker",
		"cubemap_observatory_sky",
		"material_player",
		"material_water_dark_still",
		"material_observatory_firefly",
		"audio_player_jump",
		"audio_player_charge_release",
		"audio_ambient_portal_deck",
	],
	instances: [
		{
			id: "observatory-terrain",
			prefabId: "observatory_environment",
			stableId: "observatory:terrain",
		},
		{
			id: "observatory-field-visual-terrain",
			prefabId: "observatory_field_visual_terrain",
			stableId: "observatory:terrain:visual-field",
		},
		...observatoryCollisionLevelInstances,
		{
			id: "observatory-water",
			prefabId: "water_surface_plane",
			stableId: "observatory:water",
			transform: {
				position: [0, -2, 0],
				scale: [4000, 0.02, 4000],
			},
			components: {
				WaterSurface: {
					surfaceType: "plane",
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
		},
		...observatoryFireflyInstances,
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
					kinematicCollision: {
						enabled: true,
						offset: 0.04,
						slide: true,
						obstacleChannels: ["worldStatic"],
						snapToGroundDistance: 0.7,
						maxSlopeClimbAngle: 0.7853981633974483,
						minSlopeSlideAngle: 0.8726646259971648,
						autostep: {
							maxHeight: 0.45,
							minWidth: 0.35,
							includeDynamicBodies: false,
						},
					},
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
