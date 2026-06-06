import type { LevelDefinition, LevelPrefabInstance } from "./index.js";

const PORTAL_COUNT = 8;
const PORTAL_RADIUS = 7.5;

type PortalSlot = {
	readonly id: string;
	readonly label: string;
	readonly targetRuntimeSceneId?: string;
};

const portalSlots: readonly PortalSlot[] = [
	{
		id: "prototype-arena",
		label: "Prototype Arena",
		targetRuntimeSceneId: "prototype_arena_runtime",
	},
	{
		id: "miranda-deck",
		label: "Miranda Deck",
		targetRuntimeSceneId: "miranda_deck_runtime",
	},
	{
		id: "observatory",
		label: "Observatory",
		targetRuntimeSceneId: "observatory_runtime",
	},
	{
		id: "solitude",
		label: "Solitude",
	},
	{
		id: "forge",
		label: "Forge",
	},
	{
		id: "archive",
		label: "Archive",
	},
	{
		id: "garden",
		label: "Garden",
	},
	{
		id: "nexus-reserve",
		label: "Nexus Reserve",
	},
] as const;

export const portalArenaLevel = {
	id: "portal_arena",
	sceneId: "portal_arena_game",
	preloadGroups: ["portal_arena"],
	resources: {
		"game:collectedCount": 0,
		"game:totalCollectibles": 0,
		"game:characterBounds": {
			minX: -360,
			maxX: 360,
			minZ: -360,
			maxZ: 360,
		},
	},
	preload: [
		"mesh_player",
		"mesh_portal_field",
		"mesh_portal_gate",
		"cubemap_classic_sky",
		"material_player",
		"audio_player_jump",
		"audio_player_charge_release",
		"audio_portal_activate",
		"audio_ambient_portal_deck",
	],
	instances: [
		{
			id: "floor",
			prefabId: "portal_arena_floor",
			stableId: "portal-arena:floor",
		},
		{
			id: "player",
			prefabId: "player",
			stableId: "player",
			transform: {
				position: [0, 0.65, 0],
			},
			components: {
				CharacterController: {
					groundY: 0.65,
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
		...portalSlots.map(createPortalInstance),
	],
} satisfies LevelDefinition;

function createPortalInstance(
	slot: PortalSlot,
	index: number,
): LevelPrefabInstance {
	const angle = (index / PORTAL_COUNT) * Math.PI * 2;
	const x = Math.sin(angle) * PORTAL_RADIUS;
	const z = -Math.cos(angle) * PORTAL_RADIUS;
	const yawRadians = Math.atan2(x, z);

	return {
		id: `portal-${slot.id}`,
		prefabId: "portal_gate",
		stableId: `portal-arena:portal:${slot.id}`,
		transform: {
			position: [roundCoordinate(x), 0, roundCoordinate(z)],
			rotation: yawToQuaternion(yawRadians),
		},
		components: {
			Portal: {
				id: slot.id,
				label: slot.label,
				prompt: slot.targetRuntimeSceneId
					? `Click to enter ${slot.label}`
					: `${slot.label} portal is not connected yet`,
				...(slot.targetRuntimeSceneId
					? { targetRuntimeSceneId: slot.targetRuntimeSceneId }
					: {}),
				activationRadius: 2.35,
			},
		},
	};
}

function yawToQuaternion(yawRadians: number): [number, number, number, number] {
	const halfYaw = yawRadians / 2;
	return [0, Math.sin(halfYaw), 0, Math.cos(halfYaw)];
}

function roundCoordinate(value: number): number {
	return Math.round(value * 1000) / 1000;
}
