import {
	LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
	type LevelEditorCameraLiveEditModeMessage,
	type LevelEditorCameraLiveEditModeRequest,
	type LevelEditorCollisionPreviewClearRequestMessage,
	type LevelEditorCollisionPreviewPatchMessage,
	type LevelEditorCoreObjectPreviewClearRequestMessage,
	type LevelEditorCoreObjectPreviewPatchMessage,
	type LevelEditorCoreObjectPreviewTargetKind,
	type LevelEditorObjectEditPreviewClearRequestMessage,
	type LevelEditorObjectEditPreviewOperation,
	type LevelEditorObjectEditPreviewPatchMessage,
	type LevelEditorRuntimeReloadAckMessage,
	type LevelEditorRuntimeReloadAckPayload,
	type LevelEditorRuntimeReloadReason,
	type LevelEditorRuntimeReloadRequestMessage,
	type LevelEditorRuntimeTelemetryMessage,
	type LevelEditorRuntimeTelemetryPayload,
} from "./types.js";
import {
	levelEditorDevPreviewMessageValidator,
	parseCollisionCookPreviewPatch,
	parseLevelEditorCoreObjectPreviewPatch,
	parseLevelEditorObjectEditPreviewPatch,
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

export function createCoreObjectPreviewPatchMessage(options: {
	readonly requestId: string;
	readonly patch: unknown;
}): LevelEditorCoreObjectPreviewPatchMessage {
	return levelEditorDevPreviewMessageValidator.parse({
		schemaVersion: 1,
		protocol: LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
		type: "core-object-preview-patch",
		requestId: options.requestId,
		payload: parseLevelEditorCoreObjectPreviewPatch(options.patch),
	}) as LevelEditorCoreObjectPreviewPatchMessage;
}

export function createObjectEditPreviewPatchMessage(options: {
	readonly requestId: string;
	readonly patch: unknown;
}): LevelEditorObjectEditPreviewPatchMessage {
	return levelEditorDevPreviewMessageValidator.parse({
		schemaVersion: 1,
		protocol: LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
		type: "object-edit-preview-patch",
		requestId: options.requestId,
		payload: parseLevelEditorObjectEditPreviewPatch(options.patch),
	}) as LevelEditorObjectEditPreviewPatchMessage;
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

export function createCoreObjectPreviewClearRequestMessage(options: {
	readonly requestId: string;
	readonly runtimeSceneId: string;
	readonly sourcePlanHash?: string;
	readonly stableIds?: readonly string[];
	readonly targetKinds?: readonly LevelEditorCoreObjectPreviewTargetKind[];
}): LevelEditorCoreObjectPreviewClearRequestMessage {
	return levelEditorDevPreviewMessageValidator.parse({
		schemaVersion: 1,
		protocol: LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
		type: "clear-core-object-preview",
		requestId: options.requestId,
		request: {
			runtimeSceneId: options.runtimeSceneId,
			...(options.sourcePlanHash === undefined
				? {}
				: { sourcePlanHash: options.sourcePlanHash }),
			...(options.stableIds === undefined
				? {}
				: { stableIds: [...options.stableIds] }),
			...(options.targetKinds === undefined
				? {}
				: { targetKinds: [...options.targetKinds] }),
		},
	}) as LevelEditorCoreObjectPreviewClearRequestMessage;
}

export function createObjectEditPreviewClearRequestMessage(options: {
	readonly requestId: string;
	readonly runtimeSceneId: string;
	readonly sourcePlanHash?: string;
	readonly stableIds?: readonly string[];
	readonly operations?: readonly LevelEditorObjectEditPreviewOperation[];
}): LevelEditorObjectEditPreviewClearRequestMessage {
	return levelEditorDevPreviewMessageValidator.parse({
		schemaVersion: 1,
		protocol: LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
		type: "clear-object-edit-preview",
		requestId: options.requestId,
		request: {
			runtimeSceneId: options.runtimeSceneId,
			...(options.sourcePlanHash === undefined
				? {}
				: { sourcePlanHash: options.sourcePlanHash }),
			...(options.stableIds === undefined
				? {}
				: { stableIds: [...options.stableIds] }),
			...(options.operations === undefined
				? {}
				: { operations: [...options.operations] }),
		},
	}) as LevelEditorObjectEditPreviewClearRequestMessage;
}

export function createCameraLiveEditModeMessage(options: {
	readonly requestId: string;
	readonly request: LevelEditorCameraLiveEditModeRequest;
}): LevelEditorCameraLiveEditModeMessage {
	return levelEditorDevPreviewMessageValidator.parse({
		schemaVersion: 1,
		protocol: LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
		type: "camera-live-edit-mode",
		requestId: options.requestId,
		request: options.request,
	}) as LevelEditorCameraLiveEditModeMessage;
}

export function createRuntimeReloadAckMessage(options: {
	readonly requestId: string;
	readonly ack: LevelEditorRuntimeReloadAckPayload;
}): LevelEditorRuntimeReloadAckMessage {
	return levelEditorDevPreviewMessageValidator.parse({
		schemaVersion: 1,
		protocol: LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
		type: "runtime-reload-ack",
		requestId: options.requestId,
		payload: options.ack,
	}) as LevelEditorRuntimeReloadAckMessage;
}

export function createRuntimeTelemetryMessage(options: {
	readonly requestId: string;
	readonly telemetry: LevelEditorRuntimeTelemetryPayload;
}): LevelEditorRuntimeTelemetryMessage {
	return levelEditorDevPreviewMessageValidator.parse({
		schemaVersion: 1,
		protocol: LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL,
		type: "runtime-telemetry",
		requestId: options.requestId,
		payload: options.telemetry,
	}) as LevelEditorRuntimeTelemetryMessage;
}
