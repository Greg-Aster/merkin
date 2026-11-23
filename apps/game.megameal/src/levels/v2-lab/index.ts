import { v2LabLevelPackage } from "./package.js";

export const v2LabAssetManifest = v2LabLevelPackage.assetManifest;
export const v2LabAudioContentManifest = v2LabLevelPackage.audioContentManifest;
export const v2LabLevel = v2LabLevelPackage.level;
export const v2LabRuntimeSceneManifest = v2LabLevelPackage.runtimeSceneManifest;
export const v2LabPrefabs = v2LabLevelPackage.prefabs;
export const v2LabRenderProfile = v2LabLevelPackage.renderProfile;

export const v2LabLevelBundle = {
	id: "v2_lab",
	runtimeSceneManifest: v2LabRuntimeSceneManifest,
	audioContentManifest: v2LabAudioContentManifest,
} as const;
