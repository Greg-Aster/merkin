import {
	type LevelEditorOwnerKind,
	type LevelEditorOwnerRegistry,
	type LevelEditorOwnerTarget,
	buildLevelEditorOwnerRegistry,
} from "./ownerRegistry.js";
import {
	cloneValue,
	hashStableValue,
	hashString,
	isRecord,
	serializeStableValue,
} from "./stableValue.js";

export const LEVEL_EDITOR_MISSING_FILE_HASH = "missing";
export const LEVEL_EDITOR_AUTHORING_SAVE_GENERATOR =
	"levelEditorAuthoringSave.v1";

export type LevelEditorAuthoringOperationKind =
	| "insert-level-instance"
	| "remove-level-instance"
	| "replace-level-instance"
	| "replace-prefab"
	| "replace-asset"
	| "replace-render-profile"
	| "replace-generated-module";

export type LevelEditorAuthoringOperationData = {
	readonly kind: LevelEditorAuthoringOperationKind;
	readonly ownerKind: LevelEditorOwnerKind;
	readonly ownerTargetId: string;
	readonly subjectId: string;
	readonly payload?: unknown;
	readonly previewOnly?: false;
};

export type LevelEditorAuthoringValidationStamp = {
	readonly status: "valid";
	readonly contract: "LevelEditorAuthoringContract";
	readonly contentHash: string;
};

export type LevelEditorAuthoringSaveTargetData = {
	readonly targetId: string;
	readonly baseHash: string;
	readonly operations: readonly LevelEditorAuthoringOperationData[];
};

export type LevelEditorAuthoringSaveTransactionData = {
	readonly schemaVersion: 1;
	readonly transactionId: string;
	readonly runtimeSceneId: string;
	readonly authoringValidation: LevelEditorAuthoringValidationStamp;
	readonly targets: readonly LevelEditorAuthoringSaveTargetData[];
};

export type LevelEditorSavedAuthoringModuleData = {
	readonly schemaVersion: 1;
	readonly generator: typeof LEVEL_EDITOR_AUTHORING_SAVE_GENERATOR;
	readonly contract: "LevelEditorAuthoringPersistenceContract";
	readonly writesRuntimeData: false;
	readonly runtimeSceneId: string;
	readonly transactionId: string;
	readonly authoringValidation: LevelEditorAuthoringValidationStamp;
	readonly ownerRegistryHash: string;
	readonly saveTarget: {
		readonly id: string;
		readonly targetFile: string;
		readonly ownerExport: string;
	};
	readonly affectedOwnerTargets: readonly {
		readonly id: string;
		readonly ownerKind: LevelEditorOwnerKind;
		readonly targetFile: string;
		readonly ownerExport: string;
		readonly writeStrategy: string;
	}[];
	readonly operations: readonly LevelEditorAuthoringOperationData[];
	readonly contentHash: string;
};

export type LevelEditorAuthoringSaveWriteArtifact = {
	readonly id: string;
	readonly targetId: string;
	readonly targetFile: string;
	readonly ownerExport: string;
	readonly baseHash: string;
	readonly contentHash: string;
	readonly payload: LevelEditorSavedAuthoringModuleData;
	readonly serializedPayload: string;
};

export type LevelEditorAuthoringSaveWritePlan = {
	readonly schemaVersion: 1;
	readonly generator: typeof LEVEL_EDITOR_AUTHORING_SAVE_GENERATOR;
	readonly writeMode: "dev-only-explicit-save";
	readonly writesFiles: true;
	readonly runtimeSceneId: string;
	readonly transactionId: string;
	readonly authoringValidationHash: string;
	readonly ownerRegistryHash: string;
	readonly artifacts: readonly LevelEditorAuthoringSaveWriteArtifact[];
	readonly contentHash: string;
};

const supportedOperationKinds = new Set<string>([
	"insert-level-instance",
	"remove-level-instance",
	"replace-level-instance",
	"replace-prefab",
	"replace-asset",
	"replace-render-profile",
	"replace-generated-module",
]);

export function buildLevelEditorAuthoringSaveWritePlan(options: {
	readonly transaction: LevelEditorAuthoringSaveTransactionData;
	readonly ownerRegistry?: LevelEditorOwnerRegistry;
}): LevelEditorAuthoringSaveWritePlan {
	const ownerRegistry =
		options.ownerRegistry ?? buildLevelEditorOwnerRegistry();
	const validationErrors = validateLevelEditorAuthoringSaveTransaction({
		transaction: options.transaction,
		ownerRegistry,
	});

	if (validationErrors.length > 0) {
		throw new Error(
			`Invalid level editor save transaction:\n${validationErrors.join("\n")}`,
		);
	}

	const targetById = new Map(
		ownerRegistry.targets.map((target) => [target.id, target]),
	);
	const artifacts = options.transaction.targets.map((targetData) => {
		const saveTarget = targetById.get(targetData.targetId);

		if (!saveTarget) {
			throw new Error(
				`Save target "${targetData.targetId}" disappeared from the owner registry.`,
			);
		}

		return buildWriteArtifact({
			transaction: options.transaction,
			targetData,
			saveTarget,
			ownerRegistry,
			targetById,
		});
	});
	const planBase = {
		schemaVersion: 1,
		generator: LEVEL_EDITOR_AUTHORING_SAVE_GENERATOR,
		writeMode: "dev-only-explicit-save",
		writesFiles: true,
		runtimeSceneId: options.transaction.runtimeSceneId,
		transactionId: options.transaction.transactionId,
		authoringValidationHash:
			options.transaction.authoringValidation.contentHash,
		ownerRegistryHash: ownerRegistry.contentHash,
		artifacts,
	} satisfies Omit<LevelEditorAuthoringSaveWritePlan, "contentHash">;

	return {
		...planBase,
		contentHash: hashStableValue(planBase),
	};
}

export function validateLevelEditorAuthoringSaveTransaction(options: {
	readonly transaction: LevelEditorAuthoringSaveTransactionData;
	readonly ownerRegistry?: LevelEditorOwnerRegistry;
}): readonly string[] {
	const transaction = options.transaction;
	const ownerRegistry =
		options.ownerRegistry ?? buildLevelEditorOwnerRegistry();
	const errors: string[] = [];
	const targetById = new Map(
		ownerRegistry.targets.map((target) => [target.id, target]),
	);

	if (transaction.schemaVersion !== 1) {
		errors.push("transaction schemaVersion must be 1.");
	}

	if (!isNonEmptyString(transaction.transactionId)) {
		errors.push("transactionId must be a non-empty string.");
	}

	if (!ownerRegistry.runtimeSceneIds.includes(transaction.runtimeSceneId)) {
		errors.push(
			`runtimeSceneId "${transaction.runtimeSceneId}" is not in the runtime scene catalog.`,
		);
	}

	if (
		transaction.authoringValidation?.status !== "valid" ||
		transaction.authoringValidation.contract !== "LevelEditorAuthoringContract"
	) {
		errors.push(
			"authoringValidation must be a valid LevelEditorAuthoringContract stamp.",
		);
	}

	if (!isNonEmptyString(transaction.authoringValidation?.contentHash)) {
		errors.push("authoringValidation.contentHash must be a non-empty string.");
	}

	if (!Array.isArray(transaction.targets) || transaction.targets.length === 0) {
		errors.push("transaction targets must include at least one write target.");
		return errors;
	}

	const seenTargetIds = new Set<string>();

	for (const targetData of transaction.targets) {
		if (seenTargetIds.has(targetData.targetId)) {
			errors.push(`duplicate save target "${targetData.targetId}".`);
			continue;
		}

		seenTargetIds.add(targetData.targetId);
		const saveTarget = targetById.get(targetData.targetId);

		if (!saveTarget) {
			errors.push(`unknown save target "${targetData.targetId}".`);
			continue;
		}

		if (saveTarget.runtimeSceneId !== transaction.runtimeSceneId) {
			errors.push(
				`save target "${saveTarget.id}" belongs to runtime scene "${saveTarget.runtimeSceneId}", not "${transaction.runtimeSceneId}".`,
			);
		}

		if (!saveTarget.writableByAuthoringSave) {
			errors.push(
				`save target "${saveTarget.id}" is not writable by the level editor save command.`,
			);
		}

		if (saveTarget.writeStrategy !== "replace-generated-module") {
			errors.push(
				`save target "${saveTarget.id}" does not use the generated-module write strategy.`,
			);
		}

		if (!isExpectedBaseHash(targetData.baseHash)) {
			errors.push(
				`save target "${saveTarget.id}" must provide a baseHash or "${LEVEL_EDITOR_MISSING_FILE_HASH}".`,
			);
		}

		validateOperations({
			transaction,
			targetData,
			targetById,
			errors,
		});
	}

	return errors;
}

export function serializeLevelEditorSavedAuthoringModuleSource(
	moduleData: LevelEditorSavedAuthoringModuleData,
): string {
	const serializedModule = serializeStableValue(moduleData).trimEnd();

	return [
		`// @generated by ${LEVEL_EDITOR_AUTHORING_SAVE_GENERATOR}`,
		"// Source: LevelEditorAuthoringPersistenceContract. Do not edit by hand.",
		'import type { LevelEditorSavedAuthoringModuleData } from "../saveTransaction.js";',
		"",
		"// biome-ignore format: preserve stable generated authoring payload formatting.",
		`export const levelEditorAuthoringSaveModule = ${serializedModule} satisfies LevelEditorSavedAuthoringModuleData;`,
		"",
	].join("\n");
}

export function hashLevelEditorAuthoringFileContent(
	source: string | undefined,
): string {
	if (source === undefined) {
		return LEVEL_EDITOR_MISSING_FILE_HASH;
	}

	return hashString(source);
}

function buildWriteArtifact(options: {
	readonly transaction: LevelEditorAuthoringSaveTransactionData;
	readonly targetData: LevelEditorAuthoringSaveTargetData;
	readonly saveTarget: LevelEditorOwnerTarget;
	readonly ownerRegistry: LevelEditorOwnerRegistry;
	readonly targetById: ReadonlyMap<string, LevelEditorOwnerTarget>;
}): LevelEditorAuthoringSaveWriteArtifact {
	const affectedOwnerTargets = affectedTargetsForOperations({
		operations: options.targetData.operations,
		targetById: options.targetById,
	});
	const moduleBase = {
		schemaVersion: 1,
		generator: LEVEL_EDITOR_AUTHORING_SAVE_GENERATOR,
		contract: "LevelEditorAuthoringPersistenceContract",
		writesRuntimeData: false,
		runtimeSceneId: options.transaction.runtimeSceneId,
		transactionId: options.transaction.transactionId,
		authoringValidation: cloneValue(options.transaction.authoringValidation),
		ownerRegistryHash: options.ownerRegistry.contentHash,
		saveTarget: {
			id: options.saveTarget.id,
			targetFile: options.saveTarget.targetFile,
			ownerExport: options.saveTarget.ownerExport,
		},
		affectedOwnerTargets,
		operations: cloneValue(options.targetData.operations),
	} satisfies Omit<LevelEditorSavedAuthoringModuleData, "contentHash">;
	const payload = {
		...moduleBase,
		contentHash: hashStableValue(moduleBase),
	};
	const serializedPayload =
		serializeLevelEditorSavedAuthoringModuleSource(payload);

	return {
		id: `${options.transaction.transactionId}:${options.saveTarget.id}`,
		targetId: options.saveTarget.id,
		targetFile: options.saveTarget.targetFile,
		ownerExport: options.saveTarget.ownerExport,
		baseHash: options.targetData.baseHash,
		contentHash: hashString(serializedPayload),
		payload,
		serializedPayload,
	};
}

function validateOperations(options: {
	readonly transaction: LevelEditorAuthoringSaveTransactionData;
	readonly targetData: LevelEditorAuthoringSaveTargetData;
	readonly targetById: ReadonlyMap<string, LevelEditorOwnerTarget>;
	readonly errors: string[];
}): void {
	if (
		!Array.isArray(options.targetData.operations) ||
		options.targetData.operations.length === 0
	) {
		options.errors.push(
			`save target "${options.targetData.targetId}" must include at least one authoring operation.`,
		);
		return;
	}

	for (const operation of options.targetData.operations) {
		if (!isRecord(operation)) {
			options.errors.push(
				`save target "${options.targetData.targetId}" includes a non-object operation.`,
			);
			continue;
		}

		if (
			!isNonEmptyString(operation.kind) ||
			!supportedOperationKinds.has(operation.kind)
		) {
			options.errors.push(
				`operation "${String(operation.kind)}" is not a supported save operation kind.`,
			);
		}

		if (operation.previewOnly === true) {
			options.errors.push(
				`operation "${String(operation.kind)}" is preview-only and cannot be saved.`,
			);
		}

		if (!isNonEmptyString(operation.subjectId)) {
			options.errors.push(
				`operation "${String(operation.kind)}" must include a subjectId.`,
			);
		}

		if (!isNonEmptyString(operation.ownerTargetId)) {
			options.errors.push(
				`operation "${String(operation.kind)}" must include an ownerTargetId.`,
			);
			continue;
		}

		const affectedTarget = options.targetById.get(operation.ownerTargetId);

		if (!affectedTarget) {
			options.errors.push(
				`operation owner target "${operation.ownerTargetId}" is not in the owner registry.`,
			);
			continue;
		}

		if (affectedTarget.runtimeSceneId !== options.transaction.runtimeSceneId) {
			options.errors.push(
				`operation owner target "${operation.ownerTargetId}" belongs to runtime scene "${affectedTarget.runtimeSceneId}", not "${options.transaction.runtimeSceneId}".`,
			);
		}

		if (affectedTarget.ownerKind !== operation.ownerKind) {
			options.errors.push(
				`operation owner kind "${operation.ownerKind}" does not match owner target "${operation.ownerTargetId}" kind "${affectedTarget.ownerKind}".`,
			);
		}
	}
}

function affectedTargetsForOperations(options: {
	readonly operations: readonly LevelEditorAuthoringOperationData[];
	readonly targetById: ReadonlyMap<string, LevelEditorOwnerTarget>;
}): LevelEditorSavedAuthoringModuleData["affectedOwnerTargets"] {
	const targetIds = [
		...new Set(options.operations.map((operation) => operation.ownerTargetId)),
	].sort();

	return targetIds.map((targetId) => {
		const target = options.targetById.get(targetId);

		if (!target) {
			throw new Error(
				`Affected owner target "${targetId}" disappeared from the registry.`,
			);
		}

		return {
			id: target.id,
			ownerKind: target.ownerKind,
			targetFile: target.targetFile,
			ownerExport: target.ownerExport,
			writeStrategy: target.writeStrategy,
		};
	});
}

function isExpectedBaseHash(value: unknown): value is string {
	return value === LEVEL_EDITOR_MISSING_FILE_HASH || isNonEmptyString(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}
