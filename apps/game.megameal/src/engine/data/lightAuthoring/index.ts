import type {
	LightComponentData,
	RuntimeSceneManifestData,
} from "../schemas/index.js";
import {
	SchemaValidationError,
	createSchemaValidator,
	validateLightComponentData,
} from "../schemas/index.js";

export type LightAuthoringTarget = "prefab" | "level-instance";

export type LightAuthoringTransformData = {
	readonly position?: readonly [number, number, number];
	readonly rotation?: readonly [number, number, number, number];
	readonly scale?: readonly [number, number, number];
};

export type LightAuthoringDraftEntryData = {
	readonly id: string;
	readonly stableId: string;
	readonly prefabId: string;
	readonly lightTarget: LightAuthoringTarget;
	readonly transform?: LightAuthoringTransformData;
	readonly light: LightComponentData;
	readonly readiness: {
		readonly requiredLight: boolean;
	};
	readonly notes?: string;
};

export type LightAuthoringDraftData = {
	readonly schemaVersion: 1;
	readonly id: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly targetFiles: {
		readonly prefabModule: string;
		readonly levelModule: string;
		readonly runtimeSceneManifestModule: string;
	};
	readonly entries: readonly LightAuthoringDraftEntryData[];
};

export type LightAuthoringPlanEntry = LightAuthoringDraftEntryData;

export type LightAuthoringPlan = {
	readonly draftId: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly targetFiles: LightAuthoringDraftData["targetFiles"];
	readonly entries: readonly LightAuthoringPlanEntry[];
};

export type LightAuthoringRuntimeValidationResult =
	| {
			readonly ok: true;
	  }
	| {
			readonly ok: false;
			readonly errors: readonly string[];
	  };

export const lightAuthoringDraftValidator =
	createSchemaValidator<LightAuthoringDraftData>(
		"LightAuthoringDraft",
		validateLightAuthoringDraft,
	);

export function parseLightAuthoringDraft(
	data: unknown,
): LightAuthoringDraftData {
	return lightAuthoringDraftValidator.parse(data);
}

export function buildLightAuthoringPlan(
	draftInput: LightAuthoringDraftData,
): LightAuthoringPlan {
	const draft = parseLightAuthoringDraft(draftInput);

	return {
		draftId: draft.id,
		runtimeSceneId: draft.runtimeSceneId,
		levelId: draft.levelId,
		targetFiles: draft.targetFiles,
		entries: draft.entries.map((entry) => ({ ...entry })),
	};
}

export function validateLightAuthoringPlanAgainstRuntimeScene(
	plan: LightAuthoringPlan,
	manifest: RuntimeSceneManifestData,
): LightAuthoringRuntimeValidationResult {
	const errors: string[] = [];

	if (plan.runtimeSceneId !== manifest.id) {
		errors.push(
			`light authoring plan "${plan.draftId}" targets runtime scene "${plan.runtimeSceneId}", but manifest is "${manifest.id}".`,
		);
	}

	if (plan.levelId !== manifest.level.id) {
		errors.push(
			`light authoring plan "${plan.draftId}" targets level "${plan.levelId}", but manifest level is "${manifest.level.id}".`,
		);
	}

	const prefabs = new Map(
		manifest.prefabs.map((prefab) => [prefab.id, prefab]),
	);
	const instances = new Map(
		manifest.level.instances.map((instance) => [instance.stableId, instance]),
	);
	const requiredLightStableIds = new Set(
		manifest.readiness.requiredLightStableIds ?? [],
	);

	for (const entry of plan.entries) {
		const instance = instances.get(entry.stableId);

		if (!instance) {
			errors.push(
				`light authoring entry "${entry.id}" stableId "${entry.stableId}" is not present in manifest "${manifest.id}".`,
			);
			continue;
		}

		if (instance.prefabId !== entry.prefabId) {
			errors.push(
				`light authoring entry "${entry.id}" stableId "${entry.stableId}" expects prefab "${entry.prefabId}", but runtime instance uses "${instance.prefabId}".`,
			);
			continue;
		}

		const prefab = prefabs.get(entry.prefabId);

		if (!prefab) {
			errors.push(
				`light authoring entry "${entry.id}" references missing prefab "${entry.prefabId}" in manifest "${manifest.id}".`,
			);
			continue;
		}

		const runtimeLight =
			entry.lightTarget === "prefab"
				? prefab.components.Light
				: instance.components?.Light;

		if (!isRecord(runtimeLight)) {
			errors.push(
				`light authoring entry "${entry.id}" targets ${entry.lightTarget} light output, but that target has no Light component.`,
			);
			continue;
		}

		if (!jsonEqual(runtimeLight, entry.light)) {
			errors.push(
				`light authoring entry "${entry.id}" target ${entry.lightTarget} Light does not match the authored draft.`,
			);
		}

		if (
			entry.readiness.requiredLight &&
			!requiredLightStableIds.has(entry.stableId)
		) {
			errors.push(
				`light authoring entry "${entry.id}" stableId "${entry.stableId}" is missing from readiness.requiredLightStableIds.`,
			);
		}
	}

	return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function validateLightAuthoringDraft(data: unknown): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(data)) {
		return ["light authoring draft must be an object."];
	}

	if (data.schemaVersion !== 1) {
		errors.push("lightAuthoringDraft.schemaVersion must be 1.");
	}

	requireNonEmptyString(data.id, "lightAuthoringDraft.id", errors);
	requireNonEmptyString(
		data.runtimeSceneId,
		"lightAuthoringDraft.runtimeSceneId",
		errors,
	);
	requireNonEmptyString(data.levelId, "lightAuthoringDraft.levelId", errors);
	validateTargetFiles(
		data.targetFiles,
		"lightAuthoringDraft.targetFiles",
		errors,
	);

	if (!Array.isArray(data.entries) || data.entries.length === 0) {
		errors.push("lightAuthoringDraft.entries must contain at least one entry.");
		return errors;
	}

	const entryIds = new Set<string>();
	const stableIds = new Set<string>();

	for (const [index, entry] of data.entries.entries()) {
		validateLightAuthoringDraftEntry(
			entry,
			`lightAuthoringDraft.entries.${index}`,
			entryIds,
			stableIds,
			errors,
		);
	}

	return errors;
}

function validateLightAuthoringDraftEntry(
	data: unknown,
	path: string,
	entryIds: Set<string>,
	stableIds: Set<string>,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireUniqueNonEmptyString(data.id, `${path}.id`, entryIds, errors);
	requireUniqueNonEmptyString(
		data.stableId,
		`${path}.stableId`,
		stableIds,
		errors,
	);
	requireNonEmptyString(data.prefabId, `${path}.prefabId`, errors);

	if (data.lightTarget !== "prefab" && data.lightTarget !== "level-instance") {
		errors.push(`${path}.lightTarget must be prefab or level-instance.`);
	}

	if (data.transform !== undefined) {
		validateTransform(data.transform, `${path}.transform`, errors);
	}

	errors.push(...validateLightComponentData(data.light, `${path}.light`));

	if (!isRecord(data.readiness)) {
		errors.push(`${path}.readiness must be an object.`);
	} else if (typeof data.readiness.requiredLight !== "boolean") {
		errors.push(`${path}.readiness.requiredLight must be a boolean.`);
	}

	if (data.notes !== undefined && typeof data.notes !== "string") {
		errors.push(`${path}.notes must be a string when provided.`);
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

	requireNonEmptyString(data.prefabModule, `${path}.prefabModule`, errors);
	requireNonEmptyString(data.levelModule, `${path}.levelModule`, errors);
	requireNonEmptyString(
		data.runtimeSceneManifestModule,
		`${path}.runtimeSceneManifestModule`,
		errors,
	);
}

function validateTransform(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object when provided.`);
		return;
	}

	validateOptionalNumberTuple(data.position, 3, `${path}.position`, errors);
	validateOptionalNumberTuple(data.rotation, 4, `${path}.rotation`, errors);
	validateOptionalNumberTuple(data.scale, 3, `${path}.scale`, errors);
}

function requireUniqueNonEmptyString(
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
		errors.push(`${path} "${value}" is duplicated.`);
		return;
	}

	seen.add(value);
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

function jsonEqual(left: unknown, right: unknown): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export { SchemaValidationError as LightAuthoringDraftValidationError };
