import { strict as assert } from "node:assert";

import { World } from "../src/engine/core/index.js";
import {
	COLLIDER_COMPONENT,
	PHYSICS_TRANSFORM_COMPONENT,
	RIGID_BODY_COMPONENT,
} from "../src/engine/modules/physics/index.js";
import {
	collectCollisionOverlayItems,
	summarizeCollisionOverlay,
} from "../src/game/diagnostics/index.js";
import { STABLE_ID_COMPONENT } from "../src/game/prefabs/index.js";

const world = new World();
const syncedWalkable = world.createEntity();
const unsyncedTrigger = world.createEntity();
const meshSolid = world.createEntity();

world.addComponent(syncedWalkable, STABLE_ID_COMPONENT, {
	id: "walkable-floor",
});
world.addComponent(syncedWalkable, PHYSICS_TRANSFORM_COMPONENT, {
	position: { x: 1, y: 2, z: 3 },
	rotation: { x: 0, y: 0, z: 0, w: 1 },
	scale: { x: 1, y: 1, z: 1 },
});
world.addComponent(syncedWalkable, RIGID_BODY_COMPONENT, {
	type: "fixed",
	mass: 0,
	bodyHandle: 10,
});
world.addComponent(syncedWalkable, COLLIDER_COMPONENT, {
	shape: {
		type: "box",
		halfExtents: { x: 2, y: 0.25, z: 3 },
	},
	intent: "walkable",
	channel: "world",
	colliderHandle: 20,
});

world.addComponent(unsyncedTrigger, PHYSICS_TRANSFORM_COMPONENT, {
	position: { x: 0, y: 0, z: 0 },
	rotation: { x: 0, y: 0, z: 0, w: 1 },
});
world.addComponent(unsyncedTrigger, RIGID_BODY_COMPONENT, {
	type: "fixed",
	mass: 0,
});
world.addComponent(unsyncedTrigger, COLLIDER_COMPONENT, {
	shape: {
		type: "sphere",
		radius: 1.5,
	},
	intent: "trigger",
	channel: "portal",
	sensor: true,
});

world.addComponent(meshSolid, PHYSICS_TRANSFORM_COMPONENT, {
	position: { x: 5, y: 0, z: -2 },
	rotation: { x: 0, y: 0, z: 0, w: 1 },
});
world.addComponent(meshSolid, RIGID_BODY_COMPONENT, {
	type: "fixed",
	mass: 0,
	bodyHandle: 11,
});
world.addComponent(meshSolid, COLLIDER_COMPONENT, {
	shape: {
		type: "mesh",
		vertices: [
			{ x: -1, y: 0, z: -2 },
			{ x: 3, y: 4, z: 2 },
			{ x: 1, y: 1, z: 0 },
		],
		indices: [0, 1, 2],
	},
	intent: "solid",
	channel: "world",
	colliderHandle: 21,
});

const items = collectCollisionOverlayItems(world);

assert.equal(items.length, 3, "all ECS colliders must enter diagnostics.");
assert.deepEqual(
	items.map((item) => item.entity),
	[syncedWalkable, unsyncedTrigger, meshSolid],
	"diagnostic items must be stable-sorted by entity.",
);

const walkable = items[0];
assert.ok(walkable, "walkable diagnostic item exists.");
assert.equal(walkable.stableId, "walkable-floor");
assert.equal(walkable.intent, "walkable");
assert.equal(walkable.synced, true);
assert.equal(walkable.shape.type, "box");

const trigger = items[1];
assert.ok(trigger, "trigger diagnostic item exists.");
assert.equal(trigger.intent, "trigger");
assert.equal(trigger.sensor, true);
assert.equal(trigger.synced, false);
assert.equal(trigger.shape.type, "sphere");

const mesh = items[2];
assert.ok(mesh, "mesh diagnostic item exists.");
assert.equal(mesh.intent, "solid");
assert.equal(mesh.synced, true);
assert.equal(mesh.shape.type, "mesh-bounds");
assert.deepEqual(mesh.shape.halfExtents, { x: 2, y: 2, z: 2 });
assert.deepEqual(mesh.shape.center, { x: 1, y: 2, z: 0 });

assert.deepEqual(summarizeCollisionOverlay(true, items), {
	enabled: true,
	shapeCount: 3,
	syncedShapeCount: 2,
	unsyncedShapeCount: 1,
});
