import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { World } from "../src/engine/core/index.js";
import {
	COLLIDER_COMPONENT,
	type ColliderComponent,
} from "../src/engine/modules/physics/index.js";
import {
	LIGHT_COMPONENT,
	type LightComponent,
	RENDERABLE_COMPONENT,
	type RenderableComponent,
} from "../src/engine/modules/rendering/index.js";
import {
	PERFORMANCE_CONFIG_RESOURCE,
	type PerformanceConfig,
	collectPerformanceDiagnostics,
} from "../src/game/performance/index.js";

const diagnosticsSource = await readFile(
	fileURLToPath(
		new URL("../src/game/performance/diagnostics/index.ts", import.meta.url),
	),
	"utf8",
);

assert.doesNotMatch(
	diagnosticsSource,
	/from\s+["'][^"']*(svelte|astro|three|@threlte|rapier|src\/editor|src\/levels)/,
	"performance diagnostics must not import framework, adapter, editor, or level modules",
);
assert.doesNotMatch(
	diagnosticsSource,
	/\b(window|document|localStorage|sessionStorage)\b/,
	"performance diagnostics must not read browser globals",
);

const world = new World();
const config: PerformanceConfig = {
	schemaVersion: 1,
	systems: {
		lod: { mode: "diagnostic" },
		culling: { mode: "off" },
		streaming: { mode: "diagnostic" },
		collision: { mode: "diagnostic" },
	},
};

world.setResource(PERFORMANCE_CONFIG_RESOURCE, config);

const meshRenderable = world.createEntity();
world.addComponent<RenderableComponent>(meshRenderable, RENDERABLE_COMPONENT, {
	kind: "mesh",
	meshId: "mesh_contract_crate",
	materialId: "material_contract_crate",
	visible: true,
});

const spriteRenderable = world.createEntity();
world.addComponent<RenderableComponent>(
	spriteRenderable,
	RENDERABLE_COMPONENT,
	{
		kind: "sprite",
		spriteId: "sprite_contract_firefly",
		visible: true,
	},
);
world.addComponent<LightComponent>(spriteRenderable, LIGHT_COMPONENT, {
	kind: "point",
	color: "#ffffff",
	intensity: 1,
	distance: 12,
	decay: 2,
	visible: true,
});

const boxCollider = world.createEntity();
world.addComponent<ColliderComponent>(boxCollider, COLLIDER_COMPONENT, {
	intent: "solid",
	channel: "worldStatic",
	sensor: false,
	shape: {
		type: "box",
		halfExtents: { x: 1, y: 1, z: 1 },
	},
});

const walkableMeshCollider = world.createEntity();
world.addComponent<ColliderComponent>(
	walkableMeshCollider,
	COLLIDER_COMPONENT,
	{
		intent: "walkable",
		channel: "worldStatic",
		sensor: false,
		shape: {
			type: "mesh",
			vertices: [
				{ x: 0, y: 0, z: 0 },
				{ x: 1, y: 0, z: 0 },
				{ x: 1, y: 0, z: 1 },
				{ x: 0, y: 0, z: 1 },
			],
			indices: [0, 1, 2, 0, 2, 3],
		},
	},
);

const beforeSnapshot = snapshotWorld(world);
const diagnostics = collectPerformanceDiagnostics({
	world,
	activeRuntimeSceneId: "performance_diagnostics_contract_scene",
	assets: {
		listLoaded() {
			return ["mesh_contract_crate", "sprite_contract_firefly"];
		},
	},
});
const afterSnapshot = snapshotWorld(world);

assert.equal(
	afterSnapshot,
	beforeSnapshot,
	"collectPerformanceDiagnostics must not mutate ECS state",
);
assert.deepEqual(
	JSON.parse(JSON.stringify(diagnostics)),
	diagnostics,
	"performance diagnostics must be JSON-serializable",
);

assert.equal(
	diagnostics.activeRuntimeSceneId,
	"performance_diagnostics_contract_scene",
);
assert.deepEqual(diagnostics.counts, {
	entities: 4,
	renderables: 2,
	lights: 1,
	colliders: 2,
	walkableMeshColliders: 1,
	meshCollisionTriangles: 2,
	loadedAssets: 2,
});
assert.deepEqual(Object.keys(diagnostics.domains).sort(), [
	"collision",
	"culling",
	"lod",
	"streaming",
]);

assert.equal(diagnostics.domains.lod.mode, "diagnostic");
assert.equal(diagnostics.domains.lod.runtimeStatus, "diagnostic-only");
assert.deepEqual(diagnostics.domains.lod.subjects, [
	{
		id: "renderables",
		label: "Renderable candidates",
		count: 2,
	},
]);
assert.deepEqual(diagnostics.domains.lod.plannedOperations, [
	{
		id: "lod:evaluate-renderable-candidates",
		label: "Evaluate renderable LOD candidates",
		status: "diagnostic-only",
		candidateCount: 2,
	},
]);

assert.equal(diagnostics.domains.culling.mode, "off");
assert.equal(diagnostics.domains.culling.runtimeStatus, "disabled");
assert.deepEqual(diagnostics.domains.culling.plannedOperations, [
	{
		id: "culling:evaluate-visibility-candidates",
		label: "Evaluate visibility candidates",
		status: "disabled",
		candidateCount: 2,
	},
]);

assert.deepEqual(diagnostics.domains.streaming.plannedOperations, [
	{
		id: "streaming:evaluate-asset-residency",
		label: "Evaluate asset residency candidates",
		status: "diagnostic-only",
		candidateCount: 2,
	},
]);
assert.deepEqual(diagnostics.domains.collision.subjects, [
	{
		id: "colliders",
		label: "Collider candidates",
		count: 2,
	},
	{
		id: "walkable-mesh-colliders",
		label: "Walkable mesh collider candidates",
		count: 1,
	},
	{
		id: "mesh-collision-triangles",
		label: "Mesh collision triangle candidates",
		count: 2,
	},
]);

const mutableConfig = config as unknown as {
	readonly systems: {
		readonly lod: {
			mode: "off" | "diagnostic";
		};
	};
};
mutableConfig.systems.lod.mode = "off";
assert.equal(
	diagnostics.config.systems.lod.mode,
	"diagnostic",
	"diagnostics must not expose the live performance config object",
);

console.log("Performance diagnostics contract passed.");

function snapshotWorld(world: World): string {
	return JSON.stringify({
		entities: world.entities(),
		renderables: world
			.query([RENDERABLE_COMPONENT])
			.map((entity) =>
				world.requireComponent<RenderableComponent>(
					entity,
					RENDERABLE_COMPONENT,
				),
			),
		lights: world
			.query([LIGHT_COMPONENT])
			.map((entity) =>
				world.requireComponent<LightComponent>(entity, LIGHT_COMPONENT),
			),
		colliders: world
			.query([COLLIDER_COMPONENT])
			.map((entity) =>
				world.requireComponent<ColliderComponent>(entity, COLLIDER_COMPONENT),
			),
	});
}
