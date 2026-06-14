import {
	EDITOR_AI_ASSET_CONTRACT_VERSION,
	type EditorAiBackendId,
	type EditorAiServiceDefinition,
	type EditorAiServiceProbeResult,
	type EditorAiServiceStatus,
	type EditorAiServiceStatusReport,
	defaultEditorAiServiceDefinitions,
} from "./contracts.js";

export function buildEditorAiServiceStatusReport(options: {
	readonly definitions?: readonly EditorAiServiceDefinition[];
	readonly probes: readonly EditorAiServiceProbeResult[];
	readonly checkedAt: string;
	readonly mode?: EditorAiServiceStatusReport["mode"];
}): EditorAiServiceStatusReport {
	const definitions = options.definitions ?? defaultEditorAiServiceDefinitions;
	const probesByBackend = new Map(
		options.probes.map((probe) => [probe.backend, probe]),
	);
	const services = definitions.map((definition) =>
		statusFromProbe(definition, probesByBackend.get(definition.backend), {
			checkedAt: options.checkedAt,
			reason: "Service probe was not run.",
		}),
	);

	return {
		schemaVersion: EDITOR_AI_ASSET_CONTRACT_VERSION,
		mode: options.mode ?? "dev-service-probe",
		checkedAt: options.checkedAt,
		services,
		availableBackends: services
			.filter((service) => service.status === "available")
			.map((service) => service.backend),
		unavailableBackends: services
			.filter((service) => service.status === "unavailable")
			.map((service) => service.backend),
	};
}

export function buildDisabledEditorAiServiceStatusReport(options: {
	readonly checkedAt: string;
	readonly reason: string;
	readonly definitions?: readonly EditorAiServiceDefinition[];
}): EditorAiServiceStatusReport {
	const definitions = options.definitions ?? defaultEditorAiServiceDefinitions;

	return {
		schemaVersion: EDITOR_AI_ASSET_CONTRACT_VERSION,
		mode: "disabled-outside-dev",
		checkedAt: options.checkedAt,
		services: definitions.map((definition) => ({
			...definition,
			checkedAt: options.checkedAt,
			status: "unavailable",
			responseMs: null,
			reason: options.reason,
		})),
		availableBackends: [],
		unavailableBackends: definitions.map((definition) => definition.backend),
	};
}

export function findEditorAiServiceStatus(
	report: EditorAiServiceStatusReport,
	backend: EditorAiBackendId,
): EditorAiServiceStatus | undefined {
	return report.services.find((service) => service.backend === backend);
}

function statusFromProbe(
	definition: EditorAiServiceDefinition,
	probe: EditorAiServiceProbeResult | undefined,
	fallback: { readonly checkedAt: string; readonly reason: string },
): EditorAiServiceStatus {
	if (!probe) {
		return {
			...definition,
			checkedAt: fallback.checkedAt,
			status: "unavailable",
			responseMs: null,
			reason: fallback.reason,
		};
	}

	return {
		...definition,
		endpoint: probe.endpoint,
		checkedAt: probe.checkedAt,
		status: probe.available ? "available" : "unavailable",
		responseMs: probe.responseMs,
		reason: probe.reason,
	};
}
