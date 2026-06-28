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
	CHARACTER_CONTROLLER_COMPONENT,
	CHARACTER_MOTOR_COMPONENT,
	COLLIDER_COMPONENT,
	type CharacterControllerComponent,
	type CharacterMotorComponent,
	type ColliderComponent,
	type MeshColliderShape,
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
>(): System<TContext> {
	return createKinematicCharacterControllerSystem<TContext>();
}

export function createWalkableGroundingSystem<
	TContext extends WalkableGroundingContext,
>(): System<TContext> {
	return {
		id: "walkable-grounding",
		reads: [TRANSFORM_COMPONENT, COLLIDER_COMPONENT],
		writes: [CHARACTER_CONTROLLER_COMPONENT],
		update(context) {
			const walkableColliders = [...context.world.query([COLLIDER_COMPONENT])]
				.map((entity) => ({
					entity,
					collider: context.world.requireComponent<ColliderComponent>(
						entity,
						COLLIDER_COMPONENT,
					),
					transform: context.world.getComponent<RenderTransform>(
						entity,
						TRANSFORM_COMPONENT,
					),
				}))
				.filter(({ collider }) => collider.intent === "walkable");

			if (walkableColliders.length === 0) {
				return;
			}

			for (const entity of context.world.query([
				TRANSFORM_COMPONENT,
				CHARACTER_CONTROLLER_COMPONENT,
			])) {
				const transform = context.world.requireComponent<RenderTransform>(
					entity,
					TRANSFORM_COMPONENT,
				);
				const controller =
					context.world.requireComponent<CharacterControllerComponent>(
						entity,
						CHARACTER_CONTROLLER_COMPONENT,
					);
				const groundY = walkableGroundYAt(
					transform.position.x,
					transform.position.z,
					walkableColliders,
				);

				if (groundY === undefined) {
					continue;
				}

				context.world.addComponent<CharacterControllerComponent>(
					entity,
					CHARACTER_CONTROLLER_COMPONENT,
					{
						...controller,
						groundY,
					},
				);
			}
		},
	};
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

type WalkableGroundingContext = {
	readonly world: World;
};

type WalkableCollider = {
	readonly collider: ColliderComponent;
	readonly transform: RenderTransform | undefined;
};

type Vec3Like =
	| { readonly x: number; readonly y: number; readonly z: number }
	| readonly number[];

function walkableGroundYAt(
	x: number,
	z: number,
	walkableColliders: readonly WalkableCollider[],
): number | undefined {
	let groundY: number | undefined;

	for (const { collider, transform } of walkableColliders) {
		const candidate = groundYForCollider(collider, transform, x, z);
		if (
			candidate !== undefined &&
			(groundY === undefined || candidate > groundY)
		) {
			groundY = candidate;
		}
	}

	return groundY;
}

function groundYForCollider(
	collider: ColliderComponent,
	transform: RenderTransform | undefined,
	x: number,
	z: number,
): number | undefined {
	if (collider.shape.type === "box") {
		const position = transform?.position ?? vec3();
		const scale = transform?.scale ?? vec3(1, 1, 1);
		const halfX =
			component(collider.shape.halfExtents, "x") * Math.abs(scale.x);
		const halfY =
			component(collider.shape.halfExtents, "y") * Math.abs(scale.y);
		const halfZ =
			component(collider.shape.halfExtents, "z") * Math.abs(scale.z);

		if (
			x < position.x - halfX ||
			x > position.x + halfX ||
			z < position.z - halfZ ||
			z > position.z + halfZ
		) {
			return undefined;
		}

		return position.y + halfY;
	}

	if (collider.shape.type !== "mesh") {
		return undefined;
	}

	return meshGroundYAt(collider.shape, transform, x, z);
}

function meshGroundYAt(
	shape: MeshColliderShape,
	transform: RenderTransform | undefined,
	x: number,
	z: number,
): number | undefined {
	let groundY: number | undefined;

	for (let index = 0; index + 2 < shape.indices.length; index += 3) {
		const aIndex = shape.indices[index];
		const bIndex = shape.indices[index + 1];
		const cIndex = shape.indices[index + 2];

		if (aIndex === undefined || bIndex === undefined || cIndex === undefined) {
			continue;
		}

		const a = transformedVertex(shape.vertices[aIndex], transform);
		const b = transformedVertex(shape.vertices[bIndex], transform);
		const c = transformedVertex(shape.vertices[cIndex], transform);

		if (!a || !b || !c) {
			continue;
		}

		const candidate = triangleHeightAt(a, b, c, x, z);
		if (
			candidate !== undefined &&
			(groundY === undefined || candidate > groundY)
		) {
			groundY = candidate;
		}
	}

	return groundY;
}

function transformedVertex(
	vertex: Vec3Like | undefined,
	transform: RenderTransform | undefined,
): Vec3Like | undefined {
	if (!vertex) {
		return undefined;
	}

	const position = transform?.position ?? vec3();
	const scale = transform?.scale ?? vec3(1, 1, 1);
	return [
		position.x + component(vertex, "x") * scale.x,
		position.y + component(vertex, "y") * scale.y,
		position.z + component(vertex, "z") * scale.z,
	];
}

function triangleHeightAt(
	a: Vec3Like,
	b: Vec3Like,
	c: Vec3Like,
	x: number,
	z: number,
): number | undefined {
	const denominator =
		(component(b, "z") - component(c, "z")) *
			(component(a, "x") - component(c, "x")) +
		(component(c, "x") - component(b, "x")) *
			(component(a, "z") - component(c, "z"));

	if (Math.abs(denominator) < 1e-8) {
		return undefined;
	}

	const w1 =
		((component(b, "z") - component(c, "z")) * (x - component(c, "x")) +
			(component(c, "x") - component(b, "x")) * (z - component(c, "z"))) /
		denominator;
	const w2 =
		((component(c, "z") - component(a, "z")) * (x - component(c, "x")) +
			(component(a, "x") - component(c, "x")) * (z - component(c, "z"))) /
		denominator;
	const w3 = 1 - w1 - w2;
	const epsilon = 1e-5;

	if (w1 < -epsilon || w2 < -epsilon || w3 < -epsilon) {
		return undefined;
	}

	return (
		w1 * component(a, "y") + w2 * component(b, "y") + w3 * component(c, "y")
	);
}

function component(value: Vec3Like, axis: "x" | "y" | "z"): number {
	if ("x" in value) {
		return value[axis];
	}

	const index = axis === "x" ? 0 : axis === "y" ? 1 : 2;
	const componentValue = value[index];

	if (typeof componentValue !== "number") {
		throw new Error(`Vector is missing ${axis}.`);
	}

	return componentValue;
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
