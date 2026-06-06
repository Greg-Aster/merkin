import type { Command, Entity, System } from "../../engine/core/index.js";
import {
	lengthSquaredVec3,
	normalizeVec3,
	vec3,
} from "../../engine/math/index.js";
import {
	type InputPlatformPort,
	type InputSnapshot,
	type PlayerInputComponent,
	createActionMap,
	getActionValue,
} from "../../engine/modules/input/index.js";
import {
	type CloseStoryNoteCommand,
	INPUT_SNAPSHOT_RESOURCE,
	type InteractAtScreenPointCommand,
	type InteractWithActiveTargetCommand,
	type JumpEntityCommand,
	MOVEMENT_INTENT_COMPONENT,
	type MoveEntityCommand,
	type MovementIntentComponent,
	PLAYER_ENTITY_RESOURCE,
	PLAYER_INPUT_COMPONENT,
} from "./components.js";

const GAMEPAD_LOOK_DELTA_PER_TICK = 14;

export const MOBILE_TOUCH_ACTION_IDS = {
	moveForward: "mobile.move.forward",
	moveBack: "mobile.move.back",
	moveLeft: "mobile.move.left",
	moveRight: "mobile.move.right",
	jump: "mobile.jump",
	sprint: "mobile.sprint",
	interactPrimary: "mobile.interact.primary",
	chargeLight: "mobile.charge.light",
} as const;

export function createGameplayActionMap() {
	return createActionMap("gameplay", [
		{ device: "keyboard", code: "KeyW", action: "move.forward" },
		{ device: "keyboard", code: "ArrowUp", action: "move.forward" },
		{ device: "keyboard", code: "KeyS", action: "move.back" },
		{ device: "keyboard", code: "ArrowDown", action: "move.back" },
		{ device: "keyboard", code: "KeyA", action: "move.left" },
		{ device: "keyboard", code: "ArrowLeft", action: "move.left" },
		{ device: "keyboard", code: "KeyD", action: "move.right" },
		{ device: "keyboard", code: "ArrowRight", action: "move.right" },
		{ device: "keyboard", code: "Space", action: "jump" },
		{ device: "keyboard", code: "ShiftLeft", action: "sprint" },
		{ device: "keyboard", code: "ShiftRight", action: "sprint" },
		{ device: "keyboard", code: "KeyF", action: "charge.light" },
		{ device: "mouse", button: 0, action: "look.hold" },
		{
			device: "touch",
			touchId: MOBILE_TOUCH_ACTION_IDS.moveForward,
			action: "move.forward",
		},
		{
			device: "touch",
			touchId: MOBILE_TOUCH_ACTION_IDS.moveBack,
			action: "move.back",
		},
		{
			device: "touch",
			touchId: MOBILE_TOUCH_ACTION_IDS.moveLeft,
			action: "move.left",
		},
		{
			device: "touch",
			touchId: MOBILE_TOUCH_ACTION_IDS.moveRight,
			action: "move.right",
		},
		{
			device: "touch",
			touchId: MOBILE_TOUCH_ACTION_IDS.jump,
			action: "jump",
		},
		{
			device: "touch",
			touchId: MOBILE_TOUCH_ACTION_IDS.sprint,
			action: "sprint",
		},
		{
			device: "touch",
			touchId: MOBILE_TOUCH_ACTION_IDS.interactPrimary,
			action: "interact.primary",
		},
		{
			device: "touch",
			touchId: MOBILE_TOUCH_ACTION_IDS.chargeLight,
			action: "charge.light",
		},
		{
			device: "gamepad",
			axis: 1,
			action: "move.forward",
			scale: -1,
			deadzone: 0.18,
		},
		{
			device: "gamepad",
			axis: 1,
			action: "move.back",
			scale: 1,
			deadzone: 0.18,
		},
		{
			device: "gamepad",
			axis: 0,
			action: "move.left",
			scale: -1,
			deadzone: 0.18,
		},
		{
			device: "gamepad",
			axis: 0,
			action: "move.right",
			scale: 1,
			deadzone: 0.18,
		},
		{ device: "gamepad", button: 0, action: "jump" },
		{ device: "gamepad", button: 2, action: "interact.primary" },
		{ device: "gamepad", button: 5, action: "sprint" },
		{ device: "gamepad", button: 7, action: "sprint" },
		{ device: "gamepad", button: 1, action: "charge.light" },
		{ device: "gamepad", button: 6, action: "charge.light" },
		{
			device: "gamepad",
			axis: 2,
			action: "look.left",
			scale: -1,
			deadzone: 0.12,
		},
		{
			device: "gamepad",
			axis: 2,
			action: "look.right",
			scale: 1,
			deadzone: 0.12,
		},
		{
			device: "gamepad",
			axis: 3,
			action: "look.up",
			scale: -1,
			deadzone: 0.12,
		},
		{
			device: "gamepad",
			axis: 3,
			action: "look.down",
			scale: 1,
			deadzone: 0.12,
		},
	]);
}

export type PlayerInputSystemOptions = {
	readonly input: InputPlatformPort;
	readonly playerResourceName?: string;
};

export function createPlayerInputSystem<TContext extends InputSystemContext>(
	options: PlayerInputSystemOptions,
): System<TContext> {
	const playerResourceName =
		options.playerResourceName ?? PLAYER_ENTITY_RESOURCE;

	return {
		id: "player-input",
		writes: [PLAYER_INPUT_COMPONENT, INPUT_SNAPSHOT_RESOURCE],
		update(context) {
			const player = context.world.getResource<Entity>(playerResourceName);

			if (player === undefined || !context.world.isAlive(player)) {
				return;
			}

			const snapshot = options.input.snapshot(context.tick);
			context.world.setResource(INPUT_SNAPSHOT_RESOURCE, snapshot);
			context.world.addComponent<PlayerInputComponent>(
				player,
				PLAYER_INPUT_COMPONENT,
				{
					actions: snapshot.actions,
					lookDelta: lookDeltaFromInput(snapshot),
				},
			);

			context.commands.dispatch({
				type: "MoveEntity",
				entity: player,
				direction: movementDirectionFromInput(snapshot),
				sprinting: getActionValue(snapshot, "sprint") > 0,
			} satisfies MoveEntityCommand);

			const jumpState = snapshot.actions.get("jump");

			if (jumpState?.phase === "pressed") {
				context.commands.dispatch({
					type: "JumpEntity",
					entity: player,
				} satisfies JumpEntityCommand);
			}

			const interactState = snapshot.actions.get("interact.primary");

			if (interactState?.phase === "pressed") {
				context.commands.dispatch({
					type: "InteractWithActiveTarget",
				} satisfies InteractWithActiveTargetCommand);
			}

			for (const click of snapshot.pointer.clicks) {
				context.commands.dispatch({
					type: "InteractAtScreenPoint",
					pointerId: click.pointerId,
					button: click.button,
					position: click.position,
				} satisfies InteractAtScreenPointCommand);
			}
		},
	};
}

export function createMovementCommandSystem<
	TContext extends MovementCommandContext,
>(): System<TContext> {
	return {
		id: "movement-commands",
		reads: [PLAYER_INPUT_COMPONENT],
		writes: [MOVEMENT_INTENT_COMPONENT],
		update(context) {
			const deferredCommands: Command[] = [];

			for (const command of context.commands.drain()) {
				if (isMoveEntityCommand(command)) {
					if (lengthSquaredVec3(command.direction) > 0) {
						context.world.addComponent<MovementIntentComponent>(
							command.entity,
							MOVEMENT_INTENT_COMPONENT,
							{
								direction: command.direction,
								sprinting: command.sprinting === true,
							},
						);
					} else {
						context.world.removeComponent(
							command.entity,
							MOVEMENT_INTENT_COMPONENT,
						);
					}
					continue;
				}

				if (isJumpEntityCommand(command)) {
					context.events.emit({
						type: "EntityJumpRequested",
						entity: command.entity,
					});
					continue;
				}

				deferredCommands.push(command);
			}

			for (const command of deferredCommands) {
				context.commands.dispatch(command);
			}
		},
	};
}

export function createInteractionCommandSystem<
	TContext extends InteractionCommandContext,
>(): System<TContext> {
	return {
		id: "interaction-commands",
		update(context) {
			const deferredCommands: Command[] = [];

			for (const command of context.commands.drain()) {
				if (isInteractAtScreenPointCommand(command)) {
					context.events.emit({
						type: "ScreenPointInteractionRequested",
						pointerId: command.pointerId,
						button: command.button,
						position: command.position,
					});
					continue;
				}

				if (isInteractWithActiveTargetCommand(command)) {
					context.events.emit({
						type: "ActiveInteractionRequested",
					});
					continue;
				}

				if (isCloseStoryNoteCommand(command)) {
					context.events.emit({
						type: "StoryNoteCloseRequested",
					});
					continue;
				}

				deferredCommands.push(command);
			}

			for (const command of deferredCommands) {
				context.commands.dispatch(command);
			}
		},
	};
}

type InputSystemContext = {
	readonly tick: number;
	readonly world: {
		getResource<TResource>(resourceName: string): TResource | undefined;
		isAlive(entity: Entity): boolean;
		setResource<TResource>(
			resourceName: string,
			resource: TResource,
		): TResource;
		addComponent<TComponent>(
			entity: Entity,
			componentName: string,
			component: TComponent,
		): TComponent;
	};
	readonly commands: {
		dispatch(command: Command): void;
	};
};

type MovementCommandContext = {
	readonly world: {
		addComponent<TComponent>(
			entity: Entity,
			componentName: string,
			component: TComponent,
		): TComponent;
		removeComponent<TComponent = unknown>(
			entity: Entity,
			componentName: string,
		): TComponent | undefined;
	};
	readonly commands: {
		drain(): Command[];
		dispatch(command: Command): void;
	};
	readonly events: {
		emit(event: {
			readonly type: string;
			readonly [key: string]: unknown;
		}): void;
	};
};

type InteractionCommandContext = {
	readonly commands: {
		drain(): Command[];
		dispatch(command: Command): void;
	};
	readonly events: {
		emit(event: {
			readonly type: string;
			readonly [key: string]: unknown;
		}): void;
	};
};

function movementDirectionFromInput(snapshot: InputSnapshot) {
	const right =
		getActionValue(snapshot, "move.right") -
		getActionValue(snapshot, "move.left");
	const forward =
		getActionValue(snapshot, "move.forward") -
		getActionValue(snapshot, "move.back");

	return normalizeVec3(vec3(right, 0, -forward));
}

function lookDeltaFromInput(
	snapshot: InputSnapshot,
): readonly [number, number] {
	const gamepadX =
		getActionValue(snapshot, "look.right") -
		getActionValue(snapshot, "look.left");
	const gamepadY =
		getActionValue(snapshot, "look.down") - getActionValue(snapshot, "look.up");

	return [
		snapshot.pointerDelta[0] + gamepadX * GAMEPAD_LOOK_DELTA_PER_TICK,
		snapshot.pointerDelta[1] + gamepadY * GAMEPAD_LOOK_DELTA_PER_TICK,
	];
}

function isMoveEntityCommand(command: Command): command is MoveEntityCommand {
	return (
		command.type === "MoveEntity" &&
		typeof command.entity === "number" &&
		isVec3Like(command.direction)
	);
}

function isJumpEntityCommand(command: Command): command is JumpEntityCommand {
	return command.type === "JumpEntity" && typeof command.entity === "number";
}

function isInteractAtScreenPointCommand(
	command: Command,
): command is InteractAtScreenPointCommand {
	return (
		command.type === "InteractAtScreenPoint" &&
		typeof command.pointerId === "number" &&
		typeof command.button === "number" &&
		Array.isArray(command.position) &&
		command.position.length === 2 &&
		typeof command.position[0] === "number" &&
		typeof command.position[1] === "number"
	);
}

function isInteractWithActiveTargetCommand(
	command: Command,
): command is InteractWithActiveTargetCommand {
	return command.type === "InteractWithActiveTarget";
}

function isCloseStoryNoteCommand(
	command: Command,
): command is CloseStoryNoteCommand {
	return command.type === "CloseStoryNote";
}

function isVec3Like(value: unknown): value is ReturnType<typeof vec3> {
	return (
		typeof value === "object" &&
		value !== null &&
		"x" in value &&
		"y" in value &&
		"z" in value &&
		typeof value.x === "number" &&
		typeof value.y === "number" &&
		typeof value.z === "number"
	);
}
