import type { AudioContentManifest } from "../../engine/modules/audio/index.js";
import { playerPackageConfig } from "./config.js";
import {
	PLAYER_CHARGE_RELEASE_AUDIO_ASSET_ID,
	PLAYER_JUMP_AUDIO_ASSET_ID,
} from "./constants.js";
import { type LevelPlayerConfig, isPlayerAudioEnabled } from "./instance.js";

export function createPlayerAudioEventMappings(options: {
	readonly levelId: string;
	readonly sceneId: string;
	readonly player?: LevelPlayerConfig;
}): AudioContentManifest["eventMappings"] {
	if (!isPlayerAudioEnabled(options.player)) {
		return [];
	}

	const idPrefix = options.levelId.replaceAll("_", "-");

	return [
		{
			id: `${idPrefix}.player.jump`,
			eventType: "EntityJumpRequested",
			soundId: PLAYER_JUMP_AUDIO_ASSET_ID,
			volume:
				options.player?.audio?.jumpVolume ??
				playerPackageConfig.audio.jumpVolume,
			sceneId: options.sceneId,
		},
		{
			id: `${idPrefix}.player.charge-release`,
			eventType: "ChargeActionReleased",
			soundId: PLAYER_CHARGE_RELEASE_AUDIO_ASSET_ID,
			volume:
				options.player?.audio?.chargeReleaseVolume ??
				playerPackageConfig.audio.chargeReleaseVolume,
			sceneId: options.sceneId,
		},
	];
}
