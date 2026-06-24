import { loadRuntimeSceneManifest } from "../../engine/data/index.js";
import {
	mirandaDeckAssetManifest,
	observatoryAssetManifest,
	portalArenaAssetManifest,
	prototypeAssetManifest,
	sciFiRoomAssetManifest,
	solitudeAssetManifest,
	starterAssetManifest,
} from "../assets/index.js";
import { yggdrasilAssetManifest } from "../assets/yggdrasilAssets.js";
import { collisionReadiness as observatoryCollisionReadiness } from "../generated/observatoryCollisionRuntime.js";
import {
	terrainPackagesForRuntimeScene,
	terrainReadinessForRuntimeScene,
} from "../generated/terrainRuntime.js";
import {
	mirandaDeckPrefabs,
	observatoryPrefabs,
	portalArenaPrefabs,
	prototypePrefabs,
	sciFiRoomPrefabs,
	solitudePrefabs,
	starterPrefabs,
} from "../prefabs/index.js";
import { yggdrasilPrefabs } from "../prefabs/yggdrasilPrefabs.js";
import {
	mirandaDeckLevel,
	prototypeLevel,
	starterLevel,
} from "./defaultLevels.js";
import { observatoryLevel } from "./observatoryLevel.js";
import { portalArenaLevel } from "./portalArenaLevel.js";
import { applyPublishedLevelInstanceTransformOverrides } from "./publishedLevelOverrides.js";
import {
	mirandaDeckRenderProfile,
	observatoryRenderProfile,
	portalArenaRenderProfile,
	prototypeRenderProfile,
	sciFiRoomRenderProfile,
	solitudeRenderProfile,
	starterRenderProfile,
	yggdrasilRenderProfile,
} from "./renderProfiles.js";
import { sciFiRoomLevel } from "./sciFiRoomLevel.js";
import {
	solitudeExpectedRuntimeImports,
	solitudeLevel,
} from "./solitudeLevel.js";
import {
	yggdrasilExpectedRuntimeImports,
	yggdrasilLevel,
} from "./yggdrasilLevel.js";

export const portalArenaRuntimeSceneManifest = loadRuntimeSceneManifest({
	schemaVersion: 1,
	id: "portal_arena_runtime",
	generatedAt: "2026-06-05T00:00:00.000Z",
	source: {
		kind: "authored",
		id: "portal_arena",
	},
	level: applyPublishedLevelInstanceTransformOverrides({
		runtimeSceneId: "portal_arena_runtime",
		level: portalArenaLevel,
	}),
	prefabs: portalArenaPrefabs,
	assets: portalArenaAssetManifest,
	renderProfile: portalArenaRenderProfile,
	terrainPackages: terrainPackagesForRuntimeScene("portal_arena_runtime"),
	readiness: {
		playerStableId: "player",
		...terrainReadinessForRuntimeScene("portal_arena_runtime"),
		requiredAssetIds: [
			"mesh_player",
			"mesh_portal_field",
			"mesh_portal_gate",
			"texture_portal_arena_equirectangular_sky",
			"material_player",
			"audio_player_jump",
			"audio_player_charge_release",
			"audio_portal_activate",
			"audio_portal_cycle",
			"audio_ambient_portal_deck",
			"audio_ambient_shadow_waltz",
			"audio_ambient_whistling_dreams",
		],
		requiredCollisionPrefabIds: ["portal_gate", "player"],
		requiredCollisionStableIds: [
			"portal-arena:portal:prototype-arena",
			"portal-arena:portal:miranda-deck",
			"portal-arena:portal:observatory",
			"portal-arena:portal:solitude",
			"portal-arena:portal:sci-fi-room",
			"portal-arena:portal:yggdrasil",
			"player",
		],
		requiredLightStableIds: ["player"],
	},
});

export const starterRuntimeSceneManifest = loadRuntimeSceneManifest({
	schemaVersion: 1,
	id: "starter_runtime",
	generatedAt: "2026-06-24T00:00:00.000Z",
	source: {
		kind: "prototype",
		id: "starter_level",
	},
	level: applyPublishedLevelInstanceTransformOverrides({
		runtimeSceneId: "starter_runtime",
		level: starterLevel,
	}),
	prefabs: starterPrefabs,
	assets: starterAssetManifest,
	renderProfile: starterRenderProfile,
	readiness: {
		playerStableId: "player",
		requiredAssetIds: [
			"mesh_player",
			"mesh_arena_floor",
			"mesh_box",
			"cubemap_classic_sky",
			"material_player",
			"material_arena_floor",
		],
		requiredCollisionPrefabIds: ["arena_floor", "player"],
		requiredCollisionStableIds: ["starter:floor", "player"],
	},
});

export const prototypeRuntimeSceneManifest = loadRuntimeSceneManifest({
	schemaVersion: 1,
	id: "prototype_arena_runtime",
	generatedAt: "2026-06-05T00:00:00.000Z",
	source: {
		kind: "prototype",
		id: "prototype_arena",
	},
	level: applyPublishedLevelInstanceTransformOverrides({
		runtimeSceneId: "prototype_arena_runtime",
		level: prototypeLevel,
	}),
	prefabs: prototypePrefabs,
	assets: prototypeAssetManifest,
	renderProfile: prototypeRenderProfile,
	terrainPackages: terrainPackagesForRuntimeScene("prototype_arena_runtime"),
	readiness: {
		playerStableId: "player",
		...terrainReadinessForRuntimeScene("prototype_arena_runtime"),
		requiredAssetIds: [
			"mesh_player",
			"mesh_arena_floor",
			"mesh_ingredient",
			"cubemap_classic_sky",
			"material_player",
			"material_arena_floor",
			"material_ingredient",
			"audio_ui_collect",
			"audio_player_jump",
			"audio_player_charge_release",
		],
		requiredCollisionPrefabIds: ["player"],
	},
});

export const mirandaDeckRuntimeSceneManifest = loadRuntimeSceneManifest({
	schemaVersion: 1,
	id: "miranda_deck_runtime",
	generatedAt: "2026-06-05T00:00:00.000Z",
	source: {
		kind: "authored",
		id: "miranda.scene#deck",
	},
	level: applyPublishedLevelInstanceTransformOverrides({
		runtimeSceneId: "miranda_deck_runtime",
		level: mirandaDeckLevel,
	}),
	prefabs: mirandaDeckPrefabs,
	assets: mirandaDeckAssetManifest,
	renderProfile: mirandaDeckRenderProfile,
	terrainPackages: terrainPackagesForRuntimeScene("miranda_deck_runtime"),
	readiness: {
		playerStableId: "player",
		...terrainReadinessForRuntimeScene("miranda_deck_runtime"),
		requiredAssetIds: [
			"mesh_player",
			"mesh_box",
			"mesh_cylinder",
			"mesh_miranda_engine_core",
			"mesh_portal_gate",
			"cubemap_observatory_sky",
			"material_player",
			"material_miranda_floor_main",
			"material_miranda_floor_upper",
			"material_miranda_cockpit_panel",
			"material_miranda_cockpit_panel_center",
			"material_miranda_cockpit_console",
			"material_miranda_crew_bunk",
			"material_miranda_locker_bank",
			"material_miranda_captains_desk",
			"material_miranda_captains_chair",
			"material_miranda_recipe_safe",
			"material_miranda_engine_column",
			"material_miranda_engine_core",
			"material_miranda_med_pod",
			"material_miranda_mess_table",
			"material_miranda_mess_counter",
			"material_miranda_chapel_altar",
			"material_miranda_chapel_monolith",
			"material_miranda_brig_cell",
			"material_miranda_brig_desk",
			"material_miranda_cargo_stack_a",
			"material_miranda_cargo_stack",
			"material_miranda_server_bank",
			"material_miranda_server_bank_wide",
			"material_miranda_story_marker_cyan",
			"material_miranda_story_marker_amber",
			"material_miranda_story_marker_red",
			"material_miranda_story_marker_magenta",
			"audio_player_jump",
			"audio_player_charge_release",
			"audio_portal_activate",
			"audio_portal_cycle",
			"audio_ambient_wicked_shadows_whisper",
			"audio_ambient_dark_shadows_of_delight",
			"audio_ambient_shadow_waltz",
		],
		requiredCollisionPrefabIds: [
			"miranda_cockpit_panel_side",
			"miranda_cockpit_panel_center",
			"miranda_crew_bunk",
			"miranda_locker_bank",
			"miranda_captains_desk",
			"miranda_captains_chair",
			"miranda_recipe_safe",
			"miranda_engine_column",
			"miranda_engine_core",
			"miranda_med_pod",
			"miranda_mess_table_large",
			"miranda_mess_table_small",
			"miranda_mess_counter",
			"miranda_chapel_altar",
			"miranda_brig_cell",
			"miranda_brig_desk",
			"miranda_cargo_stack_a",
			"miranda_cargo_stack_b",
			"miranda_cargo_stack_c",
			"miranda_cargo_stack_d",
			"miranda_chapel_monolith",
			"miranda_cockpit_console",
			"miranda_server_bank_tall",
			"miranda_server_bank_wide",
			"miranda_story_marker_cyan",
			"miranda_story_marker_amber",
			"miranda_story_marker_red",
			"miranda_story_marker_magenta",
			"portal_gate",
			"player",
		],
		requiredCollisionStableIds: [
			"miranda:cockpit:panel:left",
			"miranda:cockpit:panel:center",
			"miranda:cockpit:panel:right",
			"miranda:cockpit:console",
			"miranda:crew:bunk:port:a",
			"miranda:crew:bunk:port:b",
			"miranda:crew:bunk:starboard:a",
			"miranda:crew:bunk:starboard:b",
			"miranda:crew:locker-bank",
			"miranda:captain:desk",
			"miranda:captain:chair",
			"miranda:captain:recipe-safe",
			"miranda:engine:core",
			"miranda:engine:column:a",
			"miranda:engine:column:b",
			"miranda:engine:column:c",
			"miranda:engine:column:d",
			"miranda:airlock:return-portal",
			"miranda:medbay:pod:a",
			"miranda:medbay:pod:b",
			"miranda:medbay:pod:c",
			"miranda:medbay:pod:d",
			"miranda:mess:table:a",
			"miranda:mess:table:b",
			"miranda:mess:counter",
			"miranda:chapel:altar",
			"miranda:chapel:monolith:a",
			"miranda:chapel:monolith:b",
			"miranda:brig:cell:a",
			"miranda:brig:cell:b",
			"miranda:brig:cell:c",
			"miranda:brig:cell:d",
			"miranda:brig:desk",
			"miranda:cargo:stack:a",
			"miranda:cargo:stack:b",
			"miranda:cargo:stack:c",
			"miranda:cargo:stack:d",
			"miranda:archive:server-bank:a",
			"miranda:archive:server-bank:b",
			"miranda:archive:server-bank:c",
			"miranda:archive:server-bank:d",
			"miranda:archive:server-bank:e",
			"miranda:cockpit:story-note:captain-log",
			"miranda:crew:story-note:medical-watch",
			"miranda:captain:story-note:first-officer",
			"miranda:captain:story-note:vault-fragment",
			"miranda:engine:story-note:engineering-memo",
			"miranda:medbay:story-note:quarantine",
			"miranda:mess:story-note:ledger",
			"miranda:brig:story-note:confession",
			"miranda:archive:story-note:index",
			"player",
		],
		requiredLightStableIds: [
			"miranda:command-gallery:beacon-light",
			"miranda:observation-gallery:light",
			"miranda:archive-gallery:light",
		],
	},
});

export const observatoryRuntimeSceneManifest = loadRuntimeSceneManifest({
	schemaVersion: 1,
	id: "observatory_runtime",
	generatedAt: "2026-06-06T00:00:00.000Z",
	source: {
		kind: "authored",
		id: "observatory.scene#playable-foundation",
	},
	level: applyPublishedLevelInstanceTransformOverrides({
		runtimeSceneId: "observatory_runtime",
		level: observatoryLevel,
	}),
	prefabs: observatoryPrefabs,
	assets: observatoryAssetManifest,
	renderProfile: observatoryRenderProfile,
	terrainPackages: terrainPackagesForRuntimeScene("observatory_runtime"),
	readiness: {
		playerStableId: "player",
		...terrainReadinessForRuntimeScene("observatory_runtime"),
		requiredAssetIds: [
			"mesh_player",
			"mesh_observatory_environment",
			"mesh_water_plane",
			"mesh_observatory_firefly_marker",
			"cubemap_observatory_sky",
			"material_player",
			"material_water_surface",
			"material_observatory_firefly",
			"audio_player_jump",
			"audio_player_charge_release",
			"audio_ambient_portal_deck",
		],
		requiredCollisionPrefabIds: [
			...observatoryCollisionReadiness.requiredCollisionPrefabIds.filter(
				(prefabId) => prefabId !== "observatory_walkable_mesh",
			),
			"player",
		],
		requiredCollisionStableIds: [
			...observatoryCollisionReadiness.requiredCollisionStableIds.filter(
				(stableId) => !stableId.startsWith("observatory:walkable-mesh:chunk:"),
			),
			"player",
		],
		requiredLightStableIds: [
			"player",
			"observatory:firefly:archive",
			"observatory:firefly:lantern",
			"observatory:firefly:tide",
		],
	},
});

export const sciFiRoomRuntimeSceneManifest = loadRuntimeSceneManifest({
	schemaVersion: 1,
	id: "sci_fi_room_runtime",
	generatedAt: "2026-06-06T00:00:00.000Z",
	source: {
		kind: "authored",
		id: "sci-fi-room.scene#playable-foundation",
	},
	level: applyPublishedLevelInstanceTransformOverrides({
		runtimeSceneId: "sci_fi_room_runtime",
		level: sciFiRoomLevel,
	}),
	prefabs: sciFiRoomPrefabs,
	assets: sciFiRoomAssetManifest,
	renderProfile: sciFiRoomRenderProfile,
	terrainPackages: terrainPackagesForRuntimeScene("sci_fi_room_runtime"),
	readiness: {
		playerStableId: "player",
		...terrainReadinessForRuntimeScene("sci_fi_room_runtime"),
		requiredAssetIds: [
			"mesh_player",
			"mesh_portal_gate",
			"mesh_sci_fi_room_floor_slab",
			"mesh_sci_fi_room_column",
			"mesh_sci_fi_room_console",
			"mesh_sci_fi_room_anomaly_marker",
			"mesh_sci_fi_room_story_marker",
			"cubemap_observatory_sky",
			"material_player",
			"material_sci_fi_room_interior_floor",
			"material_sci_fi_room_courtyard_floor",
			"material_sci_fi_room_wasteland_floor",
			"material_sci_fi_room_wall_panel",
			"material_sci_fi_room_console",
			"material_sci_fi_room_anomaly",
			"material_sci_fi_room_story_marker",
			"audio_player_jump",
			"audio_player_charge_release",
			"audio_portal_activate",
			"audio_portal_cycle",
		],
		requiredCollisionPrefabIds: ["portal_gate", "player"],
		requiredCollisionStableIds: ["sci-fi-room:portal:observatory", "player"],
		requiredLightStableIds: ["player"],
	},
});

export const solitudeRuntimeSceneManifest = loadRuntimeSceneManifest({
	schemaVersion: 1,
	id: "solitude_runtime",
	generatedAt: "2026-06-06T00:00:00.000Z",
	source: {
		kind: "authored",
		id: "solitude.scene#playable-foundation",
	},
	level: applyPublishedLevelInstanceTransformOverrides({
		runtimeSceneId: "solitude_runtime",
		level: solitudeLevel,
	}),
	prefabs: solitudePrefabs,
	assets: solitudeAssetManifest,
	renderProfile: solitudeRenderProfile,
	terrainPackages: terrainPackagesForRuntimeScene("solitude_runtime"),
	readiness: {
		playerStableId: solitudeExpectedRuntimeImports.readiness.playerStableId,
		...terrainReadinessForRuntimeScene("solitude_runtime"),
		requiredAssetIds: solitudeExpectedRuntimeImports.assetIds,
		requiredCollisionPrefabIds:
			solitudeExpectedRuntimeImports.readiness.requiredCollisionPrefabIds,
		requiredCollisionStableIds:
			solitudeExpectedRuntimeImports.readiness.requiredCollisionStableIds,
		requiredLightStableIds:
			solitudeExpectedRuntimeImports.readiness.requiredLightStableIds,
	},
});

export const yggdrasilRuntimeSceneManifest = loadRuntimeSceneManifest({
	schemaVersion: 1,
	id: "yggdrasil_runtime",
	generatedAt: "2026-06-06T00:00:00.000Z",
	source: {
		kind: "authored",
		id: "yggdrasil.scene#primitive-parity-foundation",
	},
	level: applyPublishedLevelInstanceTransformOverrides({
		runtimeSceneId: "yggdrasil_runtime",
		level: yggdrasilLevel,
	}),
	prefabs: yggdrasilPrefabs,
	assets: yggdrasilAssetManifest,
	renderProfile: yggdrasilRenderProfile,
	terrainPackages: terrainPackagesForRuntimeScene("yggdrasil_runtime"),
	readiness: {
		playerStableId: yggdrasilExpectedRuntimeImports.readiness.playerStableId,
		...terrainReadinessForRuntimeScene("yggdrasil_runtime"),
		requiredAssetIds: yggdrasilExpectedRuntimeImports.assetIds,
		requiredCollisionPrefabIds:
			yggdrasilExpectedRuntimeImports.readiness.requiredCollisionPrefabIds,
		requiredCollisionStableIds:
			yggdrasilExpectedRuntimeImports.readiness.requiredCollisionStableIds,
		requiredLightStableIds:
			yggdrasilExpectedRuntimeImports.readiness.requiredLightStableIds,
	},
});

export const defaultRuntimeSceneManifests = [
	starterRuntimeSceneManifest,
	portalArenaRuntimeSceneManifest,
	prototypeRuntimeSceneManifest,
	mirandaDeckRuntimeSceneManifest,
	observatoryRuntimeSceneManifest,
	sciFiRoomRuntimeSceneManifest,
	solitudeRuntimeSceneManifest,
	yggdrasilRuntimeSceneManifest,
] as const;

export const defaultRuntimeSceneManifest = starterRuntimeSceneManifest;

export function getRuntimeSceneManifest(
	id: string,
): (typeof defaultRuntimeSceneManifests)[number] | undefined {
	return defaultRuntimeSceneManifests.find((manifest) => manifest.id === id);
}
