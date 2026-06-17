import { validateLevelDefinition } from "../schemas/index.js";
import {
	cloneValue,
	hashStableValue,
	serializeStableValue,
} from "./stableValue.js";
import {
	LEVEL_EDITOR_AUTHORING_CONTRACT,
	type LevelEditorAuthoringDocument,
	type LevelEditorAuthoringLevelTransformWrite,
	type LevelEditorAuthoringOwnerWriteArtifact,
	type LevelEditorAuthoringOwnerWriteArtifactPayload,
	type LevelEditorAuthoringOwnerWritePlan,
	type LevelEditorAuthoringOwnerWriteTarget,
	type LevelEditorAuthoringSourceSnapshot,
	type LevelEditorAuthoringTransaction,
} from "./types.js";
import { validateLevelEditorAuthoringTransaction } from "./validation.js";

export type BuildLevelEditorAuthoringOwnerWritePlanOptions = {
	readonly sourceSnapshot: LevelEditorAuthoringSourceSnapshot;
	readonly currentOwnerContentHashes?: Readonly<Record<string, string>>;
};

export function buildLevelEditorAuthoringOwnerWritePlan(
	authoringDoc: LevelEditorAuthoringDocument,
	transaction: LevelEditorAuthoringTransaction,
	options: BuildLevelEditorAuthoringOwnerWritePlanOptions,
): LevelEditorAuthoringOwnerWritePlan {
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
			`Level editor authoring owner write plans require saved transactions; received "${transaction.persistence}".`,
		);
	}

	validateSourceSnapshot(authoringDoc, options.sourceSnapshot);
	validateSupportedOperations(transaction);

	const ownerTarget = createOwnerWriteTarget({
		authoringDoc,
		currentOwnerContentHashes: options.currentOwnerContentHashes,
	});
	const transformWriteResult = applyLevelTransformWrites({
		level: options.sourceSnapshot.level,
		ownerId: ownerTarget.ownerId,
		transaction,
	});
	const levelErrors = validateLevelDefinition(transformWriteResult.level);

	if (levelErrors.length > 0) {
		throw new Error(
			`Level editor authoring owner write produced invalid LevelDefinition:\n${levelErrors.join("\n")}`,
		);
	}

	const clonedTransaction = cloneValue(transaction);
	const sourceTransactionHash = hashStableValue(clonedTransaction);
	const artifact = createLevelArtifact({
		authoringDoc,
		level: transformWriteResult.level,
		ownerTarget,
		transaction: clonedTransaction,
		writes: transformWriteResult.writes,
	});
	const provenance = {
		sourceDocumentHash: authoringDoc.contentHash,
		sourceTransactionHash,
		hashAlgorithm: "fnv1a32" as const,
	};
	const planBase = {
		schemaVersion: 1,
		generator: "levelAuthoring.ownerWritePlan.v1",
		contract: LEVEL_EDITOR_AUTHORING_CONTRACT,
		writeMode: "bounded-owner-write-plan",
		writesRuntimeData: true,
		writesFiles: false,
		supportedOperationKinds: ["set-transform"],
		transactionId: transaction.id,
		runtimeSceneId: authoringDoc.runtimeSceneId,
		levelId: authoringDoc.levelId,
		baseDocumentHash: authoringDoc.contentHash,
		provenance,
		ownerTargets: [ownerTarget],
		artifacts: [artifact],
		report: {
			changedFiles: [ownerTarget.targetFile],
			changedStableIds: transformWriteResult.writes.map(
				(write) => write.stableId,
			),
		},
	} satisfies Omit<LevelEditorAuthoringOwnerWritePlan, "contentHash">;

	return {
		...planBase,
		contentHash: hashStableValue(planBase),
	};
}

export function serializeLevelEditorAuthoringOwnerWritePlan(
	writePlan: LevelEditorAuthoringOwnerWritePlan,
): string {
	return serializeStableValue(writePlan);
}

function validateSourceSnapshot(
	authoringDoc: LevelEditorAuthoringDocument,
	sourceSnapshot: LevelEditorAuthoringSourceSnapshot,
): void {
	if (sourceSnapshot.manifest.id !== authoringDoc.runtimeSceneId) {
		throw new Error(
			`sourceSnapshot.manifest.id "${sourceSnapshot.manifest.id}" does not match authoringDoc runtimeSceneId "${authoringDoc.runtimeSceneId}".`,
		);
	}

	if (sourceSnapshot.level.id !== authoringDoc.levelId) {
		throw new Error(
			`sourceSnapshot.level.id "${sourceSnapshot.level.id}" does not match authoringDoc levelId "${authoringDoc.levelId}".`,
		);
	}
}

function validateSupportedOperations(
	transaction: LevelEditorAuthoringTransaction,
): void {
	const unsupportedOperation = transaction.operations.find(
		(operation) => operation.kind !== "set-transform",
	);

	if (!unsupportedOperation) {
		return;
	}

	throw new Error(
		`Unsupported level editor authoring owner write operation "${unsupportedOperation.kind}". Initial owner writes support set-transform only.`,
	);
}

function createOwnerWriteTarget(options: {
	readonly authoringDoc: LevelEditorAuthoringDocument;
	readonly currentOwnerContentHashes:
		| Readonly<Record<string, string>>
		| undefined;
}): LevelEditorAuthoringOwnerWriteTarget {
	const owner = options.authoringDoc.provenance.level;
	const currentBaseHash =
		options.currentOwnerContentHashes?.[owner.ownerId] ?? owner.contentHash;

	if (currentBaseHash !== owner.contentHash) {
		throw new Error(
			`Level editor authoring owner target "${owner.ownerId}" base hash mismatch: expected "${owner.contentHash}", found "${currentBaseHash}".`,
		);
	}

	return {
		schemaVersion: 1,
		ownerId: owner.ownerId,
		kind: "level",
		targetFile: owner.targetFile,
		exportName: owner.exportName,
		expectedBaseHash: owner.contentHash,
		currentBaseHash,
	};
}

function applyLevelTransformWrites(options: {
	readonly level: LevelEditorAuthoringSourceSnapshot["level"];
	readonly ownerId: string;
	readonly transaction: LevelEditorAuthoringTransaction;
}): {
	readonly level: LevelEditorAuthoringSourceSnapshot["level"];
	readonly writes: readonly LevelEditorAuthoringLevelTransformWrite[];
} {
	const writes: LevelEditorAuthoringLevelTransformWrite[] = [];
	let instances = [...options.level.instances];

	for (const operation of options.transaction.operations) {
		if (operation.kind !== "set-transform") {
			throw new Error(
				`Unsupported level editor authoring owner write operation "${operation.kind}".`,
			);
		}

		const index = instances.findIndex(
			(instance) => instance.stableId === operation.stableId,
		);

		if (index < 0) {
			throw new Error(
				`Level editor authoring owner write stableId "${operation.stableId}" is not present in sourceSnapshot.level.instances.`,
			);
		}

		const instance = instances[index];

		if (!instance) {
			throw new Error(
				`Level editor authoring owner write stableId "${operation.stableId}" resolved to an empty level instance.`,
			);
		}

		const afterTransform = cloneValue(operation.transform);
		if (afterTransform === undefined) {
			throw new Error(
				`Level editor authoring owner write operation "${operation.id}" must include a transform.`,
			);
		}

		const nextInstance = {
			...instance,
			transform: afterTransform,
		};
		const writeBase = {
			id: operation.id,
			kind: "set-level-instance-transform",
			ownerId: options.ownerId,
			stableId: operation.stableId,
			instanceId: instance.id,
			...(instance.transform === undefined
				? {}
				: { beforeTransform: cloneValue(instance.transform) }),
			afterTransform,
		} satisfies Omit<LevelEditorAuthoringLevelTransformWrite, "contentHash">;

		instances = [
			...instances.slice(0, index),
			nextInstance,
			...instances.slice(index + 1),
		];
		writes.push({
			...writeBase,
			contentHash: hashStableValue(writeBase),
		});
	}

	return {
		level: {
			...cloneValue(options.level),
			instances,
		},
		writes,
	};
}

function createLevelArtifact(options: {
	readonly authoringDoc: LevelEditorAuthoringDocument;
	readonly level: LevelEditorAuthoringSourceSnapshot["level"];
	readonly ownerTarget: LevelEditorAuthoringOwnerWriteTarget;
	readonly transaction: LevelEditorAuthoringTransaction;
	readonly writes: readonly LevelEditorAuthoringLevelTransformWrite[];
}): LevelEditorAuthoringOwnerWriteArtifact {
	const payload = {
		schemaVersion: 1,
		transactionId: options.transaction.id,
		runtimeSceneId: options.authoringDoc.runtimeSceneId,
		levelId: options.authoringDoc.levelId,
		ownerTarget: cloneValue(options.ownerTarget),
		level: cloneValue(options.level),
		writes: cloneValue(options.writes),
	} satisfies LevelEditorAuthoringOwnerWriteArtifactPayload;
	const serializedPayload = serializeStableValue(payload);
	const contentHash = hashStableValue(payload);

	return {
		id: `${options.transaction.id}:level-instances`,
		targetFile: options.ownerTarget.targetFile,
		exportName: options.ownerTarget.exportName,
		ownerId: options.ownerTarget.ownerId,
		purpose: "level-instances",
		format: "json",
		payload,
		serializedPayload,
		contentHash,
	};
}
