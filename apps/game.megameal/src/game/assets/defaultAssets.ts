import type { AssetManifest } from "../../engine/modules/assets/index.js";
import type { AudioContentManifest } from "../../engine/modules/audio/index.js";
import {
	audioAmbientDarkShadowsOfDelight,
	audioAmbientShadowWaltz,
	audioAmbientWickedShadowsWhisper,
} from "./ambientAudioAssets.js";
import { defaultAudioMixerBuses } from "./audioMixerBuses.js";
import { observatoryAudioContentManifest } from "./observatoryAssets.js";
import { portalArenaAudioContentManifest } from "./portalArenaAssets.js";
import {
	audioPortalActivate,
	audioPortalCycle,
	meshPortalGate,
} from "./portalAssets.js";
import { sciFiRoomAudioContentManifest } from "./sciFiRoomAssets.js";
import {
	cubemapClassicSky,
	cubemapObservatorySky,
	sampleEquirectangularSky,
	sampleVideoSky,
} from "./skyboxAssets.js";
import { solitudeAudioContentManifest } from "./solitudeAssets.js";
import { yggdrasilAudioContentManifest } from "./yggdrasilAssets.js";

const meshPlayer = {
	id: "mesh_player",
	kind: "mesh",
	url: "builtin://player",
} as const;
const meshArenaFloor = {
	id: "mesh_arena_floor",
	kind: "mesh",
	url: "builtin://arena-floor",
} as const;
const meshIngredient = {
	id: "mesh_ingredient",
	kind: "mesh",
	url: "builtin://ingredient",
} as const;
const meshBox = {
	id: "mesh_box",
	kind: "mesh",
	url: "builtin://box",
} as const;
const meshCylinder = {
	id: "mesh_cylinder",
	kind: "mesh",
	url: "builtin://cylinder",
} as const;
const meshMirandaEngineCore = {
	id: "mesh_miranda_engine_core",
	kind: "mesh",
	url: "builtin://cylinder?radiusTop=1.1&radiusBottom=1.4&height=3.6&radialSegments=18",
} as const;
const materialPlayer = {
	id: "material_player",
	kind: "material",
	url: "builtin://player-blue",
} as const;
const materialArenaFloor = {
	id: "material_arena_floor",
	kind: "material",
	url: "builtin://tile-green",
} as const;
const materialIngredient = {
	id: "material_ingredient",
	kind: "material",
	url: "builtin://ingredient-gold",
} as const;
const materialMirandaFloorMain = {
	id: "material_miranda_floor_main",
	kind: "material",
	url: "builtin://miranda-floor-main",
	material: {
		color: "#252d37",
		emissive: "#10161d",
		emissiveIntensity: 0.05,
		metalness: 0.72,
		roughness: 0.4,
	},
} as const;
const materialMirandaFloorUpper = {
	id: "material_miranda_floor_upper",
	kind: "material",
	url: "builtin://miranda-floor-upper",
	material: {
		color: "#2e3844",
		emissive: "#141b23",
		emissiveIntensity: 0.04,
		metalness: 0.76,
		roughness: 0.36,
	},
} as const;
const materialMirandaCockpitPanel = {
	id: "material_miranda_cockpit_panel",
	kind: "material",
	url: "builtin://miranda-cockpit-panel",
	material: {
		color: "#1e2e3f",
		emissive: "#92dfff",
		emissiveIntensity: 0.9,
		metalness: 0.88,
		roughness: 0.18,
	},
} as const;
const materialMirandaCockpitPanelCenter = {
	id: "material_miranda_cockpit_panel_center",
	kind: "material",
	url: "builtin://miranda-cockpit-panel-center",
	material: {
		color: "#1e2e3f",
		emissive: "#92dfff",
		emissiveIntensity: 1,
		metalness: 0.9,
		roughness: 0.16,
	},
} as const;
const materialMirandaCockpitConsole = {
	id: "material_miranda_cockpit_console",
	kind: "material",
	url: "builtin://miranda-cockpit-console",
	material: {
		color: "#243344",
		emissive: "#69cfff",
		emissiveIntensity: 0.72,
		metalness: 0.84,
		roughness: 0.2,
	},
} as const;
const materialMirandaCrewBunk = {
	id: "material_miranda_crew_bunk",
	kind: "material",
	url: "builtin://miranda-crew-bunk",
	material: {
		color: "#2b3341",
		emissive: "#122030",
		emissiveIntensity: 0.08,
		metalness: 0.58,
		roughness: 0.46,
	},
} as const;
const materialMirandaLockerBank = {
	id: "material_miranda_locker_bank",
	kind: "material",
	url: "builtin://miranda-locker-bank",
	material: {
		color: "#29323d",
		emissive: "#0f1823",
		emissiveIntensity: 0.06,
		metalness: 0.72,
		roughness: 0.34,
	},
} as const;
const materialMirandaCaptainsDesk = {
	id: "material_miranda_captains_desk",
	kind: "material",
	url: "builtin://miranda-captains-desk",
	material: {
		color: "#5a3c2b",
		emissive: "#24160f",
		emissiveIntensity: 0.04,
		metalness: 0.18,
		roughness: 0.78,
	},
} as const;
const materialMirandaCaptainsChair = {
	id: "material_miranda_captains_chair",
	kind: "material",
	url: "builtin://miranda-captains-chair",
	material: {
		color: "#3b2f36",
		emissive: "#181116",
		emissiveIntensity: 0.06,
		metalness: 0.26,
		roughness: 0.74,
	},
} as const;
const materialMirandaRecipeSafe = {
	id: "material_miranda_recipe_safe",
	kind: "material",
	url: "builtin://miranda-recipe-safe",
	material: {
		color: "#2b3138",
		emissive: "#12181d",
		emissiveIntensity: 0.05,
		metalness: 0.82,
		roughness: 0.28,
	},
} as const;
const materialMirandaEngineColumn = {
	id: "material_miranda_engine_column",
	kind: "material",
	url: "builtin://miranda-engine-column",
	material: {
		color: "#46313a",
		emissive: "#181116",
		emissiveIntensity: 0.04,
		metalness: 0.82,
		roughness: 0.28,
	},
} as const;
const materialMirandaEngineCore = {
	id: "material_miranda_engine_core",
	kind: "material",
	url: "builtin://miranda-engine-core",
	material: {
		color: "#5a2d24",
		emissive: "#ffb56b",
		emissiveIntensity: 0.95,
		metalness: 0.86,
		roughness: 0.24,
	},
} as const;
const materialMirandaMedPod = {
	id: "material_miranda_med_pod",
	kind: "material",
	url: "builtin://miranda-med-pod",
	material: {
		color: "#6da8bf",
		emissive: "#8de0ff",
		emissiveIntensity: 0.4,
		metalness: 0.28,
		roughness: 0.16,
		opacity: 0.72,
		transparent: true,
	},
} as const;
const materialMirandaMessTable = {
	id: "material_miranda_mess_table",
	kind: "material",
	url: "builtin://miranda-mess-table",
	material: {
		color: "#5d4638",
		emissive: "#241912",
		emissiveIntensity: 0.04,
		metalness: 0.18,
		roughness: 0.82,
	},
} as const;
const materialMirandaMessCounter = {
	id: "material_miranda_mess_counter",
	kind: "material",
	url: "builtin://miranda-mess-counter",
	material: {
		color: "#3f2d29",
		emissive: "#160e0d",
		emissiveIntensity: 0.06,
		metalness: 0.46,
		roughness: 0.54,
	},
} as const;
const materialMirandaChapelAltar = {
	id: "material_miranda_chapel_altar",
	kind: "material",
	url: "builtin://miranda-chapel-altar",
	material: {
		color: "#332934",
		emissive: "#b991ff",
		emissiveIntensity: 0.22,
		metalness: 0.36,
		roughness: 0.58,
	},
} as const;
const materialMirandaChapelMonolith = {
	id: "material_miranda_chapel_monolith",
	kind: "material",
	url: "builtin://miranda-chapel-monolith",
	material: {
		color: "#2f2b39",
		emissive: "#8058b8",
		emissiveIntensity: 0.16,
		metalness: 0.24,
		roughness: 0.74,
	},
} as const;
const materialMirandaBrigCell = {
	id: "material_miranda_brig_cell",
	kind: "material",
	url: "builtin://miranda-brig-cell",
	material: {
		color: "#3f3034",
		emissive: "#150f12",
		emissiveIntensity: 0.05,
		metalness: 0.6,
		roughness: 0.42,
	},
} as const;
const materialMirandaBrigDesk = {
	id: "material_miranda_brig_desk",
	kind: "material",
	url: "builtin://miranda-brig-desk",
	material: {
		color: "#4a3732",
		emissive: "#1b1310",
		emissiveIntensity: 0.04,
		metalness: 0.22,
		roughness: 0.8,
	},
} as const;
const materialMirandaCargoStackA = {
	id: "material_miranda_cargo_stack_a",
	kind: "material",
	url: "builtin://miranda-cargo-stack-a",
	material: {
		color: "#564136",
		emissive: "#241a13",
		emissiveIntensity: 0.04,
		metalness: 0.16,
		roughness: 0.86,
	},
} as const;
const materialMirandaCargoStack = {
	id: "material_miranda_cargo_stack",
	kind: "material",
	url: "builtin://miranda-cargo-stack",
	material: {
		color: "#5a4334",
		emissive: "#241a13",
		emissiveIntensity: 0.04,
		metalness: 0.16,
		roughness: 0.86,
	},
} as const;
const materialMirandaServerBank = {
	id: "material_miranda_server_bank",
	kind: "material",
	url: "builtin://miranda-server-bank",
	material: {
		color: "#202634",
		emissive: "#7dc8ff",
		emissiveIntensity: 0.28,
		metalness: 0.86,
		roughness: 0.22,
	},
} as const;
const materialMirandaServerBankWide = {
	id: "material_miranda_server_bank_wide",
	kind: "material",
	url: "builtin://miranda-server-bank-wide",
	material: {
		color: "#202634",
		emissive: "#7dc8ff",
		emissiveIntensity: 0.32,
		metalness: 0.86,
		roughness: 0.22,
	},
} as const;
const materialMirandaStoryMarkerCyan = {
	id: "material_miranda_story_marker_cyan",
	kind: "material",
	url: "builtin://miranda-story-marker-cyan",
	material: {
		color: "#8de0ff",
	},
} as const;
const materialMirandaStoryMarkerAmber = {
	id: "material_miranda_story_marker_amber",
	kind: "material",
	url: "builtin://miranda-story-marker-amber",
	material: {
		color: "#ffc584",
	},
} as const;
const materialMirandaStoryMarkerRed = {
	id: "material_miranda_story_marker_red",
	kind: "material",
	url: "builtin://miranda-story-marker-red",
	material: {
		color: "#ff8ea6",
	},
} as const;
const materialMirandaStoryMarkerMagenta = {
	id: "material_miranda_story_marker_magenta",
	kind: "material",
	url: "builtin://miranda-story-marker-magenta",
	material: {
		color: "#cba7ff",
	},
} as const;
const audioUiCollect = {
	id: "audio_ui_collect",
	kind: "audio",
	url: "/audio/sfx/interface-click-tone.mp3",
	tags: ["ui", "collect", "sfx"],
} as const;
const audioPlayerJump = {
	id: "audio_player_jump",
	kind: "audio",
	url: "/audio/sfx/interface-sweep.mp3",
	tags: ["player", "jump", "sfx"],
} as const;
const audioPlayerChargeRelease = {
	id: "audio_player_charge_release",
	kind: "audio",
	url: "/audio/sfx/22-kenney-forceField_001.mp3",
	tags: ["player", "charge", "sfx"],
} as const;
export const prototypeAssetManifest = {
	assets: [
		meshPlayer,
		meshArenaFloor,
		meshIngredient,
		cubemapClassicSky,
		sampleEquirectangularSky,
		sampleVideoSky,
		materialPlayer,
		materialArenaFloor,
		materialIngredient,
		audioUiCollect,
		audioPlayerJump,
		audioPlayerChargeRelease,
	],
	preloadGroups: {
		prototype_arena: [
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
	},
} satisfies AssetManifest;

export const mirandaDeckAssetManifest = {
	assets: [
		meshPlayer,
		meshBox,
		meshCylinder,
		meshMirandaEngineCore,
		meshPortalGate,
		cubemapObservatorySky,
		materialPlayer,
		materialMirandaFloorMain,
		materialMirandaFloorUpper,
		materialMirandaCockpitPanel,
		materialMirandaCockpitPanelCenter,
		materialMirandaCockpitConsole,
		materialMirandaCrewBunk,
		materialMirandaLockerBank,
		materialMirandaCaptainsDesk,
		materialMirandaCaptainsChair,
		materialMirandaRecipeSafe,
		materialMirandaEngineColumn,
		materialMirandaEngineCore,
		materialMirandaMedPod,
		materialMirandaMessTable,
		materialMirandaMessCounter,
		materialMirandaChapelAltar,
		materialMirandaChapelMonolith,
		materialMirandaBrigCell,
		materialMirandaBrigDesk,
		materialMirandaCargoStackA,
		materialMirandaCargoStack,
		materialMirandaServerBank,
		materialMirandaServerBankWide,
		materialMirandaStoryMarkerCyan,
		materialMirandaStoryMarkerAmber,
		materialMirandaStoryMarkerRed,
		materialMirandaStoryMarkerMagenta,
		audioPlayerJump,
		audioPlayerChargeRelease,
		audioPortalActivate,
		audioPortalCycle,
		audioAmbientWickedShadowsWhisper,
		audioAmbientDarkShadowsOfDelight,
		audioAmbientShadowWaltz,
	],
	preloadGroups: {
		miranda_deck: [
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
	},
} satisfies AssetManifest;

export const prototypeAudioContentManifest = {
	mixerBuses: defaultAudioMixerBuses,
	eventMappings: [
		{
			id: "prototype.collect.ingredient",
			eventType: "ItemCollected",
			soundId: "audio_ui_collect",
			volume: 0.35,
			busId: "sfx",
			sceneId: "prototype_game",
		},
		{
			id: "prototype.player.jump",
			eventType: "EntityJumpRequested",
			soundId: "audio_player_jump",
			volume: 0.2,
			busId: "sfx",
			sceneId: "prototype_game",
		},
		{
			id: "prototype.player.charge-release",
			eventType: "ChargeActionReleased",
			soundId: "audio_player_charge_release",
			volume: 0.28,
			busId: "sfx",
			sceneId: "prototype_game",
		},
	],
} satisfies AudioContentManifest;

export const mirandaDeckAudioContentManifest = {
	mixerBuses: defaultAudioMixerBuses,
	sceneMusic: {
		trackIds: [
			"audio_ambient_wicked_shadows_whisper",
			"audio_ambient_dark_shadows_of_delight",
			"audio_ambient_shadow_waltz",
		],
		volume: 0.16,
		busId: "music",
		autoplay: true,
		fadeSeconds: 1.5,
	},
	eventMappings: [
		{
			id: "miranda.player.jump",
			eventType: "EntityJumpRequested",
			soundId: "audio_player_jump",
			volume: 0.2,
			busId: "sfx",
			sceneId: "miranda_deck_game",
		},
		{
			id: "miranda.player.charge-release",
			eventType: "ChargeActionReleased",
			soundId: "audio_player_charge_release",
			volume: 0.28,
			busId: "sfx",
			sceneId: "miranda_deck_game",
		},
		{
			id: "miranda.portal.activate",
			eventType: "PortalActivated",
			soundId: "audio_portal_activate",
			volume: 0.32,
			busId: "sfx",
			sceneId: "miranda_deck_game",
		},
	],
} satisfies AudioContentManifest;

export function audioContentManifestForRuntimeScene(
	runtimeSceneManifestId: string,
): AudioContentManifest {
	if (runtimeSceneManifestId === "portal_arena_runtime") {
		return portalArenaAudioContentManifest;
	}

	if (runtimeSceneManifestId === "miranda_deck_runtime") {
		return mirandaDeckAudioContentManifest;
	}

	if (runtimeSceneManifestId === "observatory_runtime") {
		return observatoryAudioContentManifest;
	}

	if (runtimeSceneManifestId === "sci_fi_room_runtime") {
		return sciFiRoomAudioContentManifest;
	}

	if (runtimeSceneManifestId === "solitude_runtime") {
		return solitudeAudioContentManifest;
	}

	if (runtimeSceneManifestId === "yggdrasil_runtime") {
		return yggdrasilAudioContentManifest;
	}

	if (runtimeSceneManifestId === "prototype_arena_runtime") {
		return prototypeAudioContentManifest;
	}

	return { eventMappings: [] };
}
