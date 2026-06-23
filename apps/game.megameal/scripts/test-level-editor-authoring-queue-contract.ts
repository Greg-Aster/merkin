import {
	createLevelEditorAuthoringQueue,
	levelEditorAuthoringQueueHistoryLimit,
	queuedLevelEditorAuthoringSaveOperations,
	redoLevelEditorAuthoringQueue,
	stageLevelEditorAuthoringOperations,
	stageLevelEditorFieldEdit,
	undoLevelEditorAuthoringQueue,
} from "../src/app/editor/levelEditorAuthoringStore.js";
import type { LevelEditorStagedFieldEdit } from "../src/app/editor/levelEditorWorkspaceUi.js";
import type { LevelEditorAuthoringOperationData } from "../src/game/editor/authoring/saveTransaction.js";

const firstFieldEdit = {
	stableId: "player",
	path: "Transform.position.x",
	label: "Position X",
	before: 0,
	after: 1,
} satisfies LevelEditorStagedFieldEdit;
const secondFieldEdit = {
	...firstFieldEdit,
	after: 2,
} satisfies LevelEditorStagedFieldEdit;

const initialQueue = createLevelEditorAuthoringQueue();

assertEqual(initialQueue.dirtyCount, 0, "Expected a new queue to be clean.");
assertEqual(initialQueue.canUndo, false, "Expected a new queue to block undo.");
assertEqual(initialQueue.canRedo, false, "Expected a new queue to block redo.");
assertEqual(
	initialQueue.undoDepth,
	0,
	"Expected a new queue to have no undo history.",
);
assertEqual(
	initialQueue.redoDepth,
	0,
	"Expected a new queue to have no redo history.",
);
assertEqual(
	initialQueue.historyLimit,
	levelEditorAuthoringQueueHistoryLimit,
	"Expected queue instances to expose the bounded history limit.",
);

const firstEditQueue = stageLevelEditorFieldEdit(initialQueue, firstFieldEdit);

assertEqual(
	firstEditQueue.stagedFieldEditCount,
	1,
	"Expected staging a field edit to mark one staged field.",
);
assertEqual(firstEditQueue.canUndo, true, "Expected staging to enable undo.");
assertEqual(firstEditQueue.canRedo, false, "Expected staging to clear redo.");
assertEqual(
	firstEditQueue.undoDepth,
	1,
	"Expected staging to add one undo snapshot.",
);

const cleanUndoQueue = undoLevelEditorAuthoringQueue(firstEditQueue);

assertEqual(
	cleanUndoQueue.stagedFieldEditCount,
	0,
	"Expected undo to restore the clean field-edit snapshot.",
);
assertEqual(
	cleanUndoQueue.canUndo,
	false,
	"Expected undoing the first edit to exhaust undo.",
);
assertEqual(cleanUndoQueue.canRedo, true, "Expected undoing to enable redo.");
assertEqual(
	cleanUndoQueue.redoDepth,
	1,
	"Expected undoing to add one redo snapshot.",
);

const restoredEditQueue = redoLevelEditorAuthoringQueue(cleanUndoQueue);

assertEqual(
	restoredEditQueue.stagedFieldEdits[0]?.after,
	1,
	"Expected redo to restore the staged field edit value.",
);
assertEqual(
	restoredEditQueue.canUndo,
	true,
	"Expected redo to restore undo capability.",
);
assertEqual(
	restoredEditQueue.canRedo,
	false,
	"Expected redo to consume redo history.",
);

const queuedSaveOperation = {
	kind: "replace-level-instance",
	ownerKind: "level",
	ownerTargetId: "portal_arena_runtime:level",
	subjectId: "player",
	payload: {
		operation: {
			kind: "set-transform",
			stableId: "player",
			transform: {
				position: {
					x: 2,
				},
			},
		},
	},
} satisfies LevelEditorAuthoringOperationData;
const queuedOperationQueue = stageLevelEditorAuthoringOperations(
	restoredEditQueue,
	{
		id: "history-test-save-operation",
		label: "History test save operation",
		saveOperations: [queuedSaveOperation],
	},
);

assertEqual(
	queuedOperationQueue.queuedOperationEntryCount,
	1,
	"Expected queued save operations to enter authoring queue history.",
);
assertEqual(
	queuedOperationQueue.operationCount,
	1,
	"Expected queued save operations to count as an authoring operation.",
);
assertEqual(
	queuedOperationQueue.undoDepth,
	2,
	"Expected queued operations to add a second undo snapshot.",
);

const fieldOnlyQueue = undoLevelEditorAuthoringQueue(queuedOperationQueue);

assertEqual(
	fieldOnlyQueue.stagedFieldEditCount,
	1,
	"Expected undoing a queued operation to preserve the prior field-edit snapshot.",
);
assertEqual(
	fieldOnlyQueue.queuedOperationEntryCount,
	0,
	"Expected undoing a queued operation to remove only that queued entry.",
);

const restoredOperationQueue = redoLevelEditorAuthoringQueue(fieldOnlyQueue);

assertEqual(
	queuedLevelEditorAuthoringSaveOperations(restoredOperationQueue)[0]
		?.subjectId,
	"player",
	"Expected redo to restore queued save operations.",
);

const divergentQueue = stageLevelEditorFieldEdit(
	fieldOnlyQueue,
	secondFieldEdit,
);

assertEqual(
	divergentQueue.canRedo,
	false,
	"Expected staging after undo to clear redo history.",
);
assertEqual(
	divergentQueue.stagedFieldEdits[0]?.after,
	2,
	"Expected divergent staging to commit the new field value.",
);

let boundedQueue = createLevelEditorAuthoringQueue();
for (
	let index = 0;
	index < levelEditorAuthoringQueueHistoryLimit + 8;
	index += 1
) {
	boundedQueue = stageLevelEditorFieldEdit(boundedQueue, {
		...firstFieldEdit,
		after: index + 1,
	});
}

assertEqual(
	boundedQueue.undoDepth,
	levelEditorAuthoringQueueHistoryLimit,
	"Expected staged authoring history to stay bounded.",
);

console.log(
	`Level editor authoring queue contract passed with ${boundedQueue.undoDepth} retained undo snapshots.`,
);

function assertEqual<T>(actual: T, expected: T, message: string): void {
	if (actual !== expected) {
		throw new Error(
			`${message} Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
		);
	}
}
