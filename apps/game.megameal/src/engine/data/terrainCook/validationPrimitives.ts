export function requireString(
	value: unknown,
	path: string,
	errors: string[],
): void {
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
		errors.push(`${path} contains duplicate value "${value}".`);
	}

	seen.add(value);
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

export function validateStringArray(
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

export function validateChunkStableIdList(
	data: unknown,
	path: string,
	chunkStableIds: ReadonlySet<string>,
	options: {
		readonly required?: boolean;
		readonly requireNonEmpty?: boolean;
		readonly requireAllChunks?: boolean;
	},
	errors: string[],
): void {
	if (data === undefined && options.required !== true) {
		return;
	}

	validateStringArray(data, path, errors);

	if (!Array.isArray(data)) {
		return;
	}

	if (options.requireNonEmpty === true && data.length === 0) {
		errors.push(`${path} must not be empty.`);
	}

	const seen = new Set<string>();

	for (const [index, stableId] of data.entries()) {
		if (typeof stableId !== "string" || stableId.length === 0) {
			continue;
		}

		if (seen.has(stableId)) {
			errors.push(`${path}.${index} contains duplicate chunk "${stableId}".`);
		}

		seen.add(stableId);

		if (!chunkStableIds.has(stableId)) {
			errors.push(`${path}.${index} references unknown chunk "${stableId}".`);
		}
	}

	if (options.requireAllChunks === true) {
		for (const stableId of chunkStableIds) {
			if (!seen.has(stableId)) {
				errors.push(`${path} is missing chunk "${stableId}".`);
			}
		}
	}
}

export function validateRequiredNumberTuple(
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

export function validateRequiredPositiveNumberTuple(
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

export function validateRequiredPositiveNumber(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		errors.push(`${path} must be a finite positive number.`);
	}
}

export function validateRequiredInteger(
	value: unknown,
	path: string,
	errors: string[],
	minimum: number,
): void {
	if (
		typeof value !== "number" ||
		!Number.isInteger(value) ||
		value < minimum
	) {
		errors.push(`${path} must be an integer >= ${minimum}.`);
	}
}
