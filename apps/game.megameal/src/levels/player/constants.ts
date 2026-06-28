export const PLAYER_PREFAB_ID = "player";
export const PLAYER_STABLE_ID = "player";
export const PLAYER_MESH_ASSET_ID = "mesh_player";
export const PLAYER_MATERIAL_ASSET_ID = "material_player";
export const PLAYER_JUMP_AUDIO_ASSET_ID = "audio_player_jump";
export const PLAYER_CHARGE_RELEASE_AUDIO_ASSET_ID =
	"audio_player_charge_release";

export const PLAYER_REQUIRED_ASSET_IDS = [
	PLAYER_MESH_ASSET_ID,
	PLAYER_MATERIAL_ASSET_ID,
	PLAYER_JUMP_AUDIO_ASSET_ID,
	PLAYER_CHARGE_RELEASE_AUDIO_ASSET_ID,
] as const;
