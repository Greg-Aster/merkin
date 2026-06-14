import {
	type LevelEditorCollisionEntryEditor,
	type LevelEditorVectorControl,
	getDefaultLevelEditorSessionSummary,
} from "../src/app/editor/levelEditorSession.js";
import type { CollisionCookVector3Data } from "../src/engine/data/collisionCook/index.js";
import { buildCollisionOverlayViewModel } from "../src/game/editor/collisionDrafts/collisionOverlayViewModel.js";
import { observatoryCollisionCookDraft } from "../src/game/editor/collisionDrafts/observatoryCollisionDraft.js";

const overlay = buildCollisionOverlayViewModel(observatoryCollisionCookDraft);
const editorSession = getDefaultLevelEditorSessionSummary({
	selectedRuntimeSceneId: "observatory_runtime",
});
const firstObservatoryWalkableChunkStableId =
	"observatory:walkable-mesh:chunk:x0-z0";

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

assertOverlayEntry(firstObservatoryWalkableChunkStableId, {
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

assertOverlayEntry("observatory:walkable-mesh:chunk:x2-z2", {
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

assertOverlayEntry("observatory:collision:boundary:north", {
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

assertOverlayEntry("observatory:collision:boundary:south", {
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

assertOverlayEntry("observatory:collision:boundary:east", {
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

assertOverlayEntry("observatory:collision:boundary:west", {
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

assertEditorSessionControls();
assertEditorTerrainStatus();

console.log(
	`Collision overlay view model contract passed for ${overlay.entries.length} Observatory entries.`,
);

function assertEditorSessionControls(): void {
	assertEqual(
		editorSession.collisionEntryEditors.length,
		overlay.entries.length,
		"Expected editor session to expose all collision overlay entries.",
	);
	assertArrayEqual(
		editorSession.collisionEntryEditors.map((entry) => entry.stableId),
		overlay.entries.map((entry) => entry.stableId),
		"Expected editor session controls to preserve overlay stable ID order.",
	);

	const walkableMesh = editorEntry(firstObservatoryWalkableChunkStableId);

	assertEqual(
		walkableMesh.selected,
		true,
		"Expected the first walkable chunk to remain the default selected stable ID.",
	);
	assertEqual(
		walkableMesh.canEditTransform,
		false,
		"Expected mesh collision entries to avoid transform editing controls.",
	);
	assertEqual(
		walkableMesh.transformControls,
		undefined,
		"Expected mesh collision transform controls to be omitted.",
	);
	assertEqual(
		walkableMesh.intentControl.value,
		"walkable",
		"Expected mesh intent control to preserve the authored intent.",
	);
	assertIncludes(
		walkableMesh.intentControl.options,
		"walkable",
		"Expected mesh intent options to include walkable.",
	);
	assertEqual(
		walkableMesh.channelControl.value,
		"worldStatic",
		"Expected mesh channel control to preserve the authored channel.",
	);

	if (!walkableMesh.meshMetadata) {
		throw new Error("Expected walkable mesh metadata to be exposed.");
	}

	assertEqual(
		walkableMesh.meshMetadata.vertexCount,
		10,
		"Unexpected walkable mesh chunk vertex count in editor session.",
	);
	assertEqual(
		walkableMesh.meshMetadata.indexCount,
		24,
		"Unexpected walkable mesh chunk index count in editor session.",
	);
	assertEqual(
		walkableMesh.meshMetadata.triangleCount,
		8,
		"Unexpected walkable mesh chunk triangle count in editor session.",
	);

	const northBoundary = editorEntry("observatory:collision:boundary:north");

	assertEqual(
		northBoundary.canEditTransform,
		true,
		"Expected box collision entries to expose transform editing controls.",
	);

	if (!northBoundary.transformControls) {
		throw new Error("Expected north boundary transform controls to exist.");
	}

	assertVector(
		fieldsToVector(northBoundary.transformControls.position),
		[0, 3.8, -188],
		"Unexpected north boundary position editor values.",
	);
	assertVector(
		fieldsToVector(northBoundary.transformControls.scale),
		[1, 1, 1],
		"Unexpected north boundary scale editor values.",
	);
	assertEqual(
		northBoundary.intentControl.value,
		"solid",
		"Expected north boundary intent control to preserve the authored intent.",
	);
	assertIncludes(
		northBoundary.intentControl.options,
		"solid",
		"Expected box intent options to include solid.",
	);
	assertEqual(
		northBoundary.channelControl.value,
		"worldStatic",
		"Expected north boundary channel control to preserve the authored channel.",
	);
	assertIncludes(
		northBoundary.channelControl.options,
		"worldStatic",
		"Expected box channel options to include worldStatic.",
	);

	if (!northBoundary.boxMetadata) {
		throw new Error("Expected north boundary box metadata to be exposed.");
	}

	assertVector(
		northBoundary.boxMetadata.halfExtents,
		[190, 8, 4],
		"Unexpected north boundary half extents.",
	);
	assertVector(
		northBoundary.bounds.center,
		[0, 3.8000000000000003, -188],
		"Unexpected north boundary derived bounds center in editor session.",
	);
}

function assertEditorTerrainStatus(): void {
	assertEqual(
		editorSession.terrain.selectedRuntimeSceneId,
		"observatory_runtime",
		"Expected editor terrain status to use the selected runtime scene.",
	);
	assertEqual(
		editorSession.terrain.packageCount,
		1,
		"Expected editor terrain status to expose runtime terrain packages.",
	);
	assertEqual(
		editorSession.terrain.requiredPackageCount,
		1,
		"Expected editor terrain status to expose required terrain package count.",
	);
	assertArrayEqual(
		editorSession.terrain.packageIds,
		["observatory_runtime:terrain-package"],
		"Expected editor terrain status to expose package IDs from the runtime manifest.",
	);
	assertArrayEqual(
		editorSession.terrain.requiredPackageIds,
		["observatory_runtime:terrain-package"],
		"Expected editor terrain status to expose readiness terrain package IDs.",
	);
	assertEqual(
		editorSession.terrain.startupChunkCount,
		1,
		"Expected editor terrain status to expose terrain package startup chunks.",
	);
	assertEqual(
		editorSession.terrain.activeCollisionChunkCount,
		null,
		"Expected editor terrain status to leave active collision count unset without runtime state.",
	);
	assertEqual(
		editorSession.terrain.visualBindingCount,
		1,
		"Expected editor terrain status to expose terrain package visual bindings.",
	);
	assertEqual(
		editorSession.terrain.lodBindingCounts.near,
		0,
		"Expected Observatory terrain package to expose near LOD binding count.",
	);
	assertEqual(
		editorSession.terrain.lodBindingCounts.far,
		0,
		"Expected Observatory terrain package to expose far LOD binding count.",
	);
	assertEqual(
		editorSession.terrain.lodBindingCounts.mergedFloor,
		1,
		"Expected Observatory terrain package to expose merged-floor LOD binding count.",
	);
	assertEqual(
		editorSession.terrain.chunkLodReferenceCounts.near,
		16,
		"Expected Observatory terrain package to expose near chunk LOD references.",
	);
	assertEqual(
		editorSession.terrain.chunkLodReferenceCounts.far,
		0,
		"Expected Observatory terrain package to expose far chunk LOD references.",
	);
	assertEqual(
		editorSession.terrain.materialAssetCount,
		1,
		"Expected editor terrain status to expose unique package material assets.",
	);
	assertArrayEqual(
		editorSession.terrain.packageErrors,
		[],
		"Expected editor terrain package status to report no missing or stale package errors.",
	);
	assertEqual(
		editorSession.terrain.collisionChunkCount,
		20,
		"Expected editor terrain status to expose all cooked collision chunks.",
	);
	assertEqual(
		editorSession.terrain.meshChunkCount,
		16,
		"Expected editor terrain status to count walkable mesh chunks.",
	);
	assertEqual(
		editorSession.terrain.boxChunkCount,
		4,
		"Expected editor terrain status to count boundary box chunks.",
	);
	assertEqual(
		editorSession.terrain.walkableChunkCount,
		16,
		"Expected editor terrain status to count required walkable chunks.",
	);
	assertEqual(
		editorSession.terrain.collisionTriangleCount,
		1182,
		"Expected terrain collision triangle count to come from cooked mesh chunks.",
	);
	assertEqual(
		editorSession.terrain.sourcePlanHash,
		"fnv1a32:2834b03a",
		"Expected terrain status to expose the collision source plan hash.",
	);

	const terrainPackage = terrainStatusPackage(
		"observatory_runtime:terrain-package",
	);

	assertEqual(
		terrainPackage.status,
		"ready",
		"Expected Observatory terrain package status to be ready.",
	);
	assertEqual(
		terrainPackage.required,
		true,
		"Expected Observatory terrain package to be required by readiness.",
	);
	assertEqual(
		terrainPackage.chunkCount,
		16,
		"Expected Observatory terrain package chunk count to come from the runtime manifest.",
	);
	assertEqual(
		terrainPackage.startupChunkCount,
		1,
		"Expected Observatory terrain package startup chunk count to come from the runtime manifest.",
	);
	assertEqual(
		terrainPackage.activeCollisionChunkCount,
		null,
		"Expected package active collision count to stay unset without runtime state.",
	);
	assertEqual(
		terrainPackage.visualBindingCount,
		1,
		"Expected Observatory terrain package visual binding count to come from the runtime manifest.",
	);
	assertEqual(
		terrainPackage.materialSetCount,
		1,
		"Expected Observatory terrain package material set count to be exposed.",
	);
	assertEqual(
		terrainPackage.materialLayerCount,
		1,
		"Expected Observatory terrain package material layer count to be exposed.",
	);
	assertEqual(
		terrainPackage.materialAssetCount,
		1,
		"Expected Observatory terrain package material asset count to be exposed.",
	);
	assertEqual(
		terrainPackage.driftHash,
		"fnv1a32:551029f5",
		"Expected Observatory terrain package drift hash to be exposed.",
	);
	assertArrayEqual(
		terrainPackage.errors,
		[],
		"Expected Observatory terrain package to expose no stale package errors.",
	);

	const statefulEditorSession = getDefaultLevelEditorSessionSummary({
		selectedRuntimeSceneId: "observatory_runtime",
		terrainStreamingStatus: {
			packageIds: ["observatory_runtime:terrain-package"],
			activeCollisionChunkStableIds: [firstObservatoryWalkableChunkStableId],
			errors: [],
		},
	});
	assertEqual(
		statefulEditorSession.terrain.activeCollisionChunkCount,
		1,
		"Expected editor terrain status to expose active collision count when runtime state is provided.",
	);
	assertEqual(
		statefulEditorSession.terrain.packages[0]?.activeCollisionChunkCount,
		1,
		"Expected terrain package status to expose package active collision count when runtime state is provided.",
	);

	const terrainChunk = terrainStatusChunk(
		firstObservatoryWalkableChunkStableId,
	);

	assertEqual(
		terrainChunk.geometry.vertexCount,
		10,
		"Expected walkable terrain chunk vertex count to be exposed.",
	);
	assertEqual(
		terrainChunk.geometry.indexCount,
		24,
		"Expected walkable terrain chunk index count to be exposed.",
	);
	assertEqual(
		terrainChunk.geometry.triangleCount,
		8,
		"Expected walkable terrain chunk triangle count to be exposed.",
	);
	assertEqual(
		terrainChunk.geometry.gridSize,
		null,
		"Expected sparse walkable terrain chunk grid size to stay unset.",
	);
	assertEqual(
		terrainChunk.geometry.cellSize,
		null,
		"Expected sparse walkable terrain chunk cell size to stay unset.",
	);
	assertEqual(
		terrainChunk.geometry.halfExtent,
		17.8125,
		"Expected sparse walkable terrain chunk half extent to be derived.",
	);

	if (!terrainChunk.geometry.heightRange) {
		throw new Error("Expected walkable terrain chunk height range.");
	}

	assertEqual(
		terrainChunk.geometry.heightRange.min,
		0.48,
		"Unexpected walkable terrain chunk minimum height.",
	);
	assertEqual(
		terrainChunk.geometry.heightRange.max,
		1.2,
		"Unexpected walkable terrain chunk maximum height.",
	);

	const boundaryChunk = terrainStatusChunk(
		"observatory:collision:boundary:north",
	);

	assertVector(
		boundaryChunk.geometry.halfExtents ?? [0, 0, 0],
		[190, 8, 4],
		"Expected boundary terrain chunk half extents to be exposed.",
	);

	const runtimeModuleArtifact = editorSession.terrain.cookArtifacts.find(
		(artifact) => artifact.purpose === "runtime-collision-module",
	);

	if (!runtimeModuleArtifact) {
		throw new Error(
			"Expected terrain cook status to expose runtime collision module artifact.",
		);
	}

	assertEqual(
		runtimeModuleArtifact.targetFile,
		"src/game/generated/observatoryCollisionRuntime.ts",
		"Expected terrain cook status to expose generated runtime module target.",
	);
	assertEqual(
		runtimeModuleArtifact.writesRuntimeData,
		true,
		"Expected terrain cook status to flag runtime module as runtime data.",
	);
}

function assertOverlayEntry(
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

function editorEntry(stableId: string): LevelEditorCollisionEntryEditor {
	const entry = editorSession.collisionEntryEditors.find(
		(item) => item.stableId === stableId,
	);

	if (!entry) {
		throw new Error(`Expected editor session entry ${stableId} to exist.`);
	}

	return entry;
}

function terrainStatusChunk(
	stableId: string,
): (typeof editorSession.terrain.chunks)[number] {
	const entry = editorSession.terrain.chunks.find(
		(item) => item.stableId === stableId,
	);

	if (!entry) {
		throw new Error(`Expected editor terrain chunk ${stableId} to exist.`);
	}

	return entry;
}

function terrainStatusPackage(
	packageId: string,
): (typeof editorSession.terrain.packages)[number] {
	const entry = editorSession.terrain.packages.find(
		(item) => item.id === packageId,
	);

	if (!entry) {
		throw new Error(`Expected editor terrain package ${packageId} to exist.`);
	}

	return entry;
}

function fieldsToVector(
	control: LevelEditorVectorControl,
): CollisionCookVector3Data {
	return [
		fieldValue(control, "x"),
		fieldValue(control, "y"),
		fieldValue(control, "z"),
	];
}

function fieldValue(
	control: LevelEditorVectorControl,
	axis: "x" | "y" | "z",
): number {
	const field = control.fields.find((item) => item.axis === axis);

	if (!field) {
		throw new Error(
			`Expected ${control.label} control to include ${axis.toUpperCase()} field.`,
		);
	}

	return field.value;
}

function assertArrayEqual<TValue>(
	actual: readonly TValue[],
	expected: readonly TValue[],
	message: string,
): void {
	if (actual.length !== expected.length) {
		throw new Error(
			`${message} Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
		);
	}

	for (let index = 0; index < expected.length; index += 1) {
		if (actual[index] !== expected[index]) {
			throw new Error(
				`${message} Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
			);
		}
	}
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
