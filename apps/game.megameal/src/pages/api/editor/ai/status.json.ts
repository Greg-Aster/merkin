import type { APIRoute } from "astro";
import { jsonResponse, readEditorAiServiceStatusReport } from "./_shared.js";

export const GET: APIRoute = async () => {
	return jsonResponse(await readEditorAiServiceStatusReport());
};
