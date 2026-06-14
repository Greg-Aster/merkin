import {
	EDITOR_AI_ASSET_CONTRACT_VERSION,
	type EditorAiServiceDefinition,
	type EditorAiServiceProbeResult,
	buildDisabledEditorAiServiceStatusReport,
	buildEditorAiServiceStatusReport,
	createEditorAiJobQueueStore,
	defaultEditorAiServiceDefinitions,
} from "../../../../game/editor/ai/index.js";

const serviceProbeTimeoutMs = 900;

export const editorAiJobQueueStore = createEditorAiJobQueueStore();

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
	const headers = new Headers(init.headers);
	headers.set("content-type", "application/json; charset=utf-8");

	return new Response(JSON.stringify(body, null, 2), {
		...init,
		headers,
	});
}

export function jsonErrorResponse(message: string, status: number): Response {
	return jsonResponse({ error: message }, { status });
}

export function editorAiApiDisabledResponse(): Response {
	return jsonErrorResponse(
		"Editor AI API routes are available only in development mode.",
		403,
	);
}

export function editorAiDisabledJobQueueSnapshotResponse(): Response {
	return jsonResponse({
		schemaVersion: EDITOR_AI_ASSET_CONTRACT_VERSION,
		disabled: true,
		jobs: [],
		recentJobs: [],
		generatedAssets: [],
	});
}

export function isEditorAiApiEnabled(): boolean {
	return process.env.NODE_ENV !== "production";
}

export async function readJsonBody(request: Request): Promise<unknown> {
	try {
		return await request.json();
	} catch {
		throw new Error("Request body must be valid JSON.");
	}
}

export async function readEditorAiServiceStatusReport() {
	const checkedAt = new Date().toISOString();
	const definitions = serviceDefinitionsFromEnvironment();

	if (!isEditorAiApiEnabled()) {
		return buildDisabledEditorAiServiceStatusReport({
			checkedAt,
			definitions,
			reason: "Editor AI service probing is disabled outside development mode.",
		});
	}

	const probes = await Promise.all(
		definitions.map((definition) =>
			probeEditorAiService(definition, checkedAt),
		),
	);

	return buildEditorAiServiceStatusReport({
		definitions,
		probes,
		checkedAt,
	});
}

function serviceDefinitionsFromEnvironment(): readonly EditorAiServiceDefinition[] {
	const endpoints: Partial<
		Record<EditorAiServiceDefinition["backend"], string>
	> = {};
	const comfyEndpoint = process.env.MEGAMEAL_EDITOR_AI_COMFYUI_URL;
	const hunyuanEndpoint = process.env.MEGAMEAL_EDITOR_AI_HUNYUAN_URL;

	if (comfyEndpoint !== undefined) {
		endpoints.comfyui = comfyEndpoint;
	}

	if (hunyuanEndpoint !== undefined) {
		endpoints.hunyuan3d = hunyuanEndpoint;
	}

	return defaultEditorAiServiceDefinitions.map((definition) => ({
		...definition,
		endpoint: normalizeEndpoint(
			endpoints[definition.backend] ?? definition.endpoint,
		),
	}));
}

async function probeEditorAiService(
	definition: EditorAiServiceDefinition,
	checkedAt: string,
): Promise<EditorAiServiceProbeResult> {
	const startedAt = performance.now();
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), serviceProbeTimeoutMs);

	try {
		const response = await fetch(serviceHealthUrl(definition), {
			method: "GET",
			signal: controller.signal,
		});
		const responseMs = Math.round(performance.now() - startedAt);

		return {
			backend: definition.backend,
			endpoint: definition.endpoint,
			checkedAt,
			available: response.ok,
			responseMs,
			reason: response.ok ? null : `HTTP ${response.status}`,
		};
	} catch (error) {
		return {
			backend: definition.backend,
			endpoint: definition.endpoint,
			checkedAt,
			available: false,
			responseMs: null,
			reason: formatProbeError(error),
		};
	} finally {
		clearTimeout(timeout);
	}
}

function serviceHealthUrl(definition: EditorAiServiceDefinition): string {
	const base = definition.endpoint.endsWith("/")
		? definition.endpoint
		: `${definition.endpoint}/`;

	return new URL(definition.healthPath.replace(/^\//u, ""), base).toString();
}

function normalizeEndpoint(endpoint: string): string {
	return endpoint.replace(/\/+$/u, "");
}

function formatProbeError(error: unknown): string {
	if (error instanceof Error) {
		return error.name === "AbortError"
			? `Timed out after ${serviceProbeTimeoutMs}ms`
			: error.message;
	}

	return String(error);
}
