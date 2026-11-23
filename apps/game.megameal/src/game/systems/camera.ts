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
	LIGHT_COMPONENT,
	LIGHT_TRANSFORM_COMPONENT,
	type LightComponent,
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

			const pose = playerEyePose(transform, controller);

			context.world.setResource(ACTIVE_CAMERA_POSE_RESOURCE, {
				...pose,
				fovDegrees: controller.fovDegrees,
				near: controller.near,
				far: controller.far,
			});
		},
	};
}

export function createPlayerLightCameraAnchorSystem<
	TContext extends PlayerCameraContext,
>(): System<TContext> {
	return {
		id: "player-light-camera-anchor",
		reads: [
			TRANSFORM_COMPONENT,
			FIRST_PERSON_CONTROLLER_COMPONENT,
			LIGHT_COMPONENT,
			CAMERA_TARGET_COMPONENT,
		],
		writes: [LIGHT_TRANSFORM_COMPONENT],
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
				context.world.removeComponent(player, LIGHT_TRANSFORM_COMPONENT);
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
			const light = context.world.getComponent<LightComponent>(
				player,
				LIGHT_COMPONENT,
			);

			if (!transform || !controller || !light) {
				context.world.removeComponent(player, LIGHT_TRANSFORM_COMPONENT);
				return;
			}

			const pose = playerEyePose(transform, controller);

			context.world.addComponent<RenderTransform>(
				player,
				LIGHT_TRANSFORM_COMPONENT,
				{
					position: pose.position,
					rotation: pose.rotation,
					scale: transform.scale,
				},
			);
		},
	};
}

type PlayerCameraContext = {
	readonly world: World;
};

function playerEyePose(
	transform: RenderTransform,
	controller: FirstPersonControllerComponent,
): Pick<CameraPose, "position" | "rotation"> {
	const yaw = quatFromAxisAngle(vec3(0, 1, 0), controller.yawRadians);
	const pitch = quatFromAxisAngle(vec3(1, 0, 0), controller.pitchRadians);

	return {
		position: addVec3(transform.position, vec3(0, controller.eyeHeight, 0)),
		rotation: multiplyQuat(yaw, pitch),
	};
}
