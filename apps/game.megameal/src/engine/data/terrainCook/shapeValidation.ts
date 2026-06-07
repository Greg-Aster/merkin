import { isRecord } from "./stableValue.js";
import {
	validateRequiredInteger,
	validateRequiredNumberTuple,
	validateRequiredPositiveNumberTuple,
} from "./validationPrimitives.js";

export function validateInputShape(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	switch (data.type) {
		case "heightfield":
			validateHeightfieldShape(data, path, errors);
			return;
		case "box":
			validateBoxShape(data, path, errors);
			return;
		case "mesh":
			validateMeshShape(data, path, errors);
			return;
		default:
			errors.push(`${path}.type must be heightfield, box, or mesh.`);
	}
}

function validateBoxShape(
	data: Record<string, unknown>,
	path: string,
	errors: string[],
): void {
	validateRequiredPositiveNumberTuple(
		data.halfExtents,
		3,
		`${path}.halfExtents`,
		errors,
	);
}

function validateHeightfieldShape(
	data: Record<string, unknown>,
	path: string,
	errors: string[],
): void {
	validateRequiredInteger(data.rows, `${path}.rows`, errors, 2);
	validateRequiredInteger(data.columns, `${path}.columns`, errors, 2);

	if (!Array.isArray(data.heights)) {
		errors.push(`${path}.heights must be an array.`);
	} else {
		for (const [index, item] of data.heights.entries()) {
			if (typeof item !== "number" || !Number.isFinite(item)) {
				errors.push(`${path}.heights.${index} must be a finite number.`);
			}
		}
	}

	if (
		typeof data.rows === "number" &&
		Number.isInteger(data.rows) &&
		typeof data.columns === "number" &&
		Number.isInteger(data.columns) &&
		Array.isArray(data.heights) &&
		data.heights.length !== data.rows * data.columns
	) {
		errors.push(`${path}.heights length must equal rows * columns.`);
	}

	validateRequiredPositiveNumberTuple(
		data.cellSize,
		2,
		`${path}.cellSize`,
		errors,
	);
	validateRequiredNumberTuple(data.origin, 3, `${path}.origin`, errors);
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

export function validateReadiness(
	data: unknown,
	path: string,
	intent: unknown,
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

		if (intent !== "walkable") {
			errors.push(`${path}.requiredWalkable requires intent walkable.`);
		}
	}
}

export function validateBounds(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	validateRequiredNumberTuple(data.min, 3, `${path}.min`, errors);
	validateRequiredNumberTuple(data.max, 3, `${path}.max`, errors);

	if (
		Array.isArray(data.min) &&
		Array.isArray(data.max) &&
		data.min.length === 3 &&
		data.max.length === 3
	) {
		for (const axis of [0, 1, 2] as const) {
			const min = data.min[axis];
			const max = data.max[axis];

			if (
				typeof min === "number" &&
				typeof max === "number" &&
				Number.isFinite(min) &&
				Number.isFinite(max) &&
				min > max
			) {
				errors.push(`${path}.min.${axis} must be <= ${path}.max.${axis}.`);
			}
		}
	}
}
