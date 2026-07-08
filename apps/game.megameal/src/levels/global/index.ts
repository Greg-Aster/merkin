export * from "./router.js";
export { levelPackageSettings } from "./settings.js";
export * from "./ambientAudioAssets.js";
export * from "./portalAssets.js";
export * from "./prefabs.js";
export * from "./skyboxAssets.js";
export * from "./waterAssets.js";
export {
	selectedPlayerAvatar,
	selectedPlayerAvatarPhysicsRig,
} from "../player/index.js";

export function createPlayerAvatarMotionTestEvent(_id: string) {
	return undefined;
}
