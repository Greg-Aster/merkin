export {
	observatoryAssetManifest,
	observatoryAudioContentManifest,
} from "./assets.js";
export { observatoryLevel } from "./level.js";
export { observatoryRuntimeSceneManifest } from "./manifest.js";
export { observatoryPrefabs } from "./prefabs.js";
export { observatoryRenderProfile } from "./renderProfile.js";

import { observatoryAudioContentManifest } from "./assets.js";
import { observatoryRuntimeSceneManifest } from "./manifest.js";

export const observatoryLevelBundle = {
	id: "observatory",
	runtimeSceneManifest: observatoryRuntimeSceneManifest,
	audioContentManifest: observatoryAudioContentManifest,
} as const;
