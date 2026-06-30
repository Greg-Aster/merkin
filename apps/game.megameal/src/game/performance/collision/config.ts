import type {
	PerformanceConfig,
	PerformanceSystemConfig,
	PerformanceSystemMode,
} from "../types.js";
import type { CollisionPerformancePolicy } from "./types.js";

type CollisionPerformanceConfigInput =
	| PerformanceConfig
	| PerformanceSystemConfig
	| undefined;

export function resolveCollisionPerformancePolicy(
	config: CollisionPerformanceConfigInput,
): CollisionPerformancePolicy {
	const mode = readCollisionMode(config) ?? "off";

	if (mode === "diagnostic") {
		return {
			mode,
			diagnosticsEnabled: true,
			activeOptimizationEnabled: false,
			warnings: [],
		};
	}

	if (mode === "off") {
		return {
			mode,
			diagnosticsEnabled: false,
			activeOptimizationEnabled: false,
			warnings: [],
		};
	}

	return {
		mode: "off",
		diagnosticsEnabled: false,
		activeOptimizationEnabled: false,
		unsupportedMode: mode,
		warnings: [
			`Unsupported collision performance mode "${mode}" is inert until the runtime owns an explicit implementation.`,
		],
	};
}

function readCollisionMode(
	config: CollisionPerformanceConfigInput,
): PerformanceSystemMode | string | undefined {
	if (!isRecord(config)) {
		return undefined;
	}

	if (typeof config.mode === "string") {
		return config.mode;
	}

	if (!isRecord(config.systems) || !isRecord(config.systems.collision)) {
		return undefined;
	}

	const mode = config.systems.collision.mode;
	return typeof mode === "string" ? mode : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
