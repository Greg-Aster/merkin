import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type TerrainStreamingModule = {
	readonly planTerrainChunkStreamingOperations?: unknown;
	readonly createTerrainStreamingSystem?: unknown;
	readonly activateTerrainStartupChunks?: unknown;
	readonly activateTerrainChunkPackages?: unknown;
};

type TerrainStreamingOperation = {
	readonly stableId: string;
	readonly action: string;
};

type TerrainStreamingPlanResult = {
	readonly operations?: readonly TerrainStreamingOperation[];
	readonly collisionActivations?: readonly string[];
	readonly collisionDeactivations?: readonly string[];
	readonly protectedChunkStableIds?: readonly string[];
};

type TerrainStreamingPlanInput = {
	readonly packages: readonly TerrainPackageFixture[];
	readonly activeCollisionChunkStableIds: readonly string[];
	readonly playerPosition: readonly [number, number, number];
};

type TerrainStreamingPolicyFixture = {
	readonly startupRadiusMeters: number;
	readonly activeCollisionRadiusMeters: number;
	readonly nearVisualRadiusMeters: number;
	readonly farVisualRadiusMeters: number;
	readonly unloadRadiusMeters: number;
	readonly hysteresisMeters: number;
	readonly maxChunkOperationsPerTick: number;
};

type TerrainChunkFixture = {
	readonly stableId: string;
	readonly groupId: string;
	readonly chunkKey: readonly [number, number];
	readonly bounds: {
		readonly min: readonly [number, number, number];
		readonly max: readonly [number, number, number];
	};
	readonly center: readonly [number, number, number];
	readonly lod: {
		readonly nearVisualStableIds: readonly string[];
		readonly farVisualStableIds: readonly string[];
	};
	readonly rigidBodyComponent: {
		readonly type: "fixed";
		readonly mass: 0;
	};
	readonly colliderComponent: Record<string, unknown>;
};

type TerrainPackageFixture = {
	readonly schemaVersion: 1;
	readonly id: string;
	readonly runtimeSceneId: string;
	readonly sourceManifestId: string;
	readonly policy: TerrainStreamingPolicyFixture;
	readonly chunks: readonly TerrainChunkFixture[];
	readonly visualBindings: readonly {
		readonly id: string;
		readonly stableId: string;
		readonly prefabId: string;
		readonly bounds: TerrainChunkFixture["bounds"];
		readonly sourceChunkStableIds: readonly string[];
		readonly lod: "near" | "far" | "merged-floor";
	}[];
	readonly startupChunkStableIds: readonly string[];
	readonly streamableChunkStableIds: readonly string[];
	readonly driftHash: string;
};

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const streamingSystemPath = resolve(
	appRoot,
	"src/game/systems/terrainStreaming.ts",
);

await assertStreamingPolicySchema();
assertExpectedStreamingOwnerExists();
assertStreamingOwnerDoesNotLeakAdapters();
await assertStreamingPlannerBehavior();

console.log("Terrain streaming contract tests passed.");

async function assertStreamingPolicySchema(): Promise<void> {
	const schemas = (await import(
		"../src/engine/data/schemas/index.js"
	)) as typeof import("../src/engine/data/schemas/index.js");
	const validManifest = createRuntimeManifestWithPolicy(defaultPolicy());
	const validErrors = schemas.validateRuntimeSceneManifest(validManifest);

	assertDeepEqual(
		validErrors,
		[],
		"Expected terrain streaming policy to pass runtime scene manifest schema.",
	);

	assertSchemaRejects(
		schemas.validateRuntimeSceneManifest,
		createRuntimeManifestWithPolicy({
			...defaultPolicy(),
			startupRadiusMeters: 64,
			activeCollisionRadiusMeters: 48,
		}),
		"startupRadiusMeters must be less than or equal to activeCollisionRadiusMeters",
	);
	assertSchemaRejects(
		schemas.validateRuntimeSceneManifest,
		createRuntimeManifestWithPolicy({
			...defaultPolicy(),
			nearVisualRadiusMeters: 24,
		}),
		"nearVisualRadiusMeters must be greater than or equal to activeCollisionRadiusMeters",
	);
	assertSchemaRejects(
		schemas.validateRuntimeSceneManifest,
		createRuntimeManifestWithPolicy({
			...defaultPolicy(),
			farVisualRadiusMeters: 72,
		}),
		"farVisualRadiusMeters must be greater than or equal to nearVisualRadiusMeters",
	);
	assertSchemaRejects(
		schemas.validateRuntimeSceneManifest,
		createRuntimeManifestWithPolicy({
			...defaultPolicy(),
			unloadRadiusMeters: 128,
		}),
		"unloadRadiusMeters must be greater than or equal to farVisualRadiusMeters",
	);
	assertSchemaRejects(
		schemas.validateRuntimeSceneManifest,
		createRuntimeManifestWithPolicy({
			...defaultPolicy(),
			maxChunkOperationsPerTick: 0,
		}),
		"maxChunkOperationsPerTick must be a positive finite integer",
	);
}

function assertExpectedStreamingOwnerExists(): void {
	if (!existsSync(streamingSystemPath)) {
		throw new Error(
			[
				"Missing terrain streaming system owner: src/game/systems/terrainStreaming.ts.",
				"Expected exports:",
				"- planTerrainChunkStreamingOperations(input): pure deterministic operation planner.",
				"- createTerrainStreamingSystem(): generic ECS system with no level-specific branches.",
				"- activateTerrainStartupChunks(world, packages): promotes startup chunks into ECS Collider/RigidBody state before readiness.",
				"Expected behavior covered by this contract:",
				"- deterministic nearest-first ordering with stable ID tie-breakers.",
				"- maxChunkOperationsPerTick caps collision activation/deactivation work.",
				"- hysteresis prevents unload churn inside unloadRadiusMeters + hysteresisMeters.",
				"- the chunk containing the active player, and immediately adjacent chunks in that group, are never unloaded.",
				"- no Three, Rapier, DOM, browser, or adapter imports.",
			].join("\n"),
		);
	}
}

function assertStreamingOwnerDoesNotLeakAdapters(): void {
	const source = readFileSync(streamingSystemPath, "utf8");
	const forbiddenPatterns = [
		/from\s+["']three["']/,
		/@dimforge\/rapier/,
		/engine\/adapters/,
		/\bwindow\b/,
		/\bdocument\b/,
		/\bHTMLCanvasElement\b/,
	];

	for (const pattern of forbiddenPatterns) {
		if (pattern.test(source)) {
			throw new Error(
				`Terrain streaming system must not import or reference adapter/browser ownership: ${pattern}.`,
			);
		}
	}
}

async function assertStreamingPlannerBehavior(): Promise<void> {
	const module = (await import(
		pathToFileURL(streamingSystemPath).href
	)) as TerrainStreamingModule;

	if (typeof module.planTerrainChunkStreamingOperations !== "function") {
		throw new Error(
			"Expected terrainStreaming.ts to export planTerrainChunkStreamingOperations(input).",
		);
	}
	if (typeof module.createTerrainStreamingSystem !== "function") {
		throw new Error(
			"Expected terrainStreaming.ts to export createTerrainStreamingSystem().",
		);
	}
	if (
		typeof module.activateTerrainStartupChunks !== "function" &&
		typeof module.activateTerrainChunkPackages !== "function"
	) {
		throw new Error(
			"Expected terrainStreaming.ts to export startup activation as activateTerrainStartupChunks(world, packages) or activateTerrainChunkPackages(...).",
		);
	}

	const planOperations = module.planTerrainChunkStreamingOperations as (
		input: TerrainStreamingPlanInput,
	) => TerrainStreamingPlanResult;

	const baseInput = {
		packages: [streamingFixturePackage()],
		activeCollisionChunkStableIds: [
			"main-test:terrain:collision:main:x1-z0",
			"main-test:terrain:collision:main:x2-z0",
			"main-test:terrain:collision:main:x3-z0",
			"main-test:terrain:collision:main:x5-z0",
			"main-test:terrain:collision:main:x6-z0",
		],
		playerPosition: [0, 0.5, 0] as const,
	} satisfies TerrainStreamingPlanInput;

	const first = planOperations(baseInput);
	const second = planOperations(baseInput);

	assertDeepEqual(
		operationKeys(first),
		operationKeys(second),
		"Expected terrain streaming operation planning to be deterministic for identical inputs.",
	);

	const operations = operationsFromPlan(first);
	if (operations.length > defaultPolicy().maxChunkOperationsPerTick) {
		throw new Error(
			`Expected maxChunkOperationsPerTick to cap operations at ${defaultPolicy().maxChunkOperationsPerTick}; received ${operations.length}.`,
		);
	}

	const deactivations = deactivationsFromPlan(first);
	for (const protectedStableId of [
		"main-test:terrain:collision:main:x1-z0",
		"main-test:terrain:collision:main:x2-z0",
		"main-test:terrain:collision:main:x3-z0",
	]) {
		if (deactivations.includes(protectedStableId)) {
			throw new Error(
				`Expected active-player containing and adjacent chunk "${protectedStableId}" to be protected from unload.`,
			);
		}
	}

	const hysteresisPlan = planOperations({
		...baseInput,
		activeCollisionChunkStableIds: ["main-test:terrain:collision:main:x4-z0"],
		playerPosition: [108, 0.5, 0],
	});

	if (
		deactivationsFromPlan(hysteresisPlan).includes(
			"main-test:terrain:collision:main:x4-z0",
		)
	) {
		throw new Error(
			"Expected hysteresis to retain an active chunk until it is beyond unloadRadiusMeters + hysteresisMeters.",
		);
	}
}

function createRuntimeManifestWithPolicy(
	policy: TerrainStreamingPolicyFixture,
) {
	const chunk = {
		stableId: "test:terrain:collision:main:x0-z0",
		groupId: "main",
		chunkKey: [0, 0],
		bounds: {
			min: [-6, 0, -6],
			max: [6, 1, 6],
		},
		center: [0, 0.5, 0],
		lod: {
			nearVisualStableIds: ["test:floor:main"],
			farVisualStableIds: ["test:floor:main"],
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
				halfExtents: [6, 0.5, 6],
			},
		},
	};

	return {
		schemaVersion: 1,
		id: "terrain_streaming_schema_fixture",
		generatedAt: "2026-06-06T00:00:00.000Z",
		source: {
			kind: "authored",
			id: "terrain-streaming-contract",
		},
		level: {
			id: "terrain_streaming_level",
			instances: [
				{
					id: "player",
					prefabId: "player_prefab",
					stableId: "player",
					transform: {
						position: [0, 1, 0],
					},
				},
				{
					id: "terrain-chunk",
					prefabId: "terrain_chunk_prefab",
					stableId: chunk.stableId,
					components: {
						TerrainChunkCell: {
							packageId: "test_terrain_package",
						},
					},
					transform: {
						position: [0, 0, 0],
					},
				},
				{
					id: "visual-main",
					prefabId: "visual_floor_prefab",
					stableId: "test:floor:main",
				},
			],
		},
		prefabs: [
			{
				id: "player_prefab",
				components: {
					Transform: {},
				},
			},
			{
				id: "terrain_chunk_prefab",
				components: {
					Transform: {},
				},
			},
			{
				id: "visual_floor_prefab",
				components: {
					Transform: {},
				},
			},
		],
		assets: {
			assets: [],
		},
		renderProfile: {
			id: "terrain_streaming_render_profile",
			renderer: {
				clearColor: "#000000",
				clearAlpha: 1,
				antialias: true,
				maxPixelRatio: 2,
				fallbackMaterialColor: "#ff00ff",
			},
			lighting: {
				lights: [],
			},
			environment: {
				kind: "solid-color",
				color: "#000000",
				backgroundIntensity: 0,
			},
			postProcessing: {
				enabled: false,
				quality: "off",
				effects: [],
			},
		},
		terrainPackages: [
			{
				schemaVersion: 1,
				id: "test_terrain_package",
				runtimeSceneId: "terrain_streaming_schema_fixture",
				sourceManifestId: "terrain_streaming_manifest",
				policy,
				chunks: [chunk],
				visualBindings: [
					{
						id: "test-visual-main",
						stableId: "test:floor:main",
						prefabId: "visual_floor_prefab",
						bounds: chunk.bounds,
						sourceChunkStableIds: [chunk.stableId],
						lod: "merged-floor",
					},
				],
				startupChunkStableIds: [chunk.stableId],
				streamableChunkStableIds: [chunk.stableId],
				driftHash: "fnv1a32:00000000",
			},
		],
		readiness: {
			playerStableId: "player",
			requiredTerrainPackageIds: ["test_terrain_package"],
		},
	};
}

function defaultPolicy(): TerrainStreamingPolicyFixture {
	return {
		startupRadiusMeters: 36,
		activeCollisionRadiusMeters: 48,
		nearVisualRadiusMeters: 96,
		farVisualRadiusMeters: 192,
		unloadRadiusMeters: 240,
		hysteresisMeters: 16,
		maxChunkOperationsPerTick: 4,
	};
}

function streamingFixturePackage(): TerrainPackageFixture {
	const chunks = streamingFixtureChunks();

	return {
		schemaVersion: 1,
		id: "test_terrain_v1:chunk-package",
		runtimeSceneId: "test_level_runtime",
		sourceManifestId: "test_terrain_v1",
		policy: defaultPolicy(),
		chunks,
		visualBindings: [
			{
				id: "test-main-floor-visual-binding",
				stableId: "main-test:floor:main",
				prefabId: "test_floor_main",
				bounds: {
					min: [-72, 0, -6],
					max: [120, 1, 6],
				},
				sourceChunkStableIds: chunks.map((chunk) => chunk.stableId),
				lod: "merged-floor",
			},
		],
		startupChunkStableIds: chunks.slice(0, 3).map((chunk) => chunk.stableId),
		streamableChunkStableIds: chunks.map((chunk) => chunk.stableId),
		driftHash: "fnv1a32:00000000",
	};
}

function streamingFixtureChunks(): readonly TerrainChunkFixture[] {
	return [-2, -1, 0, 1, 2, 3, 4].map((x) => {
		const centerX = x * 24;

		return {
			stableId: `main-test:terrain:collision:main:x${x + 2}-z0`,
			groupId: "main",
			chunkKey: [x + 2, 0],
			bounds: {
				min: [centerX - 6, 0, -6],
				max: [centerX + 6, 1, 6],
			},
			center: [centerX, 0.5, 0],
			lod: {
				nearVisualStableIds: ["main-test:floor:main"],
				farVisualStableIds: ["main-test:floor:main"],
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
					halfExtents: [6, 0.5, 6],
				},
			},
		};
	});
}

function assertSchemaRejects(
	validateRuntimeSceneManifest: (data: unknown) => readonly string[],
	manifest: unknown,
	expectedError: string,
): void {
	const errors = validateRuntimeSceneManifest(manifest);

	if (!errors.some((error) => error.includes(expectedError))) {
		throw new Error(
			`Expected schema to reject with "${expectedError}". Received:\n${errors.join("\n")}`,
		);
	}
}

function operationsFromPlan(
	plan: TerrainStreamingPlanResult,
): readonly TerrainStreamingOperation[] {
	if (Array.isArray(plan.operations)) {
		return plan.operations;
	}

	return [
		...(plan.collisionActivations ?? []).map((stableId) => ({
			stableId,
			action: "activate-collision",
		})),
		...(plan.collisionDeactivations ?? []).map((stableId) => ({
			stableId,
			action: "deactivate-collision",
		})),
	];
}

function deactivationsFromPlan(
	plan: TerrainStreamingPlanResult,
): readonly string[] {
	if (Array.isArray(plan.collisionDeactivations)) {
		return plan.collisionDeactivations;
	}

	return operationsFromPlan(plan)
		.filter((operation) => operation.action === "deactivate-collision")
		.map((operation) => operation.stableId);
}

function operationKeys(plan: TerrainStreamingPlanResult): readonly string[] {
	return operationsFromPlan(plan).map(
		(operation) => `${operation.action}:${operation.stableId}`,
	);
}

function assertDeepEqual(
	actual: unknown,
	expected: unknown,
	message: string,
): void {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(
			`${message}\nExpected: ${JSON.stringify(expected, null, "\t")}\nActual: ${JSON.stringify(actual, null, "\t")}`,
		);
	}
}
