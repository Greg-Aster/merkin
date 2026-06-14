import { validateKnownComponents } from "../schemas/componentSchemas.js";
import { validateLevelDefinition } from "../schemas/index.js";
import { isRecord } from "./stableValue.js";
import type {
	LevelEditorAuthoringDocument,
	LevelEditorAuthoringEditOperation,
	LevelEditorAuthoringOwnerKind,
	LevelEditorAuthoringOwnerProvenance,
	LevelEditorAuthoringRecord,
	LevelEditorAuthoringTransaction,
	LevelEditorAuthoringValidationResult,
} from "./types.js";

const editableComponentNames = new Set([
	"Transform",
	"Renderable",
	"TerrainChunkCell",
	"TerrainSurface",
	"Light",
	"ReflectionProbe",
	"WaterSurface",
	"FireflyPopulationMember",
	"AudioListener",
	"SoundEmitter",
	"RigidBody",
	"Collider",
	"CharacterController",
	"Portal",
]);

export function validateLevelEditorAuthoringDocument(
	authoringDoc: LevelEditorAuthoringDocument,
): LevelEditorAuthoringValidationResult {
	const errors: string[] = [];

	if (authoringDoc.schemaVersion !== 1) {
		errors.push("levelEditorAuthoringDocument.schemaVersion must be 1.");
	}

	requireNonEmptyString(
		authoringDoc.runtimeSceneId,
		"levelEditorAuthoringDocument.runtimeSceneId",
		errors,
	);
	requireNonEmptyString(
		authoringDoc.levelId,
		"levelEditorAuthoringDocument.levelId",
		errors,
	);
	requireNonEmptyString(
		authoringDoc.contentHash,
		"levelEditorAuthoringDocument.contentHash",
		errors,
	);

	if (
		!authoringDoc.runtimeSceneCatalogIds.includes(authoringDoc.runtimeSceneId)
	) {
		errors.push(
			`levelEditorAuthoringDocument.runtimeSceneId "${authoringDoc.runtimeSceneId}" is not present in runtimeSceneCatalogIds.`,
		);
	}

	validateDocumentProvenance(authoringDoc, errors);
	validateAuthoringRecords(authoringDoc, errors);

	return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function validateLevelEditorAuthoringTransaction(
	authoringDoc: LevelEditorAuthoringDocument,
	transaction: LevelEditorAuthoringTransaction,
): LevelEditorAuthoringValidationResult {
	const errors: string[] = [];
	const documentValidation = validateLevelEditorAuthoringDocument(authoringDoc);

	if (!documentValidation.ok) {
		errors.push(...documentValidation.errors);
	}

	if (transaction.schemaVersion !== 1) {
		errors.push("levelEditorAuthoringTransaction.schemaVersion must be 1.");
	}

	requireNonEmptyString(
		transaction.id,
		"levelEditorAuthoringTransaction.id",
		errors,
	);
	requireNonEmptyString(
		transaction.runtimeSceneId,
		"levelEditorAuthoringTransaction.runtimeSceneId",
		errors,
	);
	requireNonEmptyString(
		transaction.baseDocumentHash,
		"levelEditorAuthoringTransaction.baseDocumentHash",
		errors,
	);
	requireNonEmptyString(
		transaction.createdAt,
		"levelEditorAuthoringTransaction.createdAt",
		errors,
	);

	if (
		transaction.persistence !== "saved" &&
		transaction.persistence !== "preview-only"
	) {
		errors.push(
			"levelEditorAuthoringTransaction.persistence must be saved or preview-only.",
		);
	}

	if (transaction.runtimeSceneId !== authoringDoc.runtimeSceneId) {
		errors.push(
			`levelEditorAuthoringTransaction.runtimeSceneId "${transaction.runtimeSceneId}" does not match authoringDoc runtimeSceneId "${authoringDoc.runtimeSceneId}".`,
		);
	}

	if (
		!authoringDoc.runtimeSceneCatalogIds.includes(transaction.runtimeSceneId)
	) {
		errors.push(
			`levelEditorAuthoringTransaction.runtimeSceneId "${transaction.runtimeSceneId}" is not present in the runtime scene catalog.`,
		);
	}

	if (transaction.baseDocumentHash !== authoringDoc.contentHash) {
		errors.push(
			`levelEditorAuthoringTransaction.baseDocumentHash "${transaction.baseDocumentHash}" does not match authoringDoc contentHash "${authoringDoc.contentHash}".`,
		);
	}

	if (
		!Array.isArray(transaction.operations) ||
		transaction.operations.length === 0
	) {
		errors.push(
			"levelEditorAuthoringTransaction.operations must not be empty.",
		);
		return errors.length === 0 ? { ok: true } : { ok: false, errors };
	}

	const operationIds = new Set<string>();
	const recordsByStableId = new Map(
		authoringDoc.records.map((record) => [record.stableId, record] as const),
	);

	for (const [index, operation] of transaction.operations.entries()) {
		validateOperation({
			authoringDoc,
			operation,
			path: `levelEditorAuthoringTransaction.operations.${index}`,
			transaction,
			operationIds,
			recordsByStableId,
			errors,
		});
	}

	return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function validateDocumentProvenance(
	authoringDoc: LevelEditorAuthoringDocument,
	errors: string[],
): void {
	validateOwnerProvenance(
		authoringDoc.provenance.runtimeSceneManifest,
		"levelEditorAuthoringDocument.provenance.runtimeSceneManifest",
		"runtime-scene-manifest",
		errors,
	);
	validateOwnerProvenance(
		authoringDoc.provenance.level,
		"levelEditorAuthoringDocument.provenance.level",
		"level",
		errors,
	);
	validateOwnerProvenance(
		authoringDoc.provenance.prefabs,
		"levelEditorAuthoringDocument.provenance.prefabs",
		"prefabs",
		errors,
	);
	validateOwnerProvenance(
		authoringDoc.provenance.assetManifest,
		"levelEditorAuthoringDocument.provenance.assetManifest",
		"asset-manifest",
		errors,
	);
	validateOwnerProvenance(
		authoringDoc.provenance.renderProfile,
		"levelEditorAuthoringDocument.provenance.renderProfile",
		"render-profile",
		errors,
	);

	for (const [index, owner] of (
		authoringDoc.provenance.generatedModules ?? []
	).entries()) {
		validateOwnerProvenance(
			owner,
			`levelEditorAuthoringDocument.provenance.generatedModules.${index}`,
			"generated-module",
			errors,
		);
	}

	const ownerIds = new Set<string>();

	for (const owner of allDocumentOwners(authoringDoc)) {
		if (ownerIds.has(owner.ownerId)) {
			errors.push(
				`levelEditorAuthoringDocument.provenance ownerId "${owner.ownerId}" is duplicated.`,
			);
		}

		ownerIds.add(owner.ownerId);
	}
}

function validateOwnerProvenance(
	owner: LevelEditorAuthoringOwnerProvenance | undefined,
	path: string,
	expectedKind: LevelEditorAuthoringOwnerKind,
	errors: string[],
): void {
	if (!isRecord(owner)) {
		errors.push(`${path} must declare owner provenance.`);
		return;
	}

	requireNonEmptyString(owner.ownerId, `${path}.ownerId`, errors);

	if (owner.kind !== expectedKind) {
		errors.push(`${path}.kind must be ${expectedKind}.`);
	}

	requireNonEmptyString(owner.targetFile, `${path}.targetFile`, errors);
	requireNonEmptyString(owner.exportName, `${path}.exportName`, errors);
	requireNonEmptyString(owner.contentHash, `${path}.contentHash`, errors);
}

function validateAuthoringRecords(
	authoringDoc: LevelEditorAuthoringDocument,
	errors: string[],
): void {
	const stableIds = new Set<string>();
	const prefabIds = new Set(authoringDoc.prefabIds);
	const ownerIds = new Set(
		allDocumentOwners(authoringDoc).map((owner) => owner.ownerId),
	);

	for (const [index, record] of authoringDoc.records.entries()) {
		const path = `levelEditorAuthoringDocument.records.${index}`;

		requireNonEmptyString(record.stableId, `${path}.stableId`, errors);
		requireNonEmptyString(record.instanceId, `${path}.instanceId`, errors);
		requireNonEmptyString(record.prefabId, `${path}.prefabId`, errors);

		if (stableIds.has(record.stableId)) {
			errors.push(`${path}.stableId "${record.stableId}" is duplicated.`);
		}

		stableIds.add(record.stableId);

		if (!prefabIds.has(record.prefabId)) {
			errors.push(
				`${path}.prefabId "${record.prefabId}" is not present in authoringDoc.prefabIds.`,
			);
		}

		if (!ownerIds.has(record.ownerIds.level)) {
			errors.push(`${path}.ownerIds.level references missing provenance.`);
		}

		if (!ownerIds.has(record.ownerIds.prefabs)) {
			errors.push(`${path}.ownerIds.prefabs references missing provenance.`);
		}

		validateComponentMap({
			components: record.components,
			path: `${path}.components`,
			authoringDoc,
			record,
			errors,
		});
	}
}

function validateOperation(options: {
	readonly authoringDoc: LevelEditorAuthoringDocument;
	readonly operation: LevelEditorAuthoringEditOperation;
	readonly path: string;
	readonly transaction: LevelEditorAuthoringTransaction;
	readonly operationIds: Set<string>;
	readonly recordsByStableId: ReadonlyMap<string, LevelEditorAuthoringRecord>;
	readonly errors: string[];
}): void {
	const {
		authoringDoc,
		operation,
		path,
		transaction,
		operationIds,
		recordsByStableId,
		errors,
	} = options;

	requireNonEmptyString(operation.id, `${path}.id`, errors);

	if (operationIds.has(operation.id)) {
		errors.push(`${path}.id "${operation.id}" is duplicated.`);
	}

	operationIds.add(operation.id);

	if (
		operation.persistence !== "saved" &&
		operation.persistence !== "preview-only"
	) {
		errors.push(`${path}.persistence must be saved or preview-only.`);
	}

	if (operation.persistence !== transaction.persistence) {
		errors.push(
			`${path} persistence "${operation.persistence}" cannot be committed as transaction persistence "${transaction.persistence}".`,
		);
	}

	switch (operation.kind) {
		case "set-transform":
			validateStableRecordOperation(
				operation.stableId,
				path,
				recordsByStableId,
				errors,
			);
			validateTransform(operation.transform, `${path}.transform`, errors);
			break;
		case "set-component": {
			const record = validateStableRecordOperation(
				operation.stableId,
				path,
				recordsByStableId,
				errors,
			);

			validateComponentEdit({
				authoringDoc,
				record,
				componentName: operation.componentName,
				value: operation.value,
				path,
				errors,
			});
			break;
		}
		case "remove-component":
			validateStableRecordOperation(
				operation.stableId,
				path,
				recordsByStableId,
				errors,
			);
			validateEditableComponentName(operation.componentName, path, errors);
			break;
		case "insert-instance":
			validateInsertedInstance(
				authoringDoc,
				operation.instance,
				path,
				recordsByStableId,
				errors,
			);
			break;
		case "remove-instance":
			validateStableRecordOperation(
				operation.stableId,
				path,
				recordsByStableId,
				errors,
			);
			break;
		case "replace-prefab":
			validateStableRecordOperation(
				operation.stableId,
				path,
				recordsByStableId,
				errors,
			);

			if (!authoringDoc.prefabIds.includes(operation.prefabId)) {
				errors.push(
					`${path}.prefabId "${operation.prefabId}" is not present in authoringDoc.prefabIds.`,
				);
			}
			break;
		case "set-portal-target": {
			const record = validateStableRecordOperation(
				operation.stableId,
				path,
				recordsByStableId,
				errors,
			);

			if (
				!authoringDoc.runtimeSceneCatalogIds.includes(
					operation.targetRuntimeSceneId,
				)
			) {
				errors.push(
					`${path}.targetRuntimeSceneId "${operation.targetRuntimeSceneId}" is not present in the runtime scene catalog.`,
				);
			}

			if (record && !isRecord(record.components.Portal)) {
				errors.push(
					`${path}.stableId "${operation.stableId}" has no Portal component.`,
				);
			}
			break;
		}
	}
}

function validateStableRecordOperation(
	stableId: string,
	path: string,
	recordsByStableId: ReadonlyMap<string, LevelEditorAuthoringRecord>,
	errors: string[],
): LevelEditorAuthoringRecord | undefined {
	requireNonEmptyString(stableId, `${path}.stableId`, errors);

	const record = recordsByStableId.get(stableId);

	if (!record) {
		errors.push(
			`${path}.stableId "${stableId}" is not present in the authoringDoc.`,
		);
	}

	return record;
}

function validateInsertedInstance(
	authoringDoc: LevelEditorAuthoringDocument,
	instance: unknown,
	path: string,
	recordsByStableId: ReadonlyMap<string, LevelEditorAuthoringRecord>,
	errors: string[],
): void {
	const levelErrors = validateLevelDefinition({
		id: authoringDoc.levelId,
		instances: [instance],
	});

	for (const error of levelErrors) {
		errors.push(`${path}.instance: ${error}`);
	}

	if (!isRecord(instance)) {
		return;
	}

	if (
		typeof instance.stableId === "string" &&
		recordsByStableId.has(instance.stableId)
	) {
		errors.push(
			`${path}.instance.stableId "${instance.stableId}" already exists in the authoringDoc.`,
		);
	}

	if (
		typeof instance.prefabId === "string" &&
		!authoringDoc.prefabIds.includes(instance.prefabId)
	) {
		errors.push(
			`${path}.instance.prefabId "${instance.prefabId}" is not present in authoringDoc.prefabIds.`,
		);
	}
}

function validateComponentEdit(options: {
	readonly authoringDoc: LevelEditorAuthoringDocument;
	readonly record: LevelEditorAuthoringRecord | undefined;
	readonly componentName: string;
	readonly value: Record<string, unknown>;
	readonly path: string;
	readonly errors: string[];
}): void {
	const { authoringDoc, record, componentName, value, path, errors } = options;

	if (!validateEditableComponentName(componentName, path, errors)) {
		return;
	}

	if (componentName === "Portal") {
		validatePortalComponent(value, `${path}.value`, authoringDoc, errors);
		return;
	}

	const componentErrors: string[] = [];
	validateKnownComponents(
		{ [componentName]: value },
		`${path}.value`,
		componentErrors,
		{
			hasTransformOverride:
				componentName === "Transform" ||
				recordHasTransform(record) ||
				record?.transform !== undefined,
			allowPartialCharacterController: true,
		},
	);

	errors.push(...componentErrors);
}

function validateComponentMap(options: {
	readonly components: Record<string, unknown>;
	readonly path: string;
	readonly authoringDoc: LevelEditorAuthoringDocument;
	readonly record: LevelEditorAuthoringRecord;
	readonly errors: string[];
}): void {
	const { components, path, authoringDoc, record, errors } = options;

	for (const [componentName, value] of Object.entries(components)) {
		if (!editableComponentNames.has(componentName)) {
			continue;
		}

		if (componentName === "Portal") {
			validatePortalComponent(value, `${path}.Portal`, authoringDoc, errors);
			continue;
		}

		const componentErrors: string[] = [];
		validateKnownComponents({ [componentName]: value }, path, componentErrors, {
			hasTransformOverride:
				componentName === "Transform" || recordHasTransform(record),
			allowPartialCharacterController: true,
		});
		errors.push(...componentErrors);
	}
}

function validatePortalComponent(
	value: unknown,
	path: string,
	authoringDoc: LevelEditorAuthoringDocument,
	errors: string[],
): void {
	if (!isRecord(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	for (const field of ["id", "label", "prompt"] as const) {
		if (value[field] !== undefined && typeof value[field] !== "string") {
			errors.push(`${path}.${field} must be a string when provided.`);
		}
	}

	if (value.targetRuntimeSceneId !== undefined) {
		if (typeof value.targetRuntimeSceneId !== "string") {
			errors.push(
				`${path}.targetRuntimeSceneId must be a string when provided.`,
			);
		} else if (
			!authoringDoc.runtimeSceneCatalogIds.includes(value.targetRuntimeSceneId)
		) {
			errors.push(
				`${path}.targetRuntimeSceneId "${value.targetRuntimeSceneId}" is not present in the runtime scene catalog.`,
			);
		}
	}

	if (
		value.activationRadius !== undefined &&
		(typeof value.activationRadius !== "number" ||
			!Number.isFinite(value.activationRadius) ||
			value.activationRadius <= 0)
	) {
		errors.push(
			`${path}.activationRadius must be a positive number when provided.`,
		);
	}
}

function validateEditableComponentName(
	componentName: string,
	path: string,
	errors: string[],
): boolean {
	requireNonEmptyString(componentName, `${path}.componentName`, errors);

	if (!editableComponentNames.has(componentName)) {
		errors.push(`${path}.componentName "${componentName}" is not editable.`);
		return false;
	}

	return true;
}

function validateTransform(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	validateOptionalNumberTuple(value.position, 3, `${path}.position`, errors);
	validateOptionalNumberTuple(value.rotation, 4, `${path}.rotation`, errors);
	validateOptionalNumberTuple(value.scale, 3, `${path}.scale`, errors);
}

function validateOptionalNumberTuple(
	value: unknown,
	length: number,
	path: string,
	errors: string[],
): void {
	if (value === undefined) {
		return;
	}

	if (!Array.isArray(value) || value.length !== length) {
		errors.push(`${path} must be an array with ${length} numbers.`);
		return;
	}

	for (const [index, item] of value.entries()) {
		if (typeof item !== "number" || !Number.isFinite(item)) {
			errors.push(`${path}.${index} must be a finite number.`);
		}
	}
}

function recordHasTransform(
	record: LevelEditorAuthoringRecord | undefined,
): boolean {
	return (
		record !== undefined &&
		(record.transform !== undefined || isRecord(record.components.Transform))
	);
}

function allDocumentOwners(
	authoringDoc: LevelEditorAuthoringDocument,
): readonly LevelEditorAuthoringOwnerProvenance[] {
	return [
		authoringDoc.provenance.runtimeSceneManifest,
		authoringDoc.provenance.level,
		authoringDoc.provenance.prefabs,
		authoringDoc.provenance.assetManifest,
		authoringDoc.provenance.renderProfile,
		...(authoringDoc.provenance.generatedModules ?? []),
	].filter(isOwnerProvenance);
}

function isOwnerProvenance(
	value: unknown,
): value is LevelEditorAuthoringOwnerProvenance {
	return (
		isRecord(value) &&
		typeof value.ownerId === "string" &&
		typeof value.kind === "string" &&
		typeof value.targetFile === "string" &&
		typeof value.exportName === "string" &&
		typeof value.contentHash === "string"
	);
}

function requireNonEmptyString(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (typeof value !== "string" || value.length === 0) {
		errors.push(`${path} must be a non-empty string.`);
	}
}
