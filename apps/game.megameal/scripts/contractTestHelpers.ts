export function assertEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message?: string,
): void {
	if (actual !== expected) {
		throw new Error(
			message ?? `Expected ${String(expected)}, received ${String(actual)}.`,
		);
	}
}

export function assertDeepEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message?: string,
): void {
	const actualJson = JSON.stringify(actual);
	const expectedJson = JSON.stringify(expected);

	if (actualJson !== expectedJson) {
		throw new Error(
			message ?? `Expected ${expectedJson}, received ${actualJson}.`,
		);
	}
}

export function assertDefined<TValue>(
	actual: TValue | null | undefined,
	message = "Expected value to be defined.",
): TValue {
	if (actual === undefined || actual === null) {
		throw new Error(message);
	}

	return actual;
}

export function assertRecord(
	value: unknown,
	label: string,
): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`Expected ${label} to be an object.`);
	}

	return value as Record<string, unknown>;
}

export function assertArray(value: unknown, label: string): readonly unknown[] {
	if (!Array.isArray(value)) {
		throw new Error(`Expected ${label} to be an array.`);
	}

	return value;
}

export function assertErrorIncludes(
	action: () => void,
	expected: string,
): void {
	try {
		action();
	} catch (error) {
		const message =
			error instanceof Error ? error.message : JSON.stringify(error);

		if (!message.includes(expected)) {
			throw new Error(
				`Expected error to include ${JSON.stringify(expected)}, received ${JSON.stringify(message)}.`,
			);
		}

		return;
	}

	throw new Error(`Expected error including ${JSON.stringify(expected)}.`);
}
