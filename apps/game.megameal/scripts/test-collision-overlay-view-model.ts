import {
	type LevelEditorCollisionEntryEditor,
	type LevelEditorVectorControl,
	getDefaultLevelEditorSessionSummary,
} from "../src/app/editor/levelEditorSession.js";
import type { CollisionCookVector3Data } from "../src/engine/data/collisionCook/index.js";
import { buildCollisionOverlayViewModel } from "../src/game/editor/collisionDrafts/collisionOverlayViewModel.js";
import { observatoryCollisionCookDraft } from "../src/game/editor/collisionDrafts/observatoryCollisionDraft.js";

const overlay = buildCollisionOverlayViewModel(observatoryCollisionCookDraft);
const editorSession = getDefaultLevelEditorSessionSummary();
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
	min: [-320, 1.4, -320],
	max: [-160, 1.67, -160],
	center: [-240, 1.535, -240],
	size: [160, 0.27, 160],
});

assertOverlayEntry("observatory:walkable-mesh:chunk:x2-z2", {
	shapeType: "mesh",
	intent: "walkable",
	channel: "worldStatic",
	requiredCollision: true,
	requiredWalkable: true,
	min: [0, 2.01, 0],
	max: [160, 2.44, 160],
	center: [80, 2.225, 80],
	size: [160, 0.43000000000000016, 160],
});

assertOverlayEntry("observatory:collision:boundary:north", {
	shapeType: "box",
	intent: "solid",
	channel: "worldStatic",
	requiredCollision: true,
	requiredWalkable: false,
	min: [-320, 1.8, -308],
	max: [320, 9.8, -300],
	center: [0, 5.8, -304],
	size: [640, 8, 8],
});

assertOverlayEntry("observatory:collision:boundary:south", {
	shapeType: "box",
	intent: "solid",
	channel: "worldStatic",
	requiredCollision: true,
	requiredWalkable: false,
	min: [-320, 1.8, 300],
	max: [320, 9.8, 308],
	center: [0, 5.8, 304],
	size: [640, 8, 8],
});

assertOverlayEntry("observatory:collision:boundary:east", {
	shapeType: "box",
	intent: "solid",
	channel: "worldStatic",
	requiredCollision: true,
	requiredWalkable: false,
	min: [300, 1.8, -320],
	max: [308, 9.8, 320],
	center: [304, 5.8, 0],
	size: [8, 8, 640],
});

assertOverlayEntry("observatory:collision:boundary:west", {
	shapeType: "box",
	intent: "solid",
	channel: "worldStatic",
	requiredCollision: true,
	requiredWalkable: false,
	min: [-308, 1.8, -320],
	max: [-300, 9.8, 320],
	center: [-304, 5.8, 0],
	size: [8, 8, 640],
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
		25,
		"Unexpected walkable mesh chunk vertex count in editor session.",
	);
	assertEqual(
		walkableMesh.meshMetadata.indexCount,
		96,
		"Unexpected walkable mesh chunk index count in editor session.",
	);
	assertEqual(
		walkableMesh.meshMetadata.triangleCount,
		32,
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
		[0, 5.8, -304],
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
		[320, 4, 4],
		"Unexpected north boundary half extents.",
	);
	assertVector(
		northBoundary.bounds.center,
		[0, 5.8, -304],
		"Unexpected north boundary derived bounds center in editor session.",
	);
}

function assertEditorTerrainStatus(): void {
	assertEqual(
		editorSession.terrain.importCount,
		1,
		"Expected editor terrain status to expose one current terrain import.",
	);
	assertEqual(
		editorSession.terrain.importedCount,
		1,
		"Expected current terrain import to be marked imported.",
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
		512,
		"Expected terrain collision triangle count to come from cooked mesh chunks.",
	);
	assertEqual(
		editorSession.terrain.visualTriangleCount,
		8192,
		"Expected terrain visual triangle count to come from generated import metadata.",
	);
	assertEqual(
		editorSession.terrain.sourcePlanHash,
		"fnv1a32:6c07d491",
		"Expected terrain status to expose the collision source plan hash.",
	);

	const terrainImport = editorSession.terrain.imports[0];

	if (!terrainImport) {
		throw new Error("Expected editor terrain import status to exist.");
	}

	assertEqual(
		terrainImport.id,
		"observatory-field-micro-displacement-glb",
		"Unexpected editor terrain import ID.",
	);
	assertEqual(
		terrainImport.status,
		"imported",
		"Expected editor terrain import to preserve import manifest status.",
	);
	assertEqual(
		terrainImport.generatorScript,
		"scripts/generate-observatory-field-terrain.ts",
		"Expected editor terrain import to expose generator script provenance.",
	);
	assertEqual(
		terrainImport.metadataPath,
		"public/assets/generated/game/observatory/terrain/observatory-field-micro-displacement.json",
		"Expected editor terrain import to expose generated metadata path.",
	);
	assertEqual(
		terrainImport.glbSha256,
		"326df726413d05e1139efe355d3e65bb0b78d120ecd05e615cc5ed1e37dd0d92",
		"Expected editor terrain import to expose the generated GLB hash.",
	);
	assertEqual(
		terrainImport.source.collisionDraftId,
		"observatory_collision_draft_v1",
		"Expected editor terrain import to expose collision draft linkage.",
	);
	assertEqual(
		terrainImport.source.primaryCollisionStableId,
		firstObservatoryWalkableChunkStableId,
		"Expected editor terrain import to expose primary collision stable ID linkage.",
	);
	assertEqual(
		terrainImport.source.collisionStableIds.length,
		16,
		"Expected editor terrain import to normalize all collision chunk stable IDs.",
	);
	assertIncludes(
		terrainImport.source.collisionStableIds,
		firstObservatoryWalkableChunkStableId,
		"Expected editor terrain import to expose collision stable ID chunk linkage.",
	);
	assertEqual(
		terrainImport.output.meshAssetId,
		"mesh_observatory_field_micro_displacement",
		"Expected editor terrain import to expose runtime mesh asset target.",
	);
	assertEqual(
		terrainImport.output.prefabId,
		"observatory_field_visual_terrain",
		"Expected editor terrain import to expose runtime prefab target.",
	);
	assertEqual(
		terrainImport.output.stableId,
		"observatory:terrain:visual-field",
		"Expected editor terrain import to expose runtime stable ID target.",
	);
	assertEqual(
		terrainImport.alignment.renderUsesCollisionAsImplicitCollision,
		false,
		"Editor terrain status must not claim render geometry owns collision.",
	);
	assertEqual(
		terrainImport.alignment.collisionGridSize,
		17,
		"Expected editor terrain status to expose collision grid size.",
	);
	assertEqual(
		terrainImport.alignment.visualGridSize,
		65,
		"Expected editor terrain status to expose visual grid size.",
	);
	assertEqual(
		terrainImport.alignment.collisionTriangleCount,
		512,
		"Expected editor terrain status to expose collision triangle count.",
	);
	assertEqual(
		terrainImport.alignment.visualTriangleCount,
		8192,
		"Expected editor terrain status to expose visual triangle count.",
	);
	assertEqual(
		terrainImport.alignment.microDisplacementAmplitude,
		0.055,
		"Expected editor terrain status to expose micro displacement amplitude.",
	);
	assertEqual(
		terrainImport.alignment.maxCollisionSampleError,
		0,
		"Expected editor terrain status to expose zero collision sample drift.",
	);
	assertEqual(
		terrainImport.alignment.anchorSampleCount,
		5,
		"Expected editor terrain status to expose sampled collision anchors.",
	);
	assertEqual(
		terrainImport.readiness.imported,
		true,
		"Expected editor terrain readiness to mark import as ready.",
	);
	assertEqual(
		terrainImport.readiness.hasArtifactProvenance,
		true,
		"Expected editor terrain readiness to mark provenance as ready.",
	);
	assertEqual(
		terrainImport.readiness.hasTargetRuntimeIds,
		true,
		"Expected editor terrain readiness to mark target runtime IDs as ready.",
	);
	assertEqual(
		terrainImport.readiness.collisionLinked,
		true,
		"Expected editor terrain readiness to mark collision linkage as ready.",
	);
	assertEqual(
		terrainImport.readiness.visualOnly,
		true,
		"Expected editor terrain readiness to mark visual terrain as visual-only.",
	);

	const terrainChunk = terrainStatusChunk(
		firstObservatoryWalkableChunkStableId,
	);

	assertEqual(
		terrainChunk.geometry.vertexCount,
		25,
		"Expected walkable terrain chunk vertex count to be exposed.",
	);
	assertEqual(
		terrainChunk.geometry.indexCount,
		96,
		"Expected walkable terrain chunk index count to be exposed.",
	);
	assertEqual(
		terrainChunk.geometry.triangleCount,
		32,
		"Expected walkable terrain chunk triangle count to be exposed.",
	);
	assertEqual(
		terrainChunk.geometry.gridSize,
		5,
		"Expected walkable terrain chunk grid size to be derived.",
	);
	assertEqual(
		terrainChunk.geometry.cellSize,
		40,
		"Expected walkable terrain chunk cell size to be derived.",
	);
	assertEqual(
		terrainChunk.geometry.halfExtent,
		80,
		"Expected walkable terrain chunk half extent to be derived.",
	);

	if (!terrainChunk.geometry.heightRange) {
		throw new Error("Expected walkable terrain chunk height range.");
	}

	assertEqual(
		terrainChunk.geometry.heightRange.min,
		1.4,
		"Unexpected walkable terrain chunk minimum height.",
	);
	assertEqual(
		terrainChunk.geometry.heightRange.max,
		1.67,
		"Unexpected walkable terrain chunk maximum height.",
	);

	const boundaryChunk = terrainStatusChunk(
		"observatory:collision:boundary:north",
	);

	assertVector(
		boundaryChunk.geometry.halfExtents ?? [0, 0, 0],
		[320, 4, 4],
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
