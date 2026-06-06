import {
	type LevelEditorCollisionPreviewClearRequestMessage,
	type LevelEditorCollisionPreviewPatchMessage,
	type LevelEditorDevPreviewMessage,
	type LevelEditorRuntimeReloadRequestMessage,
	buildCollisionCookPlan,
	buildCollisionCookPreviewPatch,
	createCollisionPreviewClearRequestMessage,
	createCollisionPreviewPatchMessage,
	createRuntimeSceneReloadRequestMessage,
} from "../../engine/data/index.js";
import { observatoryCollisionCookDraft } from "../../game/editor/collisionDrafts/observatoryCollisionDraft.js";
import {
	type LevelEditorPreviewChannelPort,
	postLevelEditorDevPreviewMessage,
} from "../devPreview/index.js";

export function buildDefaultCollisionPreviewPatchMessage(
	requestId: string,
): LevelEditorCollisionPreviewPatchMessage {
	const plan = buildCollisionCookPlan(observatoryCollisionCookDraft);
	const patch = buildCollisionCookPreviewPatch(plan);

	return createCollisionPreviewPatchMessage({ requestId, patch });
}

export function buildDefaultRuntimeReloadRequestMessage(
	requestId: string,
): LevelEditorRuntimeReloadRequestMessage {
	const plan = buildCollisionCookPlan(observatoryCollisionCookDraft);
	const patch = buildCollisionCookPreviewPatch(plan);

	return createRuntimeSceneReloadRequestMessage({
		requestId,
		runtimeSceneId: observatoryCollisionCookDraft.runtimeSceneId,
		reason: "collision-bake-applied",
		sourcePlanHash: patch.sourcePlanHash,
	});
}

export function buildDefaultCollisionPreviewClearRequestMessage(
	requestId: string,
): LevelEditorCollisionPreviewClearRequestMessage {
	const plan = buildCollisionCookPlan(observatoryCollisionCookDraft);
	const patch = buildCollisionCookPreviewPatch(plan);

	return createCollisionPreviewClearRequestMessage({
		requestId,
		runtimeSceneId: observatoryCollisionCookDraft.runtimeSceneId,
		sourcePlanHash: patch.sourcePlanHash,
		stableIds: patch.entries.map((entry) => entry.stableId),
	});
}

export function sendLevelEditorDevPreviewMessage(
	channel: LevelEditorPreviewChannelPort,
	message: unknown,
): LevelEditorDevPreviewMessage {
	return postLevelEditorDevPreviewMessage(channel, message);
}

export function sendDefaultCollisionPreviewPatch(
	channel: LevelEditorPreviewChannelPort,
	requestId: string,
): LevelEditorCollisionPreviewPatchMessage {
	const message = buildDefaultCollisionPreviewPatchMessage(requestId);
	sendLevelEditorDevPreviewMessage(channel, message);
	return message;
}

export function sendDefaultRuntimeReloadRequest(
	channel: LevelEditorPreviewChannelPort,
	requestId: string,
): LevelEditorRuntimeReloadRequestMessage {
	const message = buildDefaultRuntimeReloadRequestMessage(requestId);
	sendLevelEditorDevPreviewMessage(channel, message);
	return message;
}

export function sendDefaultCollisionPreviewClearRequest(
	channel: LevelEditorPreviewChannelPort,
	requestId: string,
): LevelEditorCollisionPreviewClearRequestMessage {
	const message = buildDefaultCollisionPreviewClearRequestMessage(requestId);
	sendLevelEditorDevPreviewMessage(channel, message);
	return message;
}
