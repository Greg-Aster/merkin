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

assertEqual(
	overlay.entries.length,
	5,
	"Expected Observatory collision overlay to expose 5 draft entries.",
);

assertOverlayEntry("observatory:walkable-mesh", {
	shapeType: "mesh",
	intent: "walkable",
	channel: "worldStatic",
	requiredCollision: true,
	requiredWalkable: true,
	min: [-320, 1.4, -320],
	max: [320, 2.44, 320],
	center: [0, 1.92, 0],
	size: [640, 1.04, 640],
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

	const walkableMesh = editorEntry("observatory:walkable-mesh");

	assertEqual(
		walkableMesh.selected,
		true,
		"Expected the walkable mesh to remain the default selected stable ID.",
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
		289,
		"Unexpected walkable mesh vertex count in editor session.",
	);
	assertEqual(
		walkableMesh.meshMetadata.indexCount,
		1536,
		"Unexpected walkable mesh index count in editor session.",
	);
	assertEqual(
		walkableMesh.meshMetadata.triangleCount,
		512,
		"Unexpected walkable mesh triangle count in editor session.",
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
