import type {
	CollisionChannelData,
	CollisionIntentData,
	LightComponentData,
} from "../schemas/index.js";

export type CollisionCookVector3Data = readonly [number, number, number];
export type CollisionCookQuaternionData = readonly [
	number,
	number,
	number,
	number,
];

export type CollisionCookTransformData = {
	readonly position?: CollisionCookVector3Data;
	readonly rotation?: CollisionCookQuaternionData;
	readonly scale?: CollisionCookVector3Data;
};

export type CollisionCookShapeData =
	| {
			readonly type: "box";
			readonly halfExtents: CollisionCookVector3Data;
	  }
	| {
			readonly type: "sphere";
			readonly radius: number;
	  }
	| {
			readonly type: "capsule";
			readonly halfHeight: number;
			readonly radius: number;
	  }
	| {
			readonly type: "cylinder";
			readonly halfHeight: number;
			readonly radius: number;
	  }
	| {
			readonly type: "mesh";
			readonly vertices: readonly CollisionCookVector3Data[];
			readonly indices: readonly number[];
	  };

export type CollisionCookColliderData = {
	readonly intent: CollisionIntentData;
	readonly channel: CollisionChannelData;
	readonly sensor?: boolean;
	readonly shape: CollisionCookShapeData;
};

export type CollisionCookDraftEntryData = {
	readonly id: string;
	readonly stableId: string;
	readonly prefabId: string;
	readonly colliderTarget: "prefab" | "level-instance";
	readonly transform?: CollisionCookTransformData;
	readonly collider: CollisionCookColliderData;
	readonly readiness: {
		readonly requiredCollision: boolean;
		readonly requiredWalkable?: boolean;
		readonly terrainPackageOwned?: boolean;
	};
	readonly notes?: string;
};

export type CollisionCookTargetFilesData = {
	readonly prefabModule: string;
	readonly levelModule: string;
	readonly runtimeSceneManifestModule: string;
	readonly generatedRuntimeCollisionModule?: string;
};

export type CollisionCookDraftData = {
	readonly schemaVersion: 1;
	readonly id: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly targetFiles: CollisionCookTargetFilesData;
	readonly entries: readonly CollisionCookDraftEntryData[];
};

export type CollisionCookPlanEntry = CollisionCookDraftEntryData & {
	readonly colliderComponent: CollisionCookColliderData;
};

export type CollisionCookPlan = {
	readonly draftId: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly targetFiles: CollisionCookDraftData["targetFiles"];
	readonly entries: readonly CollisionCookPlanEntry[];
	readonly requiredCollisionPrefabIds: readonly string[];
	readonly requiredCollisionStableIds: readonly string[];
	readonly requiredWalkableStableIds: readonly string[];
};

export type CollisionCookRuntimeValidationResult =
	| {
			readonly ok: true;
			readonly plan: CollisionCookPlan;
	  }
	| {
			readonly ok: false;
			readonly plan: CollisionCookPlan;
			readonly errors: readonly string[];
	  };

export type CollisionCookPrefabOutputData = {
	readonly schemaVersion: 1;
	readonly draftId: string;
	readonly runtimeSceneId: string;
	readonly entries: readonly {
		readonly id: string;
		readonly stableId: string;
		readonly prefabId: string;
		readonly colliderComponent: CollisionCookColliderData;
	}[];
};

export type CollisionCookLevelOutputData = {
	readonly schemaVersion: 1;
	readonly draftId: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly entries: readonly {
		readonly id: string;
		readonly stableId: string;
		readonly prefabId: string;
		readonly colliderTarget: CollisionCookDraftEntryData["colliderTarget"];
		readonly transform?: CollisionCookTransformData;
		readonly colliderComponent?: CollisionCookColliderData;
	}[];
};

export type CollisionCookReadinessOutputData = {
	readonly schemaVersion: 1;
	readonly draftId: string;
	readonly runtimeSceneId: string;
	readonly requiredCollisionPrefabIds: readonly string[];
	readonly requiredCollisionStableIds: readonly string[];
	readonly requiredWalkableStableIds: readonly string[];
};

export type CollisionCookWriteArtifactPayload =
	| CollisionCookPrefabOutputData
	| CollisionCookLevelOutputData
	| CollisionCookReadinessOutputData
	| CollisionCookRuntimeModuleData;

export type CollisionCookWriteArtifactPurpose =
	| "prefab-colliders"
	| "level-instances"
	| "runtime-readiness"
	| "runtime-collision-module";

export type CollisionCookWriteArtifact<
	TPayload extends
		CollisionCookWriteArtifactPayload = CollisionCookWriteArtifactPayload,
> = {
	readonly id: string;
	readonly targetFile: string;
	readonly purpose: CollisionCookWriteArtifactPurpose;
	readonly format: "json" | "typescript";
	readonly payload: TPayload;
	readonly serializedPayload: string;
	readonly contentHash: string;
};

export type CollisionCookWritePlan = {
	readonly schemaVersion: 1;
	readonly generator: "collisionCook.writePlan.v1";
	readonly writeMode: "dry-run";
	readonly writesFiles: false;
	readonly draftId: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly targetFiles: CollisionCookDraftData["targetFiles"];
	readonly provenance: {
		readonly sourcePlanHash: string;
		readonly hashAlgorithm: "fnv1a32";
		readonly contract: "LevelEditorCollisionCookContract";
	};
	readonly artifacts: readonly CollisionCookWriteArtifact[];
	readonly contentHash: string;
};

export type CollisionCookPreviewPatchEntry = {
	readonly id: string;
	readonly stableId: string;
	readonly prefabId: string;
	readonly colliderTarget: CollisionCookDraftEntryData["colliderTarget"];
	readonly transform?: CollisionCookTransformData;
	readonly colliderComponent: CollisionCookColliderData;
	readonly readiness: CollisionCookDraftEntryData["readiness"];
};

export type CollisionCookPreviewPatch = {
	readonly schemaVersion: 1;
	readonly channel: "level-editor-collision-preview";
	readonly mode: "temporary-preview";
	readonly draftId: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly sourcePlanHash: string;
	readonly entries: readonly CollisionCookPreviewPatchEntry[];
	readonly requiredCollisionStableIds: readonly string[];
	readonly requiredWalkableStableIds: readonly string[];
};

export const LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL =
	"level-editor-dev-preview.v1" as const;

export const LEVEL_EDITOR_DEV_PREVIEW_BROADCAST_CHANNEL =
	"megameal:level-editor-dev-preview:v1" as const;

export type LevelEditorCollisionPreviewPatchMessage = {
	readonly schemaVersion: 1;
	readonly protocol: typeof LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL;
	readonly type: "collision-preview-patch";
	readonly requestId: string;
	readonly payload: CollisionCookPreviewPatch;
};

export type LevelEditorRuntimeReloadReason =
	| "collision-bake-applied"
	| "manual";

export type LevelEditorRuntimeReloadRequest = {
	readonly runtimeSceneId: string;
	readonly reason: LevelEditorRuntimeReloadReason;
	readonly sourcePlanHash?: string;
};

export type LevelEditorCollisionPreviewClearRequest = {
	readonly runtimeSceneId: string;
	readonly sourcePlanHash?: string;
	readonly stableIds?: readonly string[];
};

export type LevelEditorCoreObjectPreviewTargetKind =
	| "light"
	| "spawn"
	| "portal"
	| "audio-emitter";

export type LevelEditorPortalPreviewComponentData = {
	readonly id: string;
	readonly label: string;
	readonly prompt?: string;
	readonly targetRuntimeSceneId?: string;
	readonly activationRadius?: number;
};

export type LevelEditorSoundEmitterPreviewComponentData = {
	readonly soundId: string;
	readonly active?: boolean;
	readonly loop?: boolean;
	readonly volume?: number;
	readonly busId?: string;
	readonly autoplay?: boolean;
	readonly sceneId?: string;
	readonly refDistance?: number;
	readonly maxDistance?: number;
	readonly rolloffFactor?: number;
	readonly distanceModel?: "inverse" | "linear" | "exponential";
	readonly coneInnerAngle?: number;
	readonly coneOuterAngle?: number;
	readonly coneOuterGain?: number;
};

export type LevelEditorLightPreviewPatchEntry = {
	readonly stableId: string;
	readonly targetKind: "light";
	readonly transform?: CollisionCookTransformData;
	readonly light: LightComponentData;
};

export type LevelEditorSpawnPreviewPatchEntry = {
	readonly stableId: string;
	readonly targetKind: "spawn";
	readonly transform: CollisionCookTransformData;
};

export type LevelEditorPortalPreviewPatchEntry = {
	readonly stableId: string;
	readonly targetKind: "portal";
	readonly transform?: CollisionCookTransformData;
	readonly portal: LevelEditorPortalPreviewComponentData;
};

export type LevelEditorAudioEmitterPreviewPatchEntry = {
	readonly stableId: string;
	readonly targetKind: "audio-emitter";
	readonly transform?: CollisionCookTransformData;
	readonly soundEmitter: LevelEditorSoundEmitterPreviewComponentData;
};

export type LevelEditorCoreObjectPreviewPatchEntry =
	| LevelEditorLightPreviewPatchEntry
	| LevelEditorSpawnPreviewPatchEntry
	| LevelEditorPortalPreviewPatchEntry
	| LevelEditorAudioEmitterPreviewPatchEntry;

export type LevelEditorCoreObjectPreviewPatch = {
	readonly schemaVersion: 1;
	readonly channel: "level-editor-core-object-preview";
	readonly mode: "temporary-preview";
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly sourcePlanHash: string;
	readonly entries: readonly LevelEditorCoreObjectPreviewPatchEntry[];
};

export type LevelEditorCoreObjectPreviewClearRequest = {
	readonly runtimeSceneId: string;
	readonly sourcePlanHash?: string;
	readonly stableIds?: readonly string[];
	readonly targetKinds?: readonly LevelEditorCoreObjectPreviewTargetKind[];
};

export type LevelEditorObjectEditPreviewOperation =
	| "transform"
	| "component-patch"
	| "insert"
	| "remove";

export type LevelEditorObjectEditPreviewTransformEntry = {
	readonly stableId: string;
	readonly operation: "transform";
	readonly transform: CollisionCookTransformData;
};

export type LevelEditorObjectEditPreviewComponentPatchEntry = {
	readonly stableId: string;
	readonly operation: "component-patch";
	readonly components?: Record<string, unknown>;
	readonly removeComponents?: readonly string[];
};

export type LevelEditorObjectEditPreviewInsertEntry = {
	readonly stableId: string;
	readonly operation: "insert";
	readonly prefabId?: string;
	readonly transform?: CollisionCookTransformData;
	readonly components: Record<string, unknown>;
};

export type LevelEditorObjectEditPreviewRemoveEntry = {
	readonly stableId: string;
	readonly operation: "remove";
	readonly componentNames: readonly string[];
};

export type LevelEditorObjectEditPreviewPatchEntry =
	| LevelEditorObjectEditPreviewTransformEntry
	| LevelEditorObjectEditPreviewComponentPatchEntry
	| LevelEditorObjectEditPreviewInsertEntry
	| LevelEditorObjectEditPreviewRemoveEntry;

export type LevelEditorObjectEditPreviewPatch = {
	readonly schemaVersion: 1;
	readonly channel: "level-editor-object-edit-preview";
	readonly mode: "temporary-preview";
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly sourcePlanHash: string;
	readonly entries: readonly LevelEditorObjectEditPreviewPatchEntry[];
};

export type LevelEditorObjectEditPreviewClearRequest = {
	readonly runtimeSceneId: string;
	readonly sourcePlanHash?: string;
	readonly stableIds?: readonly string[];
	readonly operations?: readonly LevelEditorObjectEditPreviewOperation[];
};

export type LevelEditorCameraLiveEditPoseData = {
	readonly position: CollisionCookVector3Data;
	readonly rotation: CollisionCookQuaternionData;
	readonly fovDegrees: number;
	readonly near: number;
	readonly far: number;
};

export type LevelEditorCameraLiveEditModeRequest = {
	readonly runtimeSceneId: string;
	readonly mode: "edit" | "gameplay";
	readonly sourcePlanHash?: string;
	readonly pose?: LevelEditorCameraLiveEditPoseData;
};

export type LevelEditorRuntimeReloadAckStatus = "accepted" | "ignored";

export type LevelEditorRuntimeReloadAckReason =
	| "reload-requested"
	| "runtime-scene-not-active"
	| "transition-port-unavailable";

export type LevelEditorRuntimeReloadAckPayload = {
	readonly runtimeSceneId: string;
	readonly activeRuntimeSceneId?: string;
	readonly status: LevelEditorRuntimeReloadAckStatus;
	readonly reason: LevelEditorRuntimeReloadAckReason;
	readonly sourcePlanHash?: string;
};

export type LevelEditorRuntimeTelemetryPayload = {
	readonly runtimeSceneId: string;
	readonly lifecycle: "created" | "started" | "paused" | "stopped" | "disposed";
	readonly tick: number;
	readonly playerAlive: boolean;
	readonly playerPosition: CollisionCookVector3Data;
	readonly health: readonly [number, number];
	readonly remainingCollectibles: number;
	readonly collectedCount: number;
	readonly moving: boolean;
	readonly pointerLocked: boolean;
	readonly lookActive: boolean;
	readonly inputEnabled: boolean;
	readonly charging: boolean;
	readonly chargeAmount: number;
	readonly updatedAtMs: number;
};

export type LevelEditorRuntimeReloadRequestMessage = {
	readonly schemaVersion: 1;
	readonly protocol: typeof LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL;
	readonly type: "reload-runtime-scene";
	readonly requestId: string;
	readonly request: LevelEditorRuntimeReloadRequest;
};

export type LevelEditorCoreObjectPreviewPatchMessage = {
	readonly schemaVersion: 1;
	readonly protocol: typeof LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL;
	readonly type: "core-object-preview-patch";
	readonly requestId: string;
	readonly payload: LevelEditorCoreObjectPreviewPatch;
};

export type LevelEditorCollisionPreviewClearRequestMessage = {
	readonly schemaVersion: 1;
	readonly protocol: typeof LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL;
	readonly type: "clear-collision-preview";
	readonly requestId: string;
	readonly request: LevelEditorCollisionPreviewClearRequest;
};

export type LevelEditorCoreObjectPreviewClearRequestMessage = {
	readonly schemaVersion: 1;
	readonly protocol: typeof LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL;
	readonly type: "clear-core-object-preview";
	readonly requestId: string;
	readonly request: LevelEditorCoreObjectPreviewClearRequest;
};

export type LevelEditorObjectEditPreviewPatchMessage = {
	readonly schemaVersion: 1;
	readonly protocol: typeof LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL;
	readonly type: "object-edit-preview-patch";
	readonly requestId: string;
	readonly payload: LevelEditorObjectEditPreviewPatch;
};

export type LevelEditorObjectEditPreviewClearRequestMessage = {
	readonly schemaVersion: 1;
	readonly protocol: typeof LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL;
	readonly type: "clear-object-edit-preview";
	readonly requestId: string;
	readonly request: LevelEditorObjectEditPreviewClearRequest;
};

export type LevelEditorCameraLiveEditModeMessage = {
	readonly schemaVersion: 1;
	readonly protocol: typeof LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL;
	readonly type: "camera-live-edit-mode";
	readonly requestId: string;
	readonly request: LevelEditorCameraLiveEditModeRequest;
};

export type LevelEditorRuntimeReloadAckMessage = {
	readonly schemaVersion: 1;
	readonly protocol: typeof LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL;
	readonly type: "runtime-reload-ack";
	readonly requestId: string;
	readonly payload: LevelEditorRuntimeReloadAckPayload;
};

export type LevelEditorRuntimeTelemetryMessage = {
	readonly schemaVersion: 1;
	readonly protocol: typeof LEVEL_EDITOR_DEV_PREVIEW_PROTOCOL;
	readonly type: "runtime-telemetry";
	readonly requestId: string;
	readonly payload: LevelEditorRuntimeTelemetryPayload;
};

export type LevelEditorDevPreviewMessage =
	| LevelEditorCollisionPreviewPatchMessage
	| LevelEditorCoreObjectPreviewPatchMessage
	| LevelEditorRuntimeReloadRequestMessage
	| LevelEditorCollisionPreviewClearRequestMessage
	| LevelEditorCoreObjectPreviewClearRequestMessage
	| LevelEditorObjectEditPreviewPatchMessage
	| LevelEditorObjectEditPreviewClearRequestMessage
	| LevelEditorCameraLiveEditModeMessage
	| LevelEditorRuntimeReloadAckMessage
	| LevelEditorRuntimeTelemetryMessage;

export type CollisionCookBakeFileData = {
	readonly schemaVersion: 1;
	readonly generator: "collisionCook.bake.v1";
	readonly contract: "LevelEditorCollisionCookContract";
	readonly writesRuntimeData: false;
	readonly draftId: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly writePlan: CollisionCookWritePlan;
	readonly previewPatch: CollisionCookPreviewPatch;
	readonly contentHash: string;
};

export type CollisionCookRuntimeModuleData = {
	readonly schemaVersion: 1;
	readonly generator: "collisionCook.runtimeModule.v1";
	readonly contract: "LevelEditorCollisionCookContract";
	readonly writesRuntimeData: true;
	readonly draftId: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly sourcePlanHash: string;
	readonly targetFiles: CollisionCookTargetFilesData;
	readonly prefabColliders: CollisionCookPrefabOutputData["entries"];
	readonly levelInstances: CollisionCookLevelOutputData["entries"];
	readonly readiness: CollisionCookReadinessOutputData;
	readonly contentHash: string;
};

export type CollisionCookRuntimeWriteSafetyResult =
	| {
			readonly ok: true;
	  }
	| {
			readonly ok: false;
			readonly errors: readonly string[];
	  };
