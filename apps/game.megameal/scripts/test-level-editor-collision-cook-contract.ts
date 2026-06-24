import { getDefaultLevelEditorSessionSummary } from "../src/app/editor/levelEditorSession.js";
import {
	type CollisionCookDraftData,
	type CollisionCookPlan,
	type CollisionCookVector3Data,
	type CollisionCookWriteArtifact,
	type CollisionCookWriteArtifactPurpose,
	buildCollisionCookBakeFile,
	buildCollisionCookPlan,
	buildCollisionCookPreviewPatch,
	buildCollisionCookWritePlan,
	getCollisionCookRuntimeModuleArtifact,
	parseCollisionCookDraft,
	parseCollisionCookPreviewPatch,
	serializeCollisionCookBakeFile,
	serializeCollisionCookPreviewPatch,
	serializeCollisionCookRuntimeModule,
	serializeCollisionCookWritePlan,
	validateCollisionCookPlanAgainstRuntimeScene,
	validateCollisionCookRuntimeWriteSafety,
} from "../src/engine/data/collisionCook/index.js";
import type { RuntimeSceneManifestData } from "../src/engine/data/schemas/index.js";
import { buildCollisionOverlayViewModel } from "../src/game/editor/collisionDrafts/collisionOverlayViewModel.js";
import { observatoryCollisionCookDraft } from "../src/game/editor/collisionDrafts/observatoryCollisionDraft.js";
import {
	defaultRuntimeSceneManifest,
	observatoryRuntimeSceneManifest,
} from "../src/game/levels/index.js";

const generatedRuntimeModuleFileUrl = new URL(
	"../src/game/generated/observatoryCollisionRuntime.ts",
	import.meta.url,
);
const firstObservatoryWalkableChunkStableId =
	"observatory:walkable-mesh:chunk:x0-z0";
const plan = buildCollisionCookPlan(observatoryCollisionCookDraft);
const runtimeCollisionPlan = collisionPlanWithoutTerrainChunks(plan);
const result = validateCollisionCookPlanAgainstRuntimeScene({
	plan: runtimeCollisionPlan,
	manifest: observatoryRuntimeSceneManifest,
});

if (!result.ok) {
	throw new Error(
		`Expected Observatory collision cook draft to match runtime data:\n${result.errors.join("\n")}`,
	);
}

assertRuntimeTerrainPackage(plan, observatoryRuntimeSceneManifest);
assertObservatoryWalkableMesh(plan);
assertWritePlan(plan);
await assertPreviewAndBake(plan);
assertOverlay();
assertEditorSessionDefaults();
assertInvalidDraftCases();
assertRuntimeMismatchCases();
assertWritePlanHashChanges();
await assertNormalRuntimeDoesNotImportEditorModules();

console.log(
	`Level editor collision cook contract passed for ${plan.entries.length} Observatory collision draft entries.`,
);

function assertWritePlan(cookPlan: CollisionCookPlan): void {
	const writePlan = buildCollisionCookWritePlan(cookPlan);
	const repeatedWritePlan = buildCollisionCookWritePlan(
		buildCollisionCookPlan(observatoryCollisionCookDraft),
	);
	const allowedTargetFiles = getAllowedRuntimeCollisionTargetFiles();

	if (writePlan.writesFiles !== false || writePlan.writeMode !== "dry-run") {
		throw new Error("Expected collision cook write plan to be dry-run only.");
	}

	if (
		serializeCollisionCookWritePlan(writePlan) !==
		serializeCollisionCookWritePlan(repeatedWritePlan)
	) {
		throw new Error(
			"Expected collision cook write plan serialization to be deterministic.",
		);
	}

	for (const artifact of writePlan.artifacts) {
		if (!allowedTargetFiles.includes(artifact.targetFile)) {
			throw new Error(
				`Collision cook write plan targets unexpected file ${JSON.stringify(artifact.targetFile)}.`,
			);
		}
	}

	expectWriteArtifact(
		writePlan.artifacts,
		"prefab-colliders",
		observatoryCollisionCookDraft.targetFiles.prefabModule,
	);
	expectWriteArtifact(
		writePlan.artifacts,
		"level-instances",
		observatoryCollisionCookDraft.targetFiles.levelModule,
	);
	const readinessArtifact = expectWriteArtifact(
		writePlan.artifacts,
		"runtime-readiness",
		observatoryCollisionCookDraft.targetFiles.runtimeSceneManifestModule,
	);
	const runtimeModuleArtifact = expectWriteArtifact(
		writePlan.artifacts,
		"runtime-collision-module",
		expectGeneratedRuntimeCollisionModuleTarget(),
	);

	if (!readinessArtifact.serializedPayload.endsWith("\n")) {
		throw new Error(
			"Expected serialized cook artifact payloads to end with a newline.",
		);
	}

	if (
		readinessArtifact.serializedPayload.includes(
			`"${firstObservatoryWalkableChunkStableId}"`,
		)
	) {
		throw new Error(
			"Runtime-readiness write artifacts must not write Observatory terrain chunks into legacy stable-id readiness arrays.",
		);
	}

	const requiredWalkableStableIds = (
		readinessArtifact.payload as {
			readonly requiredWalkableStableIds?: unknown;
		}
	).requiredWalkableStableIds;

	if (
		Array.isArray(requiredWalkableStableIds) &&
		requiredWalkableStableIds.length > 0
	) {
		throw new Error(
			"Runtime-readiness write artifacts must keep requiredWalkableStableIds empty because terrain package readiness owns streamed chunks.",
		);
	}

	if (runtimeModuleArtifact.format !== "typescript") {
		throw new Error(
			"Expected runtime collision module artifact to be TypeScript.",
		);
	}

	if (
		runtimeModuleArtifact.serializedPayload !==
		serializeCollisionCookRuntimeModule(writePlan)
	) {
		throw new Error(
			"Expected runtime collision module serialization helper to match the write artifact.",
		);
	}

	if (
		!runtimeModuleArtifact.serializedPayload.startsWith(
			"// @generated by collisionCook.runtimeModule.v1",
		)
	) {
		throw new Error(
			"Expected runtime collision module artifact to include the generated marker.",
		);
	}

	assertRuntimeWriteSafety(writePlan);
}

function assertRuntimeWriteSafety(
	writePlan: ReturnType<typeof buildCollisionCookWritePlan>,
): void {
	const allowedTargetFiles = getAllowedRuntimeCollisionTargetFiles();
	const cleanSafety = validateCollisionCookRuntimeWriteSafety({
		writePlan,
		allowedTargetFiles,
		existingRuntimeModuleSource:
			"// @generated by collisionCook.runtimeModule.v1\n",
	});

	if (!cleanSafety.ok) {
		throw new Error(
			`Expected generated runtime collision write safety to accept allowed targets:\n${cleanSafety.errors.join("\n")}`,
		);
	}

	const dirtyUnexpectedSafety = validateCollisionCookRuntimeWriteSafety({
		writePlan,
		allowedTargetFiles,
		dirtyFiles: ["src/game/levels/not-observatory-collision.ts"],
	});

	if (
		dirtyUnexpectedSafety.ok ||
		!dirtyUnexpectedSafety.errors.some((error) =>
			error.includes("dirty unexpected target"),
		)
	) {
		throw new Error(
			"Expected runtime collision write safety to reject dirty unexpected targets.",
		);
	}

	const invalidDriftSafety = validateCollisionCookRuntimeWriteSafety({
		writePlan,
		allowedTargetFiles,
		runtimeValidation: {
			ok: false,
			plan,
			errors: ["synthetic invalid drift"],
		},
	});

	if (
		invalidDriftSafety.ok ||
		!invalidDriftSafety.errors.some((error) =>
			error.includes("invalid runtime drift"),
		)
	) {
		throw new Error(
			"Expected runtime collision write safety to reject invalid runtime drift when supplied.",
		);
	}

	const unmarkedExistingFileSafety = validateCollisionCookRuntimeWriteSafety({
		writePlan,
		allowedTargetFiles,
		existingRuntimeModuleSource: "export const handAuthored = true;\n",
	});

	if (
		unmarkedExistingFileSafety.ok ||
		!unmarkedExistingFileSafety.errors.some((error) =>
			error.includes(
				"without the collisionCook.runtimeModule.v1 generated marker",
			),
		)
	) {
		throw new Error(
			"Expected runtime collision write safety to reject unmarked existing runtime module files.",
		);
	}
}

async function assertPreviewAndBake(
	cookPlan: CollisionCookPlan,
): Promise<void> {
	const writePlan = buildCollisionCookWritePlan(cookPlan);
	const previewPatch = buildCollisionCookPreviewPatch(cookPlan);
	const repeatedPreviewPatch = buildCollisionCookPreviewPatch(cookPlan);
	const bakeFile = buildCollisionCookBakeFile(cookPlan);
	const serializedBakeFile = serializeCollisionCookBakeFile(bakeFile);

	parseCollisionCookPreviewPatch(previewPatch);

	if (previewPatch.channel !== "level-editor-collision-preview") {
		throw new Error("Expected collision preview patch channel to be explicit.");
	}

	if (previewPatch.mode !== "temporary-preview") {
		throw new Error("Expected collision preview patch to be temporary only.");
	}

	if (
		serializeCollisionCookPreviewPatch(previewPatch) !==
		serializeCollisionCookPreviewPatch(repeatedPreviewPatch)
	) {
		throw new Error(
			"Expected collision preview patch serialization to be deterministic.",
		);
	}

	const firstPreviewEntry = previewPatch.entries[0];

	if (!firstPreviewEntry) {
		throw new Error(
			"Expected Observatory collision preview patch to contain entries.",
		);
	}

	expectInvalidPreviewPatch(
		{
			...previewPatch,
			entries: [
				...previewPatch.entries,
				{
					...firstPreviewEntry,
					id: "duplicate-preview-stable-id",
				},
			],
		},
		`stableId contains duplicate value "${firstPreviewEntry.stableId}"`,
	);

	if (bakeFile.writesRuntimeData !== false) {
		throw new Error("Expected collision bake file to avoid runtime writes.");
	}

	if (bakeFile.writePlan.contentHash !== writePlan.contentHash) {
		throw new Error(
			"Expected collision bake file to embed the dry-run write plan.",
		);
	}

	if (!bakeFile.contentHash.startsWith("fnv1a32:")) {
		throw new Error("Expected collision bake file to include a content hash.");
	}

	if (!serializedBakeFile.endsWith("\n")) {
		throw new Error(
			"Expected collision bake file serialization to end with newline.",
		);
	}

	const runtimeModuleArtifact =
		getCollisionCookRuntimeModuleArtifact(writePlan);

	if (!runtimeModuleArtifact) {
		throw new Error(
			"Expected collision bake write plan to include the runtime module artifact.",
		);
	}

	const fs = await importNodeFsPromises();
	const generatedRuntimeModule = await fs.readFile(
		generatedRuntimeModuleFileUrl,
		"utf8",
	);

	if (generatedRuntimeModule !== runtimeModuleArtifact.serializedPayload) {
		throw new Error(
			"Expected generated Observatory runtime collision module to match current cook output.",
		);
	}
}

function assertOverlay(): void {
	const overlay = buildCollisionOverlayViewModel(observatoryCollisionCookDraft);

	assertEqual(
		overlay.entries.length,
		20,
		"Expected Observatory collision overlay to expose 20 draft entries.",
	);

	assertEqual(
		overlay.entries.filter((entry) =>
			entry.stableId.startsWith("observatory:walkable-mesh:chunk:"),
		).length,
		16,
		"Expected Observatory collision overlay to expose 16 walkable mesh chunks.",
	);

	assertOverlayEntry(overlay, firstObservatoryWalkableChunkStableId, {
		shapeType: "mesh",
		intent: "walkable",
		channel: "worldStatic",
		requiredCollision: true,
		requiredWalkable: true,
		min: [-130.625, 0.48, -118.75],
		max: [-95, 1.2, -95],
		center: [-112.8125, 0.84, -106.875],
		size: [35.625, 0.72, 23.75],
	});

	assertOverlayEntry(overlay, "observatory:walkable-mesh:chunk:x2-z2", {
		shapeType: "mesh",
		intent: "walkable",
		channel: "worldStatic",
		requiredCollision: true,
		requiredWalkable: true,
		min: [0, 1.4, 0],
		max: [95, 52.24, 95],
		center: [47.5, 26.82, 47.5],
		size: [95, 50.84, 95],
	});

	assertOverlayEntry(overlay, "observatory:walkable-mesh:chunk:x3-z3", {
		shapeType: "mesh",
		intent: "walkable",
		channel: "worldStatic",
		requiredCollision: true,
		requiredWalkable: true,
		min: [95, 1.64, 95],
		max: [106.875, 3.76, 106.875],
		center: [100.9375, 2.6999999999999997, 100.9375],
		size: [11.875, 2.12, 11.875],
	});

	assertOverlayEntry(overlay, "observatory:collision:boundary:north", {
		shapeType: "box",
		intent: "solid",
		channel: "worldStatic",
		requiredCollision: true,
		requiredWalkable: false,
		min: [-190, -4.2, -192],
		max: [190, 11.8, -184],
		center: [0, 3.8000000000000003, -188],
		size: [380, 16, 8],
	});

	assertOverlayEntry(overlay, "observatory:collision:boundary:south", {
		shapeType: "box",
		intent: "solid",
		channel: "worldStatic",
		requiredCollision: true,
		requiredWalkable: false,
		min: [-190, -4.2, 184],
		max: [190, 11.8, 192],
		center: [0, 3.8000000000000003, 188],
		size: [380, 16, 8],
	});

	assertOverlayEntry(overlay, "observatory:collision:boundary:east", {
		shapeType: "box",
		intent: "solid",
		channel: "worldStatic",
		requiredCollision: true,
		requiredWalkable: false,
		min: [184, -4.2, -190],
		max: [192, 11.8, 190],
		center: [188, 3.8000000000000003, 0],
		size: [8, 16, 380],
	});

	assertOverlayEntry(overlay, "observatory:collision:boundary:west", {
		shapeType: "box",
		intent: "solid",
		channel: "worldStatic",
		requiredCollision: true,
		requiredWalkable: false,
		min: [-192, -4.2, -190],
		max: [-184, 11.8, 190],
		center: [-188, 3.8000000000000003, 0],
		size: [8, 16, 380],
	});
}

function assertEditorSessionDefaults(): void {
	const defaultEditorSession = getDefaultLevelEditorSessionSummary();
	const editorSession = getDefaultLevelEditorSessionSummary({
		selectedRuntimeSceneId: "observatory_runtime",
	});
	const previewPatch = buildCollisionCookPreviewPatch(plan);
	const bakeFile = buildCollisionCookBakeFile(plan);

	assertEqual(
		defaultEditorSession.selectedRuntimeSceneId,
		defaultRuntimeSceneManifest.id,
		"Expected the generic editor boundary shell to open on the runtime scene catalog default.",
	);
	assertEqual(
		defaultEditorSession.collisionDraft.status,
		"missing",
		"Expected the catalog-default editor session not to fall back to Observatory collision data.",
	);
	assertIncludes(
		defaultEditorSession.collisionDraft.registeredRuntimeSceneIds,
		"observatory_runtime",
		"Expected Observatory to remain a registered content-specific collision draft.",
	);
	assertEqual(
		editorSession.selectedRuntimeSceneId,
		"observatory_runtime",
		"Expected selecting Observatory in the editor boundary shell to use Observatory runtime.",
	);
	assertEqual(
		editorSession.collisionDraft.status,
		"registered",
		"Expected selecting Observatory to load its collision draft from the registry.",
	);
	assertEqual(
		editorSession.collisionDraftId,
		"observatory_collision_draft_v1",
		"Expected the selected Observatory editor session to use the Observatory collision draft.",
	);
	assertEqual(
		editorSession.collisionDraftEntryCount,
		20,
		"Expected the editor boundary shell to list the Observatory collision draft entry count.",
	);
	assertEqual(
		editorSession.selectedLevelInstanceStableId,
		firstObservatoryWalkableChunkStableId,
		"Expected the editor boundary shell to select the first Observatory walkable mesh chunk by default.",
	);
	assertEqual(
		editorSession.preview.channel,
		previewPatch.channel,
		"Expected the editor boundary shell to expose the preview channel.",
	);
	assertEqual(
		editorSession.preview.status,
		"ready",
		"Expected selected Observatory preview data to be ready.",
	);
	assertEqual(
		editorSession.preview.sourcePlanHash,
		previewPatch.sourcePlanHash,
		"Expected the editor boundary shell to expose the preview source plan hash.",
	);
	assertEqual(
		editorSession.bake.mode,
		"derived-in-memory",
		"Expected the editor boundary shell to derive bake data without a checked-in bake artifact.",
	);
	assertEqual(
		editorSession.bake.derivedBakeHash,
		bakeFile.contentHash,
		"Expected the editor boundary shell to expose the derived bake hash.",
	);
}

function assertInvalidDraftCases(): void {
	const firstDraftEntry = observatoryCollisionCookDraft.entries[0];

	if (!firstDraftEntry) {
		throw new Error("Expected Observatory collision draft to contain entries.");
	}

	expectInvalidDraft(
		{
			...observatoryCollisionCookDraft,
			entries: [
				...observatoryCollisionCookDraft.entries,
				{
					...firstDraftEntry,
					id: "duplicate-stable-id",
				},
			],
		},
		`stableId contains duplicate value "${firstDraftEntry.stableId}"`,
	);

	expectInvalidDraft(
		{
			...observatoryCollisionCookDraft,
			entries: observatoryCollisionCookDraft.entries.map((entry) =>
				entry.stableId === "observatory:collision:boundary:north"
					? {
							...entry,
							readiness: {
								requiredCollision: true,
								requiredWalkable: true,
							},
						}
					: entry,
			),
		},
		"requiredWalkable requires collider.intent walkable",
	);
}

function assertRuntimeMismatchCases(): void {
	expectRuntimeMismatch(
		{
			...observatoryRuntimeSceneManifest,
			readiness: {
				...observatoryRuntimeSceneManifest.readiness,
				requiredCollisionStableIds:
					observatoryRuntimeSceneManifest.readiness.requiredCollisionStableIds?.filter(
						(stableId) => stableId !== "observatory:collision:boundary:north",
					) ?? [],
			},
		},
		'stableId "observatory:collision:boundary:north" is missing from readiness.requiredCollisionStableIds',
	);

	expectRuntimeMismatch(
		{
			...observatoryRuntimeSceneManifest,
			level: {
				...observatoryRuntimeSceneManifest.level,
				instances: observatoryRuntimeSceneManifest.level.instances.map(
					(instance) =>
						instance.stableId === "observatory:collision:boundary:north"
							? {
									...instance,
									transform: {
										position: [0, 5.8, -999],
									},
								}
							: instance,
				),
			},
		},
		"runtime transform does not match the authored draft",
	);

	expectRuntimeMismatch(
		{
			...observatoryRuntimeSceneManifest,
			level: {
				...observatoryRuntimeSceneManifest.level,
				instances: observatoryRuntimeSceneManifest.level.instances.map(
					(instance) =>
						instance.stableId === "observatory:collision:boundary:north"
							? {
									...instance,
									components: {
										...instance.components,
										Collider: {
											intent: "solid",
											channel: "worldStatic",
											shape: {
												type: "box",
												halfExtents: [16, 4, 4],
											},
										},
									},
								}
							: instance,
				),
			},
		},
		"effective runtime Collider does not match the authored draft",
	);
}

function assertRuntimeTerrainPackage(
	cookPlan: CollisionCookPlan,
	manifest: RuntimeSceneManifestData,
): void {
	const terrainPackage = firstTerrainPackage(manifest);
	const packageChunkIds = terrainPackage.chunks
		.map((chunk) => chunk.stableId)
		.sort();
	const cookChunkEntries = cookPlan.entries.filter((entry) =>
		isTerrainChunkStableId(entry.stableId),
	);
	const cookChunkIds = cookChunkEntries.map((entry) => entry.stableId).sort();
	const cookChunksByStableId = new Map(
		cookChunkEntries.map((entry) => [entry.stableId, entry] as const),
	);

	assertIncludes(
		manifest.readiness.requiredTerrainPackageIds ?? [],
		terrainPackage.id,
		"Expected Observatory runtime manifest to require its terrain package.",
	);
	assertDeepEqual(
		packageChunkIds,
		cookChunkIds,
		"Expected Observatory runtime terrain package chunks to match the collision cook terrain chunks.",
	);

	for (const chunk of terrainPackage.chunks) {
		assertNotIncludes(
			manifest.readiness.requiredCollisionStableIds ?? [],
			chunk.stableId,
			`Observatory terrain package chunk "${chunk.stableId}" must not be listed in legacy requiredCollisionStableIds.`,
		);
		assertNotIncludes(
			manifest.readiness.requiredWalkableStableIds ?? [],
			chunk.stableId,
			`Observatory terrain package chunk "${chunk.stableId}" must not be listed in legacy requiredWalkableStableIds.`,
		);

		const components = componentsForStableId(manifest, chunk.stableId);
		const terrainCell = components.TerrainChunkCell;

		if (!isRecord(terrainCell) || terrainCell.packageId !== terrainPackage.id) {
			throw new Error(
				`Observatory terrain package chunk "${chunk.stableId}" must resolve to TerrainChunkCell.packageId "${terrainPackage.id}".`,
			);
		}

		if (isRecord(components.Collider)) {
			throw new Error(
				`Observatory terrain package chunk "${chunk.stableId}" must not ship an active Collider component.`,
			);
		}

		if (isRecord(components.RigidBody)) {
			throw new Error(
				`Observatory terrain package chunk "${chunk.stableId}" must not ship an active RigidBody component.`,
			);
		}

		const cookChunk = cookChunksByStableId.get(chunk.stableId);

		if (!cookChunk) {
			throw new Error(
				`Expected Observatory collision cook chunk "${chunk.stableId}" to exist.`,
			);
		}

		assertDeepEqual(
			chunk.colliderComponent,
			cookChunk.colliderComponent,
			`Expected Observatory terrain package chunk "${chunk.stableId}" collider data to match the collision cook draft.`,
		);
	}
}

function collisionPlanWithoutTerrainChunks(
	cookPlan: CollisionCookPlan,
): CollisionCookPlan {
	const entries = cookPlan.entries.filter(
		(entry) => !isTerrainChunkStableId(entry.stableId),
	);
	const requiredEntries = entries.filter(
		(entry) => entry.readiness.requiredCollision,
	);

	return {
		...cookPlan,
		entries,
		requiredCollisionPrefabIds: sortedUnique(
			requiredEntries.map((entry) => entry.prefabId),
		),
		requiredCollisionStableIds: sortedUnique(
			requiredEntries.map((entry) => entry.stableId),
		),
		requiredWalkableStableIds: sortedUnique(
			entries
				.filter((entry) => entry.readiness.requiredWalkable === true)
				.map((entry) => entry.stableId),
		),
	};
}

function isTerrainChunkStableId(stableId: string): boolean {
	return stableId.startsWith("observatory:walkable-mesh:chunk:");
}

function assertWritePlanHashChanges(): void {
	const writePlan = buildCollisionCookWritePlan(plan);
	const shiftedDraft: CollisionCookDraftData = {
		...observatoryCollisionCookDraft,
		entries: observatoryCollisionCookDraft.entries.map((entry) =>
			entry.stableId === "observatory:collision:boundary:north"
				? {
						...entry,
						transform: {
							position: [0, 6.8, -304],
						},
					}
				: entry,
		),
	};
	const shiftedWritePlan = buildCollisionCookWritePlan(
		buildCollisionCookPlan(shiftedDraft),
	);

	if (shiftedWritePlan.contentHash === writePlan.contentHash) {
		throw new Error(
			"Expected collision cook write plan hash to change when draft output data changes.",
		);
	}
}

function assertObservatoryWalkableMesh(cookPlan: CollisionCookPlan): void {
	const walkablePlanEntries = cookPlan.entries.filter((entry) =>
		entry.stableId.startsWith("observatory:walkable-mesh:chunk:"),
	);

	if (walkablePlanEntries.length !== 16) {
		throw new Error(
			`Expected Observatory collision cook plan to include 16 walkable mesh chunks, received ${walkablePlanEntries.length}.`,
		);
	}

	assertEqual(
		JSON.stringify(cookPlan.requiredWalkableStableIds),
		JSON.stringify([]),
		"Expected Observatory terrain-package owned chunks to stay out of legacy walkable readiness.",
	);
	assertNotIncludes(
		cookPlan.requiredCollisionPrefabIds,
		"observatory_walkable_mesh",
		"Expected Observatory terrain-package owned chunks to stay out of legacy collision prefab readiness.",
	);

	assertEqual(
		walkablePlanEntries.filter((entry) => entry.colliderTarget === "prefab")
			.length,
		1,
		"Expected exactly one walkable chunk to own the prefab default collider.",
	);

	assertEqual(
		walkablePlanEntries.filter(
			(entry) => entry.colliderTarget === "level-instance",
		).length,
		15,
		"Expected remaining walkable chunks to own level-instance collider overrides.",
	);

	const uniqueVertices = new Map<string, CollisionCookVector3Data>();

	for (const entry of walkablePlanEntries) {
		assertEqual(
			entry.readiness.terrainPackageOwned,
			true,
			`Expected Observatory walkable collision chunk ${entry.stableId} to be terrain-package owned.`,
		);
		const walkableShape = entry.colliderComponent.shape;

		if (walkableShape.type !== "mesh") {
			throw new Error(
				`Expected Observatory walkable collision chunk ${entry.stableId} to use a mesh.`,
			);
		}

		if (walkableShape.vertices.length < 4) {
			throw new Error(
				`Expected Observatory walkable collision chunk ${entry.stableId} to include emitted GLB-footprint vertices.`,
			);
		}
		if (walkableShape.indices.length < 6) {
			throw new Error(
				`Expected Observatory walkable collision chunk ${entry.stableId} to include emitted GLB-footprint triangles.`,
			);
		}

		for (const vertex of walkableShape.vertices) {
			uniqueVertices.set(`${vertex[0]}:${vertex[2]}`, vertex);
		}
	}

	assertEqual(
		uniqueVertices.size,
		665,
		"Unexpected Observatory walkable mesh vertex count.",
	);
	assertEqual(
		walkablePlanEntries.reduce(
			(total, entry) =>
				total +
				(entry.colliderComponent.shape.type === "mesh"
					? entry.colliderComponent.shape.indices.length
					: 0),
			0,
		),
		3546,
		"Unexpected Observatory walkable mesh index count.",
	);
	assertEqual(
		walkablePlanEntries.reduce(
			(total, entry) =>
				total +
				(entry.colliderComponent.shape.type === "mesh"
					? entry.colliderComponent.shape.indices.length / 3
					: 0),
			0,
		),
		1182,
		"Unexpected Observatory walkable mesh triangle count.",
	);

	const vertices = [...uniqueVertices.values()];

	assertMeshVertexHeight(
		vertices,
		-142.5,
		-47.5,
		0.58,
		"Observatory collision draft walkable mesh",
	);
	assertMeshVertexHeight(
		vertices,
		0,
		0,
		52.24,
		"Observatory collision draft walkable mesh",
	);
	assertMeshVertexHeight(
		vertices,
		47.5,
		47.5,
		11.83,
		"Observatory collision draft walkable mesh",
	);
}

function assertOverlayEntry(
	overlay: ReturnType<typeof buildCollisionOverlayViewModel>,
	stableId: string,
	expected: {
		readonly shapeType: string;
		readonly intent: string;
		readonly channel: string;
		readonly requiredCollision: boolean;
		readonly requiredWalkable: boolean;
		readonly min: CollisionCookVector3Data;
		readonly max: CollisionCookVector3Data;
		readonly center: CollisionCookVector3Data;
		readonly size: CollisionCookVector3Data;
	},
): void {
	const entry = overlay.entries.find((item) => item.stableId === stableId);

	if (!entry) {
		throw new Error(
			`Expected collision overlay entry ${JSON.stringify(stableId)} to exist.`,
		);
	}

	assertEqual(
		entry.shapeType,
		expected.shapeType,
		`Unexpected shape type for ${stableId}.`,
	);
	assertEqual(
		entry.intent,
		expected.intent,
		`Unexpected intent for ${stableId}.`,
	);
	assertEqual(
		entry.channel,
		expected.channel,
		`Unexpected channel for ${stableId}.`,
	);
	assertEqual(
		entry.readiness.requiredCollision,
		expected.requiredCollision,
		`Unexpected requiredCollision flag for ${stableId}.`,
	);
	assertEqual(
		entry.readiness.requiredWalkable,
		expected.requiredWalkable,
		`Unexpected requiredWalkable flag for ${stableId}.`,
	);
	assertVector(
		entry.bounds.min,
		expected.min,
		`Unexpected min bound for ${stableId}.`,
	);
	assertVector(
		entry.bounds.max,
		expected.max,
		`Unexpected max bound for ${stableId}.`,
	);
	assertVector(
		entry.bounds.center,
		expected.center,
		`Unexpected center for ${stableId}.`,
	);
	assertVector(
		entry.bounds.size,
		expected.size,
		`Unexpected size for ${stableId}.`,
	);
}

function expectInvalidDraft(
	draft: CollisionCookDraftData,
	expectedError: string,
): void {
	try {
		parseCollisionCookDraft(draft);
	} catch (error) {
		const errors =
			error instanceof Error && "errors" in error
				? (error as Error & { readonly errors: readonly string[] }).errors ?? []
				: [];

		if (errors.some((item) => item.includes(expectedError))) {
			return;
		}

		throw new Error(
			`Expected draft errors to include ${JSON.stringify(expectedError)}, received:\n${errors.join("\n")}`,
		);
	}

	throw new Error(
		`Expected draft to fail with ${JSON.stringify(expectedError)}.`,
	);
}

function expectInvalidPreviewPatch(
	patch: unknown,
	expectedError: string,
): void {
	try {
		parseCollisionCookPreviewPatch(patch);
	} catch (error) {
		const errors =
			error instanceof Error && "errors" in error
				? (error as Error & { readonly errors: readonly string[] }).errors ?? []
				: [];

		if (errors.some((item) => item.includes(expectedError))) {
			return;
		}

		throw new Error(
			`Expected preview patch errors to include ${JSON.stringify(expectedError)}, received:\n${errors.join("\n")}`,
		);
	}

	throw new Error(
		`Expected preview patch to fail with ${JSON.stringify(expectedError)}.`,
	);
}

function expectRuntimeMismatch(
	manifest: RuntimeSceneManifestData,
	expectedError: string,
): void {
	const runtimeResult = validateCollisionCookPlanAgainstRuntimeScene({
		plan: runtimeCollisionPlan,
		manifest,
	});

	if (runtimeResult.ok) {
		throw new Error(
			`Expected runtime cook validation to fail with ${JSON.stringify(expectedError)}.`,
		);
	}

	if (!runtimeResult.errors.some((error) => error.includes(expectedError))) {
		throw new Error(
			`Expected runtime cook validation errors to include ${JSON.stringify(expectedError)}, received:\n${runtimeResult.errors.join("\n")}`,
		);
	}
}

function expectWriteArtifact(
	artifacts: readonly CollisionCookWriteArtifact[],
	purpose: CollisionCookWriteArtifactPurpose,
	targetFile: string,
): CollisionCookWriteArtifact {
	const artifact = artifacts.find((item) => item.purpose === purpose);

	if (!artifact) {
		throw new Error(`Expected write plan artifact for ${purpose}.`);
	}

	if (artifact.targetFile !== targetFile) {
		throw new Error(
			`Expected ${purpose} artifact to target ${targetFile}, received ${artifact.targetFile}.`,
		);
	}

	if (purpose !== "runtime-collision-module" && artifact.format !== "json") {
		throw new Error(`Expected ${purpose} artifact to use json format.`);
	}

	if (!artifact.contentHash.startsWith("fnv1a32:")) {
		throw new Error(`Expected ${purpose} artifact to include a content hash.`);
	}

	if (artifact.serializedPayload.trim().length === 0) {
		throw new Error(
			`Expected ${purpose} artifact to include serialized payload.`,
		);
	}

	return artifact;
}

function getAllowedRuntimeCollisionTargetFiles(): readonly string[] {
	return [
		observatoryCollisionCookDraft.targetFiles.prefabModule,
		observatoryCollisionCookDraft.targetFiles.levelModule,
		observatoryCollisionCookDraft.targetFiles.runtimeSceneManifestModule,
		expectGeneratedRuntimeCollisionModuleTarget(),
	];
}

function expectGeneratedRuntimeCollisionModuleTarget(): string {
	const target =
		observatoryCollisionCookDraft.targetFiles.generatedRuntimeCollisionModule;

	if (target === undefined) {
		throw new Error(
			"Expected Observatory collision draft to declare a generated runtime collision module target.",
		);
	}

	return target;
}

function assertMeshVertexHeight(
	vertices: readonly CollisionCookVector3Data[],
	x: number,
	z: number,
	expectedHeight: number,
	label: string,
): void {
	const vertex = vertices.find((item) => item[0] === x && item[2] === z);

	if (!vertex) {
		throw new Error(`${label} is missing vertex at x=${x}, z=${z}.`);
	}

	assertEqual(vertex[1], expectedHeight, `${label} unexpected height.`);
}

type NodeDirentLike = {
	readonly name: string;
	isDirectory(): boolean;
};

type NodeFsPromises = {
	readonly readFile: (path: URL, encoding: "utf8") => Promise<string>;
	readonly readdir: (
		path: URL,
		options: { readonly withFileTypes: true },
	) => Promise<readonly NodeDirentLike[]>;
};

async function assertNormalRuntimeDoesNotImportEditorModules(): Promise<void> {
	const appRoot = new URL("../", import.meta.url);
	const fs = await importNodeFsPromises();
	const runtimeOwnerPaths = [
		"src/pages/index.astro",
		"src/app/GameClient.svelte",
		"src/app/browserGameClient.ts",
		"src/app/index.ts",
		"src/app/mountGameClient.ts",
		"src/engine/",
		"src/game/assets/",
		"src/game/levels/",
		"src/game/prefabs/",
		"src/game/runtime/",
		"src/game/systems/",
	];
	const files = (
		await Promise.all(
			runtimeOwnerPaths.map((path) =>
				collectSourceFiles(fs, new URL(path, appRoot)),
			),
		)
	).flat();
	const violations: string[] = [];

	for (const file of files) {
		const source = await fs.readFile(file, "utf8");
		const rel = relativePathFromAppRoot(appRoot, file);

		for (const specifier of extractImportSpecifiers(source)) {
			const resolved = resolveImportSpecifier(appRoot, rel, specifier);

			if (isEditorModulePath(resolved)) {
				violations.push(`${rel} imports ${specifier}`);
			}
		}
	}

	if (violations.length > 0) {
		throw new Error(
			`Normal runtime owners must not import editor modules:\n${violations.join("\n")}`,
		);
	}
}

async function collectSourceFiles(
	fs: NodeFsPromises,
	path: URL,
): Promise<readonly URL[]> {
	if (isSourceFilePath(path.pathname)) {
		return [path];
	}

	const entries = await fs.readdir(path, { withFileTypes: true });
	const files: URL[] = [];

	for (const entry of entries) {
		const entryPath = new URL(entry.name, path);

		if (entry.isDirectory()) {
			files.push(
				...(await collectSourceFiles(fs, new URL(`${entry.name}/`, path))),
			);
			continue;
		}

		if (isSourceFilePath(entryPath.pathname)) {
			files.push(entryPath);
		}
	}

	return files;
}

function relativePathFromAppRoot(appRoot: URL, path: URL): string {
	return decodeURI(path.pathname.slice(appRoot.pathname.length));
}

function isSourceFilePath(path: string): boolean {
	return /\.(astro|svelte|ts)$/.test(path);
}

function extractImportSpecifiers(source: string): string[] {
	const specifiers = new Set<string>();
	const patterns = [
		/\bfrom\s*["']([^"']+)["']/g,
		/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
		/^\s*import\s*["']([^"']+)["']/gm,
	];

	for (const pattern of patterns) {
		for (const match of source.matchAll(pattern)) {
			const specifier = match[1];

			if (specifier !== undefined) {
				specifiers.add(specifier);
			}
		}
	}

	return [...specifiers];
}

function resolveImportSpecifier(
	appRoot: URL,
	relFile: string,
	specifier: string,
): string {
	if (specifier.startsWith("@game/")) {
		return specifier.replace(/^@game\//, "src/game/");
	}

	if (specifier.startsWith("@/")) {
		return specifier.replace(/^@\//, "src/");
	}

	if (!specifier.startsWith(".")) {
		return specifier;
	}

	const resolved = new URL(specifier, new URL(relFile, appRoot));
	return stripSourceSuffix(relativePathFromAppRoot(appRoot, resolved));
}

function stripSourceSuffix(path: string): string {
	return path.replace(/\.(astro|svelte|ts|js|mjs|mts)$/, "");
}

function isEditorModulePath(path: string): boolean {
	return (
		path === "src/game/editor" ||
		path.startsWith("src/game/editor/") ||
		path === "src/app/editor" ||
		path.startsWith("src/app/editor/")
	);
}

async function importNodeFsPromises(): Promise<NodeFsPromises> {
	const specifier = "node:fs/promises";

	return (await import(specifier)) as NodeFsPromises;
}

function firstTerrainPackage(manifest: RuntimeSceneManifestData) {
	const terrainPackage = manifest.terrainPackages?.[0];

	if (!terrainPackage) {
		throw new Error(
			`Expected runtime manifest "${manifest.id}" to include a terrain package.`,
		);
	}

	return terrainPackage;
}

function componentsForStableId(
	manifest: RuntimeSceneManifestData,
	stableId: string,
): Record<string, unknown> {
	const instance = manifest.level.instances.find(
		(candidate) => candidate.stableId === stableId,
	);

	if (!instance) {
		throw new Error(`Expected runtime level instance "${stableId}" to exist.`);
	}

	const prefab = manifest.prefabs.find(
		(candidate) => candidate.id === instance.prefabId,
	);

	if (!prefab) {
		throw new Error(
			`Expected runtime level instance "${stableId}" to reference prefab "${instance.prefabId}".`,
		);
	}

	return {
		...prefab.components,
		...(instance.components ?? {}),
	};
}

function sortedUnique(values: readonly string[]): readonly string[] {
	return [...new Set(values)].sort();
}

function assertDeepEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message: string,
): void {
	const actualJson = stableStringify(actual);
	const expectedJson = stableStringify(expected);

	if (actualJson !== expectedJson) {
		throw new Error(
			`${message} Expected ${expectedJson}, received ${actualJson}.`,
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

function assertIncludes<TValue>(
	values: readonly TValue[],
	expected: TValue,
	message: string,
): void {
	if (!values.includes(expected)) {
		throw new Error(
			`${message} Expected ${JSON.stringify(values)} to include ${JSON.stringify(expected)}.`,
		);
	}
}

function assertNotIncludes<TValue>(
	values: readonly TValue[],
	unexpected: TValue,
	message: string,
): void {
	if (values.includes(unexpected)) {
		throw new Error(
			`${message} Expected ${JSON.stringify(values)} not to include ${JSON.stringify(unexpected)}.`,
		);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message: string,
): void {
	if (actual !== expected) {
		throw new Error(
			`${message} Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
		);
	}
}

function assertVector(
	actual: CollisionCookVector3Data,
	expected: CollisionCookVector3Data,
	message: string,
): void {
	const tolerance = 0.000_001;

	for (let index = 0; index < 3; index += 1) {
		const actualItem = actual[index] ?? Number.NaN;
		const expectedItem = expected[index] ?? Number.NaN;

		if (Math.abs(actualItem - expectedItem) > tolerance) {
			throw new Error(
				`${message} Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
			);
		}
	}
}
