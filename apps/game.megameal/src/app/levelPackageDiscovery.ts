import type { RuntimeSceneManifestData } from "../engine/index.js";
import type { AudioContentManifest } from "../engine/modules/audio/index.js";

type RuntimeLevelPackageModule = {
	readonly defaultRuntimeSceneManifest?: RuntimeSceneManifestData;
	readonly defaultRuntimeSceneManifests?: readonly RuntimeSceneManifestData[];
	readonly runtimeSceneManifests?: readonly RuntimeSceneManifestData[];
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
	readonly defaultRuntimeSceneManifest: RuntimeSceneManifestData | undefined;
	readonly runtimeSceneManifests: readonly RuntimeSceneManifestData[];
	getRuntimeSceneManifest(id: string): RuntimeSceneManifestData | undefined;
	audioContentManifestForRuntimeScene(
		runtimeSceneManifestId: string,
	): AudioContentManifest;
};

export const runtimeSettings: RuntimeSettings = {
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
