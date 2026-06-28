import type { LevelPrefabInstance } from "../../engine/modules/scene/index.js";
import { playerPackageConfig } from "./config.js";
import { PLAYER_PREFAB_ID, PLAYER_STABLE_ID } from "./constants.js";

type PlayerLightConfig = {
	readonly kind?: "point";
	readonly color?: string;
	readonly intensity?: number;
	readonly distance?: number;
	readonly decay?: number;
	readonly visible?: boolean;
};

export type LevelPlayerConfig = {
	readonly transform?: {
		readonly position?: readonly [number, number, number];
		readonly rotation?: readonly [number, number, number, number];
		readonly scale?: readonly [number, number, number];
	};
	readonly groundY?: number;
	readonly light?: false | PlayerLightConfig;
	readonly audio?: {
		readonly enabled?: boolean;
		readonly jumpVolume?: number;
		readonly chargeReleaseVolume?: number;
	};
};

const defaultPlayerLight = {
	...playerPackageConfig.light,
} as const;

export function createPlayerInstance(
	config: LevelPlayerConfig = {},
): LevelPrefabInstance {
	const components: Record<string, unknown> = {};

	if (config.groundY !== undefined) {
		components.CharacterController = {
			groundY: config.groundY,
		};
	}

	if (config.light !== undefined && config.light !== false) {
		components.Light = {
			...defaultPlayerLight,
			...config.light,
		};
	}

	return {
		id: PLAYER_STABLE_ID,
		prefabId: PLAYER_PREFAB_ID,
		stableId: PLAYER_STABLE_ID,
		...(config.transform ? { transform: config.transform } : {}),
		...(Object.keys(components).length > 0 ? { components } : {}),
	};
}

export function playerHasRequiredLight(
	config: LevelPlayerConfig = {},
): boolean {
	return config.light !== undefined && config.light !== false;
}

export function isPlayerAudioEnabled(config: LevelPlayerConfig = {}): boolean {
	return config.audio?.enabled ?? true;
}
