import {
	CommandBus,
	type EngineEvent,
	EventBus,
	World,
} from "../src/engine/core/index.js";
import type { RuntimeSceneManifestData } from "../src/engine/index.js";
import {
	defaultRuntimeSceneManifests,
	portalArenaRuntimeSceneManifest,
} from "../src/game/levels/index.js";
import {
	ACTIVE_INTERACTION_TARGET_RESOURCE,
	ACTIVE_PORTAL_RESOURCE,
	ACTIVE_STORY_NOTE_RESOURCE,
	type ActiveInteractionTargetState,
	type ActivePortalState,
	type ActiveStoryNoteState,
	OPEN_STORY_NOTE_RESOURCE,
	type OpenStoryNoteState,
	PLAYER_ENTITY_RESOURCE,
	RUNTIME_SCENE_TRANSITION_RESOURCE,
} from "../src/game/systems/components.js";
import {
	createInteractionCommandSystem,
	createInteractionTargetSelectionSystem,
	createPortalActivationSystem,
	createStoryNoteActivationSystem,
	selectGameHudState,
} from "../src/game/systems/index.js";
import { assertDeepEqual, assertEqual } from "./contractTestHelpers.js";

type TestEvent = EngineEvent & {
	readonly [key: string]: unknown;
};
const yggdrasilRuntimeSceneId = "yggdrasil_runtime";

function createHarness() {
	return {
		commands: new CommandBus(),
		events: new EventBus<TestEvent>(),
		interactionCommands: createInteractionCommandSystem(),
		interactionTargets: createInteractionTargetSelectionSystem(),
		portalActivation: createPortalActivationSystem(),
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

function runPortalActivation(harness: ReturnType<typeof createHarness>) {
	harness.portalActivation.update({
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

{
	const harness = createHarness();
	const player = harness.world.createEntity();
	const portal = activePortal();
	const requestedRuntimeSceneIds: string[] = [];

	harness.world.setResource(PLAYER_ENTITY_RESOURCE, player);
	harness.world.setResource(ACTIVE_PORTAL_RESOURCE, portal);
	harness.world.setResource(RUNTIME_SCENE_TRANSITION_RESOURCE, {
		currentRuntimeSceneId() {
			return "portal_arena_runtime";
		},
		canLoadRuntimeScene(runtimeSceneId: string) {
			return runtimeSceneId === "miranda_deck_runtime";
		},
		requestRuntimeScene(runtimeSceneId: string) {
			requestedRuntimeSceneIds.push(runtimeSceneId);
		},
		reloadRuntimeScene() {},
	});

	harness.events.emit({ type: "ActiveInteractionRequested" });
	runInteractionTargetSelection(harness);
	runPortalActivation(harness);

	assertDeepEqual(requestedRuntimeSceneIds, ["miranda_deck_runtime"]);
	assertEqual(
		harness.events.peek().some((event) => event.type === "PortalActivated"),
		true,
	);
}

{
	const harness = createHarness();
	const selectedPortal = activePortal();
	const stalePortal = {
		...activePortal(0.5),
		entity: 100,
		label: "Stale Portal",
		prompt: "Wrong prompt",
	};

	harness.world.setResource(ACTIVE_INTERACTION_TARGET_RESOURCE, {
		kind: "portal",
		...selectedPortal,
	});
	harness.world.setResource(ACTIVE_PORTAL_RESOURCE, stalePortal);

	const hud = selectGameHudState(harness.world);

	assertEqual(hud.activePortal?.label, "Portal");
	assertEqual(hud.activePortal?.prompt, "Enter portal");
}

{
	const harness = createHarness();
	const selectedNote = activeStoryNote();
	const staleNote = {
		...activeStoryNote(0.5),
		entity: 8,
		title: "Stale Note",
		prompt: "Wrong note prompt",
	};

	harness.world.setResource(ACTIVE_INTERACTION_TARGET_RESOURCE, {
		kind: "story-note",
		...selectedNote,
	});
	harness.world.setResource(ACTIVE_STORY_NOTE_RESOURCE, staleNote);

	const hud = selectGameHudState(harness.world);

	assertEqual(hud.activeStoryNote?.title, "Test Note");
	assertEqual(hud.activeStoryNote?.prompt, "Read Test Note");
}

{
	const manifest = requiredYggdrasilRuntimeSceneManifest();
	const storyNoteStableIds = stableIdsWithComponent(manifest, "StoryNote");

	firstRequired(storyNoteStableIds, "Yggdrasil authored story notes");

	assertYggdrasilStoryNoteContract(manifest);
	assertYggdrasilStoryNoteContractError(
		{
			...manifest,
			level: {
				...manifest.level,
				instances: manifest.level.instances.filter(
					(instance) => !storyNoteStableIds.includes(instance.stableId),
				),
			},
		},
		"Yggdrasil must include at least one authored story note.",
	);
}

{
	const portalArenaYggdrasilPortal = portalTarget(
		portalArenaRuntimeSceneManifest,
		yggdrasilRuntimeSceneId,
	);

	if (portalArenaYggdrasilPortal) {
		const harness = createHarness();
		const player = harness.world.createEntity();
		const requestedRuntimeSceneIds: string[] = [];

		harness.world.setResource(PLAYER_ENTITY_RESOURCE, player);
		harness.world.setResource(ACTIVE_PORTAL_RESOURCE, {
			entity: 101,
			id: String(portalArenaYggdrasilPortal.id ?? "portal"),
			label: String(portalArenaYggdrasilPortal.label ?? "Yggdrasil"),
			prompt: String(portalArenaYggdrasilPortal.prompt ?? "Enter Yggdrasil"),
			targetRuntimeSceneId: yggdrasilRuntimeSceneId,
			canTravel: true,
			distanceSquared: 1,
		});
		harness.world.setResource(RUNTIME_SCENE_TRANSITION_RESOURCE, {
			currentRuntimeSceneId() {
				return "portal_arena_runtime";
			},
			canLoadRuntimeScene(runtimeSceneId: string) {
				return runtimeSceneId === yggdrasilRuntimeSceneId;
			},
			requestRuntimeScene(runtimeSceneId: string) {
				requestedRuntimeSceneIds.push(runtimeSceneId);
			},
			reloadRuntimeScene() {},
		});

		harness.events.emit({ type: "ActiveInteractionRequested" });
		runInteractionTargetSelection(harness);
		runPortalActivation(harness);

		assertDeepEqual(requestedRuntimeSceneIds, [yggdrasilRuntimeSceneId]);
		assertEqual(
			harness.events.peek().some((event) => event.type === "PortalActivated"),
			true,
		);
	}
}

function requiredYggdrasilRuntimeSceneManifest(): RuntimeSceneManifestData {
	const manifest = defaultRuntimeSceneManifests.find(
		(candidate) => candidate.id === yggdrasilRuntimeSceneId,
	);

	if (!manifest) {
		throw new Error(
			`Expected Yggdrasil runtime scene manifest "${yggdrasilRuntimeSceneId}" to be registered before story-note validation.`,
		);
	}

	return manifest;
}

function assertYggdrasilStoryNoteContract(
	manifest: RuntimeSceneManifestData,
): void {
	const storyNotes = stableIdsWithComponent(manifest, "StoryNote").map(
		(stableId) => componentFromInstance(manifest, stableId, "StoryNote"),
	);

	if (storyNotes.length === 0) {
		throw new Error("Yggdrasil must include at least one authored story note.");
	}

	for (const note of storyNotes) {
		for (const key of [
			"id",
			"title",
			"author",
			"location",
			"excerpt",
			"body",
		] as const) {
			if (typeof note[key] !== "string" || note[key].length === 0) {
				throw new Error(`Yggdrasil story note must include ${key}.`);
			}
		}
	}
}

function assertYggdrasilStoryNoteContractError(
	manifest: RuntimeSceneManifestData,
	expectedError: string,
): void {
	try {
		assertYggdrasilStoryNoteContract(manifest);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : JSON.stringify(error);

		if (!message.includes(expectedError)) {
			throw new Error(
				`Expected Yggdrasil story-note error to include ${JSON.stringify(expectedError)}, received ${JSON.stringify(message)}.`,
			);
		}

		return;
	}

	throw new Error(
		`Expected Yggdrasil story-note error including ${JSON.stringify(expectedError)}.`,
	);
}

function stableIdsWithComponent(
	manifest: RuntimeSceneManifestData,
	componentName: string,
): readonly string[] {
	return manifest.level.instances
		.filter(
			(instance) =>
				Object.keys(
					componentFromInstance(manifest, instance.stableId, componentName),
				).length > 0,
		)
		.map((instance) => instance.stableId);
}

function componentFromInstance(
	manifest: RuntimeSceneManifestData,
	stableId: string,
	componentName: string,
): Record<string, unknown> {
	const instance = manifest.level.instances.find(
		(candidate) => candidate.stableId === stableId,
	);
	const prefab = manifest.prefabs.find(
		(candidate) => candidate.id === instance?.prefabId,
	);

	return {
		...asRecord(prefab?.components?.[componentName]),
		...asRecord(instance?.components?.[componentName]),
	};
}

function portalTarget(
	manifest: RuntimeSceneManifestData,
	targetRuntimeSceneId: string,
): Record<string, unknown> | undefined {
	for (const instance of manifest.level.instances) {
		const portal = componentFromInstance(manifest, instance.stableId, "Portal");

		if (portal.targetRuntimeSceneId === targetRuntimeSceneId) {
			return portal;
		}
	}

	return undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function firstRequired<TValue>(
	values: readonly TValue[] | undefined,
	label: string,
): TValue {
	const value = values?.[0];

	if (value === undefined) {
		throw new Error(`Expected ${label} to contain at least one entry.`);
	}

	return value;
}

console.log("Story note contract validation passed.");
