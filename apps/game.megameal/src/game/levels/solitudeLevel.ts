import type { LevelDefinition } from "./index.js";

export const solitudeExpectedRuntimeImports = {
	runtimeSceneId: "solitude_runtime",
	levelId: "solitude",
	assetIds: [
		"mesh_player",
		"mesh_solitude_ground_plateau",
		"mesh_solitude_ground_dais",
		"cubemap_observatory_sky",
		"material_player",
		"material_solitude_ground_plateau",
		"material_solitude_ground_dais",
		"audio_player_jump",
		"audio_player_charge_release",
		"audio_ambient_wicked_shadows_whisper",
	],
	prefabIds: ["player", "solitude_ground_plateau", "solitude_ground_dais"],
	readiness: {
		playerStableId: "player",
		requiredCollisionPrefabIds: [
			"solitude_ground_plateau",
			"solitude_ground_dais",
			"player",
		],
		requiredCollisionStableIds: [
			"solitude:ground:plateau",
			"solitude:ground:dais",
			"player",
		],
		requiredWalkableStableIds: [
			"solitude:ground:plateau",
			"solitude:ground:dais",
		],
		requiredLightStableIds: ["player"],
	},
} as const;

export const solitudeLevel = {
	id: "solitude",
	sceneId: "solitude_game",
	preloadGroups: ["solitude"],
	resources: {
		"game:collectedCount": 0,
		"game:totalCollectibles": 0,
		"game:characterBounds": {
			minX: -96,
			maxX: 96,
			minZ: -120,
			maxZ: 96,
		},
	},
	preload: solitudeExpectedRuntimeImports.assetIds,
	instances: [
		{
			id: "solitude-ground-plateau",
			prefabId: "solitude_ground_plateau",
			stableId: "solitude:ground:plateau",
			transform: {
				position: [0, -2.341023377783173, 0],
				scale: [128.45490162495452, 1.2186824496366455, 132.4415601615787],
			},
			components: {
				RigidBody: {
					type: "fixed",
					mass: 0,
				},
				Collider: {
					intent: "walkable",
					channel: "worldStatic",
					shape: {
						type: "box",
						halfExtents: [
							64.22745081247726, 0.6093412248183228, 66.22078008078935,
						],
					},
				},
			},
		},
		{
			id: "solitude-ground-dais",
			prefabId: "solitude_ground_dais",
			stableId: "solitude:ground:dais",
			transform: {
				position: [0, -10.461897931581928, 0.2305610401047442],
				scale: [23.249915454852893, 0.4255953077697364, 22.39938096256249],
			},
			components: {
				RigidBody: {
					type: "fixed",
					mass: 0,
				},
				Collider: {
					intent: "walkable",
					channel: "worldStatic",
					shape: {
						type: "box",
						halfExtents: [
							11.624957727426446, 0.2127976538848682, 11.199690481281245,
						],
					},
				},
			},
		},
		{
			id: "player",
			prefabId: "player",
			stableId: "player",
			transform: {
				position: [0, 0.8, -24],
			},
			components: {
				CharacterController: {
					groundY: 0.8,
					kinematicCollision: {
						enabled: true,
						offset: 0.04,
						slide: true,
						obstacleChannels: ["worldStatic"],
						snapToGroundDistance: 0.9,
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
					color: "#ffc6f2",
					intensity: 6.2,
					distance: 18,
					decay: 2,
					visible: true,
				},
			},
		},
	],
} satisfies LevelDefinition;
