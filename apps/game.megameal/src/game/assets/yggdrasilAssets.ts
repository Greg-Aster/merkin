import type { AssetManifest } from "../../engine/modules/assets/index.js";
import type { AudioContentManifest } from "../../engine/modules/audio/index.js";
import {
	createPrimitiveMaterialAssets,
	createPrimitiveMeshAssets,
} from "../content/primitiveSceneContent.js";
import {
	yggdrasilPrimitiveContentOptions,
	yggdrasilPrimitiveNodes,
} from "../content/yggdrasilPrimitiveParity.js";
import { audioAmbientWhistlingDreams } from "./ambientAudioAssets.js";
import { defaultAudioMixerBuses } from "./audioMixerBuses.js";
import {
	audioPortalActivate,
	audioPortalCycle,
	meshPortalGate,
} from "./portalAssets.js";
import { cubemapObservatorySky } from "./skyboxAssets.js";
import { materialWaterSurface, meshWaterPlane } from "./waterAssets.js";

const meshPlayer = {
	id: "mesh_player",
	kind: "mesh",
	url: "builtin://player",
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

const yggdrasilPrimitiveMeshAssets = createPrimitiveMeshAssets(
	yggdrasilPrimitiveNodes,
	yggdrasilPrimitiveContentOptions,
);
const yggdrasilPrimitiveMaterialAssets = createPrimitiveMaterialAssets(
	yggdrasilPrimitiveNodes,
	yggdrasilPrimitiveContentOptions,
);

export const yggdrasilRuntimeAssetIds = [
	"mesh_player",
	"mesh_portal_gate",
	"mesh_water_plane",
	...yggdrasilPrimitiveMeshAssets.map((asset) => asset.id),
	"cubemap_observatory_sky",
	"material_player",
	"material_water_surface",
	...yggdrasilPrimitiveMaterialAssets.map((asset) => asset.id),
	"audio_player_jump",
	"audio_player_charge_release",
	"audio_portal_activate",
	"audio_portal_cycle",
	"audio_ambient_whistling_dreams",
] as const;

export const yggdrasilAssetManifest = {
	assets: [
		meshPlayer,
		meshPortalGate,
		meshWaterPlane,
		...yggdrasilPrimitiveMeshAssets,
		cubemapObservatorySky,
		materialPlayer,
		materialWaterSurface,
		...yggdrasilPrimitiveMaterialAssets,
		audioPlayerJump,
		audioPlayerChargeRelease,
		audioPortalActivate,
		audioPortalCycle,
		audioAmbientWhistlingDreams,
	],
	preloadGroups: {
		yggdrasil: yggdrasilRuntimeAssetIds,
	},
} satisfies AssetManifest;

export const yggdrasilAudioContentManifest = {
	mixerBuses: defaultAudioMixerBuses,
	sceneMusic: {
		trackId: "audio_ambient_whistling_dreams",
		volume: 0.16,
		busId: "music",
		autoplay: true,
		fadeSeconds: 1.5,
	},
	eventMappings: [
		{
			id: "yggdrasil.player.jump",
			eventType: "EntityJumpRequested",
			soundId: "audio_player_jump",
			volume: 0.2,
			busId: "sfx",
			sceneId: "yggdrasil_game",
		},
		{
			id: "yggdrasil.player.charge-release",
			eventType: "ChargeActionReleased",
			soundId: "audio_player_charge_release",
			volume: 0.28,
			busId: "sfx",
			sceneId: "yggdrasil_game",
		},
		{
			id: "yggdrasil.portal.activate",
			eventType: "PortalActivated",
			soundId: "audio_portal_activate",
			volume: 0.32,
			busId: "sfx",
			sceneId: "yggdrasil_game",
		},
	],
} satisfies AudioContentManifest;
