import type { RuntimeSceneManifestData } from "../../engine/index.js";
import type { AudioContentManifest } from "../../engine/modules/audio/index.js";
import { mirandaDeckLevelBundle } from "../miranda-deck/index.js";
import { observatoryLevelBundle } from "../observatory/index.js";
import { portalArenaLevelBundle } from "../portal-arena/index.js";
import { prototypeArenaLevelBundle } from "../prototype-arena/index.js";
import { levelPackageSettings } from "./settings.js";

type LevelPackageEntry = {
	readonly id: string;
	readonly runtimeSceneManifest: RuntimeSceneManifestData;
	readonly audioContentManifest: AudioContentManifest;
};

export const levelPackageEntries = [
	portalArenaLevelBundle,
	prototypeArenaLevelBundle,
	mirandaDeckLevelBundle,
	observatoryLevelBundle,
] satisfies readonly LevelPackageEntry[];

export const defaultRuntimeSceneManifests = levelPackageEntries.map(
	(entry) => entry.runtimeSceneManifest,
);

export const runtimeSceneManifests = defaultRuntimeSceneManifests;

export function getRuntimeSceneManifest(
	id: string,
): RuntimeSceneManifestData | undefined {
	return defaultRuntimeSceneManifests.find((manifest) => manifest.id === id);
}

const configuredDefaultRuntimeSceneManifest = getRuntimeSceneManifest(
	levelPackageSettings.defaultRuntimeSceneId,
);

if (!configuredDefaultRuntimeSceneManifest) {
	throw new Error(
		`Level package default runtime scene "${levelPackageSettings.defaultRuntimeSceneId}" is not registered.`,
	);
}

export const defaultRuntimeSceneManifest =
	configuredDefaultRuntimeSceneManifest;

const audioContentManifestsByRuntimeScene = new Map(
	levelPackageEntries.map((entry) => [
		entry.runtimeSceneManifest.id,
		entry.audioContentManifest,
	]),
);

export function audioContentManifestForRuntimeScene(
	runtimeSceneManifestId: string,
): AudioContentManifest {
	return (
		audioContentManifestsByRuntimeScene.get(runtimeSceneManifestId) ?? {
			eventMappings: [],
		}
	);
}

export function listRuntimeScenes(): readonly RuntimeSceneManifestData[] {
	return defaultRuntimeSceneManifests;
}

export const levelPackageRouter = {
	settings: levelPackageSettings,
	runtimeSceneManifests: defaultRuntimeSceneManifests,
	defaultRuntimeSceneManifest,
	getRuntimeSceneManifest,
	audioContentManifestForRuntimeScene,
	listRuntimeScenes,
} as const;
