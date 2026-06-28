import { readFileSync } from "node:fs";
import { World } from "../src/engine/core/index.js";
import { vec3 } from "../src/engine/math/index.js";
import {
	LIGHT_COMPONENT,
	type LightComponent,
	type RenderTransform,
	TRANSFORM_COMPONENT,
} from "../src/engine/modules/rendering/index.js";
import { LevelLoader } from "../src/engine/modules/scene/index.js";
import { PrefabRegistry } from "../src/game/prefabs/index.js";
import {
	ACTIVE_INTERACTION_TARGET_RESOURCE,
	ACTIVE_NPC_RESOURCE,
	FOLLOW_TARGET_COMPONENT,
	INTERACTION_TARGET_COMPONENT,
	LIGHT_MODULATION_COMPONENT,
	MOVEMENT_BEHAVIOR_COMPONENT,
	NPC_COMPONENT,
	NPC_SIGNIFICANCE_COMPONENT,
	OPEN_NPC_DIALOG_RESOURCE,
	PLAYER_ENTITY_RESOURCE,
	createFollowTargetSystem,
	createInteractionTargetSelectionSystem,
	createLightModulationSystem,
	createMovementBehaviorSystem,
	createNpcDialogSystem,
	createNpcProximitySystem,
	createNpcSignificanceSystem,
} from "../src/game/systems/index.js";
import fireflyArchetype from "../src/levels/global/npcs/firefly/archetype.json";
import fireflies from "../src/levels/observatory/npcs/fireflies.json";
import { observatoryLevelPackage } from "../src/levels/observatory/package.js";

const fireflyStableIds = fireflies.instances.map(
	(instance) => instance.stableId,
);
const fireflyPreloadAssetIds = fireflyArchetype.assets?.preload ?? [];
const observatoryManifest = observatoryLevelPackage.runtimeSceneManifest;

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

function assertIncludes(
	values: readonly string[] | undefined,
	expected: string,
	message?: string,
): void {
	if (!values?.includes(expected)) {
		throw new Error(
			message ??
				`Expected ${JSON.stringify(values)} to include ${JSON.stringify(expected)}.`,
		);
	}
}

function assertRecord(value: unknown, label: string): Record<string, unknown> {
	if (!isRecord(value)) {
		throw new Error(`Expected ${label} to be an object.`);
	}

	return value;
}

function assertNumberTuple3(
	value: unknown,
	label: string,
): readonly [number, number, number] {
	if (
		!Array.isArray(value) ||
		value.length !== 3 ||
		value.some((entry) => typeof entry !== "number" || !Number.isFinite(entry))
	) {
		throw new Error(`Expected ${label} to be a numeric vec3 tuple.`);
	}

	return [value[0], value[1], value[2]];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

{
	if (fireflyStableIds.length === 0) {
		throw new Error(
			"Observatory must own firefly NPC instances in level data.",
		);
	}

	for (const assetId of fireflyPreloadAssetIds) {
		assertIncludes(
			observatoryManifest.readiness.requiredAssetIds,
			assetId,
			`Firefly archetype preload asset "${assetId}" must be required by runtime readiness.`,
		);
	}

	for (const stableId of fireflyStableIds) {
		assertIncludes(
			observatoryManifest.readiness.requiredLightStableIds,
			stableId,
			`Firefly "${stableId}" must be required as an authored light.`,
		);
	}

	const npcPrefab = observatoryManifest.prefabs.find(
		(prefab) => prefab.id === "npc_firefly",
	);
	const prefabRecord = assertRecord(npcPrefab, "npc_firefly prefab");
	const prefabComponents = assertRecord(
		prefabRecord.components,
		"npc_firefly.components",
	);

	assertEqual(prefabComponents.Renderable, undefined);
}

for (const stableId of fireflyStableIds) {
	const instance = observatoryManifest.level.instances.find(
		(entry) => entry.stableId === stableId,
	);
	assertRecord(instance, `instance ${stableId}`);
	assertEqual(instance?.prefabId, "npc_firefly");

	const components = assertRecord(
		instance?.components,
		`${stableId}.components`,
	);
	assertRecord(components.Npc, `${stableId}.Npc`);
	assertRecord(components.MovementBehavior, `${stableId}.MovementBehavior`);
	assertRecord(components.Light, `${stableId}.Light`);
	assertRecord(components.LightModulation, `${stableId}.LightModulation`);
	assertRecord(components.InteractionTarget, `${stableId}.InteractionTarget`);
	assertRecord(components.Conversation, `${stableId}.Conversation`);
}

for (const stableId of fireflyStableIds) {
	const instance = observatoryManifest.level.instances.find(
		(entry) => entry.stableId === stableId,
	);
	const transform = assertRecord(instance?.transform, `${stableId}.transform`);
	assertNumberTuple3(transform.position, `${stableId}.transform.position`);
	const components = assertRecord(
		instance?.components,
		`${stableId}.components`,
	);
	const light = assertRecord(components.Light, `${stableId}.Light`);

	for (const field of ["intensity", "distance", "decay"]) {
		const value = light[field];
		if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
			throw new Error(`${stableId}.Light.${field} must be non-negative.`);
		}
	}
}

{
	const world = new World();
	const levelLoader = new LevelLoader({
		prefabs: new PrefabRegistry(observatoryManifest.prefabs),
	});

	await levelLoader.loadDefinition(world, observatoryManifest.level);

	const spawnedNpcEntities = world.query([
		NPC_COMPONENT,
		TRANSFORM_COMPONENT,
		LIGHT_COMPONENT,
	]);

	assertEqual(
		spawnedNpcEntities.length,
		fireflyStableIds.length,
		"Observatory NPC firefly roots must spawn as lit moving actors through LevelLoader.",
	);

	for (const entity of spawnedNpcEntities) {
		const light = world.getComponent<LightComponent>(entity, LIGHT_COMPONENT);

		if (
			!light ||
			light.kind !== "point" ||
			light.distance < 0 ||
			light.intensity < 0 ||
			light.decay < 0
		) {
			throw new Error("Spawned NPC light must be a non-negative point light.");
		}
	}
}

{
	const runtimeFiles = [
		"src/game/systems/npcs.ts",
		"src/game/runtime/index.ts",
		"src/engine/modules/rendering/index.ts",
		"src/engine/adapters/three/index.ts",
	];

	for (const file of runtimeFiles) {
		const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
		if (
			/FireflyBehaviorSystem|FireflyLightSystem|firefly-specific|npc-firefly/i.test(
				source,
			)
		) {
			throw new Error(
				`${file} must not introduce a firefly-specific runtime or adapter system.`,
			);
		}
	}
}

{
	const world = new World();
	const player = world.createEntity();
	const npc = world.createEntity();
	const visual = world.createEntity();

	world.setResource(PLAYER_ENTITY_RESOURCE, player);
	world.addComponent<RenderTransform>(player, TRANSFORM_COMPONENT, {
		position: vec3(0, 0, 0),
		rotation: { x: 0, y: 0, z: 0, w: 1 },
		scale: vec3(1, 1, 1),
	});
	world.addComponent<RenderTransform>(npc, TRANSFORM_COMPONENT, {
		position: vec3(1, 1, 1),
		rotation: { x: 0, y: 0, z: 0, w: 1 },
		scale: vec3(1, 1, 1),
	});
	world.addComponent(npc, NPC_COMPONENT, {
		id: "test:npc",
		archetype: "test",
		displayName: "Test NPC",
	});
	world.addComponent(npc, "StableId", { id: "test:npc" });
	world.addComponent(npc, MOVEMENT_BEHAVIOR_COMPONENT, {
		kind: "hover-wander",
		basePosition: [1, 1, 1],
		radius: 1,
		speed: 1,
		hoverHeight: 0.5,
		bobAmplitude: 0.25,
		bobSpeed: 1,
		phase: 0.25,
	});
	world.addComponent<LightComponent>(npc, LIGHT_COMPONENT, {
		kind: "point",
		color: "#ffffff",
		intensity: 1,
		distance: 2,
		decay: 1,
		visible: true,
	});
	world.addComponent(npc, LIGHT_MODULATION_COMPONENT, {
		baseIntensity: 2,
		baseDistance: 4,
		minimumIntensityScale: 0.1,
		pulseSpeed: 1,
		pulseSoftness: 0.5,
		activeLightPercent: 1,
		blinkPeriodSeconds: [2, 3],
		blinkFadeSeconds: 0.1,
		maxActiveLights: 1,
	});
	world.addComponent(visual, "StableId", { id: "test:npc:visual" });
	world.addComponent<RenderTransform>(visual, TRANSFORM_COMPONENT, {
		position: vec3(1, 1, 1),
		rotation: { x: 0, y: 0, z: 0, w: 1 },
		scale: vec3(1, 1, 1),
	});
	world.addComponent(visual, FOLLOW_TARGET_COMPONENT, {
		targetStableId: "test:npc",
		offset: [0.2, 0.1, 0],
		scale: [0.5, 0.5, 0.5],
	});

	createNpcSignificanceSystem().update({ world });
	createMovementBehaviorSystem().update({
		world,
		tick: 4,
		deltaSeconds: 1 / 60,
	});
	createFollowTargetSystem().update({ world });
	createLightModulationSystem().update({
		world,
		tick: 4,
		deltaSeconds: 1 / 60,
	});

	const significance = assertRecord(
		world.getComponent(npc, NPC_SIGNIFICANCE_COMPONENT),
		"NpcSignificance",
	);
	const transform = world.getComponent<RenderTransform>(
		npc,
		TRANSFORM_COMPONENT,
	);
	const visualTransform = world.getComponent<RenderTransform>(
		visual,
		TRANSFORM_COMPONENT,
	);
	const light = world.getComponent<LightComponent>(npc, LIGHT_COMPONENT);

	assertEqual(significance.tier, "near");
	assertEqual(transform?.position.y !== 1, true);
	assertEqual(visualTransform?.position.x !== 1, true);
	assertEqual(light?.kind, "point");

	if (!light || light.intensity < 0 || !Number.isFinite(light.intensity)) {
		throw new Error(
			"Light modulation must write a finite non-negative intensity.",
		);
	}
}

{
	const world = new World();
	const player = world.createEntity();
	const npc = world.createEntity();
	const emitted: Array<{
		readonly type: string;
		readonly [key: string]: unknown;
	}> = [];

	world.setResource(PLAYER_ENTITY_RESOURCE, player);
	world.addComponent<RenderTransform>(player, TRANSFORM_COMPONENT, {
		position: vec3(0, 0, 0),
		rotation: { x: 0, y: 0, z: 0, w: 1 },
		scale: vec3(1, 1, 1),
	});
	world.addComponent<RenderTransform>(npc, TRANSFORM_COMPONENT, {
		position: vec3(1, 0, 0),
		rotation: { x: 0, y: 0, z: 0, w: 1 },
		scale: vec3(1, 1, 1),
	});
	world.addComponent(npc, NPC_COMPONENT, {
		id: "test:npc",
		archetype: "test",
		displayName: "Test NPC",
	});
	world.addComponent(npc, INTERACTION_TARGET_COMPONENT, {
		kind: "npc",
		prompt: "Talk",
		activationRadius: 2,
	});
	world.addComponent(npc, "Conversation", {
		mode: "read-only",
		title: "Test NPC",
		excerpt: "A test NPC is nearby.",
		body: "Functional NPC dialog opened.",
	});

	createNpcProximitySystem().update({ world });
	createInteractionTargetSelectionSystem().update({ world });

	const activeNpc = assertRecord(
		world.getResource(ACTIVE_NPC_RESOURCE),
		"ActiveNpc",
	);
	const activeTarget = assertRecord(
		world.getResource(ACTIVE_INTERACTION_TARGET_RESOURCE),
		"ActiveInteractionTarget",
	);

	assertEqual(activeNpc.displayName, "Test NPC");
	assertEqual(activeTarget.kind, "npc");

	createNpcDialogSystem().update({
		world,
		events: {
			emit(event) {
				emitted.push(event);
			},
			peek() {
				return [{ type: "ActiveInteractionRequested" }];
			},
		},
	});

	const openDialog = assertRecord(
		world.getResource(OPEN_NPC_DIALOG_RESOURCE),
		"OpenNpcDialog",
	);

	assertEqual(openDialog.displayName, "Test NPC");
	assertEqual(
		emitted.some((event) => event.type === "NpcDialogOpened"),
		true,
	);
}
