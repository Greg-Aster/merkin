import type { AssetManifest } from "../../engine/modules/assets/index.js";
import type { AudioContentManifest } from "../../engine/modules/audio/index.js";
import { audioAmbientWickedShadowsWhisper } from "./ambientAudioAssets.js";
import { defaultAudioMixerBuses } from "./audioMixerBuses.js";
import {
	audioPortalActivate,
	audioPortalCycle,
	meshPortalGate,
} from "./portalAssets.js";
import { cubemapObservatorySky } from "./skyboxAssets.js";

const meshPlayer = {
	id: "mesh_player",
	kind: "mesh",
	url: "builtin://player",
} as const;
const meshSolitudeGroundPlateau = {
	id: "mesh_solitude_ground_plateau",
	kind: "mesh",
	url: "builtin://box",
	tags: ["solitude", "ground", "plateau", "walkable", "primitive"],
} as const;
const meshSolitudeGroundDais = {
	id: "mesh_solitude_ground_dais",
	kind: "mesh",
	url: "builtin://cylinder?radiusTop=1&radiusBottom=1&height=1&radialSegments=24",
	tags: ["solitude", "ground", "dais", "walkable", "primitive"],
} as const;
const meshSolitudePillar = {
	id: "mesh_solitude_pillar",
	kind: "mesh",
	url: "builtin://cylinder?radiusTop=0.72&radiusBottom=0.98&height=1&radialSegments=18",
	tags: ["solitude", "pillar", "blocker", "primitive"],
} as const;
const meshSolitudeRingFragment = {
	id: "mesh_solitude_ring_fragment",
	kind: "mesh",
	url: "builtin://box",
	tags: ["solitude", "ring-fragment", "blocker", "primitive"],
} as const;
const meshSolitudeFireflyMarker = {
	id: "mesh_solitude_firefly_marker",
	kind: "mesh",
	url: "builtin://cylinder?radiusTop=0.22&radiusBottom=0.28&height=0.8&radialSegments=12",
	tags: ["solitude", "firefly", "story-note", "primitive"],
} as const;
const materialPlayer = {
	id: "material_player",
	kind: "material",
	url: "builtin://player-blue",
} as const;
const materialSolitudePlateau = {
	id: "material_solitude_plateau",
	kind: "material",
	url: "builtin://solitude-plateau",
	material: {
		color: "#555e69",
		emissive: "#171b22",
		emissiveIntensity: 0.02,
		metalness: 0.04,
		roughness: 0.97,
	},
} as const;
const materialSolitudeDais = {
	id: "material_solitude_dais",
	kind: "material",
	url: "builtin://solitude-dais",
	material: {
		color: "#4e5865",
		emissive: "#251138",
		emissiveIntensity: 0.08,
		metalness: 0.08,
		roughness: 0.91,
	},
} as const;
const materialSolitudePillar = {
	id: "material_solitude_pillar",
	kind: "material",
	url: "builtin://solitude-pillar",
	material: {
		color: "#5f6874",
		emissive: "#171b22",
		emissiveIntensity: 0.03,
		metalness: 0.04,
		roughness: 0.94,
	},
} as const;
const materialSolitudeRingFragment = {
	id: "material_solitude_ring_fragment",
	kind: "material",
	url: "builtin://solitude-ring-fragment",
	material: {
		color: "#62536e",
		emissive: "#2d0f38",
		emissiveIntensity: 0.12,
		metalness: 0.1,
		roughness: 0.82,
	},
} as const;
const materialSolitudeFirefly = {
	id: "material_solitude_firefly",
	kind: "material",
	url: "builtin://solitude-firefly",
	material: {
		color: "#ff4658",
		emissive: "#ff4658",
		emissiveIntensity: 1.4,
		metalness: 0,
		roughness: 0.22,
	},
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

export const solitudeAssetManifest = {
	assets: [
		meshPlayer,
		meshPortalGate,
		meshSolitudeGroundPlateau,
		meshSolitudeGroundDais,
		meshSolitudePillar,
		meshSolitudeRingFragment,
		meshSolitudeFireflyMarker,
		cubemapObservatorySky,
		materialPlayer,
		materialSolitudePlateau,
		materialSolitudeDais,
		materialSolitudePillar,
		materialSolitudeRingFragment,
		materialSolitudeFirefly,
		audioPlayerJump,
		audioPlayerChargeRelease,
		audioPortalActivate,
		audioPortalCycle,
		audioAmbientWickedShadowsWhisper,
	],
	preloadGroups: {
		solitude: [
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
	},
} satisfies AssetManifest;

export const solitudeAudioContentManifest = {
	mixerBuses: defaultAudioMixerBuses,
	sceneMusic: {
		trackId: "audio_ambient_wicked_shadows_whisper",
		volume: 0.18,
		busId: "music",
		autoplay: true,
		fadeSeconds: 1.5,
	},
	eventMappings: [
		{
			id: "solitude.player.jump",
			eventType: "EntityJumpRequested",
			soundId: "audio_player_jump",
			volume: 0.2,
			busId: "sfx",
			sceneId: "solitude_game",
		},
		{
			id: "solitude.player.charge-release",
			eventType: "ChargeActionReleased",
			soundId: "audio_player_charge_release",
			volume: 0.28,
			busId: "sfx",
			sceneId: "solitude_game",
		},
		{
			id: "solitude.portal.activate",
			eventType: "PortalActivated",
			soundId: "audio_portal_activate",
			volume: 0.32,
			busId: "sfx",
			sceneId: "solitude_game",
		},
	],
} satisfies AudioContentManifest;
