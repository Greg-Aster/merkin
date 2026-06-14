import type { APIRoute } from "astro";
import {
	buildEditorAiApplyToSelectionPlan,
	getEditorAiGeneratedAssetRecord,
	parseEditorAiApplyToSelectionRequest,
} from "../../../../game/editor/ai/index.js";
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
		route: "editor-ai-apply-selection",
		method: "POST",
		availableInDevelopment: isEditorAiApiEnabled(),
		mutatesRuntimeDirectly: false,
	});
};

export const POST: APIRoute = async ({ request }) => {
	if (!isEditorAiApiEnabled()) {
		return editorAiApiDisabledResponse();
	}

	try {
		const body = await readJsonBody(request);
		const applyRequest = parseEditorAiApplyToSelectionRequest(body);
		const record = getEditorAiGeneratedAssetRecord(
			editorAiJobQueueStore,
			applyRequest.generatedAssetId,
		);

		if (!record) {
			return jsonErrorResponse(
				`Unknown generated AI asset "${applyRequest.generatedAssetId}".`,
				404,
			);
		}

		return jsonResponse({
			plan: buildEditorAiApplyToSelectionPlan(record, applyRequest),
		});
	} catch (error) {
		return jsonErrorResponse(formatError(error), 400);
	}
};

function formatError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
