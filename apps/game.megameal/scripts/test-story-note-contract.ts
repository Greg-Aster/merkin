import {
	CommandBus,
	type EngineEvent,
	EventBus,
	World,
} from "../src/engine/core/index.js";
import {
	ACTIVE_INTERACTION_TARGET_RESOURCE,
	ACTIVE_PORTAL_RESOURCE,
	ACTIVE_STORY_NOTE_RESOURCE,
	type ActiveInteractionTargetState,
	type ActivePortalState,
	type ActiveStoryNoteState,
	OPEN_STORY_NOTE_RESOURCE,
	type OpenStoryNoteState,
} from "../src/game/systems/components.js";
import {
	createInteractionCommandSystem,
	createInteractionTargetSelectionSystem,
	createStoryNoteActivationSystem,
} from "../src/game/systems/index.js";

type TestEvent = EngineEvent & {
	readonly [key: string]: unknown;
};

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

function createHarness() {
	return {
		commands: new CommandBus(),
		events: new EventBus<TestEvent>(),
		interactionCommands: createInteractionCommandSystem(),
		interactionTargets: createInteractionTargetSelectionSystem(),
		storyNotes: createStoryNoteActivationSystem(),
		world: new World(),
	};
}

function activeStoryNote(distanceSquared = 1): ActiveStoryNoteState {
	return {
		entity: 7,
		id: "miranda.note.test",
		title: "Test Note",
		author: "Archivist",
		location: "Archive",
		excerpt: "A short excerpt.",
		body: "First paragraph.\n\nSecond paragraph.",
		prompt: "Read Test Note",
		distanceSquared,
	};
}

function activePortal(distanceSquared = 1): ActivePortalState {
	return {
		entity: 99,
		id: "portal",
		label: "Portal",
		prompt: "Enter portal",
		targetRuntimeSceneId: "miranda_deck_runtime",
		canTravel: true,
		distanceSquared,
	};
}

function runCommands(harness: ReturnType<typeof createHarness>) {
	harness.interactionCommands.update({
		commands: harness.commands,
		events: harness.events,
	});
}

function runInteractionTargetSelection(
	harness: ReturnType<typeof createHarness>,
) {
	harness.interactionTargets.update({
		world: harness.world,
	});
}

function runStoryNotes(harness: ReturnType<typeof createHarness>) {
	harness.storyNotes.update({
		events: harness.events,
		world: harness.world,
	});
}

{
	const harness = createHarness();
	const note = activeStoryNote();
	harness.world.setResource(ACTIVE_STORY_NOTE_RESOURCE, note);

	harness.commands.dispatch({ type: "InteractWithActiveTarget" });
	runCommands(harness);
	runInteractionTargetSelection(harness);
	runStoryNotes(harness);

	const openNote = harness.world.requireResource<OpenStoryNoteState>(
		OPEN_STORY_NOTE_RESOURCE,
	);

	assertDeepEqual(openNote, note);
	assertEqual(
		harness.events.peek().some((event) => event.type === "StoryNoteOpened"),
		true,
	);
}

{
	const harness = createHarness();
	const note = activeStoryNote();
	harness.world.setResource(ACTIVE_STORY_NOTE_RESOURCE, note);

	harness.events.emit({ type: "ScreenPointInteractionRequested" });
	runInteractionTargetSelection(harness);
	runStoryNotes(harness);

	assertDeepEqual(
		harness.world.requireResource<OpenStoryNoteState>(OPEN_STORY_NOTE_RESOURCE),
		note,
	);
}

{
	const harness = createHarness();
	const note = activeStoryNote();
	harness.world.setResource(ACTIVE_STORY_NOTE_RESOURCE, note);
	harness.world.setResource(ACTIVE_PORTAL_RESOURCE, activePortal(4));

	harness.events.emit({ type: "ActiveInteractionRequested" });
	runInteractionTargetSelection(harness);
	runStoryNotes(harness);

	assertDeepEqual(
		harness.world.requireResource<OpenStoryNoteState>(OPEN_STORY_NOTE_RESOURCE),
		note,
	);
	assertEqual(
		harness.world.requireResource<ActiveInteractionTargetState>(
			ACTIVE_INTERACTION_TARGET_RESOURCE,
		).kind,
		"story-note",
	);
}

{
	const harness = createHarness();
	harness.world.setResource(ACTIVE_STORY_NOTE_RESOURCE, activeStoryNote(4));
	harness.world.setResource(ACTIVE_PORTAL_RESOURCE, activePortal(1));

	harness.events.emit({ type: "ActiveInteractionRequested" });
	runInteractionTargetSelection(harness);
	runStoryNotes(harness);

	assertEqual(harness.world.hasResource(OPEN_STORY_NOTE_RESOURCE), false);
	assertEqual(
		harness.world.requireResource<ActiveInteractionTargetState>(
			ACTIVE_INTERACTION_TARGET_RESOURCE,
		).kind,
		"portal",
	);
}

{
	const harness = createHarness();
	harness.world.setResource(OPEN_STORY_NOTE_RESOURCE, activeStoryNote());

	harness.commands.dispatch({ type: "CloseStoryNote" });
	runCommands(harness);
	runStoryNotes(harness);

	assertEqual(harness.world.hasResource(OPEN_STORY_NOTE_RESOURCE), false);
}

console.log("Story note contract validation passed.");
