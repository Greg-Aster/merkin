import {
	validateKnownComponents,
	validateLevelInstance,
} from "./componentSchemas.js";
import {
	isRecord,
	requireString,
	validateOptionalStringArray,
	validateSerializableValue,
} from "./helpers.js";
import type { LevelData, PrefabData } from "./types.js";
import { createSchemaValidator } from "./validation.js";

export const prefabDefinitionValidator = createSchemaValidator<PrefabData>(
	"PrefabDefinition",
	validatePrefabDefinition,
);

export const levelDefinitionValidator = createSchemaValidator<LevelData>(
	"LevelDefinition",
	validateLevelDefinition,
);

export function validatePrefabDefinition(data: unknown): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(data)) {
		return ["Prefab must be an object."];
	}

	requireString(data, "id", "prefab.id", errors);

	if (!isRecord(data.components)) {
		errors.push("prefab.components must be an object.");
	} else {
		const componentNames = Object.keys(data.components);

		if (componentNames.length === 0) {
			errors.push("prefab.components must contain at least one component.");
		}

		for (const [componentName, component] of Object.entries(data.components)) {
			if (componentName.length === 0) {
				errors.push(
					"prefab.components cannot contain an empty component name.",
				);
			}

			validateSerializableValue(
				component,
				`prefab.components.${componentName}`,
				errors,
			);
		}

		validateKnownComponents(data.components, "prefab.components", errors);
	}

	validateOptionalStringArray(data.assetIds, "prefab.assetIds", errors);
	validateOptionalStringArray(data.tags, "prefab.tags", errors);

	return errors;
}

export function validateLevelDefinition(data: unknown): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(data)) {
		return ["Level must be an object."];
	}

	requireString(data, "id", "level.id", errors);

	if (data.sceneId !== undefined) {
		requireString(data, "sceneId", "level.sceneId", errors);
	}

	validateOptionalStringArray(data.preload, "level.preload", errors);
	validateOptionalStringArray(
		data.preloadGroups,
		"level.preloadGroups",
		errors,
	);

	if (data.resources !== undefined) {
		if (!isRecord(data.resources)) {
			errors.push("level.resources must be an object when provided.");
		} else {
			for (const [resourceName, resource] of Object.entries(data.resources)) {
				validateSerializableValue(
					resource,
					`level.resources.${resourceName}`,
					errors,
				);
			}
		}
	}

	if (!Array.isArray(data.instances)) {
		errors.push("level.instances must be an array.");
		return errors;
	}

	for (const [index, instance] of data.instances.entries()) {
		validateLevelInstance(instance, `level.instances.${index}`, errors);
	}

	return errors;
}
