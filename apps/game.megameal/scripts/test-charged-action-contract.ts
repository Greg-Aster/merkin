import { type EngineEvent, EventBus, World } from "../src/engine/core/index.js";
import type {
	InputActionPhase,
	InputActionState,
	PlayerInputComponent,
} from "../src/engine/modules/input/index.js";
import {
	LIGHT_COMPONENT,
	type LightComponent,
	type PointLightComponent,
} from "../src/engine/modules/rendering/index.js";
import {
	createChargedActionSystem,
	createPlayerChargeLightFeedbackSystem,
} from "../src/game/systems/chargedActions.js";
import {
	CHARGED_ACTION_COMPONENT,
	type ChargedActionComponent,
	PLAYER_ENTITY_RESOURCE,
	PLAYER_INPUT_COMPONENT,
	PLAYER_LIGHT_FEEDBACK_COMPONENT,
	type PlayerLightFeedbackComponent,
} from "../src/game/systems/components.js";
import { assertDeepEqual, assertEqual } from "./contractTestHelpers.js";

type TestEvent = EngineEvent & {
	readonly [key: string]: unknown;
};

function assertClose(actual: number, expected: number, message?: string) {
	if (Math.abs(actual - expected) > 0.000001) {
		throw new Error(message ?? `Expected ${expected}, received ${actual}.`);
	}
}

function createHarness() {
	const world = new World();
	const events = new EventBus<TestEvent>();
	const player = world.createEntity();
	const system = createChargedActionSystem();

	world.setResource(PLAYER_ENTITY_RESOURCE, player);

	return { events, player, system, world };
}

function chargeAction(
	value: number,
	previousValue: number,
	phase: InputActionPhase,
): InputActionState {
	return { value, previousValue, phase };
}

function setPlayerChargeInput(
	world: World,
	player: number,
	action?: InputActionState,
) {
	const actions = new Map<string, InputActionState>();

	if (action) {
		actions.set("charge.light", action);
	}

	world.addComponent<PlayerInputComponent>(player, PLAYER_INPUT_COMPONENT, {
		actions,
		lookDelta: [0, 0],
	});
}

function runUpdate(
	harness: ReturnType<typeof createHarness>,
	deltaSeconds: number,
) {
	harness.system.update({
		deltaSeconds,
		events: harness.events,
		world: harness.world,
	});
}

function runLightFeedback(harness: ReturnType<typeof createHarness>) {
	createPlayerChargeLightFeedbackSystem().update({
		world: harness.world,
	});
}

function eventTypes(events: EventBus<TestEvent>) {
	return events.peek().map((event) => event.type);
}

function addPlayerPointLight(world: World, player: number) {
	world.addComponent<LightComponent>(player, LIGHT_COMPONENT, {
		kind: "point",
		color: "#ffd6a3",
		intensity: 5.5,
		distance: 16,
		decay: 2,
		visible: true,
	});
}

function requirePlayerPointLight(
	world: World,
	player: number,
): PointLightComponent {
	const light = world.requireComponent<LightComponent>(player, LIGHT_COMPONENT);

	if (light.kind !== "point") {
		throw new Error("Expected player light to be a point light.");
	}

	return light;
}

{
	const harness = createHarness();
	setPlayerChargeInput(
		harness.world,
		harness.player,
		chargeAction(1, 0, "pressed"),
	);

	runUpdate(harness, 0.4);

	const charged = harness.world.requireComponent<ChargedActionComponent>(
		harness.player,
		CHARGED_ACTION_COMPONENT,
	);

	assertEqual(charged.active, true);
	assertClose(charged.chargeSeconds, 0.4);
	assertClose(charged.normalizedCharge, 0.25);
	assertDeepEqual(eventTypes(harness.events), [
		"ChargeActionStarted",
		"ChargeActionHeld",
	]);
}

{
	const harness = createHarness();
	setPlayerChargeInput(
		harness.world,
		harness.player,
		chargeAction(1, 0, "pressed"),
	);
	runUpdate(harness, 0.4);
	harness.events.clearQueue();

	setPlayerChargeInput(
		harness.world,
		harness.player,
		chargeAction(0, 1, "released"),
	);
	runUpdate(harness, 0.016);

	const charged = harness.world.requireComponent<ChargedActionComponent>(
		harness.player,
		CHARGED_ACTION_COMPONENT,
	);

	assertEqual(charged.active, false);
	assertEqual(charged.chargeSeconds, 0);
	assertEqual(charged.normalizedCharge, 0);
	assertDeepEqual(eventTypes(harness.events), ["ChargeActionReleased"]);
}

{
	const harness = createHarness();
	setPlayerChargeInput(
		harness.world,
		harness.player,
		chargeAction(1, 0, "pressed"),
	);
	runUpdate(harness, 2);
	harness.events.clearQueue();

	setPlayerChargeInput(
		harness.world,
		harness.player,
		chargeAction(0, 1, "released"),
	);
	runUpdate(harness, 0.016);

	const releaseEvent = harness.events
		.peek()
		.find((event) => event.type === "ChargeActionReleased");
	const burstEvent = harness.events
		.peek()
		.find((event) => event.type === "PlayerLightBurstRequested");

	assertDeepEqual(eventTypes(harness.events), [
		"ChargeActionReleased",
		"PlayerLightBurstRequested",
	]);
	assertClose(Number(releaseEvent?.normalizedCharge), 1);
	assertClose(Number(burstEvent?.normalizedCharge), 1);
}

{
	const harness = createHarness();
	setPlayerChargeInput(
		harness.world,
		harness.player,
		chargeAction(1, 0, "pressed"),
	);
	runUpdate(harness, 0.5);
	harness.events.clearQueue();

	setPlayerChargeInput(harness.world, harness.player);
	runUpdate(harness, 0.016);

	assertDeepEqual(eventTypes(harness.events), ["ChargeActionCanceled"]);
}

{
	const harness = createHarness();
	addPlayerPointLight(harness.world, harness.player);
	harness.world.addComponent<ChargedActionComponent>(
		harness.player,
		CHARGED_ACTION_COMPONENT,
		{
			actionId: "charge.light",
			active: true,
			chargeSeconds: 0.8,
			normalizedCharge: 0.5,
		},
	);

	runLightFeedback(harness);

	const light = requirePlayerPointLight(harness.world, harness.player);
	const feedback = harness.world.requireComponent<PlayerLightFeedbackComponent>(
		harness.player,
		PLAYER_LIGHT_FEEDBACK_COMPONENT,
	);

	assertClose(feedback.baseIntensity, 5.5);
	assertClose(feedback.baseDistance, 16);
	assertClose(light.intensity, 8.25);
	assertClose(light.distance, 19);
}

{
	const harness = createHarness();
	addPlayerPointLight(harness.world, harness.player);
	harness.world.addComponent<ChargedActionComponent>(
		harness.player,
		CHARGED_ACTION_COMPONENT,
		{
			actionId: "charge.light",
			active: true,
			chargeSeconds: 1.6,
			normalizedCharge: 1,
		},
	);
	runLightFeedback(harness);

	harness.world.addComponent<ChargedActionComponent>(
		harness.player,
		CHARGED_ACTION_COMPONENT,
		{
			actionId: "charge.light",
			active: false,
			chargeSeconds: 0,
			normalizedCharge: 0,
		},
	);
	runLightFeedback(harness);

	const light = requirePlayerPointLight(harness.world, harness.player);

	assertClose(light.intensity, 5.5);
	assertClose(light.distance, 16);
}

console.log("Charged action contract validation passed.");
