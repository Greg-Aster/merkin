export function validateOptionalNumberTuple(
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

export function validateRequiredNumberTuple(
	value: unknown,
	length: number,
	path: string,
	errors: string[],
): void {
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

export function validateRequiredPositiveNumberTuple(
	value: unknown,
	length: number,
	path: string,
	errors: string[],
): void {
	if (!Array.isArray(value) || value.length !== length) {
		errors.push(`${path} must be an array with ${length} positive numbers.`);
		return;
	}

	for (const [index, item] of value.entries()) {
		if (typeof item !== "number" || !Number.isFinite(item) || item <= 0) {
			errors.push(`${path}.${index} must be a positive finite number.`);
		}
	}
}

export function validateRequiredVec3Object(
	value: unknown,
	path: string,
	errors: string[],
	options: { readonly positive?: boolean } = {},
): void {
	if (!isRecord(value)) {
		errors.push(`${path} must be an object with x, y, and z numbers.`);
		return;
	}

	for (const axis of ["x", "y", "z"] as const) {
		const item = value[axis];

		if (
			typeof item !== "number" ||
			!Number.isFinite(item) ||
			(options.positive === true && item <= 0)
		) {
			errors.push(
				options.positive === true
					? `${path}.${axis} must be a positive finite number.`
					: `${path}.${axis} must be a finite number.`,
			);
		}
	}
}

export function validateRequiredVec3Like(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (Array.isArray(value)) {
		validateRequiredNumberTuple(value, 3, path, errors);
		return;
	}

	validateRequiredVec3Object(value, path, errors);
}

export function validateRequiredPositiveNumber(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		errors.push(`${path} must be a positive finite number.`);
	}
}

export function validateRequiredPositiveInteger(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (
		typeof value !== "number" ||
		!Number.isFinite(value) ||
		!Number.isInteger(value) ||
		value <= 0
	) {
		errors.push(`${path} must be a positive finite integer.`);
	}
}

export function validateOptionalPositiveNumber(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (value !== undefined) {
		validateRequiredPositiveNumber(value, path, errors);
	}
}

export function validateOptionalNumber(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (value !== undefined) {
		validateRequiredNumber(value, path, errors);
	}
}

export function validateOptionalNonNegativeNumber(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (value !== undefined) {
		validateRequiredNonNegativeNumber(value, path, errors);
	}
}

export function validateOptionalNonNegativeInteger(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (value === undefined) {
		return;
	}

	if (
		typeof value !== "number" ||
		!Number.isFinite(value) ||
		!Number.isInteger(value) ||
		value < 0
	) {
		errors.push(`${path} must be a non-negative finite integer.`);
	}
}

export function validateRequiredNumber(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		errors.push(`${path} must be a finite number.`);
	}
}

export function validateRequiredNonNegativeNumber(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
		errors.push(`${path} must be a non-negative finite number.`);
	}
}

export function validateRequiredNonNegativeInteger(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
		errors.push(`${path} must be a non-negative integer.`);
	}
}

export function validateRequiredAlpha(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (
		typeof value !== "number" ||
		!Number.isFinite(value) ||
		value < 0 ||
		value > 1
	) {
		errors.push(`${path} must be a finite number from 0 to 1.`);
	}
}

export function validateRequiredHexColor(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (
		typeof value !== "string" ||
		!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
	) {
		errors.push(`${path} must be a #rgb or #rrggbb color string.`);
	}
}

export function validateOptionalStringArray(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (value === undefined) {
		return;
	}

	if (!Array.isArray(value)) {
		errors.push(`${path} must be an array when provided.`);
		return;
	}

	for (const [index, item] of value.entries()) {
		if (typeof item !== "string" || item.length === 0) {
			errors.push(`${path}.${index} must be a non-empty string.`);
		}
	}
}

export function validateOptionalColorSpace(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (value === undefined) {
		return;
	}

	if (value !== "srgb" && value !== "linear") {
		errors.push(`${path} must be srgb or linear when provided.`);
	}
}

export function validateRequiredStringArray(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (!Array.isArray(value)) {
		errors.push(`${path} must be an array.`);
		return;
	}

	for (const [index, item] of value.entries()) {
		if (typeof item !== "string" || item.length === 0) {
			errors.push(`${path}.${index} must be a non-empty string.`);
		}
	}
}

export function validateSerializableValue(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (
		value === null ||
		typeof value === "string" ||
		typeof value === "boolean"
	) {
		return;
	}

	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			errors.push(`${path} must be finite when it is a number.`);
		}
		return;
	}

	if (Array.isArray(value)) {
		for (const [index, item] of value.entries()) {
			validateSerializableValue(item, `${path}.${index}`, errors);
		}
		return;
	}

	if (isRecord(value)) {
		for (const [key, item] of Object.entries(value)) {
			if (item === undefined) {
				errors.push(`${path}.${key} cannot be undefined.`);
				continue;
			}

			validateSerializableValue(item, `${path}.${key}`, errors);
		}
		return;
	}

	errors.push(`${path} must be JSON-serializable data.`);
}

export function requireString(
	data: Record<string, unknown>,
	key: string,
	path: string,
	errors: string[],
): void {
	const value = data[key];

	if (typeof value !== "string" || value.length === 0) {
		errors.push(`${path} must be a non-empty string.`);
	}
}

export function requireUniqueString(
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
		errors.push(`${path} "${value}" must be unique.`);
		return;
	}

	seen.add(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		Object.getPrototypeOf(value) === Object.prototype
	);
}
