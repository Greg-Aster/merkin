import {
	isRecord,
	validateOptionalNumberTuple,
	validateRequiredNumberTuple,
	validateRequiredPositiveNumber,
	validateRequiredPositiveNumberTuple,
} from "./helpers.js";

export function validateColliderComponent(
	collider: unknown,
	path: string,
	errors: string[],
): void {
	if (collider === undefined) {
		return;
	}

	if (!isRecord(collider)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (collider.sensor !== undefined && typeof collider.sensor !== "boolean") {
		errors.push(`${path}.sensor must be a boolean when provided.`);
	}

	validateCollisionIntent(collider.intent, `${path}.intent`, errors);
	validateCollisionChannel(collider.channel, `${path}.channel`, errors);
	validateCollisionIntentSensorPolicy(collider, path, errors);
	validateOptionalNumberTuple(collider.offset, 3, `${path}.offset`, errors);

	if (!isRecord(collider.shape)) {
		errors.push(`${path}.shape must be an object.`);
		return;
	}

	const shape = collider.shape;

	if (shape.type === "box") {
		validateRequiredPositiveNumberTuple(
			shape.halfExtents,
			3,
			`${path}.shape.halfExtents`,
			errors,
		);
		return;
	}

	if (shape.type === "sphere") {
		validateRequiredPositiveNumber(
			shape.radius,
			`${path}.shape.radius`,
			errors,
		);
		return;
	}

	if (shape.type === "capsule") {
		validateRequiredPositiveNumber(
			shape.halfHeight,
			`${path}.shape.halfHeight`,
			errors,
		);
		validateRequiredPositiveNumber(
			shape.radius,
			`${path}.shape.radius`,
			errors,
		);
		return;
	}

	if (shape.type === "cylinder") {
		validateRequiredPositiveNumber(
			shape.halfHeight,
			`${path}.shape.halfHeight`,
			errors,
		);
		validateRequiredPositiveNumber(
			shape.radius,
			`${path}.shape.radius`,
			errors,
		);
		return;
	}

	if (shape.type === "mesh") {
		if (!Array.isArray(shape.vertices) || shape.vertices.length < 3) {
			errors.push(`${path}.shape.vertices must contain at least 3 vertices.`);
			return;
		}

		for (const [index, vertex] of shape.vertices.entries()) {
			validateRequiredNumberTuple(
				vertex,
				3,
				`${path}.shape.vertices.${index}`,
				errors,
			);
		}

		if (!Array.isArray(shape.indices) || shape.indices.length < 3) {
			errors.push(`${path}.shape.indices must contain at least 3 indices.`);
			return;
		}

		if (shape.indices.length % 3 !== 0) {
			errors.push(`${path}.shape.indices length must be divisible by 3.`);
		}

		for (const [index, item] of shape.indices.entries()) {
			if (
				typeof item !== "number" ||
				!Number.isInteger(item) ||
				item < 0 ||
				item >= shape.vertices.length
			) {
				errors.push(
					`${path}.shape.indices.${index} must be an integer vertex index.`,
				);
			}
		}
		return;
	}

	errors.push(
		`${path}.shape.type must be box, sphere, capsule, cylinder, or mesh.`,
	);
}

export function validateCollisionIntent(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (value !== "solid" && value !== "trigger" && value !== "walkable") {
		errors.push(`${path} must be solid, trigger, or walkable.`);
	}
}

export function validateCollisionChannel(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (typeof value !== "string" || value.length === 0) {
		errors.push(`${path} must be a non-empty string.`);
	}
}

export function validateCollisionIntentSensorPolicy(
	collider: Record<string, unknown>,
	path: string,
	errors: string[],
): void {
	if (collider.intent === "trigger" && collider.sensor !== true) {
		errors.push(`${path}.sensor must be true when intent is trigger.`);
	}

	if (
		(collider.intent === "solid" || collider.intent === "walkable") &&
		collider.sensor === true
	) {
		errors.push(
			`${path}.sensor cannot be true when intent is solid or walkable.`,
		);
	}
}
