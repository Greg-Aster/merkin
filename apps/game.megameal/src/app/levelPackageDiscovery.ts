import type { RuntimeSceneManifestData } from "../engine/index.js";
import type { AudioContentManifest } from "../engine/modules/audio/index.js";
import type { RuntimePlayerAvatar } from "../game/runtime/index.js";
import {
	type GameDevBridgeSettings,
	defaultGameDevBridgeSettings,
	normalizeGameDevBridgeSettings,
} from "./dev-bridge/gameDevBridge.js";

type RuntimeLevelPackageModule = {
	readonly levelPackageSettings?: {
		readonly packageId?: string;
		readonly defaultRuntimeSceneId?: string;
		readonly hudVisible?: boolean;
		readonly audioMasterVolume?: number;
		readonly devBridge?: Partial<GameDevBridgeSettings>;
	};
	readonly defaultRuntimeSceneManifest?: RuntimeSceneManifestData;
	readonly defaultRuntimeSceneManifests?: readonly RuntimeSceneManifestData[];
	readonly runtimeSceneManifests?: readonly RuntimeSceneManifestData[];
	readonly selectedPlayerAvatar?: RuntimePlayerAvatar;
	getRuntimeSceneManifest?(id: string): RuntimeSceneManifestData | undefined;
	audioContentManifestForRuntimeScene?(
		runtimeSceneManifestId: string,
	): AudioContentManifest;
};

const levelPackageModules = import.meta.glob<RuntimeLevelPackageModule>(
	"../levels/global/index.ts",
	{
		eager: true,
	},
);
const installedLevelPackage = Object.values(levelPackageModules)[0];
const runtimeSceneManifests =
	installedLevelPackage?.runtimeSceneManifests ??
	installedLevelPackage?.defaultRuntimeSceneManifests ??
	[];
const defaultRuntimeSceneManifest =
	installedLevelPackage?.defaultRuntimeSceneManifest ??
	runtimeSceneManifests[0];

export type RuntimeSettings = {
	readonly packageId: string;
	readonly defaultRuntimeSceneId: string | undefined;
	readonly hudVisible: boolean;
	readonly audioMasterVolume: number;
	readonly devBridge: GameDevBridgeSettings;
	readonly selectedPlayerAvatar: RuntimePlayerAvatar | undefined;
	readonly defaultRuntimeSceneManifest: RuntimeSceneManifestData | undefined;
	readonly runtimeSceneManifests: readonly RuntimeSceneManifestData[];
	getRuntimeSceneManifest(id: string): RuntimeSceneManifestData | undefined;
	audioContentManifestForRuntimeScene(
		runtimeSceneManifestId: string,
	): AudioContentManifest;
};

export const runtimeSettings: RuntimeSettings = {
	packageId: installedLevelPackage?.levelPackageSettings?.packageId ?? "",
	defaultRuntimeSceneId:
		installedLevelPackage?.levelPackageSettings?.defaultRuntimeSceneId,
	hudVisible: installedLevelPackage?.levelPackageSettings?.hudVisible ?? false,
	audioMasterVolume:
		installedLevelPackage?.levelPackageSettings?.audioMasterVolume ?? 1,
	devBridge: normalizeGameDevBridgeSettings(
		installedLevelPackage?.levelPackageSettings?.devBridge ??
			defaultGameDevBridgeSettings,
	),
	selectedPlayerAvatar: installedLevelPackage?.selectedPlayerAvatar,
	defaultRuntimeSceneManifest,
	runtimeSceneManifests,
	getRuntimeSceneManifest(id) {
		return (
			installedLevelPackage?.getRuntimeSceneManifest?.(id) ??
			runtimeSceneManifests.find((manifest) => manifest.id === id)
		);
	},
	audioContentManifestForRuntimeScene(runtimeSceneManifestId) {
		return (
			installedLevelPackage?.audioContentManifestForRuntimeScene?.(
				runtimeSceneManifestId,
			) ?? { eventMappings: [] }
		);
	},
};
