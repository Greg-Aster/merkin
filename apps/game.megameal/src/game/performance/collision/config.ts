import type {
	PerformanceCollisionSystemMode,
	PerformanceConfig,
	PerformanceSystemConfig,
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

	if (mode === "spatial") {
		return {
			mode,
			diagnosticsEnabled: true,
			activeOptimizationEnabled: true,
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
): PerformanceCollisionSystemMode | string | undefined {
	if (!isRecord(config)) {
		return undefined;
	}

	const record = config as Record<string, unknown>;

	if (typeof record.mode === "string") {
		return record.mode;
	}

	if (!isRecord(record.systems) || !isRecord(record.systems.collision)) {
		return undefined;
	}

	const mode = record.systems.collision.mode;
	return typeof mode === "string" ? mode : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
