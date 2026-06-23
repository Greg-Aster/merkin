import type {
	LevelEditorAuthoringEditOperation,
	LevelEditorAuthoringTransaction,
} from "../../engine/data/levelAuthoring/index.js";
import type { LevelEditorAuthoringOperationData } from "../../game/editor/authoring/saveTransaction.js";
import type { LevelEditorWorkspaceModel } from "./levelEditorWorkspaceModel.js";
import {
	type LevelEditorStagedFieldEdit,
	buildWorkspaceAuthoringTransaction,
	fieldEditKey,
	upsertStagedFieldEdit,
} from "./levelEditorWorkspaceUi.js";

export type LevelEditorQueuedAuthoringOperation = {
	readonly id: string;
	readonly label?: string;
	readonly operations?: readonly LevelEditorAuthoringEditOperation[];
	readonly saveOperations?: readonly LevelEditorAuthoringOperationData[];
};

export type LevelEditorAuthoringOperationInput =
	| LevelEditorAuthoringEditOperation
	| readonly LevelEditorAuthoringEditOperation[]
	| LevelEditorQueuedAuthoringOperation;

export type LevelEditorAuthoringQueueSnapshot = {
	readonly stagedFieldEdits: readonly LevelEditorStagedFieldEdit[];
	readonly queuedOperations: readonly LevelEditorQueuedAuthoringOperation[];
};

export type LevelEditorAuthoringQueueState =
	LevelEditorAuthoringQueueSnapshot & {
		readonly dirtyCount: number;
		readonly stagedFieldEditCount: number;
		readonly queuedOperationEntryCount: number;
		readonly operationCount: number;
		readonly canUndo: boolean;
		readonly canRedo: boolean;
		readonly undoDepth: number;
		readonly redoDepth: number;
		readonly historyLimit: number;
		readonly undoSnapshots: readonly LevelEditorAuthoringQueueSnapshot[];
		readonly redoSnapshots: readonly LevelEditorAuthoringQueueSnapshot[];
	};

export type LevelEditorAuthoringQueueSeed =
	Partial<LevelEditorAuthoringQueueSnapshot> & {
		readonly operationInputs?: readonly LevelEditorAuthoringOperationInput[];
	};

export const levelEditorAuthoringQueueHistoryLimit = 64;

export function createLevelEditorAuthoringQueue(
	seed: LevelEditorAuthoringQueueSeed = {},
): LevelEditorAuthoringQueueState {
	return createQueueState({
		stagedFieldEdits: seed.stagedFieldEdits ?? [],
		queuedOperations: [
			...(seed.queuedOperations ?? []),
			...(seed.operationInputs ?? []).map((input) =>
				authoringOperationInputToQueueEntry(input),
			),
		],
	});
}

export function snapshotLevelEditorAuthoringQueue(
	state: LevelEditorAuthoringQueueSnapshot,
): LevelEditorAuthoringQueueSnapshot {
	return normalizeQueueSnapshot(state);
}

export function restoreLevelEditorAuthoringQueueSnapshot(
	snapshot: LevelEditorAuthoringQueueSnapshot,
): LevelEditorAuthoringQueueState {
	return createQueueState(snapshot);
}

export function stageLevelEditorFieldEdit(
	state: LevelEditorAuthoringQueueState,
	edit: LevelEditorStagedFieldEdit,
): LevelEditorAuthoringQueueState {
	return commitQueueSnapshot(state, {
		stagedFieldEdits: upsertStagedFieldEdit(state.stagedFieldEdits, edit),
		queuedOperations: state.queuedOperations,
	});
}

export function removeLevelEditorStagedFieldEdit(
	state: LevelEditorAuthoringQueueState,
	stableId: string,
	path: string,
): LevelEditorAuthoringQueueState {
	const key = fieldEditKey(stableId, path);

	return commitQueueSnapshot(state, {
		stagedFieldEdits: state.stagedFieldEdits.filter(
			(edit) => fieldEditKey(edit.stableId, edit.path) !== key,
		),
		queuedOperations: state.queuedOperations,
	});
}

export function stageLevelEditorAuthoringOperations(
	state: LevelEditorAuthoringQueueState,
	input: LevelEditorAuthoringOperationInput,
): LevelEditorAuthoringQueueState {
	const entry = authoringOperationInputToQueueEntry(input);

	return commitQueueSnapshot(state, {
		stagedFieldEdits: state.stagedFieldEdits,
		queuedOperations: [
			...state.queuedOperations.filter((item) => item.id !== entry.id),
			entry,
		],
	});
}

export function removeLevelEditorAuthoringOperationEntry(
	state: LevelEditorAuthoringQueueState,
	entryId: string,
): LevelEditorAuthoringQueueState {
	return commitQueueSnapshot(state, {
		stagedFieldEdits: state.stagedFieldEdits,
		queuedOperations: state.queuedOperations.filter(
			(entry) => entry.id !== entryId,
		),
	});
}

export function clearLevelEditorAuthoringQueue(
	state: LevelEditorAuthoringQueueState,
): LevelEditorAuthoringQueueState {
	return commitQueueSnapshot(state, {
		stagedFieldEdits: [],
		queuedOperations: [],
	});
}

export function undoLevelEditorAuthoringQueue(
	state: LevelEditorAuthoringQueueState,
): LevelEditorAuthoringQueueState {
	const previous = state.undoSnapshots.at(-1);

	if (previous === undefined) {
		return state;
	}

	return createQueueState(previous, {
		undoSnapshots: state.undoSnapshots.slice(0, -1),
		redoSnapshots: [
			snapshotLevelEditorAuthoringQueue(state),
			...state.redoSnapshots,
		].slice(0, state.historyLimit),
	});
}

export function redoLevelEditorAuthoringQueue(
	state: LevelEditorAuthoringQueueState,
): LevelEditorAuthoringQueueState {
	const next = state.redoSnapshots[0];

	if (next === undefined) {
		return state;
	}

	return createQueueState(next, {
		undoSnapshots: [
			...state.undoSnapshots,
			snapshotLevelEditorAuthoringQueue(state),
		].slice(-state.historyLimit),
		redoSnapshots: state.redoSnapshots.slice(1),
	});
}

export function queuedLevelEditorAuthoringOperations(
	state: LevelEditorAuthoringQueueSnapshot,
): readonly LevelEditorAuthoringEditOperation[] {
	return state.queuedOperations.flatMap((entry) =>
		cloneJson(entry.operations ?? []),
	);
}

export function queuedLevelEditorAuthoringSaveOperations(
	state: LevelEditorAuthoringQueueSnapshot,
): readonly LevelEditorAuthoringOperationData[] {
	return state.queuedOperations.flatMap((entry) =>
		cloneJson(entry.saveOperations ?? []),
	);
}

export function buildLevelEditorAuthoringTransactionFromQueue(options: {
	readonly workspace: LevelEditorWorkspaceModel;
	readonly queue: LevelEditorAuthoringQueueSnapshot;
	readonly transactionId: string;
	readonly createdAt: string;
}): LevelEditorAuthoringTransaction {
	const queue = snapshotLevelEditorAuthoringQueue(options.queue);

	if (options.workspace.authoring.documentContentHash === null) {
		throw new Error("Workspace authoring document is not available.");
	}

	const fieldEditOperations =
		queue.stagedFieldEdits.length === 0
			? []
			: buildWorkspaceAuthoringTransaction({
					workspace: options.workspace,
					edits: queue.stagedFieldEdits,
					transactionId: options.transactionId,
					createdAt: options.createdAt,
				}).operations;
	const operations = [
		...fieldEditOperations,
		...queuedLevelEditorAuthoringOperations(queue),
	];

	if (operations.length === 0) {
		throw new Error("Authoring queue has no staged edits or operations.");
	}

	assertSavedAuthoringOperations(operations);

	return {
		schemaVersion: 1,
		id: options.transactionId,
		runtimeSceneId: options.workspace.selectedRuntimeSceneId,
		baseDocumentHash: options.workspace.authoring.documentContentHash,
		createdAt: options.createdAt,
		persistence: "saved",
		operations,
	};
}

function commitQueueSnapshot(
	state: LevelEditorAuthoringQueueState,
	next: LevelEditorAuthoringQueueSnapshot,
): LevelEditorAuthoringQueueState {
	const current = snapshotLevelEditorAuthoringQueue(state);
	const normalizedNext = normalizeQueueSnapshot(next);

	if (sameQueueSnapshot(current, normalizedNext)) {
		return state;
	}

	return createQueueState(normalizedNext, {
		undoSnapshots: [...state.undoSnapshots, current].slice(-state.historyLimit),
		redoSnapshots: [],
	});
}

function createQueueState(
	snapshot: LevelEditorAuthoringQueueSnapshot,
	history: {
		readonly undoSnapshots?: readonly LevelEditorAuthoringQueueSnapshot[];
		readonly redoSnapshots?: readonly LevelEditorAuthoringQueueSnapshot[];
	} = {},
): LevelEditorAuthoringQueueState {
	const normalized = normalizeQueueSnapshot(snapshot);
	const undoSnapshots = (history.undoSnapshots ?? []).map((item) =>
		normalizeQueueSnapshot(item),
	);
	const redoSnapshots = (history.redoSnapshots ?? []).map((item) =>
		normalizeQueueSnapshot(item),
	);
	const operationCount = countQueuedAuthoringOperations(
		normalized.queuedOperations,
	);

	return {
		...normalized,
		dirtyCount:
			normalized.stagedFieldEdits.length + normalized.queuedOperations.length,
		stagedFieldEditCount: normalized.stagedFieldEdits.length,
		queuedOperationEntryCount: normalized.queuedOperations.length,
		operationCount,
		canUndo: undoSnapshots.length > 0,
		canRedo: redoSnapshots.length > 0,
		undoDepth: undoSnapshots.length,
		redoDepth: redoSnapshots.length,
		historyLimit: levelEditorAuthoringQueueHistoryLimit,
		undoSnapshots,
		redoSnapshots,
	};
}

function normalizeQueueSnapshot(
	snapshot: LevelEditorAuthoringQueueSnapshot,
): LevelEditorAuthoringQueueSnapshot {
	return {
		stagedFieldEdits: [...snapshot.stagedFieldEdits]
			.map(cloneFieldEdit)
			.sort((left, right) =>
				fieldEditKey(left.stableId, left.path).localeCompare(
					fieldEditKey(right.stableId, right.path),
				),
			),
		queuedOperations: snapshot.queuedOperations.map(normalizeQueueEntry),
	};
}

function normalizeQueueEntry(
	entry: LevelEditorQueuedAuthoringOperation,
): LevelEditorQueuedAuthoringOperation {
	const operations =
		entry.operations === undefined ? undefined : cloneJson(entry.operations);
	const saveOperations = cloneJson(entry.saveOperations ?? []);

	if (operations !== undefined) {
		assertSavedAuthoringOperations(operations);
	}

	if ((operations?.length ?? 0) === 0 && saveOperations.length === 0) {
		throw new Error(`Queued authoring operation "${entry.id}" is empty.`);
	}

	return {
		id: entry.id,
		...(entry.label === undefined ? {} : { label: entry.label }),
		...(operations === undefined ? {} : { operations }),
		...(saveOperations.length === 0 ? {} : { saveOperations }),
	};
}

function authoringOperationInputToQueueEntry(
	input: LevelEditorAuthoringOperationInput,
): LevelEditorQueuedAuthoringOperation {
	if (isAuthoringOperationArray(input)) {
		return normalizeQueueEntry({
			id: queueEntryIdForOperations(input),
			operations: input,
		});
	}

	if (isQueuedAuthoringOperationInput(input)) {
		return normalizeQueueEntry(input);
	}

	return normalizeQueueEntry({
		id: input.id,
		operations: [input],
	});
}

function isAuthoringOperationArray(
	input: LevelEditorAuthoringOperationInput,
): input is readonly LevelEditorAuthoringEditOperation[] {
	return Array.isArray(input);
}

function isQueuedAuthoringOperationInput(
	input: LevelEditorAuthoringOperationInput,
): input is LevelEditorQueuedAuthoringOperation {
	return (
		!Array.isArray(input) &&
		("operations" in input || "saveOperations" in input)
	);
}

function countQueuedAuthoringOperations(
	queuedOperations: readonly LevelEditorQueuedAuthoringOperation[],
): number {
	return queuedOperations.reduce(
		(count, entry) =>
			count +
			((entry.saveOperations?.length ?? 0) > 0
				? entry.saveOperations?.length ?? 0
				: entry.operations?.length ?? 0),
		0,
	);
}

function assertSavedAuthoringOperations(
	operations: readonly LevelEditorAuthoringEditOperation[],
): void {
	for (const operation of operations) {
		if (operation.persistence !== "saved") {
			throw new Error(
				`Authoring operation "${operation.id}" must use persistence "saved".`,
			);
		}
	}
}

function queueEntryIdForOperations(
	operations: readonly LevelEditorAuthoringEditOperation[],
): string {
	if (operations.length === 0) {
		throw new Error("Queued authoring operation input is empty.");
	}

	return operations.map((operation) => operation.id).join("|");
}

function cloneFieldEdit(
	edit: LevelEditorStagedFieldEdit,
): LevelEditorStagedFieldEdit {
	return {
		stableId: edit.stableId,
		path: edit.path,
		label: edit.label,
		before: edit.before,
		after: edit.after,
	};
}

function sameQueueSnapshot(
	left: LevelEditorAuthoringQueueSnapshot,
	right: LevelEditorAuthoringQueueSnapshot,
): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

function cloneJson<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}
