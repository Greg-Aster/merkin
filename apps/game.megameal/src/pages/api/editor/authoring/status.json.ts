import type { APIRoute } from "astro";
import {
	authoringTargetStatus,
	disabledResponse,
	isLevelEditorAuthoringApiEnabled,
	jsonErrorResponse,
	jsonResponse,
	parseAuthoringTargetKind,
} from "./_shared.js";

export const prerender = process.env.NODE_ENV === "production";

export const GET: APIRoute = async ({ request }) => {
	if (!isLevelEditorAuthoringApiEnabled()) {
		return disabledResponse();
	}

	const requestUrl = new URL(request.url);
	const runtimeSceneId = requestUrl.searchParams.get("runtimeSceneId");

	if (!runtimeSceneId) {
		return jsonErrorResponse("runtimeSceneId is required.", 400);
	}

	try {
		return jsonResponse(
			await authoringTargetStatus(
				runtimeSceneId,
				parseAuthoringTargetKind(requestUrl.searchParams.get("target")),
			),
		);
	} catch (error) {
		return jsonErrorResponse(formatError(error), 400);
	}
};

export const POST: APIRoute = async ({ request }) => {
	if (!isLevelEditorAuthoringApiEnabled()) {
		return disabledResponse();
	}

	try {
		const headerRuntimeSceneId = request.headers.get(
			"x-megameal-runtime-scene-id",
		);
		const headerTarget = request.headers.get("x-megameal-authoring-target");

		if (headerRuntimeSceneId) {
			return jsonResponse(
				await authoringTargetStatus(
					headerRuntimeSceneId,
					parseAuthoringTargetKind(headerTarget),
				),
			);
		}

		const body = await request.json();

		if (!isRecord(body) || typeof body.runtimeSceneId !== "string") {
			return jsonErrorResponse("runtimeSceneId is required.", 400);
		}

		return jsonResponse(
			await authoringTargetStatus(
				body.runtimeSceneId,
				parseAuthoringTargetKind(
					typeof body.target === "string" ? body.target : null,
				),
			),
		);
	} catch (error) {
		return jsonErrorResponse(formatError(error), 400);
	}
};

function formatError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
