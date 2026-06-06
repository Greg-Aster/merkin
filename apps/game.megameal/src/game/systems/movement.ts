import type { System, World } from "../../engine/core/index.js";
import {
	lengthSquaredVec3,
	normalizeVec3,
	quatFromAxisAngle,
	rotateVec3ByQuat,
	vec3,
} from "../../engine/math/index.js";
import type { PlayerInputComponent } from "../../engine/modules/input/index.js";
import {
	CHARACTER_MOTOR_COMPONENT,
	type CharacterMotorComponent,
	type KinematicCharacterControllerSystemOptions,
	createKinematicCharacterControllerSystem,
} from "../../engine/modules/physics/index.js";
import {
	type RenderTransform,
	TRANSFORM_COMPONENT,
} from "../../engine/modules/rendering/index.js";
import {
	CHARACTER_BOUNDS_RESOURCE,
	type CharacterMovementBounds,
	FIRST_PERSON_CONTROLLER_COMPONENT,
	type FirstPersonControllerComponent,
	MOVEMENT_INTENT_COMPONENT,
	type MovementIntentComponent,
	PLAYER_INPUT_COMPONENT,
} from "./components.js";

export function createFirstPersonLookSystem<
	TContext extends FirstPersonLookContext,
>(): System<TContext> {
	return {
		id: "first-person-look",
		reads: [PLAYER_INPUT_COMPONENT, FIRST_PERSON_CONTROLLER_COMPONENT],
		writes: [FIRST_PERSON_CONTROLLER_COMPONENT, TRANSFORM_COMPONENT],
		update(context) {
			for (const entity of context.world.query([
				PLAYER_INPUT_COMPONENT,
				FIRST_PERSON_CONTROLLER_COMPONENT,
				TRANSFORM_COMPONENT,
			])) {
				const input = context.world.requireComponent<PlayerInputComponent>(
					entity,
					PLAYER_INPUT_COMPONENT,
				);
				const controller =
					context.world.requireComponent<FirstPersonControllerComponent>(
						entity,
						FIRST_PERSON_CONTROLLER_COMPONENT,
					);
				const transform = context.world.requireComponent<RenderTransform>(
					entity,
					TRANSFORM_COMPONENT,
				);
				const nextYaw =
					controller.yawRadians -
					input.lookDelta[0] * controller.mouseSensitivity;
				const nextPitch = clamp(
					controller.pitchRadians -
						input.lookDelta[1] * controller.mouseSensitivity,
					controller.minPitchRadians,
					controller.maxPitchRadians,
				);
				const yawRotation = quatFromAxisAngle(vec3(0, 1, 0), nextYaw);

				context.world.addComponent<FirstPersonControllerComponent>(
					entity,
					FIRST_PERSON_CONTROLLER_COMPONENT,
					{
						...controller,
						yawRadians: nextYaw,
						pitchRadians: nextPitch,
					},
				);
				context.world.addComponent<RenderTransform>(
					entity,
					TRANSFORM_COMPONENT,
					{
						...transform,
						rotation: yawRotation,
					},
				);
			}
		},
	};
}

export function createCharacterMotorSystem<
	TContext extends CharacterMotorContext,
>(): System<TContext> {
	return {
		id: "character-motor-input",
		reads: [
			TRANSFORM_COMPONENT,
			MOVEMENT_INTENT_COMPONENT,
			FIRST_PERSON_CONTROLLER_COMPONENT,
		],
		writes: [CHARACTER_MOTOR_COMPONENT],
		update(context) {
			for (const entity of context.world.query([TRANSFORM_COMPONENT])) {
				const intent = context.world.getComponent<MovementIntentComponent>(
					entity,
					MOVEMENT_INTENT_COMPONENT,
				) ?? { direction: vec3(), sprinting: false };
				const transform = context.world.requireComponent<RenderTransform>(
					entity,
					TRANSFORM_COMPONENT,
				);
				const firstPerson =
					context.world.getComponent<FirstPersonControllerComponent>(
						entity,
						FIRST_PERSON_CONTROLLER_COMPONENT,
					);
				const yawRotation = firstPerson
					? quatFromAxisAngle(vec3(0, 1, 0), firstPerson.yawRadians)
					: transform.rotation;
				const direction =
					lengthSquaredVec3(intent.direction) === 0
						? vec3()
						: normalizeVec3(rotateVec3ByQuat(intent.direction, yawRotation));
				const jumpRequested = context.events
					.peek()
					.some(
						(event) =>
							event.type === "EntityJumpRequested" && event.entity === entity,
					);
				const bounds = context.world.getResource<CharacterMovementBounds>(
					CHARACTER_BOUNDS_RESOURCE,
				);

				context.world.addComponent<CharacterMotorComponent>(
					entity,
					CHARACTER_MOTOR_COMPONENT,
					{
						direction,
						sprinting: intent.sprinting,
						jumpRequested,
						...(bounds ? { bounds } : {}),
					},
				);
			}
		},
	};
}

export function createCharacterMovementSystem<
	TContext extends CharacterMovementContext,
>(options: KinematicCharacterControllerSystemOptions = {}): System<TContext> {
	return createKinematicCharacterControllerSystem<TContext>(options);
}

type FirstPersonLookContext = {
	readonly world: World;
};

type CharacterMotorContext = {
	readonly world: World;
	readonly events: {
		peek(): readonly {
			readonly type: string;
			readonly [key: string]: unknown;
		}[];
	};
};

type CharacterMovementContext = {
	readonly deltaSeconds: number;
	readonly world: World;
	readonly events: {
		emit(event: {
			readonly type: string;
			readonly [key: string]: unknown;
		}): void;
	};
};

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
