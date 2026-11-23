import type { PerformanceConfig } from "../types.js";

export const LOD_POLICY_MODES = ["off", "diagnostic", "distance"] as const;

export type LodPolicyMode = (typeof LOD_POLICY_MODES)[number];

export type LodTierDefinition = {
	readonly id: string;
	readonly maxDistance?: number;
	readonly minSignificance?: number;
};

export type LodGroupDefinition = {
	readonly id: string;
	readonly defaultTierId?: string;
	readonly tiers: readonly LodTierDefinition[];
};

export type LodPolicyConfig = {
	readonly mode: LodPolicyMode;
	readonly groups: readonly LodGroupDefinition[];
};

export type LodEvaluationInput = {
	readonly groupId: string;
	readonly distance: number;
	readonly significance?: number;
};

export type LodEvaluationReason =
	| "mode-off"
	| "diagnostic-only"
	| "distance-threshold"
	| "missing-group"
	| "empty-group"
	| "invalid-distance"
	| "unsupported-mode";

export type LodEvaluationResult = {
	readonly groupId: string;
	readonly mode: LodPolicyMode;
	readonly active: boolean;
	readonly selectedTier: LodTierDefinition | undefined;
	readonly selectedTierId: string | undefined;
	readonly recommendedTier: LodTierDefinition | undefined;
	readonly recommendedTierId: string | undefined;
	readonly reason: LodEvaluationReason;
};

export function createLodPolicyConfigFromPerformanceConfig(
	config: PerformanceConfig,
	groups: readonly LodGroupDefinition[] = [],
): LodPolicyConfig {
	return {
		mode: config.systems.lod.mode,
		groups,
	};
}

export function parseLodPolicyConfig(
	value: unknown,
	label = "LOD policy config",
): LodPolicyConfig {
	const errors = validateLodPolicyConfig(value, label);

	if (errors.length > 0) {
		throw new Error(errors.join("; "));
	}

	return JSON.parse(JSON.stringify(value)) as LodPolicyConfig;
}

export function validateLodPolicyConfig(
	value: unknown,
	label = "LOD policy config",
): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(value)) {
		return [`${label} must be an object.`];
	}

	if (!isLodPolicyMode(value.mode)) {
		errors.push(`${label}.mode must be off, diagnostic, or distance.`);
	}

	if (!Array.isArray(value.groups)) {
		errors.push(`${label}.groups must be an array.`);
		return errors;
	}

	const groupIds = new Set<string>();

	for (const [groupIndex, group] of value.groups.entries()) {
		const groupLabel = `${label}.groups[${groupIndex}]`;

		if (!isRecord(group)) {
			errors.push(`${groupLabel} must be an object.`);
			continue;
		}

		if (!isNonEmptyString(group.id)) {
			errors.push(`${groupLabel}.id must be a non-empty string.`);
		} else if (groupIds.has(group.id)) {
			errors.push(`${groupLabel}.id duplicates ${group.id}.`);
		} else {
			groupIds.add(group.id);
		}

		if (
			group.defaultTierId !== undefined &&
			!isNonEmptyString(group.defaultTierId)
		) {
			errors.push(`${groupLabel}.defaultTierId must be a non-empty string.`);
		}

		if (!Array.isArray(group.tiers)) {
			errors.push(`${groupLabel}.tiers must be an array.`);
			continue;
		}

		if (group.tiers.length === 0) {
			errors.push(`${groupLabel}.tiers must contain at least one tier.`);
			continue;
		}

		const tierIds = new Set<string>();
		let previousMaxDistance = Number.NEGATIVE_INFINITY;

		for (const [tierIndex, tier] of group.tiers.entries()) {
			const tierLabel = `${groupLabel}.tiers[${tierIndex}]`;

			if (!isRecord(tier)) {
				errors.push(`${tierLabel} must be an object.`);
				continue;
			}

			if (!isNonEmptyString(tier.id)) {
				errors.push(`${tierLabel}.id must be a non-empty string.`);
			} else if (tierIds.has(tier.id)) {
				errors.push(`${tierLabel}.id duplicates ${tier.id}.`);
			} else {
				tierIds.add(tier.id);
			}

			if (tier.maxDistance !== undefined) {
				if (!isFiniteNonNegativeNumber(tier.maxDistance)) {
					errors.push(`${tierLabel}.maxDistance must be a finite number >= 0.`);
				} else if (tier.maxDistance < previousMaxDistance) {
					errors.push(
						`${tierLabel}.maxDistance must be greater than or equal to the previous tier distance.`,
					);
				} else {
					previousMaxDistance = tier.maxDistance;
				}
			} else if (tierIndex !== group.tiers.length - 1) {
				errors.push(
					`${tierLabel}.maxDistance may be omitted only on the last tier.`,
				);
			}

			if (
				tier.minSignificance !== undefined &&
				!isUnitIntervalNumber(tier.minSignificance)
			) {
				errors.push(`${tierLabel}.minSignificance must be between 0 and 1.`);
			}
		}

		if (
			isNonEmptyString(group.defaultTierId) &&
			!tierIds.has(group.defaultTierId)
		) {
			errors.push(`${groupLabel}.defaultTierId must match a tier id.`);
		}
	}

	return errors;
}

export function evaluateLodTier(
	config: LodPolicyConfig,
	input: LodEvaluationInput,
): LodEvaluationResult {
	const mode = isLodPolicyMode(config.mode) ? config.mode : "off";
	const group = config.groups.find(
		(candidate) => candidate.id === input.groupId,
	);

	if (!group) {
		return createLodEvaluationResult({
			active: false,
			groupId: input.groupId,
			mode,
			reason: "missing-group",
			recommendedTier: undefined,
			selectedTier: undefined,
		});
	}

	if (group.tiers.length === 0) {
		return createLodEvaluationResult({
			active: false,
			groupId: input.groupId,
			mode,
			reason: "empty-group",
			recommendedTier: undefined,
			selectedTier: undefined,
		});
	}

	const fallbackTier = resolveDefaultTier(group);
	const recommendation = recommendLodTier(group, input, fallbackTier);

	if (!isLodPolicyMode(config.mode)) {
		return createLodEvaluationResult({
			active: false,
			groupId: input.groupId,
			mode,
			reason: "unsupported-mode",
			recommendedTier: recommendation.tier,
			selectedTier: fallbackTier,
		});
	}

	if (mode === "off") {
		return createLodEvaluationResult({
			active: false,
			groupId: input.groupId,
			mode,
			reason: "mode-off",
			recommendedTier: recommendation.tier,
			selectedTier: fallbackTier,
		});
	}

	if (mode === "diagnostic") {
		return createLodEvaluationResult({
			active: false,
			groupId: input.groupId,
			mode,
			reason: "diagnostic-only",
			recommendedTier: recommendation.tier,
			selectedTier: fallbackTier,
		});
	}

	return createLodEvaluationResult({
		active: true,
		groupId: input.groupId,
		mode,
		reason: recommendation.reason,
		recommendedTier: recommendation.tier,
		selectedTier: recommendation.tier,
	});
}

function recommendLodTier(
	group: LodGroupDefinition,
	input: LodEvaluationInput,
	fallbackTier: LodTierDefinition,
): {
	readonly reason: Extract<
		LodEvaluationReason,
		"distance-threshold" | "invalid-distance"
	>;
	readonly tier: LodTierDefinition;
} {
	if (!isFiniteNonNegativeNumber(input.distance)) {
		return {
			reason: "invalid-distance",
			tier: fallbackTier,
		};
	}

	const significance = clampSignificance(input.significance ?? 1);
	const lowestTier = group.tiers[group.tiers.length - 1] ?? fallbackTier;

	for (const tier of group.tiers) {
		const minSignificance = tier.minSignificance ?? 0;

		if (significance < minSignificance) {
			continue;
		}

		if (tier.maxDistance === undefined || input.distance <= tier.maxDistance) {
			return {
				reason: "distance-threshold",
				tier,
			};
		}
	}

	return {
		reason: "distance-threshold",
		tier: lowestTier,
	};
}

function resolveDefaultTier(group: LodGroupDefinition): LodTierDefinition {
	if (group.defaultTierId) {
		const defaultTier = group.tiers.find(
			(tier) => tier.id === group.defaultTierId,
		);

		if (defaultTier) {
			return defaultTier;
		}
	}

	return group.tiers[0] as LodTierDefinition;
}

function createLodEvaluationResult(options: {
	readonly active: boolean;
	readonly groupId: string;
	readonly mode: LodPolicyMode;
	readonly reason: LodEvaluationReason;
	readonly recommendedTier: LodTierDefinition | undefined;
	readonly selectedTier: LodTierDefinition | undefined;
}): LodEvaluationResult {
	return {
		active: options.active,
		groupId: options.groupId,
		mode: options.mode,
		reason: options.reason,
		recommendedTier: options.recommendedTier,
		recommendedTierId: options.recommendedTier?.id,
		selectedTier: options.selectedTier,
		selectedTierId: options.selectedTier?.id,
	};
}

function clampSignificance(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}

	return Math.min(1, Math.max(0, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLodPolicyMode(value: unknown): value is LodPolicyMode {
	return LOD_POLICY_MODES.includes(value as LodPolicyMode);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isUnitIntervalNumber(value: unknown): value is number {
	return (
		typeof value === "number" &&
		Number.isFinite(value) &&
		value >= 0 &&
		value <= 1
	);
}
