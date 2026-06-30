import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
	classifySphereAgainstPlanes,
	createCullingPolicyFromPerformanceConfig,
	cullingModeFromPerformanceConfig,
	evaluateCullingBatch,
	evaluateCullingSubject,
	type CullingPolicy,
} from "../src/game/performance/culling/index.js";
import type { PerformanceConfig } from "../src/game/performance/types.js";

const diagnosticPerformanceConfig: PerformanceConfig = {
	schemaVersion: 1,
	systems: {
		lod: { mode: "off" },
		culling: { mode: "diagnostic" },
		streaming: { mode: "off" },
		collision: { mode: "diagnostic" },
	},
};

const offPerformanceConfig: PerformanceConfig = {
	...diagnosticPerformanceConfig,
	systems: {
		...diagnosticPerformanceConfig.systems,
		culling: { mode: "off" },
	},
};

const diagnosticPolicy = createCullingPolicyFromPerformanceConfig(
	diagnosticPerformanceConfig,
	{
		observerPosition: { x: 0, y: 0, z: 0 },
		defaultRenderRelevanceRadius: 10,
		defaultUpdateRelevanceRadius: 20,
		hysteresis: {
			distance: 3,
			frustum: 1,
		},
		frustum: {
			kind: "planes",
			planes: [
				{ normal: { x: 1, y: 0, z: 0 }, constant: 5 },
				{ normal: { x: -1, y: 0, z: 0 }, constant: 5 },
			],
		},
	},
);

assert.equal(diagnosticPolicy.mode, "diagnostic");
assert.equal(cullingModeFromPerformanceConfig(offPerformanceConfig), "off");
assert.throws(
	() =>
		cullingModeFromPerformanceConfig({
			systems: {
				...diagnosticPerformanceConfig.systems,
				culling: { mode: "active" },
			},
		} as unknown as PerformanceConfig),
	/Unsupported culling performance mode "active"/,
	"unsupported culling config modes must be rejected by the culling owner.",
);

const nearby = evaluateCullingSubject(diagnosticPolicy, {
	id: "nearby",
	position: { x: 4, y: 0, z: 0 },
	boundsRadius: 0.5,
});

assert.equal(nearby.active, true);
assert.equal(nearby.updateIncluded, true);
assert.equal(nearby.renderIncluded, true);
assert.equal(nearby.frustum.relation, "inside");
assert.deepEqual(nearby.reasons, ["included"]);

const farButUpdated = evaluateCullingSubject(diagnosticPolicy, {
	id: "far-but-updated",
	position: { x: 12, y: 0, z: 0 },
	boundsRadius: 0.5,
});

assert.equal(
	farButUpdated.updateIncluded,
	true,
	"update culling uses the update relevance radius.",
);
assert.equal(
	farButUpdated.renderIncluded,
	false,
	"render culling uses the smaller render relevance radius.",
);
assert.deepEqual(farButUpdated.reasons, ["render-distance", "frustum"]);

const heldByDistanceHysteresis = evaluateCullingSubject(
	diagnosticPolicy,
	{
		id: "held-by-distance-hysteresis",
		position: { x: 12, y: 0, z: 0 },
		boundsRadius: 0.5,
	},
	{ updateIncluded: true, renderIncluded: true },
);

assert.equal(
	heldByDistanceHysteresis.renderDistance.included,
	true,
	"previously rendered subjects remain inside until radius plus hysteresis.",
);

const offPolicy = createCullingPolicyFromPerformanceConfig(
	offPerformanceConfig,
	{
		observerPosition: { x: 0, y: 0, z: 0 },
		defaultRenderRelevanceRadius: 1,
		frustum: { kind: "visibility-state", state: "outside" },
	},
);
const offDecision = evaluateCullingSubject(offPolicy, {
	id: "off-mode-subject",
	position: { x: 100, y: 0, z: 0 },
});

assert.equal(offDecision.active, false);
assert.equal(offDecision.updateIncluded, true);
assert.equal(offDecision.renderIncluded, true);
assert.deepEqual(offDecision.reasons, ["mode-off"]);

const directVisibilityPolicy: CullingPolicy = {
	mode: "diagnostic",
	observerPosition: { x: 0, y: 0, z: 0 },
	frustum: { kind: "visibility-state", state: "outside" },
	applyFrustumToUpdates: true,
};
const directVisibilityDecision = evaluateCullingSubject(directVisibilityPolicy, {
	id: "outside-direct-state",
	position: { x: 0, y: 0, z: 0 },
});

assert.equal(directVisibilityDecision.updateIncluded, false);
assert.equal(directVisibilityDecision.renderIncluded, false);
assert.equal(directVisibilityDecision.frustum.reason, "visibility-state");

assert.equal(
	classifySphereAgainstPlanes(
		{ x: 6, y: 0, z: 0 },
		0.5,
		[{ normal: { x: -1, y: 0, z: 0 }, constant: 5 }],
	),
	"outside",
);
assert.equal(
	classifySphereAgainstPlanes(
		{ x: 6, y: 0, z: 0 },
		1.5,
		[{ normal: { x: -1, y: 0, z: 0 }, constant: 5 }],
	),
	"intersecting",
	"expanded hysteresis radius can hold a prior frustum edge inclusion.",
);

const batch = evaluateCullingBatch(diagnosticPolicy, [
	{ id: "first", position: { x: 0, y: 0, z: 0 } },
	{ id: "second", position: { x: 30, y: 0, z: 0 } },
]);

assert.deepEqual(
	batch.map((decision) => decision.id),
	["first", "second"],
	"batch evaluation preserves subject order for stable game-state projection.",
);

assert.throws(
	() =>
		evaluateCullingSubject(diagnosticPolicy, {
			id: "invalid",
			position: { x: 0, y: 0, z: 0 },
			relevanceRadius: -1,
		}),
	/relevanceRadius must be non-negative/,
	"invalid culling radii must fail before runtime use.",
);

const cullingSource = readFileSync(
	resolve("src/game/performance/culling/index.ts"),
	"utf8",
);
const importLines = cullingSource
	.split("\n")
	.filter((line) => line.trimStart().startsWith("import "));

for (const forbiddenImport of [
	"three",
	"@threlte",
	"@dimforge/rapier",
	"svelte",
	"astro",
	"src/editor",
	"src/levels",
	"window",
	"document",
]) {
	assert.equal(
		importLines.some((line) => line.includes(forbiddenImport)),
		false,
		`culling policy must not import ${forbiddenImport}.`,
	);
}

console.log("Performance culling contract passed.");
