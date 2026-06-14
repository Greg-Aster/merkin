import type { APIRoute } from "astro";
import { snapshotEditorAiJobQueue } from "../../../../game/editor/ai/index.js";
import {
	editorAiDisabledJobQueueSnapshotResponse,
	editorAiJobQueueStore,
	isEditorAiApiEnabled,
	jsonResponse,
} from "./_shared.js";

export const GET: APIRoute = () => {
	if (!isEditorAiApiEnabled()) {
		return editorAiDisabledJobQueueSnapshotResponse();
	}

	const snapshot = snapshotEditorAiJobQueue(editorAiJobQueueStore);

	return jsonResponse({
		schemaVersion: snapshot.schemaVersion,
		generatedAssets: snapshot.generatedAssets,
	});
};
