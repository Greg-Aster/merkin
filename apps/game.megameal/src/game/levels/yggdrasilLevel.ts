import { createPrimitiveInstances } from "../content/primitiveSceneContent.js";
import {
	yggdrasilPrimitiveCollisionSourceIds,
	yggdrasilPrimitiveContentOptions,
	yggdrasilPrimitiveNodes,
	yggdrasilPrimitiveParitySource,
	yggdrasilPrimitiveWalkableSourceIds,
} from "../content/yggdrasilPrimitiveParity.js";
import { yggdrasilTerrainPackageId } from "../generated/terrainRuntime.js";
import type { LevelDefinition, LevelPrefabInstance } from "./index.js";

const primitiveIds = yggdrasilPrimitiveContentOptions.ids;
const primitiveMeshAssetIds = yggdrasilPrimitiveNodes.map((node) =>
	primitiveIds.meshAssetId(node.sourceId),
);
const primitiveMaterialAssetIds = yggdrasilPrimitiveNodes.map((node) =>
	primitiveIds.materialAssetId(node.sourceId),
);
const primitivePrefabIds = yggdrasilPrimitiveNodes.map((node) =>
	primitiveIds.prefabId(node.sourceId),
);
const terrainOwnedPrimitiveSourceIds = new Set(
	yggdrasilPrimitiveWalkableSourceIds,
);
const requiredPrimitiveCollisionSourceIds =
	yggdrasilPrimitiveCollisionSourceIds.filter(
		(sourceId) => !terrainOwnedPrimitiveSourceIds.has(sourceId),
	);
const requiredPrimitiveCollisionPrefabIds =
	requiredPrimitiveCollisionSourceIds.map((sourceId) =>
		primitiveIds.prefabId(sourceId),
	);
const requiredPrimitiveCollisionStableIds =
	requiredPrimitiveCollisionSourceIds.map((sourceId) =>
		primitiveIds.stableId(sourceId),
	);
const terrainOwnedWalkableStableIds = yggdrasilPrimitiveWalkableSourceIds.map(
	(sourceId) => primitiveIds.stableId(sourceId),
);

const yggdrasilInstanceComponentOverlays: Readonly<
	Record<string, Record<string, unknown>>
> = {
	"yggdrasil-dais": storyNote({
		id: "yggdrasil.note.root_memory",
		title: "Root Memory",
		author: "Norn Relay",
		location: "Well Dais",
		excerpt:
			"The roots hold the crossings in place, but the bridge only answers when the basin is quiet.",
		body: "The roots hold the crossings in place, but the bridge only answers when the basin is quiet.\n\nThree wells mark the old agreements. The path back remains open until the branches remember where they were meant to grow.",
		markerColor: "#9df7c5",
		markerSize: 1,
	}),
};

export const yggdrasilExpectedRuntimeImports = {
	runtimeSceneId: "yggdrasil_runtime",
	levelId: "yggdrasil",
	primitiveParity: {
		sourcePath: yggdrasilPrimitiveParitySource.legacyPath,
		primitiveNodeCount: yggdrasilPrimitiveParitySource.primitiveNodeCount,
		collisionNodeCount: yggdrasilPrimitiveCollisionSourceIds.length,
		walkableNodeCount: yggdrasilPrimitiveWalkableSourceIds.length,
	},
	assetIds: [
		"mesh_player",
		"mesh_portal_gate",
		"mesh_water_plane",
		...primitiveMeshAssetIds,
		"cubemap_observatory_sky",
		"material_player",
		"material_water_surface",
		...primitiveMaterialAssetIds,
		"audio_player_jump",
		"audio_player_charge_release",
		"audio_portal_activate",
		"audio_portal_cycle",
		"audio_ambient_whistling_dreams",
	],
	prefabIds: [
		"player",
		"portal_gate",
		"ocean_water_surface",
		...primitivePrefabIds,
		"yggdrasil_ambient_emitter",
	],
	readiness: {
		playerStableId: "player",
		requiredCollisionPrefabIds: [
			"portal_gate",
			...requiredPrimitiveCollisionPrefabIds,
			"player",
		],
		requiredCollisionStableIds: [
			"player",
			"yggdrasil:portal:portal-arena",
			...requiredPrimitiveCollisionStableIds,
		],
		requiredLightStableIds: ["player"],
	},
	terrain: {
		terrainOwnedWalkableStableIds,
	},
} as const;

const primitiveInstances = createPrimitiveInstances(
	yggdrasilPrimitiveNodes,
	yggdrasilPrimitiveContentOptions,
).map(applyYggdrasilInstanceComponentOverlay);

export const yggdrasilLevel = {
	id: "yggdrasil",
	sceneId: "yggdrasil_game",
	preloadGroups: ["yggdrasil"],
	resources: {
		"game:collectedCount": 0,
		"game:totalCollectibles": 0,
		"game:characterBounds": {
			minX: -280,
			maxX: 280,
			minZ: -280,
			maxZ: 280,
		},
	},
	preload: yggdrasilExpectedRuntimeImports.assetIds,
	instances: [
		...primitiveInstances,
		{
			id: "yggdrasil-ocean",
			prefabId: "ocean_water_surface",
			stableId: "yggdrasil:water:ocean",
			transform: {
				position: [0, -3.35, 0],
				scale: [920, 0.02, 920],
			},
		},
		{
			id: "yggdrasil-return-portal",
			prefabId: "portal_gate",
			stableId: "yggdrasil:portal:portal-arena",
			transform: {
				position: [0, 3.2, -104],
			},
			components: {
				Portal: {
					id: "yggdrasil.portal_arena",
					label: "Portal Arena",
					prompt: "Click to return to Portal Arena",
					targetRuntimeSceneId: "portal_arena_runtime",
					activationRadius: 3.6,
				},
			},
		},
		{
			id: "yggdrasil-ambient-emitter",
			prefabId: "yggdrasil_ambient_emitter",
			stableId: "yggdrasil:audio:ambient",
			transform: {
				position: [0, 16, 0],
			},
			components: {
				SoundEmitter: {
					soundId: "audio_ambient_whistling_dreams",
					volume: 0.14,
					busId: "spatial",
					loop: true,
					autoplay: true,
					refDistance: 24,
					maxDistance: 180,
					rolloffFactor: 0.85,
					distanceModel: "inverse",
				},
			},
		},
		{
			id: "player",
			prefabId: "player",
			stableId: "player",
			transform: {
				position: yggdrasilPrimitiveParitySource.spawnPosition,
			},
			components: {
				CharacterController: {
					groundY: yggdrasilPrimitiveParitySource.spawnPosition[1],
					kinematicCollision: {
						enabled: true,
						offset: 0.04,
						slide: true,
						obstacleChannels: ["worldStatic"],
						snapToGroundDistance: 4,
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
					color: "#d8ffe5",
					intensity: 5.8,
					distance: 22,
					decay: 2,
					visible: true,
				},
			},
		},
	],
} satisfies LevelDefinition;

function applyYggdrasilInstanceComponentOverlay(
	instance: LevelPrefabInstance,
): LevelPrefabInstance {
	const components = yggdrasilInstanceComponentOverlays[instance.id];
	const terrainCell = yggdrasilPrimitiveWalkableSourceIds.includes(instance.id)
		? {
				TerrainChunkCell: {
					packageId: yggdrasilTerrainPackageId,
				},
			}
		: {};

	if (!components && Object.keys(terrainCell).length === 0) {
		return instance;
	}

	return {
		...instance,
		components: {
			...terrainCell,
			...(components ?? {}),
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
			activationRadius: 4,
		},
	};
}
