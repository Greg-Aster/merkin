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
import {
	type LevelEditorStagedFieldEdit,
	buildWorkspaceAuthoringTransaction,
} from "./levelEditorWorkspaceUi.js";

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
		readonly changedStableIds?: readonly string[];
	}[];
	readonly validationGates?: readonly {
		readonly scriptName: string;
		readonly ok: boolean;
		readonly output: string;
	}[];
	readonly errors?: readonly string[];
};

export async function fetchLevelEditorAuthoringStatus(
	runtimeSceneId: string,
	target:
		| "authoring-save"
		| "level"
		| "published-transforms" = "authoring-save",
): Promise<LevelEditorAuthoringStatus> {
	const url = new URL(
		"/api/editor/authoring/status.json",
		globalThis.location.href,
	);
	url.searchParams.set("runtimeSceneId", runtimeSceneId);
	url.searchParams.set("target", target);
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
	readonly target?: "draft" | "level" | "publish";
}): Promise<LevelEditorAuthoringCommandResult> {
	const transaction = buildAuthoringSaveTransaction({
		workspace: options.workspace,
		edits: options.edits,
		queuedOperations: options.queuedOperations ?? [],
		baseHash: options.baseHash ?? LEVEL_EDITOR_MISSING_FILE_HASH,
	});
	const target = options.target ?? "draft";
	const response = await fetch(
		target === "publish"
			? "/api/editor/authoring/publish-local.json"
			: target === "level"
				? "/api/editor/authoring/save-level.json"
				: "/api/editor/authoring/save.json",
		{
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify(
				{
					mode:
						target === "level" && options.mode === "save"
							? "save-level"
							: target === "publish" && options.mode === "save"
								? "publish-local"
								: options.mode,
					transaction,
					...(target === "level" || target === "publish"
						? {
								baseHash: options.baseHash ?? LEVEL_EDITOR_MISSING_FILE_HASH,
							}
						: {}),
				},
				null,
				2,
			),
		},
	);
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
	const transactionId = createTransactionId(
		options.workspace.selectedRuntimeSceneId,
	);
	const operations = [
		...stagedFieldEditSaveOperations({
			workspace: options.workspace,
			edits: options.edits,
			transactionId,
		}),
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
		transactionId,
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

function stagedFieldEditSaveOperations(options: {
	readonly workspace: LevelEditorWorkspaceModel;
	readonly edits: readonly LevelEditorStagedFieldEdit[];
	readonly transactionId: string;
}): readonly LevelEditorAuthoringOperationData[] {
	if (options.edits.length === 0) {
		return [];
	}

	return buildWorkspaceAuthoringTransaction({
		workspace: options.workspace,
		edits: options.edits,
		transactionId: options.transactionId,
		createdAt: new Date().toISOString(),
	}).operations.map((operation) =>
		saveOperationForAuthoringOperation(options.workspace, operation),
	);
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
