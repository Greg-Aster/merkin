import type { PrefabDefinition } from "./index.js";

const mirandaEngineCoreColliderShape = createFrustumMeshColliderShape({
	radiusTop: 1.1,
	radiusBottom: 1.4,
	halfHeight: 1.8,
	radialSegments: 18,
});

export const playerPrefab = {
	id: "player",
	assetIds: ["mesh_player", "material_player"],
	tags: ["actor", "player"],
	components: {
		Transform: {
			position: [0, 0.65, 1.5],
			rotation: [0, 0, 0, 1],
			scale: [0.75, 1.25, 0.75],
		},
		Renderable: {
			meshId: "mesh_player",
			materialId: "material_player",
			visible: false,
		},
		RigidBody: {
			type: "kinematic",
			mass: 80,
		},
		Collider: {
			intent: "solid",
			channel: "player",
			shape: {
				type: "capsule",
				halfHeight: 0.55,
				radius: 0.35,
			},
		},
		CharacterController: {
			speed: 4.5,
			sprintMultiplier: 1.65,
			jumpForce: 6,
			gravity: -18,
			verticalVelocity: 0,
			groundY: 0.65,
			grounded: true,
		},
		FirstPersonController: {
			yawRadians: 0,
			pitchRadians: 0,
			mouseSensitivity: 0.0025,
			minPitchRadians: -1.3962634015954636,
			maxPitchRadians: 1.3962634015954636,
			eyeHeight: 0.55,
			fovDegrees: 70,
			near: 0.05,
			far: 2000,
		},
		CameraTarget: {
			active: true,
			priority: 100,
		},
		Health: {
			current: 100,
			max: 100,
		},
		PlayerInput: {},
	},
} satisfies PrefabDefinition;

export const arenaFloorPrefab = {
	id: "arena_floor",
	assetIds: ["mesh_arena_floor", "material_arena_floor"],
	tags: ["world", "collision"],
	components: {
		Transform: {
			position: [0, -0.05, 0],
			rotation: [0, 0, 0, 1],
			scale: [14, 0.1, 10],
		},
		Renderable: {
			meshId: "mesh_arena_floor",
			materialId: "material_arena_floor",
			visible: true,
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: {
			intent: "solid",
			channel: "world",
			shape: {
				type: "box",
				halfExtents: [7, 0.05, 5],
			},
		},
	},
} satisfies PrefabDefinition;

export const ingredientPrefab = {
	id: "ingredient_pickup",
	assetIds: ["mesh_ingredient", "material_ingredient"],
	tags: ["pickup", "objective"],
	components: {
		Transform: {
			position: [0, 0.35, 0],
			rotation: [0, 0, 0, 1],
			scale: [0.55, 0.55, 0.55],
		},
		Renderable: {
			meshId: "mesh_ingredient",
			materialId: "material_ingredient",
			visible: true,
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: {
			intent: "trigger",
			channel: "pickup",
			sensor: true,
			shape: {
				type: "box",
				halfExtents: [0.35, 0.35, 0.35],
			},
		},
		Collectible: {
			id: "ingredient",
			label: "Ingredient",
			radius: 0.8,
			value: 1,
		},
	},
} satisfies PrefabDefinition;

export const mirandaFloorMainPrefab = {
	id: "miranda_floor_main",
	assetIds: ["mesh_box", "material_miranda_floor_main"],
	tags: ["world", "collision", "miranda"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [40, 1.2, 92],
		},
		Renderable: {
			meshId: "mesh_box",
			materialId: "material_miranda_floor_main",
			visible: true,
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: {
			intent: "solid",
			channel: "world",
			shape: {
				type: "box",
				halfExtents: [20, 0.6, 46],
			},
		},
	},
} satisfies PrefabDefinition;

export const mirandaFloorUpperPrefab = {
	id: "miranda_floor_upper",
	assetIds: ["mesh_box", "material_miranda_floor_upper"],
	tags: ["world", "collision", "miranda"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [18, 0.9, 18],
		},
		Renderable: {
			meshId: "mesh_box",
			materialId: "material_miranda_floor_upper",
			visible: true,
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: {
			intent: "solid",
			channel: "world",
			shape: {
				type: "box",
				halfExtents: [9, 0.45, 9],
			},
		},
	},
} satisfies PrefabDefinition;

export const mirandaCockpitPanelSidePrefab = {
	id: "miranda_cockpit_panel_side",
	assetIds: ["mesh_box", "material_miranda_cockpit_panel"],
	tags: ["world", "collision", "miranda", "cockpit"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [2.1, 0.2, 1.1],
		},
		Renderable: {
			meshId: "mesh_box",
			materialId: "material_miranda_cockpit_panel",
			visible: true,
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: {
			intent: "solid",
			channel: "world",
			shape: {
				type: "box",
				halfExtents: [1.05, 0.1, 0.55],
			},
		},
	},
} satisfies PrefabDefinition;

export const mirandaCockpitPanelCenterPrefab = {
	id: "miranda_cockpit_panel_center",
	assetIds: ["mesh_box", "material_miranda_cockpit_panel_center"],
	tags: ["world", "collision", "miranda", "cockpit"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [2.4, 0.2, 1.1],
		},
		Renderable: {
			meshId: "mesh_box",
			materialId: "material_miranda_cockpit_panel_center",
			visible: true,
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: {
			intent: "solid",
			channel: "world",
			shape: {
				type: "box",
				halfExtents: [1.2, 0.1, 0.55],
			},
		},
	},
} satisfies PrefabDefinition;

export const mirandaCrewBunkPrefab = {
	id: "miranda_crew_bunk",
	assetIds: ["mesh_box", "material_miranda_crew_bunk"],
	tags: ["world", "collision", "miranda", "crew-quarters"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [2.3, 0.28, 1],
		},
		Renderable: {
			meshId: "mesh_box",
			materialId: "material_miranda_crew_bunk",
			visible: true,
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: {
			intent: "solid",
			channel: "world",
			shape: {
				type: "box",
				halfExtents: [1.15, 0.14, 0.5],
			},
		},
	},
} satisfies PrefabDefinition;

export const mirandaLockerBankPrefab = {
	id: "miranda_locker_bank",
	assetIds: ["mesh_box", "material_miranda_locker_bank"],
	tags: ["world", "collision", "miranda", "crew-quarters"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1.1, 2.4, 6.5],
		},
		Renderable: {
			meshId: "mesh_box",
			materialId: "material_miranda_locker_bank",
			visible: true,
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: {
			intent: "solid",
			channel: "world",
			shape: {
				type: "box",
				halfExtents: [0.55, 1.2, 3.25],
			},
		},
	},
} satisfies PrefabDefinition;

export const mirandaCaptainsDeskPrefab = {
	id: "miranda_captains_desk",
	assetIds: ["mesh_box", "material_miranda_captains_desk"],
	tags: ["world", "collision", "miranda", "captain-office"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [2.1, 0.18, 1.12],
		},
		Renderable: {
			meshId: "mesh_box",
			materialId: "material_miranda_captains_desk",
			visible: true,
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: {
			intent: "solid",
			channel: "world",
			shape: {
				type: "box",
				halfExtents: [1.05, 0.09, 0.56],
			},
		},
	},
} satisfies PrefabDefinition;

export const mirandaCaptainsChairPrefab = {
	id: "miranda_captains_chair",
	assetIds: ["mesh_cylinder", "material_miranda_captains_chair"],
	tags: ["world", "collision", "miranda", "captain-office"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1.16, 0.82, 1.16],
		},
		Renderable: {
			meshId: "mesh_cylinder",
			materialId: "material_miranda_captains_chair",
			visible: true,
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: {
			intent: "solid",
			channel: "world",
			shape: {
				type: "cylinder",
				halfHeight: 0.41,
				radius: 0.58,
			},
		},
	},
} satisfies PrefabDefinition;

export const mirandaRecipeSafePrefab = {
	id: "miranda_recipe_safe",
	assetIds: ["mesh_box", "material_miranda_recipe_safe"],
	tags: ["world", "collision", "miranda", "captain-office"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1.05, 1.32, 0.96],
		},
		Renderable: {
			meshId: "mesh_box",
			materialId: "material_miranda_recipe_safe",
			visible: true,
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: {
			intent: "solid",
			channel: "world",
			shape: {
				type: "box",
				halfExtents: [0.525, 0.66, 0.48],
			},
		},
	},
} satisfies PrefabDefinition;

export const mirandaEngineColumnPrefab = {
	id: "miranda_engine_column",
	assetIds: ["mesh_cylinder", "material_miranda_engine_column"],
	tags: ["world", "collision", "miranda", "engine-room"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [0.96, 3, 0.96],
		},
		Renderable: {
			meshId: "mesh_cylinder",
			materialId: "material_miranda_engine_column",
			visible: true,
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: {
			intent: "solid",
			channel: "world",
			shape: {
				type: "cylinder",
				halfHeight: 1.5,
				radius: 0.48,
			},
		},
	},
} satisfies PrefabDefinition;

export const mirandaEngineCorePrefab = {
	id: "miranda_engine_core",
	assetIds: ["mesh_miranda_engine_core", "material_miranda_engine_core"],
	tags: ["world", "collision", "miranda", "engine-room"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		},
		Renderable: {
			meshId: "mesh_miranda_engine_core",
			materialId: "material_miranda_engine_core",
			visible: true,
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: {
			intent: "solid",
			channel: "world",
			shape: mirandaEngineCoreColliderShape,
		},
	},
} satisfies PrefabDefinition;

export const mirandaMedPodPrefab = createMirandaBoxBlockerPrefab({
	id: "miranda_med_pod",
	materialId: "material_miranda_med_pod",
	tags: ["medbay"],
	scale: [1.2, 1.4, 3.6],
});

export const mirandaMessTableLargePrefab = createMirandaBoxBlockerPrefab({
	id: "miranda_mess_table_large",
	materialId: "material_miranda_mess_table",
	tags: ["mess-hall"],
	scale: [2.8, 0.18, 1.2],
});

export const mirandaMessTableSmallPrefab = createMirandaBoxBlockerPrefab({
	id: "miranda_mess_table_small",
	materialId: "material_miranda_mess_table",
	tags: ["mess-hall"],
	scale: [2.4, 0.18, 1.2],
});

export const mirandaMessCounterPrefab = createMirandaBoxBlockerPrefab({
	id: "miranda_mess_counter",
	materialId: "material_miranda_mess_counter",
	tags: ["mess-hall"],
	scale: [1.2, 2.04, 5.8],
});

export const mirandaChapelAltarPrefab = createMirandaBoxBlockerPrefab({
	id: "miranda_chapel_altar",
	materialId: "material_miranda_chapel_altar",
	tags: ["chapel"],
	scale: [3.4, 1.84, 1.3],
});

export const mirandaBrigCellPrefab = createMirandaBoxBlockerPrefab({
	id: "miranda_brig_cell",
	materialId: "material_miranda_brig_cell",
	tags: ["brig"],
	scale: [1.1, 2.8, 4.2],
});

export const mirandaBrigDeskPrefab = createMirandaBoxBlockerPrefab({
	id: "miranda_brig_desk",
	materialId: "material_miranda_brig_desk",
	tags: ["brig"],
	scale: [2.4, 1.44, 1.2],
});

export const mirandaCargoStackAPrefab = createMirandaBoxBlockerPrefab({
	id: "miranda_cargo_stack_a",
	materialId: "material_miranda_cargo_stack_a",
	tags: ["cargo-hold"],
	scale: [3.2, 1.9, 3.4],
});

export const mirandaCargoStackBPrefab = createMirandaBoxBlockerPrefab({
	id: "miranda_cargo_stack_b",
	materialId: "material_miranda_cargo_stack",
	tags: ["cargo-hold"],
	scale: [2.6, 2.7, 2.8],
});

export const mirandaCargoStackCPrefab = createMirandaBoxBlockerPrefab({
	id: "miranda_cargo_stack_c",
	materialId: "material_miranda_cargo_stack",
	tags: ["cargo-hold"],
	scale: [4.6, 1.4, 2.6],
});

export const mirandaCargoStackDPrefab = createMirandaBoxBlockerPrefab({
	id: "miranda_cargo_stack_d",
	materialId: "material_miranda_cargo_stack",
	tags: ["cargo-hold"],
	scale: [2.2, 1.56, 2.2],
});

export const mirandaServerBankTallPrefab = createMirandaBoxBlockerPrefab({
	id: "miranda_server_bank_tall",
	materialId: "material_miranda_server_bank",
	tags: ["archive-gallery"],
	scale: [1.4, 2.6, 3.2],
});

export const mirandaServerBankWidePrefab = createMirandaBoxBlockerPrefab({
	id: "miranda_server_bank_wide",
	materialId: "material_miranda_server_bank_wide",
	tags: ["archive-gallery"],
	scale: [4.8, 2.6, 1.6],
});

export const mirandaStoryMarkerCyanPrefab = createMirandaStoryMarkerPrefab({
	id: "miranda_story_marker_cyan",
	materialId: "material_miranda_story_marker_cyan",
});

export const mirandaStoryMarkerAmberPrefab = createMirandaStoryMarkerPrefab({
	id: "miranda_story_marker_amber",
	materialId: "material_miranda_story_marker_amber",
});

export const mirandaStoryMarkerRedPrefab = createMirandaStoryMarkerPrefab({
	id: "miranda_story_marker_red",
	materialId: "material_miranda_story_marker_red",
});

export const mirandaStoryMarkerMagentaPrefab = createMirandaStoryMarkerPrefab({
	id: "miranda_story_marker_magenta",
	materialId: "material_miranda_story_marker_magenta",
});

export const mirandaCommandGalleryBeaconLightPrefab =
	createMirandaPointLightPrefab({
		id: "miranda_command_gallery_beacon_light",
		color: "#e76949",
		intensity: 8,
		distance: 20,
		decay: 2,
		tags: ["command-gallery"],
	});

export const mirandaObservationLightPrefab = createMirandaPointLightPrefab({
	id: "miranda_observation_light",
	color: "#8adff5",
	intensity: 4.6,
	distance: 15,
	decay: 2,
	tags: ["observation-gallery"],
});

export const mirandaArchiveLightPrefab = createMirandaPointLightPrefab({
	id: "miranda_archive_light",
	color: "#7dc8ff",
	intensity: 5,
	distance: 16,
	decay: 2,
	tags: ["archive-gallery"],
});

export const prototypePrefabs = [
	playerPrefab,
	arenaFloorPrefab,
	ingredientPrefab,
] as const;

export const mirandaDeckPrefabs = [
	playerPrefab,
	mirandaFloorMainPrefab,
	mirandaFloorUpperPrefab,
	mirandaCockpitPanelSidePrefab,
	mirandaCockpitPanelCenterPrefab,
	mirandaCrewBunkPrefab,
	mirandaLockerBankPrefab,
	mirandaCaptainsDeskPrefab,
	mirandaCaptainsChairPrefab,
	mirandaRecipeSafePrefab,
	mirandaEngineColumnPrefab,
	mirandaEngineCorePrefab,
	mirandaMedPodPrefab,
	mirandaMessTableLargePrefab,
	mirandaMessTableSmallPrefab,
	mirandaMessCounterPrefab,
	mirandaChapelAltarPrefab,
	mirandaBrigCellPrefab,
	mirandaBrigDeskPrefab,
	mirandaCargoStackAPrefab,
	mirandaCargoStackBPrefab,
	mirandaCargoStackCPrefab,
	mirandaCargoStackDPrefab,
	mirandaServerBankTallPrefab,
	mirandaServerBankWidePrefab,
	mirandaStoryMarkerCyanPrefab,
	mirandaStoryMarkerAmberPrefab,
	mirandaStoryMarkerRedPrefab,
	mirandaStoryMarkerMagentaPrefab,
	mirandaCommandGalleryBeaconLightPrefab,
	mirandaObservationLightPrefab,
	mirandaArchiveLightPrefab,
] as const;

function createMirandaPointLightPrefab(options: {
	readonly id: string;
	readonly color: string;
	readonly intensity: number;
	readonly distance: number;
	readonly decay: number;
	readonly tags: readonly string[];
}) {
	return {
		id: options.id,
		tags: ["world", "light", "miranda", ...options.tags],
		components: {
			Transform: {
				position: [0, 0, 0],
				rotation: [0, 0, 0, 1],
				scale: [1, 1, 1],
			},
			Light: {
				kind: "point",
				color: options.color,
				intensity: options.intensity,
				distance: options.distance,
				decay: options.decay,
				visible: true,
			},
		},
	} satisfies PrefabDefinition;
}

function createMirandaStoryMarkerPrefab(options: {
	readonly id: string;
	readonly materialId: string;
}) {
	return {
		id: options.id,
		assetIds: ["mesh_cylinder", options.materialId],
		tags: ["world", "interaction", "miranda", "story-marker"],
		components: {
			Transform: {
				position: [0, 0, 0],
				rotation: [0, 0, 0, 1],
				scale: [0.58, 0.9, 0.58],
			},
			Renderable: {
				meshId: "mesh_cylinder",
				materialId: options.materialId,
				visible: true,
			},
			RigidBody: {
				type: "fixed",
				mass: 0,
			},
			Collider: {
				intent: "trigger",
				channel: "trigger",
				sensor: true,
				shape: {
					type: "cylinder",
					halfHeight: 0.45,
					radius: 0.29,
				},
			},
		},
	} satisfies PrefabDefinition;
}

function createMirandaBoxBlockerPrefab(options: {
	readonly id: string;
	readonly materialId: string;
	readonly tags: readonly string[];
	readonly scale: readonly [number, number, number];
}) {
	const halfExtents = [
		options.scale[0] / 2,
		options.scale[1] / 2,
		options.scale[2] / 2,
	] as const;

	return {
		id: options.id,
		assetIds: ["mesh_box", options.materialId],
		tags: ["world", "collision", "miranda", ...options.tags],
		components: {
			Transform: {
				position: [0, 0, 0],
				rotation: [0, 0, 0, 1],
				scale: options.scale,
			},
			Renderable: {
				meshId: "mesh_box",
				materialId: options.materialId,
				visible: true,
			},
			RigidBody: {
				type: "fixed",
				mass: 0,
			},
			Collider: {
				intent: "solid",
				channel: "world",
				shape: {
					type: "box",
					halfExtents,
				},
			},
		},
	} satisfies PrefabDefinition;
}

function createFrustumMeshColliderShape(options: {
	readonly radiusTop: number;
	readonly radiusBottom: number;
	readonly halfHeight: number;
	readonly radialSegments: number;
}) {
	const vertices: [number, number, number][] = [];
	const indices: number[] = [];
	const segments = Math.max(3, Math.round(options.radialSegments));

	for (let index = 0; index < segments; index += 1) {
		const angle = (index / segments) * Math.PI * 2;
		const x = Math.cos(angle);
		const z = Math.sin(angle);
		vertices.push([
			x * options.radiusTop,
			options.halfHeight,
			z * options.radiusTop,
		]);
	}

	for (let index = 0; index < segments; index += 1) {
		const angle = (index / segments) * Math.PI * 2;
		const x = Math.cos(angle);
		const z = Math.sin(angle);
		vertices.push([
			x * options.radiusBottom,
			-options.halfHeight,
			z * options.radiusBottom,
		]);
	}

	const topCenterIndex = vertices.length;
	vertices.push([0, options.halfHeight, 0]);
	const bottomCenterIndex = vertices.length;
	vertices.push([0, -options.halfHeight, 0]);

	for (let index = 0; index < segments; index += 1) {
		const next = (index + 1) % segments;
		const top = index;
		const nextTop = next;
		const bottom = index + segments;
		const nextBottom = next + segments;

		indices.push(top, bottom, nextBottom);
		indices.push(top, nextBottom, nextTop);
		indices.push(topCenterIndex, nextTop, top);
		indices.push(bottomCenterIndex, bottom, nextBottom);
	}

	return {
		type: "mesh",
		vertices,
		indices,
	} as const;
}
