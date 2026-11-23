import type { System, World } from "../../core/index.js";
import type { Quat, Vec3 } from "../../math/index.js";

export const CAMERA_COMPONENT = "Camera";
export const CAMERA_TARGET_COMPONENT = "CameraTarget";
export const ACTIVE_CAMERA_POSE_RESOURCE = "camera:activePose";

export type CameraComponent = {
	readonly fovDegrees: number;
	readonly near: number;
	readonly far: number;
	readonly active: boolean;
};

export type CameraTargetComponent = {
	readonly active: boolean;
	readonly priority?: number;
};

export type CameraPose = {
	readonly position: Vec3;
	readonly rotation: Quat;
	readonly fovDegrees: number;
	readonly near: number;
	readonly far: number;
};

export type CameraPosePort = {
	setCameraPose(pose: CameraPose): void;
};

export type CameraPoseApplySystemOptions = {
	readonly camera: CameraPosePort;
	readonly resourceName?: string;
};

export function createCameraPoseApplySystem<
	TContext extends { readonly world: World },
>(options: CameraPoseApplySystemOptions): System<TContext> {
	const resourceName = options.resourceName ?? ACTIVE_CAMERA_POSE_RESOURCE;

	return {
		id: "camera-pose-apply",
		reads: [resourceName],
		update(context) {
			const pose = context.world.getResource<CameraPose>(resourceName);

			if (pose) {
				options.camera.setCameraPose(pose);
			}
		},
	};
}
