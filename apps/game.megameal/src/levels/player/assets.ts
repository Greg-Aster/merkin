import type { AssetManifestEntry } from "../../engine/modules/assets/index.js";
import { playerPackageConfig } from "./config.js";
import {
	PLAYER_CHARGE_RELEASE_AUDIO_ASSET_ID,
	PLAYER_JUMP_AUDIO_ASSET_ID,
	PLAYER_MATERIAL_ASSET_ID,
	PLAYER_MESH_ASSET_ID,
} from "./constants.js";

export const playerMeshAsset = {
	id: PLAYER_MESH_ASSET_ID,
	kind: "mesh",
	url: playerPackageConfig.assets.meshUrl,
} satisfies AssetManifestEntry;

export const playerMaterialAsset = {
	id: PLAYER_MATERIAL_ASSET_ID,
	kind: "material",
	url: playerPackageConfig.assets.materialUrl,
} satisfies AssetManifestEntry;

export const playerJumpAudioAsset = {
	id: PLAYER_JUMP_AUDIO_ASSET_ID,
	kind: "audio",
	url: playerPackageConfig.assets.jumpAudioUrl,
	tags: ["player", "jump", "sfx"],
} satisfies AssetManifestEntry;

export const playerChargeReleaseAudioAsset = {
	id: PLAYER_CHARGE_RELEASE_AUDIO_ASSET_ID,
	kind: "audio",
	url: playerPackageConfig.assets.chargeReleaseAudioUrl,
	tags: ["player", "charge", "sfx"],
} satisfies AssetManifestEntry;

export const playerAssets = [
	playerMeshAsset,
	playerMaterialAsset,
	playerJumpAudioAsset,
	playerChargeReleaseAudioAsset,
] as const;
