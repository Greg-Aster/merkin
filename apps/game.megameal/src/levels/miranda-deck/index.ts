export {
	mirandaDeckAssetManifest,
	mirandaDeckAudioContentManifest,
} from "./assets.js";
export { mirandaDeckLevel } from "./level.js";
export { mirandaDeckRuntimeSceneManifest } from "./manifest.js";
export { mirandaDeckPrefabs } from "./prefabs.js";
export { mirandaDeckRenderProfile } from "./renderProfile.js";

import { mirandaDeckAudioContentManifest } from "./assets.js";
import { mirandaDeckRuntimeSceneManifest } from "./manifest.js";

export const mirandaDeckLevelBundle = {
	id: "miranda_deck",
	runtimeSceneManifest: mirandaDeckRuntimeSceneManifest,
	audioContentManifest: mirandaDeckAudioContentManifest,
} as const;
