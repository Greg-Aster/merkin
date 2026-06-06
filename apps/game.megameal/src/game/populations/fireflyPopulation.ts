import type { LevelPrefabInstanceData } from "../../engine/data/index.js";

export type FireflyPopulationMemberDefinition = {
	readonly id: string;
	readonly position: readonly [number, number, number];
	readonly scale?: readonly [number, number, number];
	readonly seed?: number;
	readonly phase?: number;
	readonly flicker?: {
		readonly frequencyHz: number;
		readonly amplitude: number;
	};
};

export type FireflyPopulationDefinition = {
	readonly id: string;
	readonly prefabId: string;
	readonly stableIdPrefix: string;
	readonly members: readonly FireflyPopulationMemberDefinition[];
};

export type FireflyFlickerSamplingOptions = {
	readonly durationSeconds?: number;
	readonly sampleRateHz?: number;
};

export type FireflyFlickerSample = {
	readonly timeSeconds: number;
	readonly intensityScale: number;
};

export type FireflyFlickerPreviewTrack = {
	readonly stableId: string;
	readonly populationId: string;
	readonly memberId: string;
	readonly seed: number;
	readonly phase: number;
	readonly frequencyHz: number;
	readonly amplitude: number;
	readonly samples: readonly FireflyFlickerSample[];
};

const DEFAULT_FIREFLY_FLICKER_DURATION_SECONDS = 2;
const DEFAULT_FIREFLY_FLICKER_SAMPLE_RATE_HZ = 4;
const MAX_FIREFLY_FLICKER_SAMPLES = 256;

export function validateFireflyPopulationDefinition(
	population: FireflyPopulationDefinition,
): readonly string[] {
	const errors: string[] = [];
	const memberIds = new Set<string>();

	validateNonEmptyString(population.id, "population.id", errors);
	validateNonEmptyString(population.prefabId, "population.prefabId", errors);
	validateNonEmptyString(
		population.stableIdPrefix,
		"population.stableIdPrefix",
		errors,
	);

	if (population.members.length === 0) {
		errors.push("population.members must contain at least one member.");
	}

	for (const [index, member] of population.members.entries()) {
		const path = `population.members.${index}`;

		validateNonEmptyString(member.id, `${path}.id`, errors);

		if (memberIds.has(member.id)) {
			errors.push(`${path}.id duplicates member "${member.id}".`);
		}

		memberIds.add(member.id);
		validateNumberTuple(member.position, 3, `${path}.position`, errors);

		if (member.scale !== undefined) {
			validatePositiveNumberTuple(member.scale, 3, `${path}.scale`, errors);
		}

		if (member.seed !== undefined) {
			validateNonNegativeInteger(member.seed, `${path}.seed`, errors);
		}

		if (member.phase !== undefined) {
			validateAlpha(member.phase, `${path}.phase`, errors);
		}

		if (member.flicker !== undefined) {
			validatePositiveNumber(
				member.flicker.frequencyHz,
				`${path}.flicker.frequencyHz`,
				errors,
			);
			validateAlpha(
				member.flicker.amplitude,
				`${path}.flicker.amplitude`,
				errors,
			);
		}
	}

	return errors;
}

export function createFireflyPopulationInstances(
	population: FireflyPopulationDefinition,
): readonly LevelPrefabInstanceData[] {
	const errors = validateFireflyPopulationDefinition(population);

	if (errors.length > 0) {
		throw new Error(
			`Firefly population "${population.id}" validation failed: ${errors.join("; ")}`,
		);
	}

	return population.members.map((member) => {
		const seed =
			member.seed ?? deterministicFireflySeed(population.id, member.id);
		const phase = member.phase ?? phaseFromSeed(seed);

		return {
			id: `${population.id}-${member.id}`,
			prefabId: population.prefabId,
			stableId: `${population.stableIdPrefix}:${member.id}`,
			transform: {
				position: member.position,
				...(member.scale ? { scale: member.scale } : {}),
			},
			components: {
				FireflyPopulationMember: {
					populationId: population.id,
					memberId: member.id,
					seed,
					phase,
					...(member.flicker ? { flicker: member.flicker } : {}),
				},
			},
		};
	});
}

export function createFireflyFlickerPreviewTracks(
	population: FireflyPopulationDefinition,
	options: FireflyFlickerSamplingOptions = {},
): readonly FireflyFlickerPreviewTrack[] {
	const definitionErrors = validateFireflyPopulationDefinition(population);
	const samplingErrors = validateFireflyFlickerSamplingOptions(options);
	const errors = [...definitionErrors, ...samplingErrors];

	if (errors.length > 0) {
		throw new Error(
			`Firefly flicker preview "${population.id}" validation failed: ${errors.join("; ")}`,
		);
	}

	const durationSeconds =
		options.durationSeconds ?? DEFAULT_FIREFLY_FLICKER_DURATION_SECONDS;
	const sampleRateHz =
		options.sampleRateHz ?? DEFAULT_FIREFLY_FLICKER_SAMPLE_RATE_HZ;
	const sampleCount = Math.floor(durationSeconds * sampleRateHz) + 1;

	if (sampleCount > MAX_FIREFLY_FLICKER_SAMPLES) {
		throw new Error(
			`Firefly flicker preview "${population.id}" requested ${sampleCount} samples, maximum is ${MAX_FIREFLY_FLICKER_SAMPLES}.`,
		);
	}

	return population.members.map((member) => {
		const seed =
			member.seed ?? deterministicFireflySeed(population.id, member.id);
		const phase = member.phase ?? phaseFromSeed(seed);
		const frequencyHz = member.flicker?.frequencyHz ?? 0;
		const amplitude = member.flicker?.amplitude ?? 0;

		return {
			stableId: `${population.stableIdPrefix}:${member.id}`,
			populationId: population.id,
			memberId: member.id,
			seed,
			phase,
			frequencyHz,
			amplitude,
			samples: Array.from({ length: sampleCount }, (_, index) => {
				const timeSeconds = roundFlickerValue(index / sampleRateHz);

				return {
					timeSeconds,
					intensityScale: fireflyFlickerIntensityScale(
						timeSeconds,
						frequencyHz,
						phase,
						amplitude,
					),
				};
			}),
		};
	});
}

export function deterministicFireflySeed(
	populationId: string,
	memberId: string,
): number {
	let hash = 2166136261;
	const input = `${populationId}:${memberId}`;

	for (let index = 0; index < input.length; index += 1) {
		hash ^= input.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	return hash >>> 0;
}

function phaseFromSeed(seed: number): number {
	return Number(((seed % 10_000) / 10_000).toFixed(4));
}

function fireflyFlickerIntensityScale(
	timeSeconds: number,
	frequencyHz: number,
	phase: number,
	amplitude: number,
): number {
	if (frequencyHz === 0 || amplitude === 0) {
		return 1;
	}

	return roundFlickerValue(
		Math.max(
			0,
			1 +
				Math.sin((timeSeconds * frequencyHz + phase) * Math.PI * 2) * amplitude,
		),
	);
}

function roundFlickerValue(value: number): number {
	return Number(value.toFixed(4));
}

function validateFireflyFlickerSamplingOptions(
	options: FireflyFlickerSamplingOptions,
): readonly string[] {
	const errors: string[] = [];

	if (options.durationSeconds !== undefined) {
		validatePositiveNumber(
			options.durationSeconds,
			"options.durationSeconds",
			errors,
		);
	}

	if (options.sampleRateHz !== undefined) {
		validatePositiveNumber(
			options.sampleRateHz,
			"options.sampleRateHz",
			errors,
		);
	}

	return errors;
}

function validateNonEmptyString(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (typeof value !== "string" || value.length === 0) {
		errors.push(`${path} must be a non-empty string.`);
	}
}

function validateNumberTuple(
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

function validatePositiveNumberTuple(
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

function validateNonNegativeInteger(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
		errors.push(`${path} must be a non-negative integer.`);
	}
}

function validatePositiveNumber(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		errors.push(`${path} must be a positive finite number.`);
	}
}

function validateAlpha(value: unknown, path: string, errors: string[]): void {
	if (
		typeof value !== "number" ||
		!Number.isFinite(value) ||
		value < 0 ||
		value > 1
	) {
		errors.push(`${path} must be a finite number from 0 to 1.`);
	}
}
