import type { APIRoute } from "astro";
import { cancelEditorAiAssetJob } from "../../../../game/editor/ai/index.js";
import {
	editorAiApiDisabledResponse,
	editorAiJobQueueStore,
	isEditorAiApiEnabled,
	jsonErrorResponse,
	jsonResponse,
	readJsonBody,
} from "./_shared.js";

export const GET: APIRoute = () => {
	return jsonResponse({
		route: "editor-ai-cancel",
		method: "POST",
		availableInDevelopment: isEditorAiApiEnabled(),
	});
};

export const POST: APIRoute = async ({ request }) => {
	if (!isEditorAiApiEnabled()) {
		return editorAiApiDisabledResponse();
	}

	try {
		const body = await readJsonBody(request);
		const jobId = readJobId(body);
		const result = cancelEditorAiAssetJob(editorAiJobQueueStore, jobId);

		if (result.status === "not-found") {
			return jsonErrorResponse(`Unknown AI asset job "${jobId}".`, 404);
		}

		return jsonResponse(result);
	} catch (error) {
		return jsonErrorResponse(formatError(error), 400);
	}
};

function readJobId(value: unknown): string {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error("Cancel request must be a JSON object.");
	}

	const jobId = (value as { readonly jobId?: unknown }).jobId;

	if (typeof jobId !== "string") {
		throw new Error("jobId must be a string.");
	}

	return jobId;
}

function formatError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
