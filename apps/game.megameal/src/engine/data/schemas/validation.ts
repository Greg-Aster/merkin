import type { SchemaValidationResult, SchemaValidator } from "./types.js";

export class SchemaValidationError extends Error {
	readonly errors: readonly string[];

	constructor(schemaName: string, errors: readonly string[]) {
		super(`${schemaName} validation failed: ${errors.join("; ")}`);
		this.name = "SchemaValidationError";
		this.errors = errors;
	}
}

export function createSchemaValidator<TData>(
	schemaName: string,
	validateData: (data: unknown) => readonly string[],
): SchemaValidator<TData> {
	return {
		validate(data: unknown): SchemaValidationResult {
			const errors = validateData(data);
			return errors.length === 0 ? { ok: true } : { ok: false, errors };
		},
		parse(data: unknown): TData {
			const errors = validateData(data);

			if (errors.length > 0) {
				throw new SchemaValidationError(schemaName, errors);
			}

			return data as TData;
		},
	};
}
