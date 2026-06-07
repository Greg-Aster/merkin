import {
	COLLIDER_COMPONENT,
	EngineRuntime,
	RIGID_BODY_COMPONENT,
	type RuntimeSceneManifestData,
	SceneManager,
	World,
	evaluateRuntimeSceneReadiness,
	loadRuntimeSceneManifest,
} from "../src/engine/index.js";
import { LevelLoader } from "../src/game/levels/index.js";
import { PrefabRegistry } from "../src/game/prefabs/index.js";
import { createGameScene } from "../src/game/scenes/index.js";
import { activateTerrainChunkPackages } from "../src/game/systems/index.js";

const terrainPackageId = "synthetic:terrain-package";
const terrainChunkStableId = "synthetic:terrain:chunk:0:0";

const manifest = loadRuntimeSceneManifest({
	schemaVersion: 1,
	id: "synthetic_terrain_runtime",
	generatedAt: "2026-06-06T00:00:00.000Z",
	source: {
		kind: "cook",
		id: "synthetic-terrain-package-contract",
	},
	level: {
		id: "synthetic_terrain_level",
		sceneId: "synthetic_terrain_scene",
		instances: [
			{
				id: "synthetic-player",
				prefabId: "synthetic_player",
				stableId: "player",
			},
			{
				id: "synthetic-terrain-chunk",
				prefabId: "synthetic_terrain_chunk_cell",
				stableId: terrainChunkStableId,
			},
		],
	},
	prefabs: [
		{
			id: "synthetic_player",
			components: {
				Transform: {
					position: [0, 2, 0],
				},
			},
		},
		{
			id: "synthetic_terrain_chunk_cell",
			components: {
				Transform: {
					position: [0, 0, 0],
				},
				TerrainChunkCell: {
					packageId: terrainPackageId,
				},
			},
		},
	],
	assets: {
		assets: [],
	},
	renderProfile: {
		id: "synthetic_terrain_render_profile",
		renderer: {
			clearColor: "#000000",
			clearAlpha: 1,
			antialias: true,
			maxPixelRatio: 1,
			fallbackMaterialColor: "#ff00ff",
		},
		lighting: {
			lights: [],
		},
		environment: {
			kind: "solid-color",
			color: "#000000",
			backgroundIntensity: 1,
		},
	},
	terrainPackages: [
		{
			schemaVersion: 1,
			id: terrainPackageId,
			runtimeSceneId: "synthetic_terrain_runtime",
			sourceManifestId: "synthetic-terrain-package-contract",
			policy: {
				startupRadiusMeters: 16,
				activeCollisionRadiusMeters: 24,
				nearVisualRadiusMeters: 32,
				farVisualRadiusMeters: 64,
				unloadRadiusMeters: 80,
				hysteresisMeters: 4,
				maxChunkOperationsPerTick: 8,
			},
			chunks: [
				{
					stableId: terrainChunkStableId,
					groupId: "chunk",
					chunkKey: [0, 0],
					bounds: {
						min: [-8, -1, -8],
						max: [8, 1, 8],
					},
					center: [0, 0, 0],
					lod: {
						nearVisualStableIds: [],
						farVisualStableIds: [],
					},
					rigidBodyComponent: {
						type: "fixed",
						mass: 0,
					},
					colliderComponent: {
						intent: "walkable",
						channel: "worldStatic",
						shape: {
							type: "box",
							halfExtents: [8, 1, 8],
						},
					},
				},
			],
			visualBindings: [],
			startupChunkStableIds: [terrainChunkStableId],
			streamableChunkStableIds: [terrainChunkStableId],
			driftHash: "fnv1a32:synthetic",
		},
	],
	readiness: {
		playerStableId: "player",
		requiredTerrainPackageIds: [terrainPackageId],
	},
} satisfies RuntimeSceneManifestData);

assertManifestPresenceIsNotReadiness();
await assertTerrainActivationReport();
await assertSceneLoadReportsActivatedTerrainPackages();

console.log("Terrain package readiness contract validation passed.");

function assertManifestPresenceIsNotReadiness(): void {
	const readiness = evaluateRuntimeSceneReadiness(manifest, {
		levelId: manifest.level.id,
		...(manifest.level.sceneId ? { sceneId: manifest.level.sceneId } : {}),
		preloadedAssetIds: [],
		spawned: manifest.level.instances.map((instance) => ({
			prefabId: instance.prefabId,
			stableId: instance.stableId,
		})),
		physicsReady: true,
		playerReady: true,
	});

	assertEqual(
		readiness.ok,
		false,
		"Expected inactive terrain package to fail.",
	);
	assertIncludes(
		readiness.ok ? [] : readiness.errors,
		`Required terrain package "${terrainPackageId}" was not activated.`,
	);
	assertEqual(
		readiness.checks.terrainPackagesReady,
		false,
		"Expected terrain package readiness to come from activation state.",
	);
}

async function assertTerrainActivationReport(): Promise<void> {
	const world = new World();
	const levelLoader = new LevelLoader({
		prefabs: new PrefabRegistry(manifest.prefabs),
	});
	const loadResult = await levelLoader.loadDefinition(world, manifest.level);
	const activation = activateTerrainChunkPackages({
		world,
		terrainPackages: manifest.terrainPackages ?? [],
		spawned: loadResult.spawned,
	});
	const chunkEntity = loadResult.spawned.find(
		(spawned) => spawned.stableId === terrainChunkStableId,
	)?.entity;

	if (chunkEntity === undefined) {
		throw new Error("Expected terrain chunk entity to be spawned.");
	}

	assertEqual(
		activation.errors.length,
		0,
		"Expected terrain package activation to succeed.",
	);
	assertDeepEqual(activation.activatedPackageIds, [terrainPackageId]);
	assertDeepEqual(activation.startupChunkStableIds, [terrainChunkStableId]);
	assertEqual(world.hasComponent(chunkEntity, RIGID_BODY_COMPONENT), true);
	assertEqual(world.hasComponent(chunkEntity, COLLIDER_COMPONENT), true);

	const readiness = evaluateRuntimeSceneReadiness(manifest, {
		levelId: loadResult.levelId,
		...(loadResult.sceneId ? { sceneId: loadResult.sceneId } : {}),
		preloadedAssetIds: loadResult.preloadedAssets,
		spawned: loadResult.spawned.map((spawned) => ({
			prefabId: spawned.prefabId,
			stableId: spawned.stableId,
		})),
		activatedTerrainPackageIds: activation.activatedPackageIds,
		physicsReady: true,
		playerReady: true,
	});

	assertEqual(
		readiness.ok,
		true,
		"Expected activated terrain package readiness.",
	);
}

async function assertSceneLoadReportsActivatedTerrainPackages(): Promise<void> {
	const runtime = new EngineRuntime();
	const sceneManager = new SceneManager();
	const levelLoader = new LevelLoader({
		prefabs: new PrefabRegistry(manifest.prefabs),
	});
	let physicsReadyStartupIds: readonly string[] | undefined;

	await sceneManager.load(
		createGameScene({
			levelLoader,
			runtimeManifest: manifest,
			physicsReady({ terrainPackageStartupStableIds = [] } = {}) {
				physicsReadyStartupIds = terrainPackageStartupStableIds;
				const chunkEntity = runtime.world.query(["StableId"]).find((entity) => {
					const stableId = runtime.world.getComponent<{ id?: unknown }>(
						entity,
						"StableId",
					);
					return stableId?.id === terrainChunkStableId;
				});

				return (
					chunkEntity !== undefined &&
					runtime.world.hasComponent(chunkEntity, COLLIDER_COMPONENT) &&
					terrainPackageStartupStableIds.includes(terrainChunkStableId)
				);
			},
		}),
		runtime.services,
	);

	assertEqual(sceneManager.status, "active");
	assertDeepEqual(physicsReadyStartupIds, [terrainChunkStableId]);

	await sceneManager.unload(runtime.services);
	runtime.dispose();
}

function assertEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message?: string,
): void {
	if (actual !== expected) {
		throw new Error(
			message ?? `Expected ${String(expected)}, received ${String(actual)}.`,
		);
	}
}

function assertDeepEqual(
	actual: unknown,
	expected: unknown,
	message?: string,
): void {
	const actualJson = JSON.stringify(actual);
	const expectedJson = JSON.stringify(expected);

	if (actualJson !== expectedJson) {
		throw new Error(
			message ?? `Expected ${expectedJson}, received ${actualJson}.`,
		);
	}
}

function assertIncludes(values: readonly string[], expected: string): void {
	if (!values.includes(expected)) {
		throw new Error(
			`Expected ${JSON.stringify(values)} to include ${JSON.stringify(expected)}.`,
		);
	}
}
