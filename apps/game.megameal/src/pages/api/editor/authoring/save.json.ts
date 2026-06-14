import type { APIRoute } from "astro";
import { handleLevelEditorAuthoringPersistenceRequest } from "./_shared.js";

export const POST: APIRoute = ({ request }) =>
	handleLevelEditorAuthoringPersistenceRequest({
		request,
		mode: "save",
	});
