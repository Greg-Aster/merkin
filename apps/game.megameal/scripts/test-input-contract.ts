import {
	InputManager,
	createActionMap,
} from "../src/engine/modules/input/index.js";
import {
	MOBILE_TOUCH_ACTION_IDS,
	createGameplayActionMap,
} from "../src/game/systems/input.js";

const emptyInput = () => new InputManager(createActionMap("test", []));

function assertEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message?: string,
) {
	if (actual !== expected) {
		throw new Error(
			message ?? `Expected ${String(expected)}, received ${String(actual)}.`,
		);
	}
}

function assertDeepEqual(actual: unknown, expected: unknown, message?: string) {
	const actualJson = JSON.stringify(actual);
	const expectedJson = JSON.stringify(expected);

	if (actualJson !== expectedJson) {
		throw new Error(
			message ?? `Expected ${expectedJson}, received ${actualJson}.`,
		);
	}
}

{
	const input = emptyInput();
	input.addPointerDelta(12, -4);
	const snapshot = input.snapshot(1);

	assertDeepEqual(snapshot.pointerDelta, [0, 0]);
	assertEqual(snapshot.pointer.lookActive, false);
	assertEqual(snapshot.pointer.clicks.length, 0);
}

{
	const input = emptyInput();
	input.setPointerLookActive(true);
	input.addPointerDelta(12, -4);
	const snapshot = input.snapshot(1);

	assertDeepEqual(snapshot.pointerDelta, [12, -4]);
	assertEqual(snapshot.pointer.lookActive, true);
}

{
	const input = emptyInput();
	input.setPointerLookActive(true);
	input.addPointerDelta(12, -4);
	input.setPointerLookActive(false);
	input.addPointerDelta(6, 6);
	const snapshot = input.snapshot(1);

	assertDeepEqual(snapshot.pointerDelta, [0, 0]);
	assertEqual(snapshot.pointer.lookActive, false);
}

{
	const input = emptyInput();
	input.setPointerLookActive(true);
	input.addPointerDelta(12, -4);
	input.setFocusState({ uiCapturingInput: true });

	const capturedSnapshot = input.snapshot(1);
	assertDeepEqual(capturedSnapshot.pointerDelta, [0, 0]);
	assertEqual(capturedSnapshot.pointer.lookActive, false);

	input.setFocusState({ uiCapturingInput: false });
	input.addPointerDelta(6, 6);
	const releasedSnapshot = input.snapshot(2);
	assertDeepEqual(releasedSnapshot.pointerDelta, [0, 0]);
	assertEqual(releasedSnapshot.pointer.lookActive, false);
}

{
	const input = emptyInput();
	input.addPointerClick({
		pointerId: 4,
		button: 0,
		position: [20, 30],
	});
	const snapshot = input.snapshot(1);

	assertDeepEqual(snapshot.pointer.clicks, [
		{ pointerId: 4, button: 0, position: [20, 30] },
	]);
}

{
	const input = new InputManager(createGameplayActionMap());

	input.setKey("KeyW", true);
	const pressed = input.snapshot(1);
	assertEqual(pressed.actions.get("move.forward")?.phase, "pressed");

	input.setFocusState({ focused: false });
	const disabled = input.snapshot(2);
	assertEqual(disabled.actions.size, 0);

	input.setKey("KeyD", true);
	input.setMouseButton(0, true);
	input.setTouch(MOBILE_TOUCH_ACTION_IDS.moveForward, true);
	input.setTouchLookActive(true);
	input.addTouchLookDelta(4, 4);
	input.addPointerClick({
		pointerId: 7,
		button: 0,
		position: [30, 40],
	});
	input.setFocusState({ focused: true });
	const resumed = input.snapshot(3);

	assertEqual(resumed.actions.has("move.forward"), false);
	assertEqual(resumed.actions.has("move.right"), false);
	assertEqual(resumed.actions.has("look.hold"), false);
	assertEqual(resumed.actions.has("interact.primary"), false);
	assertDeepEqual(resumed.pointerDelta, [0, 0]);
	assertEqual(resumed.pointer.lookActive, false);
	assertDeepEqual(resumed.pointer.clicks, []);
}

{
	const actionIds = new Set(
		createGameplayActionMap().bindings.map((binding) => binding.action),
	);

	for (const requiredAction of [
		"move.forward",
		"move.back",
		"move.left",
		"move.right",
		"jump",
		"sprint",
		"look.hold",
		"interact.primary",
		"charge.light",
	]) {
		assertEqual(
			actionIds.has(requiredAction),
			true,
			`Missing required gameplay action "${requiredAction}".`,
		);
	}
}

{
	const actionMap = createGameplayActionMap();
	const touchBindings = actionMap.bindings.filter(
		(binding) => binding.device === "touch",
	);
	const touchActionsById = new Map(
		touchBindings.map((binding) => [binding.touchId, binding.action]),
	);

	assertEqual(
		touchActionsById.get(MOBILE_TOUCH_ACTION_IDS.moveForward),
		"move.forward",
	);
	assertEqual(
		touchActionsById.get(MOBILE_TOUCH_ACTION_IDS.moveBack),
		"move.back",
	);
	assertEqual(
		touchActionsById.get(MOBILE_TOUCH_ACTION_IDS.moveLeft),
		"move.left",
	);
	assertEqual(
		touchActionsById.get(MOBILE_TOUCH_ACTION_IDS.moveRight),
		"move.right",
	);
	assertEqual(touchActionsById.get(MOBILE_TOUCH_ACTION_IDS.jump), "jump");
	assertEqual(touchActionsById.get(MOBILE_TOUCH_ACTION_IDS.sprint), "sprint");
	assertEqual(
		touchActionsById.get(MOBILE_TOUCH_ACTION_IDS.interactPrimary),
		"interact.primary",
	);
	assertEqual(
		touchActionsById.get(MOBILE_TOUCH_ACTION_IDS.chargeLight),
		"charge.light",
	);
}

{
	const input = new InputManager(createGameplayActionMap());

	input.setTouchValue(MOBILE_TOUCH_ACTION_IDS.moveForward, 0.75);
	const pressed = input.snapshot(1);
	assertEqual(pressed.actions.get("move.forward")?.phase, "pressed");
	assertEqual(pressed.actions.get("move.forward")?.value, 0.75);

	input.setTouchValue(MOBILE_TOUCH_ACTION_IDS.moveForward, 0);
	const released = input.snapshot(2);
	assertEqual(released.actions.get("move.forward")?.phase, "released");
}

{
	const input = emptyInput();

	input.setTouchLookActive(true);
	input.addTouchLookDelta(8, -3);
	const active = input.snapshot(1);
	assertDeepEqual(active.pointerDelta, [8, -3]);
	assertEqual(active.pointer.lookActive, true);

	input.clearTouchControls();
	input.addTouchLookDelta(8, -3);
	const cleared = input.snapshot(2);
	assertDeepEqual(cleared.pointerDelta, [0, 0]);
	assertEqual(cleared.pointer.lookActive, false);
}

{
	const input = new InputManager(createGameplayActionMap());

	input.setMouseButton(0, true);
	const pressed = input.snapshot(1);
	assertEqual(pressed.actions.get("look.hold")?.phase, "pressed");
	assertEqual(pressed.actions.has("interact.primary"), false);

	input.setMouseButton(0, false);
	const released = input.snapshot(2);
	assertEqual(released.actions.get("look.hold")?.phase, "released");
	assertEqual(released.actions.has("interact.primary"), false);
}

{
	const input = new InputManager(createGameplayActionMap());

	input.setTouch(MOBILE_TOUCH_ACTION_IDS.interactPrimary, true);
	const pressed = input.snapshot(1);
	assertEqual(pressed.actions.get("interact.primary")?.phase, "pressed");

	input.setTouch(MOBILE_TOUCH_ACTION_IDS.interactPrimary, false);
	const released = input.snapshot(2);
	assertEqual(released.actions.get("interact.primary")?.phase, "released");
}

{
	const input = new InputManager(createGameplayActionMap());

	input.setGamepadButton(2, true);
	const pressed = input.snapshot(1);
	assertEqual(pressed.actions.get("interact.primary")?.phase, "pressed");

	input.setGamepadButton(2, false);
	const released = input.snapshot(2);
	assertEqual(released.actions.get("interact.primary")?.phase, "released");
}

{
	const input = new InputManager(createGameplayActionMap());

	input.setKey("KeyF", true);
	const pressed = input.snapshot(1);
	assertEqual(pressed.actions.get("charge.light")?.phase, "pressed");

	const held = input.snapshot(2);
	assertEqual(held.actions.get("charge.light")?.phase, "held");

	input.setKey("KeyF", false);
	const released = input.snapshot(3);
	assertEqual(released.actions.get("charge.light")?.phase, "released");
}

console.log("Input contract validation passed.");
