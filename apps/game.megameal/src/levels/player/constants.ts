export const PLAYER_PREFAB_ID = "player";
export const PLAYER_STABLE_ID = "player";
export const PLAYER_MESH_ASSET_ID = "mesh_player";
export const PLAYER_MATERIAL_ASSET_ID = "material_player";
export const PLAYER_AVATAR_LIGHT_SPRITE_ASSET_ID = "sprite_player_avatar_light";
export const PLAYER_AVATAR_AINEKIO_SESAME_CHASSIS_MESH_ASSET_ID =
	"mesh_player_avatar_ainekio_sesame_chassis";
export const PLAYER_AVATAR_AINEKIO_SESAME_MESH_ASSET_IDS = [
	PLAYER_AVATAR_AINEKIO_SESAME_CHASSIS_MESH_ASSET_ID,
	"mesh_player_avatar_ainekio_sesame_right_front_leg",
	"mesh_player_avatar_ainekio_sesame_right_front_foot",
	"mesh_player_avatar_ainekio_sesame_right_rear_leg",
	"mesh_player_avatar_ainekio_sesame_right_rear_foot",
	"mesh_player_avatar_ainekio_sesame_left_front_leg",
	"mesh_player_avatar_ainekio_sesame_left_front_foot",
	"mesh_player_avatar_ainekio_sesame_left_rear_leg",
	"mesh_player_avatar_ainekio_sesame_left_rear_foot",
] as const;
export const PLAYER_JUMP_AUDIO_ASSET_ID = "audio_player_jump";
export const PLAYER_CHARGE_RELEASE_AUDIO_ASSET_ID =
	"audio_player_charge_release";

export const PLAYER_REQUIRED_ASSET_IDS = [
	PLAYER_MESH_ASSET_ID,
	PLAYER_MATERIAL_ASSET_ID,
	PLAYER_AVATAR_LIGHT_SPRITE_ASSET_ID,
	...PLAYER_AVATAR_AINEKIO_SESAME_MESH_ASSET_IDS,
	PLAYER_JUMP_AUDIO_ASSET_ID,
	PLAYER_CHARGE_RELEASE_AUDIO_ASSET_ID,
] as const;
