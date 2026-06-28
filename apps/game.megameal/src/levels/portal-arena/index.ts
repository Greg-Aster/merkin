export {
	portalArenaAssetManifest,
	portalArenaAudioContentManifest,
} from "./assets.js";
export { portalArenaLevel } from "./level.js";
export { portalArenaRuntimeSceneManifest } from "./manifest.js";
export { portalArenaPrefabs } from "./prefabs.js";
export { portalArenaRenderProfile } from "./renderProfile.js";

import { portalArenaAudioContentManifest } from "./assets.js";
import { portalArenaRuntimeSceneManifest } from "./manifest.js";

export const portalArenaLevelBundle = {
	id: "portal_arena",
	runtimeSceneManifest: portalArenaRuntimeSceneManifest,
	audioContentManifest: portalArenaAudioContentManifest,
} as const;
