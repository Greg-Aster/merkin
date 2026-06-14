import type { APIRoute } from "astro";
import {
	getEditorAiAssetJob,
	parseEditorAiAssetJobRequest,
	queueEditorAiAssetJob,
	snapshotEditorAiJobQueue,
} from "../../../../game/editor/ai/index.js";
import {
	editorAiApiDisabledResponse,
	editorAiDisabledJobQueueSnapshotResponse,
	editorAiJobQueueStore,
	isEditorAiApiEnabled,
	jsonErrorResponse,
	jsonResponse,
	readEditorAiServiceStatusReport,
	readJsonBody,
} from "./_shared.js";

export const GET: APIRoute = ({ url }) => {
	if (!isEditorAiApiEnabled()) {
		return editorAiDisabledJobQueueSnapshotResponse();
	}

	const jobId = url.searchParams.get("jobId");

	if (jobId) {
		const job = getEditorAiAssetJob(editorAiJobQueueStore, jobId);

		return job
			? jsonResponse({ job })
			: jsonErrorResponse(`Unknown AI asset job "${jobId}".`, 404);
	}

	return jsonResponse(snapshotEditorAiJobQueue(editorAiJobQueueStore));
};

export const POST: APIRoute = async ({ request }) => {
	if (!isEditorAiApiEnabled()) {
		return editorAiApiDisabledResponse();
	}

	try {
		const body = await readJsonBody(request);
		const jobRequest = parseEditorAiAssetJobRequest(body);
		const services = await readEditorAiServiceStatusReport();
		const job = queueEditorAiAssetJob(
			editorAiJobQueueStore,
			jobRequest,
			services,
		);

		return jsonResponse({ job }, { status: 202 });
	} catch (error) {
		return jsonErrorResponse(formatError(error), 400);
	}
};

function formatError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
