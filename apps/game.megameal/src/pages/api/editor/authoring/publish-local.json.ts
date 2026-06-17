import type { APIRoute } from "astro";
import { handleLevelEditorLocalPublishRequest } from "./_shared.js";

export const prerender = process.env.NODE_ENV === "production";

export const POST: APIRoute = ({ request }) =>
	handleLevelEditorLocalPublishRequest({
		request,
	});
