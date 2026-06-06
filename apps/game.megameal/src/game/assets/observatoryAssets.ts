import type { AssetManifest } from "../../engine/modules/assets/index.js";
import type { AudioContentManifest } from "../../engine/modules/audio/index.js";
import { cubemapObservatorySky } from "./skyboxAssets.js";
import { materialWaterDarkStill, meshWaterPlane } from "./waterAssets.js";

const meshPlayer = {
	id: "mesh_player",
	kind: "mesh",
	url: "builtin://player",
} as const;
const meshObservatoryEnvironment = {
	id: "mesh_observatory_environment",
	kind: "mesh",
	url: "/assets/game/observatory/observatory-environment.glb",
	tags: ["terrain", "observatory", "source-glb"],
} as const;
const meshObservatoryFireflyMarker = {
	id: "mesh_observatory_firefly_marker",
	kind: "mesh",
	url: "builtin://cylinder?radiusTop=0.42&radiusBottom=0.42&height=0.42&radialSegments=16",
	tags: ["firefly", "light", "observatory"],
} as const;
const materialPlayer = {
	id: "material_player",
	kind: "material",
	url: "builtin://player-blue",
} as const;
const materialObservatoryFirefly = {
	id: "material_observatory_firefly",
	kind: "material",
	url: "builtin://observatory-firefly",
	material: {
		color: "#f4ffb8",
		emissive: "#f4ffb8",
		emissiveIntensity: 1.8,
		metalness: 0,
		roughness: 0.18,
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

export const observatoryAssetManifest = {
	assets: [
		meshPlayer,
		meshObservatoryEnvironment,
		meshWaterPlane,
		meshObservatoryFireflyMarker,
		cubemapObservatorySky,
		materialPlayer,
		materialWaterDarkStill,
		materialObservatoryFirefly,
		audioPlayerJump,
		audioPlayerChargeRelease,
	],
	preloadGroups: {
		observatory: [
			"mesh_player",
			"mesh_observatory_environment",
			"mesh_water_plane",
			"mesh_observatory_firefly_marker",
			"cubemap_observatory_sky",
			"material_player",
			"material_water_dark_still",
			"material_observatory_firefly",
			"audio_player_jump",
			"audio_player_charge_release",
		],
	},
} satisfies AssetManifest;

export const observatoryAudioContentManifest = {
	eventMappings: [
		{
			id: "observatory.player.jump",
			eventType: "EntityJumpRequested",
			soundId: "audio_player_jump",
			volume: 0.2,
			sceneId: "observatory_game",
		},
		{
			id: "observatory.player.charge-release",
			eventType: "ChargeActionReleased",
			soundId: "audio_player_charge_release",
			volume: 0.28,
			sceneId: "observatory_game",
		},
	],
} satisfies AudioContentManifest;
