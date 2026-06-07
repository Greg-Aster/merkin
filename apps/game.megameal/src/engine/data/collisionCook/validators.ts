import {
	SchemaValidationError,
	createSchemaValidator,
} from "../schemas/index.js";
import {
	type CollisionCookDraftData,
	type CollisionCookPreviewPatch,
	LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
	type LevelEditorDevPreviewMessage,
} from "./types.js";
import { isRecord } from "./utils.js";

export const collisionCookDraftValidator =
	createSchemaValidator<CollisionCookDraftData>(
		"CollisionCookDraft",
		validateCollisionCookDraft,
	);

export const collisionCookPreviewPatchValidator =
	createSchemaValidator<CollisionCookPreviewPatch>(
		"CollisionCookPreviewPatch",
		validateCollisionCookPreviewPatch,
	);

export const levelEditorDevPreviewMessageValidator =
	createSchemaValidator<LevelEditorDevPreviewMessage>(
		"LevelEditorDevPreviewMessage",
		validateLevelEditorDevPreviewMessage,
	);

export function parseCollisionCookDraft(data: unknown): CollisionCookDraftData {
	return collisionCookDraftValidator.parse(data);
}

export function parseCollisionCookPreviewPatch(
	data: unknown,
): CollisionCookPreviewPatch {
	return collisionCookPreviewPatchValidator.parse(data);
}

export function parseLevelEditorDevPreviewMessage(
	data: unknown,
): LevelEditorDevPreviewMessage {
	return levelEditorDevPreviewMessageValidator.parse(data);
}

export function validateCollisionCookDraft(data: unknown): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(data)) {
		return ["collision cook draft must be an object."];
	}

	if (data.schemaVersion !== 1) {
		errors.push("collisionCookDraft.schemaVersion must be 1.");
	}

	requireString(data.id, "collisionCookDraft.id", errors);
	requireString(
		data.runtimeSceneId,
		"collisionCookDraft.runtimeSceneId",
		errors,
	);
	requireString(data.levelId, "collisionCookDraft.levelId", errors);
	validateTargetFiles(
		data.targetFiles,
		"collisionCookDraft.targetFiles",
		errors,
	);

	if (!Array.isArray(data.entries) || data.entries.length === 0) {
		errors.push("collisionCookDraft.entries must contain at least one entry.");
		return errors;
	}

	const entryIds = new Set<string>();
	const stableIds = new Set<string>();

	for (const [index, entry] of data.entries.entries()) {
		validateCollisionCookDraftEntry(
			entry,
			`collisionCookDraft.entries.${index}`,
			{ entryIds, stableIds },
			errors,
		);
	}

	return errors;
}

export function validateCollisionCookPreviewPatch(
	data: unknown,
): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(data)) {
		return ["collision preview patch must be an object."];
	}

	if (data.schemaVersion !== 1) {
		errors.push("collisionPreviewPatch.schemaVersion must be 1.");
	}

	if (data.channel !== "level-editor-collision-preview") {
		errors.push(
			"collisionPreviewPatch.channel must be level-editor-collision-preview.",
		);
	}

	if (data.mode !== "temporary-preview") {
		errors.push("collisionPreviewPatch.mode must be temporary-preview.");
	}

	requireString(data.draftId, "collisionPreviewPatch.draftId", errors);
	requireString(
		data.runtimeSceneId,
		"collisionPreviewPatch.runtimeSceneId",
		errors,
	);
	requireString(data.levelId, "collisionPreviewPatch.levelId", errors);
	requireString(
		data.sourcePlanHash,
		"collisionPreviewPatch.sourcePlanHash",
		errors,
	);

	if (!Array.isArray(data.entries) || data.entries.length === 0) {
		errors.push(
			"collisionPreviewPatch.entries must contain at least one entry.",
		);
		return errors;
	}

	const entryIds = new Set<string>();
	const stableIds = new Set<string>();

	for (const [index, entry] of data.entries.entries()) {
		validateCollisionCookPreviewEntry(
			entry,
			`collisionPreviewPatch.entries.${index}`,
			{ entryIds, stableIds },
			errors,
		);
	}

	validateStringArray(
		data.requiredCollisionStableIds,
		"collisionPreviewPatch.requiredCollisionStableIds",
		errors,
	);
	validateStringArray(
		data.requiredWalkableStableIds,
		"collisionPreviewPatch.requiredWalkableStableIds",
		errors,
	);

	return errors;
}

export function validateLevelEditorDevPreviewMessage(
	data: unknown,
): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(data)) {
		return ["level editor dev preview message must be an object."];
	}

	if (data.schemaVersion !== 1) {
		errors.push("levelEditorDevPreviewMessage.schemaVersion must be 1.");
	}

	if (data.protocol !== LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL) {
		errors.push(
			`levelEditorDevPreviewMessage.protocol must be ${LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL}.`,
		);
	}

	requireString(
		data.requestId,
		"levelEditorDevPreviewMessage.requestId",
		errors,
	);

	switch (data.type) {
		case "collision-preview-patch":
			for (const error of validateCollisionCookPreviewPatch(data.payload)) {
				errors.push(`levelEditorDevPreviewMessage.payload: ${error}`);
			}
			return errors;
		case "reload-runtime-scene":
			validateRuntimeReloadRequest(
				data.request,
				"levelEditorDevPreviewMessage.request",
				errors,
			);
			return errors;
		case "clear-collision-preview":
			validateCollisionPreviewClearRequest(
				data.request,
				"levelEditorDevPreviewMessage.request",
				errors,
			);
			return errors;
		default:
			errors.push(
				"levelEditorDevPreviewMessage.type must be collision-preview-patch, reload-runtime-scene, or clear-collision-preview.",
			);
			return errors;
	}
}

function validateRuntimeReloadRequest(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(data.runtimeSceneId, `${path}.runtimeSceneId`, errors);

	if (data.reason !== "collision-bake-applied" && data.reason !== "manual") {
		errors.push(`${path}.reason must be collision-bake-applied or manual.`);
	}

	if (
		data.sourcePlanHash !== undefined &&
		typeof data.sourcePlanHash !== "string"
	) {
		errors.push(`${path}.sourcePlanHash must be a string when provided.`);
	}
}

function validateCollisionPreviewClearRequest(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(data.runtimeSceneId, `${path}.runtimeSceneId`, errors);

	if (
		data.sourcePlanHash !== undefined &&
		typeof data.sourcePlanHash !== "string"
	) {
		errors.push(`${path}.sourcePlanHash must be a string when provided.`);
	}

	if (data.stableIds !== undefined) {
		validateStringArray(data.stableIds, `${path}.stableIds`, errors);
	}
}

function validateTargetFiles(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(data.prefabModule, `${path}.prefabModule`, errors);
	requireString(data.levelModule, `${path}.levelModule`, errors);
	requireString(
		data.runtimeSceneManifestModule,
		`${path}.runtimeSceneManifestModule`,
		errors,
	);

	if (
		data.generatedRuntimeCollisionModule !== undefined &&
		typeof data.generatedRuntimeCollisionModule !== "string"
	) {
		errors.push(`${path}.generatedRuntimeCollisionModule must be a string.`);
	}
}

function validateCollisionCookDraftEntry(
	data: unknown,
	path: string,
	seen: {
		readonly entryIds: Set<string>;
		readonly stableIds: Set<string>;
	},
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireUniqueString(data.id, `${path}.id`, seen.entryIds, errors);
	requireUniqueString(
		data.stableId,
		`${path}.stableId`,
		seen.stableIds,
		errors,
	);
	requireString(data.prefabId, `${path}.prefabId`, errors);

	if (
		data.colliderTarget !== "prefab" &&
		data.colliderTarget !== "level-instance"
	) {
		errors.push(`${path}.colliderTarget must be prefab or level-instance.`);
	}

	validateTransform(data.transform, `${path}.transform`, errors);
	validateCollider(data.collider, `${path}.collider`, errors);
	validateReadiness(data.readiness, `${path}.readiness`, data.collider, errors);

	if (data.notes !== undefined && typeof data.notes !== "string") {
		errors.push(`${path}.notes must be a string when provided.`);
	}
}

function validateCollisionCookPreviewEntry(
	data: unknown,
	path: string,
	seen: {
		readonly entryIds: Set<string>;
		readonly stableIds: Set<string>;
	},
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireUniqueString(data.id, `${path}.id`, seen.entryIds, errors);
	requireUniqueString(
		data.stableId,
		`${path}.stableId`,
		seen.stableIds,
		errors,
	);
	requireString(data.prefabId, `${path}.prefabId`, errors);

	if (
		data.colliderTarget !== "prefab" &&
		data.colliderTarget !== "level-instance"
	) {
		errors.push(`${path}.colliderTarget must be prefab or level-instance.`);
	}

	validateTransform(data.transform, `${path}.transform`, errors);
	validateCollider(data.colliderComponent, `${path}.colliderComponent`, errors);
	validateReadiness(
		data.readiness,
		`${path}.readiness`,
		data.colliderComponent,
		errors,
	);
}

function validateTransform(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (data === undefined) {
		return;
	}

	if (!isRecord(data)) {
		errors.push(`${path} must be an object when provided.`);
		return;
	}

	validateOptionalNumberTuple(data.position, 3, `${path}.position`, errors);
	validateOptionalNumberTuple(data.rotation, 4, `${path}.rotation`, errors);
	validateOptionalNumberTuple(data.scale, 3, `${path}.scale`, errors);
}

function validateCollider(data: unknown, path: string, errors: string[]): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	validateCollisionIntent(data.intent, `${path}.intent`, errors);
	requireString(data.channel, `${path}.channel`, errors);

	if (data.sensor !== undefined && typeof data.sensor !== "boolean") {
		errors.push(`${path}.sensor must be a boolean when provided.`);
	}

	if (data.intent === "trigger" && data.sensor !== true) {
		errors.push(`${path}.sensor must be true for trigger collision.`);
	}

	if (
		(data.intent === "solid" || data.intent === "walkable") &&
		data.sensor === true
	) {
		errors.push(
			`${path}.sensor cannot be true for solid or walkable collision.`,
		);
	}

	validateShape(data.shape, `${path}.shape`, errors);
}

function validateReadiness(
	data: unknown,
	path: string,
	collider: unknown,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (typeof data.requiredCollision !== "boolean") {
		errors.push(`${path}.requiredCollision must be a boolean.`);
	}

	if (
		data.requiredWalkable !== undefined &&
		typeof data.requiredWalkable !== "boolean"
	) {
		errors.push(`${path}.requiredWalkable must be a boolean when provided.`);
	}

	if (data.requiredWalkable === true) {
		if (data.requiredCollision !== true) {
			errors.push(`${path}.requiredWalkable requires requiredCollision true.`);
		}

		if (isRecord(collider) && collider.intent !== "walkable") {
			errors.push(
				`${path}.requiredWalkable requires collider.intent walkable.`,
			);
		}
	}
}

function validateShape(data: unknown, path: string, errors: string[]): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	switch (data.type) {
		case "box":
			validateRequiredPositiveNumberTuple(
				data.halfExtents,
				3,
				`${path}.halfExtents`,
				errors,
			);
			return;
		case "sphere":
			validateRequiredPositiveNumber(data.radius, `${path}.radius`, errors);
			return;
		case "capsule":
			validateRequiredPositiveNumber(
				data.halfHeight,
				`${path}.halfHeight`,
				errors,
			);
			validateRequiredPositiveNumber(data.radius, `${path}.radius`, errors);
			return;
		case "cylinder":
			validateRequiredPositiveNumber(
				data.halfHeight,
				`${path}.halfHeight`,
				errors,
			);
			validateRequiredPositiveNumber(data.radius, `${path}.radius`, errors);
			return;
		case "mesh":
			validateMeshShape(data, path, errors);
			return;
		default:
			errors.push(
				`${path}.type must be box, sphere, capsule, cylinder, or mesh.`,
			);
	}
}

function validateMeshShape(
	data: Record<string, unknown>,
	path: string,
	errors: string[],
): void {
	if (!Array.isArray(data.vertices) || data.vertices.length < 3) {
		errors.push(`${path}.vertices must contain at least 3 vertices.`);
		return;
	}

	for (const [index, vertex] of data.vertices.entries()) {
		validateRequiredNumberTuple(vertex, 3, `${path}.vertices.${index}`, errors);
	}

	if (!Array.isArray(data.indices) || data.indices.length < 3) {
		errors.push(`${path}.indices must contain at least 3 indices.`);
		return;
	}

	if (data.indices.length % 3 !== 0) {
		errors.push(`${path}.indices length must be divisible by 3.`);
	}

	for (const [index, item] of data.indices.entries()) {
		if (
			typeof item !== "number" ||
			!Number.isInteger(item) ||
			item < 0 ||
			item >= data.vertices.length
		) {
			errors.push(`${path}.indices.${index} must be an integer vertex index.`);
		}
	}
}

function requireString(value: unknown, path: string, errors: string[]): void {
	if (typeof value !== "string" || value.length === 0) {
		errors.push(`${path} must be a non-empty string.`);
	}
}

function requireUniqueString(
	value: unknown,
	path: string,
	seen: Set<string>,
	errors: string[],
): void {
	if (typeof value !== "string" || value.length === 0) {
		errors.push(`${path} must be a non-empty string.`);
		return;
	}

	if (seen.has(value)) {
		errors.push(`${path} contains duplicate value "${value}".`);
	}

	seen.add(value);
}

function validateCollisionIntent(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (value !== "solid" && value !== "trigger" && value !== "walkable") {
		errors.push(`${path} must be solid, trigger, or walkable.`);
	}
}

function validateOptionalNumberTuple(
	value: unknown,
	size: number,
	path: string,
	errors: string[],
): void {
	if (value === undefined) {
		return;
	}

	validateRequiredNumberTuple(value, size, path, errors);
}

function validateRequiredNumberTuple(
	value: unknown,
	size: number,
	path: string,
	errors: string[],
): void {
	if (!Array.isArray(value) || value.length !== size) {
		errors.push(`${path} must be a ${size}-item number tuple.`);
		return;
	}

	for (const [index, item] of value.entries()) {
		if (typeof item !== "number" || !Number.isFinite(item)) {
			errors.push(`${path}.${index} must be a finite number.`);
		}
	}
}

function validateRequiredPositiveNumberTuple(
	value: unknown,
	size: number,
	path: string,
	errors: string[],
): void {
	if (!Array.isArray(value) || value.length !== size) {
		errors.push(`${path} must be a ${size}-item positive number tuple.`);
		return;
	}

	for (const [index, item] of value.entries()) {
		if (typeof item !== "number" || !Number.isFinite(item) || item <= 0) {
			errors.push(`${path}.${index} must be a finite positive number.`);
		}
	}
}

function validateRequiredPositiveNumber(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		errors.push(`${path} must be a finite positive number.`);
	}
}

function validateStringArray(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!Array.isArray(data)) {
		errors.push(`${path} must be an array.`);
		return;
	}

	for (const [index, item] of data.entries()) {
		if (typeof item !== "string" || item.length === 0) {
			errors.push(`${path}.${index} must be a non-empty string.`);
		}
	}
}

export { SchemaValidationError as CollisionCookDraftValidationError };
