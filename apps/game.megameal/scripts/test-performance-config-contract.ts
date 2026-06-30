import { strict as assert } from "node:assert";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
	PERFORMANCE_CONFIG_RESOURCE,
	PERFORMANCE_SYSTEM_IDS,
	PERFORMANCE_SYSTEM_MODES,
	composePerformanceConfig,
	parsePerformanceConfig,
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
const levelEditorWorkspaceSource = await readFile(
	join(appRoot, "src/editor/level/LevelEditorWorkspace.svelte"),
	"utf8",
);
const editorDevApiSource = await readFile(
	join(appRoot, "scripts/editor-dev-api.mjs"),
	"utf8",
);

const globalPerformanceConfig = parsePerformanceConfig(
	globalPerformance,
	"global performance config",
);
assert.deepEqual(
	Object.keys(globalPerformanceConfig.systems).sort(),
	[...PERFORMANCE_SYSTEM_IDS].sort(),
	"global performance config must enumerate every performance system",
);

for (const systemId of PERFORMANCE_SYSTEM_IDS) {
	assert.ok(
		PERFORMANCE_SYSTEM_MODES.includes(
			globalPerformanceConfig.systems[systemId].mode,
		),
		`global performance mode for ${systemId} must be supported`,
	);
}

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
	"performanceDiagnosticNodeIds",
	"Performance Diagnostics",
]) {
	assert.match(
		masterControlMapSource,
		new RegExp(editorHandle),
		`master-control editor must expose ${editorHandle}`,
	);
}

for (const levelEditorHandle of [
	'"Performance"',
	"performanceDraft",
	"updatePerformanceMode",
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
]) {
	assert.match(
		editorDevApiSource,
		new RegExp(apiHandle),
		`editor dev API must expose ${apiHandle}`,
	);
}

console.log(
	`Performance config contract passed for ${folders.length} level packages.`,
);
