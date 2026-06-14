import type {
	LevelEditorCameraLiveEditModeRequest,
	LevelEditorCameraLiveEditPoseData,
} from "../../engine/data/index.js";
import type { EnvironmentAuthoringModel } from "../../game/editor/environmentAuthoring/index.js";
import type { NpcAuthoringCatalog } from "../../game/editor/npcAuthoring/index.js";

export type LevelEditorCameraModeOperationDraft = {
	readonly operation: "camera-live-edit-mode";
	readonly runtimeSceneId: string;
	readonly mode: LevelEditorCameraLiveEditModeRequest["mode"];
	readonly request: LevelEditorCameraLiveEditModeRequest;
	readonly writesFiles: false;
	readonly requiresLivePreviewChannel: true;
	readonly productionRuntime: false;
};

export function serializeEnvironmentAuthoringModel(
	model: EnvironmentAuthoringModel,
): string {
	return JSON.stringify(model);
}

export function parseEnvironmentAuthoringModel(
	serializedModel: string,
): EnvironmentAuthoringModel {
	return JSON.parse(serializedModel) as EnvironmentAuthoringModel;
}

export function serializeNpcAuthoringCatalog(
	catalog: NpcAuthoringCatalog,
): string {
	return JSON.stringify(catalog);
}

export function parseNpcAuthoringCatalog(
	serializedCatalog: string,
): NpcAuthoringCatalog {
	return JSON.parse(serializedCatalog) as NpcAuthoringCatalog;
}

export function createLevelEditorCameraModeOperationDraft(options: {
	readonly runtimeSceneId: string;
	readonly mode: LevelEditorCameraLiveEditModeRequest["mode"];
	readonly pose?: LevelEditorCameraLiveEditPoseData;
}): LevelEditorCameraModeOperationDraft {
	const request: LevelEditorCameraLiveEditModeRequest = {
		runtimeSceneId: options.runtimeSceneId,
		mode: options.mode,
		sourcePlanHash: `workspace:camera:${options.runtimeSceneId}:${options.mode}`,
		...(options.pose === undefined ? {} : { pose: options.pose }),
	};

	return {
		operation: "camera-live-edit-mode",
		runtimeSceneId: options.runtimeSceneId,
		mode: options.mode,
		request,
		writesFiles: false,
		requiresLivePreviewChannel: true,
		productionRuntime: false,
	};
}
