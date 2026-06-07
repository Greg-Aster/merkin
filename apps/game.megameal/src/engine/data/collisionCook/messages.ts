import {
	LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
	type LevelEditorCollisionPreviewClearRequestMessage,
	type LevelEditorCollisionPreviewPatchMessage,
	type LevelEditorRuntimeReloadReason,
	type LevelEditorRuntimeReloadRequestMessage,
} from "./types.js";
import {
	levelEditorDevPreviewMessageValidator,
	parseCollisionCookPreviewPatch,
} from "./validators.js";

export function createCollisionPreviewPatchMessage(options: {
	readonly requestId: string;
	readonly patch: unknown;
}): LevelEditorCollisionPreviewPatchMessage {
	return levelEditorDevPreviewMessageValidator.parse({
		schemaVersion: 1,
		protocol: LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
		type: "collision-preview-patch",
		requestId: options.requestId,
		payload: parseCollisionCookPreviewPatch(options.patch),
	}) as LevelEditorCollisionPreviewPatchMessage;
}

export function createRuntimeSceneReloadRequestMessage(options: {
	readonly requestId: string;
	readonly runtimeSceneId: string;
	readonly reason: LevelEditorRuntimeReloadReason;
	readonly sourcePlanHash?: string;
}): LevelEditorRuntimeReloadRequestMessage {
	return levelEditorDevPreviewMessageValidator.parse({
		schemaVersion: 1,
		protocol: LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
		type: "reload-runtime-scene",
		requestId: options.requestId,
		request: {
			runtimeSceneId: options.runtimeSceneId,
			reason: options.reason,
			...(options.sourcePlanHash === undefined
				? {}
				: { sourcePlanHash: options.sourcePlanHash }),
		},
	}) as LevelEditorRuntimeReloadRequestMessage;
}

export function createCollisionPreviewClearRequestMessage(options: {
	readonly requestId: string;
	readonly runtimeSceneId: string;
	readonly sourcePlanHash?: string;
	readonly stableIds?: readonly string[];
}): LevelEditorCollisionPreviewClearRequestMessage {
	return levelEditorDevPreviewMessageValidator.parse({
		schemaVersion: 1,
		protocol: LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
		type: "clear-collision-preview",
		requestId: options.requestId,
		request: {
			runtimeSceneId: options.runtimeSceneId,
			...(options.sourcePlanHash === undefined
				? {}
				: { sourcePlanHash: options.sourcePlanHash }),
			...(options.stableIds === undefined
				? {}
				: { stableIds: [...options.stableIds] }),
		},
	}) as LevelEditorCollisionPreviewClearRequestMessage;
}
