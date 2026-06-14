import {
	cloneValue,
	hashStableValue,
	serializeStableValue,
} from "./stableValue.js";
import {
	LEVEL_EDITOR_AUTHORING_CONTRACT,
	type LevelEditorAuthoringDocument,
	type LevelEditorAuthoringEditOperation,
	type LevelEditorAuthoringOwnerProvenance,
	type LevelEditorAuthoringTransaction,
	type LevelEditorAuthoringWriteArtifact,
	type LevelEditorAuthoringWriteArtifactPayload,
	type LevelEditorAuthoringWriteArtifactPurpose,
	type LevelEditorAuthoringWritePlan,
} from "./types.js";
import { validateLevelEditorAuthoringTransaction } from "./validation.js";

export function buildLevelEditorAuthoringWritePlan(
	authoringDoc: LevelEditorAuthoringDocument,
	transaction: LevelEditorAuthoringTransaction,
): LevelEditorAuthoringWritePlan {
	const validation = validateLevelEditorAuthoringTransaction(
		authoringDoc,
		transaction,
	);

	if (!validation.ok) {
		throw new Error(
			`Invalid level editor authoring transaction:\n${validation.errors.join("\n")}`,
		);
	}

	if (transaction.persistence !== "saved") {
		throw new Error(
			`Level editor authoring write plans require saved transactions; received "${transaction.persistence}".`,
		);
	}

	const clonedTransaction = cloneValue(transaction);
	const sourceTransactionHash = hashStableValue(clonedTransaction);
	const artifacts = buildArtifacts({
		authoringDoc,
		transaction: clonedTransaction,
	});
	const provenance = {
		sourceDocumentHash: authoringDoc.contentHash,
		sourceTransactionHash,
		hashAlgorithm: "fnv1a32" as const,
	};
	const contentHash = hashStableValue({
		artifacts: artifacts.map((artifact) => ({
			id: artifact.id,
			targetFile: artifact.targetFile,
			exportName: artifact.exportName,
			purpose: artifact.purpose,
			contentHash: artifact.contentHash,
		})),
		provenance,
	});

	return {
		schemaVersion: 1,
		generator: "levelAuthoring.writePlan.v1",
		contract: LEVEL_EDITOR_AUTHORING_CONTRACT,
		writeMode: "dry-run",
		writesFiles: false,
		transactionId: transaction.id,
		runtimeSceneId: authoringDoc.runtimeSceneId,
		levelId: authoringDoc.levelId,
		baseDocumentHash: authoringDoc.contentHash,
		provenance,
		artifacts,
		contentHash,
	};
}

export function serializeLevelEditorAuthoringWritePlan(
	writePlan: LevelEditorAuthoringWritePlan,
): string {
	return serializeStableValue(writePlan);
}

function buildArtifacts(options: {
	readonly authoringDoc: LevelEditorAuthoringDocument;
	readonly transaction: LevelEditorAuthoringTransaction;
}): readonly LevelEditorAuthoringWriteArtifact[] {
	const { authoringDoc, transaction } = options;
	const levelOperations = transaction.operations.filter(isLevelOperation);
	const prefabOperations = transaction.operations.filter(isPrefabOperation);
	const artifacts: LevelEditorAuthoringWriteArtifact[] = [];

	if (levelOperations.length > 0) {
		artifacts.push(
			createArtifact({
				authoringDoc,
				transaction,
				owner: authoringDoc.provenance.level,
				purpose: "level-instances",
				operations: levelOperations,
			}),
		);
	}

	if (prefabOperations.length > 0) {
		artifacts.push(
			createArtifact({
				authoringDoc,
				transaction,
				owner: authoringDoc.provenance.prefabs,
				purpose: "prefab-components",
				operations: prefabOperations,
			}),
		);
	}

	return artifacts;
}

function createArtifact(options: {
	readonly authoringDoc: LevelEditorAuthoringDocument;
	readonly transaction: LevelEditorAuthoringTransaction;
	readonly owner: LevelEditorAuthoringOwnerProvenance;
	readonly purpose: LevelEditorAuthoringWriteArtifactPurpose;
	readonly operations: readonly LevelEditorAuthoringEditOperation[];
}): LevelEditorAuthoringWriteArtifact {
	const payload = {
		schemaVersion: 1,
		transactionId: options.transaction.id,
		runtimeSceneId: options.authoringDoc.runtimeSceneId,
		levelId: options.authoringDoc.levelId,
		ownerId: options.owner.ownerId,
		operations: cloneValue(options.operations),
	} satisfies LevelEditorAuthoringWriteArtifactPayload;
	const serializedPayload = serializeStableValue(payload);
	const contentHash = hashStableValue(payload);

	return {
		id: `${options.transaction.id}:${options.purpose}`,
		targetFile: options.owner.targetFile,
		exportName: options.owner.exportName,
		ownerId: options.owner.ownerId,
		purpose: options.purpose,
		format: "json",
		payload,
		serializedPayload,
		contentHash,
	};
}

function isLevelOperation(
	operation: LevelEditorAuthoringEditOperation,
): boolean {
	switch (operation.kind) {
		case "set-transform":
		case "insert-instance":
		case "remove-instance":
		case "replace-prefab":
		case "set-portal-target":
			return true;
		case "set-component":
		case "remove-component":
			return operation.target === "level-instance";
	}
}

function isPrefabOperation(
	operation: LevelEditorAuthoringEditOperation,
): boolean {
	switch (operation.kind) {
		case "set-transform":
		case "insert-instance":
		case "remove-instance":
		case "replace-prefab":
		case "set-portal-target":
			return false;
		case "set-component":
		case "remove-component":
			return operation.target === "prefab";
	}
}
