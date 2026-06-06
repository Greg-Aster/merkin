import type { AssetManifest } from "../../engine/modules/assets/index.js";
import type { AudioContentManifest } from "../../engine/modules/audio/index.js";
import {
	audioAmbientPortalDeck,
	audioAmbientShadowWaltz,
	audioAmbientWhistlingDreams,
} from "./ambientAudioAssets.js";
import { defaultAudioMixerBuses } from "./audioMixerBuses.js";
import {
	audioPortalActivate,
	audioPortalCycle,
	meshPortalGate,
} from "./portalAssets.js";
import { cubemapClassicSky } from "./skyboxAssets.js";

const meshPlayer = {
	id: "mesh_player",
	kind: "mesh",
	url: "builtin://player",
} as const;
const meshPortalField = {
	id: "mesh_portal_field",
	kind: "mesh",
	url: "/assets/game/terrain/portal_field_moor.glb",
	tags: ["terrain", "field", "portal-arena"],
} as const;
const materialPlayer = {
	id: "material_player",
	kind: "material",
	url: "builtin://player-blue",
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
export const portalArenaAssetManifest = {
	assets: [
		meshPlayer,
		meshPortalField,
		meshPortalGate,
		cubemapClassicSky,
		materialPlayer,
		audioPlayerJump,
		audioPlayerChargeRelease,
		audioPortalActivate,
		audioPortalCycle,
		audioAmbientPortalDeck,
		audioAmbientShadowWaltz,
		audioAmbientWhistlingDreams,
	],
	preloadGroups: {
		portal_arena: [
			"mesh_player",
			"mesh_portal_field",
			"mesh_portal_gate",
			"cubemap_classic_sky",
			"material_player",
			"audio_player_jump",
			"audio_player_charge_release",
			"audio_portal_activate",
			"audio_portal_cycle",
			"audio_ambient_portal_deck",
			"audio_ambient_shadow_waltz",
			"audio_ambient_whistling_dreams",
		],
	},
} satisfies AssetManifest;

export const portalArenaAudioContentManifest = {
	mixerBuses: defaultAudioMixerBuses,
	sceneMusic: {
		trackIds: [
			"audio_ambient_portal_deck",
			"audio_ambient_shadow_waltz",
			"audio_ambient_whistling_dreams",
		],
		volume: 0.18,
		busId: "music",
		autoplay: true,
		fadeSeconds: 1.5,
	},
	eventMappings: [
		{
			id: "portal-arena.player.jump",
			eventType: "EntityJumpRequested",
			soundId: "audio_player_jump",
			volume: 0.2,
			busId: "sfx",
			sceneId: "portal_arena_game",
		},
		{
			id: "portal-arena.player.charge-release",
			eventType: "ChargeActionReleased",
			soundId: "audio_player_charge_release",
			volume: 0.28,
			busId: "sfx",
			sceneId: "portal_arena_game",
		},
		{
			id: "portal-arena.portal.activate",
			eventType: "PortalActivated",
			soundId: "audio_portal_activate",
			volume: 0.32,
			busId: "sfx",
			sceneId: "portal_arena_game",
		},
	],
} satisfies AudioContentManifest;
