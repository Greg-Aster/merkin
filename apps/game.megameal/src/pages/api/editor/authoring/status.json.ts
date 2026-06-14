import type { APIRoute } from "astro";
import {
	authoringTargetStatus,
	disabledResponse,
	isLevelEditorAuthoringApiEnabled,
	jsonErrorResponse,
	jsonResponse,
} from "./_shared.js";

export const GET: APIRoute = async ({ url }) => {
	if (!isLevelEditorAuthoringApiEnabled()) {
		return disabledResponse();
	}

	const runtimeSceneId = url.searchParams.get("runtimeSceneId");

	if (!runtimeSceneId) {
		return jsonErrorResponse("runtimeSceneId is required.", 400);
	}

	try {
		return jsonResponse(await authoringTargetStatus(runtimeSceneId));
	} catch (error) {
		return jsonErrorResponse(formatError(error), 400);
	}
};

function formatError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
