import {
	SchemaValidationError,
	createSchemaValidator,
	validateLightComponentData,
} from "../schemas/index.js";
import {
	type CollisionCookDraftData,
	type CollisionCookPreviewPatch,
	LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
	type LevelEditorCoreObjectPreviewPatch,
	type LevelEditorDevPreviewMessage,
	type LevelEditorObjectEditPreviewPatch,
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

export const levelEditorCoreObjectPreviewPatchValidator =
	createSchemaValidator<LevelEditorCoreObjectPreviewPatch>(
		"LevelEditorCoreObjectPreviewPatch",
		validateLevelEditorCoreObjectPreviewPatch,
	);

export const levelEditorObjectEditPreviewPatchValidator =
	createSchemaValidator<LevelEditorObjectEditPreviewPatch>(
		"LevelEditorObjectEditPreviewPatch",
		validateLevelEditorObjectEditPreviewPatch,
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

export function parseLevelEditorCoreObjectPreviewPatch(
	data: unknown,
): LevelEditorCoreObjectPreviewPatch {
	return levelEditorCoreObjectPreviewPatchValidator.parse(data);
}

export function parseLevelEditorObjectEditPreviewPatch(
	data: unknown,
): LevelEditorObjectEditPreviewPatch {
	return levelEditorObjectEditPreviewPatchValidator.parse(data);
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

export function validateLevelEditorCoreObjectPreviewPatch(
	data: unknown,
): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(data)) {
		return ["core object preview patch must be an object."];
	}

	if (data.schemaVersion !== 1) {
		errors.push("coreObjectPreviewPatch.schemaVersion must be 1.");
	}

	if (data.channel !== "level-editor-core-object-preview") {
		errors.push(
			"coreObjectPreviewPatch.channel must be level-editor-core-object-preview.",
		);
	}

	if (data.mode !== "temporary-preview") {
		errors.push("coreObjectPreviewPatch.mode must be temporary-preview.");
	}

	requireString(
		data.runtimeSceneId,
		"coreObjectPreviewPatch.runtimeSceneId",
		errors,
	);
	requireString(data.levelId, "coreObjectPreviewPatch.levelId", errors);
	requireString(
		data.sourcePlanHash,
		"coreObjectPreviewPatch.sourcePlanHash",
		errors,
	);

	if (!Array.isArray(data.entries) || data.entries.length === 0) {
		errors.push(
			"coreObjectPreviewPatch.entries must contain at least one entry.",
		);
		return errors;
	}

	const stableIds = new Set<string>();

	for (const [index, entry] of data.entries.entries()) {
		validateCoreObjectPreviewEntry(
			entry,
			`coreObjectPreviewPatch.entries.${index}`,
			stableIds,
			errors,
		);
	}

	return errors;
}

export function validateLevelEditorObjectEditPreviewPatch(
	data: unknown,
): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(data)) {
		return ["object edit preview patch must be an object."];
	}

	if (data.schemaVersion !== 1) {
		errors.push("objectEditPreviewPatch.schemaVersion must be 1.");
	}

	if (data.channel !== "level-editor-object-edit-preview") {
		errors.push(
			"objectEditPreviewPatch.channel must be level-editor-object-edit-preview.",
		);
	}

	if (data.mode !== "temporary-preview") {
		errors.push("objectEditPreviewPatch.mode must be temporary-preview.");
	}

	requireString(
		data.runtimeSceneId,
		"objectEditPreviewPatch.runtimeSceneId",
		errors,
	);
	requireString(data.levelId, "objectEditPreviewPatch.levelId", errors);
	requireString(
		data.sourcePlanHash,
		"objectEditPreviewPatch.sourcePlanHash",
		errors,
	);

	if (!Array.isArray(data.entries) || data.entries.length === 0) {
		errors.push(
			"objectEditPreviewPatch.entries must contain at least one entry.",
		);
		return errors;
	}

	const entryKeys = new Set<string>();

	for (const [index, entry] of data.entries.entries()) {
		validateObjectEditPreviewEntry(
			entry,
			`objectEditPreviewPatch.entries.${index}`,
			entryKeys,
			errors,
		);
	}

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
		case "core-object-preview-patch":
			for (const error of validateLevelEditorCoreObjectPreviewPatch(
				data.payload,
			)) {
				errors.push(`levelEditorDevPreviewMessage.payload: ${error}`);
			}
			return errors;
		case "object-edit-preview-patch":
			for (const error of validateLevelEditorObjectEditPreviewPatch(
				data.payload,
			)) {
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
		case "clear-core-object-preview":
			validateCoreObjectPreviewClearRequest(
				data.request,
				"levelEditorDevPreviewMessage.request",
				errors,
			);
			return errors;
		case "clear-object-edit-preview":
			validateObjectEditPreviewClearRequest(
				data.request,
				"levelEditorDevPreviewMessage.request",
				errors,
			);
			return errors;
		case "camera-live-edit-mode":
			validateCameraLiveEditModeRequest(
				data.request,
				"levelEditorDevPreviewMessage.request",
				errors,
			);
			return errors;
		case "runtime-reload-ack":
			validateRuntimeReloadAckPayload(
				data.payload,
				"levelEditorDevPreviewMessage.payload",
				errors,
			);
			return errors;
		case "runtime-telemetry":
			validateRuntimeTelemetryPayload(
				data.payload,
				"levelEditorDevPreviewMessage.payload",
				errors,
			);
			return errors;
		default:
			errors.push(
				"levelEditorDevPreviewMessage.type must be collision-preview-patch, core-object-preview-patch, object-edit-preview-patch, reload-runtime-scene, clear-collision-preview, clear-core-object-preview, clear-object-edit-preview, camera-live-edit-mode, runtime-reload-ack, or runtime-telemetry.",
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

function validateCoreObjectPreviewClearRequest(
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

	if (data.targetKinds !== undefined) {
		validateTargetKindArray(data.targetKinds, `${path}.targetKinds`, errors);
	}
}

function validateObjectEditPreviewClearRequest(
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

	if (data.operations !== undefined) {
		validateObjectEditOperationArray(
			data.operations,
			`${path}.operations`,
			errors,
		);
	}
}

function validateCameraLiveEditModeRequest(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(data.runtimeSceneId, `${path}.runtimeSceneId`, errors);

	if (data.mode !== "edit" && data.mode !== "gameplay") {
		errors.push(`${path}.mode must be edit or gameplay.`);
	}

	if (
		data.sourcePlanHash !== undefined &&
		typeof data.sourcePlanHash !== "string"
	) {
		errors.push(`${path}.sourcePlanHash must be a string when provided.`);
	}

	if (data.mode === "edit" && data.pose === undefined) {
		errors.push(`${path}.pose is required for edit mode.`);
	}

	if (data.pose !== undefined) {
		validateCameraLiveEditPose(data.pose, `${path}.pose`, errors);
	}
}

function validateRuntimeReloadAckPayload(
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
		data.activeRuntimeSceneId !== undefined &&
		typeof data.activeRuntimeSceneId !== "string"
	) {
		errors.push(`${path}.activeRuntimeSceneId must be a string when provided.`);
	}

	if (data.status !== "accepted" && data.status !== "ignored") {
		errors.push(`${path}.status must be accepted or ignored.`);
	}

	if (
		data.reason !== "reload-requested" &&
		data.reason !== "runtime-scene-not-active" &&
		data.reason !== "transition-port-unavailable"
	) {
		errors.push(
			`${path}.reason must be reload-requested, runtime-scene-not-active, or transition-port-unavailable.`,
		);
	}

	if (
		data.sourcePlanHash !== undefined &&
		typeof data.sourcePlanHash !== "string"
	) {
		errors.push(`${path}.sourcePlanHash must be a string when provided.`);
	}
}

function validateRuntimeTelemetryPayload(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(data.runtimeSceneId, `${path}.runtimeSceneId`, errors);
	validateRuntimeLifecycle(data.lifecycle, `${path}.lifecycle`, errors);
	validateNonNegativeInteger(data.tick, `${path}.tick`, errors);
	validateBoolean(data.playerAlive, `${path}.playerAlive`, errors);
	validateRequiredNumberTuple(
		data.playerPosition,
		3,
		`${path}.playerPosition`,
		errors,
	);
	validateRequiredNumberTuple(data.health, 2, `${path}.health`, errors);
	validateNonNegativeInteger(
		data.remainingCollectibles,
		`${path}.remainingCollectibles`,
		errors,
	);
	validateNonNegativeInteger(
		data.collectedCount,
		`${path}.collectedCount`,
		errors,
	);
	validateBoolean(data.moving, `${path}.moving`, errors);
	validateBoolean(data.pointerLocked, `${path}.pointerLocked`, errors);
	validateBoolean(data.lookActive, `${path}.lookActive`, errors);
	validateBoolean(data.inputEnabled, `${path}.inputEnabled`, errors);
	validateBoolean(data.charging, `${path}.charging`, errors);
	validateAlpha(data.chargeAmount, `${path}.chargeAmount`, errors);
	validateFiniteNumber(data.updatedAtMs, `${path}.updatedAtMs`, errors);
}

function validateCoreObjectPreviewEntry(
	data: unknown,
	path: string,
	stableIds: Set<string>,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireUniqueString(data.stableId, `${path}.stableId`, stableIds, errors);
	validateTransform(data.transform, `${path}.transform`, errors);

	switch (data.targetKind) {
		case "light":
			for (const error of validateLightComponentData(
				data.light,
				`${path}.light`,
			)) {
				errors.push(error);
			}
			return;
		case "spawn":
			if (data.transform === undefined) {
				errors.push(`${path}.transform is required for spawn previews.`);
			}
			return;
		case "portal":
			validatePortalPreviewComponent(data.portal, `${path}.portal`, errors);
			return;
		case "audio-emitter":
			validateSoundEmitterPreviewComponent(
				data.soundEmitter,
				`${path}.soundEmitter`,
				errors,
			);
			return;
		default:
			errors.push(
				`${path}.targetKind must be light, spawn, portal, or audio-emitter.`,
			);
	}
}

function validateObjectEditPreviewEntry(
	data: unknown,
	path: string,
	entryKeys: Set<string>,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(data.stableId, `${path}.stableId`, errors);

	if (typeof data.stableId === "string") {
		const operation =
			typeof data.operation === "string" ? data.operation : "unknown";
		const entryKey = `${operation}:${data.stableId}`;

		if (entryKeys.has(entryKey)) {
			errors.push(`${path} duplicates ${entryKey}.`);
		}

		entryKeys.add(entryKey);
	}

	switch (data.operation) {
		case "transform":
			if (data.transform === undefined) {
				errors.push(`${path}.transform is required for transform previews.`);
			}
			validateTransform(data.transform, `${path}.transform`, errors);
			return;
		case "component-patch":
			validateObjectEditComponents(
				data.components,
				`${path}.components`,
				errors,
				{ required: false },
			);

			if (data.removeComponents !== undefined) {
				validateComponentNameArray(
					data.removeComponents,
					`${path}.removeComponents`,
					errors,
				);
			}

			if (
				data.components === undefined &&
				data.removeComponents === undefined
			) {
				errors.push(
					`${path} must include components or removeComponents for component-patch previews.`,
				);
			}
			return;
		case "insert":
			if (data.prefabId !== undefined && typeof data.prefabId !== "string") {
				errors.push(`${path}.prefabId must be a string when provided.`);
			}

			validateTransform(data.transform, `${path}.transform`, errors);
			validateObjectEditComponents(
				data.components,
				`${path}.components`,
				errors,
				{ required: true },
			);
			return;
		case "remove":
			validateComponentNameArray(
				data.componentNames,
				`${path}.componentNames`,
				errors,
			);
			return;
		default:
			errors.push(
				`${path}.operation must be transform, component-patch, insert, or remove.`,
			);
	}
}

function validatePortalPreviewComponent(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(data.id, `${path}.id`, errors);
	requireString(data.label, `${path}.label`, errors);

	if (data.prompt !== undefined && typeof data.prompt !== "string") {
		errors.push(`${path}.prompt must be a string when provided.`);
	}

	if (
		data.targetRuntimeSceneId !== undefined &&
		typeof data.targetRuntimeSceneId !== "string"
	) {
		errors.push(`${path}.targetRuntimeSceneId must be a string when provided.`);
	}

	if (data.activationRadius !== undefined) {
		validateRequiredPositiveNumber(
			data.activationRadius,
			`${path}.activationRadius`,
			errors,
		);
	}
}

function validateSoundEmitterPreviewComponent(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(data.soundId, `${path}.soundId`, errors);

	for (const property of ["active", "loop", "autoplay"] as const) {
		if (data[property] !== undefined && typeof data[property] !== "boolean") {
			errors.push(`${path}.${property} must be a boolean when provided.`);
		}
	}

	for (const property of ["busId", "sceneId"] as const) {
		if (data[property] !== undefined && typeof data[property] !== "string") {
			errors.push(`${path}.${property} must be a string when provided.`);
		}
	}

	for (const property of [
		"refDistance",
		"maxDistance",
		"rolloffFactor",
		"coneInnerAngle",
		"coneOuterAngle",
	] as const) {
		if (data[property] !== undefined) {
			validateRequiredPositiveNumber(
				data[property],
				`${path}.${property}`,
				errors,
			);
		}
	}

	if (data.volume !== undefined) {
		validateAlpha(data.volume, `${path}.volume`, errors);
	}

	if (data.coneOuterGain !== undefined) {
		validateAlpha(data.coneOuterGain, `${path}.coneOuterGain`, errors);
	}

	if (
		data.distanceModel !== undefined &&
		data.distanceModel !== "inverse" &&
		data.distanceModel !== "linear" &&
		data.distanceModel !== "exponential"
	) {
		errors.push(
			`${path}.distanceModel must be inverse, linear, or exponential when provided.`,
		);
	}
}

function validateObjectEditComponents(
	data: unknown,
	path: string,
	errors: string[],
	options: { readonly required: boolean },
): void {
	if (data === undefined) {
		if (options.required) {
			errors.push(`${path} is required.`);
		}
		return;
	}

	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	const entries = Object.entries(data);

	if (options.required && entries.length === 0) {
		errors.push(`${path} must contain at least one component.`);
	}

	for (const [componentName, component] of entries) {
		if (componentName.length === 0) {
			errors.push(`${path} cannot contain an empty component name.`);
			continue;
		}

		validateSerializablePreviewValue(
			component,
			`${path}.${componentName}`,
			errors,
		);
	}
}

function validateComponentNameArray(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!Array.isArray(data) || data.length === 0) {
		errors.push(`${path} must contain at least one component name.`);
		return;
	}

	const seen = new Set<string>();

	for (const [index, componentName] of data.entries()) {
		if (typeof componentName !== "string" || componentName.length === 0) {
			errors.push(`${path}.${index} must be a non-empty string.`);
			continue;
		}

		if (seen.has(componentName)) {
			errors.push(`${path}.${index} duplicates ${componentName}.`);
		}

		seen.add(componentName);
	}
}

function validateObjectEditOperationArray(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!Array.isArray(data) || data.length === 0) {
		errors.push(`${path} must contain at least one operation.`);
		return;
	}

	for (const [index, operation] of data.entries()) {
		if (
			operation !== "transform" &&
			operation !== "component-patch" &&
			operation !== "insert" &&
			operation !== "remove"
		) {
			errors.push(
				`${path}.${index} must be transform, component-patch, insert, or remove.`,
			);
		}
	}
}

function validateCameraLiveEditPose(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	validateRequiredNumberTuple(data.position, 3, `${path}.position`, errors);
	validateRequiredNumberTuple(data.rotation, 4, `${path}.rotation`, errors);
	validateRequiredPositiveNumber(data.fovDegrees, `${path}.fovDegrees`, errors);
	validateRequiredPositiveNumber(data.near, `${path}.near`, errors);
	validateRequiredPositiveNumber(data.far, `${path}.far`, errors);

	if (
		typeof data.near === "number" &&
		Number.isFinite(data.near) &&
		typeof data.far === "number" &&
		Number.isFinite(data.far) &&
		data.far <= data.near
	) {
		errors.push(`${path}.far must be greater than near.`);
	}
}

function validateSerializablePreviewValue(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (data === undefined) {
		errors.push(`${path} must be JSON-serializable and cannot be undefined.`);
		return;
	}

	if (data === null || typeof data === "string" || typeof data === "boolean") {
		return;
	}

	if (typeof data === "number") {
		if (!Number.isFinite(data)) {
			errors.push(`${path} must be a finite number.`);
		}
		return;
	}

	if (Array.isArray(data)) {
		for (const [index, item] of data.entries()) {
			validateSerializablePreviewValue(item, `${path}.${index}`, errors);
		}
		return;
	}

	if (isRecord(data)) {
		for (const [property, item] of Object.entries(data)) {
			if (property.length === 0) {
				errors.push(`${path} cannot contain an empty property name.`);
				continue;
			}

			validateSerializablePreviewValue(item, `${path}.${property}`, errors);
		}
		return;
	}

	errors.push(`${path} must be JSON-serializable.`);
}

function validateTargetKindArray(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!Array.isArray(data)) {
		errors.push(`${path} must be an array.`);
		return;
	}

	for (const [index, item] of data.entries()) {
		if (
			item !== "light" &&
			item !== "spawn" &&
			item !== "portal" &&
			item !== "audio-emitter"
		) {
			errors.push(
				`${path}.${index} must be light, spawn, portal, or audio-emitter.`,
			);
		}
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

	if (
		data.terrainPackageOwned !== undefined &&
		typeof data.terrainPackageOwned !== "boolean"
	) {
		errors.push(`${path}.terrainPackageOwned must be a boolean when provided.`);
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

function validateRuntimeLifecycle(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (
		value !== "created" &&
		value !== "started" &&
		value !== "paused" &&
		value !== "stopped" &&
		value !== "disposed"
	) {
		errors.push(
			`${path} must be created, started, paused, stopped, or disposed.`,
		);
	}
}

function validateBoolean(value: unknown, path: string, errors: string[]): void {
	if (typeof value !== "boolean") {
		errors.push(`${path} must be a boolean.`);
	}
}

function validateFiniteNumber(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		errors.push(`${path} must be a finite number.`);
	}
}

function validateNonNegativeInteger(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
		errors.push(`${path} must be a non-negative safe integer.`);
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

function validateAlpha(value: unknown, path: string, errors: string[]): void {
	if (
		typeof value !== "number" ||
		!Number.isFinite(value) ||
		value < 0 ||
		value > 1
	) {
		errors.push(`${path} must be a finite number between 0 and 1.`);
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
