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

export const playerAvatarPhysicsRigs = [] as const;

export const selectedPlayerAvatarPhysicsRig =
	selectedRigFrom(selectedPlayerAvatar);

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

function selectedRigFrom(avatar: PlayerAvatarDefinition) {
	if (!avatar.physicsRig) {
		return undefined;
	}

	throw new Error(
		`Player avatar "${avatar.id}" references unknown physics rig "${avatar.physicsRig.rigId}".`,
	);
}
