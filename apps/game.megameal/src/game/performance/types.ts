export const PERFORMANCE_CONFIG_RESOURCE = "game:performanceConfig";

export const PERFORMANCE_SYSTEM_IDS = [
	"lod",
	"culling",
	"streaming",
	"collision",
] as const;

export const PERFORMANCE_SYSTEM_MODES = ["off", "diagnostic"] as const;

export type PerformanceSystemId = (typeof PERFORMANCE_SYSTEM_IDS)[number];
export type PerformanceSystemMode = (typeof PERFORMANCE_SYSTEM_MODES)[number];

export type PerformanceSystemConfig = {
	readonly mode: PerformanceSystemMode;
};

export type PerformanceConfig = {
	readonly schemaVersion: 1;
	readonly systems: Record<PerformanceSystemId, PerformanceSystemConfig>;
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
			lod: {
				...globalPerformanceConfig.systems.lod,
				...levelPerformanceConfig.systems.lod,
			},
			culling: {
				...globalPerformanceConfig.systems.culling,
				...levelPerformanceConfig.systems.culling,
			},
			streaming: {
				...globalPerformanceConfig.systems.streaming,
				...levelPerformanceConfig.systems.streaming,
			},
			collision: {
				...globalPerformanceConfig.systems.collision,
				...levelPerformanceConfig.systems.collision,
			},
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

		if (!PERFORMANCE_SYSTEM_MODES.includes(system.mode as PerformanceSystemMode)) {
			errors.push(
				`${label}.systems.${systemId}.mode must be off or diagnostic.`,
			);
		}
	}

	return errors;
}

function clonePerformanceConfig(config: PerformanceConfig): PerformanceConfig {
	return JSON.parse(JSON.stringify(config)) as PerformanceConfig;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
