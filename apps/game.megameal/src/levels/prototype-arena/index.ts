export {
	prototypeAssetManifest,
	prototypeAudioContentManifest,
} from "./assets.js";
export { prototypeLevel } from "./level.js";
export { prototypeRuntimeSceneManifest } from "./manifest.js";
export { prototypePrefabs } from "./prefabs.js";
export { prototypeRenderProfile } from "./renderProfile.js";

import { prototypeAudioContentManifest } from "./assets.js";
import { prototypeRuntimeSceneManifest } from "./manifest.js";

export const prototypeArenaLevelBundle = {
	id: "prototype_arena",
	runtimeSceneManifest: prototypeRuntimeSceneManifest,
	audioContentManifest: prototypeAudioContentManifest,
} as const;
