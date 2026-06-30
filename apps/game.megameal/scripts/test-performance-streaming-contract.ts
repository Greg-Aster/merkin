import {
	type StreamingChunkDefinition,
	createStreamingPlan,
} from "../src/game/performance/streaming/index.js";
import { defaultPerformanceConfig } from "../src/game/performance/types.js";

function assert(condition: boolean, message: string): void {
	if (!condition) {
		throw new Error(message);
	}
}

function assertEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message: string,
): void {
	if (actual !== expected) {
		throw new Error(
			`${message} Expected ${String(expected)}, received ${String(actual)}.`,
		);
	}
}

function assertDeepEqual(
	actual: unknown,
	expected: unknown,
	message: string,
): void {
	const actualJson = JSON.stringify(actual);
	const expectedJson = JSON.stringify(expected);

	if (actualJson !== expectedJson) {
		throw new Error(
			`${message} Expected ${expectedJson}, received ${actualJson}.`,
		);
	}
}

const chunks: readonly StreamingChunkDefinition[] = [
	{
		id: "resident:shared-audio",
		role: "resident",
		priority: 5,
		content: {
			assetIds: ["audio_ambient_loop"],
		},
	},
	{
		id: "startup:floor",
		role: "startup",
		priority: 1,
		content: {
			assetIds: ["mesh_floor"],
			colliderStableIds: ["floor:main"],
		},
	},
	{
		id: "streamable:far-loaded",
		role: "streamable",
		center: [12, 0, 0],
		loadRadius: 10,
		unloadRadius: 15,
		priority: 3,
		content: {
			assetIds: ["mesh_far_loaded"],
		},
	},
	{
		id: "streamable:near",
		role: "streamable",
		center: [4, 0, 0],
		loadRadius: 10,
		unloadRadius: 15,
		priority: 7,
		content: {
			assetIds: ["mesh_near"],
			renderStableIds: ["near:visual"],
		},
	},
	{
		id: "streamable:outside-loaded",
		role: "streamable",
		center: [22, 0, 0],
		loadRadius: 10,
		unloadRadius: 15,
		priority: 9,
		content: {
			assetIds: ["mesh_outside"],
		},
	},
];

{
	const plan = createStreamingPlan({
		performanceConfig: defaultPerformanceConfig,
		chunks,
		focus: {
			playerPosition: [0, 0, 0],
		},
	});

	assertEqual(
		plan.mode,
		"off",
		"default performance config keeps streaming off.",
	);
	assertEqual(plan.active, false, "off mode must be inert.");
	assertDeepEqual(plan.operations, [], "off mode must not emit operations.");
	assertDeepEqual(
		plan.readinessRequiredChunkIds,
		["startup:floor"],
		"startup chunk classification remains available while inert.",
	);
	assertDeepEqual(
		plan.streamableChunkIds,
		["streamable:far-loaded", "streamable:near", "streamable:outside-loaded"],
		"streamable chunks remain distinct from startup readiness.",
	);
}

{
	const diagnosticConfig = {
		...defaultPerformanceConfig,
		systems: {
			...defaultPerformanceConfig.systems,
			streaming: { mode: "diagnostic" as const },
		},
	};
	const plan = createStreamingPlan({
		performanceConfig: diagnosticConfig,
		chunks,
		focus: {
			playerPosition: [0, 0, 0],
		},
	});

	assertEqual(plan.mode, "diagnostic", "diagnostic config mode is recognized.");
	assertEqual(plan.active, false, "diagnostic mode must not actively stream.");
	assertDeepEqual(
		plan.operations,
		[],
		"diagnostic mode must not emit operations.",
	);
}

{
	const plan = createStreamingPlan({
		mode: "enabled",
		chunks,
		focus: {
			playerPosition: [0, 0, 0],
		},
	});

	assertEqual(plan.mode, "unsupported", "unsupported mode is rejected.");
	assert(
		plan.errors.some((error) => error.includes("not supported")),
		"unsupported mode must report a validation error.",
	);
	assertDeepEqual(
		plan.operations,
		[],
		"unsupported mode must not emit operations.",
	);
}

{
	const plan = createStreamingPlan({
		mode: "plan",
		chunks,
		residency: {
			loadedChunkIds: ["streamable:far-loaded", "streamable:outside-loaded"],
		},
		focus: {
			playerPosition: [0, 0, 0],
		},
	});

	assertEqual(plan.active, true, "explicit plan mode enables pure operations.");
	assertDeepEqual(
		plan.startupChunkIds,
		["startup:floor"],
		"startup chunks are classified separately.",
	);
	assertDeepEqual(
		plan.residentChunkIds,
		["resident:shared-audio"],
		"resident chunks are classified separately.",
	);
	assertDeepEqual(
		plan.readinessRequiredChunkIds,
		["startup:floor"],
		"readiness-required chunks include startup chunks only.",
	);
	assertDeepEqual(
		plan.desiredLoadedChunkIds,
		[
			"resident:shared-audio",
			"startup:floor",
			"streamable:far-loaded",
			"streamable:near",
		],
		"desired residency keeps startup, resident, near, and hysteresis-retained chunks.",
	);
	assertDeepEqual(
		plan.loadChunkIds,
		["resident:shared-audio", "startup:floor", "streamable:near"],
		"load decisions exclude already loaded chunks.",
	);
	assertDeepEqual(
		plan.unloadChunkIds,
		["streamable:outside-loaded"],
		"unload decisions apply after the unload radius, not the load radius.",
	);
	assertDeepEqual(
		plan.operations.map((operation) => operation.kind),
		["load-chunk", "load-chunk", "load-chunk", "unload-chunk"],
		"operations are load/unload plans only.",
	);
	assertDeepEqual(
		plan.operations.map((operation) => operation.chunkId),
		[
			"startup:floor",
			"resident:shared-audio",
			"streamable:near",
			"streamable:outside-loaded",
		],
		"operations use deterministic role and priority ordering.",
	);
	assertDeepEqual(
		plan.operations.find((operation) => operation.chunkId === "startup:floor")
			?.content,
		{
			assetIds: ["mesh_floor"],
			renderStableIds: [],
			colliderStableIds: ["floor:main"],
		},
		"operations describe content for future runtime services instead of loading it.",
	);
}

{
	const plan = createStreamingPlan({
		mode: "plan",
		chunks: [
			{
				id: "streamable:camera-only",
				role: "streamable",
				center: [100, 0, 0],
				loadRadius: 10,
				unloadRadius: 20,
			},
		],
		distanceSource: "camera",
		focus: {
			playerPosition: [100, 0, 0],
			cameraPosition: [95, 0, 0],
		},
	});

	assertDeepEqual(
		plan.loadChunkIds,
		["streamable:camera-only"],
		"camera distance can drive streaming when selected explicitly.",
	);
}

{
	const plan = createStreamingPlan({
		mode: "plan",
		chunks: [
			{
				id: "streamable:loaded-without-focus",
				role: "streamable",
				center: [50, 0, 0],
			},
		],
		residency: {
			loadedChunkIds: ["streamable:loaded-without-focus"],
		},
	});

	assertDeepEqual(
		plan.unloadChunkIds,
		[],
		"missing focus retains already loaded streamable chunks instead of unloading blindly.",
	);
	assert(
		plan.warnings.some((warning) => warning.includes("focus is missing")),
		"missing focus should report a non-fatal warning.",
	);
}

{
	const plan = createStreamingPlan({
		mode: "plan",
		chunks: [
			{
				id: "streamable:bad-radius",
				role: "streamable",
				center: [0, 0, 0],
				loadRadius: 20,
				unloadRadius: 10,
			},
		],
		focus: {
			playerPosition: [0, 0, 0],
		},
	});

	assertEqual(plan.active, false, "invalid radius disables active planning.");
	assert(
		plan.errors.some((error) => error.includes("unloadRadius")),
		"invalid radius hysteresis must be rejected.",
	);
	assertDeepEqual(
		plan.operations,
		[],
		"invalid plans must not emit operations.",
	);
}
