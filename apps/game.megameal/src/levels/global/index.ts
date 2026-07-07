import {
	createAinekioSesameNeutralMotionEvent,
	createAinekioSesameStepMotionEvent,
} from "../player/index.js";

export * from "./router.js";
export { levelPackageSettings } from "./settings.js";
export * from "./ambientAudioAssets.js";
export * from "./portalAssets.js";
export * from "./prefabs.js";
export * from "./skyboxAssets.js";
export * from "./waterAssets.js";
export {
	createAinekioSesameNeutralMotionEvent,
	createAinekioSesameStepMotionEvent,
	selectedPlayerAvatar,
	selectedPlayerAvatarPhysicsRig,
} from "../player/index.js";

export function createPlayerAvatarMotionTestEvent(id: string) {
	if (id === "ainekio-sesame-neutral") {
		return createAinekioSesameNeutralMotionEvent();
	}
	if (id === "ainekio-sesame-step-cycle") {
		return createAinekioSesameStepMotionEvent();
	}

	return undefined;
}
