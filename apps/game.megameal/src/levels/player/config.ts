import data from "./data.json";

export type Vector3 = readonly [number, number, number];
export type Quaternion = readonly [number, number, number, number];

export type PlayerPackageConfig = {
	readonly assets: {
		readonly meshUrl: string;
		readonly materialUrl: string;
		readonly jumpAudioUrl: string;
		readonly chargeReleaseAudioUrl: string;
	};
	readonly transform: {
		readonly position: Vector3;
		readonly rotation: Quaternion;
		readonly scale: Vector3;
	};
	readonly renderable: {
		readonly visible: boolean;
	};
	readonly rigidBody: {
		readonly mass: number;
	};
	readonly collider: {
		readonly halfHeight: number;
		readonly radius: number;
	};
	readonly characterController: {
		readonly speed: number;
		readonly sprintMultiplier: number;
		readonly jumpForce: number;
		readonly gravity: number;
		readonly groundY: number;
	};
	readonly firstPersonController: {
		readonly mouseSensitivity: number;
		readonly minPitchRadians: number;
		readonly maxPitchRadians: number;
		readonly eyeHeight: number;
		readonly fovDegrees: number;
		readonly near: number;
		readonly far: number;
	};
	readonly health: {
		readonly current: number;
		readonly max: number;
	};
	readonly audio: {
		readonly jumpVolume: number;
		readonly chargeReleaseVolume: number;
	};
	readonly light: {
		readonly kind: "point";
		readonly color: string;
		readonly intensity: number;
		readonly distance: number;
		readonly decay: number;
		readonly visible: boolean;
	};
};

export const playerPackageConfig = data as unknown as PlayerPackageConfig;
