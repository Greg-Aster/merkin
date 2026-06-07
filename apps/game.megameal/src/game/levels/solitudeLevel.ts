import type { LevelDefinition, LevelPrefabInstance } from "./index.js";

const YAW_QUARTER_TURN = [0, Math.SQRT1_2, 0, Math.SQRT1_2] as const;

const pillarRing = [
	{ id: "north", position: [0, 2.7, 18] },
	{ id: "north-east", position: [12.728, 2.35, 12.728] },
	{ id: "east", position: [18, 2.7, 0] },
	{ id: "south-east", position: [12.728, 2.35, -12.728] },
	{ id: "south", position: [0, 2.7, -18] },
	{ id: "south-west", position: [-12.728, 2.35, -12.728] },
	{ id: "west", position: [-18, 2.7, 0] },
	{ id: "north-west", position: [-12.728, 2.35, 12.728] },
] as const satisfies readonly {
	readonly id: string;
	readonly position: readonly [number, number, number];
}[];

const ringFragments = [
	{
		id: "east",
		position: [27.5, 1.25, 0],
		rotation: YAW_QUARTER_TURN,
	},
	{
		id: "west",
		position: [-27.5, 1.25, 0],
		rotation: YAW_QUARTER_TURN,
	},
] as const satisfies readonly {
	readonly id: string;
	readonly position: readonly [number, number, number];
	readonly rotation: readonly [number, number, number, number];
}[];

export const solitudeExpectedRuntimeImports = {
	runtimeSceneId: "solitude_runtime",
	levelId: "solitude",
	assetIds: [
		"mesh_player",
		"mesh_portal_gate",
		"mesh_solitude_ground_plateau",
		"mesh_solitude_ground_dais",
		"mesh_solitude_pillar",
		"mesh_solitude_ring_fragment",
		"mesh_solitude_firefly_marker",
		"cubemap_observatory_sky",
		"material_player",
		"material_solitude_plateau",
		"material_solitude_dais",
		"material_solitude_pillar",
		"material_solitude_ring_fragment",
		"material_solitude_firefly",
		"audio_player_jump",
		"audio_player_charge_release",
		"audio_portal_activate",
		"audio_portal_cycle",
		"audio_ambient_wicked_shadows_whisper",
	],
	prefabIds: [
		"player",
		"portal_gate",
		"solitude_ground_plateau",
		"solitude_ground_dais",
		"solitude_pillar",
		"solitude_ring_fragment",
		"solitude_firefly_marker",
		"solitude_wind_emitter",
	],
	readiness: {
		playerStableId: "player",
		requiredCollisionPrefabIds: [
			"portal_gate",
			"solitude_ground_plateau",
			"solitude_ground_dais",
			"solitude_pillar",
			"solitude_ring_fragment",
			"solitude_firefly_marker",
			"player",
		],
		requiredCollisionStableIds: [
			"player",
			"solitude:portal:portal-arena",
			"solitude:ground:plateau",
			"solitude:ground:dais",
			"solitude:story:central-firefly",
			...pillarRing.map((pillar) => `solitude:pillar:${pillar.id}`),
			...ringFragments.map(
				(fragment) => `solitude:ring-fragment:${fragment.id}`,
			),
		],
		requiredWalkableStableIds: [
			"solitude:ground:plateau",
			"solitude:ground:dais",
		],
		requiredLightStableIds: ["player", "solitude:story:central-firefly"],
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
			minX: -64,
			maxX: 64,
			minZ: -68,
			maxZ: 68,
		},
	},
	preload: solitudeExpectedRuntimeImports.assetIds,
	instances: [
		{
			id: "solitude-ground-plateau",
			prefabId: "solitude_ground_plateau",
			stableId: "solitude:ground:plateau",
			transform: {
				position: [0, -0.36, 0],
				scale: [128.45490162495452, 0.72, 132.4415601615787],
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
						halfExtents: [64.22745081247726, 0.36, 66.22078008078935],
					},
				},
			},
		},
		{
			id: "solitude-ground-dais",
			prefabId: "solitude_ground_dais",
			stableId: "solitude:ground:dais",
			transform: {
				position: [0, 0.16, 0.2305610401047442],
				scale: [23.249915454852893, 0.32, 22.39938096256249],
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
						halfExtents: [11.624957727426446, 0.16, 11.199690481281245],
					},
				},
			},
		},
		...pillarRing.map(createPillarInstance),
		...ringFragments.map(createRingFragmentInstance),
		{
			id: "solitude-return-portal",
			prefabId: "portal_gate",
			stableId: "solitude:portal:portal-arena",
			transform: {
				position: [0, 0, 28],
				rotation: [0, 1, 0, 0],
			},
			components: {
				Portal: {
					id: "solitude.portal_arena",
					label: "Portal Arena",
					prompt: "Click to return to Portal Arena",
					targetRuntimeSceneId: "portal_arena_runtime",
					activationRadius: 2.35,
				},
			},
		},
		{
			id: "solitude-central-firefly",
			prefabId: "solitude_firefly_marker",
			stableId: "solitude:story:central-firefly",
			transform: {
				position: [0, 1.7, 0.23],
				scale: [0.82, 0.82, 0.82],
			},
			components: storyNote({
				id: "solitude.note.central-firefly",
				title: "Solitude Signal",
				author: "Abyssal Relay",
				location: "Central Dais",
				excerpt:
					"The red firefly circles the dais without landing, keeping time for a place that has almost forgotten motion.",
				body: "The red firefly circles the dais without landing, keeping time for a place that has almost forgotten motion.\n\nThe plateau feels built for arrivals, but every return path points back through the portal ring.",
				markerColor: "#ff4658",
				markerSize: 0.82,
			}),
		},
		{
			id: "solitude-wind-emitter",
			prefabId: "solitude_wind_emitter",
			stableId: "solitude:audio:wind",
			transform: {
				position: [0, 1.4, 0.23],
			},
			components: {
				SoundEmitter: {
					soundId: "audio_ambient_wicked_shadows_whisper",
					volume: 0.18,
					busId: "spatial",
					loop: true,
					autoplay: true,
					refDistance: 16,
					maxDistance: 86,
					rolloffFactor: 0.9,
					distanceModel: "inverse",
				},
			},
		},
		{
			id: "player",
			prefabId: "player",
			stableId: "player",
			transform: {
				position: [0, 0.95, -24],
			},
			components: {
				CharacterController: {
					groundY: 0.95,
					kinematicCollision: {
						enabled: true,
						offset: 0.04,
						slide: true,
						obstacleChannels: ["worldStatic"],
						snapToGroundDistance: 1.1,
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

function createPillarInstance(
	pillar: (typeof pillarRing)[number],
): LevelPrefabInstance {
	return {
		id: `solitude-pillar-${pillar.id}`,
		prefabId: "solitude_pillar",
		stableId: `solitude:pillar:${pillar.id}`,
		transform: {
			position: pillar.position,
			scale: [1.2, 5.4, 1.2],
		},
	};
}

function createRingFragmentInstance(
	fragment: (typeof ringFragments)[number],
): LevelPrefabInstance {
	return {
		id: `solitude-ring-fragment-${fragment.id}`,
		prefabId: "solitude_ring_fragment",
		stableId: `solitude:ring-fragment:${fragment.id}`,
		transform: {
			position: fragment.position,
			rotation: fragment.rotation,
			scale: [7.2, 2.4, 1.4],
		},
	};
}

function storyNote(options: {
	readonly id: string;
	readonly title: string;
	readonly author: string;
	readonly location: string;
	readonly excerpt: string;
	readonly body: string;
	readonly markerColor: string;
	readonly markerSize: number;
}) {
	return {
		StoryNote: {
			...options,
			activationRadius: 2.35,
		},
	};
}
