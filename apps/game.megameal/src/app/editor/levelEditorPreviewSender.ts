import {
	type CollisionCookDraftData,
	type CollisionCookPreviewPatch,
	type LevelEditorCameraLiveEditModeMessage,
	type LevelEditorCameraLiveEditModeRequest,
	type LevelEditorCollisionPreviewClearRequestMessage,
	type LevelEditorCollisionPreviewPatchMessage,
	type LevelEditorCoreObjectPreviewClearRequestMessage,
	type LevelEditorCoreObjectPreviewPatch,
	type LevelEditorCoreObjectPreviewPatchMessage,
	type LevelEditorCoreObjectPreviewTargetKind,
	type LevelEditorDevPreviewMessage,
	type LevelEditorObjectEditPreviewClearRequestMessage,
	type LevelEditorObjectEditPreviewOperation,
	type LevelEditorObjectEditPreviewPatch,
	type LevelEditorObjectEditPreviewPatchMessage,
	type LevelEditorRuntimeReloadRequestMessage,
	buildCollisionCookPlan,
	buildCollisionCookPreviewPatch,
	createCameraLiveEditModeMessage,
	createCollisionPreviewClearRequestMessage,
	createCollisionPreviewPatchMessage,
	createCoreObjectPreviewClearRequestMessage,
	createCoreObjectPreviewPatchMessage,
	createObjectEditPreviewClearRequestMessage,
	createObjectEditPreviewPatchMessage,
	createRuntimeSceneReloadRequestMessage,
} from "../../engine/data/index.js";
import {
	type LevelEditorPreviewChannelPort,
	postLevelEditorDevPreviewMessage,
} from "../devPreview/index.js";

export function buildCollisionCookPreviewPatchForDraft(
	draft: CollisionCookDraftData,
): CollisionCookPreviewPatch {
	return buildCollisionCookPreviewPatch(buildCollisionCookPlan(draft));
}

export function buildCollisionPreviewPatchMessage(
	requestId: string,
	patch: CollisionCookPreviewPatch,
): LevelEditorCollisionPreviewPatchMessage {
	return createCollisionPreviewPatchMessage({ requestId, patch });
}

export function buildCoreObjectPreviewPatchMessage(
	requestId: string,
	patch: LevelEditorCoreObjectPreviewPatch,
): LevelEditorCoreObjectPreviewPatchMessage {
	return createCoreObjectPreviewPatchMessage({ requestId, patch });
}

export function buildObjectEditPreviewPatchMessage(
	requestId: string,
	patch: LevelEditorObjectEditPreviewPatch,
): LevelEditorObjectEditPreviewPatchMessage {
	return createObjectEditPreviewPatchMessage({ requestId, patch });
}

export function buildRuntimeReloadRequestMessage(options: {
	readonly requestId: string;
	readonly runtimeSceneId: string;
	readonly sourcePlanHash?: string;
}): LevelEditorRuntimeReloadRequestMessage {
	return createRuntimeSceneReloadRequestMessage({
		requestId: options.requestId,
		runtimeSceneId: options.runtimeSceneId,
		reason:
			options.sourcePlanHash === undefined
				? "manual"
				: "collision-bake-applied",
		...(options.sourcePlanHash === undefined
			? {}
			: { sourcePlanHash: options.sourcePlanHash }),
	});
}

export function buildCameraLiveEditModeMessage(options: {
	readonly requestId: string;
	readonly runtimeSceneId: string;
	readonly mode: LevelEditorCameraLiveEditModeRequest["mode"];
	readonly sourcePlanHash?: string;
	readonly pose?: LevelEditorCameraLiveEditModeRequest["pose"];
}): LevelEditorCameraLiveEditModeMessage {
	return createCameraLiveEditModeMessage({
		requestId: options.requestId,
		request: {
			runtimeSceneId: options.runtimeSceneId,
			mode: options.mode,
			...(options.sourcePlanHash === undefined
				? {}
				: { sourcePlanHash: options.sourcePlanHash }),
			...(options.pose === undefined ? {} : { pose: options.pose }),
		},
	});
}

export function buildCollisionPreviewClearRequestMessage(
	requestId: string,
	patch: CollisionCookPreviewPatch,
): LevelEditorCollisionPreviewClearRequestMessage {
	return createCollisionPreviewClearRequestMessage({
		requestId,
		runtimeSceneId: patch.runtimeSceneId,
		sourcePlanHash: patch.sourcePlanHash,
		stableIds: patch.entries.map((entry) => entry.stableId),
	});
}

export function buildCoreObjectPreviewClearRequestMessage(options: {
	readonly requestId: string;
	readonly runtimeSceneId: string;
	readonly sourcePlanHash?: string;
	readonly stableIds?: readonly string[];
	readonly targetKinds?: readonly LevelEditorCoreObjectPreviewTargetKind[];
}): LevelEditorCoreObjectPreviewClearRequestMessage {
	return createCoreObjectPreviewClearRequestMessage({
		requestId: options.requestId,
		runtimeSceneId: options.runtimeSceneId,
		...(options.sourcePlanHash === undefined
			? {}
			: { sourcePlanHash: options.sourcePlanHash }),
		...(options.stableIds === undefined
			? {}
			: { stableIds: options.stableIds }),
		...(options.targetKinds === undefined
			? {}
			: { targetKinds: options.targetKinds }),
	});
}

export function buildObjectEditPreviewClearRequestMessage(options: {
	readonly requestId: string;
	readonly runtimeSceneId: string;
	readonly sourcePlanHash?: string;
	readonly stableIds?: readonly string[];
	readonly operations?: readonly LevelEditorObjectEditPreviewOperation[];
}): LevelEditorObjectEditPreviewClearRequestMessage {
	return createObjectEditPreviewClearRequestMessage({
		requestId: options.requestId,
		runtimeSceneId: options.runtimeSceneId,
		...(options.sourcePlanHash === undefined
			? {}
			: { sourcePlanHash: options.sourcePlanHash }),
		...(options.stableIds === undefined
			? {}
			: { stableIds: options.stableIds }),
		...(options.operations === undefined
			? {}
			: { operations: options.operations }),
	});
}

export function sendLevelEditorDevPreviewMessage(
	channel: LevelEditorPreviewChannelPort,
	message: unknown,
): LevelEditorDevPreviewMessage {
	return postLevelEditorDevPreviewMessage(channel, message);
}

export function sendCollisionPreviewPatch(
	channel: LevelEditorPreviewChannelPort,
	requestId: string,
	patch: CollisionCookPreviewPatch,
): LevelEditorCollisionPreviewPatchMessage {
	const message = buildCollisionPreviewPatchMessage(requestId, patch);
	sendLevelEditorDevPreviewMessage(channel, message);
	return message;
}

export function sendCoreObjectPreviewPatch(
	channel: LevelEditorPreviewChannelPort,
	requestId: string,
	patch: LevelEditorCoreObjectPreviewPatch,
): LevelEditorCoreObjectPreviewPatchMessage {
	const message = buildCoreObjectPreviewPatchMessage(requestId, patch);
	sendLevelEditorDevPreviewMessage(channel, message);
	return message;
}

export function sendObjectEditPreviewPatch(
	channel: LevelEditorPreviewChannelPort,
	requestId: string,
	patch: LevelEditorObjectEditPreviewPatch,
): LevelEditorObjectEditPreviewPatchMessage {
	const message = buildObjectEditPreviewPatchMessage(requestId, patch);
	sendLevelEditorDevPreviewMessage(channel, message);
	return message;
}

export function sendRuntimeReloadRequest(
	channel: LevelEditorPreviewChannelPort,
	options: {
		readonly requestId: string;
		readonly runtimeSceneId: string;
		readonly sourcePlanHash?: string;
	},
): LevelEditorRuntimeReloadRequestMessage {
	const message = buildRuntimeReloadRequestMessage(options);
	sendLevelEditorDevPreviewMessage(channel, message);
	return message;
}

export function sendCameraLiveEditModeRequest(
	channel: LevelEditorPreviewChannelPort,
	options: {
		readonly requestId: string;
		readonly runtimeSceneId: string;
		readonly mode: LevelEditorCameraLiveEditModeRequest["mode"];
		readonly sourcePlanHash?: string;
		readonly pose?: LevelEditorCameraLiveEditModeRequest["pose"];
	},
): LevelEditorCameraLiveEditModeMessage {
	const message = buildCameraLiveEditModeMessage(options);
	sendLevelEditorDevPreviewMessage(channel, message);
	return message;
}

export function sendCollisionPreviewClearRequest(
	channel: LevelEditorPreviewChannelPort,
	requestId: string,
	patch: CollisionCookPreviewPatch,
): LevelEditorCollisionPreviewClearRequestMessage {
	const message = buildCollisionPreviewClearRequestMessage(requestId, patch);
	sendLevelEditorDevPreviewMessage(channel, message);
	return message;
}

export function sendCoreObjectPreviewClearRequest(
	channel: LevelEditorPreviewChannelPort,
	options: {
		readonly requestId: string;
		readonly runtimeSceneId: string;
		readonly sourcePlanHash?: string;
		readonly stableIds?: readonly string[];
		readonly targetKinds?: readonly LevelEditorCoreObjectPreviewTargetKind[];
	},
): LevelEditorCoreObjectPreviewClearRequestMessage {
	const message = buildCoreObjectPreviewClearRequestMessage(options);
	sendLevelEditorDevPreviewMessage(channel, message);
	return message;
}

export function sendObjectEditPreviewClearRequest(
	channel: LevelEditorPreviewChannelPort,
	options: {
		readonly requestId: string;
		readonly runtimeSceneId: string;
		readonly sourcePlanHash?: string;
		readonly stableIds?: readonly string[];
		readonly operations?: readonly LevelEditorObjectEditPreviewOperation[];
	},
): LevelEditorObjectEditPreviewClearRequestMessage {
	const message = buildObjectEditPreviewClearRequestMessage(options);
	sendLevelEditorDevPreviewMessage(channel, message);
	return message;
}
