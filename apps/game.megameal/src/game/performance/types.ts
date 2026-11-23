export const PERFORMANCE_CONFIG_RESOURCE = "game:performanceConfig";

export const PERFORMANCE_SYSTEM_IDS = [
	"lod",
	"culling",
	"streaming",
	"collision",
] as const;

export const PERFORMANCE_LOD_SYSTEM_MODES = [
	"off",
	"diagnostic",
	"distance",
] as const;
export const PERFORMANCE_CULLING_SYSTEM_MODES = [
	"off",
	"diagnostic",
	"distance",
] as const;
export const PERFORMANCE_STREAMING_SYSTEM_MODES = [
	"off",
	"diagnostic",
	"plan",
] as const;
export const PERFORMANCE_COLLISION_SYSTEM_MODES = [
	"off",
	"diagnostic",
	"spatial",
] as const;
export const PERFORMANCE_SYSTEM_MODES = [
	"off",
	"diagnostic",
	"distance",
	"plan",
	"spatial",
] as const;
export const PERFORMANCE_COLLISION_PRIMITIVE_SHAPES = [
	"box",
	"sphere",
	"capsule",
	"cylinder",
] as const;

export type PerformanceSystemId = (typeof PERFORMANCE_SYSTEM_IDS)[number];
export type PerformanceSystemMode = (typeof PERFORMANCE_SYSTEM_MODES)[number];
export type PerformanceLodSystemMode =
	(typeof PERFORMANCE_LOD_SYSTEM_MODES)[number];
export type PerformanceCullingSystemMode =
	(typeof PERFORMANCE_CULLING_SYSTEM_MODES)[number];
export type PerformanceStreamingSystemMode =
	(typeof PERFORMANCE_STREAMING_SYSTEM_MODES)[number];
export type PerformanceCollisionSystemMode =
	(typeof PERFORMANCE_COLLISION_SYSTEM_MODES)[number];
export type PerformanceCollisionPrimitiveShape =
	(typeof PERFORMANCE_COLLISION_PRIMITIVE_SHAPES)[number];

export type PerformanceSystemConfig<
	TMode extends PerformanceSystemMode = PerformanceSystemMode,
> = {
	readonly mode: TMode;
};

export type PerformanceLodTierConfig = {
	readonly id: string;
	readonly minDistance: number;
	readonly maxDistance?: number;
	readonly qualityRatio?: number;
};

export type PerformanceLodSystemConfig =
	PerformanceSystemConfig<PerformanceLodSystemMode> & {
		readonly tiers?: readonly PerformanceLodTierConfig[];
	};

export type PerformanceDistanceWindowConfig = {
	readonly maxDistance?: number;
	readonly hysteresis?: number;
};

export type PerformanceCullingSystemConfig =
	PerformanceSystemConfig<PerformanceCullingSystemMode> & {
		readonly visibility?: {
			readonly frustum?: boolean;
			readonly distance?: PerformanceDistanceWindowConfig;
		};
	};

export type PerformanceResidencyWindowConfig = {
	readonly loadDistance?: number;
	readonly unloadDistance?: number;
};

export type PerformanceStreamingSystemConfig =
	PerformanceSystemConfig<PerformanceStreamingSystemMode> & {
		readonly residency?: {
			readonly assets?: PerformanceResidencyWindowConfig;
			readonly renderables?: PerformanceResidencyWindowConfig;
			readonly collision?: PerformanceResidencyWindowConfig;
		};
	};

export type PerformanceCollisionSystemConfig =
	PerformanceSystemConfig<PerformanceCollisionSystemMode> & {
		readonly diagnostics?: {
			readonly primitiveShapes?: readonly PerformanceCollisionPrimitiveShape[];
			readonly includeMeshColliders?: boolean;
			readonly includeWalkableOnly?: boolean;
		};
	};

export type PerformanceConfig = {
	readonly schemaVersion: 1;
	readonly systems: {
		readonly lod: PerformanceLodSystemConfig;
		readonly culling: PerformanceCullingSystemConfig;
		readonly streaming: PerformanceStreamingSystemConfig;
		readonly collision: PerformanceCollisionSystemConfig;
	};
};

export const defaultPerformanceConfig: PerformanceConfig = {
	schemaVersion: 1,
	systems: {
		lod: { mode: "off" },
		culling: { mode: "off" },
		streaming: { mode: "off" },
		collision: { mode: "diagnostic" },
	},
};

export function parsePerformanceConfig(
	value: unknown,
	label = "performance config",
): PerformanceConfig {
	const errors = validatePerformanceConfig(value, label);

	if (errors.length > 0) {
		throw new Error(errors.join("; "));
	}

	return clonePerformanceConfig(value as PerformanceConfig);
}

export function composePerformanceConfig(
	globalConfig: unknown,
	levelConfig: unknown,
): PerformanceConfig {
	const globalPerformanceConfig = parsePerformanceConfig(
		globalConfig,
		"global performance config",
	);
	const levelPerformanceConfig = parsePerformanceConfig(
		levelConfig,
		"level performance config",
	);

	return {
		schemaVersion: 1,
		systems: {
			lod: composeSystemConfig(
				globalPerformanceConfig.systems.lod,
				levelPerformanceConfig.systems.lod,
			),
			culling: composeSystemConfig(
				globalPerformanceConfig.systems.culling,
				levelPerformanceConfig.systems.culling,
			),
			streaming: composeSystemConfig(
				globalPerformanceConfig.systems.streaming,
				levelPerformanceConfig.systems.streaming,
			),
			collision: composeSystemConfig(
				globalPerformanceConfig.systems.collision,
				levelPerformanceConfig.systems.collision,
			),
		},
	};
}

export function validatePerformanceConfig(
	value: unknown,
	label = "performance config",
): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(value)) {
		return [`${label} must be an object.`];
	}

	if (value.schemaVersion !== 1) {
		errors.push(`${label}.schemaVersion must be 1.`);
	}

	if (!isRecord(value.systems)) {
		errors.push(`${label}.systems must be an object.`);
		return errors;
	}

	const systemIds = new Set(PERFORMANCE_SYSTEM_IDS);
	for (const key of Object.keys(value.systems)) {
		if (!systemIds.has(key as PerformanceSystemId)) {
			errors.push(`${label}.systems.${key} is not a supported system.`);
		}
	}

	for (const systemId of PERFORMANCE_SYSTEM_IDS) {
		const system = value.systems[systemId];

		if (!isRecord(system)) {
			errors.push(`${label}.systems.${systemId} must be an object.`);
			continue;
		}

		if (
			!performanceModesForSystem(systemId).includes(
				system.mode as PerformanceSystemMode,
			)
		) {
			errors.push(
				`${label}.systems.${systemId}.mode must be ${performanceModesForSystem(systemId).join(" or ")}.`,
			);
		}

		validateSystemConfig(
			systemId,
			system,
			`${label}.systems.${systemId}`,
			errors,
		);
	}

	return errors;
}

export function performanceModesForSystem(
	systemId: PerformanceSystemId,
): readonly PerformanceSystemMode[] {
	if (systemId === "lod") {
		return PERFORMANCE_LOD_SYSTEM_MODES;
	}

	if (systemId === "culling") {
		return PERFORMANCE_CULLING_SYSTEM_MODES;
	}

	if (systemId === "streaming") {
		return PERFORMANCE_STREAMING_SYSTEM_MODES;
	}

	return PERFORMANCE_COLLISION_SYSTEM_MODES;
}

function validateSystemConfig(
	systemId: PerformanceSystemId,
	system: Record<string, unknown>,
	path: string,
	errors: string[],
): void {
	const allowedFields = new Set(["mode"]);

	if (systemId === "lod") {
		allowedFields.add("tiers");
		validateLodSystemConfig(system, path, errors);
	}

	if (systemId === "culling") {
		allowedFields.add("visibility");
		validateCullingSystemConfig(system, path, errors);
	}

	if (systemId === "streaming") {
		allowedFields.add("residency");
		validateStreamingSystemConfig(system, path, errors);
	}

	if (systemId === "collision") {
		allowedFields.add("diagnostics");
		validateCollisionSystemConfig(system, path, errors);
	}

	for (const key of Object.keys(system)) {
		if (!allowedFields.has(key)) {
			errors.push(`${path}.${key} is not supported.`);
		}
	}
}

function validateLodSystemConfig(
	system: Record<string, unknown>,
	path: string,
	errors: string[],
): void {
	if (system.tiers === undefined) {
		return;
	}

	if (!Array.isArray(system.tiers)) {
		errors.push(`${path}.tiers must be an array.`);
		return;
	}

	for (const [index, tier] of system.tiers.entries()) {
		const tierPath = `${path}.tiers[${index}]`;

		if (!isRecord(tier)) {
			errors.push(`${tierPath} must be an object.`);
			continue;
		}

		validateAllowedFields(
			tier,
			new Set(["id", "minDistance", "maxDistance", "qualityRatio"]),
			tierPath,
			errors,
		);

		if (typeof tier.id !== "string" || tier.id.length === 0) {
			errors.push(`${tierPath}.id must be a non-empty string.`);
		}
		validateNonNegativeNumber(
			tier.minDistance,
			`${tierPath}.minDistance`,
			errors,
		);

		if (tier.maxDistance !== undefined) {
			validateNonNegativeNumber(
				tier.maxDistance,
				`${tierPath}.maxDistance`,
				errors,
			);

			if (
				typeof tier.minDistance === "number" &&
				Number.isFinite(tier.minDistance) &&
				typeof tier.maxDistance === "number" &&
				Number.isFinite(tier.maxDistance) &&
				tier.maxDistance <= tier.minDistance
			) {
				errors.push(
					`${tierPath}.maxDistance must be greater than minDistance.`,
				);
			}
		}

		if (tier.qualityRatio !== undefined) {
			validatePositiveNumber(
				tier.qualityRatio,
				`${tierPath}.qualityRatio`,
				errors,
			);
		}
	}
}

function validateCullingSystemConfig(
	system: Record<string, unknown>,
	path: string,
	errors: string[],
): void {
	if (system.visibility === undefined) {
		return;
	}

	if (!isRecord(system.visibility)) {
		errors.push(`${path}.visibility must be an object.`);
		return;
	}

	validateAllowedFields(
		system.visibility,
		new Set(["frustum", "distance"]),
		`${path}.visibility`,
		errors,
	);

	if (
		system.visibility.frustum !== undefined &&
		typeof system.visibility.frustum !== "boolean"
	) {
		errors.push(`${path}.visibility.frustum must be a boolean.`);
	}

	if (system.visibility.distance !== undefined) {
		validateDistanceWindow(
			system.visibility.distance,
			`${path}.visibility.distance`,
			errors,
		);
	}
}

function validateStreamingSystemConfig(
	system: Record<string, unknown>,
	path: string,
	errors: string[],
): void {
	if (system.residency === undefined) {
		return;
	}

	if (!isRecord(system.residency)) {
		errors.push(`${path}.residency must be an object.`);
		return;
	}

	validateAllowedFields(
		system.residency,
		new Set(["assets", "renderables", "collision"]),
		`${path}.residency`,
		errors,
	);

	for (const key of ["assets", "renderables", "collision"] as const) {
		if (system.residency[key] !== undefined) {
			validateResidencyWindow(
				system.residency[key],
				`${path}.residency.${key}`,
				errors,
			);
		}
	}
}

function validateCollisionSystemConfig(
	system: Record<string, unknown>,
	path: string,
	errors: string[],
): void {
	if (system.diagnostics === undefined) {
		return;
	}

	if (!isRecord(system.diagnostics)) {
		errors.push(`${path}.diagnostics must be an object.`);
		return;
	}

	validateAllowedFields(
		system.diagnostics,
		new Set(["primitiveShapes", "includeMeshColliders", "includeWalkableOnly"]),
		`${path}.diagnostics`,
		errors,
	);

	if (system.diagnostics.primitiveShapes !== undefined) {
		validatePrimitiveShapes(
			system.diagnostics.primitiveShapes,
			`${path}.diagnostics.primitiveShapes`,
			errors,
		);
	}

	for (const key of ["includeMeshColliders", "includeWalkableOnly"] as const) {
		if (
			system.diagnostics[key] !== undefined &&
			typeof system.diagnostics[key] !== "boolean"
		) {
			errors.push(`${path}.diagnostics.${key} must be a boolean.`);
		}
	}
}

function validateDistanceWindow(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	validateAllowedFields(
		value,
		new Set(["maxDistance", "hysteresis"]),
		path,
		errors,
	);

	if (value.maxDistance !== undefined) {
		validateNonNegativeNumber(value.maxDistance, `${path}.maxDistance`, errors);
	}

	if (value.hysteresis !== undefined) {
		validateNonNegativeNumber(value.hysteresis, `${path}.hysteresis`, errors);
	}
}

function validateResidencyWindow(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(value)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	validateAllowedFields(
		value,
		new Set(["loadDistance", "unloadDistance"]),
		path,
		errors,
	);

	if (value.loadDistance !== undefined) {
		validateNonNegativeNumber(
			value.loadDistance,
			`${path}.loadDistance`,
			errors,
		);
	}

	if (value.unloadDistance !== undefined) {
		validateNonNegativeNumber(
			value.unloadDistance,
			`${path}.unloadDistance`,
			errors,
		);
	}

	if (
		typeof value.loadDistance === "number" &&
		Number.isFinite(value.loadDistance) &&
		typeof value.unloadDistance === "number" &&
		Number.isFinite(value.unloadDistance) &&
		value.unloadDistance < value.loadDistance
	) {
		errors.push(
			`${path}.unloadDistance must be greater than or equal to loadDistance.`,
		);
	}
}

function validatePrimitiveShapes(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (!Array.isArray(value)) {
		errors.push(`${path} must be an array.`);
		return;
	}

	for (const [index, shape] of value.entries()) {
		if (
			!PERFORMANCE_COLLISION_PRIMITIVE_SHAPES.includes(
				shape as PerformanceCollisionPrimitiveShape,
			)
		) {
			errors.push(
				`${path}[${index}] must be box, sphere, capsule, or cylinder.`,
			);
		}
	}
}

function validateAllowedFields(
	value: Record<string, unknown>,
	allowedFields: ReadonlySet<string>,
	path: string,
	errors: string[],
): void {
	for (const key of Object.keys(value)) {
		if (!allowedFields.has(key)) {
			errors.push(`${path}.${key} is not supported.`);
		}
	}
}

function validatePositiveNumber(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		errors.push(`${path} must be a finite number greater than 0.`);
	}
}

function validateNonNegativeNumber(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
		errors.push(`${path} must be a finite number greater than or equal to 0.`);
	}
}

function composeSystemConfig<TSystem extends PerformanceSystemConfig>(
	globalConfig: TSystem,
	levelConfig: TSystem,
): TSystem {
	return mergeRecords(globalConfig, levelConfig) as TSystem;
}

function mergeRecords(
	globalValue: Record<string, unknown>,
	levelValue: Record<string, unknown>,
): Record<string, unknown> {
	const result = cloneRecord(globalValue);

	for (const [key, value] of Object.entries(levelValue)) {
		const globalChild = result[key];

		if (isRecord(globalChild) && isRecord(value)) {
			result[key] = mergeRecords(globalChild, value);
			continue;
		}

		result[key] = cloneUnknown(value);
	}

	return result;
}

function cloneRecord(value: Record<string, unknown>): Record<string, unknown> {
	return cloneUnknown(value) as Record<string, unknown>;
}

function cloneUnknown<TValue>(value: TValue): TValue {
	return JSON.parse(JSON.stringify(value)) as TValue;
}

function clonePerformanceConfig(config: PerformanceConfig): PerformanceConfig {
	return cloneUnknown(config);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
