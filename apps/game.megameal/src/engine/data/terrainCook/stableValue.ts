export function sortedUnique(values: readonly string[]): readonly string[] {
	return [...new Set(values)].sort();
}

export function roundNumber(value: number): number {
	return Number(value.toFixed(6));
}

export function hashStableValue(value: unknown): string {
	return hashString(serializeStableValue(value));
}

export function hashString(value: string): string {
	let hash = 0x811c9dc5;

	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}

	return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
}

export function serializeStableValue(value: unknown): string {
	return `${JSON.stringify(normalizeStableValue(value), null, "\t")}\n`;
}

function normalizeStableValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => normalizeStableValue(item));
	}

	if (!isRecord(value)) {
		return value;
	}

	const result: Record<string, unknown> = {};

	for (const key of Object.keys(value).sort()) {
		const item = value[key];

		if (item !== undefined) {
			result[key] = normalizeStableValue(item);
		}
	}

	return result;
}

export function cloneValue<TValue>(value: TValue): TValue {
	return JSON.parse(JSON.stringify(value)) as TValue;
}

export function sameValue(left: unknown, right: unknown): boolean {
	return serializeStableValue(left) === serializeStableValue(right);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
