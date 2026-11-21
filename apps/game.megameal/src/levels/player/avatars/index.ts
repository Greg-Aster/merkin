import data from "./data.json";
import type {
	PlayerAvatarDefinition,
	PlayerAvatarPackageConfig,
} from "./types.js";

export type {
	PlayerAvatarDefinition,
	PlayerAvatarMeshRenderable,
	PlayerAvatarPackageConfig,
	PlayerAvatarRenderable,
	PlayerAvatarSpriteRenderable,
} from "./types.js";

export const playerAvatarPackageConfig =
	data as unknown as PlayerAvatarPackageConfig;

export const playerAvatarAssets = playerAvatarPackageConfig.assets;

export const playerAvatars = playerAvatarPackageConfig.avatars;

export const selectedPlayerAvatar = selectedAvatarFrom(
	playerAvatarPackageConfig,
);

function selectedAvatarFrom(
	config: PlayerAvatarPackageConfig,
): PlayerAvatarDefinition {
	const avatar = config.avatars.find(
		(candidate) => candidate.id === config.selectedAvatarId,
	);

	if (!avatar) {
		throw new Error(
			`Player avatar package selected unknown avatar "${config.selectedAvatarId}".`,
		);
	}

	return avatar;
}
