import { getDefaultLevelEditorSessionSummary } from "../src/app/editor/levelEditorSession.js";
import {
	type CollisionCookPlan,
	type CollisionCookPlanEntry,
	type RuntimeSceneManifestData,
	buildCollisionCookPlan,
	buildCollisionCookPreviewPatch,
	buildCollisionCookWritePlan,
	loadRuntimeSceneManifest,
	validateCollisionCookPlanAgainstRuntimeScene,
} from "../src/engine/index.js";
import { observatoryCollisionCookDraft } from "../src/game/editor/collisionDrafts/observatoryCollisionDraft.js";
import { collisionRuntimeModule } from "../src/game/generated/observatoryCollisionRuntime.js";
import {
	defaultRuntimeSceneManifests,
	getRuntimeSceneManifest,
} from "../src/game/levels/index.js";

const runtimeSceneId = "observatory_runtime";
const chunkStableIdPrefix = "observatory:walkable-mesh:chunk:";
const expectedChunkStableIds = createExpectedChunkStableIds();
const expectedReadinessChunkStableIds = [...expectedChunkStableIds].sort();

const catalogManifest = getRuntimeSceneManifest(runtimeSceneId);

if (!catalogManifest) {
	throw new Error(
		`Expected runtime scene catalog to include "${runtimeSceneId}".`,
	);
}

assertIncludes(
	defaultRuntimeSceneManifests.map((manifest) => manifest.id),
	runtimeSceneId,
	`Expected default runtime scene manifest list to include "${runtimeSceneId}".`,
);

const manifest = loadRuntimeSceneManifest(catalogManifest);
const plan = buildCollisionCookPlan(observatoryCollisionCookDraft);
const writePlan = buildCollisionCookWritePlan(plan);
const previewPatch = buildCollisionCookPreviewPatch(plan);
const editorSummary = getDefaultLevelEditorSessionSummary();

assertRuntimeValidation(plan, manifest);
assertCookedChunkPlan(plan);
assertRuntimeReadinessLinkage(plan, manifest);
assertEditorTerrainStatus(plan);
assertDeterministicCookProducts(plan);

console.log(
	`Terrain import pipeline contract passed for ${expectedChunkStableIds.length} Observatory cooked terrain chunks.`,
);

function assertCookedChunkPlan(cookPlan: CollisionCookPlan): void {
	const chunks = terrainChunkEntries(cookPlan);
	const chunkStableIds = chunks.map((entry) => entry.stableId);

	assertDeepEqual(
		chunkStableIds,
		expectedChunkStableIds,
		"Expected Observatory terrain chunks to be generated in deterministic x-major rows.",
	);
	assertEqual(chunks.length, 16);
	assertEqual(
		new Set(chunks.map((entry) => entry.id)).size,
		chunks.length,
		"Expected cooked terrain chunk IDs to be unique.",
	);
	assertEqual(
		new Set(chunkStableIds).size,
		chunks.length,
		"Expected cooked terrain chunk stable IDs to be unique.",
	);

	const uniqueVertices = new Map<string, number>();
	let totalTriangleCount = 0;

	for (const entry of chunks) {
		assertEqual(entry.prefabId, "observatory_walkable_mesh");
		assertEqual(entry.colliderComponent.intent, "walkable");
		assertEqual(entry.colliderComponent.channel, "worldStatic");
		assertEqual(entry.readiness.requiredCollision, true);
		assertEqual(entry.readiness.requiredWalkable, true);

		if (entry.transform?.scale !== undefined) {
			assertDeepEqual(
				entry.transform.scale,
				[1, 1, 1],
				"Cooked chunk collision must bake source scale into vertices instead of hiding physics scale in Transform.scale.",
			);
		}

		if (entry.colliderComponent.shape.type !== "mesh") {
			throw new Error(
				`Expected terrain chunk "${entry.stableId}" to use an explicit mesh collider.`,
			);
		}

		const shape = entry.colliderComponent.shape;
		assertEqual(shape.vertices.length, 25);
		assertEqual(shape.indices.length, 96);
		assertEqual(shape.indices.length / 3, 32);
		assertMeshIndices(shape.vertices.length, shape.indices, entry.stableId);
		assertChunkCoordinates(entry);

		totalTriangleCount += shape.indices.length / 3;

		for (const vertex of shape.vertices) {
			const key = `${vertex[0]}:${vertex[2]}`;
			const currentHeight = uniqueVertices.get(key);

			if (currentHeight !== undefined && currentHeight !== vertex[1]) {
				throw new Error(
					`Expected seam vertex ${key} to have matching heights across terrain chunks.`,
				);
			}

			uniqueVertices.set(key, vertex[1]);
		}
	}

	assertEqual(uniqueVertices.size, 289);
	assertEqual(totalTriangleCount, 512);
	assertIncludes(plan.requiredCollisionPrefabIds, "observatory_walkable_mesh");
	assertDeepEqual(
		plan.requiredWalkableStableIds,
		expectedReadinessChunkStableIds,
	);
}

function assertRuntimeReadinessLinkage(
	cookPlan: CollisionCookPlan,
	runtimeManifest: RuntimeSceneManifestData,
): void {
	const runtimeChunkIds = terrainChunkEntries(cookPlan).map(
		(entry) => entry.stableId,
	);

	assertDeepEqual(
		runtimeChunkIds,
		expectedChunkStableIds,
		"Expected terrain cook plan entries to keep z-row authoring order.",
	);
	assertDeepEqual(
		collisionRuntimeModule.readiness.requiredWalkableStableIds,
		expectedReadinessChunkStableIds,
	);
	assertDeepEqual(
		runtimeManifest.readiness.requiredWalkableStableIds ?? [],
		expectedReadinessChunkStableIds,
	);

	for (const stableId of expectedReadinessChunkStableIds) {
		assertIncludes(
			runtimeManifest.readiness.requiredCollisionStableIds ?? [],
			stableId,
		);
		assertIncludes(
			runtimeManifest.readiness.requiredWalkableStableIds ?? [],
			stableId,
		);

		const collider = componentsForStableId(runtimeManifest, stableId).Collider;

		if (!isRecord(collider)) {
			throw new Error(
				`Expected cooked terrain chunk "${stableId}" to resolve to an explicit runtime Collider component.`,
			);
		}
	}

	const firstChunkId = expectedReadinessChunkStableIds[0];

	if (!firstChunkId) {
		throw new Error("Expected at least one Observatory terrain chunk.");
	}

	const invalidManifest = loadRuntimeSceneManifest({
		...runtimeManifest,
		readiness: {
			...runtimeManifest.readiness,
			requiredWalkableStableIds:
				runtimeManifest.readiness.requiredWalkableStableIds?.filter(
					(stableId) => stableId !== firstChunkId,
				) ?? [],
		},
	});
	const invalidResult = validateCollisionCookPlanAgainstRuntimeScene({
		plan: cookPlan,
		manifest: invalidManifest,
	});

	if (
		invalidResult.ok ||
		!invalidResult.errors.some((error) =>
			error.includes(
				`stableId "${firstChunkId}" is missing from readiness.requiredWalkableStableIds`,
			),
		)
	) {
		throw new Error(
			"Expected collision cook runtime validation to fail when a cooked terrain chunk is missing from walkable readiness.",
		);
	}
}

function assertEditorTerrainStatus(cookPlan: CollisionCookPlan): void {
	const terrain = editorSummary.terrain;
	const chunkStableIds = terrainChunkEntries(cookPlan).map(
		(entry) => entry.stableId,
	);
	const editorMeshChunks = terrain.chunks.filter(
		(chunk) => chunk.shapeType === "mesh",
	);

	assertEqual(terrain.importCount, 0);
	assertEqual(terrain.importedCount, 0);
	assertEqual(terrain.collisionChunkCount, 20);
	assertEqual(terrain.meshChunkCount, 16);
	assertEqual(terrain.boxChunkCount, 4);
	assertEqual(terrain.walkableChunkCount, 16);
	assertEqual(terrain.collisionTriangleCount, 512);
	assertEqual(terrain.visualTriangleCount, 0);
	assertEqual(terrain.sourcePlanHash, writePlan.provenance.sourcePlanHash);
	assertDeepEqual(
		editorMeshChunks.map((chunk) => chunk.stableId),
		chunkStableIds,
	);

	for (const chunk of editorMeshChunks) {
		assertEqual(chunk.prefabId, "observatory_walkable_mesh");
		assertEqual(chunk.intent, "walkable");
		assertEqual(chunk.channel, "worldStatic");
		assertEqual(chunk.requiredCollision, true);
		assertEqual(chunk.requiredWalkable, true);
		assertEqual(chunk.geometry.vertexCount, 25);
		assertEqual(chunk.geometry.indexCount, 96);
		assertEqual(chunk.geometry.triangleCount, 32);
		assertEqual(chunk.geometry.gridSize, 5);
		assertEqual(chunk.geometry.cellSize, 40);
		assertEqual(chunk.geometry.halfExtent, 80);
	}

	assertDeepEqual(terrain.imports, []);
}

function assertDeterministicCookProducts(cookPlan: CollisionCookPlan): void {
	const repeatedPlan = buildCollisionCookPlan(observatoryCollisionCookDraft);
	const repeatedWritePlan = buildCollisionCookWritePlan(repeatedPlan);
	const repeatedPreviewPatch = buildCollisionCookPreviewPatch(repeatedPlan);

	assertDeepEqual(
		cookPlan.entries.map((entry) => entry.stableId),
		repeatedPlan.entries.map((entry) => entry.stableId),
	);
	assertEqual(
		writePlan.provenance.sourcePlanHash,
		repeatedWritePlan.provenance.sourcePlanHash,
	);
	assertDeepEqual(
		previewPatch.requiredWalkableStableIds,
		cookPlan.requiredWalkableStableIds,
	);
	assertDeepEqual(
		previewPatch.requiredWalkableStableIds,
		repeatedPreviewPatch.requiredWalkableStableIds,
	);
	assertDeepEqual(
		previewPatch.requiredWalkableStableIds,
		expectedReadinessChunkStableIds,
	);
	assertEqual(
		collisionRuntimeModule.sourcePlanHash,
		writePlan.provenance.sourcePlanHash,
	);
}

function assertRuntimeValidation(
	cookPlan: CollisionCookPlan,
	runtimeManifest: RuntimeSceneManifestData,
): void {
	const result = validateCollisionCookPlanAgainstRuntimeScene({
		plan: cookPlan,
		manifest: runtimeManifest,
	});

	if (!result.ok) {
		throw new Error(
			`Expected terrain collision cook plan to match runtime readiness:\n${result.errors.join("\n")}`,
		);
	}
}

function terrainChunkEntries(
	cookPlan: CollisionCookPlan,
): readonly CollisionCookPlanEntry[] {
	return cookPlan.entries.filter((entry) =>
		entry.stableId.startsWith(chunkStableIdPrefix),
	);
}

function assertChunkCoordinates(entry: CollisionCookPlanEntry): void {
	const match = /^observatory:walkable-mesh:chunk:x(\d)-z(\d)$/.exec(
		entry.stableId,
	);

	if (!match) {
		throw new Error(
			`Expected terrain chunk stable ID to include x/z coordinates: ${entry.stableId}.`,
		);
	}

	if (entry.colliderComponent.shape.type !== "mesh") {
		throw new Error(`Expected terrain chunk "${entry.stableId}" to be a mesh.`);
	}

	const xChunk = Number(match[1]);
	const zChunk = Number(match[2]);
	const expectedMinX = -320 + xChunk * 160;
	const expectedMaxX = expectedMinX + 160;
	const expectedMinZ = -320 + zChunk * 160;
	const expectedMaxZ = expectedMinZ + 160;
	const bounds = boundsFromVertices(entry.colliderComponent.shape.vertices);

	assertEqual(bounds.minX, expectedMinX);
	assertEqual(bounds.maxX, expectedMaxX);
	assertEqual(bounds.minZ, expectedMinZ);
	assertEqual(bounds.maxZ, expectedMaxZ);

	for (const vertex of entry.colliderComponent.shape.vertices) {
		if ((vertex[0] + 320) % 40 !== 0 || (vertex[2] + 320) % 40 !== 0) {
			throw new Error(
				`Expected terrain chunk "${entry.stableId}" vertices to stay on the authored 40-unit collision grid.`,
			);
		}
	}
}

function assertMeshIndices(
	vertexCount: number,
	indices: readonly number[],
	stableId: string,
): void {
	if (indices.length % 3 !== 0) {
		throw new Error(
			`Expected terrain chunk "${stableId}" mesh indices to be triangle-aligned.`,
		);
	}

	for (const index of indices) {
		if (!Number.isInteger(index) || index < 0 || index >= vertexCount) {
			throw new Error(
				`Expected terrain chunk "${stableId}" mesh index ${index} to reference a valid vertex.`,
			);
		}
	}
}

function componentsForStableId(
	runtimeManifest: RuntimeSceneManifestData,
	stableId: string,
): Record<string, unknown> {
	const instance = runtimeManifest.level.instances.find(
		(candidate) => candidate.stableId === stableId,
	);

	if (!instance) {
		throw new Error(`Expected runtime level instance "${stableId}" to exist.`);
	}

	const prefab = runtimeManifest.prefabs.find(
		(candidate) => candidate.id === instance.prefabId,
	);

	if (!prefab) {
		throw new Error(
			`Expected runtime level instance "${stableId}" to reference an existing prefab "${instance.prefabId}".`,
		);
	}

	return {
		...prefab.components,
		...(instance.components ?? {}),
	};
}

function createExpectedChunkStableIds(): readonly string[] {
	const stableIds: string[] = [];

	for (let z = 0; z < 4; z += 1) {
		for (let x = 0; x < 4; x += 1) {
			stableIds.push(`${chunkStableIdPrefix}x${x}-z${z}`);
		}
	}

	return stableIds;
}

function boundsFromVertices(
	vertices: readonly (readonly [number, number, number])[],
): {
	readonly minX: number;
	readonly maxX: number;
	readonly minZ: number;
	readonly maxZ: number;
} {
	return vertices.reduce(
		(bounds, vertex) => ({
			minX: Math.min(bounds.minX, vertex[0]),
			maxX: Math.max(bounds.maxX, vertex[0]),
			minZ: Math.min(bounds.minZ, vertex[2]),
			maxZ: Math.max(bounds.maxZ, vertex[2]),
		}),
		{
			minX: Number.POSITIVE_INFINITY,
			maxX: Number.NEGATIVE_INFINITY,
			minZ: Number.POSITIVE_INFINITY,
			maxZ: Number.NEGATIVE_INFINITY,
		},
	);
}

function assertIncludes<TValue>(
	values: readonly TValue[],
	expected: TValue,
	message?: string,
): void {
	if (!values.includes(expected)) {
		throw new Error(
			message ??
				`Expected ${JSON.stringify(values)} to include ${JSON.stringify(expected)}.`,
		);
	}
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

function assertDeepEqual<TValue>(
	actual: TValue,
	expected: TValue,
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
