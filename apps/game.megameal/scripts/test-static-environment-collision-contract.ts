import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import packageJson from "../package.json";
import { World, loadRuntimeSceneManifest } from "../src/engine/index.js";
import { quat, vec3 } from "../src/engine/math/index.js";
import {
	CHARACTER_CONTROLLER_COMPONENT,
	COLLIDER_COMPONENT,
	type CharacterControllerComponent,
} from "../src/engine/modules/physics/index.js";
import { TRANSFORM_COMPONENT } from "../src/engine/modules/rendering/index.js";
import { createWalkableGroundingSystem } from "../src/game/systems/index.js";
import { staticEnvironmentCollisionProfiles } from "../src/levels/global/collisionSettings.js";
import {
	getRuntimeSceneManifest,
	observatoryRuntimeSceneManifest,
} from "../src/levels/index.js";
import observatoryStaticEnvironmentCollision from "../src/levels/observatory/collision/generated.json";
import observatoryCollisionSource from "../src/levels/observatory/collision/source.json";
import observatoryLevelData from "../src/levels/observatory/data.json";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const generatedProductPath = resolve(
	appRoot,
	"src/levels/observatory/collision/generated.json",
);
const sourceConfigPath = resolve(
	appRoot,
	"src/levels/observatory/collision/source.json",
);
const sourceAssetPath = resolve(
	appRoot,
	"public",
	observatoryCollisionSource.visualAssetUrl.slice(1),
);
const gameRuntimeSource = readFileSync(
	resolve(appRoot, "src/game/runtime/index.ts"),
	"utf8",
);
const cookSource = readFileSync(
	resolve(appRoot, "scripts/cook-static-environment-collision.ts"),
	"utf8",
);
const manifest = loadRuntimeSceneManifest(observatoryRuntimeSceneManifest);
const generated = observatoryStaticEnvironmentCollision;
const source = observatoryCollisionSource;
const currentSourceHash = `sha256:${sha256(readFileSync(sourceAssetPath))}`;

assert(
	existsSync(sourceConfigPath),
	"Observatory collision source config exists.",
);
assert(
	existsSync(generatedProductPath),
	"Observatory generated static environment collision product exists.",
);
assertEqual(generated.schemaVersion, 1, "generated product schema version");
assertEqual(
	generated.generator,
	"staticEnvironmentCollisionCook.v1",
	"generated product owner",
);
assertEqual(generated.levelId, "observatory", "generated product level owner");
assertEqual(
	generated.runtimeSceneId,
	"observatory_runtime",
	"generated product runtime scene owner",
);
assertEqual(
	generated.source.visualAssetId,
	"mesh_observatory_environment",
	"generated product visual source asset",
);
assertEqual(
	generated.source.visualAssetUrl,
	source.visualAssetUrl,
	"generated product visual source URL",
);
assert(
	generated.source.sourceHash.startsWith("sha256:"),
	"generated product records source hash.",
);
assertEqual(
	generated.source.sourceHash,
	currentSourceHash,
	"generated product source hash must match the current GLB asset.",
);
assertEqual(
	generated.settings.profile,
	"mobile-dense",
	"Observatory generated collision must use the tuned dense mobile profile.",
);
const generatedProfile = staticEnvironmentCollisionProfiles["mobile-dense"];
assertEqual(
	generated.settings.sampleSpacingMeters,
	generatedProfile.sampleSpacingMeters,
	"Observatory generated collision must use its selected cook profile sample spacing.",
);
assert(
	packageJson.scripts.build.includes("check:static-environment-collision"),
	"build must run the static environment collision drift gate before compiling.",
);
assert(
	packageJson.scripts["check:static-environment-collision"].includes("--check"),
	"static environment collision check script must run the cook in check mode.",
);
assert(
	gameRuntimeSource.includes("createWalkableGroundingSystem"),
	"game runtime must register walkable grounding before character movement.",
);
assert(
	cookSource.includes("manual-collision-glb mode requires collisionAssetUrl"),
	"manual collision GLB mode must require an explicit collisionAssetUrl.",
);
assert(
	cookSource.includes(
		"Static environment collision source uses an unknown profile",
	),
	"static environment collision cook must reject unknown source profiles.",
);
assert(
	cookSource.includes("sampleSpacingMeters"),
	"static environment collision cook must validate sample spacing settings.",
);
assert(
	!cookSource.includes("activeCollisionRadiusMeters") &&
		!cookSource.includes("startupRadiusMeters") &&
		!cookSource.includes("unloadRadiusMeters"),
	"static environment collision cook must not carry unused streaming radius settings.",
);
assert(
	generated.summary.sourceTriangleCount > 0,
	"generated collision records source render triangle count.",
);
assert(
	generated.summary.walkableTriangleCount > 0,
	"generated collision records walkable source triangle count.",
);
assert(
	generated.summary.triangleCount > 0,
	"generated collision records emitted triangle count.",
);
assertEqual(
	generated.summary.metersPerSample,
	source.settings.sampleSpacingMeters,
	"generated collision records the sample spacing used for the cook.",
);
assertBounds(generated.summary.sourceBounds, "source bounds");
assertBounds(generated.summary.walkableBounds, "walkable bounds");
assertBounds(generated.summary.bounds, "generated collision bounds");
assert(
	boundsHorizontalGap(
		generated.summary.walkableBounds,
		generated.summary.bounds,
	) <=
		generated.settings.sampleSpacingMeters * 1.25,
	"generated collision X/Z bounds must cover walkable source bounds within the configured sample spacing tolerance.",
);
assertEqual(
	generated.summary.chunkCount,
	generated.chunks.length,
	"summary chunk count matches generated chunks.",
);

const stableIds = new Set<string>();
for (const chunk of generated.chunks) {
	assert(
		chunk.stableId.startsWith(
			"static-environment:observatory_environment_collision:chunk:",
		),
		`generated chunk stable ID ${chunk.stableId} uses static environment namespace.`,
	);
	assert(
		!stableIds.has(chunk.stableId),
		`duplicate chunk stable ID ${chunk.stableId}.`,
	);
	stableIds.add(chunk.stableId);
	assertEqual(chunk.collider.intent, "walkable", `${chunk.stableId} intent`);
	assertEqual(
		chunk.collider.channel,
		"worldStatic",
		`${chunk.stableId} channel`,
	);
	assertEqual(
		chunk.collider.shape.type,
		"mesh",
		`${chunk.stableId} mesh shape`,
	);
	assert(
		chunk.collider.shape.vertices.length >= 3,
		`${chunk.stableId} has mesh vertices.`,
	);
}

assertEqual(
	manifest.level.instances.some(
		(instance) => instance.stableId === "observatory:walkable-proxy",
	),
	false,
	"flat Observatory walkable proxy must not remain in resolved manifest.",
);
assertEqual(
	Boolean(
		manifest.level.instances.find(
			(instance) => instance.stableId === "observatory:terrain",
		)?.components?.Collider,
	),
	false,
	"render GLB instance must not own implicit collision.",
);

for (const stableId of stableIds) {
	assert(
		manifest.readiness.requiredCollisionStableIds?.includes(stableId),
		`manifest requires generated collision chunk ${stableId}.`,
	);
	assert(
		manifest.readiness.requiredWalkableStableIds?.includes(stableId),
		`manifest requires generated walkable chunk ${stableId}.`,
	);
}

const playerPosition = observatoryLevelData.player?.transform?.position;
assert(
	Array.isArray(playerPosition),
	"Observatory player transform position must be configured.",
);
const playerGroundY = groundedHeightFromGeneratedCollision(playerPosition);
assert(
	playerGroundY !== undefined,
	"generated walkable collision must cover the Observatory player spawn X/Z.",
);
assert(
	playerGroundY > 0,
	"generated player-spawn walkable height must be a usable world-space height.",
);
assertWalkableGroundingSystemUpdatesCharacterController(
	playerPosition,
	playerGroundY,
);

assertEqual(
	getRuntimeSceneManifest("observatory_runtime")?.id,
	"observatory_runtime",
	"Observatory runtime scene remains routed through the level package.",
);

console.log(
	`Static environment collision contract passed for ${generated.chunks.length} chunks and ${generated.summary.triangleCount} triangles.`,
);

function assertWalkableGroundingSystemUpdatesCharacterController(
	playerPosition: readonly number[],
	expectedGroundY: number,
): void {
	const world = new World();
	for (const chunk of generated.chunks) {
		const entity = world.createEntity();
		world.addComponent(entity, TRANSFORM_COMPONENT, {
			position: vec3(),
			rotation: quat(),
			scale: vec3(1, 1, 1),
		});
		world.addComponent(entity, COLLIDER_COMPONENT, chunk.collider);
	}

	const player = world.createEntity();
	world.addComponent(player, TRANSFORM_COMPONENT, {
		position: vec3(
			playerPosition[0] ?? 0,
			playerPosition[1] ?? 0,
			playerPosition[2] ?? 0,
		),
		rotation: quat(),
		scale: vec3(1, 1, 1),
	});
	world.addComponent<CharacterControllerComponent>(
		player,
		CHARACTER_CONTROLLER_COMPONENT,
		{
			speed: 4.5,
			sprintMultiplier: 1.65,
			jumpForce: 6,
			gravity: -9.6,
			groundY: observatoryLevelData.player?.groundY ?? 0,
			grounded: false,
		},
	);

	createWalkableGroundingSystem().update({ world });
	const controller = world.requireComponent<CharacterControllerComponent>(
		player,
		CHARACTER_CONTROLLER_COMPONENT,
	);

	assert(
		Math.abs((controller.groundY ?? 0) - expectedGroundY) < 0.0001,
		"walkable grounding system must update player groundY from generated mesh collision.",
	);
}

function groundedHeightFromGeneratedCollision(
	position: readonly number[],
): number | undefined {
	let groundY: number | undefined;
	const [x, , z] = position;

	if (x === undefined || z === undefined) {
		throw new Error("Player position must include x and z coordinates.");
	}

	for (const chunk of generated.chunks) {
		const vertices = chunk.collider.shape.vertices;
		const indices = chunk.collider.shape.indices;

		for (let index = 0; index + 2 < indices.length; index += 3) {
			const aIndex = indices[index];
			const bIndex = indices[index + 1];
			const cIndex = indices[index + 2];

			if (
				aIndex === undefined ||
				bIndex === undefined ||
				cIndex === undefined
			) {
				continue;
			}

			const a = vertices[aIndex];
			const b = vertices[bIndex];
			const c = vertices[cIndex];

			if (!a || !b || !c) {
				continue;
			}

			const candidate = triangleHeightAt(a, b, c, x, z);
			if (
				candidate !== undefined &&
				(groundY === undefined || candidate > groundY)
			) {
				groundY = candidate;
			}
		}
	}

	return groundY;
}

function triangleHeightAt(
	a: readonly number[],
	b: readonly number[],
	c: readonly number[],
	x: number,
	z: number,
): number | undefined {
	const ax = requiredNumber(a[0], "a.x");
	const ay = requiredNumber(a[1], "a.y");
	const az = requiredNumber(a[2], "a.z");
	const bx = requiredNumber(b[0], "b.x");
	const by = requiredNumber(b[1], "b.y");
	const bz = requiredNumber(b[2], "b.z");
	const cx = requiredNumber(c[0], "c.x");
	const cy = requiredNumber(c[1], "c.y");
	const cz = requiredNumber(c[2], "c.z");
	const denominator = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);

	if (Math.abs(denominator) < 1e-8) {
		return undefined;
	}

	const w1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / denominator;
	const w2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / denominator;
	const w3 = 1 - w1 - w2;
	const epsilon = 1e-5;

	if (w1 < -epsilon || w2 < -epsilon || w3 < -epsilon) {
		return undefined;
	}

	return w1 * ay + w2 * by + w3 * cy;
}

function requiredNumber(value: unknown, label: string): number {
	if (typeof value !== "number") {
		throw new Error(`Expected ${label} to be a number.`);
	}

	return value;
}

function sha256(buffer: Buffer): string {
	return createHash("sha256").update(buffer).digest("hex");
}

function assert(value: unknown, message: string): asserts value {
	if (!value) {
		throw new Error(message);
	}
}

function assertBounds(
	value: {
		readonly min?: readonly number[];
		readonly max?: readonly number[];
	},
	label: string,
): void {
	assert(Array.isArray(value.min), `${label} must include min vector.`);
	assert(Array.isArray(value.max), `${label} must include max vector.`);
	assertEqual(value.min.length, 3, `${label} min length`);
	assertEqual(value.max.length, 3, `${label} max length`);
}

function boundsHorizontalGap(
	sourceBounds: {
		readonly min?: readonly number[];
		readonly max?: readonly number[];
	},
	collisionBounds: {
		readonly min?: readonly number[];
		readonly max?: readonly number[];
	},
): number {
	const sourceMin = requiredVector(sourceBounds.min, "source bounds min");
	const sourceMax = requiredVector(sourceBounds.max, "source bounds max");
	const collisionMin = requiredVector(
		collisionBounds.min,
		"collision bounds min",
	);
	const collisionMax = requiredVector(
		collisionBounds.max,
		"collision bounds max",
	);

	return Math.max(
		Math.max(0, collisionMin[0] - sourceMin[0]),
		Math.max(0, sourceMax[0] - collisionMax[0]),
		Math.max(0, collisionMin[2] - sourceMin[2]),
		Math.max(0, sourceMax[2] - collisionMax[2]),
	);
}

function requiredVector(
	value: readonly number[] | undefined,
	label: string,
): readonly [number, number, number] {
	assert(Array.isArray(value), `${label} must be a vector.`);
	return [
		requiredNumber(value[0], `${label}.x`),
		requiredNumber(value[1], `${label}.y`),
		requiredNumber(value[2], `${label}.z`),
	];
}

function assertEqual<TValue>(
	actual: TValue,
	expected: TValue,
	label: string,
): void {
	if (actual !== expected) {
		throw new Error(
			`${label}: expected ${String(expected)}, received ${String(actual)}.`,
		);
	}
}
