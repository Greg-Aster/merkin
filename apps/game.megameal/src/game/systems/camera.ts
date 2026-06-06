import type { Entity, System, World } from "../../engine/core/index.js";
import {
	addVec3,
	multiplyQuat,
	quatFromAxisAngle,
	vec3,
} from "../../engine/math/index.js";
import {
	ACTIVE_CAMERA_POSE_RESOURCE,
	CAMERA_TARGET_COMPONENT,
	type CameraPose,
	type CameraTargetComponent,
} from "../../engine/modules/camera/index.js";
import {
	type RenderTransform,
	TRANSFORM_COMPONENT,
} from "../../engine/modules/rendering/index.js";
import {
	FIRST_PERSON_CONTROLLER_COMPONENT,
	type FirstPersonControllerComponent,
	PLAYER_ENTITY_RESOURCE,
} from "./components.js";

export function createPlayerCameraSystem<
	TContext extends PlayerCameraContext,
>(): System<TContext> {
	return {
		id: "player-camera",
		reads: [
			TRANSFORM_COMPONENT,
			FIRST_PERSON_CONTROLLER_COMPONENT,
			CAMERA_TARGET_COMPONENT,
		],
		writes: [ACTIVE_CAMERA_POSE_RESOURCE],
		update(context) {
			const player = context.world.getResource<Entity>(PLAYER_ENTITY_RESOURCE);

			if (player === undefined || !context.world.isAlive(player)) {
				return;
			}

			const target = context.world.getComponent<CameraTargetComponent>(
				player,
				CAMERA_TARGET_COMPONENT,
			);

			if (target?.active === false) {
				return;
			}

			const transform = context.world.getComponent<RenderTransform>(
				player,
				TRANSFORM_COMPONENT,
			);
			const controller =
				context.world.getComponent<FirstPersonControllerComponent>(
					player,
					FIRST_PERSON_CONTROLLER_COMPONENT,
				);

			if (!transform || !controller) {
				return;
			}

			const yaw = quatFromAxisAngle(vec3(0, 1, 0), controller.yawRadians);
			const pitch = quatFromAxisAngle(vec3(1, 0, 0), controller.pitchRadians);
			const pose: CameraPose = {
				position: addVec3(transform.position, vec3(0, controller.eyeHeight, 0)),
				rotation: multiplyQuat(yaw, pitch),
				fovDegrees: controller.fovDegrees,
				near: controller.near,
				far: controller.far,
			};

			context.world.setResource(ACTIVE_CAMERA_POSE_RESOURCE, pose);
		},
	};
}

type PlayerCameraContext = {
	readonly world: World;
};
