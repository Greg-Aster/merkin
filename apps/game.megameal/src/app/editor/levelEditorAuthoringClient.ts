import type { LevelEditorAuthoringEditOperation } from "../../engine/data/levelAuthoring/index.js";
import type {
	LevelEditorAuthoringOperationData,
	LevelEditorAuthoringSaveTargetData,
	LevelEditorAuthoringSaveTransactionData,
} from "../../game/editor/authoring/saveTransaction.js";
import {
	type LevelEditorQueuedAuthoringOperation,
	queuedLevelEditorAuthoringSaveOperations,
} from "./levelEditorAuthoringStore.js";
import type { LevelEditorWorkspaceModel } from "./levelEditorWorkspaceModel.js";
import type { LevelEditorStagedFieldEdit } from "./levelEditorWorkspaceUi.js";

const LEVEL_EDITOR_MISSING_FILE_HASH = "missing";

export type LevelEditorAuthoringCommandMode = "dry-run" | "save";

export type LevelEditorAuthoringStatus = {
	readonly runtimeSceneId: string;
	readonly targetId: string;
	readonly targetFile: string;
	readonly baseHash: string;
	readonly exists: boolean;
};

export type LevelEditorAuthoringCommandResult = {
	readonly ok: boolean;
	readonly dryRun: boolean;
	readonly message: string;
	readonly writePlanContentHash?: string;
	readonly artifacts?: readonly {
		readonly targetId: string;
		readonly targetFile: string;
		readonly currentHash: string;
		readonly contentHash: string;
		readonly wroteFile: boolean;
	}[];
	readonly errors?: readonly string[];
};

export async function fetchLevelEditorAuthoringStatus(
	runtimeSceneId: string,
): Promise<LevelEditorAuthoringStatus> {
	const url = new URL(
		"/api/editor/authoring/status.json",
		globalThis.location.href,
	);
	url.searchParams.set("runtimeSceneId", runtimeSceneId);
	const response = await fetch(url);
	const payload = (await response.json()) as
		| LevelEditorAuthoringStatus
		| { readonly error?: string };

	if (!response.ok) {
		throw new Error(
			"error" in payload && payload.error
				? payload.error
				: `Authoring status failed with HTTP ${response.status}.`,
		);
	}

	return payload as LevelEditorAuthoringStatus;
}

export async function runLevelEditorAuthoringCommand(options: {
	readonly mode: LevelEditorAuthoringCommandMode;
	readonly workspace: LevelEditorWorkspaceModel;
	readonly edits: readonly LevelEditorStagedFieldEdit[];
	readonly queuedOperations?: readonly LevelEditorQueuedAuthoringOperation[];
	readonly baseHash?: string;
}): Promise<LevelEditorAuthoringCommandResult> {
	const transaction = buildAuthoringSaveTransaction({
		workspace: options.workspace,
		edits: options.edits,
		queuedOperations: options.queuedOperations ?? [],
		baseHash: options.baseHash ?? LEVEL_EDITOR_MISSING_FILE_HASH,
	});
	const response = await fetch("/api/editor/authoring/save.json", {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(
			{
				mode: options.mode,
				transaction,
			},
			null,
			2,
		),
	});
	const payload = (await response.json()) as LevelEditorAuthoringCommandResult;

	if (!response.ok) {
		return {
			ok: false,
			dryRun: options.mode === "dry-run",
			message:
				payload.message ??
				`Authoring save failed with HTTP ${response.status}.`,
			...(payload.errors === undefined ? {} : { errors: payload.errors }),
		};
	}

	return payload;
}

export function buildAuthoringSaveTransaction(options: {
	readonly workspace: LevelEditorWorkspaceModel;
	readonly edits: readonly LevelEditorStagedFieldEdit[];
	readonly queuedOperations?: readonly LevelEditorQueuedAuthoringOperation[];
	readonly baseHash?: string;
}): LevelEditorAuthoringSaveTransactionData {
	const operations = [
		...buildAuthoringOperations(options.workspace, options.edits),
		...queuedAuthoringSaveOperations(
			options.workspace,
			options.queuedOperations ?? [],
		),
	];
	const targetId = `${options.workspace.selectedRuntimeSceneId}:generated:authoring-save`;
	const target = {
		targetId,
		baseHash: options.baseHash ?? LEVEL_EDITOR_MISSING_FILE_HASH,
		operations,
	} satisfies LevelEditorAuthoringSaveTargetData;

	return {
		schemaVersion: 1,
		transactionId: createTransactionId(
			options.workspace.selectedRuntimeSceneId,
		),
		runtimeSceneId: options.workspace.selectedRuntimeSceneId,
		authoringValidation: {
			status: "valid",
			contract: "LevelEditorAuthoringContract",
			contentHash: authoringValidationHash(
				options.workspace,
				options.edits,
				options.queuedOperations ?? [],
			),
		},
		targets: [target],
	};
}

function queuedAuthoringSaveOperations(
	workspace: LevelEditorWorkspaceModel,
	queuedOperations: readonly LevelEditorQueuedAuthoringOperation[],
): readonly LevelEditorAuthoringOperationData[] {
	const snapshot = {
		stagedFieldEdits: [],
		queuedOperations,
	};

	return [
		...queuedLevelEditorAuthoringSaveOperations(snapshot),
		...queuedOperations.flatMap((entry) =>
			(entry.saveOperations?.length ?? 0) > 0
				? []
				: (entry.operations ?? []).map((operation) =>
						saveOperationForAuthoringOperation(workspace, operation),
					),
		),
	];
}

function saveOperationForAuthoringOperation(
	workspace: LevelEditorWorkspaceModel,
	operation: LevelEditorAuthoringEditOperation,
): LevelEditorAuthoringOperationData {
	switch (operation.kind) {
		case "insert-instance":
			return {
				kind: "insert-level-instance",
				ownerKind: "level",
				ownerTargetId: `${workspace.selectedRuntimeSceneId}:level`,
				subjectId: operation.instance.stableId ?? operation.instance.id,
				payload: {
					operation,
					instance: operation.instance,
				},
			};
		case "remove-instance":
			return {
				kind: "remove-level-instance",
				ownerKind: "level",
				ownerTargetId: `${workspace.selectedRuntimeSceneId}:level`,
				subjectId: operation.stableId,
				payload: { operation },
			};
		case "replace-prefab":
			return {
				kind: "replace-level-instance",
				ownerKind: "level",
				ownerTargetId: `${workspace.selectedRuntimeSceneId}:level`,
				subjectId: operation.stableId,
				payload: { operation },
			};
		case "set-component":
		case "remove-component":
		case "set-portal-target":
		case "set-transform": {
			const ownerKind =
				"target" in operation && operation.target === "prefab"
					? "prefab"
					: "level";

			return {
				kind:
					ownerKind === "prefab" ? "replace-prefab" : "replace-level-instance",
				ownerKind,
				ownerTargetId: `${workspace.selectedRuntimeSceneId}:${
					ownerKind === "prefab" ? "prefabs" : "level"
				}`,
				subjectId: operation.stableId,
				payload: { operation },
			};
		}
	}
}

function buildAuthoringOperations(
	workspace: LevelEditorWorkspaceModel,
	edits: readonly LevelEditorStagedFieldEdit[],
): readonly LevelEditorAuthoringOperationData[] {
	const editsByStableId = new Map<string, LevelEditorStagedFieldEdit[]>();

	for (const edit of edits) {
		const item = editsByStableId.get(edit.stableId) ?? [];
		item.push(edit);
		editsByStableId.set(edit.stableId, item);
	}

	return [...editsByStableId.entries()].map(([stableId, stableEdits]) => {
		const object = workspace.objects.find(
			(candidate) => candidate.stableId === stableId,
		);
		const payload = {
			stableId,
			prefabId: object?.prefabId ?? null,
			category: object?.category ?? null,
			fieldEdits: stableEdits.map((edit) => ({
				path: edit.path,
				before: edit.before,
				after: edit.after,
			})),
		};

		return {
			kind: "replace-level-instance",
			ownerKind: "level",
			ownerTargetId: `${workspace.selectedRuntimeSceneId}:level`,
			subjectId: stableId,
			payload,
		} satisfies LevelEditorAuthoringOperationData;
	});
}

function createTransactionId(runtimeSceneId: string): string {
	return `editor-save:${runtimeSceneId}:${new Date().toISOString()}:${Math.random()
		.toString(36)
		.slice(2, 10)}`;
}

function authoringValidationHash(
	workspace: LevelEditorWorkspaceModel,
	edits: readonly LevelEditorStagedFieldEdit[],
	queuedOperations: readonly LevelEditorQueuedAuthoringOperation[] = [],
): string {
	let hash = 2166136261;
	const input = JSON.stringify({
		runtimeSceneId: workspace.selectedRuntimeSceneId,
		levelId: workspace.selectedLevelId,
		edits,
		queuedOperations,
	});

	for (let index = 0; index < input.length; index += 1) {
		hash ^= input.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
