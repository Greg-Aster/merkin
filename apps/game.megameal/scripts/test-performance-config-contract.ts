import { strict as assert } from "node:assert";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
	PERFORMANCE_COLLISION_PRIMITIVE_SHAPES,
	PERFORMANCE_CONFIG_RESOURCE,
	PERFORMANCE_SYSTEM_IDS,
	composePerformanceConfig,
	defaultPerformanceConfig,
	parsePerformanceConfig,
	performanceModesForSystem,
	validatePerformanceConfig,
} from "../src/game/performance/index.js";
import globalPerformance from "../src/levels/global/performance.json";
import { levelPackageRouter } from "../src/levels/global/router.js";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const levelsRoot = join(appRoot, "src/levels");

const performanceReadme = await readFile(
	join(appRoot, "src/game/performance/README.md"),
	"utf8",
);
const graphSource = await readFile(
	join(appRoot, "src/editor/masterControlGraph.ts"),
	"utf8",
);
const masterControlMapSource = await readFile(
	join(appRoot, "src/editor/MasterControlMap.svelte"),
	"utf8",
);
const performanceConfigEditorSource = await readFile(
	join(appRoot, "src/editor/PerformanceConfigEditor.svelte"),
	"utf8",
);
const levelEditorWorkspaceSource = await readFile(
	join(appRoot, "src/editor/level/LevelEditorWorkspace.svelte"),
	"utf8",
);
const editorDevApiSource = await readFile(
	join(appRoot, "scripts/editor-dev-api.mjs"),
	"utf8",
);
const packageJson = JSON.parse(
	await readFile(join(appRoot, "package.json"), "utf8"),
);

const globalPerformanceConfig = parsePerformanceConfig(
	globalPerformance,
	"global performance config",
);
assert.deepEqual(
	globalPerformanceConfig,
	defaultPerformanceConfig,
	"current global performance config must remain compatible with the default stage-one JSON shape",
);
assert.deepEqual(
	Object.keys(globalPerformanceConfig.systems).sort(),
	[...PERFORMANCE_SYSTEM_IDS].sort(),
	"global performance config must enumerate every performance system",
);

for (const systemId of PERFORMANCE_SYSTEM_IDS) {
	assert.ok(
		performanceModesForSystem(systemId).includes(
			globalPerformanceConfig.systems[systemId].mode,
		),
		`global performance mode for ${systemId} must be supported`,
	);
}

const stageTwoGlobalConfig = parsePerformanceConfig(
	{
		schemaVersion: 1,
		systems: {
			lod: {
				mode: "diagnostic",
				tiers: [
					{
						id: "near",
						minDistance: 0,
						maxDistance: 24,
						qualityRatio: 1,
					},
					{
						id: "far",
						minDistance: 24,
						qualityRatio: 0.5,
					},
				],
			},
			culling: {
				mode: "diagnostic",
				visibility: {
					frustum: true,
					distance: {
						maxDistance: 120,
						hysteresis: 10,
					},
				},
			},
			streaming: {
				mode: "plan",
				residency: {
					assets: {
						loadDistance: 64,
						unloadDistance: 96,
					},
					collision: {
						loadDistance: 48,
						unloadDistance: 80,
					},
				},
			},
			collision: {
				mode: "spatial",
				diagnostics: {
					primitiveShapes: ["box", "capsule"],
					includeMeshColliders: true,
					includeWalkableOnly: false,
				},
			},
		},
	},
	"stage two global performance config",
);
const stageTwoLevelConfig = parsePerformanceConfig(
	{
		schemaVersion: 1,
		systems: {
			lod: {
				mode: "off",
			},
			culling: {
				mode: "diagnostic",
				visibility: {
					distance: {
						hysteresis: 16,
					},
				},
			},
			streaming: {
				mode: "off",
			},
			collision: {
				mode: "diagnostic",
				diagnostics: {
					primitiveShapes: ["sphere", "cylinder"],
				},
			},
		},
	},
	"stage two level performance config",
);
const composedStageTwoConfig = composePerformanceConfig(
	stageTwoGlobalConfig,
	stageTwoLevelConfig,
);
assert.equal(
	composedStageTwoConfig.systems.lod.mode,
	"off",
	"per-level performance mode overrides global defaults",
);
assert.equal(
	composedStageTwoConfig.systems.lod.tiers?.[0]?.id,
	"near",
	"per-level mode overrides must preserve unrelated global LOD tier data",
);
assert.equal(
	composedStageTwoConfig.systems.culling.visibility?.distance?.maxDistance,
	120,
	"nested per-level culling overrides must preserve global distance shape",
);
assert.equal(
	composedStageTwoConfig.systems.culling.visibility?.distance?.hysteresis,
	16,
	"nested per-level culling overrides must replace only authored leaf values",
);
assert.deepEqual(
	composedStageTwoConfig.systems.collision.diagnostics?.primitiveShapes,
	["sphere", "cylinder"],
	"per-level collision diagnostics may replace global primitive shape filters",
);
assert.deepEqual(
	[...PERFORMANCE_COLLISION_PRIMITIVE_SHAPES],
	["box", "sphere", "capsule", "cylinder"],
	"collision diagnostics must validate the generic primitive shape set",
);

assertErrorIncludes(
	() =>
		parsePerformanceConfig(
			{
				...defaultPerformanceConfig,
				systems: {
					...defaultPerformanceConfig.systems,
					lighting: { mode: "diagnostic" },
				},
			},
			"bad performance config",
		),
	"bad performance config.systems.lighting is not a supported system.",
);
assertErrorIncludes(
	() =>
		parsePerformanceConfig(
			{
				...defaultPerformanceConfig,
				systems: {
					...defaultPerformanceConfig.systems,
					lod: { mode: "automatic" },
				},
			},
			"bad performance config",
		),
	"bad performance config.systems.lod.mode must be off or diagnostic or distance.",
);
assertErrorIncludes(
	() =>
		parsePerformanceConfig(
			{
				...defaultPerformanceConfig,
				systems: {
					...defaultPerformanceConfig.systems,
					collision: {
						mode: "diagnostic",
						diagnostics: {
							primitiveShapes: ["torus"],
						},
					},
				},
			},
			"bad performance config",
		),
	"bad performance config.systems.collision.diagnostics.primitiveShapes[0] must be box, sphere, capsule, or cylinder.",
);
assertErrorIncludes(
	() =>
		parsePerformanceConfig(
			{
				...defaultPerformanceConfig,
				systems: {
					...defaultPerformanceConfig.systems,
					streaming: {
						mode: "diagnostic",
						residency: {
							assets: {
								loadDistance: 20,
								unloadDistance: 10,
							},
						},
					},
				},
			},
			"bad performance config",
		),
	"bad performance config.systems.streaming.residency.assets.unloadDistance must be greater than or equal to loadDistance.",
);
assert.deepEqual(
	validatePerformanceConfig(defaultPerformanceConfig),
	[],
	"default performance config must validate without requiring stage-two blocks",
);

for (const subfolder of ["lod", "culling", "streaming", "collision"]) {
	await readFile(join(appRoot, "src/game/performance", subfolder, "README.md"));
}

assert.match(
	performanceReadme,
	/src\/game\/performance/,
	"performance README must document the engine-side owner folder",
);
assert.match(
	performanceReadme,
	/src\/levels\/global\/performance\.json/,
	"performance README must document the global level-owned config",
);
assert.match(
	performanceReadme,
	/src\/levels\/<level>\/performance\.json/,
	"performance README must document per-level config ownership",
);

const folders = (
	await Promise.all(
		(
			await readdir(levelsRoot, { withFileTypes: true })
		)
			.filter((entry) => entry.isDirectory() && entry.name !== "global")
			.map(async (entry) => {
				try {
					await readFile(join(levelsRoot, entry.name, "data.json"), "utf8");
					await readFile(join(levelsRoot, entry.name, "skybox.json"), "utf8");
					return entry.name;
				} catch {
					return undefined;
				}
			}),
	)
)
	.filter((name): name is string => typeof name === "string")
	.sort();

for (const folder of folders) {
	const levelDir = join(levelsRoot, folder);
	const data = JSON.parse(await readFile(join(levelDir, "data.json"), "utf8"));
	const performance = parsePerformanceConfig(
		JSON.parse(await readFile(join(levelDir, "performance.json"), "utf8")),
		`${folder} performance config`,
	);
	const composedPerformance = composePerformanceConfig(
		globalPerformance,
		performance,
	);
	const manifest = levelPackageRouter.getRuntimeSceneManifest(
		data.runtimeScene.id,
	);
	assert.ok(manifest, `${folder} runtime scene must be registered`);
	assert.deepEqual(
		manifest.level.resources?.[PERFORMANCE_CONFIG_RESOURCE],
		composedPerformance,
		`${folder} runtime scene must compose performance.json into ${PERFORMANCE_CONFIG_RESOURCE}`,
	);
	assert.equal(
		data.level.resources?.[PERFORMANCE_CONFIG_RESOURCE],
		undefined,
		`${folder} data.json must not own ${PERFORMANCE_CONFIG_RESOURCE}`,
	);

	const packageSource = await readFile(join(levelDir, "package.ts"), "utf8");
	assert.match(
		packageSource,
		/\.\/performance\.json/,
		`${folder}/package.ts must compose local performance.json`,
	);
}

for (const graphHandle of [
	"performance-config",
	"performance-systems",
	"performance-lod",
	"performance-culling",
	"performance-streaming",
	"performance-collision",
	"performance-diagnostics",
]) {
	assert.match(
		graphSource,
		new RegExp(graphHandle),
		`master-control graph must include ${graphHandle}`,
	);
}

for (const editorHandle of [
	"GLOBAL_PERFORMANCE_API_PATH",
	"Global Performance",
	"PerformanceConfigEditor",
	"performanceDiagnosticNodeIds",
	"Performance Diagnostics",
]) {
	assert.match(
		masterControlMapSource,
		new RegExp(editorHandle),
		`master-control editor must expose ${editorHandle}`,
	);
}

for (const performanceEditorHandle of [
	"LOD Tiers",
	"Max Distance",
	"Streaming Residency",
	"Collision Diagnostics",
	"primitiveShapes",
]) {
	assert.match(
		performanceConfigEditorSource,
		new RegExp(performanceEditorHandle),
		`performance config editor must expose ${performanceEditorHandle}`,
	);
}

for (const levelEditorHandle of [
	'"Performance"',
	"PerformanceConfigEditor",
	"performanceDraft",
	"Save Performance",
]) {
	assert.match(
		levelEditorWorkspaceSource,
		new RegExp(levelEditorHandle),
		`level editor must expose ${levelEditorHandle}`,
	);
}

for (const apiHandle of [
	"GLOBAL_PERFORMANCE_API_PATH",
	"performance.json",
	"validatePerformanceConfig",
	"validatePerformancePackageWrite",
	"validatePerformanceLodConfig",
	"validatePerformanceCullingConfig",
	"validatePerformanceStreamingConfig",
	"validatePerformanceCollisionConfig",
]) {
	assert.match(
		editorDevApiSource,
		new RegExp(apiHandle),
		`editor dev API must expose ${apiHandle}`,
	);
}

for (const scriptName of [
	"test:performance-collision-contract",
	"test:performance-config-contract",
	"test:performance-culling-contract",
	"test:performance-diagnostics-contract",
	"test:performance-lod-contract",
	"test:performance-runtime-contract",
	"test:performance-streaming-contract",
]) {
	assert.equal(
		typeof packageJson.scripts?.[scriptName],
		"string",
		`package.json must expose ${scriptName}`,
	);
}

console.log(
	`Performance config contract passed for ${folders.length} level packages.`,
);

function assertErrorIncludes(action: () => void, expected: string): void {
	try {
		action();
	} catch (error) {
		const message =
			error instanceof Error ? error.message : JSON.stringify(error);

		assert.match(message, new RegExp(escapeRegExp(expected)));
		return;
	}

	throw new Error(`Expected error including ${JSON.stringify(expected)}.`);
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
