import { getDefaultLevelEditorSessionSummary } from "../src/app/editor/levelEditorSession.js";
import {
	type CollisionCookPlan,
	type CollisionCookPlanEntry,
	type RuntimeSceneManifestData,
	buildCollisionCookPlan,
	buildCollisionCookPreviewPatch,
	buildCollisionCookWritePlan,
	loadRuntimeSceneManifest,
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

type RuntimeTerrainPackage = NonNullable<
	RuntimeSceneManifestData["terrainPackages"]
>[number];

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
const editorSummary = getDefaultLevelEditorSessionSummary({
	selectedRuntimeSceneId: runtimeSceneId,
});

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
		assertEqual(entry.readiness.terrainPackageOwned, true);

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
		if (shape.vertices.length < 4) {
			throw new Error(
				`Expected terrain chunk "${entry.stableId}" to include at least one emitted source cell.`,
			);
		}
		if (shape.indices.length < 6) {
			throw new Error(
				`Expected terrain chunk "${entry.stableId}" to include at least one collision triangle pair.`,
			);
		}
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

	assertEqual(uniqueVertices.size, 665);
	assertEqual(totalTriangleCount, 1182);
	assertNotIncludes(
		plan.requiredCollisionPrefabIds,
		"observatory_walkable_mesh",
		"Terrain-package owned chunks must not require their prefab through legacy collision readiness.",
	);
	assertDeepEqual(
		plan.requiredWalkableStableIds,
		[],
		"Terrain-package owned chunks must not be listed in legacy collision cook walkable readiness.",
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
		[],
		"Generated collision runtime readiness must not list terrain-package owned chunks as legacy walkables.",
	);
	assertDeepEqual(
		collisionRuntimeModule.readiness.requiredCollisionStableIds.filter(
			(stableId) => stableId.startsWith(chunkStableIdPrefix),
		),
		[],
		"Generated collision runtime readiness must not list terrain-package owned chunks as legacy collision stable IDs.",
	);
	assertDeepEqual(
		runtimeManifest.readiness.requiredWalkableStableIds ?? [],
		[],
		"Runtime manifest readiness must not list streamed terrain chunks as legacy walkables.",
	);
	const terrainPackage = firstTerrainPackage(runtimeManifest);
	assertIncludes(
		runtimeManifest.readiness.requiredTerrainPackageIds ?? [],
		terrainPackage.id,
		"Runtime manifest readiness must require the Observatory terrain package.",
	);
	assertDeepEqual(
		terrainPackage.chunks.map((chunk) => chunk.stableId).sort(),
		expectedReadinessChunkStableIds,
		"Runtime terrain package must own the cooked Observatory chunk stable IDs.",
	);

	for (const stableId of expectedReadinessChunkStableIds) {
		assertNotIncludes(
			runtimeManifest.readiness.requiredCollisionStableIds ?? [],
			stableId,
			`Runtime manifest readiness.requiredCollisionStableIds must not list terrain package chunk "${stableId}".`,
		);
		assertNotIncludes(
			runtimeManifest.readiness.requiredWalkableStableIds ?? [],
			stableId,
			`Runtime manifest readiness.requiredWalkableStableIds must not list terrain package chunk "${stableId}".`,
		);

		const components = componentsForStableId(runtimeManifest, stableId);
		const terrainCell = components.TerrainChunkCell;

		if (!isRecord(terrainCell) || terrainCell.packageId !== terrainPackage.id) {
			throw new Error(
				`Expected cooked terrain chunk "${stableId}" to resolve to TerrainChunkCell.packageId "${terrainPackage.id}".`,
			);
		}

		if (isRecord(components.Collider)) {
			throw new Error(
				`Runtime terrain package chunk "${stableId}" must not ship an active Collider component.`,
			);
		}

		if (isRecord(components.RigidBody)) {
			throw new Error(
				`Runtime terrain package chunk "${stableId}" must not ship an active RigidBody component.`,
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
			requiredTerrainPackageIds:
				runtimeManifest.readiness.requiredTerrainPackageIds?.filter(
					(packageId) => packageId !== terrainPackage.id,
				) ?? [],
		},
	});
	const invalidErrors = validateRuntimeTerrainPackageReadiness(invalidManifest);

	if (
		!invalidErrors.some((error) =>
			error.includes(
				`terrain package "${terrainPackage.id}" is missing from readiness.requiredTerrainPackageIds`,
			),
		)
	) {
		throw new Error(
			"Expected runtime terrain package validation to fail when the package is missing from terrain readiness.",
		);
	}

	const legacyReadinessManifest: RuntimeSceneManifestData = {
		...runtimeManifest,
		readiness: {
			...runtimeManifest.readiness,
			requiredWalkableStableIds: [
				...(runtimeManifest.readiness.requiredWalkableStableIds ?? []),
				firstChunkId,
			],
		},
	};
	const legacyReadinessErrors = validateRuntimeTerrainPackageReadiness(
		legacyReadinessManifest,
	);

	if (
		!legacyReadinessErrors.some((error) =>
			error.includes(
				`terrain package chunk "${firstChunkId}" must not be listed in readiness.requiredWalkableStableIds; terrain package readiness owns streamed chunks.`,
			),
		)
	) {
		throw new Error(
			"Expected runtime terrain package validation to reject legacy walkable readiness for streamed chunks.",
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

	assertEqual(terrain.selectedRuntimeSceneId, runtimeSceneId);
	assertEqual(terrain.packageCount, 1);
	assertEqual(terrain.requiredPackageCount, 1);
	assertDeepEqual(terrain.packageIds, ["observatory_runtime:terrain-package"]);
	assertDeepEqual(terrain.requiredPackageIds, [
		"observatory_runtime:terrain-package",
	]);
	assertEqual(terrain.startupChunkCount, 1);
	assertEqual(terrain.activeCollisionChunkCount, null);
	assertEqual(terrain.visualBindingCount, 1);
	assertEqual(terrain.lodBindingCounts.near, 0);
	assertEqual(terrain.lodBindingCounts.far, 0);
	assertEqual(terrain.lodBindingCounts.mergedFloor, 1);
	assertEqual(terrain.chunkLodReferenceCounts.near, 16);
	assertEqual(terrain.chunkLodReferenceCounts.far, 0);
	assertEqual(terrain.materialAssetCount, 1);
	assertDeepEqual(terrain.packageErrors, []);
	const terrainPackage = terrain.packages.find(
		(item) => item.id === "observatory_runtime:terrain-package",
	);

	if (!terrainPackage) {
		throw new Error(
			"Expected editor terrain status to include Observatory runtime terrain package.",
		);
	}

	assertEqual(terrainPackage.status, "ready");
	assertEqual(terrainPackage.required, true);
	assertEqual(terrainPackage.chunkCount, 16);
	assertEqual(terrainPackage.startupChunkCount, 1);
	assertEqual(terrainPackage.activeCollisionChunkCount, null);
	assertEqual(terrainPackage.visualBindingCount, 1);
	assertEqual(terrainPackage.lodBindingCounts.mergedFloor, 1);
	assertEqual(terrainPackage.chunkLodReferenceCounts.near, 16);
	assertEqual(terrainPackage.materialAssetCount, 1);
	assertEqual(terrainPackage.driftHash, "fnv1a32:551029f5");
	assertDeepEqual(terrainPackage.errors, []);
	assertEqual(terrain.collisionChunkCount, 20);
	assertEqual(terrain.meshChunkCount, 16);
	assertEqual(terrain.boxChunkCount, 4);
	assertEqual(terrain.walkableChunkCount, 16);
	assertEqual(terrain.collisionTriangleCount, 1182);
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
		const { geometry } = chunk;

		if (geometry === null) {
			throw new Error(
				`Expected editor terrain chunk "${chunk.stableId}" to expose mesh geometry metadata.`,
			);
		}

		if (geometry.vertexCount === null || geometry.vertexCount < 4) {
			throw new Error(
				`Expected editor terrain chunk "${chunk.stableId}" to include emitted GLB-footprint vertices.`,
			);
		}
		if (geometry.triangleCount === null || geometry.triangleCount < 2) {
			throw new Error(
				`Expected editor terrain chunk "${chunk.stableId}" to include emitted GLB-footprint triangles.`,
			);
		}
		if (
			geometry.gridSize !== null &&
			(geometry.gridSize < 2 || geometry.cellSize === null)
		) {
			throw new Error(
				`Expected editor terrain chunk "${chunk.stableId}" grid metadata to be either absent or derived from emitted vertices.`,
			);
		}
	}
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
		[],
		"Collision preview readiness must not list terrain-package owned chunks as legacy walkables.",
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
	const terrainPackage = firstTerrainPackage(runtimeManifest);
	const terrainPackageChunks = new Map(
		terrainPackage.chunks.map((chunk) => [chunk.stableId, chunk] as const),
	);
	const errors = validateRuntimeTerrainPackageReadiness(runtimeManifest);

	if (errors.length > 0) {
		throw new Error(
			`Expected runtime terrain package readiness to validate:\n${errors.join("\n")}`,
		);
	}

	for (const entry of terrainChunkEntries(cookPlan)) {
		const chunk = terrainPackageChunks.get(entry.stableId);

		if (!chunk) {
			throw new Error(
				`Expected terrain package "${terrainPackage.id}" to include cooked chunk "${entry.stableId}".`,
			);
		}

		assertDeepEqual(
			chunk.colliderComponent,
			entry.colliderComponent,
			`Expected terrain package chunk "${entry.stableId}" collider data to match the collision cook plan.`,
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
	const chunkWorldSize = 95;
	const expectedMinX = -190 + xChunk * chunkWorldSize;
	const expectedMaxX = expectedMinX + chunkWorldSize;
	const expectedMinZ = -190 + zChunk * chunkWorldSize;
	const expectedMaxZ = expectedMinZ + chunkWorldSize;
	const bounds = boundsFromVertices(entry.colliderComponent.shape.vertices);

	if (
		bounds.minX < expectedMinX ||
		bounds.maxX > expectedMaxX ||
		bounds.minZ < expectedMinZ ||
		bounds.maxZ > expectedMaxZ
	) {
		throw new Error(
			`Expected terrain chunk "${entry.stableId}" bounds ${JSON.stringify(bounds)} to stay inside ${JSON.stringify({ expectedMinX, expectedMaxX, expectedMinZ, expectedMaxZ })}.`,
		);
	}

	for (const vertex of entry.colliderComponent.shape.vertices) {
		if ((vertex[0] + 190) % 11.875 !== 0 || (vertex[2] + 190) % 11.875 !== 0) {
			throw new Error(
				`Expected terrain chunk "${entry.stableId}" vertices to stay on the authored GLB-sampled collision grid.`,
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

function firstTerrainPackage(
	runtimeManifest: RuntimeSceneManifestData,
): RuntimeTerrainPackage {
	const terrainPackage = runtimeManifest.terrainPackages?.[0];

	if (!terrainPackage) {
		throw new Error(
			`Expected runtime manifest "${runtimeManifest.id}" to include a terrain package.`,
		);
	}

	return terrainPackage;
}

function validateRuntimeTerrainPackageReadiness(
	runtimeManifest: RuntimeSceneManifestData,
): readonly string[] {
	const errors: string[] = [];
	const requiredTerrainPackageIds = new Set(
		runtimeManifest.readiness.requiredTerrainPackageIds ?? [],
	);
	const requiredCollisionStableIds = new Set(
		runtimeManifest.readiness.requiredCollisionStableIds ?? [],
	);
	const requiredWalkableStableIds = new Set(
		runtimeManifest.readiness.requiredWalkableStableIds ?? [],
	);

	for (const terrainPackage of runtimeManifest.terrainPackages ?? []) {
		if (!requiredTerrainPackageIds.has(terrainPackage.id)) {
			errors.push(
				`terrain package "${terrainPackage.id}" is missing from readiness.requiredTerrainPackageIds.`,
			);
		}

		for (const chunk of terrainPackage.chunks) {
			if (requiredCollisionStableIds.has(chunk.stableId)) {
				errors.push(
					`terrain package chunk "${chunk.stableId}" must not be listed in readiness.requiredCollisionStableIds; terrain package readiness owns streamed chunks.`,
				);
			}

			if (requiredWalkableStableIds.has(chunk.stableId)) {
				errors.push(
					`terrain package chunk "${chunk.stableId}" must not be listed in readiness.requiredWalkableStableIds; terrain package readiness owns streamed chunks.`,
				);
			}
		}
	}

	return errors;
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

function assertNotIncludes<TValue>(
	values: readonly TValue[],
	unexpected: TValue,
	message?: string,
): void {
	if (values.includes(unexpected)) {
		throw new Error(
			message ??
				`Expected ${JSON.stringify(values)} not to include ${JSON.stringify(unexpected)}.`,
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
	const actualJson = stableStringify(actual);
	const expectedJson = stableStringify(expected);

	if (actualJson !== expectedJson) {
		throw new Error(
			message ?? `Expected ${expectedJson}, received ${actualJson}.`,
		);
	}
}

function stableStringify(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map((item) => stableStringify(item)).join(",")}]`;
	}

	if (isRecord(value)) {
		return `{${Object.keys(value)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
			.join(",")}}`;
	}

	return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
