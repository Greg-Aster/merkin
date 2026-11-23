import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
	type LodGroupDefinition,
	createLodPolicyConfigFromPerformanceConfig,
	evaluateLodTier,
	parseLodPolicyConfig,
	validateLodPolicyConfig,
} from "../src/game/performance/lod/index.js";
import { defaultPerformanceConfig } from "../src/game/performance/types.js";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const lodRoot = join(appRoot, "src/game/performance/lod");

const groups: readonly LodGroupDefinition[] = [
	{
		id: "generic-prop",
		defaultTierId: "high",
		tiers: [
			{ id: "high", maxDistance: 20, minSignificance: 0.5 },
			{ id: "medium", maxDistance: 60, minSignificance: 0.1 },
			{ id: "low" },
		],
	},
];

const lodSource = await readFile(join(lodRoot, "index.ts"), "utf8");
const lodReadme = await readFile(join(lodRoot, "README.md"), "utf8");

for (const forbiddenPattern of [
	/from ["'](?:three|@threlte\/core|@dimforge\/rapier3d-compat|svelte|astro)/,
	/src\/editor/,
	/src\/levels/,
	/\b(window|document|localStorage|sessionStorage|navigator)\b/,
]) {
	assert.doesNotMatch(
		lodSource,
		forbiddenPattern,
		"LOD policy source must stay framework-, browser-, editor-, and level-free",
	);
}

assert.match(
	lodReadme,
	/distance\/significance evaluator/,
	"LOD README must describe the pure evaluator foundation",
);
assert.match(
	lodReadme,
	/can swap authored\s+`PerformanceLod` renderable payloads through ECS/m,
	"LOD README must document authored runtime payload swaps",
);

const offPolicy = createLodPolicyConfigFromPerformanceConfig(
	defaultPerformanceConfig,
	groups,
);
const offResult = evaluateLodTier(offPolicy, {
	distance: 100,
	groupId: "generic-prop",
	significance: 1,
});

assert.equal(offPolicy.mode, "off");
assert.equal(offResult.active, false);
assert.equal(offResult.reason, "mode-off");
assert.equal(offResult.selectedTierId, "high");
assert.equal(offResult.recommendedTierId, "low");

const diagnosticPolicy = parseLodPolicyConfig({
	mode: "diagnostic",
	groups,
});
const diagnosticResult = evaluateLodTier(diagnosticPolicy, {
	distance: 32,
	groupId: "generic-prop",
	significance: 1,
});

assert.equal(diagnosticResult.active, false);
assert.equal(diagnosticResult.reason, "diagnostic-only");
assert.equal(diagnosticResult.selectedTierId, "high");
assert.equal(diagnosticResult.recommendedTierId, "medium");

const activePolicy = parseLodPolicyConfig({
	mode: "distance",
	groups,
});

assert.equal(
	evaluateLodTier(activePolicy, {
		distance: 12,
		groupId: "generic-prop",
		significance: 1,
	}).selectedTierId,
	"high",
);
assert.equal(
	evaluateLodTier(activePolicy, {
		distance: 32,
		groupId: "generic-prop",
		significance: 1,
	}).selectedTierId,
	"medium",
);
assert.equal(
	evaluateLodTier(activePolicy, {
		distance: 80,
		groupId: "generic-prop",
		significance: 1,
	}).selectedTierId,
	"low",
);
assert.equal(
	evaluateLodTier(activePolicy, {
		distance: 12,
		groupId: "generic-prop",
		significance: 0.25,
	}).selectedTierId,
	"medium",
);

assert.deepEqual(
	validateLodPolicyConfig({
		mode: "automatic",
		groups,
	}),
	["LOD policy config.mode must be off, diagnostic, or distance."],
	"unsupported LOD modes must be rejected",
);

const unsupportedModeResult = evaluateLodTier(
	{ mode: "automatic", groups } as unknown as ReturnType<
		typeof parseLodPolicyConfig
	>,
	{
		distance: 80,
		groupId: "generic-prop",
		significance: 1,
	},
);

assert.equal(unsupportedModeResult.active, false);
assert.equal(unsupportedModeResult.reason, "unsupported-mode");
assert.equal(unsupportedModeResult.selectedTierId, "high");
assert.equal(unsupportedModeResult.recommendedTierId, "low");

assert.throws(
	() =>
		parseLodPolicyConfig({
			mode: "distance",
			groups: [
				{
					id: "bad-group",
					tiers: [{ id: "low" }, { id: "high", maxDistance: 10 }],
				},
			],
		}),
	/\.maxDistance may be omitted only on the last tier/,
	"unbounded tiers must not make later tiers unreachable",
);

assert.equal(
	evaluateLodTier(activePolicy, {
		distance: Number.NaN,
		groupId: "generic-prop",
		significance: 1,
	}).reason,
	"invalid-distance",
	"invalid distances must remain deterministic",
);

assert.equal(
	evaluateLodTier(activePolicy, {
		distance: 1,
		groupId: "missing-group",
		significance: 1,
	}).reason,
	"missing-group",
);

console.log("Performance LOD contract passed.");
